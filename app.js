const MOCKAPI = 'https://6a1586b391ff9a63de084e54.mockapi.io/KANBAN';
const STORAGE_KEY = 'kanban_userId';

const columns = [
  { id: 'backlog', title: 'Backlog' },
  { id: 'need_for_information', title: 'Need for information' },
  { id: 'in_development', title: 'In development' },
  { id: 'in_qa', title: 'In QA' },
  { id: 'approve', title: 'Approve' }
];

const FILLER = { users: '', sessions: '', tasks: '', counters: '' };

const authScreen = document.querySelector('#authScreen');
const appScreen = document.querySelector('#appScreen');
const board = document.querySelector('#board');
const currentUser = document.querySelector('#currentUser');

const loginTab = document.querySelector('#loginTab');
const registerTab = document.querySelector('#registerTab');
const loginForm = document.querySelector('#loginForm');
const registerForm = document.querySelector('#registerForm');
const authError = document.querySelector('#authError');
const logoutBtn = document.querySelector('#logoutBtn');

const createModal = document.querySelector('#createModal');
const openCreateModal = document.querySelector('#openCreateModal');
const closeCreateModal = document.querySelector('#closeCreateModal');
const createTaskForm = document.querySelector('#createTaskForm');

const taskModal = document.querySelector('#taskModal');
const closeTaskModal = document.querySelector('#closeTaskModal');
const editTaskForm = document.querySelector('#editTaskForm');
const taskModalKey = document.querySelector('#taskModalKey');
const taskCreatedInfo = document.querySelector('#taskCreatedInfo');
const assignMeFromModal = document.querySelector('#assignMeFromModal');
const deleteTaskBtn = document.querySelector('#deleteTaskBtn');

let tasks = [];
let users = [];
let me = null;
let draggedTaskId = null;
let openedTaskId = null;

async function api(path = '', options = {}) {
  const response = await fetch(MOCKAPI + path, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  });

  if (!response.ok) {
    let message = `Ошибка MockAPI (${response.status})`;
    try {
      const body = await response.json();
      if (body && body.error) message = body.error;
    } catch (_) { /* noop */ }
    throw new Error(message);
  }

  if (response.status === 204) return null;
  return response.json();
}

function nowIso() {
  return new Date().toISOString();
}

function safeUser(user) {
  return user ? { id: user.id, username: user.username, displayName: user.displayName } : null;
}

function normalizeTask(record) {
  const assignee = users.find(u => u.id === record.assigneeId);
  const creator = users.find(u => u.id === record.createdBy);
  return {
    id: record.id,
    key: `KAN-${record.id}`,
    title: record.title || '',
    description: record.description || '',
    details: record.details || '',
    status: record.status || 'backlog',
    assigneeId: record.assigneeId || null,
    assignee: assignee ? assignee.displayName : '',
    priority: record.priority || 'Medium',
    position: Number(record.position || 0),
    checklistTotal: Number(record.checklistTotal || 0),
    checklistDone: Number(record.checklistDone || 0),
    createdBy: record.createdBy || null,
    createdByName: creator ? creator.displayName : '',
    createdAt: record.createdAt || null,
    updatedAt: record.updatedAt || null
  };
}

async function fetchAll() {
  const all = await api('');
  const rawUsers = all.filter(r => r && r.type === 'user');
  const rawTasks = all.filter(r => r && r.type === 'task');
  users = rawUsers.map(u => ({ id: u.id, username: u.username, displayName: u.displayName }))
    .sort((a, b) => String(a.displayName || '').localeCompare(String(b.displayName || ''), 'ru'));
  tasks = rawTasks.map(normalizeTask);
}

function showAuthError(message) {
  authError.textContent = message;
  authError.classList.remove('hidden');
}

function clearAuthError() {
  authError.textContent = '';
  authError.classList.add('hidden');
}

function showApp() {
  authScreen.classList.add('hidden');
  appScreen.classList.remove('hidden');
  currentUser.textContent = me ? `Вы: ${me.displayName}` : '';
}

function showAuth() {
  appScreen.classList.add('hidden');
  authScreen.classList.remove('hidden');
  board.innerHTML = '';
}

async function init() {
  const savedId = localStorage.getItem(STORAGE_KEY);
  if (!savedId) {
    showAuth();
    return;
  }
  try {
    const record = await api(`/${encodeURIComponent(savedId)}`);
    if (!record || record.type !== 'user') throw new Error('not user');
    me = safeUser(record);
    showApp();
    await loadBoardData();
  } catch (_) {
    localStorage.removeItem(STORAGE_KEY);
    showAuth();
  }
}

async function loadBoardData() {
  await fetchAll();
  renderBoard();
}

