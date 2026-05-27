const { Bot } = require('grammy');
const { Redis } = require('@upstash/redis');

// Konek ke Redis (Upstash)
const redis = Redis.fromEnv();
const bot = new Bot(process.env.BOT_TOKEN);

// Generate random key
function generateKey(length = 8) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

// Parse durasi (1d, 3d, 5d, 7d, 30d, 4m)
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

// ========== COMMAND TELEGRAM ==========

// /start
bot.command('start', async (ctx) => {
    await ctx.reply(
        `🤖 *AIDE Pro Key Bot v1.0*\n\n` +
        `📋 *Commands:*\n` +
        `/gen <duration> - Generate key (1d/3d/5d/7d/30d/4m)\n` +
        `/delkey <key> - Delete key\n` +
        `/listkey - Lihat semua key\n` +
        `/cekkey <key> - Cek status key\n\n` +
        `📝 *Contoh:*\n` +
        `/gen 7d\n` +
        `/gen 4m`,
        { parse_mode: 'Markdown' }
    );
});

// /gen
bot.command('gen', async (ctx) => {
    const args = ctx.message.text.split(' ');
    const duration = args[1];
    
    if (!duration) {
        await ctx.reply('❌ Masukkan durasi! Contoh: /gen 7d');
        return;
    }
    
    const expiredAt = parseDuration(duration);
    if (!expiredAt) {
        await ctx.reply('❌ Format salah! Gunakan: 1d, 3d, 5d, 7d, 30d, atau 4m');
        return;
    }
    
    const key = generateKey(10);
    const createdBy = ctx.from.username || ctx.from.first_name || 'unknown';
    
    await redis.set(`key:${key}`, {
        key: key,
        createdAt: Date.now(),
        expiredAt: expiredAt,
        createdBy: createdBy
    });
    
    const durationText = duration.endsWith('d') ? `${duration.slice(0,-1)} hari` : `${duration.slice(0,-1)} menit`;
    
    await ctx.reply(
        `✅ *Key berhasil digenerate!*\n\n` +
        `🔑 *Key:* \`${key}\`\n` +
        `⏰ *Expired:* ${durationText} (${formatDate(expiredAt)})`,
        { parse_mode: 'Markdown' }
    );
});

// /delkey
bot.command('delkey', async (ctx) => {
    const args = ctx.message.text.split(' ');
    const keyToDelete = args[1];
    
    if (!keyToDelete) {
        await ctx.reply('❌ Masukkan key! Contoh: /delkey ABC123');
        return;
    }
    
    const exists = await redis.exists(`key:${keyToDelete}`);
    if (exists) {
        await redis.del(`key:${keyToDelete}`);
        await ctx.reply(`✅ Key \`${keyToDelete}\` berhasil dihapus!`, { parse_mode: 'Markdown' });
    } else {
        await ctx.reply(`❌ Key \`${keyToDelete}\` tidak ditemukan!`, { parse_mode: 'Markdown' });
    }
});

// /listkey
bot.command('listkey', async (ctx) => {
    const keys = await redis.keys('key:*');
    
    if (keys.length === 0) {
        await ctx.reply('📭 Belum ada key yang digenerate.');
        return;
    }
    
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
    
    await ctx.reply(message, { parse_mode: 'Markdown' });
});

// /cekkey
bot.command('cekkey', async (ctx) => {
    const args = ctx.message.text.split(' ');
    const cekKey = args[1];
    
    if (!cekKey) {
        await ctx.reply('❌ Masukkan key! Contoh: /cekkey ABC123');
        return;
    }
    
    const data = await redis.get(`key:${cekKey}`);
    
    if (!data) {
        await ctx.reply(`❌ Key \`${cekKey}\` tidak valid!`, { parse_mode: 'Markdown' });
        return;
    }
    
    const expired = Date.now() > data.expiredAt;
    const statusIcon = expired ? '❌' : '✅';
    const statusText = expired ? 'EXPIRED' : 'ACTIVE';
    
    await ctx.reply(
        `${statusIcon} *Status Key:*\n\n` +
        `🔑 *Key:* \`${cekKey}\`\n` +
        `⏰ *Expired:* ${formatDate(data.expiredAt)}\n` +
        `📊 *Status:* ${statusText}\n` +
        `👤 *Created by:* ${data.createdBy}`,
        { parse_mode: 'Markdown' }
    );
});

// ========== WEBHOOK HANDLER BUAT VERCEL ==========
module.exports = async (req, res) => {
    // Endpoint GET buat APK AIDE Pro (validasi key)
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
    
    // Endpoint GET biasa (cek status)
    if (req.method === 'GET') {
        return res.status(200).json({ 
            status: 'running', 
            bot: 'AIDE Pro Key Bot',
            endpoints: {
                validate: 'GET ?key=YOUR_KEY'
            }
        });
    }
    
    // Endpoint POST buat Telegram webhook
    if (req.method === 'POST') {
        try {
            await bot.handleUpdate(req.body);
            res.status(200).json({ ok: true });
        } catch (error) {
            console.error('Error handling update:', error);
            res.status(200).json({ ok: false, error: error.message });
        }
        return;
    }
    
    res.status(405).json({ error: 'Method not allowed' });
};
