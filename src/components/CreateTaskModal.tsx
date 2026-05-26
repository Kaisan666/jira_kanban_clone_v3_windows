import { FormEvent, useState } from 'react';
import { PRIORITIES, type Priority } from '../types';
import { useCreateTask } from '../hooks/useKanban';
import { Modal } from './Modal';

interface Props {
  currentUserId: string;
  onClose: () => void;
}

export function CreateTaskModal({ currentUserId, onClose }: Props) {
  const create = useCreateTask(currentUserId);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const form = new FormData(event.currentTarget);
    const title = String(form.get('title') ?? '').trim();
    if (!title) {
      setError('Название задачи обязательно');
      return;
    }

    try {
      await create.mutateAsync({
        title,
        description: String(form.get('description') ?? ''),
        details: String(form.get('details') ?? ''),
        priority: (form.get('priority') as Priority) || 'Medium',
        checklistTotal: Number(form.get('checklistTotal') ?? 0)
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось создать');
    }
  }

  return (
    <Modal onClose={onClose}>
      <div className="modal-header">
        <h2>Новая задача</h2>
        <button type="button" className="icon-btn" onClick={onClose}>
          ×
        </button>
      </div>
      <form onSubmit={handleSubmit}>
        <label>
          Название
          <input name="title" placeholder="Например: Проверить форму логина" required />
        </label>
        <label>
          Описание
          <textarea name="description" placeholder="Короткое описание задачи" />
        </label>
        <label>
          Текстовое поле / детали
          <textarea
            name="details"
            placeholder="Любые подробности, заметки, ссылки, чек-лист текстом"
          />
        </label>
        <div className="form-grid">
          <label>
            Приоритет
            <select name="priority" defaultValue="Medium">
              {PRIORITIES.map(p => (
                <option key={p}>{p}</option>
              ))}
            </select>
          </label>
          <label>
            Всего пунктов
            <input name="checklistTotal" type="number" min={0} defaultValue={0} />
          </label>
        </div>
        {error && <div className="error-box">{error}</div>}
        <button className="primary-btn full" type="submit" disabled={create.isPending}>
          {create.isPending ? 'Создаём…' : 'Добавить в Backlog'}
        </button>
      </form>
    </Modal>
  );
}
