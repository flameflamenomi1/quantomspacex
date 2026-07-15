import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, 
  ArrowUpRight, 
  ArrowDownRight, 
  ArrowRight,
  Briefcase,
  Coins,
  Gem,
  Building2,
  BarChart3,
  TrendingUp,
} from 'lucide-react';

interface Asset {
  id: string;
  name: string;
  ticker: string;
  category: 'stocks' | 'crypto' | 'commodities' | 'real_estate' | 'bonds' | 'etfs';
  price: number;
  change: string;
  isUp: boolean;
  marketCap: string;
  volume24h: string;
  logo: string;
}

// Static asset catalog — defined outside component to avoid recreation on every render
const assetCatalog: Asset[] = [
    // Stocks
    { id: 'tsla', name: 'Tesla Inc.', ticker: 'TSLA', category: 'stocks', price: 224.50, change: '+3.82%', isUp: true, marketCap: '$712.4B', volume24h: '$12.5B', logo: '🚗' },
    { id: 'nvda', name: 'NVIDIA Corp.', ticker: 'NVDA', category: 'stocks', price: 952.12, change: '+1.48%', isUp: true, marketCap: '$2.38T', volume24h: '$24.1B', logo: '🟢' },
    { id: 'aapl', name: 'Apple Inc.', ticker: 'AAPL', category: 'stocks', price: 198.20, change: '+1.15%', isUp: true, marketCap: '$3.04T', volume24h: '$9.8B', logo: '🍎' },
    { id: 'msft', name: 'Microsoft Corp.', ticker: 'MSFT', category: 'stocks', price: 415.34, change: '+0.75%', isUp: true, marketCap: '$3.09T', volume24h: '$8.2B', logo: '💻' },
    { id: 'amzn', name: 'Amazon.com Inc.', ticker: 'AMZN', category: 'stocks', price: 181.25, change: '-0.45%', isUp: false, marketCap: '$1.88T', volume24h: '$7.4B', logo: '📦' },
    { id: 'googl', name: 'Alphabet Inc.', ticker: 'GOOGL', category: 'stocks', price: 175.40, change: '+0.25%', isUp: true, marketCap: '$2.18T', volume24h: '$6.2B', logo: '🔍' },
    // Crypto
    { id: 'btc', name: 'Bitcoin', ticker: 'BTC', category: 'crypto', price: 71250.00, change: '+2.41%', isUp: true, marketCap: '$1.40T', volume24h: '$32.8B', logo: '🪙' },
    { id: 'eth', name: 'Ethereum', ticker: 'ETH', category: 'crypto', price: 3820.40, change: '-0.85%', isUp: false, marketCap: '$458.5B', volume24h: '$18.2B', logo: '⟠' },
    { id: 'sol', name: 'Solana', ticker: 'SOL', category: 'crypto', price: 174.20, change: '+5.12%', isUp: true, marketCap: '$78.4B', volume24h: '$4.1B', logo: '☀️' },
    { id: 'bnb', name: 'Binance Coin', ticker: 'BNB', category: 'crypto', price: 595.00, change: '+0.12%', isUp: true, marketCap: '$87.5B', volume24h: '$1.8B', logo: '🔶' },
    { id: 'ada', name: 'Cardano', ticker: 'ADA', category: 'crypto', price: 0.48, change: '-1.10%', isUp: false, marketCap: '$17.1B', volume24h: '$410M', logo: '🔵' },
    // Commodities
    { id: 'gld', name: 'Gold Spot', ticker: 'XAU', category: 'commodities', price: 2385.60, change: '-0.19%', isUp: false, marketCap: '$15.8T', volume24h: '$2.4B', logo: '✨' },
    { id: 'uso', name: 'Crude Oil', ticker: 'USO', category: 'commodities', price: 78.36, change: '-0.35%', isUp: false, marketCap: '$2.1B', volume24h: '$840M', logo: '🛢️' },
    { id: 'xag', name: 'Silver Spot', ticker: 'XAG', category: 'commodities', price: 30.45, change: '+1.15%', isUp: true, marketCap: '$1.4T', volume24h: '$380M', logo: '⛓️' },
    { id: 'cop', name: 'Copper Spot', ticker: 'HG', category: 'commodities', price: 4.62, change: '-0.80%', isUp: false, marketCap: 'N/A', volume24h: '$120M', logo: '🧱' },
    { id: 'plat', name: 'Platinum Spot', ticker: 'XPT', category: 'commodities', price: 982.00, change: '+0.45%', isUp: true, marketCap: 'N/A', volume24h: '$95M', logo: '💿' },
    // Real Estate
    { id: 'pld', name: 'Prologis Inc.', ticker: 'PLD', category: 'real_estate', price: 118.40, change: '+1.22%', isUp: true, marketCap: '$112.3B', volume24h: '$580M', logo: '🏭' },
    { id: 'amt', name: 'American Tower', ticker: 'AMT', category: 'real_estate', price: 212.80, change: '-0.38%', isUp: false, marketCap: '$99.4B', volume24h: '$420M', logo: '📡' },
    { id: 'eqix', name: 'Equinix Inc.', ticker: 'EQIX', category: 'real_estate', price: 835.60, change: '+0.91%', isUp: true, marketCap: '$71.8B', volume24h: '$310M', logo: '🏢' },
    { id: 'spg', name: 'Simon Property Group', ticker: 'SPG', category: 'real_estate', price: 154.20, change: '+0.65%', isUp: true, marketCap: '$50.2B', volume24h: '$290M', logo: '🛍️' },
    { id: 'o', name: 'Realty Income Corp.', ticker: 'O', category: 'real_estate', price: 56.80, change: '-0.20%', isUp: false, marketCap: '$37.8B', volume24h: '$210M', logo: '🏬' },
    // Bonds
    { id: 'tlt', name: 'US 20Y Treasury Bond', ticker: 'TLT', category: 'bonds', price: 92.45, change: '+0.32%', isUp: true, marketCap: '$14.5B', volume24h: '$1.2B', logo: '📋' },
    { id: 'ief', name: 'US 7-10Y Treasury', ticker: 'IEF', category: 'bonds', price: 95.80, change: '+0.18%', isUp: true, marketCap: '$28.1B', volume24h: '$890M', logo: '🏛️' },
    { id: 'hyg', name: 'High Yield Corp Bond', ticker: 'HYG', category: 'bonds', price: 76.30, change: '-0.12%', isUp: false, marketCap: '$14.2B', volume24h: '$640M', logo: '📈' },
    { id: 'lqd', name: 'Investment Grade Bond', ticker: 'LQD', category: 'bonds', price: 108.90, change: '+0.08%', isUp: true, marketCap: '$32.6B', volume24h: '$720M', logo: '🔐' },
    { id: 'bndx', name: 'Intl Bond Index', ticker: 'BNDX', category: 'bonds', price: 49.60, change: '-0.05%', isUp: false, marketCap: '$52.4B', volume24h: '$380M', logo: '🌐' },
    // ETFs
    { id: 'spy', name: 'S&P 500 ETF', ticker: 'SPY', category: 'etfs', price: 524.80, change: '+0.84%', isUp: true, marketCap: '$490.2B', volume24h: '$28.4B', logo: '📊' },
    { id: 'qqq', name: 'Nasdaq 100 ETF', ticker: 'QQQ', category: 'etfs', price: 448.60, change: '+1.12%', isUp: true, marketCap: '$247.8B', volume24h: '$18.6B', logo: '💡' },
    { id: 'voo', name: 'Vanguard S&P 500', ticker: 'VOO', category: 'etfs', price: 481.20, change: '+0.82%', isUp: true, marketCap: '$433.5B', volume24h: '$6.8B', logo: '🏦' },
    { id: 'gld2', name: 'SPDR Gold Shares', ticker: 'GLD', category: 'etfs', price: 218.40, change: '-0.14%', isUp: false, marketCap: '$57.8B', volume24h: '$1.4B', logo: '🥇' },
    { id: 'ark', name: 'ARK Innovation ETF', ticker: 'ARKK', category: 'etfs', price: 52.30, change: '+2.18%', isUp: true, marketCap: '$7.2B', volume24h: '$890M', logo: '🚀' },
];

