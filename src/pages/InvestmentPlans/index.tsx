import { useState, useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { Lock, TrendingUp, Clock, DollarSign, CheckCircle2, ArrowLeft, Zap, Shield, Star } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { sendNotification } from '@/lib/db';

interface Plan {
  id: string;
  name: string;
  slug: string;
  description: string;
  min_amount: number;
  max_amount: number;
  duration_days: number;
  expected_return_percent: number;
  is_active: boolean;
}

interface Subscription {
  id: string;
  plan_id: string;
  amount: number;
  status: 'active' | 'completed' | 'cancelled';
  start_date: string;
  end_date: string;
  expected_payout: number;
  actual_payout?: number;
  investment_plans?: { name: string; expected_return_percent: number };
}

const PLAN_STYLES = [
  {
    gradient: 'from-blue-900/40 to-blue-950/60',
    border: 'border-blue-500/20',
    hoverBorder: 'hover:border-blue-400/40',
    accentColor: 'text-blue-400',
    badgeBg: 'bg-blue-500/10 border-blue-500/20',
    btnStyle: { background: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)', boxShadow: '0 4px 20px rgba(59,130,246,0.3)' },
    icon: TrendingUp,
    badge: 'Starter',
  },
  {
    gradient: 'from-violet-900/40 to-violet-950/60',
    border: 'border-violet-500/25',
    hoverBorder: 'hover:border-violet-400/50',
    accentColor: 'text-violet-400',
    badgeBg: 'bg-violet-500/10 border-violet-500/20',
    btnStyle: { background: 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)', boxShadow: '0 4px 20px rgba(139,92,246,0.35)' },
    icon: Zap,
    badge: 'Popular',
    featured: true,
  },
  {
    gradient: 'from-amber-900/40 to-amber-950/60',
    border: 'border-amber-500/20',
    hoverBorder: 'hover:border-amber-400/40',
    accentColor: 'text-amber-400',
    badgeBg: 'bg-amber-500/10 border-amber-500/20',
    btnStyle: { background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)', boxShadow: '0 4px 20px rgba(245,158,11,0.3)' },
    icon: Star,
    badge: 'Elite',
  },
];

function formatCurrency(n: number) {
  return n >= 1000000 ? `$${(n / 1000000).toFixed(0)}M` : `$${n.toLocaleString()}`;
}

function daysLeft(endDate: string) {
  const diff = new Date(endDate).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

export default function InvestmentPlansPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [plans, setPlans] = useState<Plan[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [amount, setAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadData();
  }, [user]);

  async function loadData() {
    setLoading(true);
    const { data: plansData } = await supabase
      .from('investment_plans')
      .select('*')
      .eq('is_active', true)
      .order('min_amount', { ascending: true });
    
    if (plansData) setPlans(plansData);

    if (user) {
      const { data: subs } = await supabase
        .from('plan_subscriptions')
        .select('*, investment_plans(name, expected_return_percent)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (subs) setSubscriptions(subs as Subscription[]);
    }
    setLoading(false);
  }

  async function handleSubscribe(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !selectedPlan) return;
    setError('');
    
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt < selectedPlan.min_amount || amt > selectedPlan.max_amount) {
      setError(`Amount must be between ${formatCurrency(selectedPlan.min_amount)} and ${formatCurrency(selectedPlan.max_amount)}`);
      return;
    }

    const { data: userData } = await supabase.from('users').select('balance').eq('id', user.id).single();
    if (!userData || userData.balance < amt) {
      setError('Insufficient balance. Please deposit funds first.');
      return;
    }

    setSubmitting(true);
    try {
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + selectedPlan.duration_days);
      const expectedPayout = amt * (1 + selectedPlan.expected_return_percent / 100);

      // Deduct from balance
      const newBalance = userData.balance - amt;
      const { error: balErr } = await supabase
        .from('users')
        .update({ balance: newBalance })
        .eq('id', user.id);
      if (balErr) throw balErr;

      // Record balance history
      await supabase.from('balance_history').insert({
        user_id: user.id,
        balance: newBalance,
        change_amount: -amt,
        change_type: 'investment',
        description: `Invested in ${selectedPlan.name}: -$${amt.toLocaleString()}`
      });

      // Create subscription
      const { error: subErr } = await supabase.from('plan_subscriptions').insert({
        user_id: user.id,
        plan_id: selectedPlan.id,
        amount: amt,
        status: 'active',
        end_date: endDate.toISOString(),
        expected_payout: expectedPayout,
      });
      if (subErr) throw subErr;

      await sendNotification({
        user_id: user.id,
        title: 'Investment Plan Activated',
        message: `Your ${selectedPlan.name} plan of $${amt.toLocaleString()} has been activated. Expected payout: $${expectedPayout.toLocaleString(undefined, { maximumFractionDigits: 2 })} in ${selectedPlan.duration_days} days.`,
        type: 'success',
      });

      setSuccess(true);
      setSelectedPlan(null);
      setAmount('');
      await loadData();
    } catch {
      setError('Failed to activate plan. Please try again.');
    }
    setSubmitting(false);
  }

  if (!user) return <Navigate to="/login" replace />;

  return (
    <div className="min-h-screen ambient-bg text-white pb-24">
      {/* Ambient glows */}
      <div className="fixed top-0 left-0 right-0 h-[500px] pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-100px] left-1/4 w-[min(600px,80vw)] h-[min(400px,60vw)] rounded-full opacity-30"
          style={{ background: 'radial-gradient(ellipse, rgba(99,102,241,0.12) 0%, transparent 70%)' }} />
        <div className="absolute top-[100px] right-1/4 w-[min(400px,60vw)] h-[min(300px,50vw)] rounded-full opacity-20"
          style={{ background: 'radial-gradient(ellipse, rgba(139,92,246,0.1) 0%, transparent 70%)' }} />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">

        {/* Header */}
        <section id="plans-header">
          <button onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 text-brand-textMuted hover:text-white text-sm mb-6 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </button>

          <div className="mb-10">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-semibold uppercase tracking-widest mb-4"
              style={{ background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.2)', color: '#A78BFA' }}>
              <Lock className="w-3 h-3" />
              Managed Investment Plans
            </div>
            <h1 className="font-serif text-3xl sm:text-4xl font-bold text-white mb-3">
              Lock &amp; Grow Your Capital
            </h1>
            <p className="text-brand-textMuted max-w-xl leading-relaxed">
              Choose a plan, lock your funds, and our expert trading desk works to generate returns for you. Payouts are credited at the end of the term.
            </p>
          </div>
        </section>

        {/* Success banner */}
        {success && (
          <div className="mb-8 flex items-center gap-3 px-5 py-4 rounded-2xl text-sm font-semibold"
            style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)', color: '#22C55E' }}>
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            Plan activated successfully! Funds have been locked. Check your notifications for details.
            <button onClick={() => setSuccess(false)} className="ml-auto text-brand-textMuted hover:text-white text-xs">Dismiss</button>
          </div>
        )}

        {/* Plans grid */}
        <section id="plans-grid" className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {loading ? (
            [...Array(3)].map((_, i) => (
              <div key={i} className="rounded-2xl animate-pulse h-72"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }} />
            ))
          ) : plans.map((plan, i) => {
            const style = PLAN_STYLES[i] || PLAN_STYLES[0];
            const Icon = style.icon;
            const isActive = subscriptions.some(s => s.plan_id === plan.id && s.status === 'active');
            return (
              <div key={plan.id}
                className={`relative rounded-2xl p-6 flex flex-col transition-all duration-300 cursor-pointer ${style.hoverBorder} ${style.featured ? 'scale-[1.02]' : ''}`}
                style={{
                  background: `linear-gradient(145deg, rgba(15,12,30,0.98), rgba(12,10,25,0.98))`,
                  border: `1px solid ${style.featured ? 'rgba(139,92,246,0.3)' : 'rgba(255,255,255,0.07)'}`,
                  boxShadow: style.featured ? '0 0 40px rgba(139,92,246,0.12)' : '0 8px 40px rgba(0,0,0,0.4)',
                }}>

                {/* Top shimmer */}
                <div className="absolute inset-x-0 top-0 h-px rounded-t-2xl"
                  style={{ background: style.featured ? 'linear-gradient(90deg, transparent, rgba(139,92,246,0.5), transparent)' : 'linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)' }} />

                {style.featured && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider text-white"
                    style={{ background: 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)' }}>
                    Most Popular
                  </div>
                )}

                <div className="flex items-center justify-between mb-5">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${style.badgeBg} border`}>
                    <Icon className={`w-5 h-5 ${style.accentColor}`} />
                  </div>
                  <span className={`text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full border ${style.badgeBg} ${style.accentColor}`}>
                    {style.badge}
                  </span>
                </div>

                <h2 className="font-serif text-xl font-bold text-white mb-2">{plan.name}</h2>
                <p className="text-xs text-brand-textMuted leading-relaxed mb-5 flex-grow">{plan.description}</p>

                <div className="space-y-2.5 mb-6">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-brand-textMuted flex items-center gap-1.5"><DollarSign className="w-3.5 h-3.5" />Range</span>
                    <span className="font-mono font-bold text-white">{formatCurrency(plan.min_amount)} – {formatCurrency(plan.max_amount)}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-brand-textMuted flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" />Duration</span>
                    <span className="font-mono font-bold text-white">{plan.duration_days} Days</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-brand-textMuted flex items-center gap-1.5"><TrendingUp className="w-3.5 h-3.5" />Expected Return</span>
                    <span className={`font-mono font-bold text-lg ${style.accentColor}`}>+{plan.expected_return_percent}%</span>
                  </div>
                </div>

                {isActive ? (
                  <div className="w-full py-3 rounded-xl text-center text-sm font-bold text-brand-success"
                    style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)' }}>
                    <CheckCircle2 className="w-4 h-4 inline mr-1.5" />Active Plan
                  </div>
                ) : (
                  <button
                    onClick={() => { setSelectedPlan(plan); setAmount(''); setError(''); }}
                    className="w-full py-3 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90"
                    style={style.btnStyle}>
                    Invest Now
                  </button>
                )}
              </div>
            );
          })}
        </section>

        {/* How it works */}
        <section id="plans-how-it-works" className="mb-12 rounded-2xl p-6"
          style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <h2 className="font-serif text-lg font-bold text-white mb-5 flex items-center gap-2">
            <Shield className="w-5 h-5 text-brand-success" />How Investment Plans Work
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {[
              { step: '01', title: 'Choose & Lock', desc: 'Select a plan and lock your funds. They are reserved for the full duration.' },
              { step: '02', title: 'Admin Trades', desc: 'Our expert trading desk actively manages your allocation throughout the period.' },
              { step: '03', title: 'Receive Payout', desc: 'At term end, your principal + returns are credited back to your account.' },
            ].map(({ step, title, desc }) => (
              <div key={step} className="flex gap-4">
                <span className="w-9 h-9 rounded-xl bg-brand-success/10 border border-brand-success/20 flex items-center justify-center text-xs font-bold font-mono text-brand-success flex-shrink-0">{step}</span>
                <div>
                  <h3 className="text-sm font-bold text-white mb-1">{title}</h3>
                  <p className="text-xs text-brand-textMuted leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Active subscriptions */}
        {subscriptions.length > 0 && (
          <section id="plans-subscriptions" className="rounded-2xl overflow-hidden"
            style={{ background: 'rgba(16,14,30,0.95)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <div className="px-6 py-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
              <h2 className="font-semibold text-white flex items-center gap-2">
                <Lock className="w-4 h-4 text-brand-success" />My Investment Plans
              </h2>
            </div>
            <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
              {subscriptions.map((sub) => (
                <div key={sub.id} className="px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-white text-sm">{sub.investment_plans?.name}</span>
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                        sub.status === 'active' ? 'bg-brand-success/10 text-brand-success border-brand-success/20'
                        : sub.status === 'completed' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                        : 'bg-red-500/10 text-red-400 border-red-500/20'
                      }`}>{sub.status}</span>
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-brand-textMuted">
                      <span>Invested: <span className="text-white font-mono font-bold">${sub.amount.toLocaleString()}</span></span>
                      <span>·</span>
                      <span>Expected: <span className="text-brand-success font-mono font-bold">${sub.expected_payout.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span></span>
                    </div>
                  </div>
                  <div className="text-right text-xs text-brand-textMuted">
                    {sub.status === 'active' && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl"
                        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                        <Clock className="w-3.5 h-3.5" />
                        {daysLeft(sub.end_date)} days remaining
                      </span>
                    )}
                    {sub.status === 'completed' && sub.actual_payout && (
                      <span className="text-brand-success font-bold">Paid: ${sub.actual_payout.toLocaleString()}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Subscribe modal */}
      {selectedPlan && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl p-6 relative"
            style={{ background: 'rgba(16,14,30,0.98)', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 24px 64px rgba(0,0,0,0.6)' }}>
            <button onClick={() => { setSelectedPlan(null); setError(''); }}
              className="absolute right-4 top-4 w-8 h-8 rounded-lg flex items-center justify-center text-brand-textMuted hover:text-white transition-colors"
              style={{ background: 'rgba(255,255,255,0.06)' }}>
              ×
            </button>

            <div className="mb-5">
              <h3 className="font-serif text-xl font-bold text-white mb-1">Activate {selectedPlan.name}</h3>
              <p className="text-xs text-brand-textMuted">
                {selectedPlan.duration_days}-day plan · +{selectedPlan.expected_return_percent}% expected return
              </p>
            </div>

            <form onSubmit={handleSubscribe} className="space-y-4">
              <div>
                <label className="text-[10px] text-brand-textMuted uppercase tracking-wider font-semibold block mb-1.5">Investment Amount (USD)</label>
                <input
                  type="number"
                  required
                  step="any"
                  min={selectedPlan.min_amount}
                  max={selectedPlan.max_amount}
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  placeholder={`Min $${selectedPlan.min_amount.toLocaleString()}`}
                  className="w-full bg-brand-bg border border-brand-border focus:border-brand-success rounded-xl px-4 py-3 text-white text-sm outline-none font-mono transition-colors"
                />
                <p className="text-[10px] text-brand-textMuted mt-1.5">
                  Range: {formatCurrency(selectedPlan.min_amount)} – {formatCurrency(selectedPlan.max_amount)}
                </p>
              </div>

              {amount && !isNaN(parseFloat(amount)) && (
                <div className="p-4 rounded-xl space-y-2.5 text-xs"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div className="flex justify-between text-brand-textMuted">
                    <span>You invest</span>
                    <span className="text-white font-mono font-bold">${parseFloat(amount).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-brand-textMuted">
                    <span>Expected return (+{selectedPlan.expected_return_percent}%)</span>
                    <span className="text-brand-success font-mono font-bold">
                      +${(parseFloat(amount) * selectedPlan.expected_return_percent / 100).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between font-bold border-t pt-2.5" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
                    <span className="text-white">Total payout after {selectedPlan.duration_days} days</span>
                    <span className="text-brand-success font-mono text-base">
                      ${(parseFloat(amount) * (1 + selectedPlan.expected_return_percent / 100)).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              )}

              {error && (
                <p className="text-xs text-brand-danger flex items-center gap-1.5">
                  <span className="w-1 h-1 rounded-full bg-brand-danger flex-shrink-0" />{error}
                </p>
              )}

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => { setSelectedPlan(null); setError(''); }}
                  className="flex-1 py-3 rounded-xl text-sm font-semibold text-brand-textMuted transition-all hover:text-white"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  Cancel
                </button>
                <button type="submit" disabled={submitting}
                  className="flex-2 flex-1 py-3 rounded-xl text-sm font-bold text-white disabled:opacity-50 transition-all"
                  style={{ background: 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)', boxShadow: '0 4px 20px rgba(139,92,246,0.35)' }}>
                  {submitting ? 'Activating...' : 'Confirm & Lock Funds'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
