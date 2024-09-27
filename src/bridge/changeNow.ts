import axios, { AxiosError } from "axios";

import {
  SwapEstimationInfo,
  SwapParams,
  SwapStatusResponse,
  SwapTransactionRequest,
  SwapTransactionResponse,
  SwapTransactionResponseData,
} from "./types";
import {
  getAddressValidationErrorMessageAndName,
  getValidationErrorMessageAndName,
  handleAddressValidationError,
  handleAnyError,
  handleValidationError,
  InputError,
} from "./gracfullErrors";
import { customAddressValidation, standardizeAddressNetwork } from "../helper";

require("dotenv").config();

const { CHANG_NOW_API_KEY } = process.env;

if (!CHANG_NOW_API_KEY) {
  throw new Error("Missing CHANG_NOW_API_KEY environment variable");
}

const API_KEY = CHANG_NOW_API_KEY;
const BASE_URL = "https://api.changenow.io/v2";

const cn = async (
  endpoint: string,
  method: "POST" | "GET",
  data?: { [key: string]: string }
) => {
  try {
    const response = await axios({
      url: `${BASE_URL}${endpoint}`,
      method,
      headers: {
        "x-api-key": API_KEY,
        "x-changenow-api-key": API_KEY,
      },
      data,
    });

    return response.data;
  } catch (err) {
    const errors = err as AxiosError;
    if (!axios.isAxiosError(errors)) {
      console.error("Normal Error: ", errors);
      throw Error(errors);
      // do whatever you want with native error
    }
    const data = errors.response?.data as { [key: string]: string };

    const message = `${data.error} : ${data?.message ? data?.message : ""}  `;
    throw new Error(message as string);
    // do what you want with your axios error
  }
};

const getAvailablePairs = async () => {
  /**
   * this gets all the tokens available
   */
  const response = await axios.get(
    `${BASE_URL}/currencies?active=true&fixedRate=true`,
    {}
  );
  return response.data;
};

const getMinimum = async () => {
  const response = await axios.get(`${BASE_URL}/min_limit`, {});
  return response.data;
};

const estimateExchangeAmount = async (params: SwapParams) => {
  let status = false;

  const endpoint = `/exchange/estimated-amount?fromCurrency=${params.fromCurrency}&toCurrency=${params.toCurrency}&fromAmount=${params.fromAmount}&fromNetwork=${params.fromNetwork}&toNetwork=${params.toNetwork}&flow=standard&type=direct`;
  try {
    const data: SwapEstimationInfo = await cn(endpoint, "GET");
    status = true;
    return { status, data };
  } catch (error: any) {
    throw new Error(`Error estimating Exchange Amount ${error.message}`);
  }
};

const listAllAvailablePairs = async () => {
  let status = false;
  const endpoint = `/market-info/available-pairs/?includePartners=false`;
  try {
    const data = await axios.get(`${BASE_URL}${endpoint}`);
    status = true;
    return { status, data: data.data };
  } catch (error: any) {
    return { status, errorMessage: error.message };
  }
};

const getMinimalExchange = async (params: Omit<SwapParams, "amount">) => {
  let status = false;
  const endpoint = `/exchange/min-amount/?fromCurrency=${params.fromCurrency}&toCurrency=${params.toCurrency}&fromNetwork=${params.fromNetwork}&toNetwork=${params.toNetwork}&flow=standard`;
  try {
    const data = await cn(endpoint, "GET");
    status = true;
    return { status, data };
  } catch (error: any) {
    return { status, errorMessage: error.message };
  }
};

//get min and max https://api.changenow.io/v1/exchange-range/:from_to?
const getRange = async (params: Omit<SwapParams, "fromAmount">) => {
  console.log(`getting range..`);
  let status = false;

  const endpoint = `/exchange/range?fromCurrency=${params.fromCurrency}&toCurrency=${params.toCurrency}&fromNetwork=${params.fromNetwork}&toNetwork=${params.toNetwork}&flow=standard`;
  try {
    const data = await cn(endpoint, "GET");

    status = true;
    return { status, data };
  } catch (error: any) {
    throw new Error(error.message);
  }
};

