import React, { useState } from 'react';
import { 
  Check, X, HelpCircle, Layers, RefreshCw, Plus, 
  Trash2, AlertCircle, Bookmark, Sparkles, Trophy, Upload, Copy
} from 'lucide-react';
import { Flashcard, SubjectType } from '../types';
import { callGemini } from '../utils/gemini';

interface LeitnerRevisionTabProps {
  flashcards: Flashcard[];
  onUpdateFlashcard: (card: Flashcard) => void;
  onAddFlashcard: (card: Omit<Flashcard, 'id' | 'createdAt' | 'streak'>) => void;
  onDeleteFlashcard: (id: string) => void;
  planner?: Record<string, any>;
}

const BOX_DETAILS = [
  { num: 1, name: 'Box 1: Daily', interval: 'Review every 24 Hours', color: 'border-red-600 text-red-700 bg-red-50/40' },
  { num: 2, name: 'Box 2: Primary', interval: 'Review every 2 Days', color: 'border-amber-600 text-amber-700 bg-amber-50/40' },
  { num: 3, name: 'Box 3: Intermediate', interval: 'Review every 5 Days', color: 'border-indigo-600 text-indigo-700 bg-indigo-50/40' },
  { num: 4, name: 'Box 4: Advanced', interval: 'Review every 9 Days', color: 'border-teal-600 text-teal-700 bg-teal-50/40' },
  { num: 5, name: 'Box 5: Mastered', interval: 'Review every 15 Days', color: 'border-green-600 text-green-700 bg-green-50/40' }
];

