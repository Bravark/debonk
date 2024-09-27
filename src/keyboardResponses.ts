import { start } from "repl";
// import { KEYBOARD_QUERY } from "./constants";
import { bot, sendSellTokenMessage, toast } from "./helper";

import {
  handleBackToHome,
  handleBuyTokenAmount,
  handleBuyTokenCustomAmount,
  handleEnterSimulation,
  handleExportPrivateKey,
  handleInitBridge,
  handleSellTokenAmount,
  handleSellTokenPercent,
  handleShowUserWalletDetails,
  handleUpdateSendTokenDetailsByCA,
  handleUpdateShowUserWalletDetails,
  handleUpdateTokenBuyDetails,
  handleUpdateUserBuyPositions,
  handleUserBuy,
  handleUserBuyPositions,
  handleUserSell,
  handleViewTokenDetails,
  handleWithdraw,
} from "./handleKeyboardResponse";
import TelegramBot from "node-telegram-bot-api";
import { ADMIN_KEYBOARD_QUERY, KEYBOARD_QUERY } from "./constants";
import {
  handleSellTokenPercentSimulation,
  handleSimulationBuyTokenAmount,
  handleUpdateTokenBuyDetailsSimulation,
  handleUpdateUserBuyPositionsSimulation,
  handleUserBuyPositionsSimulation,
  handleUserBuySimulation,
  handleUserSellSimulation,
} from "./simulation";
import {
  handleAdminUpdateUserCashOutProfit,
  reFreshPoolingDevBot,
} from "./admin/admin";
import { handleWithdrawProfits } from "./referrals/handleKeyboardResponses";

