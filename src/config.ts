import { bsc, bscTestnet } from "wagmi/chains";

/** The one place that decides which chain the site runs on. Mainnet unless VITE_CHAIN_ID=97. */
export const APP_CHAIN_ID: 56 | 97 = import.meta.env.VITE_CHAIN_ID === "97" ? 97 : 56;
export const CHAIN = APP_CHAIN_ID === 56 ? bsc : bscTestnet;

const DEPLOYMENTS = {
  56: {
    token: "0x087b2C423470A4b67900415bCE495Ab9E1B1d455",
    registry: "0x60B9262456dE011F7d15a54CdD8c48bAaa8B022F",
  },
  97: {
    token: "0x5191d5c1F15795A49f807aaDf36E6319FE8E1989",
    registry: "0x80c4ac429B069DD8235a0E38AF1b773Da32b103e",
  },
} as const;

export const TOKEN = (import.meta.env.VITE_TOKEN || DEPLOYMENTS[APP_CHAIN_ID].token) as `0x${string}`;
export const REGISTRY = (import.meta.env.VITE_REGISTRY || DEPLOYMENTS[APP_CHAIN_ID].registry) as `0x${string}`;
export const RPC_URL = APP_CHAIN_ID === 56 ? "https://bsc-dataseed.bnbchain.org" : "https://bsc-testnet-rpc.publicnode.com";
export const EXPLORER = APP_CHAIN_ID === 56 ? "https://bscscan.com" : "https://testnet.bscscan.com";
export const PANCAKE_SWAP_URL = `https://pancakeswap.finance/swap?chain=bsc&outputCurrency=${TOKEN}`;

/** The three clans: colour and the name shown before a clan has a leader. */
export const CLANS = [
  { id: 1, color: "#ff4d6d", zh: "一号战团", en: "Clan I" },
  { id: 2, color: "#22d3ee", zh: "二号战团", en: "Clan II" },
  { id: 3, color: "#a3e635", zh: "三号战团", en: "Clan III" },
] as const;

export const GOLD = "#fbbf24";
export const POLL_MS = 6000;

export const X_URL = "https://x.com/AgentClanWar";
