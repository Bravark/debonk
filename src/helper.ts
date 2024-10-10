import axios from "axios";

import TelegramBot from "node-telegram-bot-api";
import {
  MasterSolSmartWalletClass,
  UserSolSmartWalletClass,
} from "./solana-provider";
import {
  checkIfMessageIsSimulation,
  deriveUserIndex,
  formatter,
  getContractAddressFromTextOrLink,
} from "./utils";

import {
  BuyTokenParams,
  DexToolResponse,
  Holder,
  PercentRange,
  ResponseObject,
  SellTokenInSolParams,
  SellTokenParams,
  TokenData,
  TokenDetails,
} from "./types";
import {
  APPLICATION_ERROR,
  BACK_BUTTON,
  BOT_USERNAME,
  BUY_AND_SELL_KEYBOARD,
  COLLECT_BUY_AMOUNT_INLINE_KEYBOARD,
  COLLECT_SELL_AMOUNT_INLINE_KEYBOARD,
  COLLECT_SELL_AMOUNT_INLINE_KEYBOARD_SIMULATION,
  COULD_NOT_GET_TOKEN_DETAILS_TEXT,
  INITIAL_INLINE_KEYBOARD,
  KEYBOARD_QUERY,
  LEAST_AMOUNT_REMAINDER,
  Validator,
  YOU_ARE_IN_THE_SIMULATION_TEXT,
} from "./constants";
import numeral from "numeral";
import {
  calculateProfitLoss,
  getBuyTransaction,
  getPositionFromId,
  getUserById,
  getUserFromTelegramId,
  getUserFromWalletAddress,
  incrementReferralCountDirect,
  incrementReferralCountIndirect,
  prisma,
  updatePositionOnBuy,
  updatePositionOnSell,
} from "./prisma";
import { Position, Wallet } from "@prisma/client";

import customAddressValidator from "./address-validator/wallet_address_validator";

import { bot } from "./bot";
import { SwapParams } from "./bridge/types";
import { Keypair, LAMPORTS_PER_SOL } from "@solana/web3.js";
import {
  getTokenDetails_DEXSCREENER,
  getTokenDetails_DEXTOOLS,
} from "./dataService";
import { bs58 } from "@project-serum/anchor/dist/cjs/utils/bytes";
import { SLippageExceedingError } from "./errors/solanaError";
import { generatePNLCard } from "./pnlCard";
import { text } from "stream/consumers";

// add dotenv
require("dotenv").config();

const { BOT_TOKEN } = process.env;
if (!BOT_TOKEN) {
  throw new Error("BOT_TOKEN not found in environment variables");
}

const bottoken = BOT_TOKEN;

export const reFreshPooling = async () => {
  const id = (await getUpdates(bottoken))! + 1;
  console.log("id: ", id);
  await bot.stopPolling();
  await bot.startPolling({
    polling: {
      interval: 300, // Check for updates every 300ms
      autoStart: true, // Automatically start polling
      params: {
        offset: await getUpdates(bottoken), // Start with no offset
      },
    },
  });
};
export async function getUpdates(token: string) {
  const response = await axios.get(
    `https://api.telegram.org/bot${token}/getUpdates`
  );

  const { result } = response.data;
  if (result.length < 1) {
    return;
  }

  const id = result[result.length - 1].update_id;

  return Number(id);
}
export const getAddressFromTelegramId = (telegramId: string) => {
  console.log("telegramId: ", telegramId);
  const walletClass = new MasterSolSmartWalletClass();
  const index = deriveUserIndex(telegramId.toString());
  const address = walletClass.solAddressFromSeed(index);
  return address;
};

// export const getEventByTransactionID = async (transactionID: string) => {
//   const walletClass = new MasterSolSmartWalletClass();
//   const transaction = await walletClass.getTransactionInfo(transactionID);
//   return transaction;
// };

export const getPrivateKeyFromTelegramId = (telegramId: string): Keypair => {
  const walletClass = new MasterSolSmartWalletClass();
  const index = deriveUserIndex(telegramId.toString());
  const Keypair: Keypair = walletClass.solDeriveChildKeypair(index);
  return Keypair;
};

