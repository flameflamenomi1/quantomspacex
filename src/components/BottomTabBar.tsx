import { useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, ArrowLeftRight, TrendingUp, Bell, Lock } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

const tabs = [
  { path: '/dashboard', icon: LayoutDashboard, label: 'Home' },
  { path: '/transactions', icon: ArrowLeftRight, label: 'Wallet' },
  { path: '/markets', icon: TrendingUp, label: 'Markets' },
  { path: '/investment-plans', icon: Lock, label: 'Plans' },
  { path: '/notifications', icon: Bell, label: 'Alerts' },
];

export default function BottomTabBar() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  if (!user) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden bottom-tab-bar">
      <div
        className="relative"
        style={{
          background: 'rgba(10, 8, 22, 0.92)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          borderTop: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        {/* Top thin accent line */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-brand-success/30 to-transparent" />

        <div className="flex items-center justify-around px-2 pt-2 pb-1">
          {tabs.map(({ path, icon: Icon, label }) => {
            const active = location.pathname === path || location.pathname.startsWith(path + '/');
            return (
              <button
                key={path}
                onClick={() => navigate(path)}
                className={`relative flex flex-col items-center justify-center gap-1 py-2 px-5 rounded-2xl transition-all duration-300 ${
                  active ? 'text-white' : 'text-brand-textMuted'
                }`}
                aria-label={label}
              >
                {/* Active background glow pill */}
                {active && (
                  <span
                    className="absolute inset-0 rounded-2xl"
                    style={{
                      background: 'rgba(239,68,68,0.12)',
                      border: '1px solid rgba(239,68,68,0.2)',
                    }}
                  />
                )}

                {/* Icon with optional glow */}
                <span className={`relative transition-all duration-300 ${active ? 'tab-active-glow' : ''}`}>
                  <Icon
                    className={`w-[22px] h-[22px] transition-all duration-300 ${active ? 'text-brand-success' : ''}`}
                    strokeWidth={active ? 2.2 : 1.7}
                  />
                </span>

                <span
                  className={`relative text-[10px] font-semibold tracking-wide transition-all duration-300 ${
                    active ? 'text-brand-success' : 'opacity-50'
                  }`}
                >
                  {label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
