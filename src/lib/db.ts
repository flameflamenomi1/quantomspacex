import { supabase } from './supabase';
import { sendAlertEmail } from './email';

export type UserStatus = 'active' | 'suspended' | 'pending';
export type KycStatus = 'unverified' | 'pending' | 'approved' | 'rejected';
export type DepositStatus = 'pending' | 'approved' | 'rejected';
export type TradeStatus = 'open' | 'closed' | 'cancelled';
export type AssetType = 'stock' | 'crypto' | 'commodity';
export type TradeType = 'buy' | 'sell';

export interface User {
  id: string;
  full_name: string;
  email: string;
  phone?: string;
  country?: string;
  password_hash: string;
  balance: number;
  status: UserStatus;
  kyc_status: KycStatus;
  profile_photo?: string;
  referral_code?: string;
  referred_by?: string;
  role?: 'user' | 'admin';
  admin_note?: string;
  created_at: string;
}

export interface Deposit {
  id: string;
  user_id: string;
  amount: number;
  crypto_currency: string;
  tx_hash?: string;
  wallet_address?: string;
  receipt_url?: string;
  status: DepositStatus;
  admin_note?: string;
  created_at: string;
  updated_at: string;
  users?: { full_name: string; email: string };
}

export interface KycSubmission {
  id: string;
  user_id: string;
  full_name: string;
  date_of_birth?: string;
  nationality?: string;
  id_type?: 'passport' | 'national_id' | 'drivers_license';
  id_number?: string;
  id_front_url?: string;
  id_back_url?: string;
  selfie_url?: string;
  status: 'pending' | 'approved' | 'rejected';
  admin_note?: string;
  created_at: string;
  updated_at: string;
  users?: { full_name: string; email: string };
}

export interface Trade {
  id: string;
  user_id: string;
  asset_symbol: string;
  asset_name: string;
  asset_type: AssetType;
  trade_type: TradeType;
  quantity: number;
  price: number;
  total_value: number;
  profit_loss: number;
  status: TradeStatus;
  sent_by_admin: boolean;
  executed_at: string;
  balance_before?: number;
  balance_after?: number;
  history_note?: string;
  created_at: string;
  updated_at: string;
  closed_at?: string;
  users?: { full_name: string; email: string };
}

export interface ChatMessage {
  id: string;
  user_id: string;
  sender: 'user' | 'admin';
  message: string;
  is_read: boolean;
  created_at: string;
  users?: { full_name: string; email: string };
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  is_read: boolean;
  created_at: string;
}

// ── Auth ──────────────────────────────────────────────
export async function registerUser(data: {
  full_name: string;
  email: string;
  password: string;
  phone?: string;
  country?: string;
}) {
  const password_hash = btoa(data.password);
  // Generate unique referral code from name + random chars
  const referral_code = (data.full_name.replace(/\s+/g, '').substring(0, 3).toUpperCase() + Math.random().toString(36).substring(2, 7).toUpperCase());
  const { data: user, error } = await supabase
    .from('users')
    .insert({
      full_name: data.full_name,
      email: data.email,
      phone: data.phone || null,
      country: data.country || null,
      password_hash,
      referral_code,
    })
    .select()
    .single();
  if (error) throw error;
  
  // Create initial balance history record
  await supabase
    .from('balance_history')
    .insert({
      user_id: user.id,
      balance: user.balance || 0,
      change_amount: 0,
      change_type: 'adjustment',
      description: 'Account created'
    });
  
  return user as User;
}