export const start = async (
  msg: TelegramBot.Message,
  referralCode?: number
) => {
  try {
    const chatId = msg.chat.id;
    const telegramId = msg.from?.id;

    const user = await prisma.user.upsert({
      where: { telegramId: telegramId.toString() },
      update: { referredBy: referralCode ? referralCode : 0 },
      create: { telegramId: telegramId.toString() },
    });

    const address = getAddressFromTelegramId(telegramId.toString());

    await prisma.wallet.upsert({
      where: { address: address },
      update: {},
      create: { userId: user.id, address: address, isPrimary: true },
    });
    const balance = await getUserSolBalance(telegramId.toString());
    const addressLink = `[View Wallet in Explorer](https://solscan.io/account/${address})`;
    const { solUsdPrice } = await UserSolSmartWalletClass.getSolPrice();
    bot.sendMessage(
      chatId,
      `Welcome to DEBONK! \n\n Here is your Wallet Address \n\n\`${address}\`\nMain Balance : ${balance}(${formatCurrency(
        balance * solUsdPrice
      )})\n${addressLink}\n\n Simulation Balance : ${user.simulationBalance.toFixed(
        2
      )}SOL ($${(Number(user.simulationBalance) * solUsdPrice).toFixed(2)})`,
      {
        reply_markup: { inline_keyboard: INITIAL_INLINE_KEYBOARD },
        parse_mode: "Markdown", // or "HTML" if you're using HTML formatting
        disable_web_page_preview: true,
      }
    );
    if (referralCode) {
      await prisma.user.update({
        where: { id: user.id },
        data: { referredBy: referralCode },
      });
      //LEVEL 1
      await incrementReferralCountDirect(referralCode);
      //LEVEL 2
      const directedReferral = await getUserById(referralCode);
      if (!directedReferral) {
        return;
      }
      await incrementReferralCountIndirect(directedReferral.referredBy);
      //LEVEL 3
      const level2Referral = await getUserById(directedReferral.referredBy);
      if (!level2Referral) {
        return;
      }
      await incrementReferralCountIndirect(level2Referral.referredBy);
    }
  } catch (error) {
    console.log("error: ", error);
    await reFreshPooling();
  }
};

export const getPrivateKeyStingFromTelegramId = (
  telegramId: string
): string => {
  const walletClass = new MasterSolSmartWalletClass();
  const index = deriveUserIndex(telegramId.toString());
  const Keypair: Keypair = walletClass.solDeriveChildKeypair(index);

  const base58PrivateKey = bs58.encode(Keypair.secretKey);

  return base58PrivateKey;
};

export const getUserTokenBalance = async (
  token: string,
  telegramId: string
) => {
  const key = getPrivateKeyFromTelegramId(telegramId);
  const userWalletClass = new UserSolSmartWalletClass(key);
  const balance = await userWalletClass.getTokenBalance(token);
  console.log("balance: ", balance);
  return balance;
};
const colletTextFromUser = <T>(
  chatId: string,
  initialText: string,
  successText: string,
  validationErrorMessage: string,
  validator: Validator<T>,
  _bot: TelegramBot = bot
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
        try {
          _bot.deleteMessage(chatId, resMsg);
          _bot.deleteMessage(chatId, msg1.message_id);
        } catch (error) {
          console.log("error: ", error);
        }
        _bot.removeListener("message", collectDetailsCallback);
        _bot.addListener(`text`, replyToAnyhowSentMessage);
        return;
      }
      if (text) {
        field = text;
        // Resolve the promise with the user input
        let msg2: TelegramBot.Message;
        if (successText) {
          msg2 = await _bot.sendMessage(
            chatId.toString(),
            `${successText}:  ${field}`
          );
        }
        _bot.removeListener("message", collectDetailsCallback);
        _bot.addListener(`text`, replyToAnyhowSentMessage);

        resolve(field);
        // wait 2 seconds

        await new Promise((r) => setTimeout(r, 1000));
        try {
          _bot.deleteMessage(chatId.toString(), resMsg);
          _bot.deleteMessage(chatId.toString(), msg1.message_id);
          _bot.deleteMessage(chatId.toString(), msg2.message_id);
        } catch (error) {}
      } else {
        _bot.sendMessage(chatId.toString(), "Invalid input. Please try again.");
      }
    };
    // Listen for the user's message
    _bot.on("message", collectDetailsCallback);
  });
};

const getTokenDetails = async (token: string): Promise<TokenDetails> => {
  const isAddress = MasterSolSmartWalletClass.validateSolAddress(token);
  if (!isAddress) {
    if (!token || !(token.length === 44)) {
      throw new Error("invalid_address");
    }
  }

  let data: TokenDetails;
  try {
    data = await getTokenDetails_DEXSCREENER(token);
    console.log("data: ", data);
    if (!data) {
      data = await getTokenDetails_DEXTOOLS(token);
      // console.log("data: ", data);
      data.source = "PUMPFUN";
      if (!data) {
        return null;
      }
    }
  } catch (error) {
    if (!data) {
      data = await getTokenDetails_DEXTOOLS(token);
      // console.log("data: ", data);
      data.source = "PUMPFUN";
      if (!data) {
        return null;
      }
    }
  }

  return data;
};

