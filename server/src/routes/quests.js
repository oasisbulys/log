const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// @route   GET /quests
// @desc    Get all active quests with user progress
router.get('/', auth, async (req, res) => {
    try {
        const quests = await prisma.quest.findMany({
            orderBy: { created_at: 'desc' }
        });

        const progress = await prisma.questProgress.findMany({
            where: { userId: req.user.id }
        });

        // Map progress to quests
        const result = quests.map(q => {
            const userProg = progress.find(p => p.questId === q.id);
            return {
                ...q,
                joined: !!userProg,
                progress_hours: userProg?.progress_hours || 0,
                completed_at: userProg?.completed_at || null
            };
        });

        res.json(result);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Server Error' });
    }
});

// @route   POST /quests/:id/join
// @desc    Join a quest
router.post('/:id/join', auth, async (req, res) => {
    try {
        const questId = parseInt(req.params.id);

        const existing = await prisma.questProgress.findUnique({
            where: {
                userId_questId: { userId: req.user.id, questId }
            }
        });

        if (existing) return res.status(400).json({ msg: 'Already joined' });

        const progress = await prisma.questProgress.create({
            data: {
                userId: req.user.id,
                questId
            }
        });

        // Log Activity
        const quest = await prisma.quest.findUnique({ where: { id: questId } });
        await prisma.activityLog.create({
            data: {
                userId: req.user.id,
                type: 'QUEST',
                text: `joined quest: ${quest.title}`
            }
        });

        res.json(progress);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Server Error' });
    }
});

// @route   POST /quests/:id/claim
// @desc    Claim reward for completed quest
router.post('/:id/claim', auth, async (req, res) => {
    try {
        const questId = parseInt(req.params.id);
        const progress = await prisma.questProgress.findUnique({
            where: { userId_questId: { userId: req.user.id, questId } }
        });
        const quest = await prisma.quest.findUnique({ where: { id: questId } });

        if (!progress) return res.status(404).json({ msg: 'Not joined' });
        if (progress.completed_at) return res.status(400).json({ msg: 'Already claimed' });

        // Strict Check: Server-side validation
        if (progress.progress_hours < quest.target_hours) {
            return res.status(400).json({ msg: 'Quest not complete' });
        }

        // Award
        await prisma.$transaction([
            prisma.questProgress.update({
                where: { id: progress.id },
                data: { completed_at: new Date() }
            }),
            prisma.user.update({
                where: { id: req.user.id },
                data: { xp: { increment: quest.xp_reward } }
            }),
            prisma.activityLog.create({
                data: {
                    userId: req.user.id,
                    type: 'QUEST',
                    text: `completed quest: ${quest.title} [+${quest.xp_reward} XP]`
                }
            })
        ]);

        res.json({ msg: 'Reward Claimed' });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Server Error' });
    }
});

module.exports = router;
