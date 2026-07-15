# Quantumspacex - Premium Multi-Asset Investment Platform

Quantumspacex is an elite, high-performance financial investment portal featuring real-time portfolio management, crypto deposits, live price integration, investment plans, balance history tracking, and comprehensive admin controls.

## 🚀 Complete Feature Set

### User Features
- **Authentication System**: 
  - Signup/Login with email verification (OTP)
  - Forgot password flow
  - Admin role-based access (bypasses OTP for instant login)
  
- **Dashboard**: 
  - Real-time portfolio tracking with balance before/after on trades
  - **Balance History Chart**: Interactive growth chart with 7d/30d/90d/All time ranges
  - Crypto deposit gateway with QR codes (BTC, ETH, USDT ERC-20/TRC-20, SOL)
  - Deposit limits: Min $500, Max $5,000,000
  - Interactive buy/sell order execution
  - Watchlist tracking and transaction history
  - **Referral System**: Unique referral codes, copy/share functionality
  - **Investment Plans Overview**: Active plans with countdown timers
  
- **Investment Plans** (/investment-plans):
  - 3 tiers: Starter Growth (15% returns), Alpha Accelerator (35%), Quantum Elite (75%)
  - Lock funds for admin-managed trading
  - Real-time countdown showing days/hours remaining
  - Admin payout processing with balance history tracking
  
- **Real-Time Market Prices**:
  - Live crypto prices via CoinGecko API
  - Stock/commodity reference prices
  - Admin can fetch live prices when sending trades
  
- **KYC Verification**: Document upload system with admin approval workflow
- **Withdrawal System**: Request withdrawals with admin approval + manual verification codes
- **Profile Management**: Update password, phone, country, profile photo upload
- **Live Support Chat**: 
  - Real-time messaging with admin
  - Accessible from Customer Care menu (mobile/desktop)
  - Floating chat widget with unread badges
- **Notifications**: Bell icon with real-time alerts

### Admin Panel (/admin)
- **Login**: Use email/password from regular login page (admin@quantumspacex.com / Admin123!)
- User management and status control
- Deposit approval/rejection with wallet addresses visible
- Withdrawal approval with manual code generation
- KYC document review and verification
- **Trade Execution**: 
  - Send individual trades to users with live price fetch button
  - **Bulk Trade Tool** (/admin/bulk-trade): Dedicated one-page interface for mass trade creation
    - Select user from dropdown → see current balance and KYC status
    - Add unlimited trades in spreadsheet-like table
    - Each row: Asset, Buy/Sell, Quantity, Price (with live fetch button), P&L, Status, Custom Date
    - Live price fetch button per row (crypto via CoinGecko API, stocks/commodities use reference prices)
    - Real-time total calculation per trade
    - One-click submit sends all trades at once
    - Each trade creates separate record in user's history
  - Automatic balance calculations (admin trades: BUY doesn't deduct, SELL adds P/L only)
  - Balance history tracking for all transactions
- **Investment Plans Management**:
  - View all active/completed/cancelled plans
  - Process payouts with custom amounts
  - Cancel plans and refund users
  - Expiry notifications with red badge alerts
- Manual balance adjustment with notes
- Verification code management (login, register, password reset, withdrawal)
- Support chat responses
- Full audit trail visibility

### Balance History Tracking
- Automatic tracking of all balance changes:
  - Deposits (approved by admin)
  - Withdrawals (deducted on request, refunded if rejected)
  - Trades (buy/sell with P&L)
  - Investment plans (lock funds, receive payouts)
  - Admin adjustments
- Complete audit trail with descriptions
- Visual chart showing account growth
- Database table: `balance_history` with timestamps

### Homepage Sections
- Hero with live asset tickers
- Core features showcase
- **Security & Trust**: 6 security pillars (SSL, Cold Storage, 2FA, Monitoring, Segregated Funds, KYC)
- **Testimonials**: 3 authentic reviews with 4.7/5 rating display
- Markets preview with sparklines
- Step-by-step crypto funding guide
- **FAQ Section**: 6 comprehensive Q&As (deposits, withdrawals, KYC, fees, security, minimum amounts)
- Latest insights/articles
- Newsletter subscription

### Security Infrastructure
- 256-bit SSL encryption
- Cold storage vaults for crypto
- Two-factor authentication (email OTP) - bypassed for admin users
- 24/7 transaction monitoring
- Segregated client funds
- KYC identity verification
- All security metrics displayed: 100% funds secured, $0 breaches, 99.8% uptime

### Email System (EmailJS)
- Auto-send codes for login and registration
- Manual-only codes for withdrawals (security requirement)
- Password reset codes via email
- Service configured: service_u8nns7i, template_5qv9uzo

### Fee Structure
- **Trading**: Zero platform fees
- **Withdrawals**: 10% fee on profits only (initial capital never charged)
- **Network fees**: Standard blockchain fees apply

## 🛠️ Technology Stack

- **Framework**: React 19 + TypeScript + Vite 7
- **Styling**: TailwindCSS v3 (Red & Black theme)
- **Database**: Wegic Cloud (managed backend)
- **Icons**: Lucide React
- **Router**: React Router v7
- **QR Codes**: qrcode.react
- **Email**: EmailJS integration

## 🎨 Design System

**Color Palette:**
- Background: Deep black (#0A0505)
- Cards: Dark black (#130A0A)
- Borders: Dark red tint (#2D1515)
- Primary/Success: Red (#EF4444, #DC2626)
- Brand: "Quantum" in red, "spacex" in white

## 🔒 Financial Compliance & Risk Notice

Standard regulatory disclaimers and risk warnings are integrated. Platform uses admin-controlled verification for all withdrawals to ensure security and compliance.

## 📝 Admin Notes

- Withdrawal codes are NEVER auto-emailed (admin generates manually)
- All trades record balance_before and balance_after for audit trail
- KYC required for deposits/withdrawals
- Profile photos stored in Supabase Storage (5MB limit)
- Crypto wallet addresses with QR codes for easy deposits
