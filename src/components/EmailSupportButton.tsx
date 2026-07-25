import { Mail } from 'lucide-react';

const SUPPORT_EMAIL = 'support@quantumspacex.com';

export default function EmailSupportButton() {
  return (
    <div className="fixed bottom-6 md:bottom-6 bottom-[5rem] right-4 sm:right-6 z-50">
      <a
        href={`mailto:${SUPPORT_EMAIL}?subject=Support Request - Quantumspacex`}
        className="group relative flex items-center justify-center w-14 h-14 rounded-full shadow-lg transition-all hover:scale-110"
        style={{
          background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
          boxShadow: '0 4px 20px rgba(239,68,68,0.4)',
        }}
        title="Email Support"
        aria-label="Contact customer support via email"
      >
        <Mail className="w-6 h-6 text-white" />

        {/* Pulse ring */}
        <span className="absolute inset-0 rounded-full animate-ping opacity-20"
          style={{ background: 'rgba(239,68,68,0.6)' }} />

        {/* Tooltip */}
        <span className="absolute right-full mr-3 px-3 py-2 bg-brand-card border border-brand-border rounded-lg text-white text-xs font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          Email Support
        </span>
      </a>
    </div>
  );
}
