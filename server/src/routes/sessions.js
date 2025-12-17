const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// @route   POST /sessions/end
// @desc    End a session (Client sends calculated data for v1 simplicity, though server validation preferred later)
router.post('/end', auth, async (req, res) => {
    const { subject, intent, duration, rating, timeWindow } = req.body;

    // Basic Validation: Ensure meaningful duration
    if (!duration || duration < 1) {
        return res.status(400).json({ msg: 'Invalid duration' });
    }

    try {
        // 1. Create Session Record
        const session = await prisma.studySession.create({
            data: {
                userId: req.user.id,
                subject: subject || 'General',
                intent: intent,
                duration_seconds: duration,
                time_window: timeWindow
            }
        });

        // 2. Update User Stats (XP, Streak - mock logic for now)
        // Simple XP: 1 XP per minute
        const xpEarned = Math.floor(duration / 60);
        const hoursEarned = duration / 3600;

        await prisma.user.update({
            where: { id: req.user.id },
            data: {
                xp: { increment: xpEarned }
                // Streak logic would go here
            }
        });

        // 2a. Update Quest Progress
        // Find active quests for user
        const activeProgress = await prisma.questProgress.findMany({
            where: {
                userId: req.user.id,
                completed_at: null
            }
        });

        for (const p of activeProgress) {
            await prisma.questProgress.update({
                where: { id: p.id },
                data: { progress_hours: { increment: hoursEarned } }
            });
        }

        // 3. Create Activity Log Entry
        const hours = Math.floor(duration / 3600);
        const mins = Math.floor((duration % 3600) / 60);
        let timeStr = "";
        if (hours > 0) timeStr += `${hours}h `;
        timeStr += `${mins}m`;

        await prisma.activityLog.create({
            data: {
                userId: req.user.id,
                type: 'STUDY',
                text: `completed ${timeStr} – ${intent} (${rating})`
            }
        });

        res.json(session);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Server Error' });
    }
});

module.exports = router;
