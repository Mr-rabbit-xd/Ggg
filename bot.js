import TelegramBot from "node-telegram-bot-api";
import Pino from "pino";
import fs from "fs";
import {
  makeWASocket,
  useMultiFileAuthState,
  fetchLatestBaileysVersion
} from "@whiskeysockets/baileys";

// 🔑 Telegram Bot Token (নিজেরটা বসাও)
const TG_TOKEN = "8019207243:AAG60ob8LzYBiSqjpPcXFmT-8syU-k1no9k";

// 🤖 Telegram bot start
const bot = new TelegramBot(TG_TOKEN, { polling: true });

// 📂 session base folder
if (!fs.existsSync("./session")) {
  fs.mkdirSync("./session");
}

// =======================
// /start command
// =======================
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;

  const text = `
👋 *Welcome to WhatsApp Pairing Bot*

এই বট দিয়ে তুমি *QR ছাড়াই* WhatsApp pairing code নিতে পারবে 📲

━━━━━━━━━━━━━━
📌 *How to use*
━━━━━━━━━━━━━━
👉 Country code সহ নাম্বার দাও

*Example*
\`/pair 8801XXXXXXXXX\`
\`/pair 9198XXXXXXXX\`

━━━━━━━━━━━━━━
📲 *Steps*
━━━━━━━━━━━━━━
1️⃣ /pair কমান্ড দাও  
2️⃣ Pairing code নাও  
3️⃣ WhatsApp → Link device  
4️⃣ Use pairing code → Done ✅

⚠️ *Note*
• বারবার pairing করলে WhatsApp block দিতে পারে  
• শুধু নিজের নাম্বার ব্যবহার করো
`;

  bot.sendMessage(chatId, text, { parse_mode: "Markdown" });
});

// =======================
// Pairing function
// =======================
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

  // আগেই paired থাকলে
  if (sock.authState.creds.registered) {
    return "✅ এই নাম্বার আগেই paired আছে";
  }

  // pairing code generate
  const code = await sock.requestPairingCode(phone);
  return code;
}

// =======================
// /pair command (ALL COUNTRY FIX)
// =======================
bot.onText(/\/pair (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;

  // শুধু সংখ্যা রাখি
  let phone = match[1].replace(/\D/g, "");

  // 🌍 all country support
  if (phone.length < 10 || phone.length > 15) {
    return bot.sendMessage(
      chatId,
      "❌ সঠিক country code সহ নাম্বার দাও\n\nExample:\n/pair 8801XXXXXXXXX\n/pair 9198XXXXXXXX"
    );
  }

  bot.sendMessage(chatId, "⏳ Pairing code তৈরি হচ্ছে...");

  try {
    const code = await getPairingCode(phone);

    bot.sendMessage(
      chatId,
      `📲 *WhatsApp Pairing Code*\n\n\`${code}\`\n\nWhatsApp → Link device → Use pairing code`,
      { parse_mode: "Markdown" }
    );
  } catch (err) {
    console.error(err);
    bot.sendMessage(chatId, "❌ Error হয়েছে, একটু পরে আবার চেষ্টা করো");
  }
});

console.log("🤖 Telegram WhatsApp Pairing Bot is running...");
