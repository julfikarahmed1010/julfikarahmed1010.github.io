const express = require('express');
const cors = require('cors');
const supabase = require('./db');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// সার্ভার ঠিকঠাক চলছে কিনা চেক করার রুট
app.get('/', (req, res) => {
    res.send('Fruit Catcher Backend is Running Successfully!');
});

// ১. ইউজার লগইন বা প্রোফাইল চেক এপিআই
app.post('/api/user/login', async (req, res) => {
    const { telegram_id, username } = req.body;
    if (!telegram_id) return res.status(400).json({ error: 'Telegram ID is required' });

    try {
        let { data: user, error } = await supabase
            .from('users')
            .select('*')
            .eq('telegram_id', telegram_id)
            .single();

        if (error && error.code === 'PGRST116') {
            // নতুন ইউজার হলে ডাটাবেসে এন্ট্রি করা
            const { data: newUser, error: createError } = await supabase
                .from('users')
                .insert([{ telegram_id, username, coins: 0, tickets: 5, gold: 0 }])
                .select()
                .single();

            if (createError) throw createError;
            return res.json({ message: 'Welcome new user!', user: newUser });
        } else if (error) {
            throw error;
        }
        res.json({ message: 'Welcome back!', user });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ২. গেম শেষে ব্যালেন্স আপডেট করার এপিআই
app.post('/api/user/update-balance', async (req, res) => {
    const { telegram_id, coins_earned, tickets_used } = req.body;
    try {
        let { data: user, error } = await supabase
            .from('users')
            .select('coins, tickets')
            .eq('telegram_id', telegram_id)
            .single();

        if (error) throw error;

        const newCoins = Number(user.coins) + Number(coins_earned);
        const newTickets = Number(user.tickets) - Number(tickets_used);

        const { data: updatedUser, error: updateError } = await supabase
            .from('users')
            .update({ coins: newCoins, tickets: newTickets })
            .eq('telegram_id', telegram_id)
            .select()
            .single();

        if (updateError) throw updateError;
        res.json({ message: 'Balance updated successfully', user: updatedUser });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
