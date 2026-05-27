const { Bot } = require('grammy');

const token = process.env.BOT_TOKEN;
if (!token) {
    console.error('BOT_TOKEN not set!');
}

const bot = new Bot(token);

// Command start
bot.command('start', async (ctx) => {
    await ctx.reply('✅ Bot hidup tod! Webhook bekerja!');
});

// Handler buat Vercel
module.exports = async (req, res) => {
    // Biar ga error pas di GET (browser)
    if (req.method === 'GET') {
        return res.status(200).json({ status: 'running', message: 'Bot is active' });
    }
    
    // Buat POST dari Telegram
    if (req.method === 'POST') {
        try {
            await bot.handleUpdate(req.body);
            res.status(200).json({ ok: true });
        } catch (error) {
            console.error(error);
            res.status(200).json({ ok: false, error: error.message });
        }
        return;
    }
    
    res.status(405).json({ error: 'Method not allowed' });
};
