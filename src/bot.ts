import TelegramBot from "node-telegram-bot-api";

// import {
//   getAvailablePairs,
//   createTransaction,
//   getTransactionStatus,
// } from "./changeNow";
import {
  formatCurrency,
  getAddressFromTelegramId,
  getPrivateKeyFromTelegramId,
  getPrivateKeyStingFromTelegramId,
  getTokenText,
  getUserSolBalance,
  reFreshPooling,
  replyToAnyhowSentMessage,
  sendTokenDetailsByCA,
  sendUserWalletDetails,
  start,
  toast,
} from "./helper";
import { getUserFromTelegramId, prisma } from "./prisma";
// import { KEYBOARD_QUERY } from "./constants";
import { queryCallBack, queryCallBackDevBot } from "./keyboardResponses";

import {
  ADMIN_BOT_KEY,
  BACK_BUTTON,
  BOT_USERNAME,
  INITIAL_INLINE_KEYBOARD,
  KEYBOARD_QUERY,
} from "./constants";

import { devBot } from "./admin/admin";

import { handleUserBuyPositions } from "./handleKeyboardResponse";
import { handleUserBuyPositionsSimulation } from "./simulation";
import {
  handleGetReferralProfits,
  handleShowReferralDetails,
} from "./referrals/handleKeyboardResponses";

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
  console.log("match: ", match);
  if (match[0] === "/start") {
    await start(msg);
  }
});

bot.onText(/\/start (.+)?/, async (msg, match) => {
  const chatId = msg.chat.id;
  const telegramId = msg.from?.id;
  try {
    bot.deleteMessage(chatId, msg.message_id);
  } catch (error) {
    console.log("error: ", error);
  }
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
      //we will do the referral thing here
    } else if (
      sentText.startsWith("token_") ||
      sentText.startsWith("stoken_")
    ) {
      const isSim = sentText.startsWith("stoken_") ? true : false;
      console.log("isSim: ", isSim);
      const tokenAddress = sentText.split("_")[1];
      console.log("tokenAddress: ", tokenAddress);

      let tokenText: string;
      try {
        tokenText = await getTokenText(
          tokenAddress,
          telegramId.toString(),
          isSim
        );
      } catch (error) {
        toast(chatId.toString(), "Could not get token Details");
      }

      const tt = await bot.sendMessage(chatId, tokenText, {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "Buy",
                callback_data: KEYBOARD_QUERY.BUY,
              },

              {
                text: "Sell",
                callback_data: KEYBOARD_QUERY.SELL,
              },
            ],
            BACK_BUTTON,
          ],
        },
        disable_web_page_preview: true,
        parse_mode: "Markdown",
      });
      //we will do the token thing here
    } else {
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

    const key = getPrivateKeyStingFromTelegramId(telegramId.toString());

    bot.sendMessage(
      chatId,
      `Here is your Wallet Private Key \n\n Tap to Reveal\n||${key}||\n `,
      {
        parse_mode: "MarkdownV2",
      }
    );
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
