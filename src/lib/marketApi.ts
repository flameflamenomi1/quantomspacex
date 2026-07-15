// ─── Real-Time Market Prices API ─────────────────────────────────────────────
// Uses CoinGecko free API - no API key required
// ─────────────────────────────────────────────────────────────────────────────

const COINGECKO_API = 'https://api.coingecko.com/api/v3';

export interface MarketPrice {
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  marketCap?: number;
  volume24h?: number;
}

// Map our asset symbols to CoinGecko IDs
const CRYPTO_IDS: Record<string, string> = {
  BTC: 'bitcoin',
  ETH: 'ethereum',
  SOL: 'solana',
  USDT: 'tether',
  BNB: 'binancecoin',
  XRP: 'ripple',
  ADA: 'cardano',
  DOGE: 'dogecoin',
  AVAX: 'avalanche-2',
  DOT: 'polkadot',
};

// Note: Stock prices require paid APIs (Alpha Vantage, Finnhub, etc.)
// For now, they'll use fallback simulated prices
const STOCK_FALLBACKS: Record<string, MarketPrice> = {
  TSLA: { symbol: 'TSLA', name: 'Tesla Inc.', price: 248.5, change24h: 2.35 },
  NVDA: { symbol: 'NVDA', name: 'NVIDIA Corp.', price: 487.32, change24h: -1.22 },
  AAPL: { symbol: 'AAPL', name: 'Apple Inc.', price: 185.92, change24h: 0.85 },
  GOOGL: { symbol: 'GOOGL', name: 'Alphabet Inc.', price: 139.55, change24h: 1.12 },
  AMZN: { symbol: 'AMZN', name: 'Amazon.com', price: 176.28, change24h: -0.45 },
  MSFT: { symbol: 'MSFT', name: 'Microsoft Corp.', price: 378.91, change24h: 1.03 },
};

const COMMODITY_FALLBACKS: Record<string, MarketPrice> = {
  GOLD: { symbol: 'GOLD', name: 'Gold', price: 2045.50, change24h: 0.32 },
  SILVER: { symbol: 'SILVER', name: 'Silver', price: 23.15, change24h: -0.18 },
  OIL: { symbol: 'OIL', name: 'Crude Oil', price: 78.90, change24h: 1.24 },
};

export async function getCryptoPrices(symbols: string[]): Promise<MarketPrice[]> {
  try {
    const ids = symbols.map(s => CRYPTO_IDS[s]).filter(Boolean).join(',');
    if (!ids) return [];

    const response = await fetch(
      `${COINGECKO_API}/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true&include_market_cap=true&include_24hr_vol=true`
    );
    
    if (!response.ok) throw new Error('API request failed');
    
    const data = await response.json();
    
    return symbols.map(symbol => {
      const id = CRYPTO_IDS[symbol];
      const priceData = data[id];
      
      if (!priceData) return null;
      
      return {
        symbol,
        name: symbol,
        price: priceData.usd,
        change24h: priceData.usd_24h_change || 0,
        marketCap: priceData.usd_market_cap,
        volume24h: priceData.usd_24h_vol,
      };
    }).filter(Boolean) as MarketPrice[];
  } catch (error) {
    console.error('[Market API] Failed to fetch crypto prices:', error);
    return [];
  }
}

export async function getAssetPrice(symbol: string, type: 'crypto' | 'stock' | 'commodity'): Promise<MarketPrice | null> {
  if (type === 'crypto') {
    const prices = await getCryptoPrices([symbol]);
    return prices[0] || null;
  }
  
  // Return fallback for stocks and commodities
  if (type === 'stock') return STOCK_FALLBACKS[symbol] || null;
  if (type === 'commodity') return COMMODITY_FALLBACKS[symbol] || null;
  
  return null;
}

export async function getAllMarketPrices(): Promise<{
  crypto: MarketPrice[];
  stocks: MarketPrice[];
  commodities: MarketPrice[];
}> {
  const cryptoSymbols = Object.keys(CRYPTO_IDS);
  const crypto = await getCryptoPrices(cryptoSymbols);
  
  return {
    crypto,
    stocks: Object.values(STOCK_FALLBACKS),
    commodities: Object.values(COMMODITY_FALLBACKS),
  };
}

// Fetch live prices for multiple assets (returns symbol -> price map)
export async function fetchLivePrices(symbols: string[]): Promise<Record<string, number>> {
  const result: Record<string, number> = {};
  
  for (const symbol of symbols) {
    // Try crypto first
    if (CRYPTO_IDS[symbol]) {
      const prices = await getCryptoPrices([symbol]);
      if (prices[0]) {
        result[symbol] = prices[0].price;
        continue;
      }
    }
    
    // Try stocks
    if (STOCK_FALLBACKS[symbol]) {
      result[symbol] = STOCK_FALLBACKS[symbol].price;
      continue;
    }
    
    // Try commodities
    if (COMMODITY_FALLBACKS[symbol]) {
      result[symbol] = COMMODITY_FALLBACKS[symbol].price;
    }
  }
  
  return result;
}
