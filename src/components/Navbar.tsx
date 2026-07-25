import { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, ArrowUpRight, Wallet, TrendingUp, BookOpen, Settings, LogOut, ChevronDown, Bell, User, Mail, Lock, MessageCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Close mobile menu on route change
  useEffect(() => { setIsOpen(false); }, [location.pathname]);

  const isActive = (path: string) => location.pathname === path;

  const handleLogout = () => {
    logout();
    setDropdownOpen(false);
    navigate('/');
  };

  return (
    <header
      className={`fixed top-0 left-0 w-full z-50 transition-all duration-300 ${
        isScrolled
          ? 'bg-brand-bg/85 backdrop-blur-md border-b border-brand-border py-3'
          : 'bg-transparent border-b border-transparent py-5'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-3 group">
            <img
              src="https://cdn.wegic.ai/assets/onepage/agent/images/1780622567384_0.png?imageMogr2/format/webp"
              alt="Quantumspacex Logo"
              className="w-8 h-8 md:w-9 md:h-9 object-contain group-hover:rotate-12 transition-transform duration-300"
            />
            <div className="flex flex-col">
              <span className="font-serif text-lg md:text-xl font-bold tracking-tight text-white group-hover:text-blue-400 transition-colors">
                <span className="text-brand-success">Quantum</span><span className="text-white font-sans font-medium">spacex</span>
              </span>
              <span className="text-[9px] uppercase tracking-widest text-brand-textMuted -mt-1 font-sans">
                Multi-Asset Platform
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <Link to="/markets"
              className={`text-sm font-medium transition-colors hover:text-white flex items-center space-x-1 ${isActive('/markets') ? 'text-white font-semibold' : 'text-brand-textMuted'}`}>
              <TrendingUp className="w-4 h-4 text-brand-success" />
              <span>Markets</span>
            </Link>
            <Link to="/dashboard"
              className={`text-sm font-medium transition-colors hover:text-white flex items-center space-x-1 ${isActive('/dashboard') ? 'text-white font-semibold' : 'text-brand-textMuted'}`}>
              <Wallet className="w-4 h-4 text-blue-400" />
              <span>Dashboard</span>
            </Link>
            <Link to="/insights"
              className={`text-sm font-medium transition-colors hover:text-white flex items-center space-x-1 ${isActive('/insights') ? 'text-white font-semibold' : 'text-brand-textMuted'}`}>
              <BookOpen className="w-4 h-4 text-yellow-400" />
              <span>Insights</span>
            </Link>
          </nav>

          {/* Right side — auth-aware */}
          <div className="hidden md:flex items-center space-x-3">
            {user ? (
              /* Logged-in user avatar + dropdown */
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setDropdownOpen(o => !o)}
                  className="flex items-center space-x-2 bg-brand-card border border-brand-border hover:border-brand-success/40 rounded-lg px-3 py-2 transition-all group"
                >
                  <div className="w-7 h-7 bg-brand-success/15 border border-brand-success/30 rounded-full flex items-center justify-center">
                    <span className="text-brand-success text-xs font-bold">
                      {user.full_name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <span className="text-sm text-white font-medium max-w-[100px] truncate">{user.full_name.split(' ')[0]}</span>
                  <ChevronDown className={`w-3.5 h-3.5 text-brand-textMuted transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {dropdownOpen && (
                  <div className="absolute right-0 top-full mt-2 w-52 bg-brand-card border border-brand-border rounded-xl shadow-2xl overflow-hidden z-50">
                    <div className="px-4 py-3 border-b border-brand-border">
                      <div className="text-xs font-semibold text-white truncate">{user.full_name}</div>
                      <div className="text-[10px] text-brand-textMuted truncate mt-0.5">{user.email}</div>
                    </div>
                    <div className="p-1.5">
                      <Link to="/dashboard" onClick={() => setDropdownOpen(false)}
                        className="flex items-center space-x-2.5 px-3 py-2 rounded-lg text-sm text-brand-textMuted hover:text-white hover:bg-white/5 transition-colors">
                        <Wallet className="w-4 h-4" />
                        <span>Dashboard</span>
                      </Link>
                      <Link to="/investment-plans" onClick={() => setDropdownOpen(false)}
                        className="flex items-center space-x-2.5 px-3 py-2 rounded-lg text-sm text-brand-textMuted hover:text-white hover:bg-white/5 transition-colors">
                        <Lock className="w-4 h-4" />
                        <span>Investment Plans</span>
                      </Link>
                      <Link to="/settings" onClick={() => setDropdownOpen(false)}
                        className="flex items-center space-x-2.5 px-3 py-2 rounded-lg text-sm text-brand-textMuted hover:text-white hover:bg-white/5 transition-colors">
                        <Settings className="w-4 h-4" />
                        <span>Settings</span>
                      </Link>
                      <button
                        onClick={() => {
                          setDropdownOpen(false);
                          window.dispatchEvent(new Event('open-chat-widget'));
                        }}
                        className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-lg text-sm text-brand-textMuted hover:text-white hover:bg-white/5 transition-colors"
                      >
                        <div className="relative">
                          <MessageCircle className="w-4 h-4 text-brand-success" />
                          <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-green-400 rounded-full" />
                        </div>
                        <span>Live Chat</span>
                      </button>
                    </div>
                    <div className="p-1.5 border-t border-brand-border">
                      <button onClick={handleLogout}
                        className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-lg text-sm text-brand-textMuted hover:text-brand-danger hover:bg-brand-danger/5 transition-colors">
                        <LogOut className="w-4 h-4" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Guest */
              <>
                <Link to="/login" className="text-sm font-medium text-brand-textMuted hover:text-white transition-colors">
                  Log in
                </Link>
                <Link to="/login"
                  className="inline-flex items-center space-x-1 bg-brand-success hover:bg-red-700 text-brand-bg px-4 py-2 rounded font-semibold text-sm transition-all duration-200 shadow-lg shadow-red-950/20">
                  <span>Get started</span>
                  <ArrowUpRight className="w-4 h-4" />
                </Link>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center space-x-2">
            {user && (
              <div className="w-8 h-8 bg-brand-success/15 border border-brand-success/30 rounded-full flex items-center justify-center">
                <span className="text-brand-success text-xs font-bold">{user.full_name.charAt(0).toUpperCase()}</span>
              </div>
            )}
            <button onClick={() => setIsOpen(!isOpen)}
              className="inline-flex items-center justify-center p-2 rounded text-brand-textMuted hover:text-white hover:bg-brand-card focus:outline-none">
              {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden absolute top-full left-0 w-full bg-brand-bg border-b border-brand-border shadow-2xl z-50">
          <div className="px-4 py-3">
            {user && (
              <div className="flex items-center gap-3 py-3 mb-1 border-b border-brand-border/40">
                <div className="w-10 h-10 bg-brand-success/15 border border-brand-success/30 rounded-full flex items-center justify-center flex-shrink-0">
                  {user.profile_photo
                    ? <img src={user.profile_photo} alt={user.full_name} className="w-full h-full rounded-full object-cover" />
                    : <span className="text-brand-success font-bold">{user.full_name.charAt(0).toUpperCase()}</span>
                  }
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-white truncate">{user.full_name}</div>
                  <div className="text-xs text-brand-textMuted truncate">{user.email}</div>
                </div>
              </div>
            )}

            {/* Nav items in correct order */}
            <nav className="space-y-0.5 py-2">
              {[
                { to: '/dashboard', icon: Wallet, label: 'Dashboard', color: 'text-blue-400' },
                { to: '/investment-plans', icon: Lock, label: 'Investment Plans', color: 'text-violet-400' },
                { to: '/markets', icon: TrendingUp, label: 'Markets', color: 'text-green-400' },
                { to: '/settings', icon: User, label: 'Personal Info & Settings', color: 'text-purple-400' },
                { to: '/insights', icon: BookOpen, label: 'Insights', color: 'text-yellow-400' },
                { to: '/notifications', icon: Bell, label: 'Notifications', color: 'text-orange-400' },
              ].map(({ to, icon: Icon, label, color }) => (
                <Link key={to} to={to} onClick={() => setIsOpen(false)}
                  className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-colors ${isActive(to) ? 'bg-brand-card text-white' : 'text-brand-textMuted hover:text-white hover:bg-brand-card/50'}`}>
                  <Icon className={`w-5 h-5 ${color}`} />
                  <span className="text-sm font-medium">{label}</span>
                </Link>
              ))}

              {/* Customer Care */}
              <div className="px-3 py-1">
                <p className="text-[10px] text-brand-textMuted uppercase tracking-wider font-semibold mb-2">Customer Care</p>
                <div className="space-y-1">
                  <button
                    onClick={() => {
                      setIsOpen(false);
                      window.dispatchEvent(new Event('open-chat-widget'));
                    }}
                    className="w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-colors text-brand-textMuted hover:text-white hover:bg-brand-card/50"
                  >
                    <div className="relative">
                      <MessageCircle className="w-5 h-5 text-brand-success" />
                      <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-green-400 rounded-full" />
                    </div>
                    <div className="text-left">
                      <span className="text-sm font-medium block">Live Chat</span>
                      <span className="text-[10px] text-brand-textMuted">Chat with our support team</span>
                    </div>
                  </button>
                  <a
                    href="mailto:support@quantumspacex.com?subject=Support Request - Quantumspacex"
                    className="flex items-center gap-3 px-3 py-3 rounded-xl transition-colors text-brand-textMuted hover:text-white hover:bg-brand-card/50"
                  >
                    <Mail className="w-5 h-5 text-blue-400" />
                    <div className="text-left">
                      <span className="text-sm font-medium block">Email Support</span>
                      <span className="text-[10px] text-brand-textMuted">support@quantumspacex.com</span>
                    </div>
                  </a>
                </div>
              </div>
            </nav>

            {user ? (
              <div className="pt-2 border-t border-brand-border/40 mt-1">
                <button onClick={() => { handleLogout(); setIsOpen(false); }}
                  className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-brand-danger hover:bg-brand-danger/10 transition-colors">
                  <LogOut className="w-5 h-5" />
                  <span className="text-sm font-medium">Sign Out</span>
                </button>
              </div>
            ) : (
              <div className="pt-3 border-t border-brand-border/40 flex flex-col gap-2">
                <Link to="/login" onClick={() => setIsOpen(false)}
                  className="w-full text-center py-2.5 rounded-xl border border-brand-border text-brand-textMuted font-medium hover:text-white">
                  Log in
                </Link>
                <Link to="/login" onClick={() => setIsOpen(false)}
                  className="w-full text-center py-2.5 rounded-xl bg-brand-success text-brand-bg font-bold flex items-center justify-center gap-1">
                  <span>Get started</span><ArrowUpRight className="w-5 h-5" />
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}