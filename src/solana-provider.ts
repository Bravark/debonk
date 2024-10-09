import * as bip39 from "bip39";
import BIP32Factory from "bip32";
import * as ecc from "tiny-secp256k1";
import fs from "fs";
import {
  Keypair,
  LAMPORTS_PER_SOL,
  Connection,
  PublicKey,
  TransactionInstruction,
  SystemProgram,
  TransactionMessage,
  VersionedTransaction,
  Transaction,
  PublicKeyInitData,
  sendAndConfirmTransaction,
  ComputeBudgetProgram,
  MessageV0,
  ParsedAccountData,
  TransactionError,
} from "@solana/web3.js";
import bs58 from "bs58";
import { Buffer } from "buffer";
import * as ed25519 from "ed25519-hd-key";
import { Wallet } from "@project-serum/anchor";
import {
  APPLICATION_ERROR,
  CHAINSTACK_RPC,
  DEV_SOL_WALLET,
  FEE_TOKEN_ACCOUNT_FOR_WSOL,
  HELIUS_RPC_HTTPS,
  mainnetEndpoint,
  QUICKNODE_SOL_MAINNET,
  QUICKNODE_SOL_MAINNET_WS,
  RPC_HTTPS_URLS,
  SOL_CONTRACT,
  SOLANA_ERROR_CODES,
} from "./constants";
import {
  getAssociatedTokenAddress,
  getAccount,
  Account,
} from "@solana/spl-token";
import {
  BuyTokenParams,
  SellTokenParams,
  SellTokenInSolParams,
  isSellTokenParams,
  isSellTokenInSolParams,
} from "./types";
import * as jup from "@jup-ag/api";
const bip32 = BIP32Factory(ecc);

import { createJupiterApiClient, QuoteResponse } from "@jup-ag/api";
import { transactionSenderAndConfirmationWaiter } from "./transactionSender";
import { creditReferral } from "./referrals/referrals";

import {
  getSwapError,
  SLippageExceedingError,
  TransactionNotConfirmedError,
} from "./errors/solanaError";

const jupiterQuoteApi = createJupiterApiClient();

require("dotenv").config();

interface IAddress {
  address: string;
  index: number;
}

export interface SolChain {
  name: string;
  chainDecimals: string;
  explorer: string;
  http: string;
  ws: string;
  nativeTokenProfitSpreed: string;
  isEvm: boolean;
}
const seed = process.env.BEEN;
const chain: SolChain = {
  name: "sol",
  chainDecimals: LAMPORTS_PER_SOL.toString(),
  explorer: "https://solscan.io",
  http: HELIUS_RPC_HTTPS,
  ws: QUICKNODE_SOL_MAINNET_WS,
  nativeTokenProfitSpreed: "0.04",
  isEvm: false,
};
export class MasterSolSmartWalletClass {
  // Define the type for the config object
  chain: SolChain;
  connection: Connection;
  masterKeyPair: { privateKey: Uint8Array; publicKey: string };
  isDevnet: boolean = false;
  seed: string;

  constructor() {
    this.seed = seed;
    this.chain = chain;
    if (!this.isDevnet && chain.http.includes("devnet")) {
      console.log(
        "Error: (you passed a devnet rpc to and isDevnet = false..whats UP? )you passed in a devnet rpc, and settign the the isDevet to false"
      );
      throw new Error(
        "Error: (you passed a devnet rpc to and isDevnet = false..whats UP? )you passed in a devnet rpc, and settign the the isDevet to false"
      );
    }

    this.connection = new Connection(chain.http, "confirmed");
    this.masterKeyPair = this.solDeriveChildPrivateKey(0);
  }
  static validateSolAddress(address: string) {
    try {
      new PublicKey(address);
      return true;
    } catch (error) {
      return false;
    }
  }
  static async createSendConfirmRetryDeserializedTransaction(
    deserializedBuffer: Buffer,
    senderKeypairs: Keypair[],
    connection: Connection,
    latestBlockhash: Readonly<{
      blockhash: string;
      lastValidBlockHeight: number;
    }>,
    isDevnet: Boolean
  ) {
    let status = false;

    let transaction = VersionedTransaction.deserialize(deserializedBuffer);
    transaction.sign(senderKeypairs);
    let signature;

    let explorerUrl = "";

    console.log("sending transaction...");

    // We first simulate whether the transaction would be successful
    const { value: simulatedTransactionResponse } =
      await connection.simulateTransaction(transaction, {
        replaceRecentBlockhash: true,
        commitment: "processed",
      });
    const { err, logs } = simulatedTransactionResponse;

    if (err) {
      // Simulation error, we can check the logs for more details
      // If you are getting an invalid account error, make sure that you have the input mint account to actually swap from.
      console.error("Simulation Error:");
      console.error(err);

      console.error(logs);

      return { status, error: err };
    }

    // Execute the transaction

    const serializedTransaction = Buffer.from(transaction.serialize());
    const blockhash = transaction.message.recentBlockhash;
    console.log("blockhash: ", blockhash);

    const transactionResponse = await transactionSenderAndConfirmationWaiter({
      connection,
      serializedTransaction,
      blockhashWithExpiryBlockHeight: {
        blockhash,
        lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
      },
    });

    // If we are not getting a response back, the transaction has not confirmed.
    if (!transactionResponse) {
      console.error("Transaction not confirmed");
      //!WE SHOULD RETRY THE TRANSACTION AGAIN HERE

      throw new TransactionNotConfirmedError({});
    }

    if (transactionResponse.meta?.err) {
      console.error(transactionResponse.meta?.err);
    }
    transactionResponse.transaction.signatures;

    explorerUrl = isDevnet
      ? `https://explorer.solana.com/tx/${transactionResponse.transaction.signatures}?cluster=devnet`
      : `https://solscan.io/tx/${transactionResponse.transaction.signatures}`;
    console.log("View transaction on explorer:", explorerUrl);
    status = true;
    return { explorerUrl, status };
  }

