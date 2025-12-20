const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { PrismaClient } = require('@prisma/client');
const multer = require('multer');
const path = require('path');

const prisma = new PrismaClient();

// Multer Config
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, './uploads/');
    },
    filename: function (req, file, cb) {
        cb(null, `avatar-${req.user.id}-${Date.now()}${path.extname(file.originalname)}`);
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 2000000 }, // 2MB limit
    fileFilter: function (req, file, cb) {
        const filetypes = /jpeg|jpg|png|gif/;
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = filetypes.test(file.mimetype);

        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb('Error: Images Only!');
        }
    }
});

// @route   GET /me
// @desc    Get current user profile
router.get('/', auth, async (req, res) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
            select: {
                id: true,
                username: true,
                avatar_url: true,
                xp: true,
                rank: true,
                streak: true,
                created_at: true
            }
        });

        // Aggregation: Valid Truth
        const totalSessions = await prisma.studySession.aggregate({
            _sum: { duration_seconds: true },
            where: { userId: req.user.id }
        });

        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);

        const todaySessions = await prisma.studySession.aggregate({
            _sum: { duration_seconds: true },
            where: {
                userId: req.user.id,
                created_at: { gte: startOfToday }
            }
        });

        // Convert to hours (1 decimal place)
        const totalSeconds = totalSessions._sum.duration_seconds || 0;
        const todaySeconds = todaySessions._sum.duration_seconds || 0;

        user.total_hours = (totalSeconds / 3600).toFixed(1);
        user.today_hours = (todaySeconds / 3600).toFixed(1);

        // Sync Rank with Database (One Piece System)
        const calculateRank = (xp) => {
            if (xp >= 100000) return 'PIRATE KING';
            if (xp >= 50000) return 'YONKO';
            if (xp >= 25000) return 'YONKO COMMANDER';
            if (xp >= 10000) return 'SHICHIBUKAI';
            return 'SUPERNOVA';
        };

        const currentRank = calculateRank(user.xp || 0);
        if (user.rank !== currentRank) {
            await prisma.user.update({
                where: { id: req.user.id },
                data: { rank: currentRank }
            });
            user.rank = currentRank;
        }

        res.json(user);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Server Error' });
    }
});

// @route   PUT /me/avatar
// @desc    Upload avatar
router.put('/avatar', [auth, upload.single('avatar')], async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ msg: 'No file uploaded' });
        }

        const avatarUrl = `/uploads/${req.file.filename}`;

        const user = await prisma.user.update({
            where: { id: req.user.id },
            data: { avatar_url: avatarUrl },
            select: {
                id: true,
                username: true,
                avatar_url: true
            }
        });

        res.json(user);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
