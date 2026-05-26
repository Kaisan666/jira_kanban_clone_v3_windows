import { DragEvent, MouseEvent } from 'react';
import type { Task } from '../types';
import { getInitials } from '../utils';

interface Props {
  task: Task;
  assigneeName: string;
  onClick: () => void;
  onAssignSelf: () => void;
}

export function TaskCard({ task, assigneeName, onClick, onAssignSelf }: Props) {
  const progress =
    task.checklistTotal > 0
      ? `${task.checklistDone}/${task.checklistTotal}`
      : '0/0';

  function handleDragStart(event: DragEvent<HTMLElement>) {
    event.dataTransfer.setData('text/plain', task.id);
    event.dataTransfer.effectAllowed = 'move';
  }

  function handleAssignClick(event: MouseEvent<HTMLButtonElement>) {
    event.stopPropagation();
    onAssignSelf();
  }

  return (
    <article
      className="task-card"
      draggable
      onClick={onClick}
      onDragStart={handleDragStart}
    >
      <div className="task-key">{task.key}</div>
      <h3 className="task-title">{task.title}</h3>
      {task.description && (
        <p className="task-description">{task.description}</p>
      )}
      <div className="task-meta-row">
        <span className="counter-pill">Счетчик: {progress}</span>
      </div>
      <div className="task-footer">
        <span className={`priority ${task.priority}`}>{task.priority}</span>
        <div>
          {assigneeName ? (
            <span className="assignee" title={assigneeName}>
              {getInitials(assigneeName)}
            </span>
          ) : (
            <button type="button" className="assign-btn" onClick={handleAssignClick}>
              На себя
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
