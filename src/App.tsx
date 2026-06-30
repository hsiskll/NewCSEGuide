import React, { useState, useEffect } from 'react';
import { 
  BookOpen, LayoutDashboard, Bookmark, Compass, Settings, 
  Menu, X, GraduationCap, Flame, Clock, Award, ShieldCheck, CheckCircle, Palette,
  Target, Check, Database, Search, ChevronLeft, ChevronRight, Timer, RefreshCw,
  Minimize2, Maximize2, Play, Pause, CalendarCheck, Newspaper
} from 'lucide-react';

import { 
  DEFAULT_FOLDERS, 
  DEFAULT_CHAPTERS, 
  DEFAULT_FLASHCARDS 
} from './data/defaultSyllabus';
import { 
  UPSCState, Folder, Chapter, Topic, Flashcard, Bookmark as BookmarkType, 
  StudySessionLog, UserSettings, StudyGoal, ThemeKey, TopicProgress 
} from './types';

// Tab subcomponents
import Onboarding from './components/Onboarding';
import DashboardTab from './components/DashboardTab';
import ChapterLibraryTab from './components/ChapterLibraryTab';
import ChapterReaderTab from './components/ChapterReaderTab';
import LeitnerRevisionTab from './components/LeitnerRevisionTab';
import SettingsTab from './components/SettingsTab';
import ImportCenterTab from './components/ImportCenterTab';
import ProgressTrackerTab from './components/ProgressTrackerTab';
import WeeklyTestTab from './components/WeeklyTestTab';
import FloatingAskAI from './components/FloatingAskAI';
import NewspaperMapperTab from './components/NewspaperMapperTab';

const LOCAL_STORAGE_KEY = 'cseguide_state_v1';

export const THEME_PALETTES: Record<ThemeKey, { name: string; icon: string; bgClass: string; borderClass: string; vars: Record<string, string> }> = {
  newspaper: {
    name: 'Old Newspaper',
    icon: '📰',
    bgClass: 'bg-[#F4EFEB]',
    borderClass: 'border-[#CBC0B0]/40',
    vars: {
      '--bg': '#F4EFEB',
      '--sur': '#EDE6DC',
      '--ra': '#E2D9CE',
      '--bd': '#CBC0B0',
      '--t1': '#1C1917',
      '--t2': '#4F463D',
      '--t3': '#837361',
      '--gd': '#8C2222',
      '--gd2': '#B33939',
      '--gg': 'rgba(140,34,34,0.12)',
      '--ok': '#16A34A',
      '--er': '#DC2626',
      '--wn': '#D97706'
    }
  },
  white: {
    name: 'Pristine White',
    icon: '📄',
    bgClass: 'bg-[#FFFFFF]',
    borderClass: 'border-[#E2E8F0]',
    vars: {
      '--bg': '#FFFFFF',
      '--sur': '#F8FAFC',
      '--ra': '#F1F5F9',
      '--bd': '#E2E8F0',
      '--t1': '#0F172A',
      '--t2': '#334155',
      '--t3': '#64748B',
      '--gd': '#1E3A8A',
      '--gd2': '#3B82F6',
      '--gg': 'rgba(30,58,138,0.1)',
      '--ok': '#10B981',
      '--er': '#EF4444',
      '--wn': '#F59E0B'
    }
  },
  obsidian: {
    name: 'Obsidian Dark',
    icon: '🌋',
    bgClass: 'bg-[#121212]',
    borderClass: 'border-[#2F2F2F]',
    vars: {
      '--bg': '#121212',
      '--sur': '#1A1A1A',
      '--ra': '#242424',
      '--bd': '#2F2F2F',
      '--t1': '#E0E0E0',
      '--t2': '#A3A3A3',
      '--t3': '#666666',
      '--gd': '#9F7AEA',
      '--gd2': '#B794F4',
      '--gg': 'rgba(159,122,234,0.12)',
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
  completedChapters: {},
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
      focusArea: 'Indian Polity & Constitution',
      userName: 'Ray'
    }
  }
};

