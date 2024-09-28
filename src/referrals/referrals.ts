//import getUserFromWalletAddress from ..prisma

import { REFERRAL_PERCENTS } from "../constants";
import {
  getAllUsers,
  getUserById,
  getUserFromWalletAddress,
  incrementReferralCountDirect,
  incrementReferralCountIndirect,
  updateUserReferralBalance,
} from "../prisma";

export const creditReferral = async (
  walletAddress: string,
  feesAmount: number
) => {
  const referralUser = await getUserFromWalletAddress(walletAddress);
  if (!referralUser) {
    console.log("No referral found for the user");
    return;
  }

  // Calculate referral profits
  const referralProfitL1 = feesAmount * (REFERRAL_PERCENTS.LEVEL_1 / 100);
  console.log("referralProfitL1: ", referralProfitL1);
  const referralProfitL2 = feesAmount * (REFERRAL_PERCENTS.LEVEL_2 / 100);
  console.log("referralProfitL2: ", referralProfitL2);
  const referralProfitL3 = feesAmount * (REFERRAL_PERCENTS.LEVEL_3 / 100);
  console.log("referralProfitL2: ", referralProfitL3);

  try {
    // Update user referral balances with BTC values
    if (referralProfitL1) {
      await updateUserReferralBalance(referralUser.id, referralProfitL1);
    }
    if (referralProfitL2 && referralUser.referredBy) {
      await updateUserReferralBalance(
        referralUser.referredBy,
        referralProfitL2
      );
    }

    const user2 = await getUserById(referralUser.referredBy);

    if (referralProfitL3 && user2 && user2.id) {
      user2.id, referralProfitL3;
    }
  } catch (error) {
    console.log("error: ", error);
  }

  // Now the user has a referral
};

const updateDirectReferralCount = async () => {
  const allUsers = await getAllUsers();
  //check for the users that has referredBy for each user and since that returns another userId use that to increment the referralCountDirect for the user, and also the referredBy of the user will also increment the referralCountIndirect of the user
  allUsers.forEach(async (user) => {
    console.log("user.referredBy: ", user.referredBy);
    if (user.referredBy) {
      const ruser = await getUserById(user.referredBy);
      if (ruser.referralCountDirect === 0) {
        await incrementReferralCountDirect(user.referredBy);
      }
    }
  });
};

const updateIndirectReferralCount = async () => {
  const allUsers = await getAllUsers();
  //check for the users that has referredBy for each user and since that returns another userId use that to increment the referralCountDirect for the user, and also the referredBy of the user will also increment the referralCountIndirect of the user
  allUsers.forEach(async (user) => {
    console.log("user.referredBy: ", user.referredBy);
    if (user.referredBy) {
      const ruser = await getUserById(user.referredBy);
      if (ruser.referralCountIndirect === 0) {
        await incrementReferralCountIndirect(
          user.referredBy,
          ruser.referralCountDirect
        );
      }
    }
  });
};

updateIndirectReferralCount();
updateDirectReferralCount();
