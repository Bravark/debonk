//import getUserFromWalletAddress from ..prisma

import { REFERRAL_PERCENTS } from "../constants";
import {
  getUserById,
  getUserFromWalletAddress,
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
