import { SOLANA_ERROR_CODES } from "../constants";

type SolanaErrorType = {
  message: string;
  id: string;
  name: string;
  data?: { [key: string]: string };
};

class SLippageExceedingError extends Error {
  readonly id: string;
  data: { [key: string]: string } | undefined;

  // base constructor only accepts string message as an argument
  // we extend it here to accept an object, allowing us to pass other data
  constructor(data: SolanaErrorType) {
    super(data.message);
    this.name = data.name; // this property is defined in parent
    this.id = data.id;
    this.data = data.data; // this property is defined in parent
  }
}

class TimeStampLessThanLastUpdatedError extends Error {
  readonly id: string;
  data: { [key: string]: string } | undefined;

  // base constructor only accepts string message as an argument
  // we extend it here to accept an object, allowing us to pass other data
  constructor(data: SolanaErrorType) {
    super(data.message);
    this.name = data.name; // this property is defined in parent
    this.id = data.id;
    this.data = data.data; // this property is defined in parent
  }
}

const getSwapError = (error: any) => {
  if (error) {
    if (
      typeof error === "string" &&
      error.includes(SOLANA_ERROR_CODES.SLIPPAGE_TOLERANCE_EXCEEDED)
    ) {
      return new SLippageExceedingError({
        message: "Slippage exceeding error",
        id: `slippage_exceeded`,
        name: `SLippageExceedingError`,
        data: {},
      });
    } else if (
      typeof error === "string" &&
      error.includes(SOLANA_ERROR_CODES.TIME_STAMP_ERROR)
    ) {
      return new TimeStampLessThanLastUpdatedError({
        message:
          "TimeStamp Timestamp should be greater than the last updated timestamp",
        id: `timestamp_less_than_last_updated`,
        name: `TimeStampLessThanLastUpdatedError`,
        data: {},
      });
    }
  }
};

export { SLippageExceedingError, getSwapError };
