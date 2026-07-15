import { useState, useRef } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { User, Lock, Phone, Globe, Save, CheckCircle, LogOut, ShieldCheck, Eye, EyeOff, AlertTriangle, Camera, Upload, LogIn } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';

const COUNTRIES = [
  'United States', 'United Kingdom', 'Canada', 'Australia', 'Germany',
  'France', 'Japan', 'Singapore', 'UAE', 'South Africa', 'Nigeria', 'India', 'Brazil', 'Other'
];

type Section = 'profile' | 'password' | 'security';

function SectionCard({ title, description, icon: Icon, children }: {
  title: string; description: string; icon: React.ElementType; children: React.ReactNode;
}) {
  return (
    <div className="bg-brand-card border border-brand-border rounded-xl overflow-hidden">
      <div className="px-6 py-5 border-b border-brand-border flex items-center space-x-3">
        <div className="w-9 h-9 bg-brand-success/10 border border-brand-success/20 rounded-lg flex items-center justify-center">
          <Icon className="w-4 h-4 text-brand-success" />
        </div>
        <div>
          <h2 className="font-semibold text-white text-sm">{title}</h2>
          <p className="text-xs text-brand-textMuted">{description}</p>
        </div>
      </div>
      <div className="px-6 py-5">{children}</div>
    </div>
  );
}

