import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, X, MessageSquare, Send, RefreshCw, Trash2,
  Compass, Award, BookOpen, AlertCircle
} from 'lucide-react';
import { callGemini } from '../utils/gemini';
import { renderFormattedMarkdown } from '../utils/markdown';

interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: string;
}

const PRESET_CHIPS = [
  "How to write balanced Mains introductions?",
  "Explain exceptions to Article 21",
  "Summarize Sarkaria Commission reports",
  "Explain basic structure doctrine cases"
];

export default function FloatingAskAI() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Initialize with welcome message if empty
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        {
          id: 'welcome',
          role: 'model',
          content: "Greetings, Aspirant. I am your **UPSC Scholar Copilot**. \n\nHow may I assist you today? I can analyze syllabus blueprints, evaluate answer strategies, or explain complex constitutional structures.",
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    }
  }, [messages]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const handleSendMessage = async (textToSend: string) => {
    const trimmed = textToSend.trim();
    if (!trimmed || loading) return;

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}-user`,
      role: 'user',
      content: trimmed,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setLoading(true);

    try {
      // Build conversation history
      const historyPrompt = messages
        .filter(m => m.id !== 'welcome')
        .map(m => `${m.role === 'user' ? 'Aspirant' : 'Scholar'}: ${m.content}`)
        .join('\n\n') + `\n\nAspirant: ${trimmed}\n\nScholar:`;

      const systemPrompt = `You are an expert UPSC Civil Services examination mentor and scholar. You provide deep, analytical, and highly structured answers citing relevant Articles, historical precedents, and Supreme Court judgments where appropriate. Keep your answers clear, concise, and focused on Civil Services core topics.\n\n${historyPrompt}`;

      const aiResponse = await callGemini(systemPrompt);

      const modelMsg: ChatMessage = {
        id: `msg-${Date.now()}-model`,
        role: 'model',
        content: aiResponse,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages(prev => [...prev, modelMsg]);
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: `msg-${Date.now()}-error`,
        role: 'model',
        content: `Apologies, I encountered an issue: ${err.message || err}. Please try again.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleClearChat = () => {
    setMessages([
      {
        id: 'welcome',
        role: 'model',
        content: "Greetings, Aspirant. I am your **UPSC Scholar Copilot**. \n\nHow may I assist you today? I can analyze syllabus blueprints, evaluate answer strategies, or explain complex constitutional structures.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
  };

  return (
    <div id="floating_ask_ai_container" className="fixed bottom-6 right-6 z-40 font-sans">
      
      {/* Floating Action Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-13 h-13 rounded-full bg-brand-navy border-2 border-brand-gold text-brand-gold hover:scale-105 active:scale-95 flex items-center justify-center shadow-2xl transition duration-150 relative cursor-pointer"
        title="Ask AI Scholar Copilot"
      >
        <AnimatePresence mode="wait">
          {isOpen ? (
            <X className="w-5 h-5 text-brand-gold" />
          ) : (
            <div className="relative">
              <MessageSquare className="w-5 h-5 text-brand-gold" />
              <Sparkles className="w-3 h-3 text-brand-teal absolute -top-1.5 -right-1.5 animate-pulse" />
            </div>
          )}
        </AnimatePresence>
      </button>

      {/* Chat Window Container */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 15, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 15, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute bottom-16 right-0 w-88 sm:w-96 bg-brand-cream border-2 border-brand-gold rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[520px]"
          >
            {/* Header */}
            <div className="bg-brand-navy text-white px-4 py-3 border-b border-brand-gold/40 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-brand-gold animate-spin" />
                <div className="text-left">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-brand-gold leading-none">UPSC Scholar Copilot</h3>
                  <span className="text-[9px] text-gray-300 font-serif italic">GS Blueprint and Answer Assistant</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleClearChat}
                  className="text-gray-400 hover:text-brand-gold p-1.5 rounded transition duration-150"
                  title="Reset conversation"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-gray-400 hover:text-white p-1.5 rounded transition duration-150"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Message History Thread */}
            <div 
              ref={scrollRef}
              className="flex-1 p-4 overflow-y-auto space-y-4 bg-white select-text"
            >
              {messages.map((msg) => (
                <div 
                  key={msg.id} 
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`p-3 rounded-2xl max-w-[85%] text-left shadow-2xs border ${
                    msg.role === 'user'
                      ? 'bg-brand-navy border-brand-gold/20 text-white rounded-tr-none'
                      : 'bg-brand-cream/65 border-brand-navy/5 text-brand-navy rounded-tl-none font-serif'
                  }`}>
                    {/* Role Header */}
                    <span className={`text-[8px] font-mono uppercase block mb-1 opacity-60 tracking-wider ${
                      msg.role === 'user' ? 'text-brand-gold text-right' : 'text-brand-slate text-left'
                    }`}>
                      {msg.role === 'user' ? '🏛️ Aspirant' : '🎓 AI Scholar'}
                    </span>

                    {/* Content */}
                    <div className="text-xs break-words leading-relaxed">
                      {msg.role === 'user' ? (
                        <p className="whitespace-pre-wrap font-sans">{msg.content}</p>
                      ) : (
                        renderFormattedMarkdown(msg.content)
                      )}
                    </div>

                    {/* Timestamp */}
                    <span className={`text-[8px] font-mono block mt-1.5 opacity-50 ${
                      msg.role === 'user' ? 'text-right' : 'text-left'
                    }`}>
                      {msg.timestamp}
                    </span>
                  </div>
                </div>
              ))}

              {/* Thinking loader */}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-brand-cream/65 border border-brand-navy/5 p-3 rounded-2xl rounded-tl-none flex items-center gap-2">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-brand-gold" />
                    <span className="text-[10px] text-brand-slate font-mono animate-pulse">Consulting civil services modules...</span>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Chips & Footer input */}
            <div className="border-t border-brand-navy/10 bg-brand-cream p-3 space-y-2 shrink-0">
              {/* Chips (only show when not thinking) */}
              {!loading && messages.length <= 1 && (
                <div className="flex flex-wrap gap-1.5 pb-1">
                  {PRESET_CHIPS.map((chip, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSendMessage(chip)}
                      className="bg-white border border-brand-navy/10 hover:border-brand-gold text-brand-navy hover:text-brand-gold text-[10px] font-bold px-2 py-1 rounded-full transition duration-150 shadow-3xs cursor-pointer text-left"
                    >
                      {chip}
                    </button>
                  ))}
                </div>
              )}

              {/* Chat Form */}
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage(inputText);
                }}
                className="flex gap-2"
              >
                <input
                  type="text"
                  placeholder="Ask any UPSC GS question..."
                  className="flex-1 bg-white border border-brand-navy/15 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-brand-gold font-sans text-brand-navy placeholder-gray-400"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  disabled={loading}
                />
                <button
                  type="submit"
                  disabled={loading || !inputText.trim()}
                  className="bg-brand-navy text-brand-gold hover:bg-brand-slate border border-brand-gold px-3 rounded-xl transition duration-150 flex items-center justify-center disabled:opacity-50 disabled:hover:bg-brand-navy cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
