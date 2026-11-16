const express = require('express');
const db = require('../db');
const auth = require('../middleware/auth');
const router = express.Router();

// Получить задачи
router.get('/', auth, async (req, res) => {
    try {
        const { filter } = req.query;
        const userId = req.user.id;

        let query;
        let params;

        if (filter === 'my') {
            // Только мои личные задачи
            query = `
                SELECT t.*, u.username as assignee_name 
                FROM tasks t 
                LEFT JOIN users u ON t.assignee_id = u.id
                WHERE t.user_id = $1 AND t.is_shared = false AND t.is_done = false
                ORDER BY t.due_date ASC NULLS LAST
            `;
            params = [userId];
        } else if (filter === 'shared') {
            // Общие задачи
            query = `
                SELECT t.*, u.username as assignee_name 
                FROM tasks t 
                LEFT JOIN users u ON t.assignee_id = u.id
                WHERE t.is_shared = true AND t.is_done = false
                ORDER BY t.due_date ASC NULLS LAST
            `;
            params = [];
        } else if (filter === 'done') {
            // Выполненные задачи
            query = `
                SELECT t.*, u.username as assignee_name 
                FROM tasks t 
                LEFT JOIN users u ON t.assignee_id = u.id
                WHERE (t.user_id = $1 OR t.is_shared = true) AND t.is_done = true
                ORDER BY t.updated_at DESC
            `;
            params = [userId];
        } else {
            // Все задачи (мои + общие)
            query = `
                SELECT t.*, u.username as assignee_name 
                FROM tasks t 
                LEFT JOIN users u ON t.assignee_id = u.id
                WHERE (t.user_id = $1 OR t.is_shared = true) AND t.is_done = false
                ORDER BY t.due_date ASC NULLS LAST
            `;
            params = [userId];
        }

        const result = await db.query(query, params);
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Создать задачу
router.post('/', auth, async (req, res) => {
    try {
        const { title, description, is_shared, assignee_id, due_date } = req.body;
        const userId = req.user.id;

        const result = await db.query(
            `INSERT INTO tasks (user_id, title, description, is_shared, assignee_id, due_date) 
             VALUES ($1, $2, $3, $4, $5, $6) 
             RETURNING *`,
            [userId, title, description, is_shared, assignee_id, due_date]
        );

        const task = result.rows[0];

        // TODO: Здесь можно отправить push-уведомление

        res.json(task);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Обновить задачу
router.put('/:id', auth, async (req, res) => {
    try {
        const { id } = req.params;
        const { title, description, is_shared, assignee_id, due_date, is_done } = req.body;
        const userId = req.user.id;

        const result = await db.query(
            `UPDATE tasks 
             SET title = $1, description = $2, is_shared = $3, assignee_id = $4, 
                 due_date = $5, is_done = $6, updated_at = NOW()
             WHERE id = $7 AND (user_id = $8 OR is_shared = true)
             RETURNING *`,
            [title, description, is_shared, assignee_id, due_date, is_done, id, userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Задача не найдена' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Удалить задачу
router.delete('/:id', auth, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const result = await db.query(
            'DELETE FROM tasks WHERE id = $1 AND (user_id = $2 OR is_shared = true) RETURNING id',
            [id, userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Задача не найдена' });
        }

        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Получить всех пользователей (для назначения задач)
router.get('/users', auth, async (req, res) => {
    try {
        const result = await db.query('SELECT id, username FROM users');
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

module.exports = router;