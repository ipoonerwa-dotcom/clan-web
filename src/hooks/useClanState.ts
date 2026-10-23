import { useEffect, useState } from "react";
import { useReadContracts } from "wagmi";
import { clanAbi } from "../abi";
import { CLANS, POLL_MS, REGISTRY, TOKEN } from "../config";

const token = { address: TOKEN, abi: clanAbi } as const;

export const pairAbi = [
  { type: "function", name: "getReserves", stateMutability: "view", inputs: [], outputs: [{ type: "uint112" }, { type: "uint112" }, { type: "uint32" }] },
  { type: "function", name: "token0", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
] as const;

export const registryAbi = [
  { type: "function", name: "handleOf", stateMutability: "view", inputs: [{ name: "wallet", type: "address" }], outputs: [{ type: "string" }] },
] as const;

export const ZERO = "0x0000000000000000000000000000000000000000";

export interface ClanInfo {
  id: 1 | 2 | 3;
  color: string;
  leader: `0x${string}`;
  name: string; // the leader's handle, without .ai, or ""
  members: number;
  score: bigint; // net tokens bought this round
}

export interface ClanState {
  loaded: boolean;
  graduated: boolean;
  sold: bigint;
  curveSupply: bigint;
  maxSupply: bigint;
  curveBnb: bigint;
  graduationBnb: bigint;
  curvePrice: bigint; // BNB per token, 1e18-scaled
  poolPrice: number; // BNB per token after graduation
  clanPot: bigint;
  epoch: bigint;
  epochEndsAt: number;
  entryFee: bigint;
  maxBuyPerAgent: bigint;
  pair: `0x${string}`;
  clans: ClanInfo[];
  lastWinner: number; // leader of the previous round, 0 = nobody
  lastPayout: bigint; // pot paid for the previous round
  lastSettled: boolean; // the previous round has been settled
}

function pick<T>(r: { result?: unknown; status: string } | undefined, fallback: T): T {
  return r && r.status === "success" ? (r.result as T) : fallback;
}

/** Everything the battle board shows, read in two multicalls and refreshed every few seconds. */
export function useClanState(): ClanState {
  const baseContracts: readonly unknown[] = [
    { ...token, functionName: "graduated" },
      { ...token, functionName: "sold" },
      { ...token, functionName: "curveSupply" },
      { ...token, functionName: "maxSupply" },
      { ...token, functionName: "curveBnb" },
      { ...token, functionName: "graduationBnb" },
      { ...token, functionName: "curvePrice" },
      { ...token, functionName: "clanPot" },
      { ...token, functionName: "currentEpoch" },
      { ...token, functionName: "epochEndsAt" },
      { ...token, functionName: "entryFee" },
      { ...token, functionName: "maxBuyPerAgent" },
      { ...token, functionName: "pair" },
      ...CLANS.map((c) => ({ ...token, functionName: "clanLeader", args: [BigInt(c.id)] }) as const),
      ...CLANS.map((c) => ({ ...token, functionName: "leaderName", args: [c.id] }) as const),
      ...CLANS.map((c) => ({ ...token, functionName: "clanMemberCount", args: [BigInt(c.id)] }) as const),
      { ...token, functionName: "settledEpochs" },
  ];
  // The list mixes fixed and per-clan calls, which defeats the per-entry typing; results are read with `pick`.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const base = useReadContracts({ contracts: baseContracts as any, query: { refetchInterval: POLL_MS } });
  const d = base.data;
  const epoch = pick<bigint>(d?.[8], 0n);
  const pair = pick<`0x${string}`>(d?.[12], ZERO);
  const graduated = pick<boolean>(d?.[0], false);

  const round = useReadContracts({
    contracts: [
      { ...token, functionName: "scoresOf", args: [epoch] },
      { ...token, functionName: "leaderOf", args: [epoch > 0n ? epoch - 1n : 0n] },
      { ...token, functionName: "epochPayout", args: [epoch > 0n ? epoch - 1n : 0n] },
      { address: pair, abi: pairAbi, functionName: "getReserves" },
      { address: pair, abi: pairAbi, functionName: "token0" },
    ],
    query: { refetchInterval: POLL_MS, enabled: base.isSuccess },
  });
  const r = round.data;
  const scores = pick<readonly bigint[]>(r?.[0], [0n, 0n, 0n]);
  const reserves = pick<readonly [bigint, bigint, number]>(r?.[3], [0n, 0n, 0]);
  const token0 = pick<string>(r?.[4], ZERO);
  const [rt, rb] = token0.toLowerCase() === TOKEN.toLowerCase() ? [reserves[0], reserves[1]] : [reserves[1], reserves[0]];

  return {
    loaded: base.isSuccess,
    graduated,
    sold: pick(d?.[1], 0n),
    curveSupply: pick(d?.[2], 0n),
    maxSupply: pick(d?.[3], 0n),
    curveBnb: pick(d?.[4], 0n),
    graduationBnb: pick(d?.[5], 0n),
    curvePrice: pick(d?.[6], 0n),
    poolPrice: rt > 0n ? Number(rb) / Number(rt) : 0,
    clanPot: pick(d?.[7], 0n),
    epoch,
    epochEndsAt: Number(pick<bigint>(d?.[9], 0n)),
    entryFee: pick(d?.[10], 0n),
    maxBuyPerAgent: pick(d?.[11], 0n),
    pair,
    clans: CLANS.map((c, i) => ({
      id: c.id,
      color: c.color,
      leader: pick<`0x${string}`>(d?.[13 + i], ZERO),
      name: pick<string>(d?.[16 + i], ""),
      members: Number(pick<bigint>(d?.[19 + i], 0n)),
      score: scores[i] ?? 0n,
    })),
    lastWinner: epoch > 0n ? Number(pick<number>(r?.[1], 0)) : 0,
    lastPayout: pick(r?.[2], 0n),
    lastSettled: epoch > 0n && pick<bigint>(d?.[22], 0n) >= epoch,
  };
}

export interface AccountState {
  clan: number;
  balance: bigint;
  scored: bigint;
  share: bigint;
  owedDividend: bigint;
  owedClanBnb: bigint;
  owedClanTokens: bigint;
  isAgent: boolean;
  handle: string;
  refetch: () => void;
}

/** The connected wallet's place in the war. */
export function useAccountState(address: `0x${string}` | undefined): AccountState {
  const a = address ?? ZERO;
  const q = useReadContracts({
    contracts: [
      { ...token, functionName: "clanOf", args: [a] },
      { ...token, functionName: "balanceOf", args: [a] },
      { ...token, functionName: "scoredBalanceOf", args: [a] },
      { ...token, functionName: "shareOf", args: [a] },
      { ...token, functionName: "owedTo", args: [a] },
      { ...token, functionName: "isAgent", args: [a] },
      { address: REGISTRY, abi: registryAbi, functionName: "handleOf", args: [a] },
    ],
    query: { refetchInterval: POLL_MS, enabled: !!address },
  });
  const d = q.data;
  const owed = pick<readonly [bigint, bigint, bigint]>(d?.[4], [0n, 0n, 0n]);
  return {
    clan: Number(pick<number>(d?.[0], 0)),
    balance: pick(d?.[1], 0n),
    scored: pick(d?.[2], 0n),
    share: pick(d?.[3], 0n),
    owedDividend: owed[0],
    owedClanBnb: owed[1],
    owedClanTokens: owed[2],
    isAgent: pick(d?.[5], false),
    handle: pick(d?.[6], ""),
    refetch: () => void q.refetch(),
  };
}

/** Seconds since the epoch, ticking once a second. */
export function useNow(): number {
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));
  useEffect(() => {
    const id = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}
