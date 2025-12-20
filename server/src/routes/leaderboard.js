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

        // Calculate total hours for each user
        const leaderboard = await Promise.all(users.map(async (u, index) => {
            const totalSessions = await prisma.studySession.aggregate({
                _sum: { duration_seconds: true },
                where: { userId: u.id }
            });

            const totalSeconds = totalSessions._sum.duration_seconds || 0;
            const total_hours = (totalSeconds / 3600).toFixed(1);

            return {
                ...u,
                rank: index + 1,
                is_current_user: u.id === req.user.id,
                total_hours
            };
        }));

        res.json(leaderboard);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Server Error' });
    }
});

module.exports = router;
