import { createConfig, http } from "wagmi";
import { injected } from "wagmi/connectors";
import { APP_CHAIN_ID, CHAIN, RPC_URL } from "./config";

/** Browser wallets (MetaMask, OKX, Binance Web3 Wallet, TokenPocket...) through the injected provider. Reads are
    grouped with multicall rather than HTTP batching, which public BSC endpoints often reject. */
export const wagmiConfig = createConfig({
  chains: [CHAIN],
  connectors: [injected()],
  transports: { 56: http(APP_CHAIN_ID === 56 ? RPC_URL : undefined), 97: http(APP_CHAIN_ID === 97 ? RPC_URL : undefined) },
  batch: { multicall: true },
});

declare module "wagmi" {
  interface Register {
    config: typeof wagmiConfig;
  }
}
