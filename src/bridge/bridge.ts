import TelegramBot, { ParseMode } from "node-telegram-bot-api";
import { SwapParams, SwapData, SwapStatusResponse } from "./types";
import {
  createTransaction,
  estimateExchangeAmount,
  getRange,
  getTransactionStatus,
  validateAddress,
} from "./changeNow";
import {
  bot,
  colletTextFromUser,
  getAddressFromTelegramId,
  getPrivateKeyFromTelegramId,
  toast,
} from "../helper";
import {
  numberValidator,
  standardizeNetwork,
  standardizeToken,
  stringValidator,
} from "../utils";
import {
  BACK_BUTTON,
  KEYBOARD_QUERY,
  STATUS_EMOJI,
  TransactionStatus,
} from "../constants";
import { addSwapDataToDb, getSwapDataDb } from "../prisma";
import { handleAnyError2 } from "./gracfullErrors";
import { UserSolSmartWalletClass } from "../solana-provider";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";

// add dotenv
require("dotenv").config();

const bridgeTokens = () => {};

const processBridge = async (params: SwapParams) => {};
const handleBridge = async (
  chatId: string,
  message: TelegramBot.Message,
  data: string
) => {
  const telegramId = message.chat.id.toString();
  //do regex to extract the first and last text in the string sol_to_sol
  const [from, to] = data.split("_to_");
  //we want to show them the minimum amount of the from currency that is required
  const res = await getRange({
    fromCurrency: from!,
    fromNetwork: from,
    toCurrency: to!,
    toNetwork: standardizeNetwork(to),
  });
  //
  const minAmount = res.data.minAmount;
  const minMsg = await bot.sendMessage(
    chatId,
    `Minimum Amount to Bridge: ${minAmount} ${from.toUpperCase()}`
  );
  // we now need to get the amount of the from currency that they want to swap
  const amount = await colletTextFromUser<number>(
    chatId,
    `Type the amount of ${from.toUpperCase()} that you want to Bridge... `,
    `Valid Amount`,
    `Invalid Amount`,
    numberValidator
  );
  if (!(amount >= minAmount)) {
    toast(
      chatId,
      `Amount less that  Minimum Amount (${minAmount}), Try Again.`,
      10000
    );
    try {
      bot.deleteMessage(chatId, minMsg.message_id);
    } catch (error) {}
    return;
  }
  //then we show them the amount of the to currency that they will get
  const params: SwapParams = {
    fromAmount: amount,
    fromCurrency: from,
    fromNetwork: from,
    toCurrency: to,
    toNetwork: to,
  };
  const estimate = await estimateExchangeAmount(params);
  const estimatedAmount = estimate.data.toAmount;

  await bot.sendMessage(
    chatId,
    `You will get ${estimatedAmount}${to.toUpperCase()}`
  );
  try {
    bot.deleteMessage(chatId, minMsg.message_id);
  } catch (error) {}
  const type =
    params.fromNetwork.toLowerCase() === "sol" ? "REVERSE" : "NORMAL";

  // depending on the route( reverse or not) we will
  // - normal(from other chain to sol)
  //      we get the users sol wallet address, this will be the destination address
  //      We create the transaction and send them the deposit address to send the from token
  //      we then let the user know that we are waiting for the transaction.
  //      when we detect the transaction then we show that to the user
  // -reverse( form sol to other chains)
  //      we ask them for the destination address and then validate it
  //      we create the transaction and get the deposit address (this will be a sol address, we might have to validate it)
  //      we then use the sendSol function to send the amount to the destination wallet
  //      when the transfer is successful we wait for the transaction object from CN to report that they have seen the transaction.
  //At this stage either the normal or reverse has seen the transaction now, it is to confirm it and report to the user.

  await doBridge(telegramId, params, estimatedAmount, type, chatId, message);
};

