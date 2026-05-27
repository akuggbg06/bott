import { Bot, webhookCallback } from 'grammy';

// 1. Baca Token (Pastikan nama variabelnya BOT_TOKEN)
const token = process.env.BOT_TOKEN;
if (!token) throw new Error("BOT_TOKEN environment variable not set.");

const bot = new Bot(token);

// 2. Command /start (Ini yang akan direspon)
bot.command("start", async (ctx) => {
    await ctx.reply("✅ **Bot Vercel Aktif!** \n\nWebhook bekerja dengan baik.", { parse_mode: "Markdown" });
});

// 3. Handler untuk Vercel (Ini yang menangani POST dari Telegram)
export default webhookCallback(bot, "std/http");
