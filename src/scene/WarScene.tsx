import { Grid, Html } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Bloom, EffectComposer, Vignette } from "@react-three/postprocessing";
import { memo, type ReactNode, useMemo, useRef } from "react";
import { Color, type Group, type Mesh, type MeshBasicMaterial, type MeshStandardMaterial, type OrthographicCamera, type PointLight } from "three";
import { GOLD } from "../config";

/** What the page tells the battlefield. Plain data: the scene never reads the chain itself. */
export interface SceneView {
  clans: { color: string; name: string; members: number; power: number; hasLeader: boolean }[];
  leading: number; // 0 nobody, 1..3
  pot: number; // BNB
  potLabel: string;
  payoutSeq: number; // bumped when a round pays out
  payoutWinner: number; // 1..3
  labels?: boolean; // false hides the floating name and pot tags (still images)
}

/** Fixed camera framing for still images: pixels per world unit, picture offset in pixels (+ moves it right) and the
    height the camera aims at. Without it the camera fits the field to the page. */
export interface Frame {
  zoom: number;
  offsetX: number;
  lookY: number;
}

// Screen-right and screen-up directions on the floor for a camera looking from the front-right corner.
const R: [number, number] = [0.707, -0.707];
const U: [number, number] = [-0.707, -0.707];
const at = (r: number, u: number): [number, number, number] => [R[0] * r + U[0] * u, 0, R[1] * r + U[1] * u];

/** Bases form a triangle around the pot: left, back, right. */
export const BASES = [at(-4.8, -0.9), at(0, 4.3), at(4.8, -0.9)];
export const CHEST = at(0, -0.4);
const SPOTS = [
  [-0.75, 0.35], [0, 0.55], [0.75, 0.35], [-1.1, 1.0], [-0.35, 1.15], [0.35, 1.15], [1.1, 1.0], [-0.7, 1.75], [0, 1.85], [0.7, 1.75],
] as const;

function CameraRig({ reducedMotion, frame }: { reducedMotion: boolean; frame?: Frame }) {
  const camera = useThree((s) => s.camera) as OrthographicCamera;
  const size = useThree((s) => s.size);
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    // On wide screens the score panel covers the right edge, so the field is framed in the space left of it.
    const panel = size.width > 900 ? 400 : 0;
    const zoom = frame ? frame.zoom : Math.min((size.width - panel) / 17, size.height / 12);
    if (Math.abs(camera.zoom - zoom) > 0.01) {
      camera.zoom = zoom;
      camera.updateProjectionMatrix();
    }
    const shift = (frame ? -frame.offsetX : panel / 2) / zoom; // world units that move the picture left
    const tx = R[0] * shift;
    const tz = R[1] * shift;
    const drift = reducedMotion ? 0 : 1;
    camera.position.set(tx + 14 + Math.sin(t * 0.11) * 0.4 * drift, 12.5, tz + 14 + Math.cos(t * 0.09) * 0.4 * drift);
    camera.lookAt(tx, frame ? frame.lookY : 0.8, tz);
  }, -2);
  return null;
}

