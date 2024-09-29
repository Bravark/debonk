// add dotenv
require("dotenv").config();

export const CHAINSTACK_RPC =
  "https://solana-mainnet.core.chainstack.com/2c30818c32edc444fcfc56cbbded3b48";
export const mainnetEndpoint =
  "https://solana-mainnet.g.alchemy.com/v2/Cmez3a2JqTIw7UWHdELw_41zxbSFzJlU";

export const SOL_PUBLIC_RPC = "https://api.mainnet-beta.solana.com";

export const SOL_DEV_RPC = "https://api.devnet.solana.com";

export const QUICKNODE_SOL_MAINNET =
  "https://tiniest-alien-sanctuary.solana-mainnet.quiknode.pro/bdf774f6d62abcde6d14aaceb577f20403a74ed2";
export const HELIUS_RPC_HTTPS =
  "https://mainnet.helius-rpc.com/?api-key=e052d4b4-b524-4d7e-9c1f-921f207125d6";
export const QUICKNODE_SOL_MAINNET_WS =
  "wss://tiniest-alien-sanctuary.solana-mainnet.quiknode.pro/bdf774f6d62abcde6d14aaceb577f20403a74ed2";

export const SOL_CONTRACT = "So11111111111111111111111111111111111111112";

//?FOR SOME REASON THEY DIVIDED BONK TOKEN BY 5 INSTAED FO THE NORMAL LAPORTS PERS OL
export const DIV = 5;

export const RPC_HTTPS_URLS = [
  "https://mainnet.helius-rpc.com/?api-key=e052d4b4-b524-4d7e-9c1f-921f207125d6",
  "https://tiniest-alien-sanctuary.solana-mainnet.quiknode.pro/bdf774f6d62abcde6d14aaceb577f20403a74ed2",
  "https://solana-mainnet.core.chainstack.com/2c30818c32edc444fcfc56cbbded3b48",
];

export const LEAST_AMOUNT_REMAINDER = 0.01;

export const KEYBOARD_QUERY = {
  BUY: "buy",
  UPDATE_TOKEN_BUY_TEXT: "update_token_buy_text",
  S_BUY: "s_buy",
  S_UPDATE_TOKEN_BUY_TEXT: "s_update_token_buy_text",
  SELL: "sell",
  S_SELL: "s_sell",
  HISTORY: "history",
  SETTINGS: "settings",
  ABOUT: "about",
  HELP: "help",

  VIEW_TOKEN_DETAILS: "view_token_details",
  BUY_AMOUNT: {
    B_01: "0.1",
    B_05: "0.5",
    B_1: "1",

    CUSTOM: "buy-custom",
  },
  S_BUY_AMOUNT: {
    S_B_01: "s0.1",
    S_B_05: "s0.5",
    S_B_1: "s1",
    S_CUSTOM: "buy-scustom",
  },
  SELL_PERCENT: {
    S_25: "25%",
    S_50: "50%",
    S_100: "100%",
    CUSTOM: "sell-custom",
  },
  S_SELL_PERCENT: {
    S_S_25: "s25%",
    S_S_50: "s50%",
    S_S_100: "s100%",
    S_CUSTOM: "sell-scustom",
  },

  GET_TOKEN_LIST: "get_token_list",
  UPDATE_TOKEN_LIST: "update_token_list",
  NEXT_TOKEN_LIST: "next_token_list",
  PREVIOUS_TOKEN_LIST: "previous_token_list",

  GET_KING_TOKEN_LIST: "get_king_token_list",
  UPDATE_KING_TOKEN_LIST: "update_king_token_list",

  POSITIONS: "positions",
  UPDATE_POSITIONS: "update_positions",

  S_POSITIONS: "s_positions",
  UPDATE_S_POSITIONS: "update_s_positions",

  WITHDRAW_TRX: "withdraw_sol",
  INIT_BRIDGE: "bridge",

  BACK_TO_HOME: "back_to_home",

  SHOW_WALLET: "show_wallet",
  UPDATE_SHOW_WALLET: "update_show_wallet",

  ENTER_SIMULATION: "enter_simulation",

  EXPORT_PRIVATE_KEY: "export_private_key",

  WITHDRAW_PROFIT: "withdraw_profit",

  UPDATE_TOKEN_DETAILS_BY_CA: "update_token_details_by_ca",
  S_UPDATE_TOKEN_DETAILS_BY_CA: "s_update_token_details_by_ca",

  SHOW_REFERRAL_DETAILS: "show_referred_details",

  BRIDGE_ROUTE: {
    SOL: {
      TEXT: "Sol -> Sol",
      QUERY: "sol_to_sol",
    },
    SOL_R: {
      TEXT: "Sol -> Sol",
      QUERY: "sol_to_sol",
    },
    ETH: {
      TEXT: "Eth -> Sol",
      QUERY: "eth_to_sol",
    },
    ETH_R: {
      TEXT: "Sol ->Eth",
      QUERY: "eth_to_sol",
    },
  },

  CLEAR_LISTENERS: "clear_listeners",
};

