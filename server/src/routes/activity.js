const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { PrismaClient } = require('@prisma/client');
const multer = require('multer');
const path = require('path');

const prisma = new PrismaClient();

// Multer for Proofs
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, './uploads/');
    },
    filename: function (req, file, cb) {
        cb(null, `proof-${req.user.id}-${Date.now()}${path.extname(file.originalname)}`);
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 2000000 },
    fileFilter: function (req, file, cb) {
        const filetypes = /jpeg|jpg|png|gif/;
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = filetypes.test(file.mimetype);
        if (mimetype && extname) return cb(null, true);
        cb('Error: Images Only!');
    }
});

// @route   GET /activity
// @desc    Get global activity log
router.get('/', async (req, res) => {
    try {
        const logs = await prisma.activityLog.findMany({
            take: 20,
            orderBy: { created_at: 'desc' },
            include: {
                user: {
                    select: { username: true, avatar_url: true }
                },
                comments: {
                    include: {
                        user: {
                            select: { username: true }
                        }
                    },
                    orderBy: { created_at: 'asc' }
                }
            }
        });
        res.json(logs);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Server Error' });
    }
});

// @route   POST /activity/:id/comments
// @desc    Add comment
router.post('/:id/comments', auth, async (req, res) => {
    try {
        const { text } = req.body;
        if (!text || !text.trim() || text.length > 100) {
            return res.status(400).json({ error: 'Text required (max 100 chars)' });
        }

        const comment = await prisma.comment.create({
            data: {
                activityLogId: parseInt(req.params.id),
                userId: req.user.id,
                text: text
            },
            include: {
                user: {
                    select: { username: true }
                }
            }
        });

        res.json(comment);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Server Error' });
    }
});

// @route   POST /activity/proof
// @desc    Post proof
router.post('/proof', [auth, upload.single('image')], async (req, res) => {
    try {
        const { text } = req.body;
        let imageUrl = null;

        if (req.file) {
            imageUrl = `/uploads/${req.file.filename}`;
        }

        const log = await prisma.activityLog.create({
            data: {
                userId: req.user.id,
                type: 'PROOF',
                text: text,
                image_url: imageUrl
            },
            include: { user: { select: { username: true } } }
        });

        res.json(log);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
