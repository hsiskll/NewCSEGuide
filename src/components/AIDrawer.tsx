import React, { useState } from 'react';
import { 
  Sparkles, Brain, GraduationCap, Compass, CheckSquare, 
  Layers, Tags, FileText, ClipboardList, RefreshCw, Plus, Check, Play
} from 'lucide-react';
import { 
  generateSimpleExplanation, 
  generateUPSCLens, 
  generateSocraticQuestions, 
  generateMCQDrill, 
  generateFlashcards, 
  generateMainsSkeleton, 
  generateCAClassifier,
  GeneratedMCQ,
  GeneratedFlashcard,
  CAClassification,
  getStoredGeminiKey
} from '../utils/gemini';
import { SubjectType, Flashcard } from '../types';

interface AIDrawerProps {
  sectionText: string;
  sectionTitle: string;
  subject: SubjectType;
  chapterId: string;
  isOpen: boolean;
  onClose: () => void;
  onAddFlashcards: (cards: { front: string; back: string }[]) => void;
}

type AIActionType = 'explain' | 'lens' | 'socratic' | 'mcq' | 'flashcard' | 'mains' | 'classifier';

export default function AIDrawer({
  sectionText,
  sectionTitle,
  subject,
  chapterId,
  isOpen,
  onClose,
  onAddFlashcards
}: AIDrawerProps) {
  const [activeTab, setActiveTab] = useState<AIActionType>('explain');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Storage for generated outputs
  const [explanation, setExplanation] = useState('');
  const [upscLens, setUpscLens] = useState('');
  const [socratic, setSocratic] = useState('');
  const [mcqs, setMcqs] = useState<GeneratedMCQ[]>([]);
  const [selectedMcqAnswers, setSelectedMcqAnswers] = useState<{ [key: number]: number }>({});
  const [showMcqExplanations, setShowMcqExplanations] = useState<{ [key: number]: boolean }>({});
  
  const [flashcards, setFlashcards] = useState<GeneratedFlashcard[]>([]);
  const [flashcardsSaved, setFlashcardsSaved] = useState(false);
  
  const [mainsSkeleton, setMainsSkeleton] = useState('');
  const [classifier, setClassifier] = useState<CAClassification | null>(null);

  const keyExists = !!getStoredGeminiKey();

  const handleRunAI = async (actionType: AIActionType) => {
    if (!keyExists) {
      setError('Please provide a Gemini API Key in Settings to enable AI features.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      if (actionType === 'explain') {
        const res = await generateSimpleExplanation(sectionText);
        setExplanation(res);
      } else if (actionType === 'lens') {
        const res = await generateUPSCLens(sectionText);
        setUpscLens(res);
      } else if (actionType === 'socratic') {
        const res = await generateSocraticQuestions(sectionText);
        setSocratic(res);
      } else if (actionType === 'mcq') {
        const res = await generateMCQDrill(sectionText, subject);
        setMcqs(res);
        setSelectedMcqAnswers({});
        setShowMcqExplanations({});
      } else if (actionType === 'flashcard') {
        const res = await generateFlashcards(sectionText, subject);
        setFlashcards(res);
        setFlashcardsSaved(false);
      } else if (actionType === 'mains') {
        const res = await generateMainsSkeleton(sectionText);
        setMainsSkeleton(res);
      } else if (actionType === 'classifier') {
        const res = await generateCAClassifier(sectionText);
        setClassifier(res);
      }
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Gemini error encountered. Please check your network and API Key.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveFlashcards = () => {
    if (flashcards.length === 0) return;
    onAddFlashcards(flashcards);
    setFlashcardsSaved(true);
  };

  if (!isOpen) return null;

  const tabs = [
    { id: 'explain', label: 'Simple Explanation', icon: Brain },
    { id: 'lens', label: 'UPSC Lens', icon: GraduationCap },
    { id: 'socratic', label: 'Socratic Qs', icon: Compass },
    { id: 'mcq', label: 'MCQ Drill', icon: CheckSquare },
    { id: 'flashcard', label: 'Flashcard Maker', icon: Layers },
    { id: 'mains', label: 'Mains Skeleton', icon: ClipboardList },
    { id: 'classifier', label: 'Syllabus Tagging', icon: Tags },
  ];

  return (
    <div id="ai_drawer" className="fixed inset-0 lg:left-auto lg:w-[480px] bg-brand-cream border-l-2 border-brand-gold shadow-2xl z-40 flex flex-col justify-between">
      {/* Drawer Header */}
      <div className="bg-brand-navy text-white px-4 py-3.5 border-b border-brand-gold flex justify-between items-center shrink-0">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-brand-gold fill-brand-gold" />
          <div>
            <h3 className="font-display font-bold text-sm tracking-wide text-white uppercase">UPSC AI Copilot</h3>
            <p className="text-[10px] text-brand-teal font-mono truncate max-w-[280px]">Active: {sectionTitle}</p>
          </div>
        </div>
        <button 
          onClick={onClose}
          className="text-gray-400 hover:text-white font-bold text-xs uppercase border border-white/20 px-2 py-1 rounded"
        >
          Close
        </button>
      </div>

      {/* Drawer Tabs Bar */}
      <div className="bg-brand-slate flex gap-1 overflow-x-auto px-2 py-1.5 shrink-0 border-b border-brand-gold/10">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as AIActionType);
                setError('');
              }}
              className={`flex items-center gap-1 px-3 py-1.5 rounded text-[11px] font-bold tracking-wide shrink-0 transition-all ${
                isActive 
                  ? 'bg-brand-gold text-brand-navy' 
                  : 'text-indigo-200 hover:bg-white/5'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Main Drawer Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-left font-sans">
        
        {!keyExists && (
          <div className="p-4 bg-amber-50 border border-brand-gold rounded text-xs text-brand-slate space-y-2">
            <p className="font-bold">🔑 Gemini Key Required</p>
            <p>To analyze chapters using the AI Copilot, please visit the <strong>Settings</strong> panel and input your Google Gemini API Key.</p>
          </div>
        )}

        {error && (
          <div className="p-3 bg-red-50 border border-red-300 text-red-950 rounded text-xs font-mono">
            <strong>Error:</strong> {error}
          </div>
        )}

        {/* Action Panel */}
        {keyExists && (
          <div className="bg-white p-4 rounded-lg border border-brand-navy/5 shadow-xs space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-[10px] uppercase font-bold text-gray-400">Trigger Analytical Command</span>
              <button
                onClick={() => handleRunAI(activeTab)}
                disabled={loading}
                className="bg-brand-navy hover:bg-brand-slate text-brand-gold border border-brand-gold px-4 py-2 rounded text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Analysing Text...
                  </>
                ) : (
                  <>
                    <Play className="w-3 h-3 fill-brand-gold" />
                    Run Gemini AI
                  </>
                )}
              </button>
            </div>
            <p className="text-[11px] text-brand-slate italic font-serif">
              "Gemini will digest the selected section and formulate specialized notes for UPSC exam evaluation."
            </p>
          </div>
        )}

        {/* Loading UI with funny academic motivational messages */}
        {loading && (
          <div className="p-8 text-center space-y-3">
            <RefreshCw className="w-10 h-10 text-brand-gold animate-spin mx-auto" />
            <p className="text-xs font-bold text-brand-navy font-display uppercase tracking-wider">Consulting Academicians</p>
            <p className="text-[11px] text-brand-slate font-serif italic max-w-xs mx-auto">
              "We are deconstructing constitutional clauses and aligning keywords with UPSC evaluation standards. Please stand by..."
            </p>
          </div>
        )}

        {/* Result containers */}
        {!loading && (
          <div className="space-y-4">
            
            {/* EXPLAIN TAB */}
            {activeTab === 'explain' && explanation && (
              <div className="prose prose-sm text-brand-navy leading-relaxed font-serif text-sm bg-white p-4 rounded-lg border border-brand-navy/5 shadow-xs space-y-3 whitespace-pre-wrap">
                <h4 className="font-display font-bold text-xs uppercase text-brand-gold tracking-wide border-b border-brand-navy/10 pb-1">Intuitive Breakdown</h4>
                {explanation}
              </div>
            )}

            {/* LENS TAB */}
            {activeTab === 'lens' && upscLens && (
              <div className="prose prose-sm text-brand-navy leading-relaxed font-serif text-sm bg-white p-4 rounded-lg border border-brand-navy/5 shadow-xs whitespace-pre-wrap">
                <h4 className="font-display font-bold text-xs uppercase text-brand-gold tracking-wide border-b border-brand-navy/10 pb-1 mb-3">Prelims vs Mains Evaluation Matrix</h4>
                {upscLens}
              </div>
            )}

            {/* SOCRATIC TAB */}
            {activeTab === 'socratic' && socratic && (
              <div className="prose prose-sm text-brand-navy leading-relaxed font-serif text-sm bg-white p-4 rounded-lg border border-brand-navy/5 shadow-xs whitespace-pre-wrap">
                <h4 className="font-display font-bold text-xs uppercase text-brand-gold tracking-wide border-b border-brand-navy/10 pb-1 mb-3">Socratic Stimuli & Critical Thinking</h4>
                {socratic}
              </div>
            )}

            {/* MCQ DRIL TAB */}
            {activeTab === 'mcq' && mcqs.length > 0 && (
              <div className="space-y-4">
                <h4 className="font-display font-bold text-xs uppercase text-brand-gold tracking-wide border-b border-brand-navy/10 pb-1">Interactive MCQ Drill</h4>
                {mcqs.map((q, idx) => {
                  const answered = selectedMcqAnswers[idx] !== undefined;
                  const isCorrect = selectedMcqAnswers[idx] === q.correctAnswer;
                  return (
                    <div key={idx} className="bg-white p-4 rounded-lg border border-brand-navy/5 shadow-xs space-y-3">
                      <p className="text-xs font-bold text-brand-navy">{idx + 1}. {q.text}</p>
                      
                      <div className="space-y-1.5">
                        {q.options.map((opt, oIdx) => {
                          const isSelected = selectedMcqAnswers[idx] === oIdx;
                          let btnClass = 'bg-brand-cream border-brand-navy/10 text-brand-navy';
                          
                          if (answered) {
                            if (oIdx === q.correctAnswer) {
                              btnClass = 'bg-green-100 border-green-500 text-green-950 font-semibold';
                            } else if (isSelected) {
                              btnClass = 'bg-red-100 border-red-500 text-red-950';
                            }
                          } else {
                            btnClass = 'bg-brand-cream hover:bg-amber-50 border-brand-navy/10 hover:border-brand-gold/30 text-brand-navy';
                          }

                          return (
                            <button
                              key={oIdx}
                              disabled={answered}
                              onClick={() => {
                                setSelectedMcqAnswers({ ...selectedMcqAnswers, [idx]: oIdx });
                              }}
                              className={`w-full text-left p-2.5 rounded border text-xs transition duration-150 ${btnClass}`}
                            >
                              {String.fromCharCode(65 + oIdx)}. {opt}
                            </button>
                          );
                        })}
                      </div>

                      {answered && (
                        <div className="pt-2 border-t border-brand-navy/5 space-y-2">
                          <div className="flex justify-between items-center">
                            <span className={`text-[10px] font-bold ${isCorrect ? 'text-green-700' : 'text-red-700'}`}>
                              {isCorrect ? '✓ Correct Assertion' : '✗ Incorrect Answer'}
                            </span>
                            <button
                              onClick={() => setShowMcqExplanations({ ...showMcqExplanations, [idx]: !showMcqExplanations[idx] })}
                              className="text-[10px] text-brand-navy font-bold hover:underline uppercase tracking-wider"
                            >
                              {showMcqExplanations[idx] ? 'Hide Rationale' : 'Reveal Rationale'}
                            </button>
                          </div>
                          
                          {showMcqExplanations[idx] && (
                            <p className="text-xs text-brand-slate font-serif italic bg-amber-50/55 p-2 rounded border-l-2 border-brand-gold mt-1">
                              {q.explanation}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* FLASHCARD TAB */}
            {activeTab === 'flashcard' && flashcards.length > 0 && (
              <div className="space-y-4">
                <div className="flex justify-between items-center border-b border-brand-navy/10 pb-1">
                  <h4 className="font-display font-bold text-xs uppercase text-brand-gold tracking-wide">Extracted Flashcards</h4>
                  {!flashcardsSaved ? (
                    <button
                      onClick={handleSaveFlashcards}
                      className="bg-brand-navy hover:bg-brand-slate text-brand-gold border border-brand-gold px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 transition"
                    >
                      <Plus className="w-3 h-3" />
                      Save to Leitner Deck
                    </button>
                  ) : (
                    <span className="bg-green-100 text-green-800 text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1">
                      <Check className="w-3 h-3 text-green-600" />
                      Saved into Box 1
                    </span>
                  )}
                </div>

                <div className="space-y-3">
                  {flashcards.map((fc, idx) => (
                    <div key={idx} className="bg-white p-3.5 rounded-lg border border-brand-navy/5 shadow-xs space-y-2">
                      <div className="text-left">
                        <span className="text-[9px] uppercase font-bold text-brand-gold font-mono">Front (Recall Prompt):</span>
                        <p className="text-xs font-bold text-brand-navy">{fc.front}</p>
                      </div>
                      <div className="pt-2 border-t border-brand-navy/5 text-left">
                        <span className="text-[9px] uppercase font-bold text-brand-teal font-mono">Back (Key Fact):</span>
                        <p className="text-xs text-brand-slate font-serif">{fc.back}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* MAINS SKELETON TAB */}
            {activeTab === 'mains' && mainsSkeleton && (
              <div className="prose prose-sm text-brand-navy leading-relaxed font-serif text-sm bg-white p-4 rounded-lg border border-brand-navy/5 shadow-xs whitespace-pre-wrap">
                <h4 className="font-display font-bold text-xs uppercase text-brand-gold tracking-wide border-b border-brand-navy/10 pb-1 mb-3">Mains Answer Formulation Blueprint</h4>
                {mainsSkeleton}
              </div>
            )}

            {/* CLASSIFIER TAB */}
            {activeTab === 'classifier' && classifier && (
              <div className="bg-white p-4 rounded-lg border border-brand-navy/5 shadow-xs space-y-4 text-left">
                <h4 className="font-display font-bold text-xs uppercase text-brand-gold tracking-wide border-b border-brand-navy/10 pb-1">Syllabus Classification Engine</h4>
                
                <div className="space-y-3">
                  <div>
                    <span className="text-[9px] uppercase font-bold text-gray-400 block mb-0.5">GS Paper Category</span>
                    <span className="bg-brand-navy text-brand-teal text-xs font-bold px-2.5 py-1 rounded inline-block">
                      {classifier.syllabusCode}
                    </span>
                  </div>

                  <div>
                    <span className="text-[9px] uppercase font-bold text-gray-400 block mb-0.5">Syllabus Tags / Core Concepts</span>
                    <div className="flex gap-1 flex-wrap">
                      {classifier.topicsJoined.split(',').map((tag, i) => (
                        <span key={i} className="text-[10px] font-mono bg-brand-cream border border-brand-navy/10 text-brand-navy px-1.5 py-0.5 rounded">
                          {tag.trim()}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="bg-amber-50/50 p-3 rounded border-l-2 border-brand-gold">
                    <span className="text-[9px] uppercase font-bold text-brand-gold block mb-1">Micro-Revision Takeaway (Strictly 20 Words)</span>
                    <p className="text-xs font-serif italic text-brand-navy font-semibold leading-relaxed">
                      "{classifier.revisionNote}"
                    </p>
                    <span className="text-[9px] text-gray-400 text-right block mt-1 font-mono">
                      Length: {classifier.revisionNote.split(/\s+/).length} words
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Empty state instruction inside panel */}
            {!explanation && !upscLens && !socratic && !mainsSkeleton && mcqs.length === 0 && flashcards.length === 0 && !classifier && (
              <div className="text-center py-12 text-gray-400 italic space-y-2">
                <Brain className="w-8 h-8 text-brand-navy/10 mx-auto" />
                <p className="text-xs">Select your command tab above and click "Run Gemini AI" to analyze this section.</p>
              </div>
            )}

          </div>
        )}

      </div>

      {/* Drawer Footer Disclaimer */}
      <div className="bg-brand-navy text-white/50 px-4 py-2.5 text-[9px] font-mono text-center border-t border-brand-gold/20 shrink-0">
        POWERED BY GEMINI 3.5 FLASH • LOCAL WORKSPACE SECURED
      </div>
    </div>
  );
}