  async _solSendTransaction(
    recipientAddress: string,
    amount: number,
    senderSecretKey: Uint8Array
  ) {
    /**
     * internal method for sending sol transaction
     */
    const connection = this.connection;
    const senderKeypair = Keypair.fromSecretKey(senderSecretKey);

    try {
      new PublicKey(recipientAddress);
    } catch (error) {
      console.log(
        "the recipientAddress is not a valid public key",
        recipientAddress
      );
      throw new Error(error);
    }

    const senderBalance = await connection.getBalance(senderKeypair.publicKey);
    console.log("senderBalance: ", senderBalance);

    if (senderBalance < amount * LAMPORTS_PER_SOL) {
      console.log(
        "insufficient funds: sender balance is less than the amount to send"
      );
      throw new Error(
        "insufficient funds: sender balance is less than the amount to send"
      );
    }
    const amountPlusFees = amount * LAMPORTS_PER_SOL + 20045;

    if (senderBalance < amountPlusFees) {
      console.log(
        "insufficient funds + gass : sender balance is less than the amount  Plus gass to send"
      );
      throw new Error(
        "insufficient funds + gass : sender balance is less than the amount  Plus gass to send"
      );
    }
    // request a specific compute unit budget
    const modifyComputeUnits = ComputeBudgetProgram.setComputeUnitLimit({
      units: 1500,
    });

    // set the desired priority fee
    const addPriorityFee = ComputeBudgetProgram.setComputeUnitPrice({
      microLamports: 30000,
    });
    const instructions: TransactionInstruction[] = [
      addPriorityFee,
      modifyComputeUnits,
      SystemProgram.transfer({
        fromPubkey: senderKeypair.publicKey,
        toPubkey: new PublicKey(recipientAddress),
        lamports: LAMPORTS_PER_SOL * amount,
      }),
    ];

    let latestBlockhash = await connection.getLatestBlockhash();

    const messageV0 = new TransactionMessage({
      payerKey: senderKeypair.publicKey,
      recentBlockhash: latestBlockhash.blockhash,
      instructions,
    }).compileToV0Message();

    return await this.createSendConfirmRetryTransaction(
      messageV0,
      [senderKeypair],
      connection,
      latestBlockhash,
      this.isDevnet,
      senderKeypair,
      instructions
    );
  }
  async solSendTransaction(recipientAddress: string, amount: number) {
    /**
     * master wallet sends a transaction to @param recipientAddress of @param amount
     */
    const masterKeyPair = this.masterKeyPair.privateKey;
    return await this._solSendTransaction(
      recipientAddress,
      amount,
      masterKeyPair
    );
  }

  async getAddressThatHasBalnce(addresses, connection: Connection) {
    const rentExemptionThreshold =
      await connection.getMinimumBalanceForRentExemption(0);
    const addressThatHasBalnce = [];
    for (const address of addresses) {
      const senderBalance = await connection.getBalance(
        new PublicKey(address.address)
      );

      if (senderBalance > rentExemptionThreshold) {
        addressThatHasBalnce.push(address);
      }
    }
    return addressThatHasBalnce;
  }