export async function loginUser(email: string, password: string) {
  const password_hash = btoa(password);
  const { data: user, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', email)
    .eq('password_hash', password_hash)
    .single();
  if (error || !user) throw new Error('Invalid email or password');
  
  // Check if account is suspended
  if (user.status === 'suspended') {
    throw new Error('Your account has been suspended. Please contact support.');
  }
  
  return user as User;
}

// ── Deposits ──────────────────────────────────────────
export async function submitDeposit(data: {
  user_id: string;
  amount: number;
  crypto_currency: string;
  tx_hash?: string;
  wallet_address?: string;
  receipt_url?: string;
}) {
  const { data: dep, error } = await supabase.from('deposits').insert(data).select().single();
  if (error) throw error;
  return dep as Deposit;
}

export async function getDeposits(userId?: string) {
  let query = supabase
    .from('deposits')
    .select('*, users(full_name, email)')
    .order('created_at', { ascending: false });
  if (userId) query = query.eq('user_id', userId);
  const { data, error } = await query;
  if (error) throw error;
  return data as Deposit[];
}

export async function updateDepositStatus(id: string, status: DepositStatus, admin_note?: string) {
  const { error } = await supabase
    .from('deposits')
    .update({ status, admin_note, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;

  // Send email alert when deposit is approved or rejected
  if (status === 'approved' || status === 'rejected') {
    const { data: deposit } = await supabase
      .from('deposits')
      .select('amount, crypto_currency, users(full_name, email)')
      .eq('id', id)
      .single();

    if (deposit?.users) {
      const u = deposit.users as unknown as { full_name: string; email: string };
      const isApproved = status === 'approved';
      await sendAlertEmail({
        to_email: u.email,
        to_name: u.full_name,
        subject: isApproved
          ? `Deposit Confirmed — $${deposit.amount.toLocaleString()} Credited`
          : `Deposit Update — Action Required`,
        body: isApproved
          ? `Hi ${u.full_name}, your deposit of $${deposit.amount.toLocaleString()} (${deposit.crypto_currency}) has been approved and credited to your Quantumspacex account. You can now use your funds to invest.${admin_note ? `\n\nNote: ${admin_note}` : ''}`
          : `Hi ${u.full_name}, your deposit of $${deposit.amount.toLocaleString()} (${deposit.crypto_currency}) could not be confirmed.${admin_note ? `\n\nReason: ${admin_note}` : ''} Please contact support if you believe this is an error.`,
      });
    }
  }
}

export async function creditUserBalance(userId: string, amount: number) {
  const { data: user } = await supabase.from('users').select('balance').eq('id', userId).single();
  const newBalance = (user?.balance || 0) + amount;
  const { error } = await supabase.from('users').update({ balance: newBalance }).eq('id', userId);
  if (error) throw error;
  
  // Record balance history
  await supabase
    .from('balance_history')
    .insert({
      user_id: userId,
      balance: newBalance,
      change_amount: amount,
      change_type: 'deposit',
      description: `Deposit approved: +$${amount.toLocaleString()}`
    });
}

// ── KYC ──────────────────────────────────────────────
export async function submitKyc(data: Omit<KycSubmission, 'id' | 'created_at' | 'updated_at' | 'users' | 'status'>) {
  const { data: kyc, error } = await supabase.from('kyc_submissions').insert(data).select().single();
  if (error) throw error;
  // Mark user kyc as pending
  await supabase.from('users').update({ kyc_status: 'pending' }).eq('id', data.user_id);
  return kyc as KycSubmission;
}

export async function getKycSubmissions() {
  const { data, error } = await supabase
    .from('kyc_submissions')
    .select('*, users(full_name, email)')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as KycSubmission[];
}

export async function updateKycStatus(id: string, userId: string, status: 'approved' | 'rejected', admin_note?: string) {
  const { error } = await supabase
    .from('kyc_submissions')
    .update({ status, admin_note, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
  await supabase.from('users').update({ kyc_status: status }).eq('id', userId);
}

// ── Trades ──────────────────────────────────────────
export async function createTrade(data: Omit<Trade, 'id' | 'created_at' | 'updated_at' | 'users' | 'executed_at'> & { executed_at?: string }) {
  // Get user's current balance
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('balance')
    .eq('id', data.user_id)
    .single();
  
  if (userError) throw userError;
  
  const currentBalance = user.balance;
  const totalValue = data.quantity * data.price;
  let newBalance = currentBalance;
  let balanceChange = 0;
  
  // Admin-sent trades: BUY credits user balance with total value, SELL credits profit_loss
  if (data.sent_by_admin) {
    if (data.trade_type === 'buy') {
      balanceChange = totalValue;
      newBalance = currentBalance + balanceChange;
    } else {
      balanceChange = data.profit_loss || 0;
      newBalance = currentBalance + balanceChange;
    }
  } else {
    // User-initiated trades: deduct on buy, credit on sell
    if (data.trade_type === 'buy') {
      balanceChange = -totalValue;
      newBalance = currentBalance - totalValue;
    } else {
      balanceChange = totalValue + (data.profit_loss || 0);
      newBalance = currentBalance + balanceChange;
    }
  }
  
  // Update user balance only if it changed
  if (newBalance !== currentBalance) {
    await supabase
      .from('users')
      .update({ balance: newBalance })
      .eq('id', data.user_id);
  }
  
  // Record balance history
  await supabase
    .from('balance_history')
    .insert({
      user_id: data.user_id,
      balance: newBalance,
      change_amount: balanceChange,
      change_type: 'trade',
      description: data.trade_type === 'buy' 
        ? `Purchased ${data.quantity} ${data.asset_symbol} at $${data.price.toLocaleString()}`
        : `Sold ${data.quantity} ${data.asset_symbol} at $${data.price.toLocaleString()} (P&L: ${data.profit_loss >= 0 ? '+' : ''}$${data.profit_loss.toFixed(2)})`
    });
  
  // Create trade with balance tracking
  const { data: trade, error } = await supabase
    .from('trades')
    .insert({ 
      ...data, 
      executed_at: data.executed_at || new Date().toISOString(),
      balance_before: currentBalance,
      balance_after: newBalance,
      history_note: data.trade_type === 'buy' 
        ? `Purchased ${data.quantity} ${data.asset_symbol} at $${data.price.toLocaleString()}`
        : `Sold ${data.quantity} ${data.asset_symbol} at $${data.price.toLocaleString()} (P&L: ${data.profit_loss >= 0 ? '+' : ''}$${data.profit_loss.toFixed(2)})`
    })
    .select()
    .single();
  if (error) throw error;
  
  // Send real-time notification about trade execution
  await sendNotification({
    user_id: data.user_id,
    title: `Trade Executed: ${data.asset_symbol}`,
    message: `${data.trade_type.toUpperCase()} ${data.quantity} ${data.asset_symbol} at $${data.price.toLocaleString()} - New balance: $${newBalance.toLocaleString(undefined, { maximumFractionDigits: 2 })}`,
    type: 'success'
  });

  // Send email alert about trade
  const { data: tradeUser } = await supabase
    .from('users')
    .select('full_name, email')
    .eq('id', data.user_id)
    .single();

  if (tradeUser) {
    const isBuy = data.trade_type === 'buy';
    await sendAlertEmail({
      to_email: tradeUser.email,
      to_name: tradeUser.full_name,
      subject: `Trade ${isBuy ? 'Purchase' : 'Sale'} Executed — ${data.asset_symbol}`,
      body: isBuy
        ? `Hi ${tradeUser.full_name}, your order to BUY ${data.quantity} ${data.asset_symbol} at $${data.price.toLocaleString()} has been executed successfully. Total cost: $${totalValue.toLocaleString()}. Your new account balance is $${newBalance.toLocaleString(undefined, { maximumFractionDigits: 2 })}.`
        : `Hi ${tradeUser.full_name}, your order to SELL ${data.quantity} ${data.asset_symbol} at $${data.price.toLocaleString()} has been executed. P&L: ${data.profit_loss >= 0 ? '+' : ''}$${(data.profit_loss || 0).toFixed(2)}. Your new account balance is $${newBalance.toLocaleString(undefined, { maximumFractionDigits: 2 })}.`,
    });
  }

  return trade as Trade;
}

export async function getTrades(userId?: string) {
  let query = supabase
    .from('trades')
    .select('*, users(full_name, email)')
    .order('created_at', { ascending: false });
  if (userId) query = query.eq('user_id', userId);
  const { data, error } = await query;
  if (error) throw error;
  return data as Trade[];
}

export async function updateTradeStatus(id: string, status: TradeStatus, profit_loss?: number) {
  const updates: Record<string, unknown> = { status, updated_at: new Date().toISOString() };
  if (profit_loss !== undefined) updates.profit_loss = profit_loss;
  const { error } = await supabase.from('trades').update(updates).eq('id', id);
  if (error) throw error;
}

// ── Chat ──────────────────────────────────────────────
export async function sendMessage(user_id: string, sender: 'user' | 'admin', message: string) {
  const { data, error } = await supabase
    .from('chat_messages')
    .insert({ user_id, sender, message })
    .select()
    .single();
  if (error) throw error;
  return data as ChatMessage;
}

export async function getChatMessages(userId: string) {
  const { data, error } = await supabase
    .from('chat_messages')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data as ChatMessage[];
}

export async function getAllChatUsers() {
  const { data, error } = await supabase
    .from('chat_messages')
    .select('user_id, users(full_name, email)')
    .order('created_at', { ascending: false });
  if (error) throw error;
  // Deduplicate by user_id
  const seen = new Set<string>();
  return (data as unknown as { user_id: string; users: { full_name: string; email: string } }[]).filter(m => {
    if (seen.has(m.user_id)) return false;
    seen.add(m.user_id);
    return true;
  });
}

export async function markMessagesRead(userId: string, sender: 'user' | 'admin') {
  await supabase
    .from('chat_messages')
    .update({ is_read: true })
    .eq('user_id', userId)
    .eq('sender', sender)
    .eq('is_read', false);
}

export async function getUnreadCount(userId: string) {
  const { count } = await supabase
    .from('chat_messages')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('sender', 'user')
    .eq('is_read', false);
  return count || 0;
}

// ── Users (admin) ──────────────────────────────────────
export async function getAllUsers() {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as User[];
}

export async function updateUserStatus(id: string, status: UserStatus) {
  const { error } = await supabase.from('users').update({ status }).eq('id', id);
  if (error) throw error;
}

export async function getUserById(id: string) {
  const { data, error } = await supabase.from('users').select('*').eq('id', id).single();
  if (error) throw error;
  return data as User;
}

export async function getUserByEmail(email: string) {
  const { data, error } = await supabase.from('users').select('*').eq('email', email).single();
  if (error) return null;
  return data as User;
}

export type WithdrawalStatus = 'pending' | 'approved' | 'rejected';

export interface Withdrawal {
  id: string;
  user_id: string;
  amount: number;
  crypto_currency: string;
  wallet_address: string;
  network?: string;
  status: WithdrawalStatus;
  admin_note?: string;
  created_at: string;
  updated_at: string;
  users?: { full_name: string; email: string };
}

// ── Withdrawals ───────────────────────────────────────
export async function submitWithdrawal(data: {
  user_id: string;
  amount: number;
  crypto_currency: string;
  wallet_address: string;
  network?: string;
}) {
  // Deduct from balance immediately (reserved)
  const { data: u } = await supabase.from('users').select('balance').eq('id', data.user_id).single();
  const balance = u?.balance || 0;
  if (balance < data.amount) throw new Error('Insufficient balance.');
  const newBalance = balance - data.amount;
  await supabase.from('users').update({ balance: newBalance }).eq('id', data.user_id);

  // Record balance history
  await supabase
    .from('balance_history')
    .insert({
      user_id: data.user_id,
      balance: newBalance,
      change_amount: -data.amount,
      change_type: 'withdrawal',
      description: `Withdrawal request: -$${data.amount.toLocaleString()} (${data.crypto_currency})`
    });

  const { data: wd, error } = await supabase.from('withdrawals').insert(data).select().single();
  if (error) throw error;
  return wd as Withdrawal;
}

export async function getWithdrawals(userId?: string) {
  let query = supabase
    .from('withdrawals')
    .select('*, users(full_name, email)')
    .order('created_at', { ascending: false });
  if (userId) query = query.eq('user_id', userId);
  const { data, error } = await query;
  if (error) throw error;
  return data as Withdrawal[];
}

export async function updateWithdrawalStatus(id: string, userId: string, status: WithdrawalStatus, admin_note?: string) {
  const { error } = await supabase
    .from('withdrawals')
    .update({ status, admin_note, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;

  // If rejected, refund the balance
  if (status === 'rejected') {
    const { data: wd } = await supabase.from('withdrawals').select('amount').eq('id', id).single();
    if (wd) await creditUserBalance(userId, wd.amount);
  }
}

// ── Verification Codes ────────────────────────────────
export type CodeType = 'login' | 'withdrawal' | 'register' | 'password_reset';

export interface VerificationCode {
  id: string;
  user_id: string;
  email: string;
  code: string;
  type: CodeType;
  used: boolean;
  expires_at: string;
  created_at: string;
  users?: { full_name: string; email: string };
}

function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function createVerificationCode(user_id: string, email: string, type: CodeType): Promise<VerificationCode> {
  // Expire any existing unused codes of same type for this user
  await supabase
    .from('verification_codes')
    .update({ used: true })
    .eq('user_id', user_id)
    .eq('type', type)
    .eq('used', false);

  const code = generateCode();
  const expires_at = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 min

  const { data, error } = await supabase
    .from('verification_codes')
    .insert({ user_id, email, code, type, expires_at })
    .select()
    .single();
  if (error) throw error;
  return data as VerificationCode;
}

export async function verifyCode(user_id: string, code: string, type: CodeType): Promise<boolean> {
  const { data } = await supabase
    .from('verification_codes')
    .select('*')
    .eq('user_id', user_id)
    .eq('code', code)
    .eq('type', type)
    .eq('used', false)
    .gte('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (!data) return false;

  // Mark as used
  await supabase.from('verification_codes').update({ used: true }).eq('id', data.id);
  return true;
}

export async function getAllCodes() {
  const { data, error } = await supabase
    .from('verification_codes')
    .select('*, users(full_name, email)')
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) throw error;
  return data as VerificationCode[];
}

// ── Notifications ──────────────────────────────────────
export async function sendNotification(data: Omit<Notification, 'id' | 'created_at' | 'is_read'>) {
  const { error } = await supabase.from('notifications').insert({ ...data, is_read: false });
  if (error) throw error;
}

export async function getNotifications(userId: string) {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as Notification[];
}

export async function markNotificationRead(id: string) {
  await supabase.from('notifications').update({ is_read: true }).eq('id', id);
}

// ── Admin: Manual Balance Adjustment ──────────────────────
export async function adjustUserBalance(userId: string, amount: number, note: string) {
  const { data: currentUser, error: fetchErr } = await supabase
    .from('users')
    .select('balance')
    .eq('id', userId)
    .single();
  
  if (fetchErr) throw fetchErr;
  
  const newBalance = currentUser.balance + amount;
  
  const { error: updateErr } = await supabase
    .from('users')
    .update({ balance: newBalance })
    .eq('id', userId);
  
  if (updateErr) throw updateErr;
  
  // Record balance history
  await supabase
    .from('balance_history')
    .insert({
      user_id: userId,
      balance: newBalance,
      change_amount: amount,
      change_type: 'adjustment',
      description: note
    });
  
  // Send notification to user
  await sendNotification({
    user_id: userId,
    title: amount > 0 ? 'Balance Credited' : 'Balance Adjusted',
    message: `${amount > 0 ? '+' : ''}$${amount.toLocaleString()} - ${note}`,
    type: 'info'
  });
}

// ── Password Reset ──────────────────────────────────────────
export async function resetPassword(email: string, newPassword: string) {
  const password_hash = btoa(newPassword);
  const { error } = await supabase
    .from('users')
    .update({ password_hash })
    .eq('email', email);
  
  if (error) throw error;
}

// ── Delete User ──────────────────────────────────────────
export async function deleteUser(userId: string) {
  // Delete all related records first
  await supabase.from('trades').delete().eq('user_id', userId);
  await supabase.from('deposits').delete().eq('user_id', userId);
  await supabase.from('withdrawals').delete().eq('user_id', userId);
  await supabase.from('kyc_submissions').delete().eq('user_id', userId);
  await supabase.from('notifications').delete().eq('user_id', userId);
  await supabase.from('balance_history').delete().eq('user_id', userId);
  await supabase.from('chat_messages').delete().eq('user_id', userId);
  await supabase.from('investment_plans').delete().eq('user_id', userId);
  
  // Finally delete the user
  const { error } = await supabase
    .from('users')
    .delete()
    .eq('id', userId);
  
  if (error) throw error;
}

// ── Delete All Users (except admins) ──────────────────────
export async function deleteAllUsers() {
  // Get all non-admin users
  const { data: users } = await supabase
    .from('users')
    .select('id')
    .neq('role', 'admin');
  
  if (!users || users.length === 0) return;
  
  const userIds = users.map(u => u.id);
  
  // Delete all related records for all users
  await supabase.from('trades').delete().in('user_id', userIds);
  await supabase.from('deposits').delete().in('user_id', userIds);
  await supabase.from('withdrawals').delete().in('user_id', userIds);
  await supabase.from('kyc_submissions').delete().in('user_id', userIds);
  await supabase.from('notifications').delete().in('user_id', userIds);
  await supabase.from('balance_history').delete().in('user_id', userIds);
  await supabase.from('chat_messages').delete().in('user_id', userIds);
  await supabase.from('plan_subscriptions').delete().in('user_id', userIds);
  
  // Finally delete all non-admin users
  const { error } = await supabase
    .from('users')
    .delete()
    .neq('role', 'admin');
  
  if (error) throw error;
}

// ── Suspend/Unsuspend User ──────────────────────────────────
export async function toggleUserSuspension(userId: string, suspend: boolean, reason?: string) {
  const newStatus = suspend ? 'suspended' : 'active';
  
  const { error } = await supabase
    .from('users')
    .update({ 
      status: newStatus,
      admin_note: suspend ? (reason || 'Account suspended by admin') : null
    })
    .eq('id', userId);
  
  if (error) throw error;
  
  await sendNotification({
    user_id: userId,
    title: suspend ? 'Account Suspended' : 'Account Reactivated',
    message: suspend 
      ? `Your account has been suspended. ${reason ? `Reason: ${reason}` : 'Please contact support for assistance.'}`
      : 'Your account has been reactivated. You can now access all features.',
    type: 'info'
  });
}

// ── Admin Activity Log ──────────────────────────────────────
export interface AdminActivityLog {
  id: string;
  admin_id: string;
  admin_name: string;
  action: string;
  target_user_id?: string;
  target_user_name?: string;
  details?: string;
  created_at: string;
}

export async function logAdminActivity(entry: Omit<AdminActivityLog, 'id' | 'created_at'>) {
  await supabase.from('admin_activity_log').insert(entry);
}

export async function getAdminActivityLog(limit = 100): Promise<AdminActivityLog[]> {
  const { data, error } = await supabase
    .from('admin_activity_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data || []) as AdminActivityLog[];
}
