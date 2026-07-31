import { useState, useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import {
  ArrowLeft,
  ShieldCheck,
  User,
  CreditCard,
  Camera,
  CheckCircle,
  Upload,
  AlertTriangle,
  FileText,
  Clock,
  XCircle,
  BadgeCheck,
} from 'lucide-react';
import { submitKyc, getLatestKycSubmission } from '@/lib/db';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import type { KycStatus } from '@/lib/db';

type IdType = 'passport' | 'national_id' | 'drivers_license';

const STEPS = [
  { label: 'Personal Info', icon: User },
  { label: 'ID Document', icon: CreditCard },
  { label: 'Selfie', icon: Camera },
  { label: 'Review', icon: ShieldCheck },
];

function UploadZone({
  label,
  hint,
  preview,
  accept,
  onChange,
}: {
  label: string;
  hint: string;
  preview: string;
  accept: string;
  onChange: (f: File) => void;
}) {
  return (
    <label className="block cursor-pointer">
      <span className="text-xs text-brand-textMuted uppercase tracking-widest font-semibold block mb-2">{label}</span>
      <div
        className={`relative rounded-2xl border-2 border-dashed transition-all overflow-hidden
          ${preview ? 'border-green-500/40 bg-green-500/5' : 'border-brand-border hover:border-brand-success/50 bg-brand-surface'}`}
        style={{ minHeight: 140 }}
      >
        {preview ? (
          <>
            <img src={preview} alt={label} className="w-full h-40 object-cover" />
            <div className="absolute top-2 right-2 bg-green-500 rounded-full p-1">
              <CheckCircle className="w-3.5 h-3.5 text-white" />
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center gap-2 p-6 h-full min-h-[140px]">
            <Upload className="w-7 h-7 text-brand-textMuted" />
            <span className="text-sm text-brand-textMuted text-center">{hint}</span>
            <span className="text-xs text-brand-textMuted/60">JPG, PNG, PDF · Max 10 MB</span>
          </div>
        )}
        <input
          type="file"
          accept={accept}
          className="absolute inset-0 opacity-0 cursor-pointer"
          onChange={e => e.target.files?.[0] && onChange(e.target.files[0])}
        />
      </div>
    </label>
  );
}

function StatusCard({ status }: { status: KycStatus }) {
  const configs: Record<KycStatus, { icon: React.ReactNode; title: string; desc: string; color: string; bg: string }> = {
    pending: {
      icon: <Clock className="w-8 h-8 text-yellow-400" />,
      title: 'Verification Under Review',
      desc: 'Your documents have been submitted and are being reviewed by our compliance team. This typically takes 1–2 business days.',
      color: 'text-yellow-400',
      bg: 'bg-yellow-400/10 border-yellow-400/20',
    },
    approved: {
      icon: <BadgeCheck className="w-8 h-8 text-green-400" />,
      title: 'Identity Verified',
      desc: 'Your account is fully verified. You have access to all platform features and higher withdrawal limits.',
      color: 'text-green-400',
      bg: 'bg-green-400/10 border-green-400/20',
    },
    rejected: {
      icon: <XCircle className="w-8 h-8 text-red-400" />,
      title: 'Verification Rejected',
      desc: 'Your submission was rejected. Please review the requirements below and resubmit with clearer documents.',
      color: 'text-red-400',
      bg: 'bg-red-400/10 border-red-400/20',
    },
    unverified: {
      icon: <ShieldCheck className="w-8 h-8 text-brand-textMuted" />,
      title: '',
      desc: '',
      color: '',
      bg: '',
    },
  };
  const c = configs[status];
  if (status === 'unverified') return null;
  return (
    <div className={`rounded-2xl border p-5 flex items-start gap-4 ${c.bg}`}>
      {c.icon}
      <div>
        <h3 className={`font-bold text-base ${c.color}`}>{c.title}</h3>
        <p className="text-brand-textMuted text-sm mt-1 leading-relaxed">{c.desc}</p>
      </div>
    </div>
  );
}

export default function KYCPage() {
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();

  // The KYC status shown to the user must reflect the LATEST submission row,
  // not just the cached `users.kyc_status` (which can be stale in
  // localStorage after a resubmit, or if the admin actioned an old row). We
  // start from the cached value for instant paint, then reconcile against the
  // freshest kyc_submissions row on mount and after every submit.
  const [kycStatus, setKycStatus] = useState<KycStatus>(user?.kyc_status ?? 'unverified');

  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  // Reconcile local state with what's actually in the DB. If the user has any
  // submission on file, the *latest* one is the source of truth for their
  // real status; users.kyc_status is only the fallback for a user who has
  // never submitted.
  const reconcileStatus = async () => {
    if (!user) return;
    try {
      const latest = await getLatestKycSubmission(user.id);
      if (latest) {
        setKycStatus(latest.status as KycStatus);
      } else {
        setKycStatus(user.kyc_status ?? 'unverified');
      }
    } catch {
      setKycStatus(user.kyc_status ?? 'unverified');
    }
  };

  useEffect(() => {
    reconcileStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Follow live changes: when the user row updates OR any of their
  // kyc_submissions rows change, re-derive the real status.
  useEffect(() => {
    if (!user?.id) return;
    const userChannel = supabase
      .channel(`kyc-page-user-${user.id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'users', filter: `id=eq.${user.id}` }, () => {
        reconcileStatus();
      })
      .subscribe();
    const subChannel = supabase
      .channel(`kyc-page-subs-${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'kyc_submissions', filter: `user_id=eq.${user.id}` }, () => {
        reconcileStatus();
      })
      .subscribe();
    return () => {
      supabase.removeChannel(userChannel);
      supabase.removeChannel(subChannel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const [form, setForm] = useState({
    full_name: user?.full_name || '',
    date_of_birth: '',
    nationality: '',
    id_type: 'passport' as IdType,
    id_number: '',
  });

  const [files, setFiles] = useState<{ id_front: File | null; id_back: File | null; selfie: File | null }>({
    id_front: null, id_back: null, selfie: null,
  });

  const [previews, setPreviews] = useState({ id_front: '', id_back: '', selfie: '' });

  const handleFile = (field: 'id_front' | 'id_back' | 'selfie', file: File) => {
    setFiles(f => ({ ...f, [field]: file }));
    setPreviews(p => ({ ...p, [field]: URL.createObjectURL(file) }));
  };

  const uploadFile = async (file: File, path: string): Promise<string> => {
    const { error } = await supabase.storage.from('kyc-documents').upload(path, file, { upsert: true });
    if (error) throw new Error(`File upload failed: ${error.message}`);
    return supabase.storage.from('kyc-documents').getPublicUrl(path).data.publicUrl;
  };

  const handleSubmit = async () => {
    if (!user) return;
    setLoading(true);
    setError('');
    try {
      const ts = Date.now();
      const base = `${user.id}/${ts}`;

      let frontUrl = '', backUrl = '', selfieUrl = '';
      try {
        if (files.id_front) frontUrl = await uploadFile(files.id_front, `${base}-front.${files.id_front.name.split('.').pop()}`);
        if (files.id_back) backUrl = await uploadFile(files.id_back, `${base}-back.${files.id_back.name.split('.').pop()}`);
        if (files.selfie) selfieUrl = await uploadFile(files.selfie, `${base}-selfie.${files.selfie.name.split('.').pop()}`);
      } catch (uploadErr) {
        const msg = uploadErr instanceof Error ? uploadErr.message : 'Unknown upload error';
        if (msg.includes('exceeded')) setError('File too large. Maximum size is 10MB per document.');
        else if (msg.includes('mime') || msg.includes('type')) setError('Invalid file type. Please use JPG, PNG, WEBP, or PDF.');
        else if (msg.includes('permission') || msg.includes('policy')) setError('Upload permission denied. Please try again or contact support.');
        else setError(`Upload failed: ${msg}`);
        return;
      }

      await submitKyc({
        user_id: user.id,
        full_name: form.full_name,
        date_of_birth: form.date_of_birth,
        nationality: form.nationality,
        id_type: form.id_type,
        id_number: form.id_number,
        id_front_url: frontUrl,
        id_back_url: backUrl,
        selfie_url: selfieUrl,
      });
      // Force the local status to 'pending' immediately so the confirmation
      // UI can never be defeated by a stale cached 'rejected' value, then
      // reconcile from the DB and refresh the cached user session.
      setKycStatus('pending');
      await refreshUser();
      await reconcileStatus();
      setSubmitted(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      if (msg.includes('duplicate') || msg.includes('already')) setError('A KYC submission already exists. Please contact support to update.');
      else setError('Submission failed. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const canProceedStep0 = form.full_name && form.date_of_birth && form.nationality && form.id_number;
  const canProceedStep1 = files.id_front;
  const canProceedStep2 = files.selfie;

  if (!user) return <Navigate to="/login" replace />;

  return (
    <div className="min-h-screen bg-brand-bg text-white pb-tab md:pb-20">
      {/* Header */}
      <section id="kyc-header" className="border-b border-brand-border bg-brand-card/40 backdrop-blur-sm sticky top-0 z-30">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 rounded-lg hover:bg-white/10 transition-colors" aria-label="Back">
            <ArrowLeft className="w-5 h-5 text-brand-textMuted" />
          </button>
          <div>
            <h1 className="text-base font-bold text-white">Identity Verification</h1>
            <p className="text-xs text-brand-textMuted">KYC · Secure & Encrypted</p>
          </div>
        </div>
      </section>

      <section id="kyc-content" className="max-w-lg mx-auto px-4 py-6 space-y-6">

        {/* Already submitted/approved/rejected */}
        {(submitted || (kycStatus !== 'unverified' && kycStatus !== 'rejected')) && (
          <>
            <StatusCard status={submitted ? 'pending' : kycStatus} />
            {(kycStatus === 'approved') && (
              <button onClick={() => navigate('/dashboard')} className="w-full py-3.5 rounded-xl font-bold bg-brand-success text-white hover:bg-red-700 transition-all text-sm">
                Back to Dashboard
              </button>
            )}
          </>
        )}

        {/* Show form for unverified or rejected */}
        {!submitted && (kycStatus === 'unverified' || kycStatus === 'rejected') && (
          <>
            {kycStatus === 'rejected' && <StatusCard status="rejected" />}

            {/* Why verify banner */}
            <div className="bg-brand-card border border-brand-border rounded-2xl p-4 flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-brand-success shrink-0 mt-0.5" />
              <div>
                <p className="text-white font-semibold text-sm">Why verify your identity?</p>
                <p className="text-brand-textMuted text-xs mt-1 leading-relaxed">
                  KYC verification unlocks higher withdrawal limits, protects your account, and ensures regulatory compliance across all jurisdictions.
                </p>
              </div>
            </div>

            {/* Step indicators */}
            <div className="flex items-center gap-1">
              {STEPS.map((s, i) => {
                const Icon = s.icon;
                const isActive = i === step;
                const isDone = i < step;
                return (
                  <div key={s.label} className="flex items-center flex-1 min-w-0">
                    <div className={`flex flex-col items-center gap-1 flex-1 min-w-0`}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all ${
                        isDone ? 'bg-brand-success border-brand-success' :
                        isActive ? 'border-brand-success bg-brand-success/10' :
                        'border-brand-border bg-brand-surface'
                      }`}>
                        {isDone
                          ? <CheckCircle className="w-4 h-4 text-white" />
                          : <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-brand-success' : 'text-brand-textMuted'}`} />
                        }
                      </div>
                      <span className={`text-[9px] font-semibold truncate w-full text-center ${isActive ? 'text-brand-success' : isDone ? 'text-green-400' : 'text-brand-textMuted'}`}>
                        {s.label}
                      </span>
                    </div>
                    {i < STEPS.length - 1 && (
                      <div className={`h-0.5 flex-1 mx-1 rounded transition-all ${i < step ? 'bg-brand-success' : 'bg-brand-border'}`} />
                    )}
                  </div>
                );
              })}
            </div>

            {/* STEP 0 — Personal Info */}
            {step === 0 && (
              <div className="bg-brand-card rounded-2xl border border-brand-border p-5 space-y-4">
                <h2 className="text-white font-bold text-base flex items-center gap-2">
                  <User className="w-4 h-4 text-brand-success" /> Personal Information
                </h2>

                <div>
                  <label className="text-xs text-brand-textMuted uppercase tracking-widest font-semibold block mb-1.5">Full Legal Name *</label>
                  <input
                    value={form.full_name}
                    onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
                    placeholder="As it appears on your ID"
                    className="w-full bg-brand-surface border border-brand-border rounded-xl px-3 py-3 text-white text-sm placeholder:text-brand-textMuted focus:outline-none focus:border-brand-success transition-colors"
                  />
                </div>

                <div>
                  <label className="text-xs text-brand-textMuted uppercase tracking-widest font-semibold block mb-1.5">Date of Birth *</label>
                  <input
                    type="date"
                    value={form.date_of_birth}
                    onChange={e => setForm(f => ({ ...f, date_of_birth: e.target.value }))}
                    className="w-full bg-brand-surface border border-brand-border rounded-xl px-3 py-3 text-white text-sm focus:outline-none focus:border-brand-success transition-colors [color-scheme:dark]"
                  />
                </div>

                <div>
                  <label className="text-xs text-brand-textMuted uppercase tracking-widest font-semibold block mb-1.5">Nationality *</label>
                  <input
                    value={form.nationality}
                    onChange={e => setForm(f => ({ ...f, nationality: e.target.value }))}
                    placeholder="e.g. American, British, Nigerian"
                    className="w-full bg-brand-surface border border-brand-border rounded-xl px-3 py-3 text-white text-sm placeholder:text-brand-textMuted focus:outline-none focus:border-brand-success transition-colors"
                  />
                </div>

                <div>
                  <label className="text-xs text-brand-textMuted uppercase tracking-widest font-semibold block mb-1.5">Document Type *</label>
                  <select
                    value={form.id_type}
                    onChange={e => setForm(f => ({ ...f, id_type: e.target.value as IdType }))}
                    className="w-full bg-brand-surface border border-brand-border rounded-xl px-3 py-3 text-white text-sm focus:outline-none focus:border-brand-success transition-colors"
                  >
                    <option value="passport">Passport</option>
                    <option value="national_id">National ID</option>
                    <option value="drivers_license">Driver's License</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs text-brand-textMuted uppercase tracking-widest font-semibold block mb-1.5">Document Number *</label>
                  <input
                    value={form.id_number}
                    onChange={e => setForm(f => ({ ...f, id_number: e.target.value }))}
                    placeholder="e.g. A12345678"
                    className="w-full bg-brand-surface border border-brand-border rounded-xl px-3 py-3 text-white text-sm placeholder:text-brand-textMuted focus:outline-none focus:border-brand-success transition-colors font-mono"
                  />
                </div>

                {error && <p className="text-red-400 text-xs">{error}</p>}
                <button
                  onClick={() => {
                    if (!canProceedStep0) { setError('Please fill in all required fields.'); return; }
                    setError(''); setStep(1);
                  }}
                  className="w-full py-3.5 rounded-xl font-bold text-sm bg-brand-success text-white hover:bg-red-700 transition-all"
                >
                  Continue
                </button>
              </div>
            )}

            {/* STEP 1 — ID Document */}
            {step === 1 && (
              <div className="bg-brand-card rounded-2xl border border-brand-border p-5 space-y-5">
                <h2 className="text-white font-bold text-base flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-brand-success" /> Upload ID Document
                </h2>
                <div className="p-3 bg-blue-500/5 border border-blue-500/20 rounded-xl flex items-start gap-2">
                  <FileText className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                  <p className="text-[11px] text-blue-300/80">
                    Upload a clear photo of your <strong>{form.id_type.replace('_', ' ')}</strong>. Ensure all text is readable and no corners are cut off.
                  </p>
                </div>

                <UploadZone
                  label="Front of Document *"
                  hint="Tap to upload front side"
                  preview={previews.id_front}
                  accept="image/*,application/pdf"
                  onChange={f => handleFile('id_front', f)}
                />

                {form.id_type !== 'passport' && (
                  <UploadZone
                    label="Back of Document (optional)"
                    hint="Tap to upload back side"
                    preview={previews.id_back}
                    accept="image/*,application/pdf"
                    onChange={f => handleFile('id_back', f)}
                  />
                )}

                {error && <p className="text-red-400 text-xs">{error}</p>}
                <div className="flex gap-3">
                  <button onClick={() => setStep(0)} className="flex-1 py-3 rounded-xl border border-brand-border text-brand-textMuted hover:text-white text-sm transition-colors">
                    Back
                  </button>
                  <button
                    onClick={() => {
                      if (!canProceedStep1) { setError('Please upload the front of your document.'); return; }
                      setError(''); setStep(2);
                    }}
                    className="flex-1 py-3 rounded-xl font-bold text-sm bg-brand-success text-white hover:bg-red-700 transition-all"
                  >
                    Continue
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2 — Selfie */}
            {step === 2 && (
              <div className="bg-brand-card rounded-2xl border border-brand-border p-5 space-y-5">
                <h2 className="text-white font-bold text-base flex items-center gap-2">
                  <Camera className="w-4 h-4 text-brand-success" /> Take a Selfie
                </h2>
                <div className="p-3 bg-yellow-500/5 border border-yellow-500/20 rounded-xl flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
                  <p className="text-[11px] text-yellow-300/80 leading-relaxed">
                    Take a clear selfie holding your ID next to your face. Ensure your face and all document text are clearly visible.
                  </p>
                </div>

                <UploadZone
                  label="Selfie with ID *"
                  hint="Take or upload a selfie holding your ID"
                  preview={previews.selfie}
                  accept="image/*"
                  onChange={f => handleFile('selfie', f)}
                />

                {error && <p className="text-red-400 text-xs">{error}</p>}
                <div className="flex gap-3">
                  <button onClick={() => setStep(1)} className="flex-1 py-3 rounded-xl border border-brand-border text-brand-textMuted hover:text-white text-sm transition-colors">
                    Back
                  </button>
                  <button
                    onClick={() => {
                      if (!canProceedStep2) { setError('Please upload your selfie.'); return; }
                      setError(''); setStep(3);
                    }}
                    className="flex-1 py-3 rounded-xl font-bold text-sm bg-brand-success text-white hover:bg-red-700 transition-all"
                  >
                    Review
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3 — Review & Submit */}
            {step === 3 && (
              <div className="bg-brand-card rounded-2xl border border-brand-border p-5 space-y-5">
                <h2 className="text-white font-bold text-base flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-brand-success" /> Review & Submit
                </h2>

                {/* Personal info summary */}
                <div className="bg-brand-surface rounded-xl border border-brand-border divide-y divide-brand-border overflow-hidden">
                  {[
                    ['Full Name', form.full_name],
                    ['Date of Birth', form.date_of_birth],
                    ['Nationality', form.nationality],
                    ['ID Type', form.id_type.replace('_', ' ')],
                    ['ID Number', form.id_number],
                  ].map(([label, value]) => (
                    <div key={label} className="flex justify-between items-center px-4 py-2.5">
                      <span className="text-brand-textMuted text-xs">{label}</span>
                      <span className="text-white text-xs font-medium capitalize">{value}</span>
                    </div>
                  ))}
                </div>

                {/* Document previews */}
                <div className="grid grid-cols-3 gap-2">
                  {previews.id_front && (
                    <div className="relative">
                      <img src={previews.id_front} alt="ID Front" className="w-full aspect-[3/2] object-cover rounded-xl border border-brand-border" />
                      <span className="absolute bottom-1 left-1 text-[9px] bg-black/70 text-white px-1.5 py-0.5 rounded">Front</span>
                    </div>
                  )}
                  {previews.id_back && (
                    <div className="relative">
                      <img src={previews.id_back} alt="ID Back" className="w-full aspect-[3/2] object-cover rounded-xl border border-brand-border" />
                      <span className="absolute bottom-1 left-1 text-[9px] bg-black/70 text-white px-1.5 py-0.5 rounded">Back</span>
                    </div>
                  )}
                  {previews.selfie && (
                    <div className="relative">
                      <img src={previews.selfie} alt="Selfie" className="w-full aspect-[3/2] object-cover rounded-xl border border-brand-border" />
                      <span className="absolute bottom-1 left-1 text-[9px] bg-black/70 text-white px-1.5 py-0.5 rounded">Selfie</span>
                    </div>
                  )}
                </div>

                <div className="p-3 bg-brand-success/5 border border-brand-success/20 rounded-xl flex items-start gap-2">
                  <ShieldCheck className="w-4 h-4 text-brand-success shrink-0 mt-0.5" />
                  <p className="text-[11px] text-brand-textMuted leading-relaxed">
                    By submitting, you confirm all information is accurate. Review typically takes <strong className="text-white">1–2 business days</strong>.
                  </p>
                </div>

                {error && (
                  <div className="flex items-center gap-2 text-red-400 text-xs bg-red-400/10 px-3 py-2 rounded-lg border border-red-400/20">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> {error}
                  </div>
                )}

                <div className="flex gap-3">
                  <button onClick={() => setStep(2)} className="flex-1 py-3 rounded-xl border border-brand-border text-brand-textMuted hover:text-white text-sm transition-colors">
                    Back
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={loading}
                    className="flex-1 py-3 rounded-xl font-bold text-sm bg-brand-success text-white hover:bg-red-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {loading
                      ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Submitting…</>
                      : <><ShieldCheck className="w-4 h-4" /> Submit KYC</>
                    }
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
