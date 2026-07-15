import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, loginUser, registerUser } from '@/lib/db';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  // Returns user (without logging in) so auth page can trigger code step
  checkCredentials: (email: string, password: string) => Promise<User>;
  completeLogin: (u: User) => void;
  register: (data: { full_name: string; email: string; password: string; phone?: string; country?: string }) => Promise<User>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

const SESSION_KEY = 'qsx_user_session';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem(SESSION_KEY);
    if (stored) {
      try { setUser(JSON.parse(stored)); }
      catch { localStorage.removeItem(SESSION_KEY); }
    }
    setLoading(false);
  }, []);

  const checkCredentials = async (email: string, password: string): Promise<User> => {
    return await loginUser(email, password);
  };

  const completeLogin = (u: User) => {
    setUser(u);
    localStorage.setItem(SESSION_KEY, JSON.stringify(u));
  };

  const register = async (data: { full_name: string; email: string; password: string; phone?: string; country?: string }): Promise<User> => {
    const u = await registerUser(data);
    // Do NOT log in yet — caller must verify email first
    return u;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem(SESSION_KEY);
  };

  const refreshUser = async () => {
    if (!user) return;
    const { supabase } = await import('@/lib/supabase');
    const { data } = await supabase.from('users').select('*').eq('id', user.id).single();
    if (data) {
      setUser(data as User);
      localStorage.setItem(SESSION_KEY, JSON.stringify(data));
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, checkCredentials, completeLogin, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