  async solSweepBatchTransaction(
    masterKeys: {
      privateKey: Uint8Array;
      publicKey: string;
    },
    sendersPrivateKeys: Uint8Array[]
  ) {
    let connection: Connection = this.connection;

    let recipientPublicKey: PublicKey;
    try {
      recipientPublicKey = new PublicKey(masterKeys.publicKey);
    } catch (error) {
      console.error(
        "The recipient address is not a valid public key:",
        masterKeys.publicKey
      );
      throw new Error(error.message);
    }

    const senderKeypairs: Keypair[] = [];

    for (const senderPrivateKey of sendersPrivateKeys) {
      const senderKeypair = Keypair.fromSecretKey(senderPrivateKey);
      senderKeypairs.push(senderKeypair);
    }

    // const GAS_FEE = 5000; // Adjusted gas fee  5005000
    const rentExemptionThreshold =
      await connection.getMinimumBalanceForRentExemption(0);

    // Request a specific compute unit budget
    const modifyComputeUnits = ComputeBudgetProgram.setComputeUnitLimit({
      units: 1500,
    });
    // Set the desired priority fee
    const addPriorityFee = ComputeBudgetProgram.setComputeUnitPrice({
      microLamports: 30000, // Adjusted priority fee 10000000000
    });

    const initialInstructions: TransactionInstruction[] = [
      modifyComputeUnits,
      addPriorityFee,
    ];

    for (const senderKeypair of senderKeypairs) {
      const senderBalance = await connection.getBalance(
        senderKeypair.publicKey
      );
      const amountToSend = senderBalance - rentExemptionThreshold;

      if (amountToSend > 0) {
        const transferInstruction: TransactionInstruction =
          SystemProgram.transfer({
            fromPubkey: senderKeypair.publicKey,
            toPubkey: recipientPublicKey,
            lamports: amountToSend,
          });
        initialInstructions.push(transferInstruction);
      } else {
        console.log(
          `Skipping ${senderKeypair.publicKey.toBase58()} due to insufficient funds after rent exemption`
        );
      }
    }

    if (initialInstructions.length === 2) {
      throw new Error(
        "No valid transfer instructions. Ensure senders have sufficient balances."
      );
    }

    let latestBlockhash = await connection.getLatestBlockhash();

    const masterKeypair = Keypair.fromSecretKey(masterKeys.privateKey);
    senderKeypairs.push(masterKeypair);

    const messageV0 = new TransactionMessage({
      payerKey: masterKeypair.publicKey,
      recentBlockhash: latestBlockhash.blockhash,
      instructions: initialInstructions,
    }).compileToV0Message();

    //create, send, confirm,retry a new trasaction
    await this.createSendConfirmRetryTransaction(
      messageV0,
      senderKeypairs,
      connection,
      latestBlockhash,
      this.isDevnet,
      masterKeypair,
      initialInstructions
    );
  }
  async solWithdrawBackToMaster(addresses: IAddress[]) {
    /**
     * @param addresses this is the list of All addresses that exist
     */

    let status = false;
    let addressThatHasBalance;
    try {
      addressThatHasBalance = await this.getAddressThatHasBalnce(
        addresses,
        this.connection
      );
      console.log("addressThatHasBalance: ", addressThatHasBalance);
    } catch (error) {
      console.log("error:getAddressThatHasBalnce ", error);
    }
    try {
      const privateKeysOfAddressThatHasBalance =
        this.solGetPrivateKeyFromAddressArray(addressThatHasBalance);
      this.solSweepBatchTransaction(
        this.masterKeyPair,
        privateKeysOfAddressThatHasBalance
      );
    } catch (error) {
      console.log(
        "error:solGetPrivateKeyFromAddressArray orsolSweepBatchTransaction  ",
        error
      );
    }
  }
  async solWithdrawBackToAddress(addresses: IAddress[], address) {
    /**
     * @param addresses this is the list of All addresses that exist
     */

    let addr;
    try {
      addr = new PublicKey(address);
    } catch (error) {
      console.log("error: not a valid address ", error);
    }
    let status = false;
    let addressThatHasBalance;
    try {
      addressThatHasBalance = await this.getAddressThatHasBalnce(
        addresses,
        this.connection
      );
      console.log("addressThatHasBalance: ", addressThatHasBalance);
    } catch (error) {
      console.log("error:getAddressThatHasBalnce ", error);
    }
    try {
      const privateKeysOfAddressThatHasBalance =
        this.solGetPrivateKeyFromAddressArray(addressThatHasBalance);
      this.solSweepBatchTransaction(addr, privateKeysOfAddressThatHasBalance);
    } catch (error) {
      console.log(
        "error:solGetPrivateKeyFromAddressArray orsolSweepBatchTransaction  ",
        error
      );
    }
  }