/** A round little robot with a visor and glowing eyes, in its clan's colour. The leader is bigger and crowned. */
function Bot({ color, x, z, scale, seed, crown, reducedMotion }: {
  color: string;
  x: number;
  z: number;
  scale: number;
  seed: number;
  crown?: boolean;
  reducedMotion: boolean;
}) {
  const body = useRef<Group>(null);
  const head = useRef<Group>(null);
  const eyes = useRef<MeshBasicMaterial>(null);
  const base = useMemo(() => new Color(color), [color]);
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const calm = reducedMotion ? 0 : 1;
    if (body.current) body.current.position.y = Math.sin(t * 2.1 + seed) * 0.03 * calm;
    if (head.current) head.current.rotation.y = Math.sin(t * 0.7 + seed * 1.7) * 0.35 * calm;
    if (eyes.current) eyes.current.color.copy(base).multiplyScalar(calm && Math.sin(t * 1.3 + seed * 3) > 0.985 ? 0.1 : 1);
  });
  return (
    <group position={[x, 0.25, z]} scale={scale} rotation={[0, 0.78, 0]}>
      <group ref={body}>
        <mesh position={[0, 0.62, 0]}>
          <capsuleGeometry args={[0.3, 0.32, 6, 14]} />
          <meshStandardMaterial color={color} roughness={0.35} metalness={0.15} />
        </mesh>
        <group ref={head} position={[0, 0.74, 0]}>
          <mesh position={[0, 0, 0.25]}>
            <boxGeometry args={[0.42, 0.2, 0.08]} />
            <meshStandardMaterial color="#0b0916" roughness={0.2} metalness={0.5} />
          </mesh>
          {[-0.1, 0.1].map((ex) => (
            <mesh key={ex} position={[ex, 0, 0.3]}>
              <boxGeometry args={[0.07, 0.07, 0.02]} />
              <meshBasicMaterial ref={ex < 0 ? eyes : undefined} color={color} toneMapped={false} />
            </mesh>
          ))}
          <mesh position={[0, 0.34, 0]}>
            <cylinderGeometry args={[0.012, 0.012, 0.22, 6]} />
            <meshStandardMaterial color="#d6d3d1" />
          </mesh>
          <mesh position={[0, 0.47, 0]}>
            <sphereGeometry args={[0.045, 8, 8]} />
            <meshBasicMaterial color={color} toneMapped={false} />
          </mesh>
          {crown ? (
            <mesh position={[0, 0.3, 0]}>
              <cylinderGeometry args={[0.16, 0.2, 0.14, 5, 1, true]} />
              <meshStandardMaterial color={GOLD} metalness={0.8} roughness={0.25} side={2} />
            </mesh>
          ) : null}
        </group>
      </group>
    </group>
  );
}

/** One clan's base: a hexagonal platform with a neon rim, a power beam that rises with this round's net buying,
    a banner with the clan's name, and its members as robots, the leader in front. */
function Base({ index, clan, leading, labels, reducedMotion }: {
  index: number;
  clan: SceneView["clans"][number];
  leading: boolean;
  labels: boolean;
  reducedMotion: boolean;
}) {
  const [bx, , bz] = BASES[index];
  const beam = useRef<Mesh>(null);
  const beamMat = useRef<MeshStandardMaterial>(null);
  const rim = useRef<MeshBasicMaterial>(null);
  const height = useRef(0.3);
  const rimColor = useMemo(() => new Color(clan.color), [clan.color]);
  useFrame((state, dt) => {
    const target = 0.3 + 4.2 * Math.max(0, Math.min(1, clan.power));
    height.current += (target - height.current) * Math.min(1, dt * 2.5);
    if (beam.current) {
      beam.current.scale.y = height.current;
      beam.current.position.y = 0.25 + height.current / 2;
    }
    const pulse = leading && !reducedMotion ? 0.65 + 0.35 * Math.sin(state.clock.elapsedTime * 4) : 1;
    if (beamMat.current) beamMat.current.emissiveIntensity = (leading ? 2.6 : 1.2) * pulse;
    if (rim.current) rim.current.color.copy(rimColor).multiplyScalar(leading ? 1.4 * pulse : 0.8);
  });
  const crowd = Math.max(0, Math.min(clan.members - (clan.hasLeader ? 1 : 0), SPOTS.length));
  const back = (r: number, u: number): [number, number] => [bx + R[0] * r + U[0] * u, bz + R[1] * r + U[1] * u];
  const [beamX, beamZ] = back(-1.55, 1.55);
  const [poleX, poleZ] = back(1.65, 1.2);
  const [leadX, leadZ] = back(0, -0.75);
  return (
    <group>
      <mesh position={[bx, 0.12, bz]}>
        <cylinderGeometry args={[2.35, 2.5, 0.25, 6]} />
        <meshStandardMaterial color="#0f0d1f" roughness={0.6} metalness={0.3} />
      </mesh>
      <mesh position={[bx, 0.255, bz]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[2.18, 2.34, 6]} />
        <meshBasicMaterial ref={rim} color={clan.color} toneMapped={false} />
      </mesh>
      <mesh ref={beam} position={[beamX, 0.4, beamZ]}>
        <cylinderGeometry args={[0.22, 0.22, 1, 16]} />
        <meshStandardMaterial ref={beamMat} color={clan.color} emissive={clan.color} emissiveIntensity={1.2} transparent opacity={0.85} />
      </mesh>
      <mesh position={[poleX, 1.3, poleZ]}>
        <cylinderGeometry args={[0.03, 0.03, 2.1, 6]} />
        <meshStandardMaterial color="#d6d3d1" metalness={0.6} roughness={0.3} />
      </mesh>
      <mesh position={[poleX + 0.33, 2.05, poleZ - 0.33]} rotation={[0, 0.78, 0]}>
        <planeGeometry args={[0.95, 0.55]} />
        <meshStandardMaterial color={clan.color} emissive={clan.color} emissiveIntensity={0.6} side={2} />
      </mesh>
      {labels ? (
        <Html position={[bx, 3.0, bz]} center zIndexRange={[10, 0]} style={{ pointerEvents: "none" }}>
          <div className="scene-tag" style={{ borderColor: clan.color, color: clan.color }}>
            <b>{clan.name}</b>
            <span>{clan.members}</span>
          </div>
        </Html>
      ) : null}
      {clan.hasLeader ? <Bot color={clan.color} x={leadX} z={leadZ} scale={1.55} seed={index * 7 + 1} crown reducedMotion={reducedMotion} /> : null}
      {Array.from({ length: crowd }, (_, i) => {
        const [sx, sz] = back(SPOTS[i][0], SPOTS[i][1]);
        return <Bot key={i} color={clan.color} x={sx} z={sz} scale={0.85} seed={index * 7 + i + 2} reducedMotion={reducedMotion} />;
      })}
    </group>
  );
}

