import { createContext, type ReactNode, useContext, useMemo, useState } from "react";

const zh = {
  brand: "战团",
  tagline: "Agent 专属内盘 · 三大战团每小时争夺奖池",
  phaseCurve: "内盘 · 仅限 Agent",
  phasePool: "外盘 · 全员开放",
  connect: "连接钱包",
  disconnect: "断开",
  wrongChain: "切换到 BSC",
  round: "第 {n} 轮",
  endsIn: "本轮剩余",
  pot: "奖池",
  members: "{n} 人",
  leader: "团长",
  noLeader: "暂无团长",
  netBuy: "本轮净买入",
  lastRound: "上一轮",
  lastWon: "{name} 赢得 {bnb} BNB",
  lastRolled: "无人领先，奖池滚存",
  lastPending: "{name} 领先，下一笔交易时结算",
  lastPendingNone: "下一笔交易时结算",
  curveTitle: "内盘进度",
  raised: "已募集",
  price: "价格",
  mcap: "市值",
  graduated: "已毕业，进入 PancakeSwap",
  buyOnPancake: "去 PancakeSwap 买",
  agentTitle: "Agent 内盘区",
  agentIntro: "内盘只有持有 Agent ID 的币安 Agentic Wallet 能买。网页连接不了 Agent 钱包，请把下面的指令复制给你的 AI。",
  step1: "在币安钱包给 Agentic Wallet 领一个 .ai Agent ID",
  step2: "在币安 App 打开开发者模式（调用合约需要）",
  step3: "填好金额，把指令复制给你的 AI（战团按钱包地址自动分配，不用选）",
  amount: "买入 BNB",
  yourClanAuto: "你的战团（按钱包地址自动分配）",
  clanAfterAddress: "填入 Agent 钱包地址后显示",
  joinTo: "你的钱包属于 {clan}",
  yourAgent: "你的 Agent 钱包地址（可选，用于计算额度）",
  youGet: "预计到手",
  minGet: "最少到手（5% 滑点）",
  promptLabel: "复制给 AI 的指令",
  commandLabel: "或者直接执行的命令",
  copy: "复制",
  copied: "已复制",
  checkTitle: "查询地址是不是 Agent",
  check: "查询",
  isAgentYes: "是 Agent：{name}",
  isAgentNo: "不是 Agent",
  myTitle: "我的战团",
  notConnected: "连接钱包后查看你的战团、战斗持仓和待领奖励",
  myClan: "所在战团",
  none: "未加入",
  balance: "持仓",
  scored: "战斗持仓",
  owedBnb: "待领 BNB",
  owedTokens: "待领入团费",
  claim: "领取",
  join: "交入团费加入",
  joinHint: "入团费 {fee} 枚，分给该团现有成员",
  joinOnlyAfter: "外盘开启后才能入团",
  challenge: "夺位成为团长",
  challengeHint: "你的战斗持仓已超过现任团长",
  pending: "确认中…",
  rulesTitle: "规则",
  rules: [
    "内盘只有 Agent 能买，每个 Agent 最多买 1%；战团按钱包地址自动分配，不能自己选，也不能换。",
    "募满 16 BNB 自动迁到 PancakeSwap，LP 打进黑洞，合约没有管理员。",
    "买卖税各 1%：30% 按持仓分给全体持币人，70% 进战团奖池。",
    "每小时一轮，成员净买入最多的战团赢下奖池，按成员的战斗持仓分。",
    "战斗持仓 = 自己买入、并且还拿着的币；别人转进来的不算。",
    "团长是团里战斗持仓最大的 Agent，战团用团长的 .ai 名字命名。",
    "外盘玩家交入团费即可入团（同样按钱包地址分配战团），入团费分给该团现有成员。",
  ],
  contract: "合约",
  disclaimer: "链上实验项目，不构成任何投资建议，请自行评估风险。",
  noWebgl: "当前设备不支持 3D，已切换为简洁模式",
};

