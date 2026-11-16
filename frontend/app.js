const API_URL = '/api';
let currentUser = null;
let currentFilter = 'my';

document.addEventListener('DOMContentLoaded', () => {
    loadTheme();
    checkAuth();
    setupEventListeners();
});

function checkAuth() {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user'));
    if (token && user) {
        currentUser = user;
        showApp();
    } else {
        showLogin();
    }
}

function setupEventListeners() {
    document.getElementById('loginForm').addEventListener('submit', handleLogin);
    document.getElementById('registerForm').addEventListener('submit', handleRegister);
    document.getElementById('taskForm').addEventListener('submit', handleCreateTask);
    document.getElementById('searchInput').addEventListener('input', handleSearch);
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', () => switchTab(tab.dataset.filter));
    });
}

async function handleLogin(e) {
    e.preventDefault();
    const username = document.getElementById('loginUsername').value;
    const password = document.getElementById('loginPassword').value;
    try {
        const res = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const data = await res.json();
        if (!res.ok) { alert(data.error); return; }
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        currentUser = data.user;
        showApp();
    } catch (err) { alert('Ошибка подключения'); }
}

async function handleRegister(e) {
    e.preventDefault();
    const username = document.getElementById('regUsername').value;
    const email = document.getElementById('regEmail').value;
    const password = document.getElementById('regPassword').value;
    try {
        const res = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password })
        });
        const data = await res.json();
        if (!res.ok) { alert(data.error); return; }
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        currentUser = data.user;
        showApp();
    } catch (err) { alert('Ошибка подключения'); }
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    currentUser = null;
    showLogin();
}

function showLogin() {
    document.getElementById('loginScreen').classList.add('active');
    document.getElementById('registerScreen').classList.remove('active');
    document.getElementById('appScreen').classList.remove('active');
}

function showRegister() {
    document.getElementById('loginScreen').classList.remove('active');
    document.getElementById('registerScreen').classList.add('active');
    document.getElementById('appScreen').classList.remove('active');
}

function showApp() {
    document.getElementById('loginScreen').classList.remove('active');
    document.getElementById('registerScreen').classList.remove('active');
    document.getElementById('appScreen').classList.add('active');
    document.getElementById('usernameDisplay').textContent = currentUser.username;
    loadTasks();
    loadUsers();
    loadCounts();
}

function switchTab(filter) {
    currentFilter = filter;
    document.querySelectorAll('.tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.filter === filter);
    });
    loadTasks();
}

async function loadTasks() {
    try {
        const res = await fetch(`${API_URL}/tasks?filter=${currentFilter}`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const tasks = await res.json();
        renderTasks(tasks);
    } catch (err) { console.error(err); }
}

async function loadCounts() {
    try {
        const res = await fetch(`${API_URL}/tasks/counts`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const counts = await res.json();
        document.getElementById('myCount').textContent = counts.my;
        document.getElementById('sharedCount').textContent = counts.shared;
        document.getElementById('doneCount').textContent = counts.done;
    } catch (err) { console.error(err); }
}

function renderTasks(tasks) {
    const list = document.getElementById('tasksList');
    if (tasks.length === 0) {
        list.innerHTML = '<p style="text-align:center;color:var(--text-secondary);padding:2rem;">Нет задач</p>';
        return;
    }
    list.innerHTML = tasks.map(task => `
        <div class="task-card" data-id="${task.id}">
            <div class="task-header">
                <div class="task-checkbox ${task.is_done ? 'checked' : ''}" onclick="toggleTask(${task.id}, ${!task.is_done})"></div>
                <div class="task-title ${task.is_done ? 'completed' : ''}">${task.title}</div>
            </div>
            <div class="task-meta">
                ${task.due_date ? `<div class="task-meta-item">⏰ ${formatDate(task.due_date)}</div>` : ''}
                ${task.assignee_name ? `<div class="task-meta-item">👤 ${task.assignee_name}</div>` : ''}
                ${task.is_shared ? `<div class="task-meta-item" style="background:var(--accent);color:white;padding:0.2rem 0.6rem;border-radius:6px;font-size:0.8rem;">👥 Общая</div>` : ''}
            </div>
            ${task.is_done ? `
                <button class="btn btn-small btn-secondary" onclick="toggleDetails(${task.id})" style="margin-top:0.5rem;">
                    ${task.is_done ? '📄 Развернуть' : '📄 Свернуть'}
                </button>
            ` : ''}
            <div class="task-details" id="details-${task.id}">
                ${task.description ? `<div class="task-description">${task.description}</div>` : ''}
                <div class="task-actions">
                    <button class="btn btn-secondary btn-small" onclick="deleteTask(${task.id})">🗑 Удалить</button>
                </div>
            </div>
        </div>
    `).join('');
}

function toggleDetails(taskId) {
    const details = document.getElementById(`details-${taskId}`);
    if (details) {
        details.classList.toggle('expanded');
    }
}

async function toggleTask(id, isDone) {
    try {
        await fetch(`${API_URL}/tasks/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
            body: JSON.stringify({ is_done: isDone })
        });
        loadTasks();
        loadCounts();
    } catch (err) { console.error(err); }
}

async function deleteTask(id) {
    if (!confirm('Удалить задачу?')) return;
    try {
        await fetch(`${API_URL}/tasks/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        loadTasks();
        loadCounts();
    } catch (err) { console.error(err); }
}

function openModal() { document.getElementById('taskModal').classList.add('active'); }
function closeModal() { document.getElementById('taskModal').classList.remove('active'); document.getElementById('taskForm').reset(); }

async function handleCreateTask(e) {
    e.preventDefault();
    const task = {
        title: document.getElementById('taskTitle').value,
        description: document.getElementById('taskDescription').value,
        is_shared: document.getElementById('taskType').value === 'true',
        assignee_id: document.getElementById('taskAssignee').value || null,
        due_date: document.getElementById('taskDueDate').value || null
    };
    try {
        await fetch(`${API_URL}/tasks`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
            body: JSON.stringify(task)
        });
        closeModal();
        loadTasks();
        loadCounts();
    } catch (err) { console.error(err); }
}

async function loadUsers() {
    try {
        const res = await fetch(`${API_URL}/tasks/users`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const users = await res.json();
        const select = document.getElementById('taskAssignee');
        select.innerHTML = '<option value="">Не назначен</option>' + users.map(u => `<option value="${u.id}">${u.username}</option>`).join('');
    } catch (err) { console.error(err); }
}

function handleSearch(e) {
    const query = e.target.value.toLowerCase();
    document.querySelectorAll('.task-card').forEach(card => {
        const title = card.querySelector('.task-title').textContent.toLowerCase();
        card.style.display = title.includes(query) ? 'block' : 'none';
    });
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
    document.querySelector('.theme-toggle').textContent = next === 'dark' ? '☀️' : '🌙';
}

function loadTheme() {
    const saved = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', saved);
    const icon = document.querySelector('.theme-toggle');
    if (icon) icon.textContent = saved === 'dark' ? '☀️' : '🌙';
}
