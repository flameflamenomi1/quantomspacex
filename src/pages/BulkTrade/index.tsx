import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, X, TrendingUp, Loader2, RefreshCw, DollarSign } from 'lucide-react';
import { getAllUsers, createTrade, type User } from '@/lib/db';
import { fetchLivePrices } from '@/lib/marketApi';
import { supabase } from '@/lib/supabase';

interface BulkTradeRow {
  id: string;
  asset_symbol: string;
  asset_name: string;
  asset_type: 'stock' | 'crypto' | 'commodity';
  trade_type: 'buy' | 'sell';
  quantity: string;
  price: string;
  profit_loss: string;
  status: 'open' | 'closed';
  executed_at: string;
}

const ASSETS: Array<{ symbol: string; name: string; type: 'stock' | 'crypto' | 'commodity' }> = [
  { symbol: 'BTC', name: 'Bitcoin', type: 'crypto' },
  { symbol: 'ETH', name: 'Ethereum', type: 'crypto' },
  { symbol: 'SOL', name: 'Solana', type: 'crypto' },
  { symbol: 'USDT', name: 'Tether', type: 'crypto' },
  { symbol: 'BNB', name: 'Binance Coin', type: 'crypto' },
  { symbol: 'XRP', name: 'Ripple', type: 'crypto' },
  { symbol: 'ADA', name: 'Cardano', type: 'crypto' },
  { symbol: 'DOGE', name: 'Dogecoin', type: 'crypto' },
  { symbol: 'AAPL', name: 'Apple Inc.', type: 'stock' },
  { symbol: 'TSLA', name: 'Tesla Inc.', type: 'stock' },
  { symbol: 'NVDA', name: 'NVIDIA Corp.', type: 'stock' },
  { symbol: 'MSFT', name: 'Microsoft', type: 'stock' },
  { symbol: 'GOOGL', name: 'Alphabet Inc.', type: 'stock' },
  { symbol: 'AMZN', name: 'Amazon', type: 'stock' },
  { symbol: 'META', name: 'Meta Platforms', type: 'stock' },
  { symbol: 'GOLD', name: 'Gold', type: 'commodity' },
  { symbol: 'SILVER', name: 'Silver', type: 'commodity' },
  { symbol: 'OIL', name: 'Crude Oil', type: 'commodity' },
] as const;

