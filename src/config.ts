import { bsc, bscTestnet } from "wagmi/chains";

/** The one place that decides which chain the site runs on. Set VITE_CHAIN_ID=56 for mainnet builds. */
export const APP_CHAIN_ID: 56 | 97 = import.meta.env.VITE_CHAIN_ID === "56" ? 56 : 97;
export const CHAIN = APP_CHAIN_ID === 56 ? bsc : bscTestnet;

const DEPLOYMENTS = {
  56: {
    token: "0x0000000000000000000000000000000000000000",
    registry: "0x60B9262456dE011F7d15a54CdD8c48bAaa8B022F",
  },
  97: {
    token: "0x463bF473cebed19E1B9f7D117E1B93DeE67531A3",
    registry: "0xB84D8e2cF2D24f3022b853A8D227dEbC753a3F96",
  },
} as const;

export const TOKEN = (import.meta.env.VITE_TOKEN || DEPLOYMENTS[APP_CHAIN_ID].token) as `0x${string}`;
export const REGISTRY = (import.meta.env.VITE_REGISTRY || DEPLOYMENTS[APP_CHAIN_ID].registry) as `0x${string}`;
export const RPC_URL = APP_CHAIN_ID === 56 ? "https://bsc-rpc.publicnode.com" : "https://bsc-testnet-rpc.publicnode.com";
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
