const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// @route   GET /leaderboard
// @desc    Get top users by XP
router.get('/', auth, async (req, res) => {
    try {
        const users = await prisma.user.findMany({
            take: 10,
            orderBy: { xp: 'desc' },
            select: {
                id: true,
                username: true,
                xp: true,
                streak: true,
                avatar_url: true
            }
        });

        // Add rank
        const leaderboard = users.map((u, index) => ({
            ...u,
            rank: index + 1,
            is_current_user: u.id === req.user.id
        }));

        res.json(leaderboard);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Server Error' });
    }
});

module.exports = router;