function renderBoard() {
  board.innerHTML = '';

  for (const column of columns) {
    const columnTasks = tasks
      .filter(task => task.status === column.id)
      .sort((a, b) => a.position - b.position || String(b.id).localeCompare(String(a.id)));

    const columnElement = document.createElement('section');
    columnElement.className = 'column';
    columnElement.dataset.status = column.id;

    columnElement.innerHTML = `
      <div class="column-header">
        <h2 class="column-title">${column.title}</h2>
        <span class="badge">${columnTasks.length}</span>
      </div>
      <div class="task-list" data-status="${column.id}"></div>
    `;

    const list = columnElement.querySelector('.task-list');

    list.addEventListener('dragover', event => {
      event.preventDefault();
      list.classList.add('drop-hover');
    });

    list.addEventListener('dragleave', () => {
      list.classList.remove('drop-hover');
    });

    list.addEventListener('drop', async event => {
      event.preventDefault();
      list.classList.remove('drop-hover');
      if (!draggedTaskId) return;

      const sameColumnCount = tasks.filter(task => task.status === column.id).length;
      try {
        await moveTask(draggedTaskId, column.id, sameColumnCount);
      } catch (error) {
        alert(error.message);
      }
      draggedTaskId = null;
    });

    for (const task of columnTasks) {
      list.appendChild(createTaskCard(task));
    }

    board.appendChild(columnElement);
  }
}

function createTaskCard(task) {
  const card = document.createElement('article');
  card.className = 'task-card';
  card.draggable = true;
  card.dataset.id = task.id;

  const initials = getInitials(task.assignee);
  const done = Number(task.checklistDone || 0);
  const total = Number(task.checklistTotal || 0);
  const progress = total > 0 ? `${done}/${total}` : '0/0';

  card.innerHTML = `
    <div class="task-key">${task.key}</div>
    <h3 class="task-title">${escapeHtml(task.title)}</h3>
    ${task.description ? `<p class="task-description">${escapeHtml(task.description)}</p>` : ''}
    <div class="task-meta-row">
      <span class="counter-pill">Счетчик: ${progress}</span>
    </div>
    <div class="task-footer">
      <span class="priority ${escapeHtml(task.priority)}">${escapeHtml(task.priority)}</span>
      <div>
        ${task.assignee ? `<span class="assignee" title="${escapeHtml(task.assignee)}">${initials}</span>` : `<button class="assign-btn" type="button">На себя</button>`}
      </div>
    </div>
  `;

  card.addEventListener('click', () => openTask(task.id));

  card.addEventListener('dragstart', () => {
    draggedTaskId = task.id;
    card.classList.add('dragging');
  });

  card.addEventListener('dragend', () => {
    draggedTaskId = null;
    card.classList.remove('dragging');
  });

  const assignBtn = card.querySelector('.assign-btn');
  if (assignBtn) {
    assignBtn.addEventListener('click', async event => {
      event.stopPropagation();
      try {
        await assignTaskToMe(task.id);
      } catch (error) {
        alert(error.message);
      }
    });
  }

  return card;
}

async function moveTask(id, status, position) {
  const updated = await api(`/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify({ status, position, updatedAt: nowIso() })
  });

  const normalized = normalizeTask(updated);
  tasks = tasks.map(task => task.id === normalized.id ? normalized : task);
  renderBoard();
}

async function assignTaskToMe(id) {
  const updated = await api(`/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify({ assigneeId: me.id, updatedAt: nowIso() })
  });
  const normalized = normalizeTask(updated);
  tasks = tasks.map(task => task.id === normalized.id ? normalized : task);
  renderBoard();
  return normalized;
}

async function openTask(id) {
  const record = await api(`/${encodeURIComponent(id)}`);
  const task = normalizeTask(record);
  openedTaskId = task.id;
  fillEditForm(task);
  taskModal.classList.remove('hidden');
}

function fillEditForm(task) {
  editTaskForm.elements.id.value = task.id;
  editTaskForm.elements.title.value = task.title || '';
  editTaskForm.elements.description.value = task.description || '';
  editTaskForm.elements.details.value = task.details || '';
  editTaskForm.elements.priority.value = task.priority || 'Medium';
  editTaskForm.elements.checklistDone.value = task.checklistDone || 0;
  editTaskForm.elements.checklistTotal.value = task.checklistTotal || 0;
  taskModalKey.textContent = `${task.key} · создано: ${task.createdByName || '—'}`;
  taskCreatedInfo.value = formatDate(task.createdAt);

  const statusSelect = editTaskForm.elements.status;
  statusSelect.innerHTML = columns
    .map(column => `<option value="${column.id}">${column.title}</option>`)
    .join('');
  statusSelect.value = task.status;

  const assigneeSelect = editTaskForm.elements.assigneeId;
  assigneeSelect.innerHTML = '<option value="">Без исполнителя</option>' + users
    .map(user => `<option value="${user.id}">${escapeHtml(user.displayName)} (${escapeHtml(user.username)})</option>`)
    .join('');
  assigneeSelect.value = task.assigneeId || '';
}

