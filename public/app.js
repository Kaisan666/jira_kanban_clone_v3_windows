const columns = [
  { id: 'backlog', title: 'Backlog' },
  { id: 'need_for_information', title: 'Need for information' },
  { id: 'in_development', title: 'In development' },
  { id: 'in_qa', title: 'In QA' },
  { id: 'approve', title: 'Approve' }
];

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

let tasks = [];
let users = [];
let me = null;
let draggedTaskId = null;
let openedTaskId = null;

async function request(url, options = {}) {
  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    ...options
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || 'Ошибка запроса');
  }

  if (response.status === 204) return null;
  return response.json();
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
  try {
    me = await request('/api/me');
    showApp();
    await loadBoardData();
  } catch (_) {
    showAuth();
  }
}

async function loadBoardData() {
  const [loadedTasks, loadedUsers] = await Promise.all([
    request('/api/tasks'),
    request('/api/users')
  ]);
  tasks = loadedTasks;
  users = loadedUsers;
  renderBoard();
}

function renderBoard() {
  board.innerHTML = '';

  for (const column of columns) {
    const columnTasks = tasks
      .filter(task => task.status === column.id)
      .sort((a, b) => a.position - b.position || b.id - a.id);

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
      await moveTask(draggedTaskId, column.id, sameColumnCount);
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
      await assignTaskToMe(task.id);
    });
  }

  return card;
}

async function moveTask(id, status, position) {
  const updated = await request(`/api/tasks/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ status, position })
  });

  tasks = tasks.map(task => task.id === updated.id ? updated : task);
  renderBoard();
}

async function assignTaskToMe(id) {
  const updated = await request(`/api/tasks/${id}/assign-me`, { method: 'POST' });
  tasks = tasks.map(item => item.id === updated.id ? updated : item);
  renderBoard();
  return updated;
}

async function openTask(id) {
  const task = await request(`/api/tasks/${id}`);
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
  taskModalKey.textContent = `${task.key} · создано: ${task.createdBy || '—'}`;
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
  payload.assigneeId = payload.assigneeId || null;
  payload.checklistDone = Number(payload.checklistDone || 0);
  payload.checklistTotal = Number(payload.checklistTotal || 0);

  const updated = await request(`/api/tasks/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload)
  });

  tasks = tasks.map(task => task.id === updated.id ? updated : task);
  taskModal.classList.add('hidden');
  renderBoard();
});

assignMeFromModal.addEventListener('click', async () => {
  if (!openedTaskId) return;
  const updated = await assignTaskToMe(openedTaskId);
  fillEditForm(updated);
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
  try {
    const payload = Object.fromEntries(new FormData(loginForm).entries());
    me = await request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    showApp();
    await loadBoardData();
  } catch (error) {
    showAuthError(error.message);
  }
});

registerForm.addEventListener('submit', async event => {
  event.preventDefault();
  clearAuthError();
  try {
    const payload = Object.fromEntries(new FormData(registerForm).entries());
    me = await request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    registerForm.reset();
    showApp();
    await loadBoardData();
  } catch (error) {
    showAuthError(error.message);
  }
});

logoutBtn.addEventListener('click', async () => {
  await request('/api/auth/logout', { method: 'POST' }).catch(() => null);
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
  const payload = Object.fromEntries(formData.entries());
  payload.checklistTotal = Number(payload.checklistTotal || 0);
  payload.checklistDone = 0;

  const created = await request('/api/tasks', {
    method: 'POST',
    body: JSON.stringify(payload)
  });

  tasks.push(created);
  createTaskForm.reset();
  createModal.classList.add('hidden');
  renderBoard();
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
