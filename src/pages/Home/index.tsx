import { useState, useMemo, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import {
  ArrowUpRight,
  ArrowDownRight,
  ChevronRight,
  Shield,
  Zap,
  TrendingUp,
  Layers,
  CheckCircle2,
  ArrowRight,
  Star,
  Quote,
  Lock,
  ShieldCheck,
  Eye,
  Server,
  KeyRound,
  UserCheck,
  ChevronDown,
  Sparkles,
  BarChart3,
  Globe2,
  Check,
  Coins,
  Building2,
} from 'lucide-react';

export default function HomePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState<'all' | 'stocks' | 'crypto' | 'commodities'>('all');
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const handleStartInvesting = () => {
    navigate(user ? '/dashboard' : '/login');
  };

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) { setSubscribed(true); setEmail(''); }
  };

  const toggleFaq = useCallback((i: number) => {
    setOpenFaq(prev => prev === i ? null : i);
  }, []);

  const mockAssets = useMemo(() => [
    { id: 'tsla', name: 'Tesla', ticker: 'TSLA', price: '$224.50', change: '+3.82%', isUp: true, category: 'stocks', logo: '🚗' },
    { id: 'btc', name: 'Bitcoin', ticker: 'BTC', price: '$71,250', change: '+2.41%', isUp: true, category: 'crypto', logo: '₿' },
    { id: 'gld', name: 'Gold', ticker: 'XAU', price: '$2,385', change: '-0.19%', isUp: false, category: 'commodities', logo: '✦' },
    { id: 'aapl', name: 'Apple', ticker: 'AAPL', price: '$198.20', change: '+1.15%', isUp: true, category: 'stocks', logo: '◆' },
    { id: 'eth', name: 'Ethereum', ticker: 'ETH', price: '$3,820', change: '-0.85%', isUp: false, category: 'crypto', logo: 'Ξ' },
  ], []);

  const filteredAssets = useMemo(
    () => activeCategory === 'all' ? mockAssets : mockAssets.filter(a => a.category === activeCategory),
    [activeCategory, mockAssets]
  );

  const renderSparkline = useCallback((isUp: boolean) => (
    <svg className="w-14 h-7" viewBox="0 0 100 30">
      <path d={isUp ? "M0,25 Q15,10 30,22 T60,8 T90,5 T100,10" : "M0,5 Q15,12 30,8 T60,24 T90,28 T100,26"}
        fill="none" stroke={isUp ? '#EF4444' : '#6b7280'} strokeWidth="2" strokeLinecap="round" />
    </svg>
  ), []);

  const stats = useMemo(() => [
    { val: '$4.2B+', label: 'Assets Under Management' },
    { val: '180+', label: 'Countries Supported' },
    { val: '99.97%', label: 'Uptime SLA' },
    { val: '<24h', label: 'Withdrawal Processing' },
  ], []);

  const features = useMemo(() => [
    { icon: Layers, color: 'text-brand-success', bg: 'bg-brand-success/8 border-brand-success/15', title: 'Multi-Asset Access', desc: 'Stocks, crypto, commodities, and indices — all in one terminal. No account juggling required.' },
    { icon: BarChart3, color: 'text-blue-400', bg: 'bg-blue-500/8 border-blue-500/15', title: 'Live Analytics', desc: 'Real-time equity curves, P&L tracking, and institutional-grade trade execution at your fingertips.' },
    { icon: Shield, color: 'text-brand-gold', bg: 'bg-brand-gold/8 border-brand-gold/15', title: 'Bank-Grade Security', desc: '256-bit SSL, cold storage vaults, two-factor authentication, and 24/7 threat monitoring.' },
    { icon: Zap, color: 'text-purple-400', bg: 'bg-purple-500/8 border-purple-500/15', title: 'Instant Funding', desc: 'Crypto deposits credited within hours. BTC, ETH, USDT — multiple networks supported.' },
  ], []);

  const securityPillars = useMemo(() => [
    { icon: ShieldCheck, title: '256-Bit SSL Encryption', desc: 'All data encrypted in transit and at rest using military-grade TLS 1.3 protocol.' },
    { icon: Server, title: 'Cold Storage Vaults', desc: '95% of digital assets stored in air-gapped cold wallets inaccessible to online threats.' },
    { icon: Eye, title: 'Two-Factor Authentication', desc: 'Every login and withdrawal is protected by time-based OTP and device fingerprinting.' },
    { icon: KeyRound, title: 'Withdrawal Verification', desc: 'Manual review on all withdrawals with email confirmation codes before processing.' },
    { icon: UserCheck, title: 'KYC Compliance', desc: 'Identity verification on all accounts ensures full regulatory compliance and fraud prevention.' },
    { icon: Globe2, title: 'Segregated Client Funds', desc: 'Your capital is held in fully segregated accounts, ring-fenced from company operations.' },
  ], []);

  const faqs = [
    { q: 'How do I deposit funds?', a: 'Navigate to your Dashboard → Deposit section. Select your preferred cryptocurrency (BTC, ETH, USDT ERC-20, USDT TRC-20, or SOL), scan or copy the wallet address, send your funds, and paste the transaction hash. Deposits are reviewed and credited within 24 hours. Minimum deposit is $500.' },
    { q: 'How long do withdrawals take?', a: 'Withdrawal requests are manually reviewed and processed within 24 hours of submission. You\'ll receive an email verification code to confirm the withdrawal before it\'s processed, ensuring security at every step.' },
    { q: 'What is the KYC requirement?', a: 'KYC (identity verification) is required to unlock full withdrawal access. You\'ll need to submit a government-issued ID and a selfie. The review process takes 1–2 business days. You can submit your KYC documents directly in the Dashboard under "Identity Verification".' },
    { q: 'What is the minimum deposit amount?', a: 'The minimum deposit is $500 USD equivalent in cryptocurrency. There is no maximum limit — institutional clients regularly fund accounts in the millions. Large deposits may require additional verification.' },
    { q: 'Are there any fees on profits?', a: 'Quantumspacex charges a 10% performance fee on profits only at the time of withdrawal. For example, if you deposited $10,000 and your account grew to $15,000, the $5,000 profit carries a $500 fee. Your original capital is always fee-free.' },
    { q: 'How is my account secured?', a: 'Every account is protected by email OTP login, withdrawal confirmation codes, KYC identity binding, and 24/7 fraud monitoring. We recommend enabling 2FA and never sharing your credentials. Our team will never ask for your password.' },
  ];

  const reviews = [
    { name: 'James Mitchell', role: 'Crypto Trader', initials: 'JM', stars: 5, gradient: 'from-brand-success to-red-700', text: '"My withdrawal was processed in under 8 hours — faster than any platform I\'ve used. The verification was smooth and the funds arrived without issues. Highly professional service."', verified: true, date: 'May 2026' },
    { name: 'Sarah Kim', role: 'Stock & Crypto Investor', initials: 'SK', stars: 5, gradient: 'from-blue-600 to-indigo-600', text: '"Six months in and I\'m genuinely impressed. The dashboard is clean, execution is fast, and support actually responds. The multi-asset capability is the killer feature for me."', verified: true, date: 'Apr 2026' },
    { name: 'Alex Rodriguez', role: 'Portfolio Manager', initials: 'AR', stars: 5, gradient: 'from-purple-600 to-pink-600', text: '"Managing diversified positions across stocks and crypto from a single account is a game-changer. The P&L tracking is accurate and the interface feels genuinely institutional."', verified: true, date: 'Apr 2026' },
    { name: 'Michael Chen', role: 'Day Trader', initials: 'MC', stars: 4, gradient: 'from-emerald-600 to-teal-600', text: '"Fast deposits, reliable execution, clean charts. Been using it for 3 months with zero downtime. My only wish is more technical indicators, but for what it does, it\'s solid."', verified: true, date: 'Mar 2026' },
    { name: 'Emily Watson', role: 'Long-term Investor', initials: 'EW', stars: 5, gradient: 'from-pink-600 to-rose-600', text: '"Finally, a platform where I can hold Tesla stock and Bitcoin in one account. Customer support helped me verify my account in under 24 hours. Withdrawals take a day max."', verified: true, date: 'Mar 2026' },
    { name: 'David Thompson', role: 'Commodities Trader', initials: 'DT', stars: 5, gradient: 'from-amber-600 to-orange-600', text: '"The gold and oil pricing is accurate and updates in real-time. I\'ve compared it with Bloomberg terminals — it\'s legit. Security is tight, which matters when you\'re moving serious capital."', verified: true, date: 'Feb 2026' },
  ];

  return (
    <div className="relative overflow-x-hidden bg-brand-bg text-white w-full max-w-full">
      {/* Ambient glows */}
      <div className="fixed top-0 left-1/3 w-[min(700px,100vw)] h-[min(700px,100vw)] bg-brand-primary/6 rounded-full blur-[160px] pointer-events-none glow-bg" style={{willChange:'transform',contain:'paint'}} />
      <div className="fixed top-1/2 right-0 w-[min(500px,80vw)] h-[min(500px,80vw)] bg-brand-accent/4 rounded-full blur-[140px] pointer-events-none glow-bg" style={{willChange:'transform',contain:'paint'}} />

      {/* ── HERO ── */}
      <section id="hero" className="relative pt-10 pb-16 md:pt-24 md:pb-28 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-center">

          {/* Text side */}
          <div className="lg:col-span-5 space-y-7">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-brand-success/8 border border-brand-success/20 rounded-full text-brand-success text-[11px] font-semibold uppercase tracking-widest">
              <span className="w-1.5 h-1.5 bg-brand-success rounded-full animate-pulse" />
              Multi-Asset Investment Platform
            </div>

            <h1 className="font-serif text-4xl sm:text-5xl lg:text-[56px] font-bold leading-[1.08] tracking-tight">
              Invest across<br />
              <span className="gradient-text">assets. Grow</span><br />
              without limits.
            </h1>

            <p className="text-base sm:text-lg text-brand-textMuted leading-relaxed max-w-md">
              One account. Stocks, crypto, commodities, and indices — funded by crypto with no friction. Institutional-grade tools, now accessible to everyone.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                onClick={handleStartInvesting}
                className="inline-flex items-center justify-center gap-2 bg-gradient-red hover:opacity-90 text-white font-bold px-6 py-3.5 rounded-xl transition-all shadow-glow-sm group active:scale-95 touch-manipulation">
                Start Investing
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </button>
              <Link to="/markets"
                className="inline-flex items-center justify-center gap-2 border border-brand-border hover:border-brand-borderLight bg-brand-card/50 hover:bg-brand-card text-white font-semibold px-6 py-3.5 rounded-xl transition-all active:scale-95 touch-manipulation">
                Explore Markets
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>

            {/* Trust bar */}
            <div className="pt-6 border-t border-brand-border/40">
              <p className="text-[10px] uppercase tracking-widest text-brand-textSubtle font-semibold mb-3">Trusted by investors worldwide</p>
              <div className="flex flex-wrap gap-x-5 gap-y-2 opacity-30 text-xs font-bold text-slate-400 tracking-wider">
                {['FORBES', 'BLOOMBERG', 'CNBC', 'REUTERS', 'NASDAQ'].map(b => <span key={b}>{b}</span>)}
              </div>
            </div>
          </div>

          {/* Widget side */}
          <div className="lg:col-span-7">
            <div className="relative bg-brand-card border border-brand-border rounded-2xl overflow-hidden shadow-card w-full min-w-0" style={{background:'linear-gradient(135deg, #110D1A 0%, #0D0B18 100%)'}}>
              {/* Inner glow */}
              <div className="absolute -top-16 -right-16 w-56 h-56 bg-brand-success/8 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-40 h-40 bg-brand-accent/5 rounded-full blur-2xl pointer-events-none" />

              <div className="relative p-5 sm:p-6">
                {/* Widget header */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-5 border-b border-brand-border mb-5 gap-3">
                  <div>
                    <p className="text-[10px] text-brand-textMuted uppercase tracking-widest font-semibold mb-1">Portfolio Value</p>
                    <div className="flex items-baseline gap-3 flex-wrap">
                      <span className="text-2xl sm:text-3xl font-mono font-bold tracking-tight num-display">$184,750.45</span>
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-brand-success/10 text-brand-success border border-brand-success/20 flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" />+2.45%
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] font-semibold text-green-400 bg-green-400/8 border border-green-400/15 px-2.5 py-1 rounded-full">
                    <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                    Live
                  </div>
                </div>

                {/* Chart */}
                <div className="h-36 w-full mb-5 relative">
                  <svg className="w-full h-full chart-glow-green" viewBox="0 0 500 120" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="heroGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#EF4444" stopOpacity="0.18" />
                        <stop offset="100%" stopColor="#EF4444" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <line x1="0" y1="25" x2="500" y2="25" stroke="#1E1830" strokeWidth="0.5" strokeDasharray="4,4" />
                    <line x1="0" y1="60" x2="500" y2="60" stroke="#1E1830" strokeWidth="0.5" strokeDasharray="4,4" />
                    <line x1="0" y1="95" x2="500" y2="95" stroke="#1E1830" strokeWidth="0.5" strokeDasharray="4,4" />
                    <path d="M 0,100 Q 50,85 100,92 T 200,60 T 300,75 T 400,32 T 500,20" fill="url(#heroGrad)" />
                    <path d="M 0,100 Q 50,85 100,92 T 200,60 T 300,75 T 400,32 T 500,20" fill="none" stroke="#EF4444" strokeWidth="2.5" strokeLinecap="round" />
                    <circle cx="500" cy="20" r="4" fill="#EF4444" />
                    <circle cx="500" cy="20" r="8" fill="#EF4444" className="animate-ping opacity-40" />
                  </svg>
                </div>

                {/* Asset filter */}
                <div className="flex gap-2 border-b border-brand-border pb-4 mb-4 overflow-x-auto scrollbar-hide">
                  {(['all', 'stocks', 'crypto', 'commodities'] as const).map(cat => (
                    <button key={cat} onClick={() => setActiveCategory(cat)}
                      className={`text-[11px] font-semibold capitalize whitespace-nowrap px-3 py-1 rounded-full transition-all ${activeCategory === cat ? 'bg-brand-success/10 text-brand-success border border-brand-success/20' : 'text-brand-textMuted hover:text-white border border-transparent'}`}>
                      {cat === 'all' ? 'All' : cat}
                    </button>
                  ))}
                </div>

                {/* Asset list */}
                <div className="space-y-2">
                  {filteredAssets.map(asset => (
                    <div key={asset.id} className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-brand-bg/60 border border-brand-border/40 hover:border-brand-border transition-all">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-base w-8 h-8 rounded-lg bg-brand-card border border-brand-border flex items-center justify-center font-bold text-brand-textMuted flex-shrink-0">
                          {asset.logo}
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-white">{asset.name}</p>
                          <p className="text-[10px] text-brand-textMuted font-mono uppercase">{asset.ticker}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <span className="hidden sm:block">{renderSparkline(asset.isUp)}</span>
                        <div className="text-right">
                          <p className="text-sm font-mono font-bold text-white num-display">{asset.price}</p>
                          <p className={`text-[11px] font-semibold flex items-center justify-end gap-0.5 ${asset.isUp ? 'text-brand-success' : 'text-brand-textMuted'}`}>
                            {asset.isUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                            {asset.change}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="pt-4 mt-2 border-t border-brand-border text-center">
                  <Link to="/dashboard" className="text-[11px] text-brand-success hover:text-red-400 font-bold inline-flex items-center gap-1 transition-colors">
                    Open trading terminal <ArrowUpRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── STATS TICKER ── */}
      <section id="stats" className="border-y border-brand-border bg-brand-card/20 py-5 overflow-hidden">
        <div className="flex gap-0 ticker-track w-max">
          {[...stats, ...stats].map((s, i) => (
            <div key={i} className="flex items-center gap-8 px-10 border-r border-brand-border/40 last:border-0 flex-shrink-0">
              <div>
                <p className="text-xl sm:text-2xl font-mono font-bold text-white num-display">{s.val}</p>
                <p className="text-[10px] text-brand-textMuted uppercase tracking-wider mt-0.5">{s.label}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="features" className="py-20 sm:py-28 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14 sm:mb-20">
            <p className="text-[11px] uppercase tracking-widest text-brand-success font-semibold mb-3">Why Quantumspacex</p>
            <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight mb-4">
              Everything you need to invest with confidence
            </h2>
            <p className="text-brand-textMuted leading-relaxed">
              We provide the tools, security, and liquidity to execute professional-grade portfolios — without institutional barriers.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {features.map(({ icon: Icon, color, bg, title, desc }) => (
              <div key={title} className="group bg-brand-card border border-brand-border hover:border-brand-borderLight rounded-2xl p-6 transition-all duration-300 card-hover shadow-inner-top">
                <div className={`w-12 h-12 ${bg} border rounded-xl flex items-center justify-center mb-5 group-hover:scale-105 transition-transform`}>
                  <Icon className={`w-5 h-5 ${color}`} />
                </div>
                <h3 className="text-base font-bold text-white mb-2">{title}</h3>
                <p className="text-sm text-brand-textMuted leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── INDUSTRIES WE COVER ── */}
      <section id="industries" className="py-20 sm:py-28 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <p className="text-[11px] uppercase tracking-widest text-brand-success font-semibold mb-3">Industries We Cover</p>
            <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight mb-4">
              Multi-sector market access
            </h2>
            <p className="text-brand-textMuted leading-relaxed">
              From high-growth tech to stable commodities — access the world's most liquid markets in one unified platform.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Technology */}
            <div className="group relative bg-brand-card border border-brand-border hover:border-blue-500/30 rounded-2xl p-7 transition-all duration-300 overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-2xl" />
              <div className="relative">
                <div className="w-14 h-14 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-center justify-center mb-5 group-hover:scale-105 transition-transform">
                  <Sparkles className="w-7 h-7 text-blue-400" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Technology & Innovation</h3>
                <p className="text-sm text-brand-textMuted mb-5 leading-relaxed">
                  AI infrastructure, semiconductors, cloud computing, and SaaS leaders driving digital transformation.
                </p>
                <div className="space-y-2 mb-5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-brand-textMuted">Market Cap</span>
                    <span className="font-mono font-bold text-white">$12.8T</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-brand-textMuted">Avg. Growth (YoY)</span>
                    <span className="font-mono font-bold text-green-400">+24.5%</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-brand-textMuted">Top Assets</span>
                    <span className="font-mono font-bold text-white">NVDA, AAPL, MSFT</span>
                  </div>
                </div>
                <Link to="/markets" className="inline-flex items-center gap-1 text-sm text-blue-400 font-semibold hover:gap-2 transition-all">
                  Trade Tech <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>

            {/* Energy & Commodities */}
            <div className="group relative bg-brand-card border border-brand-border hover:border-amber-500/30 rounded-2xl p-7 transition-all duration-300 overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl" />
              <div className="relative">
                <div className="w-14 h-14 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center justify-center mb-5 group-hover:scale-105 transition-transform">
                  <Zap className="w-7 h-7 text-amber-400" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Energy & Commodities</h3>
                <p className="text-sm text-brand-textMuted mb-5 leading-relaxed">
                  Crude oil, natural gas, precious metals, and agricultural futures — core inflation hedges and industrial inputs.
                </p>
                <div className="space-y-2 mb-5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-brand-textMuted">Market Cap</span>
                    <span className="font-mono font-bold text-white">$18.2T</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-brand-textMuted">Volatility Index</span>
                    <span className="font-mono font-bold text-yellow-400">High</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-brand-textMuted">Top Assets</span>
                    <span className="font-mono font-bold text-white">Gold, Oil, Silver</span>
                  </div>
                </div>
                <Link to="/markets" className="inline-flex items-center gap-1 text-sm text-amber-400 font-semibold hover:gap-2 transition-all">
                  Trade Commodities <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>

            {/* Finance & Banking */}
            <div className="group relative bg-brand-card border border-brand-border hover:border-emerald-500/30 rounded-2xl p-7 transition-all duration-300 overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl" />
              <div className="relative">
                <div className="w-14 h-14 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-center mb-5 group-hover:scale-105 transition-transform">
                  <BarChart3 className="w-7 h-7 text-emerald-400" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Finance & Banking</h3>
                <p className="text-sm text-brand-textMuted mb-5 leading-relaxed">
                  Global banks, insurance giants, payment processors, and fintech disruptors reshaping capital markets.
                </p>
                <div className="space-y-2 mb-5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-brand-textMuted">Market Cap</span>
                    <span className="font-mono font-bold text-white">$9.4T</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-brand-textMuted">Dividend Yield</span>
                    <span className="font-mono font-bold text-green-400">~3.2%</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-brand-textMuted">Top Assets</span>
                    <span className="font-mono font-bold text-white">JPM, V, MA</span>
                  </div>
                </div>
                <Link to="/markets" className="inline-flex items-center gap-1 text-sm text-emerald-400 font-semibold hover:gap-2 transition-all">
                  Trade Financials <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>

            {/* Digital Assets */}
            <div className="group relative bg-brand-card border border-brand-border hover:border-purple-500/30 rounded-2xl p-7 transition-all duration-300 overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full blur-2xl" />
              <div className="relative">
                <div className="w-14 h-14 bg-purple-500/10 border border-purple-500/20 rounded-xl flex items-center justify-center mb-5 group-hover:scale-105 transition-transform">
                  <Coins className="w-7 h-7 text-purple-400" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Digital Assets (Crypto)</h3>
                <p className="text-sm text-brand-textMuted mb-5 leading-relaxed">
                  Bitcoin, Ethereum, Solana, and top-tier altcoins — the frontier of decentralized finance and digital scarcity.
                </p>
                <div className="space-y-2 mb-5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-brand-textMuted">Market Cap</span>
                    <span className="font-mono font-bold text-white">$2.1T</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-brand-textMuted">24h Volume</span>
                    <span className="font-mono font-bold text-green-400">$84.5B</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-brand-textMuted">Top Assets</span>
                    <span className="font-mono font-bold text-white">BTC, ETH, SOL</span>
                  </div>
                </div>
                <Link to="/markets" className="inline-flex items-center gap-1 text-sm text-purple-400 font-semibold hover:gap-2 transition-all">
                  Trade Crypto <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>

            {/* Real Estate */}
            <div className="group relative bg-brand-card border border-brand-border hover:border-cyan-500/30 rounded-2xl p-7 transition-all duration-300 overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-full blur-2xl" />
              <div className="relative">
                <div className="w-14 h-14 bg-cyan-500/10 border border-cyan-500/20 rounded-xl flex items-center justify-center mb-5 group-hover:scale-105 transition-transform">
                  <Building2 className="w-7 h-7 text-cyan-400" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Real Estate (REITs)</h3>
                <p className="text-sm text-brand-textMuted mb-5 leading-relaxed">
                  Commercial properties, data centers, logistics hubs, and residential portfolios generating passive income.
                </p>
                <div className="space-y-2 mb-5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-brand-textMuted">Market Cap</span>
                    <span className="font-mono font-bold text-white">$1.2T</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-brand-textMuted">Avg. Yield</span>
                    <span className="font-mono font-bold text-green-400">~4.1%</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-brand-textMuted">Top Assets</span>
                    <span className="font-mono font-bold text-white">PLD, AMT, EQIX</span>
                  </div>
                </div>
                <Link to="/markets" className="inline-flex items-center gap-1 text-sm text-cyan-400 font-semibold hover:gap-2 transition-all">
                  Trade REITs <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>

            {/* Fixed Income */}
            <div className="group relative bg-brand-card border border-brand-border hover:border-slate-400/30 rounded-2xl p-7 transition-all duration-300 overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-slate-500/5 rounded-full blur-2xl" />
              <div className="relative">
                <div className="w-14 h-14 bg-slate-500/10 border border-slate-500/20 rounded-xl flex items-center justify-center mb-5 group-hover:scale-105 transition-transform">
                  <Shield className="w-7 h-7 text-slate-400" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Fixed Income (Bonds & ETFs)</h3>
                <p className="text-sm text-brand-textMuted mb-5 leading-relaxed">
                  Treasury bonds, corporate debt, high-yield instruments, and diversified ETFs for capital preservation.
                </p>
                <div className="space-y-2 mb-5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-brand-textMuted">Market Cap</span>
                    <span className="font-mono font-bold text-white">$130T+</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-brand-textMuted">Risk Profile</span>
                    <span className="font-mono font-bold text-blue-400">Low-Moderate</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-brand-textMuted">Top Assets</span>
                    <span className="font-mono font-bold text-white">TLT, LQD, HYG</span>
                  </div>
                </div>
                <Link to="/markets" className="inline-flex items-center gap-1 text-sm text-slate-400 font-semibold hover:gap-2 transition-all">
                  Trade Bonds <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how-it-works" className="py-20 sm:py-28 bg-brand-card/20 border-y border-brand-border relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-success/3 via-transparent to-brand-accent/3 pointer-events-none" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">

            <div className="space-y-6">
              <p className="text-[11px] uppercase tracking-widest text-brand-success font-semibold">How It Works</p>
              <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight">
                From signup to<br />first trade in minutes
              </h2>
              <p className="text-brand-textMuted leading-relaxed max-w-lg">
                Quantumspacex is engineered for speed. Crypto-funded accounts, verified identities, and a clean interface — built for investors who act fast.
              </p>
              <div className="pt-2">
                <Link to="/dashboard"
                  className="inline-flex items-center gap-2 bg-white hover:bg-slate-100 text-brand-bg font-bold px-6 py-3.5 rounded-xl transition-colors group">
                  Open account now
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </Link>
              </div>
            </div>

            <div className="space-y-4">
              {[
                { n: '01', color: 'text-brand-success', border: 'border-brand-success/20 bg-brand-success/8', title: 'Create your profile', desc: 'Sign up in under 3 minutes. Enter your credentials and establish your multi-asset trading account instantly.' },
                { n: '02', color: 'text-blue-400', border: 'border-blue-500/20 bg-blue-500/8', title: 'Fund via cryptocurrency', desc: 'Send BTC, ETH, or USDT to your personal wallet address. Funds are credited within 24 hours after on-chain confirmation.' },
                { n: '03', color: 'text-brand-gold', border: 'border-brand-gold/20 bg-brand-gold/8', title: 'Deploy capital freely', desc: 'Execute trades across stocks, crypto, and commodities at institutional-grade pricing with zero friction.' },
              ].map(step => (
                <div key={step.n} className="flex gap-5 p-5 rounded-2xl border border-brand-border bg-brand-card/60 hover:border-brand-borderLight transition-all">
                  <div className={`w-10 h-10 rounded-xl border ${step.border} flex items-center justify-center font-mono font-bold text-sm ${step.color} flex-shrink-0`}>
                    {step.n}
                  </div>
                  <div>
                    <h3 className="font-bold text-white mb-1">{step.title}</h3>
                    <p className="text-sm text-brand-textMuted leading-relaxed">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── SECURITY ── */}
      <section id="security" className="py-20 sm:py-28 relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-brand-success/4 rounded-full blur-[120px] pointer-events-none" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">

          <div className="text-center max-w-2xl mx-auto mb-14 sm:mb-20">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-brand-success/8 border border-brand-success/20 rounded-full text-brand-success text-[11px] font-semibold uppercase tracking-widest mb-4">
              <Lock className="w-3.5 h-3.5" />Bank-Grade Protection
            </div>
            <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight mb-4">
              Your funds are fully<br /><span className="text-brand-success">locked & secured</span>
            </h2>
            <p className="text-brand-textMuted leading-relaxed">
              Institutional-level security protocols so you can invest with complete peace of mind — 24/7.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-12">
            {securityPillars.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="group bg-brand-card border border-brand-border rounded-2xl p-6 hover:border-brand-success/30 hover:shadow-glow-sm transition-all duration-300">
                <div className="flex items-start gap-4">
                  <div className="w-11 h-11 bg-brand-success/8 border border-brand-success/15 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                    <Icon className="w-5 h-5 text-brand-success" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white mb-1.5 text-sm">{title}</h3>
                    <p className="text-xs text-brand-textMuted leading-relaxed">{desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Live status bar */}
          <div className="bg-brand-card border border-brand-border rounded-2xl p-5 sm:p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-3 h-3 bg-green-400 rounded-full" />
                  <div className="absolute inset-0 w-3 h-3 bg-green-400 rounded-full animate-ping opacity-60" />
                </div>
                <span className="font-bold text-white">All Systems Operational</span>
              </div>
              <div className="flex flex-wrap gap-4 sm:gap-6 text-xs text-brand-textMuted">
                {[['99.97% Uptime', 'text-green-400'], ['0 Active Incidents', 'text-green-400'], ['24/7 Monitoring', 'text-brand-textMuted'], ['< 200ms Latency', 'text-green-400']].map(([t, c]) => (
                  <span key={t} className={`font-semibold ${c}`}>{t}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section id="testimonials" className="py-20 sm:py-28 bg-brand-card/20 border-y border-brand-border relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-12 sm:mb-16">
            <div>
              <p className="text-[11px] uppercase tracking-widest text-brand-success font-semibold mb-3">Investor Reviews</p>
              <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight">
                Trusted by thousands<br />of active investors
              </h2>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              <div className="flex">
                {[...Array(5)].map((_, i) => <Star key={i} className="w-4 h-4 fill-brand-gold text-brand-gold" />)}
              </div>
              <span className="font-mono font-bold text-white text-lg">4.7</span>
              <span className="text-brand-textMuted text-sm">(15,000+ reviews)</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {reviews.map(r => (
              <div key={r.name} className="group bg-brand-card border border-brand-border rounded-2xl p-6 hover:border-brand-success/20 hover:shadow-card-hover transition-all duration-300">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className={`w-3.5 h-3.5 ${i < r.stars ? 'fill-brand-gold text-brand-gold' : 'fill-transparent text-brand-textSubtle'}`} />
                    ))}
                  </div>
                  {r.verified && (
                    <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-500/10 border border-green-500/20">
                      <CheckCircle2 className="w-3 h-3 text-green-400" />
                      <span className="text-[9px] font-semibold text-green-400 uppercase tracking-wide">Verified</span>
                    </div>
                  )}
                </div>
                <Quote className="w-7 h-7 text-brand-success/20 mb-3" />
                <p className="text-sm text-brand-textMuted leading-relaxed italic mb-5">{r.text}</p>
                <div className="flex items-center justify-between pt-4 border-t border-brand-border/50">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${r.gradient} flex items-center justify-center text-white font-bold text-xs flex-shrink-0`}>
                      {r.initials}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">{r.name}</p>
                      <p className="text-[11px] text-brand-textMuted">{r.role}</p>
                    </div>
                  </div>
                  <span className="text-[10px] text-brand-textMuted font-mono">{r.date}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── INSIGHTS ── */}
      <section id="insights-preview" className="py-20 sm:py-28 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-12">
            <div>
              <p className="text-[11px] uppercase tracking-widest text-brand-success font-semibold mb-3">Market Intelligence</p>
              <h2 className="font-serif text-3xl sm:text-4xl font-bold">In-depth market insights</h2>
            </div>
            <Link to="/insights" className="inline-flex items-center gap-1 text-sm text-brand-textMuted hover:text-white font-semibold transition-colors">
              View all articles <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              { img: 'https://cdn.wegic.ai/assets/onepage/agent/images/1780622624335_0.jpg?imageMogr2/format/webp', tag: 'Market Update', title: 'May outlook: What global macro investors should watch', date: 'May 2026' },
              { img: 'https://cdn.wegic.ai/assets/onepage/agent/images/1780622624335_1.jpg?imageMogr2/format/webp', tag: 'Crypto', title: 'Bitcoin halving cycle and its effect on institutional positioning', date: 'Apr 2026' },
              { img: 'https://cdn.wegic.ai/assets/onepage/agent/images/1780622624335_2.jpg?imageMogr2/format/webp', tag: 'Commodities', title: 'Gold at all-time highs: Is the rally sustainable?', date: 'Apr 2026' },
              { img: 'https://cdn.wegic.ai/assets/onepage/agent/images/1780622624335_3.jpg?imageMogr2/format/webp', tag: 'Equities', title: 'Tech sector rebound: Nvidia and the AI infrastructure trade', date: 'Mar 2026' },
            ].map(a => (
              <Link key={a.title} to="/insights" className="group flex flex-col bg-brand-card border border-brand-border rounded-2xl overflow-hidden hover:border-brand-borderLight transition-all duration-300 card-hover">
                <div className="h-44 overflow-hidden relative flex-shrink-0">
                  <img src={a.img} alt={a.title} className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-500" loading="lazy" />
                  <span className="absolute bottom-3 left-3 bg-brand-bg/80 backdrop-blur px-2 py-0.5 rounded-full text-[10px] text-blue-400 font-semibold border border-brand-border/60">{a.tag}</span>
                </div>
                <div className="p-4 flex flex-col flex-grow">
                  <h3 className="text-sm font-semibold text-white group-hover:text-brand-success transition-colors line-clamp-2 mb-2 flex-grow">{a.title}</h3>
                  <p className="text-[10px] text-brand-textMuted font-mono">{a.date}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section id="faq" className="py-20 sm:py-28 bg-brand-card/20 border-y border-brand-border">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 sm:mb-16">
            <p className="text-[11px] uppercase tracking-widest text-brand-success font-semibold mb-3">FAQ</p>
            <h2 className="font-serif text-3xl sm:text-4xl font-bold">Common questions</h2>
          </div>

          <div className="space-y-2">
            {faqs.map((faq, i) => (
              <div key={i} className={`rounded-2xl border transition-all duration-200 overflow-hidden ${openFaq === i ? 'border-brand-success/30 bg-brand-card' : 'border-brand-border bg-brand-card/40 hover:border-brand-borderLight'}`}>
                <button onClick={() => toggleFaq(i)}
                  className="w-full flex items-center justify-between px-5 py-4 text-left gap-3">
                  <span className="font-semibold text-white text-sm sm:text-base">{faq.q}</span>
                  <ChevronDown className={`w-4 h-4 text-brand-textMuted flex-shrink-0 transition-transform duration-200 ${openFaq === i ? 'rotate-180 text-brand-success' : ''}`} />
                </button>
                {openFaq === i && (
                  <div className="px-5 pb-5">
                    <p className="text-sm text-brand-textMuted leading-relaxed">{faq.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section id="cta" className="py-20 sm:py-28 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-success/6 via-transparent to-brand-accent/4 pointer-events-none" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-brand-success/8 rounded-full blur-3xl pointer-events-none" />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-brand-success/8 border border-brand-success/20 rounded-full text-brand-success text-[11px] font-semibold uppercase tracking-widest mb-6">
            <Sparkles className="w-3.5 h-3.5" />
            Start Today
          </div>
          <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight mb-5">
            Ready to grow your<br />wealth without limits?
          </h2>
          <p className="text-brand-textMuted text-base leading-relaxed mb-8 max-w-xl mx-auto">
            Join 15,000+ investors already using Quantumspacex. Create your account in 3 minutes and start investing across the world's best assets.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-6">
            <Link to="/dashboard"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-gradient-red hover:opacity-90 text-white font-bold px-8 py-4 rounded-xl transition-all shadow-glow-sm group text-sm">
              Create Free Account
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
            <Link to="/markets"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 border border-brand-border hover:border-brand-borderLight bg-brand-card/50 text-white font-semibold px-8 py-4 rounded-xl transition-all text-sm">
              Browse Markets
            </Link>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-brand-textMuted">
            {['No trading fees', 'Crypto-funded', 'KYC protected', '24/7 support'].map(t => (
              <span key={t} className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-brand-success" />{t}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── NEWSLETTER ── */}
      <section id="newsletter" className="py-14 border-t border-brand-border bg-brand-card/10">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="font-serif text-xl sm:text-2xl font-bold mb-2">Stay ahead of the markets</h2>
          <p className="text-sm text-brand-textMuted mb-6">Get weekly market intelligence directly to your inbox.</p>
          {subscribed ? (
            <div className="inline-flex items-center gap-2 text-brand-success font-semibold text-sm">
              <CheckCircle2 className="w-5 h-5" />Subscribed successfully!
            </div>
          ) : (
            <form onSubmit={handleSubscribe} className="flex gap-2 max-w-md mx-auto">
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Enter your email" required
                className="flex-1 bg-brand-card border border-brand-border rounded-xl px-4 py-3 text-white text-sm placeholder-brand-textMuted focus:outline-none focus:border-brand-success transition-colors" />
              <button type="submit" className="bg-brand-success hover:bg-red-700 text-white font-bold px-5 py-3 rounded-xl text-sm transition-colors flex-shrink-0">
                Subscribe
              </button>
            </form>
          )}
        </div>
      </section>
    </div>
  );
}
