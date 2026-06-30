import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, Upload, FileText, Search, BookOpen, Clock, Tag, Star, Trash2, 
  MessageSquare, Settings as SettingsIcon, Database, HelpCircle, 
  ChevronRight, ArrowLeft, RefreshCw, AlertCircle, Sparkles, Check, 
  Share2, Key, Award, ExternalLink, Calendar, Layers, Newspaper, ChevronDown
} from 'lucide-react';
import { 
  Article, TopicSummary, AskHistoryEntry, NewspaperMapperSettings, PrelimsTerm,
  SYLLABUS, BROAD_SUBJECTS, autoMap, nextCode, computeAutoLinks, normaliseArticle 
} from '../utils/newspaperMapperUtils';
import { renderFormattedMarkdown } from '../utils/markdown';

export default function NewspaperMapperTab() {
  // --- STATE ---
  const [articles, setArticles] = useState<Article[]>([]);
  const [topicSummaries, setTopicSummaries] = useState<TopicSummary[]>([]);
  const [askHistory, setAskHistory] = useState<AskHistoryEntry[]>([]);
  const [settings, setSettings] = useState<NewspaperMapperSettings>({
    modelDetail: 'gemini-2.5-flash',
    modelAsk: 'gemini-2.5-flash',
    confirmCalls: true,
    maxAskArticles: 20
  });
  const [geminiKey, setGeminiKey] = useState<string>('');
  
  // Navigation
  const [activeSubTab, setActiveSubTab] = useState<string>('today');
  const [selectedArticleCode, setSelectedArticleCode] = useState<string | null>(null);
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);
  const [selectedSummaryId, setSelectedSummaryId] = useState<string | null>(null);
  const [navHistory, setNavHistory] = useState<{ tab: string; articleCode: string | null; topicId: string | null; summaryId: string | null }[]>([]);
  
  // Search & Filtering
  const [codeSearchValue, setCodeSearchValue] = useState<string>('');
  const [archiveFilter, setArchiveFilter] = useState({
    q: '',
    subject: '',
    syllabus: '',
    priority: '',
    starredOnly: false,
    hasNotesOnly: false,
    dateFrom: '',
    dateTo: ''
  });
  const [askFilter, setAskFilter] = useState({
    subject: '',
    syllabus: '',
    onlyStarred: false,
    includeNotes: true
  });
  
  // Import Text Area
  const [importJsonText, setImportJsonText] = useState<string>('');
  const [importDupMode, setImportDupMode] = useState<'skip' | 'add'>('skip');
  const [importDate, setImportDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [importStatus, setImportStatus] = useState<{ type: 'success' | 'error' | 'info' | 'loading'; message: string } | null>(null);
  const [lastExcluded, setLastExcluded] = useState<{ headline: string; page?: number; reason: string }[]>([]);
  const [lastImportMeta, setLastImportMeta] = useState<{ date: string; newspaper: string } | null>(null);
  
  // Interactive Elements
  const [activeTermPopup, setActiveTermPopup] = useState<{ term: string; context: string; wiki: string; x: number; y: number } | null>(null);
  const [generatingArticleCode, setGeneratingArticleCode] = useState<string | null>(null);
  const [generatingSummaryTopicId, setGeneratingSummaryTopicId] = useState<string | null>(null);
  const [askInputValue, setAskInputValue] = useState<string>('');
  const [askingAI, setAskingAI] = useState<boolean>(false);
  
  // Categorized Notes States
  const [newNoteText, setNewNoteText] = useState<string>('');
  const [selectedNoteSection, setSelectedNoteSection] = useState<'statistics' | 'mains' | 'prelims' | 'essay' | 'explore'>('prelims');
  const [notesVaultSection, setNotesVaultSection] = useState<'statistics' | 'mains' | 'prelims' | 'essay' | 'explore'>('prelims');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const backupFileInputRef = useRef<HTMLInputElement>(null);

  // --- STORAGE & LIFECYCLE ---
  useEffect(() => {
    // Load local state
    try {
      const savedArticles = localStorage.getItem('cseguide_nm_articles');
      if (savedArticles) setArticles(JSON.parse(savedArticles));
      
      const savedSummaries = localStorage.getItem('cseguide_nm_summaries');
      if (savedSummaries) setTopicSummaries(JSON.parse(savedSummaries));
      
      const savedHistory = localStorage.getItem('cseguide_nm_ask_history');
      if (savedHistory) setAskHistory(JSON.parse(savedHistory));
      
      const savedSettings = localStorage.getItem('cseguide_nm_settings');
      if (savedSettings) setSettings(JSON.parse(savedSettings));
      
      const savedKey = localStorage.getItem('cseguide_nm_gemini_key');
      if (savedKey) setGeminiKey(savedKey);
    } catch (e) {
      console.error('Failed to load Newspaper Mapper storage:', e);
    }
  }, []);

  const saveArticles = (newArticles: Article[]) => {
    setArticles(newArticles);
    localStorage.setItem('cseguide_nm_articles', JSON.stringify(newArticles));
  };

  const saveSummaries = (newSummaries: TopicSummary[]) => {
    setTopicSummaries(newSummaries);
    localStorage.setItem('cseguide_nm_summaries', JSON.stringify(newSummaries));
  };

  const saveAskHistory = (newHistory: AskHistoryEntry[]) => {
    setAskHistory(newHistory);
    localStorage.setItem('cseguide_nm_ask_history', JSON.stringify(newHistory));
  };

  const saveSettingsObj = (newSettings: NewspaperMapperSettings) => {
    setSettings(newSettings);
    localStorage.setItem('cseguide_nm_settings', JSON.stringify(newSettings));
  };

  const saveGeminiKey = (newKey: string) => {
    setGeminiKey(newKey);
    localStorage.setItem('cseguide_nm_gemini_key', newKey);
  };

  // --- NAVIGATION MANAGER ---
  const navigateTo = (tab: string, articleCode: string | null = null, topicId: string | null = null, summaryId: string | null = null, push: boolean = true) => {
    if (push) {
      setNavHistory(prev => [...prev, { tab: activeSubTab, articleCode: selectedArticleCode, topicId: selectedTopicId, summaryId: selectedSummaryId }]);
    }
    setActiveSubTab(tab);
    setSelectedArticleCode(articleCode);
    setSelectedTopicId(topicId);
    setSelectedSummaryId(summaryId);
    setActiveTermPopup(null);
  };

  const handleGoBack = () => {
    if (navHistory.length === 0) return;
    const previous = navHistory[navHistory.length - 1];
    setNavHistory(prev => prev.slice(0, prev.length - 1));
    setActiveSubTab(previous.tab);
    setSelectedArticleCode(previous.articleCode);
    setSelectedTopicId(previous.topicId);
    setSelectedSummaryId(previous.summaryId);
    setActiveTermPopup(null);
  };

  // --- CODE SEARCH ---
  const handleCodeSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const query = codeSearchValue.trim().toUpperCase();
    if (!query) return;
    const article = articles.find(a => a.code === query || a.id === query);
    if (article) {
      navigateTo('detail', article.code);
    } else {
      alert(`No article found with code or ID: ${query}`);
    }
    setCodeSearchValue('');
  };

  // --- API CALL ENGINE ---
  const callGeminiAPI = async (promptText: string, modelToUse: string, isSilent: boolean = false): Promise<string> => {
    if (!geminiKey) {
      throw new Error('Please save a valid Gemini API key in Settings.');
    }
    if (settings.confirmCalls && !isSilent) {
      const confirmResult = window.confirm(`Initiating Gemini API Call?\n\nModel: ${modelToUse}\nKey: ****${geminiKey.slice(-4)}\n\nClick OK to proceed.`);
      if (!confirmResult) {
        throw new Error('Call cancelled by user.');
      }
    }

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelToUse}:generateContent?key=${geminiKey}`;
    const payload = {
      contents: [{
        role: 'user',
        parts: [{ text: promptText }]
      }],
      generationConfig: {
        temperature: 0.25,
        maxOutputTokens: 8192
      }
    };

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData?.error?.message || `API request failed with status code ${response.status}`);
    }

    const data = await response.json();
    const generatedText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!generatedText) {
      throw new Error('Gemini API returned an empty response. Please verify the prompt context.');
    }
    return generatedText;
  };

  // --- WORKFLOW: EXPORT MARKDOWN REUSABLE ---
  const triggerDownload = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  // --- VIEW RENDER CHUNKS ---

  // 1. DETAIL VIEW
  const renderDetailView = () => {
    const article = articles.find(a => a.code === selectedArticleCode);
    if (!article) return <div className="p-8 text-center text-xs text-[var(--t3)]">Article not found.</div>;

    const matchedSyllabus = article.syllabus_points.map(spId => SYLLABUS.find(s => s.id === spId)).filter(Boolean);
    const allUniqueLinkedCodes = Array.from(new Set([...(article.manual_links || []), ...(article.auto_links || [])]));
    const linkedArticles = allUniqueLinkedCodes.map(lc => articles.find(a => a.code === lc)).filter(Boolean) as Article[];

    const handleUpdatePersonalNotes = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const updated = articles.map(a => a.code === article.code ? { ...a, personal_notes: e.target.value, updated_at: new Date().toISOString() } : a);
      saveArticles(updated);
    };

    const handleAddCategorizedNote = () => {
      if (!newNoteText.trim()) return;
      const updated = articles.map(a => {
        if (a.code === article.code) {
          const sections = a.personal_notes_sections || {};
          const sectionKey = selectedNoteSection;
          const currentList = sections[sectionKey] || [];
          const newNoteItem = {
            id: 'note-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
            text: newNoteText.trim(),
            created_at: new Date().toISOString()
          };
          const updatedSections = {
            ...sections,
            [sectionKey]: [...currentList, newNoteItem]
          };
          return {
            ...a,
            personal_notes_sections: updatedSections,
            updated_at: new Date().toISOString()
          };
        }
        return a;
      });
      saveArticles(updated);
      setNewNoteText('');
    };

    const handleDeleteCategorizedNote = (sectionKey: 'statistics' | 'mains' | 'prelims' | 'essay' | 'explore', noteId: string) => {
      const updated = articles.map(a => {
        if (a.code === article.code) {
          const sections = a.personal_notes_sections || {};
          const currentList = sections[sectionKey] || [];
          const updatedSections = {
            ...sections,
            [sectionKey]: currentList.filter(item => item.id !== noteId)
          };
          return {
            ...a,
            personal_notes_sections: updatedSections,
            updated_at: new Date().toISOString()
          };
        }
        return a;
      });
      saveArticles(updated);
    };

    const handleToggleStarred = () => {
      const updated = articles.map(a => a.code === article.code ? { ...a, starred: !a.starred, updated_at: new Date().toISOString() } : a);
      saveArticles(updated);
    };

    const handleDeleteArticle = () => {
      if (window.confirm(`Are you sure you want to delete article ${article.code}? This cannot be undone.`)) {
        const updated = articles.filter(a => a.code !== article.code);
        saveArticles(updated);
        handleGoBack();
      }
    };

    const handleUpdateRevStatus = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const updated = articles.map(a => a.code === article.code ? { ...a, revision_status: e.target.value as any, updated_at: new Date().toISOString() } : a);
      saveArticles(updated);
    };

    const handleAddManualLink = (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const form = e.currentTarget;
      const input = form.elements.namedItem('linkCode') as HTMLInputElement;
      const targetCode = input.value.trim().toUpperCase();
      if (!targetCode) return;
      if (targetCode === article.code) {
        alert('Cannot link an article to itself.');
        return;
      }
      const targetExists = articles.some(a => a.code === targetCode);
      if (!targetExists) {
        alert(`Article with code ${targetCode} not found.`);
        return;
      }
      if (article.manual_links.includes(targetCode)) {
        alert('Already linked.');
        return;
      }

      const updated = articles.map(a => {
        if (a.code === article.code) {
          return { ...a, manual_links: [...a.manual_links, targetCode], updated_at: new Date().toISOString() };
        }
        // Dual-linking: link target back to source as well
        if (a.code === targetCode && !a.manual_links.includes(article.code)) {
          return { ...a, manual_links: [...a.manual_links, article.code], updated_at: new Date().toISOString() };
        }
        return a;
      });

      saveArticles(updated);
      form.reset();
    };

    const handleRemoveManualLink = (targetCode: string) => {
      const updated = articles.map(a => {
        if (a.code === article.code) {
          return { ...a, manual_links: a.manual_links.filter(c => c !== targetCode), updated_at: new Date().toISOString() };
        }
        if (a.code === targetCode) {
          return { ...a, manual_links: a.manual_links.filter(c => c !== article.code), updated_at: new Date().toISOString() };
        }
        return a;
      });
      saveArticles(updated);
    };

    const handleGenerateNotes = async () => {
      setGeneratingArticleCode(article.code);
      const prompt = `You are generating comprehensive UPSC study notes for a newspaper article.

Article details:
Headline: ${article.headline}
Date: ${article.date}
Newspaper: ${article.newspaper}
Section: ${article.ie_section}
Summary: ${article.quick_summary}
Keywords: ${(article.keywords || []).join(', ')}
Syllabus: ${(article.syllabus_points || []).join(', ')}
${article.source_excerpt ? `Source text: ${article.source_excerpt}` : ''}

Generate comprehensive UPSC notes in this EXACT format:

## ${article.headline}

### 📌 Background
[2-3 paragraphs of static context, history, and previous news relevant to this article. Write what a serious UPSC aspirant needs to know as background knowledge.]

### 📰 What Happened
[Detailed bullet-point narration: event by event, every key figure, institution, date, number, and development mentioned in the article]