const getSolPriceOfToken = async (token: string) => {
  const data = await UserSolSmartWalletClass.getTokenPrice(token);
  return data.tokenSolPrice;
};
const toast = async (
  chatId: string,
  message: string,
  durationInSec: number = 2,
  _bot: TelegramBot = bot
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
const toast2 = async (
  chatId: string,
  message: string,
  durationInSec: number = 5,
  _bot: TelegramBot = bot
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

const getTokenText = async (
  _token: string,
  telegramId: string,
  isSim = false
): Promise<string> => {
  try {
    const token = await getTokenDetails(_token);

    let text = ``;

    const nameWithLink = `[${token.name}](https://dexscreener.com/solana/${token.address})`;
    console.log("token.name: ", token.name);
    7;
    // Format priceInSol
    const formattedPrice = formatPriceInSol(Number(token.priceUsd));

    //format currency
    const mc = formatCurrency(token.mc);
    console.log("mc: ", mc);
    const liq = formatCurrency(token.liquidityInUsd);
    console.log("liq: ", liq);

    //social text
    const socials = generateSocialsText(
      token.websiteUrl,
      token.twitterUrl,
      token.telegramUrl
    );
    console.log("xxxxxxxxxxx:", KEYBOARD_QUERY.BUY_AMOUNT[100]);
    const user = await getUserFromTelegramId(telegramId);

    const userBalance = isSim
      ? Number(user.simulationBalance)
      : await getUserSolBalance(telegramId);
    const userAddress = getAddressFromTelegramId(telegramId);
    const userKey = getPrivateKeyFromTelegramId(telegramId);
    const userClass = new UserSolSmartWalletClass(userKey);
    //
    const { solUsdPrice } = await UserSolSmartWalletClass.getSolPrice();

    const position = user.positions.find(
      (position) =>
        position.isSimulation == true && position.tokenAddress === _token
    );
    const wallet = user.wallet.filter((wallet: Wallet) => wallet.isPrimary)[0];

    const simulationTokenBalance = Number(position?.amountHeld);
    console.log("simulationTokenBalance: ", simulationTokenBalance);
    //FOR POSITIONS

    const userTokenBalance = isSim
      ? simulationTokenBalance
        ? simulationTokenBalance
        : 0
      : await userClass.getTokenBalance(_token);

    text += `\n${nameWithLink} \| ${token.symbol} | CA: \`${token.address}\`\n\n`;
    text += `💎\n`;
    text += ` |-Vol: 5m:$${formatCurrencyWithoutDollarSign(
      token.volume.m5
    )}📍1hr: $${formatCurrencyWithoutDollarSign(
      token.volume.h1
    )}📍24hr: $${formatCurrencyWithoutDollarSign(token.volume.h24)}\n`;
    text += ` |-Chg:5m:${token.change.m5.toFixed(
      2
    )}%📍1h:${token.change.h1.toFixed()}%📍24h:${token.change.h24.toFixed()}%\n`;
    text += ` |-Price: $${formattedPrice}📍MC: ${mc}📍LIQ: ${liq}\n`;
    text += socials ? ` |-${socials}\n` : "";
    text += ` |-Your ${nameWithLink} Balance: ${formatCurrencyWithoutDollarSign(
      userTokenBalance
    )} (${(userTokenBalance * Number(token.priceUsd)).toFixed(2)}USD)`;
    text += `\n--------------------------------\n`;
    text += `Your Sol Balance: ${userBalance}(${formatCurrency(
      userBalance * solUsdPrice
    )})\n ${userAddress}`;
    if (position) {
      const PNL_usd = await calculateProfitLoss(
        user.id,
        wallet.id,
        position.tokenAddress,
        token.priceUsd.toString()
      );
      const PNL_sol = PNL_usd / solUsdPrice;
      const PNL_Sol_percent = (
        (PNL_sol /
          (parseInt(position.amountHeld) * parseFloat(position.avgBuyPrice))) *
        solUsdPrice *
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
      }).format(Number(token.priceUsd.toString()));

      const ch = `${formatCurrencyWithoutDollarSign(
        balance * Number(token.priceNative)
      )} SOL (${formatCurrency(balance * token.priceUsd)})`;

      const PNL_usd_percent = (
        (PNL_usd /
          (parseInt(position.amountHeld) * parseFloat(position.avgBuyPrice))) *
        100
      ).toFixed(2);
      text += `\n\nPosition\n`;
      text += `  |-Capital: ${(
        (parseFloat(position.avgBuyPrice) * parseFloat(position.amountHeld)) /
        solUsdPrice
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
      const pnlCardLink = `[Get PNL Card](https://t.me/${BOT_USERNAME}?start=pnlcard_${position.id})`;
      text += `\n${pnlCardLink}`;
    }

    return text;
  } catch (error) {
    console.log("error: ", error);
    if ((error.message = `invalid_address`)) {
      console.log("address passed");
      throw error;
    }
    console.log("error: ", error);
    throw error;
  }
};

const getUserSolBalance = async (telegramId: string): Promise<number> => {
  const userAddress = getAddressFromTelegramId(telegramId);
  const userBalance = await UserSolSmartWalletClass.getSolBalance(userAddress);
  return userBalance / LAMPORTS_PER_SOL;
};

export const getPNLCard = async (positionId: string, chatId: string) => {
  try {
    const PnlData = await getPositionFromId(Number(positionId));

    if (!PnlData) {
      throw new Error("Invalid position id");
    }
    const imageBuffer = await generatePNLCard(PnlData);
    await bot.sendPhoto(chatId, imageBuffer);
  } catch (error) {
    console.log("error: ", error);
    bot.sendMessage(chatId, "could not get pnl data");
  }
};

const getTokenHolders = async (token: string): Promise<Holder[]> => {
  const isAddress = UserSolSmartWalletClass.validateSolAddress(token);
  if (!isAddress) {
    throw new Error("Invalid address");
  }
  const res = await fetch(
    `https://api-v2.sunpump.meme/pump-api/token/holders?page=1&size=100&address=${token}`,
    {
      headers: {
        accept: "application/json, text/plain, */*",
        "accept-language": "en-GB,en-NG;q=0.9,en-US;q=0.8,en;q=0.7",
        priority: "u=1, i",
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-site",
        Referer: "https://sunpump.meme/",
        "Referrer-Policy": "strict-origin-when-cross-origin",
      },
      body: null,
      method: "GET",
    }
  );
  const data = await res.json();
  if (data.msg === "SUCCESS") {
    return data.data.holders;
  }
  return null;
};

const getTokenCreatorHoldings = async (
  creatorAddress: string,
  token: string
) => {
  const allHolders = await getTokenHolders(token);
  console.log("allHolders: ", allHolders);
  if (!allHolders) {
    return null;
  }
  const creatorHoldings = allHolders.filter(
    (holder) => holder.address.toLowerCase() === creatorAddress.toLowerCase()
  );
  if (!creatorHoldings.length) {
    return 0;
  }
  console.log("creatorHoldings: ", creatorHoldings);
  return creatorHoldings[0];
};

const getTokenAddressFromMessage = (messageText: string) => {
  const tokenAddressMatch = messageText.match(/CA: ([A-Za-z0-9]+)/);

  if (tokenAddressMatch && tokenAddressMatch[1]) {
    return tokenAddressMatch[1];
  } else {
    return null;
  }
};

const validateAmountGetTokenAndBuy = async (
  amount: number,
  chatId: string,
  telegramId: string,
  messageText: string,
  messageId: number,
  message: TelegramBot.Message
) => {
  //validate user balance

  const userBalance = await getUserSolBalance(telegramId);
  console.log("userBalance: ", userBalance);
  if (userBalance < amount) {
    toast(chatId, "Insufficient SOL balance. Please top up your wallet.");
    return;
  }
  console.log("amount: ", amount);
  console.log("LEAST_AMOUNT_REMAINDER: ", LEAST_AMOUNT_REMAINDER);
  const leastToHave = Number(amount) + Number(LEAST_AMOUNT_REMAINDER);
  if (userBalance < leastToHave) {
    toast(
      chatId,
      `Insufficient SOL balance for gas. Please top up your wallet.\n You must have at least: ${leastToHave}Sol`
    );
    return;
  }

  const tokenAddressMatch = messageText.match(/CA: ([A-Za-z0-9]+)/);
  await bot.editMessageText(`${messageText}\n\n🟠Sending Transaction...`, {
    parse_mode: "Markdown",
    disable_web_page_preview: true,
    chat_id: chatId,
    message_id: messageId,
    reply_markup: message.reply_markup,
  });

  if (tokenAddressMatch && tokenAddressMatch[1]) {
    const tokenAddress = tokenAddressMatch[1];

    const res = await doUserBuyToken(tokenAddress, amount, telegramId, chatId);
    if (!res.status) {
      bot.sendMessage(chatId, "🚫 Buy Transaction Failed");
      await sendTokenDetailsByCA(chatId, tokenAddress, telegramId);
      return;
    }
    const solId = res.result as string;
    // const solId =
    //   "03145394e11100ad1010cdfff073a0cec81c51699b9ff9390a90ecbf38df5606";

    const solLink = `[View Transaction](${solId})`;

    const tokenLink = ``;
    try {
      bot.editMessageText(`${messageText}\n\n✅ Buy  Successful ${solLink}`, {
        parse_mode: "Markdown",
        disable_web_page_preview: true,
        chat_id: chatId,
        message_id: messageId,
        reply_markup: message.reply_markup,
      });
    } catch (error) {}
    await completeBuyAction(telegramId, tokenAddress, amount, solId);
  } else {
    console.error("Token Address not found in the message");
  }
};
const validateAmountGetTokenAndSell = async (
  chatId: string,
  telegramId: string,
  messageText: string,
  messageId: number,
  message: TelegramBot.Message,
  type: "PERCENT" | "AMOUNT",
  amount?: number,
  percentToSell?: PercentRange
) => {
  const tokenAddress: string = getTokenAddressFromMessage(messageText);
  let solId = "";
  let res: any;
  let sellMessage: TelegramBot.Message;
  if (type === "PERCENT") {
    //validate that the field percentToSell is present
    if (!percentToSell) {
      toast(chatId, "Please provide a percentage to sell.");
      return;
    }
    await bot.editMessageText(`${messageText}\n\nSending Sell Transaction...`, {
      parse_mode: "Markdown",
      disable_web_page_preview: true,
      chat_id: chatId,
      message_id: messageId,
      reply_markup: message.reply_markup,
    });
    const { result, amountToSell } = await doUserSellTokenPercent(
      tokenAddress,
      percentToSell,
      chatId,
      telegramId
    );
    res = result;
    console.log("amountInToken: ", amountToSell);
    amount = amountToSell;
  } else if (type === "AMOUNT") {
    //validate that the field amount is present
    if (!amount) {
      toast(chatId, "Please provide an amount to sell.");
      return;
    }
    await bot.editMessageText(`${messageText}\n\nSending Sell Transaction...`, {
      parse_mode: "Markdown",
      disable_web_page_preview: true,
      chat_id: chatId,
      message_id: messageId,
      reply_markup: message.reply_markup,
    });
    const { result } = await doUserSellTokenSol(
      tokenAddress,
      amount.toString(),
      telegramId,
      chatId
    );
    res = result;
  } else {
    console.error("Invalid type provided");
    return;
  }

  console.log("res: ", res);
  if (res.status == false) {
    try {
      await bot.sendMessage(
        chatId,
        `Sell Transaction Failed : ${res.message}\n Try Again`,
        {
          parse_mode: "Markdown",
          disable_web_page_preview: true,
        }
      );
      await sendTokenDetailsByCA(chatId, tokenAddress, telegramId);
      return;
    } catch (error) {}
  }

  console.log("res: ", res);
  solId = res;

  const solLink = `[View](${solId})`;
  try {
    bot.editMessageText(`Sell Successful hash: ${solLink}`, {
      parse_mode: "Markdown",
      disable_web_page_preview: true,
      chat_id: chatId,
      message_id: messageId,
      reply_markup: message.reply_markup,
    });
  } catch (error) {}
  const user = await getUserFromTelegramId(telegramId);
  const tokenDetails = await getTokenDetails(tokenAddress);
  const wallet = user.wallet.filter((wallet: Wallet) => wallet.isPrimary)[0];
  //if wallet does not exist, create it
  if (!user.wallet) {
    const address = getAddressFromTelegramId(telegramId.toString());
    console.log("address: ", address);

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

const completeBuyAction = async (
  telegramId: string,
  tokenAddress: string,
  amount: number,
  solId: string
) => {
  const user = await getUserFromTelegramId(telegramId);
  const tokenDetails = await getTokenDetails(tokenAddress);

  const { tokenUsdPrice, tokenSolPrice } =
    await UserSolSmartWalletClass.getTokenPrice(tokenAddress);
  const amountInToken = Number(amount) / tokenSolPrice;
  console.log("amountInToken: ", amountInToken);
  const wallet = user.wallet.filter((wallet: Wallet) => wallet.isPrimary)[0];

  if (!user.wallet) {
    const address = getAddressFromTelegramId(telegramId.toString());
    console.log("address: ", address);

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
      buyHash: solId,
      tokenTicker: tokenDetails.name,
      walletId: wallet.id,
      userId: user.id,
      buyPrice: tokenDetails.priceUsd.toString(),
    },
  });
  const res = await updatePositionOnBuy(
    user.id,
    wallet.id,
    tokenAddress,
    tokenDetails.name,
    amountInToken.toString(),
    tokenDetails.priceUsd.toString()
  );
  console.log("res: ", res);

  console.log("tokenAddress: ", tokenAddress);
};

const getSolPrice = async (): Promise<number> => {
  const res = await UserSolSmartWalletClass.getSolPrice();
  return res.solUsdPrice;
};

const sendUserWalletDetails = async (
  telegramId: string,
  chatId: string,
  messageid?: number,
  isRefresh = false
) => {
  const user = await getUserFromTelegramId(telegramId);

  const address = getAddressFromTelegramId(telegramId.toString());
  console.log("address: ", address);

  await prisma.wallet.upsert({
    where: { address: address },
    update: {},
    create: { userId: user.id, address: address, isPrimary: true },
  });

  const balance = await getUserSolBalance(telegramId.toString());
  const addressLink = `[View Wallet in Explorer](https://solscan.io/account/${address})`;
  const { solUsdPrice } = await UserSolSmartWalletClass.getSolPrice();

  const text = `Here is your Wallet Address \n\n\`${address}\`\nMain Balance : ${balance}(${formatCurrency(
    balance * solUsdPrice
  )})\n ${addressLink}\n\n Simulation Balance : ${user.simulationBalance.toFixed(
    2
  )}SOL ($${(Number(user.simulationBalance) * solUsdPrice).toFixed(2)})`;

  const inlineKeys = [
    [
      {
        text: "🤑 Withdraw Sol",
        callback_data: KEYBOARD_QUERY.WITHDRAW_TRX,
      },
      {
        text: "Export Key 🔑",
        callback_data: KEYBOARD_QUERY.EXPORT_PRIVATE_KEY,
      },
    ],
    [
      {
        text: "🚧 Bridge Chain",
        callback_data: KEYBOARD_QUERY.INIT_BRIDGE,
      },
    ],
    [
      {
        text: "🔄 Refresh",
        callback_data: KEYBOARD_QUERY.UPDATE_SHOW_WALLET,
      },
      ...BACK_BUTTON,
    ],
  ];

  if (isRefresh && messageid) {
    try {
      bot.editMessageText(text, {
        chat_id: chatId,
        message_id: messageid,
        reply_markup: {
          inline_keyboard: inlineKeys,
        },
        parse_mode: "Markdown", // or "HTML" if you're using HTML formatting
        disable_web_page_preview: true,
      });
    } catch (error) {}
  } else {
    bot.sendMessage(chatId, text, {
      reply_markup: {
        inline_keyboard: inlineKeys,
      },
      parse_mode: "Markdown", // or "HTML" if you're using HTML formatting
      disable_web_page_preview: true,
    });
  }
};

const doUserBuyToken = async (
  tokenAddress: string,
  amount: number,
  telegramId: string,
  chatId: string
) => {
  const userKey = getPrivateKeyFromTelegramId(telegramId);
  const userClass = new UserSolSmartWalletClass(userKey);
  const params: BuyTokenParams = {
    amountInSol: amount,
    token: tokenAddress,
  };
  try {
    return await userClass.buy(params);
  } catch (error) {
    if (error instanceof SLippageExceedingError) {
      bot.sendMessage(chatId, `Slippage Error`);
    }
    if (error.message === APPLICATION_ERROR.JUPITER_SWAP_ERROR) {
      bot.sendMessage(chatId, "The Token is Not Tradable");
    }
    console.log("error: ", error);
  }
};

const doUserSellTokenPercent = async (
  tokenAddress: string,
  percentToSell: PercentRange,
  telegramId: string,
  chatId: string,
  slippage?: number
) => {
  const userKey = getPrivateKeyFromTelegramId(telegramId);
  const userClass = new UserSolSmartWalletClass(userKey);
  const params: SellTokenParams = {
    token: tokenAddress,
    percentToSell,
    slippage,
  };
  console.log("params: ", params);
  // return;
  try {
    return await userClass.sell(params);
  } catch (error) {
    console.log("error: ", error);
    if (error instanceof SLippageExceedingError) {
      bot.sendMessage(chatId, `Slippage Error`);
    }
  }
};

const doUserSellTokenSol = async (
  tokenAddress: string,
  amountToSellInSol: string,
  telegramId: string,
  chatId: string,
  slippage?: number
) => {
  const userKey = getPrivateKeyFromTelegramId(telegramId);
  const userClass = new UserSolSmartWalletClass(userKey);
  const params: SellTokenInSolParams = {
    token: tokenAddress,
    amountToSellInSol,
    slippage,
  };
  console.log("params: ", params);

  try {
    return await userClass.sell(params);
  } catch (error) {
    console.log("error: ", error);
    if (error instanceof SLippageExceedingError) {
      bot.sendMessage(chatId, `Slippage Error`);
    }
  }
};

export const updateSendSellTokenMessage = async (
  chatId: string,
  message: TelegramBot.Message
) => {
  const telegramId = message.chat.id;
  let tokenText: string;

  const token = getTokenAddressFromMessage(message.text);
  console.log("token: ", token);
  const isSim = checkIfMessageIsSimulation(message.text);
  console.log("isSim: ", isSim);
  try {
    tokenText = await getTokenText(token, telegramId.toString(), isSim);
  } catch (error) {
    bot.sendMessage(
      chatId,
      `${COULD_NOT_GET_TOKEN_DETAILS_TEXT}: Possibly Invalid Address`
    );
  }

  if (isSim) {
    tokenText = `${YOU_ARE_IN_THE_SIMULATION_TEXT}\n${tokenText}`;
  }
  const refreshButton = [
    {
      text: "Refresh",
      callback_data: KEYBOARD_QUERY.UPDATE_SEND_TOKEN_SELL_DETAILS,
    },
    ...BACK_BUTTON,
  ];
  const keyboard = isSim
    ? [...COLLECT_SELL_AMOUNT_INLINE_KEYBOARD_SIMULATION, refreshButton]
    : [...COLLECT_SELL_AMOUNT_INLINE_KEYBOARD, refreshButton];

  await bot.editMessageText(tokenText, {
    chat_id: chatId,
    message_id: message.message_id,
    reply_markup: {
      inline_keyboard: keyboard,
    },
    parse_mode: "Markdown",
    disable_web_page_preview: true,
  });
};

export const sendSellTokenMessage = async (
  token: string,
  message: TelegramBot.Message,
  chatId: string,
  isSIm = false,
  isRefresh = false
) => {
  const telegramId = message.chat.id;
  let tokenText: string;
  try {
    tokenText = await getTokenText(token, telegramId.toString(), isSIm);
  } catch (error) {
    bot.sendMessage(
      chatId,
      `${COULD_NOT_GET_TOKEN_DETAILS_TEXT}: Possibly Invalid Address`
    );
  }

  if (isSIm) {
    tokenText = `${YOU_ARE_IN_THE_SIMULATION_TEXT}\n${tokenText}`;
  }
  const refreshButton = [
    {
      text: "Refresh",
      callback_data: KEYBOARD_QUERY.UPDATE_SEND_TOKEN_SELL_DETAILS,
    },
  ];
  const keyboard = isSIm
    ? [...COLLECT_SELL_AMOUNT_INLINE_KEYBOARD_SIMULATION, refreshButton]
    : [...COLLECT_SELL_AMOUNT_INLINE_KEYBOARD, refreshButton];

  if (!isRefresh) {
    await bot.sendMessage(chatId, tokenText, {
      reply_markup: {
        inline_keyboard: keyboard,
      },
      parse_mode: "Markdown",
      disable_web_page_preview: true,
    });
  } else {
    await bot.editMessageText(tokenText, {
      chat_id: chatId,
      message_id: message.message_id,
      reply_markup: {
        inline_keyboard: keyboard,
      },
      parse_mode: "Markdown",
      disable_web_page_preview: true,
    });
  }
};

const sendTokenDetailsByCA = async (
  chatId: string,
  tokenAddress: string,
  telegramId: string,
  messageId?: number,
  isUpdate = false
) => {
  let tokenText: string;
  try {
    tokenText = await getTokenText(tokenAddress, telegramId.toString(), false);
  } catch (error) {
    bot.sendMessage(chatId.toString(), COULD_NOT_GET_TOKEN_DETAILS_TEXT);

    return null;
  }

  const keyboardList = BUY_AND_SELL_KEYBOARD;
  if (!isUpdate) {
    const tt = await bot.sendMessage(chatId, tokenText, {
      reply_markup: {
        inline_keyboard: keyboardList,
      },
      disable_web_page_preview: true,
      parse_mode: "Markdown",
    });
  } else {
    if (messageId) {
      try {
        await bot.editMessageText(tokenText, {
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

const replyToAnyhowSentMessage = async (msg: TelegramBot.Message) => {
  try {
    const chatId = msg.chat.id.toString();
    const telegramId = msg.from?.id.toString();
    const text = msg.text;
    console.log("text: ", text);
    if (text.startsWith("/")) {
      return;
    }

    const ca = getContractAddressFromTextOrLink(text);
    console.log("ca: ", ca);
    await sendTokenDetailsByCA(chatId, ca, telegramId);
  } catch (err) {}
};

/**
 * Creates a text-based progress bar for a given percentage.
 * @param percentage - The percentage to visualize as a progress bar.
 * @param barLength - The length of the progress bar (default is 10).
 * @returns A string representing the progress bar.
 */
function createProgressBar(percentage: number, barLength: number = 10): string {
  const filledLength = Math.round((percentage / 100) * barLength);
  const emptyLength = barLength - filledLength;

  const filledBar = "█".repeat(filledLength);
  const emptyBar = "░".repeat(emptyLength);

  return `${percentage}%: ${filledBar}${emptyBar}`;
}

/**
 * Formats the price in SOL to display leading zeros with italics and underline.
 * @param priceInSol - The price value to format.
 * @returns A string with the formatted price.
 */
function formatPriceInSol(priceInSol: number): string {
  const priceStr = priceInSol.toFixed(10);
  const [integerPart, decimalPart] = priceStr.split(".");

  const leadingZerosMatch = decimalPart.match(/^0+/);
  const leadingZeros = leadingZerosMatch ? leadingZerosMatch[0] : "";
  const significantDigits = decimalPart.slice(leadingZeros.length);

  return `${integerPart}.___(${
    leadingZeros.length
  })___ ${significantDigits.substring(0, 2)}`;
}

const formatCurrency = (number: number) => {
  try {
    const string = numeral(number).format("($0.00a)");
    return string;
  } catch (error) {
    console.log("error: ", error);
  }
};

const formatCurrencyWithoutDollarSign = (number: number) => {
  try {
    const string = numeral(number).format("(0.0a)");
    return string;
  } catch (error) {
    console.log("error: ", error);
  }
};

/**
 * Generates a text string for the socials with a color-coded emoji based on availability.
 * @param websiteUrl - The URL of the website.
 * @param twitterUrl - The URL of the Twitter profile.
 * @param telegramUrl - The URL of the Telegram group.
 * @returns A formatted string with the socials and a colored emoji indicating availability.
 */
function generateSocialsText(
  websiteUrl: string | null,
  twitterUrl: string | null,
  telegramUrl: string | null
): string {
  let socialsText = "";
  let count = 0;

  if (websiteUrl) {
    socialsText += `📍 [Web](${websiteUrl})`;
    count++;
  }
  if (twitterUrl) {
    socialsText += `${socialsText ? `` : ""}📍 [X](${twitterUrl})`;
    count++;
  }
  if (telegramUrl) {
    socialsText += `${socialsText ? `` : ""}📍 [Telegram](${telegramUrl})`;
    count++;
  }

  // Determine the color of the emoji based on the count of available socials
  let emoji = "🔴"; // Red for none
  if (count === 1) {
    emoji = "🟠"; // Orange for one
  } else if (count === 2) {
    emoji = "🟡"; // Yellow for two
  } else if (count === 3) {
    emoji = "🟢"; // Green for all three
  }

  return socialsText
    ? `${emoji} Socials: ${socialsText}`
    : `${emoji} Socials: N/A`;
}
//new pairs (to list the new pairs on sunpump)

// new pair based on a some filtered critaria

//

//for bridge

const customAddressValidation = (network: string, address: string): boolean => {
  return customAddressValidator.validate(address, network.toUpperCase());
  // return WAValidator.validate(address, network.toUpperCase());
};

export {
  bot,
  toast,
  getUserSolBalance,
  customAddressValidation,
  validateAmountGetTokenAndBuy,
  colletTextFromUser,
  getTokenDetails,
  getTokenText,
  getSolPrice,
  formatPriceInSol,
  getTokenAddressFromMessage,
  validateAmountGetTokenAndSell,
  formatCurrencyWithoutDollarSign,
  formatCurrency,
  sendUserWalletDetails,
  sendTokenDetailsByCA,
  replyToAnyhowSentMessage,
};
