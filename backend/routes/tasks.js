const express = require('express');
const db = require('../db');
const auth = require('../middleware/auth');
const router = express.Router();

router.get('/', auth, async (req, res) => {
    try {
        const { filter, include_done } = req.query;
        const uid = req.user.id;
        let q, p;
        
        if (filter === 'my') {
            if (include_done === 'true') {
                q = `SELECT t.*, u.username as assignee_name FROM tasks t LEFT JOIN users u ON t.assignee_id=u.id WHERE t.user_id=$1 AND t.is_shared=false ORDER BY t.is_done ASC, t.due_date ASC NULLS LAST`;
            } else {
                q = `SELECT t.*, u.username as assignee_name FROM tasks t LEFT JOIN users u ON t.assignee_id=u.id WHERE t.user_id=$1 AND t.is_shared=false AND t.is_done=false ORDER BY t.due_date ASC NULLS LAST`;
            }
            p = [uid];
        } else if (filter === 'shared') {
            if (include_done === 'true') {
                q = `SELECT t.*, u.username as assignee_name FROM tasks t LEFT JOIN users u ON t.assignee_id=u.id WHERE t.is_shared=true ORDER BY t.is_done ASC, t.due_date ASC NULLS LAST`;
            } else {
                q = `SELECT t.*, u.username as assignee_name FROM tasks t LEFT JOIN users u ON t.assignee_id=u.id WHERE t.is_shared=true AND t.is_done=false ORDER BY t.due_date ASC NULLS LAST`;
            }
            p = [];
        } else if (filter === 'done') {
            q = `SELECT t.*, u.username as assignee_name FROM tasks t LEFT JOIN users u ON t.assignee_id=u.id WHERE (t.user_id=$1 OR t.is_shared=true) AND t.is_done=true ORDER BY t.updated_at DESC`;
            p = [uid];
        } else {
            if (include_done === 'true') {
                q = `SELECT t.*, u.username as assignee_name FROM tasks t LEFT JOIN users u ON t.assignee_id=u.id WHERE (t.user_id=$1 OR t.is_shared=true) ORDER BY t.is_done ASC, t.due_date ASC NULLS LAST`;
            } else {
                q = `SELECT t.*, u.username as assignee_name FROM tasks t LEFT JOIN users u ON t.assignee_id=u.id WHERE (t.user_id=$1 OR t.is_shared=true) AND t.is_done=false ORDER BY t.due_date ASC NULLS LAST`;
            }
            p = [uid];
        }
        const r = await db.query(q, p);
        res.json(r.rows);
    } catch (e) { console.error(e); res.status(500).json({ error: 'Ошибка' }); }
});

router.get('/counts', auth, async (req, res) => {
    try {
        const uid = req.user.id;
        const [my, shared, done] = await Promise.all([
            db.query('SELECT COUNT(*) FROM tasks WHERE user_id=$1 AND is_shared=false AND is_done=false', [uid]),
            db.query('SELECT COUNT(*) FROM tasks WHERE is_shared=true AND is_done=false'),
            db.query('SELECT COUNT(*) FROM tasks WHERE (user_id=$1 OR is_shared=true) AND is_done=true', [uid])
        ]);
        res.json({
            my: parseInt(my.rows[0].count),
            shared: parseInt(shared.rows[0].count),
            done: parseInt(done.rows[0].count)
        });
    } catch (e) { console.error(e); res.status(500).json({ error: 'Ошибка' }); }
});

router.post('/', auth, async (req, res) => {
    try {
        const { title, description, is_shared, assignee_id, due_date } = req.body;
        const r = await db.query(`INSERT INTO tasks (user_id,title,description,is_shared,assignee_id,due_date) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
            [req.user.id, title, description, is_shared, assignee_id, due_date]);
        res.json(r.rows[0]);
    } catch (e) { console.error(e); res.status(500).json({ error: 'Ошибка' }); }
});

router.put('/:id', auth, async (req, res) => {
    try {
        const { title, description, is_shared, assignee_id, due_date, is_done } = req.body;
        const r = await db.query(`UPDATE tasks SET title=COALESCE($1,title), description=COALESCE($2,description), is_shared=COALESCE($3,is_shared), assignee_id=COALESCE($4,assignee_id), due_date=COALESCE($5,due_date), is_done=COALESCE($6,is_done), updated_at=NOW() WHERE id=$7 AND (user_id=$8 OR is_shared=true) RETURNING *`,
            [title, description, is_shared, assignee_id, due_date, is_done, req.params.id, req.user.id]);
        if (r.rows.length === 0) return res.status(404).json({ error: 'Не найдено' });
        res.json(r.rows[0]);
    } catch (e) { console.error(e); res.status(500).json({ error: 'Ошибка' }); }
});

router.delete('/:id', auth, async (req, res) => {
    try {
        const r = await db.query('DELETE FROM tasks WHERE id=$1 AND (user_id=$2 OR is_shared=true) RETURNING id', [req.params.id, req.user.id]);
        if (r.rows.length === 0) return res.status(404).json({ error: 'Не найдено' });
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: 'Ошибка' }); }
});

router.get('/users', auth, async (req, res) => {
    try {
        const r = await db.query('SELECT id, username FROM users');
        res.json(r.rows);
    } catch (e) { res.status(500).json({ error: 'Ошибка' }); }
});

module.exports = router;
