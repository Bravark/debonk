import TelegramBot from "node-telegram-bot-api";
import { SwapParams } from "./types";
import { estimateExchangeAmount, getRange } from "./changeNow";
import { bot, colletTextFromUser, standardizeNetwork, toast } from "../helper";
import { numberValidator } from "../utils";
import { BACK_BUTTON, KEYBOARD_QUERY } from "../constants";

const bridgeTokens = () => {};

const processBridge = async (params: SwapParams) => {};
const handleBridge = async (
  chatId: string,
  message: TelegramBot.Message,
  data: string
) => {
  //do regex to extract the first and last text in the string sol_to_sol
  const [from, to] = data.split("_to_");
  //we want to show them the minimum amount of the from currency that is required
  const res = await getRange({
    fromCurrency: from!,
    fromNetwork: from,
    toCurrency: to!,
    toNetwork: standardizeNetwork(to),
  });
  const minAmount = res.data.minAmount;
  bot.sendMessage(
    chatId,
    `Minimum Amount to Bridge: ${minAmount} ${from.toUpperCase()}`
  );
  // we now need to get the amount of the from currency that they want to swap
  const amount = await colletTextFromUser<number>(
    chatId,
    `Type the amount of ${from.toUpperCase()} that you want to Bridge `,
    `Valid Amount`,
    `Invalid Amount`,
    numberValidator
  );
  if (!(amount >= minAmount)) {
    bot.sendMessage(
      chatId,
      `Amount less that  Minimum Amount (${minAmount}), Start Again.`
    );
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
  toast(chatId, `Coming soon...`, 10);
  return;
  await bot.editMessageReplyMarkup(replyMarkUp, {
    chat_id: chatId,
    message_id: message.message_id,
  });
};

export { handleInitBridge };
