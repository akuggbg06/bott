const { Bot } = require('grammy');

const bot = new Bot(process.env.BOT_TOKEN);

bot.command('start', async (ctx) => {
  await ctx.reply('✅ Bot hidup tod!');
});

bot.command('ping', async (ctx) => {
  await ctx.reply('Pong!');
});

module.exports = async (req, res) => {
  if (req.method === 'POST') {
    await bot.handleUpdate(req.body);
    res.status(200).json({ ok: true });
  } else {
    res.status(200).json({ status: 'running' });
  }
};