export const queryCallBack = async (
  callbackQuery: TelegramBot.CallbackQuery
) => {
  const { data } = callbackQuery;
  console.log("data: ", data);
  const chatId = callbackQuery.message?.chat.id!;
  const callbackData = callbackQuery.data;

  const message = callbackQuery.message;
  const telegramId = callbackQuery.message.chat.id;

  switch (data) {
    case KEYBOARD_QUERY.UPDATE_TOKEN_DETAILS_BY_CA:
      bot.answerCallbackQuery(callbackQuery.id, {
        text: "Update token details",
      });
      try {
        await handleUpdateSendTokenDetailsByCA(chatId.toString(), message);
      } catch (error) {
        console.log("error: ", error);
        toast(chatId.toString(), "An error occurred: ");
      }

      break;

    case KEYBOARD_QUERY.S_UPDATE_TOKEN_DETAILS_BY_CA:
      bot.answerCallbackQuery(callbackQuery.id, {
        text: "Update token details Simulation",
      });
      try {
        await handleUpdateSendTokenDetailsByCA(
          chatId.toString(),
          message,
          true
        );
      } catch (error) {
        console.log("error: ", error);
        toast(chatId.toString(), "An error occurred: ");
      }

      break;
    case KEYBOARD_QUERY.BUY:
      bot.answerCallbackQuery(callbackQuery.id, {
        text: "Buy Token",
      });
      try {
        await handleUserBuy(chatId.toString(), message);
      } catch (error) {
        console.log("error: ", error);
        toast(chatId.toString(), "An error occurred: ");
      }

      break;

    case KEYBOARD_QUERY.UPDATE_TOKEN_BUY_TEXT:
      bot.answerCallbackQuery(callbackQuery.id, {
        text: "Buy Token",
      });
      try {
        await handleUpdateTokenBuyDetails(chatId.toString(), message);
      } catch (error) {
        console.log("error: ", error);
        toast(chatId.toString(), "An error occurred: ");
      }

      break;

    case KEYBOARD_QUERY.VIEW_TOKEN_DETAILS:
      bot.answerCallbackQuery(callbackQuery.id, {
        text: "View Token Details",
      });
      try {
        await handleViewTokenDetails(chatId.toString(), message);
      } catch (error) {
        console.log("error: ", error);
        toast(chatId.toString(), "An error occurred: ");
      }

      break;
    case KEYBOARD_QUERY.S_BUY:
      bot.answerCallbackQuery(callbackQuery.id, {
        text: "Buy Token",
      });
      try {
        await handleUserBuySimulation(chatId.toString(), message);
      } catch (error) {
        console.log("error: ", error);
        toast(chatId.toString(), "An error occurred: ");
      }

      break;

    case KEYBOARD_QUERY.S_UPDATE_TOKEN_BUY_TEXT:
      bot.answerCallbackQuery(callbackQuery.id, {
        text: "Update  Token",
      });
      try {
        await handleUpdateTokenBuyDetailsSimulation(chatId.toString(), message);
      } catch (error) {
        console.log("error: ", error);
        toast(chatId.toString(), "An error occurred: ");
      }

      break;
    case KEYBOARD_QUERY.SELL:
      bot.answerCallbackQuery(callbackQuery.id, {
        text: "Sell Token",
      });
      try {
        await handleUserSell(chatId.toString(), message);
      } catch (error) {
        console.log("error: ", error);
        toast(chatId.toString(), "An error occurred: ");
      }

      break;

    case KEYBOARD_QUERY.S_SELL:
      bot.answerCallbackQuery(callbackQuery.id, {
        text: "Sell Token in Simulation Mode",
      });
      try {
        await handleUserSellSimulation(chatId.toString(), message);
      } catch (error) {
        console.log("error: ", error);
        toast(chatId.toString(), "An error occurred: ");
      }

      break;

    //BRIDGE

    case KEYBOARD_QUERY.INIT_BRIDGE:
      bot.answerCallbackQuery(callbackQuery.id, {
        text: "Bridge Tokens",
      });
      try {
        await handleInitBridge(chatId.toString(), message);
      } catch (error) {
        console.log("error: ", error);
        toast(chatId.toString(), "An error occurred: ");
      }

      break;

    //USER POSITIONS
    case KEYBOARD_QUERY.POSITIONS:
      bot.answerCallbackQuery(callbackQuery.id, {
        text: "Positions",
      });
      try {
        await handleUserBuyPositions(chatId.toString(), message);
      } catch (error) {
        console.log("error: ", error);
        toast(chatId.toString(), "An error occurred: ");
      }
      break;

    case KEYBOARD_QUERY.UPDATE_POSITIONS:
      bot.answerCallbackQuery(callbackQuery.id, {
        text: "Update Positions",
      });
      try {
        await handleUpdateUserBuyPositions(chatId.toString(), message);
      } catch (error) {
        console.log("error: ", error);
        toast(chatId.toString(), "An error occurred: ");
      }
      break;

    case KEYBOARD_QUERY.S_POSITIONS:
      bot.answerCallbackQuery(callbackQuery.id, {
        text: "Simulation Positions",
      });
      try {
        await handleUserBuyPositionsSimulation(chatId.toString(), message);
      } catch (error) {
        console.log("error: ", error);
        toast(chatId.toString(), "An error occurred: ");
      }
      break;

    case KEYBOARD_QUERY.UPDATE_S_POSITIONS:
      bot.answerCallbackQuery(callbackQuery.id, {
        text: "Update Simulation Positions",
      });
      try {
        await handleUpdateUserBuyPositionsSimulation(
          chatId.toString(),
          message
        );
      } catch (error) {
        console.log("error: ", error);
        toast(chatId.toString(), "An error occurred: ");
      }
      break;

    //BUY AMOUNTS

    case KEYBOARD_QUERY.BUY_AMOUNT.B_01:
    case KEYBOARD_QUERY.BUY_AMOUNT.B_05:

    case KEYBOARD_QUERY.BUY_AMOUNT.B_1:
      bot.answerCallbackQuery(callbackQuery.id, {
        text: "Buy",
      });
      try {
        await handleBuyTokenAmount(chatId.toString(), message, callbackData);
      } catch (error) {
        console.log("error: ", error);
        toast(chatId.toString(), "An error occurred: ");
      }

      break;

    case KEYBOARD_QUERY.S_BUY_AMOUNT.S_B_01:
    case KEYBOARD_QUERY.S_BUY_AMOUNT.S_B_05:
    case KEYBOARD_QUERY.S_BUY_AMOUNT.S_B_1:
      bot.answerCallbackQuery(callbackQuery.id, {
        text: "Buy",
      });
      try {
        await handleSimulationBuyTokenAmount(
          chatId.toString(),
          message,
          callbackData
        );
      } catch (error) {
        console.log("error: ", error);
        toast(chatId.toString(), "An error occurred: ");
      }

      break;

    case KEYBOARD_QUERY.BUY_AMOUNT.CUSTOM:
      bot.answerCallbackQuery(callbackQuery.id, {
        text: "Buy",
      });
      try {
        await handleBuyTokenCustomAmount(chatId.toString(), message);
      } catch (error) {
        console.log("error: ", error);
        toast(chatId.toString(), "An error occurred: ");
      }

      break;

    //SELL PERCENTAGE
    case KEYBOARD_QUERY.SELL_PERCENT.S_25:
    case KEYBOARD_QUERY.SELL_PERCENT.S_50:
    case KEYBOARD_QUERY.SELL_PERCENT.S_100:
      bot.answerCallbackQuery(callbackQuery.id, {
        text: "Sell",
      });
      try {
        await handleSellTokenPercent(chatId.toString(), message, callbackData);
      } catch (error) {
        console.log("error: ", error);
        toast(chatId.toString(), "An error occurred: ");
      }

      break;

    //SELL AMOUNT
    case KEYBOARD_QUERY.SELL_PERCENT.CUSTOM:
      bot.answerCallbackQuery(callbackQuery.id, {
        text: "Sell",
      });
      try {
        await handleSellTokenAmount(chatId.toString(), message);
      } catch (error) {
        console.log("error: ", error);
        toast(chatId.toString(), "An error occurred: ");
      }

      break;

    case KEYBOARD_QUERY.S_SELL_PERCENT.S_S_25:
    case KEYBOARD_QUERY.S_SELL_PERCENT.S_S_50:
    case KEYBOARD_QUERY.S_SELL_PERCENT.S_S_100:
      bot.answerCallbackQuery(callbackQuery.id, {
        text: "Sell Simulation",
      });
      try {
        await handleSellTokenPercentSimulation(
          chatId.toString(),
          message,
          callbackData
        );
      } catch (error) {
        console.log("error: ", error);
        toast(chatId.toString(), "An error occurred: ");
      }

      break;
    //SIMULATION

    case KEYBOARD_QUERY.ENTER_SIMULATION:
      bot.answerCallbackQuery(callbackQuery.id, {
        text: "Enter Simulation",
      });
      try {
        await handleEnterSimulation(chatId.toString(), message);
      } catch (error) {
        console.log("error: ", error);
        toast(chatId.toString(), "An error occurred: ");
      }

      break;
    //WITHDRAW

    case KEYBOARD_QUERY.WITHDRAW_TRX:
      bot.answerCallbackQuery(callbackQuery.id, {
        text: "Withdraw Sol",
      });
      try {
        await handleWithdraw(chatId.toString(), message);
      } catch (error) {
        console.log("error: ", error);
        toast(chatId.toString(), "An error occurred: ");
      }

      break;

    //HELPERS

    case KEYBOARD_QUERY.CLEAR_LISTENERS:
      bot.answerCallbackQuery(callbackQuery.id, {
        text: "cancel",
      });
      try {
        await bot.deleteMessage(chatId, message.message_id);
      } catch (error) {
        console.log("error: ", error);
      }

      break;

    case KEYBOARD_QUERY.BACK_TO_HOME:
      bot.answerCallbackQuery(callbackQuery.id, {
        text: "Back to Homepage",
      });
      try {
        handleBackToHome(chatId.toString(), message);
      } catch (error) {
        console.log("error: ", error);
        toast(chatId.toString(), "An error occurred: ");
      }
      break;

    case KEYBOARD_QUERY.SHOW_WALLET:
      bot.answerCallbackQuery(callbackQuery.id, {
        text: "Back to Homepage",
      });
      try {
        handleShowUserWalletDetails(chatId.toString(), message);
      } catch (error) {
        console.log("error: ", error);
        toast(chatId.toString(), "An error occurred: ");
      }
      break;
    case KEYBOARD_QUERY.UPDATE_SHOW_WALLET:
      bot.answerCallbackQuery(callbackQuery.id, {
        text: "Back to Homepage",
      });
      try {
        handleUpdateShowUserWalletDetails(chatId.toString(), message);
      } catch (error) {
        console.log("error: ", error);
        toast(chatId.toString(), "An error occurred: ");
      }
      break;

    case KEYBOARD_QUERY.EXPORT_PRIVATE_KEY:
      bot.answerCallbackQuery(callbackQuery.id, {
        text: "Back to Homepage",
      });
      try {
        handleExportPrivateKey(chatId.toString(), message);
      } catch (error) {
        console.log("error: ", error);
        toast(chatId.toString(), "An error occurred: ");
      }
      break;

    //REFERRAL PROFITS

    case KEYBOARD_QUERY.WITHDRAW_PROFIT:
      bot.answerCallbackQuery(callbackQuery.id, {
        text: "cancel",
      });
      try {
        await handleWithdrawProfits(chatId, telegramId.toString());
      } catch (error) {
        console.log("error: ", error);
        toast(chatId.toString(), "An error occurred: ");
      }

      break;

    default:
      bot.answerCallbackQuery(callbackQuery.id, { text: "Unknown action." });
  }

  if (data.includes("s_sell-tokes")) {
    const token = data.split(":")[1];
    await sendSellTokenMessage(token, message, chatId.toString(), true);
  }

  if (data.includes("sell-token")) {
    const token = data.split(":")[1];
    await sendSellTokenMessage(token, message, chatId.toString());
  }
};

