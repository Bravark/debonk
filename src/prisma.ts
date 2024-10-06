import { Prisma, PrismaClient, Swap } from "@prisma/client";
import { SwapData } from "./bridge/types";
import { PNLData } from "./pnlCard";
import { getSolPrice, getTokenDetails } from "./helper";
import { BOT_USERNAME } from "./constants";

const prisma = new PrismaClient();

export { prisma };

export const getUserFromTelegramId = async (telegramId: string) => {
  try {
    const user = await prisma.user.findUnique({
      where: { telegramId },
      include: {
        wallet: true,
        transactions: true,
        positions: true,
      },
    });
    if (!user.id) {
      const user = await prisma.user.upsert({
        where: { telegramId: telegramId.toString() },
        update: {},
        create: { telegramId: telegramId.toString() },
      });
    }

    return user;
  } catch (error) {
    console.log("error: ", error);
  }
};

export const decrementUserSimulationBalance = async (
  telegramId: any,
  amount: any
) => {
  try {
    await prisma.user.update({
      where: { telegramId: telegramId },
      data: {
        simulationBalance: { decrement: amount },
      },
    });
  } catch (error) {
    console.log("error: ", error);
  }
};

export const incrementUserSimulationBalance = async (
  telegramId: any,
  amount: any
) => {
  try {
    await prisma.user.update({
      where: { telegramId: telegramId },
      data: {
        simulationBalance: { increment: amount },
      },
    });
  } catch (error) {
    console.log("error: ", error);
  }
};

export const getAllUserBoughtTransactions = async (telegramId: string) => {
  const user = await getUserFromTelegramId(telegramId);
  if (!user) {
    throw new Error("User not found");
  }
  return user.transactions;
};

export const getAllUserBoughtPositions = async (telegramId: string) => {
  const user = await getUserFromTelegramId(telegramId);
  if (!user) {
    throw new Error("User not found");
  }
  return user.transactions;
};

export const updatePositionOnBuy = async (
  userId: number,
  walletId: string,
  tokenAddress: string,
  tokenTicker: string,
  amountBought: string,
  buyPrice: string
) => {
  return prisma.$transaction(async (tx) => {
    const position = await tx.position.findFirst({
      where: {
        userId,
        walletId,
        tokenAddress,
      },
    });

    if (position) {
      // Update existing position
      const newAmountHeld = (
        parseFloat(position.amountHeld) + parseFloat(amountBought)
      ).toString();
      const newAvgBuyPrice = (
        (parseFloat(position.amountHeld) * parseFloat(position.avgBuyPrice) +
          parseFloat(amountBought) * parseFloat(buyPrice)) /
        parseFloat(newAmountHeld)
      ).toString();

      return tx.position.update({
        where: { id: position.id },
        data: {
          amountHeld: newAmountHeld,
          avgBuyPrice: newAvgBuyPrice,
        },
      });
    } else {
      // Create new position
      return tx.position.create({
        data: {
          userId,
          walletId,
          tokenAddress,
          tokenTicker,
          amountHeld: amountBought,
          avgBuyPrice: buyPrice,
        },
      });
    }
  });
};

export const updatePositionOnBuySimulation = async (
  userId: number,
  walletId: string,
  tokenAddress: string,
  tokenTicker: string,
  amountBought: string,
  buyPrice: string,
  isSimulation: boolean
) => {
  return prisma.$transaction(async (tx) => {
    const position = await tx.position.findFirst({
      where: {
        userId,
        walletId,
        tokenAddress,
        isSimulation,
      },
    });

    if (position) {
      // Update existing position
      const newAmountHeld = (
        parseFloat(position.amountHeld) + parseFloat(amountBought)
      ).toString();
      const newAvgBuyPrice = (
        (parseFloat(position.amountHeld) * parseFloat(position.avgBuyPrice) +
          parseFloat(amountBought) * parseFloat(buyPrice)) /
        parseFloat(newAmountHeld)
      ).toString();

      return tx.position.update({
        where: { id: position.id },
        data: {
          amountHeld: newAmountHeld,
          avgBuyPrice: newAvgBuyPrice,
        },
      });
    } else {
      // Create new position
      return tx.position.create({
        data: {
          userId,
          walletId,
          tokenAddress,
          tokenTicker,
          amountHeld: amountBought,
          avgBuyPrice: buyPrice,
          isSimulation,
        },
      });
    }
  });
};

export const updatePositionOnSell = async (
  userId: number,
  walletId: string,
  tokenAddress: string,
  amountSold: string,
  sellPrice: string
) => {
  return prisma.$transaction(async (tx) => {
    const position = await tx.position.findFirst({
      where: {
        userId,
        walletId,
        tokenAddress,
      },
    });

    if (!position) {
      throw new Error("No position found to sell from");
    }

    const newAmountHeld = (
      parseFloat(position.amountHeld) - parseFloat(amountSold)
    ).toString();

    const profitLoss = (
      (parseFloat(sellPrice) - parseFloat(position.avgBuyPrice)) *
      parseFloat(amountSold)
    ).toString();

    if (parseFloat(newAmountHeld) <= 0) {
      // If the position is fully sold, delete it
      await tx.position.delete({
        where: { id: position.id },
      });
    } else {
      // Update the position with the reduced amount
      await tx.position.update({
        where: { id: position.id },
        data: {
          amountHeld: newAmountHeld,
        },
      });
    }

    // Optionally store the profit/loss in another model or return it
    return profitLoss;
  });
};

