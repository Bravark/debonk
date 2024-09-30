import TelegramBot from "node-telegram-bot-api";
import {
  bot,
  colletTextFromUser,
  formatCurrencyWithoutDollarSign,
  getAddressFromTelegramId,
  getPrivateKeyFromTelegramId,
  getTokenDetails,
  getTokenText,
  getSolPrice,
  getUserTokenBalance,
  toast,
  validateAmountGetTokenAndBuy,
  validateAmountGetTokenAndSell,
  sendUserWalletDetails,
  getUserSolBalance,
  getPrivateKeyStingFromTelegramId,
  getTokenAddressFromMessage,
  sendTokenDetailsByCA,
} from "./helper";
import {
  BACK_BUTTON,
  BOT_USERNAME,
  COLLECT_BUY_AMOUNT_INLINE_KEYBOARD,
  COLLECT_SELL_AMOUNT_INLINE_KEYBOARD,
  COULD_NOT_GET_TOKEN_DETAILS_TEXT,
  INITIAL_INLINE_KEYBOARD,
  KEYBOARD_QUERY,
  YOU_ARE_IN_THE_SIMULATION_TEXT,
} from "./constants";

import {
  chunkArray,
  formatCurrency,
  formatter,
  getContractAddressFromTextOrLink,
  getCurrentDate,
  numberValidator,
  solAddressValidator,
} from "./utils";
import { UserSolSmartWalletClass } from "./solana-provider";
import { calculateProfitLoss, getUserFromTelegramId } from "./prisma";
import { Wallet } from "@prisma/client";
import { PercentRange } from "./types";

import { sendTokenDetailsByCASimulation } from "./simulation";

const handleUserBuy = async (chatId: string, message: TelegramBot.Message) => {
  //collet all the details for the buy transaction

  const tokenText = await collectTokenText(chatId, message);

  const tt = await bot.sendMessage(chatId, tokenText, {
    reply_markup: {
      inline_keyboard: COLLECT_BUY_AMOUNT_INLINE_KEYBOARD,
    },
    disable_web_page_preview: true,
    parse_mode: "Markdown",
  });
};

const collectTokenText = async (
  chatId: string,
  message: TelegramBot.Message
) => {
  const tokenAddressMatch = message.text.match(/CA: ([A-Za-z0-9]+)/);
  let token: string;
  if (
    tokenAddressMatch &&
    tokenAddressMatch[1] &&
    (await solAddressValidator(tokenAddressMatch[1]))
  ) {
    token = tokenAddressMatch[1];
  } else {
    const xtoken = await colletTextFromUser<string>(
      chatId,
      "input the token contract address (CA):",
      "OK",
      "Invalid contract address",
      solAddressValidator
    );

    token = getContractAddressFromTextOrLink(xtoken);
  }

  const telegramId = message.chat.id;
  let tokenText: string;
  try {
    tokenText = await getTokenText(token, telegramId.toString());
  } catch (error) {
    bot.sendMessage(chatId, COULD_NOT_GET_TOKEN_DETAILS_TEXT);
  }

  return tokenText;
};

const handleViewTokenDetails = async (
  chatId: string,
  message: TelegramBot.Message
) => {
  const tokenText = await collectTokenText(chatId, message);

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
};

const handleUserSell = async (chatId: string, message: TelegramBot.Message) => {
  //collet all the details for the buy transaction
  const tokenAddressMatch = message.text.match(/CA: ([A-Za-z0-9]+)/);
  let token: string;
  if (
    tokenAddressMatch &&
    tokenAddressMatch[1] &&
    (await solAddressValidator(tokenAddressMatch[1]))
  ) {
    token = tokenAddressMatch[1];
  } else {
    const xtoken = await colletTextFromUser<string>(
      chatId,
      "input the token contract address (CA) to Sell:",
      "OK",
      "Invalid contract address",
      solAddressValidator
    );

    token = getContractAddressFromTextOrLink(xtoken);
  }

  const telegramId = message.chat.id;

  let tokenText: string;
  try {
    tokenText = await getTokenText(token, telegramId.toString());
  } catch (error) {
    bot.sendMessage(chatId, COULD_NOT_GET_TOKEN_DETAILS_TEXT);
  }
  const tt = await bot.sendMessage(chatId, tokenText, {
    reply_markup: {
      inline_keyboard: COLLECT_SELL_AMOUNT_INLINE_KEYBOARD,
    },
    parse_mode: "Markdown",
    disable_web_page_preview: true,
  });
};

