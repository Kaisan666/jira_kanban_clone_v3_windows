import { apiCall, FILLER, nowIso } from './client';
import type { AnyRecord, User, UserRecord } from '../types';

const STORAGE_KEY = 'kanban_userId';

export function getSavedUserId(): string | null {
  return localStorage.getItem(STORAGE_KEY);
}

export function clearSavedUserId(): void {
  localStorage.removeItem(STORAGE_KEY);
}

function toUser(record: UserRecord): User {
  return { id: record.id, username: record.username, displayName: record.displayName };
}

export async function fetchUserById(id: string): Promise<User | null> {
  try {
    const record = await apiCall<UserRecord>(`/${encodeURIComponent(id)}`);
    if (!record || record.type !== 'user') return null;
    return toUser(record);
  } catch {
    return null;
  }
}

export async function login(username: string, password: string): Promise<User> {
  const all = await apiCall<AnyRecord[]>('');
  const user = all.find(
    (r): r is UserRecord =>
      r?.type === 'user' && r.username === username.trim() && r.password === password
  );
  if (!user) throw new Error('Неверный логин или пароль');
  localStorage.setItem(STORAGE_KEY, user.id);
  return toUser(user);
}

export async function register(
  username: string,
  password: string,
  displayName: string
): Promise<User> {
  const cleanUsername = username.trim();
  const cleanDisplayName = displayName.trim() || cleanUsername;
  if (!cleanUsername || !password) {
    throw new Error('Логин и пароль обязательны');
  }

  const all = await apiCall<AnyRecord[]>('');
  if (all.some(r => r?.type === 'user' && r.username === cleanUsername)) {
    throw new Error('Пользователь с таким логином уже существует');
  }

  const created = await apiCall<UserRecord>('', {
    method: 'POST',
    body: JSON.stringify({
      ...FILLER,
      type: 'user',
      username: cleanUsername,
      password,
      displayName: cleanDisplayName,
      createdAt: nowIso()
    })
  });
  localStorage.setItem(STORAGE_KEY, created.id);
  return toUser(created);
}
