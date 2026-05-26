# Jira-like Kanban board (static + MockAPI)

Статичное SPA. Данные (пользователи и задачи) хранятся в одном ресурсе MockAPI:

```
https://6a1586b391ff9a63de084e54.mockapi.io/KANBAN
```

Каждая запись имеет поле `type`: `"user"` или `"task"`.

## Запуск локально

```bash
npm start
```

Откроется на `http://localhost:3000` (через `npx serve`). Либо просто открыть `index.html` в браузере — fetch к MockAPI работает с любого origin.

Админа по умолчанию нет — зарегистрируйте первого пользователя через форму.

## Деплой на Vercel

1. Залить репозиторий на GitHub.
2. На vercel.com → New Project → импорт репозитория.
3. Framework Preset: **Other** (или ничего не выбирать — Vercel автодетектит статику).
4. Build Command: пусто. Output Directory: пусто (корень).
5. Deploy.

Конфиг [vercel.json](vercel.json) включает SPA-rewrites (любой путь → `index.html`).

Никаких env-переменных и бэкенда не нужно — всё работает напрямую из браузера в MockAPI.

## Важные ограничения

- **Пароли в MockAPI хранятся в открытом виде.** Это демо без серверной валидации — не используйте для чувствительных данных.
- **MockAPI публичен** — любой, кто знает URL, может читать и менять данные.
- Сессия — id текущего пользователя в `localStorage`.
- ID задач и пользователей — строки, генерируются MockAPI.

## Структура

- [index.html](index.html) — разметка (экран входа, доска, модалки).
- [app.js](app.js) — вся логика: auth, CRUD задач, drag-and-drop, рендер.
- [style.css](style.css) — стили в духе Jira.
- [vercel.json](vercel.json) — конфиг деплоя.