export default function BulkTradePage() {
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [trades, setTrades] = useState<BulkTradeRow[]>([{
    id: Date.now().toString(),
    asset_symbol: 'BTC',
    asset_name: 'Bitcoin',
    asset_type: 'crypto',
    trade_type: 'buy',
    quantity: '',
    price: '',
    profit_loss: '',
    status: 'open',
    executed_at: new Date().toISOString()
  }]);
  const [loading, setLoading] = useState(false);
  const [fetchingPrices, setFetchingPrices] = useState<Record<string, boolean>>({});

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    const allUsers = await getAllUsers();
    setUsers(allUsers.filter(u => u.role !== 'admin'));
  };

  const handleAddRow = () => {
    setTrades(prev => [...prev, {
      id: Date.now().toString(),
      asset_symbol: 'BTC',
      asset_name: 'Bitcoin',
      asset_type: 'crypto' as 'crypto',
      trade_type: 'buy' as 'buy',
      quantity: '',
      price: '',
      profit_loss: '',
      status: 'open' as 'open',
      executed_at: new Date().toISOString()
    }]);
  };

  const handleRemoveRow = (id: string) => {
    if (trades.length === 1) return;
    setTrades(prev => prev.filter(t => t.id !== id));
  };

  const handleUpdateTrade = (id: string, field: string, value: string) => {
    setTrades(prev => prev.map(t => {
      if (t.id !== id) return t;
      if (field === 'asset_symbol') {
        const asset = ASSETS.find(a => a.symbol === value);
        if (asset) {
          return { ...t, asset_symbol: asset.symbol, asset_name: asset.name, asset_type: asset.type };
        }
      }
      return { ...t, [field]: value } as BulkTradeRow;
    }));
  };

  const handleFetchLivePrice = async (tradeId: string) => {
    const trade = trades.find(t => t.id === tradeId);
    if (!trade) return;

    setFetchingPrices(prev => ({ ...prev, [tradeId]: true }));
    try {
      const prices = await fetchLivePrices([trade.asset_symbol]);
      const price = prices[trade.asset_symbol];
      if (price) {
        handleUpdateTrade(tradeId, 'price', price.toString());
      }
    } catch (err) {
      console.error('Failed to fetch price:', err);
      alert('Failed to fetch live price. Please try again.');
    } finally {
      setFetchingPrices(prev => ({ ...prev, [tradeId]: false }));
    }
  };

  const handleSubmitAll = async () => {
    if (!selectedUserId) {
      alert('Please select a user');
      return;
    }

    const validTrades = trades.filter(t => t.quantity && t.price);
    if (validTrades.length === 0) {
      alert('Please add at least one valid trade with quantity and price');
      return;
    }

    setLoading(true);
    try {
      for (const trade of validTrades) {
        const qty = parseFloat(trade.quantity);
        const price = parseFloat(trade.price);
        const pl = parseFloat(trade.profit_loss || '0');
        
        // For BUY trades, add the investment amount to balance first
        if (trade.trade_type === 'buy') {
          const totalCost = qty * price;
          const { data: userData } = await supabase
            .from('users')
            .select('balance')
            .eq('id', selectedUserId)
            .single();
          
          if (userData) {
            const newBalance = userData.balance + totalCost;
            await supabase
              .from('users')
              .update({ balance: newBalance })
              .eq('id', selectedUserId);
          }
        }
        
        await createTrade({
          user_id: selectedUserId,
          asset_symbol: trade.asset_symbol,
          asset_name: trade.asset_name,
          asset_type: trade.asset_type,
          trade_type: trade.trade_type,
          quantity: qty,
          price,
          total_value: qty * price,
          profit_loss: pl,
          status: trade.status,
          sent_by_admin: true,
          executed_at: trade.executed_at
        });
      }

      alert(`✓ Successfully sent ${validTrades.length} trade(s)!`);
      
      // Reset form
      setSelectedUserId('');
      setTrades([{
        id: Date.now().toString(),
        asset_symbol: 'BTC',
        asset_name: 'Bitcoin',
        asset_type: 'crypto',
        trade_type: 'buy',
        quantity: '',
        price: '',
        profit_loss: '',
        status: 'open',
        executed_at: new Date().toISOString()
      }]);
    } catch (err) {
      console.error(err);
      alert('Failed to send trades. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const selectedUser = users.find(u => u.id === selectedUserId);
  const validTradesCount = trades.filter(t => t.quantity && t.price).length;

  return (
    <div className="min-h-screen bg-brand-bg text-white p-4 md:p-8">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-6">
        <div className="flex items-center gap-4 mb-2">
          <button
            onClick={() => navigate('/admin')}
            className="w-10 h-10 rounded-xl bg-brand-card border border-brand-border flex items-center justify-center hover:bg-brand-border transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Bulk Trade Sender</h1>
            <p className="text-sm text-brand-textMuted mt-1">Send multiple trades to any user in one action</p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto space-y-6">
        {/* User Selection */}
        <div className="bg-brand-card border border-brand-border rounded-xl p-6">
          <label className="block text-sm font-semibold text-white mb-3">Select Target User</label>
          <select
            value={selectedUserId}
            onChange={e => setSelectedUserId(e.target.value)}
            className="w-full md:w-96 bg-brand-bg border border-brand-border rounded-lg px-4 py-3 text-white focus:outline-none focus:border-brand-success"
          >
            <option value="">-- Choose a user --</option>
            {users.map(u => (
              <option key={u.id} value={u.id}>
                {u.full_name} ({u.email}) - Balance: ${u.balance.toLocaleString()}
              </option>
            ))}
          </select>
          
          {selectedUser && (
            <div className="mt-4 flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2 bg-brand-bg px-4 py-2 rounded-lg border border-brand-border">
                <DollarSign className="w-4 h-4 text-brand-success" />
                <span className="text-brand-textMuted">Current Balance:</span>
                <span className="font-bold text-white">${selectedUser.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="text-brand-textMuted">
                KYC: <span className={selectedUser.kyc_status === 'approved' ? 'text-brand-success' : 'text-yellow-400'}>{selectedUser.kyc_status}</span>
              </div>
            </div>
          )}
        </div>

        {/* Trades Table */}
        <div className="bg-brand-card border border-brand-border rounded-xl overflow-hidden">
          <div className="p-6 border-b border-brand-border flex items-center justify-between">
            <h2 className="text-lg font-bold">Trade Entries ({trades.length})</h2>
            <button
              onClick={handleAddRow}
              className="flex items-center gap-2 bg-brand-success/10 hover:bg-brand-success/20 text-brand-success border border-brand-success/30 px-4 py-2 rounded-lg text-sm font-semibold transition-all"
            >
              <Plus className="w-4 h-4" />
              Add Trade
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-brand-bg border-b border-brand-border">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-brand-textMuted uppercase tracking-wider">#</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-brand-textMuted uppercase tracking-wider">Asset</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-brand-textMuted uppercase tracking-wider">Side</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-brand-textMuted uppercase tracking-wider">Quantity</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-brand-textMuted uppercase tracking-wider">Price ($)</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-brand-textMuted uppercase tracking-wider">P&L ($)</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-brand-textMuted uppercase tracking-wider">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-brand-textMuted uppercase tracking-wider">Date</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-brand-textMuted uppercase tracking-wider">Total</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-brand-textMuted uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border">
                {trades.map((trade, idx) => {
                  const total = trade.quantity && trade.price ? parseFloat(trade.quantity) * parseFloat(trade.price) : 0;
                  const isFetchingPrice = fetchingPrices[trade.id];
                  
                  return (
                    <tr key={trade.id} className="hover:bg-brand-bg/50 transition-colors">
                      <td className="px-4 py-3 text-sm text-brand-textMuted font-mono">{idx + 1}</td>
                      
                      {/* Asset */}
                      <td className="px-4 py-3">
                        <select
                          value={trade.asset_symbol}
                          onChange={e => handleUpdateTrade(trade.id, 'asset_symbol', e.target.value)}
                          className="w-32 bg-brand-bg border border-brand-border rounded px-2 py-1.5 text-sm text-white focus:outline-none focus:border-brand-success"
                        >
                          {ASSETS.map(a => <option key={a.symbol} value={a.symbol}>{a.symbol}</option>)}
                        </select>
                      </td>
                      
                      {/* Side */}
                      <td className="px-4 py-3">
                        <select
                          value={trade.trade_type}
                          onChange={e => handleUpdateTrade(trade.id, 'trade_type', e.target.value)}
                          className={`w-20 bg-brand-bg border rounded px-2 py-1.5 text-sm font-semibold focus:outline-none ${
                            trade.trade_type === 'buy' 
                              ? 'border-green-500/30 text-green-400' 
                              : 'border-red-500/30 text-red-400'
                          }`}
                        >
                          <option value="buy">BUY</option>
                          <option value="sell">SELL</option>
                        </select>
                      </td>
                      
                      {/* Quantity */}
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          step="0.00000001"
                          value={trade.quantity}
                          onChange={e => handleUpdateTrade(trade.id, 'quantity', e.target.value)}
                          placeholder="0.5"
                          className="w-24 bg-brand-bg border border-brand-border rounded px-2 py-1.5 text-sm text-white focus:outline-none focus:border-brand-success"
                        />
                      </td>
                      
                      {/* Price with live fetch */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            step="0.01"
                            value={trade.price}
                            onChange={e => handleUpdateTrade(trade.id, 'price', e.target.value)}
                            placeholder="50000"
                            className="w-28 bg-brand-bg border border-brand-border rounded px-2 py-1.5 text-sm text-white focus:outline-none focus:border-brand-success"
                          />
                          <button
                            onClick={() => handleFetchLivePrice(trade.id)}
                            disabled={isFetchingPrice}
                            className="p-1.5 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 rounded text-blue-400 transition-all disabled:opacity-50"
                            title="Fetch live price"
                          >
                            {isFetchingPrice ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <RefreshCw className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </td>
                      
                      {/* P&L */}
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          step="0.01"
                          value={trade.profit_loss}
                          onChange={e => handleUpdateTrade(trade.id, 'profit_loss', e.target.value)}
                          placeholder="0"
                          className="w-24 bg-brand-bg border border-brand-border rounded px-2 py-1.5 text-sm text-white focus:outline-none focus:border-brand-success"
                        />
                      </td>
                      
                      {/* Status */}
                      <td className="px-4 py-3">
                        <select
                          value={trade.status}
                          onChange={e => handleUpdateTrade(trade.id, 'status', e.target.value)}
                          className="w-20 bg-brand-bg border border-brand-border rounded px-2 py-1.5 text-sm text-white focus:outline-none focus:border-brand-success"
                        >
                          <option value="open">Open</option>
                          <option value="closed">Closed</option>
                        </select>
                      </td>
                      
                      {/* Date */}
                      <td className="px-4 py-3">
                        <input
                          type="datetime-local"
                          value={trade.executed_at ? new Date(trade.executed_at).toISOString().slice(0, 16) : ''}
                          onChange={e => handleUpdateTrade(trade.id, 'executed_at', e.target.value ? new Date(e.target.value).toISOString() : new Date().toISOString())}
                          className="w-40 bg-brand-bg border border-brand-border rounded px-2 py-1.5 text-xs text-white focus:outline-none focus:border-brand-success"
                        />
                      </td>
                      
                      {/* Total */}
                      <td className="px-4 py-3">
                        <span className="text-sm font-bold text-white font-mono">
                          {total > 0 ? `$${total.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : '—'}
                        </span>
                      </td>
                      
                      {/* Remove */}
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleRemoveRow(trade.id)}
                          disabled={trades.length === 1}
                          className="p-1.5 text-red-400 hover:bg-red-400/10 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Submit Section */}
        <div className="bg-brand-card border border-brand-border rounded-xl p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <p className="text-sm text-brand-textMuted mb-1">Ready to send</p>
              <p className="text-2xl font-bold text-white">
                {validTradesCount} {validTradesCount === 1 ? 'Trade' : 'Trades'}
              </p>
            </div>
            
            <button
              onClick={handleSubmitAll}
              disabled={loading || !selectedUserId || validTradesCount === 0}
              className="flex items-center justify-center gap-2 bg-brand-success hover:bg-red-700 text-white font-bold px-8 py-4 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed text-base"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <TrendingUp className="w-5 h-5" />
                  Send All Trades
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
