import { Prisma } from "@prisma/client";

export interface TokenData {
  id: number;
  symbol: string;
  ownerAddress: string;
  contractAddress: string;
  swapPoolAddress: string | null;
  name: string;
  description: string;
  logoUrl: string;
  decimals: number;
  twitterUrl: string;
  telegramUrl: string | null;
  websiteUrl: string;
  status: string;
  active: boolean;
  syncToTronScan: boolean;
  syncToTronScanDatetime: number;
  totalSupply: number;
  currentSold: number;
  createTxHash: string;
  tokenCreatedInstant: number;
  launchTxHash: string | null;
  priceInSol: number;
  tokenLaunchedInstant: number | null;
  solReserve: number;
  tokenReserve: number;
  marketCap: number;
  virtualLiquidity: number;
  volume24Hr: number;
  priceChange24Hr: number;
  pumpPercentage: number;
}

type Enumerate<
  N extends number,
  Acc extends number[] = []
> = Acc["length"] extends N
  ? Acc[number]
  : Enumerate<N, [...Acc, Acc["length"]]>;

type IntRange<F extends number, T extends number> = Exclude<
  Enumerate<T>,
  Enumerate<F>
>;

export type PercentRange = IntRange<1, 101>;

export interface BuyTokenParams {
  amountInSol: number;
  token: string;
  slippage?: number;
  privateKey?: string;
}
export interface SellTokenParams {
  token: string;
  percentToSell?: PercentRange;
  privateKey?: string;
  slippage?: number;
}
export type SellTokenInSolParams = Omit<SellTokenParams, "percentToSell"> & {
  amountToSellInSol: string;
};

// Type Guard to check if the param is SellTokenParams
export const isSellTokenParams = (
  params: SellTokenParams | SellTokenInSolParams
): params is SellTokenParams => {
  return (params as SellTokenParams).percentToSell !== undefined;
};

// Type Guard to check if the param is SellTokenInSolParams
export const isSellTokenInSolParams = (
  params: SellTokenParams | SellTokenInSolParams
): params is SellTokenInSolParams => {
  return (params as SellTokenInSolParams).amountToSellInSol !== undefined;
};

export type HolderType = "BOUNDING_CURVE" | "NORMAL_USER" | "CREATOR";

export interface Holder {
  address: string;
  balance: number;
  priceInSol: number;
  valueInSol: number;
  percentage: number;
  holderType: HolderType;
}

export interface Token {
  address: string;
  name: string;
  symbol: string;
}

export interface TokenDetails {
  name: string;
  symbol: string;
  address: string;
  priceUsd: number;
  priceNative: number;
  mc: number;
  liquidityInUsd: number;
  twitterUrl: string;
  websiteUrl: string;
  telegramUrl: string;
  volume: {
    m5: number;
    h1: number;
    h24: number;
    d7?: number;
  };
  change: {
    m5: number;
    h1: number;
    h24: number;
    d7?: number;
  };
  source?: "REGULAR" | "PUMPFUN";
}

export interface Txns {
  m5: { buys: number; sells: number };
  h1: { buys: number; sells: number };
  h6: { buys: number; sells: number };
  h24: { buys: number; sells: number };
}

export interface Volume {
  h24: number;
  h6: number;
  h1: number;
  m5: number;
}

export interface PriceChange {
  m5: number;
  h1: number;
  h6: number;
  h24: number;
}

export interface Liquidity {
  usd: number;
  base: number;
  quote: number;
}

export interface Info {
  imageUrl: string;
  websites: { label: string; url: string }[];
  socials: { type: string; url: string }[];
}

export interface Pair {
  chainId: string;
  dexId: string;
  url: string;
  pairAddress: string;
  baseToken: Token;
  quoteToken: Token;
  priceNative: string;
  priceUsd: string;
  txns: Txns;
  volume: Volume;
  priceChange: PriceChange;
  liquidity: Liquidity;
  fdv: number;
  marketCap: number;
  pairCreatedAt: number;
  info: Info;
  boosts: { active: number };
}

export interface ResponseObject {
  schemaVersion: string;
  pairs: Pair[];
  pair: Pair;
}

export interface ID {
  chain: string;
  exchange: string;
  pair: string;
  token: string;
  tokenRef: string;
}

export interface DextScore {
  information: number;
  holders: number;
  pool: number;
  transactions: number;
  creation: number;
  total: number;
}

export interface Metrics {
  bondingCurveProgress: number;
  initialReserve: number;
  initialReserveRef: number;
  liquidity: number;
  initialLiquidity: number;
  initialLiquidityUpdatedAt: string;
  liquidityUpdatedAt: string;
  reserve: number;
  reserveRef: number;
}

