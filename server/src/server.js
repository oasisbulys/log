const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// 🔥 CORS — must be FIRST
const corsOptions = {
  origin: [
    "https://study-app-lemon.vercel.app",
    "http://localhost:3000",
    "http://localhost:5173"
  ],
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true
};

app.use(cors(corsOptions));

// 🔥 THIS LINE IS WHAT YOU WERE MISSING
app.options('*', cors(corsOptions));

app.use(express.json());

// Static Uploads
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}
app.use('/uploads', express.static(uploadsDir));

// Routes
app.use('/auth', require('./routes/auth'));
app.use('/me', require('./routes/profile'));
app.use('/activity', require('./routes/activity'));
app.use('/sessions', require('./routes/sessions'));
app.use('/quests', require('./routes/quests'));
app.use('/leaderboard', require('./routes/leaderboard'));

app.get('/', (req, res) => {
  res.json({ message: 'Retro Study OS System Online' });
});

// Error handler LAST
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal Server Error' });
});

app.listen(PORT, () => {
  console.log(`SYSTEM ONLINE. LISTENING ON PORT ${PORT}`);
});
