import { DragEvent, useState } from 'react';
import type { Column as ColumnType, Status, Task, User } from '../types';
import { TaskCard } from './TaskCard';

interface Props {
  column: ColumnType;
  tasks: Task[];
  users: User[];
  onDrop: (id: string, status: Status) => void;
  onOpenTask: (task: Task) => void;
  onAssignSelf: (id: string) => void;
}

export function Column({ column, tasks, users, onDrop, onOpenTask, onAssignSelf }: Props) {
  const [over, setOver] = useState(false);

  function handleDragOver(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setOver(true);
  }

  function handleDragLeave() {
    setOver(false);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setOver(false);
    const id = event.dataTransfer.getData('text/plain');
    if (id) onDrop(id, column.id);
  }

  return (
    <section className="column" data-status={column.id}>
      <div className="column-header">
        <h2 className="column-title">{column.title}</h2>
        <span className="badge">{tasks.length}</span>
      </div>
      <div
        className={`task-list${over ? ' drop-hover' : ''}`}
        data-status={column.id}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {tasks.map(task => {
          const assignee = users.find(u => u.id === task.assigneeId);
          return (
            <TaskCard
              key={task.id}
              task={task}
              assigneeName={assignee?.displayName ?? ''}
              onClick={() => onOpenTask(task)}
              onAssignSelf={() => onAssignSelf(task.id)}
            />
          );
        })}
      </div>
    </section>
  );
}
