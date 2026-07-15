import { useState } from 'react';
import { X, ArrowUpRight, AlertTriangle, CheckCircle, ShieldCheck, RefreshCw } from 'lucide-react';
import { submitWithdrawal, sendNotification, createVerificationCode, verifyCode } from '@/lib/db';
import { sendCodeEmail } from '@/lib/email';
import { useAuth } from '@/context/AuthContext';

interface Props {
  balance: number;
  onClose: () => void;
  onSuccess: () => void;
}

const NETWORKS: Record<string, string[]> = {
  USDT: ['TRC-20 (Tron)', 'ERC-20 (Ethereum)', 'BEP-20 (BSC)'],
  BTC:  ['Bitcoin (BTC)'],
  ETH:  ['ERC-20 (Ethereum)'],
  SOL:  ['Solana (SOL)'],
  BNB:  ['BEP-20 (BSC)'],
};
const CURRENCIES = Object.keys(NETWORKS);

type Step = 'form' | 'verify' | 'done';

export default function WithdrawModal({ balance, onClose, onSuccess }: Props) {
  const { user, refreshUser } = useAuth();
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
      setTimeout(() => { onSuccess(); onClose(); }, 2500);
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

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-brand-card border border-brand-border rounded-xl w-full max-w-md shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-brand-border">
          <div className="flex items-center space-x-2">
            <ArrowUpRight className="w-5 h-5 text-brand-danger" />
            <h2 className="font-semibold text-white">
              {step === 'form' ? 'Request Withdrawal' : step === 'verify' ? 'Confirm Withdrawal' : 'Withdrawal Submitted'}
            </h2>
          </div>
          <button onClick={onClose} className="text-brand-textMuted hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── Done ── */}
        {step === 'done' && (
          <div className="px-6 py-12 text-center">
            <div className="w-14 h-14 bg-brand-success/10 border border-brand-success/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-7 h-7 text-brand-success" />
            </div>
            <h3 className="font-semibold text-white text-lg mb-1">Request Submitted</h3>
            <p className="text-brand-textMuted text-sm">Your withdrawal is under review. We'll notify you once it's processed.</p>
          </div>
        )}

        {/* ── OTP Verify ── */}
        {step === 'verify' && (
          <div className="px-6 py-6 space-y-5">
            <div className="text-center">
              <div className="w-12 h-12 bg-brand-success/10 border border-brand-success/30 rounded-full flex items-center justify-center mx-auto mb-3">
                <ShieldCheck className="w-6 h-6 text-brand-success" />
              </div>
              <p className="text-sm text-brand-textMuted">
                {emailSent
                  ? <>Code sent to <span className="text-white font-medium">{user?.email}</span></>
                  : <>For security, withdrawal codes are never auto-emailed. Contact admin to receive your authorization code.</>
                }
              </p>
              {!emailSent && (
                <div className="mt-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg px-3 py-2 text-xs text-yellow-400">
                  Admin will provide your withdrawal code manually
                </div>
              )}
            </div>

            {/* Summary */}
            <div className="bg-brand-bg border border-brand-border rounded-lg p-4 space-y-2 text-sm">
              {[
                ['Amount', `$${parseFloat(amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}`],
                ['Currency', currency],
                ['Network', network],
                ['Wallet', walletAddress.length > 20 ? walletAddress.slice(0, 10) + '...' + walletAddress.slice(-10) : walletAddress],
              ].map(([label, val]) => (
                <div key={label} className="flex justify-between">
                  <span className="text-brand-textMuted">{label}</span>
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
                  onChange={e => { setOtp(e.target.value.replace(/\D/g, '')); setError(''); }}
                  placeholder="000000"
                  className="w-full bg-brand-bg border border-brand-border rounded-lg px-4 py-3 text-white text-center text-2xl font-mono tracking-[0.5em] focus:outline-none focus:border-brand-success transition-colors placeholder-brand-textMuted/40"
                  autoFocus
                />
              </div>

              {error && (
                <div className="bg-brand-danger/10 border border-brand-danger/30 rounded-lg px-4 py-2.5 text-brand-danger text-sm">{error}</div>
              )}

              <div className="flex space-x-3">
                <button type="button" onClick={() => { setStep('form'); setOtp(''); setError(''); }}
                  className="flex-1 border border-brand-border text-brand-textMuted py-2.5 rounded-lg hover:text-white transition-colors text-sm">
                  Back
                </button>
                <button type="submit" disabled={loading || otp.length < 6}
                  className="flex-1 bg-brand-danger hover:bg-red-600 disabled:opacity-50 text-white font-bold py-2.5 rounded-lg flex items-center justify-center space-x-2 transition-colors text-sm">
                  {loading
                    ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    : <><ShieldCheck className="w-4 h-4" /><span>Confirm Withdrawal</span></>
                  }
                </button>
              </div>

              <div className="text-center">
                <button type="button" onClick={handleResend} disabled={resending}
                  className="flex items-center space-x-1 text-xs text-brand-success hover:underline disabled:opacity-50 transition-colors mx-auto">
                  {resending ? <RefreshCw className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                  <span>Resend code</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ── Withdrawal Form ── */}
        {step === 'form' && (
          <form onSubmit={handleFormSubmit} className="px-6 py-5 space-y-4">
            <div className="flex items-center justify-between bg-brand-bg border border-brand-border rounded-lg px-4 py-3">
              <span className="text-xs text-brand-textMuted uppercase tracking-wider">Available Balance</span>
              <span className="font-mono font-bold text-white text-sm">${balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>

            <div>
              <label className="block text-xs text-brand-textMuted uppercase tracking-wider mb-1.5">Amount (USD) *</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-textMuted text-sm font-mono">$</span>
                <input type="number" step="any" min="1" value={amount}
                  onChange={e => { setAmount(e.target.value); setError(''); }}
                  placeholder="0.00"
                  className="w-full bg-brand-bg border border-brand-border rounded-lg pl-7 pr-20 py-2.5 text-white text-sm font-mono focus:outline-none focus:border-brand-success transition-colors" />
                <button type="button" onClick={() => setAmount(String(balance))}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-brand-success border border-brand-success/30 px-2 py-0.5 rounded hover:bg-brand-success/10 transition-colors font-semibold">
                  MAX
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-brand-textMuted uppercase tracking-wider mb-1.5">Currency *</label>
                <select value={currency} onChange={e => handleCurrencyChange(e.target.value)}
                  className="w-full bg-brand-bg border border-brand-border rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-brand-success transition-colors">
                  {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-brand-textMuted uppercase tracking-wider mb-1.5">Network *</label>
                <select value={network} onChange={e => setNetwork(e.target.value)}
                  className="w-full bg-brand-bg border border-brand-border rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-brand-success transition-colors">
                  {NETWORKS[currency].map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs text-brand-textMuted uppercase tracking-wider mb-1.5">Your Wallet Address *</label>
              <input type="text" value={walletAddress}
                onChange={e => { setWalletAddress(e.target.value); setError(''); }}
                placeholder="e.g. TRx... / 0x... / bc1..."
                className="w-full bg-brand-bg border border-brand-border rounded-lg px-3 py-2.5 text-white text-sm font-mono focus:outline-none focus:border-brand-success transition-colors placeholder-brand-textMuted" />
            </div>

            <div className="flex items-start space-x-2 bg-yellow-500/5 border border-yellow-500/20 rounded-lg px-3 py-2.5">
              <AlertTriangle className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-yellow-400/80 leading-relaxed">
                A verification code will be required to confirm this withdrawal. Reviewed within 24 hours.
              </p>
            </div>

            {error && (
              <div className="bg-brand-danger/10 border border-brand-danger/30 rounded-lg px-4 py-2.5 text-brand-danger text-sm">{error}</div>
            )}

            <div className="flex space-x-3 pt-1">
              <button type="button" onClick={onClose}
                className="flex-1 border border-brand-border text-brand-textMuted py-2.5 rounded-lg hover:text-white transition-colors text-sm">
                Cancel
              </button>
              <button type="submit" disabled={loading}
                className="flex-1 bg-brand-danger hover:bg-red-600 disabled:opacity-50 text-white font-bold py-2.5 rounded-lg flex items-center justify-center space-x-2 transition-colors text-sm">
                {loading
                  ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  : <><ShieldCheck className="w-4 h-4" /><span>Send Verification Code</span></>
                }
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
