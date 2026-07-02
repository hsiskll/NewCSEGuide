import React, { useState, useMemo, useEffect } from 'react';
import { 
  Award, Sparkles, Clock, ChevronRight, ChevronLeft, Calendar, Play, Pause,
  CheckCircle2, XCircle, BookOpen, Trash2, HelpCircle, ArrowRight, Check, AlertTriangle,
  BrainCircuit, ShieldAlert, ListChecks, RotateCcw
} from 'lucide-react';
import { UPSCState, Chapter, Topic, MCQItem, PYQQuestion, WeeklyTestSession, TopicProgress } from '../types';

interface WeeklyTestTabProps {
  state: UPSCState;
  onUpdateState: (updated: UPSCState) => void;
  onNavigateToChapter: (chapterId: string, topicId?: string, tabId?: string) => void;
}

interface TestQuestion {
  id: string;
  type: 'mcq' | 'pyq';
  question: string;
  options: string[];
  answer: string;
  explanation: string;
  chapterTitle: string;
  topicTitle: string;
  chapterId: string;
  topicId: string;
  isPriorWrong: boolean;
}

export default function WeeklyTestTab({ state, onUpdateState, onNavigateToChapter }: WeeklyTestTabProps) {
  // Navigation states
  // 'setup' | 'testing' | 'results' | 'review_past'
  const [viewState, setViewState] = useState<'setup' | 'testing' | 'results' | 'review_past'>('setup');
  
  // Test configuration
  const [selectedChapters, setSelectedChapters] = useState<Record<string, boolean>>({});
  const [correctMixSize, setCorrectMixSize] = useState<number>(5); // 0, 3, 5, 10, 20
  const [isInstantFeedback, setIsInstantFeedback] = useState<boolean>(true);
  const [testMode, setTestMode] = useState<'review' | 'simulate'>('review'); // review mistakes vs full mock simulation
  const [maxQuestions, setMaxQuestions] = useState<number>(15);

  // Active test execution
  const [activeQuestions, setActiveQuestions] = useState<TestQuestion[]>([]);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState<number>(0);
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({}); // questionId -> selectedOption
  const [answeredInstantList, setAnsweredInstantList] = useState<Record<string, boolean>>({}); // questionId -> hasClickedValidate
  const [testStartTime, setTestStartTime] = useState<number>(0);
  const [testElapsedTime, setTestElapsedTime] = useState<number>(0);
  const [testTimerActive, setTestTimerActive] = useState<boolean>(false);

  // Results & Past review
  const [lastSavedSession, setLastSavedSession] = useState<WeeklyTestSession | null>(null);
  const [viewPastSession, setViewPastSession] = useState<WeeklyTestSession | null>(null);

  // Calculate standard Sunday date relative to current time
  const today = new Date('2026-06-29T01:17:02-07:00'); // Consistent with system clock
  const currentDayOfWeek = today.getDay(); // 0 is Sunday, 1 is Monday, etc.
  const daysUntilSunday = currentDayOfWeek === 0 ? 0 : 7 - currentDayOfWeek;
  
  const getSundayDateStr = () => {
    const sunDate = new Date(today);
    sunDate.setDate(today.getDate() + daysUntilSunday);
    return sunDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Scan syllabus and aggregate user mistakes + correct attempts
  const chapterStats = useMemo(() => {
    const stats: Record<string, {
      chapterId: string;
      title: string;
      chapterNumber: number;
      subject: string;
      wrongMcqs: MCQItem[];
      wrongPyqs: PYQQuestion[];
      correctMcqs: MCQItem[];
      correctPyqs: PYQQuestion[];
      unattemptedMcqs: MCQItem[];
      unattemptedPyqs: PYQQuestion[];
      totalQuestions: number;
    }> = {};

    (state.chapters || []).forEach(ch => {
      const wrongMcqs: MCQItem[] = [];
      const wrongPyqs: PYQQuestion[] = [];
      const correctMcqs: MCQItem[] = [];
      const correctPyqs: PYQQuestion[] = [];
      const unattemptedMcqs: MCQItem[] = [];
      const unattemptedPyqs: PYQQuestion[] = [];

      (ch.topics || []).forEach(tp => {
        const prog = state.topicProgress?.[tp.id];

        // MCQs
        if (tp.mcqs && tp.mcqs.length > 0) {
          tp.mcqs.forEach(m => {
            if (prog?.mcqAttempts) {
              const attempts = prog.mcqAttempts[m.id];
              if (attempts && attempts.length > 0) {
                const latest = attempts[attempts.length - 1];
                if (latest.isCorrect === false) {
                  wrongMcqs.push(m);
                } else {
                  correctMcqs.push(m);
                }
              } else {
                unattemptedMcqs.push(m);
              }
            } else {
              unattemptedMcqs.push(m);
            }
          });
        }

        // PYQs
        if (tp.pyqs && tp.pyqs.length > 0) {
          tp.pyqs.forEach(p => {
            if (prog?.pyq) {
              const selectedAns = prog.pyq[p.id];
              if (selectedAns) {
                const isCorrect = selectedAns === p.answer;
                if (isCorrect === false) {
                  wrongPyqs.push(p);
                } else {
                  correctPyqs.push(p);
                }
              } else {
                unattemptedPyqs.push(p);
              }
            } else {
              unattemptedPyqs.push(p);
            }
          });
        }
      });

      const totalQuestions = wrongMcqs.length + wrongPyqs.length + correctMcqs.length + correctPyqs.length + unattemptedMcqs.length + unattemptedPyqs.length;

      stats[ch.id] = {
        chapterId: ch.id,
        title: ch.metadata.chapter_title || ch.title,
        chapterNumber: ch.metadata.chapter_number,
        subject: ch.subject,
        wrongMcqs,
        wrongPyqs,
        correctMcqs,
        correctPyqs,
        unattemptedMcqs,
        unattemptedPyqs,
        totalQuestions
      };
    });

    return stats;
  }, [state.chapters, state.topicProgress]);

  // Set default chapter selections to chapters that have either errors or correct hits
  useEffect(() => {
    const initialSelects: Record<string, boolean> = {};
    let hasAnyData = false;
    Object.keys(chapterStats).forEach(chId => {
      const s = chapterStats[chId];
      if (s.wrongMcqs.length > 0 || s.wrongPyqs.length > 0 || s.correctMcqs.length > 0 || s.correctPyqs.length > 0) {
        initialSelects[chId] = true;
        hasAnyData = true;
      }
    });

    // Fallback: if no answers attempted yet, select the first few chapters by default
    if (!hasAnyData) {
      (state.chapters || []).slice(0, 3).forEach(ch => {
        initialSelects[ch.id] = true;
      });
    }
    setSelectedChapters(initialSelects);
  }, [chapterStats, state.chapters]);

  // Aggregate stats across currently selected chapters
  const activeSelectionAggregates = useMemo(() => {
    let wrongMcqCount = 0;
    let wrongPyqCount = 0;
    let correctMcqCount = 0;
    let correctPyqCount = 0;
    let unattemptedMcqCount = 0;
    let unattemptedPyqCount = 0;

    Object.keys(selectedChapters).forEach(chId => {
      if (selectedChapters[chId] && chapterStats[chId]) {
        const s = chapterStats[chId];
        wrongMcqCount += s.wrongMcqs.length;
        wrongPyqCount += s.wrongPyqs.length;
        correctMcqCount += s.correctMcqs.length;
        correctPyqCount += s.correctPyqs.length;
        unattemptedMcqCount += s.unattemptedMcqs.length;
        unattemptedPyqCount += s.unattemptedPyqs.length;
      }
    });

    return {
      wrongTotal: wrongMcqCount + wrongPyqCount,
      correctTotal: correctMcqCount + correctPyqCount,
      unattemptedTotal: unattemptedMcqCount + unattemptedPyqCount,
      wrongMcqCount,
      wrongPyqCount,
      correctMcqCount,
      correctPyqCount,
    };
  }, [selectedChapters, chapterStats]);

  // Timer running in active test
  useEffect(() => {
    let timerId: any = null;
    if (testTimerActive && viewState === 'testing') {
      timerId = setInterval(() => {
        setTestElapsedTime(Math.floor((Date.now() - testStartTime) / 1000));
      }, 1000);
    }
    return () => {
      if (timerId) clearInterval(timerId);
    };
  }, [testTimerActive, testStartTime, viewState]);

  // Generate test question set based on selected parameters
  const handleStartTest = () => {
    const wrongPool: TestQuestion[] = [];
    const correctPool: TestQuestion[] = [];
    const unattemptedPool: TestQuestion[] = [];

    // 1. Gather pools from selected chapters
    (state.chapters || []).forEach(ch => {
      if (!selectedChapters[ch.id]) return;

      const chTitle = ch.metadata.chapter_title || ch.title;
      
      (ch.topics || []).forEach(tp => {
        const prog = state.topicProgress?.[tp.id];

        // MCQs
        if (tp.mcqs && tp.mcqs.length > 0) {
          tp.mcqs.forEach(m => {
            const attempts = prog?.mcqAttempts?.[m.id];
            const hasAttempts = attempts && attempts.length > 0;
            const isLatestWrong = hasAttempts && attempts[attempts.length - 1].isCorrect === false;
            const isLatestCorrect = hasAttempts && attempts[attempts.length - 1].isCorrect === true;

            const tq: TestQuestion = {
              id: m.id,
              type: 'mcq',
              question: m.question,
              options: m.options,
              answer: m.answer,
              explanation: m.explanation || 'No explanation provided.',
              chapterTitle: chTitle,
              topicTitle: tp.title,
              chapterId: ch.id,
              topicId: tp.id,
              isPriorWrong: isLatestWrong
            };

            if (isLatestWrong) {
              wrongPool.push(tq);
            } else if (isLatestCorrect) {
              correctPool.push(tq);
            } else {
              unattemptedPool.push(tq);
            }
          });
        }

        // PYQs
        if (tp.pyqs && tp.pyqs.length > 0) {
          tp.pyqs.forEach(p => {
            const selectedAns = prog?.pyq?.[p.id];
            const hasAnswered = !!selectedAns;
            const isCorrect = hasAnswered && selectedAns === p.answer;

            const tq: TestQuestion = {
              id: p.id,
              type: 'pyq',
              question: p.question,
              options: p.options,
              answer: p.answer,
              explanation: p.answer_explanation || (p as any).explanation || 'No explanation provided.',
              chapterTitle: chTitle,
              topicTitle: tp.title,
              chapterId: ch.id,
              topicId: tp.id,
              isPriorWrong: hasAnswered && !isCorrect
            };

            if (hasAnswered && !isCorrect) {
              wrongPool.push(tq);
            } else if (isCorrect) {
              correctPool.push(tq);
            } else {
              unattemptedPool.push(tq);
            }
          });
        }
      });
    });

    let finalQuestions: TestQuestion[] = [];

    // If review mode (focus on mistakes + selected corrects reinforcement)
    if (testMode === 'review') {
      // Add all wrong answers
      finalQuestions = [...wrongPool];

      // Shuffle and sample correct reinforcement mix
      const shuffledCorrects = [...correctPool].sort(() => Math.random() - 0.5);
      const sampledCorrects = shuffledCorrects.slice(0, correctMixSize);
      
      finalQuestions = [...finalQuestions, ...sampledCorrects];
    } 
    // If simulation mode, pull up to maxQuestions comprising errors + unattempted/corrects
    else {
      // Mix errors first, then unattempted, then corrects to reach maxQuestions limit
      const shuffledErrors = [...wrongPool].sort(() => Math.random() - 0.5);
      const shuffledUnattempted = [...unattemptedPool].sort(() => Math.random() - 0.5);
      const shuffledCorrects = [...correctPool].sort(() => Math.random() - 0.5);

      finalQuestions = [...shuffledErrors];

      // Pad with unattempted
      if (finalQuestions.length < maxQuestions) {
        const needed = maxQuestions - finalQuestions.length;
        finalQuestions = [...finalQuestions, ...shuffledUnattempted.slice(0, needed)];
      }

      // Pad with corrects if still needed
      if (finalQuestions.length < maxQuestions) {
        const needed = maxQuestions - finalQuestions.length;
        finalQuestions = [...finalQuestions, ...shuffledCorrects.slice(0, needed)];
      }

      // Limit to requested count
      finalQuestions = finalQuestions.slice(0, maxQuestions);
    }

    // Shuffle the consolidated set so the student doesn't know which is which or the order
    finalQuestions.sort(() => Math.random() - 0.5);

    // Guard: if no questions found (empty syllabus or no questions in selected chapters)
    if (finalQuestions.length === 0) {
      alert("No questions found in the selected chapters. Please try adjusting your selections or choosing 'Comprehensive Sunday Simulation' to pad with unattempted questions!");
      return;
    }

    // Initialize state
    setActiveQuestions(finalQuestions);
    setCurrentQuestionIdx(0);
    setUserAnswers({});
    setAnsweredInstantList({});
    setTestStartTime(Date.now());
    setTestElapsedTime(0);
    setTestTimerActive(true);
    setViewState('testing');
  };

  // Submit test and save findings
  const handleSubmitTest = () => {
    setTestTimerActive(false);

    // Calculate score
    let correctCount = 0;
    const testQuestionsSaved = activeQuestions.map(q => {
      const selected = userAnswers[q.id] || '';
      const isCorrect = selected === q.answer;
      if (isCorrect) correctCount++;

      return {
        questionId: q.id,
        type: q.type,
        questionText: q.question,
        selectedAnswer: selected,
        correctAnswer: q.answer,
        isCorrect
      };
    });

    const accuracy = activeQuestions.length > 0 ? Math.round((correctCount / activeQuestions.length) * 100) : 0;
    
    // Create new WeeklyTestSession
    const newSession: WeeklyTestSession = {
      id: `weekly_test_${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      chapterIds: Object.keys(selectedChapters).filter(k => selectedChapters[k]),
      totalQuestions: activeQuestions.length,
      correctAnswers: correctCount,
      accuracy,
      timeTaken: testElapsedTime,
      questions: testQuestionsSaved
    };

    // Update central state with the test run, which updates user records in localStorage
    const currentTests = state.weeklyTests || [];
    const updatedState: UPSCState = {
      ...state,
      weeklyTests: [newSession, ...currentTests]
    };
    onUpdateState(updatedState);

    // Also write back any newly corrected answers to Chapter progress records for Leitner sync!
    // If they got a prior incorrect answer RIGHT in this test, update its state!
    let updatedTopicProgress = { ...(state.topicProgress || {}) };
    let progressModified = false;

    activeQuestions.forEach(q => {
      const userSelected = userAnswers[q.id];
      if (!userSelected) return; // skipped

      const isCorrect = userSelected === q.answer;
      
      if (q.type === 'mcq') {
        const originalProg = updatedTopicProgress[q.topicId] || {
          read: false, slides: false, concepts: false, flashcards: false, pyq: {}, notes: ""
        };
        const originalAttempts = originalProg.mcqAttempts?.[q.id] || [];
        const newAttempts = [
          ...originalAttempts,
          {
            date: new Date().toISOString().split('T')[0],
            isCorrect,
            answer: userSelected
          }
        ];

        updatedTopicProgress[q.topicId] = {
          ...originalProg,
          mcqAttempts: {
            ...(originalProg.mcqAttempts || {}),
            [q.id]: newAttempts
          }
        };
        progressModified = true;
      } else if (q.type === 'pyq') {
        // PYQ stores in 'pyq' mapping: pyqId -> selectedAnswer
        const originalProg = updatedTopicProgress[q.topicId] || {
          read: false, slides: false, concepts: false, flashcards: false, pyq: {}, notes: ""
        };
        
        updatedTopicProgress[q.topicId] = {
          ...originalProg,
          pyq: {
            ...(originalProg.pyq || {}),
            [q.id]: userSelected
          }
        };
        progressModified = true;
      }
    });

    if (progressModified) {
      onUpdateState({
        ...updatedState,
        topicProgress: updatedTopicProgress
      });
    }

    setLastSavedSession(newSession);
    setViewState('results');
  };

  // Toggle selection of all chapters
  const handleSelectAllChapters = (val: boolean) => {
    const updated: Record<string, boolean> = {};
    (state.chapters || []).forEach(ch => {
      updated[ch.id] = val;
    });
    setSelectedChapters(updated);
  };

  // Delete a past test run from records
  const handleDeletePastSession = (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Are you sure you want to permanently delete this weekly Sunday test record?")) {
      const updatedTests = (state.weeklyTests || []).filter(s => s.id !== sessionId);
      onUpdateState({
        ...state,
        weeklyTests: updatedTests
      });
      if (viewPastSession?.id === sessionId) {
        setViewPastSession(null);
      }
    }
  };

  // Format elapsed seconds to MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div id="weekly_test_tab" className="space-y-6 text-left">
      {/* Tab Header Banner */}
      <div className="bg-[var(--sur)] p-6 sm:p-8 rounded-3xl border border-[var(--bd)] relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-6 shadow-3xs">
        <div className="space-y-2 max-w-2xl">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-[var(--gd)]" />
            <span className="text-[10px] uppercase tracking-wider font-mono font-bold text-[var(--gd)] bg-[var(--gd)]/10 px-2.5 py-0.5 rounded-full border border-[var(--gd)]/20">Sunday Revision Portal</span>
          </div>
          <h1 className="font-serif font-bold text-xl sm:text-2xl text-[var(--t1)]">Weekly MCQ Revision Test</h1>
          <p className="text-xs text-[var(--t2)] leading-relaxed font-serif">
            Traditional Sunday revision drill. Aggregates all incorrectly answered questions from active and previous weeks, matching them with a recall reinforcement mix of correct hits to reinforce memory blocks and eliminate UPSC retention decay.
          </p>
        </div>

        {/* Dynamic Countdown */}
        <div className="bg-[var(--ra)]/50 border border-[var(--bd)] p-4 rounded-2xl flex items-center gap-3 w-full md:w-auto shrink-0 shadow-3xs">
          <div className="p-3 bg-[var(--gd)]/10 text-[var(--gd)] rounded-xl">
            <Clock className="w-6 h-6 animate-pulse" />
          </div>
          <div className="space-y-0.5 text-left">
            <span className="text-[9px] font-mono text-[var(--t3)] uppercase font-semibold">Sunday Test Window</span>
            <div className="font-serif font-bold text-sm text-[var(--t1)]">{getSundayDateStr()}</div>
            <div className="text-[10px] font-mono text-emerald-500 font-bold flex items-center gap-1">
              <span>●</span> {daysUntilSunday === 0 ? "Active Revision Today!" : `${daysUntilSunday} day(s) until Sunday`}
            </div>
          </div>
        </div>
      </div>

      {/* VIEW A: SETUP PHASE */}
      {viewState === 'setup' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
          {/* Main settings column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Step 1: Configure Source Chapters */}
            <div className="bg-[var(--sur)] p-5 rounded-3xl border border-[var(--bd)] space-y-4 shadow-3xs">
              <div className="flex justify-between items-center border-b border-[var(--bd)] pb-3">
                <div className="flex items-center gap-2">
                  <ListChecks className="w-5 h-5 text-[var(--gd)]" />
                  <h2 className="font-serif font-bold text-sm sm:text-base text-[var(--t1)]">1. Select Chapter Ledger</h2>
                </div>
                <div className="flex gap-2 text-[10px] font-mono">
                  <button 
                    onClick={() => handleSelectAllChapters(true)}
                    className="text-[var(--gd)] hover:underline uppercase font-bold cursor-pointer"
                  >
                    All
                  </button>
                  <span className="text-[var(--bd)]">|</span>
                  <button 
                    onClick={() => handleSelectAllChapters(false)}
                    className="text-[var(--t3)] hover:underline uppercase font-bold cursor-pointer"
                  >
                    Clear
                  </button>
                </div>
              </div>

              {/* Chapters list */}
              <div className="max-h-80 overflow-y-auto pr-2 divide-y divide-[var(--bd)]/20 space-y-1">
                {(state.chapters || []).map(ch => {
                  const s = chapterStats[ch.id];
                  const isChecked = !!selectedChapters[ch.id];
                  const hasHistory = s && (s.wrongMcqs.length > 0 || s.wrongPyqs.length > 0 || s.correctMcqs.length > 0 || s.correctPyqs.length > 0);

                  return (
                    <div 
                      key={ch.id} 
                      onClick={() => setSelectedChapters(prev => ({ ...prev, [ch.id]: !isChecked }))}
                      className={`flex items-center justify-between p-3 rounded-xl transition cursor-pointer hover:bg-[var(--ra)]/30 ${isChecked ? 'bg-[var(--ra)]/20' : ''}`}
                    >
                      <div className="flex items-center gap-3 text-left">
                        <div className={`w-4 h-4 rounded border flex items-center justify-center transition shrink-0 ${isChecked ? 'border-[var(--gd)] bg-[var(--gd)] text-[var(--bg)]' : 'border-[var(--bd)]'}`}>
                          {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                        <div className="space-y-0.5">
                          <span className="text-[9px] font-mono uppercase text-[var(--t3)] tracking-wider">
                            Chapter {ch.metadata.chapter_number} • {ch.subject}
                          </span>
                          <h4 className="font-serif font-semibold text-xs sm:text-sm text-[var(--t1)] leading-snug line-clamp-1">
                            {ch.metadata.chapter_title || ch.title}
                          </h4>
                        </div>
                      </div>

                      {/* Info indicators */}
                      <div className="flex gap-2 shrink-0">
                        {hasHistory ? (
                          <div className="flex gap-1.5 items-center">
                            {s.wrongMcqs.length + s.wrongPyqs.length > 0 && (
                              <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-red-500/10 text-red-500 border border-red-500/20 font-bold">
                                {s.wrongMcqs.length + s.wrongPyqs.length} Errors
                              </span>
                            )}
                            {s.correctMcqs.length + s.correctPyqs.length > 0 && (
                              <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 font-bold">
                                {s.correctMcqs.length + s.correctPyqs.length} Recall
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-[9px] font-mono text-[var(--t3)] uppercase font-semibold">Unattempted</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Step 2: Configure Parameters */}
            <div className="bg-[var(--sur)] p-5 rounded-3xl border border-[var(--bd)] space-y-5 shadow-3xs">
              <div className="border-b border-[var(--bd)] pb-3 flex items-center gap-2">
                <BrainCircuit className="w-5 h-5 text-[var(--gd)]" />
                <h2 className="font-serif font-bold text-sm sm:text-base text-[var(--t1)]">2. Configure Retention Parameters</h2>
              </div>

              {/* Mode toggle */}
              <div className="space-y-2">
                <label className="text-[10px] uppercase font-bold tracking-wider text-[var(--t3)] font-mono block">Test Engine Objective</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setTestMode('review')}
                    className={`p-4 rounded-2xl border text-left space-y-1 transition duration-150 cursor-pointer ${testMode === 'review' ? 'border-[var(--gd)] bg-[var(--gd)]/5' : 'border-[var(--bd)] bg-transparent hover:bg-[var(--ra)]/30'}`}
                  >
                    <h3 className="font-serif font-bold text-xs sm:text-sm text-[var(--t1)]">Logged Errors & Reinforcement</h3>
                    <p className="text-[10px] text-[var(--t2)] leading-relaxed font-serif">Focus strictly on correcting past wrong choices, mixed with correct answers for spacing strength.</p>
                  </button>

                  <button
                    onClick={() => setTestMode('simulate')}
                    className={`p-4 rounded-2xl border text-left space-y-1 transition duration-150 cursor-pointer ${testMode === 'simulate' ? 'border-[var(--gd)] bg-[var(--gd)]/5' : 'border-[var(--bd)] bg-transparent hover:bg-[var(--ra)]/30'}`}
                  >
                    <h3 className="font-serif font-bold text-xs sm:text-sm text-[var(--t1)]">Comprehensive Simulation Exam</h3>
                    <p className="text-[10px] text-[var(--t2)] leading-relaxed font-serif">Pad with unattempted questions from selected chapters to run a full mock trial (highly suggested if errors list is clean!).</p>
                  </button>
                </div>
              </div>

              {/* If review mode, adjust reinforcement corrects count */}
              {testMode === 'review' ? (
                <div className="space-y-2 animate-fade-in">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] uppercase font-bold tracking-wider text-[var(--t3)] font-mono">
                      Correct Answer Reinforcement Mix
                    </label>
                    <span className="text-[10px] font-mono text-[var(--gd)] font-bold">{correctMixSize} Questions Mixed In</span>
                  </div>
                  <div className="flex gap-2">
                    {[0, 3, 5, 10, 20].map(sz => (
                      <button
                        key={sz}
                        onClick={() => setCorrectMixSize(sz)}
                        className={`flex-1 py-2 rounded-xl text-xs font-bold transition border cursor-pointer ${correctMixSize === sz ? 'bg-[var(--gd)] text-[var(--bg)] border-[var(--gd)] font-extrabold' : 'border-[var(--bd)] hover:bg-[var(--ra)] text-[var(--t2)]'}`}
                      >
                        {sz === 0 ? 'None' : sz}
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] text-[var(--t3)] font-serif leading-relaxed">
                    Mixing correctly answered questions keeps you on your toes and verifies you aren't just memorizing which questions are wrong vs right.
                  </p>
                </div>
              ) : (
                <div className="space-y-2 animate-fade-in">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] uppercase font-bold tracking-wider text-[var(--t3)] font-mono">
                      Simulated Test Size
                    </label>
                    <span className="text-[10px] font-mono text-[var(--gd)] font-bold">{maxQuestions} Questions Max</span>
                  </div>
                  <div className="flex gap-2">
                    {[5, 10, 15, 25, 40].map(sz => (
                      <button
                        key={sz}
                        onClick={() => setMaxQuestions(sz)}
                        className={`flex-1 py-2 rounded-xl text-xs font-bold transition border cursor-pointer ${maxQuestions === sz ? 'bg-[var(--gd)] text-[var(--bg)] border-[var(--gd)] font-extrabold' : 'border-[var(--bd)] hover:bg-[var(--ra)] text-[var(--t2)]'}`}
                      >
                        {sz} Qs
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Validation mode: instant feedback vs simulator */}
              <div className="space-y-2">
                <label className="text-[10px] uppercase font-bold tracking-wider text-[var(--t3)] font-mono block">Feedback Revelation Type</label>
                <div className="flex gap-3">
                  <button
                    onClick={() => setIsInstantFeedback(true)}
                    className={`flex-1 p-3 rounded-2xl border text-left space-y-1 transition duration-150 cursor-pointer ${isInstantFeedback ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-[var(--bd)] bg-transparent hover:bg-[var(--ra)]/30'}`}
                  >
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                      <h4 className="font-serif font-bold text-xs text-[var(--t1)]">Instant Validation</h4>
                    </div>
                    <p className="text-[10px] text-[var(--t3)] font-serif leading-relaxed">View correct answer and detailed explanation immediately after ticking.</p>
                  </button>

                  <button
                    onClick={() => setIsInstantFeedback(false)}
                    className={`flex-1 p-3 rounded-2xl border text-left space-y-1 transition duration-150 cursor-pointer ${!isInstantFeedback ? 'border-amber-500/30 bg-amber-500/5' : 'border-[var(--bd)] bg-transparent hover:bg-[var(--ra)]/30'}`}
                  >
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                      <h4 className="font-serif font-bold text-xs text-[var(--t1)]">Exam Simulation</h4>
                    </div>
                    <p className="text-[10px] text-[var(--t3)] font-serif leading-relaxed">No immediate hints. Lock answers in sequence and review all grades/explanations at submission.</p>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Aggregated summary / Start sidebar panel */}
          <div className="space-y-6">
            <div className="bg-[var(--sur)] p-5 rounded-3xl border border-[var(--bd)] space-y-5 shadow-3xs text-left sticky top-4">
              <h2 className="font-serif font-bold text-sm sm:text-base text-[var(--t1)] border-b border-[var(--bd)] pb-3">Test Compilation Ledger</h2>

              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-[var(--t2)] font-serif">
                    <span>Prior Incorrect Questions Detected:</span>
                    <span className="font-mono font-bold text-red-500">{activeSelectionAggregates.wrongTotal}</span>
                  </div>
                  <div className="flex justify-between text-xs text-[var(--t2)] font-serif">
                    <span>Reinforcement Corrects Available:</span>
                    <span className="font-mono font-bold text-emerald-500">{activeSelectionAggregates.correctTotal}</span>
                  </div>
                  <div className="flex justify-between text-xs text-[var(--t2)] font-serif border-b border-[var(--bd)]/10 pb-2">
                    <span>Syllabus Unattempted Pools:</span>
                    <span className="font-mono font-bold text-[var(--gd)]">{activeSelectionAggregates.unattemptedTotal}</span>
                  </div>
                  <div className="flex justify-between text-xs font-bold text-[var(--t1)] font-serif pt-1">
                    <span>Total Test Questions Planned:</span>
                    <span className="font-mono text-base font-extrabold text-[var(--gd)]">
                      {testMode === 'review' 
                        ? activeSelectionAggregates.wrongTotal + Math.min(activeSelectionAggregates.correctTotal, correctMixSize)
                        : Math.min(maxQuestions, activeSelectionAggregates.wrongTotal + activeSelectionAggregates.correctTotal + activeSelectionAggregates.unattemptedTotal)
                      } Qs
                    </span>
                  </div>
                </div>

                {/* Warnings / Encouragements */}
                {activeSelectionAggregates.wrongTotal === 0 && testMode === 'review' && (
                  <div className="bg-amber-500/10 border border-amber-500/30 p-3.5 rounded-2xl space-y-1.5 flex gap-2 items-start">
                    <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                    <div className="text-[10px] text-[var(--t2)] font-serif leading-relaxed">
                      <strong className="text-amber-600">No mistakes logged!</strong> Perfect. Switch to <strong>Simulation Mode</strong> below to generate diagnostic practice questions from your syllabus instead!
                    </div>
                  </div>
                )}

                {activeSelectionAggregates.wrongTotal > 0 && (
                  <div className="bg-emerald-500/10 border border-emerald-500/30 p-3.5 rounded-2xl space-y-1.5 flex gap-2 items-start">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <div className="text-[10px] text-[var(--t2)] font-serif leading-relaxed">
                      <strong className="text-emerald-600">Mistakes detected!</strong> This Sunday test will isolate those {activeSelectionAggregates.wrongTotal} mistakes and mix correct items for rigorous recall drills.
                    </div>
                  </div>
                )}

                <button
                  onClick={handleStartTest}
                  className="w-full bg-[var(--gd)] hover:opacity-90 text-[var(--bg)] py-3 px-4 rounded-2xl font-bold uppercase tracking-wider text-xs transition flex items-center justify-center gap-2 cursor-pointer shadow-md"
                >
                  <Play className="w-4 h-4 fill-current text-[var(--bg)]" />
                  <span>Launch Weekly Revision Drill</span>
                </button>
              </div>
            </div>

            {/* Past Test Runs History */}
            {state.weeklyTests && state.weeklyTests.length > 0 && (
              <div className="bg-[var(--sur)] p-5 rounded-3xl border border-[var(--bd)] space-y-4 shadow-3xs">
                <h3 className="font-serif font-bold text-sm text-[var(--t1)] border-b border-[var(--bd)] pb-2 flex justify-between items-center">
                  <span>Historical Sunday Log</span>
                  <span className="text-[10px] font-mono font-bold text-[var(--gd)] uppercase">{state.weeklyTests.length} Run(s)</span>
                </h3>
                <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                  {state.weeklyTests.map((sess, idx) => (
                    <div 
                      key={sess.id}
                      onClick={() => {
                        setViewPastSession(sess);
                        setViewState('review_past');
                      }}
                      className="p-3 rounded-2xl border border-[var(--bd)] bg-[var(--ra)]/30 hover:bg-[var(--ra)] transition cursor-pointer flex justify-between items-center"
                    >
                      <div className="space-y-0.5 text-left">
                        <span className="text-[9px] font-mono text-[var(--t3)] uppercase font-semibold">
                          {sess.date}
                        </span>
                        <h4 className="font-serif font-bold text-xs text-[var(--t1)]">Run #{state.weeklyTests!.length - idx}</h4>
                        <p className="text-[10px] text-[var(--t2)] font-sans">
                          {sess.totalQuestions} Questions • {sess.correctAnswers} Correct
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-right">
                          <div className={`text-xs font-mono font-extrabold ${sess.accuracy >= 80 ? 'text-emerald-500' : sess.accuracy >= 60 ? 'text-amber-500' : 'text-red-500'}`}>
                            {sess.accuracy}%
                          </div>
                          <span className="text-[9px] font-mono text-[var(--t3)]">{formatTime(sess.timeTaken)}</span>
                        </div>
                        <button 
                          onClick={(e) => handleDeletePastSession(sess.id, e)}
                          className="p-1 rounded-lg text-[var(--t3)] hover:text-red-500 hover:bg-red-500/10 transition cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* VIEW B: ACTIVE TESTING PHASE */}
      {viewState === 'testing' && activeQuestions.length > 0 && (
        <div className="max-w-3xl mx-auto space-y-6 animate-fade-in font-sans">
          {/* Dashboard HUD */}
          <div className="bg-[var(--sur)] p-4 rounded-2xl border border-[var(--bd)] flex justify-between items-center gap-4 shadow-3xs">
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-mono font-bold bg-[var(--gd)]/10 text-[var(--gd)] border border-[var(--gd)]/20 px-2.5 py-0.5 rounded-full uppercase">
                Question {currentQuestionIdx + 1} of {activeQuestions.length}
              </span>
              <span className="text-[10px] font-mono text-[var(--t3)] hidden sm:inline uppercase">
                {activeQuestions[currentQuestionIdx].type === 'pyq' ? "UPSC PRELIMS PYQ" : "SYLLABUS DRILL"}
              </span>
            </div>

            {/* Test Stats HUD */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1 text-[var(--t2)] font-mono text-xs font-bold">
                <Clock className="w-4 h-4 text-[var(--gd)]" />
                <span>{formatTime(testElapsedTime)}</span>
              </div>
              <button
                onClick={handleSubmitTest}
                className="bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs uppercase px-4 py-1.5 rounded-xl tracking-wider transition cursor-pointer shadow-3xs"
              >
                Submit Test
              </button>
            </div>
          </div>

          {/* Progress bar gauge */}
          <div className="w-full bg-[var(--ra)] rounded-full h-1.5 overflow-hidden border border-[var(--bd)]">
            <div 
              className="bg-[var(--gd)] h-full transition-all duration-300"
              style={{ width: `${((currentQuestionIdx + 1) / activeQuestions.length) * 100}%` }}
            />
          </div>

          {/* Question Display Card */}
          <div className="bg-[var(--sur)] p-6 sm:p-8 rounded-3xl border border-[var(--bd)] space-y-6 shadow-md text-left">
            <div className="space-y-1 border-b border-[var(--bd)] pb-3">
              <span className="text-[9px] font-mono uppercase text-[var(--t3)] tracking-wider">
                {activeQuestions[currentQuestionIdx].chapterTitle} • {activeQuestions[currentQuestionIdx].topicTitle}
              </span>
              <div className="flex items-center gap-2">
                {activeQuestions[currentQuestionIdx].isPriorWrong ? (
                  <span className="text-[9px] font-mono uppercase font-bold bg-red-500/15 text-red-500 border border-red-500/30 px-2 py-0.5 rounded-full animate-pulse">
                    Mistake Review
                  </span>
                ) : (
                  <span className="text-[9px] font-mono uppercase font-bold bg-emerald-500/15 text-emerald-500 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                    Recall Reinforcement
                  </span>
                )}
              </div>
            </div>

            {/* Question Text */}
            <p className="font-serif leading-relaxed text-[var(--t1)] text-base sm:text-lg whitespace-pre-line">
              {activeQuestions[currentQuestionIdx].question}
            </p>

            {/* Options Buttons */}
            <div className="space-y-3 font-sans pt-2">
              {activeQuestions[currentQuestionIdx].options.map((option, oIdx) => {
                const optChar = String.fromCharCode(65 + oIdx);
                const isSelected = userAnswers[activeQuestions[currentQuestionIdx].id] === optChar;
                const isCorrect = optChar === activeQuestions[currentQuestionIdx].answer;
                
                // Determine styling based on selected answer and feedback mode
                let optionStyle = "border-[var(--bd)] bg-[var(--ra)]/30 hover:bg-[var(--ra)] hover:border-[var(--gd2)] text-[var(--t1)]";
                let icon = null;

                const hasValidated = answeredInstantList[activeQuestions[currentQuestionIdx].id];

                if (isSelected) {
                  optionStyle = "border-[var(--gd)] bg-[var(--gd)]/5 text-[var(--t1)] shadow-3xs ring-1 ring-[var(--gd)]";
                }

                if (isInstantFeedback && hasValidated) {
                  if (isCorrect) {
                    optionStyle = "border-emerald-500 bg-emerald-500/10 text-[var(--ok)] font-bold";
                    icon = <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
                  } else if (isSelected) {
                    optionStyle = "border-red-500 bg-red-500/10 text-[var(--er)] font-bold";
                    icon = <XCircle className="w-4 h-4 text-red-500" />;
                  }
                }

                return (
                  <button
                    key={oIdx}
                    disabled={isInstantFeedback && hasValidated}
                    onClick={() => {
                      setUserAnswers(prev => ({
                        ...prev,
                        [activeQuestions[currentQuestionIdx].id]: optChar
                      }));
                      if (isInstantFeedback) {
                        setAnsweredInstantList(prev => ({
                          ...prev,
                          [activeQuestions[currentQuestionIdx].id]: true
                        }));
                      }
                    }}
                    className={`w-full text-left p-4 rounded-2xl border flex items-center justify-between transition cursor-pointer ${optionStyle}`}
                  >
                    <div className="flex items-center gap-3 pr-4">
                      <span className="font-mono text-xs font-bold uppercase w-6 h-6 rounded-lg bg-[var(--ra)] flex items-center justify-center shrink-0 border border-[var(--bd)] text-[var(--t2)]">
                        {optChar}
                      </span>
                      <span className="text-xs sm:text-sm font-sans leading-relaxed">{option}</span>
                    </div>
                    {icon && <span className="shrink-0">{icon}</span>}
                  </button>
                );
              })}
            </div>

            {/* Instant feedback explanation panel */}
            {isInstantFeedback && answeredInstantList[activeQuestions[currentQuestionIdx].id] && (
              <div className="p-5 bg-[var(--ra)] rounded-2xl border border-[var(--bd)] border-l-4 border-l-[var(--gd)] space-y-2 animate-fade-in mt-4">
                <div className="flex items-center gap-2 text-[var(--gd)]">
                  <BrainCircuit className="w-5 h-5" />
                  <span className="font-mono font-bold text-[10px] uppercase tracking-wider">Sunday Revision Directive:</span>
                </div>
                <p className="text-xs font-serif text-[var(--t2)] leading-relaxed">
                  {activeQuestions[currentQuestionIdx].explanation}
                </p>
              </div>
            )}
          </div>

          {/* Navigation panel */}
          <div className="flex justify-between items-center gap-3 pt-2">
            <button
              onClick={() => setCurrentQuestionIdx(p => Math.max(0, p - 1))}
              disabled={currentQuestionIdx === 0}
              className="bg-[var(--sur)] hover:bg-[var(--ra)] disabled:opacity-40 text-[var(--t1)] font-bold text-xs uppercase px-5 py-3 rounded-2xl border border-[var(--bd)] transition flex items-center gap-1.5 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Back</span>
            </button>

            {currentQuestionIdx < activeQuestions.length - 1 ? (
              <button
                onClick={() => setCurrentQuestionIdx(p => p + 1)}
                className="bg-[var(--sur)] hover:bg-[var(--ra)] text-[var(--t1)] font-bold text-xs uppercase px-5 py-3 rounded-2xl border border-[var(--bd)] transition flex items-center gap-1.5 cursor-pointer ml-auto"
              >
                <span>Skip / Next</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleSubmitTest}
                className="bg-[var(--gd)] hover:opacity-90 text-[var(--bg)] font-bold text-xs uppercase px-6 py-3 rounded-2xl tracking-widest transition flex items-center gap-1.5 cursor-pointer ml-auto shadow-md"
              >
                <span>Submit & Score</span>
                <Check className="w-4 h-4stroke-[3]" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* VIEW C: LIVE RESULTS SCREEN */}
      {viewState === 'results' && lastSavedSession && (
        <div className="space-y-6 animate-fade-in font-sans">
          {/* Score Hero */}
          <div className="bg-[var(--sur)] p-6 sm:p-8 rounded-3xl border border-[var(--bd)] flex flex-col md:flex-row justify-between items-center gap-6 shadow-md text-left">
            <div className="space-y-3 max-w-lg">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-[var(--gd)] animate-bounce" />
                <span className="text-[10px] uppercase tracking-wider font-mono font-bold text-[var(--gd)]">Performance Assessment</span>
              </div>
              <h2 className="font-serif font-bold text-xl sm:text-2xl text-[var(--t1)]">Sunday revision trial completed!</h2>
              <p className="text-xs sm:text-sm text-[var(--t2)] leading-relaxed font-serif">
                {lastSavedSession.accuracy >= 90 
                  ? "Master Rank. Exceptional UPSC retention. Your neural recall networks are highly active with minimal memory degradation."
                  : lastSavedSession.accuracy >= 70
                    ? "Excellent performance. Review the brief gaps highlighted in the answer ledger below to finalize your absolute core mastery."
                    : "Remedial Revision Advised. Clear memory gaps detected. Focus on launching targeted revision reviews from the Intelligent Study Queue."
                }
              </p>
              <div className="pt-2 flex gap-3">
                <button
                  onClick={() => setViewState('setup')}
                  className="bg-[var(--gd)] hover:opacity-95 text-[var(--bg)] font-bold text-xs uppercase px-5 py-2.5 rounded-xl tracking-wider transition cursor-pointer shadow-3xs"
                >
                  Configure New Run
                </button>
              </div>
            </div>

            {/* Visual accuracy chart */}
            <div className="flex items-center gap-6 shrink-0 w-full md:w-auto bg-[var(--ra)]/30 border border-[var(--bd)]/50 p-5 rounded-2xl">
              {/* Score ring */}
              <div className="relative w-24 h-24 flex items-center justify-center">
                <svg className="w-full h-full -rotate-90">
                  <circle cx="48" cy="48" r="40" className="stroke-[var(--bd)] fill-none" strokeWidth="6" />
                  <circle 
                    cx="48" 
                    cy="48" 
                    r="40" 
                    className="stroke-[var(--gd)] fill-none transition-all duration-1000" 
                    strokeWidth="8" 
                    strokeDasharray={2 * Math.PI * 40}
                    strokeDashoffset={2 * Math.PI * 40 * (1 - lastSavedSession.accuracy / 100)}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute flex flex-col items-center justify-center">
                  <span className="text-xl font-mono font-extrabold text-[var(--t1)]">{lastSavedSession.accuracy}%</span>
                  <span className="text-[8px] font-mono text-[var(--t3)] uppercase">Accuracy</span>
                </div>
              </div>

              <div className="space-y-1">
                <div className="text-xs text-[var(--t2)] font-serif">
                  Score: <strong className="font-mono text-[var(--t1)]">{lastSavedSession.correctAnswers} / {lastSavedSession.totalQuestions}</strong>
                </div>
                <div className="text-xs text-[var(--t2)] font-serif">
                  Pace: <strong className="font-mono text-[var(--t1)]">{formatTime(lastSavedSession.timeTaken)}</strong>
                </div>
                <div className="text-[9px] uppercase font-mono bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded font-bold border border-emerald-500/20">
                  Grade: {lastSavedSession.accuracy >= 90 ? 'Class A' : lastSavedSession.accuracy >= 70 ? 'Class B' : 'Remedial Class'}
                </div>
              </div>
            </div>
          </div>

          {/* Ledger of answers */}
          <div className="space-y-4">
            <h3 className="font-serif font-bold text-base text-[var(--t1)] text-left flex items-center gap-2">
              <ListChecks className="w-5 h-5 text-[var(--gd)]" />
              <span>Granular Question Revision Sheet</span>
            </h3>

            <div className="space-y-4">
              {lastSavedSession.questions.map((q, idx) => {
                const questionData = activeQuestions.find(aq => aq.id === q.questionId);
                const isCorrect = q.isCorrect;

                return (
                  <div 
                    key={idx} 
                    className={`bg-[var(--sur)] p-5 rounded-2xl border transition text-left space-y-4 shadow-3xs ${isCorrect ? 'border-emerald-500/20 bg-emerald-500/[0.01]' : 'border-red-500/20 bg-red-500/[0.01]'}`}
                  >
                    <div className="flex justify-between items-start gap-4 border-b border-[var(--bd)]/10 pb-2">
                      <div className="space-y-0.5">
                        <span className="text-[9px] font-mono text-[var(--t3)] uppercase">QUESTION #{idx + 1} • {q.type === 'pyq' ? "UPSC PRELIMS" : "SYLLABUS DRILL"}</span>
                        {questionData && (
                          <p className="text-[9px] font-mono font-bold text-[var(--t3)] uppercase leading-relaxed">
                            {questionData.chapterTitle} • {questionData.topicTitle}
                          </p>
                        )}
                      </div>

                      {isCorrect ? (
                        <span className="text-[9px] font-mono font-bold uppercase bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-2 py-0.5 rounded">
                          ✓ Correct Recall
                        </span>
                      ) : (
                        <span className="text-[9px] font-mono font-bold uppercase bg-red-500/10 text-red-500 border border-red-500/20 px-2 py-0.5 rounded animate-pulse">
                          ✗ Memory Gap
                        </span>
                      )}
                    </div>

                    <p className="font-serif text-sm text-[var(--t1)] whitespace-pre-line leading-relaxed font-semibold">
                      {q.questionText}
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      <div className={`p-2 rounded-xl border ${isCorrect ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-600' : 'bg-red-500/5 border-red-500/20 text-red-600'} font-bold`}>
                        Selected Option: <span className="font-mono">{q.selectedAnswer || 'Skipped'}</span>
                      </div>
                      <div className="p-2 rounded-xl border bg-emerald-500/5 border-emerald-500/20 text-emerald-600 font-bold">
                        Correct Answer: <span className="font-mono">{q.correctAnswer}</span>
                      </div>
                    </div>

                    {/* Explanation */}
                    {questionData && (
                      <div className="p-4 bg-[var(--ra)] rounded-xl border-l-2 border-l-[var(--gd)] text-xs space-y-1">
                        <span className="font-mono text-[var(--gd)] font-bold text-[9px] uppercase tracking-wider block">Key Concept & Explanation:</span>
                        <p className="text-[var(--t2)] font-serif leading-relaxed">{questionData.explanation}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* VIEW D: HISTORICAL PAST TEST BREAKDOWN */}
      {viewState === 'review_past' && viewPastSession && (
        <div className="space-y-6 animate-fade-in font-sans">
          {/* Header back bar */}
          <div className="flex justify-between items-center border-b border-[var(--bd)] pb-3 text-left">
            <button
              onClick={() => setViewState('setup')}
              className="flex items-center gap-1.5 text-xs font-bold text-[var(--gd)] uppercase hover:underline cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Back to Selection Board</span>
            </button>
            <span className="text-[10px] font-mono text-[var(--t3)] uppercase">Test Run: {viewPastSession.date}</span>
          </div>

          <div className="bg-[var(--sur)] p-6 rounded-3xl border border-[var(--bd)] flex flex-col sm:flex-row justify-between items-center gap-6 shadow-md text-left">
            <div className="space-y-2">
              <h3 className="font-serif font-bold text-lg text-[var(--t1)]">Granular Test Run Report</h3>
              <p className="text-xs text-[var(--t2)] font-serif leading-relaxed">
                Reviewing saved test run executed on {viewPastSession.date}. Study these answers to further reinforce memory hooks.
              </p>
            </div>
            <div className="bg-[var(--ra)]/30 border border-[var(--bd)] p-4 rounded-xl flex gap-6 shrink-0">
              <div className="text-center">
                <div className="text-xl font-mono font-extrabold text-[var(--gd)]">{viewPastSession.accuracy}%</div>
                <div className="text-[8px] font-mono uppercase tracking-wider text-[var(--t3)]">Accuracy</div>
              </div>
              <div className="text-center border-l border-[var(--bd)]/30 pl-4">
                <div className="text-xl font-mono font-extrabold text-[var(--t1)]">{viewPastSession.correctAnswers} / {viewPastSession.totalQuestions}</div>
                <div className="text-[8px] font-mono uppercase tracking-wider text-[var(--t3)]">Correct Answers</div>
              </div>
              <div className="text-center border-l border-[var(--bd)]/30 pl-4">
                <div className="text-xl font-mono font-extrabold text-[var(--t1)]">{formatTime(viewPastSession.timeTaken)}</div>
                <div className="text-[8px] font-mono uppercase tracking-wider text-[var(--t3)]">Pace</div>
              </div>
            </div>
          </div>

          {/* Granular Questions review */}
          <div className="space-y-4">
            {viewPastSession.questions.map((q, idx) => {
              const isCorrect = q.isCorrect;

              return (
                <div 
                  key={idx} 
                  className={`bg-[var(--sur)] p-5 rounded-2xl border text-left space-y-4 shadow-3xs ${isCorrect ? 'border-emerald-500/20 bg-emerald-500/[0.01]' : 'border-red-500/20 bg-red-500/[0.01]'}`}
                >
                  <div className="flex justify-between items-start gap-4 border-b border-[var(--bd)]/10 pb-2">
                    <span className="text-[9px] font-mono text-[var(--t3)] uppercase">QUESTION #{idx + 1} • {q.type === 'pyq' ? "UPSC PRELIMS" : "SYLLABUS DRILL"}</span>
                    {isCorrect ? (
                      <span className="text-[9px] font-mono font-bold uppercase bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-2 py-0.5 rounded">
                        ✓ Correct Recall
                      </span>
                    ) : (
                      <span className="text-[9px] font-mono font-bold uppercase bg-red-500/10 text-red-500 border border-red-500/20 px-2 py-0.5 rounded">
                        ✗ Memory Gap
                      </span>
                    )}
                  </div>

                  <p className="font-serif text-sm text-[var(--t1)] whitespace-pre-line leading-relaxed font-semibold">
                    {q.questionText}
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <div className={`p-2 rounded-xl border ${isCorrect ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-600' : 'bg-red-500/5 border-red-500/20 text-red-600'} font-bold`}>
                      Selected Option: <span className="font-mono">{q.selectedAnswer || 'Skipped'}</span>
                    </div>
                    <div className="p-2 rounded-xl border bg-emerald-500/5 border-emerald-500/20 text-emerald-600 font-bold">
                      Correct Answer: <span className="font-mono">{q.correctAnswer}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
