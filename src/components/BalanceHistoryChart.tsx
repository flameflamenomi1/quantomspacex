import { useEffect, useState, memo } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { TrendingUp, Clock } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface BalanceHistoryData {
  created_at: string;
  balance: number;
  change_amount: number;
  change_type: string;
  description: string;
}

interface ChartDataPoint {
  date: string;
  balance: number;
  timestamp: number;
}

function BalanceHistoryChart({ userId }: { userId: string }) {
  const [data, setData] = useState<ChartDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d');

  useEffect(() => {
    loadHistory();
  }, [userId, timeRange]);

  async function loadHistory() {
    setLoading(true);
    try {
      let query = supabase
        .from('balance_history')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });

      // Apply time filter
      if (timeRange !== 'all') {
        const daysAgo = parseInt(timeRange);
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysAgo);
        query = query.gte('created_at', cutoffDate.toISOString());
      }

      const { data: historyData, error } = await query;
      
      if (error) throw error;
      
      if (historyData && historyData.length > 0) {
        const chartData: ChartDataPoint[] = historyData.map((h: BalanceHistoryData) => ({
          date: new Date(h.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          balance: parseFloat(h.balance.toString()),
          timestamp: new Date(h.created_at).getTime(),
        }));
        setData(chartData);
      } else {
        setData([]);
      }
    } catch (err) {
      console.error('Failed to load balance history:', err);
      setData([]);
    }
    setLoading(false);
  }

  const calculateGrowth = () => {
    if (data.length < 2) return 0;
    const first = data[0].balance;
    const last = data[data.length - 1].balance;
    return ((last - first) / first) * 100;
  };

  const growth = calculateGrowth();

  return (
    <div className="bg-brand-card border border-brand-border rounded-2xl p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-brand-success" />
          <h3 className="font-bold text-white">Balance Growth</h3>
        </div>
        
        {/* Time Range Selector */}
        <div className="flex gap-1 bg-brand-bg rounded-lg p-1">
          {(['7d', '30d', '90d', 'all'] as const).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-3 py-1 rounded text-xs font-semibold transition-all ${
                timeRange === range
                  ? 'bg-brand-success text-white'
                  : 'text-brand-textMuted hover:text-white'
              }`}
            >
              {range === 'all' ? 'All' : range.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="h-64 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-brand-border border-t-brand-success rounded-full animate-spin" />
        </div>
      ) : data.length === 0 ? (
        <div className="h-64 flex flex-col items-center justify-center text-brand-textMuted">
          <Clock className="w-12 h-12 mb-3 opacity-50" />
          <p className="text-sm">No balance history yet</p>
          <p className="text-xs mt-1">Your account activity will appear here</p>
        </div>
      ) : (
        <>
          {/* Growth Metric */}
          <div className="mb-4 pb-4 border-b border-brand-border/50">
            <div className="flex items-center gap-2">
              <span className="text-brand-textMuted text-sm">Growth:</span>
              <span className={`font-bold text-lg ${growth >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {growth >= 0 ? '+' : ''}{growth.toFixed(2)}%
              </span>
            </div>
          </div>

          {/* Chart */}
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                <defs>
                  <linearGradient id="balanceGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#EF4444" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis 
                  dataKey="date" 
                  stroke="#6B7280" 
                  tick={{ fill: '#9CA3AF', fontSize: 12 }}
                  tickLine={false}
                />
                <YAxis 
                  stroke="#6B7280"
                  tick={{ fill: '#9CA3AF', fontSize: 12 }}
                  tickLine={false}
                  tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(16, 14, 30, 0.95)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '12px',
                    padding: '8px 12px',
                  }}
                  labelStyle={{ color: '#9CA3AF', fontSize: '12px', marginBottom: '4px' }}
                  itemStyle={{ color: '#fff', fontSize: '14px', fontWeight: 'bold' }}
                  formatter={(value: unknown) => [`$${Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 })}`, 'Balance']}
                />
                <Line
                  type="monotone"
                  dataKey="balance"
                  stroke="#EF4444"
                  strokeWidth={2}
                  dot={{ fill: '#EF4444', r: 3 }}
                  activeDot={{ r: 5, fill: '#DC2626' }}
                  fill="url(#balanceGradient)"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  );
}

export default memo(BalanceHistoryChart);
