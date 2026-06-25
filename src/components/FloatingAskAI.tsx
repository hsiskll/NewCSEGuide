import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, X, MessageSquare, Send, RefreshCw, Trash2,
  Compass, Award, BookOpen, AlertCircle, Maximize2, Minimize2,
  PanelRight, Plus, Edit, Check, History
} from 'lucide-react';
import { callGemini } from '../utils/gemini';
import { renderFormattedMarkdown } from '../utils/markdown';

interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: string;
}

interface ChatSession {
  id: string;
  name: string;
  messages: ChatMessage[];
  createdAt: string;
}

const PRESET_CHIPS = [
  "How to write balanced Mains introductions?",
  "Explain exceptions to Article 21",
  "Summarize Sarkaria Commission reports",
  "Explain basic structure doctrine cases"
];

const SESSION_STORAGE_KEY = 'cseguide_chat_sessions_v1';

const getWelcomeMessage = (): ChatMessage => ({
  id: `welcome-${Date.now()}`,
  role: 'model',
  content: "Greetings, Aspirant. I am your **UPSC Scholar Copilot**. \n\nHow may I assist you today? I can analyze syllabus blueprints, evaluate answer strategies, or explain complex constitutional structures.",
  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
});

export default function FloatingAskAI() {
  const [isOpen, setIsOpen] = useState(false);
  const [size, setSize] = useState<'small' | 'large' | 'full'>('small');
  
  // Chat Sessions States
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string>('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editNameText, setEditNameText] = useState('');

  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load chat sessions from localStorage on startup
  useEffect(() => {
    try {
      const saved = localStorage.getItem(SESSION_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as ChatSession[];
        if (parsed && parsed.length > 0) {
          setSessions(parsed);
          setActiveSessionId(parsed[0].id);
          return;
        }
      }
    } catch (e) {
      console.error('Failed to parse chat sessions', e);
    }

    // Seed default session if none exist
    const defaultId = `session-${Date.now()}`;
    const defaultSession: ChatSession = {
      id: defaultId,
      name: 'General UPSC Discussion',
      messages: [getWelcomeMessage()],
      createdAt: new Date().toISOString()
    };
    setSessions([defaultSession]);
    setActiveSessionId(defaultId);
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify([defaultSession]));
  }, []);

  // Save sessions to storage helper
  const saveSessions = (updated: ChatSession[]) => {
    setSessions(updated);
    try {
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to save chat sessions', e);
    }
  };

  const activeSession = sessions.find(s => s.id === activeSessionId) || sessions[0] || {
    id: 'fallback',
    name: 'General UPSC Discussion',
    messages: [],
    createdAt: ''
  };

  const messages = activeSession.messages;

  // Scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const handleCreateNewSession = () => {
    const newId = `session-${Date.now()}`;
    const newSession: ChatSession = {
      id: newId,
      name: `Session #${sessions.length + 1}`,
      messages: [getWelcomeMessage()],
      createdAt: new Date().toISOString()
    };

    const updated = [newSession, ...sessions];
    saveSessions(updated);
    setActiveSessionId(newId);
    setSidebarOpen(false); // close sidebar if in mobile/small overlay
  };

  const handleDeleteSession = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const filtered = sessions.filter(s => s.id !== id);
    if (filtered.length === 0) {
      const resetId = `session-${Date.now()}`;
      const defaultSession: ChatSession = {
        id: resetId,
        name: 'General UPSC Discussion',
        messages: [getWelcomeMessage()],
        createdAt: new Date().toISOString()
      };
      saveSessions([defaultSession]);
      setActiveSessionId(resetId);
    } else {
      saveSessions(filtered);
      if (activeSessionId === id) {
        setActiveSessionId(filtered[0].id);
      }
    }
  };

  const handleStartRename = (session: ChatSession, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingSessionId(session.id);
    setEditNameText(session.name);
  };

  const handleSaveRename = (id: string) => {
    const trimmed = editNameText.trim();
    if (trimmed) {
      const updated = sessions.map(s => s.id === id ? { ...s, name: trimmed } : s);
      saveSessions(updated);
    }
    setEditingSessionId(null);
  };

  const handleSendMessage = async (textToSend: string) => {
    const trimmed = textToSend.trim();
    if (!trimmed || loading) return;

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}-user`,
      role: 'user',
      content: trimmed,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    // Update session locally with user message
    const updatedSessionsWithUser = sessions.map(s => {
      if (s.id === activeSessionId) {
        return {
          ...s,
          messages: [...s.messages, userMsg]
        };
      }
      return s;
    });

    saveSessions(updatedSessionsWithUser);
    setInputText('');
    setLoading(true);

    try {
      // Collect history context for this specific session
      const currentSess = updatedSessionsWithUser.find(s => s.id === activeSessionId) || activeSession;
      const historyPrompt = currentSess.messages
        .filter(m => !m.id.startsWith('welcome'))
        .map(m => `${m.role === 'user' ? 'Aspirant' : 'Scholar'}: ${m.content}`)
        .join('\n\n') + `\n\nScholar:`;

      const systemPrompt = `You are an expert UPSC Civil Services examination mentor and scholar. You provide deep, analytical, and highly structured answers citing relevant Articles, historical precedents, and Supreme Court judgments where appropriate. Keep your answers clear, concise, and focused on Civil Services core topics.\n\n${historyPrompt}`;

      const aiResponse = await callGemini(systemPrompt);

      const modelMsg: ChatMessage = {
        id: `msg-${Date.now()}-model`,
        role: 'model',
        content: aiResponse,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      const updatedSessionsWithModel = updatedSessionsWithUser.map(s => {
        if (s.id === activeSessionId) {
          return {
            ...s,
            messages: [...s.messages, modelMsg]
          };
        }
        return s;
      });

      saveSessions(updatedSessionsWithModel);
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: `msg-${Date.now()}-error`,
        role: 'model',
        content: `Apologies, I encountered an issue: ${err.message || err}. Please try again.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      
      const updatedSessionsWithError = updatedSessionsWithUser.map(s => {
        if (s.id === activeSessionId) {
          return {
            ...s,
            messages: [...s.messages, errorMsg]
          };
        }
        return s;
      });

      saveSessions(updatedSessionsWithError);
    } finally {
      setLoading(false);
    }
  };

  const handleClearChat = () => {
    const updated = sessions.map(s => {
      if (s.id === activeSessionId) {
        return {
          ...s,
          messages: [getWelcomeMessage()]
        };
      }
      return s;
    });
    saveSessions(updated);
  };

  // Classes for the main chat window based on chosen size state
  const containerClasses = size === 'small'
    ? "absolute bottom-16 right-0 w-88 sm:w-110 h-[560px] bg-brand-cream border-2 border-brand-gold rounded-2xl shadow-2xl overflow-hidden flex flex-col transition-all duration-300"
    : size === 'large'
    ? "fixed top-0 right-0 h-screen w-full sm:w-[480px] md:w-[650px] bg-brand-cream border-l-2 border-brand-gold rounded-none shadow-2xl overflow-hidden flex flex-col z-50 transition-all duration-300"
    : "fixed inset-0 h-screen w-full bg-brand-cream rounded-none z-50 flex flex-col transition-all duration-300";

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
            className={containerClasses}
          >
            {/* Header */}
            <div className="bg-brand-navy text-white px-4 py-3 border-b border-brand-gold/40 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2">
                {/* Session Sidebar Toggle for small screen */}
                {size === 'small' && (
                  <button
                    onClick={() => setSidebarOpen(!sidebarOpen)}
                    className="p-1 hover:bg-white/15 text-brand-gold rounded mr-1"
                    title="Chat History"
                  >
                    <History className="w-4 h-4" />
                  </button>
                )}
                <Sparkles className="w-4 h-4 text-brand-gold animate-spin" />
                <div className="text-left">
                  <h3 className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-brand-gold leading-none">UPSC Scholar Copilot</h3>
                  <span className="text-[9px] text-gray-300 font-serif italic hidden sm:inline-block">GS Blueprint & Mentorship</span>
                </div>
              </div>

              {/* Adjust sizes and control buttons */}
              <div className="flex items-center gap-2.5">
                {/* Size controls */}
                <div className="flex items-center gap-0.5 bg-white/10 rounded-lg p-0.5 border border-white/10">
                  <button 
                    type="button"
                    onClick={() => setSize('small')}
                    className={`p-1 rounded text-xs transition-colors ${size === 'small' ? 'bg-brand-gold text-brand-navy' : 'text-gray-300 hover:text-white'}`}
                    title="Small Window"
                  >
                    <Minimize2 className="w-3 h-3" />
                  </button>
                  <button 
                    type="button"
                    onClick={() => setSize('large')}
                    className={`p-1 rounded text-xs transition-colors ${size === 'large' ? 'bg-brand-gold text-brand-navy' : 'text-gray-300 hover:text-white'}`}
                    title="Side Panel"
                  >
                    <PanelRight className="w-3 h-3" />
                  </button>
                  <button 
                    type="button"
                    onClick={() => setSize('full')}
                    className={`p-1 rounded text-xs transition-colors ${size === 'full' ? 'bg-brand-gold text-brand-navy' : 'text-gray-300 hover:text-white'}`}
                    title="Full Screen"
                  >
                    <Maximize2 className="w-3 h-3" />
                  </button>
                </div>

                <div className="h-4 w-[1px] bg-white/20"></div>

                {/* Reset and Close */}
                <button
                  onClick={handleClearChat}
                  className="text-gray-400 hover:text-brand-gold p-1 rounded transition duration-150"
                  title="Reset conversation"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-gray-400 hover:text-white p-1 rounded transition duration-150"
                  title="Close AI assistant"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Split Content Body (Sidebar + Chat Area) */}
            <div className="flex-1 flex overflow-hidden relative bg-white">
              
              {/* SESSIONS SIDEBAR */}
              <div className={`${
                size === 'small'
                  ? `absolute inset-y-0 left-0 z-30 w-64 bg-brand-navy border-r border-brand-gold/20 transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} transition-transform duration-300 ease-in-out`
                  : 'w-60 bg-brand-navy border-r border-brand-gold/20 flex flex-col shrink-0 text-white'
              } flex flex-col h-full overflow-hidden text-left`}>
                
                {/* Sidebar Top Action */}
                <div className="p-3 border-b border-brand-gold/15 flex items-center justify-between shrink-0 bg-brand-navy">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-brand-gold font-bold flex items-center gap-1.5">
                    <History className="w-3.5 h-3.5" />
                    Chat History
                  </span>
                  <button
                    type="button"
                    onClick={handleCreateNewSession}
                    className="p-1 bg-white/5 hover:bg-white/15 rounded text-brand-gold hover:text-white transition"
                    title="New Study Session"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Sessions list container */}
                <div className="flex-1 overflow-y-auto p-2.5 space-y-1 bg-brand-navy">
                  {sessions.map(s => {
                    const isActive = s.id === activeSessionId;
                    const isEditing = s.id === editingSessionId;

                    return (
                      <div
                        key={s.id}
                        onClick={() => {
                          setActiveSessionId(s.id);
                          if (size === 'small') setSidebarOpen(false);
                        }}
                        className={`group flex items-center justify-between p-2 rounded-xl cursor-pointer transition ${
                          isActive 
                            ? 'bg-brand-gold/20 text-brand-gold border border-brand-gold/30 font-semibold' 
                            : 'text-gray-300 hover:bg-white/5 hover:text-white'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 min-w-0 flex-1">
                          <MessageSquare className="w-3.5 h-3.5 shrink-0 text-brand-gold/60" />
                          {isEditing ? (
                            <input
                              type="text"
                              value={editNameText}
                              onChange={(e) => setEditNameText(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveRename(s.id);
                                if (e.key === 'Escape') setEditingSessionId(null);
                              }}
                              onBlur={() => handleSaveRename(s.id)}
                              autoFocus
                              className="bg-brand-cream text-brand-navy text-[11px] rounded px-1.5 py-0.5 focus:outline-none w-full font-sans"
                              onClick={(e) => e.stopPropagation()}
                            />
                          ) : (
                            <span className="text-[11px] truncate leading-tight">{s.name}</span>
                          )}
                        </div>

                        {/* Actions */}
                        {!isEditing && (
                          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition shrink-0 ml-1">
                            <button
                              type="button"
                              onClick={(e) => handleStartRename(s, e)}
                              className="p-1 text-gray-400 hover:text-brand-gold rounded"
                              title="Rename Study Session"
                            >
                              <Edit className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => handleDeleteSession(s.id, e)}
                              className="p-1 text-gray-400 hover:text-red-400 rounded"
                              title="Delete Study Session"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Backdrop for small screen sidebar overlay */}
              {size === 'small' && sidebarOpen && (
                <div 
                  className="absolute inset-0 bg-black/40 z-20 transition-opacity" 
                  onClick={() => setSidebarOpen(false)}
                />
              )}

              {/* ACTIVE CHAT THREAD */}
              <div className="flex-1 flex flex-col overflow-hidden bg-white h-full">
                
                {/* Message list container */}
                <div 
                  ref={scrollRef}
                  className="flex-1 p-4 overflow-y-auto space-y-4 select-text bg-white"
                >
                  {messages.map((msg) => (
                    <div 
                      key={msg.id} 
                      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`p-3.5 rounded-2xl max-w-[85%] text-left shadow-3xs border ${
                        msg.role === 'user'
                          ? 'bg-brand-navy border-brand-gold/20 text-white rounded-tr-none font-sans'
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

                {/* Quick Chips & Chat Input Box */}
                <div className="border-t border-brand-navy/10 bg-brand-cream p-3 space-y-2 shrink-0">
                  {/* Chips (only show when not thinking and messages list is basic/default) */}
                  {!loading && messages.length <= 1 && (
                    <div className="flex flex-wrap gap-1.5 pb-1 justify-start">
                      {PRESET_CHIPS.map((chip, idx) => (
                        <button
                          key={idx}
                          type="button"
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
                      className="bg-brand-navy text-brand-gold hover:bg-brand-slate border border-brand-gold px-3 rounded-xl transition duration-150 flex items-center justify-center disabled:opacity-50 disabled:hover:bg-brand-navy cursor-pointer shrink-0"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </form>
                </div>
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