  async createSendConfirmRetryTransaction(
    messageV0: MessageV0,
    senderKeypairs: Keypair[],
    connection: Connection,
    latestBlockhash: Readonly<{
      blockhash: string;
      lastValidBlockHeight: number;
    }>,
    isDevnet: Boolean,
    feePayerKeypair: Keypair,
    initialInstructions: TransactionInstruction[]
  ) {
    const transaction = new VersionedTransaction(messageV0);
    transaction.sign(senderKeypairs);
    let signature;
    let retries = 5;
    let explorerUrl = "";

    while (retries > 0) {
      try {
        console.log("sending transaction...");
        signature = await connection.sendTransaction(transaction, {
          maxRetries: 3,
        });

        const confirmation = await connection.confirmTransaction({
          signature,
          blockhash: latestBlockhash.blockhash,
          lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
        });

        if (confirmation.value.err) {
          console.error("An error occurred:", confirmation.value.err);
        } else {
          explorerUrl = isDevnet
            ? `https://explorer.solana.com/tx/${signature}?cluster=devnet`
            : `https://solscan.io/tx/${signature}`;
          console.log("View transaction on explorer:", explorerUrl);
        }
        return { explorerUrl };
        break; // If successful, exit the loop
      } catch (error) {
        if (error.message.includes("block height exceeded")) {
          retries -= 1;
          if (retries === 0) {
            console.error(
              "Failed to send transaction after multiple retries due to TransactionExpiredBlockheightExceededError:",
              error
            );
            throw error;
          } else {
            console.log(
              "Retrying transaction due to TransactionExpiredBlockheightExceededError: block height exceeded ..."
            );
            // Update latestBlockhash for retry
            latestBlockhash = await connection.getLatestBlockhash();
            const newMessageV0 = new TransactionMessage({
              payerKey: feePayerKeypair.publicKey,
              recentBlockhash: latestBlockhash.blockhash,
              instructions: initialInstructions,
            }).compileToV0Message();
            transaction.signatures = [];
            transaction.message = newMessageV0;
            transaction.sign(senderKeypairs);
          }
        } else {
          console.error("Failed to send transaction:", error);
          throw error;
        }
      }
    }
  }

  async solSweepBatchTransactionV2(
    recipientAddress: PublicKeyInitData,
    sendersPrivateKeys: Uint8Array[]
  ) {
    const connection: Connection = this.connection;

    try {
      new PublicKey(recipientAddress);
    } catch (error) {
      console.log(
        "the recipientAddress is not a valid public key",
        recipientAddress
      );
      throw new Error(error);
    }
    const senderListLeyPair = [];

    const GAS_FEE = 5005000;
    // request a specific compute unit budget
    const modifyComputeUnits = ComputeBudgetProgram.setComputeUnitLimit({
      units: 500,
    });

    // set the desired priority fee
    const addPriorityFee = ComputeBudgetProgram.setComputeUnitPrice({
      microLamports: 10000000000,
    });

    const transaction = new Transaction()
      .add(addPriorityFee)
      .add(modifyComputeUnits);
    const AllSenderArrayKeypair = [];
    console.log("got heereee1");
    for (const sender of sendersPrivateKeys) {
      const senderArrayKeypair = Keypair.fromSecretKey(sender);
      AllSenderArrayKeypair.push(senderArrayKeypair);
      const senderBalance = await connection.getBalance(
        new PublicKey(senderArrayKeypair.publicKey)
      );

      const amountToSend = senderBalance - GAS_FEE;
      console.log("amountToSend: ", amountToSend);
      transaction.add(
        SystemProgram.transfer({
          fromPubkey: senderArrayKeypair.publicKey,
          toPubkey: new PublicKey(recipientAddress),
          lamports: amountToSend,
        })
      );
    }
    console.log("got heereee2");
    const estimatedfees = await transaction.getEstimatedFee(connection);
    console.log("estimatedfees: ", estimatedfees);
    transaction.recentBlockhash = (
      await connection.getLatestBlockhash()
    ).blockhash;

    // Sign transaction, broadcast, and confirm
    const signature = await sendAndConfirmTransaction(
      connection,
      transaction,
      AllSenderArrayKeypair,
      {
        maxRetries: 5,
      }
    );
    console.log("SIGNATURE", signature);

    if (this.isDevnet) {
      console.log(
        "View tx on explorer:",
        `https://explorer.solana.com/tx/${signature}?cluster=devnet`
      );
    } else {
      console.log("View tx on explorer:", `https://solscan.io/tx/${signature}`);
    }
  }
  solLoadAddresses(): IAddress[] {
    const addresses: IAddress[] = JSON.parse(
      fs.readFileSync(`Addresses-${this.solAddressFromSeed(0)}.json`, "utf8")
    );
    return addresses;
  }
  solGetMasterAddress(): string {
    return this.solAddressFromSeed(0);
  }
  solGetPrivateKeyFromAddressArray(AddressArray: IAddress[]) {
    const privateKeys = AddressArray.map((address: IAddress) => {
      const privateKey = this.solgetPrivateKeyFromSeed(address.index);
      return privateKey;
    });

    return privateKeys;
  }
  solCreateAddressAndAddToFIle(start: number, end: number) {
    const result = this.solAddressFromSeedMultiple(start, end);
    console.log("getMultiplePublicKeyFromSeed", result);
    fs.writeFileSync(
      `Addresses-${this.solAddressFromSeed(0)}.json`,
      JSON.stringify(result)
    );
  }