export const calculateProfitLoss = async (
  userId: number,
  walletId: string,
  tokenAddress: string,
  currentMarketPrice: string
) => {
  const position = await prisma.position.findFirst({
    where: {
      userId,
      walletId,
      tokenAddress,
    },
  });

  if (!position) {
    throw new Error("Position not found");
  }

  const profitLoss =
    (parseFloat(currentMarketPrice) - parseFloat(position.avgBuyPrice)) *
    parseFloat(position.amountHeld);

  return profitLoss;
};

export const getBuyTransaction = async (userId, walletId, tokenAddress) => {
  const transaction = await prisma.transaction.findFirst({
    where: { userId, walletId, tokenAddress },
  });

  if (!transaction) {
    throw new Error("Buy transaction not found");
  }
  return transaction;
};

//REFERRAL

export const createReferralCashOut = async (
  telegramId: string,
  payoutAddress: string
) => {
  let status = false;
  const res = await prisma.$transaction(async (tx) => {
    try {
      const user = await tx.user.findUnique({
        where: { telegramId },
        include: {
          referralCashOut: true,
        },
      });
      if (!user) {
        throw new Error("User not found");
      }

      //user cannot have more than one active cashout request

      //get active referral payouts

      const activeCashOut = user.referralCashOut.map((rc) => {
        console.log("rc.status: ", rc.status);
        if (rc.status === "created") {
          return rc;
        }
      });

      if (activeCashOut.length > 0) {
        return status;
      }

      await tx.referralCashOut.create({
        data: {
          userId: user.id,
          amount: user.referralProfit,
          payoutAddress,
        },
      });

      return true;
    } catch (error) {
      console.log("error: ", error);
    }
  });

  if (res) {
    status = true;
    return status;
  } else {
    console.log("error with transaction");
  }
};

export const updateUserCashOut = async (
  telegramId: string,
  amount?: number
) => {
  return await prisma.$transaction(async (tx) => {
    try {
      const user = await tx.user.findUnique({
        where: { telegramId },
        include: { referralCashOut: true },
      });

      if (!user) {
        throw new Error("User not found");
      }
      amount = amount ? amount : user.referralProfit;

      const activeCashOut = user.referralCashOut.map((rc) => {
        console.log("rc.status: ", rc.status);
        if (rc.status === "created") {
          return rc;
        }
      });

      if (activeCashOut[0]) {
        await tx.referralCashOut.update({
          where: { id: activeCashOut[0]?.id, status: "created" },
          data: { status: `paid`, amount },
        });
        await tx.user.update({
          where: { id: user.id },
          data: { referralProfit: { decrement: amount } },
        });
        return { statusText: "PAID" };
      } else {
        return { statUSText: "ALREADY_PAID" };
      }
    } catch (error) {
      console.log("error: ", error);
    }
  });
};

export const getAllUsers = async () => {
  try {
    return prisma.user.findMany();
  } catch (error) {
    console.log("error: ", error);
  }
};

export const incrementReferralCountDirect = async (
  userId: number,
  count = 1
) => {
  return prisma.user.update({
    where: { id: userId },
    data: {
      referralCountDirect: {
        increment: count,
      },
    },
  });
};

export const incrementReferralCountIndirect = async (
  userId: number,
  count = 1
) => {
  return prisma.user.update({
    where: { id: userId },
    data: {
      referralCountIndirect: {
        increment: count,
      },
    },
  });
};

export const updateUserReferralBalance = async (
  userId: number,
  amountToUpdate: number
) => {
  await prisma.user.update({
    where: { id: userId },
    data: {
      referralProfit: {
        increment: amountToUpdate,
      },
    },
  });
};

export const getUserById = async (userId: number) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  return user;
};

export const getUserFromWalletAddress = async (walletAddress: string) => {
  const wallet = await prisma.wallet.findFirst({
    where: { address: walletAddress },
    include: { user: true },
  });

  return wallet.user;
};

//BUY BOT

