const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const fs = require('fs');
const { Boom } = require('@hapi/boom');
const express = require('express');
const app = express();
const port = 3000;

// Universal Reply Function
const reply = (m, text, thumbnailUrl, sourceUrl) => {
    sock.sendMessage(m.key.remoteJid, {
        text: text,
        contextInfo: {
            mentionedJid: [m.key.participant || m.key.remoteJid],
            forwardingScore: 9999999,
            isForwarded: true,
            externalAdReply: {
                showAdAttribution: true,
                containsAutoReply: true,
                title: `⚡ SHADOW v-0 ⚡`,
                body: `🎭 Dev: eternlxz 🎭`,
                previewType: "PHOTO",
                thumbnailUrl: thumbnailUrl || "https://files.catbox.moe/4jod2x.jpeg",
                sourceUrl: sourceUrl || "https://www.youtube.com/@eternlxz"
            }
        }
    }, { quoted: m });
};

// Log pairing message
console.log(`You just summoned 🎭 shadow v-0 the weakest bot alive 🎭`);
console.log(`Input your number to connect starting with your country code (don't add +)...`);

// Generate pairing code
const generatePairingCode = () => {
    return Math.floor(10000000 + Math.random() * 90000000).toString(); // 8-digit code
};

// Pairing Process
const pairingCode = generatePairingCode();
console.log(`Your pairing code is: ${pairingCode}`);

async function startSock() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info');
    sock = makeWASocket({ auth: state });

    sock.ev.on('messages.upsert', async (msg) => {
        const m = msg.messages[0];
        const content = m.message?.conversation || m.message?.extendedTextMessage?.text || '';
        const from = m.key.remoteJid;

        // Log messages to server
        fetch(`http://localhost:${port}/log`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ from, content })
        });

        // Dot Command Reply (Stylish)
        if (content.startsWith('.')) {
            const replyText = `〽️✨ _*Yaw bruh gtf 💀 you are 𝙉𝙊𝙏 my owner*_ ✨〽️`;
            reply(m, replyText);
            return;
        }

        // Anti-Link Check
        if (/(https?:\/\/[\w.-]+|www\.[\w.-]+)/gi.test(content)) {
            if (from.endsWith('@g.us')) {
                const groupMetadata = await sock.groupMetadata(from);
                const botNumber = sock.user.id.split(':')[0] + '@s.whatsapp.net';
                const admins = groupMetadata.participants.filter(p => p.admin).map(p => p.id);
                if (admins.includes(botNumber)) {
                    const antiLinkReply = `🚫🔥 *Shadow Alert!* 🔥🚫\n⚔️ *Links are not allowed here!* ⚔️\n🌑 *Your message has been erased from the shadows...*`;
                    reply(m, antiLinkReply);
                    await sock.chatModify({ delete: true }, from, m.key.id);
                }
            }
            return;
        }

        // Hidetag Command
        if (content.startsWith('.hidetag') && from.endsWith('@g.us')) {
            const groupMetadata = await sock.groupMetadata(from);
            const participants = groupMetadata.participants.map(p => p.id);
            const quotedMessage = m.message?.extendedTextMessage?.contextInfo?.quotedMessage?.conversation || '👥 Shadow has summoned you all...';

            const hideTagMessage = `〽️✨ _*Summoning Shadows...*_ ✨〽️\n${quotedMessage}`;
            await sock.sendMessage(from, { text: hideTagMessage, mentions: participants }, { quoted: m });
            return;
        }

        // Welcome and Goodbye Messages
        if (m.message?.protocolMessage?.key?.remoteJid?.endsWith('@g.us')) {
            const groupName = (await sock.groupMetadata(from)).subject;
            const userName = m.pushName || "Unknown";
            const userNumber = m.key.participant?.split('@')[0] || "Unknown";

            if (m.message?.protocolMessage?.type === 3) {  // Goodbye
                const goodbyeMessage = `💀🌘 *A shadow has faded...* 🌘💀\n🌑 *Group:* ${groupName}\n👤 *Username:* ${userName}\n📱 *Number:* ${userNumber}\n🔮 *The echoes of your presence linger in the darkness...*`;
                reply(m, goodbyeMessage);
            } else if (m.message?.protocolMessage?.type === 5) {  // Welcome
                const welcomeMessage = `✨🌑 *Welcome to Shadows!* 🌑✨\n🌌 *Group:* ${groupName}\n👤 *Username:* ${userName}\n📱 *Number:* ${userNumber}\n🌟 *May your presence be embraced by the shadows!*`;
                reply(m, welcomeMessage);
            }
        }
    });

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            const shouldReconnect = lastDisconnect.error?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log('Connection closed, reconnecting...', shouldReconnect);
            if (shouldReconnect) startSock();
        } else if (connection === 'open') {
            console.log('⚡ SHADOW v-0 is online! ⚡');
        }
    });

    sock.ev.on('creds.update', saveCreds);
}

startSock();