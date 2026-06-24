import React, { useState } from 'react';
import { 
  Check, X, HelpCircle, Layers, RefreshCw, Plus, 
  Trash2, AlertCircle, Bookmark, Sparkles, Trophy
} from 'lucide-react';
import { Flashcard, SubjectType } from '../types';

interface LeitnerRevisionTabProps {
  flashcards: Flashcard[];
  onUpdateFlashcard: (card: Flashcard) => void;
  onAddFlashcard: (card: Omit<Flashcard, 'id' | 'createdAt' | 'streak'>) => void;
  onDeleteFlashcard: (id: string) => void;
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
  onDeleteFlashcard
}: LeitnerRevisionTabProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  
  // New card inputs
  const [newFront, setNewFront] = useState('');
  const [newBack, setNewBack] = useState('');
  const [newSubject, setNewSubject] = useState<SubjectType>('Polity');

  // Filter due cards
  const now = new Date();
  const dueQueue = flashcards.filter(card => {
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
          onClick={() => setShowAddForm(!showAddForm)}
          className="bg-brand-navy hover:bg-brand-slate text-brand-gold border border-brand-gold px-3.5 py-2 rounded-md text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition self-start sm:self-auto shadow-md"
        >
          <Plus className="w-4 h-4" />
          {showAddForm ? 'Close Drawer' : 'Create Card'}
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

      {/* Manual Card Form */}
      {showAddForm && (
        <div className="bg-white p-5 rounded-lg border border-brand-navy/10 text-left animate-fade-in shadow-xs">
          <h3 className="font-display font-bold text-xs uppercase tracking-wider text-brand-navy border-b border-brand-navy/10 pb-1.5 mb-3.5">
            Craft Custom Active Recall Card
          </h3>
          <form onSubmit={handleManualAddCard} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">Front Question / Query Prompt</label>
                <input 
                  type="text"
                  required
                  className="w-full bg-brand-cream border border-brand-navy/20 rounded p-2 text-xs focus:outline-none focus:ring-1 focus:ring-brand-gold font-semibold"
                  placeholder="e.g. Which committee recommended the creation of the MPC?"
                  value={newFront}
                  onChange={(e) => setNewFront(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">Subject mapping</label>
                <select
                  className="w-full bg-brand-cream border border-brand-navy/20 rounded p-2 text-xs focus:outline-none"
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
                className="w-full bg-brand-cream border border-brand-navy/20 rounded p-2 text-xs focus:outline-none font-serif"
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