export default function MarketsPage() {
  const [activeTab, setActiveTab] = useState<'all' | 'stocks' | 'crypto' | 'commodities' | 'real_estate' | 'bonds' | 'etfs'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  // Memoize filtering to avoid recalculation on every render
  const filteredAssets = useMemo(() => {
    return assetCatalog.filter(asset => {
      const matchesSearch = asset.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            asset.ticker.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesTab = activeTab === 'all' || asset.category === activeTab;
      return matchesSearch && matchesTab;
    });
  }, [searchQuery, activeTab]);

  const renderSparkline = (isUp: boolean) => (
    <svg className="w-24 h-10" viewBox="0 0 100 30" preserveAspectRatio="none">
      <path
        d={isUp ? "M0,25 Q15,10 30,22 T60,8 T90,5 T100,12" : "M0,5 Q15,12 30,8 T60,24 T90,28 T100,24"}
        fill="none"
        stroke={isUp ? "#10B981" : "#EF4444"}
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );

  return (
    <div className="min-h-screen bg-brand-bg text-white relative">
      {/* Glow Effects */}
      <div className="absolute top-10 left-10 w-[min(500px,80vw)] h-[min(500px,80vw)] bg-brand-success/5 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 relative z-10">
        
        {/* --- PAGE HEADER --- */}
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
          <span className="text-xs text-brand-success uppercase tracking-widest font-bold font-mono">Market Index Directory</span>
          <h1 className="font-serif text-4xl sm:text-5xl font-bold tracking-tight">Explore Multi-Asset Rates</h1>
          <p className="text-sm sm:text-base text-brand-textMuted leading-relaxed">
            Track real-time valuations across global equities, real estate, bonds, ETFs, commodities, and crypto. Click Trade on any asset to execute inside your dashboard.
          </p>
        </div>

        {/* --- CATEGORY QUICK STATS --- */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-12">
          <div className="bg-brand-card border border-brand-border p-5 rounded-lg flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs text-brand-textMuted font-mono uppercase font-semibold block">US Equities Cap</span>
              <h2 className="text-xl font-mono font-bold text-white">$45.8 Trillion</h2>
              <span className="text-xs text-brand-success font-semibold flex items-center space-x-0.5">
                <ArrowUpRight className="w-3.5 h-3.5" /><span>+1.24% index avg</span>
              </span>
            </div>
            <div className="w-10 h-10 rounded bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center">
              <Briefcase className="w-5 h-5" />
            </div>
          </div>
          <div className="bg-brand-card border border-brand-border p-5 rounded-lg flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs text-brand-textMuted font-mono uppercase font-semibold block">Crypto Global Cap</span>
              <h2 className="text-xl font-mono font-bold text-white">$2.54 Trillion</h2>
              <span className="text-xs text-brand-success font-semibold flex items-center space-x-0.5">
                <ArrowUpRight className="w-3.5 h-3.5" /><span>+3.15% market cap</span>
              </span>
            </div>
            <div className="w-10 h-10 rounded bg-brand-successMuted border border-brand-success/20 text-brand-success flex items-center justify-center">
              <Coins className="w-5 h-5" />
            </div>
          </div>
          <div className="bg-brand-card border border-brand-border p-5 rounded-lg flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs text-brand-textMuted font-mono uppercase font-semibold block">Global REIT Market</span>
              <h2 className="text-xl font-mono font-bold text-white">$1.7 Trillion</h2>
              <span className="text-xs text-brand-success font-semibold flex items-center space-x-0.5">
                <ArrowUpRight className="w-3.5 h-3.5" /><span>+0.88% avg return</span>
              </span>
            </div>
            <div className="w-10 h-10 rounded bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center">
              <Building2 className="w-5 h-5" />
            </div>
          </div>
          <div className="bg-brand-card border border-brand-border p-5 rounded-lg flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs text-brand-textMuted font-mono uppercase font-semibold block">Bond Market AUM</span>
              <h2 className="text-xl font-mono font-bold text-white">$130 Trillion</h2>
              <span className="text-xs text-brand-success font-semibold flex items-center space-x-0.5">
                <ArrowUpRight className="w-3.5 h-3.5" /><span>+0.24% yield avg</span>
              </span>
            </div>
            <div className="w-10 h-10 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <BarChart3 className="w-5 h-5" />
            </div>
          </div>
          <div className="bg-brand-card border border-brand-border p-5 rounded-lg flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs text-brand-textMuted font-mono uppercase font-semibold block">ETF Global AUM</span>
              <h2 className="text-xl font-mono font-bold text-white">$11.5 Trillion</h2>
              <span className="text-xs text-brand-success font-semibold flex items-center space-x-0.5">
                <ArrowUpRight className="w-3.5 h-3.5" /><span>+1.02% flow inflow</span>
              </span>
            </div>
            <div className="w-10 h-10 rounded bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="bg-brand-card border border-brand-border p-5 rounded-lg flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs text-brand-textMuted font-mono uppercase font-semibold block">Commodities Market</span>
              <h2 className="text-xl font-mono font-bold text-white">Bullish Cycle</h2>
              <span className="text-xs text-brand-danger font-semibold flex items-center space-x-0.5">
                <ArrowDownRight className="w-3.5 h-3.5" /><span>-0.12% spot avg</span>
              </span>
            </div>
            <div className="w-10 h-10 rounded bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 flex items-center justify-center">
              <Gem className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* --- FILTERS & SEARCH WORKSPACE --- */}
        <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center bg-brand-card border border-brand-border p-4 rounded-xl mb-8 gap-4">
          {/* Tabs Filter */}
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none flex-shrink-0">
            {([
              { key: 'all', label: 'All Assets' },
              { key: 'stocks', label: 'Stocks' },
              { key: 'crypto', label: 'Crypto' },
              { key: 'real_estate', label: 'Real Estate' },
              { key: 'bonds', label: 'Bonds' },
              { key: 'etfs', label: 'ETFs' },
              { key: 'commodities', label: 'Commodities' },
            ] as const).map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`px-3 py-2 rounded text-xs font-bold whitespace-nowrap transition-colors ${
                  activeTab === key
                    ? 'bg-brand-success text-white'
                    : 'text-brand-textMuted hover:text-white hover:bg-brand-bg/40'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Search bar */}
          <div className="relative w-full sm:w-80 flex-shrink-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-textMuted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search ticker, company or asset..."
              className="w-full bg-brand-bg border border-brand-border focus:border-brand-borderLight rounded px-4 py-2.5 pl-10 text-sm text-white outline-none"
            />
          </div>

        </div>

        {/* --- ASSET GRID / INDEX TABLE --- */}
        <div className="bg-brand-card border border-brand-border rounded-xl p-5 md:p-6 shadow-xl">
          {filteredAssets.length === 0 ? (
            <div className="text-center py-16 text-brand-textMuted">
              No financial assets found matching your criteria.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-brand-border/40 text-xs uppercase tracking-wider text-brand-textMuted font-mono">
                    <th className="pb-4 font-semibold">Asset Name</th>
                    <th className="pb-4 font-semibold text-right">Value (USDT)</th>
                    <th className="pb-4 font-semibold text-right">24h Shift</th>
                    <th className="pb-4 font-semibold text-center">Trend (Sparkline)</th>
                    <th className="pb-4 font-semibold text-right">Capitalization</th>
                    <th className="pb-4 font-semibold text-right">24h Trade Volume</th>
                    <th className="pb-4 font-semibold text-right">Execution</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-border/30 text-xs font-semibold">
                  {filteredAssets.map((asset) => (
                    <tr key={asset.id} className="hover:bg-brand-bg/20 transition-colors">
                      
                      {/* Name */}
                      <td className="py-4 flex items-center space-x-3">
                        <span className="text-2xl w-8 h-8 rounded bg-brand-bg border border-brand-border/60 flex items-center justify-center">
                          {asset.logo}
                        </span>
                        <div>
                          <span className="text-white font-bold block text-sm sm:text-base">{asset.name}</span>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[10px] text-brand-textMuted font-mono uppercase">{asset.ticker}</span>
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase ${
                              asset.category === 'stocks' ? 'bg-blue-500/15 text-blue-400' :
                              asset.category === 'crypto' ? 'bg-brand-success/15 text-brand-success' :
                              asset.category === 'real_estate' ? 'bg-purple-500/15 text-purple-400' :
                              asset.category === 'bonds' ? 'bg-emerald-500/15 text-emerald-400' :
                              asset.category === 'etfs' ? 'bg-cyan-500/15 text-cyan-400' :
                              'bg-yellow-500/15 text-yellow-400'
                            }`}>
                              {asset.category === 'real_estate' ? 'REIT' : asset.category.toUpperCase()}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Price */}
                      <td className="py-4 text-right font-mono text-white text-sm sm:text-base">
                        ${asset.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>

                      {/* Change */}
                      <td className={`py-4 text-right font-mono ${asset.isUp ? 'text-brand-success' : 'text-brand-danger'}`}>
                        <span className="inline-flex items-center space-x-0.5">
                          {asset.isUp ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                          <span>{asset.change}</span>
                        </span>
                      </td>

                      {/* Sparkline curve */}
                      <td className="py-4 text-center">
                        <div className="inline-block">
                          {renderSparkline(asset.isUp)}
                        </div>
                      </td>

                      {/* Market Cap */}
                      <td className="py-4 text-right font-mono text-brand-textMuted">
                        {asset.marketCap}
                      </td>

                      {/* Volume */}
                      <td className="py-4 text-right font-mono text-brand-textMuted">
                        {asset.volume24h}
                      </td>

                      {/* Action */}
                      <td className="py-4 text-right">
                        <button
                          onClick={() => navigate('/dashboard')}
                          className="inline-flex items-center space-x-1 bg-brand-success hover:bg-red-700 text-brand-bg px-3.5 py-1.5 rounded text-xs font-bold transition-all duration-150"
                        >
                          <span>Trade</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </td>

                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
