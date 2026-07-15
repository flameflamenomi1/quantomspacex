import { useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Eye, EyeOff, ArrowRight, Lock, Mail, User, Phone, Globe, ShieldCheck, RefreshCw, CheckCircle, XCircle, Ban } from 'lucide-react';
import { createVerificationCode, verifyCode, getUserByEmail, resetPassword, type User as DbUser } from '@/lib/db';
import { sendCodeEmail } from '@/lib/email';

type Mode = 'login' | 'register' | 'forgot';
type Step = 'credentials' | 'verify' | 'reset';
type VerifyReason = 'login' | 'register' | 'password_reset';

const COUNTRIES = [
  'United States', 'United Kingdom', 'Canada', 'Australia', 'Germany',
  'France', 'Japan', 'Singapore', 'UAE', 'South Africa', 'Nigeria', 'India', 'Brazil', 'Other'
];

// Password strength rules
const PASSWORD_RULES = [
  { id: 'length',    label: 'At least 8 characters',       test: (p: string) => p.length >= 8 },
  { id: 'upper',     label: 'One uppercase letter (A–Z)',   test: (p: string) => /[A-Z]/.test(p) },
  { id: 'lower',     label: 'One lowercase letter (a–z)',   test: (p: string) => /[a-z]/.test(p) },
  { id: 'number',    label: 'One number (0–9)',             test: (p: string) => /[0-9]/.test(p) },
  { id: 'special',   label: 'One special character (!@#$)', test: (p: string) => /[^A-Za-z0-9]/.test(p) },
];

