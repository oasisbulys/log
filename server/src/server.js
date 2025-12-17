const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

/* =========================
   ✅ CORS — FIXED PROPERLY
   ========================= */
app.use(cors({
    origin: "https://study-app-lemon.vercel.app",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "x-auth-token"]
}));

// Allow preflight requests explicitly
app.options('*', cors());

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
    console.error(err.stack);
    res.status(500).json({ error: 'Internal Server Error' });
});

/* =========================
   Boot
   ========================= */
app.listen(PORT, () => {
    console.log(`SYSTEM ONLINE. LISTENING ON PORT ${PORT}`);
});