/** The pot: a chest whose glow grows with the BNB inside. */
function Chest({ pot, label, labels, reducedMotion }: { pot: number; label: string; labels: boolean; reducedMotion: boolean }) {
  const lid = useRef<Group>(null);
  const light = useRef<PointLight>(null);
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const glow = Math.min(1, Math.log10(1 + pot * 40) / 2);
    if (lid.current) lid.current.rotation.x = -0.35 - (reducedMotion ? 0 : Math.sin(t * 1.6) * 0.08);
    if (light.current) light.current.intensity = 4 + glow * 22 * (reducedMotion ? 1 : 0.85 + 0.15 * Math.sin(t * 3));
  });
  const [cx, , cz] = CHEST;
  return (
    <group position={[cx, 0, cz]} rotation={[0, 0.78, 0]}>
      <mesh position={[0, 0.12, 0]}>
        <cylinderGeometry args={[1.2, 1.3, 0.24, 8]} />
        <meshStandardMaterial color="#141127" roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.6, 0]}>
        <boxGeometry args={[1.2, 0.7, 0.8]} />
        <meshStandardMaterial color="#7c2d12" roughness={0.5} metalness={0.2} />
      </mesh>
      <mesh position={[0, 0.6, 0.41]}>
        <boxGeometry args={[1.22, 0.12, 0.02]} />
        <meshStandardMaterial color={GOLD} metalness={0.9} roughness={0.2} />
      </mesh>
      <group ref={lid} position={[0, 0.95, -0.4]}>
        <mesh position={[0, 0.08, 0.4]}>
          <boxGeometry args={[1.22, 0.16, 0.82]} />
          <meshStandardMaterial color="#9a3412" roughness={0.5} />
        </mesh>
      </group>
      <mesh position={[0, 0.98, 0]}>
        <boxGeometry args={[1.0, 0.08, 0.6]} />
        <meshBasicMaterial color={GOLD} toneMapped={false} />
      </mesh>
      <pointLight ref={light} position={[0, 1.6, 0]} color={GOLD} distance={7} decay={1.6} intensity={6} />
      {labels ? (
        <Html position={[0, 2.1, 0]} center zIndexRange={[10, 0]} style={{ pointerEvents: "none" }}>
          <div className="scene-tag pot">{label}</div>
        </Html>
      ) : null}
    </group>
  );
}

const COINS = 18;

