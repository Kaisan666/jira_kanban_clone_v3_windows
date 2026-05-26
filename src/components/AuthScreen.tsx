import { FormEvent, useState } from 'react';
import { login, register } from '../api/auth';
import type { User } from '../types';

interface Props {
  onAuthenticated: (user: User) => void;
}

type Tab = 'login' | 'register';

export function AuthScreen({ onAuthenticated }: Props) {
  const [tab, setTab] = useState<Tab>('login');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    const form = new FormData(event.currentTarget);
    try {
      const user = await login(String(form.get('username')), String(form.get('password')));
      onAuthenticated(user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка входа');
    } finally {
      setBusy(false);
    }
  }

  async function handleRegister(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    const form = new FormData(event.currentTarget);
    try {
      const user = await register(
        String(form.get('username')),
        String(form.get('password')),
        String(form.get('displayName'))
      );
      onAuthenticated(user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка регистрации');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="auth-screen">
      <div className="auth-card">
        <div className="auth-brand">Self-hosted Jira-like board</div>
        <h1>Вход в Kanban</h1>
        <p className="auth-hint">
          Зарегистрируйтесь или войдите. Данные хранятся в MockAPI.
        </p>

        <div className="auth-tabs">
          <button
            type="button"
            className={`tab ${tab === 'login' ? 'active' : ''}`}
            onClick={() => {
              setTab('login');
              setError(null);
            }}
          >
            Вход
          </button>
          <button
            type="button"
            className={`tab ${tab === 'register' ? 'active' : ''}`}
            onClick={() => {
              setTab('register');
              setError(null);
            }}
          >
            Регистрация
          </button>
        </div>

        {tab === 'login' ? (
          <form className="auth-form" onSubmit={handleLogin}>
            <label>
              Логин
              <input name="username" autoComplete="username" required />
            </label>
            <label>
              Пароль
              <input
                name="password"
                type="password"
                autoComplete="current-password"
                required
              />
            </label>
            <button className="primary-btn full" type="submit" disabled={busy}>
              {busy ? 'Входим…' : 'Войти'}
            </button>
          </form>
        ) : (
          <form className="auth-form" onSubmit={handleRegister}>
            <label>
              Имя на доске
              <input name="displayName" placeholder="Например: Владислав" required />
            </label>
            <label>
              Логин
              <input name="username" autoComplete="username" required />
            </label>
            <label>
              Пароль
              <input
                name="password"
                type="password"
                autoComplete="new-password"
                required
              />
            </label>
            <button className="primary-btn full" type="submit" disabled={busy}>
              {busy ? 'Регистрируем…' : 'Зарегистрироваться'}
            </button>
          </form>
        )}

        {error && <div className="error-box">{error}</div>}
      </div>
    </section>
  );
}
