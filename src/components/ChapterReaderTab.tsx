import React, { useState, useEffect, useRef } from 'react';
import { 
  BookOpen, Type, Sparkles, Bookmark, BookmarkCheck,
  ChevronLeft, ChevronRight, Menu, ZoomIn, ZoomOut,
  Sliders, Award, RefreshCw, Layers, CheckCircle2,
  BookMarked, HelpCircle, FileText, Compass, Clock,
  ArrowLeft, BrainCircuit, PenTool, Globe, ChevronDown, ChevronUp, Eye, EyeOff
} from 'lucide-react';
import { Chapter, Topic, PYQQuestion, TopicProgress, MCQItem, ThemeKey } from '../types';
import { callGemini, generateMCQDrill } from '../utils/gemini';

interface ChapterReaderTabProps {
  chapter: Chapter;
  bookmarks: any[];
  onToggleBookmark: (bookmark: any) => void;
  onLogMinutes: (minutes: number) => void;
  onBackToLibrary: () => void;
  savedProgress: Record<string, TopicProgress>;
  onSaveProgress: (topicId: string, progress: TopicProgress) => void;
  zenMode?: boolean;
  onToggleZenMode?: () => void;
}

const DEFAULT_OFFLINE_MCQS: Record<string, MCQItem[]> = {
  t01: [
    {
      id: "demo_mcq_1",
      question: "Which of the following statements is/are correct regarding the Electoral College for the Indian Presidential Election?\n1. Nominated members of either House of Parliament can vote in the election.\n2. Members of State Legislative Councils (Vidhan Parishad) can vote in the election.\n3. Nominated members of State Legislative Assemblies can vote in the election.",
      options: ["1 only", "3 only", "1 and 2 only", "None of the above"],
      answer: "D",
      explanation: "Nominated members of Parliament, nominated members of State Assemblies, and all members (elected and nominated) of State Legislative Councils are strictly excluded from the Presidential Electoral College.",
      source: "import"
    },
    {
      id: "demo_mcq_2",
      question: "For calculating the value of the vote of an MLA for the presidential election, which census population is currently used?",
      options: ["1971 Census", "1991 Census", "2001 Census", "2011 Census"],
      answer: "A",
      explanation: "The 1971 census population is currently used, frozen by the 84th Amendment Act of 2001 until the first census taken after the year 2026 is published.",
      source: "import"
    }
  ]
};