const doBridge = async (
  telegramId: string,
  params: SwapParams,
  estimatedAmountOut: number,
  type: "NORMAL" | "REVERSE",
  chatId: string,
  message: TelegramBot.Message
) => {
  if (type == "NORMAL") {
    // normal(from other chain to sol)
    const address = getAddressFromTelegramId(telegramId);
    const swapResponse = await createTransaction({
      fromCurrency: standardizeToken(params.fromCurrency),
      toCurrency: standardizeToken(params.toCurrency),
      fromAmount: params.fromAmount,
      address: address,
      fromNetwork: standardizeNetwork(params.fromNetwork),
      toNetwork: standardizeNetwork(params.toNetwork),
      flow: "standard",
    });

    const swapMes = await bot.sendMessage(
      chatId,
      `Swapping ${params.fromAmount} of ${params.fromCurrency} (${params.fromNetwork}) to ${estimatedAmountOut} ${params.toCurrency} (${params.toNetwork}) to wallet address: \n${address}.\n\nHere is the deposit Address:\n\`${swapResponse?.data?.payinAddress}\`\n\nStatus - Waiting...`,
      { parse_mode: "Markdown" }
    );

    const dataTosStore = {
      status: TransactionStatus.NEW,
      telegramId: telegramId!,
      chatId: chatId.toString(),
      fromCurrency: params.fromCurrency,
      toCurrency: params.toCurrency,
      fromAmount: swapResponse?.data?.fromAmount.toString()!,
      toAmount: swapResponse?.data?.fromAmount.toString()!,
      fromNetwork: params.fromNetwork,
      transactionId: swapResponse?.data?.id!,
      swapMessageId: swapMes.message_id.toString(),
    };
    await addSwapDataToDb(dataTosStore);
    confirmPendingSwap(dataTosStore, message);
  } else if (type === "REVERSE") {
    //let us make sure that the destination is a sol network

    //validate that the user has the balance to be sent
    const key = getPrivateKeyFromTelegramId(telegramId);
    const userWalletClass = new UserSolSmartWalletClass(key);
    userWalletClass.userAddress;

    const balance =
      (await UserSolSmartWalletClass.getSolBalance(
        userWalletClass.userAddress
      )) / LAMPORTS_PER_SOL;
    if (!(balance >= params.fromAmount)) {
      bot.sendMessage(
        chatId,
        "Insufficient Balance in your wallet, top up your wallet,"
      );
      return;
    }
    if (!(params.toNetwork.toLowerCase() == "sol")) {
      toast(chatId, "Destination Network must be SOL", 4000);
      return;
    }
    const address = await colletTextFromUser<string>(
      chatId,
      `Paste the address that you want to receive your ${params.toCurrency} on the ${params.toNetwork} Chain/Network `,
      undefined,
      `Invalid Address`,
      stringValidator
    );

    const isValid = validateAddress(address, params.fromNetwork);
    if (!isValid) {
      toast(chatId, "Invalid Address, Start Again.", 4000);
      return;
    }
    const swapResponse = await createTransaction({
      fromCurrency: standardizeToken(params.fromCurrency),
      toCurrency: standardizeToken(params.toCurrency),
      fromAmount: params.fromAmount,
      address: address,
      fromNetwork: standardizeNetwork(params.fromNetwork),
      toNetwork: standardizeNetwork(params.toNetwork),
      flow: "standard",
    });

    //now send the token to the address
    const res = await userWalletClass.withdrawSol(
      params.fromAmount,
      swapResponse?.data?.payinAddress
    );

    const swapMes = await bot.sendMessage(
      chatId,
      `Swapping ${params.fromAmount} of ${params.fromCurrency} (${params.fromNetwork}) to ${estimatedAmountOut} ${params.toCurrency} (${params.toNetwork}) to wallet address: \n${address}.`,
      { parse_mode: "Markdown" }
    );

    const dataTosStore = {
      status: TransactionStatus.NEW,
      telegramId: telegramId!,
      chatId: chatId.toString(),
      fromCurrency: params.fromCurrency,
      toCurrency: params.toCurrency,
      fromAmount: swapResponse?.data?.fromAmount.toString()!,
      toAmount: swapResponse?.data?.fromAmount.toString()!,
      fromNetwork: params.fromNetwork,
      transactionId: swapResponse?.data?.id!,
      swapMessageId: swapMes.message_id.toString(),
    };
    await addSwapDataToDb(dataTosStore);
    confirmPendingSwap(dataTosStore, message);
  }
};

const confirmPendingSwap = (params: SwapData, msg: TelegramBot.Message) => {
  let currentStatus = "new";
  const interval = setInterval(async () => {
    if (params.status === TransactionStatus.FINISHED) {
      console.log("transaction has been completed");
      clearInterval(interval);
      return;
    }
    try {
      const swapData = await getSwapDataDb(params.swapMessageId, params.chatId);
      if (swapData) {
        if (swapData.status === TransactionStatus.CANCELLED) {
          clearInterval(interval);
          return;
        }
      }
    } catch (error) {
      console.log("error: ", error);
    }

    const res = await confirmTransaction(params, currentStatus, msg);
    if (!res) {
      clearInterval(interval);
      return;
    }
    currentStatus = res.currentStatus;
    if (res.status) {
      clearInterval(interval);
      return;
    }
  }, 30000);
};

