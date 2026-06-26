import React, { useState } from 'react';
import { 
  FileJson, CheckCircle2, AlertCircle, HelpCircle, ArrowRight,
  BookOpen, Layers, GraduationCap, Sparkles, Database, Plus, Check
} from 'lucide-react';
import { UPSCState, Chapter, Topic, MCQItem, PYQQuestion, Flashcard } from '../types';

interface ImportCenterTabProps {
  state: UPSCState;
  onUpdateState: (updated: UPSCState) => void;
}

export default function ImportCenterTab({ state, onUpdateState }: ImportCenterTabProps) {
  const [activeSubTab, setActiveSubTab] = useState<'chapter' | 'mcq_leitner' | 'pyq'>('chapter');
  
  // Status states
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Common input states
  const [pastedJson, setPastedJson] = useState('');
  
  // Chapter Import states
  const [targetFolderId, setTargetFolderId] = useState(state.folders?.[0]?.id || '');

  // MCQ/Leitner Import states
  const [selectedChapterId, setSelectedChapterId] = useState(state.chapters?.[0]?.id || '');
  const [selectedTopicId, setSelectedTopicId] = useState(state.chapters?.[0]?.topics?.[0]?.id || '');

  // Sync topics when selected chapter changes
  const handleChapterChange = (chId: string) => {
    setSelectedChapterId(chId);
    const ch = state.chapters.find(c => c.id === chId);
    if (ch && ch.topics && ch.topics.length > 0) {
      setSelectedTopicId(ch.topics[0].id);
    } else {
      setSelectedTopicId('');
    }
  };

  const handleImportChapter = () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    if (!pastedJson.trim()) {
      setErrorMsg("Please paste JSON content first.");
      return;
    }

    try {
      const parsed = JSON.parse(pastedJson);
      const chapterTitle = parsed.title || parsed.metadata?.chapter_title || parsed.chapter_title || "Untitled Chapter";
      const chapterDesc = parsed.description || parsed.chapter_intro || "Imported Syllabus Chapter.";
      const chapterSource = parsed.source || parsed.metadata?.book || "Imported Resource";
      const chapterIntro = parsed.chapter_intro || parsed.description || "";
      const chapterBackground = parsed.chapter_background || "";
      const importedTopics = parsed.topics || parsed.sections;

      const targetFolder = state.folders.find(f => f.id === targetFolderId) || state.folders[0];
      if (!targetFolder) throw new Error('No cabinet folder selected.');

      if (!importedTopics || !Array.isArray(importedTopics) || importedTopics.length === 0) {
        throw new Error("Missing or empty 'topics' array inside the uploaded JSON.");
      }

      const cleanTopics: Topic[] = importedTopics.map((s: any, idx: number) => {
        const bodyText = s.full_text || s.raw_text || s.body || "";
        const topicTitle = s.title || `Topic ${idx + 1}`;
        
        return {
          id: s.id || `t-imp-${idx}-${Date.now()}`,
          title: String(topicTitle),
          full_text: String(bodyText),
          order: typeof s.order === 'number' ? s.order : (idx + 1),
          key_concepts: Array.isArray(s.key_concepts) ? s.key_concepts : [],
          flashcards: Array.isArray(s.flashcards) ? s.flashcards : [],
          pyq_ids: Array.isArray(s.pyq_ids) ? s.pyq_ids : [],
          mains_questions: Array.isArray(s.mains_questions) ? s.mains_questions : [],
          socratic_questions: Array.isArray(s.socratic_questions) ? s.socratic_questions : [],
          feynman_prompts: Array.isArray(s.feynman_prompts) ? s.feynman_prompts : [],
          ca_angles: Array.isArray(s.ca_angles) ? s.ca_angles : [],
          lesson_slides: Array.isArray(s.lesson_slides) ? s.lesson_slides : [
            {
              slide_number: 1,
              title: String(topicTitle),
              type: "Overview",
              content: String(bodyText).substring(0, 200) + "..."
            }
          ]
        };
      });

      const newCh: Chapter = {
        id: `ch-imp-${Date.now()}`,
        folderId: targetFolder.id,
        title: String(chapterTitle),
        description: String(chapterDesc),
        subject: targetFolder.subject,
        source: String(chapterSource),
        metadata: {
          book: String(chapterSource),
          chapter_number: parsed.metadata?.chapter_number || (state.chapters.length + 1),
          chapter_title: String(chapterTitle),
          part: parsed.metadata?.part || '',
          articles: parsed.metadata?.articles || '',
          subject: targetFolder.name
        },
        topics: cleanTopics,
        chapter_intro: String(chapterIntro),
        chapter_background: String(chapterBackground),
        important_articles: Array.isArray(parsed.important_articles) ? parsed.important_articles : [],
        createdAt: new Date().toISOString()
      };

      const updatedChapters = [...state.chapters, newCh];
      onUpdateState({
        ...state,
        chapters: updatedChapters
      });

      setSuccessMsg(`Successfully imported Chapter "${chapterTitle}" under subject cabinet "${targetFolder.name}"!`);
      setPastedJson('');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to parse Chapter JSON.');
    }
  };

  const handleImportMCQLeitner = () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    if (!pastedJson.trim()) {
      setErrorMsg("Please paste JSON content first.");
      return;
    }

    try {
      const parsed = JSON.parse(pastedJson);
      
      // Determine if it is Leitner Flashcards or Chapter MCQs
      const isLeitner = Array.isArray(parsed) && parsed.length > 0 && ('front' in parsed[0] || 'question' in parsed[0] && !('options' in parsed[0]));
      const isMCQList = Array.isArray(parsed) && parsed.length > 0 && 'options' in parsed[0];

      if (isLeitner) {
        // Import Leitner Spaced revision cards
        const cleanCards: Flashcard[] = parsed.map((item: any, idx: number) => {
          return {
            id: `fc-imp-${idx}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            chapterId: item.chapterId || selectedChapterId || undefined,
            topicId: item.topicId || selectedTopicId || undefined,
            front: String(item.front || item.question),
            back: String(item.back || item.answer || item.explanation),
            subject: String(item.subject || state.chapters.find(c => c.id === selectedChapterId)?.subject || 'Polity'),
            box: 1, // Start in Box 1 as standard
            nextReviewDate: new Date().toISOString(), // due immediately, but subject to completed planner constraint
            streak: 0,
            createdAt: new Date().toISOString()
          };
        });

        const updatedCards = [...(state.flashcards || []), ...cleanCards];
        onUpdateState({
          ...state,
          flashcards: updatedCards
        });

        setSuccessMsg(`Successfully imported ${cleanCards.length} Leitner revision cards into your revision deck!`);
        setPastedJson('');
      } else if (isMCQList) {
        // Import custom MCQs to the selected Chapter / Topic
        if (!selectedChapterId || !selectedTopicId) {
          throw new Error("Please select the target Chapter and Topic to populate MCQs.");
        }

        const cleanMCQs: MCQItem[] = parsed.map((item: any, idx: number) => {
          return {
            id: item.id || `mcq-imp-${idx}-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            question: String(item.question),
            options: Array.isArray(item.options) ? item.options.map(String) : [],
            answer: String(item.answer || 'A').toUpperCase(),
            explanation: String(item.explanation || item.answer_explanation || ''),
            source: 'import'
          };
        });

        // Update target topic's mcqs
        const updatedChapters = state.chapters.map(ch => {
          if (ch.id === selectedChapterId) {
            return {
              ...ch,
              topics: ch.topics.map(t => {
                if (t.id === selectedTopicId) {
                  return {
                    ...t,
                    mcqs: [...(t.mcqs || []), ...cleanMCQs]
                  };
                }
                return t;
              })
            };
          }
          return ch;
        });

        onUpdateState({
          ...state,
          chapters: updatedChapters
        });

        setSuccessMsg(`Successfully populated ${cleanMCQs.length} MCQs inside chapter topic!`);
        setPastedJson('');
      } else {
        throw new Error("Unrecognized format. Must be an array of flashcards (front/back) or MCQs (question/options/answer).");
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to parse JSON. Please verify structure.');
    }
  };

  const handleImportPYQ = () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    if (!pastedJson.trim()) {
      setErrorMsg("Please paste JSON content first.");
      return;
    }

    try {
      const parsed = JSON.parse(pastedJson);
      
      // Structure expected:
      // {
      //   "subject": "GS-II Polity" / folderName,
      //   "chapterTitle": "President",
      //   "pyqs": [ ... ]
      // }
      // Or simply a list of PYQ items, in which case we attach to currently selected chapter
      const pyqList: any[] = Array.isArray(parsed) ? parsed : (parsed.pyqs || []);
      const chTitle = parsed.chapterTitle || parsed.chapter || '';
      
      if (!Array.isArray(pyqList) || pyqList.length === 0) {
        throw new Error("No PYQ questions array found in JSON.");
      }

      // Find matching chapter either from JSON or select dropdown
      let targetCh = state.chapters.find(c => c.title.toLowerCase().includes(chTitle.toLowerCase()));
      if (!targetCh && selectedChapterId) {
        targetCh = state.chapters.find(c => c.id === selectedChapterId);
      }

      if (!targetCh) {
        throw new Error("Could not automatically resolve matching Chapter. Please select a Chapter from the dropdown list below first.");
      }

      const cleanPYQs: PYQQuestion[] = pyqList.map((item: any, idx: number) => {
        return {
          id: item.id || `pyq-imp-${idx}-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          year: item.year || 'N/A',
          difficulty: item.difficulty || 'medium',
          question: String(item.question),
          options: Array.isArray(item.options) ? item.options.map(String) : [],
          answer: String(item.answer || 'A').toUpperCase(),
          answer_explanation: String(item.explanation || item.answer_explanation || ''),
          topic_tags: Array.isArray(item.topic_tags) ? item.topic_tags : []
        };
      });

      // Append to the first topic or match topic if provided in item
      const updatedChapters = state.chapters.map(ch => {
        if (ch.id === targetCh!.id) {
          return {
            ...ch,
            topics: ch.topics.map((t, tIdx) => {
              if (tIdx === 0) { // Default to first topic for direct injection
                return {
                  ...t,
                  pyqs: [...(t.pyqs || []), ...cleanPYQs]
                };
              }
              return t;
            })
          };
        }
        return ch;
      });

      onUpdateState({
        ...state,
        chapters: updatedChapters
      });

      setSuccessMsg(`Successfully imported ${cleanPYQs.length} Previous Year Questions (PYQs) into Chapter "${targetCh.title}"!`);
      setPastedJson('');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to parse PYQ JSON.');
    }
  };

  return (
    <div className="space-y-6 text-left">
      <div className="flex justify-between items-center border-b border-[var(--bd)] pb-4">
        <div className="flex items-center gap-2">
          <FileJson className="w-6 h-6 text-[var(--gd)]" />
          <div>
            <h1 className="font-serif font-bold text-2xl text-[var(--t1)]">Independent Import Center</h1>
            <p className="text-[10px] uppercase tracking-widest text-[var(--t3)] font-mono font-bold">Populate study cabinets, revision cards, and solved questions instantly</p>
          </div>
        </div>
      </div>

      {/* Main Mode Sub Tabs */}
      <div className="flex border border-[var(--bd)] rounded-xl overflow-hidden p-0.5 bg-[var(--ra)] max-w-lg">
        {[
          { id: 'chapter', label: '1. Chapter JSON', icon: BookOpen },
          { id: 'mcq_leitner', label: '2. MCQ + Leitner JSON', icon: Sparkles },
          { id: 'pyq', label: '3. PYQ JSON', icon: Database }
        ].map((sub) => {
          const Icon = sub.icon;
          const isActive = activeSubTab === sub.id;
          return (
            <button
              key={sub.id}
              onClick={() => {
                setActiveSubTab(sub.id as any);
                setErrorMsg(null);
                setSuccessMsg(null);
                setPastedJson('');
              }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-bold uppercase tracking-wider rounded-lg transition-all duration-200 cursor-pointer
                ${isActive 
                  ? 'bg-[var(--gd)] text-[var(--bg)] shadow-xs' 
                  : 'text-[var(--t2)] hover:text-[var(--t1)]'
                }`}
            >
              <Icon className="w-4 h-4" />
              <span>{sub.label.split(' ')[1]}</span>
            </button>
          );
        })}
      </div>

      {/* Notifications */}
      {errorMsg && (
        <div className="bg-red-50/10 border border-red-500/30 text-red-400 p-4 rounded-2xl flex items-start gap-3 animate-fade-in text-xs">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 p-4 rounded-2xl flex items-start gap-3 animate-fade-in text-xs">
          <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
          <span>{successMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Input Field */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-[var(--sur)] p-5 rounded-3xl border border-[var(--bd)] space-y-3">
            <h3 className="font-serif font-bold text-sm text-[var(--t1)]">Paste Raw JSON Code Block</h3>
            <textarea
              placeholder={`{\n  "title": "Parliament",\n  "topics": [\n    {\n      "title": "Loksabha Composition",\n      "full_text": "..."\n    }\n  ]\n}`}
              value={pastedJson}
              onChange={(e) => setPastedJson(e.target.value)}
              className="w-full h-80 bg-[var(--ra)] text-xs text-[var(--t1)] font-mono p-4 border border-[var(--bd)] rounded-2xl focus:outline-none focus:ring-1 focus:ring-[var(--gd)] overflow-y-auto"
            />
            <div className="flex justify-between items-center text-[10px] text-[var(--t3)] font-mono">
              <span>Lines: {pastedJson.split('\n').length}</span>
              <span>Bytes: {new Blob([pastedJson]).size}</span>
            </div>
          </div>
        </div>

        {/* Right Configuration Panel */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-[var(--sur)] p-5 rounded-3xl border border-[var(--bd)] space-y-4 text-left">
            <h3 className="font-serif font-bold text-base text-[var(--t1)] border-b border-[var(--bd)] pb-2">Target Mapping & Details</h3>

            {activeSubTab === 'chapter' && (
              <div className="space-y-4">
                <p className="text-xs text-[var(--t2)] leading-relaxed font-serif">
                  Imports full chapters complete with section texts, key concepts, lesson slides and active worksheets.
                </p>
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-mono font-bold tracking-wider text-[var(--t3)]">Target Cabinet Cabinet Folder</label>
                  <select
                    value={targetFolderId}
                    onChange={(e) => setTargetFolderId(e.target.value)}
                    className="w-full bg-[var(--ra)] text-xs text-[var(--t1)] p-2.5 rounded-xl border border-[var(--bd)] outline-none focus:ring-1 focus:ring-[var(--gd)]"
                  >
                    {state.folders.map(f => (
                      <option key={f.id} value={f.id}>{f.name} ({f.subject.toUpperCase()})</option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={handleImportChapter}
                  className="w-full bg-[var(--gd)] text-[var(--bg)] py-3 px-4 rounded-xl text-xs uppercase font-bold tracking-wider transition hover:opacity-90 flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  <span>Import Syllabus Chapter</span>
                </button>
              </div>
            )}

            {activeSubTab === 'mcq_leitner' && (
              <div className="space-y-4">
                <p className="text-xs text-[var(--t2)] leading-relaxed font-serif">
                  Add batch lists of high-yield Spaced-Repetition Leitner Flashcards or specific interactive MCQs.
                </p>

                <div className="space-y-3 p-3 bg-[var(--ra)]/40 border border-[var(--bd)]/60 rounded-xl">
                  <span className="text-[10px] uppercase font-bold text-[var(--gd)] font-mono block">If target is Chapter MCQs:</span>
                  <div className="space-y-1.5">
                    <label className="text-[9px] uppercase font-mono font-bold text-[var(--t3)]">Select Chapter</label>
                    <select
                      value={selectedChapterId}
                      onChange={(e) => handleChapterChange(e.target.value)}
                      className="w-full bg-[var(--sur)] text-xs text-[var(--t1)] p-2 rounded-lg border border-[var(--bd)] outline-none"
                    >
                      {state.chapters.map(c => (
                        <option key={c.id} value={c.id}>{c.title}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[9px] uppercase font-mono font-bold text-[var(--t3)]">Select Topic</label>
                    <select
                      value={selectedTopicId}
                      onChange={(e) => setSelectedTopicId(e.target.value)}
                      className="w-full bg-[var(--sur)] text-xs text-[var(--t1)] p-2 rounded-lg border border-[var(--bd)] outline-none"
                    >
                      {state.chapters.find(c => c.id === selectedChapterId)?.topics?.map(t => (
                        <option key={t.id} value={t.id}>{t.title}</option>
                      )) || <option>No Topics available</option>}
                    </select>
                  </div>
                </div>

                <button
                  onClick={handleImportMCQLeitner}
                  className="w-full bg-[var(--gd)] text-[var(--bg)] py-3 px-4 rounded-xl text-xs uppercase font-bold tracking-wider transition hover:opacity-90 flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  <span>Import Cards or MCQs</span>
                </button>
              </div>
            )}

            {activeSubTab === 'pyq' && (
              <div className="space-y-4">
                <p className="text-xs text-[var(--t2)] leading-relaxed font-serif">
                  Import Previous Year solved UPSC Questions. PYQs are parsed and made interactively solvable with in-depth solutions.
                </p>

                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-mono font-bold tracking-wider text-[var(--t3)]">Fallback Target Chapter</label>
                  <select
                    value={selectedChapterId}
                    onChange={(e) => setSelectedChapterId(e.target.value)}
                    className="w-full bg-[var(--ra)] text-xs text-[var(--t1)] p-2.5 rounded-xl border border-[var(--bd)] outline-none focus:ring-1 focus:ring-[var(--gd)]"
                  >
                    {state.chapters.map(c => (
                      <option key={c.id} value={c.id}>{c.title}</option>
                    ))}
                  </select>
                  <span className="text-[9px] text-[var(--t3)] italic block">
                    Note: If JSON specifies a matching chapter name, it will automatically override this selector.
                  </span>
                </div>

                <button
                  onClick={handleImportPYQ}
                  className="w-full bg-[var(--gd)] text-[var(--bg)] py-3 px-4 rounded-xl text-xs uppercase font-bold tracking-wider transition hover:opacity-90 flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  <span>Import PYQ Questions</span>
                </button>
              </div>
            )}
          </div>

          {/* Guidelines info card */}
          <div className="bg-[var(--ra)] p-4 border border-[var(--bd)] rounded-2xl text-[11px] text-[var(--t2)] leading-relaxed space-y-1.5 text-left">
            <span className="font-bold text-[var(--gd)] font-mono text-[10px] uppercase block">Expected JSON Formats</span>
            {activeSubTab === 'chapter' && (
              <pre className="text-[9px] font-mono text-[var(--t3)] bg-[var(--sur)] p-2 rounded-lg overflow-x-auto whitespace-pre">
{`{
  "title": "Parliament",
  "topics": [
    {
      "id": "t_par_1",
      "title": "Loksabha",
      "full_text": "Parliament consists of..."
    }
  ]
}`}
              </pre>
            )}
            {activeSubTab === 'mcq_leitner' && (
              <pre className="text-[9px] font-mono text-[var(--t3)] bg-[var(--sur)] p-2 rounded-lg overflow-x-auto whitespace-pre">
{`[
  {
    "question": "Which body executes laws?",
    "options": ["Cabinet", "Lok Sabha", "RS"],
    "answer": "A",
    "explanation": "Cabinet is executive body."
  }
]`}
              </pre>
            )}
            {activeSubTab === 'pyq' && (
              <pre className="text-[9px] font-mono text-[var(--t3)] bg-[var(--sur)] p-2 rounded-lg overflow-x-auto whitespace-pre">
{`{
  "chapterTitle": "President",
  "pyqs": [
    {
      "question": "Regarding ordinances...",
      "options": ["Option A", "Option B"],
      "answer": "A",
      "answer_explanation": "Detailed guide..."
    }
  ]
}`}
              </pre>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
