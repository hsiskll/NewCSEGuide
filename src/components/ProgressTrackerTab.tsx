import React, { useState } from 'react';
import { 
  Award, BookOpen, Layers, Sparkles, CheckCircle2, 
  HelpCircle, FileText, ChevronDown, ChevronRight, Check,
  BookMarked, BrainCircuit, PenTool, Lightbulb, MessageSquare, StickyNote
} from 'lucide-react';
import { Folder, Chapter, Topic, TopicProgress } from '../types';

interface ProgressTrackerTabProps {
  folders: Folder[];
  chapters: Chapter[];
  topicProgress: Record<string, TopicProgress>;
  onToggleProgress?: (topicId: string, field: keyof TopicProgress) => void;
}

export default function ProgressTrackerTab({
  folders,
  chapters,
  topicProgress,
  onToggleProgress
}: ProgressTrackerTabProps) {
  const [expandedSubject, setExpandedSubject] = useState<string | null>(null);
  const [expandedChapter, setExpandedChapter] = useState<string | null>(null);

  // Group chapters by subject (from folders)
  const subjects = Array.from(new Set(folders.map(f => f.subject || f.name)));

  // Calculate global stats
  const totalChapters = chapters.length;
  let totalTopics = 0;
  let topicsRead = 0;
  let slidesViewed = 0;
  let conceptsCompleted = 0;
  let flashcardsCompleted = 0;
  let pyqsCompleted = 0;
  let notesTaken = 0;

  chapters.forEach(ch => {
    if (ch.topics) {
      ch.topics.forEach(t => {
        totalTopics++;
        const prog = topicProgress[t.id];
        if (prog) {
          if (prog.read) topicsRead++;
          if (prog.slides) slidesViewed++;
          if (prog.concepts) conceptsCompleted++;
          if (prog.flashcards) flashcardsCompleted++;
          if (prog.pyq && Object.keys(prog.pyq).length > 0) pyqsCompleted++;
          if (prog.notes && prog.notes.trim()) notesTaken++;
        }
      });
    }
  });

  const overallProgressPercent = totalTopics > 0 ? Math.round((topicsRead / totalTopics) * 100) : 0;

  const handleToggle = (topicId: string, field: keyof TopicProgress) => {
    if (onToggleProgress) {
      onToggleProgress(topicId, field);
    }
  };

  return (
    <div id="progress_tracker_tab" className="space-y-6 text-left">
      
      {/* 1. Global Progress Overview Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-brand-navy/15 pb-4">
        <div>
          <h2 className="font-display text-xl font-bold text-brand-navy">Academic Progress Matrix</h2>
          <p className="text-xs text-brand-slate font-serif">A comprehensive, real-time audit of your syllabus coverage and cognitive mastery by paper, subject, and micro-topic.</p>
        </div>
        
        {/* Overall Completion Circle/Badge */}
        <div className="bg-brand-navy text-brand-gold border border-brand-gold px-4 py-2 rounded-xl flex items-center gap-3 shadow-md self-start md:self-auto">
          <Award className="w-5 h-5 text-brand-gold animate-bounce" />
          <div>
            <span className="text-[10px] uppercase font-mono tracking-wider block opacity-75">Syllabus Coverage</span>
            <span className="text-lg font-mono font-extrabold">{overallProgressPercent}% Complete</span>
          </div>
        </div>
      </div>

      {/* 2. Bento Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-brand-navy/10 shadow-3xs flex flex-col justify-between">
          <div className="flex items-center gap-2 text-brand-navy">
            <BookOpen className="w-4 h-4 text-brand-gold" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-brand-slate">Topics Mastered</span>
          </div>
          <div className="mt-2.5">
            <p className="text-2xl font-mono font-bold text-brand-navy">{topicsRead} / {totalTopics}</p>
            <p className="text-[9px] font-serif text-gray-500 italic mt-0.5">Chapters read in full detail</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-brand-navy/10 shadow-3xs flex flex-col justify-between">
          <div className="flex items-center gap-2 text-brand-navy">
            <Lightbulb className="w-4 h-4 text-amber-500" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-brand-slate">Key Concepts</span>
          </div>
          <div className="mt-2.5">
            <p className="text-2xl font-mono font-bold text-brand-navy">{conceptsCompleted} / {totalTopics}</p>
            <p className="text-[9px] font-serif text-gray-500 italic mt-0.5">Constitutional schemas audited</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-brand-navy/10 shadow-3xs flex flex-col justify-between">
          <div className="flex items-center gap-2 text-brand-navy">
            <BrainCircuit className="w-4 h-4 text-brand-teal" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-brand-slate">Spaced Recalls</span>
          </div>
          <div className="mt-2.5">
            <p className="text-2xl font-mono font-bold text-brand-navy">{flashcardsCompleted} / {totalTopics}</p>
            <p className="text-[9px] font-serif text-gray-500 italic mt-0.5">Leitner decks revision active</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-brand-navy/10 shadow-3xs flex flex-col justify-between">
          <div className="flex items-center gap-2 text-brand-navy">
            <StickyNote className="w-4 h-4 text-purple-600" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-brand-slate">Personal Notes</span>
          </div>
          <div className="mt-2.5">
            <p className="text-2xl font-mono font-bold text-brand-navy">{notesTaken} / {totalTopics}</p>
            <p className="text-[9px] font-serif text-gray-500 italic mt-0.5">Detailed notes draft-synced</p>
          </div>
        </div>
      </div>

      {/* 3. Subject-wise Chapter Progress Breakdown */}
      <div className="space-y-4">
        <h3 className="font-display font-bold text-xs uppercase tracking-wider text-brand-navy border-b border-brand-navy/10 pb-1.5">
          Syllabus Subject Breakdown
        </h3>

        {subjects.length === 0 ? (
          <div className="text-center py-12 text-gray-400 italic text-xs bg-white rounded-xl border border-brand-navy/5">
            No subjects found. Add cabinet folders in the Study Library to begin tracking!
          </div>
        ) : (
          <div className="space-y-3">
            {subjects.map(subject => {
              // Find chapters in this subject
              const foldersInSubject = folders.filter(f => (f.subject || f.name) === subject);
              const folderIds = foldersInSubject.map(f => f.id);
              const subjectChapters = chapters.filter(c => folderIds.includes(c.folderId));

              // Calculate subject stats
              let subjTopics = 0;
              let subjRead = 0;
              subjectChapters.forEach(ch => {
                if (ch.topics) {
                  ch.topics.forEach(t => {
                    subjTopics++;
                    if (topicProgress[t.id]?.read) subjRead++;
                  });
                }
              });

              const subjPercent = subjTopics > 0 ? Math.round((subjRead / subjTopics) * 100) : 0;
              const isSubjExpanded = expandedSubject === subject;

              return (
                <div key={subject} className="bg-white rounded-xl border border-brand-navy/10 overflow-hidden shadow-2xs">
                  {/* Subject Accordion Header */}
                  <button 
                    onClick={() => setExpandedSubject(isSubjExpanded ? null : subject)}
                    className="w-full flex items-center justify-between p-4 bg-brand-cream hover:bg-brand-cream/60 transition duration-150"
                  >
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-brand-gold animate-pulse shrink-0" />
                        <h4 className="font-display font-bold text-sm text-brand-navy uppercase tracking-wide">{subject}</h4>
                      </div>
                      <div className="flex items-center gap-3 max-w-md">
                        <div className="flex-1 bg-brand-navy/10 rounded-full h-1.5 overflow-hidden">
                          <div className="bg-brand-navy h-full transition-all duration-300" style={{ width: `${subjPercent}%` }} />
                        </div>
                        <span className="text-[10px] font-mono font-bold text-brand-navy">{subjPercent}%</span>
                        <span className="text-[10px] text-brand-slate font-serif italic">({subjRead}/{subjTopics} topics)</span>
                      </div>
                    </div>
                    <div>
                      {isSubjExpanded ? <ChevronDown className="w-5 h-5 text-brand-navy" /> : <ChevronRight className="w-5 h-5 text-brand-navy" />}
                    </div>
                  </button>

                  {/* Subject Accordion Content (Chapters list) */}
                  {isSubjExpanded && (
                    <div className="p-4 border-t border-brand-navy/5 bg-white space-y-3.5">
                      {subjectChapters.length === 0 ? (
                        <p className="text-xs text-gray-400 italic py-2">No chapters imported under this subject yet.</p>
                      ) : (
                        subjectChapters.map(ch => {
                          let chTopics = ch.topics?.length || 0;
                          let chRead = ch.topics?.filter(t => topicProgress[t.id]?.read).length || 0;
                          const chPercent = chTopics > 0 ? Math.round((chRead / chTopics) * 100) : 0;
                          const isChExpanded = expandedChapter === ch.id;

                          return (
                            <div key={ch.id} className="border border-brand-navy/5 rounded-lg overflow-hidden bg-white">
                              {/* Chapter Accordion Header */}
                              <button 
                                onClick={() => setExpandedChapter(isChExpanded ? null : ch.id)}
                                className="w-full flex items-center justify-between p-3 bg-brand-navy/[0.02] hover:bg-brand-navy/[0.04] transition duration-150"
                              >
                                <div className="flex-1 space-y-1.5">
                                  <div className="flex items-center gap-2">
                                    <FileText className="w-4 h-4 text-brand-gold" />
                                    <span className="text-xs font-bold text-brand-navy">{ch.title}</span>
                                    <span className="text-[9px] font-mono bg-brand-navy/5 text-brand-navy px-1.5 py-0.5 rounded">
                                      {chTopics} Topics
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-3 max-w-sm">
                                    <div className="flex-1 bg-brand-navy/10 rounded-full h-1 overflow-hidden">
                                      <div className="bg-brand-gold h-full transition-all duration-300" style={{ width: `${chPercent}%` }} />
                                    </div>
                                    <span className="text-[9px] font-mono font-bold text-brand-navy">{chPercent}%</span>
                                  </div>
                                </div>
                                <div>
                                  {isChExpanded ? <ChevronDown className="w-4 h-4 text-brand-navy" /> : <ChevronRight className="w-4 h-4 text-brand-navy" />}
                                </div>
                              </button>

                              {/* Chapter Accordion Content (Topics details list) */}
                              {isChExpanded && (
                                <div className="border-t border-brand-navy/5 divide-y divide-brand-navy/5 bg-white">
                                  {ch.topics && ch.topics.length > 0 ? (
                                    ch.topics.map(t => {
                                      const prog = topicProgress[t.id] || {
                                        read: false,
                                        slides: false,
                                        concepts: false,
                                        flashcards: false,
                                        pyq: {},
                                        notes: ""
                                      };

                                      const hasPyqs = prog.pyq && Object.keys(prog.pyq).length > 0;
                                      const hasNotes = prog.notes && prog.notes.trim();

                                      return (
                                        <div key={t.id} className="p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 hover:bg-brand-cream/30 transition duration-150">
                                          <div className="space-y-0.5 flex-1 pr-4">
                                            <p className="text-xs font-bold text-brand-navy">{t.title}</p>
                                            {hasNotes && (
                                              <p className="text-[10px] text-brand-slate font-serif italic max-w-md line-clamp-1 border-l-2 border-brand-gold/30 pl-2 mt-0.5">
                                                Notes: "{prog.notes}"
                                              </p>
                                            )}
                                          </div>

                                          {/* Learning Modules Checkboxes */}
                                          <div className="flex flex-wrap gap-2 shrink-0">
                                            {/* Read Indicator */}
                                            <button 
                                              onClick={() => handleToggle(t.id, 'read')}
                                              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-[10px] font-bold uppercase transition duration-150 ${
                                                prog.read 
                                                  ? 'bg-[var(--ok)]/10 text-[var(--ok)] border-[var(--ok)]/25' 
                                                  : 'bg-white text-gray-400 border-gray-200 hover:border-brand-navy/30'
                                              }`}
                                              title={prog.read ? "Completed Reading" : "Mark as Read"}
                                            >
                                              <BookOpen className="w-3 h-3 shrink-0" />
                                              <span>Read</span>
                                              {prog.read && <Check className="w-2.5 h-2.5 ml-0.5" />}
                                            </button>

                                            {/* Slides Indicator */}
                                            <button 
                                              onClick={() => handleToggle(t.id, 'slides')}
                                              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-[10px] font-bold uppercase transition duration-150 ${
                                                prog.slides 
                                                  ? 'bg-amber-500/10 text-amber-700 border-amber-500/25' 
                                                  : 'bg-white text-gray-400 border-gray-200 hover:border-brand-navy/30'
                                              }`}
                                              title={prog.slides ? "Slides Reviewed" : "Mark Slides Completed"}
                                            >
                                              <Layers className="w-3 h-3 shrink-0" />
                                              <span>Slides</span>
                                              {prog.slides && <Check className="w-2.5 h-2.5 ml-0.5" />}
                                            </button>

                                            {/* Concepts Indicator */}
                                            <button 
                                              onClick={() => handleToggle(t.id, 'concepts')}
                                              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-[10px] font-bold uppercase transition duration-150 ${
                                                prog.concepts 
                                                  ? 'bg-brand-navy/10 text-brand-navy border-brand-navy/25' 
                                                  : 'bg-white text-gray-400 border-gray-200 hover:border-brand-navy/30'
                                              }`}
                                              title={prog.concepts ? "Concepts Mastered" : "Mark Concepts Completed"}
                                            >
                                              <Lightbulb className="w-3 h-3 shrink-0" />
                                              <span>Concepts</span>
                                              {prog.concepts && <Check className="w-2.5 h-2.5 ml-0.5" />}
                                            </button>

                                            {/* Flashcards Indicator */}
                                            <button 
                                              onClick={() => handleToggle(t.id, 'flashcards')}
                                              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-[10px] font-bold uppercase transition duration-150 ${
                                                prog.flashcards 
                                                  ? 'bg-brand-teal/10 text-brand-teal border-brand-teal/25' 
                                                  : 'bg-white text-gray-400 border-gray-200 hover:border-brand-navy/30'
                                              }`}
                                              title={prog.flashcards ? "Leitner Spaced Recalled" : "Mark Flashcards Completed"}
                                            >
                                              <BrainCircuit className="w-3 h-3 shrink-0" />
                                              <span>Recall</span>
                                              {prog.flashcards && <Check className="w-2.5 h-2.5 ml-0.5" />}
                                            </button>

                                            {/* PYQ Indicator (view only) */}
                                            <div 
                                              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-[10px] font-bold uppercase select-none ${
                                                hasPyqs 
                                                  ? 'bg-purple-600/10 text-purple-700 border-purple-500/25 font-semibold' 
                                                  : 'bg-gray-50 text-gray-300 border-gray-100'
                                              }`}
                                              title={hasPyqs ? "Solved PYQs" : "PYQs not yet solved"}
                                            >
                                              <HelpCircle className="w-3 h-3 shrink-0" />
                                              <span>PYQs</span>
                                            </div>

                                            {/* Notes Indicator (view only) */}
                                            <div 
                                              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-[10px] font-bold uppercase select-none ${
                                                hasNotes 
                                                  ? 'bg-blue-600/10 text-blue-700 border-blue-500/25 font-semibold' 
                                                  : 'bg-gray-50 text-gray-300 border-gray-100'
                                              }`}
                                              title={hasNotes ? "Notes Captured" : "No notes taken yet"}
                                            >
                                              <StickyNote className="w-3 h-3 shrink-0" />
                                              <span>Notes</span>
                                            </div>
                                          </div>
                                        </div>
                                      );
                                    })
                                  ) : (
                                    <p className="p-4 text-xs text-gray-400 italic">No topics inside this chapter.</p>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
