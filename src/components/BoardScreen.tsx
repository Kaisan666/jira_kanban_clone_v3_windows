import { useState } from 'react';
import type { Task, User } from '../types';
import { useKanban } from '../hooks/useKanban';
import { Topbar } from './Topbar';
import { Board } from './Board';
import { CreateTaskModal } from './CreateTaskModal';
import { EditTaskModal } from './EditTaskModal';

interface Props {
  user: User;
  onLogout: () => void;
}

export function BoardScreen({ user, onLogout }: Props) {
  const { data, isLoading, error } = useKanban();
  const [createOpen, setCreateOpen] = useState(false);
  const [openedTask, setOpenedTask] = useState<Task | null>(null);

  return (
    <section className="app-screen">
      <Topbar
        user={user}
        onCreate={() => setCreateOpen(true)}
        onLogout={onLogout}
      />

      {error && (
        <div className="error-banner">
          {error instanceof Error ? error.message : 'Ошибка загрузки данных'}
        </div>
      )}

      {isLoading && !data ? (
        <div className="bootstrap">Загружаем доску…</div>
      ) : (
        <Board
          tasks={data?.tasks ?? []}
          users={data?.users ?? []}
          currentUser={user}
          onOpenTask={setOpenedTask}
        />
      )}

      {createOpen && (
        <CreateTaskModal
          currentUserId={user.id}
          onClose={() => setCreateOpen(false)}
        />
      )}

      {openedTask && (
        <EditTaskModal
          task={openedTask}
          users={data?.users ?? []}
          currentUserId={user.id}
          onClose={() => setOpenedTask(null)}
          onUpdated={setOpenedTask}
        />
      )}
    </section>
  );
}