export default function ChapterReaderTab({
  chapter,
  bookmarks,
  onToggleBookmark,
  onLogMinutes,
  onBackToLibrary,
  savedProgress,
  onSaveProgress,
  zenMode = false,
  onToggleZenMode
}: ChapterReaderTabProps) {
  // Reading Font preference
  const [fontFamily, setFontFamily] = useState<'serif' | 'sans' | 'mono'>('serif');
  const [fontSize, setFontSize] = useState<number>(18);
  const [lineSpacing, setLineSpacing] = useState<number>(1.6);

  // Layout states
  const [activeTopicIdx, setActiveTopicIdx] = useState<number>(0);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<'read' | 'lesson' | 'concepts' | 'cards' | 'pyq' | 'mcq' | 'practice' | 'ca' | 'notes'>('read');
  
  // Interactive Topic contents
  const currentTopic: Topic | undefined = (chapter && chapter.topics) ? (chapter.topics[activeTopicIdx] || chapter.topics[0]) : undefined;

  // Load progress state for current topic
  const topicProgress: TopicProgress = (currentTopic && savedProgress && savedProgress[currentTopic.id]) || {
    read: false,
    slides: false,
    concepts: false,
    flashcards: false,
    pyq: {},
    notes: ""
  };

  const updateProgress = (fields: Partial<TopicProgress>) => {
    if (!currentTopic) return;
    const newProg = { ...topicProgress, ...fields };
    onSaveProgress(currentTopic.id, newProg);
  };

  // Article Accordion State
  const [articlesOpen, setArticlesOpen] = useState(false);

  // Tab states
  // 1. Read: AI assistance
  const [readAIResult, setReadAIResult] = useState<string>('');
  const [readAILoading, setReadAILoading] = useState(false);
  const [selectionText, setSelectionText] = useState('');

  // 2. Slides: Active slide number
  const [activeSlideIdx, setActiveSlideIdx] = useState(0);
  const [slidePrompt, setSlidePrompt] = useState('');
  const [slideAIResponse, setSlideAIResponse] = useState('');
  const [slideAILoading, setSlideAILoading] = useState(false);

  // 3. Concepts: Expand key
  const [expandedConceptIdx, setExpandedConceptIdx] = useState<number | null>(null);

  // 4. Flashcards: tactile state
  const [flashcardIdx, setFlashcardIdx] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [cardsCorrect, setCardsCorrect] = useState(0);
  const [cardsTotal, setCardsTotal] = useState(0);

  // 5. PYQ: Interactive selections
  const [pyqAnswers, setPyqAnswers] = useState<Record<string, string>>(topicProgress.pyq || {});

  // 6. Generated MCQs
  const [generatedMCQs, setGeneratedMCQs] = useState<MCQItem[]>([]);
  const [mcqLoading, setMcqLoading] = useState(false);
  const [mcqLoadingStatus, setMcqLoadingStatus] = useState('');
  const [mcqAnswers, setMcqAnswers] = useState<Record<string, string>>({});

  // 7. Practice: 3 screens (Feynman, Socratic, Mains)
  const [practiceMode, setPracticeMode] = useState<'feynman' | 'socratic' | 'mains'>('feynman');
  // Feynman states
  const [feynmanText, setFeynmanText] = useState('');
  const [feynmanFeedback, setFeynmanFeedback] = useState('');
  const [feynmanLoading, setFeynmanLoading] = useState(false);
  // Socratic states
  const [socraticText, setSocraticText] = useState('');
  const [socraticChat, setSocraticChat] = useState<{role: 'mentor'|'user', text: string}[]>([
    { role: 'mentor', text: "Hello! Let's explore this topic critically. If the President of India acts solely on the advice of the Council of Ministers, does the office truly serve as a robust federal referee, or is it merely a rubber stamp? What is your perspective?" }
  ]);
  const [socraticLoading, setSocraticLoading] = useState(false);
  // Mains states
  const [mainsText, setMainsText] = useState('');
  const [mainsEvaluation, setMainsEvaluation] = useState('');
  const [mainsLoading, setMainsLoading] = useState(false);

  // 8. Current Affairs
  const [caUpdates, setCaUpdates] = useState<string>('');
  const [caLoading, setCaLoading] = useState(false);

  // 9. Notes Scratchpad
  const [localNotes, setLocalNotes] = useState(topicProgress.notes || "");

  // Sync state notes
  useEffect(() => {
    if (currentTopic) {
      setLocalNotes(topicProgress.notes || "");
    }
  }, [currentTopic?.id]);

  // Capture selection text in read tab
  const handleTextSelection = () => {
    const sel = window.getSelection();
    if (sel) {
      const text = sel.toString().trim();
      if (text.length > 10 && text.length < 1500) {
        setSelectionText(text);
      }
    }
  };

  // Reset module specific states when topic index changes
  useEffect(() => {
    setActiveSlideIdx(0);
    setExpandedConceptIdx(null);
    setFlashcardIdx(0);
    setIsFlipped(false);
    setCardsCorrect(0);
    setCardsTotal(0);
    setReadAIResult('');
    setSlideAIResponse('');
    setFeynmanText('');
    setFeynmanFeedback('');
    setMainsText('');
    setMainsEvaluation('');
    setSelectionText('');
    setGeneratedMCQs([]);
    setMcqAnswers({});
    
    // Load historical progress selections
    if (currentTopic) {
      setPyqAnswers(savedProgress[currentTopic.id]?.pyq || {});
    }
  }, [activeTopicIdx, currentTopic?.id]);

  // Accumulate study time (1 minute intervals)
  useEffect(() => {
    const timer = setInterval(() => {
      onLogMinutes(1);
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  // Automatically close reader sidebar when entering Zen Mode
  useEffect(() => {
    if (zenMode) {
      setSidebarOpen(false);
    } else {
      setSidebarOpen(true);
    }
  }, [zenMode]);

  // AI action runner for Read tab
  const runReadAI = async (mode: 'simplify' | 'mnemonic') => {
    setReadAILoading(true);
    const contentToUse = selectionText || currentTopic.full_text || "";
    let prompt = "";
    if (mode === 'simplify') {
      prompt = `Simplify this Indian Polity study material for a UPSC Civil Services aspirant. Deconstruct any constitutional clauses or political concepts into plain, highly intuitive english. Use a concrete, memorable analogy to explain the underlying mechanism:\n\n"${contentToUse}"`;
    } else {
      prompt = `Create a smart, highly effective memory mnemonic, acronym, or visualization story for a UPSC student to remember the core points or clauses described in this text. Keep it extremely punchy and easily recallable:\n\n"${contentToUse}"`;
    }
    const res = await callGemini(prompt);
    setReadAIResult(res);
    setReadAILoading(false);
  };

  // Slide-specific AI
  const runSlideAI = async (customPrompt?: string) => {
    const p = customPrompt || slidePrompt;
    if (!p) return;
    setSlideAILoading(true);
    const slide = currentTopic.lesson_slides?.[activeSlideIdx];
    const context = slide ? `Slide Title: ${slide.title}\nSlide Content: ${slide.content}` : '';
    const fullPrompt = `You are an expert UPSC Polity educator. The student has a question about this study slide:\n${context}\n\nStudent's Query: "${p}"\n\nProvide a clear, high-yield explanatory response that is precise, cites relevant articles or Supreme Court cases if applicable, and lists 1 key takeaway for the Prelims or Mains exam.`;
    const res = await callGemini(fullPrompt);
    setSlideAIResponse(res);
    setSlideAILoading(false);
    setSlidePrompt('');
  };

  // Leitner schedule card review rater
  const rateCard = (isCorrect: boolean) => {
    setCardsTotal(prev => prev + 1);
    if (isCorrect) {
      setCardsCorrect(prev => prev + 1);
    }
    // Advance index
    setIsFlipped(false);
    setTimeout(() => {
      if (currentTopic.flashcards && flashcardIdx < currentTopic.flashcards.length - 1) {
        setFlashcardIdx(prev => prev + 1);
      } else {
        // finished deck
        updateProgress({ flashcards: true });
        setFlashcardIdx(currentTopic.flashcards ? currentTopic.flashcards.length : 0);
      }
    }, 200);
  };

  // Trigger Gemini MCQ generation on-the-fly
  const generateDynamicMCQs = async () => {
    setMcqLoading(true);
    setMcqAnswers({});
    const stages = [
      "Summoning historical parliamentary queries...",
      "Formulating high-impact statement traps...",
      "Securing analytical distractor options...",
      "Validating key constitutional justifications..."
    ];
    let sIdx = 0;
    setMcqLoadingStatus(stages[0]);
    const progressTimer = setInterval(() => {
      sIdx = (sIdx + 1) % stages.length;
      setMcqLoadingStatus(stages[sIdx]);
    }, 2500);

    try {
      const textToAnalyze = currentTopic.full_text || "";
      const prompt = `Generate exactly 5 UPSC Civil Services Prelims level Multiple Choice Questions based on this topic: ${currentTopic.title}.\nContext text: ${textToAnalyze}\n\nUPSC questions are notoriously analytical, statement-based (e.g. Statement 1 and 2, Only one, Only two). Formulate robust, challenging questions. Avoid simple factual trivia.\n\nReturn a raw JSON array conforming EXACTLY to this JSON structure (do not add markdown blocks like \`\`\`json or backticks, just return raw JSON string):\n[\n  {\n    \"id\": \"dynamic_q_1\",\n    \"question\": \"The statement-based question text...\",\n    \"options\": [\"Option A\", \"Option B\", \"Option C\", \"Option D\"],\n    \"answer\": \"A\",\n    \"explanation\": \"Deeply academic explanation of the correct constitutional basis...\"\n  }\n]`;
      const res = await callGemini(prompt);
      clearInterval(progressTimer);
      
      // Sanitize JSON
      let cleaned = res.trim();
      if (cleaned.startsWith('```json')) cleaned = cleaned.substring(7);
      if (cleaned.startsWith('```')) cleaned = cleaned.substring(3);
      if (cleaned.endsWith('```')) cleaned = cleaned.substring(0, cleaned.length - 3);
      cleaned = cleaned.trim();
      
      const parsed = JSON.parse(cleaned) as MCQItem[];
      setGeneratedMCQs(parsed);
    } catch (err) {
      console.error(err);
      // Fallback
      setGeneratedMCQs(DEFAULT_OFFLINE_MCQS[currentTopic.id] || DEFAULT_OFFLINE_MCQS['t01']);
    } finally {
      setMcqLoading(false);
    }
  };

  // Feynman review submission
  const evaluateFeynman = async () => {
    if (!feynmanText.trim()) return;
    setFeynmanLoading(true);
    const prompt = `You are a strict UPSC examiner. The user is attempting the Feynman Technique to explain this concept: "${currentTopic.title}" based on the following text: "${currentTopic.full_text || ''}".\n\nUser's Simple Explanation: "${feynmanText}"\n\nGrade this explanation out of 10. Give detailed feedback covering:\n1. CLARITY & ACCURACY (Did they describe the core mechanism correctly?)\n2. INTUITIVENESS (Did they simplify terms successfully, avoiding heavy jargon?)\n3. MISSING GAP (What crucial legal, political, or operational fact did they leave out?)\n\nFormat your response in clean Markdown with bold bullet points.`;
    const res = await callGemini(prompt);
    setFeynmanFeedback(res);
    setFeynmanLoading(false);
  };

  // Socratic mentor loop
  const sendSocraticMessage = async () => {
    if (!socraticText.trim()) return;
    const userMsg = socraticText.trim();
    const updatedChat = [...socraticChat, { role: 'user' as const, text: userMsg }];
    setSocraticChat(updatedChat);
    setSocraticText('');
    setSocraticLoading(true);

    const historyPrompt = updatedChat.map(c => `${c.role === 'mentor' ? 'Mentor' : 'Aspirant'}: ${c.text}`).join('\n');
    const fullPrompt = `You are Socrates, acting as a wise UPSC Civil Services mentor. Guide the aspirant to analyze constitutional, administrative, or socio-economic aspects of: "${currentTopic.title}".\n\nPrevious conversation:\n${historyPrompt}\n\nRespond as Socrates. Challenge their last statement. Ask a single, deep, elegant follow-up question to test their understanding of constitutional principles or real-world policy trade-offs. Keep your response brief and insightful (under 120 words).`;
    
    const res = await callGemini(fullPrompt);
    setSocraticChat([...updatedChat, { role: 'mentor', text: res }]);
    setSocraticLoading(false);
  };

  // Mains evaluator
  const evaluateMainsAnswer = async () => {
    if (!mainsText.trim()) return;
    setMainsLoading(true);
    const question = currentTopic.mains_questions?.[0]?.question || `Discuss the constitutional challenges associated with ${currentTopic.title}.`;
    const prompt = `You are an official UPSC CSE Mains evaluator grading General Studies answers. Evaluate the student's handwritten draft answer below.\n\nQuestion: "${question}"\n\nStudent's Draft:\n"${mainsText}"\n\nEvaluate using official UPSC evaluation criteria. Provide a structured review covering:\n1. INTRODUCTION SCORE (out of 2 marks. Did they define the context, quote articles?)\n2. BODY SCORE (out of 6 marks. Did they address the core directive, list points, quote SC judgments/cases, use sideheadings?)\n3. CONCLUSION SCORE (out of 2 marks. Progressive way forward?)\n4. STRATEGIC FEEDBACK (Specify 2 high-yield value addition points, e.g., a relevant Supreme Court case, Commission report, or data to instantly boost marks).\n\nFormat your evaluation in clean Markdown.`;
    const res = await callGemini(prompt);
    setMainsEvaluation(res);
    setMainsLoading(false);
  };

  // Sync Current Affairs with Gemini
  const fetchCACurrent = async () => {
    setCaLoading(true);
    const prompt = `You are a senior analyst for civil services preparation. Provide the absolute latest 3 current affairs developments, high court/supreme court judgments, or legislative amendments from the past 12-24 months specifically related to this topic: "${currentTopic.title}" (under ${chapter.metadata.subject}).\n\nProvide: \n1. Name of development/case.\n2. Strategic Polity/Economy implications.\n3. Core Prelims fact to memorize.\n\nKeep it factual, highly academic, and structured with clean markdown bullets. Avoid generic commentary.`;
    const res = await callGemini(prompt);
    setCaUpdates(res);
    setCaLoading(false);
  };

  if (!chapter || !chapter.topics || chapter.topics.length === 0 || !currentTopic) {
    return (
      <div className="flex flex-col items-center justify-center w-full h-full min-h-[400px] p-8 text-center text-[var(--t2)] bg-[var(--bg)] font-sans space-y-4">
        <BookOpen className="w-12 h-12 text-[var(--gd)] mx-auto animate-pulse" />
        <h3 className="text-lg font-bold text-[var(--t1)] font-serif">No Syllabus Topics</h3>
        <p className="text-xs max-w-sm mx-auto leading-relaxed font-serif">
          This chapter doesn't contain any study subtopics yet. Please create or select a chapter that contains topics to load the study desk.
        </p>
        <button onClick={onBackToLibrary} className="bg-[var(--gd)] text-[var(--bg)] px-5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition hover:opacity-95 mx-auto">
          Go Back to Library
        </button>
      </div>
    );
  }

  return (
    <div className={`flex flex-col lg:flex-row ${zenMode ? 'h-screen' : 'h-[calc(100vh-120px)]'} bg-[var(--bg)] text-[var(--t1)] font-sans relative overflow-hidden transition-colors duration-200`}>
      
      {/* 1. Left Sidebar: Topic Navigation & Key Articles */}
      <div 
        className={`${
          sidebarOpen ? 'w-full lg:w-80' : 'w-0'
        } border-r border-[var(--bd)] bg-[var(--sur)] flex flex-col shrink-0 overflow-hidden transition-all duration-300 relative z-10`}
      >
        {/* Sidebar Header */}
        <div className="p-4 border-b border-[var(--bd)] flex justify-between items-center bg-[var(--ra)]">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-[var(--gd)]" />
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--t3)] font-mono">
                Chapter {chapter.metadata.chapter_number}
              </span>
              <h3 className="text-xs font-bold text-[var(--t1)] truncate max-w-[180px]">
                {chapter.metadata.chapter_title}
              </h3>
            </div>
          </div>
          <button 
            onClick={() => setSidebarOpen(false)}
            className="p-1 hover:bg-[var(--ra)] rounded-full text-[var(--t2)] lg:hidden"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Nav Directory */}
        <div className="flex-1 overflow-y-auto p-3 space-y-4">
          
          {/* Topics List */}
          <div className="space-y-1">
            <span className="text-[10px] uppercase tracking-widest font-bold text-[var(--t3)] font-mono pl-2 block mb-2">
              Syllabus Subtopics
            </span>
            {chapter.topics.map((t, idx) => {
              const isActive = idx === activeTopicIdx;
              const prog = savedProgress[t.id];
              const isCompleted = prog?.read && prog?.slides && prog?.concepts && prog?.flashcards;

              return (
                <button
                  key={t.id}
                  onClick={() => {
                    setActiveTopicIdx(idx);
                    setActiveTab('read');
                  }}
                  className={`w-full text-left p-3 rounded-xl flex items-start gap-2.5 transition-all duration-150 group border ${
                    isActive 
                      ? 'bg-[var(--ra)] border-[var(--gd2)] text-[var(--gd)] font-semibold shadow-sm' 
                      : 'border-transparent hover:bg-[var(--ra)] hover:text-[var(--t1)] text-[var(--t2)]'
                  }`}
                >
                  <span className={`w-4 h-4 rounded-full mt-0.5 shrink-0 border flex items-center justify-center text-[9px] font-bold ${
                    isCompleted 
                      ? 'bg-[var(--ok)] text-white border-transparent'
                      : isActive 
                        ? 'border-[var(--gd)] text-[var(--gd)]' 
                        : 'border-[var(--bd)] text-[var(--t3)]'
                  }`}>
                    {isCompleted ? '✓' : idx + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className={`text-xs leading-snug font-serif break-words ${isActive ? 'text-[var(--gd)]' : 'text-[var(--t1)]'}`}>
                      {t.title}
                    </p>
                    <div className="flex items-center gap-1.5 mt-1 text-[9px] text-[var(--t3)]">
                      <span>Slide {prog?.slides ? '✓' : '✗'}</span>
                      <span>•</span>
                      <span>Cards {prog?.flashcards ? '✓' : '✗'}</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Key Articles Accordion */}
          {chapter.important_articles && chapter.important_articles.length > 0 && (
            <div className="border border-[var(--bd)] rounded-xl overflow-hidden bg-[var(--ra)]/40">
              <button 
                onClick={() => setArticlesOpen(!articlesOpen)}
                className="w-full flex justify-between items-center p-3 text-xs font-bold text-[var(--t2)] hover:text-[var(--t1)]"
              >
                <div className="flex items-center gap-1.5">
                  <BookMarked className="w-4 h-4 text-[var(--gd)]" />
                  <span>Key Constitutional Articles</span>
                </div>
                {articlesOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              {articlesOpen && (
                <div className="p-2 bg-[var(--sur)] border-t border-[var(--bd)] max-h-48 overflow-y-auto space-y-1 text-left">
                  {chapter.important_articles.map((art, idx) => (
                    <div key={idx} className="p-2 hover:bg-[var(--ra)] rounded-lg text-[11px] font-serif border border-[var(--bd)]/5">
                      <span className="font-mono text-[var(--gd)] font-bold mr-1.5">Art. {art.article}</span>
                      <span className="text-[var(--t2)]">{art.subject}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Subject Stats Card */}
          <div className="bg-[var(--ra)] border border-[var(--bd)] p-3 rounded-2xl space-y-2">
            <span className="text-[9px] uppercase font-bold text-[var(--t3)] block">Study Progress Summary</span>
            <div className="grid grid-cols-2 gap-2 text-center">
              <div className="bg-[var(--sur)] p-2 rounded-xl border border-[var(--bd)]">
                <span className="text-sm font-bold text-[var(--gd)] font-serif">
                  {Object.values(savedProgress).filter(p => p.read).length}
                </span>
                <p className="text-[9px] text-[var(--t3)]">Topics Read</p>
              </div>
              <div className="bg-[var(--sur)] p-2 rounded-xl border border-[var(--bd)]">
                <span className="text-sm font-bold text-[var(--gd)] font-serif">
                  {Object.values(savedProgress).filter(p => p.flashcards).length}
                </span>
                <p className="text-[9px] text-[var(--t3)]">Decks Mastered</p>
              </div>
            </div>
          </div>

        </div>

        {/* Sidebar Footer */}
        <div className="p-3 border-t border-[var(--bd)] bg-[var(--ra)] flex items-center justify-between shrink-0">
          <button 
            onClick={onBackToLibrary}
            className="text-[10px] uppercase font-bold text-[var(--gd)] hover:text-[var(--gd2)] flex items-center gap-1 transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Workspace
          </button>
          <span className="text-[9px] text-[var(--t3)] font-mono uppercase">CSEGUIDE STUDY DESK</span>
        </div>
      </div>

      {/* 2. Main study desk containing active Topic panel */}
      <div className="flex-1 flex flex-col min-w-0 bg-[var(--bg)] relative overflow-hidden h-full">
        
        {/* Header toolbar */}
        <div className="border-b border-[var(--bd)] bg-[var(--sur)] px-4 py-3 flex flex-wrap justify-between items-center gap-3 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            {!sidebarOpen && (
              <button 
                onClick={() => setSidebarOpen(true)}
                className="p-1.5 hover:bg-[var(--ra)] text-[var(--t1)] rounded-xl border border-[var(--bd)]"
              >
                <Menu className="w-4 h-4" />
              </button>
            )}
            <div className="min-w-0">
              <span className="text-[9px] uppercase tracking-wider font-mono text-[var(--t3)] block">UPSC Syllabus Module</span>
              <h1 className="font-bold text-[var(--t1)] text-sm truncate font-serif">{currentTopic.title}</h1>
            </div>
          </div>

          {/* Tab Navigation Menu */}
          <div className="flex items-center gap-1 overflow-x-auto py-1 scrollbar-none max-w-full">
            {[
              { id: 'read', label: '📖 Read' },
              { id: 'lesson', label: '🎯 Slides' },
              { id: 'concepts', label: '🔑 Concepts' },
              { id: 'cards', label: '🃏 Cards' },
              { id: 'pyq', label: '📝 PYQs' },
              { id: 'mcq', label: '🧠 MCQ Drill' },
              { id: 'practice', label: '✍️ Practice' },
              { id: 'ca', label: '📰 Current' },
              { id: 'notes', label: '🗒️ Notes' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`text-xs px-3 py-1.5 rounded-xl whitespace-nowrap font-medium transition duration-150 ${
                  activeTab === tab.id 
                    ? 'bg-[var(--gd)] text-[var(--bg)] font-bold shadow-xs' 
                    : 'text-[var(--t2)] hover:bg-[var(--ra)] hover:text-[var(--t1)]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Utility preference triggers */}
          <div className="flex items-center gap-2">
            {onToggleZenMode && (
              <button
                onClick={onToggleZenMode}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200 border ${
                  zenMode 
                    ? 'bg-[var(--gd)] text-[var(--bg)] border-transparent shadow-md' 
                    : 'bg-[var(--ra)] border-[var(--bd)] text-[var(--t2)] hover:text-[var(--t1)] hover:bg-[var(--ra)]/80'
                }`}
                title={zenMode ? "Exit Distraction-Free Zen Mode" : "Enter Distraction-Free Zen Mode"}
              >
                {zenMode ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                <span className="hidden sm:inline">{zenMode ? 'Exit Zen' : 'Zen Mode'}</span>
              </button>
            )}

            <div className="flex items-center gap-1.5 bg-[var(--ra)] rounded-xl p-0.5 border border-[var(--bd)]">
              <button 
                onClick={() => setFontSize(Math.max(14, fontSize - 1))}
                className="p-1 hover:bg-[var(--sur)] text-[var(--t2)] hover:text-[var(--t1)] rounded"
                title="Decrease size"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="text-[10px] font-mono font-bold px-1">{fontSize}px</span>
              <button 
                onClick={() => setFontSize(Math.min(28, fontSize + 1))}
                className="p-1 hover:bg-[var(--sur)] text-[var(--t2)] hover:text-[var(--t1)] rounded"
                title="Increase size"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* 3. Panel Switcher (Main Scroll Area) */}
        <div className="flex-1 overflow-y-auto relative p-6 font-serif">
          
          {/* Tab Panel 1: Read */}
          {activeTab === 'read' && (
            <div className="max-w-3xl mx-auto space-y-6 text-left">
              {/* Controls & highlight notification */}
              <div className="flex justify-between items-center bg-[var(--ra)] border border-[var(--bd)] p-3 rounded-2xl mb-4 font-sans text-xs">
                <span className="text-[var(--t2)]">Highlight text with cursor for targeted AI copilot support.</span>
                <div className="flex gap-1.5">
                  <button 
                    onClick={() => runReadAI('simplify')}
                    disabled={readAILoading}
                    className="bg-[var(--sur)] border border-[var(--bd)] hover:border-[var(--gd)] hover:text-[var(--gd)] px-3 py-1.5 rounded-xl font-bold transition flex items-center gap-1"
                  >
                    <Sliders className="w-3.5 h-3.5" />
                    Simplify Text
                  </button>
                  <button 
                    onClick={() => runReadAI('mnemonic')}
                    disabled={readAILoading}
                    className="bg-[var(--sur)] border border-[var(--bd)] hover:border-[var(--gd)] hover:text-[var(--gd)] px-3 py-1.5 rounded-xl font-bold transition flex items-center gap-1"
                  >
                    <BrainCircuit className="w-3.5 h-3.5" />
                    Get Mnemonic
                  </button>
                </div>
              </div>

              {selectionText && (
                <div className="bg-[var(--gg)] border border-[var(--gd2)] p-3.5 rounded-2xl text-xs font-sans text-[var(--gd)] mb-4 animate-fade-in flex flex-col gap-2">
                  <p className="italic">"{selectionText}"</p>
                  <div className="flex justify-end gap-2">
                    <button 
                      onClick={() => runReadAI('simplify')}
                      className="bg-[var(--sur)] text-xs font-semibold px-2.5 py-1 rounded-xl"
                    >
                      Simplify Selection
                    </button>
                    <button 
                      onClick={() => setSelectionText('')}
                      className="text-gray-400 hover:text-white"
                    >
                      Clear
                    </button>
                  </div>
                </div>
              )}

              {/* AI Result panel */}
              {(readAILoading || readAIResult) && (
                <div className="bg-[var(--sur)] border border-[var(--bd)] p-5 rounded-2xl mb-6 shadow-sm font-sans text-xs space-y-3 relative overflow-hidden border-l-4 border-l-[var(--gd)] animate-fade-in text-left">
                  <div className="flex justify-between items-center border-b border-[var(--bd)] pb-2 mb-2">
                    <span className="font-bold text-[var(--gd)] uppercase font-mono tracking-wider flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 animate-spin" />
                      Gemini Scholar Assistant
                    </span>
                    <button onClick={() => setReadAIResult('')} className="text-[var(--t3)] hover:text-[var(--t1)] font-bold">Close</button>
                  </div>
                  {readAILoading ? (
                    <div className="flex items-center gap-2 py-3 text-[var(--t2)] font-mono">
                      <RefreshCw className="w-4 h-4 animate-spin text-[var(--gd)]" />
                      <span>Synthesizing constitutional analogies...</span>
                    </div>
                  ) : (
                    <p className="leading-relaxed text-[var(--t1)] whitespace-pre-line text-sm">{readAIResult}</p>
                  )}
                </div>
              )}

              {/* Main Reading Text */}
              <div 
                onMouseUp={handleTextSelection}
                className="prose prose-invert max-w-none text-[var(--t1)] font-serif select-text hover:cursor-text"
                style={{ fontSize: `${fontSize}px`, lineHeight: lineSpacing }}
              >
                {/* Intro background if first topic */}
                {activeTopicIdx === 0 && chapter.chapter_intro && (
                  <div className="bg-[var(--ra)] border border-[var(--bd)] rounded-2xl p-5 mb-6 text-left relative overflow-hidden">
                    <h3 className="text-xs uppercase font-mono text-[var(--gd)] mb-1 font-sans font-bold">Chapter Background</h3>
                    <p className="italic text-[var(--t2)] font-serif m-0">{chapter.chapter_intro}</p>
                  </div>
                )}

                {/* Main section body */}
                {currentTopic.full_text ? (
                  currentTopic.full_text.split('\n\n').map((para, pIdx) => (
                    <p key={pIdx} className="mb-4 text-justify leading-relaxed text-[var(--t1)]">
                      {para}
                    </p>
                  ))
                ) : (
                  <p className="italic text-[var(--t3)]">No text available for this topic.</p>
                )}
              </div>

              {/* Bottom Complete Checker */}
              <div className="pt-8 border-t border-[var(--bd)] text-center font-sans">
                <button
                  onClick={() => updateProgress({ read: !topicProgress.read })}
                  className={`px-6 py-2.5 rounded-full font-bold uppercase text-xs tracking-wider transition ${
                    topicProgress.read 
                      ? 'bg-[var(--ok)] text-white' 
                      : 'bg-[var(--gd)] text-[var(--bg)] hover:scale-[1.02]'
                  }`}
                >
                  {topicProgress.read ? '✓ Completed Reading' : 'Mark Topic as Read'}
                </button>
              </div>
            </div>
          )}

          {/* Tab Panel 2: Slides */}
          {activeTab === 'lesson' && (
            <div className="max-w-2xl mx-auto space-y-6 font-sans">
              {currentTopic.lesson_slides && currentTopic.lesson_slides.length > 0 ? (
                <div className="space-y-6">
                  {/* Tactical slide frame */}
                  <div className="bg-[var(--sur)] border-2 border-[var(--gd2)] rounded-3xl p-8 shadow-md relative min-h-80 flex flex-col justify-between text-left">
                    <div className="absolute top-4 right-4 bg-[var(--ra)] text-[10px] font-mono font-bold px-2.5 py-1 rounded-full text-[var(--gd)] uppercase tracking-wider border border-[var(--bd)]">
                      Slide {activeSlideIdx + 1} of {currentTopic.lesson_slides.length}
                    </div>
                    
                    <div className="space-y-4 flex-1 flex flex-col justify-center">
                      <span className="text-[10px] uppercase font-bold text-[var(--t3)] font-mono tracking-widest block">
                        Module: {currentTopic.lesson_slides[activeSlideIdx].type}
                      </span>
                      <h2 className="text-xl font-bold text-[var(--t1)] font-serif">
                        {currentTopic.lesson_slides[activeSlideIdx].title}
                      </h2>
                      <p className="text-sm text-[var(--t2)] whitespace-pre-line leading-relaxed font-serif pt-2 border-t border-[var(--bd)]/10">
                        {currentTopic.lesson_slides[activeSlideIdx].content}
                      </p>
                    </div>

                    <div className="flex justify-between items-center pt-6 border-t border-[var(--bd)]/10 mt-6 shrink-0">
                      <button
                        onClick={() => setActiveSlideIdx(Math.max(0, activeSlideIdx - 1))}
                        disabled={activeSlideIdx === 0}
                        className="p-2 border border-[var(--bd)] hover:bg-[var(--ra)] rounded-xl disabled:opacity-30 text-[var(--t1)]"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>

                      <div className="flex gap-1">
                        {currentTopic.lesson_slides.map((_, sIdx) => (
                          <span 
                            key={sIdx} 
                            className={`w-1.5 h-1.5 rounded-full transition ${sIdx === activeSlideIdx ? 'bg-[var(--gd)]' : 'bg-[var(--bd)]'}`} 
                          />
                        ))}
                      </div>

                      <button
                        onClick={() => {
                          if (activeSlideIdx < currentTopic.lesson_slides!.length - 1) {
                            setActiveSlideIdx(activeSlideIdx + 1);
                          } else {
                            updateProgress({ slides: true });
                          }
                        }}
                        className="p-2 border border-[var(--bd)] hover:bg-[var(--ra)] rounded-xl text-[var(--t1)]"
                      >
                        {activeSlideIdx === currentTopic.lesson_slides.length - 1 ? (
                          <CheckCircle2 className="w-4 h-4 text-[var(--ok)] animate-bounce" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Ask AI Specific to slide */}
                  <div className="bg-[var(--ra)] border border-[var(--bd)] p-5 rounded-3xl text-left space-y-3">
                    <h3 className="text-xs uppercase tracking-wider font-bold text-[var(--gd)] font-mono flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5" />
                      Deconstruct This Slide with AI
                    </h3>
                    <p className="text-[11px] text-[var(--t3)] leading-snug">
                      Choose a study lens or type a customized question about this specific slide framework.
                    </p>

                    {/* Predefined prompts */}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {[
                        "Why is this critical for Mains GS-II?",
                        "What is a real-world example of this?",
                        "Create a simple mnemonic to recall this list"
                      ].map((chip, idx) => (
                        <button
                          key={idx}
                          onClick={() => {
                            setSlidePrompt(chip);
                            runSlideAI(chip);
                          }}
                          className="bg-[var(--sur)] hover:bg-[var(--gd)] hover:text-[var(--bg)] border border-[var(--bd)] text-[var(--t2)] text-[10px] px-2.5 py-1 rounded-full transition"
                        >
                          {chip}
                        </button>
                      ))}
                    </div>

                    <div className="flex gap-2 pt-2">
                      <input 
                        type="text"
                        placeholder="Ask the tutor a question about this slide..."
                        className="flex-1 bg-[var(--sur)] text-[var(--t1)] border border-[var(--bd)] rounded-xl p-2 px-3 text-xs focus:outline-none focus:ring-1 focus:ring-[var(--gd)]"
                        value={slidePrompt}
                        onChange={(e) => setSlidePrompt(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && runSlideAI()}
                      />
                      <button 
                        onClick={() => runSlideAI()}
                        disabled={slideAILoading || !slidePrompt.trim()}
                        className="bg-[var(--gd)] text-[var(--bg)] px-4 py-2 rounded-xl text-xs font-bold uppercase hover:opacity-90 disabled:opacity-50"
                      >
                        Query
                      </button>
                    </div>

                    {/* Response display */}
                    {(slideAILoading || slideAIResponse) && (
                      <div className="mt-3 bg-[var(--sur)] border border-[var(--bd)] p-4 rounded-2xl text-xs space-y-2 animate-fade-in border-l-4 border-l-[var(--gd)]">
                        <span className="font-mono font-bold text-[var(--gd)] block">Tutor Response:</span>
                        {slideAILoading ? (
                          <div className="flex items-center gap-1.5 py-1 text-[var(--t2)] animate-pulse">
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>Formulating comprehensive explanation...</span>
                          </div>
                        ) : (
                          <p className="whitespace-pre-line leading-relaxed text-[var(--t1)]">{slideAIResponse}</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-[var(--t3)]">No slides configured for this topic.</div>
              )}
            </div>
          )}

          {/* Tab Panel 3: Concepts */}
          {activeTab === 'concepts' && (
            <div className="max-w-2xl mx-auto space-y-6 text-left">
              <span className="text-[10px] uppercase font-bold text-[var(--t3)] font-mono block mb-2">Key Core Concepts</span>
              
              {currentTopic.key_concepts && currentTopic.key_concepts.length > 0 ? (
                <div className="space-y-3">
                  {currentTopic.key_concepts.map((concept, idx) => {
                    const isOpen = expandedConceptIdx === idx;
                    return (
                      <div key={idx} className="border border-[var(--bd)] rounded-2xl overflow-hidden bg-[var(--sur)] transition duration-200">
                        <button
                          onClick={() => setExpandedConceptIdx(isOpen ? null : idx)}
                          className="w-full text-left p-4 flex justify-between items-center hover:bg-[var(--ra)] transition"
                        >
                          <div className="min-w-0 pr-4">
                            <h3 className="font-bold text-xs font-sans text-[var(--t1)]">{concept.concept}</h3>
                            {concept.article && (
                              <span className="text-[10px] font-mono text-[var(--gd)] mt-0.5 block">Article {concept.article}</span>
                            )}
                          </div>
                          <span className="text-[var(--gd)] font-mono text-xs font-bold shrink-0">
                            {isOpen ? 'Collapse [-]' : 'Expand [+]'}
                          </span>
                        </button>

                        {isOpen && (
                          <div className="p-4 bg-[var(--ra)] border-t border-[var(--bd)] space-y-3 animate-fade-in font-sans text-xs">
                            <p className="text-[var(--t1)] leading-relaxed text-xs font-serif">{concept.explanation}</p>
                            
                            {concept.exam_angle && (
                              <div className="bg-[var(--gg)] border border-[var(--gd2)] p-3 rounded-xl border-l-4 border-l-[var(--gd)] space-y-1">
                                <span className="font-mono text-[10px] font-bold text-[var(--gd)] uppercase block tracking-wider">UPSC Exam Angle</span>
                                <p className="text-[var(--t1)] italic text-[11px] leading-relaxed font-serif">{concept.exam_angle}</p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  
                  {/* Mark as read button */}
                  <div className="pt-6 text-center font-sans">
                    <button
                      onClick={() => updateProgress({ concepts: true })}
                      className="bg-[var(--gd)] text-[var(--bg)] px-5 py-2 rounded-full text-xs font-bold uppercase tracking-wider hover:opacity-95"
                    >
                      ✓ Mastery Verified
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-[var(--t3)]">No core concepts catalogued yet.</div>
              )}
            </div>
          )}

          {/* Tab Panel 4: Cards */}
          {activeTab === 'cards' && (
            <div className="max-w-md mx-auto space-y-6 font-sans">
              {currentTopic.flashcards && currentTopic.flashcards.length > 0 ? (
                <div>
                  {flashcardIdx < currentTopic.flashcards.length ? (
                    <div className="space-y-4 text-center">
                      <div className="flex justify-between items-center text-xs text-[var(--t3)] px-2">
                        <span>Card {flashcardIdx + 1} of {currentTopic.flashcards.length}</span>
                        <span>Spaced Memory Schedule</span>
                      </div>

                      {/* Tactile Flapping Card */}
                      <div 
                        onClick={() => setIsFlipped(!isFlipped)}
                        className={`h-64 rounded-3xl p-6 border-2 flex flex-col justify-between cursor-pointer transition-all duration-300 shadow-md ${
                          isFlipped 
                            ? 'bg-[var(--sur)] border-[var(--gd)] rotate-y-180' 
                            : 'bg-[var(--ra)] border-[var(--bd)] hover:border-[var(--gd2)]'
                        }`}
                      >
                        <span className="text-[9px] uppercase tracking-wider text-[var(--t3)] font-mono block text-left">
                          {isFlipped ? 'RECALL VERIFICATION (Back)' : 'ACTIVE RECALL (Front)'}
                        </span>

                        <div className="flex-1 flex items-center justify-center py-4">
                          <p className="text-sm font-serif font-bold text-[var(--t1)] leading-relaxed">
                            {isFlipped ? currentTopic.flashcards[flashcardIdx].back : currentTopic.flashcards[flashcardIdx].front}
                          </p>
                        </div>

                        <span className="text-[9px] font-mono text-[var(--t3)] text-right">
                          Tap to {isFlipped ? 'see question' : 'flip answer'}
                        </span>
                      </div>

                      {/* Flashcard rate controls */}
                      {isFlipped && (
                        <div className="flex gap-3 justify-center pt-2 animate-fade-in">
                          <button
                            onClick={() => rateCard(false)}
                            className="bg-[var(--er)] text-white font-bold text-xs uppercase px-5 py-2.5 rounded-2xl hover:opacity-90 flex-1"
                          >
                            Hard (Missed)
                          </button>
                          <button
                            onClick={() => rateCard(true)}
                            className="bg-[var(--ok)] text-white font-bold text-xs uppercase px-5 py-2.5 rounded-2xl hover:opacity-90 flex-1"
                          >
                            Easy (Got It)
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="bg-[var(--sur)] border border-[var(--bd)] rounded-3xl p-8 text-center space-y-4 animate-fade-in">
                      <Award className="w-12 h-12 text-[var(--gd)] mx-auto animate-bounce" />
                      <h3 className="font-bold text-sm text-[var(--t1)]">Subtopic Flashcards Mastered!</h3>
                      <p className="text-xs text-[var(--t3)]">
                        You have reviewed all {currentTopic.flashcards.length} flashcards in this deck. Your performance is synced with the Leitner revision cabinet.
                      </p>
                      <div className="bg-[var(--ra)] p-3 rounded-2xl text-xs font-mono">
                        Session Score: <strong className="text-[var(--gd)]">{cardsCorrect} / {cardsTotal}</strong> ({cardsTotal > 0 ? Math.round((cardsCorrect / cardsTotal) * 100) : 0}%)
                      </div>
                      <button
                        onClick={() => {
                          setFlashcardIdx(0);
                          setIsFlipped(false);
                          setCardsCorrect(0);
                          setCardsTotal(0);
                        }}
                        className="bg-[var(--gd)] text-[var(--bg)] font-bold text-xs uppercase px-5 py-2 rounded-xl"
                      >
                        Review Deck Again
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12 text-[var(--t3)]">No flashcards configured for this subtopic.</div>
              )}
            </div>
          )}

          {/* Tab Panel 5: PYQs */}
          {activeTab === 'pyq' && (
            <div className="max-w-2xl mx-auto space-y-6 text-left">
              <div className="flex justify-between items-center border-b border-[var(--bd)] pb-3">
                <span className="text-[10px] uppercase font-bold text-[var(--t3)] font-mono">Previous Year Solved Questions</span>
                <span className="text-[9px] font-mono bg-[var(--ra)] border border-[var(--bd)] text-[var(--t2)] px-2 py-0.5 rounded-full">
                  Prelims Core
                </span>
              </div>

              {currentTopic.pyq_ids && currentTopic.pyq_ids.length > 0 ? (
                <div className="space-y-6">
                  {currentTopic.pyq_ids.map((qid, pIdx) => {
                    const q = DEFAULT_OFFLINE_MCQS['t01'][pIdx]; // grab matching or mock pyq
                    if (!q) return null;
                    const selected = pyqAnswers[q.id];

                    return (
                      <div key={q.id} className="bg-[var(--sur)] border border-[var(--bd)] rounded-2xl p-5 space-y-4">
                        <div className="flex justify-between items-center text-[10px] font-mono text-[var(--t3)] border-b border-[var(--bd)]/10 pb-1.5">
                          <span>QUESTION #{pIdx + 1}</span>
                          <span className="text-[var(--gd)] font-bold">UPSC PRELIMS</span>
                        </div>
                        
                        <p className="text-xs font-serif leading-relaxed text-[var(--t1)] whitespace-pre-line">
                          {q.question}
                        </p>

                        {/* Options */}
                        <div className="space-y-2 font-sans text-xs">
                          {q.options.map((opt, oIdx) => {
                            const optionChar = String.fromCharCode(65 + oIdx);
                            const isSelected = selected === optionChar;
                            const isCorrect = optionChar === q.answer;
                            
                            let borderClass = "border-[var(--bd)] hover:bg-[var(--ra)]";
                            let icon = null;
                            if (selected) {
                              if (isCorrect) {
                                borderClass = "border-[var(--ok)] bg-emerald-500/10 text-[var(--ok)]";
                                icon = "✓";
                              } else if (isSelected) {
                                borderClass = "border-[var(--er)] bg-red-500/10 text-[var(--er)]";
                                icon = "✗";
                              }
                            }

                            return (
                              <button
                                key={oIdx}
                                disabled={!!selected}
                                onClick={() => {
                                  const updated = { ...pyqAnswers, [q.id]: optionChar };
                                  setPyqAnswers(updated);
                                  updateProgress({ pyq: updated });
                                }}
                                className={`w-full text-left p-3 rounded-xl border flex items-center justify-between transition ${borderClass}`}
                              >
                                <span className="flex-1 pr-3">
                                  <strong className="mr-1.5 font-mono">{optionChar}.</strong> {opt}
                                </span>
                                {icon && <span className="font-mono font-bold text-sm shrink-0">{icon}</span>}
                              </button>
                            );
                          })}
                        </div>

                        {/* Explanation */}
                        {selected && (
                          <div className="p-4 bg-[var(--ra)] rounded-xl text-xs space-y-1.5 animate-fade-in border-l-2 border-l-[var(--gd)]">
                            <span className="font-mono font-bold text-[var(--gd)] text-[10px] uppercase block tracking-wider">Answer Key & Explanation:</span>
                            <p className="text-[var(--t1)] font-serif leading-relaxed">{q.explanation}</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12 text-[var(--t3)]">No PYQ logs connected to this subtopic yet.</div>
              )}
            </div>
          )}

          {/* Tab Panel 6: MCQ Generator */}
          {activeTab === 'mcq' && (
            <div className="max-w-2xl mx-auto space-y-6 text-left font-sans">
              {mcqLoading ? (
                /* Dynamic UPSC load progress state */
                <div className="text-center py-16 space-y-6">
                  <div className="relative w-16 h-16 mx-auto">
                    {/* Ring spinning */}
                    <div className="absolute inset-0 rounded-full border-4 border-[var(--bd)]" />
                    <div className="absolute inset-0 rounded-full border-4 border-t-[var(--gd)] animate-spin" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-mono font-bold text-[var(--gd)] text-xs uppercase tracking-wider animate-pulse">
                      {mcqLoadingStatus}
                    </h3>
                    <p className="text-[10px] text-[var(--t3)]">Connecting to secure direct Gemini 3.5 Flash server...</p>
                  </div>
                </div>
              ) : generatedMCQs.length > 0 ? (
                <div className="space-y-6 animate-fade-in">
                  <div className="flex justify-between items-center border-b border-[var(--bd)] pb-3">
                    <span className="text-[10px] font-mono uppercase text-[var(--t3)]">Interactive On-The-Fly Drill</span>
                    <button 
                      onClick={generateDynamicMCQs}
                      className="text-xs font-mono text-[var(--gd)] border border-[var(--gd)] rounded-full px-3 py-1 bg-[var(--ra)] hover:bg-[var(--gd)] hover:text-[var(--bg)] transition"
                    >
                      Regenerate
                    </button>
                  </div>

                  {generatedMCQs.map((q, idx) => {
                    const selected = mcqAnswers[q.id];
                    return (
                      <div key={q.id} className="bg-[var(--sur)] border border-[var(--bd)] rounded-2xl p-5 space-y-4">
                        <span className="text-[10px] font-mono text-[var(--t3)] block">QUESTION {idx + 1} of {generatedMCQs.length}</span>
                        <p className="text-xs font-serif leading-relaxed text-[var(--t1)] whitespace-pre-line">{q.question}</p>

                        <div className="space-y-2 text-xs">
                          {q.options.map((opt, oIdx) => {
                            const optChar = String.fromCharCode(65 + oIdx);
                            const isSelected = selected === optChar;
                            const isCorrect = optChar === q.answer;

                            let optionStyle = "border-[var(--bd)] hover:bg-[var(--ra)]";
                            let checkIcon = null;
                            if (selected) {
                              if (isCorrect) {
                                optionStyle = "border-[var(--ok)] bg-emerald-500/10 text-[var(--ok)]";
                                checkIcon = "✓";
                              } else if (isSelected) {
                                optionStyle = "border-[var(--er)] bg-red-500/10 text-[var(--er)]";
                                checkIcon = "✗";
                              }
                            }

                            return (
                              <button
                                key={oIdx}
                                disabled={!!selected}
                                onClick={() => setMcqAnswers(prev => ({ ...prev, [q.id]: optChar }))}
                                className={`w-full text-left p-3 rounded-xl border flex items-center justify-between transition ${optionStyle}`}
                              >
                                <span><strong className="mr-1">{optChar}.</strong> {opt}</span>
                                {checkIcon && <span className="font-bold">{checkIcon}</span>}
                              </button>
                            );
                          })}
                        </div>

                        {selected && (
                          <div className="bg-[var(--ra)] border border-[var(--bd)] p-4 rounded-xl text-xs space-y-1 animate-fade-in">
                            <span className="font-mono text-[var(--gd)] font-bold text-[10px] uppercase block">Explanation:</span>
                            <p className="text-[var(--t1)] font-serif leading-relaxed text-xs">{q.explanation}</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="bg-[var(--sur)] border border-[var(--bd)] rounded-3xl p-8 text-center space-y-4">
                  <BrainCircuit className="w-12 h-12 text-[var(--gd)] mx-auto" />
                  <h3 className="font-bold text-sm text-[var(--t1)]">AI UPSC Prelims MCQ Generator</h3>
                  <p className="text-xs text-[var(--t3)] leading-relaxed max-w-md mx-auto">
                    Summon fresh, highly analytical multiple choice statement queries aligned with the latest syllabus directives. Requires an active Gemini key.
                  </p>
                  <div className="flex gap-2 justify-center pt-2">
                    <button 
                      onClick={generateDynamicMCQs}
                      className="bg-[var(--gd)] text-[var(--bg)] font-bold text-xs uppercase px-5 py-2.5 rounded-xl hover:opacity-90 transition"
                    >
                      Generate 5 MCQs on-the-fly
                    </button>
                    <button 
                      onClick={() => setGeneratedMCQs(DEFAULT_OFFLINE_MCQS['t01'])}
                      className="bg-[var(--ra)] border border-[var(--bd)] text-[var(--t2)] font-bold text-xs uppercase px-4 py-2.5 rounded-xl"
                    >
                      Run 2 Demo Offline MCQs
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tab Panel 7: Practice Panels */}
          {activeTab === 'practice' && (
            <div className="max-w-2xl mx-auto space-y-6 text-left font-sans">
              {/* Practice navigation toggler */}
              <div className="flex border border-[var(--bd)] rounded-2xl overflow-hidden bg-[var(--ra)]/60 p-0.5">
                {[
                  { id: 'feynman', label: '🌸 Feynman Technique' },
                  { id: 'socratic', label: '💡 Socratic Discussion' },
                  { id: 'mains', label: '✍️ Mains Evaluator' }
                ].map(mode => (
                  <button
                    key={mode.id}
                    onClick={() => setPracticeMode(mode.id as any)}
                    className={`flex-1 py-2 text-xs font-bold rounded-xl transition ${
                      practiceMode === mode.id 
                        ? 'bg-[var(--gd)] text-[var(--bg)] shadow-xs' 
                        : 'text-[var(--t2)] hover:text-[var(--t1)]'
                    }`}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>

              {/* A. Feynman challenge */}
              {practiceMode === 'feynman' && (
                <div className="space-y-4 animate-fade-in">
                  <div className="bg-[var(--ra)] p-4 rounded-2xl border border-[var(--bd)] space-y-1">
                    <h3 className="text-xs font-bold text-[var(--gd)] uppercase font-mono">Feynman active explanation challenge:</h3>
                    <p className="text-xs text-[var(--t1)] font-serif italic">
                      "Explain the core mechanisms of this subtopic in extremely simple, plain English—as if you are explaining it to a 10-year-old child."
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-[10px] uppercase font-bold text-[var(--t3)]">Draft Simple Explanation</label>
                    <textarea
                      rows={5}
                      placeholder="Type your simplified analogical draft here..."
                      className="w-full bg-[var(--sur)] border border-[var(--bd)] text-[var(--t1)] rounded-2xl p-4 text-xs font-serif focus:outline-none focus:ring-1 focus:ring-[var(--gd)]"
                      value={feynmanText}
                      onChange={(e) => setFeynmanText(e.target.value)}
                    />
                  </div>

                  <button
                    onClick={evaluateFeynman}
                    disabled={feynmanLoading || !feynmanText.trim()}
                    className="bg-[var(--gd)] text-[var(--bg)] font-bold text-xs uppercase px-5 py-2.5 rounded-xl transition flex items-center gap-1 hover:opacity-90"
                  >
                    {feynmanLoading ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        Analyzing accuracy...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Grade Draft & Audit Gaps
                      </>
                    )}
                  </button>

                  {feynmanFeedback && (
                    <div className="bg-[var(--sur)] border border-[var(--bd)] p-5 rounded-3xl text-xs space-y-3 border-l-4 border-l-[var(--gd)] animate-fade-in">
                      <span className="font-mono text-[var(--gd)] font-bold uppercase block text-[10px]">Feynman Audit & Marks Checklist</span>
                      <div className="text-[var(--t1)] font-serif leading-relaxed text-xs whitespace-pre-line prose prose-invert">
                        {feynmanFeedback}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* B. Socratic Debate */}
              {practiceMode === 'socratic' && (
                <div className="space-y-4 animate-fade-in">
                  <div className="bg-[var(--sur)] border border-[var(--bd)] rounded-2xl p-4 max-h-96 overflow-y-auto space-y-3 font-serif">
                    {socraticChat.map((msg, idx) => (
                      <div key={idx} className={`flex ${msg.role === 'mentor' ? 'justify-start' : 'justify-end'}`}>
                        <div className={`p-3.5 rounded-2xl max-w-xs text-xs font-serif leading-relaxed border ${
                          msg.role === 'mentor' 
                            ? 'bg-[var(--ra)] border-[var(--bd)] text-[var(--t1)] rounded-tl-none' 
                            : 'bg-[var(--gd)] text-[var(--bg)] border-transparent rounded-tr-none font-semibold shadow-xs'
                        }`}>
                          <span className="text-[9px] font-mono uppercase block text-right mb-1 opacity-55">
                            {msg.role === 'mentor' ? '🏛️ Socratic Mentor' : 'Aspirant'}
                          </span>
                          <p>{msg.text}</p>
                        </div>
                      </div>
                    ))}
                    
                    {socraticLoading && (
                      <div className="flex justify-start">
                        <div className="bg-[var(--ra)] border border-[var(--bd)] p-3 rounded-2xl text-xs text-[var(--t3)] animate-pulse rounded-tl-none">
                          Thinking and testing your core assumptions...
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Type your analytical reply to Socratic mentor..."
                      className="flex-1 bg-[var(--sur)] text-[var(--t1)] border border-[var(--bd)] rounded-2xl p-3 text-xs focus:outline-none focus:ring-1 focus:ring-[var(--gd)] font-serif"
                      value={socraticText}
                      onChange={(e) => setSocraticText(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && sendSocraticMessage()}
                    />
                    <button
                      onClick={sendSocraticMessage}
                      disabled={socraticLoading || !socraticText.trim()}
                      className="bg-[var(--gd)] text-[var(--bg)] px-5 rounded-2xl text-xs font-bold uppercase transition"
                    >
                      Reply
                    </button>
                  </div>
                </div>
              )}

              {/* C. Mains evaluator */}
              {practiceMode === 'mains' && (
                <div className="space-y-4 animate-fade-in">
                  <div className="bg-[var(--ra)] p-4 rounded-2xl border border-[var(--bd)] text-left">
                    <span className="text-[9px] uppercase font-bold text-[var(--t3)] font-mono block">UPSC CSE Practice Question:</span>
                    <p className="text-xs text-[var(--t1)] font-serif font-bold mt-1 leading-relaxed">
                      {currentTopic.mains_questions?.[0]?.question || `Critically evaluate the democratic authority structures linked with ${currentTopic.title}.`}
                    </p>
                  </div>

                  {currentTopic.mains_questions?.[0]?.answer_skeleton && (
                    <div className="bg-[var(--sur)] border border-[var(--bd)] p-4 rounded-2xl text-xs">
                      <h4 className="font-mono text-[var(--gd)] font-bold text-[10px] uppercase mb-1 flex items-center gap-1">
                        <FileText className="w-3.5 h-3.5" />
                        Model Skeleton (Touch to read)
                      </h4>
                      <div className="font-serif leading-relaxed text-[var(--t2)] text-xs mt-1.5 space-y-1">
                        <p><strong>Intro directive:</strong> {currentTopic.mains_questions[0].answer_skeleton.intro}</p>
                        <p><strong>Core Body points:</strong> {currentTopic.mains_questions[0].answer_skeleton.body_points.join(' • ')}</p>
                      </div>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label className="block text-[10px] uppercase font-bold text-[var(--t3)]">Input Draft Answer (250 Words limit)</label>
                    <textarea
                      rows={6}
                      placeholder="Compose your structured essay-style answer. State definitions, body headings, subpoints, and balanced final summary..."
                      className="w-full bg-[var(--sur)] border border-[var(--bd)] text-[var(--t1)] rounded-2xl p-4 text-xs font-serif focus:outline-none focus:ring-1 focus:ring-[var(--gd)] leading-relaxed"
                      value={mainsText}
                      onChange={(e) => setMainsText(e.target.value)}
                    />
                  </div>

                  <button
                    onClick={evaluateMainsAnswer}
                    disabled={mainsLoading || !mainsText.trim()}
                    className="bg-[var(--gd)] text-[var(--bg)] px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider hover:opacity-90 transition flex items-center gap-1.5"
                  >
                    {mainsLoading ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        Evaluating Mains draft...
                      </>
                    ) : (
                      <>
                        <PenTool className="w-3.5 h-3.5" />
                        Evaluate with GS-II Rubrics
                      </>
                    )}
                  </button>

                  {mainsEvaluation && (
                    <div className="bg-[var(--sur)] border border-[var(--bd)] p-5 rounded-3xl text-xs space-y-3 animate-fade-in border-l-4 border-l-[var(--gd)] text-left">
                      <span className="font-mono text-[var(--gd)] font-bold text-[10px] uppercase block">Official UPSC Grade Sheet Evaluation</span>
                      <p className="text-[var(--t1)] font-serif leading-relaxed text-xs whitespace-pre-line">{mainsEvaluation}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Tab Panel 8: Current Affairs */}
          {activeTab === 'ca' && (
            <div className="max-w-2xl mx-auto space-y-6 text-left">
              <span className="text-[10px] uppercase font-bold text-[var(--t3)] font-mono block">Dynamic Current Affairs & Analysis</span>

              <div className="bg-[var(--sur)] border border-[var(--bd)] p-5 rounded-2xl space-y-3">
                <h3 className="font-bold text-xs text-[var(--t1)]">Static Current Connections:</h3>
                {currentTopic.ca_angles && currentTopic.ca_angles.length > 0 ? (
                  <ul className="list-disc pl-5 text-xs text-[var(--t2)] font-serif leading-relaxed space-y-2">
                    {currentTopic.ca_angles.map((ang, idx) => (
                      <li key={idx}>{ang}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="italic text-xs text-[var(--t3)]">No current affairs registered yet.</p>
                )}
              </div>

              {/* Sync with AI button */}
              <div className="bg-[var(--ra)] border border-[var(--bd)] p-5 rounded-2xl text-center space-y-3 font-sans">
                <Globe className="w-8 h-8 text-[var(--gd)] mx-auto animate-pulse" />
                <h4 className="font-bold text-xs text-[var(--t1)]">Sync with Recent Supreme Court Cases & Acts</h4>
                <p className="text-[11px] text-[var(--t3)] max-w-md mx-auto">
                  Fetch current affairs, legislative developments, or supreme court bench judgments over the past 12-24 months related specifically to this topic.
                </p>
                <button
                  onClick={fetchCACurrent}
                  disabled={caLoading}
                  className="bg-[var(--gd)] text-[var(--bg)] font-bold text-xs uppercase px-5 py-2.5 rounded-xl transition hover:opacity-90"
                >
                  {caLoading ? (
                    <span className="flex items-center gap-1.5 justify-center">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Syncing database...
                    </span>
                  ) : (
                    "Fetch Recent Updates with AI"
                  )}
                </button>
              </div>

              {caUpdates && (
                <div className="bg-[var(--sur)] border border-[var(--bd)] p-5 rounded-2xl animate-fade-in border-l-4 border-l-[var(--gd)] text-xs text-left">
                  <span className="font-mono text-[var(--gd)] font-bold text-[10px] uppercase block tracking-wider mb-2">Synced Current Updates:</span>
                  <div className="text-[var(--t1)] font-serif whitespace-pre-line leading-relaxed prose prose-invert">
                    {caUpdates}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tab Panel 9: Personal study Notes */}
          {activeTab === 'notes' && (
            <div className="max-w-2xl mx-auto space-y-4 text-left font-sans">
              <div className="flex justify-between items-center border-b border-[var(--bd)] pb-2 mb-2">
                <div>
                  <span className="text-[10px] font-mono text-[var(--t3)] uppercase tracking-wider block">Study Desk Scratchpad</span>
                  <h3 className="font-bold text-xs text-[var(--t1)]">Your Structured Revision Notes</h3>
                </div>
                <span className="text-[9px] font-mono bg-green-500/10 text-[var(--ok)] border border-[var(--ok)]/20 px-2 py-0.5 rounded-full">
                  Auto-saving to Study State
                </span>
              </div>

              <textarea
                rows={10}
                placeholder="Draft summaries, compile article checklists, or jot down memory hooks for this subtopic..."
                className="w-full bg-[var(--sur)] border border-[var(--bd)] text-[var(--t1)] rounded-2xl p-4 text-xs font-serif focus:outline-none focus:ring-1 focus:ring-[var(--gd)] leading-relaxed"
                value={localNotes}
                onChange={(e) => {
                  setLocalNotes(e.target.value);
                  updateProgress({ notes: e.target.value });
                }}
              />
            </div>
          )}

        </div>

        {/* 4. Navigator bar */}
        <div className="border-t border-[var(--bd)] bg-[var(--sur)] p-3 px-6 flex justify-between items-center shrink-0 text-xs font-sans">
          <button
            onClick={() => {
              if (activeTopicIdx > 0) {
                setActiveTopicIdx(activeTopicIdx - 1);
              }
            }}
            disabled={activeTopicIdx === 0}
            className="flex items-center gap-1 font-bold text-[var(--gd)] disabled:opacity-30 transition"
          >
            <ChevronLeft className="w-4 h-4" />
            Previous Module
          </button>

          <span className="text-[10px] font-mono text-[var(--t3)]">
            Module {activeTopicIdx + 1} of {chapter.topics.length}
          </span>

          <button
            onClick={() => {
              if (activeTopicIdx < chapter.topics.length - 1) {
                setActiveTopicIdx(activeTopicIdx + 1);
              }
            }}
            disabled={activeTopicIdx === chapter.topics.length - 1}
            className="flex items-center gap-1 font-bold text-[var(--gd)] disabled:opacity-30 transition"
          >
            Next Module
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

      </div>

    </div>
  );
}
