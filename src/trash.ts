// const handleUserBuyPositions = async (
//     chatId: string,
//     message: TelegramBot.Message
//   ) => {
//     const telegramId = message.chat.id.toString();
//     //get all the bought transactions
//     const transactions = await getAllUserBoughtTransactions(telegramId);
//     let text = "Active Positions:\n";
//     const trxPrice = await getTrxPrice();
//     for (const transaction of transactions) {
//       if (transaction.status === "bought") {
//         const tokenDetails = await getTokenDetails(transaction.tokenAddress);
//         const PNL_Trx =
//           (parseInt(transaction.buyPrice) - tokenDetails.priceInTrx) *
//           parseInt(transaction.amountBought);
//         const PNL_usd = PNL_Trx * trxPrice;

//         const nameWithLink = `[${transaction.tokenTicker}](https://sunpump.meme/token/${transaction.tokenAddress})`;
//         text += `\n- ${nameWithLink} | ${transaction.amountBought} TRX ($${(
//           parseInt(transaction.amountBought) * trxPrice
//         ).toFixed(2)})\n`;
//         text += `\`${transaction.tokenAddress}\`\n`;
//         text += `  -Current Price : $${tokenDetails.priceInTrx * trxPrice}\n`;
//         text += `  -MC: $${tokenDetails.marketCap}\n`;
//         text += `  -PNL USD: ${(
//           (PNL_usd / parseInt(transaction.amountBought)) *
//           100
//         ).toFixed(2)}% (${PNL_usd.toFixed()} $) ${PNL_usd > 0 ? "🟩" : "🟥"}\n`;
//         text += `  -PNL TRX: ${(
//           (PNL_Trx / parseInt(transaction.amountBought)) *
//           100
//         ).toFixed(2)}% (${PNL_Trx.toFixed(2)} TRX) ${
//           PNL_Trx > 0 ? "🟩" : "🟥"
//         }\n`;
//       }
//     }
//     bot.sendMessage(chatId, text, { parse_mode: "Markdown" });
//   };

// _swap = async (
//     token: string,
//     amount: number,
//     type: "BUY" | "SELL",
//     slippage = 0.5
//   ) => {
//     const helius = new Helius("e052d4b4-b524-4d7e-9c1f-921f207125d6");
//     const swapSlippage = slippage * 100;
//     console.log("swapSlippage: ", swapSlippage);
//     let quote: jup.QuoteResponse;

//     if (type === "BUY") {
//       const amountLamports = amount * LAMPORTS_PER_SOL;
//       console.log("amountLamports: ", amountLamports);

//       quote = await jupiterQuoteApi.quoteGet({
//         inputMint: "So11111111111111111111111111111111111111112",
//         outputMint: token,
//         amount: Math.floor(amountLamports),
//         autoSlippage: true,
//         autoSlippageCollisionUsdValue: 1_000,
//         maxAutoSlippageBps: 2000, // 10%
//         minimizeSlippage: true,
//         onlyDirectRoutes: false,
//         asLegacyTransaction: false,
//       });
//     } else if (type === "SELL") {
//       const data = await this.connection.getParsedAccountInfo(
//         new PublicKey(token)
//       );
//       const dd = data.value.data as ParsedAccountData;
//       console.log("decimals: ", dd.parsed.info.decimals);
//       const amountLamports = amount * 10 ** dd.parsed.info.decimals;
//       console.log("amountLamports: ", amountLamports);
//       quote = await jupiterQuoteApi.quoteGet({
//         inputMint: token,
//         outputMint: "So11111111111111111111111111111111111111112",
//         amount: Math.floor(amountLamports),
//         autoSlippage: true,
//         autoSlippageCollisionUsdValue: 1_000,
//         maxAutoSlippageBps: 1000,
//         minimizeSlippage: true,
//         onlyDirectRoutes: false,
//         asLegacyTransaction: false,
//       });
//     }

//     const wallet = new Wallet(this.keyPair);
//     // const quoteResponse = await this.getSwapObj(wallet, quote);

//     const instructions = await jupiterQuoteApi.swapInstructionsPost({
//       swapRequest: {
//         quoteResponse: quote,
//         userPublicKey: wallet.publicKey.toBase58(),
//         dynamicComputeUnitLimit: true,
//         prioritizationFeeLamports: "auto",
//         computeUnitPriceMicroLamports: "auto",
//       },
//     });

//     const {
//       swapInstruction: swapInstructionPayload, // The actual swap instruction.

//       addressLookupTableAddresses, // The lookup table addresses that you can use if you are using versioned transaction.
//     } = instructions;
//     const instructionAccounts: AccountMeta[] =
//       swapInstructionPayload.accounts.map((acc) => {
//         return {
//           pubkey: new PublicKey(acc.pubkey) as PublicKey,
//           isSigner: acc.isSigner,
//           isWritable: acc.isWritable,
//         };
//       });

//     const heliusInstructions = new TransactionInstruction({
//       keys: instructionAccounts,
//       programId: new PublicKey(swapInstructionPayload.programId),
//       data: Buffer.from(swapInstructionPayload.data),
//     });

//     const getAddressLookupTableAccounts = async (
//       keys: string[]
//     ): Promise<AddressLookupTableAccount[]> => {
//       const addressLookupTableAccountInfos =
//         await this.connection.getMultipleAccountsInfo(
//           keys.map((key) => new PublicKey(key))
//         );

//       return addressLookupTableAccountInfos.reduce(
//         (acc, accountInfo, index) => {
//           const addressLookupTableAddress = keys[index];
//           if (accountInfo) {
//             const addressLookupTableAccount = new AddressLookupTableAccount({
//               key: new PublicKey(addressLookupTableAddress),
//               state: AddressLookupTableAccount.deserialize(accountInfo.data),
//             });
//             acc.push(addressLookupTableAccount);
//           }

//           return acc;
//         },
//         new Array<AddressLookupTableAccount>()
//       );
//     };

//     const addressLookupTableAccounts: AddressLookupTableAccount[] = [];

//     addressLookupTableAccounts.push(
//       ...(await getAddressLookupTableAccounts(addressLookupTableAddresses))
//     );

//     let latestBlockhash = await this.connection.getLatestBlockhash();
//     const transactionSignature = await helius.rpc.sendSmartTransaction(
//       [heliusInstructions],
//       [this.keyPair],
//       addressLookupTableAccounts,
//       { skipPreflight: true, lastValidBlockHeightOffset: 150 }
//     );
//     console.log("transactionSignature: ", transactionSignature);

//     this.connection.getBalance(this.keyPair.publicKey).then((balance) => {
//       console.log("balance: ", (balance / LAMPORTS_PER_SOL).toFixed(9));
//     });
//     if (!status) {
//       throw new Error(`The transaction failed: ${transactionSignature}`);
//     }
//     return transactionSignature;
//   };