editTaskForm.addEventListener('submit', async event => {
  event.preventDefault();
  const formData = new FormData(editTaskForm);
  const id = formData.get('id');
  const payload = Object.fromEntries(formData.entries());
  delete payload.id;
  payload.assigneeId = payload.assigneeId || null;
  payload.checklistTotal = Math.max(0, Number(payload.checklistTotal || 0));
  payload.checklistDone = Math.max(0, Math.min(payload.checklistTotal, Number(payload.checklistDone || 0)));
  payload.updatedAt = nowIso();

  try {
    const updated = await api(`/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
    const normalized = normalizeTask(updated);
    tasks = tasks.map(task => task.id === normalized.id ? normalized : task);
    taskModal.classList.add('hidden');
    renderBoard();
  } catch (error) {
    alert(error.message);
  }
});

assignMeFromModal.addEventListener('click', async () => {
  if (!openedTaskId) return;
  try {
    const updated = await assignTaskToMe(openedTaskId);
    fillEditForm(updated);
  } catch (error) {
    alert(error.message);
  }
});

deleteTaskBtn.addEventListener('click', async () => {
  if (!openedTaskId) return;
  if (!confirm('Удалить задачу?')) return;
  try {
    await api(`/${encodeURIComponent(openedTaskId)}`, { method: 'DELETE' });
    tasks = tasks.filter(task => task.id !== openedTaskId);
    openedTaskId = null;
    taskModal.classList.add('hidden');
    renderBoard();
  } catch (error) {
    alert(error.message);
  }
});

loginTab.addEventListener('click', () => {
  clearAuthError();
  loginTab.classList.add('active');
  registerTab.classList.remove('active');
  loginForm.classList.remove('hidden');
  registerForm.classList.add('hidden');
});

registerTab.addEventListener('click', () => {
  clearAuthError();
  registerTab.classList.add('active');
  loginTab.classList.remove('active');
  registerForm.classList.remove('hidden');
  loginForm.classList.add('hidden');
});

loginForm.addEventListener('submit', async event => {
  event.preventDefault();
  clearAuthError();
  const { username, password } = Object.fromEntries(new FormData(loginForm).entries());
  try {
    const all = await api('');
    const user = all.find(r => r && r.type === 'user' && r.username === String(username).trim());
    if (!user || user.password !== String(password)) {
      throw new Error('Неверный логин или пароль');
    }
    me = safeUser(user);
    localStorage.setItem(STORAGE_KEY, me.id);
    showApp();
    await loadBoardData();
  } catch (error) {
    showAuthError(error.message);
  }
});

registerForm.addEventListener('submit', async event => {
  event.preventDefault();
  clearAuthError();
  const { username, password, displayName } = Object.fromEntries(new FormData(registerForm).entries());
  const cleanUsername = String(username).trim();
  const cleanDisplayName = String(displayName || cleanUsername).trim();
  if (!cleanUsername || !password) {
    showAuthError('Логин и пароль обязательны');
    return;
  }
  try {
    const all = await api('');
    if (all.some(r => r && r.type === 'user' && r.username === cleanUsername)) {
      throw new Error('Пользователь с таким логином уже существует');
    }
    const created = await api('', {
      method: 'POST',
      body: JSON.stringify({
        ...FILLER,
        type: 'user',
        username: cleanUsername,
        password: String(password),
        displayName: cleanDisplayName,
        createdAt: nowIso()
      })
    });
    me = safeUser(created);
    localStorage.setItem(STORAGE_KEY, me.id);
    registerForm.reset();
    showApp();
    await loadBoardData();
  } catch (error) {
    showAuthError(error.message);
  }
});

logoutBtn.addEventListener('click', () => {
  localStorage.removeItem(STORAGE_KEY);
  me = null;
  tasks = [];
  users = [];
  showAuth();
});

openCreateModal.addEventListener('click', () => createModal.classList.remove('hidden'));
closeCreateModal.addEventListener('click', () => createModal.classList.add('hidden'));
closeTaskModal.addEventListener('click', () => taskModal.classList.add('hidden'));

createModal.addEventListener('click', event => {
  if (event.target === createModal) createModal.classList.add('hidden');
});

taskModal.addEventListener('click', event => {
  if (event.target === taskModal) taskModal.classList.add('hidden');
});

createTaskForm.addEventListener('submit', async event => {
  event.preventDefault();
  const formData = new FormData(createTaskForm);
  const input = Object.fromEntries(formData.entries());
  const title = String(input.title || '').trim();
  if (!title) return;

  const sameColumn = tasks.filter(task => task.status === 'backlog');
  const maxPosition = sameColumn.length ? Math.max(...sameColumn.map(task => task.position)) : -1;

  const payload = {
    ...FILLER,
    type: 'task',
    title,
    description: String(input.description || '').trim(),
    details: String(input.details || '').trim(),
    status: 'backlog',
    assigneeId: null,
    priority: String(input.priority || 'Medium'),
    position: maxPosition + 1,
    checklistTotal: Math.max(0, Number(input.checklistTotal || 0)),
    checklistDone: 0,
    createdBy: me.id,
    createdAt: nowIso(),
    updatedAt: nowIso()
  };

  try {
    const created = await api('', { method: 'POST', body: JSON.stringify(payload) });
    tasks.push(normalizeTask(created));
    createTaskForm.reset();
    createModal.classList.add('hidden');
    renderBoard();
  } catch (error) {
    alert(error.message);
  }
});

function getInitials(value) {
  if (!value) return '?';
  return value
    .split(' ')
    .filter(Boolean)
    .map(part => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString('ru-RU');
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

init();
