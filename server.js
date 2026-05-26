const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_PATH = path.join(__dirname, 'kanban.json');
const SESSION_DAYS = 7;

function nowIso() {
  return new Date().toISOString();
}

function defaultDb() {
  return { users: [], sessions: [], tasks: [], counters: { users: 0, sessions: 0, tasks: 0 } };
}

function loadDb() {
  if (!fs.existsSync(DB_PATH)) return defaultDb();
  try {
    return { ...defaultDb(), ...JSON.parse(fs.readFileSync(DB_PATH, 'utf8')) };
  } catch (error) {
    console.error('Cannot read kanban.json, starting with empty DB:', error.message);
    return defaultDb();
  }
}

let db = loadDb();

function saveDb() {
  const tmp = `${DB_PATH}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2), 'utf8');
  fs.renameSync(tmp, DB_PATH);
}

function nextId(collection) {
  db.counters[collection] = Number(db.counters[collection] || 0) + 1;
  return db.counters[collection];
}

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.pbkdf2Sync(String(password), salt, 120000, 64, 'sha512').toString('hex');
  return { salt, hash };
}

function verifyPassword(password, user) {
  const { hash } = hashPassword(password, user.salt);
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(user.passwordHash, 'hex'));
}

function safeUser(user) {
  return { id: user.id, username: user.username, displayName: user.displayName };
}

function createUser(username, password, displayName) {
  if (db.users.some(u => u.username === username)) {
    const error = new Error('duplicate');
    error.code = 'DUPLICATE';
    throw error;
  }
  const { salt, hash } = hashPassword(password);
  const user = {
    id: nextId('users'),
    username,
    passwordHash: hash,
    salt,
    displayName: displayName || username,
    createdAt: nowIso()
  };
  db.users.push(user);
  saveDb();
  return safeUser(user);
}

function seed() {
  if (!db.users.some(u => u.username === '1')) {
    createUser('1', '1', 'Admin');
  }

  if (db.tasks.length === 0) {
    const admin = db.users.find(u => u.username === '1');
    const demoTasks = [
      ['KAN-1 Сделать страницу авторизации', 'Проверить вход, регистрацию и выход.', 'Тестовые данные администратора: логин 1, пароль 1. Доска открывается только после входа.', 'backlog', null, 'High', 0, 4, 1, admin.id],
      ['KAN-2 Уточнить требования по фильтрам', 'Нужна информация от аналитика.', 'Какие фильтры нужны: по исполнителю, приоритету, статусу, автору.', 'need_for_information', null, 'Medium', 0, 3, 0, admin.id],
      ['KAN-3 Реализовать drag-and-drop', 'Перетаскивание карточек между колонками.', 'После переноса статус сохраняется в базе.', 'in_development', admin.id, 'High', 0, 5, 3, admin.id],
      ['KAN-4 Протестировать API задач', 'Проверить CRUD, назначение и смену статуса.', 'Отдельно проверить сохранение описания, подробностей и счетчиков.', 'in_qa', null, 'Medium', 0, 6, 2, admin.id],
      ['KAN-5 Согласовать внешний вид карточки', 'Карточка похожа на Jira: ключ, заголовок, приоритет, исполнитель.', 'Открытие карточки сделано через модальное окно.', 'approve', admin.id, 'Low', 0, 2, 2, admin.id]
    ];
    for (const item of demoTasks) {
      const [title, description, details, status, assigneeId, priority, position, checklistTotal, checklistDone, createdBy] = item;
      const id = nextId('tasks');
      db.tasks.push({
        id,
        title,
        description,
        details,
        status,
        assigneeId,
        priority,
        position,
        checklistTotal,
        checklistDone,
        createdBy,
        createdAt: nowIso(),
        updatedAt: nowIso()
      });
    }
    saveDb();
  }
}

seed();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

function parseCookies(req) {
  const header = req.headers.cookie || '';
  return Object.fromEntries(header.split(';').filter(Boolean).map(part => {
    const index = part.indexOf('=');
    const key = decodeURIComponent(part.slice(0, index).trim());
    const value = decodeURIComponent(part.slice(index + 1).trim());
    return [key, value];
  }));
}

function tokenHash(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function setSessionCookie(res, token) {
  const maxAge = SESSION_DAYS * 24 * 60 * 60;
  res.setHeader('Set-Cookie', `kanban_session=${encodeURIComponent(token)}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${maxAge}`);
}

function clearSessionCookie(res) {
  res.setHeader('Set-Cookie', 'kanban_session=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0');
}

function createSession(userId) {
  const token = crypto.randomBytes(32).toString('hex');
  const session = {
    id: nextId('sessions'),
    tokenHash: tokenHash(token),
    userId,
    expiresAt: new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: nowIso()
  };
  db.sessions.push(session);
  saveDb();
  return token;
}

function getCurrentUser(req) {
  const cookies = parseCookies(req);
  const token = cookies.kanban_session;
  if (!token) return null;

  const session = db.sessions.find(s => s.tokenHash === tokenHash(token));
  if (!session) return null;
  if (new Date(session.expiresAt).getTime() < Date.now()) {
    db.sessions = db.sessions.filter(s => s.id !== session.id);
    saveDb();
    return null;
  }

  const user = db.users.find(u => u.id === session.userId);
  return user ? safeUser(user) : null;
}

function requireAuth(req, res, next) {
  const user = getCurrentUser(req);
  if (!user) return res.status(401).json({ error: 'Нужно войти в аккаунт' });
  req.user = user;
  next();
}

function normalizeTask(task) {
  const assignee = db.users.find(u => u.id === task.assigneeId);
  const creator = db.users.find(u => u.id === task.createdBy);
  return {
    id: task.id,
    key: `KAN-${task.id}`,
    title: task.title,
    description: task.description || '',
    details: task.details || '',
    status: task.status,
    assigneeId: task.assigneeId || null,
    assignee: assignee ? assignee.displayName : '',
    priority: task.priority || 'Medium',
    position: Number(task.position || 0),
    checklistTotal: Number(task.checklistTotal || 0),
    checklistDone: Number(task.checklistDone || 0),
    createdBy: creator ? creator.displayName : '',
    createdAt: task.createdAt,
    updatedAt: task.updatedAt
  };
}

app.post('/api/auth/login', (req, res) => {
  const username = String(req.body.username || '').trim();
  const password = String(req.body.password || '');
  const user = db.users.find(u => u.username === username);

  if (!user || !verifyPassword(password, user)) {
    return res.status(401).json({ error: 'Неверный логин или пароль' });
  }

  const token = createSession(user.id);
  setSessionCookie(res, token);
  res.json(safeUser(user));
});

app.post('/api/auth/register', (req, res) => {
  const username = String(req.body.username || '').trim();
  const password = String(req.body.password || '');
  const displayName = String(req.body.displayName || username).trim();

  if (username.length < 1 || password.length < 1) {
    return res.status(400).json({ error: 'Логин и пароль обязательны' });
  }

  try {
    const user = createUser(username, password, displayName);
    const token = createSession(user.id);
    setSessionCookie(res, token);
    res.status(201).json(user);
  } catch (error) {
    res.status(409).json({ error: 'Пользователь с таким логином уже существует' });
  }
});

app.post('/api/auth/logout', requireAuth, (req, res) => {
  const cookies = parseCookies(req);
  if (cookies.kanban_session) {
    db.sessions = db.sessions.filter(s => s.tokenHash !== tokenHash(cookies.kanban_session));
    saveDb();
  }
  clearSessionCookie(res);
  res.status(204).send();
});

app.get('/api/me', (req, res) => {
  const user = getCurrentUser(req);
  if (!user) return res.status(401).json({ error: 'Нужно войти в аккаунт' });
  res.json(user);
});

app.get('/api/users', requireAuth, (req, res) => {
  res.json(db.users.map(safeUser).sort((a, b) => a.displayName.localeCompare(b.displayName, 'ru')));
});

app.get('/api/tasks', requireAuth, (req, res) => {
  const tasks = [...db.tasks].sort((a, b) => {
    if (a.status !== b.status) return String(a.status).localeCompare(String(b.status));
    if (Number(a.position) !== Number(b.position)) return Number(a.position) - Number(b.position);
    return Number(b.id) - Number(a.id);
  });
  res.json(tasks.map(normalizeTask));
});

app.get('/api/tasks/:id', requireAuth, (req, res) => {
  const task = db.tasks.find(t => t.id === Number(req.params.id));
  if (!task) return res.status(404).json({ error: 'Задача не найдена' });
  res.json(normalizeTask(task));
});

app.post('/api/tasks', requireAuth, (req, res) => {
  const title = String(req.body.title || '').trim();
  const description = String(req.body.description || '').trim();
  const details = String(req.body.details || '').trim();
  const priority = String(req.body.priority || 'Medium').trim();
  const checklistTotal = Math.max(0, Number(req.body.checklistTotal || 0));
  const checklistDone = Math.max(0, Math.min(checklistTotal, Number(req.body.checklistDone || 0)));

  if (!title) return res.status(400).json({ error: 'Название задачи обязательно' });

  const sameColumn = db.tasks.filter(t => t.status === 'backlog');
  const maxPosition = sameColumn.length ? Math.max(...sameColumn.map(t => Number(t.position || 0))) : -1;
  const task = {
    id: nextId('tasks'),
    title,
    description,
    details,
    status: 'backlog',
    assigneeId: null,
    priority,
    position: maxPosition + 1,
    checklistTotal,
    checklistDone,
    createdBy: req.user.id,
    createdAt: nowIso(),
    updatedAt: nowIso()
  };
  db.tasks.push(task);
  saveDb();
  res.status(201).json(normalizeTask(task));
});

app.patch('/api/tasks/:id', requireAuth, (req, res) => {
  const id = Number(req.params.id);
  const task = db.tasks.find(t => t.id === id);
  if (!task) return res.status(404).json({ error: 'Задача не найдена' });

  const allowedStatuses = ['backlog', 'need_for_information', 'in_development', 'in_qa', 'approve'];

  const next = {
    title: req.body.title !== undefined ? String(req.body.title).trim() : task.title,
    description: req.body.description !== undefined ? String(req.body.description).trim() : task.description,
    details: req.body.details !== undefined ? String(req.body.details).trim() : task.details,
    status: req.body.status !== undefined ? String(req.body.status) : task.status,
    assigneeId: req.body.assigneeId !== undefined && req.body.assigneeId !== '' ? Number(req.body.assigneeId) : task.assigneeId,
    priority: req.body.priority !== undefined ? String(req.body.priority).trim() : task.priority,
    position: req.body.position !== undefined ? Number(req.body.position) : task.position,
    checklistTotal: req.body.checklistTotal !== undefined ? Math.max(0, Number(req.body.checklistTotal)) : task.checklistTotal,
    checklistDone: req.body.checklistDone !== undefined ? Math.max(0, Number(req.body.checklistDone)) : task.checklistDone
  };

  if (req.body.assigneeId === null || req.body.assigneeId === '') next.assigneeId = null;
  next.checklistDone = Math.min(next.checklistDone, next.checklistTotal);

  if (!next.title) return res.status(400).json({ error: 'Название задачи обязательно' });
  if (!allowedStatuses.includes(next.status)) return res.status(400).json({ error: 'Некорректный статус' });

  if (next.assigneeId !== null && !db.users.some(u => u.id === next.assigneeId)) {
    return res.status(400).json({ error: 'Исполнитель не найден' });
  }

  Object.assign(task, next, { updatedAt: nowIso() });
  saveDb();
  res.json(normalizeTask(task));
});

app.post('/api/tasks/:id/assign-me', requireAuth, (req, res) => {
  const task = db.tasks.find(t => t.id === Number(req.params.id));
  if (!task) return res.status(404).json({ error: 'Задача не найдена' });

  task.assigneeId = req.user.id;
  task.updatedAt = nowIso();
  saveDb();
  res.json(normalizeTask(task));
});

app.delete('/api/tasks/:id', requireAuth, (req, res) => {
  db.tasks = db.tasks.filter(t => t.id !== Number(req.params.id));
  saveDb();
  res.status(204).send();
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Kanban board: http://localhost:${PORT}`);
  console.log('Default admin: login 1, password 1');
});
