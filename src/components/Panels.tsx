import { useAccount, useChainId, useConnect, useDisconnect, useSwitchChain } from "wagmi";
import { APP_CHAIN_ID, EXPLORER, PANCAKE_SWAP_URL, TOKEN } from "../config";
import { clanName, fmtBnb, fmtCountdown, fmtPrice, fmtTokens, shortAddr } from "../format";
import type { ClanState } from "../hooks/useClanState";
import { fmt, useI18n } from "../i18n";

export function TopBar({ state }: { state: ClanState }) {
  const { t, lang, setLang } = useI18n();
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const wrong = isConnected && chainId !== APP_CHAIN_ID;
  return (
    <header className="topbar">
      <div className="brand">
        <span className="logo">{t.brand}</span>
        <span className="pill">{state.graduated ? t.phasePool : t.phaseCurve}</span>
        {APP_CHAIN_ID === 97 ? <span className="pill warn">Testnet</span> : null}
      </div>
      <div className="actions">
        <button className="ghost" onClick={() => setLang(lang === "zh" ? "en" : "zh")}>
          {lang === "zh" ? "EN" : "中文"}
        </button>
        {wrong ? (
          <button onClick={() => switchChain({ chainId: APP_CHAIN_ID })}>{t.wrongChain}</button>
        ) : isConnected && address ? (
          <button className="ghost" onClick={() => disconnect()} title={t.disconnect}>
            {shortAddr(address)}
          </button>
        ) : (
          <button className="primary" disabled={isPending || connectors.length === 0} onClick={() => connect({ connector: connectors[0] })}>
            {t.connect}
          </button>
        )}
      </div>
    </header>
  );
}

/** The clan that leads a round: the highest positive score, if no other clan ties it. */
export function leadingClan(state: ClanState): number {
  let best = 0n;
  let lead = 0;
  let tie = false;
  for (const c of state.clans) {
    if (c.score > best) {
      best = c.score;
      lead = c.id;
      tie = false;
    } else if (c.score === best && c.score > 0n) tie = true;
  }
  return tie ? 0 : lead;
}

export function Board({ state, now }: { state: ClanState; now: number }) {
  const { t, lang } = useI18n();
  const lead = leadingClan(state);
  const max = state.clans.reduce((m, c) => (c.score > m ? c.score : m), 0n);
  const last = state.clans.find((c) => c.id === state.lastWinner);
  return (
    <div className="panel board">
      <div className="board-head">
        <div>
          <div className="muted">{fmt(t.round, { n: (state.epoch + 1n).toString() })}</div>
          <div className="countdown">{state.epochEndsAt ? fmtCountdown(state.epochEndsAt - now) : "--:--"}</div>
          <div className="muted small">{t.endsIn}</div>
        </div>
        <div className="pot">
          <div className="muted">{t.pot}</div>
          <div className="pot-value">{fmtBnb(state.clanPot)} BNB</div>
        </div>
      </div>
      <div className="clan-rows">
        {state.clans.map((c) => {
          const width = max > 0n && c.score > 0n ? Number((c.score * 1000n) / max) / 10 : 0;
          return (
            <div key={c.id} className={`clan-row${lead === c.id ? " leading" : ""}`} style={{ ["--clan" as string]: c.color }}>
              <div className="clan-line">
                <span className="dot" />
                <span className="clan-name">{clanName(c, lang)}</span>
                <span className="muted small">{fmt(t.members, { n: c.members })}</span>
                <span className="clan-score">{fmtTokens(c.score, lang)}</span>
              </div>
              <div className="bar">
                <div style={{ width: `${width}%` }} />
              </div>
            </div>
          );
        })}
      </div>
      <div className="muted small last">
        {t.lastRound}：
        {state.epoch === 0n
          ? "—"
          : !state.lastSettled
            ? last
              ? fmt(t.lastPending, { name: clanName(last, lang) })
              : t.lastPendingNone
            : last && state.lastPayout > 0n
              ? fmt(t.lastWon, { name: clanName(last, lang), bnb: fmtBnb(state.lastPayout) })
              : t.lastRolled}
      </div>
    </div>
  );
}

export function CurvePanel({ state }: { state: ClanState }) {
  const { t } = useI18n();
  const supply = Number(state.maxSupply / 10n ** 18n);
  if (state.graduated) {
    return (
      <div className="panel curve">
        <div className="muted">{t.graduated}</div>
        <div className="kv">
          <span>{t.price}</span>
          <b>{fmtPrice(state.poolPrice)} BNB</b>
        </div>
        <div className="kv">
          <span>{t.mcap}</span>
          <b>{state.poolPrice ? (state.poolPrice * supply).toFixed(2) : "—"} BNB</b>
        </div>
        {APP_CHAIN_ID === 56 ? (
          <a className="button primary" href={PANCAKE_SWAP_URL} target="_blank" rel="noreferrer">
            {t.buyOnPancake}
          </a>
        ) : null}
      </div>
    );
  }
  const pct = state.graduationBnb > 0n ? Number((state.curveBnb * 10000n) / state.graduationBnb) / 100 : 0;
  const price = Number(state.curvePrice) / 1e18;
  return (
    <div className="panel curve">
      <div className="muted">{t.curveTitle}</div>
      <div className="progress">
        <div style={{ width: `${Math.min(100, pct)}%` }} />
      </div>
      <div className="kv">
        <span>{t.raised}</span>
        <b>
          {fmtBnb(state.curveBnb, 3)} / {fmtBnb(state.graduationBnb, 2)} BNB · {pct.toFixed(1)}%
        </b>
      </div>
      <div className="kv">
        <span>{t.price}</span>
        <b>{fmtPrice(price)} BNB</b>
      </div>
      <div className="kv">
        <span>{t.mcap}</span>
        <b>{price ? (price * supply).toFixed(2) : "—"} BNB</b>
      </div>
    </div>
  );
}

/** Phones and devices without WebGL get the battlefield as three cards. */
export function FlatBattle({ state, noWebgl }: { state: ClanState; noWebgl: boolean }) {
  const { t, lang } = useI18n();
  const lead = leadingClan(state);
  return (
    <div className="flat">
      {noWebgl ? <div className="muted small">{t.noWebgl}</div> : null}
      <div className="flat-grid">
        {state.clans.map((c) => (
          <div key={c.id} className={`flat-card${lead === c.id ? " leading" : ""}`} style={{ ["--clan" as string]: c.color }}>
            <div className="flat-crown">{c.name ? "♛" : "⚑"}</div>
            <div className="clan-name">{clanName(c, lang)}</div>
            <div className="muted small">{fmt(t.members, { n: c.members })}</div>
            <div className="clan-score">{fmtTokens(c.score, lang)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function Rules() {
  const { t } = useI18n();
  return (
    <section className="panel section">
      <h2>{t.rulesTitle}</h2>
      <ol className="rules">
        {t.rules.map((r) => (
          <li key={r}>{r}</li>
        ))}
      </ol>
    </section>
  );
}

export function Footer() {
  const { t } = useI18n();
  return (
    <footer className="footer">
      <div>
        {t.contract}：
        <a href={`${EXPLORER}/address/${TOKEN}`} target="_blank" rel="noreferrer">
          {TOKEN}
        </a>
      </div>
      <div className="muted small">{t.disclaimer}</div>
    </footer>
  );
}
