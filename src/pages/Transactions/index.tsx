import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Clock,
  CheckCircle,
  XCircle,
  TrendingUp,
  TrendingDown,
  LogIn,
  History,
  ArrowRight,
  Upload,
  X,
  Check,
  FileText,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import {
  getDeposits,
  getTrades,
  getWithdrawals,
  type Deposit,
  type Trade,
  type Withdrawal,
} from '@/lib/db';
import { supabase } from '@/lib/supabase';
import NotificationBell from '@/components/dashboard/NotificationBell';

type TxFilter = 'all' | 'deposits' | 'withdrawals' | 'trades';

interface UnifiedTx {
  id: string;
  kind: 'deposit' | 'withdrawal' | 'trade';
  label: string;
  subLabel: string;
  amount: number;
  direction: 'in' | 'out';
  status: string;
  date: string;
  balanceBefore?: number;
  balanceAfter?: number;
  note?: string;
  receiptUrl?: string;
}

function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
    pending: { icon: <Clock className="w-2.5 h-2.5" />, color: 'text-yellow-400 bg-yellow-400/10', label: 'Pending' },
    approved: { icon: <CheckCircle className="w-2.5 h-2.5" />, color: 'text-green-400 bg-green-400/10', label: 'Approved' },
    completed: { icon: <CheckCircle className="w-2.5 h-2.5" />, color: 'text-green-400 bg-green-400/10', label: 'Completed' },
    open: { icon: <Clock className="w-2.5 h-2.5" />, color: 'text-blue-400 bg-blue-400/10', label: 'Open' },
    closed: { icon: <CheckCircle className="w-2.5 h-2.5" />, color: 'text-green-400 bg-green-400/10', label: 'Closed' },
    rejected: { icon: <XCircle className="w-2.5 h-2.5" />, color: 'text-red-400 bg-red-400/10', label: 'Rejected' },
    cancelled: { icon: <XCircle className="w-2.5 h-2.5" />, color: 'text-red-400 bg-red-400/10', label: 'Cancelled' },
  };
  const s = variants[status] ?? variants['pending'];
  return (
    <span className={`inline-flex items-center gap-1 text-[9px] sm:text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${s.color}`}>
      {s.icon}{s.label}
    </span>
  );
}