export default function LeitnerRevisionTab({
  flashcards,
  onUpdateFlashcard,
  onAddFlashcard,
  onDeleteFlashcard,
  planner = {}
}: LeitnerRevisionTabProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [addMode, setAddMode] = useState<'manual' | 'ai' | 'json'>('manual');
  
  // Manual card inputs
  const [newFront, setNewFront] = useState('');
  const [newBack, setNewBack] = useState('');
  const [newSubject, setNewSubject] = useState<SubjectType>('Polity');

  // AI Generator states
  const [aiTopic, setAiTopic] = useState('');
  const [aiSubject, setAiSubject] = useState<SubjectType>('Polity');
  const [aiLoading, setAiLoading] = useState(false);
  const [generatedCards, setGeneratedCards] = useState<Array<{ front: string; back: string }>>([]);
  const [aiError, setAiError] = useState('');

  // JSON Import states
  const [jsonPasted, setJsonPasted] = useState('');
  const [jsonError, setJsonError] = useState('');
  const [jsonSuccess, setJsonSuccess] = useState('');

  // Gather completed chapter IDs and their completion date
  const completedChaptersForLeitner = React.useMemo(() => {
    const completedIds = new Set<string>();
    const today = new Date();

    Object.entries(planner).forEach(([dateStr, dayPlanner]) => {
      const parts = dateStr.split('-');
      if (parts.length !== 3) return;
      const compDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));

      // T+2 threshold: must be at least 2 days ago
      const tPlusTwo = new Date(compDate);
      tPlusTwo.setDate(tPlusTwo.getDate() + 2);

      if (tPlusTwo <= today) {
        if (dayPlanner && Array.isArray(dayPlanner.targets)) {
          dayPlanner.targets.forEach((t: any) => {
            if (t.chapterId && t.completed) {
              completedIds.add(t.chapterId);
            }
          });
        }
      }
    });
    return completedIds;
  }, [planner]);

  // Filter due cards
  const now = new Date();
  const dueQueue = flashcards.filter(card => {
    // If card belongs to a chapter, check if that chapter was completed in planner >= 2 days ago
    if (card.chapterId) {
      if (!completedChaptersForLeitner.has(card.chapterId)) {
        return false; // Not due/active yet because chapter was not completed >= 2 days ago
      }
    }

    const rDate = new Date(card.nextReviewDate);
    return rDate <= now;
  });

  const activeCard = dueQueue[0] || null;

  // Handle Promoting card (correct recall)
  const handlePromote = () => {
    if (!activeCard) return;

    const nextBox = Math.min(5, activeCard.box + 1);
    let intervalHours = 24;
    if (nextBox === 2) intervalHours = 48; // 2 days
    else if (nextBox === 3) intervalHours = 120; // 5 days
    else if (nextBox === 4) intervalHours = 216; // 9 days
    else if (nextBox === 5) intervalHours = 360; // 15 days

    const nextReview = new Date(Date.now() + intervalHours * 60 * 60 * 1000);

    const updatedCard: Flashcard = {
      ...activeCard,
      box: nextBox,
      streak: activeCard.streak + 1,
      nextReviewDate: nextReview.toISOString()
    };

    onUpdateFlashcard(updatedCard);
    setIsFlipped(false);
  };

  // Handle Demoting card (incorrect recall)
  const handleDemote = () => {
    if (!activeCard) return;

    // Leitner Rule: incorrect demotes all the way back to Box 1!
    const nextBox = 1;
    const nextReview = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    const updatedCard: Flashcard = {
      ...activeCard,
      box: nextBox,
      streak: 0,
      nextReviewDate: nextReview.toISOString()
    };

    onUpdateFlashcard(updatedCard);
    setIsFlipped(false);
  };

  // Handle manual card addition
  const handleManualAddCard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFront.trim() || !newBack.trim()) return;

    onAddFlashcard({
      front: newFront.trim(),
      back: newBack.trim(),
      subject: newSubject,
      box: 1,
      nextReviewDate: new Date().toISOString() // due immediately
    });

    setNewFront('');
    setNewBack('');
    setShowAddForm(false);
  };

  // AI Flashcards Generator trigger
  const handleGenerateAICards = async () => {
    if (!aiTopic.trim()) return;
    setAiLoading(true);
    setAiError('');
    setGeneratedCards([]);
    
    const prompt = `You are an expert UPSC CSE content creator. Generate exactly 5 high-yield Spaced-Repetition Active Recall flashcards for the UPSC subject "${aiSubject}" on the topic: "${aiTopic.trim()}".
Each card must consist of:
- front: A deep analytical or factual question (e.g., "What is the difference between Judicial Review and Judicial Activism?").
- back: The precise, high-yield structured answer citing relevant Articles, Supreme Court cases, or Commission reports if applicable.

Return ONLY a valid JSON array of objects with the structure:
[
  {
    "front": "string",
    "back": "string"
  }
]
Do not include any markdown backticks, explanations, or extra text. Return raw JSON.`;

    try {
      const res = await callGemini(prompt);
      let cleaned = res.trim();
      if (cleaned.startsWith('```json')) {
        cleaned = cleaned.substring(7);
      } else if (cleaned.startsWith('```')) {
        cleaned = cleaned.substring(3);
      }
      if (cleaned.endsWith('```')) {
        cleaned = cleaned.substring(0, cleaned.length - 3);
      }
      cleaned = cleaned.trim();

      const parsed = JSON.parse(cleaned);
      if (Array.isArray(parsed)) {
        setGeneratedCards(parsed);
      } else {
        throw new Error("Invalid output structure from AI. Please try again.");
      }
    } catch (err: any) {
      setAiError(err.message || "Failed to generate cards. Please ensure you have entered a valid Gemini API key.");
    } finally {
      setAiLoading(false);
    }
  };

  const handleCommitAICards = () => {
    if (generatedCards.length === 0) return;
    generatedCards.forEach(c => {
      onAddFlashcard({
        front: c.front,
        back: c.back,
        subject: aiSubject,
        box: 1,
        nextReviewDate: new Date().toISOString()
      });
    });
    setGeneratedCards([]);
    setAiTopic('');
    setShowAddForm(false);
  };

  // Multiple JSON Bulk Files Import
  const handleBulkJsonFiles = (files: FileList | File[]) => {
    setJsonError('');
    setJsonSuccess('');
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;

    let filesRead = 0;
    const allImportedCards: Array<{ front: string; back: string; subject?: string }> = [];

    fileArray.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const text = e.target?.result as string;
          const parsed = JSON.parse(text);
          
          let cards: any[] = [];
          if (Array.isArray(parsed)) {
            cards = parsed;
          } else if (parsed.flashcards && Array.isArray(parsed.flashcards)) {
            cards = parsed.flashcards;
          } else if (parsed.cards && Array.isArray(parsed.cards)) {
            cards = parsed.cards;
          } else {
            throw new Error("JSON structure is unrecognised. Ensure it is an array or has a 'flashcards' list.");
          }

          cards.forEach((c: any) => {
            const front = c.front || c.question || c.q || "";
            const back = c.back || c.answer || c.a || c.solution || "";
            const subject = c.subject || c.category || "General";
            if (front && back) {
              allImportedCards.push({ front, back, subject });
            }
          });

          filesRead++;
          if (filesRead === fileArray.length) {
            if (allImportedCards.length > 0) {
              allImportedCards.forEach(c => {
                onAddFlashcard({
                  front: c.front,
                  back: c.back,
                  subject: (c.subject || 'General') as SubjectType,
                  box: 1,
                  nextReviewDate: new Date().toISOString()
                });
              });
              setJsonSuccess(`Successfully bulk imported ${allImportedCards.length} flashcards from ${fileArray.length} files!`);
            } else {
              setJsonError("No valid flashcards found. Objects must contain 'front'/'question' and 'back'/'answer' attributes.");
            }
          }
        } catch (err: any) {
          setJsonError(`Error parsing ${file.name}: ${err.message || 'Invalid format'}`);
        }
      };
      reader.readAsText(file);
    });
  };

  const handleJsonPasteImport = () => {
    setJsonError('');
    setJsonSuccess('');
    if (!jsonPasted.trim()) return;

    try {
      const parsed = JSON.parse(jsonPasted);
      let cards: any[] = [];
      if (Array.isArray(parsed)) {
        cards = parsed;
      } else if (parsed.flashcards && Array.isArray(parsed.flashcards)) {
        cards = parsed.flashcards;
      } else if (parsed.cards && Array.isArray(parsed.cards)) {
        cards = parsed.cards;
      } else {
        throw new Error("Must be an array of flashcards or have a 'flashcards' array attribute.");
      }

      let loaded = 0;
      cards.forEach((c: any) => {
        const front = c.front || c.question || c.q || "";
        const back = c.back || c.answer || c.a || c.solution || "";
        const subject = c.subject || c.category || "General";
        if (front && back) {
          onAddFlashcard({
            front,
            back,
            subject: (subject || 'General') as SubjectType,
            box: 1,
            nextReviewDate: new Date().toISOString()
          });
          loaded++;
        }
      });

      if (loaded > 0) {
        setJsonSuccess(`Successfully imported ${loaded} flashcards from pasted JSON text!`);
        setJsonPasted('');
      } else {
        setJsonError("No valid cards discovered. Use keys 'front' and 'back'.");
      }
    } catch (err: any) {
      setJsonError(`JSON Parse error: ${err.message}`);
    }
  };

  // Calculate box counts
  const getBoxCount = (boxNum: number) => {
    return flashcards.filter(c => c.box === boxNum).length;
  };

  return (
    <div id="leitner_revision_tab" className="space-y-6">
      
      {/* Leitner Dashboard Summary */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-brand-navy/15 pb-4">
        <div>
          <h2 className="font-display text-xl font-bold text-brand-navy">Leitner Active Recall System</h2>
          <p className="text-xs text-brand-slate font-serif">Systematically move complex facts from Box 1 (daily) to Box 5 (permanent long-term memory).</p>
        </div>
        <button
          onClick={() => {
            setShowAddForm(!showAddForm);
            setGeneratedCards([]);
            setJsonSuccess('');
            setJsonError('');
          }}
          className="bg-brand-navy hover:bg-brand-slate text-brand-gold border border-brand-gold px-3.5 py-2 rounded-md text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition self-start sm:self-auto shadow-md"
        >
          <Plus className="w-4 h-4" />
          {showAddForm ? 'Close Drawer' : 'Add Spaced Recall Cards'}
        </button>
      </div>

      {/* Spaced Box Directory */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {BOX_DETAILS.map(box => {
          const count = getBoxCount(box.num);
          return (
            <div key={box.num} className={`p-3 rounded-lg border border-l-4 text-left shadow-2xs ${box.color}`}>
              <h4 className="text-[10px] uppercase tracking-wider font-bold">{box.name}</h4>
              <p className="text-[9px] font-serif italic opacity-75">{box.interval}</p>
              <div className="flex justify-between items-center mt-3 pt-1 border-t border-brand-navy/5">
                <span className="text-[10px] text-gray-500 font-mono">Current Stack</span>
                <span className="bg-brand-navy text-white text-[10px] font-mono font-bold px-2 py-0.5 rounded">
                  {count} Cards
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Spaced Card Add Form Drawer */}
      {showAddForm && (
        <div className="bg-white p-5 rounded-lg border border-brand-navy/10 text-left animate-fade-in shadow-xs space-y-4">
          
          {/* Form Tabs */}
          <div className="flex border-b border-brand-navy/10 pb-0.5 gap-2">
            {[
              { id: 'manual', label: '✍️ Manual creation' },
              { id: 'ai', label: '✨ AI spaced generator' },
              { id: 'json', label: '📁 JSON bulk import' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => {
                  setAddMode(tab.id as any);
                  setJsonSuccess('');
                  setJsonError('');
                  setAiError('');
                }}
                className={`py-2 px-3 text-xs font-bold transition border-b-2 ${
                  addMode === tab.id 
                    ? 'border-brand-gold text-brand-navy font-extrabold' 
                    : 'border-transparent text-brand-slate hover:text-brand-navy'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Mode A: Manual */}
          {addMode === 'manual' && (
            <form onSubmit={handleManualAddCard} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">Front Question / Query Prompt</label>
                  <input 
                    type="text"
                    required
                    className="w-full bg-brand-cream border border-brand-navy/20 rounded p-2 text-xs focus:outline-none focus:ring-1 focus:ring-brand-gold font-semibold text-brand-navy"
                    placeholder="e.g. Which committee recommended the creation of the MPC?"
                    value={newFront}
                    onChange={(e) => setNewFront(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">Subject mapping</label>
                  <select
                    className="w-full bg-brand-cream border border-brand-navy/20 rounded p-2 text-xs focus:outline-none text-brand-navy font-semibold"
                    value={newSubject}
                    onChange={(e) => setNewSubject(e.target.value as SubjectType)}
                  >
                    <option value="Polity">Polity (GS Paper II)</option>
                    <option value="History">History (GS Paper I)</option>
                    <option value="Economy">Economy (GS Paper III)</option>
                    <option value="Geography">Geography (GS Paper I)</option>
                    <option value="Environment">Environment (GS Paper III)</option>
                    <option value="Science & Tech">Science & Tech</option>
                    <option value="General">General (Syllabus Core)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">Back Solution / Key Recall Answer</label>
                <textarea
                  required
                  className="w-full bg-brand-cream border border-brand-navy/20 rounded p-2 text-xs focus:outline-none font-serif text-brand-navy"
                  rows={2}
                  placeholder="Write the precise factual explanation that should be memorized..."
                  value={newBack}
                  onChange={(e) => setNewBack(e.target.value)}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-brand-navy/10">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-3.5 py-1.5 text-xs text-brand-navy hover:bg-brand-cream rounded transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-brand-navy text-brand-gold border border-brand-gold px-4 py-1.5 rounded text-xs font-bold uppercase tracking-wider hover:bg-brand-slate transition"
                >
                  Commit Flashcard
                </button>
              </div>
            </form>
          )}

          {/* Mode B: AI Generation */}
          {addMode === 'ai' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">Topic or Subtopic Area</label>
                  <input 
                    type="text"
                    className="w-full bg-brand-cream border border-brand-navy/20 rounded p-2 text-xs focus:outline-none focus:ring-1 focus:ring-brand-gold font-semibold text-brand-navy"
                    placeholder="e.g. Finance Commission, Basic Structure Doctrine, Article 356"
                    value={aiTopic}
                    onChange={(e) => setAiTopic(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">Paper Subject Mapping</label>
                  <select
                    className="w-full bg-brand-cream border border-brand-navy/20 rounded p-2 text-xs focus:outline-none text-brand-navy font-semibold"
                    value={aiSubject}
                    onChange={(e) => setAiSubject(e.target.value as SubjectType)}
                  >
                    <option value="Polity">Polity (GS Paper II)</option>
                    <option value="History">History (GS Paper I)</option>
                    <option value="Economy">Economy (GS Paper III)</option>
                    <option value="Geography">Geography (GS Paper I)</option>
                    <option value="Environment">Environment (GS Paper III)</option>
                    <option value="Science & Tech">Science & Tech</option>
                    <option value="General">General (Syllabus Core)</option>
                  </select>
                </div>
              </div>

              {aiError && (
                <div className="bg-red-50 text-red-700 text-xs p-3 rounded border border-red-200">
                  {aiError}
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={handleGenerateAICards}
                  disabled={aiLoading || !aiTopic.trim()}
                  className="bg-brand-navy text-brand-gold border border-brand-gold px-5 py-2 rounded text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition hover:bg-brand-slate disabled:opacity-50"
                >
                  {aiLoading ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Creating high-yield recall cards...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Generate Spaced Recall Deck
                    </>
                  )}
                </button>
              </div>

              {/* AI Generated Preview list */}
              {generatedCards.length > 0 && (
                <div className="border border-brand-navy/10 rounded-xl overflow-hidden bg-brand-cream/40 p-4 space-y-3.5">
                  <div className="flex justify-between items-center border-b border-brand-navy/10 pb-2">
                    <span className="text-[10px] uppercase font-bold text-brand-navy font-mono">Generated Deck Preview ({generatedCards.length} Cards)</span>
                    <button
                      onClick={handleCommitAICards}
                      className="bg-[var(--ok)] text-white px-3 py-1 rounded text-[10px] font-bold uppercase hover:opacity-90"
                    >
                      Import to Boxes
                    </button>
                  </div>
                  <div className="divide-y divide-brand-navy/5 max-h-60 overflow-y-auto space-y-2.5">
                    {generatedCards.map((c, idx) => (
                      <div key={idx} className="pt-2 text-xs space-y-1">
                        <p className="font-bold text-brand-navy">Q: {c.front}</p>
                        <p className="font-serif italic text-brand-slate">A: {c.back}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Mode C: JSON Import (Pasted or Multi-file Upload) */}
          {addMode === 'json' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Drag and Drop multiple JSON files */}
                <div className="border-2 border-dashed border-brand-navy/20 hover:border-brand-gold rounded-xl p-5 flex flex-col items-center justify-center text-center space-y-2.5 bg-brand-cream/35">
                  <Upload className="w-8 h-8 text-brand-gold animate-bounce" />
                  <div className="text-xs">
                    <p className="font-bold text-brand-navy">Upload Multiple JSON Files</p>
                    <p className="text-[10px] text-gray-500 font-serif">Select or drag & drop recall lists</p>
                  </div>
                  <input
                    type="file"
                    multiple
                    accept=".json"
                    onChange={(e) => e.target.files && handleBulkJsonFiles(e.target.files)}
                    className="hidden"
                    id="bulk_flash_input"
                  />
                  <label
                    htmlFor="bulk_flash_input"
                    className="bg-brand-navy text-brand-gold px-3 py-1.5 rounded text-[10px] font-bold uppercase cursor-pointer border border-brand-gold hover:bg-brand-slate"
                  >
                    Select Files
                  </label>
                </div>

                {/* Paste RAW JSON text */}
                <div className="space-y-1.5 flex flex-col justify-between">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">Paste Raw JSON Deck Array</label>
                    <textarea
                      rows={5}
                      className="w-full bg-brand-cream border border-brand-navy/20 rounded p-2 text-xs font-mono focus:outline-none"
                      placeholder='[&#10;  { "front": "Q1?", "back": "A1", "subject": "Polity" }&#10;]'
                      value={jsonPasted}
                      onChange={(e) => setJsonPasted(e.target.value)}
                    />
                  </div>
                  <button
                    onClick={handleJsonPasteImport}
                    disabled={!jsonPasted.trim()}
                    className="w-full bg-brand-navy text-brand-gold border border-brand-gold py-2 rounded text-xs font-bold uppercase hover:bg-brand-slate disabled:opacity-50"
                  >
                    Parse & Import Paste
                  </button>
                </div>
              </div>

              {jsonSuccess && (
                <div className="bg-green-50 text-[var(--ok)] text-xs p-3 rounded border border-green-200">
                  {jsonSuccess}
                </div>
              )}

              {jsonError && (
                <div className="bg-red-50 text-red-700 text-xs p-3 rounded border border-red-200">
                  {jsonError}
                </div>
              )}
            </div>
          )}

        </div>
      )}

      {/* Main Spaced Revision Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-left">

        
        {/* Memory Deck Recall Box */}
        <div className="lg:col-span-2 bg-white rounded-lg border border-brand-navy/10 overflow-hidden shadow-sm flex flex-col justify-between min-h-[350px]">
          <div className="bg-brand-navy text-white px-4 py-3.5 border-b-2 border-brand-gold flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-brand-gold" />
              <h3 className="font-display font-bold text-sm text-white uppercase tracking-wider">Scheduled Active Recall Deck</h3>
            </div>
            <span className="text-[10px] bg-brand-slate text-brand-gold border border-brand-gold/30 px-2.5 py-1 rounded font-mono">
              Due Queue: {dueQueue.length}
            </span>
          </div>

          {activeCard ? (
            <div className="p-6 flex-1 flex flex-col justify-center items-center">
              
              {/* Flashcard Animation Container */}
              <div 
                className={`w-full max-w-md min-h-[200px] rounded-xl border-2 p-6 flex flex-col justify-between text-center cursor-pointer transition-all duration-300 transform select-none relative ${
                  isFlipped 
                    ? 'bg-brand-navy border-brand-gold text-white shadow-xl' 
                    : 'bg-brand-cream border-brand-navy/10 hover:border-brand-gold/40 text-brand-navy shadow-sm'
                }`}
                onClick={() => setIsFlipped(!isFlipped)}
              >
                {/* Classical card background patterns */}
                <div className="absolute inset-2 border border-brand-gold/10 rounded-lg pointer-events-none"></div>

                <div>
                  <span className={`text-[9px] uppercase tracking-wider font-mono font-bold px-2 py-0.5 rounded ${
                    isFlipped ? 'bg-brand-gold text-brand-navy' : 'bg-brand-navy text-brand-teal'
                  }`}>
                    {activeCard.subject} • Box {activeCard.box}
                  </span>
                  
                  {activeCard.streak > 0 && (
                    <span className="text-[9px] text-gray-400 font-mono block mt-1.5">
                      🔥 Correct Streak: {activeCard.streak}
                    </span>
                  )}
                </div>

                <div className="py-6 px-4">
                  {!isFlipped ? (
                    <p className="text-sm sm:text-base font-bold font-sans tracking-tight leading-relaxed">
                      {activeCard.front}
                    </p>
                  ) : (
                    <p className="text-xs sm:text-sm font-serif leading-relaxed italic text-gray-200">
                      {activeCard.back}
                    </p>
                  )}
                </div>

                <div className="text-[9px] uppercase tracking-widest font-mono text-gray-400">
                  {isFlipped ? 'Click to view question' : 'Click to flip solution'}
                </div>
              </div>

              {/* Solution evaluator buttons */}
              <div className="w-full max-w-md mt-6 grid grid-cols-2 gap-4 animate-fade-in">
                {!isFlipped ? (
                  <button
                    onClick={() => setIsFlipped(true)}
                    className="col-span-2 bg-brand-navy hover:bg-brand-slate text-brand-gold border border-brand-gold py-3 rounded text-xs font-bold uppercase tracking-wider transition shadow-sm"
                  >
                    Flip and Reveal Fact
                  </button>
                ) : (
                  <>
                    <button
                      onClick={handleDemote}
                      className="bg-red-50 hover:bg-red-100 text-red-700 border border-red-300 py-3 rounded text-xs font-bold uppercase tracking-wider transition flex items-center justify-center gap-1.5"
                    >
                      <X className="w-4 h-4" />
                      Failed Recall
                    </button>
                    <button
                      onClick={handlePromote}
                      className="bg-green-50 hover:bg-green-100 text-green-700 border border-green-300 py-3 rounded text-xs font-bold uppercase tracking-wider transition flex items-center justify-center gap-1.5"
                    >
                      <Check className="w-4 h-4" />
                      Perfect Recall
                    </button>
                  </>
                )}
              </div>

            </div>
          ) : (
            <div className="p-10 text-center space-y-4 my-auto">
              <div className="mx-auto w-16 h-16 bg-green-50 border border-green-400 rounded-full flex items-center justify-center text-green-600 animate-pulse">
                <Trophy className="w-8 h-8" />
              </div>
              <div className="max-w-xs mx-auto">
                <p className="text-sm font-bold text-brand-navy">Review Schedule Cleared!</p>
                <p className="text-xs text-brand-slate font-serif mt-1 leading-relaxed">
                  Congratulations. Your memory cards are completely up to date for all five Leitner boxes. 
                </p>
              </div>
              <p className="text-[11px] text-gray-400 italic">
                Pro-Tip: Visit the <strong>Chapter Reader</strong> and use the AI Drawer "Flashcard Maker" to populate more active recall items dynamically.
              </p>
            </div>
          )}
        </div>

        {/* Full Deck Directory List */}
        <div className="bg-white rounded-lg border border-brand-navy/10 p-5 shadow-sm space-y-4 flex flex-col justify-between">
          <div>
            <h3 className="font-display font-bold text-xs uppercase tracking-wider text-brand-navy border-b border-brand-navy/10 pb-1.5 mb-3">
              Total Flashcards Library ({flashcards.length})
            </h3>

            {flashcards.length === 0 ? (
              <div className="text-center py-12 text-gray-400 italic text-xs">
                Your flashcard deck is empty. Create some manually above or generate them via AI inside the reader!
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                {flashcards.map(card => (
                  <div key={card.id} className="p-2.5 bg-brand-cream border border-brand-navy/5 rounded flex items-start justify-between gap-3 text-left">
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[8px] font-mono font-bold bg-brand-navy text-brand-gold px-1 rounded uppercase shrink-0">
                          {card.subject}
                        </span>
                        <span className="text-[8px] font-mono font-bold bg-brand-slate text-brand-teal px-1 rounded shrink-0">
                          Box {card.box}
                        </span>
                      </div>
                      <p className="text-xs font-bold text-brand-navy line-clamp-1">{card.front}</p>
                      <p className="text-[10px] text-gray-500 font-serif italic line-clamp-1">{card.back}</p>
                    </div>

                    <button
                      onClick={() => onDeleteFlashcard(card.id)}
                      className="text-red-700 hover:bg-red-50 p-1.5 rounded transition shrink-0 border border-transparent hover:border-red-100"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-amber-50 p-3 rounded border border-brand-gold/30 text-[10px] text-amber-900 leading-relaxed space-y-1">
            <p className="font-bold flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5 text-amber-700" />
              Standard Leitner Spaced Intervals:
            </p>
            <p>Cards answered correctly advance by 1 box and are deferred further. Cards failed are immediately demoted back to Box 1 for daily recall practice.</p>
          </div>
        </div>

      </div>

    </div>
  );
}
