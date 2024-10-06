import { Wallet } from "@prisma/client";
import {
  bot,
  colletTextFromUser,
  formatCurrencyWithoutDollarSign,
  getAddressFromTelegramId,
  getSolPrice,
  getTokenAddressFromMessage,
  getTokenDetails,
  getTokenText,
  sendSellTokenMessage,
  toast,
} from "./helper";
import {
  getUserFromTelegramId,
  getUserSImulationBalance,
  prisma,
  updatePositionOnBuySimulation,
  decrementUserSimulationBalance,
  calculateProfitLoss,
  getBuyTransaction,
  updatePositionOnSell,
  incrementUserSimulationBalance,
} from "./prisma";
import {
  BACK_BUTTON,
  BOT_USERNAME,
  COLLECT_BUY_AMOUNT_INLINE_KEYBOARD_SIMULATION,
  COLLECT_SELL_AMOUNT_INLINE_KEYBOARD_SIMULATION,
  COULD_NOT_GET_TOKEN_DETAILS_TEXT,
  INITIAL_INLINE_KEYBOARD,
  KEYBOARD_QUERY,
  SIMULATION_BUY_AND_SELL_KEYBOARD,
  YOU_ARE_IN_THE_SIMULATION_TEXT,
} from "./constants";
import TelegramBot from "node-telegram-bot-api";
import {
  chunkArray,
  formatCurrency,
  formatter,
  getContractAddressFromTextOrLink,
  getCurrentDate,
  solAddressValidator,
} from "./utils";
import { PercentRange } from "./types";
import { UserSolSmartWalletClass } from "./solana-provider";

export const validateAmountGetTokenAndBuySimulation = async (
  amount: number,
  chatId: string,
  telegramId: string,
  messageText: string,
  messageId: number,
  message: TelegramBot.Message
) => {
  //validate user balance

  const userBalance = await getUserSImulationBalance(telegramId);
  console.log("userBalance: ", userBalance);
  if (Number(userBalance) < amount) {
    toast(
      chatId,
      `${YOU_ARE_IN_THE_SIMULATION_TEXT} Insufficient Simulation SOL balance. Contact Support to get more Simulation SOL`
    );
    return;
  }

  const tokenAddressMatch = messageText.match(/CA: ([A-Za-z0-9]+)/);

  if (tokenAddressMatch && tokenAddressMatch[1]) {
    const tokenAddress = tokenAddressMatch[1];

    bot.editMessageText(`${messageText}\n\n✅ Simulation Buy Successful `, {
      parse_mode: "Markdown",
      disable_web_page_preview: true,
      reply_markup: message.reply_markup,
      chat_id: chatId,
      message_id: messageId,
    });
    await completeBuyActionSimulation(telegramId, tokenAddress, amount);
  } else {
    console.error("Token Address not found in the message");
  }
};

const completeBuyActionSimulation = async (
  telegramId: string,
  tokenAddress: string,
  amount: number
) => {
  try {
    //updating user simulationBalance
    await decrementUserSimulationBalance(telegramId, amount);
    const user = await getUserFromTelegramId(telegramId);
    const tokenDetails = await getTokenDetails(tokenAddress);
    const amountInToken = amount / Number(tokenDetails.priceNative);
    console.log("amountInToken: ", amountInToken);
    const wallet = user.wallet.filter((wallet: Wallet) => wallet.isPrimary)[0];
    if (!user.wallet) {
      const address = getAddressFromTelegramId(telegramId.toString());

      await prisma.wallet.upsert({
        where: { address: address },
        update: {},
        create: { userId: user.id, address: address, isPrimary: true },
      });
    }

    await prisma.transaction.create({
      data: {
        amountBought: amountInToken.toString(),
        tokenAddress: tokenAddress,
        status: "bought",
        buyHash: "simulation",
        tokenTicker: tokenDetails.name,
        walletId: wallet.id,
        userId: user.id,
        buyPrice: tokenDetails.priceUsd.toString(),
      },
    });
    const res = await updatePositionOnBuySimulation(
      user.id,
      wallet.id,
      tokenAddress,
      tokenDetails.name,
      amountInToken.toString(),
      tokenDetails.priceUsd.toString(),
      true
    );
  } catch (error) {
    console.log("error: ", error);
  }
};

