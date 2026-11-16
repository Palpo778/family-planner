const API_URL = '/api';
let currentUser = null;
let currentFilter = 'my';

// Инициализация
document.addEventListener('DOMContentLoaded', () => {
    loadTheme();
    checkAuth();
    setupEventListeners();
});

// Проверка авторизации
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

// Настройка обработчиков событий
function setupEventListeners() {
    document.getElementById('loginForm').addEventListener('submit', handleLogin);
    document.getElementById('registerForm').addEventListener('submit', handleRegister);
    document.getElementById('taskForm').addEventListener('submit', handleCreateTask);
    document.getElementById('searchInput').addEventListener('input', handleSearch);
    
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', () => switchTab(tab.dataset.filter));
    });
}

// Вход
async function handleLogin(e) {
    e.preventDefault();
    const username = document.getElementById('loginUsername').value;
    const password = document.getElementById('loginPassword').value;

    try {
        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (!response.ok) {
            alert(data.error);
            return;
        }

        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        currentUser = data.user;
        showApp();
    } catch (error) {
        alert('Ошибка подключения');
    }
}

// Регистрация
async function handleRegister(e) {
    e.preventDefault();
    const username = document.getElementById('regUsername').value;
    const email = document.getElementById('regEmail').value;
    const password = document.getElementById('regPassword').value;

    try {
        const response = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password })
        });

        const data = await response.json();

        if (!response.ok) {
            alert(data.error);
            return;
        }

        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        currentUser = data.user;
        showApp();
    } catch (error) {
        alert('Ошибка подключения');
    }
}

// Выход
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    currentUser = null;
    showLogin();
}

// Показать экраны
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
    document.getElementById('username').textContent = currentUser.username;
    loadTasks();
    loadUsers();
}

// Переключение табов
function switchTab(filter) {
    currentFilter = filter;
    document.querySelectorAll('.tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.filter === filter);
    });
    loadTasks();
}

// Загрузка задач
async function loadTasks() {
    try {
        const response = await fetch(`${API_URL}/tasks?filter=${currentFilter}`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });

        const tasks = await response.json();
        renderTasks(tasks);
        updateCounts(tasks);
    } catch (error) {
        console.error(error);
    }
}

// Отрисовка задач
function renderTasks(tasks) {
    const list = document.getElementById('tasksList');
    
    if (tasks.length === 0) {
        list.innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 2rem;">Нет задач</p>';
        return;
    }

    list.innerHTML = tasks.map(task => `
        <div class="task-card" data-id="${task.id}">
            <div class="task-header">
                <div class="task-checkbox ${task.is_done ? 'checked' : ''}" onclick="toggleTask(${task.id}, ${!task.is_done})"></div>
                <div class="task-title ${task.is_done ? 'completed' : ''}">${task.title}</div>
            </div>
            ${task.description ? `<p style="color: var(--text-secondary); margin-top: 0.5rem;">${task.description}</p>` : ''}
            <div class="task-meta">
                ${task.due_date ? `<div class="task-meta-item">⏰ ${formatDate(task.due_date)}</div>` : ''}
                ${task.assignee_name ? `<div class="task-meta-item">👤 ${task.assignee_name}</div>` : ''}
                ${task.is_shared ? `<div class="task-meta-item">👥 Общая</div>` : ''}
            </div>
            <div class="task-actions">
                <button class="btn btn-secondary" onclick="deleteTask(${task.id})">Удалить</button>
            </div>
        </div>
    `).join('');
}

// Обновление счетчиков
function updateCounts(tasks) {
    // Здесь можно добавить логику подсчета для каждого таба
}

// Переключение статуса задачи
async function toggleTask(id, isDone) {
    try {
        await fetch(`${API_URL}/tasks/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ is_done: isDone })
        });
        loadTasks();
    } catch (error) {
        console.error(error);
    }
}

// Удаление задачи
async function deleteTask(id) {
    if (!confirm('Удалить задачу?')) return;

    try {
        await fetch(`${API_URL}/tasks/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        loadTasks();
    } catch (error) {
        console.error(error);
    }
}

// Открытие модального окна
function openModal() {
    document.getElementById('taskModal').classList.add('active');
}

// Закрытие модального окна
function closeModal() {
    document.getElementById('taskModal').classList.remove('active');
    document.getElementById('taskForm').reset();
}

// Создание задачи
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
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(task)
        });

        closeModal();
        loadTasks();
    } catch (error) {
        console.error(error);
    }
}

// Загрузка пользователей
async function loadUsers() {
    try {
        const response = await fetch(`${API_URL}/tasks/users`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });

        const users = await response.json();
        const select = document.getElementById('taskAssignee');
        select.innerHTML = '<option value="">Не назначен</option>' +
            users.map(u => `<option value="${u.id}">${u.username}</option>`).join('');
    } catch (error) {
        console.error(error);
    }
}

// Поиск
function handleSearch(e) {
    const query = e.target.value.toLowerCase();
    const cards = document.querySelectorAll('.task-card');
    
    cards.forEach(card => {
        const title = card.querySelector('.task-title').textContent.toLowerCase();
        card.style.display = title.includes(query) ? 'block' : 'none';
    });
}

// Форматирование даты
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleString('ru-RU', { 
        day: 'numeric', 
        month: 'short', 
        hour: '2-digit', 
        minute: '2-digit' 
    });
}

// Переключение темы
function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    
    const themeIcon = document.querySelector('.theme-toggle');
    themeIcon.textContent = newTheme === 'dark' ? '☀️' : '🌙';
}

// Загрузка темы
function loadTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    
    const themeIcon = document.querySelector('.theme-toggle');
    if (themeIcon) {
        themeIcon.textContent = savedTheme === 'dark' ? '☀️' : '🌙';
    }
}