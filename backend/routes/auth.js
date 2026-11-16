const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const router = express.Router();

// Регистрация
router.post('/register', async (req, res) => {
    try {
        const { username, password, email } = req.body;

        // Проверка существующего пользователя
        const existingUser = await db.query(
            'SELECT * FROM users WHERE username = $1 OR email = $2',
            [username, email]
        );

        if (existingUser.rows.length > 0) {
            return res.status(400).json({ error: 'Пользователь уже существует' });
        }

        // Хэширование пароля
        const hashedPassword = await bcrypt.hash(password, 10);

        // Создание пользователя
        const result = await db.query(
            'INSERT INTO users (username, password_hash, email) VALUES ($1, $2, $3) RETURNING id, username, email',
            [username, hashedPassword, email]
        );

        const user = result.rows[0];

        // Генерация токена
        const token = jwt.sign(
            { id: user.id, username: user.username },
            process.env.JWT_SECRET,
            { expiresIn: '30d' }
        );

        res.json({ token, user });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Вход
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        // Поиск пользователя
        const result = await db.query(
            'SELECT * FROM users WHERE username = $1',
            [username]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Неверные данные' });
        }

        const user = result.rows[0];

        // Проверка пароля
        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) {
            return res.status(401).json({ error: 'Неверные данные' });
        }

        // Генерация токена
        const token = jwt.sign(
            { id: user.id, username: user.username },
            process.env.JWT_SECRET,
            { expiresIn: '30d' }
        );

        res.json({
            token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

module.exports = router;