export const queryCallBackDevBot = async (
  callbackQuery: TelegramBot.CallbackQuery
) => {
  try {
    const { data } = callbackQuery;
    const chatId = callbackQuery.message?.chat.id!;
    const message = callbackQuery.message;
    const telegramId = callbackQuery.from?.id;

    switch (data) {
      case ADMIN_KEYBOARD_QUERY.ADMIN_UPDATE_USER_PROFIT:
        bot.answerCallbackQuery(callbackQuery.id, {
          text: "Starting new swap",
        });
        try {
          await handleAdminUpdateUserCashOutProfit(chatId, message!);
          console.log("finished");
        } catch (error) {
          console.log("error: ", error);
          toast(chatId.toString(), "An error occurred: ");
        }

        break;

      //HELPERS

      case KEYBOARD_QUERY.CLEAR_LISTENERS:
        bot.answerCallbackQuery(callbackQuery.id, {
          text: "cancel",
        });
        try {
          await bot.removeAllListeners();
          if (message) {
            await bot.deleteMessage(chatId, message.message_id);
          }
        } catch (error) {
          console.log("error: ", error);
          toast(chatId.toString(), "An error occurred: ");
        }

        break;

      default:
        bot.answerCallbackQuery(callbackQuery.id, { text: "Unknown action." });
    }
  } catch (error) {
    console.log("error: ", error);
    reFreshPoolingDevBot();
  }
};
