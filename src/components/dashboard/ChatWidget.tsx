import { useState, useEffect, useRef, memo } from 'react';
import { MessageSquare, X, Send, MinusCircle, Paperclip, FileText } from 'lucide-react';
import { getChatMessages, sendMessage, markMessagesRead, type ChatMessage } from '@/lib/db';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';

function ChatWidget() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [unread, setUnread] = useState(0);
  const [uploading, setUploading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    if (!user) return;
    const msgs = await getChatMessages(user.id);
    setMessages(msgs);
    const unreadCount = msgs.filter(m => m.sender === 'admin' && !m.is_read).length;
    setUnread(unreadCount);
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, 30000); // Changed from 5s to 30s
    return () => clearInterval(interval);
  }, [user]);

  useEffect(() => {
    if (open && user) {
      markMessagesRead(user.id, 'admin');
      setUnread(0);
    }
  }, [open, user]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open]);

  // Listen for global open-chat event (triggered from navbar / customer care)
  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener('open-chat-widget', handler);
    return () => window.removeEventListener('open-chat-widget', handler);
  }, []);

  const handleSend = async () => {
    if (!input.trim() || !user) return;
    const msg = input.trim();
    setInput('');
    await sendMessage(user.id, 'user', msg);
    await load();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      alert('File size must be less than 10MB');
      return;
    }

    setUploading(true);
    try {
      // Upload to Supabase storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from('chat-attachments')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('chat-attachments')
        .getPublicUrl(fileName);

      // Send message with attachment
      await supabase.from('chat_messages').insert({
        user_id: user.id,
        sender: 'user',
        message: file.type.startsWith('image/') ? '📷 Image' : `📎 ${file.name}`,
        attachment_url: urlData.publicUrl,
        attachment_type: file.type,
        is_read: false,
      });

      await load();
    } catch (err) {
      console.error('Upload failed:', err);
      alert('Failed to upload file. Please try again.');
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  if (!user) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Chat window */}
      {open && (
        <div className="mb-4 w-80 bg-brand-card border border-brand-border rounded-xl shadow-2xl overflow-hidden flex flex-col" style={{ height: '420px' }}>
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-brand-bg border-b border-brand-border flex-shrink-0">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-brand-success rounded-full animate-pulse" />
              <span className="text-sm font-semibold text-white">Support Chat</span>
            </div>
            <button onClick={() => setOpen(false)} className="text-brand-textMuted hover:text-white">
              <MinusCircle className="w-4 h-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 && (
              <div className="text-center text-brand-textMuted text-xs pt-6">
                <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p>Send a message to connect with our support team.</p>
              </div>
            )}
            {messages.map(msg => (
              <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.sender === 'admin' && (
                  <div className="w-6 h-6 rounded-full bg-brand-success/20 border border-brand-success/30 flex items-center justify-center mr-2 flex-shrink-0 mt-auto">
                    <span className="text-[8px] text-brand-success font-bold">CS</span>
                  </div>
                )}
                <div
                  className={`max-w-[78%] rounded-xl px-3 py-2 text-xs ${
                    msg.sender === 'user'
                      ? 'bg-brand-success text-brand-bg font-medium rounded-br-sm'
                      : 'bg-brand-bg border border-brand-border text-white rounded-bl-sm'
                  }`}
                >
                  {(msg as ChatMessage & { attachment_url?: string; attachment_type?: string }).attachment_url ? (
                    <div className="space-y-2">
                      {(msg as ChatMessage & { attachment_type?: string }).attachment_type?.startsWith('image/') ? (
                        <a 
                          href={(msg as ChatMessage & { attachment_url?: string }).attachment_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="block"
                        >
                          <img 
                            src={(msg as ChatMessage & { attachment_url?: string }).attachment_url} 
                            alt="Attachment" 
                            className="max-w-full rounded border border-brand-border/30"
                          />
                        </a>
                      ) : (
                        <a 
                          href={(msg as ChatMessage & { attachment_url?: string }).attachment_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className={`flex items-center gap-2 ${msg.sender === 'user' ? 'text-brand-bg' : 'text-brand-success'} hover:underline`}
                        >
                          <FileText className="w-4 h-4" />
                          <span>Download File</span>
                        </a>
                      )}
                      {msg.message && <p className="leading-relaxed">{msg.message}</p>}
                    </div>
                  ) : (
                    <p className="leading-relaxed">{msg.message}</p>
                  )}
                  <p className={`text-[9px] mt-1 ${msg.sender === 'user' ? 'text-brand-bg/60' : 'text-brand-textMuted'}`}>
                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}
            <div ref={endRef} />
          </div>

          {/* Input */}
          <div className="flex items-center space-x-2 px-3 py-3 border-t border-brand-border flex-shrink-0">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.pdf,.doc,.docx"
              onChange={handleFileUpload}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="w-8 h-8 bg-brand-bg border border-brand-border rounded-lg flex items-center justify-center hover:border-brand-success transition-colors disabled:opacity-40 flex-shrink-0"
              title="Attach file"
            >
              {uploading ? (
                <div className="w-3.5 h-3.5 border-2 border-brand-border border-t-brand-success rounded-full animate-spin" />
              ) : (
                <Paperclip className="w-3.5 h-3.5 text-brand-textMuted" />
              )}
            </button>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              placeholder="Type your message..."
              className="flex-1 bg-brand-bg border border-brand-border rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-brand-success placeholder-brand-textMuted"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim()}
              className="w-8 h-8 bg-brand-success rounded-lg flex items-center justify-center hover:bg-red-700 transition-colors disabled:opacity-40 flex-shrink-0"
            >
              <Send className="w-3.5 h-3.5 text-brand-bg" />
            </button>
          </div>
        </div>
      )}

      {/* FAB */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-12 h-12 bg-brand-success hover:bg-red-700 rounded-full flex items-center justify-center shadow-lg shadow-red-950/20 transition-all hover:scale-105 relative ml-auto"
      >
        {open ? (
          <X className="w-5 h-5 text-brand-bg" />
        ) : (
          <MessageSquare className="w-5 h-5 text-brand-bg" />
        )}
        {!open && unread > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-brand-danger text-white text-[9px] font-bold rounded-full flex items-center justify-center">
            {unread}
          </span>
        )}
      </button>
    </div>
  );
}

export default memo(ChatWidget);