### 🎯 Prelims Angle
| Term | What you need to know | Link |
|---|---|---|
| [Every named entity, institution, act, scheme, index, place, treaty] | [Concise UPSC-oriented explanation — what the examiner tests] | [https://en.wikipedia.org/wiki/EXACT_TITLE] |

### 📝 Mains Angle
[2-3 specific GS paper questions this article answers, each with a brief intro-body-conclusion answer framework]

After the notes, on a new line write TERMS_JSON: followed by a JSON array:
[{"term":"...","wiki":"https://en.wikipedia.org/wiki/...","upsc_context":"2-3 line UPSC-relevant explanation"}]`;

      try {
        const responseText = await callGeminiAPI(prompt, settings.modelDetail);
        let markdownContent = responseText;
        let parsedTerms: PrelimsTerm[] = [];

        const termsIndex = responseText.indexOf('TERMS_JSON:');
        if (termsIndex >= 0) {
          markdownContent = responseText.slice(0, termsIndex).trim();
          try {
            parsedTerms = JSON.parse(responseText.slice(termsIndex + 11).trim());
          } catch (err) {
            console.error('Failed to parse dynamic terms JSON:', err);
          }
        }

        const updatedArticles = articles.map(a => {
          if (a.code === article.code) {
            return {
              ...a,
              detail_markdown: markdownContent,
              detail_generated_at: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
              prelims_terms: parsedTerms.length > 0 ? parsedTerms : a.prelims_terms,
              updated_at: new Date().toISOString()
            };
          }
          return a;
        });
        saveArticles(updatedArticles);
      } catch (err: any) {
        alert(err?.message || 'Failed to generate detailed notes.');
      } finally {
        setGeneratingArticleCode(null);
      }
    };

    const handleExportArticle = () => {
      const content = `# [${article.code}] ${article.headline}
**Date:** ${article.date} | **Newspaper:** ${article.newspaper} | **Section:** ${article.ie_section} | **Page:** ${article.page}
**Priority:** ${article.priority} | **Revision Status:** ${article.revision_status}
**Why UPSC Relevant:** ${article.why_relevant}

## Quick Summary
${article.quick_summary}

## Detailed Study Notes
${article.detail_markdown || 'No detailed study notes available.'}

## Personal Study Notes
${article.personal_notes || 'No personal study notes written.'}`;
      triggerDownload(content, `${article.code}.md`);
    };

    return (
      <div className="space-y-6">
        {/* Detail Top Panel */}
        <div className="flex flex-col md:flex-row justify-between items-start gap-4 pb-4 border-b border-[var(--bd)]/40">
          <div className="space-y-2 max-w-3xl">
            <button 
              onClick={handleGoBack}
              className="flex items-center gap-1.5 text-xs font-bold text-[var(--gd)] hover:underline mb-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back
            </button>
            <div className="flex flex-wrap items-center gap-2 text-[10px] font-mono">
              <span className="px-2 py-0.5 bg-[var(--gd)] text-[var(--bg)] font-bold rounded">{article.code}</span>
              <span className="px-2 py-0.5 bg-[var(--ra)] text-[var(--t2)] rounded-full border border-[var(--bd)]/40">{article.ie_section}</span>
              <span className={`px-2 py-0.5 rounded-full font-bold border ${
                article.priority === 'High' ? 'bg-red-500/10 text-red-600 border-red-500/20' :
                article.priority === 'Medium' ? 'bg-amber-500/10 text-amber-600 border-amber-500/20' :
                'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
              }`}>{article.priority} Priority</span>
              <span className="text-[var(--t3)]">{article.newspaper} · Page {article.page} · {article.date}</span>
            </div>
            <h1 className="text-xl md:text-2xl font-serif font-bold text-[var(--t1)] leading-snug">{article.headline}</h1>
            
            {/* Syllabus Badges */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {matchedSyllabus.map(syl => (
                <span 
                  key={syl?.id} 
                  onClick={() => navigateTo('syllabus', null, syl?.id)}
                  className="px-2 py-0.5 bg-[var(--ra)] text-[var(--gd)] border border-[var(--bd)]/60 rounded text-[10px] font-medium font-sans hover:bg-[var(--ra)]/80 transition duration-150 cursor-pointer"
                >
                  {syl?.paper}: {syl?.subject}
                </span>
              ))}
              {article.broad_subjects.map(sub => (
                <span key={sub} className="px-2 py-0.5 bg-blue-500/10 text-blue-600 border border-blue-500/20 rounded text-[10px] font-medium font-sans">
                  {sub}
                </span>
              ))}
            </div>
          </div>

          <div className="flex flex-row md:flex-col gap-2 shrink-0 w-full md:w-auto">
            <button 
              onClick={handleToggleStarred}
              className={`flex-1 md:flex-initial flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-bold font-sans transition duration-150 ${
                article.starred 
                  ? 'bg-amber-500/10 text-amber-600 border-amber-500/30' 
                  : 'bg-[var(--sur)] text-[var(--t2)] border-[var(--bd)]/40 hover:bg-[var(--ra)]'
              }`}
            >
              <Star className={`w-4 h-4 ${article.starred ? 'fill-amber-500 text-amber-500' : ''}`} />
              {article.starred ? 'Starred' : 'Star Article'}
            </button>
            <button 
              onClick={handleExportArticle}
              className="flex-1 md:flex-initial flex items-center justify-center gap-1.5 px-3 py-2 bg-[var(--sur)] text-[var(--t2)] border border-[var(--bd)]/40 rounded-xl text-xs font-bold font-sans hover:bg-[var(--ra)] transition duration-150"
            >
              <FileText className="w-4 h-4 text-[var(--gd)]" />
              Export MD
            </button>
            <button 
              onClick={handleDeleteArticle}
              className="flex-1 md:flex-initial flex items-center justify-center gap-1.5 px-3 py-2 bg-red-500/5 text-red-600 border border-red-500/20 rounded-xl text-xs font-bold font-sans hover:bg-red-500/10 transition duration-150"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
          </div>
        </div>

        {/* Why Relevant Section */}
        {article.why_relevant && (
          <div className="p-4 bg-[var(--ra)]/25 border-l-4 border-[var(--gd)] rounded-r-2xl font-sans">
            <h4 className="text-[10px] font-extrabold text-[var(--gd)] uppercase tracking-wider mb-1">📌 UPSC exam relevance</h4>
            <p className="text-xs text-[var(--t2)] leading-relaxed italic">"{article.why_relevant}"</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Main Study Notes Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Quick Summary Card */}
            {article.quick_summary && (
              <div className="p-5 bg-[var(--sur)] border border-[var(--bd)]/45 rounded-2xl shadow-sm space-y-2.5">
                <h3 className="text-xs font-extrabold text-[var(--t3)] uppercase tracking-wider">Quick Summary</h3>
                <p className="text-xs text-[var(--t1)] leading-relaxed font-serif text-justify">{article.quick_summary}</p>
              </div>
            )}

            {/* Detailed study notes */}
            <div className="p-6 bg-[var(--bg)] border border-[var(--bd)]/50 rounded-2xl shadow-sm space-y-4">
              <div className="flex justify-between items-center pb-3 border-b border-[var(--bd)]/30">
                <div>
                  <h3 className="text-sm font-bold text-[var(--t1)] font-sans uppercase tracking-tight">Detailed Notes</h3>
                  {article.detail_generated_at && (
                    <p className="text-[10px] text-[var(--t3)] font-mono">Status: {article.detail_generated_at}</p>
                  )}
                </div>
                <button
                  onClick={handleGenerateNotes}
                  disabled={generatingArticleCode !== null}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--gd)] text-[var(--bg)] rounded-xl text-xs font-bold font-sans hover:bg-[var(--gd2)] disabled:opacity-50 transition duration-150 shrink-0"
                >
                  <Sparkles className="w-3.5 h-3.5 text-white" />
                  {generatingArticleCode === article.code ? 'Generating...' : article.detail_markdown ? 'Regenerate Notes' : 'Generate Notes'}
                </button>
              </div>

              <div className="prose max-w-none">
                {article.detail_markdown ? (
                  <div className="space-y-4">
                    {renderFormattedMarkdown(article.detail_markdown)}
                  </div>
                ) : (
                  <div className="text-center py-10 space-y-3 font-sans">
                    <Sparkles className="w-8 h-8 text-[var(--gd)] mx-auto animate-pulse" />
                    <p className="text-xs text-[var(--t2)] font-medium max-w-sm mx-auto">
                      No analytical study notes compiled yet. Click the button above to query Gemini for detailed static context, Prelims facts, and Mains answers.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Source excerpt if available */}
            {article.source_excerpt && (
              <div className="p-4 bg-[var(--ra)]/15 border border-[var(--bd)]/30 rounded-2xl">
                <h4 className="text-[10px] font-extrabold text-[var(--t3)] uppercase tracking-wider mb-2">Original Source Quote</h4>
                <p className="text-xs text-[var(--t2)] italic font-serif leading-relaxed">"{article.source_excerpt}"</p>
              </div>
            )}
          </div>

          {/* Right Sidebar Interactive Actions */}
          <div className="space-y-6">
            {/* Revision Status & Personal Notes */}
            <div className="p-5 bg-[var(--sur)] border border-[var(--bd)]/45 rounded-2xl space-y-4 shadow-sm font-sans">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-extrabold text-[var(--t3)] uppercase tracking-wider">Personal Study Planner</h3>
                <span className="px-1.5 py-0.5 bg-[var(--gd)]/10 text-[var(--gd)] rounded text-[9px] font-bold uppercase tracking-wider">Notes Organizer</span>
              </div>
              
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-[var(--t2)] uppercase tracking-wider">Revision Category</label>
                <select 
                  value={article.revision_status} 
                  onChange={handleUpdateRevStatus}
                  className="w-full p-2.5 text-xs rounded-xl bg-[var(--bg)] border border-[var(--bd)] text-[var(--t1)] font-medium focus:ring-1 focus:ring-[var(--gd)] focus:border-[var(--gd)] outline-none"
                >
                  <option value="new">🆕 New / Unread</option>
                  <option value="read">📖 Read & Synced</option>
                  <option value="revise-later">⏳ Revise Later</option>
                  <option value="use-prelims">📚 Use in Prelims</option>
                  <option value="use-mains">📝 Use in Mains (GS)</option>
                  <option value="use-essay">💡 Use in Essay Paper</option>
                  <option value="done">✅ Done / Memorized</option>
                </select>
              </div>

              {/* Add Categorized Note Section */}
              <div className="space-y-3 pt-2 border-t border-[var(--bd)]/20">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-[var(--t2)] uppercase tracking-wider flex items-center justify-between">
                    <span>My Notes & Pointers</span>
                    {newNoteText.trim().length > 0 && (
                      <span className="text-[9px] text-[var(--gd)] font-medium">Ready...</span>
                    )}
                  </label>
                  <textarea 
                    value={newNoteText}
                    onChange={(e) => setNewNoteText(e.target.value)}
                    placeholder="Type or paste high-yield stats, key quotes, mains facts, or prelims points here..."
                    rows={4}
                    className="w-full p-2.5 text-xs rounded-xl bg-[var(--bg)] border border-[var(--bd)] text-[var(--t1)] leading-relaxed focus:ring-1 focus:ring-[var(--gd)] focus:border-[var(--gd)] outline-none resize-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-[var(--t2)] uppercase tracking-wider">Select Note Section</label>
                  <select 
                    value={selectedNoteSection} 
                    onChange={(e) => setSelectedNoteSection(e.target.value as any)}
                    className="w-full p-2.5 text-xs rounded-xl bg-[var(--bg)] border border-[var(--bd)] text-[var(--t1)] font-medium focus:ring-1 focus:ring-[var(--gd)] focus:border-[var(--gd)] outline-none"
                  >
                    <option value="statistics">📊 Important Statistic</option>
                    <option value="mains">📝 Important for Mains</option>
                    <option value="prelims">🔍 Important for Prelims</option>
                    <option value="essay">💡 Essay</option>
                    <option value="explore">🌐 Read/Explore more</option>
                  </select>
                </div>

                <button
                  type="button"
                  onClick={handleAddCategorizedNote}
                  disabled={!newNoteText.trim()}
                  className="w-full py-2 bg-[var(--gd)] text-white hover:bg-[var(--gd2)] disabled:opacity-40 rounded-xl text-xs font-bold font-sans transition duration-150 shadow-sm flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add to Notes
                </button>
              </div>

              {/* Display existing categorized notes for this article */}
              {article.personal_notes_sections && (
                (article.personal_notes_sections.statistics?.length || 0) > 0 ||
                (article.personal_notes_sections.mains?.length || 0) > 0 ||
                (article.personal_notes_sections.prelims?.length || 0) > 0 ||
                (article.personal_notes_sections.essay?.length || 0) > 0 ||
                (article.personal_notes_sections.explore?.length || 0) > 0
              ) && (
                <div className="space-y-2.5 pt-3 border-t border-[var(--bd)]/20">
                  <h4 className="text-[10px] font-extrabold text-[var(--t3)] uppercase tracking-wider">Added Study Nuggets</h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1 scrollbar-thin">
                    {(['statistics', 'mains', 'prelims', 'essay', 'explore'] as const).map(sec => {
                      const list = article.personal_notes_sections?.[sec] || [];
                      if (list.length === 0) return null;
                      const secLabel = sec === 'statistics' ? '📊 Statistic' :
                                       sec === 'mains' ? '📝 Mains' :
                                       sec === 'prelims' ? '🔍 Prelims' :
                                       sec === 'essay' ? '💡 Essay' : '🌐 Explore';
                      return (
                        <div key={sec} className="space-y-1 bg-[var(--bg)]/40 p-2 rounded-xl border border-[var(--bd)]/25">
                          <span className="text-[9px] font-bold text-[var(--gd)] uppercase tracking-wide">{secLabel}</span>
                          <ul className="space-y-1">
                            {list.map(item => (
                              <li key={item.id} className="text-[10px] text-[var(--t2)] pl-2 border-l-2 border-[var(--gd)]/40 flex justify-between items-start gap-1">
                                <span className="flex-1 whitespace-pre-wrap text-left">{item.text}</span>
                                <button 
                                  onClick={() => handleDeleteCategorizedNote(sec, item.id)}
                                  className="text-red-500 hover:text-red-600 font-bold p-0.5 ml-1 shrink-0"
                                  title="Delete Note"
                                >
                                  ✕
                                </button>
                              </li>
                            ))}
                          </ul>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Quick Scratchpad / Custom Notes text area */}
              <div className="space-y-1.5 pt-3 border-t border-[var(--bd)]/20">
                <label className="text-[10px] font-bold text-[var(--t3)] uppercase tracking-wider">General Notes Scratchpad (Auto-saves)</label>
                <textarea 
                  value={article.personal_notes}
                  onChange={handleUpdatePersonalNotes}
                  placeholder="Draft general thoughts or temporary ideas..."
                  rows={2}
                  className="w-full p-2 text-xs rounded-xl bg-[var(--bg)] border border-[var(--bd)]/30 text-[var(--t2)] leading-relaxed focus:ring-1 focus:ring-[var(--gd)] outline-none resize-none"
                />
              </div>
            </div>

            {/* Glossary terms / Prelims Terms */}
            {article.prelims_terms && article.prelims_terms.length > 0 && (
              <div className="p-5 bg-[var(--sur)] border border-[var(--bd)]/45 rounded-2xl space-y-3.5 shadow-sm font-sans">
                <h3 className="text-xs font-extrabold text-[var(--t3)] uppercase tracking-wider">Glossary Terms ({article.prelims_terms.length})</h3>
                <div className="flex flex-wrap gap-1.5">
                  {article.prelims_terms.map(pt => (
                    <button
                      key={pt.term}
                      onClick={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        setActiveTermPopup({
                          term: pt.term,
                          context: pt.upsc_context || 'Prelims terminology. Read more on Wikipedia or ask AI.',
                          wiki: pt.wiki || `https://en.wikipedia.org/wiki/${encodeURIComponent(pt.term)}`,
                          x: rect.left + window.scrollX,
                          y: rect.top + window.scrollY
                        });
                      }}
                      className="px-2 py-1 bg-[var(--bg)] text-[var(--t1)] border border-[var(--bd)] hover:border-[var(--gd)] hover:text-[var(--gd)] rounded-xl text-xs font-medium font-sans flex items-center gap-1 transition duration-150"
                    >
                      <span>{pt.term}</span>
                      <Search className="w-2.5 h-2.5 opacity-55" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Linked / Related Articles */}
            <div className="p-5 bg-[var(--sur)] border border-[var(--bd)]/45 rounded-2xl space-y-4 shadow-sm font-sans">
              <h3 className="text-xs font-extrabold text-[var(--t3)] uppercase tracking-wider">Study Links</h3>

              {/* Add Link Form */}
              <form onSubmit={handleAddManualLink} className="flex gap-2">
                <input 
                  name="linkCode" 
                  type="text" 
                  placeholder="Code: NM-20260629-001" 
                  className="flex-1 p-2 text-xs rounded-xl bg-[var(--bg)] border border-[var(--bd)] text-[var(--t1)] uppercase focus:ring-1 focus:ring-[var(--gd)] outline-none"
                />
                <button type="submit" className="px-3 bg-[var(--gd)] text-white text-xs font-bold rounded-xl hover:bg-[var(--gd2)] transition duration-150">
                  Link
                </button>
              </form>

              {/* List */}
              <div className="space-y-2">
                {linkedArticles.length > 0 ? (
                  linkedArticles.map(la => (
                    <div 
                      key={la.code}
                      onClick={() => navigateTo('detail', la.code)}
                      className="group p-2.5 bg-[var(--bg)] border border-[var(--bd)]/50 rounded-xl hover:border-[var(--gd)] transition duration-150 cursor-pointer flex items-start gap-2"
                    >
                      <span className="text-[9px] font-mono font-bold px-1 py-0.5 bg-[var(--ra)] text-[var(--gd)] rounded shrink-0">{la.code}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-serif font-bold text-[var(--t1)] truncate group-hover:text-[var(--gd)] transition duration-150">{la.headline}</p>
                        <p className="text-[9px] text-[var(--t3)]">{la.date}</p>
                      </div>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveManualLink(la.code);
                        }}
                        className="text-[var(--t3)] hover:text-red-500 opacity-0 group-hover:opacity-100 transition duration-150 p-1"
                        title="Remove Link"
                      >
                        ✕
                      </button>
                    </div>
                  ))
                ) : (
                  <p className="text-[10px] text-[var(--t3)] italic text-center py-2">No related articles linked. Enter a code above to dual-link.</p>
                )}
              </div>
            </div>

            {/* Ask AI Trigger */}
            <div className="p-4 bg-[var(--gd)]/5 border border-[var(--gd)]/20 rounded-2xl space-y-2 font-sans">
              <h4 className="text-[10px] font-extrabold text-[var(--gd)] uppercase tracking-wider">🤖 Contextual AI Queries</h4>
              <p className="text-xs text-[var(--t2)]">Need an instant Mains answer framework or list of analytical core themes specifically using this article's study notes?</p>
              <div className="flex flex-col gap-1.5 pt-1">
                <button 
                  onClick={() => navigateTo('ask', null, null, null, true)}
                  className="w-full text-left p-2 rounded-xl bg-[var(--bg)] hover:bg-[var(--ra)] border border-[var(--bd)] text-xs text-[var(--t1)] font-semibold flex items-center justify-between"
                >
                  <span>Mains answer outline...</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
                <button 
                  onClick={() => {
                    navigateTo('ask', null, null, null, true);
                    setAskInputValue(`Draft a detailed UPSC GS Mains answer outline answering: "How does the Supreme Court decision in '${article.headline}' expand or affect governance regimes in India?" Cite claims using [${article.code}].`);
                  }}
                  className="w-full text-left p-2 rounded-xl bg-[var(--bg)] hover:bg-[var(--ra)] border border-[var(--bd)] text-xs text-[var(--t1)] font-semibold flex items-center justify-between"
                >
                  <span>Analyse constitutional angles...</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // 2. IMPORT VIEW
  const renderImportView = () => {
    const handleLoadDemo = () => {
      const demoData = {
        newspaper_date: new Date().toISOString().slice(0, 10),
        newspaper_name: "Indian Express",
        articles: [
          {
            headline: "Supreme Court holds right to walk on safe footpaths is a fundamental right",
            page: 11,
            ie_section: "Nation",
            quick_summary: "The Supreme Court declared that the right to walk on demarcated footpaths is a fundamental right under Part III of the Constitution, deriving from Article 21. The bench directed urban development authorities, municipal corporations, and panchayats to build and maintain pedestrian infrastructure. The ruling arose from a motor accident case involving a child killed while walking to school.",
            why_relevant: "Classic SC Article 21 expansion — essential GS2 Polity and social justice. Tests knowledge of judicial review, FR scope, and urban governance.",
            priority: "High",
            broad_subjects: ["Polity & Governance", "Society & Social Justice"],
            syllabus_points: ["gs2-constitution", "gs2-socialjustice", "pre-polity"],
            keywords: ["Supreme Court", "Article 21", "fundamental rights", "footpaths", "pedestrian safety", "municipalities", "urban governance"],
            cluster_theme: "",
            is_satellite: false,
            detail_markdown: `## Supreme Court holds right to walk on safe footpaths is a fundamental right

### 📌 Background
The Supreme Court of India has a long tradition of expanding the scope of Article 21 (Right to Life and Personal Liberty) beyond its literal text. The landmark *Maneka Gandhi v Union of India* (1978) held that the procedure under Article 21 must be fair, just, and reasonable — opening the door to a broad reading. Subsequently, the Court has derived rights to livelihood, health, education, clean environment, and dignity from Article 21.

### 📰 What Happened
- A bench of Justices PS Narasimha and Atul S Chandurkar delivered the ruling.
- Court declared the right to walk on safe, demarcated footpaths is a **fundamental right under Part III** of the Constitution.
- The right derives from Article 21 (Right to Life) — read expansively.
- Duty-bearers identified: urban development authorities, municipal corporations, municipalities, and panchayats.

### 🎯 Prelims Angle
| Term | What you need to know | Link |
|---|---|---|
| Article 21 | Right to Life and Personal Liberty — most expansively interpreted FR. | [Wiki](https://en.wikipedia.org/wiki/Article_21_of_the_Constitution_of_India) |
| Maneka Gandhi | 1978 SC landmark. Held procedure under Art 21 must be fair, just, reasonable. | [Wiki](https://en.wikipedia.org/wiki/Maneka_Gandhi_v._Union_of_India) |

### 📝 Mains Angle
**Q1 [GS2]: The Supreme Court has consistently expanded the scope of fundamental rights. Examine the judicial evolution of Article 21.**
- Intro: Article 21 as the most dynamic fundamental right.
- Body: Trajectory from Maneka Gandhi to modern infrastructure rights.`,
            prelims_terms: [
              { term: "Article 21", upsc_context: "Right to Life and Personal Liberty. SC has derived dozen of rights from it.", wiki: "https://en.wikipedia.org/wiki/Article_21_of_the_Constitution_of_India" },
              { term: "Maneka Gandhi case", upsc_context: "1978 SC landmark that introduced substantive due process concepts to Indian law.", wiki: "https://en.wikipedia.org/wiki/Maneka_Gandhi_v._Union_of_India" }
            ]
          },
          {
            headline: "The key hurdle to climate targets: Electrification",
            page: 16,
            ie_section: "Explained",
            quick_summary: "The Bonn mid-year UNFCCC climate talks proposed that countries meet at least one-third of energy needs from electricity by 2035. Currently only 20% of global final energy consumption is electricity, mostly from fossil fuels. The article explains why electrification — not just renewable capacity — is the core metric for decarbonisation, and why hard-to-electrify sectors like steel and shipping remain a challenge.",
            why_relevant: "GS3 Environment — climate negotiations, electrification targets, energy transition. Also GS2 IR for understanding UNFCCC processes before COP31.",
            priority: "High",
            broad_subjects: ["Environment", "Science & Technology"],
            syllabus_points: ["gs3-env", "gs3-infra", "pre-env", "gs2-ir"],
            keywords: ["COP31", "UNFCCC", "electrification", "Bonn", "climate targets", "renewables", "net zero"],
            cluster_theme: "electrification-transition",
            is_satellite: false,
            detail_markdown: `## The key hurdle to climate targets: Electrification

### 📌 Background
The global climate framework centres on the UNFCCC (1992) and the Paris Agreement (2015). COP31 will be hosted jointly by Turkey and Australia in Antalya, November 2026.

### 📰 What Happened
- Bonn SB62 talks ended with technical proposals.
- **Turkey proposed a global target:** all countries should derive at least **one-third of energy needs from electricity by 2035**.

### 🎯 Prelims Angle
| Term | What you need to know | Link |
|---|---|---|
| COP31 | 31st Conference of Parties to UNFCCC in Antalya, November 2026. | [Wiki](https://en.wikipedia.org/wiki/2026_United_Nations_Climate_Change_Conference) |
| UNFCCC | UN Framework Convention on Climate Change (1992). | [Wiki](https://en.wikipedia.org/wiki/United_Nations_Framework_Convention_of_Climate_Change) |`,
            prelims_terms: [
              { term: "COP31", upsc_context: "31st UNFCCC Conference of Parties. Antalya, 2026.", wiki: "https://en.wikipedia.org/wiki/2026_United_Nations_Climate_Change_Conference" },
              { term: "UNFCCC", upsc_context: "United Nations Framework Convention on Climate Change (1992).", wiki: "https://en.wikipedia.org/wiki/United_Nations_Framework_Convention_on_Climate_Change" }
            ]
          }
        ],
        excluded: [
          { headline: "Grammys learn to listen to the world", page: 14, reason: "Culture/music awards — no UPSC angle" },
          { headline: "FIFA match results", page: 18, reason: "Pure sports — no governance angle" }
        ]
      };
      setImportJsonText(JSON.stringify(demoData, null, 2));
      setImportStatus({ type: 'info', message: 'Demo JSON report loaded. Click "Import into Archive" to commit.' });
    };

    const handleImportJson = () => {
      let rawText = importJsonText.trim();
      if (!rawText) {
        setImportStatus({ type: 'error', message: 'JSON source content is empty.' });
        return;
      }

      // Strip markdown code fences if present
      if (rawText.startsWith('```')) {
        rawText = rawText.replace(/^```[a-zA-Z]*\n/g, '').replace(/\n```$/g, '');
      }
      rawText = rawText.trim();

      try {
        const parsed = JSON.parse(rawText);
        let parsedArticles: any[] = [];
        let topExcl: any[] = [];
        let paperDate = importDate;
        let paperNewspaper = "Indian Express";

        if (Array.isArray(parsed)) {
          parsedArticles = parsed;
        } else {
          parsedArticles = parsed.articles || parsed.items || [];
          topExcl = parsed.excluded || [];
          if (parsed.newspaper_date) paperDate = parsed.newspaper_date;
          if (parsed.newspaper_name || parsed.paper) {
            paperNewspaper = parsed.newspaper_name || parsed.paper;
          }
        }

        if (parsedArticles.length === 0) {
          throw new Error('No articles found in JSON array or objects.');
        }

        const paperId = `P-${paperDate.replace(/\D/g, '')}-${Date.now()}`;
        const importMetadata = { date: paperDate, newspaper: paperNewspaper, paperId };

        const duplicatesSet = new Set(articles.map(a => `${a.headline.toLowerCase().trim()}_${a.date}`));

        let addedCount = 0;
        let skippedCount = 0;
        const newBatch: Article[] = [];

        parsedArticles.forEach(raw => {
          const sig = `${(raw.headline || raw.title || '').toLowerCase().trim()}_${paperDate}`;
          if (importDupMode === 'skip' && duplicatesSet.has(sig)) {
            skippedCount++;
            return;
          }

          const normed = normaliseArticle(raw, importMetadata, [...newBatch, ...articles]);
          newBatch.push(normed);
          addedCount++;
        });

        // Compute auto-links for the new articles and save
        const combinedList = [...newBatch, ...articles];
        const linkedBatch = newBatch.map(art => ({
          ...art,
          auto_links: computeAutoLinks(art, combinedList)
        }));

        const finalArticlesList = [...linkedBatch, ...articles];
        saveArticles(finalArticlesList);

        // Store exclusion log
        setLastExcluded(topExcl);
        setLastImportMeta({ date: paperDate, newspaper: paperNewspaper });

        setImportStatus({
          type: 'success',
          message: `Successfully imported ${addedCount} articles.${skippedCount > 0 ? ` Skipped ${skippedCount} duplicate articles.` : ''}`
        });

        setImportJsonText('');
        setTimeout(() => navigateTo('today'), 1500);
      } catch (err: any) {
        setImportStatus({ type: 'error', message: `Parse Error: ${err?.message || 'Invalid JSON format.'}` });
      }
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setImportStatus({ type: 'loading', message: `Reading JSON file: ${file.name}` });
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        setImportJsonText(text);
        setImportStatus({ type: 'info', message: `Loaded file: ${file.name} (${Math.round(text.length / 1024)} KB). Click Import below.` });
      };
      reader.onerror = () => {
        setImportStatus({ type: 'error', message: 'Failed to read file contents.' });
      };
      reader.readAsText(file);
    };

    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 font-sans">
        <div className="lg:col-span-2 space-y-4">
          <div className="p-6 bg-[var(--sur)] border border-[var(--bd)]/45 rounded-2xl shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-[var(--t1)] uppercase tracking-tight">📥 Paste Daily Claude / ChatGPT Extraction</h2>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-[var(--t2)] uppercase tracking-wider">Newspaper Date</label>
                <input 
                  type="date" 
                  value={importDate} 
                  onChange={(e) => setImportDate(e.target.value)}
                  className="w-full p-2.5 text-xs bg-[var(--bg)] border border-[var(--bd)] text-[var(--t1)] rounded-xl outline-none"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-[var(--t2)] uppercase tracking-wider">Duplicate Handling</label>
                <select 
                  value={importDupMode} 
                  onChange={(e) => setImportDupMode(e.target.value as any)}
                  className="w-full p-2.5 text-xs bg-[var(--bg)] border border-[var(--bd)] text-[var(--t1)] rounded-xl outline-none"
                >
                  <option value="skip">Skip duplicates</option>
                  <option value="add">Import anyway</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-bold text-[var(--t2)] uppercase tracking-wider">JSON Report</label>
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs text-[var(--gd)] font-bold hover:underline"
                >
                  Upload JSON File
                </button>
                <input 
                  ref={fileInputRef} 
                  type="file" 
                  accept=".json" 
                  onChange={handleFileUpload} 
                  className="hidden" 
                />
              </div>
              <textarea 
                value={importJsonText}
                onChange={(e) => setImportJsonText(e.target.value)}
                placeholder='{"newspaper_date": "YYYY-MM-DD", "newspaper_name": "Indian Express", "articles": [...] }'
                rows={12}
                className="w-full p-3 font-mono text-[10px] rounded-xl bg-[var(--bg)] border border-[var(--bd)] text-[var(--t1)] leading-relaxed focus:ring-1 focus:ring-[var(--gd)] outline-none"
              />
            </div>

            {importStatus && (
              <div className={`p-3.5 rounded-xl border flex items-start gap-2.5 text-xs ${
                importStatus.type === 'error' ? 'bg-red-500/10 text-red-600 border-red-500/20' :
                importStatus.type === 'success' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' :
                'bg-blue-500/10 text-blue-600 border-blue-500/20'
              }`}>
                {importStatus.type === 'loading' && <RefreshCw className="w-4 h-4 shrink-0 animate-spin mt-0.5" />}
                {importStatus.type === 'error' && <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />}
                <p>{importStatus.message}</p>
              </div>
            )}

            <div className="flex flex-wrap gap-2 pt-2">
              <button 
                onClick={handleImportJson}
                className="px-4 py-2 bg-[var(--gd)] hover:bg-[var(--gd2)] text-white text-xs font-bold font-sans rounded-xl transition duration-150"
              >
                Import into Archive
              </button>
              <button 
                onClick={handleLoadDemo}
                className="px-4 py-2 bg-[var(--ra)] hover:bg-[var(--ra)]/80 text-[var(--t1)] border border-[var(--bd)] text-xs font-bold font-sans rounded-xl transition duration-150"
              >
                Load Demo Data
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="p-5 bg-[var(--sur)] border border-[var(--bd)]/45 rounded-2xl shadow-sm space-y-3">
            <h3 className="text-xs font-extrabold text-[var(--t3)] uppercase tracking-wider">PDF Extraction Prompt</h3>
            <p className="text-xs text-[var(--t2)] leading-relaxed">
              Newspaper Mapper is designed to consume structured output from LLMs like Claude or GPT. Open your Indian Express PDF in an AI Chat, paste our prompt, and import the JSON result on the left.
            </p>
            <button 
              onClick={() => {
                navigator.clipboard.writeText(`You are an expert UPSC paper extractor. Map daily newspaper PDF into structure. Output strict JSON array.`);
                alert('Prompt boilerplate copied to clipboard!');
              }}
              className="w-full py-2 bg-[var(--ra)] text-xs font-bold text-[var(--gd)] rounded-xl border border-[var(--bd)]/50 hover:bg-[var(--ra)]/80 transition duration-150"
            >
              Copy Claude Prompt Template
            </button>
          </div>

          {/* Excluded Panel */}
          {lastExcluded.length > 0 && lastImportMeta && (
            <div className="p-5 bg-[var(--sur)] border border-[var(--bd)]/45 rounded-2xl shadow-sm space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-extrabold text-[var(--t3)] uppercase tracking-wider">Excluded from {lastImportMeta.date}</h3>
                <span className="text-[9px] font-mono px-1.5 py-0.5 bg-[var(--ra)] text-[var(--t3)] rounded">{lastExcluded.length} items</span>
              </div>
              <div className="divide-y divide-[var(--bd)]/30 max-h-60 overflow-y-auto pr-1">
                {lastExcluded.map((exc, idx) => (
                  <div key={idx} className="py-2.5 text-left flex justify-between items-start gap-2">
                    <div>
                      <p className="text-xs font-serif font-bold text-[var(--t1)]">{exc.headline}</p>
                      <p className="text-[10px] text-[var(--t3)]">Page {exc.page || '?'} · {exc.reason}</p>
                    </div>
                    <button
                      onClick={() => {
                        const manuallyAdded = normaliseArticle({
                          headline: exc.headline,
                          page: exc.page || 1,
                          quick_summary: exc.reason,
                          priority: 'Low',
                          why_relevant: 'Manually added from exclusions log.'
                        }, { date: lastImportMeta.date, newspaper: lastImportMeta.newspaper, paperId: '' }, articles);

                        saveArticles([manuallyAdded, ...articles]);
                        setLastExcluded(prev => prev.filter((_, i) => i !== idx));
                      }}
                      className="px-2 py-1 bg-[var(--ra)] text-[var(--gd)] border border-[var(--bd)] text-[9px] font-bold rounded-xl hover:bg-[var(--gd)] hover:text-white transition duration-150 shrink-0"
                    >
                      + Add
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  // 3. TODAY VIEW
  const renderTodayView = () => {
    const todayStr = new Date().toISOString().slice(0, 10);
    // Find articles from today, or if empty, the most recent date available
    let displayedDate = todayStr;
    let todayArticles = articles.filter(a => a.date === todayStr);

    if (todayArticles.length === 0 && articles.length > 0) {
      const dates = articles.map(a => a.date).sort((a, b) => b.localeCompare(a));
      displayedDate = dates[0];
      todayArticles = articles.filter(a => a.date === displayedDate);
    }

    const sections = ['Editorial', 'Explained', 'Front Page', 'Economy', 'Ideas', 'General'];
    const grouped: Record<string, Article[]> = {};
    sections.forEach(s => grouped[s] = []);
    
    todayArticles.forEach(a => {
      const isCustomSection = sections.includes(a.ie_section);
      if (isCustomSection) {
        grouped[a.ie_section].push(a);
      } else {
        grouped['General'].push(a);
      }
    });

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center flex-wrap gap-4 border-b border-[var(--bd)]/30 pb-3">
          <div>
            <h2 className="text-lg font-serif font-bold text-[var(--t1)]">📰 Study Shelf: {displayedDate}</h2>
            <p className="text-xs text-[var(--t3)] font-sans">{todayArticles.length} notable analysis pieces archived</p>
          </div>
          <button 
            onClick={() => navigateTo('import')}
            className="px-3.5 py-1.5 bg-[var(--gd)] text-[var(--bg)] rounded-xl text-xs font-bold font-sans hover:bg-[var(--gd2)] transition duration-150 shrink-0"
          >
            📥 Import Daily Extraction
          </button>
        </div>

        {todayArticles.length === 0 ? (
          <div className="text-center py-16 space-y-4 max-w-sm mx-auto font-sans">
            <Newspaper className="w-12 h-12 text-[var(--gd)] mx-auto opacity-45" />
            <h3 className="text-sm font-bold text-[var(--t1)]">Study Archive is Empty</h3>
            <p className="text-xs text-[var(--t3)]">No analysis files found in storage. Switch to the Import tab to import daily analyses or load high-fidelity UPSC demo files.</p>
            <button 
              onClick={() => navigateTo('import')}
              className="px-4 py-2 bg-[var(--ra)] border border-[var(--bd)] text-xs font-bold text-[var(--gd)] rounded-xl"
            >
              Go to Import Center
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {sections.map(section => {
              const artsInSection = grouped[section] || [];
              if (artsInSection.length === 0) return null;
              return (
                <div key={section} className="space-y-3 font-sans">
                  <h3 className="text-xs font-extrabold text-[var(--gd)] uppercase tracking-wider border-b border-[var(--bd)]/30 pb-1 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-[var(--gd)] shrink-0" />
                    {section} Section ({artsInSection.length})
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {artsInSection.map(art => (
                      <ArticleCard key={art.code} article={art} onSelectArticle={(code) => navigateTo('detail', code)} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  // 4. ARCHIVE VIEW
  const renderArchiveView = () => {
    let filtered = [...articles];
    const q = archiveFilter.q.toLowerCase().trim();
    if (q) {
      filtered = filtered.filter(a => 
        a.headline.toLowerCase().includes(q) || 
        a.quick_summary.toLowerCase().includes(q) ||
        a.detail_markdown.toLowerCase().includes(q) ||
        a.personal_notes.toLowerCase().includes(q) ||
        a.code.toLowerCase().includes(q) ||
        a.keywords.some(k => k.toLowerCase().includes(q))
      );
    }
    if (archiveFilter.subject) {
      filtered = filtered.filter(a => a.broad_subjects.includes(archiveFilter.subject));
    }
    if (archiveFilter.syllabus) {
      filtered = filtered.filter(a => a.syllabus_points.includes(archiveFilter.syllabus));
    }
    if (archiveFilter.priority) {
      filtered = filtered.filter(a => a.priority === archiveFilter.priority);
    }
    if (archiveFilter.starredOnly) {
      filtered = filtered.filter(a => a.starred);
    }
    if (archiveFilter.hasNotesOnly) {
      filtered = filtered.filter(a => a.personal_notes.trim().length > 0 || a.detail_markdown.trim().length > 0);
    }
    if (archiveFilter.dateFrom) {
      filtered = filtered.filter(a => a.date >= archiveFilter.dateFrom);
    }
    if (archiveFilter.dateTo) {
      filtered = filtered.filter(a => a.date <= archiveFilter.dateTo);
    }

    // Sort descending by date, then code
    filtered.sort((a, b) => b.date.localeCompare(a.date) || b.code.localeCompare(a.code));

    return (
      <div className="space-y-5 font-sans">
        {/* Search and Filters Bar */}
        <div className="p-4 bg-[var(--sur)] border border-[var(--bd)]/45 rounded-2xl shadow-sm space-y-3.5">
          <div className="flex gap-2">
            <div className="flex-1 bg-[var(--bg)] border border-[var(--bd)] rounded-xl px-3 py-2 flex items-center gap-2">
              <Search className="w-4 h-4 text-[var(--t3)]" />
              <input 
                type="text" 
                placeholder="Search headlines, keywords, summarized details, or NM codes..." 
                value={archiveFilter.q}
                onChange={(e) => setArchiveFilter(prev => ({ ...prev, q: e.target.value }))}
                className="bg-transparent text-xs text-[var(--t1)] outline-none w-full"
              />
            </div>
            {Object.values(archiveFilter).some(v => v !== '' && v !== false) && (
              <button 
                onClick={() => setArchiveFilter({ q: '', subject: '', syllabus: '', priority: '', starredOnly: false, hasNotesOnly: false, dateFrom: '', dateTo: '' })}
                className="px-3.5 py-2 bg-[var(--ra)] border border-[var(--bd)] text-xs font-bold text-[var(--t1)] rounded-xl"
              >
                Clear Filters
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="space-y-1">
              <label className="text-[9px] font-bold text-[var(--t3)] uppercase tracking-wider">Broad Subject</label>
              <select 
                value={archiveFilter.subject} 
                onChange={(e) => setArchiveFilter(prev => ({ ...prev, subject: e.target.value }))}
                className="w-full p-2 text-xs bg-[var(--bg)] border border-[var(--bd)] text-[var(--t1)] rounded-xl outline-none"
              >
                <option value="">All Subjects</option>
                {BROAD_SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            
            <div className="space-y-1">
              <label className="text-[9px] font-bold text-[var(--t3)] uppercase tracking-wider">Syllabus Point</label>
              <select 
                value={archiveFilter.syllabus} 
                onChange={(e) => setArchiveFilter(prev => ({ ...prev, syllabus: e.target.value }))}
                className="w-full p-2 text-xs bg-[var(--bg)] border border-[var(--bd)] text-[var(--t1)] rounded-xl outline-none"
              >
                <option value="">All Syllabus Points</option>
                {SYLLABUS.map(s => <option key={s.id} value={s.id}>{s.paper}: {s.subject}</option>)}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-bold text-[var(--t3)] uppercase tracking-wider">Priority Level</label>
              <select 
                value={archiveFilter.priority} 
                onChange={(e) => setArchiveFilter(prev => ({ ...prev, priority: e.target.value }))}
                className="w-full p-2 text-xs bg-[var(--bg)] border border-[var(--bd)] text-[var(--t1)] rounded-xl outline-none"
              >
                <option value="">All Priorities</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-[var(--t3)] uppercase tracking-wider">From Date</label>
                <input 
                  type="date" 
                  value={archiveFilter.dateFrom} 
                  onChange={(e) => setArchiveFilter(prev => ({ ...prev, dateFrom: e.target.value }))}
                  className="w-full p-1.5 text-[10px] bg-[var(--bg)] border border-[var(--bd)] text-[var(--t1)] rounded-xl outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-[var(--t3)] uppercase tracking-wider">To Date</label>
                <input 
                  type="date" 
                  value={archiveFilter.dateTo} 
                  onChange={(e) => setArchiveFilter(prev => ({ ...prev, dateTo: e.target.value }))}
                  className="w-full p-1.5 text-[10px] bg-[var(--bg)] border border-[var(--bd)] text-[var(--t1)] rounded-xl outline-none"
                />
              </div>
            </div>
          </div>

          <div className="flex gap-4 pt-1 flex-wrap">
            <label className="flex items-center gap-2 text-xs font-semibold text-[var(--t2)] cursor-pointer">
              <input 
                type="checkbox" 
                checked={archiveFilter.starredOnly} 
                onChange={(e) => setArchiveFilter(prev => ({ ...prev, starredOnly: e.target.checked }))}
                className="rounded border-[var(--bd)] text-[var(--gd)] focus:ring-0"
              />
              Starred / Highlighted Only
            </label>
            <label className="flex items-center gap-2 text-xs font-semibold text-[var(--t2)] cursor-pointer">
              <input 
                type="checkbox" 
                checked={archiveFilter.hasNotesOnly} 
                onChange={(e) => setArchiveFilter(prev => ({ ...prev, hasNotesOnly: e.target.checked }))}
                className="rounded border-[var(--bd)] text-[var(--gd)] focus:ring-0"
              />
              Has Study Notes / Flashcards
            </label>
          </div>
        </div>

        {/* List of articles */}
        <div className="space-y-4">
          <div className="flex justify-between items-center text-xs text-[var(--t3)]">
            <p>Showing {filtered.length} of {articles.length} total database records</p>
          </div>

          {filtered.length === 0 ? (
            <div className="p-12 text-center text-xs text-[var(--t3)]">No database entries match your filter criteria.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filtered.map(art => (
                <ArticleCard key={art.code} article={art} onSelectArticle={(code) => navigateTo('detail', code)} />
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  // 5. SYLLABUS BROWSER VIEW
  const renderSyllabusView = () => {
    const counts: Record<string, number> = {};
    articles.forEach(art => {
      art.syllabus_points.forEach(sp => {
        counts[sp] = (counts[sp] || 0) + 1;
      });
    });

    const activeSyl = selectedTopicId ? SYLLABUS.find(s => s.id === selectedTopicId) : null;
    const filteredArticles = selectedTopicId 
      ? articles.filter(a => a.syllabus_points.includes(selectedTopicId)).sort((a,b) => b.date.localeCompare(a.date))
      : [];

    const handleGenerateTopicSummary = async () => {
      if (!activeSyl) return;
      if (!geminiKey) {
        alert('Please save your Gemini API key in Settings first.');
        return;
      }

      setGeneratingSummaryTopicId(activeSyl.id);
      const recentArts = filteredArticles.slice(0, 15);
      const context = recentArts.map(a => `[${a.code}] ${a.headline} (${a.date})\nSummary: ${a.quick_summary}\nStudy Notes: ${a.detail_markdown?.slice(0, 400) || ''}\nMy Personal Notes: ${a.personal_notes || ''}`).join('\n\n---\n\n');

      const prompt = `Generate a comprehensive UPSC revision summary for the syllabus topic:
"${activeSyl.title}" (${activeSyl.paper} - ${activeSyl.subject})

Based on these stored newspaper articles:
${context}

Create a structured revision document with:
1. **Overview of key developments** in this topic area
2. **Static background** — what UPSC expects students to know regardless of current affairs
3. **Key facts and data points for Prelims** — bullet points, numbers, terms, dates
4. **Analytical themes for Mains** — recurring arguments, tensions, debates from these articles
5. **Essay angles** if applicable
6. **Chronology of events** covered in the archive
7. All claims must cite article codes like [NM-...]

Format as clean markdown. Be comprehensive — this is a revision document for the main exam.`;

      try {
        const markdown = await callGeminiAPI(prompt, settings.modelAsk);
        const newSummary: TopicSummary = {
          id: `S-${Date.now()}`,
          topicId: activeSyl.id,
          topicTitle: activeSyl.title,
          period: 'recent archive files',
          from: recentArts[recentArts.length - 1]?.date || new Date().toISOString().slice(0, 10),
          to: recentArts[0]?.date || new Date().toISOString().slice(0, 10),
          markdown,
          article_codes: recentArts.map(a => a.code),
          created_at: new Date().toISOString()
        };

        const updated = [newSummary, ...topicSummaries];
        saveSummaries(updated);
        navigateTo('summaries', null, null, newSummary.id);
      } catch (err: any) {
        alert(err?.message || 'Failed to generate topic rollup summary.');
      } finally {
        setGeneratingSummaryTopicId(null);
      }
    };

    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 font-sans items-start">
        {/* Left list: 31 Syllabus points */}
        <div className="md:col-span-1 p-4 bg-[var(--sur)] border border-[var(--bd)]/45 rounded-2xl shadow-sm space-y-3 max-h-[75vh] overflow-y-auto pr-1">
          <h3 className="text-xs font-extrabold text-[var(--t3)] uppercase tracking-wider">UPSC Syllabus Index</h3>
          
          {['Prelims', 'GS1', 'GS2', 'GS3', 'GS4', 'Essay'].map(paper => {
            const paperSyllabus = SYLLABUS.filter(s => s.paper === paper);
            return (
              <div key={paper} className="space-y-1.5 pt-1.5 border-t border-[var(--bd)]/20 first:border-0">
                <p className="text-[10px] font-extrabold text-[var(--gd)] uppercase tracking-wider">{paper}</p>
                <div className="space-y-1">
                  {paperSyllabus.map(syl => {
                    const count = counts[syl.id] || 0;
                    const isActive = selectedTopicId === syl.id;
                    return (
                      <button
                        key={syl.id}
                        onClick={() => navigateTo('syllabus', null, syl.id, null, false)}
                        className={`w-full text-left p-2.5 rounded-xl text-xs flex justify-between items-start gap-2 transition duration-150 border ${
                          isActive 
                            ? 'bg-[var(--gd)] text-white border-[var(--gd)] shadow-sm' 
                            : 'bg-[var(--bg)] text-[var(--t1)] border-[var(--bd)]/40 hover:border-[var(--gd)] hover:text-[var(--gd)]'
                        }`}
                      >
                        <div className="space-y-0.5">
                          <p className="font-bold">{syl.subject}</p>
                          <p className={`text-[9px] line-clamp-1 leading-snug ${isActive ? 'text-white/80' : 'text-[var(--t3)]'}`}>{syl.title}</p>
                        </div>
                        <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded shrink-0 mt-0.5 ${
                          isActive ? 'bg-white/10 text-white' : 'bg-[var(--ra)] text-[var(--t3)]'
                        }`}>{count}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Right list: articles tagged with active syllabus ID */}
        <div className="md:col-span-2 space-y-4">
          {activeSyl ? (
            <div className="space-y-5">
              <div className="p-5 bg-[var(--sur)] border border-[var(--bd)]/45 rounded-2xl shadow-sm space-y-3">
                <div className="space-y-1 text-left">
                  <span className="px-2 py-0.5 bg-[var(--gd)] text-white rounded text-[9px] font-mono font-bold uppercase">{activeSyl.paper} Syllabus</span>
                  <h2 className="text-lg font-serif font-bold text-[var(--t1)]">{activeSyl.subject}</h2>
                  <p className="text-xs text-[var(--t2)] font-serif italic">"{activeSyl.title}"</p>
                </div>
                
                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    onClick={handleGenerateTopicSummary}
                    disabled={generatingSummaryTopicId !== null || filteredArticles.length === 0}
                    className="px-3.5 py-1.5 bg-[var(--gd)] text-white rounded-xl text-xs font-bold hover:bg-[var(--gd2)] disabled:opacity-50 transition duration-150 flex items-center gap-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    {generatingSummaryTopicId === activeSyl.id ? 'Analyzing...' : 'Generate AI Summary Rollup'}
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                <p className="text-xs text-[var(--t3)]">Database entries ({filteredArticles.length})</p>
                {filteredArticles.length === 0 ? (
                  <div className="p-12 text-center text-xs text-[var(--t3)] bg-[var(--sur)]/30 border border-dashed border-[var(--bd)] rounded-2xl">
                    No study entries filed under this syllabus keyword yet. Paste today's analyses to populate.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {filteredArticles.map(art => (
                      <ArticleCard key={art.code} article={art} onSelectArticle={(code) => navigateTo('detail', code)} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-24 bg-[var(--sur)]/30 border border-dashed border-[var(--bd)]/40 rounded-2xl space-y-2">
              <BookOpen className="w-10 h-10 text-[var(--gd)] opacity-45 mx-auto" />
              <p className="text-xs text-[var(--t3)] font-bold">UPSC Core Taxonomy</p>
              <p className="text-[11px] text-[var(--t3)] max-w-xs mx-auto">Select a paper keyword on the syllabus shelf map to view your mapped study summaries.</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  // 6. REVISION / STARRED VIEW
  const renderRevisionView = () => {
    const starredArts = articles.filter(a => a.starred);
    const usePrelims = articles.filter(a => a.revision_status === 'use-prelims');
    const useMains = articles.filter(a => a.revision_status === 'use-mains');
    const useEssay = articles.filter(a => a.revision_status === 'use-essay');
    const reviseLater = articles.filter(a => a.revision_status === 'revise-later');

    const handleExportStarred = () => {
      const collection = articles.filter(a => a.starred || a.personal_notes || a.revision_status !== 'new');
      if (collection.length === 0) {
        alert('No study material flagged for revision.');
        return;
      }

      let content = `# UPSC study notes - Revision Dashboard
Exported: ${new Date().toLocaleDateString('en-IN')} | Total revision modules: ${collection.length}

---

`;
      collection.forEach(art => {
        content += `## [${art.code}] ${art.headline}
*Date: ${art.date} | ${art.ie_section} section | Revision: ${art.revision_status}*

### UPSC relevance:
${art.why_relevant}

### Summarised syllabus facts:
${art.quick_summary}

### Detailed study context:
${art.detail_markdown || 'No detailed analytical study cards compiled.'}

### My Personal Revision Flashcards & mindmap notes:
${art.personal_notes || 'No custom study notes written.'}

---

`;
      });

      triggerDownload(content, 'upsc_mapper_revision_dashboard.md');
    };

    return (
      <div className="space-y-6 font-sans">
        <div className="flex justify-between items-center pb-3 border-b border-[var(--bd)]/30">
          <div>
            <h2 className="text-lg font-serif font-bold text-[var(--t1)]">⭐ Revision Matrix</h2>
            <p className="text-xs text-[var(--t3)]">Flagged modules & study items</p>
          </div>
          <button
            onClick={handleExportStarred}
            className="px-3.5 py-1.5 bg-[var(--sur)] hover:bg-[var(--ra)] border border-[var(--bd)] text-[var(--t1)] text-xs font-bold rounded-xl transition duration-150"
          >
            Export All to Obsidian (.md)
          </button>
        </div>

        {articles.length === 0 ? (
          <div className="text-center py-16 text-xs text-[var(--t3)]">Database is empty. Load UPSC sample documents first.</div>
        ) : (
          <div className="space-y-6">
            {/* 1. Use in Prelims Section */}
            {usePrelims.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-xs font-extrabold text-[var(--gd)] uppercase tracking-wider flex items-center gap-1.5">
                  <Award className="w-3.5 h-3.5" /> High-yield Prelims Facts ({usePrelims.length})
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {usePrelims.map(art => <ArticleCard key={art.code} article={art} onSelectArticle={(code) => navigateTo('detail', code)} />)}
                </div>
              </div>
            )}

            {/* 2. Use in Mains Section */}
            {useMains.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-xs font-extrabold text-[var(--gd)] uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5" /> Core Mains (GS-1/GS-2/GS-3/GS-4) Analysis ({useMains.length})
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {useMains.map(art => <ArticleCard key={art.code} article={art} onSelectArticle={(code) => navigateTo('detail', code)} />)}
                </div>
              </div>
            )}

            {/* 3. Use in Essay Section */}
            {useEssay.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-xs font-extrabold text-[var(--gd)] uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" /> High-scoring Essay Quotes & Anecdotes ({useEssay.length})
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {useEssay.map(art => <ArticleCard key={art.code} article={art} onSelectArticle={(code) => navigateTo('detail', code)} />)}
                </div>
              </div>
            )}

            {/* 4. Revise Later Section */}
            {reviseLater.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-xs font-extrabold text-[var(--t3)] uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" /> Backlog / Revise Later ({reviseLater.length})
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {reviseLater.map(art => <ArticleCard key={art.code} article={art} onSelectArticle={(code) => navigateTo('detail', code)} />)}
                </div>
              </div>
            )}

            {/* 5. Starred Section */}
            {starredArts.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-xs font-extrabold text-amber-500 uppercase tracking-wider flex items-center gap-1.5 border-t border-[var(--bd)]/20 pt-4">
                  <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" /> General Highlighted Modules ({starredArts.length})
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {starredArts.map(art => <ArticleCard key={art.code} article={art} onSelectArticle={(code) => navigateTo('detail', code)} />)}
                </div>
              </div>
            )}

            {starredArts.length === 0 && usePrelims.length === 0 && useMains.length === 0 && useEssay.length === 0 && reviseLater.length === 0 && (
              <div className="text-center py-12 text-xs text-[var(--t3)] bg-[var(--sur)]/30 border border-dashed border-[var(--bd)] rounded-2xl">
                No articles flagged for active study notes or leitner reviews.
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // 6.5 STRUCTURED NOTES VAULT VIEW
  const renderNotesVaultView = () => {
    const handleDeleteVaultNote = (sectionKey: 'statistics' | 'mains' | 'prelims' | 'essay' | 'explore', articleCode: string, noteId: string) => {
      const updated = articles.map(a => {
        if (a.code === articleCode) {
          const sections = a.personal_notes_sections || {};
          const currentList = sections[sectionKey] || [];
          const updatedSections = {
            ...sections,
            [sectionKey]: currentList.filter(item => item.id !== noteId)
          };
          return {
            ...a,
            personal_notes_sections: updatedSections,
            updated_at: new Date().toISOString()
          };
        }
        return a;
      });
      saveArticles(updated);
    };

    // Gather all notes in selected section
    const allSectionNotes: { id: string; text: string; created_at: string; article: Article }[] = [];
    articles.forEach(art => {
      const sections = art.personal_notes_sections;
      if (sections) {
        const list = sections[notesVaultSection];
        if (list && list.length > 0) {
          list.forEach(item => {
            allSectionNotes.push({
              ...item,
              article: art
            });
          });
        }
      }
    });

    // Group by Broad Subjects
    const grouped: { [subject: string]: typeof allSectionNotes } = {};
    allSectionNotes.forEach(item => {
      const subjects = item.article.broad_subjects && item.article.broad_subjects.length > 0 
        ? item.article.broad_subjects 
        : ['General / Uncategorized'];
      
      subjects.forEach(sub => {
        if (!grouped[sub]) {
          grouped[sub] = [];
        }
        grouped[sub].push(item);
      });
    });

    const categoriesList = [
      { id: 'statistics', label: '📊 Important Statistic' },
      { id: 'mains', label: '📝 Important for Mains' },
      { id: 'prelims', label: '🔍 Important for Prelims' },
      { id: 'essay', label: '💡 Essay' },
      { id: 'explore', label: '🌐 Read/Explore more' }
    ] as const;

    return (
      <div className="space-y-6 font-sans text-left">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-3 border-b border-[var(--bd)]/30 gap-2">
          <div>
            <h2 className="text-lg font-serif font-bold text-[var(--t1)] flex items-center gap-1.5">
              <BookOpen className="w-5 h-5 text-[var(--gd)]" /> My Notes Vault
            </h2>
            <p className="text-xs text-[var(--t3)]">Your structured personal pointers grouped by UPSC GS broad subjects</p>
          </div>
          <div className="px-3 py-1 bg-[var(--ra)] text-[var(--t2)] text-[10px] font-mono font-bold rounded-lg border border-[var(--bd)]/40">
            Total Notes: {allSectionNotes.length} in this section
          </div>
        </div>

        {/* Section Tabs Selector */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          {categoriesList.map(cat => {
            const isActive = notesVaultSection === cat.id;
            // count notes for this specific category
            let count = 0;
            articles.forEach(a => {
              const list = a.personal_notes_sections?.[cat.id];
              if (list) count += list.length;
            });

            return (
              <button
                key={cat.id}
                onClick={() => setNotesVaultSection(cat.id)}
                className={`p-3 rounded-xl border text-xs font-bold text-center flex flex-col items-center justify-center gap-1 transition duration-150 relative ${
                  isActive 
                    ? 'bg-[var(--gd)] text-white border-[var(--gd)] shadow-sm' 
                    : 'bg-[var(--sur)] hover:bg-[var(--ra)] text-[var(--t2)] border-[var(--bd)]/40'
                }`}
              >
                <span>{cat.label}</span>
                <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full font-bold ${
                  isActive ? 'bg-white/20 text-white' : 'bg-[var(--ra)] text-[var(--t3)]'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Notes Grid Grouped by Broad Subjects */}
        {Object.keys(grouped).length === 0 ? (
          <div className="p-12 text-center bg-[var(--sur)]/30 border border-dashed border-[var(--bd)] rounded-2xl space-y-3">
            <BookOpen className="w-8 h-8 text-[var(--t3)] mx-auto animate-pulse" />
            <p className="text-xs text-[var(--t2)] font-medium max-w-sm mx-auto">
              No notes found in this section. Add notes to your articles via the "Personal Study Planner" sidebar inside any article's detailed view.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(grouped).map(([subject, items]) => (
              <div key={subject} className="space-y-3">
                {/* Subject Header Heading */}
                <div className="flex items-center gap-2 border-b border-[var(--bd)]/20 pb-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[var(--gd)]" />
                  <h3 className="text-xs font-extrabold text-[var(--t1)] uppercase tracking-wider">{subject}</h3>
                  <span className="px-1.5 py-0.5 bg-[var(--ra)] text-[var(--t3)] font-mono text-[9px] font-bold rounded">
                    {items.length} {items.length === 1 ? 'note' : 'notes'}
                  </span>
                </div>

                {/* Notes list */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {items.map(item => (
                    <div 
                      key={item.id} 
                      className="p-4 bg-[var(--sur)] border border-[var(--bd)]/45 hover:border-[var(--gd)]/40 rounded-2xl shadow-sm transition duration-150 flex flex-col justify-between space-y-3 group text-left"
                    >
                      <div className="flex justify-between items-start gap-2">
                        <p className="text-xs text-[var(--t1)] font-sans leading-relaxed whitespace-pre-wrap flex-1 text-left">
                          {item.text}
                        </p>
                        <button
                          onClick={() => handleDeleteVaultNote(notesVaultSection, item.article.code, item.id)}
                          className="text-[var(--t3)] hover:text-red-500 p-1 opacity-0 group-hover:opacity-100 transition duration-150 text-xs shrink-0"
                          title="Delete Note"
                        >
                          ✕
                        </button>
                      </div>

                      {/* Footer reference link metadata */}
                      <div className="flex items-center justify-between text-[10px] border-t border-[var(--bd)]/20 pt-2 flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          {/* Code Click takes back to article */}
                          <button
                            onClick={() => navigateTo('detail', item.article.code)}
                            className="px-1.5 py-0.5 bg-[var(--gd)]/10 hover:bg-[var(--gd)]/20 text-[var(--gd)] font-mono font-bold rounded transition duration-150 shrink-0"
                            title="Go to article details"
                          >
                            {item.article.code}
                          </button>
                          <span className="text-[var(--t3)] font-medium truncate max-w-[150px] md:max-w-[200px]" title={item.article.headline}>
                            {item.article.headline}
                          </span>
                        </div>
                        <span className="text-[9px] text-[var(--t3)] font-mono">{item.article.date}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // 7. ASK AI VIEW
  const renderAskView = () => {
    const handleAskAI = async () => {
      const q = askInputValue.trim();
      if (!q) return;
      if (!geminiKey) {
        alert('Please save your Gemini API key in Settings first.');
        return;
      }

      setAskingAI(true);
      setAskStatusText('Reviewing your syllabus archive details and compiling study context...');

      // Filter contextual articles
      let scopeArts = [...articles];
      if (askFilter.subject) {
        scopeArts = scopeArts.filter(a => a.broad_subjects.includes(askFilter.subject));
      }
      if (askFilter.syllabus) {
        scopeArts = scopeArts.filter(a => a.syllabus_points.includes(askFilter.syllabus));
      }
      if (askFilter.onlyStarred) {
        scopeArts = scopeArts.filter(a => a.starred);
      }

      // Sort by newest and limit to max ask articles (default 20)
      scopeArts.sort((a,b) => b.date.localeCompare(a.date));
      const scopedBatch = scopeArts.slice(0, settings.maxAskArticles);

      // Construct AI Prompt with Context
      const contextText = scopedBatch.map(a => 
        `[${a.code}] ${a.headline} (${a.date})
Summary: ${a.quick_summary}
Keywords: ${(a.keywords || []).join(', ')}
Study Notes (excerpt): ${a.detail_markdown ? a.detail_markdown.slice(0, 500) : 'No detailed notes.'}
${askFilter.includeNotes && a.personal_notes ? `My Personal Notes: ${a.personal_notes}` : ''}`
      ).join('\n\n---\n\n');

      const fullPrompt = `You are a UPSC exam preparation assistant with access to a student's personal newspaper article archive.

STRICT RULES:
- Answer ONLY using provided archive context
- Cite article codes like [NM-20260620-001] for every specific claim
- If archive is insufficient, say so — do NOT invent information
- For Mains: use intro-body-conclusion structure with clear headings
- For Prelims: concise bullet-point facts
- For summaries: organised, factual, comprehensive

ARCHIVE CONTEXT (${scopedBatch.length} articles):
${contextText}

STUDENT QUESTION: ${q}`;

      try {
        setAskStatusText('Calling Gemini models for deep analytical synthesis...');
        const reply = await callGeminiAPI(fullPrompt, settings.modelAsk, true);
        const newEntry: AskHistoryEntry = {
          id: `A-${Date.now()}`,
          question: q,
          answer_markdown: reply,
          scope: {
            subj: askFilter.subject,
            syl: askFilter.syllabus,
            onlyStarred: askFilter.onlyStarred
          },
          article_codes_used: scopedBatch.map(a => a.code),
          created_at: new Date().toISOString()
        };

        const updatedHistory = [newEntry, ...askHistory];
        saveAskHistory(updatedHistory);
        setAskInputValue('');
      } catch (err: any) {
        alert(err?.message || 'Failed to communicate with Gemini API.');
      } finally {
        setAskingAI(false);
        setAskStatusText('');
      }
    };

    const [askStatusText, setAskStatusText] = useState<string>('');

    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 font-sans items-start">
        {/* Chat window on the left */}
        <div className="lg:col-span-2 space-y-4">
          <div className="p-5 bg-[var(--sur)] border border-[var(--bd)]/45 rounded-2xl shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-[var(--t1)] uppercase tracking-tight">🤖 Ask Archive AI assistant</h2>
            <div className="p-3 bg-blue-500/5 border border-blue-500/20 text-blue-600 text-xs rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>Context search is isolated to study records in your database to ensure factual zero-hallucination.</span>
            </div>

            {/* Chat list */}
            <div className="space-y-4 max-h-[45vh] overflow-y-auto pr-1">
              {askHistory.length === 0 ? (
                <div className="text-center py-10 space-y-2 text-xs text-[var(--t3)]">
                  <MessageSquare className="w-8 h-8 text-[var(--gd)] mx-auto opacity-45" />
                  <p className="font-bold">Ask anything about your study entries.</p>
                  <p>Answers will reference exact NM codes to let you check sources.</p>
                </div>
              ) : (
                askHistory.map(hist => (
                  <div key={hist.id} className="space-y-2 pb-4 border-b border-[var(--bd)]/20 last:border-0 text-xs text-left">
                    <div className="p-3 bg-[var(--ra)]/30 rounded-xl space-y-1">
                      <p className="text-[10px] font-extrabold text-[var(--gd)] uppercase tracking-wider">My Query</p>
                      <p className="text-[var(--t1)] font-semibold">{hist.question}</p>
                    </div>
                    <div className="p-4 bg-[var(--bg)] border border-[var(--bd)]/40 rounded-xl space-y-2 leading-relaxed">
                      <p className="text-[10px] font-extrabold text-[var(--t3)] uppercase tracking-wider">AI response</p>
                      <div className="prose prose-sm max-w-none">
                        {renderFormattedMarkdown(hist.answer_markdown)}
                      </div>
                      <p className="text-[9px] text-[var(--t3)] font-mono pt-1">
                        Synthesized using {hist.article_codes_used.length} documents: {hist.article_codes_used.join(', ')}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Query Form */}
            <div className="space-y-3 pt-2">
              <div className="flex gap-2">
                <textarea
                  value={askInputValue}
                  onChange={(e) => setAskInputValue(e.target.value)}
                  placeholder="Ask a comprehensive revision query e.g. 'Synthesise recurring themes and policy targets across my environment study cards...'"
                  rows={2}
                  className="flex-1 p-2.5 text-xs rounded-xl bg-[var(--bg)] border border-[var(--bd)] text-[var(--t1)] focus:ring-1 focus:ring-[var(--gd)] focus:border-[var(--gd)] outline-none resize-none leading-relaxed"
                />
                <button
                  onClick={handleAskAI}
                  disabled={askingAI || !askInputValue.trim()}
                  className="px-4 bg-[var(--gd)] hover:bg-[var(--gd2)] text-white text-xs font-bold rounded-xl disabled:opacity-50 transition duration-150 shrink-0 flex items-center justify-center"
                >
                  Ask AI
                </button>
              </div>
              
              {askingAI && (
                <div className="p-3 bg-[var(--ra)] border border-[var(--bd)] rounded-xl flex items-center gap-2 text-[11px] text-[var(--t2)] font-semibold">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-[var(--gd)] shrink-0" />
                  <p>{askStatusText}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Filters Scope Panel on the right */}
        <div className="space-y-4 font-sans">
          <div className="p-5 bg-[var(--sur)] border border-[var(--bd)]/45 rounded-2xl shadow-sm space-y-4">
            <h3 className="text-xs font-extrabold text-[var(--t3)] uppercase tracking-wider">Contextual Scope</h3>
            
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-[var(--t3)] uppercase tracking-wider">Broad Subject</label>
                <select 
                  value={askFilter.subject}
                  onChange={(e) => setAskFilter(prev => ({ ...prev, subject: e.target.value }))}
                  className="w-full p-2 text-xs bg-[var(--bg)] border border-[var(--bd)] text-[var(--t1)] rounded-xl outline-none"
                >
                  <option value="">All Subjects</option>
                  {BROAD_SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-bold text-[var(--t3)] uppercase tracking-wider">Syllabus Mapping</label>
                <select 
                  value={askFilter.syllabus}
                  onChange={(e) => setAskFilter(prev => ({ ...prev, syllabus: e.target.value }))}
                  className="w-full p-2 text-xs bg-[var(--bg)] border border-[var(--bd)] text-[var(--t1)] rounded-xl outline-none"
                >
                  <option value="">All Syllabus Points</option>
                  {SYLLABUS.map(s => <option key={s.id} value={s.id}>{s.paper}: {s.subject}</option>)}
                </select>
              </div>

              <div className="space-y-2 pt-1.5">
                <label className="flex items-center gap-2 text-xs font-semibold text-[var(--t2)] cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={askFilter.onlyStarred}
                    onChange={(e) => setAskFilter(prev => ({ ...prev, onlyStarred: e.target.checked }))}
                    className="rounded border-[var(--bd)] text-[var(--gd)] focus:ring-0"
                  />
                  Only Starred Articles
                </label>
                <label className="flex items-center gap-2 text-xs font-semibold text-[var(--t2)] cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={askFilter.includeNotes}
                    onChange={(e) => setAskFilter(prev => ({ ...prev, includeNotes: e.target.checked }))}
                    className="rounded border-[var(--bd)] text-[var(--gd)] focus:ring-0"
                  />
                  Include Personal study Notes
                </label>
              </div>

              <div className="p-3 bg-[var(--ra)]/50 border border-[var(--bd)]/40 rounded-xl">
                <p className="text-[10px] text-[var(--t3)] leading-relaxed">
                  Query limits up to {settings.maxAskArticles} relevant documents to maintain strict token usage and low processing times.
                </p>
              </div>

              {askHistory.length > 0 && (
                <button
                  onClick={() => {
                    if (window.confirm('Clear your Ask AI query history?')) {
                      saveAskHistory([]);
                    }
                  }}
                  className="w-full py-2 bg-red-500/5 text-red-600 border border-red-500/10 text-xs font-bold rounded-xl hover:bg-red-500/10 transition duration-150"
                >
                  Clear Chat History
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // 8. TOPIC SUMMARIES VIEW
  const renderSummariesView = () => {
    const activeSummary = selectedSummaryId ? topicSummaries.find(s => s.id === selectedSummaryId) : null;

    const handleDeleteSummary = (id: string) => {
      if (window.confirm('Are you sure you want to delete this topic rollup summary?')) {
        const updated = topicSummaries.filter(s => s.id !== id);
        saveSummaries(updated);
        setSelectedSummaryId(updated[0]?.id || null);
      }
    };

    const handleExportSummary = (s: TopicSummary) => {
      const content = `# Revision Summary - ${s.topicTitle}
Generated on ${new Date(s.created_at).toLocaleDateString('en-IN')}

${s.markdown}`;
      triggerDownload(content, `rollup_summary_${s.topicId}.md`);
    };

    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 font-sans items-start">
        {/* Left list: saved summaries */}
        <div className="md:col-span-1 p-4 bg-[var(--sur)] border border-[var(--bd)]/45 rounded-2xl shadow-sm space-y-3.5 max-h-[75vh] overflow-y-auto pr-1">
          <h3 className="text-xs font-extrabold text-[var(--t3)] uppercase tracking-wider">Revision Summaries Rollups</h3>
          
          {topicSummaries.length === 0 ? (
            <p className="text-[11px] text-[var(--t3)] italic text-center py-6 leading-relaxed">
              No revision summaries created yet. Go to the Syllabus Browser, select a syllabus category, and trigger rollup summary generation.
            </p>
          ) : (
            <div className="space-y-2">
              {topicSummaries.map(s => {
                const syl = SYLLABUS.find(x => x.id === s.topicId);
                const isActive = selectedSummaryId === s.id;
                return (
                  <button
                    key={s.id}
                    onClick={() => navigateTo('summaries', null, null, s.id, false)}
                    className={`w-full text-left p-3 rounded-xl border transition duration-150 ${
                      isActive 
                        ? 'bg-[var(--gd)] text-white border-[var(--gd)] shadow-sm' 
                        : 'bg-[var(--bg)] text-[var(--t1)] border-[var(--bd)]/45 hover:border-[var(--gd)] hover:text-[var(--gd)]'
                    }`}
                  >
                    <p className="text-[9px] font-mono opacity-80 mb-0.5">{s.period}</p>
                    <p className="text-xs font-bold leading-tight">{syl?.subject || s.topicId}</p>
                    <p className={`text-[10px] line-clamp-1 pt-0.5 ${isActive ? 'text-white/80' : 'text-[var(--t3)]'}`}>{syl?.title}</p>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Right view: active summary content */}
        <div className="md:col-span-2 space-y-4">
          {activeSummary ? (
            <div className="p-6 bg-[var(--bg)] border border-[var(--bd)]/50 rounded-2xl shadow-sm space-y-4">
              <div className="flex justify-between items-start gap-4 pb-3 border-b border-[var(--bd)]/30 flex-wrap">
                <div>
                  <span className="px-2 py-0.5 bg-[var(--gd)] text-white text-[9px] font-mono font-bold rounded">UPSC Revision Summary</span>
                  <h2 className="text-lg font-serif font-bold text-[var(--t1)] mt-1">{SYLLABUS.find(x => x.id === activeSummary.topicId)?.subject} Rollup</h2>
                  <p className="text-[10px] text-[var(--t3)] font-mono">Synthesised: {new Date(activeSummary.created_at).toLocaleDateString('en-IN')}</p>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleExportSummary(activeSummary)}
                    className="px-3 py-1.5 bg-[var(--sur)] hover:bg-[var(--ra)] border border-[var(--bd)]/40 text-[var(--t1)] text-xs font-bold rounded-xl transition duration-150 flex items-center gap-1 shrink-0"
                  >
                    <FileText className="w-3.5 h-3.5" /> Export Summary
                  </button>
                  <button
                    onClick={() => handleDeleteSummary(activeSummary.id)}
                    className="px-3 py-1.5 bg-red-500/5 hover:bg-red-500/10 text-red-600 border border-red-500/20 text-xs font-bold rounded-xl transition duration-150 shrink-0"
                  >
                    Delete
                  </button>
                </div>
              </div>

              <div className="prose max-w-none text-xs leading-relaxed text-[var(--t2)] text-justify">
                {renderFormattedMarkdown(activeSummary.markdown)}
              </div>
            </div>
          ) : (
            <div className="text-center py-24 bg-[var(--sur)]/30 border border-dashed border-[var(--bd)]/40 rounded-2xl space-y-2 font-sans">
              <Layers className="w-10 h-10 text-[var(--gd)] opacity-45 mx-auto" />
              <p className="text-xs text-[var(--t3)] font-bold">Analytical Summaries Rollup</p>
              <p className="text-[11px] text-[var(--t3)] max-w-xs mx-auto">Select an AI revision rollup on the left to review compiled static and current UPSC facts.</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  // 9. SETTINGS VIEW
  const renderSettingsView = () => {
    const handleSaveKey = () => {
      saveGeminiKey(geminiKey);
      alert('Key saved.');
    };

    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 font-sans items-start">
        <div className="md:col-span-2 p-6 bg-[var(--sur)] border border-[var(--bd)]/45 rounded-2xl shadow-sm space-y-5">
          <h2 className="text-sm font-bold text-[var(--t1)] uppercase tracking-tight">⚙️ Newspaper Mapper Settings</h2>
          <div className="p-3.5 bg-amber-500/5 border border-amber-500/20 text-amber-700 text-xs rounded-xl flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <p>API Keys are encrypted and stored in local localStorage. They are never transmitted off-device except in direct API requests to Google's endpoints.</p>
          </div>

          <div className="space-y-4">
            {/* API Key */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-[var(--t2)] uppercase tracking-wider">Gemini API Key</label>
              <div className="flex gap-2">
                <input 
                  type="password" 
                  value={geminiKey} 
                  onChange={(e) => setGeminiKey(e.target.value)}
                  placeholder="AIzaSy..."
                  className="flex-1 p-2.5 text-xs bg-[var(--bg)] border border-[var(--bd)] text-[var(--t1)] rounded-xl outline-none font-mono"
                />
                <button 
                  onClick={handleSaveKey}
                  className="px-4 bg-[var(--gd)] hover:bg-[var(--gd2)] text-white text-xs font-bold rounded-xl transition duration-150 font-sans"
                >
                  Save Key
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-[var(--bd)]/20 pt-4">
              {/* Note Gen Model */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-[var(--t2)] uppercase tracking-wider">Model for Notes Generation</label>
                <select 
                  value={settings.modelDetail} 
                  onChange={(e) => saveSettingsObj({ ...settings, modelDetail: e.target.value })}
                  className="w-full p-2.5 text-xs bg-[var(--bg)] border border-[var(--bd)] text-[var(--t1)] rounded-xl outline-none font-mono"
                >
                  <option value="gemini-2.5-flash">gemini-2.5-flash (Default)</option>
                  <option value="gemini-2.5-pro">gemini-2.5-pro (High fidelity)</option>
                  <option value="gemini-2.0-flash">gemini-2.0-flash</option>
                  <option value="gemini-1.5-flash">gemini-1.5-flash</option>
                  <option value="gemini-1.5-pro">gemini-1.5-pro</option>
                </select>
              </div>

              {/* Chat AI Model */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-[var(--t2)] uppercase tracking-wider">Model for Chat & Ask AI</label>
                <select 
                  value={settings.modelAsk} 
                  onChange={(e) => saveSettingsObj({ ...settings, modelAsk: e.target.value })}
                  className="w-full p-2.5 text-xs bg-[var(--bg)] border border-[var(--bd)] text-[var(--t1)] rounded-xl outline-none font-mono"
                >
                  <option value="gemini-2.5-flash">gemini-2.5-flash (Default)</option>
                  <option value="gemini-2.5-pro">gemini-2.5-pro (High fidelity)</option>
                  <option value="gemini-2.0-flash">gemini-2.0-flash</option>
                  <option value="gemini-1.5-flash">gemini-1.5-flash</option>
                  <option value="gemini-1.5-pro">gemini-1.5-pro</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-[var(--bd)]/20 pt-4">
              {/* Max context */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-[var(--t2)] uppercase tracking-wider">Max Context Ask Articles</label>
                <input 
                  type="number" 
                  min={5} 
                  max={50} 
                  value={settings.maxAskArticles} 
                  onChange={(e) => saveSettingsObj({ ...settings, maxAskArticles: Math.max(5, Math.min(50, parseInt(e.target.value, 10) || 20)) })}
                  className="w-full p-2.5 text-xs bg-[var(--bg)] border border-[var(--bd)] text-[var(--t1)] rounded-xl outline-none"
                />
              </div>

              {/* Confirm before calls */}
              <div className="flex items-center gap-2 pt-6">
                <input 
                  id="confirm-calls-chk"
                  type="checkbox" 
                  checked={settings.confirmCalls} 
                  onChange={(e) => saveSettingsObj({ ...settings, confirmCalls: e.target.checked })}
                  className="rounded border-[var(--bd)] text-[var(--gd)] focus:ring-0 cursor-pointer"
                />
                <label htmlFor="confirm-calls-chk" className="text-xs font-semibold text-[var(--t2)] cursor-pointer">
                  Confirm before initiating API calls
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Database statistics on the right */}
        <div className="space-y-4 font-sans">
          <div className="p-5 bg-[var(--sur)] border border-[var(--bd)]/45 rounded-2xl shadow-sm space-y-4">
            <h3 className="text-xs font-extrabold text-[var(--t3)] uppercase tracking-wider">Storage Statistics</h3>
            
            <div className="space-y-2 text-xs divide-y divide-[var(--bd)]/20">
              <div className="flex justify-between py-1.5">
                <span className="text-[var(--t3)]">Archived Analysis Cards</span>
                <span className="font-bold text-[var(--t1)]">{articles.length}</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-[var(--t3)]">Leitner Flashcard Starred</span>
                <span className="font-bold text-[var(--t1)]">{articles.filter(a => a.starred).length}</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-[var(--t3)]">AI Syllabus rollups</span>
                <span className="font-bold text-[var(--t1)]">{topicSummaries.length}</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-[var(--t3)]">AI Ask query logs</span>
                <span className="font-bold text-[var(--t1)]">{askHistory.length}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // 10. BACKUP VIEW
  const renderBackupView = () => {
    const handleExportBackup = () => {
      const dataStr = JSON.stringify({
        version: 'NM-UPSC-2.0',
        articles,
        topicSummaries,
        askHistory,
        settings
      }, null, 2);

      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `upsc_newspaper_mapper_backup_${new Date().toISOString().slice(0,10)}.json`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    };

    const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const text = event.target?.result as string;
          const parsed = JSON.parse(text);
          if (!parsed.articles) {
            alert('Invalid backup structure: missing articles log.');
            return;
          }

          const confirmMerge = window.confirm(`Found ${parsed.articles.length} database analysis entries.\n\nClick OK to merge with current study cards.\nClick Cancel to completely replace your study database.`);
          
          if (confirmMerge) {
            const currentCodes = new Set(articles.map(a => a.code));
            const merged = [...articles];
            parsed.articles.forEach((a: Article) => {
              if (!currentCodes.has(a.code)) {
                merged.push(a);
              }
            });
            saveArticles(merged);
            if (parsed.topicSummaries) {
              const currentSummaryIds = new Set(topicSummaries.map(s => s.id));
              const mergedSummaries = [...topicSummaries];
              parsed.topicSummaries.forEach((s: TopicSummary) => {
                if (!currentSummaryIds.has(s.id)) {
                  mergedSummaries.push(s);
                }
              });
              saveSummaries(mergedSummaries);
            }
            alert('Backups merged successfully!');
          } else {
            const finalConfirm = window.confirm('Final warning: Clicking OK will completely wipe your current local UPSC analysis cards and replace them with files inside this backup JSON.');
            if (finalConfirm) {
              saveArticles(parsed.articles);
              if (parsed.topicSummaries) saveSummaries(parsed.topicSummaries);
              if (parsed.askHistory) saveAskHistory(parsed.askHistory);
              if (parsed.settings) saveSettingsObj(parsed.settings);
              alert('Complete system study restore completed.');
            }
          }
          navigateTo('today');
        } catch (err) {
          alert('Failed to parse backup JSON file.');
        }
      };
      reader.readAsText(file);
    };

    const handleClearDatabase = () => {
      if (window.confirm('CRITICAL WARNING: This will permanently wipe all local analysis entries, study cards, AI summaries, and glossary indexes.\n\nProceed ONLY if you have exported backups.')) {
        if (window.confirm('Type "DELETE ALL" to wipe system study directories.')) {
          saveArticles([]);
          saveSummaries([]);
          saveAskHistory([]);
          alert('Newspaper Mapper local directories purged.');
          navigateTo('today');
        }
      }
    };

    return (
      <div className="p-6 bg-[var(--sur)] border border-[var(--bd)]/45 rounded-2xl shadow-sm space-y-6 font-sans text-left max-w-2xl mx-auto">
        <h2 className="text-sm font-bold text-[var(--t1)] uppercase tracking-tight">💾 Local Study Database Management</h2>
        
        <div className="p-3.5 bg-amber-500/5 border border-amber-500/20 text-amber-700 text-xs rounded-xl leading-relaxed">
          UPSC Newspaper Mapper stores study files in browser memory storage. Switching machines, clearing local caches, or updating operating systems may purge local databases. We advise exporting a Markdown backup weekly.
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-[var(--t1)]">System Backups</h3>
            <div className="flex flex-wrap gap-2">
              <button 
                onClick={handleExportBackup}
                className="px-4 py-2 bg-[var(--gd)] hover:bg-[var(--gd2)] text-white text-xs font-bold rounded-xl transition duration-150"
              >
                Export System Backup (JSON)
              </button>
              
              <button 
                onClick={() => backupFileInputRef.current?.click()}
                className="px-4 py-2 bg-[var(--ra)] text-[var(--t1)] border border-[var(--bd)] text-xs font-bold rounded-xl hover:bg-[var(--ra)]/80 transition duration-150"
              >
                Restore Backup File (JSON)
              </button>
              <input 
                ref={backupFileInputRef}
                type="file" 
                accept=".json" 
                onChange={handleImportBackup} 
                className="hidden" 
              />
            </div>
          </div>

          <div className="border-t border-[var(--bd)]/20 pt-4 space-y-2">
            <h3 className="text-xs font-bold text-[var(--t1)]">Obsidian Vault Exporter</h3>
            <p className="text-xs text-[var(--t3)] leading-relaxed">
              Export study archive files formatted cleanly for direct imports into Obsidian vaults as interconnected nodes. All manual links are translated seamlessly.
            </p>
            <button
              onClick={() => {
                const coll = articles.filter(a => a.starred || a.personal_notes || a.revision_status !== 'new');
                if (coll.length === 0) {
                  alert('No revision cards to export.');
                  return;
                }
                const md = coll.map(art => `---
tags: [upsc-notes, cse-guide]
---
# [${art.code}] ${art.headline}
*Date: ${art.date} | ie_section: ${art.ie_section}*

## Summary
${art.quick_summary}

## Detailed Notes
${art.detail_markdown || 'No analytical cards.'}

## My personal study links:
${art.personal_notes || ''}`).join('\n\n---\n\n');
                triggerDownload(md, `obsidian_cseguide_export.md`);
              }}
              className="px-4 py-2 bg-[var(--ra)] text-[var(--gd)] border border-[var(--bd)] text-xs font-bold rounded-xl"
            >
              Export Obsidian Archive (.md)
            </button>
          </div>

          <div className="border-t border-[var(--bd)]/20 pt-4 space-y-2">
            <h3 className="text-xs font-bold text-red-600">Danger Zone</h3>
            <button 
              onClick={handleClearDatabase}
              className="px-4 py-2 bg-red-500/5 hover:bg-red-500/10 text-red-600 border border-red-500/20 text-xs font-bold rounded-xl transition duration-150"
            >
              Clear Storage Directories
            </button>
          </div>
        </div>
      </div>
    );
  };

  // 11. HELP VIEW
  const renderHelpView = () => {
    return (
      <div className="max-w-2xl mx-auto space-y-6 font-sans text-left">
        <div className="p-6 bg-[var(--sur)] border border-[var(--bd)]/45 rounded-2xl shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-[var(--t1)] uppercase tracking-tight">❓ Daily Study Workflow Guide</h2>
          
          <div className="space-y-4 divide-y divide-[var(--bd)]/25">
            <div className="pt-3 first:pt-0 space-y-1">
              <h4 className="text-xs font-bold text-[var(--gd)]">1. Extract Newspaper Articles via Claude</h4>
              <p className="text-xs text-[var(--t2)] leading-relaxed">
                Open today's Indian Express PDF in an AI Chat, copy our Prompt Template under the Import tab, and trigger structured JSON output extraction.
              </p>
            </div>

            <div className="pt-3 space-y-1">
              <h4 className="text-xs font-bold text-[var(--gd)]">2. Paste & Sync to System Archive</h4>
              <p className="text-xs text-[var(--t2)] leading-relaxed">
                Copy Claude's output JSON and paste it in our Import Center to immediately assign custom sequential NM index tags, automatically map the syllabus tags, and calculate study recommendations.
              </p>
            </div>

            <div className="pt-3 space-y-1">
              <h4 className="text-xs font-bold text-[var(--gd)]">3. Compile Detailed analytical Cards</h4>
              <p className="text-xs text-[var(--t2)] leading-relaxed">
                Select your prioritized daily articles, click "Generate Notes" to pull background, prelims terms, and mains GS outlines using Gemini models.
              </p>
            </div>

            <div className="pt-3 space-y-1">
              <h4 className="text-xs font-bold text-[var(--gd)]">4. Active Revision & Sync</h4>
              <p className="text-xs text-[var(--t2)] leading-relaxed">
                Mark articles for active Leitner flashcards under Revision categories, add custom personal text guides, and dual-link cross-cutting topics seamlessly.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // --- RENDERING ROUTER ---
  return (
    <div className="space-y-6">
      {/* Search Header Panel */}
      <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 p-4 bg-[var(--sur)] border border-[var(--bd)]/45 rounded-2xl shadow-sm">
        <div className="flex items-center gap-2.5">
          <Newspaper className="w-6 h-6 text-[var(--gd)] shrink-0" />
          <div className="text-left font-serif">
            <h1 className="text-base md:text-lg font-bold text-[var(--t1)] leading-none tracking-tight">UPSC Newspaper Mapper</h1>
            <p className="text-[10px] text-[var(--t3)] font-sans uppercase font-bold tracking-wider mt-1">Syllabus-tagged Editorial study vault</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Quick Code Search */}
          <form onSubmit={handleCodeSearch} className="flex bg-[var(--bg)] border border-[var(--bd)] rounded-xl px-2.5 py-1.5 items-center gap-2">
            <Search className="w-4 h-4 text-[var(--t3)]" />
            <input 
              type="text" 
              placeholder="Jump to NM-..." 
              value={codeSearchValue}
              onChange={(e) => setCodeSearchValue(e.target.value)}
              className="bg-transparent text-xs text-[var(--t1)] outline-none w-28 uppercase"
            />
          </form>

          {/* Quick Counter Badges */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2 py-1 bg-[var(--ra)] text-[var(--t2)] font-mono text-[9px] font-extrabold rounded-md border border-[var(--bd)]/40">
              {articles.length} Analyzed
            </span>
            <span className="px-2 py-1 bg-[var(--ra)] text-[var(--t2)] font-mono text-[9px] font-extrabold rounded-md border border-[var(--bd)]/40">
              {articles.filter(a => a.starred).length} Starred
            </span>
            <span className={`px-2 py-1 font-mono text-[9px] font-extrabold rounded-md border ${
              geminiKey ? 'bg-emerald-500/5 text-emerald-600 border-emerald-500/10' : 'bg-red-500/5 text-red-600 border-red-500/10'
            }`}>
              Gemini: {geminiKey ? `****${geminiKey.slice(-4)}` : 'None'}
            </span>
          </div>
        </div>
      </div>

      {/* Internal Feature Horizontal Subnav */}
      <div className="flex border-b border-[var(--bd)]/40 overflow-x-auto gap-1 scrollbar-none pb-0.5">
        {[
          { id: 'today', label: '📰 Today\'s Shelf' },
          { id: 'import', label: '📥 Import' },
          { id: 'syllabus', label: '📚 Syllabus Browser' },
          { id: 'archive', label: '🗄️ Full Archive' },
          { id: 'starred', label: '⭐ Revision Vault' },
          { id: 'notes-vault', label: '📝 My Notes' },
          { id: 'ask', label: '🤖 Ask AI' },
          { id: 'summaries', label: '📋 Rollups' },
          { id: 'settings', label: '⚙️ Settings' },
          { id: 'backup', label: '💾 Backups' },
          { id: 'help', label: '❓ Guide' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => navigateTo(tab.id, null, null, null, true)}
            className={`px-3 py-2 font-sans text-xs font-extrabold uppercase tracking-wider whitespace-nowrap border-b-2 transition duration-150 ${
              activeSubTab === tab.id && selectedArticleCode === null
                ? 'text-[var(--gd)] border-[var(--gd)] font-extrabold bg-[var(--gd)]/5 rounded-t-xl'
                : 'text-[var(--t3)] border-transparent hover:text-[var(--t1)]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Render Router Content */}
      <div className="min-h-[50vh] transition duration-200">
        {selectedArticleCode !== null ? renderDetailView() : (
          activeSubTab === 'today' ? renderTodayView() :
          activeSubTab === 'import' ? renderImportView() :
          activeSubTab === 'syllabus' ? renderSyllabusView() :
          activeSubTab === 'archive' ? renderArchiveView() :
          activeSubTab === 'starred' ? renderRevisionView() :
          activeSubTab === 'notes-vault' ? renderNotesVaultView() :
          activeSubTab === 'ask' ? renderAskView() :
          activeSubTab === 'summaries' ? renderSummariesView() :
          activeSubTab === 'settings' ? renderSettingsView() :
          activeSubTab === 'backup' ? renderBackupView() :
          renderHelpView()
        )}
      </div>

      {/* Floating Term Popup Context Card */}
      {activeTermPopup && (
        <div 
          className="fixed z-50 p-4 bg-[var(--bg)] border border-[var(--bd)] shadow-lg rounded-2xl w-72 space-y-3 font-sans"
          style={{
            top: `${Math.min(activeTermPopup.y + 12, window.innerHeight - 220)}px`,
            left: `${Math.min(activeTermPopup.x, window.innerWidth - 300)}px`
          }}
        >
          <div className="space-y-1">
            <h4 className="text-xs font-bold text-[var(--gd)] uppercase">📌 {activeTermPopup.term}</h4>
            <p className="text-[11px] text-[var(--t2)] leading-relaxed text-justify">{activeTermPopup.context}</p>
          </div>
          <div className="flex gap-1.5 justify-end border-t border-[var(--bd)]/20 pt-2.5">
            <a 
              href={activeTermPopup.wiki} 
              target="_blank" 
              rel="noopener noreferrer"
              className="px-2.5 py-1.5 bg-[var(--ra)] text-[var(--t1)] border border-[var(--bd)] text-[10px] font-bold rounded-lg flex items-center gap-1 transition duration-150 shrink-0"
            >
              Wikipedia <ExternalLink className="w-3 h-3 text-[var(--gd)]" />
            </a>
            <button 
              onClick={() => {
                navigateTo('ask');
                setAskInputValue(`Explain "${activeTermPopup.term}" in UPSC Civil Services context — static background, core Prelims facts worth memorizing, Mains analytical GS-Paper angle, and recent policy relevance.`);
              }}
              className="px-2.5 py-1.5 bg-[var(--gd)] hover:bg-[var(--gd2)] text-white text-[10px] font-bold rounded-lg transition duration-150"
            >
              Ask AI About It
            </button>
            <button 
              onClick={() => setActiveTermPopup(null)}
              className="px-2 py-1.5 text-[var(--t3)] text-[10px] font-bold hover:text-[var(--t1)]"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

interface ArticleCardProps {
  article: Article;
  onSelectArticle: (code: string) => void;
  key?: any;
}

function ArticleCard({ article, onSelectArticle }: ArticleCardProps) {
  const scClass = article.ie_section === 'Editorial' ? 'bg-amber-500/10 text-amber-700 border-amber-500/20' :
                  article.ie_section === 'Explained' ? 'bg-blue-500/10 text-blue-700 border-blue-500/20' :
                  article.ie_section === 'Front Page' ? 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20' :
                  'bg-[var(--ra)] text-[var(--t2)] border-[var(--bd)]/40';

  return (
    <div 
      onClick={() => onSelectArticle(article.code)}
      className="p-5 bg-[var(--sur)] border border-[var(--bd)]/45 hover:border-[var(--gd)] rounded-2xl shadow-sm hover:shadow transition duration-200 cursor-pointer text-left space-y-3 flex flex-col justify-between"
    >
      <div className="space-y-2">
        {/* Top meta row */}
        <div className="flex flex-wrap items-center gap-2 text-[9px] font-mono">
          <span className="px-1.5 py-0.5 bg-[var(--ra)] text-[var(--gd)] font-bold rounded border border-[var(--bd)]/50">{article.code}</span>
          <span className={`px-1.5 py-0.5 rounded border ${scClass}`}>{article.ie_section}</span>
          <span className={`px-1.5 py-0.5 rounded border font-bold ${
            article.priority === 'High' ? 'bg-red-500/10 text-red-600 border-red-500/20' :
            article.priority === 'Medium' ? 'bg-amber-500/10 text-amber-600 border-amber-500/20' :
            'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
          }`}>{article.priority}</span>
          {article.starred && <span className="text-amber-500">★</span>}
          <span className="text-[var(--t3)] ml-auto">{article.date} · Page {article.page}</span>
        </div>

        {/* Headline */}
        <h4 className="text-sm font-serif font-bold text-[var(--t1)] leading-snug line-clamp-2 hover:text-[var(--gd)] transition duration-150">
          {article.headline}
        </h4>

        {/* Summary */}
        {article.quick_summary && (
          <p className="text-[11px] text-[var(--t2)] leading-relaxed font-serif line-clamp-2 text-justify">
            {article.quick_summary}
          </p>
        )}
      </div>

      {/* Bottom tags row */}
      <div className="space-y-1.5 pt-2 border-t border-[var(--bd)]/30">
        <div className="flex flex-wrap gap-1">
          {article.broad_subjects.slice(0, 2).map(sub => (
            <span key={sub} className="px-1.5 py-0.5 bg-blue-500/5 text-blue-600 border border-blue-500/10 rounded text-[9px] font-medium font-sans">
              {sub}
            </span>
          ))}
          {article.syllabus_points.slice(0, 3).map(sp => {
            const syl = SYLLABUS.find(s => s.id === sp);
            return (
              <span key={sp} className="px-1.5 py-0.5 bg-[var(--ra)] text-[var(--t2)] border border-[var(--bd)]/30 rounded text-[9px] font-medium font-sans">
                {syl?.subject || sp}
              </span>
            );
          })}
        </div>

        {/* Revision status tag */}
        <div className="flex items-center gap-1 text-[9px] text-[var(--t3)] font-semibold">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--gd)]"></span>
          <span>Revision: <span className="text-[var(--t2)] font-bold capitalize">{article.revision_status.replace('-', ' ')}</span></span>
        </div>
      </div>
    </div>
  );
}
