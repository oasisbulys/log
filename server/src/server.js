const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

/* =========================
    CORS — DOMAIN SAFE
   ========================= */

const allowedOrigins = new Set([
    'https://study-app-lemon.vercel.app',
    'https://uncertanity.com',
    'https://www.uncertanity.com'
]);

app.use((req, res, next) => {
    const origin = req.headers.origin;

    if (allowedOrigins.has(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-auth-token');
    }

    // Handle preflight
    if (req.method === 'OPTIONS') {
        return res.sendStatus(204);
    }

    next();
});

/* =========================
   Middleware
   ========================= */

app.use(express.json());

/* =========================
   Static Uploads
   ========================= */

const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

app.use('/uploads', express.static(uploadsDir));

/* =========================
   Routes
   ========================= */

app.use('/auth', require('./routes/auth'));
app.use('/me', require('./routes/profile'));
app.use('/activity', require('./routes/activity'));
app.use('/sessions', require('./routes/sessions'));
app.use('/quests', require('./routes/quests'));
app.use('/leaderboard', require('./routes/leaderboard'));

app.get('/', (req, res) => {
    res.json({ message: 'Retro Study OS System Online' });
});

/* =========================
   Global Error Handler
   ========================= */

app.use((err, req, res, next) => {
    console.error('SERVER ERROR:', err);
    res.status(500).json({ error: 'Internal Server Error' });
});

/* =========================
   Boot
   ========================= */

app.listen(PORT, () => {
    console.log(`SYSTEM ONLINE. LISTENING ON PORT ${PORT}`);
});
