import TelegramBot from "node-telegram-bot-api";
import Pino from "pino";
import fs from "fs";
import {
  makeWASocket,
  useMultiFileAuthState,
  fetchLatestBaileysVersion
} from "@whiskeysockets/baileys";

// 🔑 Telegram Bot Token
const TG_TOKEN = "8019207243:AAG60ob8LzYBiSqjpPcXFmT-8syU-k1no9k";

const bot = new TelegramBot(TG_TOKEN, { polling: true });

// base session folder
if (!fs.existsSync("./session")) {
  fs.mkdirSync("./session");
}

// /start command
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;

  const text = `
👋 *Welcome to WhatsApp Pairing Bot*

এই বট দিয়ে তুমি *QR ছাড়াই* WhatsApp pairing code নিতে পারবে 📲

📌 *Use*
/pair 8801XXXXXXXXX

⚠️ Country code অবশ্যই দিতে হবে
`;

  bot.sendMessage(chatId, text, { parse_mode: "Markdown" });
});

// pairing function
async function getPairingCode(phone) {
  const sessionPath = `./session/${phone}`;
  const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    auth: state,
    version,
    printQRInTerminal: false,
    logger: Pino({ level: "silent" })
  });

  sock.ev.on("creds.update", saveCreds);

  if (sock.authState.creds.registered) {
    return "✅ এই নাম্বার আগেই paired আছে";
  }

  return await sock.requestPairingCode(phone);
}

// /pair command
bot.onText(/\/pair (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  let phone = match[1].replace(/\D/g, "");

  if (!phone.startsWith("88")) {
    return bot.sendMessage(
      chatId,
      "❌ Country code সহ নাম্বার দাও\nExample:\n/pair 8801XXXXXXXXX"
    );
  }

  bot.sendMessage(chatId, "⏳ Pairing code তৈরি হচ্ছে...");

  try {
    const code = await getPairingCode(phone);
    bot.sendMessage(
      chatId,
      `📲 *Pairing Code*\n\n\`${code}\`\n\nWhatsApp → Link device → Use pairing code`,
      { parse_mode: "Markdown" }
    );
  } catch (e) {
    bot.sendMessage(chatId, "❌ Error হয়েছে, পরে চেষ্টা করো");
  }
});

console.log("🤖 Telegram WhatsApp Pairing Bot Running...");
