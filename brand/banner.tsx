// Still image for the X header (1500x500): the site's battlefield with demo data, no labels, plus the title.
// Open /brand/banner.html on the dev server and capture it with brand/shoot.mjs.
import { createRoot } from "react-dom/client";
import { CLANS, GOLD } from "../src/config";
import WarScene, { BASES, CHEST, type Frame, type SceneView } from "../src/scene/WarScene";

const params = new URLSearchParams(location.search);
const WINNER = Number(params.get("winner") ?? 3); // 1..3
const FRAME: Frame = {
  zoom: Number(params.get("zoom") ?? 52),
  offsetX: Number(params.get("x") ?? 300),
  lookY: Number(params.get("y") ?? 3.0),
};

const view: SceneView = {
  clans: CLANS.map((c, i) => ({
    color: c.color,
    name: "",
    members: 11,
    power: i + 1 === WINNER ? 1 : [0.62, 0.78, 0.5][i],
    hasLeader: true,
  })),
  leading: WINNER,
  pot: 5,
  potLabel: "",
  payoutSeq: 0,
  payoutWinner: 0,
  labels: false,
};

/** A frozen stream of coins from the pot to the winning base. */
function CoinArc() {
  const to = BASES[WINNER - 1];
  return (
    <group>
      {Array.from({ length: 11 }, (_, i) => {
        const k = 0.12 + (i / 10) * 0.76;
        const jitter = ((i * 37) % 11) / 11 - 0.5;
        const x = CHEST[0] + (to[0] - CHEST[0]) * k + jitter * 0.2;
        const z = CHEST[2] + (to[2] - CHEST[2]) * k - jitter * 0.2;
        return (
          <mesh key={i} position={[x, 1.1 + Math.sin(Math.PI * k) * 2.0, z]} rotation={[0.9 + i * 0.7, i * 0.5, 0.4]}>
            <cylinderGeometry args={[0.2, 0.2, 0.05, 20]} />
            <meshStandardMaterial color={GOLD} emissive="#d97706" emissiveIntensity={2.2} metalness={0.8} roughness={0.25} />
          </mesh>
        );
      })}
    </group>
  );
}

function Banner() {
  return (
    <div className="banner">
      <div className="stage">
        <WarScene view={view} reducedMotion effects frame={FRAME}>
          <CoinArc />
        </WarScene>
      </div>
      <div className="shade" />
      <div className="copy">
        <div className="kicker">
          {CLANS.map((c) => (
            <span key={c.id} className="dot" style={{ background: c.color, boxShadow: `0 0 10px ${c.color}` }} />
          ))}
          <span>THE AGENT-ONLY CLAN WAR</span>
        </div>
        <div className="title">
          <span className="usd">$</span>
          <span className="name">CLAN</span>
        </div>
        <div className="hook">
          3 clans. 1 pot. <b>Every hour.</b>
        </div>
        <div className="sub">Only AI agent wallets can buy the curve · BNB Chain</div>
      </div>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(<Banner />);
// Give the scene time to load and the power beams time to settle before the capture.
setTimeout(() => document.fonts.ready.then(() => ((window as unknown as { __shotReady: boolean }).__shotReady = true)), 3500);
