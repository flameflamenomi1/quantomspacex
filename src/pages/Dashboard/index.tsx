import { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { 
  Wallet, 
  TrendingUp, 
  History, 
  Plus, 
  Copy, 
  Check, 
  Search, 
  Star, 
  X, 
  RefreshCw, 
  Coins, 
  ShieldCheck,
  Briefcase,
  LogIn,
  ArrowUpRight,
  AlertTriangle,
  Users,
  Gift,
  Lock,
  Clock,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useAuth } from '@/context/AuthContext';
import { getDeposits, getTrades, getWithdrawals, type Deposit, type Trade, type Withdrawal } from '@/lib/db';
import { supabase } from '@/lib/supabase';
import NotificationBell from '@/components/dashboard/NotificationBell';
import KycForm from '@/components/dashboard/KycForm';
import WithdrawModal from '@/components/dashboard/WithdrawModal';
import BalanceHistoryChart from '@/components/BalanceHistoryChart';

interface WatchlistItem {
  id: string;
  name: string;
  ticker: string;
  price: string;
  change: string;
  isUp: boolean;
  logo: string;
}

interface Transaction {
  id: string;
  type: 'deposit' | 'buy' | 'sell' | 'withdrawal';
  asset: string;
  ticker: string;
  amount: number;
  price?: number;
  total: number;
  timestamp: string;
  status: 'completed' | 'pending' | 'rejected';
}

export default function DashboardPage() {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();

  // Global dashboard states
  const [cash, setCash] = useState<number>(0);
  const [copied, setCopied] = useState<boolean>(false);
  const [depositAmount, setDepositAmount] = useState<string>('');
  const [depositCurrency, setDepositToken] = useState<string>('USDT');
  const [timeline, setTimeline] = useState<'1D' | '1W' | '1M' | 'ALL'>('1D');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'portfolio' | 'kyc'>('portfolio');
  const [kycStatus, setKycStatus] = useState<import('@/lib/db').KycStatus>('unverified');

  // DB data
  const [realDeposits, setRealDeposits] = useState<Deposit[]>([]);
  const [realTrades, setRealTrades] = useState<Trade[]>([]);
  const [realWithdrawals, setRealWithdrawals] = useState<Withdrawal[]>([]);
  const [activePlans, setActivePlans] = useState<Array<{
    id: string;
    plan_name: string;
    amount: number;
    end_date: string;
    expected_payout: number;
  }>>([]);
  const [depositLoading, setDepositLoading] = useState(false);
  const [depositSuccess, setDepositSuccess] = useState(false);
  const [depositReceipt, setDepositReceipt] = useState<File | null>(null);
  const [depositReceiptPreview, setDepositReceiptPreview] = useState<string>('');
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [referralCopied, setReferralCopied] = useState(false);

  // Watchlist state
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([
    { id: 'nvda', name: 'NVIDIA Corp.', ticker: 'NVDA', price: '$952.12', change: '+1.48%', isUp: true, logo: '🟢' },
    { id: 'msft', name: 'Microsoft Corp.', ticker: 'MSFT', price: '$415.34', change: '+0.75%', isUp: true, logo: '💻' },
    { id: 'uso', name: 'Crude Oil', ticker: 'USO', price: '$78.36', change: '-0.35%', isUp: false, logo: '🛢️' },
    { id: 'sol', name: 'Solana', ticker: 'SOL', price: '$174.20', change: '+5.12%', isUp: true, logo: '☀️' },
  ]);

  // Transactions logs (combined from deposits, trades, withdrawals)
  const transactions = useMemo<Transaction[]>(() => {
    const txs: Transaction[] = [];
    
    // Add deposits
    realDeposits.forEach(d => {
      txs.push({
        id: d.id,
        type: 'deposit',
        asset: `${d.crypto_currency} Deposit`,
        ticker: d.crypto_currency,
        amount: d.amount,
        total: d.amount,
        timestamp: new Date(d.created_at || '').toLocaleString('en-US', { 
          year: 'numeric', 
          month: '2-digit', 
          day: '2-digit', 
          hour: '2-digit', 
          minute: '2-digit' 
        }),
        status: d.status as 'completed' | 'pending' | 'rejected',
      });
    });
    
    // Add trades
    realTrades.forEach(t => {
      txs.push({
        id: t.id,
        type: t.trade_type,
        asset: t.asset_name,
        ticker: t.asset_symbol,
        amount: t.quantity,
        price: t.price,
        total: t.quantity * t.price,
        timestamp: new Date(t.executed_at || t.created_at || '').toLocaleString('en-US', { 
          year: 'numeric', 
          month: '2-digit', 
          day: '2-digit', 
          hour: '2-digit', 
          minute: '2-digit' 
        }),
        status: t.status as 'completed' | 'pending',
      });
    });
    
    // Add withdrawals
    realWithdrawals.forEach(w => {
      txs.push({
        id: w.id,
        type: 'withdrawal',
        asset: `${w.crypto_currency} Withdrawal`,
        ticker: w.crypto_currency,
        amount: w.amount,
        total: w.amount,
        timestamp: new Date(w.created_at || '').toLocaleString('en-US', { 
          year: 'numeric', 
          month: '2-digit', 
          day: '2-digit', 
          hour: '2-digit', 
          minute: '2-digit' 
        }),
        status: w.status as 'completed' | 'pending' | 'rejected',
      });
    });
    
    // Sort by timestamp descending (newest first)
    return txs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [realDeposits, realTrades, realWithdrawals]);

  // Buy/Sell Trade Modal States
  const [tradeModal, setTradeModal] = useState<{
    isOpen: boolean;
    type: 'buy' | 'sell';
    asset: WatchlistItem | null;
    sharesCount: string;
  }>({
    isOpen: false,
    type: 'buy',
    asset: null,
    sharesCount: '',
  });

  // Calculate active totals based on prices and quantities
  const portfolioSummary = useMemo(() => {
    // Invested = sum of all BUY trades total value
    const totalInvested = realTrades
      .filter(t => t.trade_type === 'buy')
      .reduce((sum, t) => sum + (t.quantity * t.price), 0);

    // Real P&L = sum of profit_loss on all closed/sell trades
    const totalProfitLoss = realTrades
      .filter(t => t.trade_type === 'sell')
      .reduce((sum, t) => sum + (t.profit_loss || 0), 0);

    const profitLossPercentage = totalInvested > 0 ? (totalProfitLoss / totalInvested) * 100 : 0;

    // Unique assets from all trades created by admin
    const uniqueAssets = new Set(realTrades.map(t => t.asset_symbol));

    return {
      totalInvested,
      totalProfitLoss,
      profitLossPercentage,
      assetCount: uniqueAssets.size,
    };
  }, [realTrades]);

  // Load real data from DB
  const loadRealData = useCallback(async () => {
    if (!user?.id) return;
    const userId = user.id;
    const userName = user.full_name;
    const userEmail = user.email;
    const [deps, trades, wds] = await Promise.all([
      getDeposits(userId),
      getTrades(userId),
      getWithdrawals(userId),
    ]);
    setRealDeposits(deps);
    setRealTrades(trades);
    setRealWithdrawals(wds);
    
    // Load active investment plans
    const { supabase } = await import('@/lib/supabase');
    const { data: plans } = await supabase
      .from('plan_subscriptions')
      .select('id, amount, end_date, expected_payout, investment_plans(name)')
      .eq('user_id', userId)
      .eq('status', 'active');
    if (plans) {
      setActivePlans(plans.map(p => ({
        id: p.id,
        plan_name: (p.investment_plans as unknown as { name: string })?.name || 'Plan',
        amount: p.amount,
        end_date: p.end_date,
        expected_payout: p.expected_payout,
      })));
      
      // Check for expired plans and notify admin (only if not already notified)
      const now = new Date();
      for (const plan of plans) {
        const endDate = new Date(plan.end_date);
        if (endDate <= now) {
          const { data: existing } = await supabase
            .from('admin_notifications')
            .select('id')
            .eq('related_subscription_id', plan.id)
            .single();
          
          if (!existing) {
            await supabase.from('admin_notifications').insert({
              title: '⏰ Investment Plan Expired',
              message: `User ${userName} (${userEmail}) has an expired ${(plan.investment_plans as unknown as { name: string })?.name} plan. Locked: $${plan.amount.toLocaleString()}. Expected payout: $${plan.expected_payout.toLocaleString(undefined, { maximumFractionDigits: 2 })}. Process payout ASAP.`,
              type: 'alert',
              related_user_id: userId,
              related_subscription_id: plan.id,
              is_read: false,
            });
          }
        }
      }
    }
    
    // Refresh user to get latest balance
    await refreshUser();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    setCash(user.balance || 0);
    setKycStatus(user.kyc_status);
    loadRealData();

    const userId = user.id;

    // Real-time: balance/kyc changes
    const userSub = supabase
      .channel(`user-${userId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'users', filter: `id=eq.${userId}` }, payload => {
        const u = payload.new as { balance: number; kyc_status: import('@/lib/db').KycStatus };
        setCash(u.balance ?? 0);
        setKycStatus(u.kyc_status);
        refreshUser();
      })
      .subscribe();

    // Real-time: trades
    const tradesSub = supabase
      .channel(`trades-${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trades', filter: `user_id=eq.${userId}` }, () => {
        loadRealData();
      })
      .subscribe();

    // Real-time: deposits
    const depositsSub = supabase
      .channel(`deposits-${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'deposits', filter: `user_id=eq.${userId}` }, () => {
        loadRealData();
      })
      .subscribe();

    // Real-time: withdrawals
    const withdrawalsSub = supabase
      .channel(`withdrawals-${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'withdrawals', filter: `user_id=eq.${userId}` }, () => {
        loadRealData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(userSub);
      supabase.removeChannel(tradesSub);
      supabase.removeChannel(depositsSub);
      supabase.removeChannel(withdrawalsSub);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Keep cash in sync with user balance
  useEffect(() => {
    if (user) setCash(user.balance || 0);
  }, [user?.balance]);

  // Auth gate — redirect immediately
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Memoize cryptocurrency addresses to avoid recreating on every render
  const cryptoAddresses: Record<string, string> = useMemo(() => ({
    BTC: 'bc1ql5tdc7jph899dlsrv7x7kkv0km3dumyux7nvz4',
    ETH: '0xe1e9332667cccF925fE03F04F7644980d21A0be8',
    'USDT (ERC-20)': '0x8ebc6fc04ac77438c103f2afa710737b7448495c',
    'USDT (TRC-20)': 'TRfsBixLH2ZbbWZcojn2c89k3ySwPQU3ZT',
    SOL: 'HkjCoD2LR7SR6fw5CUfrQYFHZyKBE7564Wwu3E5RkLU7',
  }), []);

  const handleCopyAddress = () => {
    const address = cryptoAddresses[depositCurrency];
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleMockDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(depositAmount);
    if (isNaN(amount) || amount <= 0 || !user) return;
    if (amount < 500) {
      alert('Minimum deposit amount is $500');
      return;
    }
    if (amount > 5000000) {
      alert('Maximum deposit amount is $5,000,000');
      return;
    }
    if (!depositReceipt) {
      alert('Please upload payment receipt');
      return;
    }
    setDepositLoading(true);
    try {
      // Upload receipt first
      const fileExt = depositReceipt.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from('deposit-receipts')
        .upload(fileName, depositReceipt);

      if (uploadError) throw uploadError;

      // Get signed URL (private bucket)
      const { data: urlData } = await supabase.storage
        .from('deposit-receipts')
        .createSignedUrl(fileName, 60 * 60 * 24 * 365); // 1 year expiry

      // Submit deposit with receipt URL
      await supabase.from('deposits').insert({
        user_id: user.id,
        amount,
        crypto_currency: depositCurrency,
        wallet_address: cryptoAddresses[depositCurrency],
        receipt_url: urlData?.signedUrl || '',
        status: 'pending',
      });
      
      setDepositAmount('');
      setDepositReceipt(null);
      setDepositReceiptPreview('');
      setDepositSuccess(true);
      setTimeout(() => setDepositSuccess(false), 5000);
      await loadRealData();
    } catch (e) { 
      console.error(e);
      alert('Failed to submit deposit. Please try again.');
    }
    setDepositLoading(false);
    setDepositLoading(false);
  };

  const openTradeModal = (type: 'buy' | 'sell', asset: WatchlistItem) => {
    setTradeModal({
      isOpen: true,
      type,
      asset,
      sharesCount: '',
    });
  };

  const closeTradeModal = () => {
    setTradeModal({
      isOpen: false,
      type: 'buy',
      asset: null,
      sharesCount: '',
    });
  };

  const executeTrade = (e: React.FormEvent) => {
    e.preventDefault();
    const count = parseFloat(tradeModal.sharesCount);
    const asset = tradeModal.asset;
    if (!asset || isNaN(count) || count <= 0) return;
    const currentPrice = parseFloat(asset.price.replace(/[$,]/g, ''));
    const tradeCost = count * currentPrice;

    if (tradeModal.type === 'buy') {
      if (tradeCost > cash) {
        alert('Insufficient cash balance to complete this purchase!');
        return;
      }
      setCash(prev => prev - tradeCost);
    } else {
      setCash(prev => prev + tradeCost);
    }

    closeTradeModal();
    alert(`Success! Executed Simulated ${tradeModal.type.toUpperCase()} order for ${count} ${asset.ticker} at $${currentPrice.toLocaleString()}.`);
  };

  // SVGs Paths for different timelines
  const timelineCharts: Record<'1D' | '1W' | '1M' | 'ALL', string> = {
    '1D': "M 0,100 Q 50,85 100,92 T 200,60 T 300,75 T 400,32 T 500,20",
    '1W': "M 0,120 Q 50,130 100,105 T 200,82 T 300,50 T 400,68 T 500,45",
    '1M': "M 0,140 Q 50,110 100,125 T 200,90 T 300,100 T 400,55 T 500,35",
    'ALL': "M 0,145 Q 50,135 100,125 T 200,115 T 300,82 T 400,40 T 500,15",
  };

  return (
    <div className="min-h-screen ambient-bg text-white relative pb-tab">
      {/* Ambient glow layers */}
      <div className="fixed top-0 left-0 right-0 h-[500px] pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-100px] left-1/4 w-[min(600px,80vw)] h-[min(400px,60vw)] rounded-full opacity-30" style={{ background: 'radial-gradient(ellipse, rgba(99,102,241,0.12) 0%, transparent 70%)' }} />
        <div className="absolute top-[100px] right-1/4 w-[min(400px,60vw)] h-[min(300px,50vw)] rounded-full opacity-20" style={{ background: 'radial-gradient(ellipse, rgba(239,68,68,0.1) 0%, transparent 70%)' }} />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">

        {/* --- HEADER --- */}
        <div className="flex items-center justify-between mb-6 sm:mb-8 gap-3">
          <div>
            <p className="text-brand-textMuted text-xs font-medium tracking-wider uppercase">Welcome back</p>
            <h1 className="font-serif text-xl sm:text-2xl font-bold tracking-tight text-white mt-0.5">{user.full_name}</h1>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-flex items-center px-3 py-1.5 rounded-full text-[11px] font-semibold gap-1.5"
              style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)', color: '#22C55E' }}>
              <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
              {kycStatus === 'approved' ? 'KYC Verified' : 'Secured'}
            </span>
            <NotificationBell />
            <button
              onClick={async () => { await loadRealData(); }}
              className="p-2.5 rounded-xl transition-all text-brand-textMuted hover:text-white"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* --- BALANCE HERO CARD --- */}
        <section id="dashboard-hero" className="relative rounded-3xl overflow-hidden mb-5 sm:mb-7"
          style={{
            background: 'linear-gradient(145deg, #161228 0%, #0E0B1F 50%, #100E1E 100%)',
            border: '1px solid rgba(99,102,241,0.15)',
            boxShadow: '0 0 0 1px rgba(255,255,255,0.03), 0 24px 64px rgba(0,0,0,0.5)',
          }}>
          {/* Top shimmer line */}
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
          <div className="absolute top-[-60px] right-[-40px] w-[280px] h-[280px] rounded-full opacity-40 pointer-events-none" style={{ background: 'radial-gradient(ellipse, rgba(99,102,241,0.12) 0%, transparent 70%)' }} />

          <div className="relative px-5 sm:px-8 pt-6 sm:pt-8 pb-5 sm:pb-6">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div>
                <p className="text-brand-textMuted text-[11px] font-semibold uppercase tracking-[0.12em] mb-2">Available Balance</p>
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="text-gradient-balance num-display font-bold tracking-tight"
                    style={{ fontSize: 'clamp(2.2rem, 8vw, 3.5rem)', lineHeight: 1.1 }}>
                    ${cash.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-2.5 flex-wrap">
                  <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full badge-up">
                    <TrendingUp className="w-3 h-3" />
                    +{portfolioSummary.profitLossPercentage.toFixed(2)}% overall
                  </span>
                  <span className="text-brand-textMuted text-xs">
                    Portfolio: ${portfolioSummary.totalInvested.toLocaleString(undefined, { minimumFractionDigits: 0 })}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 sm:flex-col sm:items-end sm:gap-2">
                <span className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full"
                  style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)', color: '#22C55E' }}>
                  <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                  Live
                </span>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => navigate('/deposit')}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 font-bold py-3 px-5 rounded-2xl transition-all text-sm text-white"
                style={{ background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)', boxShadow: '0 4px 20px rgba(239,68,68,0.25)' }}
              >
                <Plus className="w-4 h-4" />
                Deposit
              </button>
              <button
                onClick={() => navigate('/withdraw')}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 font-bold py-3 px-5 rounded-2xl transition-all text-sm text-white hover:bg-white/10"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
              >
                <ArrowUpRight className="w-4 h-4" />
                Withdraw
              </button>
              <button
                onClick={() => navigate('/transactions')}
                className="hidden sm:flex items-center justify-center gap-2 font-bold py-3 px-5 rounded-2xl transition-all text-sm text-brand-textMuted hover:text-white hover:bg-white/5"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
              >
                <History className="w-4 h-4" />
                History
              </button>
            </div>
          </div>

          {/* Mini stats strip */}
          <div className="grid grid-cols-3 border-t" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
            {[
              { label: 'Finance', value: `$${portfolioSummary.totalInvested.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}` },
              { label: 'P&L', value: `${portfolioSummary.totalProfitLoss >= 0 ? '+' : ''}$${Math.abs(portfolioSummary.totalProfitLoss).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })} (${portfolioSummary.profitLossPercentage >= 0 ? '+' : ''}${portfolioSummary.profitLossPercentage.toFixed(1)}%)`, color: portfolioSummary.totalProfitLoss >= 0 ? 'text-green-400' : 'text-red-400' },
              { label: 'Assets', value: `${portfolioSummary.assetCount}` },
            ].map((s, i) => (
              <div key={i} className={`px-4 sm:px-6 py-3.5 ${i < 2 ? 'border-r' : ''}`} style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                <p className="text-brand-textMuted text-[10px] sm:text-xs tracking-wider uppercase font-medium">{s.label}</p>
                <p className={`font-bold text-sm sm:text-base mt-0.5 num-display ${s.color || 'text-white'}`}>{s.value}</p>
              </div>
            ))}
          </div>
        </section>

        {/* --- TAB SWITCHER --- */}
        <div className="flex space-x-1 p-1 mb-6 sm:mb-8 w-fit rounded-2xl" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <button
            onClick={() => setActiveTab('portfolio')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${activeTab === 'portfolio' ? 'text-white' : 'text-brand-textMuted hover:text-white'}`}
            style={activeTab === 'portfolio' ? { background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)', boxShadow: '0 2px 12px rgba(239,68,68,0.3)' } : {}}
          >
            Portfolio
          </button>
          <button
            onClick={() => setActiveTab('kyc')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center space-x-1.5 ${activeTab === 'kyc' ? 'text-white' : 'text-brand-textMuted hover:text-white'}`}
            style={activeTab === 'kyc' ? { background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)', boxShadow: '0 2px 12px rgba(239,68,68,0.3)' } : {}}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Verification</span>
            {kycStatus === 'pending' && <span className="w-2 h-2 bg-yellow-400 rounded-full" />}
            {kycStatus === 'unverified' && <span className="w-2 h-2 bg-brand-danger rounded-full" />}
          </button>
        </div>

        {/* --- KYC TAB --- */}
        {activeTab === 'kyc' && (
          <section id="kyc-verification" className="max-w-xl">
            <KycForm
              kycStatus={kycStatus}
              onSubmitted={async () => {
                setKycStatus('pending');
                await refreshUser();
              }}
            />
          </section>
        )}

        {activeTab === 'portfolio' && (<>

        {/* --- MAIN DASHBOARD CONTENT GRID --- */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* LEFT COLUMN: Main Chart & Portfolio Holdings (8 cols) */}
          <div className="lg:col-span-8 space-y-8">
            
            {/* Chart Widget Card */}
            <div className="rounded-2xl p-5 md:p-6"
              style={{ background: 'rgba(16,14,30,0.95)', border: '1px solid rgba(255,255,255,0.06)', boxShadow: '0 8px 40px rgba(0,0,0,0.4)' }}>
              <div className="flex justify-between items-center pb-4 border-b mb-6" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                <div className="flex items-center space-x-2">
                  <TrendingUp className="w-5 h-5 text-brand-success" />
                  <span className="font-semibold text-white">Live Equity Projection</span>
                </div>
                
                {/* Timeline Selector */}
                <div className="flex p-0.5 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  {(['1D', '1W', '1M', 'ALL'] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setTimeline(t)}
                      className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                        timeline === t
                          ? 'text-white'
                          : 'text-brand-textMuted hover:text-white'
                      }`}
                      style={timeline === t ? { background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)' } : {}}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Dynamic SVG curve representing timeline charts */}
              <div className="h-56 w-full relative mb-4">
                <svg className="w-full h-full chart-glow-green" viewBox="0 0 500 150" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="equityGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#EF4444" stopOpacity="0.18" />
                      <stop offset="100%" stopColor="#EF4444" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>
                  
                  {/* Grid Lines */}
                  <line x1="0" y1="30" x2="500" y2="30" stroke="rgba(255,255,255,0.04)" strokeWidth="0.8" strokeDasharray="4,4" />
                  <line x1="0" y1="75" x2="500" y2="75" stroke="rgba(255,255,255,0.04)" strokeWidth="0.8" strokeDasharray="4,4" />
                  <line x1="0" y1="120" x2="500" y2="120" stroke="rgba(255,255,255,0.04)" strokeWidth="0.8" strokeDasharray="4,4" />

                  {/* Dynamic Shaded Path */}
                  <path
                    d={`${timelineCharts[timeline]} L 500,150 L 0,150 Z`}
                    fill="url(#equityGradient)"
                    className="transition-all duration-500"
                  />
                  {/* Dynamic Curve Line */}
                  <path
                    d={timelineCharts[timeline]}
                    fill="none"
                    stroke="#EF4444"
                    strokeWidth="2"
                    strokeLinecap="round"
                    className="transition-all duration-500"
                  />
                  <circle cx="500" cy="20" r="4" fill="#EF4444" style={{ filter: 'drop-shadow(0 0 6px rgba(239,68,68,0.6))' }} />
                </svg>
              </div>

              <div className="flex justify-between items-center text-xs text-brand-textMuted font-mono">
                <span>Cumulative trading session performance</span>
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                  Operational
                </span>
              </div>
            </div>

            {/* Finance Table — Real Trades */}
            <div className="rounded-2xl p-5 md:p-6"
              style={{ background: 'rgba(16,14,30,0.95)', border: '1px solid rgba(255,255,255,0.06)', boxShadow: '0 8px 40px rgba(0,0,0,0.4)' }}>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-4 border-b mb-5 gap-3" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                <div className="flex items-center space-x-2">
                  <Briefcase className="w-5 h-5 text-blue-400" />
                  <span className="font-semibold text-white">Finance Overview</span>
                </div>
                <div className="relative w-full sm:w-52">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-textMuted" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search trades..."
                    className="w-full pl-8 pr-3 py-2 text-xs text-white outline-none rounded-xl placeholder:text-brand-textMuted"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                  />
                </div>
              </div>

              {realTrades.length === 0 ? (
                <div className="text-center py-12 text-brand-textMuted text-sm">
                  <TrendingUp className="w-8 h-8 mx-auto mb-3 opacity-30" />
                  No trades yet. Your trade activity will appear here.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b text-[10px] uppercase tracking-wider text-brand-textMuted font-mono" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                        <th className="pb-3 font-semibold">Asset</th>
                        <th className="pb-3 font-semibold text-right">Type</th>
                        <th className="pb-3 font-semibold text-right">Qty</th>
                        <th className="pb-3 font-semibold text-right">Price</th>
                        <th className="pb-3 font-semibold text-right">Total</th>
                        <th className="pb-3 font-semibold text-right">P&amp;L</th>
                        <th className="pb-3 font-semibold text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y text-xs font-medium" style={{ '--tw-divide-opacity': 1 } as React.CSSProperties}>
                      {realTrades
                        .filter(t =>
                          !searchQuery ||
                          t.asset_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          t.asset_symbol.toLowerCase().includes(searchQuery.toLowerCase())
                        )
                        .map((t) => {
                          const total = t.quantity * t.price;
                          const pl = t.profit_loss || 0;
                          const isBuy = t.trade_type === 'buy';
                          const statusColor = t.status === 'closed' ? 'text-green-400' : t.status === 'cancelled' ? 'text-brand-textMuted' : 'text-blue-400';
                          return (
                            <tr key={t.id} className="hover:bg-white/[0.02] transition-colors" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                              <td className="py-3.5">
                                <span className="text-white font-semibold block">{t.asset_name}</span>
                                <span className="text-[10px] text-brand-textMuted font-mono uppercase">{t.asset_symbol}</span>
                              </td>
                              <td className="py-3.5 text-right">
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isBuy ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                                  {isBuy ? 'BUY' : 'SELL'}
                                </span>
                              </td>
                              <td className="py-3.5 text-right font-mono text-white">
                                {t.quantity.toLocaleString(undefined, { maximumFractionDigits: 6 })}
                              </td>
                              <td className="py-3.5 text-right font-mono text-brand-textMuted">
                                ${t.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                              <td className="py-3.5 text-right font-mono text-white font-bold">
                                ${total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                              <td className={`py-3.5 text-right font-mono font-semibold ${pl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                {t.trade_type === 'sell'
                                  ? `${pl >= 0 ? '+' : ''}$${Math.abs(pl).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                                  : <span className="text-brand-textMuted">—</span>
                                }
                              </td>
                              <td className={`py-3.5 text-right text-[10px] font-semibold uppercase font-mono ${statusColor}`}>
                                {t.status}
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

          </div>

          {/* RIGHT COLUMN: Crypto deposits, Watchlist, Transactions (4 cols) */}
          <div className="lg:col-span-4 space-y-8">
            
            {/* Crypto Funding Card */}
            <div className="rounded-2xl p-5 md:p-6 relative overflow-hidden"
              style={{ background: 'rgba(16,14,30,0.95)', border: '1px solid rgba(255,255,255,0.06)', boxShadow: '0 8px 40px rgba(0,0,0,0.4)' }}>
              <div className="absolute top-[-40px] right-[-40px] w-32 h-32 rounded-full opacity-30 pointer-events-none" style={{ background: 'radial-gradient(ellipse, rgba(99,102,241,0.15) 0%, transparent 70%)' }} />
              
              <div className="flex items-center space-x-2 pb-4 border-b mb-5" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                <Coins className="w-5 h-5 text-brand-success" />
                <span className="font-semibold text-white">Deposit Crypto Funding</span>
              </div>

              {/* Selector */}
              <div className="mb-4">
                <label className="text-[10px] text-brand-textMuted uppercase font-mono font-semibold block mb-1.5">Select Deposit Gateway</label>
                <div className="grid grid-cols-2 gap-2">
                  {['BTC', 'ETH', 'USDT (ERC-20)', 'USDT (TRC-20)', 'SOL'].map((token) => (
                    <button
                      key={token}
                      onClick={() => {
                        setDepositToken(token);
                        setCopied(false);
                      }}
                      className={`py-2 rounded-xl text-xs font-bold transition-all ${
                        depositCurrency === token
                          ? 'text-white'
                          : 'text-brand-textMuted hover:text-white'
                      }`}
                      style={depositCurrency === token
                        ? { background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)', border: '1px solid rgba(239,68,68,0.4)' }
                        : { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }
                      }
                    >
                      {token}
                    </button>
                  ))}
                </div>
              </div>

              {/* QR Code Display */}
              <div className="bg-brand-bg p-4 border border-brand-border rounded mb-4 flex flex-col items-center">
                <div className="bg-white p-3 rounded-lg mb-3">
                  <QRCodeSVG 
                    value={cryptoAddresses[depositCurrency]} 
                    size={160}
                    level="H"
                    includeMargin={false}
                  />
                </div>
                <span className="text-[9px] text-brand-textMuted uppercase font-semibold font-mono block mb-1.5 text-center">
                  Scan or copy {depositCurrency} address:
                </span>
                <div className="flex items-center justify-between gap-2 w-full bg-brand-card px-3 py-2 rounded border border-brand-border/50">
                  <span className="text-[10px] font-mono text-white truncate break-all">
                    {cryptoAddresses[depositCurrency]}
                  </span>
                  <button
                    onClick={handleCopyAddress}
                    className="p-1.5 hover:bg-brand-bg rounded transition-colors text-brand-textMuted hover:text-white flex-shrink-0"
                    title="Copy Address"
                  >
                    {copied ? <Check className="w-4 h-4 text-brand-success" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* simulated funding submission */}
              <form onSubmit={handleMockDeposit} className="space-y-3">
                <div>
                  <label className="text-[10px] text-brand-textMuted uppercase font-mono font-semibold block mb-1">Amount to deposit</label>
                  <div className="relative">
                    <input
                      type="number"
                      required
                      step="any"
                      min="500"
                      max="5000000"
                      value={depositAmount}
                      onChange={(e) => setDepositAmount(e.target.value)}
                      placeholder={`e.g. 500`}
                      className="w-full bg-brand-bg border border-brand-border focus:border-brand-borderLight rounded p-2 text-xs text-white outline-none font-mono"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono font-bold text-brand-textMuted">
                      {depositCurrency}
                    </span>
                  </div>
                  <p className="text-[10px] text-brand-textMuted mt-1.5 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3 text-yellow-500" />
                    Min: $500 • Max: $5,000,000
                  </p>
                </div>

                {/* Receipt Upload */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-white block">Upload Payment Receipt *</label>
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        if (file.size > 5 * 1024 * 1024) {
                          alert('File size must be less than 5MB');
                          e.target.value = '';
                          return;
                        }
                        setDepositReceipt(file);
                        const reader = new FileReader();
                        reader.onload = (ev) => setDepositReceiptPreview(ev.target?.result as string);
                        reader.readAsDataURL(file);
                      }
                    }}
                    className="w-full bg-brand-bg border border-brand-border focus:border-brand-borderLight rounded p-2 text-xs text-white outline-none file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-brand-success file:text-brand-bg hover:file:bg-red-700 file:cursor-pointer"
                  />
                  {depositReceiptPreview && (
                    <div className="mt-2 relative">
                      <img src={depositReceiptPreview} alt="Receipt preview" className="w-full h-32 object-cover rounded border border-brand-border" />
                      <button
                        type="button"
                        onClick={() => {
                          setDepositReceipt(null);
                          setDepositReceiptPreview('');
                        }}
                        className="absolute top-1 right-1 bg-red-500 hover:bg-red-600 text-white rounded-full p-1"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                  <p className="text-[10px] text-brand-textMuted flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3 text-yellow-500" />
                    Upload screenshot of your crypto transaction
                  </p>
                </div>

                {depositSuccess && (
                  <div className="bg-brand-success/10 border border-brand-success/30 rounded px-3 py-2 text-xs text-brand-success">
                    Deposit submitted! It will be credited once an admin approves it.
                  </div>
                )}

                <button
                  type="submit"
                  disabled={depositLoading}
                  className="w-full bg-brand-success hover:bg-red-700 disabled:opacity-50 text-brand-bg font-bold py-2.5 rounded text-xs transition-all flex items-center justify-center space-x-1"
                >
                  {depositLoading ? (
                    <div className="w-4 h-4 border-2 border-brand-bg border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <><Plus className="w-4 h-4" /><span>Submit Deposit Request</span></>
                  )}
                </button>
              </form>
            </div>

            {/* Watchlist Section */}
            <div className="bg-brand-card border border-brand-border rounded-xl p-5 md:p-6 shadow-xl">
              <div className="flex justify-between items-center pb-4 border-b border-brand-border mb-4">
                <div className="flex items-center space-x-2">
                  <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                  <span className="font-semibold text-white">Active Watchlist</span>
                </div>
              </div>

              {watchlist.length === 0 ? (
                <div className="text-center py-6 text-brand-textMuted text-xs">
                  Your watchlist is empty. Star assets to track them here.
                </div>
              ) : (
                <div className="space-y-3">
                  {watchlist.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-2.5 bg-brand-bg/30 border border-brand-border/40 rounded hover:border-brand-border transition-all"
                    >
                      <div className="flex items-center space-x-2.5">
                        <span className="text-base">{item.logo}</span>
                        <div>
                          <span className="text-xs font-bold text-white block">{item.name}</span>
                          <span className="text-[9px] text-brand-textMuted uppercase font-mono">{item.ticker}</span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-4">
                        <div className="text-right">
                          <span className="text-xs font-mono font-bold text-white block">{item.price}</span>
                          <span className={`text-[10px] font-mono font-semibold flex items-center justify-end space-x-0.5 ${
                            item.isUp ? 'text-brand-success' : 'text-brand-danger'
                          }`}>
                            {item.isUp ? '▲' : '▼'} {item.change}
                          </span>
                        </div>
                        
                        <div className="flex space-x-1">
                          <button
                            onClick={() => openTradeModal('buy', item)}
                            className="p-1 bg-brand-successMuted hover:bg-brand-success/20 text-brand-success rounded text-[9px] font-bold"
                          >
                            Buy
                          </button>
                          <button
                            onClick={() => setWatchlist(prev => prev.filter(w => w.ticker !== item.ticker))}
                            className="p-1 hover:bg-brand-card rounded text-brand-textMuted hover:text-white"
                            title="Remove Watchlist"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Transactions History panel */}
            <div className="bg-brand-card border border-brand-border rounded-xl p-5 md:p-6 shadow-xl">
              <div className="flex items-center space-x-2 pb-4 border-b border-brand-border mb-4">
                <History className="w-5 h-5 text-blue-400" />
                <span className="font-semibold text-white">Transaction History</span>
              </div>

              <div className="space-y-3.5 max-h-[300px] overflow-y-auto pr-1">
                {/* Real withdrawals from DB */}
                {realWithdrawals.map((wd) => (
                  <div key={wd.id} className="flex justify-between items-start text-xs border-b border-brand-border/20 pb-3">
                    <div className="space-y-0.5">
                      <div className="flex items-center space-x-1.5">
                        <span className={`inline-block px-1.5 py-0.5 rounded text-[8px] font-bold uppercase ${
                          wd.status === 'approved'
                            ? 'bg-brand-success/10 text-brand-success border border-brand-success/15'
                            : wd.status === 'pending'
                            ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/15'
                            : 'bg-brand-dangerMuted text-brand-danger border border-brand-danger/15'
                        }`}>
                          {wd.status === 'approved' ? 'withdrawn' : wd.status === 'rejected' ? 'refunded' : 'withdrawal'}
                        </span>
                        <span className="text-white font-semibold">{wd.crypto_currency} Withdrawal</span>
                      </div>
                      <p className="text-[10px] text-brand-textMuted font-mono truncate max-w-[160px]">{wd.wallet_address}</p>
                      <p className="text-[10px] text-brand-textMuted">{wd.network} • {new Date(wd.created_at).toLocaleString()}</p>
                      {wd.admin_note && <p className="text-[10px] text-brand-textMuted italic">"{wd.admin_note}"</p>}
                    </div>
                    <div className="text-right">
                      <span className={`font-mono font-bold block ${wd.status === 'rejected' ? 'text-brand-success' : 'text-brand-danger'}`}>
                        {wd.status === 'rejected' ? '+' : '-'}${wd.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                      <span className="text-[10px] text-brand-textMuted font-mono">{wd.crypto_currency}</span>
                    </div>
                  </div>
                ))}
                {/* Real deposits from DB */}
                {realDeposits.map((dep) => (
                  <div key={dep.id} className="flex justify-between items-start text-xs border-b border-brand-border/20 pb-3">
                    <div className="space-y-0.5">
                      <div className="flex items-center space-x-1.5">
                        <span className={`inline-block px-1.5 py-0.5 rounded text-[8px] font-bold uppercase ${
                          dep.status === 'approved'
                            ? 'bg-brand-successMuted text-brand-success border border-brand-success/15'
                            : dep.status === 'pending'
                            ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/15'
                            : 'bg-brand-dangerMuted text-brand-danger border border-brand-danger/15'
                        }`}>
                          {dep.status === 'approved' ? 'deposit' : dep.status}
                        </span>
                        <span className="text-white font-semibold">{dep.crypto_currency} Deposit</span>
                      </div>
                      <p className="text-[10px] text-brand-textMuted">{new Date(dep.created_at).toLocaleString()}</p>
                      {dep.admin_note && <p className="text-[10px] text-brand-textMuted italic">Note: {dep.admin_note}</p>}
                    </div>
                    <div className="text-right">
                      <span className={`font-mono font-bold block ${dep.status === 'approved' ? 'text-brand-success' : 'text-white'}`}>
                        {dep.status === 'approved' ? '+' : ''}${dep.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                      <span className="text-[10px] text-brand-textMuted font-mono">{dep.crypto_currency}</span>
                    </div>
                  </div>
                ))}
                {/* Real trades from DB */}
                {realTrades.map((trade) => (
                  <div key={trade.id} className="flex justify-between items-start text-xs border-b border-brand-border/20 pb-3">
                    <div className="space-y-0.5">
                      <div className="flex items-center space-x-1.5">
                        <span className={`inline-block px-1.5 py-0.5 rounded text-[8px] font-bold uppercase ${
                          trade.trade_type === 'buy'
                            ? 'bg-blue-500/10 text-blue-400 border border-blue-500/15'
                            : 'bg-brand-dangerMuted text-brand-danger border border-brand-danger/15'
                        }`}>
                          {trade.trade_type}
                        </span>
                        <span className="text-white font-semibold">{trade.asset_name}</span>
                        {trade.sent_by_admin && <span className="text-[8px] text-brand-textMuted border border-brand-border px-1 rounded">Admin</span>}
                      </div>
                      <p className="text-[10px] text-brand-textMuted">
                        {trade.executed_at 
                          ? `Executed: ${new Date(trade.executed_at).toLocaleDateString()} ${new Date(trade.executed_at).toLocaleTimeString()}`
                          : new Date(trade.created_at).toLocaleString()
                        }
                      </p>
                      {trade.balance_before !== undefined && trade.balance_after !== undefined && (
                        <div className="text-[10px] font-mono text-brand-textMuted flex items-center gap-1.5">
                          <span>Balance: ${trade.balance_before!.toFixed(2)}</span>
                          <span className={trade.balance_after! > trade.balance_before! ? 'text-brand-success' : 'text-brand-danger'}>
                            → ${trade.balance_after!.toFixed(2)}
                          </span>
                        </div>
                      )}
                      {trade.history_note && (
                        <p className="text-[10px] text-brand-textMuted italic">"{trade.history_note}"</p>
                      )}
                    </div>
                    <div className="text-right">
                      <span className="font-mono font-bold text-white block">
                        {trade.trade_type === 'sell' ? '+' : '-'}${(trade.quantity * trade.price).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                      {trade.trade_type === 'sell' && trade.profit_loss !== undefined && (
                        <span className={`text-[10px] font-mono font-semibold ${trade.profit_loss >= 0 ? 'text-brand-success' : 'text-brand-danger'}`}>
                          P&amp;L: {trade.profit_loss >= 0 ? '+' : ''}${trade.profit_loss.toFixed(2)}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
                {/* Local sim trades */}
                {transactions.filter(tx => tx.type !== 'deposit').map((tx) => (
                  <div key={tx.id} className="flex justify-between items-start text-xs border-b border-brand-border/20 pb-3">
                    <div className="space-y-0.5">
                      <div className="flex items-center space-x-1.5">
                        <span className={`inline-block px-1.5 py-0.5 rounded text-[8px] font-bold uppercase ${
                          tx.type === 'buy'
                            ? 'bg-blue-500/10 text-blue-400 border border-blue-500/15'
                            : 'bg-brand-dangerMuted text-brand-danger border border-brand-danger/15'
                        }`}>
                          {tx.type}
                        </span>
                        <span className="text-white font-semibold">{tx.asset}</span>
                      </div>
                      <p className="text-[10px] text-brand-textMuted">{tx.timestamp}</p>
                    </div>
                    <div className="text-right">
                      <span className="font-mono font-bold text-white block">
                        {tx.type === 'sell' ? '+' : '-'}${tx.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                      <span className="text-[10px] text-brand-textMuted font-mono">
                        {tx.amount} {tx.ticker} {tx.price && `@ $${tx.price.toLocaleString()}`}
                      </span>
                    </div>
                  </div>
                ))}
                {realDeposits.length === 0 && realTrades.length === 0 && realWithdrawals.length === 0 && transactions.filter(t => t.type !== 'deposit').length === 0 && (
                  <div className="text-center py-6 text-brand-textMuted text-xs">No transactions yet.</div>
                )}
              </div>
            </div>

          </div>
        </div>
        </>)}

      </div>


      {/* --- BUY/SELL EXECUTION OVERLAY MODAL --- */}
      {tradeModal.isOpen && tradeModal.asset && (
        <div className="fixed inset-0 bg-brand-bg/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-brand-card border border-brand-border max-w-sm w-full rounded-xl p-6 shadow-2xl relative">
            
            <button
              onClick={closeTradeModal}
              className="absolute right-4 top-4 p-1 rounded hover:bg-brand-bg text-brand-textMuted hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="font-serif text-xl font-bold mb-1">
              Simulate {tradeModal.type === 'buy' ? 'Purchase' : 'Asset Liquidation'}
            </h3>
            <p className="text-xs text-brand-textMuted mb-5">
              Instant Simulated Order Desk Execution
            </p>

            <form onSubmit={executeTrade} className="space-y-4">
              
              {/* Asset Display Info */}
              <div className="p-3 bg-brand-bg rounded border border-brand-border flex justify-between items-center">
                <div className="flex items-center space-x-2">
                  <span className="text-lg">{tradeModal.asset.logo}</span>
                  <div>
                    <span className="text-xs font-bold text-white block">{tradeModal.asset.name}</span>
                    <span className="text-[10px] text-brand-textMuted font-mono uppercase">{tradeModal.asset.ticker}</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-mono font-bold text-white block">
                    ${parseFloat(tradeModal.asset.price.replace(/[$,]/g, '')).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                  <span className="text-[10px] text-brand-textMuted">Live simulated price</span>
                </div>
              </div>

              {/* Enter volume */}
              <div>
                <label className="text-[10px] text-brand-textMuted uppercase font-mono font-semibold block mb-1">Quantity / Volume</label>
                <input
                  type="number"
                  required
                  step="any"
                  min="0.0001"
                  value={tradeModal.sharesCount}
                  onChange={(e) => setTradeModal(prev => ({ ...prev, sharesCount: e.target.value }))}
                  placeholder="e.g. 5"
                  className="w-full bg-brand-bg border border-brand-border focus:border-brand-borderLight rounded p-2 text-xs text-white outline-none font-mono"
                />
              </div>

              {/* Total calculations */}
              <div className="space-y-2 pt-2 border-t border-brand-border/40 text-xs">
                <div className="flex justify-between text-brand-textMuted">
                  <span>Available Balance</span>
                  <span className="font-mono text-white">
                    ${cash.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT
                  </span>
                </div>
                <div className="flex justify-between text-brand-textMuted">
                  <span>Simulated Spreads Commission</span>
                  <span className="text-brand-success font-semibold">FREE ($0.00)</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-brand-border/20 text-white font-bold text-sm">
                  <span>Estimated total cost:</span>
                  <span className="font-mono text-brand-success">
                    ${(parseFloat(tradeModal.sharesCount || '0') * parseFloat(tradeModal.asset.price.replace(/[$,]/g, ''))).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT
                  </span>
                </div>
              </div>

              {/* Execute */}
              <button
                type="submit"
                className={`w-full font-bold py-3 rounded text-sm transition-all text-brand-bg ${
                  tradeModal.type === 'buy'
                    ? 'bg-brand-success hover:bg-red-700'
                    : 'bg-brand-danger hover:bg-red-600 !text-white'
                }`}
              >
                Confirm {tradeModal.type === 'buy' ? 'Simulated Buy Order' : 'Simulated Sell Order'}
              </button>

            </form>
          </div>
        </div>
      )}

      {showWithdrawModal && (
        <WithdrawModal
          balance={cash}
          onClose={() => setShowWithdrawModal(false)}
          onSuccess={loadRealData}
        />
      )}

      {/* --- BALANCE HISTORY CHART --- */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        <BalanceHistoryChart userId={user.id} />
      </div>

      {/* --- REFERRAL SECTION --- */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">

          {/* Referral card */}
          <section id="referral" className="rounded-2xl p-5 sm:p-6"
            style={{ background: 'rgba(16,14,30,0.95)', border: '1px solid rgba(255,255,255,0.07)', boxShadow: '0 8px 40px rgba(0,0,0,0.3)' }}>
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)' }}>
                <Gift className="w-4 h-4 text-brand-success" />
              </div>
              <div>
                <h3 className="font-semibold text-white text-sm">Invite Friends</h3>
                <p className="text-[11px] text-brand-textMuted">Share your referral code</p>
              </div>
            </div>

            <p className="text-xs text-brand-textMuted leading-relaxed mb-4">
              Invite your friends to Quantumspacex. Share your unique referral code and grow your network of elite investors.
            </p>

            {/* Referral code display */}
            <div className="flex items-center gap-2 mb-4">
              <div className="flex-1 px-4 py-2.5 rounded-xl font-mono font-bold text-sm text-white tracking-widest text-center"
                style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)' }}>
                {user.referral_code || 'LOADING...'}
              </div>
              <button
                onClick={() => {
                  if (user.referral_code) {
                    navigator.clipboard.writeText(user.referral_code);
                    setReferralCopied(true);
                    setTimeout(() => setReferralCopied(false), 2500);
                  }
                }}
                className="p-2.5 rounded-xl transition-all hover:bg-white/10 flex-shrink-0"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
                title="Copy referral code"
              >
                {referralCopied ? <Check className="w-4 h-4 text-brand-success" /> : <Copy className="w-4 h-4 text-brand-textMuted" />}
              </button>
            </div>

            {/* Share buttons */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  const msg = encodeURIComponent(`Join me on Quantumspacex — the elite investment platform. Use my referral code: ${user.referral_code || ''}\n\nSign up at: ${window.location.origin}`);
                  window.open(`mailto:?subject=Join Quantumspacex&body=${msg}`, '_blank');
                }}
                className="flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold text-brand-textMuted hover:text-white transition-all"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <Users className="w-3.5 h-3.5" />Invite via Email
              </button>
              <button
                onClick={() => {
                  if (navigator.share) {
                    navigator.share({
                      title: 'Join Quantumspacex',
                      text: `Use my referral code: ${user.referral_code || ''} to join Quantumspacex`,
                      url: window.location.origin,
                    });
                  } else {
                    const text = `Join Quantumspacex - Use my code: ${user.referral_code || ''} | ${window.location.origin}`;
                    navigator.clipboard.writeText(text);
                    setReferralCopied(true);
                    setTimeout(() => setReferralCopied(false), 2500);
                  }
                }}
                className="flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold text-white transition-all"
                style={{ background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)', boxShadow: '0 4px 16px rgba(239,68,68,0.2)' }}>
                <ArrowUpRight className="w-3.5 h-3.5" />Share Link
              </button>
            </div>
          </section>

          {/* Investment Plans shortcut */}
          <section id="plans-shortcut" className="relative rounded-2xl p-5 sm:p-6 flex flex-col justify-between"
            style={{ background: 'linear-gradient(145deg, rgba(88,28,135,0.25) 0%, rgba(16,14,30,0.97) 100%)', border: '1px solid rgba(139,92,246,0.2)', boxShadow: '0 8px 40px rgba(0,0,0,0.3)' }}>
            <div className="absolute inset-x-0 top-0 h-px rounded-t-2xl"
              style={{ background: 'linear-gradient(90deg, transparent, rgba(139,92,246,0.4), transparent)' }} />
            <div>
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.3)' }}>
                  <Lock className="w-4 h-4 text-violet-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-white text-sm">Investment Plans</h3>
                  <p className="text-[11px] text-brand-textMuted">Let us trade for you</p>
                </div>
              </div>

              {activePlans.length > 0 ? (
                <div className="space-y-3 mb-5">
                  <p className="text-xs text-violet-400 font-semibold">Active Plans ({activePlans.length})</p>
                  {activePlans.map(plan => {
                    const daysLeft = Math.max(0, Math.ceil((new Date(plan.end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
                    const hoursLeft = Math.max(0, Math.floor(((new Date(plan.end_date).getTime() - Date.now()) % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)));
                    return (
                      <div key={plan.id} className="p-3 rounded-xl"
                        style={{ background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.15)' }}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-semibold text-white">{plan.plan_name}</span>
                          <span className="text-xs font-mono font-bold text-violet-400">${plan.amount.toLocaleString()}</span>
                        </div>
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="text-brand-textMuted">Expected payout</span>
                          <span className="font-mono font-bold text-brand-success">${plan.expected_payout.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                        </div>
                        <div className="mt-2 pt-2 border-t" style={{ borderColor: 'rgba(139,92,246,0.15)' }}>
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] text-brand-textMuted">Time remaining</span>
                            <div className="flex items-center gap-1.5">
                              <Clock className="w-3 h-3 text-violet-400" />
                              <span className="text-xs font-mono font-bold text-violet-400">
                                {daysLeft}d {hoursLeft}h
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div>
                  <p className="text-xs text-brand-textMuted leading-relaxed mb-5">
                    Lock funds into a managed plan. Our expert desk trades on your behalf and delivers returns at the end of the term — up to <span className="text-violet-400 font-bold">+75%</span> per cycle.
                  </p>
                  <div className="flex items-center gap-3 text-[11px] text-brand-textMuted mb-5">
                    <span className="flex items-center gap-1"><Check className="w-3 h-3 text-violet-400" />30 / 60 / 90 day terms</span>
                    <span className="flex items-center gap-1"><Check className="w-3 h-3 text-violet-400" />3 plan tiers</span>
                  </div>
                </div>
              )}
            </div>
            <button
              onClick={() => navigate('/investment-plans')}
              className="w-full py-3 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 flex items-center justify-center gap-2"
              style={{ background: 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)', boxShadow: '0 4px 20px rgba(139,92,246,0.3)' }}>
              <Lock className="w-4 h-4" />
              {activePlans.length > 0 ? 'Manage Plans' : 'View Plans'}
            </button>
          </section>

        </div>
      </div>

    </div>
  );
}
