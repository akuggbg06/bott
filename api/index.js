const token = process.env.BOT_TOKEN;

module.exports = async (req, res) => {
    // Biar ga error pas di GET dari browser
    if (req.method === 'GET') {
        return res.status(200).json({ status: 'running', note: 'Bot is alive' });
    }
    
    // Cuma terima POST dari Telegram
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    
    try {
        const update = req.body;
        
        // Cek kalo ada pesan
        if (update.message && update.message.text) {
            const chatId = update.message.chat.id;
            const text = update.message.text;
            
            // Respon sesuai perintah
            if (text === '/start') {
                await sendMessage(chatId, '✅ Bot hidup tod! Webhook bekerja!');
            } else if (text === '/ping') {
                await sendMessage(chatId, 'Pong!');
            } else {
                await sendMessage(chatId, 'Gunakan /start untuk memulai');
            }
        }
        
        res.status(200).json({ ok: true });
    } catch (error) {
        console.error(error);
        res.status(200).json({ ok: false });
    }
};

// Fungsi buat kirim pesan ke Telegram
async function sendMessage(chatId, text) {
    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text: text })
    });
    return response.json();
    }
