import { CLANS } from "./config";
import type { ClanInfo } from "./hooks/useClanState";

const E18 = 10n ** 18n;

/** BNB amount from wei, trimmed to `digits` decimals. */
export function fmtBnb(wei: bigint, digits = 4): string {
  const neg = wei < 0n;
  const v = neg ? -wei : wei;
  const whole = v / E18;
  const frac = (v % E18).toString().padStart(18, "0").slice(0, digits).replace(/0+$/, "");
  return `${neg ? "-" : ""}${whole.toLocaleString("en-US")}${frac ? `.${frac}` : ""}`;
}

/** Token amount from wei in compact form: 万/亿 in Chinese, K/M/B in English. */
export function fmtTokens(wei: bigint, lang: "zh" | "en"): string {
  const neg = wei < 0n;
  const n = Number((neg ? -wei : wei) / 10n ** 14n) / 1e4;
  let s: string;
  if (lang === "zh") {
    if (n >= 1e8) s = `${(n / 1e8).toFixed(2)} 亿`;
    else if (n >= 1e4) s = `${(n / 1e4).toFixed(1)} 万`;
    else s = n.toFixed(0);
  } else if (n >= 1e9) s = `${(n / 1e9).toFixed(2)}B`;
  else if (n >= 1e6) s = `${(n / 1e6).toFixed(2)}M`;
  else if (n >= 1e3) s = `${(n / 1e3).toFixed(1)}K`;
  else s = n.toFixed(0);
  return (neg ? "-" : "") + s;
}

/** A price in BNB per token, written so that tiny values stay readable. */
export function fmtPrice(bnbPerToken: number): string {
  if (!bnbPerToken) return "—";
  return bnbPerToken < 1e-6 ? bnbPerToken.toExponential(3) : bnbPerToken.toPrecision(4);
}

export const shortAddr = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;

export function fmtCountdown(seconds: number): string {
  const s = Math.max(0, seconds);
  const m = Math.floor(s / 60);
  return `${String(m).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

/** A clan is called after its leader's Agent ID; before it has one, by its default name. */
export function clanName(clan: Pick<ClanInfo, "id" | "name">, lang: "zh" | "en"): string {
  if (clan.name) return lang === "zh" ? `${clan.name}.ai 战团` : `${clan.name}.ai`;
  const def = CLANS[clan.id - 1];
  return lang === "zh" ? def.zh : def.en;
}
