import type { User } from '../types';

interface Props {
  user: User;
  onCreate: () => void;
  onLogout: () => void;
}

export function Topbar({ user, onCreate, onLogout }: Props) {
  return (
    <header className="topbar">
      <div>
        <div className="eyebrow">Self-hosted Jira-like board</div>
        <h1>Kanban</h1>
      </div>
      <div className="topbar-actions">
        <span className="current-user">Вы: {user.displayName}</span>
        <button type="button" className="primary-btn" onClick={onCreate}>
          Создать задачу
        </button>
        <button type="button" className="ghost-btn" onClick={onLogout}>
          Выйти
        </button>
      </div>
    </header>
  );
}