export interface Validator<T> {
  (value: T): Promise<boolean>;
}

export const FEE_TOKEN_MINT = "So11111111111111111111111111111111111111112";
export const FEE_TOKEN_ACCOUNT_FOR_WSOL =
  "51h481kJwJaWussDQgBUG9YuvpEwytwxmh9WLps4aJww";
export const TOKEN_LIST_INLINE_KEYBOARD = [
  [
    {
      text: "Previous Page",
      callback_data: KEYBOARD_QUERY.PREVIOUS_TOKEN_LIST,
    },
    {
      text: "Refresh",
      callback_data: KEYBOARD_QUERY.UPDATE_TOKEN_LIST,
    },
    {
      text: "Next Page",
      callback_data: KEYBOARD_QUERY.NEXT_TOKEN_LIST,
    },
  ],
  [
    {
      text: "Buy",
      callback_data: KEYBOARD_QUERY.BUY,
    },
  ],
];

export const KING_LIST_INLINE_KEYBOARD = [
  [
    {
      text: "Refresh",
      callback_data: KEYBOARD_QUERY.UPDATE_KING_TOKEN_LIST,
    },
  ],
  [
    {
      text: "Buy",
      callback_data: KEYBOARD_QUERY.BUY,
    },
  ],
];

export const INITIAL_INLINE_KEYBOARD = [
  [
    {
      text: "💸 Buy",
      callback_data: KEYBOARD_QUERY.BUY,
    },

    {
      text: "💴 Sell",
      callback_data: KEYBOARD_QUERY.SELL,
    },
  ],

  [
    {
      text: "📝 Positions",
      callback_data: KEYBOARD_QUERY.POSITIONS,
    },
  ],
  [
    {
      text: "🤑 Refer Your Friend",
      callback_data: KEYBOARD_QUERY.SHOW_REFERRAL_DETAILS,
    },
    {
      text: "💳 Wallet",
      callback_data: KEYBOARD_QUERY.SHOW_WALLET,
    },
  ],

  [
    {
      text: "🧪📊 Enter Simulation ",
      callback_data: KEYBOARD_QUERY.ENTER_SIMULATION,
    },
  ],
];
export const BACK_BUTTON = [
  {
    text: "<< Home",
    callback_data: KEYBOARD_QUERY.BACK_TO_HOME,
  },
];

export const CANCEL_BUTTON = [
  {
    text: "Cancel",
    callback_data: KEYBOARD_QUERY.CLEAR_LISTENERS,
  },
];

export const COLLECT_BUY_AMOUNT_INLINE_KEYBOARD = [
  [
    {
      text: `----- Buy -----`,
      callback_data: `bbb`,
    },
  ],
  [
    {
      text: `${KEYBOARD_QUERY.BUY_AMOUNT.B_01} Sol`,
      callback_data: KEYBOARD_QUERY.BUY_AMOUNT.B_01,
    },

    {
      text: `${KEYBOARD_QUERY.BUY_AMOUNT.B_05} Sol`,
      callback_data: KEYBOARD_QUERY.BUY_AMOUNT.B_05,
    },
    {
      text: `${KEYBOARD_QUERY.BUY_AMOUNT.B_1} Sol`,
      callback_data: KEYBOARD_QUERY.BUY_AMOUNT.B_1,
    },
    {
      text: `X SOL✏`,
      callback_data: KEYBOARD_QUERY.BUY_AMOUNT.CUSTOM,
    },
  ],
  [
    {
      text: "🔄 Refresh",
      callback_data: KEYBOARD_QUERY.UPDATE_TOKEN_BUY_TEXT,
    },
    ...BACK_BUTTON,
  ],
];

export const DEV_SOL_WALLET = `2xwSvyjJoeUWngstxADHrvYwuxhB5XuLfVawYqEUYdGD`;

export const BOT_USERNAME =
  process.env.ENV == "production" ? `debonk_bot` : "debonk_test_bot";

export const YOU_ARE_IN_THE_SIMULATION_TEXT = `-------------------------\n You are in a Simulation\n NO REAL MONEY IS BEING TRADED \n -------------------------\n`;