function Toast({ message, type }: { message: string; type: 'success' | 'error' }) {
  return (
    <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center space-x-2 px-5 py-3 rounded-xl border shadow-2xl text-sm font-medium transition-all ${
      type === 'success'
        ? 'bg-brand-success/10 border-brand-success/30 text-brand-success'
        : 'bg-brand-danger/10 border-brand-danger/30 text-brand-danger'
    }`}>
      {type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
      <span>{message}</span>
    </div>
  );
}

export default function SettingsPage() {
  const { user, logout, refreshUser } = useAuth();
  const navigate = useNavigate();

  const [activeSection, setActiveSection] = useState<Section>('profile');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Profile form
  const [phone, setPhone] = useState(user?.phone || '');
  const [country, setCountry] = useState(user?.country || '');
  const [profileLoading, setProfileLoading] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Password form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!user || !e.target.files?.[0]) return;
    const file = e.target.files[0];
    
    if (!file.type.startsWith('image/')) {
      showToast('Please select an image file.', 'error');
      return;
    }
    
    if (file.size > 5 * 1024 * 1024) {
      showToast('Image must be less than 5MB.', 'error');
      return;
    }
    
    setUploadingPhoto(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `${user.id}/avatar_${Date.now()}.${ext}`;
      
      const { error: uploadErr } = await supabase.storage
        .from('profile-photos')
        .upload(path, file, { cacheControl: '3600', upsert: false });
      
      if (uploadErr) throw uploadErr;
      
      const { data: { publicUrl } } = supabase.storage
        .from('profile-photos')
        .getPublicUrl(path);
      
      const { error: updateErr } = await supabase
        .from('users')
        .update({ profile_photo: publicUrl })
        .eq('id', user.id);
      
      if (updateErr) throw updateErr;
      
      await refreshUser();
      showToast('Profile photo updated!', 'success');
    } catch {
      showToast('Failed to upload photo.', 'error');
    }
    setUploadingPhoto(false);
  };

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setProfileLoading(true);
    try {
      const { error } = await supabase
        .from('users')
        .update({ phone, country })
        .eq('id', user.id);
      if (error) throw error;
      await refreshUser();
      showToast('Profile updated successfully.', 'success');
    } catch {
      showToast('Failed to update profile. Please try again.', 'error');
    }
    setProfileLoading(false);
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (newPassword.length < 6) { showToast('New password must be at least 6 characters.', 'error'); return; }
    if (newPassword !== confirmPassword) { showToast('Passwords do not match.', 'error'); return; }

    setPasswordLoading(true);
    try {
      // Verify current password
      const currentHash = btoa(currentPassword);
      const { data: u } = await supabase.from('users').select('password_hash').eq('id', user.id).single();
      if (!u || u.password_hash !== currentHash) throw new Error('Current password is incorrect.');

      const newHash = btoa(newPassword);
      const { error } = await supabase.from('users').update({ password_hash: newHash }).eq('id', user.id);
      if (error) throw error;

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      showToast('Password changed successfully.', 'success');
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Failed to change password.', 'error');
    }
    setPasswordLoading(false);
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  // Auth gate
  if (!user) return <Navigate to="/login" replace />;

  const navItems: { id: Section; label: string; icon: React.ElementType }[] = [
    { id: 'profile', label: 'Profile Info', icon: User },
    { id: 'password', label: 'Change Password', icon: Lock },
    { id: 'security', label: 'Account Security', icon: ShieldCheck },
  ];

  return (
    <div className="min-h-screen bg-brand-bg text-white">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">

        {/* Header */}
        <section id="settings-header" className="mb-8">
          <h1 className="font-serif text-3xl font-bold">Account Settings</h1>
          <p className="text-brand-textMuted text-sm mt-1">Manage your personal information and security preferences.</p>
        </section>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar nav */}
          <aside className="lg:w-56 flex-shrink-0">
            <div className="bg-brand-card border border-brand-border rounded-xl overflow-hidden">
              {/* User avatar block */}
              <div className="px-5 py-5 border-b border-brand-border text-center">
                <div className="w-14 h-14 bg-brand-success/10 border-2 border-brand-success/30 rounded-full flex items-center justify-center mx-auto mb-3 overflow-hidden">
                  {user.profile_photo ? (
                    <img src={user.profile_photo} alt={user.full_name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-brand-success font-bold text-xl font-serif">
                      {user.full_name.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="font-semibold text-white text-sm truncate">{user.full_name}</div>
                <div className="text-xs text-brand-textMuted truncate mt-0.5">{user.email}</div>
                <div className="mt-2">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded border text-[10px] font-semibold uppercase tracking-wide ${
                    user.kyc_status === 'approved'
                      ? 'bg-brand-success/10 text-brand-success border-brand-success/30'
                      : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30'
                  }`}>
                    <ShieldCheck className="w-2.5 h-2.5 mr-1" />
                    {user.kyc_status}
                  </span>
                </div>
              </div>

              {/* Nav items */}
              <nav className="p-2">
                {navItems.map(item => (
                  <button
                    key={item.id}
                    onClick={() => setActiveSection(item.id)}
                    className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all mb-0.5 ${
                      activeSection === item.id
                        ? 'bg-brand-success/10 text-brand-success border border-brand-success/20'
                        : 'text-brand-textMuted hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <item.icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </button>
                ))}
                {/* KYC link */}
                {user.kyc_status !== 'approved' && (
                  <button
                    onClick={() => navigate('/kyc')}
                    className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all mb-0.5 text-yellow-400 hover:bg-yellow-400/5 border border-yellow-500/20 mt-1"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>Verify Identity</span>
                  </button>
                )}
              </nav>

              <div className="px-2 pb-3 pt-1 border-t border-brand-border mt-1">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm text-brand-textMuted hover:text-brand-danger hover:bg-brand-danger/5 transition-all"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          </aside>

          {/* Main content */}
          <main className="flex-1 space-y-5">

            {/* ── Profile Info ── */}
            {activeSection === 'profile' && (
              <section id="settings-profile">
                <SectionCard title="Profile Photo" description="Upload your profile picture" icon={Camera}>
                  <div className="flex items-center space-x-6">
                    <div className="relative">
                      {user.profile_photo ? (
                        <img
                          src={user.profile_photo}
                          alt={user.full_name}
                          className="w-24 h-24 rounded-full object-cover border-2 border-brand-border"
                        />
                      ) : (
                        <div className="w-24 h-24 rounded-full bg-brand-bg border-2 border-brand-border flex items-center justify-center">
                          <User className="w-10 h-10 text-brand-textMuted" />
                        </div>
                      )}
                      {uploadingPhoto && (
                        <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
                          <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoUpload}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadingPhoto}
                        className="flex items-center space-x-2 bg-brand-success/10 hover:bg-brand-success/20 text-brand-success border border-brand-success/30 px-4 py-2 rounded-lg text-sm font-semibold transition-all disabled:opacity-50"
                      >
                        <Upload className="w-4 h-4" />
                        <span>{uploadingPhoto ? 'Uploading...' : 'Upload Photo'}</span>
                      </button>
                      <p className="text-xs text-brand-textMuted mt-2">
                        JPG, PNG or WebP • Max 5MB
                      </p>
                    </div>
                  </div>
                </SectionCard>

                <SectionCard title="Profile Information" description="Update your contact details" icon={User}>
                  <form onSubmit={handleProfileSave} className="space-y-4">
                    {/* Read-only fields */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs text-brand-textMuted uppercase tracking-wider mb-1.5">Full Name</label>
                        <input value={user.full_name} disabled
                          className="w-full bg-brand-bg/50 border border-brand-border rounded-lg px-3 py-2.5 text-brand-textMuted text-sm cursor-not-allowed" />
                      </div>
                      <div>
                        <label className="block text-xs text-brand-textMuted uppercase tracking-wider mb-1.5">Email</label>
                        <input value={user.email} disabled
                          className="w-full bg-brand-bg/50 border border-brand-border rounded-lg px-3 py-2.5 text-brand-textMuted text-sm cursor-not-allowed" />
                      </div>
                    </div>

                    {/* Editable fields */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs text-brand-textMuted uppercase tracking-wider mb-1.5">Phone Number</label>
                        <div className="relative">
                          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-textMuted" />
                          <input
                            type="tel"
                            value={phone}
                            onChange={e => setPhone(e.target.value)}
                            placeholder="+1 555 0000"
                            className="w-full bg-brand-bg border border-brand-border rounded-lg pl-10 pr-4 py-2.5 text-white text-sm focus:outline-none focus:border-brand-success transition-colors placeholder-brand-textMuted"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs text-brand-textMuted uppercase tracking-wider mb-1.5">Country</label>
                        <div className="relative">
                          <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-textMuted pointer-events-none" />
                          <select
                            value={country}
                            onChange={e => setCountry(e.target.value)}
                            className="w-full bg-brand-bg border border-brand-border rounded-lg pl-10 pr-4 py-2.5 text-white text-sm focus:outline-none focus:border-brand-success transition-colors appearance-none"
                          >
                            <option value="">Select country</option>
                            {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                        </div>
                      </div>
                    </div>

                    <div className="pt-1">
                      <button type="submit" disabled={profileLoading}
                        className="flex items-center space-x-2 bg-brand-success hover:bg-red-700 disabled:opacity-50 text-brand-bg font-bold px-5 py-2.5 rounded-lg text-sm transition-colors">
                        {profileLoading
                          ? <div className="w-4 h-4 border-2 border-brand-bg border-t-transparent rounded-full animate-spin" />
                          : <><Save className="w-4 h-4" /><span>Save Changes</span></>
                        }
                      </button>
                    </div>
                  </form>
                </SectionCard>
              </section>
            )}

            {/* ── Change Password ── */}
            {activeSection === 'password' && (
              <section id="settings-password">
                <SectionCard title="Change Password" description="Update your login password" icon={Lock}>
                  <form onSubmit={handlePasswordChange} className="space-y-4 max-w-sm">
                    <div>
                      <label className="block text-xs text-brand-textMuted uppercase tracking-wider mb-1.5">Current Password</label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-textMuted" />
                        <input
                          type={showCurrentPass ? 'text' : 'password'}
                          value={currentPassword}
                          onChange={e => setCurrentPassword(e.target.value)}
                          placeholder="••••••••"
                          required
                          className="w-full bg-brand-bg border border-brand-border rounded-lg pl-10 pr-10 py-2.5 text-white text-sm focus:outline-none focus:border-brand-success transition-colors"
                        />
                        <button type="button" onClick={() => setShowCurrentPass(p => !p)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-textMuted hover:text-white">
                          {showCurrentPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs text-brand-textMuted uppercase tracking-wider mb-1.5">New Password</label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-textMuted" />
                        <input
                          type={showNewPass ? 'text' : 'password'}
                          value={newPassword}
                          onChange={e => setNewPassword(e.target.value)}
                          placeholder="Min. 6 characters"
                          required
                          className="w-full bg-brand-bg border border-brand-border rounded-lg pl-10 pr-10 py-2.5 text-white text-sm focus:outline-none focus:border-brand-success transition-colors"
                        />
                        <button type="button" onClick={() => setShowNewPass(p => !p)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-textMuted hover:text-white">
                          {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs text-brand-textMuted uppercase tracking-wider mb-1.5">Confirm New Password</label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-textMuted" />
                        <input
                          type="password"
                          value={confirmPassword}
                          onChange={e => setConfirmPassword(e.target.value)}
                          placeholder="••••••••"
                          required
                          className={`w-full bg-brand-bg border rounded-lg pl-10 pr-4 py-2.5 text-white text-sm focus:outline-none transition-colors ${
                            confirmPassword && confirmPassword !== newPassword
                              ? 'border-brand-danger focus:border-brand-danger'
                              : 'border-brand-border focus:border-brand-success'
                          }`}
                        />
                      </div>
                      {confirmPassword && confirmPassword !== newPassword && (
                        <p className="text-xs text-brand-danger mt-1">Passwords do not match</p>
                      )}
                    </div>

                    <div className="pt-1">
                      <button type="submit" disabled={passwordLoading || !currentPassword || !newPassword || newPassword !== confirmPassword}
                        className="flex items-center space-x-2 bg-brand-success hover:bg-red-700 disabled:opacity-50 text-brand-bg font-bold px-5 py-2.5 rounded-lg text-sm transition-colors">
                        {passwordLoading
                          ? <div className="w-4 h-4 border-2 border-brand-bg border-t-transparent rounded-full animate-spin" />
                          : <><Lock className="w-4 h-4" /><span>Update Password</span></>
                        }
                      </button>
                    </div>
                  </form>
                </SectionCard>
              </section>
            )}

            {/* ── Security Overview ── */}
            {activeSection === 'security' && (
              <section id="settings-security">
                <SectionCard title="Account Security" description="Your current security status" icon={ShieldCheck}>
                  <div className="space-y-4">
                    {[
                      {
                        label: 'Login Verification (2FA)',
                        description: 'A 6-digit code is required every time you sign in.',
                        status: 'Enabled',
                        color: 'text-brand-success',
                        dot: 'bg-brand-success',
                      },
                      {
                        label: 'Withdrawal Code',
                        description: 'A 6-digit code is required before any withdrawal is submitted.',
                        status: 'Enabled',
                        color: 'text-brand-success',
                        dot: 'bg-brand-success',
                      },
                      {
                        label: 'KYC Verification',
                        description: 'Identity verified for compliance and account protection.',
                        status: user.kyc_status === 'approved' ? 'Verified' : user.kyc_status === 'pending' ? 'Pending Review' : 'Not Verified',
                        color: user.kyc_status === 'approved' ? 'text-brand-success' : user.kyc_status === 'pending' ? 'text-yellow-400' : 'text-brand-danger',
                        dot: user.kyc_status === 'approved' ? 'bg-brand-success' : user.kyc_status === 'pending' ? 'bg-yellow-400' : 'bg-brand-danger',
                      },
                      {
                        label: 'Account Status',
                        description: 'Your account is in good standing.',
                        status: user.status === 'active' ? 'Active' : user.status,
                        color: user.status === 'active' ? 'text-brand-success' : 'text-brand-danger',
                        dot: user.status === 'active' ? 'bg-brand-success' : 'bg-brand-danger',
                      },
                    ].map(item => (
                      <div key={item.label} className="flex items-center justify-between py-3 border-b border-brand-border/40 last:border-0">
                        <div>
                          <div className="text-sm font-medium text-white">{item.label}</div>
                          <div className="text-xs text-brand-textMuted mt-0.5">{item.description}</div>
                        </div>
                        <div className={`flex items-center space-x-1.5 text-xs font-semibold ${item.color}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${item.dot}`} />
                          <span>{item.status}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </SectionCard>

                <div className="mt-5 bg-brand-card border border-brand-danger/20 rounded-xl p-5">
                  <h2 className="text-sm font-semibold text-white mb-1">Sign Out of All Sessions</h2>
                  <p className="text-xs text-brand-textMuted mb-4">This will immediately log you out and clear your session.</p>
                  <button onClick={handleLogout}
                    className="flex items-center space-x-2 bg-brand-danger/10 hover:bg-brand-danger/20 border border-brand-danger/30 text-brand-danger font-semibold px-4 py-2 rounded-lg text-sm transition-colors">
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out Now</span>
                  </button>
                </div>
              </section>
            )}

          </main>
        </div>
      </div>

      {toast && <Toast message={toast.message} type={toast.type} />}
    </div>
  );
}