const handleBuyTokenAmount = async (
  chatId: string,
  message: TelegramBot.Message,
  data: string
) => {
  const telegramId = message.chat.id.toString();
  const amount = parseFloat(data);
  console.log("amount: ", amount);
  if (isNaN(amount) || amount <= 0) {
    toast(chatId, "Invalid amount. Please enter a positive number.");
    return;
  }
  toast(chatId, "Amount: " + amount);

  await validateAmountGetTokenAndBuy(
    amount,
    chatId,
    telegramId,
    message.text,
    message.message_id
  );
};

const handleBuyTokenCustomAmount = async (
  chatId: string,
  message: TelegramBot.Message
) => {
  const telegramId = message.chat.id.toString();
  console.log("telegramId: ", telegramId);

  const amount = await colletTextFromUser<number>(
    chatId,
    "input the amount to buy in SOL",
    "valid amount",
    "invalid amount",
    numberValidator
  );

  console.log("amount: ", amount);

  await validateAmountGetTokenAndBuy(
    amount,
    chatId,
    telegramId,
    message.text,
    message.message_id
  );
};
const handleUpdateSendTokenDetailsByCA = async (
  chatId: string,
  message: TelegramBot.Message,
  isSIm = false
) => {
  const telegramId = message.chat.id.toString();
  //
  const tokenAddressMatch = message.text.match(/CA: ([A-Za-z0-9]+)/);
  let token: string;
  if (
    tokenAddressMatch &&
    tokenAddressMatch[1] &&
    (await solAddressValidator(tokenAddressMatch[1]))
  ) {
    token = tokenAddressMatch[1];
    if (!isSIm) {
      await sendTokenDetailsByCA(
        chatId,
        token,
        telegramId,
        message.message_id,
        true
      );
    } else {
      await sendTokenDetailsByCASimulation(
        chatId,
        token,
        telegramId,
        message.message_id,
        true
      );
    }
  } else {
    console.log("could not find the token in the message");
  }
};
const handleEnterSimulation = async (
  chatId: string,
  message: TelegramBot.Message
) => {
  const telegramId = message.chat.id.toString();
  const tokenAddressMatch = message.text.match(/CA: ([A-Za-z0-9]+)/);
  let token: string;
  if (
    tokenAddressMatch &&
    tokenAddressMatch[1] &&
    (await solAddressValidator(tokenAddressMatch[1]))
  ) {
    token = tokenAddressMatch[1];
    sendTokenDetailsByCASimulation(chatId, token, telegramId);
  } else {
    try {
      bot.editMessageText(`${YOU_ARE_IN_THE_SIMULATION_TEXT}`, {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "🧪💸 Simulation Buy",
                callback_data: KEYBOARD_QUERY.S_BUY,
              },

              {
                text: "🧪💴 Simulation Sell",
                callback_data: KEYBOARD_QUERY.S_SELL,
              },
            ],
            [
              {
                text: "🧪📝 View Simulation Position",
                callback_data: KEYBOARD_QUERY.S_POSITIONS,
              },
            ],
            BACK_BUTTON,
          ],
        },
        chat_id: chatId,
        message_id: message.message_id,
        parse_mode: "Markdown",
        disable_web_page_preview: true,
      });
    } catch (error) {}
  }
};
const handleSellTokenPercent = async (
  chatId: string,
  message: TelegramBot.Message,
  data: string
) => {
  const telegramId = message.chat.id.toString();
  console.log("data: ", data);
  const res = data.replace("%", "");
  console.log("res: ", res);

  const percentToSell = parseInt(res, 10) as PercentRange;
  console.log("percentToSell: ", percentToSell);

  if (!(percentToSell > 1 || percentToSell < 101)) {
    toast(chatId, "Invalid percent to buy.");
    return;
  }
  await validateAmountGetTokenAndSell(
    chatId,
    telegramId,
    message.text,
    message.message_id,
    "PERCENT",
    null,
    percentToSell
  );
};

const handleSellTokenAmount = async (
  chatId: string,
  message: TelegramBot.Message
) => {
  const telegramId = message.chat.id.toString();

  const amount = await colletTextFromUser<number>(
    chatId,
    "input the amount to Sell In SOl",
    "valid amount",
    "invalid amount",
    numberValidator
  );

  console.log("amount: ", amount);

  await validateAmountGetTokenAndSell(
    chatId,
    telegramId,
    message.text,
    message.message_id,
    "AMOUNT",
    amount
  );
};

const handleWithdraw = async (chatId: string, message: TelegramBot.Message) => {
  const telegramId = message.chat.id.toString();

  const amount = await colletTextFromUser<number>(
    chatId,
    "Input Amount TO Withdraw",
    "OK",
    "invalid Amount",
    numberValidator
  );

  const destination = await colletTextFromUser<string>(
    chatId,
    "Destination Address",
    "OK",
    "invalid Address",
    solAddressValidator
  );

  const key = getPrivateKeyFromTelegramId(telegramId);
  const userWalletClass = new UserSolSmartWalletClass(key);
  const msgRes = await bot.sendMessage(chatId, `Sending Transaction....`);
  const res = await userWalletClass.withdrawSol(amount, destination);
  console.log("res: ", res);

  try {
    bot.editMessageText(`Withdrawal successful, \nhash: ${res}`, {
      chat_id: chatId,
      message_id: msgRes.message_id,
      parse_mode: "Markdown",
      disable_web_page_preview: true,
    });
  } catch (error) {}
};

