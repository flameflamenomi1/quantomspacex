import { MessageCircle } from 'lucide-react';

// Update this with your WhatsApp number (format: country code + number, no + or spaces)
// Example: For +1 234 567 8900, use: 12345678900
const WHATSAPP_NUMBER = 'YOUR_WHATSAPP_NUMBER';

export default function WhatsAppButton() {
  const handleOpen = () => {
    const message = encodeURIComponent('Hello! I need support with my Quantumspacex account.');
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${message}`, '_blank');
  };

  return (
    <div className="fixed bottom-6 md:bottom-6 bottom-[5rem] right-4 sm:right-6 z-50">
      <button
        onClick={handleOpen}
        className="group relative flex items-center justify-center w-14 h-14 bg-green-500 hover:bg-green-600 rounded-full shadow-lg shadow-green-900/50 transition-all hover:scale-110"
        title="WhatsApp Support"
      >
        <MessageCircle className="w-6 h-6 text-white" fill="currentColor" />
        
        {/* Pulse animation */}
        <span className="absolute inset-0 rounded-full bg-green-500 animate-ping opacity-20" />
        
        {/* Tooltip */}
        <span className="absolute right-full mr-3 px-3 py-2 bg-brand-card border border-brand-border rounded-lg text-white text-sm font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          Chat with us on WhatsApp
        </span>
      </button>
    </div>
  );
}
