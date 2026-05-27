const { Redis } = require('@upstash/redis');

const redis = Redis.fromEnv();
const TOKEN = process.env.BOT_TOKEN;

// Generate random key
function generateKey(length = 8) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

// Parse durasi
function parseDuration(duration) {
    const unit = duration.slice(-1);
    const value = parseInt(duration.slice(0, -1));
    
    if (unit === 'd') {
        return Date.now() + (value * 24 * 60 * 60 * 1000);
    } else if (unit === 'm') {
        return Date.now() + (value * 60 * 1000);
    }
    return null;
}

// Format tanggal
function formatDate(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
}

// Kirim pesan ke Telegram
async function sendMessage(chatId, text, parseMode = 'Markdown') {
    const url = `https://api.telegram.org/bot${TOKEN}/sendMessage`;
    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            chat_id: chatId,
            text: text,
            parse_mode: parseMode
        })
    });
    return response.json();
}

// Handler webhook
module.exports = async (req, res) => {
    // GET buat APK validasi
    if (req.method === 'GET' && req.query.key) {
        const key = req.query.key;
        const data = await redis.get(`key:${key}`);
        
        if (!data) {
            return res.json({ success: false, message: 'Key invalid!' });
        }
        if (Date.now() > data.expiredAt) {
            return res.json({ success: false, message: 'Key expired!' });
        }
        return res.json({ success: true, message: 'Key valid!' });
    }
    
    // GET biasa (cek status)
    if (req.method === 'GET') {
        return res.json({ status: 'running', bot: 'AIDE Pro Key Bot' });
    }
    
    // POST dari Telegram
    if (req.method === 'POST') {
        const update = req.body;
        
        try {
            if (update.message && update.message.text) {
                const chatId = update.message.chat.id;
                const text = update.message.text.trim();
                
                // /start
                if (text === '/start') {
                    await sendMessage(chatId,
                        `🤖 *AIDE Pro Key Bot v1.0*\n\n` +
                        `📋 *Commands:*\n` +
                        `/gen <duration> - Generate key (1d/3d/5d/7d/30d/4m)\n` +
                        `/delkey <key> - Delete key\n` +
                        `/listkey - Lihat semua key\n` +
                        `/cekkey <key> - Cek status key\n\n` +
                        `📝 *Contoh:*\n` +
                        `/gen 7d\n` +
                        `/gen 4m`
                    );
                }
                
                // /gen
                else if (text.startsWith('/gen')) {
                    const args = text.split(' ');
                    const duration = args[1];
                    
                    if (!duration) {
                        await sendMessage(chatId, '❌ Masukkan durasi! Contoh: /gen 7d');
                        return res.status(200).json({ ok: true });
                    }
                    
                    const expiredAt = parseDuration(duration);
                    if (!expiredAt) {
                        await sendMessage(chatId, '❌ Format salah! Gunakan: 1d, 3d, 5d, 7d, 30d, atau 4m');
                        return res.status(200).json({ ok: true });
                    }
                    
                    const key = generateKey(10);
                    await redis.set(`key:${key}`, {
                        key: key,
                        createdAt: Date.now(),
                        expiredAt: expiredAt,
                        createdBy: update.message.from.username || 'unknown'
                    });
                    
                    const durationText = duration.endsWith('d') ? `${duration.slice(0,-1)} hari` : `${duration.slice(0,-1)} menit`;
                    await sendMessage(chatId,
                        `✅ *Key berhasil digenerate!*\n\n` +
                        `🔑 *Key:* \`${key}\`\n` +
                        `⏰ *Expired:* ${durationText} (${formatDate(expiredAt)})`
                    );
                }
                
                // /cekkey
                else if (text.startsWith('/cekkey')) {
                    const args = text.split(' ');
                    const cekKey = args[1];
                    
                    if (!cekKey) {
                        await sendMessage(chatId, '❌ Masukkan key! Contoh: /cekkey ABC123');
                        return res.status(200).json({ ok: true });
                    }
                    
                    const data = await redis.get(`key:${cekKey}`);
                    
                    if (!data) {
                        await sendMessage(chatId, `❌ Key \`${cekKey}\` tidak valid!`);
                    } else {
                        const expired = Date.now() > data.expiredAt;
                        const statusIcon = expired ? '❌' : '✅';
                        const statusText = expired ? 'EXPIRED' : 'ACTIVE';
                        await sendMessage(chatId,
                            `${statusIcon} *Status Key:*\n\n` +
                            `🔑 *Key:* \`${cekKey}\`\n` +
                            `⏰ *Expired:* ${formatDate(data.expiredAt)}\n` +
                            `📊 *Status:* ${statusText}\n` +
                            `👤 *Created by:* ${data.createdBy}`
                        );
                    }
                }
                
                // /delkey
                else if (text.startsWith('/delkey')) {
                    const args = text.split(' ');
                    const keyToDelete = args[1];
                    
                    if (!keyToDelete) {
                        await sendMessage(chatId, '❌ Masukkan key! Contoh: /delkey ABC123');
                        return res.status(200).json({ ok: true });
                    }
                    
                    const exists = await redis.exists(`key:${keyToDelete}`);
                    if (exists) {
                        await redis.del(`key:${keyToDelete}`);
                        await sendMessage(chatId, `✅ Key \`${keyToDelete}\` berhasil dihapus!`);
                    } else {
                        await sendMessage(chatId, `❌ Key \`${keyToDelete}\` tidak ditemukan!`);
                    }
                }
                
                // /listkey
                else if (text === '/listkey') {
                    const keys = await redis.keys('key:*');
                    
                    if (keys.length === 0) {
                        await sendMessage(chatId, '📭 Belum ada key yang digenerate.');
                    } else {
                        let message = '📋 *Daftar Keys:*\n\n';
                        let count = 0;
                        
                        for (const k of keys) {
                            if (count >= 15) break;
                            const data = await redis.get(k);
                            if (data) {
                                const expired = Date.now() > data.expiredAt;
                                const statusIcon = expired ? '❌' : '✅';
                                message += `${statusIcon} \`${data.key}\`\n`;
                                count++;
                            }
                        }
                        
                        if (keys.length > 15) {
                            message += `\n*...dan ${keys.length - 15} key lainnya*`;
                        }
                        
                        await sendMessage(chatId, message);
                    }
                }
                
                // Command ga dikenal
                else if (!text.startsWith('/')) {
                    await sendMessage(chatId, 'Gunakan /start untuk melihat daftar command');
                }
            }
            
            res.status(200).json({ ok: true });
        } catch (error) {
            console.error('Error:', error);
            res.status(200).json({ ok: false, error: error.message });
        }
        return;
    }
    
    res.status(405).json({ error: 'Method not allowed' });
};
