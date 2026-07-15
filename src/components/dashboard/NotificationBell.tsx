import { useState, useEffect, memo } from 'react';
import { Bell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getNotifications, type Notification } from '@/lib/db';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';

function NotificationBell() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    if (!user?.id) return;
    const userId = user.id;

    const load = async () => {
      const data = await getNotifications(userId);
      setNotifications(data);
    };
    load();

    // Real-time: new notifications pushed from admin
    const sub = supabase
      .channel(`notif-bell-${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` }, () => {
        load();
      })
      .subscribe();

    return () => { supabase.removeChannel(sub); };
  }, [user?.id]);

  const unread = notifications.filter(n => !n.is_read).length;

  return (
    <button
      onClick={() => navigate('/notifications')}
      className="relative p-2 border border-brand-border hover:border-brand-borderLight hover:bg-brand-card rounded-lg transition-colors text-brand-textMuted hover:text-white"
    >
      <Bell className="w-4 h-4" />
      {unread > 0 && (
        <span className="absolute -top-1 -right-1 w-4 h-4 bg-brand-danger text-white text-[9px] font-bold rounded-full flex items-center justify-center">
          {unread > 9 ? '9+' : unread}
        </span>
      )}
    </button>
  );
}

export default memo(NotificationBell);