const confirmTransaction = async (
  params: SwapData,
  currentStatus: string,
  message: TelegramBot.Message
) => {
  let data: SwapStatusResponse;
  try {
    const res = await getTransactionStatus(params.transactionId as string);
    data = res?.data;
  } catch (error) {
    console.log("error: ", error);
    handleAnyError2(error, {
      chatId: params.chatId,
    });
    return;
  }
  const messageOptions = {
    chat_id: params.chatId,
    message_id: message.message_id,
    parse_mode: "Markdown" as ParseMode,
  };

  let status = false;
  if (data!.status !== currentStatus) {
    currentStatus = data!.status;
    if (currentStatus === "waiting") {
      // Wait for the transaction to be confirmed
      const text = `${STATUS_EMOJI.WAITING} We are Waiting for the transaction : waiting...`;
      toast(params.chatId.toString(), text, 3);
      bot.editMessageText(`${message.text}\n\n${text}\n`, messageOptions);
      return { status, currentStatus };
    } else if (currentStatus === "confirming") {
      const text = `${STATUS_EMOJI.CONFIRMING} We have seen your transaction : Confirming the transaction...`;
      toast(params.chatId.toString(), text, 3);
      bot.editMessageText(`${message.text}\n\n${text}\n`, messageOptions);
      return { status, currentStatus };
    } else if (currentStatus === "exchanging") {
      const text = `${STATUS_EMOJI.EXCHANGING} Transaction Confirmed : Exchanging Tokens...`;
      toast(params.chatId.toString(), text, 3);
      bot.editMessageText(`${message.text}\n\n${text}\n`, messageOptions);
      return { status, currentStatus };
    } else if (currentStatus === "sending") {
      const text = `${STATUS_EMOJI.SENDING}Exchange Done : Sending your Tokens...`;
      toast(params.chatId.toString(), text, 3);
      bot.editMessageText(`${message.text}\n\n${text}\n`, messageOptions);

      return { status, currentStatus };
    } else if (currentStatus === "finished") {
      const text = `${
        STATUS_EMOJI.FINISHED
      } Sent! : Swap Completed. here the transaction hash\n\n ${
        data!.payoutHash
      }`;
      bot.sendMessage(params.chatId.toString(), text);
      bot.editMessageText(`${message.text}\n\n${text}\n`, messageOptions);

      status = true;

      return { status, currentStatus };
    } else if (currentStatus === "failed") {
      bot.sendMessage(params.chatId.toString(), "Failed! : Swap Failed.");
      bot.editMessageText(
        `${message.text}\n\n${STATUS_EMOJI.FAILED}Failed! : Swap Failed.\n`,
        messageOptions
      );

      return { status, currentStatus };
    } else {
      return { status, currentStatus };
    }
  } else {
    return { status, currentStatus };
  }
};

const handleInitBridge = async (
  chatId: string,
  message: TelegramBot.Message
) => {
  const replyMarkUp: TelegramBot.InlineKeyboardMarkup = {
    inline_keyboard: [
      [
        {
          text: KEYBOARD_QUERY.BRIDGE_ROUTE.SOL.TEXT,
          callback_data: KEYBOARD_QUERY.BRIDGE_ROUTE.SOL.QUERY,
        },
        {
          text: KEYBOARD_QUERY.BRIDGE_ROUTE.SOL_R.TEXT,
          callback_data: KEYBOARD_QUERY.BRIDGE_ROUTE.SOL_R.QUERY,
        },
      ],
      [
        {
          text: KEYBOARD_QUERY.BRIDGE_ROUTE.ETH.TEXT,
          callback_data: KEYBOARD_QUERY.BRIDGE_ROUTE.ETH.QUERY,
        },
        {
          text: KEYBOARD_QUERY.BRIDGE_ROUTE.ETH_R.TEXT,
          callback_data: KEYBOARD_QUERY.BRIDGE_ROUTE.ETH_R.QUERY,
        },
      ],
      BACK_BUTTON,
    ],
  };

  if (process.env.ENV === "production") {
    toast(chatId, `Coming soon...`, 10);
    return;
  }
  await bot.editMessageReplyMarkup(replyMarkUp, {
    chat_id: chatId,
    message_id: message.message_id,
  });
};

export { handleInitBridge, handleBridge };
