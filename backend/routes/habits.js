const express = require('express');
const db = require('../db');
const auth = require('../middleware/auth');
const router = express.Router();

// Получить все привычки пользователя
router.get('/', auth, async (req, res) => {
    try {
        const r = await db.query(
            `SELECT h.*, 
             COUNT(hl.id) FILTER (WHERE hl.completed = true) as total_completed,
             COUNT(hl.id) as total_days
             FROM habits h 
             LEFT JOIN habit_logs hl ON h.id = hl.habit_id
             WHERE h.user_id = $1 OR h.is_shared = true
             GROUP BY h.id
             ORDER BY h.created_at DESC`,
            [req.user.id]
        );
        res.json(r.rows);
    } catch (e) { console.error(e); res.status(500).json({ error: 'Ошибка' }); }
});

// Создать привычку
router.post('/', auth, async (req, res) => {
    try {
        const { title, description, color, is_shared } = req.body;
        const r = await db.query(
            `INSERT INTO habits (user_id, title, description, color, is_shared) 
             VALUES ($1, $2, $3, $4, $5) RETURNING *`,
            [req.user.id, title, description, color, is_shared]
        );
        res.json(r.rows[0]);
    } catch (e) { console.error(e); res.status(500).json({ error: 'Ошибка' }); }
});

// Отметить привычку за дату
router.post('/log', auth, async (req, res) => {
    try {
        const { habit_id, log_date, completed } = req.body;
        const r = await db.query(
            `INSERT INTO habit_logs (habit_id, user_id, log_date, completed) 
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (habit_id, user_id, log_date) 
             DO UPDATE SET completed = $4
             RETURNING *`,
            [habit_id, req.user.id, log_date, completed]
        );
        res.json(r.rows[0]);
    } catch (e) { console.error(e); res.status(500).json({ error: 'Ошибка' }); }
});

// Получить логи привычек за период
router.get('/logs', auth, async (req, res) => {
    try {
        const { start_date, end_date } = req.query;
        const r = await db.query(
            `SELECT hl.*, h.title, h.color
             FROM habit_logs hl
             JOIN habits h ON hl.habit_id = h.id
             WHERE hl.user_id = $1 
             AND hl.log_date BETWEEN $2 AND $3
             ORDER BY hl.log_date DESC`,
            [req.user.id, start_date, end_date]
        );
        res.json(r.rows);
    } catch (e) { console.error(e); res.status(500).json({ error: 'Ошибка' }); }
});

// Удалить привычку
router.delete('/:id', auth, async (req, res) => {
    try {
        const r = await db.query(
            'DELETE FROM habits WHERE id = $1 AND user_id = $2 RETURNING id',
            [req.params.id, req.user.id]
        );
        if (r.rows.length === 0) return res.status(404).json({ error: 'Не найдено' });
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: 'Ошибка' }); }
});

module.exports = router;
