import { AxiosHeaders } from "axios";
import { createHash } from "crypto";
import {
  EVM_CHAIN_MAP,
  KEYBOARD_QUERY,
  NETWORK_MAP,
  TOKEN_MAP,
  Validator,
  YOU_ARE_IN_THE_SIMULATION_TEXT,
} from "./constants";
import TelegramBot from "node-telegram-bot-api";
import { Holder, ResponseObject, TokenData } from "./types";
import numeral from "numeral";
import { PublicKey } from "@solana/web3.js";
import { MasterSolSmartWalletClass } from "./solana-provider";
import { replyToAnyhowSentMessage } from "./helper";

/**
 * Hashes the user ID using SHA-256 and returns the resulting hash as a hex string.
 * @param userId - The user's unique identifier (e.g., Telegram ID).
 * @returns The SHA-256 hash of the user ID as a hexadecimal string.
 */
function hashUserId(userId: string): string {
  return createHash("sha256").update(userId.toString()).digest("hex");
}

/**
 * Converts a hexadecimal string to a large integer.
 * @param hexString - The hexadecimal string to convert.
 * @returns The integer representation of the hexadecimal string.
 */
function hexToInt(hexString: string): bigint {
  return BigInt("0x" + hexString);
}
//two decimal places
export function convertToTowDeciamalPlace(value: number): number {
  return Number(value.toFixed(2));
}

export const solAddressValidator: Validator<string> = async (value: string) => {
  let status = false;
  const xValue = getContractAddressFromTextOrLink(value);
  try {
    new PublicKey(xValue);
    status = true;
  } catch (error) {
    if (xValue.length === 44) {
      status = true;
    }
  }
  console.log("status: ", status);
  return status;
};

export const numberValidator: Validator<number> = async (value) => {
  // const amount = parseFloat(value.toString());
  const amount = Number(value.toString());
  console.log("amount: ", amount);

  if (!amount) {
    return false;
  }
  return true;
};

export const stringValidator: Validator<string> = async (value) => {
  //?don't now how to validate string

  return true;
};

export const numberValidatorOptionalNone: Validator<number> = async (
  value: number
) => {
  const amount = parseInt(value.toString());
  if (amount === 0) {
    console.log("user sent zero amount");
    return true;
  }

  if (!amount) {
    return false;
  }
  return true;
};

export function createProgressBar(
  percentage: number,
  barLength: number = 10
): string {
  const filledLength = Math.round((percentage / 100) * barLength);
  const emptyLength = barLength - filledLength;

  const filledBar = "█".repeat(filledLength);
  const emptyBar = "░".repeat(emptyLength);

  return `${percentage}%: ${filledBar}${emptyBar}`;
}
/**
 * Reduces the large integer to fit within the allowed range for the derivation path index.
 * @param largeInt - The large integer to reduce.
 * @param modulo - The upper limit for the index range (2^31 in this case).
 * @returns The reduced index within the range of 0 to 2^31 - 1.
 */
function reduceToIndexRange(largeInt: bigint, modulo: bigint): number {
  return Number(largeInt % modulo);
}

// Define the range for non-hardened indices (0 to 2^31 - 1)
const MAX_INDEX = BigInt(2 ** 31);

/**
 * Derives a unique index for the user from their ID by hashing and reducing the hash.
 * @param userId - The user's unique identifier (e.g., Telegram ID).
 * @returns A unique index within the allowed range for use in the derivation path.
 */
export function deriveUserIndex(userId: string): number {
  const hashedId = hashUserId(userId);
  const largeInt = hexToInt(hashedId);
  return reduceToIndexRange(largeInt, MAX_INDEX);
}

export const getPageNumberFromText = (messageText: string): number => {
  const pageMatch = messageText.match(/Page: ([0-9]+)/);

  if (pageMatch && pageMatch[1]) {
    return parseInt(pageMatch[1]);
  } else {
    return null;
  }
};