export const addTokenTrackingToDb = async (
  chatId: string,
  tokenAddress: string,
  minAmount: number
) => {
  try {
    const existingTracking = await prisma.tokenTracking.findFirst({
      where: { tokenAddress: `${tokenAddress}` },
    });
    if (existingTracking) {
      const details = existingTracking.details;
      if (
        details.some(
          (d: { chatId: string; minAmount: number }) => d.chatId === chatId
        )
      ) {
        console.log(
          "Chat ID already exists for this token: UPdating it with the new data"
        );
        details.map((d: { chatId: string; minAmount: number }) => {
          if (d.chatId === chatId) {
            d.minAmount = minAmount;
          }
        });
        return await prisma.tokenTracking.update({
          where: { tokenAddress: `${tokenAddress}` },
          data: { details },
        });
      }
      details.push({ minAmount, chatId });
      return await prisma.tokenTracking.update({
        where: { tokenAddress: `${tokenAddress}` },
        data: { details },
      });
    }
    await prisma.tokenTracking.create({
      data: {
        tokenAddress: `${tokenAddress}`,
        details: [{ minAmount, chatId }],
      },
    });
  } catch (error) {
    console.log("error: ", error);
  }
};

export const getTokenTrackingDataFromDb = async (tokenAddress: string) => {
  try {
    return await prisma.tokenTracking.findUnique({
      where: { tokenAddress: `${tokenAddress}` },
    });
  } catch (error) {
    console.log("error: ", error);
  }
};

export const getAllTokenTrackingFromDb = async () => {
  try {
    return await prisma.tokenTracking.findMany({
      where: {},
    });
  } catch (error) {
    console.log("error: ", error);
  }
};

export const getUserTokenTrackingData = async (chatId_token: string) => {
  try {
    return await prisma.userTokenTrackingData.findUnique({
      where: { chatId_tokenAddress: chatId_token },
    });
  } catch (error) {
    console.log("error: ", error);
  }
};

export const setUserTokenTrackingData = async (
  chatId_token: string,
  gif: string
) => {
  try {
    return await prisma.userTokenTrackingData.upsert({
      where: { chatId_tokenAddress: chatId_token },
      create: { chatId_tokenAddress: chatId_token, userTokenGif: gif },
      update: { userTokenGif: gif },
    });
  } catch (error) {
    console.log("error: ", error);
  }
};

//SIMULATION
export const getUserSImulationBalance = async (telegramId: string) => {
  const user = await getUserFromTelegramId(telegramId);

  return user.simulationBalance;
};

export const getReferralProfit = async (telegramId: string) => {
  try {
    const profit = await prisma.user.findUnique({
      where: { telegramId },
    });

    return profit?.referralProfit;
  } catch (error) {
    console.log("error: ", error);
  }
};

export const addSwapDataToDb = async (data: SwapData) => {
  // Implement the logic to store the swap data in your database

  try {
    await prisma.swap.create({
      data,
    });
  } catch (error) {
    console.log("error: ", error);
  }
};

export const getSwapDataDb = async (messageId: string, chatId: string) => {
  // Implement the logic to store the swap data in your database

  try {
    const res = await prisma.swap.findUnique({
      where: { swapMessageId: messageId, chatId },
    });
    if (!res) {
      return null;
    }
    return res as Swap;
  } catch (error) {
    console.log("error: ", error);
  }
};

export const getPositionFromId = async (id: number) => {
  const position = await prisma.position.findUnique({
    where: { id: id },
    include: { user: true },
  });
  if (!position) {
    throw new Error("Position not found");
  }
  const tokenDetails = await getTokenDetails(position.tokenAddress);
  const solPrice = await getSolPrice();
  const PNL_usd = await calculateProfitLoss(
    position.user.id,
    position.walletId,
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
  //current time
  // Assuming position.created_at is a Date object
  const currentTime = new Date(); // Current time
  const createdAt = new Date(position.created_at); // Assuming created_at is a Date or timestamp

  // Calculate the time difference in milliseconds
  const timeTakenMs = currentTime.getTime() - createdAt.getTime();

  // Convert the time difference to seconds, minutes, and hours
  const timeTakenSeconds = Math.floor(timeTakenMs / 1000);
  const timeTakenMinutes = Math.floor(timeTakenSeconds / 60);
  const timeTakenHours = Math.floor(timeTakenMinutes / 60);
  const timeTakenDays = Math.floor(timeTakenHours / 24);

  // Format the time difference
  const timeTakenFormatted = `${timeTakenDays}d ${timeTakenHours % 24}h ${
    timeTakenMinutes % 60
  }m`;
  const entryPriceInSol = Number(position.avgBuyPrice) / solPrice;

  const pnlData: PNLData = {
    ticker: position.tokenTicker,
    entryPrice: entryPriceInSol,
    entryPriceUsd: Number(position.avgBuyPrice),
    exitPrice: tokenDetails.priceNative,
    exitPriceUsd: tokenDetails.priceUsd,
    amountBought: Number(position.amountHeld),
    pnlPercentage: Number(PNL_Sol_percent),
    x: 1 + Number(PNL_Sol_percent) / 100,
    isProfit: Number(PNL_Sol_percent) < 0 ? false : true,
    totalTimeTaken: timeTakenFormatted,
    userRefCode: `https://t.me/${BOT_USERNAME}?start=ref_${position.user.id}`,
  };

  return pnlData;
};