export const COLLECT_BUY_AMOUNT_INLINE_KEYBOARD_SIMULATION = [
  [
    {
      text: `----- Simulation Buy -----`,
      callback_data: `bbb`,
    },
  ],
  [
    {
      text: `${KEYBOARD_QUERY.S_BUY_AMOUNT.S_B_01} Sol`,
      callback_data: KEYBOARD_QUERY.S_BUY_AMOUNT.S_B_01,
    },
    {
      text: `${KEYBOARD_QUERY.S_BUY_AMOUNT.S_B_05} Sol`,
      callback_data: KEYBOARD_QUERY.S_BUY_AMOUNT.S_B_05,
    },
    {
      text: `${KEYBOARD_QUERY.S_BUY_AMOUNT.S_B_1} Sol`,
      callback_data: KEYBOARD_QUERY.S_BUY_AMOUNT.S_B_1,
    },
  ],
  [
    {
      text: `🧪📝 View Simulation Position `,
      callback_data: KEYBOARD_QUERY.S_POSITIONS,
    },
  ],
  [
    {
      text: `🔄 Refresh`,
      callback_data: KEYBOARD_QUERY.S_UPDATE_TOKEN_BUY_TEXT,
    },
    ...BACK_BUTTON,
  ],
];

export const COLLECT_SELL_AMOUNT_INLINE_KEYBOARD = [
  [
    {
      text: `----- Sell -----`,
      callback_data: `bbb`,
    },
  ],
  [
    {
      text: `Sell: ${KEYBOARD_QUERY.SELL_PERCENT.S_25}`,
      callback_data: KEYBOARD_QUERY.SELL_PERCENT.S_25,
    },
    {
      text: `Sell: ${KEYBOARD_QUERY.SELL_PERCENT.S_50}`,
      callback_data: KEYBOARD_QUERY.SELL_PERCENT.S_50,
    },
    {
      text: `Sell: ${KEYBOARD_QUERY.SELL_PERCENT.S_100}`,
      callback_data: KEYBOARD_QUERY.SELL_PERCENT.S_100,
    },
    {
      text: `X SOL ✏`,
      callback_data: KEYBOARD_QUERY.SELL_PERCENT.CUSTOM,
    },
  ],
];

export const COULD_NOT_GET_TOKEN_DETAILS_TEXT = `⚠Could not get token details\n\n -Please Make sure you are passing a token Contract Address or the pair address, and not a Wallet Address.\n -You can also Directly paste Links from Dex Screener, Dex Tools, Rug Checker, Bird Eye and others. `;

export const COLLECT_SELL_AMOUNT_INLINE_KEYBOARD_SIMULATION = [
  [
    {
      text: `----- Simulation Sell -----`,
      callback_data: `bbb`,
    },
  ],
  [
    {
      text: `Sell: ${KEYBOARD_QUERY.S_SELL_PERCENT.S_S_25}`,
      callback_data: KEYBOARD_QUERY.S_SELL_PERCENT.S_S_25,
    },
    {
      text: `Sell: ${KEYBOARD_QUERY.S_SELL_PERCENT.S_S_50}`,
      callback_data: KEYBOARD_QUERY.S_SELL_PERCENT.S_S_50,
    },
    {
      text: `Sell: ${KEYBOARD_QUERY.S_SELL_PERCENT.S_S_100}`,
      callback_data: KEYBOARD_QUERY.S_SELL_PERCENT.S_S_100,
    },
  ],

  CANCEL_BUTTON,
];

export const MIN_PROFIT_WITHDRAWAL_AMOUNT = 0.05;

export const REFERRAL_PERCENTS = {
  LEVEL_1: 35,
  LEVEL_2: 10,
  LEVEL_3: 5,
};

export const HELIUS_API_KEY = `e052d4b4-b524-4d7e-9c1f-921f207125d6`;

export const ADMIN_BOT_KEY =
  process.env.ENV === "production"
    ? "7661728334:AAGNa4sNSwXrJMa_zl1UfH9o-YXKkczRUhQ"
    : "7665709060:AAFQU7EZiXJXRbJjvZzT3rHAXt9dJAVYmwM";
export const ADMIN_KEYBOARD_QUERY = {
  //ADMIN
  ADMIN_UPDATE_USER_PROFIT: "admin_update_user_profit",
};

export const DEV_TELEGRAM_ID = 1729044712;

//for bridge