export const colletTextFromUser = <T>(
  chatId: string,
  initialText: string,
  successText: string,
  validationErrorMessage: string,
  validator: Validator<T>,
  _bot: TelegramBot,
  useToast = true
): Promise<T> => {
  _bot.removeListener("text", replyToAnyhowSentMessage);
  return new Promise(async (resolve, reject) => {
    let field: T;

    // Ask the user for input
    const msg1 = await _bot.sendMessage(chatId.toString(), `${initialText}`, {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "Cancel",
              callback_data: KEYBOARD_QUERY.CLEAR_LISTENERS,
            },
          ],
        ],
      },
    });

    const collectDetailsCallback = async (msg: any) => {
      const text = msg.text?.trim();
      const resMsg = msg.message_id;

      const res = await validator(text);
      if (!res) {
        toast2(chatId.toString(), validationErrorMessage, undefined, _bot);
        if (useToast) {
          try {
            _bot.deleteMessage(chatId, resMsg);
            _bot.deleteMessage(chatId, msg1.message_id);
          } catch (error) {
            console.log("error: ", error);
          }
        }
        _bot.removeListener("message", collectDetailsCallback);
        _bot.addListener(`text`, replyToAnyhowSentMessage);
        return;
      }
      if (text) {
        field = text;
        // Resolve the promise with the user input
        const msg2 = await _bot.sendMessage(
          chatId.toString(),
          `${successText}:  ${field}`
        );
        _bot.removeListener("message", collectDetailsCallback);
        _bot.addListener(`text`, replyToAnyhowSentMessage);

        resolve(field);
        // wait 2 seconds

        await new Promise((r) => setTimeout(r, 1000));
        if (useToast) {
          try {
            _bot.deleteMessage(chatId.toString(), resMsg);
            _bot.deleteMessage(chatId.toString(), msg1.message_id);
            _bot.deleteMessage(chatId.toString(), msg2.message_id);
          } catch (error) {}
        }
      } else {
        _bot.sendMessage(chatId.toString(), "Invalid input. Please try again.");
      }
    };
    // Listen for the user's message
    _bot.on("message", collectDetailsCallback);
  });
};

export const getTokenDetails = async (
  token: string
): Promise<ResponseObject> => {
  const isAddress = MasterSolSmartWalletClass.validateSolAddress(token);
  if (!isAddress) {
    throw new Error("Invalid address");
  }

  const res = await fetch(
    `https://api.dexscreener.com/latest/dex/pairs/solana/${token}`,
    {
      method: "GET",
    }
  );
  const data = await res.json();

  if (data.msg === "SUCCESS") {
    return data.data;
  }
  return null;
};

export const getTrxPrice = async (): Promise<number> => {
  const res = await fetch(
    "https://apilist.tronscanapi.com/api/token/price?token=trx",
    {
      headers: {
        accept: "application/json, text/plain, */*",
        "accept-language": "en-GB,en-NG;q=0.9,en-US;q=0.8,en;q=0.7",
        priority: "u=1, i",
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "cross-site",
        secret:
          "OTljMjUxZGEzOGI5OTcyMDc4ZjlmZGRiNTBjZDg2NmIwMDIwYzgyNTI5ZmY0YzBmNGM3YWQzZjJmNGFhNGJiZA==",
        Referer: "https://tronscan.org/",
        "Referrer-Policy": "strict-origin-when-cross-origin",
      },
      body: null,
      method: "GET",
    }
  );
  const data = await res.json();

  return data.price_in_usd;
};

export const colletGifFromUser = <T>(
  chatId: string,
  initialText: string,
  successText: string,
  validationErrorMessage: string,
  validator: Validator<T>,
  _bot: TelegramBot,
  useToast = true
): Promise<T> => {
  return new Promise(async (resolve, reject) => {
    let field: T;

    // Ask the user for input
    const msg1 = await _bot.sendMessage(chatId.toString(), `${initialText}`, {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "Cancel",
              callback_data: KEYBOARD_QUERY.CLEAR_LISTENERS,
            },
          ],
        ],
      },
    });

    const collectDetailsCallback = async (msg: TelegramBot.Message) => {
      const gif = msg.document.file_id;
      console.log("gif: ", gif);
      const resMsg = msg.message_id;

      const res = await validator(gif as T);
      if (!res) {
        toast2(chatId.toString(), validationErrorMessage, undefined, _bot);
        if (useToast) {
          try {
            _bot.deleteMessage(chatId, resMsg);
            _bot.deleteMessage(chatId, msg1.message_id);
          } catch (error) {
            console.log("error: ", error);
          }
        }
        return;
      }
      if (gif) {
        field = gif as T;
        // Resolve the promise with the user input
        const msg2 = await _bot.sendDocument(
          chatId.toString(),
          field as string
        );
        _bot.removeListener("message", collectDetailsCallback);

        resolve(field);
        // wait 2 seconds

        await new Promise((r) => setTimeout(r, 1000));
        if (useToast) {
          try {
            _bot.deleteMessage(chatId.toString(), resMsg);
            _bot.deleteMessage(chatId.toString(), msg1.message_id);
            _bot.deleteMessage(chatId.toString(), msg2.message_id);
          } catch (error) {}
        }
      } else {
        _bot.sendMessage(chatId.toString(), "Invalid input. Please try again.");
      }
    };
    // Listen for the user's message
    _bot.on("message", collectDetailsCallback);
  });
};
export const toast2 = async (
  chatId: string,
  message: string,
  durationInSec: number = 5,
  _bot: TelegramBot
) => {
  const time = durationInSec * 1000;
  const msg = await _bot.sendMessage(chatId.toString(), message, {
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: "cancel",
            callback_data: KEYBOARD_QUERY.CLEAR_LISTENERS,
          },
        ],
      ],
    },
    parse_mode: "Markdown",
  });
  await new Promise((r) => setTimeout(r, time));
  try {
    await _bot.deleteMessage(chatId.toString(), msg.message_id);
  } catch (error) {}
};