function PasswordStrength({ password }: { password: string }) {
  const passed = PASSWORD_RULES.filter(r => r.test(password));
  const strength = passed.length;
  const strengthLabel = ['', 'Weak', 'Fair', 'Good', 'Strong', 'Very Strong'][strength];
  const strengthColor = ['', 'bg-red-500', 'bg-orange-400', 'bg-yellow-400', 'bg-green-400', 'bg-green-500'][strength];

  if (!password) return null;

  return (
    <div className="mt-3 space-y-2">
      {/* Strength bar */}
      <div className="flex items-center gap-2">
        <div className="flex gap-1 flex-1">
          {[1, 2, 3, 4, 5].map(i => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${i <= strength ? strengthColor : 'bg-brand-border'}`}
            />
          ))}
        </div>
        <span className={`text-xs font-semibold ${strength >= 4 ? 'text-green-400' : strength >= 2 ? 'text-yellow-400' : 'text-red-400'}`}>
          {strengthLabel}
        </span>
      </div>
      {/* Rules checklist */}
      <div className="grid grid-cols-1 gap-1">
        {PASSWORD_RULES.map(rule => {
          const ok = rule.test(password);
          return (
            <div key={rule.id} className="flex items-center gap-2">
              {ok
                ? <CheckCircle className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />
                : <XCircle className="w-3.5 h-3.5 text-brand-textMuted flex-shrink-0" />
              }
              <span className={`text-xs transition-colors ${ok ? 'text-green-400' : 'text-brand-textMuted'}`}>
                {rule.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function AuthPage() {
  const { checkCredentials, completeLogin, register } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState<Mode>('login');
  const [step, setStep] = useState<Step>('credentials');
  const [verifyReason, setVerifyReason] = useState<VerifyReason>('login');
  const [showPass, setShowPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState('');
  const [suspendedUser, setSuspendedUser] = useState<{ name: string; reason: string } | null>(null);
  const [pendingUser, setPendingUser] = useState<DbUser | null>(null);
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [form, setForm] = useState({
    full_name: '', email: '', password: '', phone: '', country: ''
  });

  // Check if new password meets all rules
  const passwordValid = useMemo(() => PASSWORD_RULES.every(r => r.test(newPassword)), [newPassword]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
    setError('');
    setSuspendedUser(null);
  };

  const sendCode = async (u: DbUser, reason: VerifyReason = 'login') => {
    const vc = await createVerificationCode(u.id, u.email, reason);
    await sendCodeEmail({ to_email: u.email, to_name: u.full_name, code: vc.code, type: reason });
  };

  const handleCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuspendedUser(null);
    try {
      if (mode === 'register') {
        if (!form.full_name || !form.email || !form.password) throw new Error('Please fill in all required fields.');
        const u = await register(form);
        setPendingUser(u);
        setVerifyReason('register');
        await sendCode(u, 'register');
        setStep('verify');
        return;
      }
      if (mode === 'forgot') {
        if (!form.email) throw new Error('Please enter your email address.');
        const u = await getUserByEmail(form.email);
        if (!u) throw new Error('No account found with this email.');
        setPendingUser(u);
        setVerifyReason('password_reset');
        await sendCode(u, 'password_reset');
        setStep('verify');
        return;
      }
      // Login
      const u = await checkCredentials(form.email, form.password);

      // Check suspended
      if (u.status === 'suspended') {
        setSuspendedUser({
          name: u.full_name,
          reason: u.admin_note || 'Your account has been suspended. Please contact support.'
        });
        setLoading(false);
        return;
      }

      // Admin — skip OTP
      if (u.role === 'admin') {
        completeLogin(u);
        navigate('/admin');
        return;
      }

      setPendingUser(u);
      setVerifyReason('login');
      await sendCode(u, 'login');
      setStep('verify');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Something went wrong.';
      // Surface suspension error from db.ts loginUser
      if (msg.toLowerCase().includes('suspended')) {
        setSuspendedUser({ name: '', reason: msg.replace('Your account has been suspended. ', '') });
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingUser) return;
    setLoading(true);
    setError('');
    try {
      const valid = await verifyCode(pendingUser.id, otp.trim(), verifyReason);
      if (!valid) throw new Error('Invalid or expired code. Please try again.');

      if (verifyReason === 'password_reset') {
        setStep('reset');
        setLoading(false);
        return;
      }

      completeLogin(pendingUser);
      navigate(pendingUser.role === 'admin' ? '/admin' : '/dashboard');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Verification failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingUser) return;
    if (!passwordValid) {
      setError('Please meet all password requirements before continuing.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await resetPassword(pendingUser.email, newPassword);
      alert('Password reset successful! Please log in with your new password.');
      setMode('login');
      setStep('credentials');
      setPendingUser(null);
      setForm({ full_name: '', email: '', password: '', phone: '', country: '' });
      setNewPassword('');
      setConfirmPassword('');
      setOtp('');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to reset password.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!pendingUser) return;
    setResending(true);
    setOtp('');
    setError('');
    await sendCode(pendingUser, verifyReason);
    setResending(false);
  };

  return (
    <div className="min-h-screen bg-brand-bg flex items-center justify-center px-4 py-20">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-brand-success/5 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center space-x-1 text-2xl font-serif font-bold">
            <span className="text-brand-success">Quantum</span>
            <span className="text-white">spacex</span>
          </Link>
          <p className="text-brand-textMuted text-sm mt-1">
            {step === 'reset' ? 'Create a new password' :
             step === 'verify' ? 'Enter verification code' :
             mode === 'login' ? 'Sign in to your account' :
             mode === 'register' ? 'Create your account' :
             'Reset your password'}
          </p>
        </div>

        <div className="bg-brand-card border border-brand-border rounded-2xl p-6 sm:p-8 shadow-xl">

          {/* ── SUSPENDED ACCOUNT BANNER ── */}
          {suspendedUser && (
            <div className="mb-6 bg-red-500/10 border border-red-500/30 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Ban className="w-5 h-5 text-red-400 flex-shrink-0" />
                <span className="text-red-400 font-bold text-sm">Account Suspended</span>
              </div>
              {suspendedUser.name && (
                <p className="text-white text-sm font-semibold mb-1">{suspendedUser.name}</p>
              )}
              <p className="text-red-300 text-sm leading-relaxed">{suspendedUser.reason}</p>
              <p className="text-brand-textMuted text-xs mt-3">
                If you believe this is a mistake, please contact support.
              </p>
            </div>
          )}

          {/* Mode tabs (login / register) */}
          {step === 'credentials' && mode !== 'forgot' && (
            <div className="flex rounded-lg bg-brand-bg border border-brand-border p-1 mb-6">
              {(['login', 'register'] as const).map(m => (
                <button
                  key={m}
                  onClick={() => { setMode(m); setError(''); setSuspendedUser(null); }}
                  className={`flex-1 py-2 rounded-md text-sm font-semibold transition-all touch-manipulation ${
                    mode === m ? 'bg-brand-success text-white shadow' : 'text-brand-textMuted hover:text-white'
                  }`}
                >
                  {m === 'login' ? 'Sign In' : 'Register'}
                </button>
              ))}
            </div>
          )}

          {/* ── CREDENTIALS STEP ── */}
          {step === 'credentials' && (
            <form onSubmit={handleCredentials} className="space-y-4">

              {mode === 'register' && (
                <div>
                  <label className="block text-xs text-brand-textMuted uppercase tracking-wider mb-1.5">Full Name *</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-textMuted" />
                    <input name="full_name" value={form.full_name} onChange={handleChange}
                      placeholder="John Doe" required
                      className="w-full bg-brand-bg border border-brand-border rounded-lg pl-10 pr-4 py-3 text-white text-sm placeholder-brand-textMuted focus:outline-none focus:border-brand-success transition-colors" />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs text-brand-textMuted uppercase tracking-wider mb-1.5">Email Address *</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-textMuted" />
                  <input name="email" type="email" value={form.email} onChange={handleChange}
                    placeholder="you@example.com" required
                    className="w-full bg-brand-bg border border-brand-border rounded-lg pl-10 pr-4 py-3 text-white text-sm placeholder-brand-textMuted focus:outline-none focus:border-brand-success transition-colors" />
                </div>
              </div>

              {mode !== 'forgot' && (
                <div>
                  <label className="block text-xs text-brand-textMuted uppercase tracking-wider mb-1.5">Password *</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-textMuted" />
                    <input name="password" type={showPass ? 'text' : 'password'} value={form.password} onChange={handleChange}
                      placeholder="••••••••" required
                      className="w-full bg-brand-bg border border-brand-border rounded-lg pl-10 pr-12 py-3 text-white text-sm placeholder-brand-textMuted focus:outline-none focus:border-brand-success transition-colors" />
                    <button type="button" onClick={() => setShowPass(!showPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-textMuted hover:text-white transition-colors touch-manipulation">
                      {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              {mode === 'register' && (
                <>
                  <div>
                    <label className="block text-xs text-brand-textMuted uppercase tracking-wider mb-1.5">Phone Number</label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-textMuted" />
                      <input name="phone" value={form.phone} onChange={handleChange}
                        placeholder="+1 555 000 0000"
                        className="w-full bg-brand-bg border border-brand-border rounded-lg pl-10 pr-4 py-3 text-white text-sm placeholder-brand-textMuted focus:outline-none focus:border-brand-success transition-colors" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-brand-textMuted uppercase tracking-wider mb-1.5">Country</label>
                    <div className="relative">
                      <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-textMuted" />
                      <select name="country" value={form.country} onChange={handleChange}
                        className="w-full bg-brand-bg border border-brand-border rounded-lg pl-10 pr-4 py-3 text-white text-sm focus:outline-none focus:border-brand-success transition-colors appearance-none">
                        <option value="">Select country</option>
                        {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                  </div>
                </>
              )}

              {error && (
                <div className="bg-brand-danger/10 border border-brand-danger/30 rounded-lg px-4 py-3 text-brand-danger text-sm">{error}</div>
              )}

              <button type="submit" disabled={loading || !!suspendedUser}
                className="w-full bg-brand-success hover:bg-red-700 disabled:opacity-50 text-white font-bold py-3 rounded-lg flex items-center justify-center space-x-2 transition-all touch-manipulation active:scale-95">
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : (
                  <>
                    <span>{mode === 'login' ? 'Sign In' : mode === 'register' ? 'Create Account' : 'Send Reset Code'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              {mode === 'login' && (
                <button type="button" onClick={() => { setMode('forgot'); setError(''); setSuspendedUser(null); }}
                  className="w-full text-center text-xs text-brand-success hover:underline mt-1 transition-colors touch-manipulation">
                  Forgot password?
                </button>
              )}

              {mode === 'forgot' && (
                <button type="button" onClick={() => { setMode('login'); setError(''); setSuspendedUser(null); }}
                  className="w-full text-center text-xs text-brand-textMuted hover:text-white mt-1 transition-colors touch-manipulation">
                  ← Back to Sign In
                </button>
              )}
            </form>
          )}

          {/* ── VERIFY STEP ── */}
          {step === 'verify' && (
            <form onSubmit={handleVerify} className="space-y-4">
              <div className="text-center mb-2">
                <div className="w-12 h-12 bg-brand-success/10 border border-brand-success/30 rounded-full flex items-center justify-center mx-auto mb-3">
                  <ShieldCheck className="w-6 h-6 text-brand-success" />
                </div>
                <p className="text-white text-sm font-semibold">Check your email</p>
                <p className="text-brand-textMuted text-xs mt-1">We sent a 6-digit code to <span className="text-white">{pendingUser?.email}</span></p>
              </div>

              <div>
                <label className="block text-xs text-brand-textMuted uppercase tracking-wider mb-1.5">Verification Code</label>
                <input
                  value={otp} onChange={e => { setOtp(e.target.value); setError(''); }}
                  placeholder="000000" maxLength={6}
                  className="w-full bg-brand-bg border border-brand-border rounded-lg px-4 py-3 text-white text-center text-xl font-mono tracking-widest placeholder-brand-textMuted focus:outline-none focus:border-brand-success transition-colors"
                  required inputMode="numeric"
                />
              </div>

              {error && (
                <div className="bg-brand-danger/10 border border-brand-danger/30 rounded-lg px-4 py-3 text-brand-danger text-sm">{error}</div>
              )}

              <button type="submit" disabled={loading || otp.length < 6}
                className="w-full bg-brand-success hover:bg-red-700 disabled:opacity-50 text-white font-bold py-3 rounded-lg flex items-center justify-center space-x-2 transition-all touch-manipulation active:scale-95">
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <><span>Verify Code</span><ArrowRight className="w-4 h-4" /></>}
              </button>

              <button type="button" onClick={handleResend} disabled={resending}
                className="w-full text-center text-xs text-brand-textMuted hover:text-white transition-colors touch-manipulation disabled:opacity-50">
                {resending ? 'Sending...' : "Didn't receive it? Resend code"}
              </button>
            </form>
          )}

          {/* ── RESET PASSWORD STEP ── */}
          {step === 'reset' && (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="text-center mb-2">
                <div className="w-12 h-12 bg-brand-success/10 border border-brand-success/30 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Lock className="w-6 h-6 text-brand-success" />
                </div>
                <p className="text-white text-sm font-semibold">Create a new password</p>
                <p className="text-brand-textMuted text-xs mt-1">Make it strong and unique</p>
              </div>

              {/* New password */}
              <div>
                <label className="block text-xs text-brand-textMuted uppercase tracking-wider mb-1.5">New Password *</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-textMuted" />
                  <input
                    type={showNewPass ? 'text' : 'password'}
                    value={newPassword}
                    onChange={e => { setNewPassword(e.target.value); setError(''); }}
                    placeholder="••••••••"
                    className="w-full bg-brand-bg border border-brand-border rounded-lg pl-10 pr-12 py-3 text-white text-sm placeholder-brand-textMuted focus:outline-none focus:border-brand-success transition-colors"
                    required
                  />
                  <button type="button" onClick={() => setShowNewPass(!showNewPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-textMuted hover:text-white transition-colors touch-manipulation">
                    {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {/* Live password strength */}
                <PasswordStrength password={newPassword} />
              </div>

              {/* Confirm password */}
              <div>
                <label className="block text-xs text-brand-textMuted uppercase tracking-wider mb-1.5">Confirm Password *</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-textMuted" />
                  <input
                    type={showConfirmPass ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={e => { setConfirmPassword(e.target.value); setError(''); }}
                    placeholder="••••••••"
                    className={`w-full bg-brand-bg border rounded-lg pl-10 pr-12 py-3 text-white text-sm placeholder-brand-textMuted focus:outline-none transition-colors ${
                      confirmPassword && confirmPassword !== newPassword
                        ? 'border-red-500 focus:border-red-500'
                        : confirmPassword && confirmPassword === newPassword
                          ? 'border-green-500 focus:border-green-500'
                          : 'border-brand-border focus:border-brand-success'
                    }`}
                    required
                  />
                  <button type="button" onClick={() => setShowConfirmPass(!showConfirmPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-textMuted hover:text-white transition-colors touch-manipulation">
                    {showConfirmPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {confirmPassword && confirmPassword !== newPassword && (
                  <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                    <XCircle className="w-3 h-3" /> Passwords do not match
                  </p>
                )}
                {confirmPassword && confirmPassword === newPassword && (
                  <p className="text-xs text-green-400 mt-1 flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" /> Passwords match
                  </p>
                )}
              </div>

              {error && (
                <div className="bg-brand-danger/10 border border-brand-danger/30 rounded-lg px-4 py-3 text-brand-danger text-sm">{error}</div>
              )}

              <button type="submit"
                disabled={loading || !passwordValid || newPassword !== confirmPassword}
                className="w-full bg-brand-success hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 rounded-lg flex items-center justify-center space-x-2 transition-all touch-manipulation active:scale-95">
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <><span>Set New Password</span><ArrowRight className="w-4 h-4" /></>}
              </button>
            </form>
          )}

          {mode === 'login' && step === 'credentials' && (
            <p className="text-center text-xs text-brand-textMuted mt-4 flex items-center justify-center space-x-1">
              <ShieldCheck className="w-3.5 h-3.5 text-brand-success" />
              <span>Protected by 2-step verification</span>
            </p>
          )}
        </div>

        <p className="text-center text-xs text-brand-textMuted mt-6">
          By continuing, you agree to our <span className="text-brand-success cursor-pointer hover:underline">Terms of Service</span> and <span className="text-brand-success cursor-pointer hover:underline">Privacy Policy</span>.
        </p>
        <p className="text-center text-xs text-brand-textMuted mt-2">
          Investment products involve risk. Past performance does not guarantee future results.
        </p>
      </div>
    </div>
  );
}