/** Coins fly from the chest to the winning base when a round pays out. */
function Coins({ seq, winner, reducedMotion }: { seq: number; winner: number; reducedMotion: boolean }) {
  const refs = useRef<(Mesh | null)[]>([]);
  const seen = useRef(seq);
  const start = useRef<number | undefined>(undefined);
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (seq !== seen.current) {
      seen.current = seq;
      start.current = t;
    }
    const s = start.current === undefined ? -1 : t - start.current;
    const to = BASES[Math.max(0, winner - 1)];
    refs.current.forEach((m, i) => {
      if (!m) return;
      const k = (s - i * 0.05) / 1.4;
      const live = winner > 0 && k >= 0 && k < 1 && !reducedMotion;
      m.visible = live;
      if (!live) return;
      const jitter = ((i * 37) % 11) / 11 - 0.5;
      m.position.set(CHEST[0] + (to[0] - CHEST[0]) * k + jitter * 0.6, 1.0 + Math.sin(Math.PI * k) * 3.2, CHEST[2] + (to[2] - CHEST[2]) * k - jitter * 0.6);
      m.rotation.x = s * 9 + i;
    });
  });
  return (
    <group>
      {Array.from({ length: COINS }, (_, i) => (
        <mesh
          key={i}
          ref={(m) => {
            refs.current[i] = m;
          }}
          visible={false}
        >
          <cylinderGeometry args={[0.14, 0.14, 0.03, 12]} />
          <meshStandardMaterial color={GOLD} emissive="#a16207" metalness={0.9} roughness={0.2} />
        </mesh>
      ))}
    </group>
  );
}

const Battlefield = memo(function Battlefield({ view, reducedMotion, effects, frame }: {
  view: SceneView;
  reducedMotion: boolean;
  effects: boolean;
  frame?: Frame;
}) {
  const labels = view.labels !== false;
  return (
    <>
      <color attach="background" args={["#07050f"]} />
      <CameraRig reducedMotion={reducedMotion} frame={frame} />
      <ambientLight intensity={0.5} />
      <hemisphereLight args={["#7c6cff", "#1a0f2e", 0.55]} />
      <directionalLight position={[8, 14, 6]} intensity={1.0} color="#fdf4ff" />
      <pointLight position={[-7, 4, 5]} color="#ff3ea5" intensity={14} distance={16} decay={1.6} />
      <pointLight position={[6, 4, -6]} color="#22d3ee" intensity={12} distance={16} decay={1.6} />
      <Grid
        position={[0, 0, 0]}
        args={[40, 40]}
        cellSize={0.6}
        cellThickness={0.6}
        cellColor="#1e1b4b"
        sectionSize={3}
        sectionThickness={1.1}
        sectionColor="#3b2a7a"
        fadeDistance={34}
        fadeStrength={1.4}
        infiniteGrid
      />
      {view.clans.map((c, i) => (
        <Base key={i} index={i} clan={c} leading={view.leading === i + 1} labels={labels} reducedMotion={reducedMotion} />
      ))}
      <Chest pot={view.pot} label={view.potLabel} labels={labels} reducedMotion={reducedMotion} />
      <Coins seq={view.payoutSeq} winner={view.payoutWinner} reducedMotion={reducedMotion} />
      {effects ? (
        <EffectComposer multisampling={4}>
          <Bloom mipmapBlur intensity={0.75} luminanceThreshold={0.75} luminanceSmoothing={0.2} radius={0.6} />
          <Vignette offset={0.26} darkness={0.6} />
        </EffectComposer>
      ) : null}
    </>
  );
});

export default function WarScene({ view, reducedMotion, effects, frame, children }: {
  view: SceneView;
  reducedMotion: boolean;
  effects: boolean;
  frame?: Frame;
  children?: ReactNode; // extra objects drawn into the same scene
}) {
  return (
    <Canvas orthographic dpr={[1, 2]} camera={{ position: [14, 12.5, 14], zoom: 40, near: -100, far: 200 }} gl={{ antialias: true }}>
      <Battlefield view={view} reducedMotion={reducedMotion} effects={effects} frame={frame} />
      {children}
    </Canvas>
  );
}
