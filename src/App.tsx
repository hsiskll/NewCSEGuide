import React, { useState, useEffect } from 'react';
import { 
  BookOpen, LayoutDashboard, Bookmark, Compass, Settings, 
  Menu, X, GraduationCap, Flame, Clock, Award, ShieldCheck, CheckCircle, Palette
} from 'lucide-react';

import { 
  DEFAULT_FOLDERS, 
  DEFAULT_CHAPTERS, 
  DEFAULT_FLASHCARDS 
} from './data/defaultSyllabus';
import { 
  UPSCState, Folder, Chapter, Flashcard, Bookmark as BookmarkType, 
  StudySessionLog, UserSettings, StudyGoal, ThemeKey, TopicProgress 
} from './types';

// Tab subcomponents
import Onboarding from './components/Onboarding';
import DashboardTab from './components/DashboardTab';
import ChapterLibraryTab from './components/ChapterLibraryTab';
import ChapterReaderTab from './components/ChapterReaderTab';
import LeitnerRevisionTab from './components/LeitnerRevisionTab';
import SettingsTab from './components/SettingsTab';

const LOCAL_STORAGE_KEY = 'cseguide_state_v1';

export const THEME_PALETTES: Record<ThemeKey, { name: string; icon: string; bgClass: string; borderClass: string; vars: Record<string, string> }> = {
  scholar: {
    name: 'Scholar Dark',
    icon: '🎓',
    bgClass: 'bg-[#0D1B2A]',
    borderClass: 'border-[#D4A847]/30',
    vars: {
      '--bg': '#0D1B2A',
      '--sur': '#132233',
      '--ra': '#1B3048',
      '--bd': '#254060',
      '--t1': '#E8EFF7',
      '--t2': '#8A9BB0',
      '--t3': '#4A6070',
      '--gd': '#D4A847',
      '--gd2': '#8A6828',
      '--gg': 'rgba(212,168,71,0.12)',
      '--ok': '#10B981',
      '--er': '#EF4444',
      '--wn': '#F59E0B'
    }
  },
  manuscript: {
    name: 'Manuscript',
    icon: '📜',
    bgClass: 'bg-[#F5EDD6]',
    borderClass: 'border-[#8B4513]/30',
    vars: {
      '--bg': '#F5EDD6',
      '--sur': '#EDE5CC',
      '--ra': '#E4DBC0',
      '--bd': '#C8BEA0',
      '--t1': '#2C1810',
      '--t2': '#6B5040',
      '--t3': '#9A8070',
      '--gd': '#8B4513',
      '--gd2': '#C8802A',
      '--gg': 'rgba(139,69,19,0.12)',
      '--ok': '#10B981',
      '--er': '#EF4444',
      '--wn': '#F59E0B'
    }
  },
  midnight: {
    name: 'Midnight',
    icon: '🌑',
    bgClass: 'bg-[#0A0A0F]',
    borderClass: 'border-[#4DB6AC]/30',
    vars: {
      '--bg': '#0A0A0F',
      '--sur': '#12121A',
      '--ra': '#1A1A26',
      '--bd': '#252535',
      '--t1': '#F0EAD6',
      '--t2': '#A09880',
      '--t3': '#605848',
      '--gd': '#4DB6AC',
      '--gd2': '#2A8A82',
      '--gg': 'rgba(77,182,172,0.12)',
      '--ok': '#10B981',
      '--er': '#EF4444',
      '--wn': '#F59E0B'
    }
  },
  slate: {
    name: 'Slate',
    icon: '🪨',
    bgClass: 'bg-[#1C2533]',
    borderClass: 'border-[#FFB300]/30',
    vars: {
      '--bg': '#1C2533',
      '--sur': '#242E3E',
      '--ra': '#2C3848',
      '--bd': '#3A4A5C',
      '--t1': '#CDD8E8',
      '--t2': '#8898AA',
      '--t3': '#506070',
      '--gd': '#FFB300',
      '--gd2': '#CC8800',
      '--gg': 'rgba(255,179,0,0.12)',
      '--ok': '#10B981',
      '--er': '#EF4444',
      '--wn': '#F59E0B'
    }
  },
  paper: {
    name: 'Paper Light',
    icon: '📄',
    bgClass: 'bg-[#FAFAF7]',
    borderClass: 'border-[#1A3A5C]/30',
    vars: {
      '--bg': '#FAFAF7',
      '--sur': '#F2F2EE',
      '--ra': '#E8E8E4',
      '--bd': '#D0D0C8',
      '--t1': '#1A1A1A',
      '--t2': '#505050',
      '--t3': '#909090',
      '--gd': '#1A3A5C',
      '--gd2': '#2A5A8C',
      '--gg': 'rgba(26,58,92,0.12)',
      '--ok': '#10B981',
      '--er': '#EF4444',
      '--wn': '#F59E0B'
    }
  }
};