const en: typeof zh = {
  brand: "CLAN",
  tagline: "Agent-only curve · three clans fight for the pot every hour",
  phaseCurve: "Curve · agents only",
  phasePool: "Pool · open to all",
  connect: "Connect wallet",
  disconnect: "Disconnect",
  wrongChain: "Switch to BSC",
  round: "Round {n}",
  endsIn: "Round ends in",
  pot: "Pot",
  members: "{n} members",
  leader: "Leader",
  noLeader: "No leader yet",
  netBuy: "Net buy this round",
  lastRound: "Last round",
  lastWon: "{name} won {bnb} BNB",
  lastRolled: "No leader, the pot rolled over",
  lastPending: "{name} led, settles on the next trade",
  lastPendingNone: "Settles on the next trade",
  curveTitle: "Curve progress",
  raised: "Raised",
  price: "Price",
  mcap: "Market cap",
  graduated: "Graduated to PancakeSwap",
  buyOnPancake: "Buy on PancakeSwap",
  agentTitle: "Agent zone",
  agentIntro: "Only Binance Agentic Wallets with an Agent ID can buy on the curve. The site can't connect to an agent wallet, so copy the instruction below to your AI.",
  step1: "Claim a .ai Agent ID for your Agentic Wallet in Binance Wallet",
  step2: "Turn on Developer Mode in the Binance app (needed for contract calls)",
  step3: "Enter an amount, then copy the instruction to your AI (your wallet address sets your clan)",
  amount: "BNB to spend",
  yourClanAuto: "Your clan (set by wallet address)",
  clanAfterAddress: "Shown once you enter your agent wallet",
  joinTo: "Your wallet belongs to {clan}",
  yourAgent: "Your agent wallet (optional, for the limit)",
  youGet: "You get about",
  minGet: "At least (5% slippage)",
  promptLabel: "Instruction for your AI",
  commandLabel: "Or run this command",
  copy: "Copy",
  copied: "Copied",
  checkTitle: "Is this address an agent?",
  check: "Check",
  isAgentYes: "Agent: {name}",
  isAgentNo: "Not an agent",
  myTitle: "My clan",
  notConnected: "Connect a wallet to see your clan, scored balance and rewards",
  myClan: "Clan",
  none: "None",
  balance: "Balance",
  scored: "Scored balance",
  owedBnb: "BNB to claim",
  owedTokens: "Entry fees to claim",
  claim: "Claim",
  join: "Pay the fee and join",
  joinHint: "Entry fee {fee} tokens, shared by the clan's members",
  joinOnlyAfter: "Joining opens once the token is on PancakeSwap",
  challenge: "Take the lead",
  challengeHint: "Your scored balance is above the leader's",
  pending: "Confirming…",
  rulesTitle: "Rules",
  rules: [
    "Only agents can buy on the curve, at most 1% each; your wallet address sets your clan, for good.",
    "At 16 BNB the curve moves to PancakeSwap, the LP is burned, and there is no owner.",
    "1% tax on buys and sells: 30% to all holders by balance, 70% to the clan pot.",
    "Every hour the clan whose members bought the most net wins the pot, shared by scored balance.",
    "Scored balance = tokens you bought and still hold; tokens sent to you don't count.",
    "Each clan is led and named by its agent with the largest scored balance.",
    "On the pool anyone can join for the entry fee (the clan is set by address too); the fee goes to its members.",
  ],
  contract: "Contract",
  disclaimer: "An on-chain experiment. Not investment advice.",
  noWebgl: "3D isn't available on this device, showing the simple view",
};

export type Dict = typeof zh;
type Lang = "zh" | "en";

const Ctx = createContext<{ t: Dict; lang: Lang; setLang: (l: Lang) => void }>({ t: zh, lang: "zh", setLang: () => {} });

function initialLang(): Lang {
  try {
    const saved = localStorage.getItem("clan-lang");
    if (saved === "zh" || saved === "en") return saved;
  } catch {
    // storage blocked: fall back to the browser language
  }
  return navigator.language.toLowerCase().startsWith("zh") ? "zh" : "en";
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(initialLang);
  const value = useMemo(
    () => ({
      t: lang === "zh" ? zh : en,
      lang,
      setLang: (l: Lang) => {
        setLangState(l);
        try {
          localStorage.setItem("clan-lang", l);
        } catch {
          // ignore
        }
      },
    }),
    [lang],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useI18n = () => useContext(Ctx);

/** Fill {placeholders} in a dictionary string. */
export const fmt = (s: string, vars: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ""));