const createTransaction = async (
  data: SwapTransactionRequest
): Promise<SwapTransactionResponse | undefined> => {
  let status = false;
  const endpoint = "/exchange";
  const reqData = {
    fromCurrency: data.fromCurrency,
    fromNetwork: data.fromNetwork,
    fromAmount: data.fromAmount.toString(),
    toCurrency: data.toCurrency,
    toNetwork: data.toNetwork,
    address: data.address,
    flow: data.flow,
  };

  try {
    const response = await cn(endpoint, "POST", reqData);

    status = true;
    console.log("response: ", response);
    return { data: response, status };
  } catch (error: any) {
    handleAnyError(error, data);
  }
};

const getTransactionStatus = async (id: string) => {
  let status = false;

  const endpoint = `/exchange/by-id?id=${id}`;
  try {
    const data: SwapStatusResponse = await cn(endpoint, "GET");

    status = true;
    return { status, data };
  } catch (error: any) {
    throw new Error(error.message);
  }
};

//address validation

const validateAddress = async (address: string, _network: string) => {
  let isValid;
  try {
    isValid = customAddressValidation(_network, address);
    if (!isValid) {
      console.log("isValid: ", isValid);
      return isValid;
    }
  } catch (error: any) {
    console.log("error: multicoin-address-validator ", error.message);
  }
  if (isValid) {
    return true;
  }

  const network = standardizeAddressNetwork(_network);
  console.log("network: ", network);
  const endpoint = `/validate/address?currency=${network}&address=${address}`;
  try {
    const response = await cn(endpoint, "GET");
    console.log("response: ", response);

    return response.result;
  } catch (error: any) {
    console.log("error: ", error);
    const params = {
      address,
      network,
    };
    const { name } = getAddressValidationErrorMessageAndName(
      error.message,
      params
    );
    if (name === "address_validation_unavailable") {
      return true;
    }
    handleAddressValidationError(error, params);
  }
};

const validatePairAndAmount = async (params: SwapParams) => {
  try {
    const { data, status } = await getRange({
      fromCurrency: params.fromCurrency,
      toCurrency: params.toCurrency,
      fromNetwork: params.fromNetwork,
      toNetwork: params.toNetwork,
    });
    console.log("data: ", data);
    console.log(`done getting range`);
    if (!status) {
      throw new InputError({
        message: "no from network was specified",
        data: {
          fromCurrency: params.fromCurrency,
          toCurrency: params.toCurrency,
          fromNetwork: params.fromNetwork as string,
          toNetwork: params.toNetwork as string,
        },
        id: 2,
        name: "validate_from_network",
      });
      // throw new InputError(`Error getting Pair: ${data.errorMessage}`);
    }

    if (!(params.fromAmount >= data.minAmount)) {
      throw new Error(
        `amount ${params.fromAmount} needs to be greater than the min amount ${data.minAmount}`
      );
    }

    const gt =
      data.maxAmount === null ? true : params.fromAmount <= data.maxAmount;

    if (!gt) {
      throw new Error(
        `amount ${params.fromAmount} needs to be less than the max amount ${data.maxAmount}`
      );
    }

    return true;
  } catch (error: any) {
    console.log("error: ", error.message);
    handleValidationError(error, params);
  }
};

async function main(params: SwapParams) {
  try {
    await validatePairAndAmount(params);
    const { data } = await estimateExchangeAmount(params);
    console.log("data: ", data);

    // createTransaction({
    //   from: "btc",
    //   to: "sol",
    //   address: "DucwrAq1yMomuQ8c7bkaGuZU8di32hHhFmq1EpDyZedE",
    //   amount: "0.003",
    //   userId: "your_user_id",
    // }).then(({ data, status, errorMessage }) => {
    //   if (!status) {
    //     console.log("Error creating transaction: ", errorMessage);
    //     return;
    //   }
    //   console.log("Created Transaction: ", data);
    // });
  } catch (error: any) {
    throw new Error(`Error : ${error.message}`);
  }
}

// main({
//   amount: 0.001,
//   fromCurrency: "sol",
//   toCurrency: "usdt",
//   fromNetwork: "sol",
//   toNetwork: "bsc",
// });

// type this

export {
  validatePairAndAmount,
  getAvailablePairs,
  getMinimalExchange,
  getRange,
  getTransactionStatus,
  createTransaction,
  listAllAvailablePairs,
  getMinimum,
  estimateExchangeAmount,
  validateAddress,
};
