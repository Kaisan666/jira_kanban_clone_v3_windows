export const MOCKAPI = 'https://6a1586b391ff9a63de084e54.mockapi.io/KANBAN';

// MockAPI's schema includes fields (users/sessions/tasks/counters) with broken faker generators.
// Sending them as empty strings on POST prevents "Invalid faker method" garbage in responses.
export const FILLER = { users: '', sessions: '', tasks: '', counters: '' };

export async function apiCall<T>(path = '', options: RequestInit = {}): Promise<T> {
  const response = await fetch(MOCKAPI + path, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  });

  if (!response.ok) {
    let message = `Ошибка MockAPI (${response.status})`;
    try {
      const body = await response.json();
      if (body && typeof body === 'object' && 'error' in body && typeof body.error === 'string') {
        message = body.error;
      }
    } catch {
      /* noop */
    }
    throw new Error(message);
  }

  if (response.status === 204) return null as T;
  return response.json() as Promise<T>;
}

export function nowIso(): string {
  return new Date().toISOString();
}
