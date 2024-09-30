import TelegramBot from "node-telegram-bot-api";

// import {
//   getAvailablePairs,
//   createTransaction,
//   getTransactionStatus,
// } from "./changeNow";
import {
  getPrivateKeyStingFromTelegramId,
  getTokenText,
  reFreshPooling,
  replyToAnyhowSentMessage,
  sendUserWalletDetails,
  start,
  toast,
} from "./helper";
import { getUserFromTelegramId, prisma } from "./prisma";
// import { KEYBOARD_QUERY } from "./constants";
import { queryCallBack, queryCallBackDevBot } from "./keyboardResponses";

import {
  BUY_AND_SELL_KEYBOARD,
  COULD_NOT_GET_TOKEN_DETAILS_TEXT,
  SIMULATION_BUY_AND_SELL_KEYBOARD,
  YOU_ARE_IN_THE_SIMULATION_TEXT,
} from "./constants";

import { devBot } from "./admin/admin";

import {
  handleExportPrivateKey,
  handleUserBuyPositions,
} from "./handleKeyboardResponse";
import { handleUserBuyPositionsSimulation } from "./simulation";
import { handleShowReferralDetails } from "./referrals/handleKeyboardResponses";

const { BOT_TOKEN } = process.env;
if (!BOT_TOKEN) {
  throw new Error("BOT_TOKEN not found in environment variables");
}

devBot.on("callback_query", queryCallBackDevBot);

const bottoken = BOT_TOKEN;

let bot: TelegramBot;

bot = new TelegramBot(bottoken, {
  polling: true,
});

bot.on("polling_error", (pollError) => {
  console.log(`MainBot : polling_error: ${pollError}`);
});
//to register callback query
bot.on("callback_query", queryCallBack);

bot.onText(/^\/start$/, async (msg, match) => {
  if (match[0] === "/start") {
    await start(msg);
  }
});

bot.onText(/\/start (.+)?/, async (msg, match) => {
  const chatId = msg.chat.id;
  const telegramId = msg.from?.id;

  try {
    if (!telegramId) {
      bot.sendMessage(chatId, "Something went wrong");
      return;
    }

    let sentText;
    if (match) {
      sentText = match[1];
      console.log("sentText: ", sentText);
    } else {
      return;
    }

    //check what the sentText is, ref_1234 for referral and token_8g4tAcENPc39Hcj7UdbSwntivkqsxfB5C18pyYTEpump for token
    if (sentText.startsWith("ref_")) {
      const referralCode = parseInt(sentText.split("_")[1]);
      console.log("referralCode: ", referralCode);
      //TODO REFERRAL CODE HERE

      await start(msg, referralCode);
    } else if (
      sentText.startsWith("token_") ||
      sentText.startsWith("stoken_")
    ) {
      try {
        bot.deleteMessage(chatId, msg.message_id);
      } catch (error) {
        console.log("error: ", error);
      }
      const isSim = sentText.startsWith("stoken_") ? true : false;

      const tokenAddress = sentText.split("_")[1];

      let tokenText: string;
      try {
        tokenText = await getTokenText(
          tokenAddress,
          telegramId.toString(),
          isSim
        );
      } catch (error) {
        bot.sendMessage(chatId.toString(), COULD_NOT_GET_TOKEN_DETAILS_TEXT);
      }
      let keyboard: TelegramBot.InlineKeyboardButton[][] =
        BUY_AND_SELL_KEYBOARD;
      if (isSim) {
        tokenText = `${YOU_ARE_IN_THE_SIMULATION_TEXT}\n${tokenText}`;
        keyboard = SIMULATION_BUY_AND_SELL_KEYBOARD;
      }

      const tt = await bot.sendMessage(chatId, tokenText, {
        reply_markup: {
          inline_keyboard: keyboard,
        },
        disable_web_page_preview: true,
        parse_mode: "Markdown",
      });
      //we will do the token thing here
    } else {
      await start(msg);
      console.log("invalid start command : ", sentText);
    }
  } catch (error) {
    console.log("error: ", error);
  }
});

bot.onText(/\/positions/, async (msg) => {
  try {
    const chatId = msg.chat.id;
    await handleUserBuyPositions(chatId.toString(), msg);
  } catch (error) {
    console.log("error: ", error);
    await reFreshPooling();
  }
});

bot.onText(/\/spositions/, async (msg) => {
  try {
    const chatId = msg.chat.id;
    await handleUserBuyPositionsSimulation(chatId.toString(), msg);
  } catch (error) {
    console.log("error: ", error);
    await reFreshPooling();
  }
});
bot.onText(/\/kings/, async (msg) => {
  try {
    const chatId = msg.chat.id;
  } catch (error) {
    console.log("error: ", error);
    await reFreshPooling();
  }
});

bot.onText(/\/wallet/, async (msg) => {
  try {
    const chatId = msg.chat.id;
    const telegramId = msg.from?.id.toString();
    console.log("telegramId: ", telegramId);

    await sendUserWalletDetails(telegramId, chatId.toString());
  } catch (error) {
    console.log("error: ", error);
    await reFreshPooling();
  }
});

bot.onText(/\/referral/, async (msg) => {
  //gets all the token that is supported
  const chatId = msg.chat.id.toString();

  await handleShowReferralDetails(chatId, msg);
});

bot.onText(/\/key/, async (msg) => {
  try {
    const chatId = msg.chat.id;
    const telegramId = msg.from?.id.toString();
    console.log("telegramId: ", telegramId);

    await handleExportPrivateKey(chatId.toString(), msg);
  } catch (error) {
    console.log("error: ", error);
    await reFreshPooling();
  }
});
devBot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  const telegramId = msg.from?.id;
  console.log("telegramId: ", telegramId);
});
export { bot };

bot.on(`text`, replyToAnyhowSentMessage);