export default function TransactionsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const [filter, setFilter] = useState<TxFilter>('all');

  // Receipt upload state
  const [uploadingFor, setUploadingFor] = useState<string | null>(null);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string>('');
  const [uploadError, setUploadError] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const balance = user?.balance ?? 0;

  const handleReceiptFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
    if (!validTypes.includes(file.type)) {
      setUploadError('Please upload JPG, PNG, or PDF only');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('File must be under 5MB');
      return;
    }
    setReceiptFile(file);
    setUploadError('');
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => setReceiptPreview(reader.result as string);
      reader.readAsDataURL(file);
    } else {
      setReceiptPreview('');
    }
  };

  const handleReceiptUpload = async (depositId: string) => {
    if (!receiptFile || !user) return;
    setUploading(true);
    setUploadError('');
    try {
      const fileExt = receiptFile.name.split('.').pop()?.toLowerCase();
      const fileName = `${user.id}_${depositId}_${Date.now()}.${fileExt}`;

      const { error: uploadErr } = await supabase.storage
        .from('receipts')
        .upload(fileName, receiptFile, { upsert: true });

      if (uploadErr) {
        if (uploadErr.message.includes('exceeded') || uploadErr.message.includes('size'))
          throw new Error('File too large. Maximum size is 5MB.');
        if (uploadErr.message.includes('mime') || uploadErr.message.includes('type'))
          throw new Error('Invalid file type. Use JPG, PNG, or PDF only.');
        throw new Error(uploadErr.message);
      }

      const { data: urlData } = supabase.storage.from('receipts').getPublicUrl(fileName);
      await supabase.from('deposits').update({ receipt_url: urlData.publicUrl }).eq('id', depositId);

      setUploadSuccess('Receipt uploaded successfully!');
      setReceiptFile(null);
      setReceiptPreview('');
      setUploadingFor(null);
      const updated = await getDeposits(user.id);
      setDeposits(updated);
      setTimeout(() => setUploadSuccess(''), 3000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setUploadError(msg || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const cancelUpload = () => {
    setUploadingFor(null);
    setReceiptFile(null);
    setReceiptPreview('');
    setUploadError('');
  };

  const loadData = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [deps, tr, wds] = await Promise.all([
        getDeposits(user.id),
        getTrades(user.id),
        getWithdrawals(user.id),
      ]);
      setDeposits(deps);
      setTrades(tr);
      setWithdrawals(wds);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (user?.id) {
      loadData();
    } else {
      setLoading(false);
    }

    if (!user?.id) return;
    const userId = user.id;

    const tradesSub = supabase
      .channel(`tx-trades-${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trades', filter: `user_id=eq.${userId}` }, () => loadData())
      .subscribe();

    const depositsSub = supabase
      .channel(`tx-deposits-${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'deposits', filter: `user_id=eq.${userId}` }, () => loadData())
      .subscribe();

    const withdrawalsSub = supabase
      .channel(`tx-withdrawals-${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'withdrawals', filter: `user_id=eq.${userId}` }, () => loadData())
      .subscribe();

    return () => {
      supabase.removeChannel(tradesSub);
      supabase.removeChannel(depositsSub);
      supabase.removeChannel(withdrawalsSub);
    };
  }, [user?.id, loadData]);

  const unifiedTx = useMemo(() => {
    const result: UnifiedTx[] = [];
    deposits.forEach(d => {
      result.push({
        id: d.id,
        kind: 'deposit',
        label: `${d.crypto_currency} Deposit`,
        subLabel: d.tx_hash ? `${d.tx_hash.slice(0, 12)}…` : 'Awaiting confirmation',
        amount: d.amount,
        direction: 'in',
        status: d.status,
        date: d.created_at,
        note: d.admin_note,
        receiptUrl: d.receipt_url,
      });
    });
    withdrawals.forEach(w => {
      result.push({
        id: w.id,
        kind: 'withdrawal',
        label: `${w.crypto_currency} Withdrawal`,
        subLabel: w.wallet_address ? `${w.wallet_address.slice(0, 10)}…` : '',
        amount: w.amount,
        direction: 'out',
        status: w.status,
        date: w.created_at,
        note: w.admin_note,
      });
    });
    trades.forEach(t => {
      result.push({
        id: t.id,
        kind: 'trade',
        label: `${t.trade_type === 'buy' ? 'Buy' : 'Sell'} ${t.asset_name}`,
        subLabel: `${t.quantity} ${t.asset_symbol}`,
        amount: t.total_value,
        direction: t.trade_type === 'buy' ? 'out' : 'in',
        status: t.status,
        date: t.executed_at || t.created_at,
        balanceBefore: t.balance_before,
        balanceAfter: t.balance_after,
        note: t.history_note,
      });
    });
    return result.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [deposits, trades, withdrawals]);

  const filteredTx = useMemo(() => {
    if (filter === 'all') return unifiedTx;
    return unifiedTx.filter(t => {
      if (filter === 'deposits') return t.kind === 'deposit';
      if (filter === 'withdrawals') return t.kind === 'withdrawal';
      return t.kind === 'trade';
    });
  }, [unifiedTx, filter]);

  const stats = useMemo(() => ({
    totalDeposited: deposits.filter(d => d.status === 'approved').reduce((s, d) => s + d.amount, 0),
    totalWithdrawn: withdrawals.filter(w => w.status === 'approved').reduce((s, w) => s + w.amount, 0),
    pendingDeposits: deposits.filter(d => d.status === 'pending').length,
  }), [deposits, withdrawals]);

  if (!user) return <Navigate to="/login" replace />;

  return (
    <div className="min-h-screen ambient-bg text-white pb-tab md:pb-20">
      {/* Success toast */}
      {uploadSuccess && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-green-500/90 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-lg backdrop-blur-sm">
          <Check className="w-3.5 h-3.5" />
          {uploadSuccess}
        </div>
      )}
      {/* Header */}
      <section id="transactions-header" className="sticky top-0 z-30"
        style={{ background: 'rgba(10,8,22,0.85)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="max-w-6xl mx-auto px-3 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            {showHistory && (
              <button
                onClick={() => setShowHistory(false)}
                className="p-2 rounded-xl transition-all text-brand-textMuted hover:text-white flex-shrink-0"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                aria-label="Back to overview"
              >
                <ArrowDownLeft className="w-4 h-4" />
              </button>
            )}
            <div>
              <h1 className="text-base sm:text-xl font-bold text-white">
                {showHistory ? 'Transaction History' : 'Transactions'}
              </h1>
            </div>
          </div>
          <NotificationBell />
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-3 sm:px-6 py-4 sm:py-8">

        {/* OVERVIEW */}
        {!showHistory && (
          <div className="space-y-4 sm:space-y-6">
            {/* Balance Card */}
            <div className="relative rounded-3xl overflow-hidden"
              style={{
                background: 'linear-gradient(145deg, #161228 0%, #0E0B1F 50%, #100E1E 100%)',
                border: '1px solid rgba(99,102,241,0.15)',
                boxShadow: '0 0 0 1px rgba(255,255,255,0.03), 0 20px 60px rgba(0,0,0,0.5)',
              }}>
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
              <div className="absolute top-[-40px] right-[-30px] w-48 h-48 rounded-full opacity-30 pointer-events-none" style={{ background: 'radial-gradient(ellipse, rgba(99,102,241,0.15) 0%, transparent 70%)' }} />
              <div className="relative p-5 sm:p-6">
                <p className="text-brand-textMuted text-[11px] font-semibold uppercase tracking-[0.12em] mb-2">Available Balance</p>
                <p className="text-gradient-balance num-display font-bold tracking-tight mb-5"
                  style={{ fontSize: 'clamp(2rem, 8vw, 3rem)', lineHeight: 1.1 }}>
                  ${balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => navigate('/deposit')}
                    className="flex-1 flex items-center justify-center gap-2 py-3 font-bold rounded-2xl text-sm text-white transition-all"
                    style={{ background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)', boxShadow: '0 4px 20px rgba(239,68,68,0.25)' }}
                  >
                    <ArrowDownLeft className="w-4 h-4" />
                    Deposit
                  </button>
                  <button
                    onClick={() => navigate('/withdraw')}
                    className="flex-1 flex items-center justify-center gap-2 py-3 font-bold rounded-2xl text-sm text-white transition-all hover:bg-white/10"
                    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
                  >
                    <ArrowUpRight className="w-4 h-4" />
                    Withdraw
                  </button>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              {[
                { label: 'Total Deposited', value: `$${stats.totalDeposited.toLocaleString(undefined, { minimumFractionDigits: 0 })}`, color: 'text-green-400' },
                { label: 'Total Withdrawn', value: `$${stats.totalWithdrawn.toLocaleString(undefined, { minimumFractionDigits: 0 })}`, color: 'text-red-400' },
                { label: 'Pending', value: stats.pendingDeposits.toString(), color: 'text-yellow-400' },
              ].map(s => (
                <div key={s.label} className="rounded-2xl p-3 sm:p-4 text-center" style={{ background: 'rgba(16,14,30,0.95)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <p className={`font-bold text-lg sm:text-xl num-display ${s.color}`}>{s.value}</p>
                  <p className="text-brand-textMuted text-[10px] sm:text-xs mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Recent Activity */}
            <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(16,14,30,0.95)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="flex items-center justify-between px-4 sm:px-5 py-3 sm:py-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                <h2 className="text-white font-semibold text-sm sm:text-base">Recent Activity</h2>
                <button
                  onClick={() => setShowHistory(true)}
                  className="flex items-center gap-1 text-brand-success text-xs sm:text-sm font-semibold hover:underline"
                >
                  View all <ArrowRight className="w-3 h-3" />
                </button>
              </div>

              {loading ? (
                <div className="flex justify-center py-8">
                  <div className="w-8 h-8 border-2 border-brand-border border-t-brand-success rounded-full animate-spin" />
                </div>
              ) : unifiedTx.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <History className="w-10 h-10 text-brand-textMuted" />
                  <p className="text-brand-textMuted text-sm">No transactions yet</p>
                  <button
                    onClick={() => navigate('/deposit')}
                    className="text-brand-success text-sm font-semibold hover:underline"
                  >
                    Make your first deposit
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-brand-border">
                  {unifiedTx.slice(0, 5).map(tx => {
                    const isIn = tx.direction === 'in';
                    const Icon = tx.kind === 'trade' ? (isIn ? TrendingUp : TrendingDown) : (isIn ? ArrowDownLeft : ArrowUpRight);
                    return (
                      <div key={tx.id} className="px-4 sm:px-5 py-3 sm:py-3.5">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${isIn ? 'bg-green-400/10' : 'bg-red-400/10'}`}>
                              <Icon className={`w-3.5 h-3.5 ${isIn ? 'text-green-400' : 'text-red-400'}`} />
                            </div>
                            <div className="min-w-0">
                              <p className="text-white text-xs sm:text-sm font-medium">{tx.label}</p>
                              <p className="text-brand-textMuted text-[10px] sm:text-xs">{new Date(tx.date).toLocaleDateString()}</p>
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className={`font-bold text-xs sm:text-sm ${isIn ? 'text-green-400' : 'text-red-400'}`}>
                              {isIn ? '+' : '-'}${tx.amount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                            </p>
                            <StatusBadge status={tx.status} />
                          </div>
                        </div>
                        {/* Upload receipt for pending deposits */}
                        {tx.kind === 'deposit' && tx.status === 'pending' && (
                          <div className="mt-2 ml-11">
                            {tx.receiptUrl ? (
                              <a href={tx.receiptUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-[10px] text-brand-success hover:underline">
                                <FileText className="w-3 h-3" />Receipt uploaded
                              </a>
                            ) : uploadingFor === tx.id ? (
                              <div className="space-y-2">
                                {receiptPreview && <img src={receiptPreview} alt="Preview" className="w-28 h-16 object-cover rounded-lg border border-brand-border" />}
                                {receiptFile && !receiptPreview && <div className="flex items-center gap-1 text-[10px] text-brand-textMuted"><FileText className="w-3 h-3" />{receiptFile.name}</div>}
                                <label className="inline-flex items-center gap-1.5 cursor-pointer px-3 py-1.5 rounded-lg text-[10px] font-medium text-brand-textMuted hover:text-white border border-dashed border-brand-border hover:border-brand-success/50 transition-all">
                                  <input type="file" accept="image/jpeg,image/jpg,image/png,application/pdf" onChange={handleReceiptFileChange} className="hidden" />
                                  <Upload className="w-3 h-3" />{receiptFile ? 'Change file' : 'Choose JPG, PNG or PDF'}
                                </label>
                                {uploadError && <p className="text-[10px] text-red-400">{uploadError}</p>}
                                <div className="flex items-center gap-2">
                                  {receiptFile && (
                                    <button onClick={() => handleReceiptUpload(tx.id)} disabled={uploading} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-semibold text-white disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #EF4444, #DC2626)' }}>
                                      {uploading ? 'Uploading…' : <><Check className="w-3 h-3" />Submit</>}
                                    </button>
                                  )}
                                  <button onClick={cancelUpload} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] text-brand-textMuted hover:text-white">
                                    <X className="w-3 h-3" />Cancel
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <button onClick={() => { setUploadingFor(tx.id); setReceiptFile(null); setReceiptPreview(''); setUploadError(''); }} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-medium text-yellow-400 border border-yellow-400/30 hover:bg-yellow-400/10 transition-all">
                                <Upload className="w-3 h-3" />Upload Receipt
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* HISTORY */}
        {showHistory && (
          <div className="space-y-3 sm:space-y-4">
            {/* Filter tabs */}
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
              {(['all', 'deposits', 'withdrawals', 'trades'] as TxFilter[]).map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold capitalize whitespace-nowrap transition-all ${
                    filter === f ? 'text-white' : 'text-brand-textMuted hover:text-white'
                  }`}
                  style={filter === f
                    ? { background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)', boxShadow: '0 2px 12px rgba(239,68,68,0.3)' }
                    : { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }
                  }
                >
                  {f}
                </button>
              ))}
            </div>

            <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(16,14,30,0.95)', border: '1px solid rgba(255,255,255,0.06)' }}>
              {loading ? (
                <div className="flex justify-center py-8">
                  <div className="w-8 h-8 border-2 border-brand-border border-t-brand-success rounded-full animate-spin" />
                </div>
              ) : filteredTx.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <History className="w-10 h-10 text-brand-textMuted" />
                  <p className="text-brand-textMuted text-sm">No transactions found</p>
                </div>
              ) : (
                <div className="divide-y divide-brand-border">
                  {filteredTx.map(tx => {
                    const isIn = tx.direction === 'in';
                    const Icon = tx.kind === 'trade' ? (isIn ? TrendingUp : TrendingDown) : (isIn ? ArrowDownLeft : ArrowUpRight);
                    return (
                      <div key={tx.id} className="px-4 sm:px-5 py-3.5 sm:py-4">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                            <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center flex-shrink-0 ${isIn ? 'bg-green-400/10' : 'bg-red-400/10'}`}>
                              <Icon className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isIn ? 'text-green-400' : 'text-red-400'}`} />
                            </div>
                            <div className="min-w-0">
                              <p className="text-white text-xs sm:text-sm font-medium">{tx.label}</p>
                              <p className="text-brand-textMuted text-[10px] sm:text-xs mt-0.5 truncate">{tx.subLabel}</p>
                              <p className="text-brand-textMuted text-[9px] sm:text-[10px] mt-0.5">{new Date(tx.date).toLocaleString()}</p>
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className={`font-bold text-xs sm:text-sm ${isIn ? 'text-green-400' : 'text-red-400'}`}>
                              {isIn ? '+' : '-'}${tx.amount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                            </p>
                            <div className="mt-1">
                              <StatusBadge status={tx.status} />
                            </div>
                          </div>
                        </div>
                        {tx.balanceBefore !== undefined && tx.balanceAfter !== undefined && (
                          <div className="mt-2 ml-11 sm:ml-12 flex items-center gap-2 text-[9px] sm:text-[10px] font-mono text-brand-textMuted">
                            <span>${tx.balanceBefore.toFixed(2)}</span>
                            <span className={tx.balanceAfter > tx.balanceBefore ? 'text-green-400' : 'text-red-400'}>
                              → ${tx.balanceAfter.toFixed(2)}
                            </span>
                          </div>
                        )}
                        {tx.note && (
                          <p className="mt-1.5 ml-11 sm:ml-12 text-[9px] sm:text-[10px] text-yellow-400/80 italic">{tx.note}</p>
                        )}

                        {/* Upload receipt for pending deposits */}
                        {tx.kind === 'deposit' && tx.status === 'pending' && (
                          <div className="mt-2 ml-11 sm:ml-12">
                            {tx.receiptUrl ? (
                              <a
                                href={tx.receiptUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 text-[10px] text-brand-success hover:underline"
                              >
                                <FileText className="w-3 h-3" />
                                Receipt uploaded
                              </a>
                            ) : uploadingFor === tx.id ? (
                              <div className="space-y-2">
                                {receiptPreview && (
                                  <img src={receiptPreview} alt="Preview" className="w-32 h-20 object-cover rounded-lg border border-brand-border" />
                                )}
                                {receiptFile && !receiptPreview && (
                                  <div className="flex items-center gap-1.5 text-[10px] text-brand-textMuted">
                                    <FileText className="w-3 h-3" />
                                    {receiptFile.name}
                                  </div>
                                )}
                                <label className="inline-flex items-center gap-1.5 cursor-pointer px-3 py-1.5 rounded-lg text-[10px] font-medium text-brand-textMuted hover:text-white border border-dashed border-brand-border hover:border-brand-success/50 transition-all">
                                  <input ref={fileInputRef} type="file" accept="image/jpeg,image/jpg,image/png,application/pdf" onChange={handleReceiptFileChange} className="hidden" />
                                  <Upload className="w-3 h-3" />
                                  {receiptFile ? 'Change file' : 'Choose JPG, PNG or PDF'}
                                </label>
                                {uploadError && <p className="text-[10px] text-red-400">{uploadError}</p>}
                                <div className="flex items-center gap-2">
                                  {receiptFile && (
                                    <button
                                      onClick={() => handleReceiptUpload(tx.id)}
                                      disabled={uploading}
                                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-semibold text-white disabled:opacity-50 transition-all"
                                      style={{ background: 'linear-gradient(135deg, #EF4444, #DC2626)' }}
                                    >
                                      {uploading ? 'Uploading…' : <><Check className="w-3 h-3" /> Submit</>}
                                    </button>
                                  )}
                                  <button onClick={cancelUpload} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] text-brand-textMuted hover:text-white transition-colors">
                                    <X className="w-3 h-3" /> Cancel
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <button
                                onClick={() => { setUploadingFor(tx.id); setReceiptFile(null); setReceiptPreview(''); setUploadError(''); }}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-medium text-yellow-400 border border-yellow-400/30 hover:bg-yellow-400/10 transition-all"
                              >
                                <Upload className="w-3 h-3" />
                                Upload Receipt
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
