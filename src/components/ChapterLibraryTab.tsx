import React, { useState } from 'react';
import { 
  Folder as FolderIcon, Plus, BookOpen, Trash2, Import, 
  AlertCircle, FileText, X, FolderPlus, UploadCloud, Upload,
  Landmark, Coins, Hourglass, Globe, Leaf, Cpu, Globe2, Users, Heart, PenTool, Shield, Flame, Newspaper, BarChart3, HelpCircle, Edit2, Check, ArrowRight,
  RefreshCw
} from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';
import { Folder, Chapter, Topic, SubjectType, TopicProgress, Flashcard } from '../types';

// Configure pdfjs worker
try {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version || '6.0.227'}/build/pdf.worker.min.mjs`;
} catch (e) {
  console.warn('Failed to configure pdf.js worker URL:', e);
}

interface ChapterLibraryTabProps {
  folders: Folder[];
  chapters: Chapter[];
  onAddFolder: (folder: Folder) => void;
  onAddChapter: (chapter: Chapter) => void;
  onDeleteChapter: (chapterId: string) => void;
  onSelectChapter: (chapterId: string) => void;
  onImportChapter?: (chapter: Chapter, newFolder?: Folder) => void;
  onRenameFolder?: (folderId: string, newName: string) => void;
  onDeleteFolder?: (folderId: string) => void;
  onMoveChapter?: (chapterId: string, targetFolderId: string) => void;
  topicProgress?: Record<string, TopicProgress>;
  flashcards?: Flashcard[];
  activeFolderId: string | null;
  setActiveFolderId: (id: string | null) => void;
}

const SUBJECT_OPTIONS: SubjectType[] = ['polity', 'history', 'economy', 'geography', 'environment', 'science', 'ethics', 'csat'];

const FOLDER_COLOR_OPTIONS = [
  { name: 'Indigo Accent', class: 'bg-indigo-950 border-indigo-800 text-indigo-200' },
  { name: 'Amber Scholar', class: 'bg-amber-950 border-amber-800 text-amber-200' },
  { name: 'Emerald Forest', class: 'bg-emerald-950 border-emerald-800 text-emerald-200' },
  { name: 'Teal Trade', class: 'bg-teal-950 border-teal-800 text-teal-200' },
  { name: 'Sky Air', class: 'bg-sky-950 border-sky-800 text-sky-200' },
  { name: 'Slate Policy', class: 'bg-slate-900 border-slate-750 text-slate-200' },
  { name: 'Rose Heritage', class: 'bg-rose-950 border-rose-800 text-rose-200' }
];

const DEFAULT_FOLDER_IDS = [
  'f-polity', 'f-economy', 'f-modern-history', 'f-ancient-history', 'f-medieval-history',
  'f-art-culture', 'f-geography', 'f-environment-ecology', 'f-science-tech', 'f-ir',
  'f-society', 'f-ethics', 'f-essay', 'f-security', 'f-disaster', 'f-ca', 'f-econ-optional',
  'f-misc'
];

const DEFAULT_FOLDERS_MAP = [
  { id: 'f-polity', name: 'Polity and Governance', keywords: ['polity', 'governance', 'constitution', 'articles', 'parliament', 'president', 'court', 'bill', 'state', 'union', 'executive', 'legislature', 'judicial', 'gs2', 'gs ii', 'act', 'schedule', 'fundamental rights', 'citizenship', 'panchayat'] },
  { id: 'f-economy', name: 'Economy', keywords: ['economy', 'economics', 'macroeconomics', 'gdp', 'inflation', 'budget', 'banking', 'finance', 'fiscal', 'tax', 'gs3', 'gs iii', 'growth', 'trade', 'wto', 'imf', 'rbi', 'investment', 'industrial', 'infrastructure'] },
  { id: 'f-modern-history', name: 'Modern History', keywords: ['modern history', 'modern india', 'freedom struggle', 'gandhi', 'british', 'east india company', 'revolt', 'independence', '1857', 'viceroy', 'congress', 'inc', 'partition', 'satyagraha', 'movement'] },
  { id: 'f-ancient-history', name: 'Ancient History', keywords: ['ancient history', 'ancient india', 'harappa', 'indus valley', 'vedic', 'buddhism', 'jainism', 'mauryan', 'gupta', 'stone age', 'megalithic', 'ashoka', 'chalcolithic', 'paleolithic', 'neolithic'] },
  { id: 'f-medieval-history', name: 'Medieval History', keywords: ['medieval history', 'medieval india', 'delhi sultanate', 'mughal', 'chola', 'vijayanagara', 'rajput', 'maratha', 'bhakti', 'sufi', 'akbar', 'aurangzeb', 'sultan', 'sher shah'] },
  { id: 'f-art-culture', name: 'Art and Culture', keywords: ['art and culture', 'art', 'culture', 'architecture', 'dance', 'music', 'painting', 'literature', 'drama', 'temple', 'sculpture', 'heritage', 'unesco', 'puja', 'festivals'] },
  { id: 'f-geography', name: 'Geography', keywords: ['geography', 'physical geography', 'indian geography', 'map', 'monsoon', 'climate', 'soil', 'river', 'earthquake', 'volcano', 'ocean', 'resource', 'agriculture', 'el nino', 'la nina', 'atmosphere', 'latitude', 'longitude'] },
  { id: 'f-environment-ecology', name: 'Environment and Ecology', keywords: ['environment', 'ecology', 'biodiversity', 'pollution', 'climate change', 'cop', 'unfccc', 'wildlife', 'conservation', 'sanctuary', 'national park', 'global warming', 'ecosystem', 'wetland', 'mangrove', 'species'] },
  { id: 'f-science-tech', name: 'Science and Technology', keywords: ['science and technology', 'science', 'technology', 'space', 'defense', 'biotech', 'nanotech', 'it', 'computer', 'nuclear', 'health', 'disease', 'vaccine', 'ai', 'robotics', 'orbit', 'missile', 'satellite', '5g', 'cloning'] },
  { id: 'f-ir', name: 'International Relations', keywords: ['international relations', 'ir', 'foreign policy', 'diplomacy', 'un', 'bilateral', 'china', 'usa', 'pakistan', 'g20', 'asean', 'summit', 'treaty', 'border dispute', 'indo-pacific', 'saarc', 'brics'] },
  { id: 'f-society', name: 'Society and Social Justice', keywords: ['society', 'social justice', 'women', 'poverty', 'population', 'urbanization', 'demography', 'caste', 'minority', 'vulnerable', 'education', 'health', 'welfare', 'globalization', 'secularism', 'communalism'] },
  { id: 'f-ethics', name: 'Ethics', keywords: ['ethics', 'integrity', 'aptitude', 'morality', 'values', 'attitude', 'probity', 'case study', 'emotional intelligence', 'philosopher', 'honesty', 'gs4', 'gs iv', 'conscience', 'corruption', 'empathy', 'compassion'] },
  { id: 'f-essay', name: 'Essay', keywords: ['essay', 'philosophical essay', 'writing', 'composition', 'essay optional'] },
  { id: 'f-security', name: 'Security', keywords: ['security', 'internal security', 'terrorism', 'cyber', 'border', 'naxal', 'insurgency', 'money laundering', 'extremism', 'forces', 'defense forces', 'radicalization'] },
  { id: 'f-disaster', name: 'Disaster Management', keywords: ['disaster', 'disaster management', 'flood', 'drought', 'cyclone', 'ndma', 'hazard', 'mitigation', 'landslide', 'tsunami', 'forest fire', 'earthquake hazard'] },
  { id: 'f-ca', name: 'Current Affairs', keywords: ['current affairs', 'news', 'daily news', 'editorial', 'newspaper', 'monthly compilation', 'current news', 'pib', 'yojana', 'kurukshetra'] },
  { id: 'f-econ-optional', name: 'Economics Optional', keywords: ['economics optional', 'ricardo', 'keynes', 'optional paper', 'consumer theory', 'producer theory', 'monetary theory', 'optional economics', 'microeconomics optional', 'is-lm'] },
  { id: 'f-misc', name: 'Miscellaneous', keywords: ['miscellaneous', 'misc', 'general', 'other', 'syllabus overview'] }
];

const getFolderIcon = (folderName: string) => {
  const name = folderName.toLowerCase();
  if (name.includes('polity') || name.includes('governance')) return Landmark;
  if (name.includes('economics optional')) return BarChart3;
  if (name.includes('economy')) return Coins;
  if (name.includes('modern history')) return Hourglass;
  if (name.includes('ancient history')) return BookOpen;
  if (name.includes('medieval history')) return BookOpen;
  if (name.includes('art') || name.includes('culture')) return PenTool;
  if (name.includes('geography')) return Globe;
  if (name.includes('environment')) return Leaf;
  if (name.includes('science') || name.includes('tech')) return Cpu;
  if (name.includes('international relations') || name.includes('ir')) return Globe2;
  if (name.includes('society') || name.includes('social')) return Users;
  if (name.includes('ethics')) return Heart;
  if (name.includes('essay')) return PenTool;
  if (name.includes('security')) return Shield;
  if (name.includes('disaster')) return Flame;
  if (name.includes('current affairs')) return Newspaper;
  return FolderIcon;
};

export default function ChapterLibraryTab({
  folders,
  chapters,
  onAddFolder,
  onAddChapter,
  onDeleteChapter,
  onSelectChapter,
  onImportChapter,
  onRenameFolder,
  onDeleteFolder,
  onMoveChapter,
  topicProgress = {},
  flashcards = [],
  activeFolderId,
  setActiveFolderId
}: ChapterLibraryTabProps) {
  
  // Modals / Forms state
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderSubject, setNewFolderSubject] = useState<SubjectType>('polity');
  const [newFolderColor, setNewFolderColor] = useState(FOLDER_COLOR_OPTIONS[0].class);

  // Folder action state
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editingFolderName, setEditingFolderName] = useState('');
  const [folderToDelete, setFolderToDelete] = useState<Folder | null>(null);
  const [movingChapterId, setMovingChapterId] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const [showChapterModal, setShowChapterModal] = useState(false);
  const [newChapterTitle, setNewChapterTitle] = useState('');
  const [newChapterDesc, setNewChapterDesc] = useState('');
  const [newChapterSource, setNewChapterSource] = useState('');
  const [newChapterTopics, setNewChapterTopics] = useState<{ id: string; title: string; full_text: string }[]>([
    { id: 't-1', title: '1. Introduction', full_text: '' }
  ]);

  const [showImportModal, setShowImportModal] = useState(false);
  const [pastedJson, setPastedJson] = useState('');
  const [importError, setImportError] = useState('');
  const [dragActive, setDragActive] = useState(false);

  // Document Import (PDF & Word) States
  const [showDocImportModal, setShowDocImportModal] = useState(false);
  const [docImporting, setDocImporting] = useState(false);
  const [docImportError, setDocImportError] = useState<string | null>(null);

  // Extract PDF text in-browser
  const extractTextFromPDF = async (arrayBuffer: ArrayBuffer): Promise<string> => {
    try {
      const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
      const pdf = await loadingTask.promise;
      let fullText = '';
      
      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          // @ts-ignore
          .map(item => item.str)
          .join(' ');
        fullText += pageText + '\n\n';
      }
      return fullText;
    } catch (err: any) {
      console.error('PDF extraction failed:', err);
      throw new Error(`PDF extraction failed: ${err.message || err}`);
    }
  };

  // Extract Word DOCX text in-browser
  const extractTextFromDOCX = async (arrayBuffer: ArrayBuffer): Promise<string> => {
    try {
      const result = await mammoth.extractRawText({ arrayBuffer });
      return result.value;
    } catch (err: any) {
      console.error('Word extraction failed:', err);
      throw new Error(`Word extraction failed: ${err.message || err}`);
    }
  };

  // Handle uploaded document file
  const handleDocFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setDocImporting(true);
    setDocImportError(null);

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const arrayBuffer = event.target?.result as ArrayBuffer;
        let extractedText = '';

        if (file.name.toLowerCase().endsWith('.pdf')) {
          extractedText = await extractTextFromPDF(arrayBuffer);
        } else if (file.name.toLowerCase().endsWith('.docx')) {
          extractedText = await extractTextFromDOCX(arrayBuffer);
        } else {
          throw new Error('Unsupported file format. Please upload a .pdf or .docx document.');
        }

        if (!extractedText.trim()) {
          throw new Error('No readable text could be extracted from this document.');
        }

        // Split text into paragraphs (double/multiple newlines)
        const paragraphs = extractedText
          .split(/\r?\n\s*\r?\n/)
          .map(p => p.trim())
          .filter(p => p.length > 20);

        if (paragraphs.length === 0) {
          // Fallback: split by single newline if no double newlines
          const singleLines = extractedText
            .split(/\r?\n/)
            .map(p => p.trim())
            .filter(p => p.length > 20);
          paragraphs.push(...singleLines);
        }

        if (paragraphs.length === 0) {
          throw new Error('Could not partition text into paragraphs. The document might be scanned/empty.');
        }

        // Convert paragraphs into Topic sections
        const topics: Topic[] = paragraphs.map((para, idx) => {
          let title = para.split(/[.!?\n]/)[0].trim();
          if (title.length > 50) {
            title = title.substring(0, 47) + '...';
          }
          if (!title) {
            title = `Section ${idx + 1}`;
          }

          const sectionId = `t-doc-${idx}-${Date.now()}`;

          return {
            id: sectionId,
            title: `${idx + 1}. ${title}`,
            order: idx + 1,
            full_text: para,
            raw_text: para,
            key_concepts: [
              {
                concept: "Core Takeaway",
                explanation: para.substring(0, 250) + (para.length > 250 ? "..." : "")
              }
            ],
            lesson_slides: [
              {
                slide_number: 1,
                title: `Brief: ${title}`,
                type: "Summary",
                content: para.substring(0, 180) + (para.length > 180 ? "..." : "")
              }
            ],
            flashcards: [
              {
                front: `Key query on: ${title}?`,
                back: para.substring(0, 155) + "..."
              }
            ]
          };
        });

        const activeFolder = folders.find(f => f.id === activeFolderId);
        const folderSubject = activeFolder?.subject || 'Imported';
        const folderName = activeFolder?.name || 'Imported';

        const newCh: Chapter = {
          id: `ch-doc-${Date.now()}`,
          folderId: activeFolderId || '',
          title: file.name.replace(/\.[^/.]+$/, ""),
          description: `Extracted from "${file.name}"`,
          subject: folderSubject,
          source: 'Imported Document',
          metadata: {
            book: 'Imported Document',
            chapter_number: chapters.length + 1,
            chapter_title: file.name.replace(/\.[^/.]+$/, ""),
            subject: folderName
          },
          topics,
          important_articles: [],
          createdAt: new Date().toISOString()
        };

        onAddChapter(newCh);

        setSuccessToast(`Successfully imported document as chapter "${newCh.title}"!`);
        setShowDocImportModal(false);
      } catch (err: any) {
        console.error('Extraction error:', err);
        setDocImportError(err.message || 'An error occurred during file extraction.');
      } finally {
        setDocImporting(false);
      }
    };

    reader.onerror = () => {
      setDocImportError('Failed to read the file.');
      setDocImporting(false);
    };

    reader.readAsArrayBuffer(file);
  };

  const handleJsonFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const parsed = JSON.parse(text); 
        setPastedJson(text);
        setImportError('');

        const importedTopics = parsed.topics || parsed.sections;
        if (!importedTopics || !Array.isArray(importedTopics) || importedTopics.length === 0) {
          throw new Error("Missing or empty 'topics' array inside the uploaded JSON.");
        }

        setParsedImportData(parsed);
        const { folderId, unsure } = findClosestFolder(parsed);
        setTargetFolderIdForImport(folderId);
        setShowUnsureWarning(unsure);
        setImportStage('preview');
      } catch (err: any) {
        setImportError(err.message || 'Invalid JSON file. Please ensure it is a valid JSON document.');
      }
    };
    reader.readAsText(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleJsonFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleJsonFile(e.target.files[0]);
    }
  };

  // Sample JSON template for importing chapters
  const SAMPLE_IMPORT_JSON = JSON.stringify({
    title: "Article 21: Right to Life and Personal Liberty",
    description: "Analyses the expanding horizons of Article 21, including environmental rights, privacy, and judicial activism.",
    source: "Supreme Court Rulings & Laxmikanth",
    topics: [
      {
        title: "1. Dual Dimensions of Article 21",
        full_text: "Article 21 declares that no person shall be deprived of his life or personal liberty except according to procedure established by law. In the famous Gopalan case (1950), the Supreme Court took a narrow view. However, in the Maneka Gandhi case (1978), the court reversed its stand, establishing that procedure must be just, fair, and reasonable."
      },
      {
        title: "2. The Doctrine of Due Process of Law",
        full_text: "Through the Maneka case, the Supreme Court introduced the American concept of 'Due Process of Law' into Article 21, making the right to life protection available not just against arbitrary executive action but also against arbitrary legislative action."
      }
    ]
  }, null, 2);

  // Add topic to new chapter form
  const handleAddTopicField = () => {
    const nextNum = newChapterTopics.length + 1;
    setNewChapterTopics([
      ...newChapterTopics,
      { id: `t-${Date.now()}`, title: `${nextNum}. New Subtopic`, full_text: '' }
    ]);
  };

  const handleRemoveTopicField = (idx: number) => {
    if (newChapterTopics.length === 1) return;
    setNewChapterTopics(newChapterTopics.filter((_, i) => i !== idx));
  };

  const handleTopicChange = (idx: number, field: 'title' | 'full_text', val: string) => {
    const updated = [...newChapterTopics];
    updated[idx][field] = val;
    setNewChapterTopics(updated);
  };

  // Submit handlers
  const handleCreateFolder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    const folderId = `f-${Date.now()}`;
    const newFolder: Folder = {
      id: folderId,
      name: newFolderName.trim(),
      subject: newFolderSubject,
      color: newFolderColor
    };
    onAddFolder(newFolder);
    setNewFolderName('');
    setActiveFolderId(folderId);
    setShowFolderModal(false);
  };

  const handleCreateChapter = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChapterTitle.trim() || !activeFolderId) return;

    const currentFolder = folders.find(f => f.id === activeFolderId);
    if (!currentFolder) return;

    const chapterId = `ch-${Date.now()}`;
    const cleanTopics: Topic[] = newChapterTopics.map((t, idx) => ({
      id: `topic-${idx}-${Date.now()}`,
      title: t.title.trim() || `Subtopic ${idx + 1}`,
      full_text: t.full_text.trim() || 'Content coming soon.',
      order: idx + 1,
      key_concepts: [],
      flashcards: [],
      lesson_slides: [
        {
          slide_number: 1,
          title: t.title.trim(),
          type: "Summary",
          content: t.full_text.trim().substring(0, 180) + "..."
        }
      ]
    }));

    const newCh: Chapter = {
      id: chapterId,
      folderId: activeFolderId,
      title: newChapterTitle.trim(),
      description: newChapterDesc.trim() || 'No description provided.',
      subject: currentFolder.subject,
      source: newChapterSource.trim() || 'Self Notes',
      metadata: {
        book: newChapterSource.trim() || 'Self Study',
        chapter_number: chapters.length + 1,
        chapter_title: newChapterTitle.trim(),
        subject: currentFolder.subject
      },
      topics: cleanTopics,
      important_articles: [],
      createdAt: new Date().toISOString()
    };

    onAddChapter(newCh);
    
    // reset
    setNewChapterTitle('');
    setNewChapterDesc('');
    setNewChapterSource('');
    setNewChapterTopics([{ id: 't-1', title: '1. Introduction', full_text: '' }]);
    setShowChapterModal(false);
  };

  const [importStage, setImportStage] = useState<'input' | 'preview'>('input');
  const [parsedImportData, setParsedImportData] = useState<any | null>(null);
  const [targetFolderIdForImport, setTargetFolderIdForImport] = useState<string>('');
  const [showUnsureWarning, setShowUnsureWarning] = useState<boolean>(false);

  const findClosestFolder = (parsed: any): { folderId: string; unsure: boolean } => {
    const subject = String(parsed.subject || parsed.metadata?.subject || '');
    const paper = String(parsed.paper || parsed.metadata?.paper || '');
    const syllabusArea = String(parsed.syllabusArea || parsed.metadata?.syllabusArea || '');
    const book = String(parsed.book || parsed.source || parsed.metadata?.book || '');
    const chapterTitle = String(parsed.chapter_title || parsed.title || parsed.metadata?.chapter_title || '');
    const tags = Array.isArray(parsed.tags) ? parsed.tags.join(' ') : String(parsed.tags || '');

    const combinedText = `${subject} ${paper} ${syllabusArea} ${book} ${chapterTitle} ${tags}`.toLowerCase();

    let bestMatchId = 'f-misc'; // default fallback
    let highestScore = 0;

    DEFAULT_FOLDERS_MAP.forEach(f => {
      let score = 0;
      f.keywords.forEach(kw => {
        if (combinedText.includes(kw)) {
          score += kw.split(' ').length * 10;
        }
      });
      if (score > highestScore) {
        highestScore = score;
        bestMatchId = f.id;
      }
    });

    // Also look at custom folders
    folders.forEach(f => {
      if (!DEFAULT_FOLDER_IDS.includes(f.id)) {
        if (combinedText.includes(f.name.toLowerCase())) {
          const score = 30;
          if (score > highestScore) {
            highestScore = score;
            bestMatchId = f.id;
          }
        }
      }
    });

    return {
      folderId: bestMatchId,
      unsure: highestScore < 15
    };
  };

  const handleProceedToPreview = () => {
    setImportError('');
    try {
      const parsed = JSON.parse(pastedJson);
      
      const importedTopics = parsed.topics || parsed.sections;
      if (!importedTopics || !Array.isArray(importedTopics) || importedTopics.length === 0) {
        throw new Error("Missing or empty 'topics' array inside the uploaded JSON.");
      }

      setParsedImportData(parsed);
      const { folderId, unsure } = findClosestFolder(parsed);
      setTargetFolderIdForImport(folderId);
      setShowUnsureWarning(unsure);
      setImportStage('preview');
    } catch (err: any) {
      setImportError(err.message || 'Invalid JSON format. Please check the structure and try again.');
    }
  };

  const handleConfirmImport = () => {
    if (!parsedImportData) return;
    setImportError('');

    try {
      const parsed = parsedImportData;
      const chapterTitle = parsed.title || parsed.metadata?.chapter_title || parsed.chapter_title || "Untitled Chapter";
      const chapterDesc = parsed.description || parsed.chapter_intro || "Imported Syllabus Chapter.";
      const chapterSource = parsed.source || parsed.metadata?.book || "Imported Resource";
      const chapterIntro = parsed.chapter_intro || parsed.description || "";
      const chapterBackground = parsed.chapter_background || "";
      const importedTopics = parsed.topics || parsed.sections;

      const targetFolder = folders.find(f => f.id === targetFolderIdForImport) || folders[0];
      if (!targetFolder) throw new Error('Target cabinet is invalid.');

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
          chapter_number: parsed.metadata?.chapter_number || (chapters.length + 1),
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

      if (onImportChapter) {
        onImportChapter(newCh);
      } else {
        onAddChapter(newCh);
      }

      // Automatically switch focus to target cabinet folder so user sees it loaded!
      setActiveFolderId(targetFolder.id);

      // Set elegant success toast message
      setSuccessToast(`Successfully imported "${chapterTitle}" to "${targetFolder.name}" cabinet!`);
      setTimeout(() => {
        setSuccessToast(null);
      }, 6000);

      // Reset import state
      setPastedJson('');
      setParsedImportData(null);
      setImportStage('input');
      setShowImportModal(false);
    } catch (err: any) {
      setImportError(err.message || 'Failed to complete import.');
    }
  };

  const activeFolder = folders.find(f => f.id === activeFolderId) || null;
  const filteredChapters = chapters.filter(c => c.folderId === activeFolderId);

  return (
    <div id="chapter_library_tab" className="space-y-6 text-left relative">
      
      {/* Elegant Sliding Success Toast */}
      {successToast && (
        <div className="fixed top-6 right-6 z-50 bg-emerald-950/95 border-2 border-emerald-500 text-emerald-200 px-5 py-3.5 rounded-3xl shadow-2xl flex items-center gap-3 animate-slide-in max-w-sm backdrop-blur-md">
          <Check className="w-5 h-5 text-emerald-400 shrink-0" />
          <div className="text-xs">
            <p className="font-bold font-sans">Import Succeeded</p>
            <p className="font-serif leading-relaxed text-emerald-300/90 mt-0.5">{successToast}</p>
          </div>
          <button onClick={() => setSuccessToast(null)} className="text-emerald-400/60 hover:text-emerald-200 ml-auto shrink-0 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      
      {/* Subject Folders Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[var(--bd)] pb-4">
        <div>
          <h2 className="font-serif text-xl font-bold text-[var(--t1)]">Study Folders Directory</h2>
          <p className="text-xs text-[var(--t2)] font-serif">Select an GS Subject folder to access and manage structured UPSC readings.</p>
        </div>
        <div className="flex gap-2.5 shrink-0">
          <button
            onClick={() => setShowFolderModal(true)}
            className="bg-[var(--sur)] hover:bg-[var(--ra)] text-[var(--t1)] border border-[var(--bd)] px-3.5 py-2 rounded-2xl text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition duration-200"
          >
            <FolderPlus className="w-4 h-4 text-[var(--gd)]" />
            Add Folder
          </button>
          {activeFolderId && (
            <>
              <button
                onClick={() => setShowImportModal(true)}
                className="bg-[var(--sur)] hover:bg-[var(--ra)] text-[var(--t1)] border border-[var(--bd)] px-3.5 py-2 rounded-2xl text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition duration-200"
              >
                <Import className="w-4 h-4 text-[var(--gd)]" />
                Import JSON
              </button>
              <button
                onClick={() => setShowDocImportModal(true)}
                className="bg-[var(--sur)] hover:bg-[var(--ra)] text-[var(--t1)] border border-[var(--bd)] px-3.5 py-2 rounded-2xl text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition duration-200"
              >
                <Upload className="w-4 h-4 text-[var(--gd)]" />
                Import Document
              </button>
              <button
                onClick={() => setShowChapterModal(true)}
                className="bg-[var(--gd)] text-[var(--bg)] px-3.5 py-2 rounded-2xl text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition duration-200 shadow-md"
              >
                <Plus className="w-4 h-4" />
                Add Chapter
              </button>
            </>
          )}
        </div>
      </div>

      {/* Folders Row Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {folders.map(folder => {
          const isActive = folder.id === activeFolderId;
          const count = chapters.filter(c => c.folderId === folder.id).length;
          const isCustom = !DEFAULT_FOLDER_IDS.includes(folder.id);
          const FolderIconComponent = getFolderIcon(folder.name);

          // Calculate progress percentage
          const folderChapters = chapters.filter(c => c.folderId === folder.id);
          const folderChapterIds = folderChapters.map(c => c.id);
          let totalPoints = 0;
          let completedPoints = 0;
          folderChapters.forEach(c => {
            (c.topics || []).forEach(t => {
              totalPoints += 4;
              const prog = topicProgress?.[t.id];
              if (prog) {
                if (prog.read) completedPoints += 1;
                if (prog.slides) completedPoints += 1;
                if (prog.concepts) completedPoints += 1;
                if (prog.flashcards) completedPoints += 1;
              }
            });
          });
          const progressPercentage = totalPoints > 0 ? Math.round((completedPoints / totalPoints) * 100) : 0;

          // Calculate PYQs count
          const pyqsCount = folderChapters.reduce((sum, c) => 
            sum + (c.topics || []).reduce((tSum, t) => tSum + (t.pyqs?.length || t.pyq_ids?.length || 0), 0), 0
          );

          // Calculate due cards count
          const dueCardsCount = (flashcards || []).filter(f => 
            f.chapterId && folderChapterIds.includes(f.chapterId) && 
            new Date(f.nextReviewDate) <= new Date()
          ).length;

          return (
            <div
              key={folder.id}
              onClick={() => setActiveFolderId(folder.id)}
              className={`p-4 rounded-3xl border-2 text-left cursor-pointer transition-all duration-200 relative overflow-hidden group ${
                isActive 
                  ? `${folder.color} ring-2 ring-[var(--gd)] border-transparent shadow-md`
                  : 'bg-[var(--sur)] hover:bg-[var(--ra)] border-[var(--bd)] text-[var(--t1)]'
              }`}
            >
              {/* Custom Folder Management Action Icons */}
              {isCustom && (
                <div className="absolute top-2.5 right-2.5 flex gap-1 z-10" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => {
                      setEditingFolderId(folder.id);
                      setEditingFolderName(folder.name);
                    }}
                    className="p-1 text-[var(--t3)] hover:text-[var(--gd)] rounded-lg hover:bg-[var(--ra)]/80 transition"
                    title="Rename Cabinet"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setFolderToDelete(folder)}
                    className="p-1 text-[var(--t3)] hover:text-red-500 rounded-lg hover:bg-red-500/10 transition"
                    title="Delete Cabinet"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              <div className="flex items-start justify-between pr-8">
                <div className="flex items-center gap-2">
                  <div className={`p-1.5 rounded-xl ${isActive ? 'bg-white/20 text-white' : 'bg-[var(--ra)] text-[var(--gd)]'}`}>
                    <FolderIconComponent className="w-5 h-5 shrink-0" />
                  </div>
                  <div className="min-w-0">
                    <h3 className={`text-xs font-bold uppercase tracking-wide truncate max-w-[120px] ${isActive ? 'text-white' : 'text-[var(--t1)]'}`}>
                      {folder.name}
                    </h3>
                    <p className={`text-[9px] font-serif ${isActive ? 'text-indigo-200' : 'text-[var(--t3)]'}`}>
                      {folder.subject}
                    </p>
                  </div>
                </div>
              </div>

              {/* Progress bar */}
              <div className="mt-3.5 space-y-1">
                <div className="flex justify-between items-center text-[9px]">
                  <span className={isActive ? 'text-indigo-200' : 'text-[var(--t3)]'}>Progress</span>
                  <span className={`font-bold ${isActive ? 'text-white' : 'text-[var(--t1)]'}`}>{progressPercentage}%</span>
                </div>
                <div className={`w-full h-1 rounded-full overflow-hidden ${isActive ? 'bg-indigo-950/50' : 'bg-[var(--ra)]'}`}>
                  <div 
                    className={`h-full transition-all duration-300 ${isActive ? 'bg-white' : 'bg-[var(--gd)]'}`}
                    style={{ width: `${progressPercentage}%` }}
                  />
                </div>
              </div>

              {/* Dynamic stats list */}
              <div className="grid grid-cols-3 gap-1.5 mt-3 pt-3 border-t border-dashed border-[var(--bd)]/40 text-[9px] font-mono">
                <div className="text-center">
                  <p className={isActive ? 'text-indigo-200' : 'text-[var(--t3)]'}>CH</p>
                  <p className={`font-bold text-xs ${isActive ? 'text-white' : 'text-[var(--t1)]'}`}>{count}</p>
                </div>
                <div className="text-center border-x border-[var(--bd)]/30">
                  <p className={isActive ? 'text-indigo-200' : 'text-[var(--t3)]'}>PYQ</p>
                  <p className={`font-bold text-xs ${isActive ? 'text-white' : 'text-[var(--t1)]'}`}>{pyqsCount}</p>
                </div>
                <div className="text-center">
                  <p className={isActive ? 'text-indigo-200' : 'text-[var(--t3)]'}>DUE</p>
                  <p className={`font-bold text-xs ${dueCardsCount > 0 ? 'text-amber-500' : (isActive ? 'text-indigo-200' : 'text-[var(--t3)]')}`}>
                    {dueCardsCount}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Chapters list in Active Folder */}
      {activeFolder ? (
        <div className="bg-[var(--sur)] rounded-3xl border border-[var(--bd)] shadow-sm overflow-hidden text-left">
          <div className="bg-[var(--ra)] text-[var(--t1)] px-5 py-4 flex justify-between items-center border-b border-[var(--bd)]">
            <div>
              <span className="text-[10px] uppercase tracking-widest font-bold text-[var(--gd)]">{activeFolder.subject} GS Cabinet</span>
              <h3 className="font-serif font-bold text-lg text-[var(--t1)]">{activeFolder.name}</h3>
            </div>
            <span className="text-xs bg-[var(--sur)] text-[var(--gd)] border border-[var(--bd)] px-3 py-1 rounded-xl font-mono">
              {filteredChapters.length} Chapters total
            </span>
          </div>

          {filteredChapters.length === 0 ? (
            <div className="p-10 text-center space-y-4">
              <div className="mx-auto w-12 h-12 bg-[var(--ra)] border border-[var(--bd)] rounded-full flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-[var(--gd)]" />
              </div>
              <div className="max-w-xs mx-auto">
                <p className="text-sm font-bold text-[var(--t1)]">This folder is currently empty</p>
                <p className="text-xs text-[var(--t2)] font-serif mt-1">Begin standard core preparation by importing custom readings via JSON, or creating your own.</p>
              </div>
              <div className="flex gap-2 justify-center">
                <button
                  onClick={() => setShowImportModal(true)}
                  className="bg-[var(--ra)] hover:bg-[var(--sur)] border border-[var(--bd)] px-4 py-1.5 rounded-xl text-xs font-bold transition"
                >
                  Import Syllabus JSON
                </button>
                <button
                  onClick={() => setShowChapterModal(true)}
                  className="bg-[var(--gd)] text-[var(--bg)] px-4 py-1.5 rounded-xl text-xs font-bold transition"
                >
                  Create Chapter Form
                </button>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-[var(--bd)]">
              {filteredChapters.map(chapter => (
                <div key={chapter.id} className="p-4 sm:p-5 hover:bg-[var(--ra)]/40 transition flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-sm font-bold text-[var(--t1)] hover:text-[var(--gd)] transition cursor-pointer font-serif" onClick={() => onSelectChapter(chapter.id)}>
                        {chapter.title}
                      </h4>
                      {chapter.source && (
                        <span className="text-[9px] uppercase tracking-wider font-mono bg-[var(--ra)] text-[var(--t2)] px-1.5 py-0.5 rounded-lg border border-[var(--bd)]">
                          Ref: {chapter.source}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[var(--t2)] font-serif leading-relaxed line-clamp-2 max-w-2xl">{chapter.description}</p>
                    <div className="flex items-center gap-3 text-[10px] text-[var(--t3)] font-mono">
                      <span>Topics: {chapter.topics ? chapter.topics.length : 0}</span>
                      <span>•</span>
                      <span>Created: {new Date(chapter.createdAt || new Date()).toLocaleDateString()}</span>
                    </div>
                  </div>

                   <div className="flex gap-2 shrink-0 self-end sm:self-auto items-center">
                    <button
                      onClick={() => setMovingChapterId(chapter.id)}
                      className="bg-[var(--ra)] hover:bg-[var(--gd)] hover:text-[var(--bg)] text-[var(--t1)] border border-[var(--bd)] px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1"
                      title="Move chapter to another cabinet"
                    >
                      <ArrowRight className="w-3.5 h-3.5" />
                      <span>Move</span>
                    </button>
                    <button
                      onClick={() => onSelectChapter(chapter.id)}
                      className="bg-[var(--gd)] text-[var(--bg)] hover:opacity-90 px-3.5 py-1.5 rounded-xl text-xs font-bold transition"
                    >
                      Read Chapter
                    </button>
                    <button
                      onClick={() => onDeleteChapter(chapter.id)}
                      className="text-red-500 hover:bg-red-500/10 p-2 rounded-xl transition border border-transparent hover:border-red-500/20"
                      title="Delete reading material"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="p-8 text-center text-[var(--t3)] italic bg-[var(--sur)] rounded-3xl border border-[var(--bd)]">
          No folder selected. Create or select a subject folder above to unlock resources.
        </div>
      )}

      {/* FOLDER MODAL */}
      {showFolderModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-40 backdrop-blur-xs animate-fade-in">
          <div className="bg-[var(--sur)] border border-[var(--bd)] rounded-3xl shadow-xl w-full max-w-md overflow-hidden relative">
            <div className="bg-[var(--ra)] text-[var(--t1)] px-4 py-3 border-b border-[var(--bd)] flex justify-between items-center">
              <h3 className="font-serif font-bold text-sm text-[var(--t1)] uppercase tracking-wider">Create New Study Cabinet</h3>
              <button onClick={() => setShowFolderModal(false)} className="text-[var(--t3)] hover:text-[var(--t1)]"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleCreateFolder} className="p-5 space-y-4 text-left">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[var(--t2)] mb-1">Cabinet Name</label>
                <input
                  type="text"
                  required
                  className="w-full bg-[var(--ra)] text-[var(--t1)] border border-[var(--bd)] rounded-xl p-2 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--gd)]"
                  placeholder="e.g. Constitutional Bodies, GS-III Security Issues"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[var(--t2)] mb-1">General Subject Group</label>
                <select
                  className="w-full bg-[var(--ra)] text-[var(--t1)] border border-[var(--bd)] rounded-xl p-2 px-3 text-sm focus:outline-none"
                  value={newFolderSubject}
                  onChange={(e) => setNewFolderSubject(e.target.value as SubjectType)}
                >
                  {SUBJECT_OPTIONS.map(opt => <option key={opt} value={opt}>{opt.toUpperCase()}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[var(--t2)] mb-1.5">Aesthetic Color Palette</label>
                <div className="grid grid-cols-2 gap-2">
                  {FOLDER_COLOR_OPTIONS.map((col, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setNewFolderColor(col.class)}
                      className={`p-2 rounded-xl border text-left text-[11px] truncate font-bold transition-all ${col.class} ${
                        newFolderColor === col.class ? 'ring-2 ring-[var(--gd)] border-transparent' : 'opacity-70 hover:opacity-100'
                      }`}
                    >
                      {col.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-[var(--bd)]">
                <button
                  type="button"
                  onClick={() => setShowFolderModal(false)}
                  className="px-4 py-1.5 rounded-xl text-xs font-bold text-[var(--t2)] hover:bg-[var(--ra)] transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-[var(--gd)] text-[var(--bg)] px-4 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider shadow-md hover:opacity-90 transition"
                >
                  Initialize Cabinet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CHAPTER MODAL */}
      {showChapterModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-40 backdrop-blur-xs overflow-y-auto">
          <div className="bg-[var(--sur)] border border-[var(--bd)] rounded-3xl shadow-xl w-full max-w-2xl my-8 overflow-hidden relative text-left">
            <div className="bg-[var(--ra)] text-[var(--t1)] px-4 py-3 border-b border-[var(--bd)] flex justify-between items-center">
              <div>
                <span className="text-[9px] uppercase tracking-widest font-bold text-[var(--gd)] font-mono">Form Composer</span>
                <h3 className="font-serif font-bold text-sm text-[var(--t1)]">Create Study Chapter</h3>
              </div>
              <button onClick={() => setShowChapterModal(false)} className="text-[var(--t3)] hover:text-[var(--t1)]"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleCreateChapter} className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[var(--t2)] mb-1">Chapter Title</label>
                  <input
                    type="text"
                    required
                    className="w-full bg-[var(--ra)] text-[var(--t1)] border border-[var(--bd)] rounded-xl p-2 px-3 text-sm focus:outline-none"
                    placeholder="e.g. Fundamental Duties - Scope & Limitations"
                    value={newChapterTitle}
                    onChange={(e) => setNewChapterTitle(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[var(--t2)] mb-1">Source Reference</label>
                  <input
                    type="text"
                    className="w-full bg-[var(--ra)] text-[var(--t1)] border border-[var(--bd)] rounded-xl p-2 px-3 text-sm focus:outline-none"
                    placeholder="e.g. Laxmikanth, Yojana Magazine May 2026"
                    value={newChapterSource}
                    onChange={(e) => setNewChapterSource(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[var(--t2)] mb-1">Short Narrative/Abstract</label>
                <textarea
                  className="w-full bg-[var(--ra)] text-[var(--t1)] border border-[var(--bd)] rounded-xl p-2 px-3 text-sm focus:outline-none"
                  rows={2}
                  placeholder="Summarize the core syllabus relevance of this topic in 2 sentences..."
                  value={newChapterDesc}
                  onChange={(e) => setNewChapterDesc(e.target.value)}
                />
              </div>

              <div className="border-t border-[var(--bd)] pt-4 space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--t1)]">Reading Topics</h4>
                  <button
                    type="button"
                    onClick={handleAddTopicField}
                    className="text-[var(--t1)] hover:text-[var(--gd)] text-xs font-bold flex items-center gap-1 border border-[var(--bd)] px-3 py-1.5 rounded-xl hover:bg-[var(--ra)] transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Subtopic
                  </button>
                </div>

                <div className="space-y-4">
                  {newChapterTopics.map((t, idx) => (
                    <div key={t.id} className="bg-[var(--ra)] border border-[var(--bd)] rounded-2xl p-4 space-y-2.5 relative">
                      {newChapterTopics.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveTopicField(idx)}
                          className="absolute top-2 right-2 text-red-500 hover:bg-red-500/10 p-1 rounded-lg border border-transparent hover:border-red-500/20 transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-[var(--t3)] mb-0.5">Subtopic Title</label>
                        <input
                          type="text"
                          required
                          className="w-full bg-[var(--sur)] text-[var(--t1)] border border-[var(--bd)] rounded-xl p-2 text-xs font-semibold focus:outline-none"
                          placeholder={`Subtopic ${idx + 1} Title`}
                          value={t.title}
                          onChange={(e) => handleTopicChange(idx, 'title', e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-[var(--t3)] mb-0.5">Context Body Text (UPSC Context)</label>
                        <textarea
                          required
                          className="w-full bg-[var(--sur)] text-[var(--t1)] border border-[var(--bd)] rounded-xl p-2 text-xs font-serif focus:outline-none"
                          rows={4}
                          placeholder="Write or paste comprehensive, analytical study notes. Break paragraphs with line spaces."
                          value={t.full_text}
                          onChange={(e) => handleTopicChange(idx, 'full_text', e.target.value)}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-[var(--bd)]">
                <button
                  type="button"
                  onClick={() => setShowChapterModal(false)}
                  className="px-4 py-1.5 rounded-xl text-xs font-bold text-[var(--t2)] hover:bg-[var(--ra)] transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-[var(--gd)] text-[var(--bg)] px-5 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider shadow-md hover:opacity-90 transition"
                >
                  Save Study Chapter
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* IMPORT MODAL */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-40 backdrop-blur-xs overflow-y-auto">
          <div className="bg-[var(--sur)] border border-[var(--bd)] rounded-3xl shadow-xl w-full max-w-xl my-8 overflow-hidden relative text-left">
            <div className="bg-[var(--ra)] text-[var(--t1)] px-4 py-3 border-b border-[var(--bd)] flex justify-between items-center">
              <div>
                <span className="text-[9px] uppercase tracking-widest font-bold text-[var(--gd)] font-mono">Backup Loader</span>
                <h3 className="font-serif font-bold text-sm text-[var(--t1)]">
                  {importStage === 'input' ? 'Import Syllabus Chapter via JSON' : 'Confirm Cabinet Allocation'}
                </h3>
              </div>
              <button 
                onClick={() => {
                  setShowImportModal(false);
                  setImportStage('input');
                  setParsedImportData(null);
                }} 
                className="text-[var(--t3)] hover:text-[var(--t1)]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {importStage === 'input' ? (
              <div className="p-5 space-y-4">
                {/* Drag and Drop Zone */}
                <div
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-3xl p-6 text-center transition duration-200 cursor-pointer flex flex-col items-center justify-center space-y-2.5 ${
                    dragActive 
                      ? 'border-[var(--gd)] bg-[var(--gd)]/5' 
                      : 'border-[var(--bd)] hover:border-[var(--gd)] bg-[var(--ra)]/30'
                  }`}
                  onClick={() => document.getElementById('json_file_upload')?.click()}
                >
                  <input
                    type="file"
                    id="json_file_upload"
                    accept=".json"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                  <UploadCloud className="w-10 h-10 text-[var(--gd)] animate-pulse" />
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-[var(--t1)] font-sans">
                      Drag & Drop your Syllabus JSON file here, or <span className="text-[var(--gd)] hover:underline">browse files</span>
                    </p>
                    <p className="text-[10px] text-[var(--t3)] font-sans">
                      Loads local files instantly (Laxmikanth or custom syllabus chapter structures)
                    </p>
                  </div>
                </div>

                <div className="bg-[var(--ra)] border border-[var(--bd)] text-[var(--t2)] p-3 rounded-2xl text-xs space-y-1.5 leading-relaxed">
                  <p className="font-bold flex items-center gap-1.5 text-[var(--t1)]">
                    <FileText className="w-4 h-4 text-[var(--gd)]" />
                    Syllabus Material Import Instructions:
                  </p>
                  <p>The system will automatically understand your JSON schema, extract chapter topics, and dynamically recommend the closest subject cabinet folder while allowing you to manually confirm or override the final placement.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-[var(--t2)] mb-1.5">Or Paste Raw JSON String</label>
                    <textarea
                      className="w-full h-48 bg-[var(--ra)] text-[var(--t1)] border border-[var(--bd)] rounded-xl p-2 text-xs font-mono focus:outline-none"
                      placeholder="Alternatively, paste JSON text here..."
                      value={pastedJson}
                      onChange={(e) => {
                        setPastedJson(e.target.value);
                        setImportError('');
                      }}
                    />
                    {importError && (
                      <div className="mt-2 p-2 bg-red-500/10 border border-red-500/20 text-red-500 text-[11px] rounded-xl flex items-center gap-1.5">
                        <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                        <span>{importError}</span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <label className="block text-xs font-bold uppercase tracking-wider text-[var(--t3)]">Sample Template Blueprint</label>
                      <button
                        onClick={() => {
                          setPastedJson(SAMPLE_IMPORT_JSON);
                          setImportError('');
                        }}
                        className="text-[10px] text-[var(--gd)] hover:underline font-bold"
                      >
                        Use Sample JSON
                      </button>
                    </div>
                    <pre className="bg-[var(--ra)] text-[var(--gd)] p-3 rounded-2xl text-[10px] overflow-auto h-48 font-mono select-all text-left border border-[var(--bd)]">
                      {SAMPLE_IMPORT_JSON}
                    </pre>
                  </div>
                </div>

                <div className="pt-3 flex justify-end gap-2 border-t border-[var(--bd)]">
                  <button
                    onClick={() => setShowImportModal(false)}
                    className="px-4 py-1.5 rounded-xl text-xs font-bold text-[var(--t2)] hover:bg-[var(--ra)] transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleProceedToPreview}
                    disabled={!pastedJson.trim()}
                    className="bg-[var(--gd)] text-[var(--bg)] px-5 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider shadow-md hover:opacity-90 transition disabled:opacity-50"
                  >
                    Analyze JSON Structure
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-5 space-y-4">
                <div className="bg-[var(--ra)] border border-[var(--bd)] rounded-2xl p-4 space-y-2.5">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[10px] uppercase tracking-widest font-bold text-[var(--gd)] font-mono">Parsed Chapter</span>
                      <h4 className="font-serif font-bold text-base text-[var(--t1)]">
                        {parsedImportData?.title || parsedImportData?.metadata?.chapter_title || "Untitled Chapter"}
                      </h4>
                    </div>
                    <span className="text-xs bg-[var(--sur)] text-[var(--t2)] border border-[var(--bd)] px-2.5 py-1 rounded-xl font-mono">
                      {parsedImportData?.topics?.length || parsedImportData?.sections?.length || 0} Topics
                    </span>
                  </div>
                  {parsedImportData?.source && (
                    <p className="text-xs text-[var(--t2)] font-mono">
                      Reference Source: <span className="text-[var(--t1)]">{parsedImportData.source}</span>
                    </p>
                  )}
                  {parsedImportData?.description && (
                    <p className="text-xs text-[var(--t3)] font-serif italic line-clamp-3">
                      "{parsedImportData.description}"
                    </p>
                  )}
                </div>

                <div className="space-y-3.5">
                  <div className="flex flex-col gap-1">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--t1)]">Where should this chapter go?</h4>
                    <p className="text-[11px] text-[var(--t3)] font-serif leading-relaxed">
                      We have analyzed the syllabus metadata, keywords, and topics.
                    </p>
                  </div>

                  {showUnsureWarning ? (
                    <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-2xl text-[11px] flex gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-500" />
                      <div className="space-y-1">
                        <p className="font-bold">Unsure Allocation Warning</p>
                        <p className="font-serif leading-relaxed">
                          We scanned the metadata but couldn't confidently pinpoint the exact target cabinet. Please verify or manually select the correct shelf cabinet folder below.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 rounded-2xl text-[11px] flex gap-2">
                      <Check className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
                      <div className="space-y-1">
                        <p className="font-bold">Confident Cabinet Match Found!</p>
                        <p className="font-serif leading-relaxed">
                          Our smart metadata analysis has automatically recommended the closest default cabinet below.
                        </p>
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-[var(--t2)] mb-1.5">Target Study Cabinet Folder</label>
                    <select
                      className="w-full bg-[var(--ra)] text-[var(--t1)] border border-[var(--bd)] rounded-xl p-3 text-sm font-sans focus:outline-none focus:ring-1 focus:ring-[var(--gd)]"
                      value={targetFolderIdForImport}
                      onChange={(e) => setTargetFolderIdForImport(e.target.value)}
                    >
                      {folders.map(f => (
                        <option key={f.id} value={f.id}>
                          Cabinet: {f.name} ({f.subject})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {importError && (
                  <div className="p-2 bg-red-500/10 border border-red-500/20 text-red-500 text-[11px] rounded-xl flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                    <span>{importError}</span>
                  </div>
                )}

                <div className="pt-3 flex justify-between gap-2 border-t border-[var(--bd)]">
                  <button
                    onClick={() => {
                      setImportStage('input');
                      setImportError('');
                    }}
                    className="px-4 py-1.5 rounded-xl text-xs font-bold text-[var(--t2)] hover:bg-[var(--ra)] transition"
                  >
                    Back to Edit
                  </button>
                  <button
                    onClick={handleConfirmImport}
                    className="bg-[var(--gd)] text-[var(--bg)] px-5 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider shadow-md hover:opacity-90 transition flex items-center gap-1.5"
                  >
                    <Check className="w-4 h-4" />
                    Confirm & Import
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* DOCUMENT IMPORT MODAL (PDF & WORD) */}
      {showDocImportModal && (
        <div id="doc_import_modal" className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-40 backdrop-blur-xs overflow-y-auto animate-fade-in">
          <div className="bg-[var(--sur)] border border-[var(--bd)] rounded-3xl shadow-xl w-full max-w-md overflow-hidden relative text-left">
            <div className="bg-[var(--ra)] text-[var(--t1)] px-4 py-3 border-b border-[var(--bd)] flex justify-between items-center">
              <div>
                <span className="text-[9px] uppercase tracking-widest font-bold text-[var(--gd)] font-mono">Document Parser</span>
                <h3 className="font-serif font-bold text-sm text-[var(--t1)]">Import Document (PDF / Word)</h3>
              </div>
              <button 
                onClick={() => {
                  setShowDocImportModal(false);
                  setDocImportError(null);
                }} 
                className="text-[var(--t3)] hover:text-[var(--t1)]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <p className="text-xs text-[var(--t2)] font-serif leading-relaxed">
                Upload any <strong>PDF (.pdf)</strong> or <strong>Word (.docx)</strong> document. We will parse the text locally in your browser and automatically build a structured chapter library with lessons, slides, key concepts, and flashcards!
              </p>

              <div className="border-2 border-dashed border-[var(--bd)] hover:border-[var(--gd)] rounded-3xl p-6 text-center transition duration-200 cursor-pointer bg-[var(--ra)]/30 relative flex flex-col items-center justify-center space-y-2.5">
                <input
                  type="file"
                  id="doc_file_upload"
                  accept=".pdf,.docx"
                  disabled={docImporting}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  onChange={handleDocFileChange}
                />
                {docImporting ? (
                  <RefreshCw className="w-10 h-10 text-[var(--gd)] animate-spin" />
                ) : (
                  <UploadCloud className="w-10 h-10 text-[var(--gd)]" />
                )}
                <div className="space-y-1">
                  <p className="text-xs font-bold text-[var(--t1)] font-sans">
                    {docImporting ? 'Processing & Extracting...' : 'Click to select or drag PDF / Word here'}
                  </p>
                  <p className="text-[10px] text-[var(--t3)] font-sans">
                    Supports text-based .pdf and Word (.docx) documents up to 25MB
                  </p>
                </div>
              </div>

              {docImportError && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 text-[11px] rounded-xl flex items-center gap-1.5 leading-relaxed">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                  <span>{docImportError}</span>
                </div>
              )}

              <div className="bg-[var(--ra)] border border-[var(--bd)] text-[var(--t2)] p-3 rounded-2xl text-[10px] space-y-1.5 leading-relaxed">
                <p className="font-bold flex items-center gap-1.5 text-[var(--t1)]">
                  <FileText className="w-3.5 h-3.5 text-[var(--gd)]" />
                  Local In-Browser Processing Guarantee:
                </p>
                <p>No servers, no remote API calls, and zero external transmissions are made during this extraction. All document text stays entirely isolated inside your browser's runtime memory.</p>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-[var(--bd)]">
                <button
                  type="button"
                  disabled={docImporting}
                  onClick={() => setShowDocImportModal(false)}
                  className="px-4 py-1.5 rounded-xl text-xs font-bold text-[var(--t2)] hover:bg-[var(--ra)] transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* RENAME CABINET MODAL */}
      {editingFolderId && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-40 backdrop-blur-xs animate-fade-in">
          <div className="bg-[var(--sur)] border border-[var(--bd)] rounded-3xl shadow-xl w-full max-w-sm overflow-hidden relative">
            <div className="bg-[var(--ra)] text-[var(--t1)] px-4 py-3 border-b border-[var(--bd)] flex justify-between items-center">
              <h3 className="font-serif font-bold text-sm text-[var(--t1)] uppercase tracking-wider">Rename Cabinet</h3>
              <button onClick={() => setEditingFolderId(null)} className="text-[var(--t3)] hover:text-[var(--t1)]"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-4 text-left">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[var(--t2)] mb-1">Cabinet Name</label>
                <input
                  type="text"
                  className="w-full bg-[var(--ra)] text-[var(--t1)] border border-[var(--bd)] rounded-xl p-2 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--gd)]"
                  value={editingFolderName}
                  onChange={(e) => setEditingFolderName(e.target.value)}
                />
              </div>
              <div className="flex justify-end gap-2 border-t border-[var(--bd)] pt-3">
                <button
                  onClick={() => setEditingFolderId(null)}
                  className="px-4 py-1.5 rounded-xl text-xs font-bold text-[var(--t2)] hover:bg-[var(--ra)] transition"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (onRenameFolder && editingFolderId) {
                      onRenameFolder(editingFolderId, editingFolderName);
                    }
                    setEditingFolderId(null);
                  }}
                  className="bg-[var(--gd)] text-[var(--bg)] px-4 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider shadow-md hover:opacity-90 transition"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DELETE FOLDER CONFIRMATION MODAL */}
      {folderToDelete && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-40 backdrop-blur-xs animate-fade-in">
          <div className="bg-[var(--sur)] border border-[var(--bd)] rounded-3xl shadow-xl w-full max-w-sm overflow-hidden relative">
            <div className="bg-red-950/20 text-red-500 px-4 py-3 border-b border-red-500/20 flex justify-between items-center">
              <h3 className="font-serif font-bold text-xs uppercase tracking-wider">Delete study cabinet?</h3>
              <button onClick={() => setFolderToDelete(null)} className="text-[var(--t3)] hover:text-red-400"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-4 text-left">
              <p className="text-xs text-[var(--t2)] font-serif leading-relaxed">
                Are you sure you want to delete the cabinet <strong className="text-red-400 font-sans">"{folderToDelete.name}"</strong>?
              </p>
              <p className="text-[11px] text-[var(--t3)] font-serif leading-relaxed bg-red-500/5 p-3 rounded-2xl border border-red-500/10">
                This will delete the cabinet and all chapters stored inside it. This action cannot be undone.
              </p>
              <div className="flex justify-end gap-2 border-t border-[var(--bd)] pt-3">
                <button
                  onClick={() => setFolderToDelete(null)}
                  className="px-4 py-1.5 rounded-xl text-xs font-bold text-[var(--t2)] hover:bg-[var(--ra)] transition"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (onDeleteFolder) {
                      onDeleteFolder(folderToDelete.id);
                    }
                    setFolderToDelete(null);
                  }}
                  className="bg-red-600 text-white px-4 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider shadow-md hover:bg-red-700 transition"
                >
                  Confirm Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MOVE CHAPTER MODAL */}
      {movingChapterId && (() => {
        const chapterToMove = chapters.find(c => c.id === movingChapterId);
        if (!chapterToMove) return null;
        return (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-40 backdrop-blur-xs animate-fade-in">
            <div className="bg-[var(--sur)] border border-[var(--bd)] rounded-3xl shadow-xl w-full max-w-sm overflow-hidden relative">
              <div className="bg-[var(--ra)] text-[var(--t1)] px-4 py-3 border-b border-[var(--bd)] flex justify-between items-center">
                <h3 className="font-serif font-bold text-sm text-[var(--t1)] uppercase tracking-wider">Move Chapter</h3>
                <button onClick={() => setMovingChapterId(null)} className="text-[var(--t3)] hover:text-[var(--t1)]"><X className="w-5 h-5" /></button>
              </div>
              <div className="p-5 space-y-4 text-left">
                <p className="text-xs text-[var(--t2)] font-serif leading-relaxed">
                  Move chapter <strong className="text-[var(--t1)] font-sans">"{chapterToMove.title}"</strong> to another cabinet folder:
                </p>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[var(--t3)] mb-1">Target Cabinet</label>
                  <select
                    className="w-full bg-[var(--ra)] text-[var(--t1)] border border-[var(--bd)] rounded-xl p-2 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--gd)]"
                    value={chapterToMove.folderId}
                    onChange={(e) => {
                      if (onMoveChapter) {
                        onMoveChapter(chapterToMove.id, e.target.value);
                      }
                      setMovingChapterId(null);
                    }}
                  >
                    {folders.map(f => (
                      <option key={f.id} value={f.id}>
                        {f.name} ({f.subject})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex justify-end gap-2 border-t border-[var(--bd)] pt-3">
                  <button
                    onClick={() => setMovingChapterId(null)}
                    className="px-4 py-1.5 rounded-xl text-xs font-bold text-[var(--t2)] hover:bg-[var(--ra)] transition"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

    </div>
  );
}
