import { useMemo, useState } from "react";
import { encodeFunctionData, isAddress, parseEther } from "viem";
import { useReadContract } from "wagmi";
import { clanAbi } from "../abi";
import { APP_CHAIN_ID, CLANS, REGISTRY, TOKEN } from "../config";
import { clanName, fmtBnb, fmtTokens } from "../format";
import { type ClanState, registryAbi, ZERO } from "../hooks/useClanState";
import { fmt, useI18n } from "../i18n";

function Copy({ text }: { text: string }) {
  const { t } = useI18n();
  const [done, setDone] = useState(false);
  return (
    <button
      className="ghost small"
      onClick={() => {
        void navigator.clipboard.writeText(text).then(() => {
          setDone(true);
          setTimeout(() => setDone(false), 1500);
        });
      }}
    >
      {done ? t.copied : t.copy}
    </button>
  );
}

/** Agents can't connect a browser wallet, so this builds the exact call for their AI to make. */
export function AgentZone({ state }: { state: ClanState }) {
  const { t, lang } = useI18n();
  const [bnb, setBnb] = useState("0.05");
  const [buyer, setBuyer] = useState("");
  const [check, setCheck] = useState("");

  const value = useMemo(() => {
    try {
      const v = parseEther(bnb || "0");
      return v > 0n ? v : 0n;
    } catch {
      return 0n;
    }
  }, [bnb]);
  const from = isAddress(buyer) ? buyer : ZERO;
  const quote = useReadContract({
    address: TOKEN,
    abi: clanAbi,
    functionName: "quoteBuy",
    args: [from, value],
    query: { enabled: value > 0n && !state.graduated },
  });
  const [tokens, spent] = quote.data ?? [0n, 0n, 0n];
  const minTokens = (tokens * 95n) / 100n;
  const data = encodeFunctionData({ abi: clanAbi, functionName: "buy", args: [minTokens] });
  // The clan is fixed by the wallet address, so it can be shown before the first buy.
  const assigned = useReadContract({ address: TOKEN, abi: clanAbi, functionName: "clanFor", args: [from], query: { enabled: from !== ZERO } });
  const clan = from !== ZERO ? assigned.data : undefined;
  const name = clan ? clanName(state.clans[clan - 1] ?? { id: clan as 1 | 2 | 3, name: "" }, lang) : "";

  const prompt =
    lang === "zh"
      ? `请用我的 Binance Agentic Wallet 在 BSC（chainId ${APP_CHAIN_ID}）上调用合约 ${TOKEN}（战团 CLAN）买入：函数 buy(uint256 minTokens)，minTokens = ${minTokens}，同时转入 ${bnb} BNB（value = ${value} wei）。inputData = ${data}。先用 contract-call preview 给我看结果，我确认后再执行。`
      : `Use my Binance Agentic Wallet to call contract ${TOKEN} (CLAN) on BSC (chainId ${APP_CHAIN_ID}): buy(uint256 minTokens) with minTokens = ${minTokens}, sending ${bnb} BNB (value = ${value} wei). inputData = ${data}. Preview it with contract-call preview first and wait for my confirmation before executing.`;
  const command = `baw contract-call preview --binanceChainId ${APP_CHAIN_ID} --from ${isAddress(buyer) ? buyer : "<your-agent-wallet>"} --to ${TOKEN} --value ${value} --inputData ${data} --json`;

  const checkAddr = isAddress(check) ? check : undefined;
  const agent = useReadContract({ address: TOKEN, abi: clanAbi, functionName: "isAgent", args: [checkAddr ?? ZERO], query: { enabled: !!checkAddr } });
  const handle = useReadContract({ address: REGISTRY, abi: registryAbi, functionName: "handleOf", args: [checkAddr ?? ZERO], query: { enabled: !!checkAddr } });

  return (
    <section className="panel section">
      <h2>{t.agentTitle}</h2>
      <p className="muted">{t.agentIntro}</p>
      <ol className="steps">
        <li>{t.step1}</li>
        <li>{t.step2}</li>
        <li>{t.step3}</li>
      </ol>
      <div className="grid2">
        <div className="form">
          <label>
            {t.amount}
            <input value={bnb} inputMode="decimal" onChange={(e) => setBnb(e.target.value.replace(/[^0-9.]/g, ""))} />
          </label>
          <label>
            {t.yourAgent}
            <input value={buyer} placeholder="0x…" onChange={(e) => setBuyer(e.target.value.trim())} />
          </label>
          <div className="kv">
            <span>{t.yourClanAuto}</span>
            <b style={{ color: clan ? CLANS[clan - 1]?.color : undefined }}>{clan ? name : t.clanAfterAddress}</b>
          </div>
          <div className="kv">
            <span>{t.youGet}</span>
            <b>{tokens > 0n ? `${fmtTokens(tokens, lang)} CLAN` : "—"}</b>
          </div>
          <div className="kv">
            <span>{t.minGet}</span>
            <b>{tokens > 0n ? `${fmtTokens(minTokens, lang)} CLAN` : "—"}</b>
          </div>
          {spent > 0n && spent < value ? <div className="muted small">≈ {fmtBnb(spent)} BNB</div> : null}
        </div>
        <div className="form">
          <div className="copy-block">
            <div className="copy-head">
              <span>{t.promptLabel}</span>
              <Copy text={prompt} />
            </div>
            <pre>{prompt}</pre>
          </div>
          <div className="copy-block">
            <div className="copy-head">
              <span>{t.commandLabel}</span>
              <Copy text={command} />
            </div>
            <pre>{command}</pre>
          </div>
        </div>
      </div>
      <div className="checker">
        <span>{t.checkTitle}</span>
        <input value={check} placeholder="0x…" onChange={(e) => setCheck(e.target.value.trim())} />
        {checkAddr && agent.data !== undefined ? (
          <b className={agent.data ? "ok" : "bad"}>{agent.data ? fmt(t.isAgentYes, { name: `${handle.data || "?"}.ai` }) : t.isAgentNo}</b>
        ) : null}
      </div>
    </section>
  );
}
