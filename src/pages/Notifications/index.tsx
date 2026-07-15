import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { Bell, CheckCheck, ArrowLeft, Info, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import { getNotifications, markNotificationRead, type Notification } from '@/lib/db';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';

const typeConfig: Record<string, { icon: React.ElementType; color: string; bg: string; border: string }> = {
  success: { icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-400/10', border: 'border-green-400/20' },
  error: { icon: XCircle, color: 'text-red-400', bg: 'bg-red-400/10', border: 'border-red-400/20' },
  warning: { icon: AlertTriangle, color: 'text-yellow-400', bg: 'bg-yellow-400/10', border: 'border-yellow-400/20' },
  info: { icon: Info, color: 'text-blue-400', bg: 'bg-blue-400/10', border: 'border-blue-400/20' },
};

export default function NotificationsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const load = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const data = await getNotifications(user.id);
      setNotifications(data);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    load();
    if (!user?.id) return;
    const userId = user.id;
    const sub = supabase
      .channel(`notif-page-${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(sub); };
  }, [load]);

  const markRead = async (n: Notification) => {
    if (n.is_read) return;
    await markNotificationRead(n.id);
    setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, is_read: true } : x));
  };

  const markAllRead = async () => {
    const unread = notifications.filter(n => !n.is_read);
    await Promise.all(unread.map(n => markNotificationRead(n.id)));
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  };

  const displayed = filter === 'unread' ? notifications.filter(n => !n.is_read) : notifications;
  const unreadCount = notifications.filter(n => !n.is_read).length;

  if (!user) return <Navigate to="/login" replace />;

  return (
    <div className="min-h-screen bg-brand-bg text-white pb-tab md:pb-20">
      {/* Header */}
      <section id="notifications-header" className="border-b border-brand-border bg-brand-card/40 backdrop-blur-sm sticky top-0 z-30">
        <div className="max-w-2xl mx-auto px-3 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)}
              className="p-1.5 rounded-lg border border-brand-border hover:border-brand-success transition-colors text-brand-textMuted hover:text-white">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h1 className="text-base sm:text-xl font-bold text-white flex items-center gap-2">
                Notifications
                {unreadCount > 0 && (
                  <span className="bg-brand-danger text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                    {unreadCount}
                  </span>
                )}
              </h1>
            </div>
          </div>
          {unreadCount > 0 && (
            <button onClick={markAllRead}
              className="flex items-center gap-1.5 text-xs text-brand-textMuted hover:text-brand-success transition-colors font-medium">
              <CheckCheck className="w-4 h-4" />
              <span className="hidden sm:inline">Mark all read</span>
            </button>
          )}
        </div>
      </section>

      <div className="max-w-2xl mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-4">
        {/* Filter */}
        <div className="flex gap-2">
          {(['all', 'unread'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-full text-xs font-semibold transition-all capitalize ${filter === f ? 'bg-brand-success text-brand-bg' : 'bg-brand-card border border-brand-border text-brand-textMuted hover:text-white'}`}>
              {f === 'all' ? `All (${notifications.length})` : `Unread (${unreadCount})`}
            </button>
          ))}
        </div>

        {/* List */}
        {loading ? (
          <div className="py-16 flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-brand-border border-t-brand-success rounded-full animate-spin" />
          </div>
        ) : displayed.length === 0 ? (
          <div className="py-20 text-center">
            <Bell className="w-12 h-12 text-brand-border mx-auto mb-4" />
            <p className="text-white font-semibold mb-1">
              {filter === 'unread' ? 'All caught up!' : 'No notifications yet'}
            </p>
            <p className="text-brand-textMuted text-sm">
              {filter === 'unread' ? 'No unread notifications.' : "We'll notify you about deposits, trades, and account updates."}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {displayed.map(n => {
              const cfg = typeConfig[n.type] || typeConfig.info;
              const Icon = cfg.icon;
              return (
                <button key={n.id} onClick={() => markRead(n)}
                  className={`w-full text-left rounded-xl border p-4 transition-all ${cfg.border} ${cfg.bg} ${!n.is_read ? 'opacity-100' : 'opacity-50'} hover:opacity-100`}>
                  <div className="flex items-start gap-3">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${cfg.bg} border ${cfg.border}`}>
                      <Icon className={`w-4 h-4 ${cfg.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-white text-sm font-semibold leading-snug">{n.title}</p>
                        {!n.is_read && (
                          <span className="w-2 h-2 bg-brand-danger rounded-full flex-shrink-0 mt-1.5" />
                        )}
                      </div>
                      <p className="text-brand-textMuted text-xs mt-1 leading-relaxed">{n.message}</p>
                      <p className="text-brand-textMuted text-[10px] mt-2">{new Date(n.created_at).toLocaleString()}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
