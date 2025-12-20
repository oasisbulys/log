const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

/*
|--------------------------------------------------------------------------
| GET /quests
| Get all quests with user progress
|--------------------------------------------------------------------------
*/
router.get('/', auth, async (req, res) => {
    try {
        const quests = await prisma.quest.findMany({
            orderBy: { created_at: 'desc' }
        });

        const progress = await prisma.questProgress.findMany({
            where: { userId: req.user.id }
        });

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
        console.error('GET /quests ERROR:', err);
        res.status(500).json({ error: 'Server Error' });
    }
});

/*
|--------------------------------------------------------------------------
| POST /quests
| Create a new quest  <-- THIS WAS MISSING
|--------------------------------------------------------------------------
*/
router.post('/', auth, async (req, res) => {
    try {
        const { title, description, target_hours } = req.body;

        if (!title || !target_hours || target_hours <= 0) {
            return res.status(400).json({ error: 'Invalid quest data' });
        }

        // Sanitize user input
        const sanitizedTitle = title.replace(/[<>]/g, '').trim();
        const sanitizedDescription = (description || title).replace(/[<>]/g, '').trim();

        const quest = await prisma.quest.create({
            data: {
                title: sanitizedTitle,
                description: sanitizedDescription,
                target_hours,
                xp_reward: Math.floor(target_hours * 100)
            }
        });

        // Activity log
        await prisma.activityLog.create({
            data: {
                userId: req.user.id,
                type: 'QUEST',
                text: `created quest: ${sanitizedTitle}`
            }
        });

        res.json(quest);
    } catch (err) {
        console.error('POST /quests ERROR:', err);
        res.status(500).json({ error: 'Server Error' });
    }
});

/*
|--------------------------------------------------------------------------
| POST /quests/:id/join
| Join a quest
|--------------------------------------------------------------------------
*/
router.post('/:id/join', auth, async (req, res) => {
    try {
        const questId = parseInt(req.params.id, 10);

        const existing = await prisma.questProgress.findUnique({
            where: {
                userId_questId: {
                    userId: req.user.id,
                    questId
                }
            }
        });

        if (existing) {
            return res.status(400).json({ msg: 'Already joined' });
        }

        const progress = await prisma.questProgress.create({
            data: {
                userId: req.user.id,
                questId,
                progress_hours: 0
            }
        });

        const quest = await prisma.quest.findUnique({
            where: { id: questId }
        });

        if (!quest) {
            return res.status(404).json({ msg: 'Quest not found' });
        }

        // Sanitize quest title for activity log
        const sanitizedTitle = quest.title.replace(/[<>]/g, '');

        await prisma.activityLog.create({
            data: {
                userId: req.user.id,
                type: 'QUEST',
                text: `joined quest: ${sanitizedTitle}`
            }
        });

        res.json(progress);
    } catch (err) {
        console.error('JOIN QUEST ERROR:', err);
        res.status(500).json({ error: 'Server Error' });
    }
});

/*
|--------------------------------------------------------------------------
| POST /quests/:id/claim
| Claim quest reward
|--------------------------------------------------------------------------
*/
router.post('/:id/claim', auth, async (req, res) => {
    try {
        const questId = parseInt(req.params.id, 10);

        // Validate quest exists first
        const quest = await prisma.quest.findUnique({
            where: { id: questId }
        });

        if (!quest) {
            return res.status(404).json({ msg: 'Quest not found' });
        }

        const progress = await prisma.questProgress.findUnique({
            where: {
                userId_questId: {
                    userId: req.user.id,
                    questId
                }
            }
        });

        if (!progress) {
            return res.status(404).json({ msg: 'Not joined' });
        }

        if (progress.completed_at) {
            return res.status(400).json({ msg: 'Already claimed' });
        }

        if (progress.progress_hours < quest.target_hours) {
            return res.status(400).json({ msg: 'Quest not complete' });
        }

        // Use atomic conditional update to prevent race condition
        const updateResult = await prisma.$transaction(async (tx) => {
            // Try to update only if not already claimed (race condition prevention)
            const updated = await tx.questProgress.updateMany({
                where: {
                    id: progress.id,
                    completed_at: null // Only update if still unclaimed
                },
                data: { completed_at: new Date() }
            });

            // If no rows updated, someone else claimed it first
            if (updated.count === 0) {
                throw new Error('ALREADY_CLAIMED');
            }

            // Grant XP
            await tx.user.update({
                where: { id: req.user.id },
                data: {
                    xp: { increment: quest.xp_reward }
                }
            });

            // Recalculate Rank
            const updatedUser = await tx.user.findUnique({ where: { id: req.user.id } });
            const calculateRank = (xp) => {
                if (xp >= 100000) return 'PIRATE KING';
                if (xp >= 50000) return 'YONKO';
                if (xp >= 25000) return 'YONKO COMMANDER';
                if (xp >= 10000) return 'SHICHIBUKAI';
                return 'SUPERNOVA';
            };
            const newRank = calculateRank(updatedUser.xp);
            if (updatedUser.rank !== newRank) {
                await tx.user.update({
                    where: { id: req.user.id },
                    data: { rank: newRank }
                });
            }

            // Sanitize quest title for activity log
            const sanitizedTitle = quest.title.replace(/[<>]/g, '');

            // Create activity log
            await tx.activityLog.create({
                data: {
                    userId: req.user.id,
                    type: 'QUEST',
                    text: `completed quest: ${sanitizedTitle} [+${quest.xp_reward} XP]`
                }
            });

            return true;
        });

        res.json({ msg: 'Reward claimed' });
    } catch (err) {
        if (err.message === 'ALREADY_CLAIMED') {
            return res.status(400).json({ msg: 'Already claimed' });
        }
        console.error('CLAIM QUEST ERROR:', err);
        res.status(500).json({ error: 'Server Error' });
    }
});

module.exports = router;