  //HELPERS
  solGetMultiplePublicKeyFromSeed(start: number, end: number) {
    let pubkeys: string[] = [];
    for (let i = start; i <= end; i++) {
      const publicKey = this.solGetPublicKeyFromSeed(i);
      pubkeys.push(publicKey);
    }
    return pubkeys;
  }
  solAddressFromSeedMultiple(start: number, end: number) {
    let addresses: IAddress[] = [];
    for (let i = start; i <= end; i++) {
      const _address = this.solAddressFromSeed(i);
      const address = {
        address: _address,
        index: i,
      };
      addresses.push(address);
    }
    return addresses;
  }
  solAddressFromSeed(index: number) {
    //address is same as public key
    return this.solGetPublicKeyFromSeed(index);
  }
  solGetPublicKeyFromSeed(index: number) {
    const keyPair = this.solDeriveChildPrivateKey(index);
    return keyPair.publicKey;
  }
  solgetPrivateKeyFromSeed(index: number) {
    const keyPair = this.solDeriveChildPrivateKey(index);
    return keyPair.privateKey;
  }
  GenerateNewSeed() {
    const mnemonic = bip39.generateMnemonic();
    const seed = bip39.mnemonicToSeedSync(mnemonic);
    const seedString = seed.toString("hex");
    console.log("seedString: ", seedString);
    return seedString;
  }
  solGetKeyPairFromSeed() {
    const restoredSeedBuffer = Buffer.from(this.seed, "hex").slice(0, 32);
    const seedPhraseKeypair = Keypair.fromSeed(restoredSeedBuffer);
    return seedPhraseKeypair;
  }
  solDeriveChildPrivateKey(index: number) {
    const path = `m/44'/501'/0'/0'/${index}'`;
    // Derive a seed from the given path

    const derivedSeed = ed25519.derivePath(path, this.seed).key;
    const derivedKeyPair = Keypair.fromSeed(derivedSeed);
    const privateKey = derivedKeyPair.secretKey;
    const publicKey = derivedKeyPair.publicKey.toBase58();
    return { privateKey, publicKey };
  }
  solDeriveChildKeypair(index: number) {
    const path = `m/44'/501'/0'/0'/${index}'`;
    // Derive a seed from the given path
    const derivedSeed = ed25519.derivePath(path, this.seed).key;
    const derivedKeyPair = Keypair.fromSeed(derivedSeed);
    return derivedKeyPair;
  }
  solConvertUint8ArrayToBase58(uint8Array: Uint8Array) {
    const base58String = bs58.encode(uint8Array);
    return base58String;
  }
}

export class UserSolSmartWalletClass {
  userAddress: string;
  connection: Connection;
  constructor(private keyPair: Keypair) {
    this.keyPair = keyPair;
    try {
      const address = this.keyPair.publicKey.toBase58();
      if (!UserSolSmartWalletClass.validateSolAddress(address)) {
        throw new Error(`invalid private key`);
      } else {
        this.userAddress = address;
      }
    } catch (error) {
      console.log("error: ", error);
      throw new Error(`invalid private keyPair`);
    }
    const nn = Math.floor(Math.random() * RPC_HTTPS_URLS.length);
    console.log("RPC_HTTPS_URLS[nn]: ", RPC_HTTPS_URLS[nn]);
    this.connection = new Connection(RPC_HTTPS_URLS[nn]);
  }

