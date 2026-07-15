import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, DollarSign, ShieldCheck, TrendingUp, MessageSquare,
  CheckCircle, XCircle, Clock, LogOut,
  Eye, Send, RefreshCw, Search, X, Menu, Key, Copy, Check, EyeOff, Mail, Lock as LockIcon, Plus, Trash2, Ban, UserCheck, Activity
} from 'lucide-react';
import {
  getAllUsers, getDeposits, getKycSubmissions, getTrades, getAllChatUsers,
  getChatMessages, sendMessage, markMessagesRead, updateDepositStatus,
  updateKycStatus, creditUserBalance, createTrade, updateTradeStatus,
  sendNotification, getWithdrawals, updateWithdrawalStatus, getAllCodes,
  adjustUserBalance, loginUser, deleteUser, deleteAllUsers, toggleUserSuspension,
  logAdminActivity, getAdminActivityLog,
  type User, type Deposit, type KycSubmission, type Trade, type ChatMessage, type Withdrawal, type VerificationCode, type AdminActivityLog
} from '@/lib/db';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

const ADMIN_KEY = 'qsx_admin_session';

type Tab = 'overview' | 'deposits' | 'withdrawals' | 'kyc' | 'trades' | 'chat' | 'users' | 'codes' | 'plans' | 'activity';

