import { Prisma } from "@prisma/client";

export const TransactionStatus = {
  NEW: "new",
  WAITING: "waiting",
  CONFIRMING: "confirming",
  EXCHANGING: "exchanging",
  SENDING: "sending",
  FINISHED: "finished",
  FAILED: "failed",
  REFUNDED: "refunded",
  VERIFYING: "verifying",
  CANCELLED: "cancelled",
} as const;

export interface SwapEstimationInfo {
  fromCurrency: string;
  fromNetwork: string;
  toCurrency: string;
  toNetwork: string;
  flow: string;
  type: string;
  rateId: string;
  validUntil: string;
  transactionSpeedForecast: string | null;
  warningMessage: string | null;
  depositFee: number;
  withdrawalFee: number;
  userId: string | null;
  fromAmount: number;
  toAmount: number;
}

export interface SwapTransactionRequest {
  fromCurrency: string;
  fromNetwork: string;
  fromAmount: number;
  toCurrency: string;
  toNetwork: string;
  address: string;
  flow: "standard" | "fixed-rate";
}

export interface SwapTransactionResponseData {
  fromAmount: number;
  toAmount: number;
  flow: string;
  payinAddress: string;
  payoutAddress: string;
  fromCurrency: string;
  toCurrency: string;
  id: string;
  directedAmount: number;
  fromNetwork: string;
  toNetwork: string;
}
export interface SwapTransactionResponse {
  status: boolean;
  data?: SwapTransactionResponseData;
  errorMessage?: string;
}
export interface SwapParams {
  fromAmount: number;
  fromCurrency: string;
  toCurrency: string;
  fromNetwork?: string;
  toNetwork?: string;
}

export type SwapCompositeKey = `${string}-${string}`;

export interface InlineKeyboardState {
  fromCurrency: string;
  fromAmount: string;
  fromNetwork: string;
  toNetwork: string;
  toCurrency: string;
  getQuote: string;
  status: string;
  cancelSwap: string;
}

export type TransactionStatusType =
  (typeof TransactionStatus)[keyof typeof TransactionStatus];

export interface SwapStatusResponse {
  id: string;
  status: TransactionStatusType;
  actionsAvailable: boolean;
  fromCurrency: string;
  fromNetwork: string;
  toCurrency: string;
  toNetwork: string;
  expectedAmountFrom: number;
  expectedAmountTo: number;
  amountFrom: number | null;
  amountTo: number | null;
  payinAddress: string;
  payoutAddress: string;
  payinExtraId: string | null;
  payoutExtraId: string | null;
  refundAddress: string | null;
  refundExtraId: string | null;
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
  validUntil: string | null; // ISO date string or null
  depositReceivedAt: string | null; // ISO date string or null
  payinHash: string | null;
  payoutHash: string | null;
  fromLegacyTicker: string;
  toLegacyTicker: string;
  refundHash: string | null;
  refundAmount: number | null;
  userId: string | null;
  originalExchangeInfo: any | null; // Assuming any type, can be more specific if known
  relatedExchangesInfo: any[]; // Assuming array of any type, can be more specific if known
  repeatedExchangesInfo: any[]; // Assuming array of any type, can be more specific if known
}

//BRIDGE

export interface SwapData extends Prisma.SwapUncheckedCreateInput {}