export const handleSimulationBuyTokenAmount = async (
  chatId: string,
  message: TelegramBot.Message,
  data: string
) => {
  const telegramId = message.chat.id.toString();
  const number = data.substring(1);
  console.log("number: ", number);
  const amount = parseFloat(number);
  console.log("amount: ", amount);
  if (isNaN(amount) || amount <= 0) {
    toast(chatId, "Invalid amount. Please enter a positive number.");
    return;
  }
  toast(chatId, "Amount: " + amount);

  await validateAmountGetTokenAndBuySimulation(
    amount,
    chatId,
    telegramId,
    message.text,
    message.message_id,
    message
  );
};

export const handleUpdateTokenBuyDetailsSimulation = async (
  chatId: string,
  message: TelegramBot.Message
) => {
  const token = getTokenAddressFromMessage(message.text);
  const telegramId = message.chat.id.toString();

  const tokenText = await getTokenText(token, telegramId, true);

  const tokenTextSim = `${YOU_ARE_IN_THE_SIMULATION_TEXT}\n${tokenText}`;
  try {
    bot.editMessageText(tokenTextSim, {
      reply_markup: {
        inline_keyboard: COLLECT_BUY_AMOUNT_INLINE_KEYBOARD_SIMULATION,
      },
      chat_id: chatId,
      message_id: message.message_id,
      parse_mode: "Markdown",
      disable_web_page_preview: true,
    });
  } catch (error) {}
};

export const handleUserBuyPositionsSimulation = async (
  chatId: string,
  message: TelegramBot.Message
) => {
  const telegramId = message.chat.id.toString();

  const { text, tokenListPosition } = await getPositionTextSimulation(
    telegramId
  );
  //get all the bought transactions

  const keyboardList = tokenListPosition.map((token) => {
    return {
      text: `Sell ${token.tokenName}`,
      callback_data: `s_sell-tokes:${token.address}`,
    };
  });
  //i want to split the keyboardList into a list of list with each list containing 3 items
  const keyboardListSplit = chunkArray(keyboardList, 3);
  //define the chunkArray function

  const keybaord = [
    ...keyboardListSplit,
    [
      {
        text: "Refresh",
        callback_data: KEYBOARD_QUERY.UPDATE_S_POSITIONS,
      },
    ],
    BACK_BUTTON,
  ];

  bot.sendMessage(chatId, text, {
    reply_markup: {
      inline_keyboard: keybaord,
    },
    parse_mode: "Markdown",
    disable_web_page_preview: true,
  });
};

export const getPositionTextSimulation = async (telegramId: string) => {
  const user = await getUserFromTelegramId(telegramId);
  const positions = user.positions.filter(
    (position) => position.isSimulation == true
  );
  const wallet = user.wallet.filter((wallet: Wallet) => wallet.isPrimary)[0];
  let text = `${YOU_ARE_IN_THE_SIMULATION_TEXT}\n Active Positions:`;

  const solPrice = await getSolPrice();
  if (positions.length < 1) {
    text += "\nNo active positions";
  }

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

    const balance = Number(position.amountHeld);

    const ch = `${formatCurrencyWithoutDollarSign(
      balance * Number(tokenDetails.priceNative)
    )} SOL (${formatCurrency(
      balance * Number(tokenDetails.priceUsd.toString())
    )})`;
    const currentPrice = formatter({
      decimal: 8,
    }).format(Number(tokenDetails.priceUsd.toString()));

    const PNL_usd_percent = (
      (PNL_usd /
        (parseInt(position.amountHeld) * parseFloat(position.avgBuyPrice))) *
      100
    ).toFixed(2);
    const nameWithLink = `[${position.tokenTicker}](https://t.me/${BOT_USERNAME}?start=stoken_${position.tokenAddress})`;
    text += `\n--------------------------------\n`;
    text += `\n- ${nameWithLink} | ${ch}\n`;
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
    text += `  |-Current value:  ${ch}\n`;
    text += `  |-PNL USD: ${PNL_usd_percent}% ($${PNL_usd.toFixed()}) ${
      PNL_usd > 0 ? "🟩" : "🟥"
    }\n`;
    text += `  |-PNL SOL: ${PNL_Sol_percent}% (${PNL_sol.toFixed(2)} SOL) ${
      PNL_sol > 0 ? "🟩" : "🟥"
    }\n`;
    const pnlCardLink = `[Get PNL Card](https://t.me/${BOT_USERNAME}?start=pnlcard_${position.id})`;
    text += `\n${pnlCardLink}`;

    text += `\n-------------------------------\n`;
  }

  text += `\n\n_Last refresh time : ${getCurrentDate()}_`;

  return { text, tokenListPosition };
};