const INITIAL_STATE: UPSCState = {
  folders: DEFAULT_FOLDERS,
  chapters: DEFAULT_CHAPTERS,
  flashcards: DEFAULT_FLASHCARDS,
  bookmarks: [],
  logs: [],
  topicProgress: {},
  settings: {
    geminiKey: '',
    hasCompletedOnboarding: false,
    preferences: {
      fontFamily: 'serif',
      fontSize: 17,
      lineSpacing: 1.6
    },
    goal: {
      dailyTargetMinutes: 60,
      targetYear: '2026',
      focusArea: 'Indian Polity & Constitution'
    }
  }
};

export default function App() {
  const [state, setState] = useState<UPSCState>(INITIAL_STATE);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'library' | 'reader' | 'leitner' | 'settings'>('dashboard');
  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(null);
  const [initialSectionId, setInitialSectionId] = useState<string | undefined>(undefined);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [theme, setTheme] = useState<ThemeKey>('scholar');
  const [zenMode, setZenMode] = useState(false);
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);

  // Initialize activeFolderId when folders are ready
  useEffect(() => {
    if (state.folders && state.folders.length > 0 && !activeFolderId) {
      setActiveFolderId(state.folders[0].id);
    }
  }, [state.folders, activeFolderId]);

  // Auto-disable Zen Mode if active tab switches away from reader
  useEffect(() => {
    if (activeTab !== 'reader') {
      setZenMode(false);
    }
  }, [activeTab]);

  // Load state from localStorage on startup
  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem('cseguide_theme') as ThemeKey;
      if (savedTheme && THEME_PALETTES[savedTheme]) {
        setTheme(savedTheme);
      }

      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as UPSCState;
        
        // Ensure the 18 default folders are always present and updated, while preserving user custom folders
        const defaultIds = new Set(DEFAULT_FOLDERS.map(f => f.id));
        const customFolders = (parsed.folders || []).filter(f => !defaultIds.has(f.id));
        const mergedFolders = [...DEFAULT_FOLDERS, ...customFolders];

        setState({
          ...INITIAL_STATE,
          ...parsed,
          folders: mergedFolders,
          topicProgress: parsed.topicProgress || {},
          settings: {
            ...INITIAL_STATE.settings,
            ...(parsed.settings || {}),
            preferences: {
              ...INITIAL_STATE.settings.preferences,
              ...(parsed.settings?.preferences || {})
            },
            goal: {
              ...INITIAL_STATE.settings.goal,
              ...(parsed.settings?.goal || {})
            }
          }
        });
      }
    } catch (e) {
      console.error('Failed to parse saved state:', e);
    }
  }, []);

  // Helper to save state
  const saveState = (updated: UPSCState) => {
    setState(updated);
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to save state:', e);
    }
  };

  // Complete Onboarding
  const handleOnboardingComplete = (goal: StudyGoal, apiKey: string) => {
    const updated: UPSCState = {
      ...state,
      settings: {
        ...state.settings,
        hasCompletedOnboarding: true,
        goal,
        geminiKey: apiKey
      }
    };
    saveState(updated);
  };

  // Log study time in minutes
  const handleLogMinutes = (minutes: number) => {
    const todayStr = new Date().toISOString().split('T')[0];
    const updatedLogs = [...(state.logs || [])];
    
    // Find if we already have a log for today
    const existingLogIdx = updatedLogs.findIndex(log => log.date === todayStr);
    
    if (existingLogIdx !== -1) {
      updatedLogs[existingLogIdx] = {
        ...updatedLogs[existingLogIdx],
        minutes: updatedLogs[existingLogIdx].minutes + minutes
      };
    } else {
      updatedLogs.push({
        id: `log-${Date.now()}`,
        date: todayStr,
        minutes
      });
    }

    saveState({
      ...state,
      logs: updatedLogs
    });
  };

  // Bookmark toggler
  const handleToggleBookmark = (b: Omit<BookmarkType, 'id' | 'addedAt'>) => {
    const updatedBookmarks = [...(state.bookmarks || [])];
    const existingIdx = updatedBookmarks.findIndex(
      item => item.chapterId === b.chapterId && item.topicId === b.topicId
    );

    if (existingIdx !== -1) {
      updatedBookmarks.splice(existingIdx, 1);
    } else {
      updatedBookmarks.push({
        ...b,
        id: `bm-${Date.now()}`,
        addedAt: new Date().toISOString()
      });
    }

    saveState({
      ...state,
      bookmarks: updatedBookmarks
    });
  };

  // Flashcard management
  const handleAddFlashcard = (fc: Omit<Flashcard, 'id' | 'createdAt' | 'streak'>) => {
    const newCard: Flashcard = {
      ...fc,
      id: `fc-${Date.now()}`,
      createdAt: new Date().toISOString(),
      streak: 0
    };
    saveState({
      ...state,
      flashcards: [newCard, ...(state.flashcards || [])]
    });
  };

  const handleAddMultipleFlashcards = (cards: { front: string; back: string }[]) => {
    const newCards: Flashcard[] = cards.map((c, idx) => ({
      id: `fc-ai-${idx}-${Date.now()}`,
      chapterId: selectedChapterId || undefined,
      front: c.front,
      back: c.back,
      subject: selectedChapterId 
        ? state.chapters.find(ch => ch.id === selectedChapterId)?.subject || 'General'
        : 'General',
      box: 1,
      nextReviewDate: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      streak: 0
    }));

    saveState({
      ...state,
      flashcards: [...newCards, ...(state.flashcards || [])]
    });
  };

  const handleUpdateFlashcard = (updatedCard: Flashcard) => {
    const updatedList = (state.flashcards || []).map(c => 
      c.id === updatedCard.id ? updatedCard : c
    );
    saveState({
      ...state,
      flashcards: updatedList
    });
  };

  const handleDeleteFlashcard = (id: string) => {
    const filtered = (state.flashcards || []).filter(c => c.id !== id);
    saveState({
      ...state,
      flashcards: filtered
    });
  };

  // Folder & Chapter addition
  const handleAddFolder = (folder: Folder) => {
    saveState({
      ...state,
      folders: [...(state.folders || []), folder]
    });
  };

  const handleRenameFolder = (folderId: string, newName: string) => {
    saveState({
      ...state,
      folders: (state.folders || []).map(f => f.id === folderId ? { ...f, name: newName } : f)
    });
  };

  const handleDeleteFolder = (folderId: string) => {
    // Delete custom folder and its chapters
    const filteredFolders = (state.folders || []).filter(f => f.id !== folderId);
    const filteredChapters = (state.chapters || []).filter(c => c.folderId !== folderId);
    saveState({
      ...state,
      folders: filteredFolders,
      chapters: filteredChapters
    });
  };

  const handleMoveChapter = (chapterId: string, targetFolderId: string) => {
    saveState({
      ...state,
      chapters: (state.chapters || []).map(c => c.id === chapterId ? { ...c, folderId: targetFolderId } : c)
    });
  };

  const handleAddChapter = (chapter: Chapter) => {
    saveState({
      ...state,
      chapters: [chapter, ...(state.chapters || [])]
    });
  };

  const handleImportChapterWithFolder = (chapter: Chapter, newFolder?: Folder) => {
    saveState({
      ...state,
      folders: newFolder ? [...(state.folders || []), newFolder] : (state.folders || []),
      chapters: [chapter, ...(state.chapters || [])]
    });
  };

  const handleDeleteChapter = (chapterId: string) => {
    const filteredCh = (state.chapters || []).filter(c => c.id !== chapterId);
    const filteredBm = (state.bookmarks || []).filter(b => b.chapterId !== chapterId);
    saveState({
      ...state,
      chapters: filteredCh,
      bookmarks: filteredBm
    });
  };

  const handleResetToDemo = () => {
    localStorage.removeItem(LOCAL_STORAGE_KEY);
    localStorage.removeItem('cseguide_gemini_key');
    setState(INITIAL_STATE);
    setActiveTab('dashboard');
  };

  const handleImportFullState = (newState: UPSCState) => {
    saveState(newState);
    if (newState.folders && newState.folders.length > 0) {
      setActiveFolderId(newState.folders[0].id);
    }
  };

  const handleNavigateToSubject = (paper: string) => {
    let targetFolderId = 'f-polity';
    if (paper.includes('Paper I')) {
      targetFolderId = 'f-modern-history';
    } else if (paper.includes('Paper II')) {
      targetFolderId = 'f-polity';
    } else if (paper.includes('Paper III')) {
      targetFolderId = 'f-economy';
    } else if (paper.includes('Paper IV')) {
      targetFolderId = 'f-ethics';
    }
    setActiveFolderId(targetFolderId);
    setActiveTab('library');
  };

  const handleUpdateKey = (key: string) => {
    saveState({
      ...state,
      settings: {
        ...state.settings,
        geminiKey: key
      }
    });
  };

  const handleNavigateFromSearch = (chapterId: string, topicId?: string) => {
    setSelectedChapterId(chapterId);
    setInitialSectionId(topicId);
    setActiveTab('reader');
  };

  const handleSetTheme = (newTheme: ThemeKey) => {
    setTheme(newTheme);
    localStorage.setItem('cseguide_theme', newTheme);
  };

  const currentPalette = THEME_PALETTES[theme];

  // Global Sidebar Stat Metrics
  const todayStr = new Date().toISOString().split('T')[0];
  const minutesToday = (state.logs || [])
    .filter(log => log.date === todayStr)
    .reduce((acc, curr) => acc + curr.minutes, 0);
  const dailyTarget = state.settings?.goal?.dailyTargetMinutes || 60;
  const progressPercent = Math.min(100, Math.round((minutesToday / dailyTarget) * 100));

  const totalStudiedAllTime = (state.logs || []).reduce((acc, curr) => acc + curr.minutes, 0);
  const selectedChapter = state.chapters.find(c => c.id === selectedChapterId) || null;

  return (
    <div 
      className="min-h-screen font-sans flex flex-col md:flex-row relative transition-colors duration-200"
      style={currentPalette.vars as React.CSSProperties}
    >
      {/* Onboarding Overlay */}
      {!state.settings?.hasCompletedOnboarding && (
        <Onboarding onComplete={handleOnboardingComplete} />
      )}

      {/* Dynamic Gold Header Accent */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-[var(--gd)] z-30"></div>

      {/* MOBILE HEADER BAR */}
      {!zenMode && (
        <div className="md:hidden bg-[var(--sur)] text-[var(--t1)] px-4 py-3 flex justify-between items-center z-20 border-b border-[var(--bd)]">
          <div className="flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-[var(--gd)]" />
            <h1 className="font-serif font-bold text-sm tracking-wide">
              CSE<span className="text-[var(--gd)]">Guide</span>
            </h1>
          </div>
          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-1 text-[var(--gd)] border border-[var(--bd)] rounded-xl"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      )}

      {/* NAVIGATION SIDEBAR */}
      <div 
        className={`${
          zenMode ? 'hidden' : mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        } fixed md:static inset-y-0 left-0 w-64 bg-[var(--sur)] text-[var(--t1)] z-40 md:z-10 flex flex-col justify-between border-r border-[var(--bd)] transition-transform duration-300 shrink-0 h-screen overflow-y-auto`}
      >
        <div>
          {/* Majestic Scholar Banner */}
          <div className="p-6 text-center border-b border-[var(--bd)] relative overflow-hidden bg-[var(--ra)]">
            <div className="mx-auto w-12 h-12 rounded-full bg-[var(--sur)] border border-[var(--gd)] flex items-center justify-center mb-2.5">
              <GraduationCap className="w-6 h-6 text-[var(--gd)]" />
            </div>

            <h1 className="font-serif text-xl font-bold tracking-wider text-[var(--t1)]">
              CSE<span className="text-[var(--gd)]">Guide</span>
            </h1>
            <p className="text-[9px] uppercase tracking-widest text-[var(--gd)] font-bold font-mono mt-0.5">UPSC CSE Study Companion</p>
            <span className="text-[8px] font-serif italic text-[var(--t3)] mt-2 block">"Siddhim Sansthanam Ch"</span>
          </div>

          {/* Study Progress Tracker widget */}
          <div className="p-4 mx-4 mt-4 rounded-3xl bg-[var(--ra)] border border-[var(--bd)] text-center space-y-2">
            <div className="flex justify-between items-center text-[10px] font-mono text-[var(--t3)] uppercase font-bold">
              <span>Today's Study</span>
              <span className="text-[var(--gd)]">{progressPercent}%</span>
            </div>
            
            <div className="flex items-center gap-3 justify-center py-1">
              <Clock className="w-5 h-5 text-[var(--gd)]" />
              <div className="text-left">
                <p className="text-sm font-mono font-bold leading-none text-[var(--t1)]">{minutesToday} / {dailyTarget} m</p>
                <p className="text-[9px] text-[var(--t3)]">Time logged today</p>
              </div>
            </div>

            <div className="w-full bg-[var(--sur)] rounded-full h-1 overflow-hidden border border-[var(--bd)]">
              <div className="bg-[var(--gd)] h-full transition-all duration-300" style={{ width: `${progressPercent}%` }}></div>
            </div>
          </div>

          {/* Main Tab Nav Menu */}
          <nav className="p-4 space-y-1 text-left">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
              { id: 'library', label: 'Study Library', icon: BookOpen },
              { id: 'leitner', label: 'Leitner Revision', icon: Compass },
              { id: 'settings', label: 'Settings', icon: Settings }
            ].map(item => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id as any);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold uppercase tracking-wider transition duration-150 ${
                    isActive 
                      ? 'bg-[var(--gd)] text-[var(--bg)] shadow-md font-extrabold border-r-4 border-r-white' 
                      : 'text-[var(--t2)] hover:bg-[var(--ra)] hover:text-[var(--t1)]'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[var(--bg)]' : 'text-[var(--gd)]'}`} />
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer & Theme Toggler */}
        <div className="p-4 border-t border-[var(--bd)] space-y-3 bg-[var(--ra)]/30">
          
          {/* Aesthetic Theme Switcher Panel */}
          <div className="space-y-1.5">
            <span className="text-[9px] uppercase font-mono tracking-wider text-[var(--t3)] font-bold flex items-center gap-1">
              <Palette className="w-3 h-3 text-[var(--gd)]" />
              Switch Study Desk Theme
            </span>
            <div className="grid grid-cols-5 gap-1">
              {(Object.keys(THEME_PALETTES) as ThemeKey[]).map(key => {
                const isSel = theme === key;
                return (
                  <button
                    key={key}
                    onClick={() => handleSetTheme(key)}
                    title={THEME_PALETTES[key].name}
                    className={`p-1.5 rounded-lg border text-sm transition ${
                      isSel 
                        ? 'bg-[var(--gd)] text-[var(--bg)] border-transparent scale-110 shadow-xs' 
                        : 'bg-[var(--sur)] hover:bg-[var(--ra)] border-[var(--bd)] text-[var(--t2)]'
                    }`}
                  >
                    {THEME_PALETTES[key].icon}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-1.5 justify-center text-[10px] font-mono text-[var(--t2)] border-t border-[var(--bd)] pt-2">
            <Award className="w-4 h-4 text-[var(--gd)] shrink-0" />
            <span>Session: {totalStudiedAllTime} min</span>
          </div>
          
          <div className="flex items-center justify-center gap-1 text-[9px] text-[var(--gd)] font-mono bg-[var(--sur)] p-1.5 rounded-xl border border-[var(--bd)]">
            <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
            <span>Secure Sandbox State</span>
          </div>
        </div>
      </div>

      {/* MAIN VIEWPORT */}
      <main className={`${zenMode ? 'p-0 h-screen overflow-hidden' : 'p-4 sm:p-6 md:p-8 overflow-y-auto'} flex-1 relative bg-[var(--bg)] text-[var(--t1)]`}>
        
        {activeTab === 'dashboard' && (
          <DashboardTab
            state={state}
            onNavigateToChapter={handleNavigateFromSearch}
            onNavigateToLeitner={() => setActiveTab('leitner')}
            onNavigateToSubject={handleNavigateToSubject}
          />
        )}

        {activeTab === 'library' && (
          <ChapterLibraryTab
            folders={state.folders || []}
            chapters={state.chapters || []}
            onAddFolder={handleAddFolder}
            onAddChapter={handleAddChapter}
            onDeleteChapter={handleDeleteChapter}
            onImportChapter={handleImportChapterWithFolder}
            onRenameFolder={handleRenameFolder}
            onDeleteFolder={handleDeleteFolder}
            onMoveChapter={handleMoveChapter}
            topicProgress={state.topicProgress || {}}
            flashcards={state.flashcards || []}
            activeFolderId={activeFolderId}
            setActiveFolderId={setActiveFolderId}
            onSelectChapter={(id) => {
              setSelectedChapterId(id);
              setInitialSectionId(undefined);
              setActiveTab('reader');
            }}
          />
        )}

        {activeTab === 'reader' && selectedChapter && (
          <ChapterReaderTab
            chapter={selectedChapter}
            bookmarks={state.bookmarks || []}
            onToggleBookmark={handleToggleBookmark}
            onLogMinutes={handleLogMinutes}
            onBackToLibrary={() => setActiveTab('library')}
            savedProgress={state.topicProgress || {}}
            onSaveProgress={(topicId, prog) => {
              saveState({
                ...state,
                topicProgress: {
                  ...(state.topicProgress || {}),
                  [topicId]: prog
                }
              });
            }}
            zenMode={zenMode}
            onToggleZenMode={() => setZenMode(!zenMode)}
          />
        )}

        {activeTab === 'reader' && !selectedChapter && (
          <div className="bg-[var(--sur)] p-12 text-center rounded-3xl border border-[var(--bd)] space-y-4 max-w-md mx-auto my-12 shadow-sm animate-fade-in">
            <BookOpen className="w-12 h-12 text-[var(--gd)] mx-auto animate-bounce" />
            <h3 className="font-serif font-bold text-[var(--t1)] text-lg">No Syllabus Chapter Active</h3>
            <p className="text-xs text-[var(--t2)] font-serif max-w-sm mx-auto leading-relaxed">
              Open the <strong>Study Library</strong> directory, select an GS Subject folder, and open any cabinet chapter to launch your interactive study desk.
            </p>
            <button
              onClick={() => setActiveTab('library')}
              className="bg-[var(--gd)] text-[var(--bg)] text-xs font-bold px-5 py-2.5 rounded-xl uppercase tracking-wider transition hover:opacity-90"
            >
              Go to Study Library
            </button>
          </div>
        )}

        {activeTab === 'leitner' && (
          <LeitnerRevisionTab
            flashcards={state.flashcards || []}
            onUpdateFlashcard={handleUpdateFlashcard}
            onAddFlashcard={handleAddFlashcard}
            onDeleteFlashcard={handleDeleteFlashcard}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsTab
            state={state}
            onImportFullState={handleImportFullState}
            onResetToDemo={handleResetToDemo}
            onUpdateKey={handleUpdateKey}
          />
        )}

      </main>
    </div>
  );
}
