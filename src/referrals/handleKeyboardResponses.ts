import { createReferralCashOut, getReferralProfit } from "../prisma";
import { bot, getAddressFromTelegramId, getSolPrice } from "../helper";
import {
  ADMIN_BOT_KEY,
  ADMIN_KEYBOARD_QUERY,
  DEV_TELEGRAM_ID,
  KEYBOARD_QUERY,
  MIN_PROFIT_WITHDRAWAL_AMOUNT,
} from "../constants";
import { colletTextFromUser, solAddressValidator } from "../utils";
import TelegramBot from "node-telegram-bot-api";
import { devBot } from "../admin/admin";

export const handleWithdrawProfits = async (
  chatId: number,
  telegramId: string
) => {
  try {
    const userProfit = await getReferralProfit(telegramId);
    if (!userProfit) {
      console.log("No referral found for the user");
      bot.sendMessage(chatId, "No referral Profit found ");
      return;
    }

    if (userProfit < MIN_PROFIT_WITHDRAWAL_AMOUNT) {
      console.log("User has less than minimum profit to withdraw");
      bot.sendMessage(
        chatId,
        `You Have  less than minimum profit to withdraw `
      );
      return;
    }
    const address = getAddressFromTelegramId(telegramId);

    const status = await createReferralCashOut(telegramId, address);
    if (!status) {
      console.log("Error in creating payout request");
      bot.sendMessage(
        chatId,
        "You already Have a Pending Payout, Please wait while we process it."
      );
      return;
    }

    const solPrice = await getSolPrice();
    const usdValue = userProfit * solPrice;
    devBot.sendMessage(
      DEV_TELEGRAM_ID,
      `Payout Request:\n\nValue: \`${userProfit}\` ($\`${usdValue}\`)\n Payout Address \`${address}\`\nUser TelegramId: \`${telegramId}\` `,
      {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: `Update Status`,
                callback_data: ADMIN_KEYBOARD_QUERY.ADMIN_UPDATE_USER_PROFIT,
              },
            ],
          ],
        },

        parse_mode: "Markdown",
      }
    );

    bot.sendMessage(
      chatId,
      `Successfully Requested for a Payout, Your Request will be Processed within 24Hrs`
    );
  } catch (error) {
    console.log("error: ", error);
  }
};

export const handleGetReferralProfits = async (
  message: TelegramBot.Message,
  chatId: string
) => {
  const telegramId = message.chat.id.toString();
  const profit = await getReferralProfit(telegramId);
  if (!profit) {
    console.log(
      "Could Not Find Referral Profit: No referral found for the user"
    );
    return bot.sendMessage(chatId.toString(), `Referral Profit : 0 SOL`);
  }

  //convert thr profit in btc to usd

  const solPrice = await getSolPrice();
  const usdValue = profit * solPrice;

  return bot.sendMessage(
    chatId.toString(),
    `Referral Profit : ${profit} SOL ($${usdValue})`,
    {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: `Withdraw Profit`,
              callback_data: KEYBOARD_QUERY.WITHDRAW_PROFIT,
            },
          ],
        ],
      },
    }
  );
};
export { devBot };
