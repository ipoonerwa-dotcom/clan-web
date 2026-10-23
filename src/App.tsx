import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { AgentZone } from "./components/AgentZone";
import { MyClan } from "./components/MyClan";
import { Board, CurvePanel, FlatBattle, Footer, leadingClan, Rules, TopBar } from "./components/Panels";
import { clanName, fmtBnb } from "./format";
import { useClanState, useNow, ZERO } from "./hooks/useClanState";
import { useI18n } from "./i18n";
import type { SceneView } from "./scene/WarScene";

const WarScene = lazy(() => import("./scene/WarScene"));

function hasWebGL(): boolean {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

export default function App() {
  const state = useClanState();
  const now = useNow();
  const { t, lang } = useI18n();
  const webgl = useMemo(hasWebGL, []);
  const [narrow, setNarrow] = useState(() => window.innerWidth < 760);
  useEffect(() => {
    const onResize = () => setNarrow(window.innerWidth < 760);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  const flat = narrow || !webgl;
  const reducedMotion = useMemo(() => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false, []);

  // Coins fly to the winner when a round we were watching gets paid.
  const [payout, setPayout] = useState({ seq: 0, winner: 0 });
  const paidRound = useRef<bigint | null>(null);
  useEffect(() => {
    if (!state.loaded || !state.lastSettled) return;
    const round = state.epoch - 1n;
    if (paidRound.current !== null && round > paidRound.current && state.lastPayout > 0n && state.lastWinner > 0) {
      setPayout((p) => ({ seq: p.seq + 1, winner: state.lastWinner }));
    }
    paidRound.current = round;
  }, [state.loaded, state.lastSettled, state.epoch, state.lastPayout, state.lastWinner]);

  const lead = leadingClan(state);
  const max = state.clans.reduce((m, c) => (c.score > m ? c.score : m), 0n);
  const view: SceneView = {
    clans: state.clans.map((c) => ({
      color: c.color,
      name: clanName(c, lang),
      members: c.members,
      power: max > 0n && c.score > 0n ? Number((c.score * 1000n) / max) / 1000 : 0,
      hasLeader: c.leader !== ZERO,
    })),
    leading: lead,
    pot: Number(state.clanPot) / 1e18,
    potLabel: `${t.pot} ${fmtBnb(state.clanPot)} BNB`,
    payoutSeq: payout.seq,
    payoutWinner: payout.winner,
  };

  return (
    <div className="app">
      <TopBar state={state} />
      <section className={flat ? "hero flat-hero" : "hero"}>
        {flat ? null : (
          <div className="stage">
            <Suspense fallback={<div className="stage-loading" />}>
              <WarScene view={view} reducedMotion={reducedMotion} effects={!reducedMotion} />
            </Suspense>
          </div>
        )}
        <div className="hero-overlay">
          <div className="hero-title">
            <h1>{t.brand}</h1>
            <p>{t.tagline}</p>
          </div>
          {flat ? <FlatBattle state={state} noWebgl={!webgl} /> : null}
          <Board state={state} now={now} />
          <CurvePanel state={state} />
        </div>
      </section>
      <main className="sections">
        {!state.graduated ? <AgentZone state={state} /> : null}
        <MyClan state={state} />
        <Rules />
      </main>
      <Footer />
    </div>
  );
}