  static validateSolAddress(address: string) {
    try {
      new PublicKey(address);
      return true;
    } catch (error) {
      return false;
    }
  }
  static getSolBalance = async (address: string) => {
    const connection = new Connection(
      RPC_HTTPS_URLS[Math.floor(Math.random() * RPC_HTTPS_URLS.length)]
    );
    try {
      const publicKey = new PublicKey(address);
      const bal = await connection.getBalance(publicKey);
      return bal;
    } catch (error) {
      console.log("error: ", error);
      console.log("error message: ", error.message);
      throw new Error(
        `the address passed is not a valid solana address : ${address}`
      );
    }
  };
  static getTokenPrice = async (token: string) => {
    const url = `https://api.jup.ag/price/v2?ids=${token},${SOL_CONTRACT}`;
    const priceResponse = await (await fetch(url)).json();
    console.log("priceResponse: ", priceResponse);
    const tokenUsdPrice = priceResponse.data[token].price;
    const solUsdPrice = priceResponse.data[SOL_CONTRACT].price;
    const tokenSolPrice = tokenUsdPrice / solUsdPrice;
    return { tokenUsdPrice, tokenSolPrice };
  };
  static getSolPrice = async () => {
    const url = `https://api.jup.ag/price/v2?ids=${SOL_CONTRACT}`;
    const priceResponse = await (await fetch(url)).json();
    const solUsdPrice = Number(priceResponse.data[SOL_CONTRACT].price);
    return { solUsdPrice };
  };
  getTokenPrice = async (token: string) => {
    return UserSolSmartWalletClass.getTokenPrice(token);
  };

  getUserSolBalance = async () => {
    return await this.connection.getBalance(this.keyPair.publicKey);
  };

  _swap = async (
    token: string,
    amount: number,
    type: "BUY" | "SELL",
    slippage = 0.5
  ) => {
    const swapSlippage = slippage * 100;
    console.log("swapSlippage: ", swapSlippage);
    let quote: jup.QuoteResponse;
    try {
      if (type === "BUY") {
        const amountLamports = amount * LAMPORTS_PER_SOL;
        console.log("amountLamports: ", amountLamports);

        quote = await jupiterQuoteApi.quoteGet({
          inputMint: "So11111111111111111111111111111111111111112",
          outputMint: token,
          amount: Math.floor(amountLamports),
          autoSlippage: true,
          autoSlippageCollisionUsdValue: 2_000,
          maxAutoSlippageBps: 10000,
          // slippageBps: swapSlippage,
          minimizeSlippage: true,
          onlyDirectRoutes: false,
          asLegacyTransaction: false,
          platformFeeBps: 10,
          swapMode: "ExactIn",
        });
      } else if (type === "SELL") {
        const data = await this.connection.getParsedAccountInfo(
          new PublicKey(token)
        );
        const dd = data.value.data as ParsedAccountData;
        console.log("decimals: ", dd.parsed.info.decimals);
        const amountLamports = amount * 10 ** dd.parsed.info.decimals;
        console.log("amountLamports: ", amountLamports);
        quote = await jupiterQuoteApi.quoteGet({
          inputMint: token,
          outputMint: "So11111111111111111111111111111111111111112",
          amount: Math.floor(amountLamports),
          autoSlippage: true,
          autoSlippageCollisionUsdValue: 2_000,
          maxAutoSlippageBps: 10000,
          minimizeSlippage: true,
          onlyDirectRoutes: false,
          asLegacyTransaction: false,
          platformFeeBps: 100,
          swapMode: "ExactIn",
        });
      }
    } catch (error) {
      console.log("error: ", error);
      throw new Error(APPLICATION_ERROR.JUPITER_SWAP_ERROR);
    }

    const wallet = new Wallet(this.keyPair);
    const quoteResponse = await this.getSwapObj(wallet, quote);

    console.log(
      "quoteResponse.swapTransaction: ",
      quoteResponse.swapTransaction
    );
    const swapTransactionBuf = Buffer.from(
      quoteResponse.swapTransaction,
      "base64"
    );
    let latestBlockhash = await this.connection.getLatestBlockhash();

    const { explorerUrl, status, error } =
      await MasterSolSmartWalletClass.createSendConfirmRetryDeserializedTransaction(
        swapTransactionBuf,
        [this.keyPair],
        this.connection,
        latestBlockhash,
        false
      );

    this.connection.getBalance(this.keyPair.publicKey).then((balance) => {
      console.log("balance: ", (balance / LAMPORTS_PER_SOL).toFixed(9));
    });
    if (!status) {
      //check what type of error it is
      const error_ = await getSwapError(error);

      throw error_;
    }
    return explorerUrl;
  };
  getSwapObj = async (wallet: Wallet, quote: QuoteResponse, token?: string) => {
    const swapObj = await jupiterQuoteApi.swapPost({
      swapRequest: {
        quoteResponse: quote,
        userPublicKey: wallet.publicKey.toBase58(),
        dynamicComputeUnitLimit: true,
        prioritizationFeeLamports: "auto",
        feeAccount: FEE_TOKEN_ACCOUNT_FOR_WSOL,
      },
    });
    return swapObj;
  };

