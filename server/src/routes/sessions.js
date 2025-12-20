const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

/**
 * POST /sessions/end
 * Ends a study session and saves it
 */
router.post('/end', auth, async (req, res) => {
  try {
    const {
      subject,
      intent,
      duration,
      timeWindow
    } = req.body;

    // Hard validation
    if (!duration || duration <= 0) {
      return res.status(400).json({ error: 'Invalid duration' });
    }

    // Sanitize intent input
    const sanitizedIntent = (intent || 'STUDY').replace(/[<>]/g, '');
    const sanitizedSubject = (subject || 'General').replace(/[<>]/g, '');

    // XP calculation: 100 XP per hour (consistent with quest rewards)
    const hoursEarned = duration / 3600;
    const xpEarned = Math.floor(hoursEarned * 100);

    // Execute all updates atomically
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create study session
      const session = await tx.studySession.create({
        data: {
          userId: req.user.id,
          subject: sanitizedSubject,
          intent: sanitizedIntent,
          duration_seconds: duration,
          time_window: timeWindow || null
        }
      });

      // 2. Update user XP
      await tx.user.update({
        where: { id: req.user.id },
        data: {
          xp: { increment: xpEarned }
        }
      });

      // 2.5 Recalculate Rank
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

      // 3. Update all active quest progress
      const activeQuests = await tx.questProgress.findMany({
        where: {
          userId: req.user.id,
          completed_at: null
        }
      });

      // Batch update quest progress
      for (const q of activeQuests) {
        await tx.questProgress.update({
          where: { id: q.id },
          data: {
            progress_hours: { increment: hoursEarned }
          }
        });
      }

      // 4. Create activity log
      const hours = Math.floor(duration / 3600);
      const mins = Math.floor((duration % 3600) / 60);

      await tx.activityLog.create({
        data: {
          userId: req.user.id,
          type: 'STUDY',
          text: `completed ${hours > 0 ? `${hours}h ` : ''}${mins}m – ${sanitizedIntent}`
        }
      });

      return session;
    });

    res.json(result);
  } catch (err) {
    console.error('SESSION END ERROR:', err);
    res.status(500).json({ error: 'Failed to save session' });
  }
});

module.exports = router;
