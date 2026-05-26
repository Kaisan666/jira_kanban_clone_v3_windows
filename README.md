# Jira-like Kanban board

React + TypeScript + Vite SPA с хранением данных в MockAPI. Деплоится на Vercel как статика.

## Стек

- **React 18 + TypeScript** — UI.
- **Vite 6** — сборка и dev-сервер.
- **TanStack Query** — синк с MockAPI, кэш, optimistic updates для DnD.
- **Native HTML5 Drag-and-Drop** — без лишних библиотек.
- **MockAPI** — хранилище (один ресурс `KANBAN`, записи различаются полем `type`).

## Запуск локально

```bash
npm install
npm run dev
```

Откроется на `http://localhost:3000`.

## Сборка

```bash
npm run build      # → dist/
npm run preview    # локальный просмотр собранного
```

## Деплой на Vercel

1. Залить репозиторий на GitHub.
2. На vercel.com → **New Project** → импорт репозитория.
3. Vercel автоматически определит **Vite** (build: `vite build`, output: `dist`).
4. Deploy. Никаких env-переменных не нужно.

## Структура

```
src/
  api/
    client.ts          fetch-обёртка над MockAPI
    auth.ts            login, register, fetchUserById
    kanban.ts          fetch/create/update/delete задач, нормализация
  components/
    AuthScreen.tsx     экран входа/регистрации
    BoardScreen.tsx    каркас доски + модалки
    Topbar.tsx
    Board.tsx          сетка колонок
    Column.tsx         drop-target
    TaskCard.tsx       drag-source
    Modal.tsx          переиспользуемая модалка
    CreateTaskModal.tsx
    EditTaskModal.tsx
  hooks/
    useAuth.ts         восстановление сессии из localStorage
    useKanban.ts       useQuery / useMutation для всех операций
  types.ts             доменные типы
  utils.ts             getInitials, formatDate
  styles.css
  main.tsx             точка входа, QueryClient
  App.tsx              auth-guard
```

## Архитектурные решения

- **Один `queryKey: ['kanban']`** на всё. MockAPI отдаёт всё одним запросом — разделять users/tasks на разные ключи бессмысленно. Мутации делают `setQueryData`, перемещения — оптимистично через `onMutate` + откат на `onError`.
- **Сессия = id в `localStorage`**. На старте читаем, делаем GET `/KANBAN/:id`, если запись существует и `type === 'user'` — пускаем на доску.
- **FILLER** ([src/api/client.ts](src/api/client.ts)) — MockAPI вставляет faker-мусор в незаполненные поля схемы (`users/sessions/tasks/counters`). При POST передаём их пустыми строками, чтобы не получать `"Invalid faker method - random.word"` в ответе.
- **Native HTML5 DnD** через `dataTransfer.setData('text/plain', id)`. Нет lib — нет лишних 30 KB.

## Известные компромиссы

- **Пароли в MockAPI лежат в открытом виде.** Без сервера хешировать бессмысленно. Это демо.
- **MockAPI публичен** — любой, кто знает URL, может читать и менять данные.
- **При перетаскивании карточка всегда уходит в конец колонки.** Промежуточные позиции не поддерживаются.
- **Каждый login/register тянет все записи** — нормально для маленькой базы.