const handleUserBuyPositions = async (
  chatId: string,
  message: TelegramBot.Message
) => {
  const telegramId = message.chat.id.toString();
  //get all the bought transactions

  const { text, tokenListPosition } = await getPositionText(telegramId);

  const keyboardList = tokenListPosition.map((token) => {
    return {
      text: `Sell ${token.tokenName}`,
      callback_data: `sell-token:${token.address}`,
    };
  });

  const keyboardListSplit = chunkArray(keyboardList, 3);

  const keybaord = [
    ...keyboardListSplit,
    [{ text: "Refresh", callback_data: KEYBOARD_QUERY.UPDATE_POSITIONS }],
    [
      ...BACK_BUTTON,
      {
        text: "cancel",
        callback_data: KEYBOARD_QUERY.CLEAR_LISTENERS,
      },
    ],
  ];

  bot.sendMessage(chatId, text, {
    reply_markup: {
      inline_keyboard: keybaord,
    },
    parse_mode: "Markdown",
    disable_web_page_preview: true,
  });
};

const handleUpdateTokenBuyDetails = async (
  chatId: string,
  message: TelegramBot.Message
) => {
  const token = getTokenAddressFromMessage(message.text);
  const telegramId = message.chat.id.toString();

  const tokenText = await getTokenText(token, telegramId);
  try {
    bot.editMessageText(tokenText, {
      reply_markup: {
        inline_keyboard: COLLECT_BUY_AMOUNT_INLINE_KEYBOARD,
      },
      chat_id: chatId,
      message_id: message.message_id,
      parse_mode: "Markdown",
      disable_web_page_preview: true,
    });
  } catch (error) {}
};

const handleUpdateUserBuyPositions = async (
  chatId: string,
  message: TelegramBot.Message
) => {
  const telegramId = message.chat.id.toString();
  //get all the bought transactions

  const { text, tokenListPosition } = await getPositionText(telegramId);

  const keyboardList = tokenListPosition.map((token) => {
    return {
      text: `Sell ${token.tokenName}`,
      callback_data: `sell-token:${token.address}`,
    };
  });

  const keyboardListSplit = chunkArray(keyboardList, 3);

  const keybaord = [
    ...keyboardListSplit,
    [
      {
        text: "Refresh",
        callback_data: KEYBOARD_QUERY.UPDATE_POSITIONS,
      },
    ],
    BACK_BUTTON,
  ];
  try {
    bot.editMessageText(text, {
      reply_markup: {
        inline_keyboard: keybaord,
      },
      parse_mode: "Markdown",
      disable_web_page_preview: true,
      chat_id: chatId,
      message_id: message.message_id,
    });
  } catch (error) {}
};

