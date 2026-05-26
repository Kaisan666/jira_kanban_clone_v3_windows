import { useMemo } from 'react';
import { COLUMNS, type Status, type Task, type User } from '../types';
import { useMoveTask, useUpdateTask } from '../hooks/useKanban';
import { Column } from './Column';

interface Props {
  tasks: Task[];
  users: User[];
  currentUser: User;
  onOpenTask: (task: Task) => void;
}

export function Board({ tasks, users, currentUser, onOpenTask }: Props) {
  const move = useMoveTask();
  const update = useUpdateTask();

  const byStatus = useMemo(() => {
    const map = new Map<Status, Task[]>();
    for (const column of COLUMNS) map.set(column.id, []);
    for (const task of tasks) {
      const list = map.get(task.status);
      if (list) list.push(task);
    }
    for (const list of map.values()) {
      list.sort((a, b) => a.position - b.position || Number(b.id) - Number(a.id));
    }
    return map;
  }, [tasks]);

  function handleDrop(id: string, status: Status) {
    const target = byStatus.get(status) ?? [];
    move.mutate({ id, status, position: target.length });
  }

  function handleAssignSelf(id: string) {
    update.mutate({ id, patch: { assigneeId: currentUser.id } });
  }

  return (
    <main className="board">
      {COLUMNS.map(column => (
        <Column
          key={column.id}
          column={column}
          tasks={byStatus.get(column.id) ?? []}
          users={users}
          onDrop={handleDrop}
          onOpenTask={onOpenTask}
          onAssignSelf={handleAssignSelf}
        />
      ))}
    </main>
  );
}
