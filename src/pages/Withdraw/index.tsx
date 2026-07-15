import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowUpRight,
  AlertTriangle,
  CheckCircle,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import { submitWithdrawal, sendNotification, createVerificationCode, verifyCode } from '@/lib/db';
import { sendCodeEmail } from '@/lib/email';
import { useAuth } from '@/context/AuthContext';

const NETWORKS: Record<string, string[]> = {
  USDT: ['TRC-20 (Tron)', 'ERC-20 (Ethereum)', 'BEP-20 (BSC)'],
  BTC: ['Bitcoin (BTC)'],
  ETH: ['ERC-20 (Ethereum)'],
  SOL: ['Solana (SOL)'],
  BNB: ['BEP-20 (BSC)'],
};
const CURRENCIES = Object.keys(NETWORKS);

type Step = 'form' | 'verify' | 'done';

export default function WithdrawPage() {
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();
  const balance = user?.balance ?? 0;

  const [step, setStep] = useState<Step>('form');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('USDT');
  const [network, setNetwork] = useState(NETWORKS['USDT'][0]);
  const [walletAddress, setWalletAddress] = useState('');
  const [otp, setOtp] = useState('');
  const [emailSent, setEmailSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState('');

  const handleCurrencyChange = (c: string) => { setCurrency(c); setNetwork(NETWORKS[c][0]); };

  const sendCode = async () => {
    if (!user) return;
    const vc = await createVerificationCode(user.id, user.email, 'withdrawal');
    const sent = await sendCodeEmail({ to_email: user.email, to_name: user.full_name, code: vc.code, type: 'withdrawal' });
    setEmailSent(sent);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) { setError('Enter a valid amount.'); return; }
    if (amt > balance) { setError(`Insufficient balance. Available: $${balance.toLocaleString()}.`); return; }
    if (!walletAddress.trim()) { setError('Enter your wallet address.'); return; }
    setLoading(true);
    try {
      await sendCode();
      setStep('verify');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to send code. Try again.');
    }
    setLoading(false);
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    setError('');
    try {
      const valid = await verifyCode(user.id, otp.trim(), 'withdrawal');
      if (!valid) throw new Error('Invalid or expired code. Please try again.');
      const amt = parseFloat(amount);
      await submitWithdrawal({ user_id: user.id, amount: amt, crypto_currency: currency, wallet_address: walletAddress.trim(), network });
      await sendNotification({
        user_id: user.id,
        title: 'Withdrawal Request Submitted',
        message: `Your withdrawal of $${amt.toLocaleString()} via ${currency} is under review. You'll be notified once processed.`,
        type: 'info',
      });
      await refreshUser();
      setStep('done');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Verification failed.');
    }
    setLoading(false);
  };

  const handleResend = async () => {
    setResending(true);
    setOtp('');
    setError('');
    await sendCode();
    setResending(false);
  };

  if (!user) return <Navigate to="/login" replace />;

  return (
    <div className="min-h-screen ambient-bg text-white pb-tab md:pb-20">
      {/* Header */}
      <section id="withdraw-header" className="sticky top-0 z-30"
        style={{ background: 'rgba(10,8,22,0.85)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 rounded-lg hover:bg-white/10 transition-colors" aria-label="Back">
            <ArrowLeft className="w-5 h-5 text-brand-textMuted" />
          </button>
          <div>
            <h1 className="text-base font-bold text-white">
              {step === 'form' ? 'Withdraw Funds' : step === 'verify' ? 'Confirm Withdrawal' : 'Request Submitted'}
            </h1>
            <p className="text-xs text-brand-textMuted">
              Available: <span className="text-white font-semibold">${balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </p>
          </div>
        </div>
      </section>

      <section id="withdraw-content" className="max-w-lg mx-auto px-4 py-6 space-y-4">

        {/* Done */}
        {step === 'done' && (
          <div className="bg-green-500/10 border border-green-500/30 rounded-2xl p-8 text-center space-y-4">
            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle className="w-8 h-8 text-green-400" />
            </div>
            <div>
              <h2 className="text-white font-bold text-xl">Request Submitted</h2>
              <p className="text-brand-textMuted text-sm mt-1">Your withdrawal is under review. We'll notify you once it's processed (usually within 24 hours).</p>
            </div>
            <button onClick={() => navigate('/transactions')} className="w-full py-3.5 rounded-xl font-bold bg-brand-success text-white hover:bg-red-700 transition-all text-sm">
              Back to Transactions
            </button>
          </div>
        )}

        {/* OTP Verify */}
        {step === 'verify' && (
          <div className="rounded-2xl p-5 space-y-5" style={{ background: 'rgba(16,14,30,0.95)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <div className="text-center">
              <div className="w-14 h-14 bg-brand-success/10 border border-brand-success/30 rounded-full flex items-center justify-center mx-auto mb-3">
                <ShieldCheck className="w-7 h-7 text-brand-success" />
              </div>
              <h2 className="text-white font-bold text-base mb-1">Verification Required</h2>
              <p className="text-sm text-brand-textMuted">
                {emailSent
                  ? <>Code sent to <span className="text-white font-medium">{user.email}</span></>
                  : <>Contact admin to receive your withdrawal authorization code.</>
                }
              </p>
              {!emailSent && (
                <div className="mt-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl px-3 py-2 text-xs text-yellow-400">
                  Admin will provide your withdrawal code manually
                </div>
              )}
            </div>

            {/* Summary */}
            <div className="bg-brand-surface border border-brand-border rounded-xl divide-y divide-brand-border overflow-hidden">
              {[
                ['Amount', `$${parseFloat(amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}`],
                ['Currency', currency],
                ['Network', network],
                ['Wallet', walletAddress.length > 20 ? walletAddress.slice(0, 10) + '...' + walletAddress.slice(-10) : walletAddress],
              ].map(([label, val]) => (
                <div key={label} className="flex justify-between items-center px-4 py-2.5">
                  <span className="text-brand-textMuted text-xs">{label}</span>
                  <span className="text-white font-mono text-xs">{val}</span>
                </div>
              ))}
            </div>

            <form onSubmit={handleVerify} className="space-y-4">
              <div>
                <label className="block text-xs text-brand-textMuted uppercase tracking-wider mb-1.5">6-Digit Withdrawal Code</label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={otp}
                  onChange={e => { setOtp(e.target.value); setError(''); }}
                  placeholder="000000"
                  className="w-full bg-brand-surface border border-brand-border rounded-xl px-4 py-3 text-white text-center text-2xl font-mono tracking-[0.5em] focus:outline-none focus:border-brand-success transition-colors placeholder:text-brand-textMuted placeholder:text-base placeholder:tracking-normal"
                />
              </div>
              {error && (
                <div className="flex items-center gap-2 text-red-400 text-xs bg-red-400/10 px-3 py-2 rounded-lg border border-red-400/20">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />{error}
                </div>
              )}
              <button
                type="button"
                onClick={handleResend}
                disabled={resending}
                className="flex items-center gap-1.5 text-brand-textMuted text-xs hover:text-white transition-colors disabled:opacity-40 mx-auto"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${resending ? 'animate-spin' : ''}`} />
                {resending ? 'Resending…' : 'Resend code'}
              </button>
              <button
                type="submit"
                disabled={loading || otp.length < 4}
                className="w-full py-3.5 rounded-xl font-bold text-sm bg-brand-danger hover:bg-red-600 transition-all disabled:opacity-50 text-white flex items-center justify-center gap-2"
              >
                {loading
                  ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Verifying…</>
                  : <><ShieldCheck className="w-4 h-4" /> Confirm Withdrawal</>
                }
              </button>
            </form>
          </div>
        )}

        {/* Form */}
        {step === 'form' && (
          <>
            {/* Fee notice */}
            <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-2xl p-4 flex items-start gap-3">
              <AlertTriangle className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
              <p className="text-xs text-yellow-300/80 leading-relaxed">
                A <strong className="text-yellow-300">10% profit-based fee</strong> applies to all withdrawals. Withdrawals are reviewed within 24 hours.
              </p>
            </div>

            <form onSubmit={handleFormSubmit}>
              <div className="rounded-2xl border p-5 space-y-5" style={{ background: 'rgba(16,14,30,0.95)', border: '1px solid rgba(255,255,255,0.07)' }}>
                {/* Currency */}
                <div>
                  <label className="text-xs text-brand-textMuted uppercase tracking-widest font-semibold block mb-2">Withdraw Via</label>
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                    {CURRENCIES.map(c => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => handleCurrencyChange(c)}
                        className={`py-2.5 px-2 rounded-xl border text-xs font-bold transition-all ${
                          currency === c
                            ? 'border-brand-success bg-brand-success/10 text-brand-success'
                            : 'border-brand-border text-brand-textMuted hover:border-white/20 hover:text-white'
                        }`}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Network */}
                <div>
                  <label className="text-xs text-brand-textMuted uppercase tracking-widest font-semibold block mb-2">Network</label>
                  <select
                    value={network}
                    onChange={e => setNetwork(e.target.value)}
                    className="w-full bg-brand-surface border border-brand-border rounded-xl px-3 py-3 text-white text-sm focus:outline-none focus:border-brand-success transition-colors"
                  >
                    {NETWORKS[currency].map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>

                {/* Amount */}
                <div>
                  <label className="text-xs text-brand-textMuted uppercase tracking-widest font-semibold block mb-2">Amount (USD)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-textMuted font-semibold">$</span>
                    <input
                      type="number"
                      min="1"
                      step="0.01"
                      max={balance}
                      value={amount}
                      onChange={e => { setAmount(e.target.value); setError(''); }}
                      placeholder="0.00"
                      required
                      className="w-full bg-brand-surface border border-brand-border rounded-xl pl-7 pr-4 py-3 text-white text-sm placeholder:text-brand-textMuted focus:outline-none focus:border-brand-success transition-colors"
                    />
                  </div>
                  <div className="flex justify-between mt-1">
                    <p className="text-[10px] text-brand-textMuted">Available: ${balance.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
                    <button type="button" onClick={() => setAmount(balance.toString())} className="text-[10px] text-brand-success hover:underline">Max</button>
                  </div>
                </div>

                {/* Wallet Address */}
                <div>
                  <label className="text-xs text-brand-textMuted uppercase tracking-widest font-semibold block mb-2">Your {currency} Wallet Address</label>
                  <input
                    type="text"
                    value={walletAddress}
                    onChange={e => { setWalletAddress(e.target.value); setError(''); }}
                    placeholder="e.g. TRx... / 0x... / bc1..."
                    required
                    className="w-full bg-brand-surface border border-brand-border rounded-xl px-3 py-3 text-white text-sm font-mono placeholder:text-brand-textMuted focus:outline-none focus:border-brand-success transition-colors"
                  />
                </div>

                {error && (
                  <div className="flex items-center gap-2 text-red-400 text-xs bg-red-400/10 px-3 py-2 rounded-lg border border-red-400/20">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />{error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 rounded-xl font-bold text-sm bg-brand-danger hover:bg-red-600 transition-all disabled:opacity-50 text-white flex items-center justify-center gap-2"
                >
                  {loading
                    ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Sending Code…</>
                    : <><ArrowUpRight className="w-4 h-4" /> Request Withdrawal</>
                  }
                </button>
              </div>
            </form>
          </>
        )}
      </section>
    </div>
  );
}
