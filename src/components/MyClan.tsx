import { useEffect, useState } from "react";
import { useAccount, useReadContract, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { clanAbi } from "../abi";
import { CLANS, TOKEN } from "../config";
import { clanName, fmtBnb, fmtTokens } from "../format";
import { type ClanState, useAccountState, ZERO } from "../hooks/useClanState";
import { fmt, useI18n } from "../i18n";

export function MyClan({ state }: { state: ClanState }) {
  const { t, lang } = useI18n();
  const { address, isConnected } = useAccount();
  const me = useAccountState(address);
  const [pick, setPick] = useState(1);
  const { writeContract, data: hash, isPending, reset } = useWriteContract();
  const receipt = useWaitForTransactionReceipt({ hash });
  useEffect(() => {
    if (receipt.isSuccess) {
      me.refetch();
      reset();
    }
  }, [receipt.isSuccess]); // eslint-disable-line react-hooks/exhaustive-deps

  const myClan = state.clans.find((c) => c.id === me.clan);
  const leaderScored = useReadContract({
    address: TOKEN,
    abi: clanAbi,
    functionName: "scoredBalanceOf",
    args: [myClan?.leader ?? ZERO],
    query: { enabled: !!myClan },
  });
  const busy = isPending || receipt.isLoading;
  const canChallenge =
    !!myClan && me.isAgent && address !== undefined && myClan.leader.toLowerCase() !== address.toLowerCase() && me.scored > (leaderScored.data ?? 0n);

  if (!isConnected || !address) {
    return (
      <section className="panel section">
        <h2>{t.myTitle}</h2>
        <p className="muted">{t.notConnected}</p>
      </section>
    );
  }
  const owedBnb = me.owedDividend + me.owedClanBnb;
  return (
    <section className="panel section">
      <h2>{t.myTitle}</h2>
      <div className="stats">
        <div>
          <span className="muted small">{t.myClan}</span>
          <b style={{ color: myClan?.color }}>{myClan ? clanName(myClan, lang) : t.none}</b>
          {me.isAgent ? <span className="muted small">{me.handle ? `${me.handle}.ai` : "Agent"}</span> : null}
        </div>
        <div>
          <span className="muted small">{t.balance}</span>
          <b>{fmtTokens(me.balance, lang)}</b>
        </div>
        <div>
          <span className="muted small">{t.scored}</span>
          <b>{fmtTokens(me.scored, lang)}</b>
        </div>
        <div>
          <span className="muted small">{t.owedBnb}</span>
          <b>{fmtBnb(owedBnb, 6)}</b>
        </div>
        <div>
          <span className="muted small">{t.owedTokens}</span>
          <b>{fmtTokens(me.owedClanTokens, lang)}</b>
        </div>
      </div>
      <div className="row-actions">
        {owedBnb > 0n || me.owedClanTokens > 0n ? (
          <button className="primary" disabled={busy} onClick={() => writeContract({ address: TOKEN, abi: clanAbi, functionName: "claim" })}>
            {busy ? t.pending : t.claim}
          </button>
        ) : null}
        {canChallenge ? (
          <button disabled={busy} title={t.challengeHint} onClick={() => writeContract({ address: TOKEN, abi: clanAbi, functionName: "challengeLeader", args: [address] })}>
            {busy ? t.pending : t.challenge}
          </button>
        ) : null}
      </div>
      {me.clan === 0 ? (
        state.graduated ? (
          <div className="join">
            <div className="clan-pick">
              {CLANS.map((c) => (
                <button key={c.id} className={pick === c.id ? "picked" : "ghost"} style={{ ["--clan" as string]: c.color }} onClick={() => setPick(c.id)}>
                  {clanName(state.clans[c.id - 1] ?? { id: c.id, name: "" }, lang)}
                </button>
              ))}
            </div>
            <button
              className="primary"
              disabled={busy || me.balance < state.entryFee}
              onClick={() => writeContract({ address: TOKEN, abi: clanAbi, functionName: "joinClan", args: [pick] })}
            >
              {busy ? t.pending : t.join}
            </button>
            <span className="muted small">{fmt(t.joinHint, { fee: fmtTokens(state.entryFee, lang) })}</span>
          </div>
        ) : (
          <p className="muted small">{t.joinOnlyAfter}</p>
        )
      ) : null}
    </section>
  );
}
