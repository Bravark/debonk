// import TelegramBot from "node-telegram-bot-api";
// import { KEYBOARD_QUERY } from "./constants";
// import {
//   bot,
//   getNewInlineKeyboardFromMessage,
//   replaceInlineKeyboardFieldByQuery,
//   startSwapFast,
//   toast,
//   updateInlineKeyboardFieldByQuery,
// } from "./helper";
// import { SwapParams } from "./types";

// type InputErrorType = {
//   message: string;
//   id: number;
//   name: string;
//   data?: { [key: string]: string };
// };

// class InputError extends Error {
//   readonly id: number;
//   data: { [key: string]: string } | undefined;

//   // base constructor only accepts string message as an argument
//   // we extend it here to accept an object, allowing us to pass other data
//   constructor(data: InputErrorType) {
//     super(data.message);
//     this.name = data.name; // this property is defined in parent
//     this.id = data.id;
//     this.data = data.data; // this property is defined in parent
//   }
// }

// const handleError = (chatId: string, err: InputError) => {
//   if (err.name == "address_invalid") {
//     bot.sendMessage(
//       chatId,
//       `This payout address can not be used. Please use another address.`
//     );
//     return;
//   }
// };
// const handleError2 = (
//   chatId: string,
//   err: any,
//   params: Partial<SwapParams>
// ) => {
//   let message: string;
//   let name: string;
//   try {
//     const res = getValidationErrorMessageAndName(err.message, params)!;
//     message = res.message;
//     name = res.name;
//     bot.sendMessage(chatId, `${res.message}`);
//   } catch (err) {
//     console.log("UNKNOWN ERROR: ", err);
//   }
// };

// const handleErrorFromInlineKeyboard = async (
//   chatId: string,
//   err: any,
//   params: Partial<SwapParams>,
//   message: TelegramBot.Message,
//   keyboardQ: string,
//   newText?: string
// ) => {
//   console.log("newText: ", newText);
//   handleError2(chatId, err, params);
//   await replaceInlineKeyboardFieldByQuery(
//     chatId,
//     message,
//     keyboardQ,
//     true,
//     newText
//   );
// };

// const errorMaps: { [key: string]: string } = {
//   no_from_network: `Provide a from network like this: `,
// };

// const handleNoFromNetworkError = async (chatId: string, err: InputError) => {
//   // i want to capture their
// };

// const handleValidationError = (error: any, params: SwapParams) => {
//   let message: string;
//   let name: string;
//   try {
//     const res = getValidationErrorMessageAndName(error.message, params)!;
//     message = res.message;
//     name = res.name;
//   } catch (err) {
//     throw new Error(`${error.message}`);
//   }
//   console.log("message: ", message);
//   throw new InputError({
//     message,
//     data: {
//       fromCurrency: params.fromCurrency,
//       toCurrency: params.toCurrency,
//       fromNetwork: params.fromNetwork as string,
//       toNetwork: params.toNetwork as string,
//     },
//     id: 2,
//     name,
//   });
// };

// const handleAnyError = (error: any, params: any) => {
//   let message: string;
//   let name: string;
//   try {
//     const res = getAnyValidationErrorMessageAndName(error.message, params)!;
//     message = res.message;
//     name = res.name;
//   } catch (err) {
//     throw new Error(`${error.message}`);
//   }
//   console.log("message: ", message);
//   throw new InputError({
//     message,
//     data: {
//       fromCurrency: params.fromCurrency,
//       toCurrency: params.toCurrency,
//       fromNetwork: params.fromNetwork as string,
//       toNetwork: params.toNetwork as string,
//     },
//     id: 2,
//     name,
//   });
// };

// const handleAnyError2 = (error: any, params: { chatId: string }) => {
//   let message: string;
//   let name: string;
//   try {
//     const res = getAnyValidationErrorMessageAndName(error.message, params)!;
//     message = res.message;
//     name = res.name;
//   } catch (err) {
//     throw new Error(`${error.message}`);
//   }
//   toast(params.chatId, message);
// };

// const handleAddressValidationError = (error: any, params: any) => {
//   let message: string;
//   let name: string;
//   try {
//     const res = getAddressValidationErrorMessageAndName(error.message, params)!;
//     message = res.message;
//     name = res.name;
//   } catch (err) {
//     throw new Error(`${error.message}`);
//   }
//   console.log("message: ", message);
//   throw new InputError({
//     message,
//     data: {
//       fromCurrency: params.fromCurrency,
//       toCurrency: params.toCurrency,
//       fromNetwork: params.fromNetwork as string,
//       toNetwork: params.toNetwork as string,
//     },
//     id: 2,
//     name,
//   });
// };

// const getAnyValidationErrorMessageAndName = (
//   errorMessage: string,
//   data: any
// ) => {
//   if (
//     errorMessage.includes(
//       "payout address can not be used. Please use another address"
//     )
//   ) {
//     return {
//       message:
//         "This payout address can not be used. Please use another address",
//       name: "address_invalid",
//     };
//   }

//   if (errorMessage.includes("Request failed with status 404 Not Found")) {
//     return {
//       message: "No Swap found",
//       name: "not_found_swap",
//     };
//   }
// };

// const getAddressValidationErrorMessageAndName = (
//   errorMessage: string,
//   data: any
// ) => {
//   if (
//     errorMessage.includes("currency is unavailable now for address validation")
//   ) {
//     return {
//       message: "Address validation for this chain/network is unavailable",
//       name: "address_validation_unavailable",
//     };
//   } else {
//     return {
//       message: "Invalid address",
//       name: "invalid_address",
//     };
//   }
// };

// const getValidationErrorMessageAndName = (
//   errorMessage: string,
//   data: Partial<SwapParams>
// ) => {
//   if (errorMessage.includes("currency-to network")) {
//     return { message: "in valid network/chain", name: "validate_to_network" };
//   }
//   if (errorMessage.includes("is not supported")) {
//     // we want to know if the error message contains the from or to currency
//     const messageIsFromCurrency = errorMessage.includes(
//       `${data.fromCurrency?.toLowerCase()}`
//     );
//     console.log("messageIsFromCurrency: ", messageIsFromCurrency);
//     return {
//       message: `Currency ${
//         messageIsFromCurrency ? data.fromCurrency : data.toCurrency
//       } is not supported on the the network/chain ${
//         messageIsFromCurrency ? data.fromNetwork : data.toNetwork
//       }`,
//       name: messageIsFromCurrency
//         ? "validate_from_network"
//         : "validate_to_network",
//     };
//   }
//   if (errorMessage.includes("needs to be")) {
//     // we want to know if the error message contains the from or to currency

//     return {
//       message: errorMessage,
//       name: "amount_less_or_greater",
//     };
//   }
// };

// export {
//   InputError,
//   handleError,
//   getValidationErrorMessageAndName,
//   handleValidationError,
//   handleAddressValidationError,
//   getAddressValidationErrorMessageAndName,
//   handleAnyError,
//   handleErrorFromInlineKeyboard,
//   handleAnyError2,
// };
