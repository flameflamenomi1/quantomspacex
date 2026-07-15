import { Link } from 'react-router-dom';
import { Facebook, Twitter, Linkedin, Youtube, Mail, MessageCircle } from 'lucide-react';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-brand-bg border-t border-brand-border pt-16 pb-12 relative overflow-hidden">
      {/* Background radial glow */}
      <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-brand-success/5 rounded-full blur-[120px] pointer-events-none glow-bg"></div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-10 pb-12 border-b border-brand-border">
          {/* Brand Info Column */}
          <div className="lg:col-span-2 space-y-5">
            <Link to="/" className="flex items-center space-x-3 group">
              <img
                src="https://cdn.wegic.ai/assets/onepage/agent/images/1780622567384_0.png?imageMogr2/format/webp"
                alt="Quantumspacex Logo"
                className="w-8 h-8 object-contain"
              />
              <span className="font-serif text-lg md:text-xl font-bold tracking-tight text-white">
                <span className="text-brand-success">Quantum</span><span className="text-white font-sans font-medium">spacex</span>
              </span>
            </Link>
            <p className="text-sm text-brand-textMuted max-w-sm leading-relaxed">
              Quantumspacex is a leading-edge global investment platform offering frictionless access to US equities, cryptocurrencies, precious metals, and commodities—funded seamlessly via high-security crypto gateways.
            </p>
            <div className="flex space-x-4">
              <a href="#" className="p-2 bg-brand-card hover:bg-brand-cardLight border border-brand-border hover:border-brand-borderLight text-brand-textMuted hover:text-white rounded transition-all duration-200" aria-label="Facebook">
                <Facebook className="w-4 h-4" />
              </a>
              <a href="#" className="p-2 bg-brand-card hover:bg-brand-cardLight border border-brand-border hover:border-brand-borderLight text-brand-textMuted hover:text-white rounded transition-all duration-200" aria-label="Twitter">
                <Twitter className="w-4 h-4" />
              </a>
              <a href="#" className="p-2 bg-brand-card hover:bg-brand-cardLight border border-brand-border hover:border-brand-borderLight text-brand-textMuted hover:text-white rounded transition-all duration-200" aria-label="LinkedIn">
                <Linkedin className="w-4 h-4" />
              </a>
              <a href="#" className="p-2 bg-brand-card hover:bg-brand-cardLight border border-brand-border hover:border-brand-borderLight text-brand-textMuted hover:text-white rounded transition-all duration-200" aria-label="YouTube">
                <Youtube className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Quick Links Column 1: Invest */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-white mb-4">Invest</h3>
            <ul className="space-y-2.5">
              <li>
                <Link to="/markets?cat=stocks" className="text-sm text-brand-textMuted hover:text-white transition-colors">US Stocks (Tesla, Apple)</Link>
              </li>
              <li>
                <Link to="/markets?cat=crypto" className="text-sm text-brand-textMuted hover:text-white transition-colors">Crypto Markets (BTC, ETH)</Link>
              </li>
              <li>
                <Link to="/markets?cat=commodities" className="text-sm text-brand-textMuted hover:text-white transition-colors">Commodities (Gold, Crude Oil)</Link>
              </li>
              <li>
                <Link to="/markets?cat=etf" className="text-sm text-brand-textMuted hover:text-white transition-colors">ETFs & Indices</Link>
              </li>
            </ul>
          </div>

          {/* Quick Links Column 2: Dashboard */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-white mb-4">Platform</h3>
            <ul className="space-y-2.5">
              <li>
                <Link to="/dashboard" className="text-sm text-brand-textMuted hover:text-white transition-colors">Portfolio Overview</Link>
              </li>
              <li>
                <Link to="/dashboard" className="text-sm text-brand-textMuted hover:text-white transition-colors">Performance Charts</Link>
              </li>
              <li>
                <Link to="/dashboard" className="text-sm text-brand-textMuted hover:text-white transition-colors">Crypto Deposit Wallet</Link>
              </li>
              <li>
                <Link to="/dashboard" className="text-sm text-brand-textMuted hover:text-white transition-colors">Real-time Watchlist</Link>
              </li>
            </ul>
          </div>

          {/* Quick Links Column 3: Insights & Info */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-white mb-4">Insights & Legal</h3>
            <ul className="space-y-2.5">
              <li>
                <Link to="/insights" className="text-sm text-brand-textMuted hover:text-white transition-colors">Latest Market News</Link>
              </li>
              <li>
                <a href="#" className="text-sm text-brand-textMuted hover:text-white transition-colors">Terms of Service</a>
              </li>
              <li>
                <a href="#" className="text-sm text-brand-textMuted hover:text-white transition-colors">Privacy Policy</a>
              </li>
              <li>
                <a href="#" className="text-sm text-brand-textMuted hover:text-white transition-colors">Risk Disclosure</a>
              </li>
            </ul>
          </div>

          {/* Support Column */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-white mb-4">Support</h3>
            <ul className="space-y-2.5">
              <li>
                <button
                  onClick={() => window.dispatchEvent(new Event('open-chat-widget'))}
                  className="text-sm text-brand-textMuted hover:text-brand-success transition-colors flex items-center gap-2 group"
                >
                  <MessageCircle className="w-3.5 h-3.5 text-brand-success group-hover:scale-110 transition-transform" />
                  <span className="relative">
                    Live Chat
                    <span className="absolute -top-0.5 -right-2 w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                  </span>
                </button>
              </li>
              <li>
                <a 
                  href="mailto:quantumelontrades61@gmail.com?subject=Support Request - Quantumspacex"
                  className="text-sm text-brand-textMuted hover:text-white transition-colors flex items-center gap-2"
                >
                  <Mail className="w-3.5 h-3.5" />
                  Email Support
                </a>
              </li>
              <li>
                <Link to="/dashboard" className="text-sm text-brand-textMuted hover:text-white transition-colors">Help Center</Link>
              </li>
              <li>
                <Link to="/dashboard" className="text-sm text-brand-textMuted hover:text-white transition-colors">FAQ</Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Financial Regulatory Disclaimers & Compliance Notice */}
        <div className="pt-8 space-y-6">
          <div className="bg-brand-card/50 border border-brand-border/60 rounded p-5 text-[11px] text-brand-textMuted leading-relaxed">
            <span className="font-semibold text-white block mb-1">IMPORTANT RISK WARNING & REGULATORY DISCLOSURE:</span>
            Trading financial instruments, stocks, commodities, and especially digital currencies (cryptocurrencies) involves substantial risk of loss and is not suitable for every investor. The valuation of assets can fluctuate wildly, potentially leading to a total loss of deposited funds. Financial leverage, high-volatility events, and market liquidity shocks may multiply losses. 
            <br /><br />
            Quantumspacex operates solely as a portfolio simulation interface and educational demonstration gateway. Funding is processed via cryptocurrency nodes for virtual wallet creation and demonstration purposes. No real brokerage deposits are automatically insured under standard deposit protection schemes unless fully authorized by regulated brokerage partners. Ensure you seek independent financial, legal, and tax advice before engaging in trading systems.
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-xs text-brand-textMuted">
            <p>© {currentYear} Quantumspacex. All rights reserved. Built with pride for elite investors.</p>
            <div className="flex space-x-6 mt-3 sm:mt-0">
              <a href="#" className="hover:text-white transition-colors">SEC Filings</a>
              <a href="#" className="hover:text-white transition-colors">SIPC Protection</a>
              <Link to="/admin" className="hover:text-white transition-colors">Admin Portal</Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