export const handleUpdateUserBuyPositionsSimulation = async (
  chatId: string,
  message: TelegramBot.Message
) => {
  const telegramId = message.chat.id.toString();

  const { text, tokenListPosition } = await getPositionTextSimulation(
    telegramId
  );

  const keyboardList = tokenListPosition.map((token) => {
    return {
      text: `Sell ${token.tokenName}`,
      callback_data: `s_sell-tokes:${token.address}`,
    };
  });

  const keyboardListSplit = chunkArray(keyboardList, 3);
  const keybaord = [
    ...keyboardListSplit,
    [
      {
        text: "Refresh",
        callback_data: KEYBOARD_QUERY.UPDATE_S_POSITIONS,
      },
    ],
    BACK_BUTTON,
  ];
  //get all the bought transactions
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

export const handleUserSellSimulation = async (
  chatId: string,
  message: TelegramBot.Message
) => {
  //collet all the details for the buy transaction

  const tokenAddressMatch = message.text.match(/CA: ([A-Za-z0-9]+)/);

  console.log("tokenAddressMatch: ", tokenAddressMatch);
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
      `${YOU_ARE_IN_THE_SIMULATION_TEXT}\ninput the token contract address (CA) to Sell:`,
      "OK",
      "Invalid contract address",
      solAddressValidator
    );

    token = getContractAddressFromTextOrLink(xtoken);
  }

  await sendSellTokenMessage(token, message, chatId, true);
};

export const handleUserBuySimulation = async (
  chatId: string,
  message: TelegramBot.Message
) => {
  //let the user know that they are in the simulation
  // await bot.sendMessage(
  //   chatId,
  //   `########################\n You are in a Simulation\n########################\n`
  // );

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
      `${YOU_ARE_IN_THE_SIMULATION_TEXT}\ninput the token contract address (CA):`,
      "OK",
      "Invalid contract address",
      solAddressValidator
    );

    token = getContractAddressFromTextOrLink(xtoken);
    console.log("token: ", token);
  }

  const telegramId = message.chat.id;
  let tokenText: string;
  try {
    tokenText = await getTokenText(token, telegramId.toString(), true);
  } catch (error) {
    bot.sendMessage(chatId, COULD_NOT_GET_TOKEN_DETAILS_TEXT);
  }
  const tokenTextSim = `${YOU_ARE_IN_THE_SIMULATION_TEXT}\n${tokenText}`;

  const tt = await bot.sendMessage(chatId, tokenTextSim, {
    reply_markup: {
      inline_keyboard: COLLECT_BUY_AMOUNT_INLINE_KEYBOARD_SIMULATION,
    },
    disable_web_page_preview: true,
    parse_mode: "Markdown",
  });
};

export const handleSellTokenPercentSimulation = async (
  chatId: string,
  message: TelegramBot.Message,
  data: string
) => {
  const telegramId = message.chat.id.toString();
  console.log("data: ", data);
  const datas = data.substring(1);
  const res = datas.replace("%", "");
  console.log("res: ", res);

  const percentToSell = parseInt(res, 10) as PercentRange;
  console.log("percentToSell: ", percentToSell);

  if (!(percentToSell > 1 || percentToSell < 101)) {
    toast(chatId, "Invalid percent to buy.");
    return;
  }
  await validateAmountGetTokenAndSellSimulation(
    chatId,
    telegramId,
    message.text,
    message,
    "PERCENT",
    null,
    percentToSell
  );
};

