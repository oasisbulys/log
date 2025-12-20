const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// @route   POST /auth/register
// @desc    Register a new user
router.post('/register', async (req, res) => {
    const { username, passphrase } = req.body;

    if (!username || !passphrase) {
        return res.status(400).json({ msg: 'Please enter all fields' });
    }

    try {
        let user = await prisma.user.findUnique({
            where: { username }
        });

        if (user) {
            return res.status(400).json({ msg: 'User already exists' });
        }

        const salt = await bcrypt.genSalt(10);
        const passphrase_hash = await bcrypt.hash(passphrase, salt);

        user = await prisma.user.create({
            data: {
                username,
                passphrase_hash,
                xp: 0,
                rank: 'SUPERNOVA',
                streak: 0
            }
        });

        const payload = {
            user: {
                id: user.id
            }
        };

        jwt.sign(
            payload,
            process.env.JWT_SECRET,
            { expiresIn: '7d' },
            (err, token) => {
                if (err) throw err;
                res.json({ token, user: { id: user.id, username: user.username } });
            }
        );
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Server Error' });
    }
});

// @route   POST /auth/login
// @desc    Login user & get token
router.post('/login', async (req, res) => {
    const { username, passphrase } = req.body;

    if (!username || !passphrase) {
        return res.status(400).json({ msg: 'Please enter all fields' });
    }

    try {
        const user = await prisma.user.findUnique({
            where: { username }
        });

        if (!user) {
            return res.status(400).json({ msg: 'Invalid Credentials' });
        }

        const isMatch = await bcrypt.compare(passphrase, user.passphrase_hash);

        if (!isMatch) {
            return res.status(400).json({ msg: 'Invalid Credentials' });
        }

        const payload = {
            user: {
                id: user.id
            }
        };

        jwt.sign(
            payload,
            process.env.JWT_SECRET,
            { expiresIn: '7d' },
            (err, token) => {
                if (err) throw err;
                res.json({ token, user: { id: user.id, username: user.username } });
            }
        );
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