export default function App() {
  const [state, setState] = useState<UPSCState>(INITIAL_STATE);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'library' | 'progress' | 'reader' | 'leitner' | 'import' | 'settings' | 'weekly-test' | 'newspaper-mapper'>('dashboard');
  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(null);
  const [initialSectionId, setInitialSectionId] = useState<string | undefined>(undefined);
  const [initialReaderTab, setInitialReaderTab] = useState<string | undefined>(undefined);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [theme, setTheme] = useState<ThemeKey>('white');
  const [zenMode, setZenMode] = useState(false);
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
  const [showGoalsPopup, setShowGoalsPopup] = useState(false);

  // Pomodoro Timer States
  const [pomoWorkMinutes, setPomoWorkMinutes] = useState<number>(25);
  const [pomoBreakMinutes, setPomoBreakMinutes] = useState<number>(5);
  const [pomoMode, setPomoMode] = useState<'work' | 'break'>('work');
  const [pomoSecondsLeft, setPomoSecondsLeft] = useState<number>(25 * 60);
  const [pomoIsActive, setPomoIsActive] = useState<boolean>(false);
  const [pomoFloatingVisible, setPomoFloatingVisible] = useState<boolean>(false);
  const [pomoIsCapsule, setPomoIsCapsule] = useState<boolean>(false);
  const [pomoPosition, setPomoPosition] = useState({ x: 120, y: 150 });
  const [pomoAlertMessage, setPomoAlertMessage] = useState<string | null>(null);

  const [isPomoDragging, setIsPomoDragging] = useState(false);
  const [pomoDragOffset, setPomoDragOffset] = useState({ x: 0, y: 0 });

  // Update timer remaining seconds when Work/Break defaults change and timer is reset/inactive
  useEffect(() => {
    if (!pomoIsActive) {
      setPomoSecondsLeft(pomoMode === 'work' ? pomoWorkMinutes * 60 : pomoBreakMinutes * 60);
    }
  }, [pomoWorkMinutes, pomoBreakMinutes, pomoMode]);

  // Pomodoro sound chime using Web Audio API
  const playPomoChime = () => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      
      const playTone = (freq: number, startTime: number, duration: number) => {
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, startTime);
        gainNode.gain.setValueAtTime(0.25, startTime);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
        osc.connect(gainNode);
        gainNode.connect(ctx.destination);
        osc.start(startTime);
        osc.stop(startTime + duration);
      };

      playTone(523.25, ctx.currentTime, 0.4); // C5
      playTone(659.25, ctx.currentTime + 0.15, 0.5); // E5
      playTone(783.99, ctx.currentTime + 0.3, 0.6); // G5
    } catch (e) {
      console.log('Web Audio chiming is restricted/unsupported:', e);
    }
  };

  // Handle timer countdown
  useEffect(() => {
    let interval: any = null;
    if (pomoIsActive && pomoSecondsLeft > 0) {
      interval = setInterval(() => {
        setPomoSecondsLeft(prev => {
          if (prev <= 1) {
            clearInterval(interval);
            // Completed!
            playPomoChime();
            setPomoIsActive(false);
            if (pomoMode === 'work') {
              setPomoMode('break');
              setPomoSecondsLeft(pomoBreakMinutes * 60);
              setPomoAlertMessage('Excellent effort! Your focus interval is complete. Take a refreshing break.');
            } else {
              setPomoMode('work');
              setPomoSecondsLeft(pomoWorkMinutes * 60);
              setPomoAlertMessage('Break is over! Time to get back to active UPSC preparation.');
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [pomoIsActive, pomoSecondsLeft, pomoMode, pomoWorkMinutes, pomoBreakMinutes]);

  // Draggable logic for Mouse
  const handlePomoMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('input')) {
      return;
    }
    setIsPomoDragging(true);
    setPomoDragOffset({
      x: e.clientX - pomoPosition.x,
      y: e.clientY - pomoPosition.y
    });
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isPomoDragging) return;
      const newX = Math.max(10, Math.min(window.innerWidth - 240, e.clientX - pomoDragOffset.x));
      const newY = Math.max(10, Math.min(window.innerHeight - 180, e.clientY - pomoDragOffset.y));
      setPomoPosition({ x: newX, y: newY });
    };

    const handleMouseUp = () => {
      setIsPomoDragging(false);
    };

    if (isPomoDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isPomoDragging, pomoDragOffset]);

  // Draggable logic for Touch (Mobile)
  const handlePomoTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('input')) {
      return;
    }
    const touch = e.touches[0];
    setIsPomoDragging(true);
    setPomoDragOffset({
      x: touch.clientX - pomoPosition.x,
      y: touch.clientY - pomoPosition.y
    });
  };

  useEffect(() => {
    const handleTouchMove = (e: TouchEvent) => {
      if (!isPomoDragging) return;
      const touch = e.touches[0];
      const newX = Math.max(10, Math.min(window.innerWidth - 240, touch.clientX - pomoDragOffset.x));
      const newY = Math.max(10, Math.min(window.innerHeight - 180, touch.clientY - pomoDragOffset.y));
      setPomoPosition({ x: newX, y: newY });
    };

    const handleTouchEnd = () => {
      setIsPomoDragging(false);
    };

    if (isPomoDragging) {
      window.addEventListener('touchmove', handleTouchMove, { passive: false });
      window.addEventListener('touchend', handleTouchEnd);
    }
    return () => {
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isPomoDragging, pomoDragOffset]);

  const formatPomoTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Chapter completion toggle handler (D+2 Revision rule)
  const handleToggleChapterComplete = (chapterId: string, complete: boolean) => {
    const todayStr = new Date().toISOString().split('T')[0];
    const updatedCompletedChapters = { ...(state.completedChapters || {}) };
    if (complete) {
      updatedCompletedChapters[chapterId] = todayStr;
    } else {
      delete updatedCompletedChapters[chapterId];
    }
    saveState({
      ...state,
      completedChapters: updatedCompletedChapters
    });
  };

  const [universalFont, setUniversalFont] = useState<string>(localStorage.getItem('cseguide_universal_font') || 'Inter');
  const [customSecondaryColor, setCustomSecondaryColor] = useState<string>(localStorage.getItem('cseguide_custom_secondary_color') || '');
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(localStorage.getItem('cseguide_sidebar_collapsed') === 'true');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{ chapter: Chapter; topic: Topic; snippet: string }[]>([]);

  const hexToRgba = (hex: string, alpha: number): string => {
    let cleanHex = hex.replace('#', '');
    if (cleanHex.length === 3) {
      cleanHex = cleanHex.split('').map(char => char + char).join('');
    }
    const r = parseInt(cleanHex.substring(0, 2), 16);
    const g = parseInt(cleanHex.substring(2, 4), 16);
    const b = parseInt(cleanHex.substring(4, 6), 16);
    return `rgba(${isNaN(r) ? 140 : r}, ${isNaN(g) ? 34 : g}, ${isNaN(b) ? 34 : b}, ${alpha})`;
  };

  const getFinalVars = () => {
    const vars = { ...currentPalette.vars };
    if (customSecondaryColor) {
      vars['--gd'] = customSecondaryColor;
      vars['--gd2'] = customSecondaryColor;
      vars['--gg'] = hexToRgba(customSecondaryColor, 0.12);
    }
    return vars;
  };

  useEffect(() => {
    document.documentElement.style.setProperty('--font-universal', universalFont);
  }, [universalFont]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (!query.trim() || query.length < 2) {
      setSearchResults([]);
      return;
    }

    const term = query.toLowerCase();
    const results: { chapter: Chapter; topic: Topic; snippet: string }[] = [];

    (state.chapters || []).forEach(chapter => {
      const topics = chapter.topics || [];
      topics.forEach(topic => {
        const titleMatch = topic.title.toLowerCase().includes(term);
        const fullText = topic.full_text || topic.raw_text || "";
        const bodyMatch = fullText.toLowerCase().includes(term);

        if (titleMatch || bodyMatch) {
          let snippet = '';
          if (bodyMatch) {
            const idx = fullText.toLowerCase().indexOf(term);
            const start = Math.max(0, idx - 40);
            const end = Math.min(fullText.length, idx + term.length + 60);
            snippet = (start > 0 ? '...' : '') + fullText.substring(start, end).replace(/\n/g, ' ') + (end < fullText.length ? '...' : '');
          } else {
            snippet = fullText.substring(0, 100).replace(/\n/g, ' ') + '...';
          }

          results.push({
            chapter,
            topic,
            snippet
          });
        }
      });
    });

    setSearchResults(results.slice(0, 8));
  };

  // Auto-trigger daily goals notification and in-app window
  useEffect(() => {
    // Only trigger if onboarding has been completed
    if (!state.settings?.hasCompletedOnboarding) return;

    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const hours = today.getHours();

    // Trigger at 8 AM or after
    if (hours >= 8) {
      const lastDismissed = localStorage.getItem('cseguide_last_dismissed_goals_date');
      if (lastDismissed !== todayStr) {
        setShowGoalsPopup(true);

        // System notification trigger
        if (typeof window !== 'undefined' && 'Notification' in window) {
          if (Notification.permission === 'default') {
            Notification.requestPermission();
          } else if (Notification.permission === 'granted') {
            const targets = state.planner?.[todayStr]?.targets || [];
            const textTargets = targets.length > 0
              ? targets.map(t => `• ${t.text}`).join('\n')
              : "No specific targets set yet. Open your planner to add goals!";

            try {
              const notification = new Notification("Today's Targets", {
                body: textTargets,
                vibrate: [100]
              } as any);
              notification.onclick = () => {
                window.focus();
                setShowGoalsPopup(true);
              };
            } catch (err) {
              console.log('Notification delivery failed', err);
            }
          }
        }
      }
    }
  }, [state.settings?.hasCompletedOnboarding, state.planner]);

  // Do not auto-initialize activeFolderId so the user starts at the main Cabinet directory view.

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
          completedChapters: parsed.completedChapters || {},
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

  const extractFlashcardsFromChapter = (chapter: Chapter): Flashcard[] => {
    const newFlashcards: Flashcard[] = [];
    (chapter.topics || []).forEach(topic => {
      if (topic.flashcards && Array.isArray(topic.flashcards)) {
        topic.flashcards.forEach((tf, tfIdx) => {
          newFlashcards.push({
            id: `fc-imported-${chapter.id}-${topic.id}-${tfIdx}-${Date.now()}`,
            chapterId: chapter.id,
            topicId: topic.id,
            front: tf.front,
            back: tf.back,
            subject: chapter.subject || 'General',
            box: 1,
            nextReviewDate: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            streak: 0
          });
        });
      }
    });
    return newFlashcards;
  };

  const handleAddChapter = (chapter: Chapter) => {
    const embeddedCards = extractFlashcardsFromChapter(chapter);
    saveState({
      ...state,
      chapters: [chapter, ...(state.chapters || [])],
      flashcards: [...embeddedCards, ...(state.flashcards || [])]
    });
  };

  const handleImportChapterWithFolder = (chapter: Chapter, newFolder?: Folder) => {
    const embeddedCards = extractFlashcardsFromChapter(chapter);
    saveState({
      ...state,
      folders: newFolder ? [...(state.folders || []), newFolder] : (state.folders || []),
      chapters: [chapter, ...(state.chapters || [])],
      flashcards: [...embeddedCards, ...(state.flashcards || [])]
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

  const handleNavigateFromSearch = (chapterId: string, topicId?: string, tabId?: string) => {
    setSelectedChapterId(chapterId);
    setInitialSectionId(topicId);
    setInitialReaderTab(tabId);
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
      style={getFinalVars() as React.CSSProperties}
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
        } fixed md:static inset-y-0 left-0 ${sidebarCollapsed ? 'md:w-20' : 'md:w-72'} bg-[var(--sur)] text-[var(--t1)] z-40 md:z-10 flex flex-col justify-between border-r border-[var(--bd)] transition-all duration-300 shrink-0 h-screen overflow-y-auto`}
      >
        <div className="relative">
          {/* Majestic Scholar Banner */}
          <div className="p-4 md:p-6 text-center border-b border-[var(--bd)] relative overflow-hidden bg-[var(--ra)]">
            {/* Toggle button */}
            <button 
              onClick={() => {
                const next = !sidebarCollapsed;
                setSidebarCollapsed(next);
                localStorage.setItem('cseguide_sidebar_collapsed', String(next));
              }}
              className="hidden md:flex absolute top-3 right-3 p-1 rounded-lg border border-[var(--bd)] bg-[var(--sur)] text-[var(--gd)] hover:bg-[var(--ra)] transition z-50"
              title={sidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
            >
              {sidebarCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
            </button>

            <div className="mx-auto w-10 h-10 md:w-12 md:h-12 rounded-full bg-[var(--sur)] border border-[var(--gd)] flex items-center justify-center mb-2">
              <GraduationCap className="w-5 h-5 md:w-6 md:h-6 text-[var(--gd)]" />
            </div>

            {!sidebarCollapsed && (
              <div className="animate-fade-in">
                <h1 className="font-serif text-lg md:text-xl font-bold tracking-wider text-[var(--t1)]">
                  CSE<span className="text-[var(--gd)]">Guide</span>
                </h1>
                <p className="text-[8px] uppercase tracking-widest text-[var(--gd)] font-bold font-mono mt-0.5">UPSC CSE Study Companion</p>
                <span className="text-[8px] font-serif italic text-[var(--t3)] mt-2 block">"Siddhim Sansthanam Ch"</span>
              </div>
            )}
          </div>

          {/* Global Search Bar (Only when sidebar is expanded) */}
          {!sidebarCollapsed ? (
            <div className="px-4 py-3 relative border-b border-[var(--bd)]/10">
              <label className="block text-[9px] font-bold uppercase tracking-wider text-[var(--t3)] mb-1">Search UPSC Repository</label>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-[var(--t3)]" />
                <input 
                  type="text"
                  className="w-full bg-[var(--ra)] text-[var(--t1)] border border-[var(--bd)] rounded-xl py-1.5 pl-8 pr-3 text-xs focus:outline-none focus:ring-1 focus:ring-[var(--gd)]"
                  placeholder="Search key terms..."
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                />
              </div>

              {/* Search Results Dropdown inside sidebar */}
              {searchResults.length > 0 && (
                <div className="absolute left-4 right-4 mt-2 bg-[var(--sur)] border border-[var(--bd)] rounded-xl shadow-xl z-50 max-h-64 overflow-y-auto divide-y divide-[var(--bd)]">
                  <div className="p-2 bg-[var(--ra)] text-[var(--t1)] text-[10px] font-mono font-semibold flex justify-between items-center">
                    <span>{searchResults.length} found</span>
                    <button 
                      onClick={() => { setSearchQuery(''); setSearchResults([]); }} 
                      className="text-[var(--gd)] hover:underline text-[9px]"
                    >
                      Clear
                    </button>
                  </div>
                  {searchResults.map((res, idx) => (
                    <div 
                      key={idx}
                      onClick={() => {
                        handleNavigateFromSearch(res.chapter.id, res.topic.id);
                        setSearchQuery('');
                        setSearchResults([]);
                      }}
                      className="p-2 hover:bg-[var(--ra)] cursor-pointer transition text-left group"
                    >
                      <h4 className="text-[10px] font-bold text-[var(--t1)] group-hover:text-[var(--gd)] transition truncate">
                        {res.topic.title}
                      </h4>
                      <p className="text-[8px] text-[var(--t3)] truncate">Ch: {res.chapter.title}</p>
                    </div>
                  ))}
                </div>
              )}
              {searchQuery && searchResults.length === 0 && (
                <p className="text-[9px] text-[var(--t3)] italic mt-1 text-center">Type 2+ letters...</p>
              )}
            </div>
          ) : (
            <div className="flex justify-center py-3 border-b border-[var(--bd)]/10">
              <button 
                onClick={() => setSidebarCollapsed(false)}
                className="p-2 rounded-xl hover:bg-[var(--ra)] text-[var(--gd)] transition"
                title="Search UPSC Repository"
              >
                <Search className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Study Progress Tracker widget */}
          {!sidebarCollapsed && (
            <div className="p-4 mx-4 mt-4 rounded-3xl bg-[var(--ra)] border border-[var(--bd)] text-center space-y-2 animate-fade-in">
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
          )}

          {/* Main Tab Nav Menu */}
          <nav className="p-4 space-y-1 text-left">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
              { id: 'library', label: 'Study Library', icon: BookOpen },
              { id: 'progress', label: 'Progress Matrix', icon: Award },
              { id: 'leitner', label: 'Leitner Revision', icon: Compass },
              { id: 'weekly-test', label: 'Weekly Test', icon: CalendarCheck },
              { id: 'newspaper-mapper', label: 'Newspaper Mapper', icon: Newspaper },
              { id: 'settings', label: 'Settings', icon: Settings }
            ].map(item => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              if (sidebarCollapsed) {
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      if (item.id === 'library') {
                        setActiveFolderId(null);
                      }
                      setActiveTab(item.id as any);
                      setMobileMenuOpen(false);
                    }}
                    title={item.label}
                    className={`w-full flex items-center justify-center p-3 rounded-xl transition duration-150 ${
                      isActive 
                        ? 'bg-[var(--gd)] text-[var(--bg)] shadow-md' 
                        : 'text-[var(--t2)] hover:bg-[var(--ra)] hover:text-[var(--t1)]'
                    }`}
                  >
                    <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-[var(--bg)]' : 'text-[var(--gd)]'}`} />
                  </button>
                );
              }

              return (
                <button
                  key={item.id}
                  onClick={() => {
                    if (item.id === 'library') {
                      setActiveFolderId(null);
                    }
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

          {/* Pomodoro Timer Sidebar Section */}
          {!sidebarCollapsed ? (
            <div className="mx-4 my-2 p-3.5 bg-[var(--ra)]/40 border border-[var(--bd)] rounded-2xl space-y-3 font-sans">
              <div className="flex items-center justify-between border-b border-[var(--bd)]/30 pb-2">
                <div className="flex items-center gap-2">
                  <Timer className={`w-4 h-4 text-[var(--gd)] ${pomoIsActive ? 'animate-pulse' : ''}`} />
                  <span className="text-xs font-bold uppercase tracking-wider text-[var(--t1)]">Pomodoro Clock</span>
                </div>
                <button 
                  onClick={() => setPomoFloatingVisible(prev => !prev)}
                  className="text-[10px] text-[var(--gd)] hover:underline font-bold"
                >
                  {pomoFloatingVisible ? 'Hide Floating' : 'Show Floating'}
                </button>
              </div>

              {/* Adjustments */}
              <div className="grid grid-cols-2 gap-2 text-[10px]">
                <div>
                  <label className="block text-[9px] uppercase tracking-wider text-[var(--t3)] font-bold mb-1">Work (min)</label>
                  <div className="flex items-center border border-[var(--bd)] rounded-xl overflow-hidden bg-[var(--sur)]">
                    <button 
                      type="button"
                      onClick={() => setPomoWorkMinutes(m => Math.max(1, m - 1))}
                      className="px-2 py-1 hover:bg-[var(--ra)] font-bold text-[var(--t2)] border-r border-[var(--bd)]"
                    >
                      -
                    </button>
                    <input 
                      type="number"
                      className="w-full text-center bg-transparent text-xs text-[var(--t1)] outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      value={pomoWorkMinutes}
                      onChange={(e) => setPomoWorkMinutes(Math.max(1, parseInt(e.target.value) || 25))}
                    />
                    <button 
                      type="button"
                      onClick={() => setPomoWorkMinutes(m => Math.min(180, m + 1))}
                      className="px-2 py-1 hover:bg-[var(--ra)] font-bold text-[var(--t2)] border-l border-[var(--bd)]"
                    >
                      +
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-[9px] uppercase tracking-wider text-[var(--t3)] font-bold mb-1">Break (min)</label>
                  <div className="flex items-center border border-[var(--bd)] rounded-xl overflow-hidden bg-[var(--sur)]">
                    <button 
                      type="button"
                      onClick={() => setPomoBreakMinutes(m => Math.max(1, m - 1))}
                      className="px-2 py-1 hover:bg-[var(--ra)] font-bold text-[var(--t2)] border-r border-[var(--bd)]"
                    >
                      -
                    </button>
                    <input 
                      type="number"
                      className="w-full text-center bg-transparent text-xs text-[var(--t1)] outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      value={pomoBreakMinutes}
                      onChange={(e) => setPomoBreakMinutes(Math.max(1, parseInt(e.target.value) || 5))}
                    />
                    <button 
                      type="button"
                      onClick={() => setPomoBreakMinutes(m => Math.min(60, m + 1))}
                      className="px-2 py-1 hover:bg-[var(--ra)] font-bold text-[var(--t2)] border-l border-[var(--bd)]"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              {/* Start/Control button */}
              <div className="pt-1 flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (!pomoIsActive) {
                      setPomoIsActive(true);
                      setPomoFloatingVisible(true);
                    } else {
                      setPomoIsActive(false);
                    }
                  }}
                  className={`w-full py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider transition ${
                    pomoIsActive 
                      ? 'bg-amber-600/30 text-amber-500 border border-amber-500/40 hover:bg-amber-600/40' 
                      : 'bg-[var(--gd)] text-[var(--bg)] hover:opacity-90 font-extrabold'
                  }`}
                >
                  {pomoIsActive 
                    ? 'Pause Session' 
                    : pomoSecondsLeft < (pomoMode === 'work' ? pomoWorkMinutes * 60 : pomoBreakMinutes * 60)
                      ? 'Resume'
                      : 'Begin Focus'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPomoIsActive(false);
                    setPomoSecondsLeft(pomoMode === 'work' ? pomoWorkMinutes * 60 : pomoBreakMinutes * 60);
                  }}
                  className="px-2.5 py-1.5 bg-[var(--sur)] border border-[var(--bd)] hover:border-red-500 hover:text-red-500 text-[var(--t3)] rounded-xl text-[10px] font-bold transition flex items-center justify-center gap-1"
                  title="End and Reset Session"
                >
                  End
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center py-2 border-t border-[var(--bd)]/10 mt-2">
              <button
                onClick={() => {
                  setPomoFloatingVisible(prev => !prev);
                  if (!pomoFloatingVisible && !pomoIsActive) {
                    setPomoSecondsLeft(pomoMode === 'work' ? pomoWorkMinutes * 60 : pomoBreakMinutes * 60);
                  }
                }}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition border ${
                  pomoIsActive 
                    ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-500' 
                    : 'bg-[var(--ra)] border-[var(--bd)] text-[var(--gd)] hover:bg-[var(--sur)]'
                }`}
                title="Toggle Floating Pomodoro Timer"
              >
                <Timer className={`w-4 h-4 ${pomoIsActive ? 'animate-pulse' : ''}`} />
              </button>
              {pomoIsActive && (
                <span className="text-[8px] font-mono font-bold mt-1 text-[var(--t2)] text-center scale-90">
                  {Math.floor(pomoSecondsLeft / 60)}m
                </span>
              )}
            </div>
          )}
        </div>

        {/* Sidebar Footer & Theme Toggler */}
        <div className="p-4 border-t border-[var(--bd)] space-y-3 bg-[var(--ra)]/30">
          {sidebarCollapsed ? (
            <div className="space-y-2 text-center">
              <button
                onClick={() => {
                  const keys = Object.keys(THEME_PALETTES) as ThemeKey[];
                  const currentIdx = keys.indexOf(theme);
                  const nextKey = keys[(currentIdx + 1) % keys.length];
                  handleSetTheme(nextKey);
                }}
                className="p-2 w-full rounded-xl border border-[var(--bd)] bg-[var(--sur)] text-[var(--gd)] hover:bg-[var(--ra)] flex items-center justify-center"
                title={`Cycle Theme (Current: ${THEME_PALETTES[theme].name})`}
              >
                <Palette className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <>
              {/* Aesthetic Theme Switcher Panel */}
              <div className="space-y-1.5 animate-fade-in">
                <span className="text-[9px] uppercase font-mono tracking-wider text-[var(--t3)] font-bold flex items-center gap-1">
                  <Palette className="w-3 h-3 text-[var(--gd)]" />
                  Switch Study Desk Theme
                </span>
                <div className="grid grid-cols-3 gap-1.5">
                  {(Object.keys(THEME_PALETTES) as ThemeKey[]).map(key => {
                    const isSel = theme === key;
                    return (
                      <button
                        key={key}
                        onClick={() => handleSetTheme(key)}
                        title={THEME_PALETTES[key].name}
                        className={`py-2 px-1 rounded-xl border text-xs font-medium transition flex flex-col items-center gap-1 ${
                          isSel 
                            ? 'bg-[var(--gd)] text-[var(--bg)] border-transparent scale-105 shadow-md font-bold' 
                            : 'bg-[var(--sur)] hover:bg-[var(--ra)] border-[var(--bd)] text-[var(--t2)]'
                        }`}
                      >
                        <span className="text-base">{THEME_PALETTES[key].icon}</span>
                        <span className="text-[9px] scale-90 tracking-tight leading-none text-center block max-w-full truncate">
                          {THEME_PALETTES[key].name.split(' ')[0]}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center gap-1.5 justify-center text-[10px] font-mono text-[var(--t2)] border-t border-[var(--bd)] pt-2 animate-fade-in">
                <Award className="w-4 h-4 text-[var(--gd)] shrink-0" />
                <span>Session: {totalStudiedAllTime} min</span>
              </div>
              
              <div className="flex items-center justify-center gap-1 text-[9px] text-[var(--gd)] font-mono bg-[var(--sur)] p-1.5 rounded-xl border border-[var(--bd)] animate-fade-in">
                <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                <span>Secure Sandbox State</span>
              </div>
            </>
          )}
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
            onUpdateState={saveState}
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

        {activeTab === 'progress' && (
          <ProgressTrackerTab
            folders={state.folders || []}
            chapters={state.chapters || []}
            topicProgress={state.topicProgress || {}}
            onToggleProgress={(topicId, field) => {
              const currentProg = state.topicProgress?.[topicId] || {
                read: false, slides: false, concepts: false, flashcards: false, notes: ""
              };
              const updatedProg = {
                ...currentProg,
                [field]: !currentProg[field]
              };
              saveState({
                ...state,
                topicProgress: {
                  ...(state.topicProgress || {}),
                  [topicId]: updatedProg
                }
              });
            }}
            onNavigateToTopicTab={(chapterId, topicId, tab) => {
              setSelectedChapterId(chapterId);
              setInitialSectionId(topicId);
              setInitialReaderTab(tab);
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
            preferences={state.settings?.preferences}
            isChapterCompleted={!!state.completedChapters?.[selectedChapter.id]}
            onToggleChapterComplete={(complete) => handleToggleChapterComplete(selectedChapter.id, complete)}
            initialSectionId={initialSectionId}
            initialTab={initialReaderTab}
            onClearNavigationParams={() => {
              setInitialSectionId(undefined);
              setInitialReaderTab(undefined);
            }}
            onNavigateToTopic={(chapterNumber, topicId, tab) => {
              const targetCh = state.chapters.find(c => c.metadata.chapter_number === chapterNumber);
              if (targetCh) {
                handleNavigateFromSearch(targetCh.id, topicId, tab);
              }
            }}
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
              onClick={() => {
                setActiveFolderId(null);
                setActiveTab('library');
              }}
              className="bg-[var(--gd)] text-[var(--bg)] text-xs font-bold px-5 py-2.5 rounded-xl uppercase tracking-wider transition hover:opacity-90"
            >
              Go to Study Library
            </button>
          </div>
        )}

        {activeTab === 'leitner' && (
          <LeitnerRevisionTab
            flashcards={state.flashcards || []}
            chapters={state.chapters || []}
            onUpdateFlashcard={handleUpdateFlashcard}
            onAddFlashcard={handleAddFlashcard}
            onDeleteFlashcard={handleDeleteFlashcard}
            planner={state.planner || {}}
            completedChapters={state.completedChapters || {}}
          />
        )}

        {activeTab === 'import' && (
          <ImportCenterTab
            state={state}
            onUpdateState={saveState}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsTab
            state={state}
            onImportFullState={handleImportFullState}
            onResetToDemo={handleResetToDemo}
            onUpdateKey={handleUpdateKey}
            universalFont={universalFont}
            onUpdateUniversalFont={(font) => {
              setUniversalFont(font);
              localStorage.setItem('cseguide_universal_font', font);
            }}
            customSecondaryColor={customSecondaryColor}
            onUpdateCustomSecondaryColor={(color) => {
              setCustomSecondaryColor(color);
              if (color) {
                localStorage.setItem('cseguide_custom_secondary_color', color);
              } else {
                localStorage.removeItem('cseguide_custom_secondary_color');
              }
            }}
          />
        )}

        {activeTab === 'weekly-test' && (
          <WeeklyTestTab
            state={state}
            onUpdateState={saveState}
            onNavigateToChapter={(chapterId, topicId, tabId) => {
              handleNavigateFromSearch(chapterId, topicId, tabId);
              setActiveTab('reader');
            }}
          />
        )}

        {activeTab === 'newspaper-mapper' && (
          <NewspaperMapperTab />
        )}

      </main>

      {/* Today's Goals Pop-up Window */}
      {showGoalsPopup && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-[var(--sur)] border-2 border-[var(--gd)] rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-scale-up">
            <div className="bg-gradient-to-r from-[var(--ra)] to-[var(--sur)] p-6 border-b border-[var(--bd)] relative text-center">
              <div className="mx-auto w-12 h-12 bg-[var(--gg)] rounded-full flex items-center justify-center mb-3 border border-[var(--gd)]/30">
                <Target className="w-6 h-6 text-[var(--gd)]" />
              </div>
              <h2 className="font-serif font-bold text-xl text-[var(--t1)]">Today's Targets</h2>
              <p className="text-xs text-[var(--t3)] font-mono uppercase tracking-wider mt-1">{todayStr}</p>
              <p className="text-xs text-[var(--t2)] mt-2">
                Hello, <span className="font-bold text-[var(--gd)]">{state.settings?.goal?.userName || 'Ray'}</span>! Let's conquer today's study benchmarks.
              </p>
            </div>

            <div className="p-6 space-y-4 max-h-60 overflow-y-auto">
              {(!state.planner?.[todayStr] || state.planner?.[todayStr].targets.length === 0) ? (
                <div className="text-center py-6 text-xs text-[var(--t3)] italic space-y-2">
                  <p>No goals have been logged for today yet.</p>
                  <p className="text-[10px]">Head over to the daily planner on the dashboard to log chapters, revision cycles, or custom goals!</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {state.planner[todayStr].targets.map((task: any) => (
                    <div 
                      key={task.id}
                      className="flex items-start gap-3 p-3 bg-[var(--ra)]/40 border border-[var(--bd)] rounded-xl"
                    >
                      <div className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                        task.completed 
                          ? 'bg-emerald-500 border-emerald-500 text-white' 
                          : 'border-[var(--t3)]'
                      }`}>
                        {task.completed && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                      <span className={`text-xs leading-snug font-medium ${
                        task.completed ? 'line-through text-[var(--t3)]' : 'text-[var(--t3)]'
                      }`}>
                        {task.text}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 bg-[var(--ra)]/30 border-t border-[var(--bd)] flex justify-end">
              <button
                onClick={() => {
                  localStorage.setItem('cseguide_last_dismissed_goals_date', todayStr);
                  setShowGoalsPopup(false);
                }}
                className="w-full bg-[var(--gd)] text-[var(--bg)] py-3 px-4 rounded-xl text-xs uppercase tracking-widest font-bold hover:opacity-90 transition shadow-md active:scale-95 cursor-pointer"
              >
                Let's Go!
              </button>
            </div>
          </div>
        </div>
      )}

      <FloatingAskAI />

      {/* Floating Draggable Pomodoro Timer Overlay */}
      {pomoFloatingVisible && (
        pomoIsCapsule ? (
          <div
            id="floating_pomo_capsule"
            style={{
              position: 'fixed',
              left: `${pomoPosition.x}px`,
              top: `${pomoPosition.y}px`,
              cursor: isPomoDragging ? 'grabbing' : 'grab',
              touchAction: 'none'
            }}
            onMouseDown={handlePomoMouseDown}
            onTouchStart={handlePomoTouchStart}
            className="fixed z-[999] flex items-center gap-2.5 px-3.5 py-2 bg-[var(--sur)] border-2 border-[var(--gd)] rounded-full shadow-2xl select-none font-sans animate-fade-in transition-[border-color,background-color,box-shadow] duration-150 hover:shadow-emerald-500/10 hover:border-[var(--t1)]"
          >
            {/* Clickable timer core to expand */}
            <div 
              onClick={() => setPomoIsCapsule(false)}
              className="flex items-center gap-2 cursor-pointer hover:opacity-85"
              title="Click to Expand Pomodoro Timer"
            >
              <Timer className={`w-3.5 h-3.5 text-[var(--gd)] ${pomoIsActive ? 'animate-pulse' : ''}`} />
              <span className="text-xs font-mono font-bold text-[var(--t1)] tracking-tight">
                {formatPomoTime(pomoSecondsLeft)}
              </span>
              <span className="relative flex h-1.5 w-1.5">
                {pomoIsActive && (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                )}
                <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${pomoIsActive ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
              </span>
            </div>

            {/* Direct close button */}
            <div className="w-px h-3.5 bg-[var(--bd)]/60" />
            <button 
              onClick={() => setPomoFloatingVisible(false)}
              className="p-0.5 text-[var(--t3)] hover:text-red-500 hover:bg-[var(--ra)] rounded-full transition cursor-pointer"
              title="Close Timer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <div
            id="floating_pomo_full"
            style={{
              position: 'fixed',
              left: `${pomoPosition.x}px`,
              top: `${pomoPosition.y}px`,
              cursor: isPomoDragging ? 'grabbing' : 'grab',
              touchAction: 'none'
            }}
            onMouseDown={handlePomoMouseDown}
            onTouchStart={handlePomoTouchStart}
            className="fixed z-[999] w-56 bg-[var(--sur)] border-2 border-[var(--gd)] rounded-2xl shadow-2xl p-4 select-none text-center font-sans animate-fade-in transition-shadow duration-150 hover:shadow-emerald-500/10"
          >
            {/* Drag handle header */}
            <div className="flex items-center justify-between border-b border-[var(--bd)]/40 pb-1.5 mb-2.5 text-[10px] font-extrabold text-[var(--t3)] uppercase tracking-wider">
              <div className="flex items-center gap-1.5">
                <Timer className={`w-3.5 h-3.5 text-[var(--gd)] ${pomoIsActive ? 'animate-pulse' : ''}`} />
                <span>{pomoMode === 'work' ? 'Focus Session' : 'Break Time'}</span>
              </div>
              <div className="flex items-center gap-1">
                {/* Minimize to capsule button */}
                <button 
                  onClick={() => setPomoIsCapsule(true)}
                  className="p-1 text-[var(--t3)] hover:text-[var(--gd)] hover:bg-[var(--ra)] rounded-lg transition cursor-pointer"
                  title="Collapse to Capsule"
                >
                  <Minimize2 className="w-3.5 h-3.5" />
                </button>
                <button 
                  onClick={() => setPomoFloatingVisible(false)}
                  className="p-1 hover:text-red-500 hover:bg-[var(--ra)] rounded-lg transition cursor-pointer"
                  title="Minimize to Sidebar"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Timer Display */}
            <div className="py-2.5">
              <div className="text-4xl font-mono font-bold tracking-tight text-[var(--t1)] drop-shadow-sm select-none">
                {formatPomoTime(pomoSecondsLeft)}
              </div>
              <div className="text-[9px] font-mono uppercase tracking-widest text-[var(--gd)] font-extrabold mt-1">
                {pomoIsActive ? 'Focus active' : 'Interval Paused'}
              </div>
            </div>

            {/* Simple percentage line indicator */}
            <div className="w-full bg-[var(--ra)] h-1 rounded-full overflow-hidden mb-3.5">
              <div 
                className="bg-[var(--gd)] h-full transition-all duration-300"
                style={{ 
                  width: `${((pomoMode === 'work' ? pomoWorkMinutes : pomoBreakMinutes) * 60 - pomoSecondsLeft) / ((pomoMode === 'work' ? pomoWorkMinutes : pomoBreakMinutes) * 60) * 100}%` 
                }}
              />
            </div>

            {/* Floating Actions */}
            <div className="flex gap-1.5 justify-center">
              <button
                onClick={() => setPomoIsActive(prev => !prev)}
                className={`px-3.5 py-1.5 rounded-xl text-[10px] font-extrabold uppercase tracking-wider flex-1 transition cursor-pointer ${
                  pomoIsActive 
                    ? 'bg-amber-600/20 text-amber-500 border border-amber-500/30 hover:bg-amber-600/30' 
                    : 'bg-[var(--gd)] text-[var(--bg)] hover:opacity-90'
                }`}
              >
                {pomoIsActive 
                  ? 'Pause' 
                  : pomoSecondsLeft < (pomoMode === 'work' ? pomoWorkMinutes * 60 : pomoBreakMinutes * 60)
                    ? 'Resume'
                    : 'Start'}
              </button>
              
              <button
                onClick={() => {
                  setPomoIsActive(false);
                  const nextMode = pomoMode === 'work' ? 'break' : 'work';
                  setPomoMode(nextMode);
                  setPomoSecondsLeft(nextMode === 'work' ? pomoWorkMinutes * 60 : pomoBreakMinutes * 60);
                }}
                className="px-2.5 py-1.5 bg-[var(--ra)] border border-[var(--bd)] hover:border-[var(--gd)] hover:text-[var(--gd)] text-[var(--t2)] rounded-xl text-[10px] font-bold transition cursor-pointer"
                title="Skip Mode"
              >
                Skip
              </button>

              <button
                onClick={() => {
                  setPomoIsActive(false);
                  setPomoSecondsLeft(pomoMode === 'work' ? pomoWorkMinutes * 60 : pomoBreakMinutes * 60);
                }}
                className="px-2.5 py-1.5 bg-[var(--ra)] border border-[var(--bd)] hover:border-red-500 hover:text-red-500 text-[var(--t3)] rounded-xl text-[10px] font-bold transition cursor-pointer"
                title="End & Reset Session"
              >
                End
              </button>
            </div>
          </div>
        )
      )}

      {/* Elegant Audio/Timer Completion Custom Toast notification */}
      {pomoAlertMessage && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[1000] bg-[var(--sur)] border-2 border-[var(--gd)] p-4 rounded-2xl shadow-2xl max-w-sm w-full flex items-start gap-3.5 animate-bounce font-sans text-xs">
          <div className="w-9 h-9 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
            <Timer className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="flex-1 text-left space-y-1">
            <h4 className="font-bold text-[var(--t1)] text-xs">Pomodoro Timer Alert</h4>
            <p className="text-[var(--t2)] leading-relaxed text-[11px]">{pomoAlertMessage}</p>
            <button 
              onClick={() => setPomoAlertMessage(null)}
              className="text-[10px] font-bold text-[var(--gd)] hover:underline block pt-1 cursor-pointer"
            >
              Got it, Dismiss
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