const validateAmountGetTokenAndSellSimulation = async (
  chatId: string,
  telegramId: string,
  messageText: string,
  message: TelegramBot.Message,
  type: "PERCENT" | "AMOUNT",
  amount?: number,
  percentToSell?: PercentRange
) => {
  console.log("SIMULATIOOOOOOO");
  const tokenAddress: string = getTokenAddressFromMessage(messageText);
  let solId = "";
  let res: any;
  if (!(type === "PERCENT")) {
    console.error("Invalid type provided");
    return;
  }
  //validate that the field percentToSell is present
  if (!percentToSell) {
    toast(chatId, "Please provide a percentage to sell.");
    return;
  }
  //SIMULATION THE SELL

  const user = await getUserFromTelegramId(telegramId);
  const position = user.positions.find(
    (position) =>
      position.isSimulation == true && position.tokenAddress === tokenAddress
  );
  const amountHeld = Number(position.amountHeld);
  const percentSold = amountHeld * (percentToSell / 100);
  const amountToSell = percentSold;
  const tokenDetails = await getTokenDetails(tokenAddress);
  const tokenSolPrice = Number(tokenDetails.priceNative);
  console.log("tokenSolPrice: ", tokenSolPrice);
  const amountInSol = tokenSolPrice * amountToSell;
  console.log("amountInSol: ", amountInSol);

  await incrementUserSimulationBalance(telegramId, amountInSol);
  res = ``;
  console.log("amountInToken: ", amountToSell);
  amount = amountToSell;

  console.log("res: ", res);
  if (res.status == false) {
    bot.sendMessage(chatId, `Sell Transaction Failed : ${res.message}`);
    return;
  }

  console.log("res: ", res);
  solId = res;

  bot.editMessageText(`${messageText}\n\n✅ Simulation Sell Successful `, {
    reply_markup: message.reply_markup,
    parse_mode: "Markdown",
    disable_web_page_preview: true,
    chat_id: chatId,
    message_id: message.message_id,
  });

  const wallet = user.wallet.filter((wallet: Wallet) => wallet.isPrimary)[0];
  //if wallet does not exist, create it
  if (!user.wallet) {
    const address = getAddressFromTelegramId(telegramId.toString());

    await prisma.wallet.upsert({
      where: { address: address },
      update: {},
      create: { userId: user.id, address: address, isPrimary: true },
    });
  }

  const buySol = await getBuyTransaction(user.id, wallet.id, tokenAddress);
  await prisma.transaction.update({
    where: {
      id: buySol.id,
    },
    data: {
      amountSold: amount.toString(),
      status: "sold",
      sellHash: solId,
      sellPrice: tokenDetails.priceUsd.toString(),
    },
  });
  const result = await updatePositionOnSell(
    user.id,
    wallet.id,
    tokenAddress,
    amount.toString(),
    tokenDetails.priceUsd.toString()
  );
  console.log("res: ", result);
  console.log("tokenAddress: ", tokenAddress);
};

export const sendTokenDetailsByCASimulation = async (
  chatId: string,
  tokenAddress: string,
  telegramId: string,
  messageId?: number,
  isUpdate = false
) => {
  let tokenText: string;
  try {
    tokenText = await getTokenText(tokenAddress, telegramId.toString(), true);
  } catch (error) {
    bot.sendMessage(chatId.toString(), COULD_NOT_GET_TOKEN_DETAILS_TEXT);

    return null;
  }

  const tokenTextSim = `${YOU_ARE_IN_THE_SIMULATION_TEXT}\n${tokenText}`;

  const keyboardList = SIMULATION_BUY_AND_SELL_KEYBOARD;
  if (!isUpdate) {
    const tt = await bot.sendMessage(chatId, tokenTextSim, {
      reply_markup: {
        inline_keyboard: keyboardList,
      },
      disable_web_page_preview: true,
      parse_mode: "Markdown",
    });
  } else {
    if (messageId) {
      try {
        await bot.editMessageText(tokenTextSim, {
          chat_id: chatId,
          message_id: messageId,
          reply_markup: {
            inline_keyboard: keyboardList,
          },
          parse_mode: "Markdown",
          disable_web_page_preview: true,
        });
      } catch (error) {}
    } else {
      console.log(
        "No message id found: MessageId is Required to update this message"
      );
    }
  }
};