export const toast = async (
  chatId: string,
  message: string,
  durationInSec: number = 2,
  _bot: TelegramBot
) => {
  const time = durationInSec * 1000;
  const msg = await _bot.sendMessage(chatId.toString(), message, {
    parse_mode: "Markdown",
  });
  await new Promise((r) => setTimeout(r, time));
  try {
    await _bot.deleteMessage(chatId.toString(), msg.message_id);
  } catch (error) {}
};

export const wait = (time: number) =>
  new Promise((resolve) => setTimeout(resolve, time));

export const formatCurrencyWithoutDollarSign = (number: number) => {
  try {
    const string = numeral(number).format("(0.00 a)");
    return string;
  } catch (error) {
    console.log("error: ", error);
  }
};

export const formatCurrency = (number: number) => {
  try {
    const string = numeral(number).format("($0.00a)");
    return string;
  } catch (error) {
    console.log("error: ", error);
  }
};

export const getGreenCircleByNumber = (number: number) => {
  let circle = `🟩 `;
  for (let i = 0; i < number; i++) {
    circle += `🟩  `;
  }
  return circle;
};

export const getGreenCircleByTrxBought = (trxBought: number) => {
  const number = Math.floor(trxBought / 100);
  return getGreenCircleByNumber(number);
};

export function chunkArray<T>(arr: T[], chunkSize: number): T[][] {
  const result = [];
  for (let i = 0; i < arr.length; i += chunkSize) {
    result.push(arr.slice(i, i + chunkSize));
  }

  return result;
}

export function calculatePercentageChange(
  oldPrice: number,
  currentPrice: number
): number {
  const percentChange = ((currentPrice - oldPrice) / oldPrice) * 100;

  if (percentChange === Infinity) {
    return 0;
  }
  return Number(percentChange.toFixed(2));
}

export function getCurrentDate(): string {
  const currentDate = new Date();

  // Option 1: Using toLocaleDateString for a simple format (e.g., MM/DD/YYYY or DD/MM/YYYY based on locale)
  const formattedDate = currentDate.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
  });

  return formattedDate;
}

export const getTelegramIdFromText = (messageText: string): number | null => {
  const pageMatch = messageText.match(/TelegramId: ([0-9]+)/);

  if (pageMatch && pageMatch[1]) {
    return parseInt(pageMatch[1]);
  } else {
    return null;
  }
};

// SUB: FORMAT CURRENCY AND VALUE
export const formatter = ({
  decimal = 2,
  style = "decimal",
  currency = undefined,
}: {
  decimal?: number;
  style?: string;
  currency?: string | undefined;
}) => {
  return new Intl.NumberFormat(undefined, {
    //@ts-expect-error: String is key of Number format
    style: style,
    currency: currency,
    maximumFractionDigits: decimal,
    minimumFractionDigits: decimal,
    useGrouping: true,
  });
};

export const checkIfMessageIsSimulation = (messageText: string): boolean => {
  // Check if the message contains the simulation keyword
  const simulationKeyword = YOU_ARE_IN_THE_SIMULATION_TEXT;
  if (messageText.includes(simulationKeyword)) {
    return true;
  }
  return false;
};

export function getContractAddressFromTextOrLink(input: string) {
  // Regular expression for Solana contract address (43+ alphanumeric characters)
  const contractAddressRegex = /^[A-Za-z0-9]{43,}$/;

  // Regular expression for extracting contract address from a link
  const linkRegex = /\/([A-Za-z0-9]{43,})/;

  // Check if the input is already a contract address
  if (contractAddressRegex.test(input)) {
    return input; // It is a contract address
  }

  // Check if the input is a link and extract the contract address
  const match = input.match(linkRegex);
  if (match) {
    return match[1]; // Extracted contract address from the link
  }

  return null; // No contract address found
}

export const standardizeNetwork = (network: string): string => {
  const standardized =
    NETWORK_MAP[network.toLowerCase().trim().split(" ").join("")];
  return standardized ? standardized : network.toUpperCase(); // Default to the input in uppercase if not found
};

export const standardizeToken = (token: string): string => {
  const standardized =
    TOKEN_MAP[token.toLowerCase().trim().split(" ").join("")];
  return standardized ? standardized : token.toUpperCase(); // Default to the input in uppercase if not found
};
export const standardizeAddressNetwork = (network: string): string => {
  const standardized = EVM_CHAIN_MAP[network.toLowerCase().replace(/\s+/g, "")];
  return standardized ? standardized : network.toLowerCase();
};
