import { apiCall, FILLER, nowIso } from './client';
import type {
  AnyRecord,
  CreateTaskInput,
  KanbanData,
  Task,
  TaskRecord,
  UpdateTaskInput,
  User,
  UserRecord
} from '../types';

function recordToTask(r: TaskRecord): Task {
  return {
    id: r.id,
    key: `KAN-${r.id}`,
    title: r.title ?? '',
    description: r.description ?? '',
    details: r.details ?? '',
    status: r.status ?? 'backlog',
    assigneeId: r.assigneeId ?? null,
    priority: r.priority ?? 'Medium',
    position: Number(r.position ?? 0),
    checklistTotal: Number(r.checklistTotal ?? 0),
    checklistDone: Number(r.checklistDone ?? 0),
    createdBy: r.createdBy ?? null,
    createdAt: r.createdAt ?? null,
    updatedAt: r.updatedAt ?? null
  };
}

function recordToUser(r: UserRecord): User {
  return { id: r.id, username: r.username, displayName: r.displayName };
}

export async function fetchKanban(): Promise<KanbanData> {
  const all = await apiCall<AnyRecord[]>('');
  const users = all
    .filter((r): r is UserRecord => r?.type === 'user')
    .map(recordToUser)
    .sort((a, b) => a.displayName.localeCompare(b.displayName, 'ru'));
  const tasks = all
    .filter((r): r is TaskRecord => r?.type === 'task')
    .map(recordToTask);
  return { users, tasks };
}

export async function createTask(
  input: CreateTaskInput,
  currentUserId: string,
  existingTasks: Task[]
): Promise<Task> {
  const backlog = existingTasks.filter(t => t.status === 'backlog');
  const maxPosition = backlog.length
    ? Math.max(...backlog.map(t => t.position))
    : -1;

  const checklistTotal = Math.max(0, Number(input.checklistTotal || 0));

  const payload = {
    ...FILLER,
    type: 'task' as const,
    title: input.title.trim(),
    description: input.description.trim(),
    details: input.details.trim(),
    status: 'backlog' as const,
    assigneeId: null,
    priority: input.priority,
    position: maxPosition + 1,
    checklistTotal,
    checklistDone: 0,
    createdBy: currentUserId,
    createdAt: nowIso(),
    updatedAt: nowIso()
  };

  const created = await apiCall<TaskRecord>('', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
  return recordToTask(created);
}

export async function updateTask(id: string, patch: UpdateTaskInput): Promise<Task> {
  const sanitized: UpdateTaskInput & { updatedAt: string } = {
    ...patch,
    updatedAt: nowIso()
  };

  if (sanitized.checklistTotal !== undefined) {
    sanitized.checklistTotal = Math.max(0, Number(sanitized.checklistTotal));
  }
  if (sanitized.checklistDone !== undefined) {
    const total = sanitized.checklistTotal ?? Number.POSITIVE_INFINITY;
    sanitized.checklistDone = Math.max(0, Math.min(total, Number(sanitized.checklistDone)));
  }

  const updated = await apiCall<TaskRecord>(`/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(sanitized)
  });
  return recordToTask(updated);
}

export async function deleteTask(id: string): Promise<void> {
  await apiCall(`/${encodeURIComponent(id)}`, { method: 'DELETE' });
}
