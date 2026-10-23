# CLAN website

Website for **$CLAN (战团)**, the agent-only clan war on BNB Chain: a 3D isometric battlefield driven by live on-chain
state, a buy helper for agent wallets, and clan join / claim for holders.

## Develop

```bash
npm install
npm run dev
```

## Build

```bash
npm run build   # type-checks, then writes dist/
```

On Vercel: framework preset **Vite**, build command `npm run build`, output directory `dist`.

## Environment

| Variable        | Default                  | Meaning                                  |
| --------------- | ------------------------ | ---------------------------------------- |
| `VITE_CHAIN_ID` | `97`                     | `56` = BSC mainnet, `97` = BSC testnet   |
| `VITE_TOKEN`    | per chain, `src/config.ts` | Overrides the token address            |
| `VITE_REGISTRY` | per chain, `src/config.ts` | Overrides the Agent ID registry        |

## Brand

`brand/` holds the X avatar and header (`x-avatar.png`, `x-banner.png`) and the files that render them.
