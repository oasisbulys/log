const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

router.post('/end', auth, async (req, res) => {
  try {
    const {
      type,
      note,
      duration,
      rating,
      startTime,
      timeTag
    } = req.body;

    // Hard validation
    if (!duration || duration <= 0) {
      return res.status(400).json({ error: 'Invalid duration' });
    }

    // 1. Create study session
    const session = await prisma.studySession.create({
      data: {
        user: { connect: { id: req.user.id } },
        type: type || 'GENERAL',
        note: note || null,
        duration_seconds: duration,
        rating,
        time_window: timeTag,
        started_at: new Date(startTime)
      }
    });

    // 2. XP calculation
    const xpEarned = Math.floor(duration / 60);
    const hoursEarned = duration / 3600;

    await prisma.user.update({
      where: { id: req.user.id },
      data: {
        xp: { increment: xpEarned }
      }
    });

    // 3. Update quest progress
    const activeQuests = await prisma.questProgress.findMany({
      where: {
        userId: req.user.id,
        completed_at: null
      }
    });

    for (const q of activeQuests) {
      await prisma.questProgress.update({
        where: { id: q.id },
        data: {
          progress_hours: { increment: hoursEarned }
        }
      });
    }

    // 4. Activity log
    const hours = Math.floor(duration / 3600);
    const mins = Math.floor((duration % 3600) / 60);

    await prisma.activityLog.create({
      data: {
        user: { connect: { id: req.user.id } },
        type: 'STUDY',
        text: `completed ${hours > 0 ? `${hours}h ` : ''}${mins}m – ${type} (${rating})`
      }
    });

    res.json(session);
  } catch (err) {
    console.error('SESSION END ERROR:', err);
    res.status(500).json({ error: 'Failed to save session' });
  }
});

module.exports = router;
