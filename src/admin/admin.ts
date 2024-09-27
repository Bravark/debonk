import TelegramBot from "node-telegram-bot-api";
import { updateUserCashOut } from "../prisma";
import { getTelegramIdFromText } from "../utils";
import { ADMIN_BOT_KEY, DEV_TELEGRAM_ID } from "../constants";
import { getUpdates } from "../helper";

export const devBot = new TelegramBot(ADMIN_BOT_KEY, { polling: true });

export const reFreshPoolingDevBot = async () => {
  const id = (await getUpdates(ADMIN_BOT_KEY))! + 1;
  console.log("id: ", id);
  await devBot.stopPolling();
  await devBot.startPolling({
    polling: {
      interval: 300, // Check for updates every 300ms
      autoStart: true, // Automatically start polling
      params: {
        offset: await getUpdates(ADMIN_BOT_KEY), // Start with no offset
      },
    },
  });
};

const adminUpdateUserCashOutProfit = async (
  type: "ALL" | "CUSTOM",
  telegramId: string,
  amount?: number
) => {
  if (type == "ALL") {
    const res = await updateUserCashOut(telegramId);
    if (res?.statUSText == "ALREADY_PAID") {
      devBot.sendMessage(
        DEV_TELEGRAM_ID,
        `Already Paid out, or something else`
      );

      return;
    }

    if (res?.statUSText == "PAID") {
      devBot.sendMessage(DEV_TELEGRAM_ID, `SUCCESSFULLY UPDATED`);
    }
  } else if (type == "CUSTOM") {
    if (amount) {
      await updateUserCashOut(telegramId, amount);
    } else {
      console.log("amount is required for type CUSTOM");
    }
  } else {
    console.log("invalid type");
  }
};

const handleAdminUpdateUserCashOutProfit = async (
  chatId: number,
  message: TelegramBot.Message
) => {
  const text = message.text;
  if (!text) {
    devBot.sendMessage(DEV_TELEGRAM_ID, "TEXT NOT RESENT IN MESSAGE");
    return;
  }
  const telegramId = getTelegramIdFromText(text);
  console.log("telegramId: ", telegramId);

  if (telegramId == null) {
    devBot.sendMessage(DEV_TELEGRAM_ID, "TELEGRAM ID NOT FOUND");
    return;
  }

  await adminUpdateUserCashOutProfit("ALL", telegramId.toString());

  //TODO: i should work the other update, which allow to update a custom amount i will use the type "CUSTOM"
};

export { handleAdminUpdateUserCashOutProfit };