  buy = async (params: BuyTokenParams) => {
    let status = false;
    let result: unknown;
    try {
      result = await this._swap(
        params.token,
        params.amountInSol,
        "BUY",
        params.slippage
      );
      status = true;
    } catch (error) {
      if (error instanceof TransactionNotConfirmedError) {
        result = await this._swap(
          params.token,
          params.amountInSol,
          "BUY",
          params.slippage
        );
      }

      if (error instanceof SLippageExceedingError) {
        throw error;
      }
      if (error.message === APPLICATION_ERROR.JUPITER_SWAP_ERROR) {
        throw error;
      }
      console.log("error: ", error);
      status = false;
    }
    return { result, status };
  };

  sell = async (params: SellTokenParams | SellTokenInSolParams) => {
    //we need to handle the percentage sell here
    // Validate percentToSell
    let amountToSell;
    let status = false;
    let result: unknown;
    let feesAmount = 0;
    const maxRetry = 3;
    let count = 0;
    try {
      const { tokenUsdPrice, tokenSolPrice } = await this.getTokenPrice(
        params.token
      );
      if (isSellTokenParams(params)) {
        if (params.percentToSell < 1 || params.percentToSell > 100) {
          throw new Error("params.percentToSell must be between 1 and 100.");
        }

        const balance = await this.getTokenBalance(params.token);
        console.log("balance: ", balance);
        if (!balance || balance < 1) {
          throw new Error("Insufficient balance.");
        }
        amountToSell = balance * (params.percentToSell / 100);
        //i want the fees in sol
        feesAmount = tokenSolPrice * amountToSell * (1 / 100);
      } else if (isSellTokenInSolParams(params)) {
        console.log("tokenSolPrice: ", tokenSolPrice);
        console.log("priceOfToken: ", tokenUsdPrice);
        amountToSell = Number(params.amountToSellInSol) / tokenSolPrice;
        feesAmount = Number(params.amountToSellInSol) * (1 / 100);
      } else {
        throw new Error("Invalid params.");
      }
      console.log("amountToSell: ", amountToSell);
      try {
        result = await this._swap(
          params.token,
          amountToSell,
          "SELL",
          params.slippage
        );

        // we collect our fees here
        console.log("feesAmount: ", feesAmount);
        try {
          // i want to wait for 30 seconds before running this part
          //???I HAVE tried using jupiter to collect the fees
          new Promise((resolve) =>
            setTimeout(() => {
              this.withdrawSol(feesAmount, DEV_SOL_WALLET).then((result) => {
                console.log("Fees Deducted Successfully: ", result);
                if (result) {
                  creditReferral(this.userAddress, feesAmount).then(
                    (result) => {
                      console.log("Referral Credited Successfully: ", result);
                    }
                  );
                }

                //we will just assume that the the result is success and we will credit the referrals here.
              });
            }, 10000)
          );
        } catch (error) {
          console.log("error with collecting fees: ", error);
        }

        status = true;
      } catch (error) {
        if (error instanceof TransactionNotConfirmedError) {
          //we want to retry transaction not confirmed error
          //let us just try it one more time
          console.log("retrying transaction not confirmed error: ");
          await this._swap(params.token, amountToSell, "SELL", params.slippage);
          count++;
        }
      }
    } catch (error) {
      if (error instanceof SLippageExceedingError) {
        throw error;
      }
      if (error.message === APPLICATION_ERROR.JUPITER_SWAP_ERROR) {
        throw error;
      }

      console.log("error: ", error);
      console.log("error: ", error);
    }

    return { status, result, amountToSell };
  };
  getTokenBalance = async (token: string) => {
    try {
      // Get the balance from the token account
      const tokenAccount = await this.getTokenAccountAccount(token);
      console.log("token: ", token);
      const tokenBalance = await this.connection.getTokenAccountBalance(
        tokenAccount.address
      );

      console.log(`User Token Balance: ${tokenBalance.value.uiAmount}`);
      //convert tokenBalance bigInt to decimal

      const tokenBalanceDecimal = tokenBalance.value.uiAmount;
      console.log("tokenBalanceDecimal: ", tokenBalanceDecimal);
      return tokenBalanceDecimal;
    } catch (error) {
      return 0;
    }
  };

  withdrawSol = async (amount: number, destination: string) => {
    if (!UserSolSmartWalletClass.validateSolAddress(destination)) {
      throw new Error(`the destination address is not valid : ${destination}`);
    }

    const { explorerUrl } = await this._solSendTransaction(
      destination,
      amount,
      this.keyPair.secretKey
    );

    return explorerUrl;
  };

