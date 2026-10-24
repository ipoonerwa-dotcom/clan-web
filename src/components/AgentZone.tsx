import { useMemo, useState } from "react";
import { encodeFunctionData, formatEther, isAddress, parseEther } from "viem";
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

/** One contract call written as to / value / data, which Binance's Bibi AI (or any agent) can run without
    looking anything up, plus a one-line note on what it does. */
function callText(lang: string, to: string, value: bigint, data: string, note: string): string {
  const bnb = value > 0n ? (lang === "zh" ? `（即 ${formatEther(value)} BNB）` : ` (${formatEther(value)} BNB)`) : "";
  return lang === "zh"
    ? `请用我的 Agentic Wallet 在 BSC（chainId ${APP_CHAIN_ID}）发起一笔合约调用，不需要查代币余额：
to：${to}
value：${value}${bnb}
data：${data}
${note}。先给我看预览，我确认后再执行。`
    : `Use my Agentic Wallet to send one contract call on BSC (chainId ${APP_CHAIN_ID}); no token balance lookup is needed:
to: ${to}
value: ${value}${bnb}
data: ${data}
${note}. Show me the preview first and execute only after I confirm.`;
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

  const prompt = callText(lang, TOKEN, value, data, lang === "zh" ? `买入战团（CLAN），最少到手 ${fmtTokens(minTokens, lang)} 枚` : `Buy CLAN, at least ${fmtTokens(minTokens, lang)} tokens`);
  const command = `baw contract-call preview --binanceChainId ${APP_CHAIN_ID} --from ${isAddress(buyer) ? buyer : "<your-agent-wallet>"} --to ${TOKEN} --value ${value} --inputData ${data} --json`;

  // Selling back to the curve: amount in tokens, 5% slippage on the BNB out.
  const [sellAmt, setSellAmt] = useState("");
  const held = useReadContract({ address: TOKEN, abi: clanAbi, functionName: "balanceOf", args: [from], query: { enabled: from !== ZERO } });
  const sellWei = useMemo(() => {
    try {
      const v = parseEther(sellAmt || "0");
      return v > 0n ? v : 0n;
    } catch {
      return 0n;
    }
  }, [sellAmt]);
  const sellQuote = useReadContract({ address: TOKEN, abi: clanAbi, functionName: "quoteSell", args: [sellWei], query: { enabled: sellWei > 0n } });
  const bnbOut = sellQuote.data?.[0] ?? 0n;
  const minBnb = (bnbOut * 95n) / 100n;
  const sellData = encodeFunctionData({ abi: clanAbi, functionName: "sell", args: [sellWei, minBnb] });
  const sellPrompt =
    sellWei > 0n && bnbOut > 0n
      ? callText(lang, TOKEN, 0n, sellData, lang === "zh" ? `卖出 ${fmtTokens(sellWei, lang)} 枚战团（CLAN），预计到手约 ${fmtBnb(bnbOut, 6)} BNB，少于 ${fmtBnb(minBnb, 6)} BNB 就不成交` : `Sell ${fmtTokens(sellWei, lang)} CLAN for about ${fmtBnb(bnbOut, 6)} BNB; it fails below ${fmtBnb(minBnb, 6)} BNB`)
      : t.sellNeedAmount;
  const sellCommand = `baw contract-call preview --binanceChainId ${APP_CHAIN_ID} --from ${isAddress(buyer) ? buyer : "<your-agent-wallet>"} --to ${TOKEN} --value 0 --inputData ${sellData} --json`;

  // Instructions anyone can paste as they are: no address, no quote.
  const zeroBuy = encodeFunctionData({ abi: clanAbi, functionName: "buy", args: [0n] });
  const quickBuy = callText(lang, TOKEN, 50_000_000_000_000_000n, zeroBuy, lang === "zh" ? "买入 0.05 BNB 的战团（CLAN），不设防滑点" : "Buy CLAN with 0.05 BNB, no slippage limit");
  const quickCmd = `baw contract-call preview --binanceChainId ${APP_CHAIN_ID} --from <${lang === "zh" ? "你的Agent钱包地址" : "your-agent-wallet"}> --to ${TOKEN} --value 50000000000000000 --inputData ${zeroBuy} --json
baw contract-call execute --requestId <${lang === "zh" ? "预览返回的requestId" : "requestId-from-preview"}> --json`;

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
      <h3 className="sub">{t.quickTitle}</h3>
      <p className="muted small">{t.quickIntro}</p>
      <div className="grid2">
        <div className="copy-block">
          <div className="copy-head">
            <span>{t.quickBuy}</span>
            <Copy text={quickBuy} />
          </div>
          <pre>{quickBuy}</pre>
        </div>
        <div className="copy-block">
          <div className="copy-head">
            <span>{t.quickSell}</span>
          </div>
          <pre>{t.quickSellNote}</pre>
        </div>
      </div>
      <div className="copy-block" style={{ marginTop: 12 }}>
        <div className="copy-head">
          <span>{t.quickCmd}</span>
          <Copy text={quickCmd} />
        </div>
        <pre>{quickCmd}</pre>
      </div>
      <h3 className="sub">{t.genTitle}</h3>
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
      <h3 className="sub">{t.sellTitle}</h3>
      <p className="muted small">{t.sellIntro}</p>
      <div className="grid2">
        <div className="form">
          <label>
            {t.sellAmount}
            <div className="row-input">
              <input value={sellAmt} inputMode="decimal" placeholder="0" onChange={(e) => setSellAmt(e.target.value.replace(/[^0-9.]/g, ""))} />
              <button className="ghost small" disabled={!held.data} onClick={() => setSellAmt(formatEther(held.data ?? 0n))}>
                {t.sellAll}
              </button>
            </div>
          </label>
          {from !== ZERO ? (
            <div className="kv">
              <span>{t.youHold}</span>
              <b>{fmtTokens(held.data ?? 0n, lang)} CLAN</b>
            </div>
          ) : null}
          <div className="kv">
            <span>{t.youReceive}</span>
            <b>{bnbOut > 0n ? `${fmtBnb(bnbOut, 6)} BNB` : "—"}</b>
          </div>
        </div>
        <div className="form">
          <div className="copy-block">
            <div className="copy-head">
              <span>{t.promptLabel}</span>
              <Copy text={sellPrompt} />
            </div>
            <pre>{sellPrompt}</pre>
          </div>
          <div className="copy-block">
            <div className="copy-head">
              <span>{t.commandLabel}</span>
              <Copy text={sellCommand} />
            </div>
            <pre>{sellCommand}</pre>
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
