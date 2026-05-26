import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createTask,
  deleteTask,
  fetchKanban,
  updateTask
} from '../api/kanban';
import type {
  CreateTaskInput,
  KanbanData,
  Status,
  Task,
  UpdateTaskInput
} from '../types';

const KEY = ['kanban'] as const;

export function useKanban() {
  return useQuery<KanbanData>({
    queryKey: KEY,
    queryFn: fetchKanban
  });
}

export function useCreateTask(currentUserId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateTaskInput) => {
      const data = qc.getQueryData<KanbanData>(KEY);
      const existing = data?.tasks ?? [];
      return createTask(input, currentUserId, existing);
    },
    onSuccess: created => {
      qc.setQueryData<KanbanData>(KEY, prev =>
        prev ? { ...prev, tasks: [...prev.tasks, created] } : prev
      );
    }
  });
}

export function useUpdateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: UpdateTaskInput }) =>
      updateTask(id, patch),
    onSuccess: updated => {
      qc.setQueryData<KanbanData>(KEY, prev =>
        prev
          ? { ...prev, tasks: prev.tasks.map(t => (t.id === updated.id ? updated : t)) }
          : prev
      );
    }
  });
}

interface MoveVariables {
  id: string;
  status: Status;
  position: number;
}

interface MoveContext {
  previous?: KanbanData;
}

export function useMoveTask() {
  const qc = useQueryClient();
  return useMutation<Task, Error, MoveVariables, MoveContext>({
    mutationFn: ({ id, status, position }) => updateTask(id, { status, position }),
    onMutate: async ({ id, status, position }) => {
      await qc.cancelQueries({ queryKey: KEY });
      const previous = qc.getQueryData<KanbanData>(KEY);
      qc.setQueryData<KanbanData>(KEY, prev =>
        prev
          ? {
              ...prev,
              tasks: prev.tasks.map(t =>
                t.id === id ? { ...t, status, position } : t
              )
            }
          : prev
      );
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(KEY, ctx.previous);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: KEY });
    }
  });
}

export function useDeleteTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteTask(id),
    onSuccess: (_data, id) => {
      qc.setQueryData<KanbanData>(KEY, prev =>
        prev ? { ...prev, tasks: prev.tasks.filter(t => t.id !== id) } : prev
      );
    }
  });
}
