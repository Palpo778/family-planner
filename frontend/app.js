const API_URL = '/api';
let currentUser = null;
let currentFilter = 'my';
let currentPage = 'tasks';
let currentMonth = new Date();
let currentHabits = [];

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
    document.getElementById('habitForm').addEventListener('submit', handleCreateHabit);
    document.getElementById('searchInput').addEventListener('input', handleSearch);
    
    document.querySelectorAll('.tab[data-page]').forEach(tab => {
        tab.addEventListener('click', () => switchPage(tab.dataset.page));
    });
    
    document.querySelectorAll('.tab[data-filter]').forEach(tab => {
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

function switchPage(page) {
    currentPage = page;
    document.querySelectorAll('.tab[data-page]').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.page === page);
    });
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(`${page}Page`).classList.add('active');
    
    if (page === 'calendar') renderCalendar();
    if (page === 'habits') loadHabits();
}

function switchTab(filter) {
    currentFilter = filter;
    document.querySelectorAll('.tab[data-filter]').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.filter === filter);
    });
    loadTasks();
}

// ===== ЗАДАЧИ =====
async function loadTasks() {
    try {
        const res = await fetch(`${API_URL}/tasks?filter=${currentFilter}&include_done=true`, {
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
    const sortedTasks = tasks.sort((a, b) => a.is_done - b.is_done);
    list.innerHTML = sortedTasks.map(task => `
        <div class="task-card ${task.is_done ? 'task-done' : ''}" data-id="${task.id}">
            <div class="task-header">
                <div class="task-checkbox ${task.is_done ? 'checked' : ''}" onclick="toggleTask(${task.id}, ${!task.is_done})"></div>
                <div class="task-title ${task.is_done ? 'completed' : ''}">${task.title}</div>
            </div>
            ${task.description ? `<div class="task-description">${task.description}</div>` : ''}
            <div class="task-meta">
                ${task.due_date ? `<div class="task-meta-item">⏰ ${formatDate(task.due_date)}</div>` : ''}
                ${task.assignee_name ? `<div class="task-meta-item">👤 Исполнитель: ${task.assignee_name}</div>` : ''}
                ${task.author_name && task.is_shared ? `<div class="task-meta-item">✍️ Создал: ${task.author_name}</div>` : ''}
                ${task.is_shared ? `<div class="task-meta-item" style="background:var(--accent);color:white;padding:0.2rem 0.6rem;border-radius:6px;font-size:0.8rem;">👥 Общая</div>` : ''}
            </div>
            <div class="task-details" id="details-${task.id}">
                <div class="task-actions">
                    <button class="btn btn-secondary btn-small" onclick="deleteTask(${task.id})">🗑 Удалить</button>
                </div>
            </div>
        </div>
    `).join('');
}

async function toggleTask(id, isDone) {
    try {
        const res = await fetch(`${API_URL}/tasks/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
            body: JSON.stringify({ is_done: isDone })
        });
        if (!res.ok) {
            const data = await res.json();
            alert(data.error || 'Ошибка обновления');
            return;
        }
        loadTasks();
        loadCounts();
    } catch (err) { console.error(err); alert('Ошибка подключения'); }
}

async function deleteTask(id) {
    if (!confirm('Удалить задачу?')) return;
    try {
        const res = await fetch(`${API_URL}/tasks/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        if (!res.ok) {
            const data = await res.json();
            alert(data.error || 'Ошибка удаления');
            return;
        }
        loadTasks();
        loadCounts();
    } catch (err) { console.error(err); alert('Ошибка подключения'); }
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

// ===== КАЛЕНДАРЬ =====
function changeMonth(delta) {
    currentMonth.setMonth(currentMonth.getMonth() + delta);
    renderCalendar();
}

async function renderCalendar() {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const monthNames = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
    document.getElementById('calendarMonth').textContent = `${monthNames[month]} ${year}`;
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startDayOfWeek = firstDay.getDay() || 7;
    
    const grid = document.getElementById('calendarGrid');
    grid.innerHTML = '';
    
    const dayHeaders = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
    dayHeaders.forEach(day => {
        const div = document.createElement('div');
        div.className = 'calendar-day-header';
        div.textContent = day;
        grid.appendChild(div);
    });
    
    for (let i = 1; i < startDayOfWeek; i++) {
        grid.appendChild(document.createElement('div'));
    }
    
    const today = new Date();
    const startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`;
    const endDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;
    
    try {
        const res = await fetch(`${API_URL}/tasks?filter=all&start_date=${startDate}&end_date=${endDate}`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const tasks = await res.json();
        const tasksByDate = {};
        tasks.forEach(task => {
            if (task.due_date) {
                const date = task.due_date.split('T')[0];
                if (!tasksByDate[date]) tasksByDate[date] = [];
                tasksByDate[date].push(task);
            }
        });
        
        for (let day = 1; day <= daysInMonth; day++) {
            const div = document.createElement('div');
            div.className = 'calendar-day';
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            if (today.getDate() === day && today.getMonth() === month && today.getFullYear() === year) {
                div.classList.add('today');
            }
            if (tasksByDate[dateStr]) {
                div.classList.add('has-tasks');
                div.onclick = () => showDayTasks(dateStr, tasksByDate[dateStr]);
            }
            div.innerHTML = `<div class="calendar-day-number">${day}</div>`;
            grid.appendChild(div);
        }
    } catch (err) { console.error(err); }
}

function showDayTasks(date, tasks) {
    const container = document.getElementById('calendarTasks');
    container.innerHTML = `
        <h3>📅 ${formatDate(date + 'T00:00:00')}</h3>
        ${tasks.map(task => `
            <div class="task-card ${task.is_done ? 'task-done' : ''}">
                <div class="task-header">
                    <div class="task-checkbox ${task.is_done ? 'checked' : ''}" onclick="toggleTask(${task.id}, ${!task.is_done}); renderCalendar();"></div>
                    <div class="task-title ${task.is_done ? 'completed' : ''}">${task.title}</div>
                </div>
                ${task.description ? `<div class="task-description">${task.description}</div>` : ''}
            </div>
        `).join('')}
    `;
}

// ===== ПРИВЫЧКИ =====
async function loadHabits() {
    try {
        const res = await fetch(`${API_URL}/habits`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        currentHabits = await res.json();
        renderHabits();
    } catch (err) { console.error(err); }
}

function renderHabits() {
    const list = document.getElementById('habitsList');
    if (currentHabits.length === 0) {
        list.innerHTML = '<p style="text-align:center;color:var(--text-secondary);padding:2rem;">Нет привычек. Добавьте первую!</p>';
        return;
    }
    list.innerHTML = currentHabits.map(habit => `
        <div class="habit-card" style="--habit-color: ${habit.color}">
            <div class="habit-title">${habit.title}</div>
            ${habit.description ? `<div class="task-description">${habit.description}</div>` : ''}
            <div class="habit-stats">
                <span>✅ Выполнено: ${habit.total_completed || 0}</span>
                <span>📊 Всего дней: ${habit.total_days || 0}</span>
            </div>
            <div class="habit-check" onclick="toggleHabit(${habit.id})"></div>
        </div>
    `).join('');
}

async function toggleHabit(habitId) {
    const today = new Date().toISOString().split('T')[0];
    try {
        await fetch(`${API_URL}/habits/log`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
            body: JSON.stringify({ habit_id: habitId, log_date: today, completed: true })
        });
        loadHabits();
    } catch (err) { console.error(err); }
}

function openHabitModal() { document.getElementById('habitModal').classList.add('active'); }
function closeHabitModal() { document.getElementById('habitModal').classList.remove('active'); document.getElementById('habitForm').reset(); }

async function handleCreateHabit(e) {
    e.preventDefault();
    const habit = {
        title: document.getElementById('habitTitle').value,
        description: document.getElementById('habitDescription').value,
        color: document.getElementById('habitColor').value,
        is_shared: document.getElementById('habitType').value === 'true'
    };
    try {
        await fetch(`${API_URL}/habits`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
            body: JSON.stringify(habit)
        });
        closeHabitModal();
        loadHabits();
    } catch (err) { console.error(err); }
}

// ===== УТИЛИТЫ =====
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
