export type Status = 'backlog' | 'need_for_information' | 'in_development' | 'in_qa' | 'approve';
export type Priority = 'High' | 'Medium' | 'Low';

export interface Column {
  id: Status;
  title: string;
}

export const COLUMNS: readonly Column[] = [
  { id: 'backlog', title: 'Backlog' },
  { id: 'need_for_information', title: 'Need for information' },
  { id: 'in_development', title: 'In development' },
  { id: 'in_qa', title: 'In QA' },
  { id: 'approve', title: 'Approve' }
] as const;

export const PRIORITIES: readonly Priority[] = ['High', 'Medium', 'Low'] as const;

export interface User {
  id: string;
  username: string;
  displayName: string;
}

export interface UserRecord extends User {
  type: 'user';
  password: string;
  createdAt?: string;
}

export interface Task {
  id: string;
  key: string;
  title: string;
  description: string;
  details: string;
  status: Status;
  assigneeId: string | null;
  priority: Priority;
  position: number;
  checklistTotal: number;
  checklistDone: number;
  createdBy: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface TaskRecord {
  id: string;
  type: 'task';
  title: string;
  description: string;
  details: string;
  status: Status;
  assigneeId: string | null;
  priority: Priority;
  position: number;
  checklistTotal: number;
  checklistDone: number;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export type AnyRecord = UserRecord | TaskRecord;

export interface KanbanData {
  users: User[];
  tasks: Task[];
}

export interface CreateTaskInput {
  title: string;
  description: string;
  details: string;
  priority: Priority;
  checklistTotal: number;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string;
  details?: string;
  status?: Status;
  assigneeId?: string | null;
  priority?: Priority;
  position?: number;
  checklistTotal?: number;
  checklistDone?: number;
}
