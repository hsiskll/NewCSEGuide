import React, { useState, useEffect } from 'react';
import { 
  Search, BookOpen, Clock, Calendar, Flame, AlertCircle, 
  Bookmark, ChevronRight, GraduationCap, ArrowRight, CheckCircle2,
  Plus, Trash2, Check, ChevronLeft, CalendarDays, ListTodo, Sparkles, Target, Trophy
} from 'lucide-react';
import { UPSCState, Chapter, Topic, Bookmark as BookmarkType, PlannerTask, DailyPlanner, PersonalGoal } from '../types';

interface DashboardTabProps {
  state: UPSCState;
  onNavigateToChapter: (chapterId: string, sectionId?: string) => void;
  onNavigateToLeitner: () => void;
  onNavigateToSubject?: (paper: string) => void;
  onUpdateState?: (updatedState: UPSCState) => void;
}

export default function DashboardTab({ state, onNavigateToChapter, onNavigateToLeitner, onNavigateToSubject, onUpdateState }: DashboardTabProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{ chapter: Chapter; topic: Topic; snippet: string }[]>([]);

  // Calculate Streak & Today's Study Time
  const todayStr = new Date().toISOString().split('T')[0]; // "2026-06-25"
  const logs = state.logs || [];
  const minutesToday = logs
    .filter(log => log.date === todayStr)
    .reduce((acc, curr) => acc + curr.minutes, 0);

  // Simple streak calculator
  const calculateStreak = () => {
    if (logs.length === 0) return 0;
    
    // Sort logs descending by date
    const uniqueDates = Array.from(new Set(logs.map(l => l.date))).sort().reverse();
    if (uniqueDates.length === 0) return 0;

    let streak = 0;
    const today = new Date(todayStr);
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    // If there is no study log today and no study log yesterday, streak is broken
    if (uniqueDates[0] !== todayStr && uniqueDates[0] !== yesterdayStr) {
      return 0;
    }

    let expectedDate = new Date(uniqueDates[0]);
    for (let i = 0; i < uniqueDates.length; i++) {
      const currentLogDate = new Date(uniqueDates[i]);
      const diffTime = Math.abs(expectedDate.getTime() - currentLogDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays <= 1) {
        streak++;
        expectedDate = currentLogDate;
      } else {
        break;
      }
    }
    return streak;
  };

  const streak = calculateStreak();
  const dailyTarget = state.settings?.goal?.dailyTargetMinutes || 60;
  const progressPercent = Math.min(100, Math.round((minutesToday / dailyTarget) * 100));

  // Leitner cards status
  const now = new Date();
  const dueCards = (state.flashcards || []).filter(card => {
    const reviewDate = new Date(card.nextReviewDate);
    return reviewDate <= now;
  });

  // Planner States
  const [selectedDateStr, setSelectedDateStr] = useState<string>(todayStr);
  const [viewMode, setViewMode] = useState<'month' | 'week'>('month');
  const [newTaskText, setNewTaskText] = useState('');
  const [newPersonalGoalText, setNewPersonalGoalText] = useState('');
  
  // Structured Goal Addition States
  const [goalOption, setGoalOption] = useState<'structured' | 'custom'>('structured');
  const [goalFolderId, setGoalFolderId] = useState<string>(state.folders?.[0]?.id || '');
  const [goalChapterId, setGoalChapterId] = useState<string>(state.chapters?.filter(c => c.folderId === (state.folders?.[0]?.id || ''))?.[0]?.id || '');
  const [goalSubsection, setGoalSubsection] = useState<string>('Read Section');

  // Synchronize goalChapterId on folder change
  useEffect(() => {
    const chaptersInFolder = state.chapters?.filter(c => c.folderId === goalFolderId) || [];
    if (chaptersInFolder.length > 0) {
      setGoalChapterId(chaptersInFolder[0].id);
    } else {
      setGoalChapterId('');
    }
  }, [goalFolderId, state.chapters]);
  
  // Set default calendar focus on June 2026
  const [currentYear, setCurrentYear] = useState<number>(2026);
  const [currentMonth, setCurrentMonth] = useState<number>(5); // 0-indexed, so June is 5

  const planner = state.planner || {};
  const personalGoals = state.personalGoals || [];
  const leitnerStreakState = state.leitnerStreak || { streak: 4 }; // Initialized streak

  // Pre-populate data if empty
  useEffect(() => {
    if (!onUpdateState) return;

    const currentPlanner = state.planner || {};
    const currentGoals = state.personalGoals || [];
    let needsUpdate = false;
    const updatedPlanner = { ...currentPlanner };
    let updatedGoals = [...currentGoals];

    // Initialize today June 25, 2026 with user requested targets
    if (Object.keys(currentPlanner).length === 0) {
      updatedPlanner["2026-06-25"] = {
        date: "2026-06-25",
        targets: [
          { id: 't1', text: 'Chapter 18 President', completed: false },
          { id: 't2', text: 'MCQ practice', completed: false },
          { id: 't3', text: 'Mains answers attempt', completed: false }
        ],
        leitnerCompleted: false
      };
      needsUpdate = true;
    }

    if (currentGoals.length === 0) {
      updatedGoals = [
        { id: 'g1', text: 'Complete GS-II Polity Syllabus before July 15', completed: false, createdAt: new Date().toISOString() },
        { id: 'g2', text: 'Achieve a 10-day Leitner revision streak', completed: false, createdAt: new Date().toISOString() },
        { id: 'g3', text: 'Practice 50 MCQs daily to build retention', completed: false, createdAt: new Date().toISOString() }
      ];
      needsUpdate = true;
    }

    if (needsUpdate) {
      onUpdateState({
        ...state,
        planner: updatedPlanner,
        personalGoals: updatedGoals,
        leitnerStreak: state.leitnerStreak || { streak: 4, lastReviewedDate: "2026-06-24" }
      });
    }
  }, []);

  // Sync calendar focus year/month to selected date when changed
  useEffect(() => {
    const d = new Date(selectedDateStr);
    if (!isNaN(d.getTime())) {
      setCurrentYear(d.getFullYear());
      setCurrentMonth(d.getMonth());
    }
  }, [selectedDateStr]);

  // Planner Mutators
  const handleToggleTask = (dateStr: string, taskId: string) => {
    if (!onUpdateState) return;
    const currentPlanner = { ...planner };
    const dayPlanner = currentPlanner[dateStr] || { date: dateStr, targets: [] };
    
    let toggledTask: PlannerTask | undefined;
    
    dayPlanner.targets = dayPlanner.targets.map(task => {
      if (task.id === taskId) {
        toggledTask = { ...task, completed: !task.completed };
        return toggledTask;
      }
      return task;
    });
    
    currentPlanner[dateStr] = dayPlanner;

    // T+2 Leitner Revision Scheduler
    if (toggledTask && toggledTask.chapterId) {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const dateObj = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        dateObj.setDate(dateObj.getDate() + 2);
        const tPlusTwoStr = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
        
        const targetCh = state.chapters.find(c => c.id === toggledTask!.chapterId);
        const chTitle = targetCh ? targetCh.title : 'Chapter';

        if (toggledTask.completed) {
          // Add T+2 Leitner revision task if not already present
          const d2Planner = currentPlanner[tPlusTwoStr] || { date: tPlusTwoStr, targets: [] };
          const alreadyExists = d2Planner.targets.some((t: any) => t.chapterId === toggledTask!.chapterId && t.subsection === 'Leitner Revision');
          
          if (!alreadyExists) {
            const newRevTask: PlannerTask = {
              id: `leitner_rev_${toggledTask.chapterId}_${Date.now()}`,
              text: `Leitner Revision: ${chTitle}`,
              completed: false,
              chapterId: toggledTask.chapterId,
              subsection: 'Leitner Revision'
            };
            d2Planner.targets = [...d2Planner.targets, newRevTask];
            currentPlanner[tPlusTwoStr] = d2Planner;
          }
        } else {
          // Remove uncompleted T+2 Leitner task if user uncompletes original task
          const d2Planner = currentPlanner[tPlusTwoStr];
          if (d2Planner) {
            d2Planner.targets = d2Planner.targets.filter((t: any) => 
              !(t.chapterId === toggledTask!.chapterId && t.subsection === 'Leitner Revision' && !t.completed)
            );
            currentPlanner[tPlusTwoStr] = d2Planner;
          }
        }
      }
    }
    
    onUpdateState({
      ...state,
      planner: currentPlanner
    });
  };

  const handleAddTask = (
    dateStr: string, 
    text: string, 
    chapterId?: string, 
    subject?: string, 
    subsection?: string
  ) => {
    if (!text.trim() || !onUpdateState) return;
    const currentPlanner = { ...planner };
    const dayPlanner = currentPlanner[dateStr] || { date: dateStr, targets: [] };
    
    const newTask: PlannerTask = {
      id: Math.random().toString(36).substring(2, 11),
      text: text.trim(),
      completed: false,
      chapterId,
      subject,
      subsection
    };
    
    dayPlanner.targets = [...dayPlanner.targets, newTask];
    currentPlanner[dateStr] = dayPlanner;
    
    onUpdateState({
      ...state,
      planner: currentPlanner
    });
  };

  const handleDeleteTask = (dateStr: string, taskId: string) => {
    if (!onUpdateState) return;
    const currentPlanner = { ...planner };
    const dayPlanner = currentPlanner[dateStr];
    if (!dayPlanner) return;
    
    dayPlanner.targets = dayPlanner.targets.filter(task => task.id !== taskId);
    currentPlanner[dateStr] = dayPlanner;
    
    onUpdateState({
      ...state,
      planner: currentPlanner
    });
  };

  const handleToggleLeitnerCompleted = (dateStr: string) => {
    if (!onUpdateState) return;
    const currentPlanner = { ...planner };
    const dayPlanner = currentPlanner[dateStr] || { date: dateStr, targets: [], leitnerCompleted: false };
    
    const wasCompleted = !!dayPlanner.leitnerCompleted;
    const nowCompleted = !wasCompleted;
    
    dayPlanner.leitnerCompleted = nowCompleted;
    currentPlanner[dateStr] = dayPlanner;

    // Handle Streak Updates
    let currentStreakObj = { ...(state.leitnerStreak || { streak: 4 }) };
    
    if (nowCompleted) {
      if (dateStr === todayStr) {
        const lastDate = currentStreakObj.lastReviewedDate;
        if (!lastDate) {
          currentStreakObj.streak = 5; // Default starts at 5 with our pre-populated data!
        } else {
          const diffTime = Math.abs(new Date(dateStr).getTime() - new Date(lastDate).getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          if (diffDays === 1) {
            currentStreakObj.streak += 1;
          } else if (diffDays > 1) {
            currentStreakObj.streak = 1;
          }
        }
        currentStreakObj.lastReviewedDate = dateStr;
      } else {
        if (!currentStreakObj.lastReviewedDate || new Date(dateStr) > new Date(currentStreakObj.lastReviewedDate)) {
          currentStreakObj.lastReviewedDate = dateStr;
        }
      }
    } else {
      if (dateStr === todayStr) {
        currentStreakObj.streak = Math.max(0, currentStreakObj.streak - 1);
        const dates = Object.keys(currentPlanner).filter(d => currentPlanner[d].leitnerCompleted && d !== todayStr).sort();
        currentStreakObj.lastReviewedDate = dates[dates.length - 1] || "2026-06-24";
      }
    }

    onUpdateState({
      ...state,
      planner: currentPlanner,
      leitnerStreak: currentStreakObj
    });
  };

  const handleAddPersonalGoal = (text: string) => {
    if (!text.trim() || !onUpdateState) return;
    const newGoal: PersonalGoal = {
      id: Math.random().toString(36).substring(2, 11),
      text: text.trim(),
      completed: false,
      createdAt: new Date().toISOString()
    };
    
    onUpdateState({
      ...state,
      personalGoals: [...personalGoals, newGoal]
    });
  };

  const handleTogglePersonalGoal = (goalId: string) => {
    if (!onUpdateState) return;
    const updatedGoals = personalGoals.map(g => 
      g.id === goalId ? { ...g, completed: !g.completed } : g
    );
    onUpdateState({
      ...state,
      personalGoals: updatedGoals
    });
  };

  const handleDeletePersonalGoal = (goalId: string) => {
    if (!onUpdateState) return;
    const updatedGoals = personalGoals.filter(g => g.id !== goalId);
    onUpdateState({
      ...state,
      personalGoals: updatedGoals
    });
  };

  // Helper for Calendar Math
  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay(); // 0 = Sun, 1 = Mon...
  };

  const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const currentDate = new Date();
  const formattedDay = daysOfWeek[currentDate.getDay()];
  const formattedDate = `${currentDate.getDate()} ${months[currentDate.getMonth()]} ${currentDate.getFullYear()}`;

  // Formatting day labels for calendar
  const getSelectedDayLabel = (dateStr: string) => {
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    if (isNaN(d.getTime())) return dateStr;
    
    const dayName = daysOfWeek[d.getDay()];
    const dayNum = d.getDate();
    const monthName = months[d.getMonth()];
    
    const getOrdinal = (n: number) => {
      const s = ["th", "st", "nd", "rd"];
      const v = n % 100;
      return n + (s[(v - 20) % 10] || s[v] || s[0]);
    };
    
    return `${getOrdinal(dayNum)} ${monthName} ${d.getFullYear()}, ${dayName.substring(0, 3)}`;
  };

  // Handle Global Search across all folders and chapter texts
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
          // Generate an elegant context snippet
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

    setSearchResults(results.slice(0, 8)); // limit to top 8 matches
  };

  // Group chapters by subject
  const getSubjectCounts = (subj: string) => {
    return (state.chapters || []).filter(c => c.subject?.toLowerCase() === subj.toLowerCase()).length;
  };

  return (
    <div id="dashboard_tab" className="space-y-6 text-left">
      {/* Welcome Banner */}
      <div className="bg-[var(--sur)] text-[var(--t1)] rounded-3xl p-6 border border-[var(--bd)] relative overflow-hidden shadow-sm">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--gg)] rounded-full blur-2xl pointer-events-none"></div>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <GraduationCap className="w-5 h-5 text-[var(--gd)]" />
              <span className="text-xs uppercase tracking-widest text-[var(--gd)] font-bold font-mono">UPSC Academy Dashboard</span>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 md:gap-3">
              <h1 className="text-2xl md:text-3xl font-bold font-serif tracking-tight text-[var(--t1)]">
                Hello, {state.settings?.goal?.userName || 'Ray'}
              </h1>
              <span className="text-[10px] sm:text-xs font-mono font-medium text-[var(--gd)] bg-[var(--ra)] border border-[var(--bd)] px-2.5 py-1 rounded-xl flex items-center gap-1.5 w-fit">
                <Calendar className="w-3.5 h-3.5" />
                {formattedDay}, {formattedDate}
              </span>
            </div>
            <p className="text-xs text-[var(--t2)] mt-1 max-w-xl font-serif italic">
              Target Year: <strong className="text-[var(--gd)] font-sans not-italic">{state.settings?.goal?.targetYear || '2026'}</strong> | Focus Area: <strong className="text-[var(--gd)] font-sans not-italic">{state.settings?.goal?.focusArea || 'Indian Polity'}</strong>
            </p>
          </div>
          
          <div className="flex items-center gap-6 bg-[var(--ra)] px-5 py-3 rounded-2xl border border-[var(--bd)] self-start md:self-auto">
            <div className="flex items-center gap-2">
              <Flame className={`w-8 h-8 ${streak > 0 ? 'text-amber-500 fill-amber-500' : 'text-[var(--t3)]'}`} />
              <div>
                <p className="text-2xl font-mono font-bold text-[var(--t1)]">{streak}</p>
                <p className="text-[10px] text-[var(--t3)] uppercase font-bold tracking-wider">Day Streak</p>
              </div>
            </div>
            <div className="h-8 w-[1px] bg-[var(--bd)]"></div>
            <div>
              <p className="text-2xl font-mono font-bold text-[var(--gd)]">{dueCards.length}</p>
              <p className="text-[10px] text-[var(--t3)] uppercase font-bold tracking-wider">Cards Due</p>
            </div>
          </div>
        </div>
      </div>

      {/* Global Search Bar */}
      <div className="bg-[var(--sur)] p-4 rounded-3xl border border-[var(--bd)] relative">
        <label className="block text-xs font-bold uppercase tracking-wider text-[var(--t2)] mb-2">Search UPSC Repository</label>
        <div className="relative">
          <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-[var(--t3)]" />
          <input 
            type="text"
            className="w-full bg-[var(--ra)] text-[var(--t1)] border border-[var(--bd)] rounded-2xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--gd)]"
            placeholder="Search key terms (e.g. 'President', 'Veto', 'Electoral', 'Articles')..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
          />
        </div>

        {/* Search Results Dropdown */}
        {searchResults.length > 0 && (
          <div className="absolute left-0 right-0 mt-2 bg-[var(--sur)] border border-[var(--bd)] rounded-2xl shadow-lg z-30 max-h-96 overflow-y-auto divide-y divide-[var(--bd)]">
            <div className="p-2.5 bg-[var(--ra)] text-[var(--t1)] text-xs font-mono font-semibold flex justify-between items-center">
              <span>{searchResults.length} UPSC references found:</span>
              <button onClick={() => { setSearchQuery(''); setSearchResults([]); }} className="text-[var(--gd)] hover:underline">Clear</button>
            </div>
            {searchResults.map((res, idx) => (
              <div 
                key={idx}
                onClick={() => {
                  onNavigateToChapter(res.chapter.id, res.topic.id);
                  setSearchQuery('');
                  setSearchResults([]);
                }}
                className="p-3 hover:bg-[var(--ra)] cursor-pointer transition text-left group"
              >
                <div className="flex justify-between items-start gap-2">
                  <h4 className="text-xs font-bold text-[var(--t1)] group-hover:text-[var(--gd)] transition">
                    {res.topic.title}
                  </h4>
                  <span className="text-[9px] uppercase tracking-wider font-mono bg-[var(--ra)] border border-[var(--bd)] text-[var(--gd)] px-1.5 py-0.5 rounded-lg shrink-0">
                    {res.chapter.subject}
                  </span>
                </div>
                <p className="text-[10px] text-[var(--t3)] mt-0.5">Chapter: {res.chapter.title}</p>
                <p className="text-xs text-[var(--t2)] font-serif italic mt-1 bg-[var(--ra)] p-1.5 rounded-xl border-l-2 border-[var(--gd)]">
                  {res.snippet}
                </p>
              </div>
            ))}
          </div>
        )}
        {searchQuery && searchResults.length === 0 && (
          <p className="text-xs text-[var(--t3)] italic mt-2">Type 2 or more letters to query all chapters...</p>
        )}
      </div>

      {/* Scholar's Journal & Planner (Monthly/Weekly style) */}
      <div id="scholars_journal_planner" className="bg-[var(--sur)] p-5 rounded-3xl border border-[var(--bd)] space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-[var(--bd)] pb-3">
          <div className="flex items-center gap-2 text-left">
            <ListTodo className="w-5 h-5 text-[var(--gd)]" />
            <div>
              <h2 className="font-serif font-bold text-base text-[var(--t1)]">Scholar's Journal & Planner</h2>
              <p className="text-[10px] uppercase font-bold tracking-wider text-[var(--t3)] font-mono">Plan monthly goals, log daily progress & track streaks</p>
            </div>
          </div>
          <div className="flex bg-[var(--ra)] border border-[var(--bd)] p-0.5 rounded-xl text-xs font-bold uppercase tracking-wider">
            <button 
              onClick={() => setViewMode('month')} 
              className={`px-3 py-1 rounded-lg transition cursor-pointer ${viewMode === 'month' ? 'bg-[var(--gd)] text-[var(--bg)]' : 'text-[var(--t2)] hover:text-[var(--t1)]'}`}
            >
              Month View
            </button>
            <button 
              onClick={() => setViewMode('week')} 
              className={`px-3 py-1 rounded-lg transition cursor-pointer ${viewMode === 'week' ? 'bg-[var(--gd)] text-[var(--bg)]' : 'text-[var(--t2)] hover:text-[var(--t1)]'}`}
            >
              Week View
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* LEFT PANEL: CALENDAR GRID (Month or Week) */}
          <div className="lg:col-span-5 space-y-3 bg-[var(--ra)]/30 p-3.5 rounded-2xl border border-[var(--bd)]/40 text-left">
            {viewMode === 'month' ? (
              <div className="space-y-3">
                {/* Month/Year selector header */}
                <div className="flex justify-between items-center px-1">
                  <span className="text-xs font-bold text-[var(--t1)] font-mono">
                    {months[currentMonth]} {currentYear}
                  </span>
                  <div className="flex gap-2 items-center">
                    <button 
                      onClick={() => {
                        if (currentMonth === 0) {
                          setCurrentMonth(11);
                          setCurrentYear(currentYear - 1);
                        } else {
                          setCurrentMonth(currentMonth - 1);
                        }
                      }}
                      className="p-1 hover:bg-[var(--bd)]/30 text-[var(--gd)] rounded transition cursor-pointer"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => {
                        const d = new Date(todayStr);
                        setSelectedDateStr(todayStr);
                        setCurrentMonth(d.getMonth());
                        setCurrentYear(d.getFullYear());
                      }}
                      className="text-[9px] px-1.5 uppercase tracking-wider font-mono font-bold text-[var(--gd)] hover:underline cursor-pointer"
                    >
                      Today
                    </button>
                    <button 
                      onClick={() => {
                        if (currentMonth === 11) {
                          setCurrentMonth(0);
                          setCurrentYear(currentYear + 1);
                        } else {
                          setCurrentMonth(currentMonth + 1);
                        }
                      }}
                      className="p-1 hover:bg-[var(--bd)]/30 text-[var(--gd)] rounded transition cursor-pointer"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Day labels */}
                <div className="grid grid-cols-7 gap-1 text-center">
                  {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map(d => (
                    <span key={d} className="text-[10px] uppercase font-bold text-[var(--t3)] font-mono py-1">{d}</span>
                  ))}
                </div>

                {/* Month days grid */}
                <div className="grid grid-cols-7 gap-1.5">
                  {/* Fill empty slots before day 1 */}
                  {Array.from({ length: getFirstDayOfMonth(currentYear, currentMonth) }).map((_, idx) => (
                    <div key={`empty-${idx}`} className="h-8"></div>
                  ))}
                  
                  {/* Fill month days */}
                  {Array.from({ length: getDaysInMonth(currentYear, currentMonth) }).map((_, idx) => {
                    const dayNum = idx + 1;
                    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                    const isSelected = dateStr === selectedDateStr;
                    const isToday = dateStr === todayStr;
                    const dayPlanner = planner[dateStr];
                    const hasTasks = dayPlanner && dayPlanner.targets.length > 0;
                    const allTasksCompleted = hasTasks && dayPlanner.targets.every(t => t.completed);
                    
                    return (
                      <button
                        key={`day-${dayNum}`}
                        onClick={() => setSelectedDateStr(dateStr)}
                        className={`h-8 w-full rounded-xl text-xs font-mono font-medium flex flex-col justify-center items-center relative transition-all duration-200 border cursor-pointer hover:border-[var(--gd)]/60
                          ${isSelected 
                            ? 'bg-[var(--gd)] text-[var(--bg)] border-[var(--gd)] font-bold shadow-xs' 
                            : isToday
                              ? 'bg-[var(--gd)]/10 text-[var(--gd)] border-[var(--gd)]/30 border-dashed'
                              : 'bg-[var(--sur)] text-[var(--t2)] border-[var(--bd)]/60 hover:bg-[var(--ra)]'
                          }`}
                      >
                        <span>{dayNum}</span>
                        {/* Task Completion status dots */}
                        {hasTasks && (
                          <span className={`absolute bottom-1 w-1 h-1 rounded-full ${
                            allTasksCompleted 
                              ? isSelected ? 'bg-[var(--bg)]' : 'bg-emerald-500'
                              : isSelected ? 'bg-[var(--bg)] opacity-70' : 'bg-amber-500'
                          }`} />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              // Week view row of 7 days around the selected date
              <div className="space-y-3">
                <span className="text-[10px] uppercase font-bold text-[var(--t3)] font-mono block px-1">Selected Week (Rolling)</span>
                <div className="grid grid-cols-7 gap-1.5">
                  {(() => {
                    const activeDate = new Date(selectedDateStr);
                    const weekDays = [];
                    // Get start of week (Sunday)
                    const startOfWeek = new Date(activeDate);
                    startOfWeek.setDate(activeDate.getDate() - activeDate.getDay());
                    
                    for (let i = 0; i < 7; i++) {
                      const d = new Date(startOfWeek);
                      d.setDate(startOfWeek.getDate() + i);
                      const dStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                      weekDays.push({
                        dateStr: dStr,
                        dayName: daysOfWeek[d.getDay()].substring(0, 3),
                        dayNum: d.getDate(),
                        isSelected: dStr === selectedDateStr,
                        isToday: dStr === todayStr,
                        planner: planner[dStr]
                      });
                    }
                    
                    return weekDays.map((wd, i) => {
                      const hasTasks = wd.planner && wd.planner.targets.length > 0;
                      const allTasksCompleted = hasTasks && wd.planner.targets.every(t => t.completed);
                      
                      return (
                        <button
                          key={i}
                          onClick={() => setSelectedDateStr(wd.dateStr)}
                          className={`py-2 w-full rounded-2xl text-center flex flex-col justify-between items-center relative border transition duration-200 cursor-pointer hover:border-[var(--gd)]/60
                            ${wd.isSelected
                              ? 'bg-[var(--gd)] text-[var(--bg)] border-[var(--gd)] font-bold shadow-xs'
                              : wd.isToday
                                ? 'bg-[var(--gd)]/10 text-[var(--gd)] border-[var(--gd)]/30 border-dashed'
                                : 'bg-[var(--sur)] text-[var(--t2)] border-[var(--bd)]'
                            }`}
                        >
                          <span className={`text-[9px] uppercase font-bold tracking-wider font-mono ${wd.isSelected ? 'text-[var(--bg)]/90' : 'text-[var(--t3)]'}`}>{wd.dayName}</span>
                          <span className="text-sm font-mono font-bold my-1">{wd.dayNum}</span>
                          {/* Indicator dot */}
                          {hasTasks ? (
                            <span className={`w-1 h-1 rounded-full ${
                              allTasksCompleted 
                                ? wd.isSelected ? 'bg-[var(--bg)]' : 'bg-emerald-500'
                                : wd.isSelected ? 'bg-[var(--bg)]' : 'bg-amber-500'
                            }`} />
                          ) : (
                            <span className="w-1 h-1 opacity-0" />
                          )}
                        </button>
                      );
                    });
                  })()}
                </div>
                <div className="text-center">
                  <button 
                    onClick={() => setSelectedDateStr(todayStr)}
                    className="text-[9px] uppercase tracking-wider font-mono font-bold text-[var(--gd)] hover:underline cursor-pointer"
                  >
                    Go back to Today
                  </button>
                </div>
              </div>
            )}

            {/* Quick Helper Explainer */}
            <div className="bg-[var(--sur)] p-3 rounded-xl border border-[var(--bd)] text-[11px] text-[var(--t3)] leading-relaxed flex items-start gap-2 font-serif italic">
              <CalendarDays className="w-4 h-4 text-[var(--gd)] shrink-0 mt-0.5" />
              <span>Select any date from the planner calendar to log daily study quotas, schedule Leitner revisions or write targets. June 25th contains your current targets!</span>
            </div>
          </div>

          {/* RIGHT PANEL: SELECTED DAY DETAILS, CHECKLIST, LEITNER AND GOALS */}
          <div className="lg:col-span-7 space-y-4">
            <div className="bg-[var(--ra)] p-4 rounded-2xl border border-[var(--bd)] space-y-4 text-left">
              <div className="flex justify-between items-center border-b border-[var(--bd)] pb-2.5">
                <span className="text-xs font-bold text-[var(--gd)] font-mono flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5" />
                  {getSelectedDayLabel(selectedDateStr)}
                </span>
                <span className="text-[9px] uppercase tracking-widest font-mono bg-[var(--sur)] border border-[var(--bd)] px-2 py-0.5 text-[var(--t3)] rounded-lg">
                  {planner[selectedDateStr]?.targets.length || 0} Targets logged
                </span>
              </div>

              {/* To-Do Targets List */}
              <div className="space-y-2.5 text-left">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--t1)]">
                  Target Goals Checklist
                </h4>

                {(!planner[selectedDateStr] || planner[selectedDateStr].targets.length === 0) ? (
                  <div className="py-4 text-center border border-dashed border-[var(--bd)] rounded-xl space-y-1 bg-[var(--sur)]">
                    <p className="text-xs text-[var(--t3)] italic">No specific targets set for this day.</p>
                    <button 
                      onClick={() => {
                        const defTargets = [
                          'Chapter 18 President reading',
                          'Solve MCQs on Executive powers',
                          'Mains question answer draft'
                        ];
                        defTargets.forEach(t => handleAddTask(selectedDateStr, t));
                      }}
                      className="text-[10px] text-[var(--gd)] font-bold uppercase tracking-wider hover:underline cursor-pointer"
                    >
                      + Autofill default study targets
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {planner[selectedDateStr].targets.map((task) => (
                      <div 
                        key={task.id}
                        className="flex items-center justify-between p-2.5 bg-[var(--sur)] border border-[var(--bd)] hover:bg-[var(--ra)]/60 rounded-xl transition duration-150 group"
                      >
                        <button
                          onClick={() => handleToggleTask(selectedDateStr, task.id)}
                          className="flex items-start gap-3 flex-1 text-left cursor-pointer"
                        >
                          <div className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center transition shrink-0 ${
                            task.completed 
                              ? 'bg-[var(--gd)] border-[var(--gd)] text-[var(--bg)]' 
                              : 'border-[var(--bd)] hover:border-[var(--gd)]'
                          }`}>
                            {task.completed && <Check className="w-3 h-3 stroke-[3]" />}
                          </div>
                          <span className={`text-xs leading-tight transition ${
                            task.completed ? 'line-through text-[var(--t3)]' : 'text-[var(--t1)]'
                          }`}>
                            {task.text}
                          </span>
                        </button>
                        <button
                          onClick={() => handleDeleteTask(selectedDateStr, task.id)}
                          className="text-[var(--t3)] hover:text-red-500 opacity-0 group-hover:opacity-100 transition p-1 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Switch between Structured and Custom */}
                <div className="flex border border-[var(--bd)] rounded-xl overflow-hidden bg-[var(--ra)] p-0.5 text-xs">
                  <button
                    type="button"
                    onClick={() => setGoalOption('structured')}
                    className={`flex-1 py-1.5 font-bold uppercase rounded-lg transition cursor-pointer ${
                      goalOption === 'structured' 
                        ? 'bg-[var(--gd)] text-[var(--bg)] shadow-xs' 
                        : 'text-[var(--t2)] hover:text-[var(--t1)]'
                    }`}
                  >
                    Structured Goal
                  </button>
                  <button
                    type="button"
                    onClick={() => setGoalOption('custom')}
                    className={`flex-1 py-1.5 font-bold uppercase rounded-lg transition cursor-pointer ${
                      goalOption === 'custom' 
                        ? 'bg-[var(--gd)] text-[var(--bg)] shadow-xs' 
                        : 'text-[var(--t2)] hover:text-[var(--t1)]'
                    }`}
                  >
                    Custom Goal
                  </button>
                </div>

                {goalOption === 'structured' ? (
                  <div className="space-y-3 bg-[var(--ra)]/30 border border-[var(--bd)] p-4 rounded-2xl animate-fade-in">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div className="space-y-1 text-left">
                        <label className="text-[9px] uppercase font-bold text-[var(--t3)] font-mono">Subject</label>
                        <select
                          value={goalFolderId}
                          onChange={(e) => setGoalFolderId(e.target.value)}
                          className="w-full bg-[var(--sur)] text-xs text-[var(--t1)] p-2 rounded-lg border border-[var(--bd)] outline-none"
                        >
                          {state.folders.map(f => (
                            <option key={f.id} value={f.id}>{f.name}</option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1 text-left">
                        <label className="text-[9px] uppercase font-bold text-[var(--t3)] font-mono">Chapter</label>
                        <select
                          value={goalChapterId}
                          onChange={(e) => setGoalChapterId(e.target.value)}
                          className="w-full bg-[var(--sur)] text-xs text-[var(--t1)] p-2 rounded-lg border border-[var(--bd)] outline-none"
                        >
                          {state.chapters.filter(c => c.folderId === goalFolderId).map(c => (
                            <option key={c.id} value={c.id}>{c.title}</option>
                          ))}
                          {state.chapters.filter(c => c.folderId === goalFolderId).length === 0 && (
                            <option value="">No chapters loaded</option>
                          )}
                        </select>
                      </div>

                      <div className="space-y-1 text-left">
                        <label className="text-[9px] uppercase font-bold text-[var(--t3)] font-mono">Subsection</label>
                        <select
                          value={goalSubsection}
                          onChange={(e) => setGoalSubsection(e.target.value)}
                          className="w-full bg-[var(--sur)] text-xs text-[var(--t1)] p-2 rounded-lg border border-[var(--bd)] outline-none focus:border-[var(--gd)] focus:ring-2 focus:ring-[var(--gd)]/20 hover:border-[var(--gd)]/40 transition-all duration-150 cursor-pointer shadow-xs"
                        >
                          {['ALL', 'Read Section', 'Lesson Slides', 'Key Concepts', 'Flashcards', 'PYQs', 'MCQ Practice', 'Mains Answer Draft', 'Current Affairs', 'Notes'].map(sub => (
                            <option key={sub} value={sub}>{sub}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        const folder = state.folders.find(f => f.id === goalFolderId);
                        const chapter = state.chapters.find(c => c.id === goalChapterId);
                        if (!folder || !chapter) return;
                        
                        if (goalSubsection === 'ALL') {
                          const subOptions = ['Read Section', 'Lesson Slides', 'Key Concepts', 'Flashcards', 'PYQs', 'MCQ Practice', 'Mains Answer Draft', 'Current Affairs', 'Notes'];
                          const currentPlanner = { ...planner };
                          const dayPlanner = currentPlanner[selectedDateStr] || { date: selectedDateStr, targets: [] };
                          
                          const newTasks = subOptions.map(sub => ({
                            id: Math.random().toString(36).substring(2, 11),
                            text: `[${sub}] ${folder.name}: ${chapter.title}`,
                            completed: false,
                            chapterId: chapter.id,
                            subject: folder.name,
                            subsection: sub
                          }));
                          
                          dayPlanner.targets = [...dayPlanner.targets, ...newTasks];
                          currentPlanner[selectedDateStr] = dayPlanner;
                          
                          if (onUpdateState) {
                            onUpdateState({
                              ...state,
                              planner: currentPlanner
                            });
                          }
                        } else {
                          const taskText = `[${goalSubsection}] ${folder.name}: ${chapter.title}`;
                          handleAddTask(selectedDateStr, taskText, chapter.id, folder.name, goalSubsection);
                        }
                      }}
                      disabled={!goalChapterId}
                      className="w-full bg-[var(--gd)] text-[var(--bg)] py-2 px-3 rounded-xl text-xs uppercase font-bold tracking-wider hover:opacity-90 transition flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add Structured Goal</span>
                    </button>
                  </div>
                ) : (
                  <form 
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (newTaskText.trim()) {
                        handleAddTask(selectedDateStr, newTaskText);
                        setNewTaskText('');
                      }
                    }}
                    className="flex gap-2 animate-fade-in"
                  >
                    <input
                      type="text"
                      placeholder="Add target (e.g. Chapter 18 President, MCQ practice)..."
                      value={newTaskText}
                      onChange={(e) => setNewTaskText(e.target.value)}
                      className="flex-1 bg-[var(--sur)] text-xs text-[var(--t1)] border border-[var(--bd)] rounded-xl px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[var(--gd)]"
                    />
                    <button
                      type="submit"
                      className="bg-[var(--gd)] hover:opacity-90 text-[var(--bg)] px-3 py-2 rounded-xl text-xs font-bold uppercase transition flex items-center justify-center shrink-0 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </form>
                )}
              </div>

              {/* Leitner Revision Completion Tracker */}
              <div className="bg-[var(--sur)] p-3 rounded-xl border border-[var(--bd)] space-y-2 text-left">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    <span className="text-xs font-bold text-[var(--t1)]">Leitner Flashcard Revision Tracker</span>
                  </div>
                  <span className="flex items-center gap-1 text-[10px] font-mono font-bold text-amber-500">
                    <Trophy className="w-3 h-3 fill-amber-500" />
                    {leitnerStreakState.streak}-Day Streak
                  </span>
                </div>
                <p className="text-[10px] text-[var(--t3)]">Active spacing keeps constitutional articles and indicators fresh in your long-term memories.</p>
                <button
                  onClick={() => handleToggleLeitnerCompleted(selectedDateStr)}
                  className={`w-full flex items-center justify-center gap-2 py-2 px-3 border rounded-xl text-xs font-bold uppercase tracking-wider transition cursor-pointer ${
                    planner[selectedDateStr]?.leitnerCompleted
                      ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30'
                      : 'bg-[var(--ra)] text-[var(--t2)] border-[var(--bd)] hover:bg-[var(--sur)] hover:text-[var(--gd)]'
                  }`}
                >
                  <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                    planner[selectedDateStr]?.leitnerCompleted ? 'bg-emerald-500 border-emerald-500 text-[var(--bg)]' : 'border-[var(--bd)]'
                  }`}>
                    {planner[selectedDateStr]?.leitnerCompleted && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                  </div>
                  <span>
                    {planner[selectedDateStr]?.leitnerCompleted 
                      ? '✓ Leitner Spaced-Revision Completed Today' 
                      : 'Mark Leitner Revision Completed for Today'
                    }
                  </span>
                </button>
              </div>

              {/* Personal Long-Term Goals List */}
              <div className="space-y-2 bg-[var(--sur)] p-3 rounded-xl border border-[var(--bd)] text-left">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-[var(--t1)]">Scholar's Personal Milestones</span>
                  <span className="text-[9px] uppercase font-mono font-bold text-[var(--t3)]">
                    {personalGoals.filter(g => g.completed).length} / {personalGoals.length} done
                  </span>
                </div>

                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                  {personalGoals.length === 0 ? (
                    <p className="text-[10px] text-[var(--t3)] italic text-center py-2">No personal goals logged yet.</p>
                  ) : (
                    personalGoals.map(goal => (
                      <div key={goal.id} className="flex items-center justify-between py-1 border-b border-[var(--bd)]/30 group last:border-0">
                        <button
                          onClick={() => handleTogglePersonalGoal(goal.id)}
                          className="flex items-center gap-2 flex-1 text-left cursor-pointer"
                        >
                          <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 ${
                            goal.completed ? 'bg-[var(--gd)] border-[var(--gd)] text-[var(--bg)]' : 'border-[var(--bd)]'
                          }`}>
                            {goal.completed && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                          </div>
                          <span className={`text-[11px] leading-tight ${goal.completed ? 'line-through text-[var(--t3)]' : 'text-[var(--t2)]'}`}>
                            {goal.text}
                          </span>
                        </button>
                        <button
                          onClick={() => handleDeletePersonalGoal(goal.id)}
                          className="text-[var(--t3)] hover:text-red-500 opacity-0 group-hover:opacity-100 transition p-0.5 cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))
                  )}
                </div>

                {/* Add goal input */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (newPersonalGoalText.trim()) {
                      handleAddPersonalGoal(newPersonalGoalText);
                      setNewPersonalGoalText('');
                    }
                  }}
                  className="flex gap-2 mt-1"
                >
                  <input
                    type="text"
                    placeholder="Define milestone (e.g. Laxmikanth revision)..."
                    value={newPersonalGoalText}
                    onChange={(e) => setNewPersonalGoalText(e.target.value)}
                    className="flex-1 bg-[var(--ra)] text-[10px] text-[var(--t1)] border border-[var(--bd)]/80 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-[var(--gd)]"
                  />
                  <button
                    type="submit"
                    className="bg-[var(--gd)] hover:opacity-90 text-[var(--bg)] px-2.5 py-1.5 rounded-lg text-[10px] font-bold uppercase transition cursor-pointer shrink-0"
                  >
                    Add
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Grid Layout for Analytics vs Review */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Progress & Target Section */}
        <div className="bg-[var(--sur)] p-5 rounded-3xl border border-[var(--bd)] flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Clock className="w-5 h-5 text-[var(--gd)]" />
              <h3 className="font-serif font-bold text-[var(--t1)]">Daily Reading Quota</h3>
            </div>
            <p className="text-xs text-[var(--t2)] font-serif mb-4 leading-relaxed">
              Consistently completing your reading quota reinforces baseline knowledge, preparing you for the gruelling multi-hour UPSC exam format.
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-end">
              <div>
                <p className="text-2xl font-mono font-bold text-[var(--t1)]">{minutesToday} <span className="text-xs text-[var(--t3)] font-sans">/ {dailyTarget} min</span></p>
                <p className="text-[10px] uppercase font-bold text-[var(--t3)]">Time logged today</p>
              </div>
              <span className="text-xs font-bold text-[var(--bg)] bg-[var(--gd)] px-2.5 py-1 rounded-xl">
                {progressPercent}% Complete
              </span>
            </div>

            {/* Progress bar */}
            <div className="w-full h-2 bg-[var(--ra)] rounded-full overflow-hidden border border-[var(--bd)]">
              <div 
                className="h-full bg-[var(--gd)] rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              ></div>
            </div>

            {progressPercent >= 100 ? (
              <div className="flex items-center gap-1.5 text-[var(--ok)] bg-emerald-500/10 border border-[var(--ok)]/20 rounded-2xl p-2.5 text-xs">
                <CheckCircle2 className="w-4 h-4" />
                <span>Excellent! Daily scholar quota achieved.</span>
              </div>
            ) : (
              <p className="text-[11px] text-[var(--t2)] italic font-serif">
                Read another <strong className="font-mono">{dailyTarget - minutesToday} min</strong> today to maintain your daily discipline.
              </p>
            )}
          </div>
        </div>

        {/* Leitner Spaced-Repetition Deck Promotion */}
        <div className="bg-[var(--sur)] p-5 rounded-3xl border border-[var(--bd)] flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-2 right-2 opacity-5">
            <Calendar className="w-24 h-24 text-[var(--t1)]" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-3">
              <AlertCircle className="w-5 h-5 text-[var(--gd)]" />
              <h3 className="font-serif font-bold text-[var(--t1)]">Leitner Memory Deck</h3>
            </div>
            <p className="text-xs text-[var(--t2)] font-serif mb-4 leading-relaxed">
              Active recall keeps historical timelines, constitutional articles, and economic indicators fresh in your long-term memory, mitigating the standard forgetting curve.
            </p>
          </div>

          <div className="space-y-3">
            <div className="bg-[var(--ra)] border-l-2 border-[var(--gd)] p-3 rounded-2xl">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-[var(--t1)]">Cards Due for Review</span>
                <span className="font-mono text-sm font-bold bg-[var(--sur)] text-[var(--gd)] px-2 py-0.5 border border-[var(--bd)] rounded-lg">
                  {dueCards.length}
                </span>
              </div>
              <p className="text-[10px] text-[var(--t3)] mt-1">Review scheduled items today to move cards to higher boxes.</p>
            </div>

            <button 
              onClick={onNavigateToLeitner}
              className="w-full bg-[var(--gd)] hover:opacity-90 text-[var(--bg)] py-2.5 rounded-2xl text-xs font-bold uppercase tracking-wider transition flex items-center justify-center gap-2 shadow-xs"
            >
              Start Recall Session
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Saved Bookmarks */}
        <div className="bg-[var(--sur)] p-5 rounded-3xl border border-[var(--bd)] flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Bookmark className="w-5 h-5 text-[var(--gd)]" />
              <h3 className="font-serif font-bold text-[var(--t1)]">Recent Bookmarks</h3>
            </div>
            {!state.bookmarks || state.bookmarks.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-xs text-[var(--t3)] italic">No bookmarks saved yet.</p>
                <p className="text-[11px] text-[var(--t3)] mt-1 font-serif leading-relaxed">
                  Toggle bookmarking within the syllabus chapter reading companion workspace.
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1">
                {state.bookmarks.slice(-3).reverse().map((b: BookmarkType) => (
                  <div 
                    key={b.id}
                    onClick={() => onNavigateToChapter(b.chapterId, b.topicId)}
                    className="p-2.5 bg-[var(--ra)] hover:bg-[var(--sur)] rounded-2xl border border-[var(--bd)] flex items-center justify-between cursor-pointer group transition text-left"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-bold text-[var(--t1)] truncate group-hover:text-[var(--gd)] transition">{b.topicTitle || b.sectionTitle || 'Polity'}</p>
                      <p className="text-[9px] text-[var(--t3)] truncate">{b.chapterTitle}</p>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-[var(--gd)] shrink-0 opacity-55" />
                  </div>
                ))}
              </div>
            )}
          </div>
          {state.bookmarks && state.bookmarks.length > 0 && (
            <p className="text-[9px] text-[var(--t3)] text-center mt-2 italic">Click any card to resume reading instantly.</p>
          )}
        </div>
      </div>

      {/* GS Papers Mapping Directory */}
      <div className="space-y-3">
        <h3 className="font-serif font-bold text-base text-[var(--t1)] border-b border-[var(--bd)] pb-1">UPSC General Studies Structure</h3>
        <p className="text-[11px] text-[var(--t3)] font-serif italic">Click any subject card below to open its dedicated folder cabinet instantly.</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { paper: 'GS Paper I', title: 'History & Geography', count: getSubjectCounts('History') + getSubjectCounts('Geography'), color: 'border-amber-600/40 bg-amber-500/5 hover:border-amber-500 hover:bg-amber-500/10' },
            { paper: 'GS Paper II', title: 'Polity & Governance', count: getSubjectCounts('Polity'), color: 'border-indigo-600/40 bg-indigo-500/5 hover:border-indigo-500 hover:bg-indigo-500/10' },
            { paper: 'GS Paper III', title: 'Economy & Environment', count: getSubjectCounts('Economy') + getSubjectCounts('Environment'), color: 'border-teal-600/40 bg-teal-500/5 hover:border-teal-500 hover:bg-teal-500/10' },
            { paper: 'GS Paper IV', title: 'Ethics & Aptitude', count: getSubjectCounts('Science & Tech') + getSubjectCounts('General'), color: 'border-slate-600/40 bg-slate-500/5 hover:border-slate-500 hover:bg-slate-500/10' },
          ].map((paper, idx) => (
            <button
              key={idx}
              onClick={() => onNavigateToSubject?.(paper.paper)}
              className={`p-4 rounded-3xl border border-l-4 shadow-xs text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md cursor-pointer group w-full ${paper.color}`}
            >
              <h4 className="text-[10px] uppercase tracking-widest font-bold text-[var(--t1)] group-hover:text-[var(--gd)] transition duration-200">{paper.paper}</h4>
              <p className="text-xs font-serif italic text-[var(--t2)] font-medium mt-0.5">{paper.title}</p>
              <div className="flex justify-between items-center mt-3 pt-2 border-t border-[var(--bd)]">
                <span className="text-[11px] text-[var(--t3)] font-mono">Mapped Materials</span>
                <span className="bg-[var(--gd)] text-[var(--bg)] text-[10px] font-mono font-bold px-2 py-0.5 rounded-lg">
                  {paper.count} Ch
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
