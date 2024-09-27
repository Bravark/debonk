import axios from "axios";
import { bot } from "./helper";
import { Api, TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions";

const GROUP_CHAT_ID = "your-group-chat-id"; // Replace with your group chat ID

const ACCOUNT = {
  api_id: 17862320,
  api_hash: "b4fed2301e59eed8ed9eaad27952c0d3",
};

const { BOT_TOKEN } = process.env;
if (!BOT_TOKEN) {
  throw new Error("BOT_TOKEN not found in environment variables");
}

/**
 * Sends a message to a Telegram group.
 * @param message - The message to send.
 */
async function sendTelegramMessage(message: string) {
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
  const payload = {
    chat_id: GROUP_CHAT_ID,
    text: message,
    parse_mode: "Markdown", // Use Markdown for formatting
  };

  try {
    const response = await axios.post(url, payload);
    console.log("Message sent:", response.data);
  } catch (error) {
    console.error("Error sending message:", error);
  }
}

// Example usage: Sending new token details to the group
export async function notifyNewTokens() {
  // const tokenDetails = await getTokenListText(); // Assume getTokenListText() returns the formatted token details
  await sendTelegramMessage("tokenDetails");
}

// Call the function to send the message
// notifyNewTokens();

export async function logChatId() {
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/getUpdates`;

  try {
    const response = await axios.get(url);
    console.log("response: ", response.data);
    const chatId = response.data.result[0].message.chat.id;
    console.log("Group Chat ID:", chatId);
  } catch (error) {
    console.error("Error getting updates:", error);
  }
}

console.log("THIS THIS THIS: ");
// Call this function after sending a message in the group

export class TelegramUserClass {
  private session;
  private client: TelegramClient;
  private clientWorkers: TelegramClient[] = [];

  constructor() {
    //TODO let us find a way to support multiple accounts

    const { api_id, api_hash } = ACCOUNT;

    this.client = new TelegramClient(new StringSession(""), api_id, api_hash, {
      connectionRetries: 5,
    });
  }

  async test() {
    await this.client.connect();

    await this.client.invoke(
      new Api.messages.SendMessage({
        peer: "dapppol",
        message: "this client is working ",
      })
    );

    console.log("User started");
  }
}
