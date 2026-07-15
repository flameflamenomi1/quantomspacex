import { useState } from 'react';
import { 
  BookOpen, 
  Calendar, 
  Clock, 
  ChevronRight, 
  User, 
  Bookmark,
  Share2,
  X
} from 'lucide-react';

interface Article {
  id: string;
  category: 'forecast' | 'stocks' | 'crypto' | 'metals';
  categoryLabel: string;
  title: string;
  summary: string;
  content: string[];
  imageUrl: string;
  date: string;
  author: string;
  readTime: string;
}

export default function InsightsPage() {
  const [activeFilter, setActiveFilter] = useState<'all' | 'forecast' | 'stocks' | 'crypto' | 'metals'>('all');
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);

  // Elite financial briefings utilizing the pre-generated visual urls
  const articles: Article[] = [
    {
      id: 'art_1',
      category: 'forecast',
      categoryLabel: 'Market Update',
      title: 'May market outlook: What global macro investors should watch',
      summary: 'Analyzing structural shifts in central bank rate cut cycles, cooling metrics in CPI schedules, and the impact of sovereign debt issuances on equity valuation benchmarks.',
      imageUrl: 'https://cdn.wegic.ai/assets/onepage/agent/images/1780622624335_0.jpg?imageMogr2/format/webp',
      date: 'May 20, 2026',
      author: 'Jonathan Sterling, Senior Analyst',
      readTime: '5 min read',
      content: [
        'The macroeconomic landscape is currently entering a sensitive pivot window. As core PCE indicators stabilize closer to standard mandate targets, global monetary policies are adjusting risk premiums, directly impacting valuation models for growth equities and digital commodities alike.',
        'Furthermore, sovereign yield trajectories indicate a compressing curve that historical databases show precedes risk-asset stabilization. In this briefing, we outline key allocation models to secure capital and maximize yield margins across modern sectors.'
      ]
    },
    {
      id: 'art_2',
      category: 'stocks',
      categoryLabel: 'Stock Analysis',
      title: 'Why tech giants like Tesla may outperform index benchmarks in late 2026',
      summary: 'Evaluating electric vehicle assembly efficiencies, Full Self-Driving neural net beta launches, and utility-scale energy storage expansion metrics as tailwinds for TSLA.',
      imageUrl: 'https://cdn.wegic.ai/assets/onepage/agent/images/1780622624338_0.jpg?imageMogr2/format/webp',
      date: 'May 19, 2026',
      author: 'Marcus Vance, Head of Equity Research',
      readTime: '4 min read',
      content: [
        'Tesla, Inc. (TSLA) represents a highly unique intersection of heavy manufacturing maturity and exponential software leverage. Despite short-term delivery volatility, their automated gigafactories continue to achieve class-leading margin security.',
        'The primary catalyst, however, remains the transition of FSD algorithms into fully autonomous commercial licensing models. When calculated alongside Megapack battery volume bookings, valuation baselines indicate a significant discount compared to historical tech benchmarks.'
      ]
    },
    {
      id: 'art_3',
      category: 'crypto',
      categoryLabel: 'Cryptocurrency',
      title: 'Post-Halving consolidation: What Bitcoin cycle metrics mean for crypto markets',
      summary: 'Analyzing block-subsidy changes, miner hash-rate capitulation models, and exchange netflow data indicating institutional accumulation patterns.',
      imageUrl: 'https://cdn.wegic.ai/assets/onepage/agent/images/1780622624336_0.jpg?imageMogr2/format/webp',
      date: 'May 18, 2026',
      author: 'Elena Rostova, Lead Digital Asset Strategist',
      readTime: '6 min read',
      content: [
        'Bitcoin Spot ETF absorption rates continue to act as a powerful supply floor, fundamentally altering classical 4-year halving cycle dynamics. As miners phase out older generation hardware, hash-rate security has achieved new records, proving system-wide robustness.',
        'We believe the current consolidation range represents a classic liquidity re-accumulation phase. Our proprietary on-chain flow analysis highlights significant cold wallet transfers from short-term holders to long-term institutional custodians.'
      ]
    },
    {
      id: 'art_4',
      category: 'metals',
      categoryLabel: 'Commodities',
      title: 'Gold hits all-time high amidst currency hedging: What is next for metals?',
      summary: 'Analyzing central bank gold reserves purchasing, fiat debasement concerns, and precious metals ratio correlations with energy indices.',
      imageUrl: 'https://cdn.wegic.ai/assets/onepage/agent/images/1780622624235_0.jpg?imageMogr2/format/webp',
      date: 'May 17, 2026',
      author: 'David Cohen, Commodities Executive',
      readTime: '4 min read',
      content: [
        'Gold (XAU) spot pricing has exceeded long-standing resistance channels, driven by systemic hedging from global central banks looking to diversify foreign reserves portfolios. This trend underscores a deeper sovereign concern regarding traditional debt instruments.',
        'Historically, copper and silver trail gold during initial breakout cycles before experiencing aggressive catch-up momentum. We detail current spot metal metrics and outline why precious commodities remain a critical pillar of defensive allocation.'
      ]
    }
  ];

  const filteredArticles = activeFilter === 'all'
    ? articles
    : articles.filter(art => art.category === activeFilter);

  return (
    <div className="min-h-screen bg-brand-bg text-white relative">
      <div className="absolute top-1/4 right-0 w-[500px] h-[500px] bg-brand-success/5 rounded-full blur-[140px] pointer-events-none"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 relative z-10">
        
        {/* --- PAGE HEADER --- */}
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
          <span className="text-xs text-brand-success uppercase tracking-widest font-bold font-mono">Quantumspacex Research</span>
          <h1 className="font-serif text-4xl sm:text-5xl font-bold tracking-tight">Market Intelligence & Insights</h1>
          <p className="text-sm sm:text-base text-brand-textMuted leading-relaxed">
            Acquire access to high-fidelity macro analyses, single stock breakdowns, cryptocurrency models, and precious metal updates prepared by our world-class in-house asset desk.
          </p>
        </div>

        {/* --- ARTICLE FILTERS --- */}
        <div className="flex space-x-2 border-b border-brand-border/60 pb-4 mb-12 overflow-x-auto">
          {(['all', 'forecast', 'stocks', 'crypto', 'metals'] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`px-4 py-2 rounded text-xs font-bold capitalize transition-colors whitespace-nowrap ${
                activeFilter === filter
                  ? 'bg-white text-brand-bg font-bold'
                  : 'text-brand-textMuted hover:text-white hover:bg-brand-card/40'
              }`}
            >
              {filter === 'all' ? 'All Analysis' : filter === 'forecast' ? 'Market Forecast' : filter === 'stocks' ? 'Stock Analysis' : filter === 'crypto' ? 'Digital Assets' : 'Precious Metals'}
            </button>
          ))}
        </div>

        {/* --- ARTICLE GRID --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
          {filteredArticles.map((art) => (
            <article 
              key={art.id} 
              className="bg-brand-card border border-brand-border hover:border-brand-borderLight rounded-xl overflow-hidden shadow-lg transition-all duration-300 flex flex-col justify-between group"
            >
              {/* Cover Image */}
              <div className="h-56 sm:h-64 overflow-hidden relative">
                <img 
                  src={art.imageUrl} 
                  alt={art.title} 
                  className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-500"
                  loading="lazy"
                />
                <span className="absolute bottom-4 left-4 bg-brand-bg/90 backdrop-blur-md px-3 py-1 rounded text-xs text-brand-success font-bold border border-brand-border/80">
                  {art.categoryLabel}
                </span>
              </div>

              {/* Body */}
              <div className="p-6 flex-grow flex flex-col justify-between space-y-6">
                <div className="space-y-3">
                  {/* Meta row */}
                  <div className="flex items-center space-x-4 text-xs text-brand-textMuted font-mono">
                    <span className="flex items-center space-x-1">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{art.date}</span>
                    </span>
                    <span className="flex items-center space-x-1">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{art.readTime}</span>
                    </span>
                  </div>

                  <h2 className="font-serif text-xl sm:text-2xl font-bold leading-snug text-white group-hover:text-brand-success transition-colors cursor-pointer" onClick={() => setSelectedArticle(art)}>
                    {art.title}
                  </h2>
                  
                  <p className="text-sm text-brand-textMuted leading-relaxed line-clamp-3">
                    {art.summary}
                  </p>
                </div>

                {/* Footer buttons */}
                <div className="flex items-center justify-between pt-5 border-t border-brand-border/40">
                  <span className="text-xs font-semibold text-white/80 flex items-center space-x-1">
                    <User className="w-3.5 h-3.5 text-blue-400" />
                    <span>{art.author.split(',')[0]}</span>
                  </span>

                  <button
                    onClick={() => setSelectedArticle(art)}
                    className="inline-flex items-center space-x-1 text-xs text-brand-success font-bold hover:text-red-500 transition-colors"
                  >
                    <span>Read briefing</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>

        {/* --- RECRUITMENT CALL-TO-ACTION CARD --- */}
        <section id="insights-cta" className="bg-brand-card border border-brand-border rounded-xl p-8 md:p-10 relative overflow-hidden text-center max-w-4xl mx-auto">
          <div className="absolute top-0 left-0 w-24 h-24 bg-brand-success/5 rounded-full blur-2xl"></div>
          <div className="space-y-6 relative z-10">
            <BookOpen className="w-12 h-12 text-brand-success mx-auto" />
            <h2 className="font-serif text-2xl sm:text-3xl font-bold">In-depth intelligence delivered weekly</h2>
            <p className="text-sm text-brand-textMuted max-w-lg mx-auto leading-relaxed">
              Don’t navigate volatile global markets blindfolded. Access verified cycle alerts, asset trends, and professional-grade research updates directly in your mailbox.
            </p>
            <div className="flex flex-col sm:flex-row justify-center items-center gap-3">
              <button 
                onClick={() => alert('Research updates registration successful! You have been added to our VIP dispatch line.')}
                className="w-full sm:w-auto bg-brand-success hover:bg-red-700 text-brand-bg font-bold px-8 py-3 rounded text-sm transition-colors"
              >
                Join Global Dispatch
              </button>
            </div>
          </div>
        </section>

      </div>

      {/* --- BRIEFING EXPANDABLE READER OVERLAY MODAL --- */}
      {selectedArticle && (
        <div className="fixed inset-0 bg-brand-bg/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-brand-card border border-brand-border max-w-2xl w-full rounded-xl overflow-hidden shadow-2xl relative flex flex-col max-h-[90vh]">
            
            {/* Header image in modal */}
            <div className="h-48 sm:h-56 relative overflow-hidden flex-shrink-0">
              <img 
                src={selectedArticle.imageUrl} 
                alt={selectedArticle.title} 
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-brand-card to-transparent"></div>
              
              {/* Close Button */}
              <button
                onClick={() => setSelectedArticle(null)}
                className="absolute right-4 top-4 p-1.5 bg-brand-bg/80 backdrop-blur-sm rounded-full text-brand-textMuted hover:text-white border border-brand-border"
              >
                <X className="w-5 h-5" />
              </button>

              <span className="absolute bottom-4 left-6 bg-brand-bg/90 backdrop-blur-md px-3 py-1 rounded text-xs text-brand-success font-bold border border-brand-border/80">
                {selectedArticle.categoryLabel}
              </span>
            </div>

            {/* Modal Body Scroll */}
            <div className="p-6 overflow-y-auto space-y-6">
              
              {/* Title & metadata */}
              <div className="space-y-3">
                <div className="flex items-center space-x-4 text-xs text-brand-textMuted font-mono">
                  <span className="flex items-center space-x-1">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{selectedArticle.date}</span>
                  </span>
                  <span className="flex items-center space-x-1">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{selectedArticle.readTime}</span>
                  </span>
                </div>
                <h2 className="font-serif text-2xl sm:text-3xl font-bold leading-tight text-white">
                  {selectedArticle.title}
                </h2>
                <p className="text-xs text-brand-textMuted font-mono">
                  Report prepared by: <span className="text-blue-400 font-semibold">{selectedArticle.author}</span>
                </p>
              </div>

              {/* Main reading content */}
              <div className="space-y-4 text-sm text-brand-textMuted leading-relaxed font-sans">
                {selectedArticle.content.map((para, idx) => (
                  <p key={idx}>{para}</p>
                ))}
                
                <p className="bg-brand-bg/60 p-4 border-l-2 border-brand-success text-xs leading-relaxed text-slate-300 italic rounded">
                  "Market indicators are for simulation purposes only. Historical values and analytical assertions do not guarantee future returns. Seek fully licensed regulatory advice prior to real trade executions."
                </p>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="bg-brand-bg/85 px-6 py-4 border-t border-brand-border/60 flex items-center justify-between flex-shrink-0">
              <div className="flex space-x-2">
                <button className="p-2 hover:bg-brand-card rounded text-brand-textMuted hover:text-white" title="Bookmark Report">
                  <Bookmark className="w-4 h-4" />
                </button>
                <button className="p-2 hover:bg-brand-card rounded text-brand-textMuted hover:text-white" title="Share Report">
                  <Share2 className="w-4 h-4" />
                </button>
              </div>
              
              <button
                onClick={() => setSelectedArticle(null)}
                className="bg-white hover:bg-slate-100 text-brand-bg font-bold px-5 py-2 rounded text-xs transition-colors"
              >
                Done Reading
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