export const networkMap: { [key: string]: string } = {
  /**
   * this is for resolving similar networks and also resolving when the user input the network in a wired way
   */
  eth: "eth",
  ethereum: "eth",
  erc20: "eth",
  bsc: "bsc",
  binance: "bsc",
  binancesmartchain: "bsc",
  solana: "sol",
  bep20: "bsc",
  btc: "btc",
  bitcoin: "btc",
  avax: "cchain",
  avaxc: "cchain",
  polygon: "matic",
  litecoin: "ltc",
  tron: "sol",
  trc20: "sol",

  // Add more mappings as needed
};

export const evmChainsMap: { [key: string]: string } = {
  /**
   * this is for wallet address validation
   */
  eth: "eth",
  tron: "sol",
  trc20: "sol",
  bep20: "eth",
  ethereum: "eth",
  erc20: "eth",
  bsc: "eth", // Binance Smart Chain
  binance: "eth",
  solana: "sol",
  binancesmartchain: "eth",
  polygon: "eth", // Polygon (formerly Matic)
  matic: "eth",
  avax: "eth", // Avalanche C-Chain
  avalanche: "eth",
  fantom: "eth",
  ftm: "eth", // Fantom Opera
  arbitrum: "eth", // Arbitrum One
  arbitrumone: "eth",
  optimism: "eth",
  op: "eth", // Optimism
  xdai: "eth", // Gnosis Chain (formerly xDai)
  gnosis: "eth",
  heco: "eth", // Huobi ECO Chain
  harmony: "eth", // Harmony One
  one: "eth",
  kcc: "eth", // KuCoin Community Chain
  cronos: "eth", // Crypto.com Cronos Chain
  aurora: "eth", // Aurora (Near's EVM)
  metis: "eth", // Metis Andromeda
  moonbeam: "eth", // Moonbeam (Polkadot)
  moonriver: "eth", // Moonriver (Kusama)
  klaytn: "eth", // Klaytn
  celo: "eth", // Celo
  fuse: "eth", // Fuse Network
  tomochain: "eth", // TomoChain
  okex: "eth", // OKExChain
  okc: "eth", // OKC (OKExChain)
  velas: "eth", // Velas
  syscoin: "eth", // Syscoin NEVM
  telos: "eth", // Telos EVM
  kardia: "eth", // KardiaChain
  meter: "eth", // Meter.io
  milkomeda: "eth", // Milkomeda (Cardano)
  oec: "eth", // OEC (OKExChain)
  boba: "eth", // Boba Network
  bttc: "eth", // BitTorrent Chain
  oasis: "eth", // Oasis Emerald
  theta: "eth", // Theta
  conflux: "eth", // Conflux eSpace
};

export const SOLANA_ERROR_CODES = {
  SLIPPAGE_TOLERANCE_EXCEEDED: "0x1771",
  TIME_STAMP_ERROR: "0x1786",
};
export const APPLICATION_ERROR = {
  JUPITER_SWAP_ERROR: "quote_swap_error",
};

export const BUY_AND_SELL_KEYBOARD = [
  [...COLLECT_BUY_AMOUNT_INLINE_KEYBOARD[0]],
  [...COLLECT_BUY_AMOUNT_INLINE_KEYBOARD[1]],
  [...COLLECT_SELL_AMOUNT_INLINE_KEYBOARD[0]],
  [...COLLECT_SELL_AMOUNT_INLINE_KEYBOARD[1]],
  [
    {
      text: "🧪📊 Enter Simulation",
      callback_data: KEYBOARD_QUERY.ENTER_SIMULATION,
    },
  ],
  [
    {
      text: "🔄 Refresh",
      callback_data: KEYBOARD_QUERY.UPDATE_TOKEN_DETAILS_BY_CA,
    },
    ...BACK_BUTTON,
  ],
];

export const SIMULATION_BUY_AND_SELL_KEYBOARD = [
  [...COLLECT_BUY_AMOUNT_INLINE_KEYBOARD_SIMULATION[0]],
  [...COLLECT_BUY_AMOUNT_INLINE_KEYBOARD_SIMULATION[1]],
  [...COLLECT_SELL_AMOUNT_INLINE_KEYBOARD_SIMULATION[0]],
  [...COLLECT_SELL_AMOUNT_INLINE_KEYBOARD_SIMULATION[1]],
  [
    {
      text: "🧪📝 Simulation Positions",
      callback_data: KEYBOARD_QUERY.S_POSITIONS,
    },
  ],
  [
    {
      text: "Refresh",
      callback_data: KEYBOARD_QUERY.S_UPDATE_TOKEN_DETAILS_BY_CA,
    },
    ...BACK_BUTTON,
  ],
];
