import { FormEvent, useState } from 'react';
import { COLUMNS, PRIORITIES, type Priority, type Status, type Task, type User } from '../types';
import { useDeleteTask, useUpdateTask } from '../hooks/useKanban';
import { formatDate } from '../utils';
import { Modal } from './Modal';

interface Props {
  task: Task;
  users: User[];
  currentUserId: string;
  onClose: () => void;
  onUpdated: (task: Task) => void;
}

export function EditTaskModal({ task, users, currentUserId, onClose, onUpdated }: Props) {
  const update = useUpdateTask();
  const remove = useDeleteTask();
  const [error, setError] = useState<string | null>(null);

  const creator = users.find(u => u.id === task.createdBy);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const form = new FormData(event.currentTarget);

    const title = String(form.get('title') ?? '').trim();
    if (!title) {
      setError('Название задачи обязательно');
      return;
    }

    const checklistTotal = Math.max(0, Number(form.get('checklistTotal') ?? 0));
    const checklistDone = Math.max(
      0,
      Math.min(checklistTotal, Number(form.get('checklistDone') ?? 0))
    );

    try {
      const updated = await update.mutateAsync({
        id: task.id,
        patch: {
          title,
          description: String(form.get('description') ?? ''),
          details: String(form.get('details') ?? ''),
          status: (form.get('status') as Status) || task.status,
          priority: (form.get('priority') as Priority) || task.priority,
          assigneeId: (form.get('assigneeId') as string) || null,
          checklistTotal,
          checklistDone
        }
      });
      onUpdated(updated);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось сохранить');
    }
  }

  async function handleAssignSelf() {
    setError(null);
    try {
      const updated = await update.mutateAsync({
        id: task.id,
        patch: { assigneeId: currentUserId }
      });
      onUpdated(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка назначения');
    }
  }

  async function handleDelete() {
    if (!confirm('Удалить задачу?')) return;
    setError(null);
    try {
      await remove.mutateAsync(task.id);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка удаления');
    }
  }

  return (
    <Modal wide onClose={onClose}>
      <div className="modal-header">
        <div>
          <div className="task-key">
            {task.key} · создано: {creator?.displayName ?? '—'}
          </div>
          <h2>Карточка задачи</h2>
        </div>
        <button type="button" className="icon-btn" onClick={onClose}>
          ×
        </button>
      </div>
      <form onSubmit={handleSubmit}>
        <label>
          Название
          <input name="title" defaultValue={task.title} required />
        </label>
        <label>
          Описание
          <textarea name="description" defaultValue={task.description} />
        </label>
        <label>
          Текстовое поле
          <textarea
            name="details"
            defaultValue={task.details}
            placeholder="Сюда можно писать заметки, ТЗ, комментарии, ссылки"
          />
        </label>
        <div className="form-grid three">
          <label>
            Статус
            <select name="status" defaultValue={task.status}>
              {COLUMNS.map(column => (
                <option key={column.id} value={column.id}>
                  {column.title}
                </option>
              ))}
            </select>
          </label>
          <label>
            Приоритет
            <select name="priority" defaultValue={task.priority}>
              {PRIORITIES.map(p => (
                <option key={p}>{p}</option>
              ))}
            </select>
          </label>
          <label>
            Исполнитель
            <select name="assigneeId" defaultValue={task.assigneeId ?? ''}>
              <option value="">Без исполнителя</option>
              {users.map(user => (
                <option key={user.id} value={user.id}>
                  {user.displayName} ({user.username})
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="form-grid three">
          <label>
            Счетчик: выполнено
            <input
              name="checklistDone"
              type="number"
              min={0}
              defaultValue={task.checklistDone}
            />
          </label>
          <label>
            Счетчик: всего
            <input
              name="checklistTotal"
              type="number"
              min={0}
              defaultValue={task.checklistTotal}
            />
          </label>
          <label>
            Создано
            <input disabled value={formatDate(task.createdAt)} />
          </label>
        </div>
        {error && <div className="error-box">{error}</div>}
        <div className="modal-actions">
          <button
            type="button"
            className="danger-btn"
            onClick={handleDelete}
            disabled={remove.isPending}
          >
            {remove.isPending ? 'Удаляем…' : 'Удалить'}
          </button>
          <button
            type="button"
            className="secondary-btn"
            onClick={handleAssignSelf}
            disabled={update.isPending}
          >
            Повесить на себя
          </button>
          <button className="primary-btn" type="submit" disabled={update.isPending}>
            {update.isPending ? 'Сохраняем…' : 'Сохранить'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
