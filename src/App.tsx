import { useAuth } from './hooks/useAuth';
import { AuthScreen } from './components/AuthScreen';
import { BoardScreen } from './components/BoardScreen';

export function App() {
  const { user, loading, setUser, logout } = useAuth();

  if (loading) {
    return <div className="bootstrap">Загрузка…</div>;
  }

  if (!user) {
    return <AuthScreen onAuthenticated={setUser} />;
  }

  return <BoardScreen user={user} onLogout={logout} />;
}