const getPositionText = async (telegramId: string) => {
  const user = await getUserFromTelegramId(telegramId);
  const positions = user.positions.filter(
    (position) => position.isSimulation == false
  );
  const wallet = user.wallet.filter((wallet: Wallet) => wallet.isPrimary)[0];
  let text = "Active Positions:";

  const solPrice = await getSolPrice();
  if (positions.length < 1) {
    text += "\nNo active positions";
  }

  try {
    const tokenListPosition: { tokenName: string; address: string }[] = [];
    for (const position of positions) {
      const tokenDetails = await getTokenDetails(position.tokenAddress);
      tokenListPosition.push({
        tokenName: tokenDetails.name,
        address: position.tokenAddress,
      });
      const PNL_usd = await calculateProfitLoss(
        user.id,
        wallet.id,
        position.tokenAddress,
        tokenDetails.priceUsd.toString()
      );
      const PNL_sol = PNL_usd / solPrice;
      const PNL_Sol_percent = (
        (PNL_sol /
          (parseInt(position.amountHeld) * parseFloat(position.avgBuyPrice))) *
        solPrice *
        100
      ).toFixed(2);

      const balance = await getUserTokenBalance(
        position.tokenAddress,
        telegramId
      );
      const _balance = formatter({
        decimal: 5,
      }).format(balance);

      const currentPrice = formatter({
        decimal: 8,
      }).format(Number(tokenDetails.priceUsd.toString()));

      const ch = `${formatCurrencyWithoutDollarSign(
        balance * Number(tokenDetails.priceNative)
      )} SOL (${formatCurrency(balance * tokenDetails.priceUsd)})`;

      const PNL_usd_percent = (
        (PNL_usd /
          (parseInt(position.amountHeld) * parseFloat(position.avgBuyPrice))) *
        100
      ).toFixed(2);
      const nameWithLink = `[${position.tokenTicker}](https://t.me/${BOT_USERNAME}?start=token_${position.tokenAddress})`;
      text += `\n- ${nameWithLink} |  ${ch}\n`;
      text += `CA: \`${position.tokenAddress}\`\n`;
      text += ` 💎\n`;
      text += `  |-Current Price : $${currentPrice}\n`;
      text += `  |-MC: $${tokenDetails.mc}\n`;
      text += `  |-Capital: ${(
        (parseFloat(position.avgBuyPrice) * parseFloat(position.amountHeld)) /
        solPrice
      ).toFixed(2)} Sol ($${(
        parseFloat(position.avgBuyPrice) * parseFloat(position.amountHeld)
      ).toFixed(2)})\n`;
      text += `  |-Current value: ${ch}\n`;
      text += `  |-PNL USD: ${PNL_usd_percent}% ($${PNL_usd.toFixed()}) ${
        PNL_usd > 0 ? "🟩" : "🟥"
      }\n`;
      text += `  |-PNL SOL: ${PNL_Sol_percent}% (${PNL_sol.toFixed(2)} SOL) ${
        PNL_sol > 0 ? "🟩" : "🟥"
      }\n`;
    }

    text += `\n\n_Last refresh time : ${getCurrentDate()} UTC_`;

    return { text, tokenListPosition };
  } catch (error) {
    return { text: `could not get token Details`, tokenListPosition: [] };
  }
};

const handleBackToHome = async (
  chatId: string,
  message: TelegramBot.Message
) => {
  const telegramId = message.chat.id;

  const address = getAddressFromTelegramId(telegramId.toString());

  const user = await getUserFromTelegramId(telegramId.toString());

  const balance = await getUserSolBalance(telegramId.toString());
  const addressLink = `[View Wallet in Explorer](https://solscan.io/account/${address})`;
  const { solUsdPrice } = await UserSolSmartWalletClass.getSolPrice();

  const text = `Welcome to DEBONK! \n\n Here is your Wallet Address \n\n\`${address}\`\nMain Balance : ${balance}(${formatCurrency(
    balance * solUsdPrice
  )})\n ${addressLink}\n\n Simulation Balance : ${user.simulationBalance.toFixed(
    2
  )}SOL ($${(Number(user.simulationBalance) * solUsdPrice).toFixed})`;
  try {
    bot.editMessageText(text, {
      reply_markup: { inline_keyboard: INITIAL_INLINE_KEYBOARD },
      parse_mode: "Markdown",
      disable_web_page_preview: true,
      chat_id: chatId,
      message_id: message.message_id,
    });
  } catch (error) {}
};

const handleExportPrivateKey = async (
  chatId: string,
  message: TelegramBot.Message
) => {
  const telegramId = message.chat.id;

  const key = getPrivateKeyStingFromTelegramId(telegramId.toString());

  const msg = await bot.sendMessage(
    chatId,
    `Here is your Wallet Private Key \n\n Tap to Reveal\n||${key}||\n_DO NOT SHARE WITH ANYONE_\n\nYou can import the key into a wallet like Solflare\nThis message will auto delete in 1 minute, If not, delete this message once you are done`,
    {
      parse_mode: "MarkdownV2",
    }
  );
  await new Promise((r) => setTimeout(r, 60000));
  await bot.deleteMessage(chatId, msg.message_id);
};

const handleShowUserWalletDetails = async (
  chatId: string,
  message: TelegramBot.Message
) => {
  const telegramId = message.chat.id;
  await sendUserWalletDetails(telegramId.toString(), chatId);
};

const handleUpdateShowUserWalletDetails = async (
  chatId: string,
  message: TelegramBot.Message
) => {
  const telegramId = message.chat.id;
  await sendUserWalletDetails(
    telegramId.toString(),
    chatId,
    message.message_id,
    true
  );
};

export {
  handleBuyTokenCustomAmount,
  handleBuyTokenAmount,
  handleUserBuy,
  handleWithdraw,
  handleUserBuyPositions,
  handleUserSell,
  handleSellTokenPercent,
  handleUpdateUserBuyPositions,
  handleBackToHome,
  handleShowUserWalletDetails,
  handleEnterSimulation,
  handleViewTokenDetails,
  handleExportPrivateKey,
  handleUpdateShowUserWalletDetails,
  handleUpdateTokenBuyDetails,
  handleSellTokenAmount,
  handleUpdateSendTokenDetailsByCA,
};
