const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
  origin: "https://study-app-lemon.vercel.app",
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(express.json());

app.use('/auth', require('./routes/auth'));
app.use('/me', require('./routes/profile'));
app.use('/activity', require('./routes/activity'));
app.use('/sessions', require('./routes/sessions'));
app.use('/quests', require('.//routes/quests'));
app.use('/leaderboard', require('./routes/leaderboard'));

app.get('/', (req, res) => {
  res.json({ message: 'Retro Study OS System Online' });
});

app.listen(PORT, () => {
  console.log(`SYSTEM ONLINE. LISTENING ON PORT ${PORT}`);
});
