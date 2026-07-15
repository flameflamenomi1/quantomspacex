import { useState } from 'react';
import { ShieldCheck, Upload, CheckCircle, AlertCircle, Camera, CreditCard, FileText } from 'lucide-react';
import { submitKyc } from '@/lib/db';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import type { KycStatus } from '@/lib/db';

interface Props {
  kycStatus: KycStatus;
  onSubmitted: () => void;
}

type IdType = 'passport' | 'national_id' | 'drivers_license';

const STEPS = ['Personal Info', 'ID Document', 'Selfie', 'Review'];

export default function KycForm({ kycStatus, onSubmitted }: Props) {
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    full_name: user?.full_name || '',
    date_of_birth: '',
    nationality: '',
    id_type: 'passport' as IdType,
    id_number: '',
  });

  const [files, setFiles] = useState<{
    id_front: File | null;
    id_back: File | null;
    selfie: File | null;
  }>({ id_front: null, id_back: null, selfie: null });

  const [previews, setPreviews] = useState<{
    id_front: string;
    id_back: string;
    selfie: string;
  }>({ id_front: '', id_back: '', selfie: '' });

  const handleFile = (field: 'id_front' | 'id_back' | 'selfie', file: File | null) => {
    if (!file) return;
    setFiles(f => ({ ...f, [field]: file }));
    const url = URL.createObjectURL(file);
    setPreviews(p => ({ ...p, [field]: url }));
  };

  const uploadFile = async (file: File, path: string): Promise<string> => {
    try {
      const { error } = await supabase.storage.from('kyc-documents').upload(path, file, { upsert: true });
      if (error) {
        console.warn('Upload warning:', error.message);
        // Still return empty string — don't block the KYC submission
        return '';
      }
      const { data } = supabase.storage.from('kyc-documents').getPublicUrl(path);
      return data.publicUrl;
    } catch {
      return '';
    }
  };

  const handleSubmit = async () => {
    if (!user) return;
    setLoading(true);
    setError('');
    try {
      const ts = Date.now();
      const base = `${user.id}/${ts}`;
      const [frontUrl, backUrl, selfieUrl] = await Promise.all([
        files.id_front ? uploadFile(files.id_front, `${base}-front`) : Promise.resolve(''),
        files.id_back ? uploadFile(files.id_back, `${base}-back`) : Promise.resolve(''),
        files.selfie ? uploadFile(files.selfie, `${base}-selfie`) : Promise.resolve(''),
      ]);
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
      onSubmitted();
    } catch (e) {
      console.error('KYC submit error:', e);
      setError('Submission failed. Please try again.');
      console.error(e);
    }
    setLoading(false);
  };

  // Status display states
  if (kycStatus === 'approved') {
    return (
      <div className="bg-brand-card border border-brand-border rounded-xl p-6 text-center">
        <div className="w-14 h-14 bg-brand-success/10 border border-brand-success/30 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-7 h-7 text-brand-success" />
        </div>
        <h2 className="font-semibold text-white text-lg mb-1">Identity Verified</h2>
        <p className="text-brand-textMuted text-sm">Your KYC has been approved. Your account is fully verified.</p>
      </div>
    );
  }

  if (kycStatus === 'pending') {
    return (
      <div className="bg-brand-card border border-brand-border rounded-xl p-6 text-center">
        <div className="w-14 h-14 bg-yellow-500/10 border border-yellow-500/30 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-7 h-7 text-yellow-400" />
        </div>
        <h2 className="font-semibold text-white text-lg mb-1">Under Review</h2>
        <p className="text-brand-textMuted text-sm">Your documents are being reviewed. We'll notify you within 24 hours.</p>
      </div>
    );
  }

  if (kycStatus === 'rejected') {
    return (
      <div className="bg-brand-card border border-brand-border rounded-xl p-6">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-10 h-10 bg-brand-danger/10 border border-brand-danger/30 rounded-full flex items-center justify-center">
            <AlertCircle className="w-5 h-5 text-brand-danger" />
          </div>
          <div>
            <h2 className="font-semibold text-white">Verification Rejected</h2>
            <p className="text-brand-textMuted text-xs">Please resubmit with valid documents.</p>
          </div>
        </div>
        <button
          onClick={() => setStep(0)}
          className="w-full bg-brand-success text-brand-bg font-bold py-2.5 rounded-lg text-sm hover:bg-red-700 transition-colors"
        >
          Resubmit KYC
        </button>
      </div>
    );
  }

  // Progress bar

  return (
    <div className="bg-brand-card border border-brand-border rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-brand-border">
        <div className="flex items-center space-x-3 mb-3">
          <ShieldCheck className="w-5 h-5 text-brand-success" />
          <h2 className="font-semibold text-white">Identity Verification (KYC)</h2>
        </div>
        {/* Step progress */}
        <div className="flex items-center space-x-2 mb-2">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center">
              <div className={`flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-bold transition-all ${
                i < step ? 'bg-brand-success text-brand-bg' :
                i === step ? 'bg-brand-success/20 border border-brand-success text-brand-success' :
                'bg-brand-bg border border-brand-border text-brand-textMuted'
              }`}>
                {i < step ? '✓' : i + 1}
              </div>
              {i < STEPS.length - 1 && (
                <div className={`w-8 h-px mx-1 ${i < step ? 'bg-brand-success' : 'bg-brand-border'}`} />
              )}
            </div>
          ))}
          <span className="ml-2 text-xs text-brand-textMuted">{STEPS[step]}</span>
        </div>
      </div>

      <div className="p-6">
        {/* Step 0: Personal Info */}
        {step === 0 && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-brand-textMuted uppercase tracking-wider mb-1.5">Full Legal Name *</label>
                <input
                  value={form.full_name}
                  onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
                  placeholder="As on your ID"
                  className="w-full bg-brand-bg border border-brand-border rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-brand-success"
                />
              </div>
              <div>
                <label className="block text-xs text-brand-textMuted uppercase tracking-wider mb-1.5">Date of Birth *</label>
                <input
                  type="date"
                  value={form.date_of_birth}
                  onChange={e => setForm(f => ({ ...f, date_of_birth: e.target.value }))}
                  className="w-full bg-brand-bg border border-brand-border rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-brand-success"
                />
              </div>
              <div>
                <label className="block text-xs text-brand-textMuted uppercase tracking-wider mb-1.5">Nationality *</label>
                <input
                  value={form.nationality}
                  onChange={e => setForm(f => ({ ...f, nationality: e.target.value }))}
                  placeholder="e.g. American"
                  className="w-full bg-brand-bg border border-brand-border rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-brand-success"
                />
              </div>
              <div>
                <label className="block text-xs text-brand-textMuted uppercase tracking-wider mb-1.5">ID Type *</label>
                <select
                  value={form.id_type}
                  onChange={e => setForm(f => ({ ...f, id_type: e.target.value as IdType }))}
                  className="w-full bg-brand-bg border border-brand-border rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-brand-success"
                >
                  <option value="passport">Passport</option>
                  <option value="national_id">National ID</option>
                  <option value="drivers_license">Driver's License</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs text-brand-textMuted uppercase tracking-wider mb-1.5">ID Number *</label>
                <input
                  value={form.id_number}
                  onChange={e => setForm(f => ({ ...f, id_number: e.target.value }))}
                  placeholder="Document number"
                  className="w-full bg-brand-bg border border-brand-border rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-brand-success"
                />
              </div>
            </div>
            <button
              onClick={() => {
                if (!form.full_name || !form.date_of_birth || !form.nationality || !form.id_number) {
                  setError('Please fill in all fields.'); return;
                }
                setError(''); setStep(1);
              }}
              className="w-full bg-brand-success text-brand-bg font-bold py-2.5 rounded-lg text-sm hover:bg-red-700 transition-colors"
            >
              Continue →
            </button>
          </div>
        )}

        {/* Step 1: ID Document Upload */}
        {step === 1 && (
          <div className="space-y-4">
            <p className="text-sm text-brand-textMuted">Upload a clear photo of your <strong className="text-white">{form.id_type.replace('_', ' ')}</strong>.</p>
            <div className="grid grid-cols-2 gap-4">
              {(['id_front', 'id_back'] as const).map(field => (
                <div key={field}>
                  <label className="block text-xs text-brand-textMuted uppercase tracking-wider mb-2">
                    {field === 'id_front' ? <><CreditCard className="inline w-3 h-3 mr-1" />Front Side</> : <><FileText className="inline w-3 h-3 mr-1" />Back Side</>}
                  </label>
                  <label className={`flex flex-col items-center justify-center aspect-[3/2] rounded-xl border-2 border-dashed cursor-pointer transition-all hover:border-brand-success/60 ${
                    previews[field] ? 'border-brand-success/40' : 'border-brand-border'
                  }`}>
                    {previews[field] ? (
                      <img src={previews[field]} alt={field} className="w-full h-full object-cover rounded-xl" />
                    ) : (
                      <div className="text-center p-4">
                        <Upload className="w-6 h-6 text-brand-textMuted mx-auto mb-2" />
                        <span className="text-xs text-brand-textMuted">Click to upload</span>
                      </div>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={e => handleFile(field, e.target.files?.[0] || null)}
                    />
                  </label>
                </div>
              ))}
            </div>
            <div className="flex space-x-3">
              <button onClick={() => setStep(0)} className="flex-1 border border-brand-border text-brand-textMuted py-2.5 rounded-lg hover:text-white text-sm transition-colors">
                Back
              </button>
              <button
                onClick={() => {
                  if (!files.id_front) { setError('Please upload front of ID.'); return; }
                  setError(''); setStep(2);
                }}
                className="flex-1 bg-brand-success text-brand-bg font-bold py-2.5 rounded-lg text-sm hover:bg-red-700 transition-colors"
              >
                Continue →
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Selfie */}
        {step === 2 && (
          <div className="space-y-4">
            <p className="text-sm text-brand-textMuted">Upload a clear selfie photo of your face.</p>
            <label className={`flex flex-col items-center justify-center h-48 rounded-xl border-2 border-dashed cursor-pointer transition-all hover:border-brand-success/60 ${
              previews.selfie ? 'border-brand-success/40' : 'border-brand-border'
            }`}>
              {previews.selfie ? (
                <img src={previews.selfie} alt="selfie" className="h-full object-cover rounded-xl" />
              ) : (
                <div className="text-center p-4">
                  <Camera className="w-10 h-10 text-brand-textMuted mx-auto mb-2" />
                  <span className="text-sm text-brand-textMuted">Click to upload selfie</span>
                  <p className="text-xs text-brand-textMuted mt-1">Clear photo of your face, no sunglasses</p>
                </div>
              )}
              <input type="file" accept="image/*" className="hidden" onChange={e => handleFile('selfie', e.target.files?.[0] || null)} />
            </label>
            <div className="flex space-x-3">
              <button onClick={() => setStep(1)} className="flex-1 border border-brand-border text-brand-textMuted py-2.5 rounded-lg hover:text-white text-sm transition-colors">
                Back
              </button>
              <button
                onClick={() => {
                  if (!files.selfie) { setError('Please upload a selfie.'); return; }
                  setError(''); setStep(3);
                }}
                className="flex-1 bg-brand-success text-brand-bg font-bold py-2.5 rounded-lg text-sm hover:bg-red-700 transition-colors"
              >
                Review →
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Review & Submit */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="bg-brand-bg border border-brand-border rounded-xl p-4 space-y-2 text-sm">
              {[
                ['Name', form.full_name],
                ['Date of Birth', form.date_of_birth],
                ['Nationality', form.nationality],
                ['ID Type', form.id_type.replace('_', ' ')],
                ['ID Number', form.id_number],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between">
                  <span className="text-brand-textMuted">{label}</span>
                  <span className="text-white capitalize">{value}</span>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-2">
              {previews.id_front && <img src={previews.id_front} alt="front" className="rounded-lg border border-brand-border aspect-[3/2] object-cover" />}
              {previews.id_back && <img src={previews.id_back} alt="back" className="rounded-lg border border-brand-border aspect-[3/2] object-cover" />}
              {previews.selfie && <img src={previews.selfie} alt="selfie" className="rounded-lg border border-brand-border aspect-[3/2] object-cover" />}
            </div>
            {error && <div className="text-brand-danger text-sm bg-brand-danger/10 border border-brand-danger/30 rounded-lg px-4 py-2">{error}</div>}
            <div className="flex space-x-3">
              <button onClick={() => setStep(2)} className="flex-1 border border-brand-border text-brand-textMuted py-2.5 rounded-lg hover:text-white text-sm transition-colors">
                Back
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="flex-1 bg-brand-success text-brand-bg font-bold py-2.5 rounded-lg text-sm hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center space-x-2"
              >
                {loading ? <div className="w-4 h-4 border-2 border-brand-bg border-t-transparent rounded-full animate-spin" /> : <><ShieldCheck className="w-4 h-4" /><span>Submit KYC</span></>}
              </button>
            </div>
          </div>
        )}

        {error && step < 3 && (
          <p className="text-brand-danger text-xs mt-2">{error}</p>
        )}
      </div>
    </div>
  );
}
