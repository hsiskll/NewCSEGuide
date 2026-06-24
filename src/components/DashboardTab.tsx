import React, { useState } from 'react';
import { 
  Search, BookOpen, Clock, Calendar, Flame, AlertCircle, 
  Bookmark, ChevronRight, GraduationCap, ArrowRight, CheckCircle2
} from 'lucide-react';
import { UPSCState, Chapter, Topic, Bookmark as BookmarkType } from '../types';

interface DashboardTabProps {
  state: UPSCState;
  onNavigateToChapter: (chapterId: string, sectionId?: string) => void;
  onNavigateToLeitner: () => void;
  onNavigateToSubject?: (paper: string) => void;
}

export default function DashboardTab({ state, onNavigateToChapter, onNavigateToLeitner, onNavigateToSubject }: DashboardTabProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{ chapter: Chapter; topic: Topic; snippet: string }[]>([]);

  // Calculate Streak & Today's Study Time
  const todayStr = new Date().toISOString().split('T')[0];
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
            <h1 className="text-2xl md:text-3xl font-bold font-serif tracking-tight text-[var(--t1)]">
              Satyameva Jayate, Scholar
            </h1>
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