// ── Helpers ───────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
    approved: 'bg-brand-success/15 text-brand-success border-brand-success/30',
    rejected: 'bg-brand-danger/15 text-brand-danger border-brand-danger/30',
    open: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    closed: 'bg-brand-success/15 text-brand-success border-brand-success/30',
    cancelled: 'bg-brand-textMuted/15 text-brand-textMuted border-brand-textMuted/30',
    active: 'bg-brand-success/15 text-brand-success border-brand-success/30',
    suspended: 'bg-brand-danger/15 text-brand-danger border-brand-danger/30',
    unverified: 'bg-brand-textMuted/15 text-brand-textMuted border-brand-textMuted/30',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded border text-xs font-semibold uppercase tracking-wide ${map[status] || map.pending}`}>
      {status}
    </span>
  );
}

function StatCard({ icon: Icon, label, value, sub, color }: { icon: React.ElementType; label: string; value: string | number; sub?: string; color: string }) {
  return (
    <div className="bg-brand-card border border-brand-border rounded-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-brand-textMuted uppercase tracking-widest">{label}</span>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${color}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <div className="text-2xl font-bold font-mono text-white">{value}</div>
      {sub && <div className="text-xs text-brand-textMuted mt-1">{sub}</div>}
    </div>
  );
}

// ── Login Gate ─────────────────────────────────────────
function AdminLogin({ onAuth }: { onAuth: (adminUser: User) => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const user = await loginUser(email, password);
      
      // Check if user has admin role
      if (user.role !== 'admin') {
        setError('Access denied. Admin privileges required.');
        setLoading(false);
        return;
      }

      onAuth(user);
    } catch {
      setError('Invalid email or password.');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-brand-bg flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-brand-success/10 border border-brand-success/30 rounded-xl flex items-center justify-center mx-auto mb-5">
            <ShieldCheck className="w-8 h-8 text-brand-success" />
          </div>
          <h1 className="font-serif text-3xl font-bold text-white mb-2">Admin Portal</h1>
          <p className="text-brand-textMuted">Quantumspacex Control Center</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-brand-card border border-brand-border rounded-xl p-8 space-y-5">
          <div>
            <label className="block text-xs text-brand-textMuted uppercase tracking-wider mb-2">Admin Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-textMuted" />
              <input
                type="email"
                value={email}
                onChange={e => { setEmail(e.target.value); setError(''); }}
                className="w-full bg-brand-bg border border-brand-border rounded-lg pl-10 pr-4 py-3 text-white text-sm focus:outline-none focus:border-brand-success transition-colors"
                placeholder="admin@quantumspacex.com"
                required
                autoFocus
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-brand-textMuted uppercase tracking-wider mb-2">Password</label>
            <div className="relative">
              <LockIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-textMuted" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => { setPassword(e.target.value); setError(''); }}
                className="w-full bg-brand-bg border border-brand-border rounded-lg pl-10 pr-12 py-3 text-white text-sm focus:outline-none focus:border-brand-success transition-colors"
                placeholder="••••••••"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-textMuted hover:text-white transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
              <XCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand-success text-brand-bg font-bold py-3.5 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-brand-bg border-t-transparent rounded-full animate-spin" />
                Authenticating...
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" />
                Enter Admin Panel
              </>
            )}
          </button>

          <div className="pt-4 border-t border-brand-border">
            <p className="text-xs text-brand-textMuted text-center">
              Default credentials:<br />
              <span className="font-mono text-white">admin@quantumspacex.com</span> / <span className="font-mono text-white">Admin123!</span>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Investment Plans Admin ─────────────────────────────
function InvestmentPlansAdmin() {
  const [subscriptions, setSubscriptions] = useState<Array<{
    id: string;
    user_id: string;
    plan_id: string;
    amount: number;
    status: string;
    start_date: string;
    end_date: string;
    expected_payout: number;
    actual_payout?: number;
    admin_note?: string;
    created_at: string;
    users?: { full_name: string; email: string };
    investment_plans?: { name: string; expected_return_percent: number; duration_days: number };
  }>>([]);
  const [loading, setLoading] = useState(true);
  const [payoutModal, setPayoutModal] = useState<{ id: string; userName: string; expectedPayout: number; userId: string } | null>(null);
  const [payoutAmount, setPayoutAmount] = useState('');
  const [payoutNote, setPayoutNote] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => { loadSubs(); }, []);

  async function loadSubs() {
    setLoading(true);
    const { data } = await supabase
      .from('plan_subscriptions')
      .select('*, users(full_name, email), investment_plans(name, expected_return_percent, duration_days)')
      .order('created_at', { ascending: false });
    if (data) setSubscriptions(data);
    setLoading(false);
  }

  async function handleCompletePayout() {
    if (!payoutModal) return;
    setProcessing(true);
    try {
      const amt = parseFloat(payoutAmount);
      // Credit user balance
      const { data: u } = await supabase.from('users').select('balance').eq('id', payoutModal.userId).single();
      if (!u) throw new Error('User not found');
      const newBalance = u.balance + amt;
      await supabase.from('users').update({ balance: newBalance }).eq('id', payoutModal.userId);

      // Record balance history
      await supabase.from('balance_history').insert({
        user_id: payoutModal.userId,
        balance: newBalance,
        change_amount: amt,
        change_type: 'payout',
        description: `Investment plan completed: +$${amt.toLocaleString()}${payoutNote ? ` - ${payoutNote}` : ''}`
      });

      // Update subscription
      await supabase.from('plan_subscriptions').update({
        status: 'completed',
        actual_payout: amt,
        admin_note: payoutNote || null,
        updated_at: new Date().toISOString(),
      }).eq('id', payoutModal.id);

      // Notify user
      await supabase.from('notifications').insert({
        user_id: payoutModal.userId,
        title: 'Investment Plan Completed',
        message: `Your investment plan has matured. $${amt.toLocaleString(undefined, { maximumFractionDigits: 2 })} has been credited to your account.${payoutNote ? ` Note: ${payoutNote}` : ''}`,
        type: 'success',
        is_read: false,
      });

      setPayoutModal(null);
      setPayoutAmount('');
      setPayoutNote('');
      await loadSubs();
    } catch {
      alert('Failed to process payout. Please try again.');
    }
    setProcessing(false);
  }

  async function handleCancel(subId: string, userId: string, amount: number) {
    if (!confirm('Cancel this subscription and refund the locked amount?')) return;
    const { data: u } = await supabase.from('users').select('balance').eq('id', userId).single();
    if (!u) return;
    const newBalance = u.balance + amount;
    await supabase.from('users').update({ balance: newBalance }).eq('id', userId);
    
    // Record balance history
    await supabase.from('balance_history').insert({
      user_id: userId,
      balance: newBalance,
      change_amount: amount,
      change_type: 'investment',
      description: `Investment plan cancelled - refund: +$${amount.toLocaleString()}`
    });
    
    await supabase.from('plan_subscriptions').update({ status: 'cancelled', updated_at: new Date().toISOString() }).eq('id', subId);
    await supabase.from('notifications').insert({
      user_id: userId,
      title: 'Investment Plan Cancelled',
      message: `Your investment plan has been cancelled. $${amount.toLocaleString()} has been refunded to your balance.`,
      type: 'info',
      is_read: false,
    });
    await loadSubs();
  }

  const active = subscriptions.filter(s => s.status === 'active');
  const completed = subscriptions.filter(s => s.status === 'completed');
  const totalLocked = active.reduce((s, a) => s + a.amount, 0);

  return (
    <div className="space-y-6">
      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Active Plans', value: active.length, color: 'text-brand-success' },
          { label: 'Total Locked', value: `$${totalLocked.toLocaleString()}`, color: 'text-white' },
          { label: 'Completed', value: completed.length, color: 'text-blue-400' },
        ].map(s => (
          <div key={s.label} className="bg-brand-card border border-brand-border rounded-xl p-4">
            <div className="text-xs text-brand-textMuted uppercase tracking-wider mb-1">{s.label}</div>
            <div className={`text-2xl font-bold font-mono ${s.color}`}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Subscriptions table */}
      <div className="bg-brand-card border border-brand-border rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-brand-border">
          <h3 className="font-semibold text-white">All Plan Subscriptions</h3>
        </div>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="text-center py-12 text-brand-textMuted text-sm">Loading...</div>
          ) : subscriptions.length === 0 ? (
            <div className="text-center py-12 text-brand-textMuted text-sm">No subscriptions yet.</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-brand-border">
                  <th className="text-left py-3 px-4 text-brand-textMuted font-medium text-xs uppercase tracking-wider">User</th>
                  <th className="text-left py-3 px-4 text-brand-textMuted font-medium text-xs uppercase tracking-wider">Plan</th>
                  <th className="text-left py-3 px-4 text-brand-textMuted font-medium text-xs uppercase tracking-wider">Amount</th>
                  <th className="text-left py-3 px-4 text-brand-textMuted font-medium text-xs uppercase tracking-wider">Expected</th>
                  <th className="text-left py-3 px-4 text-brand-textMuted font-medium text-xs uppercase tracking-wider">End Date</th>
                  <th className="text-left py-3 px-4 text-brand-textMuted font-medium text-xs uppercase tracking-wider">Status</th>
                  <th className="text-left py-3 px-4 text-brand-textMuted font-medium text-xs uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border/30">
                {subscriptions.map(sub => {
                  const daysLeft = Math.max(0, Math.ceil((new Date(sub.end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
                  return (
                    <tr key={sub.id} className="hover:bg-white/2 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-medium text-white">{sub.users?.full_name || 'Unknown'}</div>
                        <div className="text-xs text-brand-textMuted">{sub.users?.email}</div>
                      </td>
                      <td className="py-3 px-4 text-white">{sub.investment_plans?.name}</td>
                      <td className="py-3 px-4 font-mono font-bold text-white">${sub.amount.toLocaleString()}</td>
                      <td className="py-3 px-4 font-mono text-brand-success">${sub.expected_payout.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                      <td className="py-3 px-4 text-brand-textMuted text-xs">
                        {new Date(sub.end_date).toLocaleDateString()}
                        {sub.status === 'active' && <div className="text-yellow-400 font-semibold">{daysLeft}d left</div>}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold uppercase border ${
                          sub.status === 'active' ? 'bg-brand-success/10 text-brand-success border-brand-success/20'
                          : sub.status === 'completed' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                          : 'bg-red-500/10 text-red-400 border-red-500/20'
                        }`}>{sub.status}</span>
                      </td>
                      <td className="py-3 px-4">
                        {sub.status === 'active' && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => { setPayoutModal({ id: sub.id, userName: sub.users?.full_name || '', expectedPayout: sub.expected_payout, userId: sub.user_id }); setPayoutAmount(sub.expected_payout.toFixed(2)); }}
                              className="flex items-center gap-1 bg-brand-success/10 hover:bg-brand-success/20 text-brand-success border border-brand-success/30 px-2.5 py-1 rounded text-xs font-semibold transition-all"
                            >
                              Pay Out
                            </button>
                            <button
                              onClick={() => handleCancel(sub.id, sub.user_id, sub.amount)}
                              className="flex items-center gap-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 px-2.5 py-1 rounded text-xs font-semibold transition-all"
                            >
                              Cancel
                            </button>
                          </div>
                        )}
                        {sub.status === 'completed' && sub.actual_payout && (
                          <span className="text-xs text-brand-success font-mono font-bold">Paid: ${sub.actual_payout.toLocaleString()}</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Payout modal */}
      {payoutModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-brand-card border border-brand-border rounded-xl w-full max-w-md p-6">
            <h3 className="font-semibold text-white mb-1">Process Payout</h3>
            <p className="text-sm text-brand-textMuted mb-4">{payoutModal.userName} · Expected: ${payoutModal.expectedPayout.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-brand-textMuted uppercase tracking-wider mb-1.5">Payout Amount ($)</label>
                <input type="number" step="0.01" min="0" value={payoutAmount} onChange={e => setPayoutAmount(e.target.value)}
                  className="w-full bg-brand-bg border border-brand-border rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-brand-success" />
              </div>
              <div>
                <label className="block text-xs text-brand-textMuted uppercase tracking-wider mb-1.5">Note (optional)</label>
                <input type="text" value={payoutNote} onChange={e => setPayoutNote(e.target.value)} placeholder="Plan completed successfully"
                  className="w-full bg-brand-bg border border-brand-border rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-brand-success" />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => { setPayoutModal(null); setPayoutAmount(''); setPayoutNote(''); }}
                className="flex-1 border border-brand-border text-brand-textMuted py-2.5 rounded-lg hover:text-white transition-colors text-sm">Cancel</button>
              <button onClick={handleCompletePayout} disabled={!payoutAmount || processing}
                className="flex-1 bg-brand-success text-brand-bg font-bold py-2.5 rounded-lg hover:bg-red-700 transition-colors text-sm disabled:opacity-50">
                {processing ? 'Processing...' : 'Confirm Payout'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// ── Main Admin Panel ───────────────────────────────────
export default function AdminPage() {
  const navigate = useNavigate();
  const { user: contextUser } = useAuth();
  const [authed, setAuthed] = useState(false);
  const [adminUser, setAdminUser] = useState<User | null>(null);
  const [tab, setTab] = useState<Tab>('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Data
  const [users, setUsers] = useState<User[]>([]);
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [codes, setCodes] = useState<VerificationCode[]>([]);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [kycs, setKycs] = useState<KycSubmission[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [chatUsers, setChatUsers] = useState<{ user_id: string; users: { full_name: string; email: string } }[]>([]);
  const [activeChatUser, setActiveChatUser] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [adminNotifications, setAdminNotifications] = useState<Array<{ id: string; title: string; message: string; type: string; is_read: boolean; created_at: string }>>([]);

  // Modals
  const [tradeModal, setTradeModal] = useState<{ open: boolean; userId: string; userName: string }>({ open: false, userId: '', userName: '' });
  const [tradeForm, setTradeForm] = useState({ asset_symbol: 'BTC', asset_name: 'Bitcoin', asset_type: 'crypto', trade_type: 'buy', quantity: '', price: '', profit_loss: '' });
  const [bulkTradeModal, setBulkTradeModal] = useState<{ open: boolean; userId: string; userName: string }>({ open: false, userId: '', userName: '' });
  const [bulkTrades, setBulkTrades] = useState<Array<{ id: string; asset_symbol: string; asset_name: string; asset_type: string; trade_type: string; quantity: string; price: string; profit_loss: string; status: string; executed_at: string }>>([]);
  const [viewKyc, setViewKyc] = useState<KycSubmission | null>(null);
  const [noteModal, setNoteModal] = useState<{ open: boolean; type: 'deposit' | 'kyc'; id: string; userId: string } | null>(null);
  const [noteText, setNoteText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [balanceModal, setBalanceModal] = useState<{ userId: string; userName: string; currentBalance: number } | null>(null);
  const [balanceAmount, setBalanceAmount] = useState('');
  const [balanceNote, setBalanceNote] = useState('');
  const [balanceMode, setBalanceMode] = useState<'credit' | 'debit'>('credit');
  const [deleteConfirm, setDeleteConfirm] = useState<{ userId: string; userName: string } | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteAllConfirm, setDeleteAllConfirm] = useState(false);
  const [deleteAllLoading, setDeleteAllLoading] = useState(false);
  const [suspendModal, setSuspendModal] = useState<{ userId: string; userName: string; currentStatus: string } | null>(null);
  const [suspendReason, setSuspendReason] = useState('');
  const [suspendLoading, setSuspendLoading] = useState(false);
  const [activityLog, setActivityLog] = useState<AdminActivityLog[]>([]);

  useEffect(() => {
    // First check if user is already logged in via auth context
    if (contextUser?.role === 'admin') {
      setAdminUser(contextUser);
      setAuthed(true);
      return;
    }
    
    // Then check session storage
    const stored = sessionStorage.getItem(ADMIN_KEY);
    if (stored) {
      try {
        const user = JSON.parse(stored);
        if (user.role === 'admin') {
          setAdminUser(user);
          setAuthed(true);
        }
      } catch {
        sessionStorage.removeItem(ADMIN_KEY);
      }
    }
  }, [contextUser]);

  const handleAuth = (user: User) => {
    setAdminUser(user);
    setAuthed(true);
    sessionStorage.setItem(ADMIN_KEY, JSON.stringify(user));
    loadAll();
  };

  const loadAll = async () => {
    setRefreshing(true);
    try {
      const [u, d, k, t, cu, w, c, al] = await Promise.all([
        getAllUsers(), getDeposits(), getKycSubmissions(), getTrades(),
        getAllChatUsers(), getWithdrawals(), getAllCodes(), getAdminActivityLog()
      ]);
      setUsers(u);
      setDeposits(d);
      setKycs(k);
      setTrades(t);
      setChatUsers(cu as { user_id: string; users: { full_name: string; email: string } }[]);
      setWithdrawals(w);
      setCodes(c);
      setActivityLog(al);
      
      // Load admin notifications
      const { data: notifs } = await supabase
        .from('admin_notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      if (notifs) setAdminNotifications(notifs);
    } catch (e) { console.error(e); }
    setRefreshing(false);
  };

  useEffect(() => {
    if (authed) loadAll();
  }, [authed]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // Real-time chat polling
  useEffect(() => {
    if (!activeChatUser) return;
    const interval = setInterval(async () => {
      const msgs = await getChatMessages(activeChatUser);
      setChatMessages(msgs);
      await markMessagesRead(activeChatUser, 'user');
    }, 3000);
    return () => clearInterval(interval);
  }, [activeChatUser]);

  const openChat = async (userId: string) => {
    setActiveChatUser(userId);
    const msgs = await getChatMessages(userId);
    setChatMessages(msgs);
    await markMessagesRead(userId, 'user');
  };

  const handleSendChat = async () => {
    if (!chatInput.trim() || !activeChatUser) return;
    const msg = chatInput.trim();
    setChatInput('');
    await sendMessage(activeChatUser, 'admin', msg);
    const msgs = await getChatMessages(activeChatUser);
    setChatMessages(msgs);
    // Send notification to user
    const cu = chatUsers.find(c => c.user_id === activeChatUser);
    if (cu) {
      await sendNotification({
        user_id: activeChatUser,
        title: 'New message from Support',
        message: msg,
        type: 'info'
      });
    }
  };

  const handleApproveDeposit = async (dep: Deposit) => {
    setLoading(true);
    try {
      await updateDepositStatus(dep.id, 'approved');
      await creditUserBalance(dep.user_id, dep.amount);
      await sendNotification({
        user_id: dep.user_id,
        title: 'Deposit Approved',
        message: `Your deposit of $${dep.amount.toLocaleString()} ${dep.crypto_currency} has been approved and credited.`,
        type: 'success'
      });
      await loadAll();
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const handleRejectDeposit = async (dep: Deposit, note = '') => {
    setLoading(true);
    try {
      await updateDepositStatus(dep.id, 'rejected', note);
      await sendNotification({
        user_id: dep.user_id,
        title: 'Deposit Rejected',
        message: note || 'Your deposit could not be verified. Please contact support.',
        type: 'error'
      });
      await loadAll();
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const handleApproveKyc = async (kyc: KycSubmission) => {
    setLoading(true);
    try {
      await updateKycStatus(kyc.id, kyc.user_id, 'approved');
      await sendNotification({
        user_id: kyc.user_id,
        title: 'KYC Approved',
        message: 'Your identity has been verified. Your account is now fully active.',
        type: 'success'
      });
      await loadAll();
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const handleRejectKyc = async (kyc: KycSubmission, note = '') => {
    setLoading(true);
    try {
      await updateKycStatus(kyc.id, kyc.user_id, 'rejected', note);
      await sendNotification({
        user_id: kyc.user_id,
        title: 'KYC Rejected',
        message: note || 'Your verification was not approved. Please resubmit with valid documents.',
        type: 'error'
      });
      await loadAll();
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const handleSendTrade = async () => {
    if (!tradeForm.quantity || !tradeForm.price) return;
    setLoading(true);
    try {
      const qty = parseFloat(tradeForm.quantity);
      const price = parseFloat(tradeForm.price);
      const pl = parseFloat(tradeForm.profit_loss || '0');
      await createTrade({
        user_id: tradeModal.userId,
        asset_symbol: tradeForm.asset_symbol,
        asset_name: tradeForm.asset_name,
        asset_type: tradeForm.asset_type as 'stock' | 'crypto' | 'commodity',
        trade_type: tradeForm.trade_type as 'buy' | 'sell',
        quantity: qty,
        price,
        total_value: qty * price,
        profit_loss: pl,
        status: 'open',
        sent_by_admin: true
      });
      const totalValue = qty * price;
      const balanceUpdate = tradeForm.trade_type === 'buy' ? `+$${totalValue.toLocaleString()}` : `+$${pl.toFixed(2)} P&L`;
      alert(`Trade executed successfully!\n\n${tradeForm.trade_type.toUpperCase()} ${qty} ${tradeForm.asset_symbol} at $${price.toLocaleString()}\nBalance updated: ${balanceUpdate}`);
      setTradeModal({ open: false, userId: '', userName: '' });
      setTradeForm({ asset_symbol: 'BTC', asset_name: 'Bitcoin', asset_type: 'crypto', trade_type: 'buy', quantity: '', price: '', profit_loss: '' });
      await loadAll();
    } catch (e) {
      console.error(e);
      alert('Failed to execute trade: ' + (e instanceof Error ? e.message : 'Unknown error'));
    }
    setLoading(false);
  };

  const handleBulkAddTrade = () => {
    setBulkTrades(prev => [...prev, {
      id: Date.now().toString(),
      asset_symbol: 'BTC',
      asset_name: 'Bitcoin',
      asset_type: 'crypto',
      trade_type: 'buy',
      quantity: '',
      price: '',
      profit_loss: '',
      status: 'open',
      executed_at: new Date().toISOString()
    }]);
  };

  const handleBulkRemoveTrade = (id: string) => {
    setBulkTrades(prev => prev.filter(t => t.id !== id));
  };

  const handleBulkUpdateTrade = (id: string, field: string, value: string) => {
    setBulkTrades(prev => prev.map(t => {
      if (t.id !== id) return t;
      if (field === 'asset_symbol') {
        const asset = ASSETS.find(a => a.symbol === value);
        if (asset) {
          return { ...t, asset_symbol: asset.symbol, asset_name: asset.name, asset_type: asset.type };
        }
      }
      return { ...t, [field]: value };
    }));
  };

  const handleBulkSubmit = async () => {
    const validTrades = bulkTrades.filter(t => t.quantity && t.price);
    if (validTrades.length === 0) {
      alert('Please add at least one valid trade');
      return;
    }
    setLoading(true);
    try {
      for (const trade of validTrades) {
        const qty = parseFloat(trade.quantity);
        const price = parseFloat(trade.price);
        const pl = parseFloat(trade.profit_loss || '0');
        await createTrade({
          user_id: bulkTradeModal.userId,
          asset_symbol: trade.asset_symbol,
          asset_name: trade.asset_name,
          asset_type: trade.asset_type as 'stock' | 'crypto' | 'commodity',
          trade_type: trade.trade_type as 'buy' | 'sell',
          quantity: qty,
          price,
          total_value: qty * price,
          profit_loss: pl,
          status: trade.status as 'open' | 'closed',
          sent_by_admin: true,
          executed_at: trade.executed_at
        });
      }
      alert(`Successfully sent ${validTrades.length} trade(s)!`);
      setBulkTradeModal({ open: false, userId: '', userName: '' });
      setBulkTrades([]);
      await loadAll();
    } catch (e) {
      console.error(e);
      alert('Failed to send bulk trades');
    }
    setLoading(false);
  };

  const handleNoteSubmit = async () => {
    if (!noteModal) return;
    if (noteModal.type === 'deposit') {
      await handleRejectDeposit(deposits.find(d => d.id === noteModal.id)!, noteText);
    } else {
      await handleRejectKyc(kycs.find(k => k.id === noteModal.id)!, noteText);
    }
    setNoteModal(null);
    setNoteText('');
  };

  const handleBalanceAdjust = async () => {
    if (!balanceModal || !balanceAmount || !balanceNote.trim()) {
      alert('Please enter amount and note');
      return;
    }
    const raw = parseFloat(balanceAmount);
    if (isNaN(raw) || raw <= 0) {
      alert('Please enter a valid positive amount');
      return;
    }
    // Apply sign based on mode
    const amount = balanceMode === 'credit' ? raw : -raw;
    try {
      await adjustUserBalance(balanceModal.userId, amount, balanceNote);
      alert(`Balance ${balanceMode === 'credit' ? 'credited' : 'debited'} successfully!`);
      setBalanceModal(null);
      setBalanceAmount('');
      setBalanceNote('');
      setBalanceMode('credit');
      await loadAll();
    } catch {
      alert('Failed to adjust balance');
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteConfirm) return;
    setDeleteLoading(true);
    try {
      await logAdminActivity({
        admin_id: adminUser!.id,
        admin_name: adminUser!.full_name,
        action: 'deleted_user',
        target_user_id: deleteConfirm.userId,
        target_user_name: deleteConfirm.userName,
        details: 'User account permanently deleted',
      });
      await deleteUser(deleteConfirm.userId);
      setDeleteConfirm(null);
      await loadAll();
    } catch (err) {
      alert('Failed to delete user: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleDeleteAllUsers = async () => {
    setDeleteAllLoading(true);
    try {
      await deleteAllUsers();
      alert('All users deleted successfully');
      setDeleteAllConfirm(false);
      await loadAll();
    } catch (err) {
      alert('Failed to delete users');
      console.error(err);
    } finally {
      setDeleteAllLoading(false);
    }
  };

  const handleToggleSuspension = async (userId: string, currentStatus: string) => {
    const suspend = currentStatus !== 'suspended';
    setSuspendLoading(true);

    if (!suspend) {
      try {
        await toggleUserSuspension(userId, false);
        await logAdminActivity({
          admin_id: adminUser!.id,
          admin_name: adminUser!.full_name,
          action: 'reactivated',
          target_user_id: userId,
          target_user_name: users.find(u => u.id === userId)?.full_name || userId,
          details: 'Account reactivated',
        });
        await loadAll();
        alert('Account reactivated successfully.');
      } catch (err) {
        alert('Failed to reactivate user: ' + (err instanceof Error ? err.message : 'Unknown error'));
      } finally {
        setSuspendLoading(false);
      }
      return;
    }

    if (!suspendReason.trim()) {
      alert('Please provide a reason for suspension');
      setSuspendLoading(false);
      return;
    }

    try {
      await toggleUserSuspension(userId, true, suspendReason);
      await logAdminActivity({
        admin_id: adminUser!.id,
        admin_name: adminUser!.full_name,
        action: 'suspended',
        target_user_id: userId,
        target_user_name: suspendModal?.userName || userId,
        details: `Reason: ${suspendReason}`,
      });
      setSuspendModal(null);
      setSuspendReason('');
      await loadAll();
      alert('Account suspended successfully.');
    } catch (err) {
      alert('Failed to suspend user: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setSuspendLoading(false);
    }
  };

  const ASSETS = [
    { symbol: 'BTC', name: 'Bitcoin', type: 'crypto' },
    { symbol: 'ETH', name: 'Ethereum', type: 'crypto' },
    { symbol: 'SOL', name: 'Solana', type: 'crypto' },
    { symbol: 'TSLA', name: 'Tesla', type: 'stock' },
    { symbol: 'NVDA', name: 'Nvidia', type: 'stock' },
    { symbol: 'AAPL', name: 'Apple', type: 'stock' },
    { symbol: 'XAUUSD', name: 'Gold', type: 'commodity' },
    { symbol: 'XAGUSD', name: 'Silver', type: 'commodity' },
    { symbol: 'USOIL', name: 'Crude Oil', type: 'commodity' },
  ];

  const tabs: { id: Tab; label: string; icon: React.ElementType; count?: number }[] = [
    { id: 'overview', label: 'Overview', icon: TrendingUp },
    { id: 'deposits', label: 'Deposits', icon: DollarSign, count: deposits.filter(d => d.status === 'pending').length },
    { id: 'withdrawals', label: 'Withdrawals', icon: DollarSign, count: withdrawals.filter(w => w.status === 'pending').length },
    { id: 'kyc', label: 'KYC', icon: ShieldCheck, count: kycs.filter(k => k.status === 'pending').length },
    { id: 'trades', label: 'Trades', icon: TrendingUp },
    { id: 'codes', label: 'Verification Codes', icon: Key, count: codes.filter(c => !c.used && new Date(c.expires_at) > new Date()).length },
    { id: 'chat', label: 'Support Chat', icon: MessageSquare },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'plans', label: 'Investment Plans', icon: TrendingUp },
    { id: 'activity', label: 'Activity Log', icon: Activity },
  ];

  const approvedDepositsAmount = deposits.filter(d => d.status === 'approved').reduce((s, d) => s + d.amount, 0);

  if (!authed) return <AdminLogin onAuth={handleAuth} />;

  return (
    <div className="min-h-screen bg-brand-bg flex">
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-40 w-64 bg-brand-card border-r border-brand-border flex flex-col transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 lg:static lg:flex`}>
        <div className="p-5 border-b border-brand-border">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-brand-success/10 border border-brand-success/30 rounded-lg flex items-center justify-center flex-shrink-0">
              <ShieldCheck className="w-5 h-5 text-brand-success" />
            </div>
            <div className="min-w-0">
              <span className="font-serif text-lg font-bold text-white block">Admin Panel</span>
              <div className="text-xs text-brand-textMuted truncate">{adminUser?.full_name}</div>
            </div>
            <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-brand-textMuted hover:text-white ml-auto">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => { setTab(t.id); setSidebarOpen(false); }}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                tab === t.id
                  ? 'bg-brand-success/10 text-brand-success border border-brand-success/20'
                  : 'text-brand-textMuted hover:text-white hover:bg-white/5'
              }`}
            >
              <div className="flex items-center space-x-3">
                <t.icon className="w-4 h-4" />
                <span>{t.label}</span>
              </div>
              {t.count !== undefined && t.count > 0 && (
                <span className="bg-brand-danger text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-brand-border">
          <button
            onClick={() => { sessionStorage.removeItem(ADMIN_KEY); navigate('/'); }}
            className="w-full flex items-center space-x-2 px-3 py-2.5 rounded-lg text-brand-textMuted hover:text-brand-danger hover:bg-brand-danger/5 transition-all text-sm"
          >
            <LogOut className="w-4 h-4" />
            <span>Exit Admin</span>
          </button>
        </div>
      </aside>

      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="bg-brand-card border-b border-brand-border px-4 sm:px-6 py-4 flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center space-x-3">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-brand-textMuted hover:text-white">
              <Menu className="w-5 h-5" />
            </button>
            <h2 className="text-lg font-bold text-white capitalize">{tab.replace('_', ' ')}</h2>
            <button
              onClick={() => navigate('/admin/bulk-trade')}
              className="hidden sm:flex items-center gap-2 bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 border border-orange-500/30 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ml-4"
            >
              <TrendingUp className="w-3.5 h-3.5" />
              Bulk Trade
            </button>
          </div>
          <div className="flex items-center space-x-3">
            {adminNotifications.filter(n => !n.is_read).length > 0 && (
              <div className="relative group">
                <button
                  onClick={() => setTab('plans')}
                  className="relative p-2 text-brand-textMuted hover:text-white transition-colors"
                  title="Expired investment plans need attention"
                >
                  <TrendingUp className="w-5 h-5" />
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
                    {adminNotifications.filter(n => !n.is_read).length}
                  </span>
                </button>
                <div className="absolute right-0 top-full mt-2 w-64 bg-brand-card border border-brand-border rounded-xl shadow-2xl p-3 opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-opacity z-50">
                  <div className="text-xs text-brand-textMuted mb-2 font-semibold uppercase tracking-wider">
                    Pending Payouts
                  </div>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {adminNotifications.filter(n => !n.is_read).slice(0, 3).map(n => (
                      <div key={n.id} className="text-xs text-white leading-relaxed p-2 bg-brand-bg rounded">
                        {n.message}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
            <button
              onClick={loadAll}
              className={`p-2 text-brand-textMuted hover:text-white transition-colors ${refreshing ? 'animate-spin' : ''}`}
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <div className="w-8 h-8 bg-brand-success/10 border border-brand-success/30 rounded-lg flex items-center justify-center">
              <ShieldCheck className="w-4 h-4 text-brand-success" />
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 overflow-y-auto">

          {/* ── OVERVIEW ── */}
          {tab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard icon={Users} label="Total Users" value={users.length} sub={`${users.filter(u => u.status === 'active').length} active`} color="bg-blue-500/10 text-blue-400" />
                <StatCard icon={DollarSign} label="Approved Deposits" value={`$${approvedDepositsAmount.toLocaleString()}`} sub={`${deposits.filter(d => d.status === 'approved').length} transactions`} color="bg-brand-success/10 text-brand-success" />
                <StatCard icon={Clock} label="Pending Requests" value={deposits.filter(d => d.status === 'pending').length + withdrawals.filter(w => w.status === 'pending').length} sub={`${deposits.filter(d => d.status === 'pending').length} deposits · ${withdrawals.filter(w => w.status === 'pending').length} withdrawals`} color="bg-yellow-500/10 text-yellow-400" />
                <StatCard icon={TrendingUp} label="Open Trades" value={trades.filter(t => t.status === 'open').length} sub={`${trades.length} total`} color="bg-purple-500/10 text-purple-400" />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recent Deposits */}
                <div className="bg-brand-card border border-brand-border rounded-xl p-5">
                  <h3 className="font-semibold text-white mb-4 flex items-center justify-between">
                    Recent Deposits
                    <button onClick={() => setTab('deposits')} className="text-xs text-brand-success hover:underline">View all</button>
                  </h3>
                  <div className="space-y-3">
                    {deposits.slice(0, 5).map(d => (
                      <div key={d.id} className="flex items-center justify-between py-2 border-b border-brand-border/30 last:border-0">
                        <div>
                          <div className="text-sm text-white font-medium">{d.users?.full_name || 'Unknown'}</div>
                          <div className="text-xs text-brand-textMuted">{d.crypto_currency} • {new Date(d.created_at).toLocaleDateString()}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-mono font-bold text-white">${d.amount.toLocaleString()}</div>
                          <StatusBadge status={d.status} />
                        </div>
                      </div>
                    ))}
                    {deposits.length === 0 && <p className="text-brand-textMuted text-sm">No deposits yet.</p>}
                  </div>
                </div>

                {/* Recent KYC */}
                <div className="bg-brand-card border border-brand-border rounded-xl p-5">
                  <h3 className="font-semibold text-white mb-4 flex items-center justify-between">
                    Recent KYC
                    <button onClick={() => setTab('kyc')} className="text-xs text-brand-success hover:underline">View all</button>
                  </h3>
                  <div className="space-y-3">
                    {kycs.slice(0, 5).map(k => (
                      <div key={k.id} className="flex items-center justify-between py-2 border-b border-brand-border/30 last:border-0">
                        <div>
                          <div className="text-sm text-white font-medium">{k.users?.full_name || k.full_name}</div>
                          <div className="text-xs text-brand-textMuted">{k.id_type} • {new Date(k.created_at).toLocaleDateString()}</div>
                        </div>
                        <StatusBadge status={k.status} />
                      </div>
                    ))}
                    {kycs.length === 0 && <p className="text-brand-textMuted text-sm">No KYC submissions yet.</p>}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── DEPOSITS ── */}
          {tab === 'deposits' && (
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <div className="relative flex-1 max-w-xs">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-textMuted" />
                  <input
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search by name or currency..."
                    className="w-full bg-brand-card border border-brand-border rounded-lg pl-9 pr-4 py-2 text-white text-sm focus:outline-none focus:border-brand-success"
                  />
                </div>
              </div>

              <div className="bg-brand-card border border-brand-border rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-brand-border">
                        <th className="text-left py-3 px-4 text-brand-textMuted font-medium text-xs uppercase tracking-wider">User</th>
                        <th className="text-left py-3 px-4 text-brand-textMuted font-medium text-xs uppercase tracking-wider">Amount</th>
                        <th className="text-left py-3 px-4 text-brand-textMuted font-medium text-xs uppercase tracking-wider">Currency</th>
                        <th className="text-left py-3 px-4 text-brand-textMuted font-medium text-xs uppercase tracking-wider">Wallet</th>
                        <th className="text-left py-3 px-4 text-brand-textMuted font-medium text-xs uppercase tracking-wider">TX Hash</th>
                        <th className="text-left py-3 px-4 text-brand-textMuted font-medium text-xs uppercase tracking-wider">Receipt</th>
                        <th className="text-left py-3 px-4 text-brand-textMuted font-medium text-xs uppercase tracking-wider">Status</th>
                        <th className="text-left py-3 px-4 text-brand-textMuted font-medium text-xs uppercase tracking-wider">Date</th>
                        <th className="text-left py-3 px-4 text-brand-textMuted font-medium text-xs uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-brand-border/30">
                      {deposits
                        .filter(d =>
                          !searchQuery ||
                          d.users?.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          d.crypto_currency.toLowerCase().includes(searchQuery.toLowerCase())
                        )
                        .map(dep => (
                          <tr key={dep.id} className="hover:bg-white/2 transition-colors">
                            <td className="py-3 px-4">
                              <div className="font-medium text-white">{dep.users?.full_name || 'Unknown'}</div>
                              <div className="text-xs text-brand-textMuted">{dep.users?.email}</div>
                            </td>
                            <td className="py-3 px-4 font-mono font-bold text-white">${dep.amount.toLocaleString()}</td>
                            <td className="py-3 px-4 text-brand-textMuted">{dep.crypto_currency}</td>
                            <td className="py-3 px-4 text-brand-textMuted text-xs font-mono max-w-[120px] truncate" title={dep.wallet_address || 'N/A'}>
                              {dep.wallet_address || '—'}
                            </td>
                            <td className="py-3 px-4 text-brand-textMuted text-xs font-mono max-w-[100px] truncate">{dep.tx_hash || '—'}</td>
                            <td className="py-3 px-4">
                              {dep.receipt_url ? (
                                <a
                                  href={dep.receipt_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-1 text-brand-success hover:text-brand-success/80 text-xs font-medium transition-colors"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                  View
                                </a>
                              ) : (
                                <span className="text-brand-textMuted text-xs">—</span>
                              )}
                            </td>
                            <td className="py-3 px-4"><StatusBadge status={dep.status} /></td>
                            <td className="py-3 px-4 text-brand-textMuted text-xs">{new Date(dep.created_at).toLocaleDateString()}</td>
                            <td className="py-3 px-4">
                              {dep.status === 'pending' && (
                                <div className="flex items-center space-x-2">
                                  <button
                                    onClick={() => handleApproveDeposit(dep)}
                                    disabled={loading}
                                    className="flex items-center space-x-1 bg-brand-success/10 hover:bg-brand-success/20 text-brand-success border border-brand-success/30 px-2.5 py-1 rounded text-xs font-semibold transition-all"
                                  >
                                    <CheckCircle className="w-3.5 h-3.5" />
                                    <span>Approve</span>
                                  </button>
                                  <button
                                    onClick={() => setNoteModal({ open: true, type: 'deposit', id: dep.id, userId: dep.user_id })}
                                    disabled={loading}
                                    className="flex items-center space-x-1 bg-brand-danger/10 hover:bg-brand-danger/20 text-brand-danger border border-brand-danger/30 px-2.5 py-1 rounded text-xs font-semibold transition-all"
                                  >
                                    <XCircle className="w-3.5 h-3.5" />
                                    <span>Reject</span>
                                  </button>
                                </div>
                              )}
                              {dep.status !== 'pending' && dep.admin_note && (
                                <span className="text-xs text-brand-textMuted italic">"{dep.admin_note}"</span>
                              )}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                  {deposits.length === 0 && (
                    <div className="text-center py-12 text-brand-textMuted">No deposits found.</div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── WITHDRAWALS ── */}
          {tab === 'withdrawals' && (
            <div className="space-y-4">
              <div className="bg-brand-card border border-brand-border rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-brand-border">
                        <th className="text-left py-3 px-4 text-brand-textMuted font-medium text-xs uppercase tracking-wider">User</th>
                        <th className="text-left py-3 px-4 text-brand-textMuted font-medium text-xs uppercase tracking-wider">Amount</th>
                        <th className="text-left py-3 px-4 text-brand-textMuted font-medium text-xs uppercase tracking-wider">Currency</th>
                        <th className="text-left py-3 px-4 text-brand-textMuted font-medium text-xs uppercase tracking-wider">Network</th>
                        <th className="text-left py-3 px-4 text-brand-textMuted font-medium text-xs uppercase tracking-wider">Wallet Address</th>
                        <th className="text-left py-3 px-4 text-brand-textMuted font-medium text-xs uppercase tracking-wider">Status</th>
                        <th className="text-left py-3 px-4 text-brand-textMuted font-medium text-xs uppercase tracking-wider">Date</th>
                        <th className="text-left py-3 px-4 text-brand-textMuted font-medium text-xs uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-brand-border/30">
                      {withdrawals.map(wd => (
                        <tr key={wd.id} className="hover:bg-white/2 transition-colors">
                          <td className="py-3 px-4">
                            <div className="font-medium text-white">{wd.users?.full_name || 'Unknown'}</div>
                            <div className="text-xs text-brand-textMuted">{wd.users?.email}</div>
                          </td>
                          <td className="py-3 px-4 font-mono font-bold text-brand-danger">${wd.amount.toLocaleString()}</td>
                          <td className="py-3 px-4 text-brand-textMuted">{wd.crypto_currency}</td>
                          <td className="py-3 px-4 text-brand-textMuted text-xs">{wd.network || '—'}</td>
                          <td className="py-3 px-4 text-brand-textMuted text-xs font-mono max-w-[140px] truncate" title={wd.wallet_address}>{wd.wallet_address}</td>
                          <td className="py-3 px-4"><StatusBadge status={wd.status} /></td>
                          <td className="py-3 px-4 text-brand-textMuted text-xs">{new Date(wd.created_at).toLocaleDateString()}</td>
                          <td className="py-3 px-4">
                            {wd.status === 'pending' && (
                              <div className="flex items-center space-x-2">
                                <button
                                  onClick={async () => {
                                    setLoading(true);
                                    await updateWithdrawalStatus(wd.id, wd.user_id, 'approved');
                                    await sendNotification({
                                      user_id: wd.user_id,
                                      title: 'Withdrawal Approved',
                                      message: `Your withdrawal of $${wd.amount.toLocaleString()} ${wd.crypto_currency} has been approved and is being processed.`,
                                      type: 'success',
                                    });
                                    await loadAll();
                                    setLoading(false);
                                  }}
                                  disabled={loading}
                                  className="flex items-center space-x-1 bg-brand-success/10 hover:bg-brand-success/20 text-brand-success border border-brand-success/30 px-2.5 py-1 rounded text-xs font-semibold transition-all"
                                >
                                  <CheckCircle className="w-3.5 h-3.5" />
                                  <span>Approve</span>
                                </button>
                                <button
                                  onClick={async () => {
                                    const note = window.prompt('Rejection reason (optional):') || '';
                                    setLoading(true);
                                    await updateWithdrawalStatus(wd.id, wd.user_id, 'rejected', note);
                                    await sendNotification({
                                      user_id: wd.user_id,
                                      title: 'Withdrawal Rejected',
                                      message: note || 'Your withdrawal request could not be processed. Your balance has been refunded.',
                                      type: 'error',
                                    });
                                    await loadAll();
                                    setLoading(false);
                                  }}
                                  disabled={loading}
                                  className="flex items-center space-x-1 bg-brand-danger/10 hover:bg-brand-danger/20 text-brand-danger border border-brand-danger/30 px-2.5 py-1 rounded text-xs font-semibold transition-all"
                                >
                                  <XCircle className="w-3.5 h-3.5" />
                                  <span>Reject</span>
                                </button>
                              </div>
                            )}
                            {wd.status !== 'pending' && wd.admin_note && (
                              <span className="text-xs text-brand-textMuted italic">"{wd.admin_note}"</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {withdrawals.length === 0 && (
                    <div className="text-center py-12 text-brand-textMuted">No withdrawal requests yet.</div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── KYC ── */}
          {tab === 'kyc' && (
            <div className="space-y-4">
              <div className="bg-brand-card border border-brand-border rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-brand-border">
                        <th className="text-left py-3 px-4 text-brand-textMuted font-medium text-xs uppercase tracking-wider">Name</th>
                        <th className="text-left py-3 px-4 text-brand-textMuted font-medium text-xs uppercase tracking-wider">ID Type</th>
                        <th className="text-left py-3 px-4 text-brand-textMuted font-medium text-xs uppercase tracking-wider">Nationality</th>
                        <th className="text-left py-3 px-4 text-brand-textMuted font-medium text-xs uppercase tracking-wider">Status</th>
                        <th className="text-left py-3 px-4 text-brand-textMuted font-medium text-xs uppercase tracking-wider">Submitted</th>
                        <th className="text-left py-3 px-4 text-brand-textMuted font-medium text-xs uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-brand-border/30">
                      {kycs.map(kyc => (
                        <tr key={kyc.id} className="hover:bg-white/2 transition-colors">
                          <td className="py-3 px-4">
                            <div className="font-medium text-white">{kyc.users?.full_name || kyc.full_name}</div>
                            <div className="text-xs text-brand-textMuted">{kyc.users?.email}</div>
                          </td>
                          <td className="py-3 px-4 text-brand-textMuted capitalize">{kyc.id_type?.replace('_', ' ') || '—'}</td>
                          <td className="py-3 px-4 text-brand-textMuted">{kyc.nationality || '—'}</td>
                          <td className="py-3 px-4"><StatusBadge status={kyc.status} /></td>
                          <td className="py-3 px-4 text-brand-textMuted text-xs">{new Date(kyc.created_at).toLocaleDateString()}</td>
                          <td className="py-3 px-4">
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => setViewKyc(kyc)}
                                className="flex items-center space-x-1 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 px-2.5 py-1 rounded text-xs font-semibold transition-all"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>View</span>
                              </button>
                              {kyc.status === 'pending' && (
                                <>
                                  <button
                                    onClick={() => handleApproveKyc(kyc)}
                                    disabled={loading}
                                    className="flex items-center space-x-1 bg-brand-success/10 hover:bg-brand-success/20 text-brand-success border border-brand-success/30 px-2.5 py-1 rounded text-xs font-semibold transition-all"
                                  >
                                    <CheckCircle className="w-3.5 h-3.5" />
                                    <span>Approve</span>
                                  </button>
                                  <button
                                    onClick={() => setNoteModal({ open: true, type: 'kyc', id: kyc.id, userId: kyc.user_id })}
                                    disabled={loading}
                                    className="flex items-center space-x-1 bg-brand-danger/10 hover:bg-brand-danger/20 text-brand-danger border border-brand-danger/30 px-2.5 py-1 rounded text-xs font-semibold transition-all"
                                  >
                                    <XCircle className="w-3.5 h-3.5" />
                                    <span>Reject</span>
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {kycs.length === 0 && (
                    <div className="text-center py-12 text-brand-textMuted">No KYC submissions yet.</div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── VERIFICATION CODES ── */}
          {tab === 'codes' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-brand-textMuted">All verification codes generated by users. Copy and send manually if email is not configured.</p>
                <button onClick={loadAll} className="flex items-center space-x-1 text-xs text-brand-success border border-brand-success/30 hover:bg-brand-success/10 px-3 py-1.5 rounded transition-colors">
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Refresh</span>
                </button>
              </div>

              <div className="bg-brand-card border border-brand-border rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-brand-border">
                        <th className="text-left py-3 px-4 text-brand-textMuted font-medium text-xs uppercase tracking-wider">User</th>
                        <th className="text-left py-3 px-4 text-brand-textMuted font-medium text-xs uppercase tracking-wider">Type</th>
                        <th className="text-left py-3 px-4 text-brand-textMuted font-medium text-xs uppercase tracking-wider">Code</th>
                        <th className="text-left py-3 px-4 text-brand-textMuted font-medium text-xs uppercase tracking-wider">Status</th>
                        <th className="text-left py-3 px-4 text-brand-textMuted font-medium text-xs uppercase tracking-wider">Expires</th>
                        <th className="text-left py-3 px-4 text-brand-textMuted font-medium text-xs uppercase tracking-wider">Created</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-brand-border/30">
                      {codes.map(c => {
                        const isExpired = new Date(c.expires_at) < new Date();
                        const isActive = !c.used && !isExpired;
                        return (
                          <tr key={c.id} className="hover:bg-white/2 transition-colors">
                            <td className="py-3 px-4">
                              <div className="font-medium text-white">{c.users?.full_name || 'Unknown'}</div>
                              <div className="text-xs text-brand-textMuted">{c.email}</div>
                            </td>
                            <td className="py-3 px-4">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded border text-xs font-semibold uppercase tracking-wide ${
                                c.type === 'login'
                                  ? 'bg-blue-500/15 text-blue-400 border-blue-500/30'
                                  : c.type === 'register'
                                  ? 'bg-purple-500/15 text-purple-400 border-purple-500/30'
                                  : c.type === 'password_reset'
                                  ? 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30'
                                  : 'bg-brand-danger/15 text-brand-danger border-brand-danger/30'
                              }`}>
                                {c.type === 'login' ? 'Login' : c.type === 'register' ? 'Registration' : c.type === 'password_reset' ? 'Password Reset' : 'Withdrawal'}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center space-x-2">
                                <span className={`font-mono text-lg font-bold tracking-widest ${isActive ? 'text-brand-success' : 'text-brand-textMuted'}`}>
                                  {c.code}
                                </span>
                                {isActive && (
                                  <button
                                    onClick={() => {
                                      navigator.clipboard.writeText(c.code);
                                      setCopiedCode(c.id);
                                      setTimeout(() => setCopiedCode(null), 2000);
                                    }}
                                    className="text-brand-textMuted hover:text-white transition-colors"
                                    title="Copy code"
                                  >
                                    {copiedCode === c.id ? <Check className="w-4 h-4 text-brand-success" /> : <Copy className="w-4 h-4" />}
                                  </button>
                                )}
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              {c.used
                                ? <span className="text-xs text-brand-textMuted font-medium">Used</span>
                                : isExpired
                                ? <span className="text-xs text-brand-danger font-medium">Expired</span>
                                : <span className="text-xs text-brand-success font-medium flex items-center space-x-1"><span className="w-1.5 h-1.5 bg-brand-success rounded-full inline-block" /><span>Active</span></span>
                              }
                            </td>
                            <td className="py-3 px-4 text-brand-textMuted text-xs">
                              {new Date(c.expires_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              <span className="ml-1">{new Date(c.expires_at).toLocaleDateString()}</span>
                            </td>
                            <td className="py-3 px-4 text-brand-textMuted text-xs">{new Date(c.created_at).toLocaleString()}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {codes.length === 0 && (
                    <div className="text-center py-12 text-brand-textMuted">No verification codes yet. They appear here when users try to log in or withdraw.</div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── TRADES ── */}
          {tab === 'trades' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-brand-textMuted">Manage and send trades to user accounts.</p>
                <button
                  onClick={() => {
                    if (users.length === 0) return;
                    setTradeModal({ open: true, userId: users[0].id, userName: users[0].full_name });
                  }}
                  className="flex items-center space-x-2 bg-brand-success text-brand-bg font-bold px-4 py-2 rounded-lg text-sm hover:bg-red-700 transition-colors"
                >
                  <Send className="w-4 h-4" />
                  <span>Send Trade</span>
                </button>
              </div>

              <div className="bg-brand-card border border-brand-border rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-brand-border">
                        <th className="text-left py-3 px-4 text-brand-textMuted font-medium text-xs uppercase tracking-wider">User</th>
                        <th className="text-left py-3 px-4 text-brand-textMuted font-medium text-xs uppercase tracking-wider">Asset</th>
                        <th className="text-left py-3 px-4 text-brand-textMuted font-medium text-xs uppercase tracking-wider">Type</th>
                        <th className="text-left py-3 px-4 text-brand-textMuted font-medium text-xs uppercase tracking-wider">Qty</th>
                        <th className="text-left py-3 px-4 text-brand-textMuted font-medium text-xs uppercase tracking-wider">Price</th>
                        <th className="text-left py-3 px-4 text-brand-textMuted font-medium text-xs uppercase tracking-wider">P&L</th>
                        <th className="text-left py-3 px-4 text-brand-textMuted font-medium text-xs uppercase tracking-wider">Executed</th>
                        <th className="text-left py-3 px-4 text-brand-textMuted font-medium text-xs uppercase tracking-wider">Status</th>
                        <th className="text-left py-3 px-4 text-brand-textMuted font-medium text-xs uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-brand-border/30">
                      {trades.map(t => (
                        <tr key={t.id} className="hover:bg-white/2 transition-colors">
                          <td className="py-3 px-4">
                            <div className="text-white font-medium">{t.users?.full_name || 'Unknown'}</div>
                            <div className="text-xs text-brand-textMuted">{t.sent_by_admin ? 'Admin sent' : 'User placed'}</div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-mono font-bold text-white">{t.asset_symbol}</div>
                            <div className="text-xs text-brand-textMuted">{t.asset_type}</div>
                          </td>
                          <td className="py-3 px-4">
                            <span className={`text-xs font-bold uppercase ${t.trade_type === 'buy' ? 'text-brand-success' : 'text-brand-danger'}`}>
                              {t.trade_type}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-mono text-brand-textMuted">{t.quantity}</td>
                          <td className="py-3 px-4 font-mono text-white">${t.price.toLocaleString()}</td>
                          <td className="py-3 px-4 font-mono">
                            <span className={t.profit_loss >= 0 ? 'text-brand-success' : 'text-brand-danger'}>
                              {t.profit_loss >= 0 ? '+' : ''}${t.profit_loss.toLocaleString()}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="text-white text-xs">{new Date(t.executed_at || t.created_at).toLocaleDateString()}</div>
                            <div className="text-brand-textMuted text-xs">{new Date(t.executed_at || t.created_at).toLocaleTimeString()}</div>
                          </td>
                          <td className="py-3 px-4"><StatusBadge status={t.status} /></td>
                          <td className="py-3 px-4">
                            {t.status === 'open' && (
                              <button
                                onClick={() => updateTradeStatus(t.id, 'closed').then(loadAll)}
                                className="text-xs text-brand-textMuted hover:text-white border border-brand-border hover:border-white px-2.5 py-1 rounded transition-all"
                              >
                                Close
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {trades.length === 0 && (
                    <div className="text-center py-12 text-brand-textMuted">No trades yet. Send the first one above.</div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── CHAT ── */}
          {tab === 'chat' && (
            <div className="flex h-[calc(100vh-180px)] bg-brand-card border border-brand-border rounded-xl overflow-hidden">
              {/* User list */}
              <div className="w-64 border-r border-brand-border flex flex-col">
                <div className="p-4 border-b border-brand-border">
                  <h3 className="text-sm font-semibold text-white">Conversations</h3>
                </div>
                <div className="flex-1 overflow-y-auto">
                  {chatUsers.length === 0 && (
                    <div className="p-4 text-sm text-brand-textMuted">No conversations yet.</div>
                  )}
                  {chatUsers.map(cu => (
                    <button
                      key={cu.user_id}
                      onClick={() => openChat(cu.user_id)}
                      className={`w-full text-left p-4 border-b border-brand-border/30 hover:bg-white/5 transition-colors ${
                        activeChatUser === cu.user_id ? 'bg-brand-success/5 border-l-2 border-l-brand-success' : ''
                      }`}
                    >
                      <div className="font-medium text-white text-sm truncate">{cu.users?.full_name || 'User'}</div>
                      <div className="text-xs text-brand-textMuted truncate">{cu.users?.email}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Chat window */}
              <div className="flex-1 flex flex-col">
                {!activeChatUser ? (
                  <div className="flex-1 flex items-center justify-center text-brand-textMuted">
                    <div className="text-center">
                      <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-30" />
                      <p>Select a conversation</p>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="p-4 border-b border-brand-border">
                      <div className="font-semibold text-white text-sm">
                        {chatUsers.find(c => c.user_id === activeChatUser)?.users?.full_name || 'User'}
                      </div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                      {chatMessages.map(msg => (
                        <div key={msg.id} className={`flex ${msg.sender === 'admin' ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[75%] rounded-xl px-4 py-2.5 text-sm ${
                            msg.sender === 'admin'
                              ? 'bg-brand-success text-brand-bg font-medium'
                              : 'bg-brand-bg border border-brand-border text-white'
                          }`}>
                            <p>{msg.message}</p>
                            <p className="text-xs opacity-60 mt-1">{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                          </div>
                        </div>
                      ))}
                      <div ref={messagesEndRef} />
                    </div>
                    <div className="p-4 border-t border-brand-border flex space-x-3">
                      <input
                        value={chatInput}
                        onChange={e => setChatInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleSendChat()}
                        placeholder="Type a reply..."
                        className="flex-1 bg-brand-bg border border-brand-border rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-brand-success"
                      />
                      <button
                        onClick={handleSendChat}
                        className="bg-brand-success text-brand-bg px-4 py-2.5 rounded-lg hover:bg-red-700 transition-colors"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* ── USERS ── */}
          {tab === 'users' && (
            <div className="space-y-4">
              {/* Delete All Users Button */}
              <div className="flex justify-end">
                <button
                  onClick={() => setDeleteAllConfirm(true)}
                  disabled={users.filter(u => u.role !== 'admin').length === 0}
                  className="flex items-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 px-4 py-2 rounded-lg text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete All Users
                </button>
              </div>
              
              <div className="bg-brand-card border border-brand-border rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-brand-border">
                        <th className="text-left py-3 px-4 text-brand-textMuted font-medium text-xs uppercase tracking-wider">User</th>
                        <th className="text-left py-3 px-4 text-brand-textMuted font-medium text-xs uppercase tracking-wider">Balance</th>
                        <th className="text-left py-3 px-4 text-brand-textMuted font-medium text-xs uppercase tracking-wider">KYC</th>
                        <th className="text-left py-3 px-4 text-brand-textMuted font-medium text-xs uppercase tracking-wider">Status</th>
                        <th className="text-left py-3 px-4 text-brand-textMuted font-medium text-xs uppercase tracking-wider">Joined</th>
                        <th className="text-left py-3 px-4 text-brand-textMuted font-medium text-xs uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-brand-border/30">
                      {users.map(u => (
                        <tr key={u.id} className="hover:bg-white/2 transition-colors">
                          <td className="py-3 px-4">
                            <div className="font-medium text-white">{u.full_name}</div>
                            <div className="text-xs text-brand-textMuted">{u.email} {u.country ? `• ${u.country}` : ''}</div>
                          </td>
                          <td className="py-3 px-4 font-mono font-bold text-white">${u.balance.toLocaleString()}</td>
                          <td className="py-3 px-4"><StatusBadge status={u.kyc_status} /></td>
                          <td className="py-3 px-4"><StatusBadge status={u.status} /></td>
                          <td className="py-3 px-4 text-brand-textMuted text-xs">{new Date(u.created_at).toLocaleDateString()}</td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2 flex-wrap">
                              <button
                                onClick={() => setBalanceModal({ userId: u.id, userName: u.full_name, currentBalance: u.balance })}
                                className="flex items-center space-x-1 bg-brand-success/10 hover:bg-brand-success/20 text-brand-success border border-brand-success/30 px-2.5 py-1 rounded text-xs font-semibold transition-all"
                              >
                                <DollarSign className="w-3.5 h-3.5" />
                                <span>Adjust</span>
                              </button>
                              <button
                                onClick={() => setTradeModal({ open: true, userId: u.id, userName: u.full_name })}
                                className="flex items-center space-x-1 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 px-2.5 py-1 rounded text-xs font-semibold transition-all"
                              >
                                <Send className="w-3.5 h-3.5" />
                                <span>Trade</span>
                              </button>
                              <button
                                onClick={() => navigate('/admin/bulk-trade')}
                                className="flex items-center space-x-1 bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 border border-orange-500/30 px-2.5 py-1 rounded text-xs font-semibold transition-all"
                              >
                                <TrendingUp className="w-3.5 h-3.5" />
                                <span>Bulk</span>
                              </button>
                              <button
                                onClick={() => openChat(u.id).then(() => setTab('chat'))}
                                className="flex items-center space-x-1 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/30 px-2.5 py-1 rounded text-xs font-semibold transition-all"
                              >
                                <MessageSquare className="w-3.5 h-3.5" />
                                <span>Chat</span>
                              </button>
                              <button
                                onClick={() => {
                                  if (u.status === 'suspended') {
                                    handleToggleSuspension(u.id, u.status);
                                  } else {
                                    setSuspendReason('');
                                    setSuspendLoading(false);
                                    setSuspendModal({ userId: u.id, userName: u.full_name, currentStatus: u.status });
                                  }
                                }}
                                className={`flex items-center space-x-1 px-2.5 py-1 rounded text-xs font-semibold transition-all ${
                                  u.status === 'suspended'
                                    ? 'bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/30'
                                    : 'bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                                }`}
                              >
                                {u.status === 'suspended' ? (
                                  <>
                                    <UserCheck className="w-3.5 h-3.5" />
                                    <span>Activate</span>
                                  </>
                                ) : (
                                  <>
                                    <Ban className="w-3.5 h-3.5" />
                                    <span>Suspend</span>
                                  </>
                                )}
                              </button>
                              <button
                                onClick={() => setDeleteConfirm({ userId: u.id, userName: u.full_name })}
                                className="flex items-center space-x-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 px-2.5 py-1 rounded text-xs font-semibold transition-all"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Delete</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {users.length === 0 && (
                    <div className="text-center py-12 text-brand-textMuted">No users yet.</div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── INVESTMENT PLANS ── */}
          {tab === 'plans' && (
            <InvestmentPlansAdmin />
          )}

          {/* ── ACTIVITY LOG ── */}
          {tab === 'activity' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-white">Admin Activity Log</h2>
                <button onClick={loadAll} className="flex items-center gap-1.5 text-xs text-brand-textMuted hover:text-white transition-colors">
                  <RefreshCw className="w-3.5 h-3.5" /> Refresh
                </button>
              </div>
              <div className="bg-brand-card border border-brand-border rounded-xl overflow-hidden">
                {activityLog.length === 0 ? (
                  <div className="text-center py-12 text-brand-textMuted text-sm">No activity recorded yet.</div>
                ) : (
                  <div className="divide-y divide-brand-border">
                    {activityLog.map(log => {
                      const actionColors: Record<string, string> = {
                        suspended: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
                        reactivated: 'bg-green-500/10 text-green-400 border-green-500/30',
                        deleted_user: 'bg-red-500/10 text-red-400 border-red-500/30',
                      };
                      const colorClass = actionColors[log.action] || 'bg-blue-500/10 text-blue-400 border-blue-500/30';
                      return (
                        <div key={log.id} className="flex items-start gap-4 p-4 hover:bg-brand-bg/50 transition-colors">
                          <div className="w-8 h-8 rounded-full bg-brand-success/10 border border-brand-success/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <Activity className="w-4 h-4 text-brand-success" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-0.5">
                              <span className="text-white text-sm font-semibold">{log.admin_name}</span>
                              <span className={`inline-flex items-center px-2 py-0.5 rounded border text-xs font-bold uppercase tracking-wide ${colorClass}`}>
                                {log.action.replace('_', ' ')}
                              </span>
                              {log.target_user_name && (
                                <span className="text-brand-textMuted text-xs">→ <span className="text-white">{log.target_user_name}</span></span>
                              )}
                            </div>
                            {log.details && (
                              <p className="text-xs text-brand-textMuted mt-0.5">{log.details}</p>
                            )}
                          </div>
                          <div className="text-xs text-brand-textMuted flex-shrink-0 text-right">
                            {new Date(log.created_at).toLocaleDateString()}<br />
                            <span className="opacity-70">{new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* ── Send Trade Modal ── */}
      {tradeModal.open && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-brand-card border border-brand-border rounded-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-semibold text-white">Send Trade to {tradeModal.userName}</h3>
              <button onClick={() => setTradeModal({ open: false, userId: '', userName: '' })} className="text-brand-textMuted hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-brand-textMuted uppercase tracking-wider mb-1.5">Asset</label>
                  <select
                    value={tradeForm.asset_symbol}
                    onChange={e => {
                      const a = ASSETS.find(a => a.symbol === e.target.value)!;
                      setTradeForm(f => ({ ...f, asset_symbol: a.symbol, asset_name: a.name, asset_type: a.type }));
                    }}
                    className="w-full bg-brand-bg border border-brand-border rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-brand-success"
                  >
                    {ASSETS.map(a => <option key={a.symbol} value={a.symbol}>{a.symbol} — {a.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-brand-textMuted uppercase tracking-wider mb-1.5">Side</label>
                  <select
                    value={tradeForm.trade_type}
                    onChange={e => setTradeForm(f => ({ ...f, trade_type: e.target.value }))}
                    className="w-full bg-brand-bg border border-brand-border rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-brand-success"
                  >
                    <option value="buy">BUY</option>
                    <option value="sell">SELL</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-brand-textMuted uppercase tracking-wider mb-1.5">Quantity</label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={tradeForm.quantity}
                    onChange={e => setTradeForm(f => ({ ...f, quantity: e.target.value }))}
                    placeholder="0.00"
                    className="w-full bg-brand-bg border border-brand-border rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-brand-success"
                  />
                </div>
                <div>
                  <label className="block text-xs text-brand-textMuted uppercase tracking-wider mb-1.5 flex items-center justify-between">
                    <span>Entry Price ($)</span>
                    <button
                      type="button"
                      onClick={async () => {
                        const { getAssetPrice } = await import('@/lib/marketApi');
                        const price = await getAssetPrice(tradeForm.asset_symbol, tradeForm.asset_type as 'crypto' | 'stock' | 'commodity');
                        if (price) {
                          setTradeForm(f => ({ ...f, price: price.price.toString() }));
                        }
                      }}
                      className="text-[10px] text-brand-success hover:text-red-400 font-semibold transition-colors"
                    >
                      Live Price
                    </button>
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={tradeForm.price}
                    onChange={e => setTradeForm(f => ({ ...f, price: e.target.value }))}
                    placeholder="0.00"
                    className="w-full bg-brand-bg border border-brand-border rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-brand-success"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-brand-textMuted uppercase tracking-wider mb-1.5">Profit / Loss ($)</label>
                <input
                  type="number"
                  step="any"
                  value={tradeForm.profit_loss}
                  onChange={e => setTradeForm(f => ({ ...f, profit_loss: e.target.value }))}
                  placeholder="0.00 (use negative for loss)"
                  className="w-full bg-brand-bg border border-brand-border rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-brand-success"
                />
              </div>

              {tradeForm.quantity && tradeForm.price && (
                <div className="bg-brand-bg border border-brand-border rounded-lg p-3 text-sm">
                  <div className="flex justify-between text-brand-textMuted">
                    <span>Total Value</span>
                    <span className="font-mono text-white font-bold">
                      ${(parseFloat(tradeForm.quantity) * parseFloat(tradeForm.price)).toLocaleString()}
                    </span>
                  </div>
                </div>
              )}

              <div className="flex space-x-3 pt-2">
                <button
                  onClick={() => setTradeModal({ open: false, userId: '', userName: '' })}
                  className="flex-1 border border-brand-border text-brand-textMuted py-2.5 rounded-lg hover:text-white transition-colors text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSendTrade}
                  disabled={loading || !tradeForm.quantity || !tradeForm.price}
                  className="flex-1 bg-brand-success text-brand-bg font-bold py-2.5 rounded-lg hover:bg-red-700 transition-colors text-sm disabled:opacity-50 flex items-center justify-center space-x-2"
                >
                  {loading ? <div className="w-4 h-4 border-2 border-brand-bg border-t-transparent rounded-full animate-spin" /> : <><Send className="w-4 h-4" /><span>Send Trade</span></>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Bulk Trade Modal ── */}
      {bulkTradeModal.open && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-brand-card border border-brand-border rounded-xl w-full max-w-4xl p-6 my-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-semibold text-white text-lg">Bulk Trade to {bulkTradeModal.userName}</h3>
                <p className="text-xs text-brand-textMuted mt-1">Add multiple trades at once</p>
              </div>
              <button onClick={() => { setBulkTradeModal({ open: false, userId: '', userName: '' }); setBulkTrades([]); }} className="text-brand-textMuted hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 max-h-[60vh] overflow-y-auto mb-4">
              {bulkTrades.map((trade, idx) => (
                <div key={trade.id} className="bg-brand-bg border border-brand-border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-brand-textMuted uppercase">Trade #{idx + 1}</span>
                    {bulkTrades.length > 1 && (
                      <button
                        onClick={() => handleBulkRemoveTrade(trade.id)}
                        className="text-red-400 hover:text-red-300 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-xs text-brand-textMuted uppercase tracking-wider mb-1.5">Asset</label>
                      <select
                        value={trade.asset_symbol}
                        onChange={e => handleBulkUpdateTrade(trade.id, 'asset_symbol', e.target.value)}
                        className="w-full bg-brand-card border border-brand-border rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-brand-success"
                      >
                        {ASSETS.map(a => <option key={a.symbol} value={a.symbol}>{a.symbol}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-brand-textMuted uppercase tracking-wider mb-1.5">Side</label>
                      <select
                        value={trade.trade_type}
                        onChange={e => handleBulkUpdateTrade(trade.id, 'trade_type', e.target.value)}
                        className="w-full bg-brand-card border border-brand-border rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-brand-success"
                      >
                        <option value="buy">BUY</option>
                        <option value="sell">SELL</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-brand-textMuted uppercase tracking-wider mb-1.5">Quantity</label>
                      <input
                        type="number"
                        step="0.00000001"
                        value={trade.quantity}
                        onChange={e => handleBulkUpdateTrade(trade.id, 'quantity', e.target.value)}
                        placeholder="0.5"
                        className="w-full bg-brand-card border border-brand-border rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-brand-success"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-brand-textMuted uppercase tracking-wider mb-1.5">Price ($)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={trade.price}
                        onChange={e => handleBulkUpdateTrade(trade.id, 'price', e.target.value)}
                        placeholder="50000"
                        className="w-full bg-brand-card border border-brand-border rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-brand-success"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
                    <div>
                      <label className="block text-xs text-brand-textMuted uppercase tracking-wider mb-1.5">
                        Profit/Loss ($) {trade.trade_type === 'sell' ? '(For SELL)' : '(Optional)'}
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={trade.profit_loss}
                        onChange={e => handleBulkUpdateTrade(trade.id, 'profit_loss', e.target.value)}
                        placeholder="0"
                        className="w-full bg-brand-card border border-brand-border rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-brand-success"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-brand-textMuted uppercase tracking-wider mb-1.5">Status</label>
                      <select
                        value={trade.status}
                        onChange={e => handleBulkUpdateTrade(trade.id, 'status', e.target.value)}
                        className="w-full bg-brand-card border border-brand-border rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-brand-success"
                      >
                        <option value="open">Open</option>
                        <option value="closed">Closed</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-brand-textMuted uppercase tracking-wider mb-1.5">Execution Date</label>
                      <input
                        type="datetime-local"
                        value={trade.executed_at ? new Date(trade.executed_at).toISOString().slice(0, 16) : ''}
                        onChange={e => handleBulkUpdateTrade(trade.id, 'executed_at', e.target.value ? new Date(e.target.value).toISOString() : new Date().toISOString())}
                        className="w-full bg-brand-card border border-brand-border rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-brand-success"
                      />
                    </div>
                  </div>
                  
                  {trade.quantity && trade.price && (
                    <div className="mt-2 text-xs text-brand-textMuted">
                      Total: <span className="text-white font-mono font-bold">${(parseFloat(trade.quantity) * parseFloat(trade.price)).toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleBulkAddTrade}
                className="flex-1 flex items-center justify-center gap-2 border border-brand-border text-brand-textMuted hover:text-white hover:border-white py-3 rounded-lg transition-all"
              >
                <Plus className="w-4 h-4" />
                Add Another Trade
              </button>
              <button
                onClick={handleBulkSubmit}
                disabled={loading || bulkTrades.filter(t => t.quantity && t.price).length === 0}
                className="flex-1 bg-brand-success text-brand-bg font-bold py-3 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Sending...' : `Send ${bulkTrades.filter(t => t.quantity && t.price).length} Trade(s)`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── KYC View Modal ── */}
      {viewKyc && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-brand-card border border-brand-border rounded-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-semibold text-white">KYC Submission</h3>
              <button onClick={() => setViewKyc(null)} className="text-brand-textMuted hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                {[
                  ['Full Name', viewKyc.full_name],
                  ['Date of Birth', viewKyc.date_of_birth || '—'],
                  ['Nationality', viewKyc.nationality || '—'],
                  ['ID Type', viewKyc.id_type?.replace('_', ' ') || '—'],
                  ['ID Number', viewKyc.id_number || '—'],
                  ['Status', viewKyc.status],
                ].map(([label, val]) => (
                  <div key={label}>
                    <div className="text-brand-textMuted text-xs uppercase tracking-wider mb-1">{label}</div>
                    <div className="text-white capitalize">{val}</div>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-3 mt-4">
                {viewKyc.id_front_url && (
                  <div>
                    <div className="text-xs text-brand-textMuted mb-1">ID Front</div>
                    <img src={viewKyc.id_front_url} alt="ID Front" className="w-full rounded-lg border border-brand-border object-cover aspect-[3/2]" />
                  </div>
                )}
                {viewKyc.id_back_url && (
                  <div>
                    <div className="text-xs text-brand-textMuted mb-1">ID Back</div>
                    <img src={viewKyc.id_back_url} alt="ID Back" className="w-full rounded-lg border border-brand-border object-cover aspect-[3/2]" />
                  </div>
                )}
                {viewKyc.selfie_url && (
                  <div>
                    <div className="text-xs text-brand-textMuted mb-1">Selfie</div>
                    <img src={viewKyc.selfie_url} alt="Selfie" className="w-full rounded-lg border border-brand-border object-cover aspect-[3/2]" />
                  </div>
                )}
              </div>
              {viewKyc.admin_note && (
                <div className="bg-brand-bg border border-brand-border rounded-lg p-3 text-sm text-brand-textMuted italic">
                  Admin note: "{viewKyc.admin_note}"
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Reject Note Modal ── */}
      {noteModal?.open && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-brand-card border border-brand-border rounded-xl w-full max-w-sm p-6">
            <h3 className="font-semibold text-white mb-4">Rejection Note (optional)</h3>
            <textarea
              value={noteText}
              onChange={e => setNoteText(e.target.value)}
              placeholder="Reason for rejection..."
              rows={3}
              className="w-full bg-brand-bg border border-brand-border rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-brand-danger resize-none mb-4"
            />
            <div className="flex space-x-3">
              <button onClick={() => { setNoteModal(null); setNoteText(''); }} className="flex-1 border border-brand-border text-brand-textMuted py-2.5 rounded-lg hover:text-white transition-colors text-sm">
                Cancel
              </button>
              <button
                onClick={handleNoteSubmit}
                className="flex-1 bg-brand-danger text-white font-bold py-2.5 rounded-lg hover:bg-red-600 transition-colors text-sm"
              >
                Confirm Reject
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Balance Adjustment Modal ── */}
      {balanceModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-brand-card border border-brand-border rounded-xl w-full max-w-md p-6">
            <h3 className="font-semibold text-white mb-1">Adjust Balance</h3>
            <p className="text-sm text-brand-textMuted mb-5">
              {balanceModal.userName} · Current: <span className="text-white font-bold">${balanceModal.currentBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </p>

            {/* Credit / Debit toggle */}
            <div className="grid grid-cols-2 gap-2 mb-4 p-1 bg-brand-bg rounded-xl border border-brand-border">
              <button
                onClick={() => setBalanceMode('credit')}
                className={`py-2.5 rounded-lg text-sm font-bold transition-all ${
                  balanceMode === 'credit'
                    ? 'bg-brand-success text-white shadow'
                    : 'text-brand-textMuted hover:text-white'
                }`}
              >
                + Credit (Add)
              </button>
              <button
                onClick={() => setBalanceMode('debit')}
                className={`py-2.5 rounded-lg text-sm font-bold transition-all ${
                  balanceMode === 'debit'
                    ? 'bg-red-500 text-white shadow'
                    : 'text-brand-textMuted hover:text-white'
                }`}
              >
                − Debit (Remove)
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs text-brand-textMuted uppercase tracking-wider mb-1.5">Amount ($)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={balanceAmount}
                  onChange={e => setBalanceAmount(e.target.value)}
                  placeholder="e.g. 5000"
                  className="w-full bg-brand-bg border border-brand-border rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-brand-success"
                />
                {balanceAmount && !isNaN(parseFloat(balanceAmount)) && (
                  <p className={`text-xs mt-1.5 font-semibold ${balanceMode === 'credit' ? 'text-brand-success' : 'text-red-400'}`}>
                    New balance: ${(balanceModal.currentBalance + (balanceMode === 'credit' ? 1 : -1) * Math.abs(parseFloat(balanceAmount))).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-xs text-brand-textMuted uppercase tracking-wider mb-1.5">Reason / Note (required)</label>
                <textarea
                  value={balanceNote}
                  onChange={e => setBalanceNote(e.target.value)}
                  placeholder="e.g. Deposit approved, Bonus credit, Correction..."
                  rows={2}
                  className="w-full bg-brand-bg border border-brand-border rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-brand-success resize-none"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => { setBalanceModal(null); setBalanceAmount(''); setBalanceNote(''); setBalanceMode('credit'); }}
                className="flex-1 border border-brand-border text-brand-textMuted py-2.5 rounded-lg hover:text-white transition-colors text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleBalanceAdjust}
                disabled={!balanceAmount || !balanceNote.trim() || parseFloat(balanceAmount) <= 0}
                className={`flex-1 font-bold py-2.5 rounded-lg transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed text-white ${
                  balanceMode === 'credit' ? 'bg-brand-success hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'
                }`}
              >
                {balanceMode === 'credit' ? '+ Credit Balance' : '− Debit Balance'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Suspend User Modal ── */}
      {suspendModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-brand-card border border-brand-border rounded-2xl p-6 w-full max-w-md">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-yellow-500/10 flex items-center justify-center">
                <Ban className="w-5 h-5 text-yellow-400" />
              </div>
              <h3 className="text-xl font-bold text-white">Suspend User</h3>
            </div>
            <div className="mb-6">
              <p className="text-brand-textMuted mb-3">You are about to suspend:</p>
              <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-lg p-3 mb-4">
                <p className="text-sm text-white font-semibold">{suspendModal.userName}</p>
                <p className="text-xs text-yellow-400 mt-1">This user will be unable to log in until reactivated.</p>
              </div>
              <div>
                <label className="block text-xs text-brand-textMuted uppercase tracking-wider mb-1.5">
                  Reason for Suspension (required)
                </label>
                <textarea
                  value={suspendReason}
                  onChange={e => setSuspendReason(e.target.value)}
                  placeholder="e.g. Suspicious activity, Terms violation, Account verification required..."
                  rows={3}
                  className="w-full bg-brand-bg border border-brand-border rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-yellow-500 resize-none"
                />
                <p className="text-xs text-brand-textMuted mt-1">
                  This reason will be shown to the user and recorded in their account.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => { setSuspendModal(null); setSuspendReason(''); }}
                disabled={suspendLoading}
                className="flex-1 border border-brand-border text-brand-textMuted py-2.5 rounded-lg hover:text-white transition-colors text-sm disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleToggleSuspension(suspendModal.userId, suspendModal.currentStatus)}
                disabled={!suspendReason.trim() || suspendLoading}
                className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-black font-bold py-2.5 rounded-lg transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {suspendLoading ? (
                  <><RefreshCw className="w-4 h-4 animate-spin" /> Suspending...</>
                ) : (
                  <><Ban className="w-4 h-4" /> Suspend User</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete All Users Confirmation Modal ── */}
      {deleteAllConfirm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-brand-card border border-brand-border rounded-2xl p-6 w-full max-w-md">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-red-400" />
              </div>
              <h3 className="text-xl font-bold text-white">Delete All Users</h3>
            </div>
            <div className="mb-6">
              <p className="text-brand-textMuted mb-3">
                Are you absolutely sure you want to permanently delete ALL users?
              </p>
              <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-3">
                <p className="text-sm text-white font-semibold mb-2">
                  {users.filter(u => u.role !== 'admin').length} users will be deleted
                </p>
                <p className="text-xs text-red-400">
                  This will permanently delete all user accounts (except admins) and ALL associated data. This action CANNOT be undone.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteAllConfirm(false)}
                disabled={deleteAllLoading}
                className="flex-1 border border-brand-border text-brand-textMuted py-2.5 rounded-lg hover:text-white transition-colors text-sm disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAllUsers}
                disabled={deleteAllLoading}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-2.5 rounded-lg transition-colors text-sm disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {deleteAllLoading ? (
                  <><RefreshCw className="w-4 h-4 animate-spin" /> Deleting...</>
                ) : (
                  <><Trash2 className="w-4 h-4" /> Delete All Users</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete User Confirmation Modal ── */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-brand-card border border-brand-border rounded-2xl p-6 w-full max-w-md">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-red-400" />
              </div>
              <h3 className="text-xl font-bold text-white">Delete User</h3>
            </div>

            <div className="mb-6">
              <p className="text-brand-textMuted mb-3">
                Are you sure you want to permanently delete this user?
              </p>
              <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-3">
                <p className="text-sm text-white font-semibold">{deleteConfirm.userName}</p>
                <p className="text-xs text-red-400 mt-1">⚠️ This will delete all trades, deposits, withdrawals, KYC data, and chat history. This action cannot be undone.</p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                disabled={deleteLoading}
                className="flex-1 border border-brand-border text-brand-textMuted py-2.5 rounded-lg hover:text-white transition-colors text-sm disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteUser}
                disabled={deleteLoading}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-2.5 rounded-lg transition-colors text-sm disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {deleteLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Delete User
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