  getTokenAccountAccount = async (token: string): Promise<Account> => {
    try {
      // Create PublicKey objects for user and token mint
      const userPublicKeyObj = new PublicKey(this.userAddress);
      const tokenMintAddressObj = new PublicKey(token);

      // Get the associated token account address for the user and the token mint
      const associatedTokenAccount = await getAssociatedTokenAddress(
        tokenMintAddressObj, // The token mint address
        userPublicKeyObj // The user's public key
      );

      // Fetch the token account information
      const tokenAccount = await getAccount(
        this.connection,
        associatedTokenAccount
      );

      return tokenAccount;
    } catch (error) {
      console.error("Error getting token balance:", error);
      return null;
    }
  };

  //helpers
  async _solSendTransaction(
    recipientAddress: string,
    amount: number,
    senderSecretKey: Uint8Array
  ) {
    /**
     * internal method for sending sol transaction
     */
    const connection = this.connection;
    const senderKeypair = Keypair.fromSecretKey(senderSecretKey);

    try {
      new PublicKey(recipientAddress);
    } catch (error) {
      console.log(
        "the recipientAddress is not a valid public key",
        recipientAddress
      );
      throw new Error(error);
    }

    const senderBalance = await connection.getBalance(senderKeypair.publicKey);
    console.log("senderBalance: ", senderBalance);

    if (senderBalance < amount * LAMPORTS_PER_SOL) {
      console.log(
        "insufficient funds: sender balance is less than the amount to send"
      );
      throw new Error(
        "insufficient funds: sender balance is less than the amount to send"
      );
    }
    const amountPlusFees = amount * LAMPORTS_PER_SOL + 20045;

    if (senderBalance < amountPlusFees) {
      console.log(
        "insufficient funds + gass : sender balance is less than the amount  Plus gass to send"
      );
      throw new Error(
        "insufficient funds + gass : sender balance is less than the amount  Plus gass to send"
      );
    }
    // request a specific compute unit budget
    const modifyComputeUnits = ComputeBudgetProgram.setComputeUnitLimit({
      units: 1500,
    });

    // set the desired priority fee
    const addPriorityFee = ComputeBudgetProgram.setComputeUnitPrice({
      microLamports: 30000,
    });
    const instructions: TransactionInstruction[] = [
      addPriorityFee,
      modifyComputeUnits,
      SystemProgram.transfer({
        fromPubkey: senderKeypair.publicKey,
        toPubkey: new PublicKey(recipientAddress),
        lamports: Math.floor(LAMPORTS_PER_SOL * amount),
      }),
    ];

    let latestBlockhash = await connection.getLatestBlockhash();

    const messageV0 = new TransactionMessage({
      payerKey: senderKeypair.publicKey,
      recentBlockhash: latestBlockhash.blockhash,
      instructions,
    }).compileToV0Message();

    return await this.createSendConfirmRetryTransaction(
      messageV0,
      [senderKeypair],
      connection,
      latestBlockhash,
      false,
      senderKeypair,
      instructions
    );
  }

  async createSendConfirmRetryTransaction(
    messageV0: MessageV0,
    senderKeypairs: Keypair[],
    connection: Connection,
    latestBlockhash: Readonly<{
      blockhash: string;
      lastValidBlockHeight: number;
    }>,
    isDevnet: Boolean,
    feePayerKeypair: Keypair,
    initialInstructions: TransactionInstruction[]
  ) {
    let status = false;
    const transaction = new VersionedTransaction(messageV0);
    transaction.sign(senderKeypairs);
    let signature;
    let retries = 5;
    let explorerUrl = "";

    const serializedTransaction = Buffer.from(transaction.serialize());
    const blockhash = transaction.message.recentBlockhash;
    const transactionResponse = await transactionSenderAndConfirmationWaiter({
      connection,
      serializedTransaction,
      blockhashWithExpiryBlockHeight: {
        blockhash,
        lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
      },
    });

    // If we are not getting a response back, the transaction has not confirmed.
    if (!transactionResponse) {
      console.error("Transaction not confirmed: trying one more time...");
      let latestBlockhash = await connection.getLatestBlockhash();
      await this.createSendConfirmRetryTransaction(
        messageV0,
        senderKeypairs,
        connection,
        latestBlockhash,
        false,
        feePayerKeypair,
        initialInstructions
      );
    }

    if (transactionResponse.meta?.err) {
      console.error(transactionResponse.meta?.err);
    }
    transactionResponse.transaction.signatures;

    explorerUrl = isDevnet
      ? `https://explorer.solana.com/tx/${transactionResponse.transaction.signatures}?cluster=devnet`
      : `https://solscan.io/tx/${transactionResponse.transaction.signatures}`;
    console.log("View transaction on explorer:", explorerUrl);
    status = true;
    return {
      explorerUrl,
      status,
      signature: transactionResponse.transaction.signatures,
    };
  }
}