export interface PeriodStatsVolume {
  total: number;
  buys: number;
  sells: number;
}

export interface PeriodStatsPrice {
  usd: {
    first: number;
    last: number;
    min: number;
    max: number;
    diff: number;
  };
  chain: {
    first: number;
    last: number;
    min: number;
    max: number;
    diff: number;
  };
}

export interface PeriodStatsLiquidity {
  usd: {
    first: number;
    last: number;
    min: number;
    max: number;
    diff: number;
  };
}

export interface PeriodStats {
  volume: PeriodStatsVolume;
  swaps: {
    total: number;
    buys: number;
    sells: number;
  };
  price: PeriodStatsPrice;
  liquidity: PeriodStatsLiquidity;
  volatility: number;
  makers: number;
  updatedAt: string;
}

export interface Pool {
  bondingCurveAddress: string;
}

export interface Token2 {
  id: {
    chain: string;
    token: string;
  };
  audit: {
    is_contract_renounced: boolean;
    dextools: {
      is_open_source: string;
      is_honeypot: string;
      is_mintable: string;
      is_proxy: string | null;
      slippage_modifiable: string;
      is_blacklisted: string | null;
      sell_tax: {
        min: number | null;
        max: number | null;
        status: string | null;
      };
      buy_tax: {
        min: number | null;
        max: number | null;
        status: string | null;
      };
      is_contract_renounced: string;
      is_potentially_scam: string;
      transfer_pausable: string | null;
      summary: {
        providers: {
          critical: string[];
          warning: string[];
          regular: string[];
        };
        review: {
          critical: string[];
          warning: string[];
          regular: string[];
        };
      };
      updatedAt: string;
    };
  };
  banner: string;
  decimals: number;
  info: {
    cmc: string;
    coingecko: string;
    description: string;
    dextools: boolean;
    email: string;
    extraInfo: string;
    nftCollection: string;
    ventures: boolean;
  };
  links: {
    bitbucket: string;
    discord: string;
    facebook: string;
    github: string;
    instagram: string;
    linkedin: string;
    medium: string;
    reddit: string;
    telegram: string;
    tiktok: string;
    twitter: string;
    website: string;
    youtube: string;
  };
  locks: string[];
  logo: string;
  metrics: {
    maxSupply: number;
    totalSupply: number;
    txCount: number;
    holdersUpdatedAt: string;
    holders: number;
    mcap: number | null;
    fdv: number;
  };
  name: string;
  symbol: string;
  totalSupply: string;
  reprPair: {
    id: ID;
    updatedAt: string;
  };
  categories: string[];
}

export interface DexToolResponse {
  id: ID;
  creationBlock: number;
  creationTime: string;
  creationTransaction: string;
  dextScore: DextScore;
  metrics: Metrics;
  name: string;
  nameRef: string;
  pool: Pool;
  symbol: string;
  symbolRef: string;
  type: string;
  locks: string[];
  firstSwapTimestamp: string;
  periodStats: {
    "5m": PeriodStats;
    "6h": PeriodStats;
    "1h": PeriodStats;
    "24h": PeriodStats;
  };
  token: Token2;
  price: number;
  price1h: {
    volume: number;
    swaps: number;
    price: number;
    priceChain: number;
    buys: number;
    sells: number;
    buysVolume: number;
    sellsVolume: number;
    minPrice: number;
    minPriceChain: number;
    maxPrice: number;
    maxPriceChain: number;
    makers: number;
  };
  price6h: {
    volume: number;
    swaps: number;
    price: number;
    priceChain: number;
    buys: number;
    sells: number;
    buysVolume: number;
    sellsVolume: number;
    minPrice: number;
    minPriceChain: number;
    maxPrice: number;
    maxPriceChain: number;
    makers: number;
  };
  price24h: {
    volume: number;
    swaps: number;
    price: number;
    priceChain: number;
    buys: number;
    sells: number;
    buysVolume: number;
    sellsVolume: number;
    minPrice: number;
    minPriceChain: number;
    maxPrice: number;
    maxPriceChain: number;
    makers: number;
  };
  price7d: {
    volume: number;
    swaps: number;
    price: number;
    priceChain: number;
    buys: number;
    sells: number;
    buysVolume: number;
    sellsVolume: number;
    minPrice: number;
    minPriceChain: number;
    maxPrice: number;
    maxPriceChain: number;
    makers: number;
  };
}
