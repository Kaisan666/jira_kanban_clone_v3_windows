# Jira-like Kanban board

Минимальный self-hosted Kanban без нативных зависимостей. Работает на Node.js + Express, данные сохраняются в `kanban.json`.

## Запуск

```bash
npm install
npm start
```

Открыть:

```text
http://localhost:3000
```

Админ по умолчанию:

```text
login: 1
password: 1
```

## Важно

Не удаляйте `kanban.json`: там сохраняются пользователи, сессии и задачи.
