import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { ArrowLeft, Copy, Check, AlertTriangle, Upload, X } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useAuth } from '@/context/AuthContext';
import { submitDeposit } from '@/lib/db';
import { supabase } from '@/lib/supabase';

const cryptoAddresses: Record<string, string> = {
  BTC: 'bc1ql5tdc7jph899dlsrv7x7kkv0km3dumyux7nvz4',
  ETH: '0xe1e9332667cccF925fE03F04F7644980d21A0be8',
  'USDT (ERC-20)': '0x8ebc6fc04ac77438c103f2afa710737b7448495c',
  'USDT (TRC-20)': 'TRfsBixLH2ZbbWZcojn2c89k3ySwPQU3ZT',
  SOL: 'HkjCoD2LR7SR6fw5CUfrQYFHZyKBE7564Wwu3E5RkLU7',
};

const cryptoIcons: Record<string, string> = {
  BTC: '₿',
  ETH: 'Ξ',
  'USDT (ERC-20)': '₮',
  'USDT (TRC-20)': '₮',
  SOL: '◎',
};

export default function DepositPage() {
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();

  const [currency, setCurrency] = useState('USDT (TRC-20)');
  const [amount, setAmount] = useState('');
  const [txHash, setTxHash] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string>('');
  const [uploading, setUploading] = useState(false);

  const address = cryptoAddresses[currency] || '';

  const handleCopy = () => {
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
    if (!validTypes.includes(file.type)) {
      setError('Please upload JPG, PNG, or PDF files only');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('File size must be less than 5MB');
      return;
    }

    setReceiptFile(file);
    setError('');

    // Create preview for images
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setReceiptPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setReceiptPreview(''); // PDF preview not shown
    }
  };

  const removeReceipt = () => {
    setReceiptFile(null);
    setReceiptPreview('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt < 500) { setError('Minimum deposit is $500'); return; }
    if (amt > 5000000) { setError('Maximum deposit is $5,000,000'); return; }
    setError('');
    setLoading(true);
    try {
      let receiptUrl: string | undefined;

      // Upload receipt file if provided
      if (receiptFile) {
        setUploading(true);
        const fileExt = receiptFile.name.split('.').pop()?.toLowerCase();
        const fileName = `${user.id}_${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('receipts')
          .upload(fileName, receiptFile, { upsert: true });

        if (uploadError) {
          if (uploadError.message.includes('exceeded') || uploadError.message.includes('size'))
            throw new Error('File too large. Maximum size is 5MB.');
          if (uploadError.message.includes('mime') || uploadError.message.includes('type'))
            throw new Error('Invalid file type. Use JPG, PNG, or PDF only.');
          throw new Error(uploadError.message);
        }

        const { data: urlData } = supabase.storage
          .from('receipts')
          .getPublicUrl(fileName);

        receiptUrl = urlData.publicUrl;
        setUploading(false);
      }

      await submitDeposit({
        user_id: user.id,
        amount: amt,
        crypto_currency: currency,
        tx_hash: txHash || undefined,
        wallet_address: address,
        receipt_url: receiptUrl
      });
      await refreshUser();
      setSuccess(true);
      setAmount('');
      setTxHash('');
      setReceiptFile(null);
      setReceiptPreview('');
      setTimeout(() => navigate('/transactions'), 2500);
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      setError(msg || 'Failed to submit. Please try again.');
    } finally {
      setLoading(false);
      setUploading(false);
    }
  };

  if (!user) return <Navigate to="/login" replace />;

  return (
    <div className="min-h-screen ambient-bg text-white pb-tab md:pb-20">
      {/* Header */}
      <section id="deposit-header" className="sticky top-0 z-30"
        style={{ background: 'rgba(10,8,22,0.85)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-xl hover:bg-white/10 transition-colors"
            aria-label="Back"
          >
            <ArrowLeft className="w-5 h-5 text-brand-textMuted" />
          </button>
          <div>
            <h1 className="text-base font-bold text-white">Deposit Funds</h1>
            <p className="text-xs text-brand-textMuted">Fund your account with cryptocurrency</p>
          </div>
        </div>
      </section>

      <section id="deposit-content" className="max-w-lg mx-auto px-4 py-6 space-y-6">

        {/* Success state */}
        {success && (
          <div className="bg-green-500/10 border border-green-500/30 rounded-2xl p-6 text-center">
            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-green-400" />
            </div>
            <h2 className="text-white font-bold text-xl mb-1">Deposit Submitted!</h2>
            <p className="text-brand-textMuted text-sm">Your deposit is under review. Redirecting you back…</p>
          </div>
        )}

        {!success && (
          <>
            {/* Minimum deposit banner */}
            <div className="bg-gradient-to-r from-brand-success/15 to-brand-success/5 border border-brand-success/30 rounded-2xl p-4 flex items-center gap-3">
              <div className="w-10 h-10 bg-brand-success/20 rounded-xl flex items-center justify-center shrink-0">
                <span className="text-brand-success font-black text-lg">$</span>
              </div>
              <div>
                <p className="text-white font-bold text-sm">Minimum Deposit: $500</p>
                <p className="text-brand-textMuted text-xs mt-0.5">Your deposit will be credited once an admin approves the transaction.</p>
              </div>
            </div>
            {/* Step 1 — Choose crypto */}
            <div className="rounded-2xl p-5" style={{ background: 'rgba(16,14,30,0.95)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <p className="text-xs text-brand-textMuted uppercase tracking-widest mb-3 font-semibold">Step 1 — Choose Currency</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {Object.keys(cryptoAddresses).map(c => (
                  <button
                    key={c}
                    onClick={() => setCurrency(c)}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                      currency === c ? 'text-white' : 'text-brand-textMuted hover:text-white'
                    }`}
                    style={currency === c
                      ? { background: 'linear-gradient(135deg, rgba(239,68,68,0.2) 0%, rgba(220,38,38,0.1) 100%)', border: '1px solid rgba(239,68,68,0.4)', color: '#EF4444' }
                      : { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }
                    }
                  >
                    <span className="text-base">{cryptoIcons[c]}</span>
                    <span className="truncate">{c}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Step 2 — Send to address */}
            <div className="rounded-2xl p-5" style={{ background: 'rgba(16,14,30,0.95)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <p className="text-xs text-brand-textMuted uppercase tracking-widest mb-4 font-semibold">Step 2 — Send to This Address</p>
              <div className="flex justify-center mb-4">
                <div className="p-3 bg-white rounded-2xl shadow-card">
                  <QRCodeSVG value={address} size={160} />
                </div>
              </div>
              <div className="flex items-center gap-2 bg-brand-surface rounded-xl px-3 py-2.5" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <span className="text-xs text-white font-mono flex-1 break-all leading-relaxed">{address}</span>
                <button
                  onClick={handleCopy}
                  className={`shrink-0 p-1.5 rounded-lg transition-all ${copied ? 'text-green-400 bg-green-400/10' : 'text-brand-textMuted hover:text-white hover:bg-white/10'}`}
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
              <div className="flex items-start gap-2 mt-3 p-3 bg-yellow-500/5 border border-yellow-500/20 rounded-xl">
                <AlertTriangle className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
                <p className="text-[11px] text-yellow-300/80">
                  Only send <strong>{currency}</strong> to this address. Sending any other asset will result in permanent loss.
                </p>
              </div>
            </div>

            {/* Step 3 — Submit */}
            <form onSubmit={handleSubmit}>
              <div className="rounded-2xl p-5 space-y-4" style={{ background: 'rgba(16,14,30,0.95)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <p className="text-xs text-brand-textMuted uppercase tracking-widest font-semibold">Step 3 — Confirm Your Deposit</p>

                <div>
                  <label className="text-xs text-brand-textMuted mb-1.5 block">Amount (USD equivalent)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-textMuted font-semibold">$</span>
                    <input
                      type="number"
                      min="500"
                      max="5000000"
                      value={amount}
                      onChange={e => setAmount(e.target.value)}
                      placeholder="500.00"
                      required
                      className="w-full bg-brand-surface border border-brand-border rounded-xl pl-7 pr-4 py-3 text-white text-sm placeholder:text-brand-textMuted focus:outline-none focus:border-brand-success transition-colors"
                    />
                  </div>
                  <p className="text-[10px] text-brand-textMuted mt-1">Min: $500 · Max: $5,000,000</p>
                </div>

                <div>
                  <label className="text-xs text-brand-textMuted mb-1.5 block">Transaction Hash <span className="text-brand-textMuted/60">(optional)</span></label>
                  <input
                    type="text"
                    value={txHash}
                    onChange={e => setTxHash(e.target.value)}
                    placeholder="Paste your tx hash here"
                    className="w-full bg-brand-surface border border-brand-border rounded-xl px-3 py-3 text-white text-sm font-mono placeholder:text-brand-textMuted focus:outline-none focus:border-brand-success transition-colors"
                  />
                </div>

                {/* Upload Receipt */}
                <div>
                  <label className="text-xs text-brand-textMuted mb-1.5 block">Upload Deposit Proof <span className="text-brand-textMuted/60">(optional)</span></label>
                  
                  {!receiptFile ? (
                    <label className="w-full flex items-center justify-center gap-2 bg-brand-surface border-2 border-dashed border-brand-border hover:border-brand-success/50 rounded-xl px-4 py-6 cursor-pointer transition-all group">
                      <input
                        type="file"
                        accept="image/jpeg,image/jpg,image/png,application/pdf"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                      <Upload className="w-5 h-5 text-brand-textMuted group-hover:text-brand-success transition-colors" />
                      <span className="text-sm text-brand-textMuted group-hover:text-white transition-colors">
                        Choose JPG, PNG or PDF
                      </span>
                    </label>
                  ) : (
                    <div className="bg-brand-surface border border-brand-border rounded-xl p-3 space-y-3">
                      {receiptPreview && (
                        <img 
                          src={receiptPreview} 
                          alt="Receipt preview" 
                          className="w-full h-40 object-cover rounded-lg"
                        />
                      )}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="shrink-0 w-8 h-8 rounded-lg bg-brand-success/10 flex items-center justify-center">
                            <Check className="w-4 h-4 text-brand-success" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-medium text-white truncate">{receiptFile.name}</p>
                            <p className="text-[10px] text-brand-textMuted">
                              {(receiptFile.size / 1024).toFixed(1)} KB
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={removeReceipt}
                          className="shrink-0 w-7 h-7 rounded-lg bg-red-400/10 hover:bg-red-400/20 flex items-center justify-center transition-colors"
                        >
                          <X className="w-3.5 h-3.5 text-red-400" />
                        </button>
                      </div>
                    </div>
                  )}
                  <p className="text-[10px] text-brand-textMuted mt-1">Max file size: 5MB</p>
                </div>

                {error && (
                  <div className="flex items-center gap-2 text-red-400 text-xs bg-red-400/10 px-3 py-2 rounded-lg border border-red-400/20">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || uploading}
                  className="w-full py-3.5 rounded-2xl font-bold text-sm text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  style={{ background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)', boxShadow: '0 4px 20px rgba(239,68,68,0.25)' }}
                >
                  {uploading ? 'Uploading Receipt…' : loading ? 'Submitting…' : 'Submit Deposit'}
                </button>
              </div>
            </form>
          </>
        )}
      </section>
    </div>
  );
}
