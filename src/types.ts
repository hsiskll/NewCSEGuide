export type SubjectType = 'polity' | 'history' | 'economy' | 'geography' | 'environment' | 'science' | 'ethics' | 'csat';

export interface Folder {
  id: string;
  name: string;
  subject: string;
  color: string;
}

export interface ChapterMetadata {
  book: string;
  chapter_number: number;
  chapter_title: string;
  part?: string;
  articles?: string;
  subject: string;
  generated?: string;
}

export interface ImportantArticle {
  article: string;
  subject: string;
}

export interface LessonSlide {
  slide_number: number;
  title: string;
  type: string;
  content: string;
}

export interface KeyConcept {
  concept: string;
  explanation: string;
  article?: string;
  exam_angle?: string;
}

export interface TopicFlashcard {
  id?: string;
  front: string;
  back: string;
}

export interface MainsAnswerSkeleton {
  intro: string;
  body_points: string[];
  conclusion: string;
}

export interface MainsQuestion {
  question: string;
  answer_skeleton: MainsAnswerSkeleton;
}

export interface PYQQuestion {
  id: string;
  year: number | string;
  difficulty: 'easy' | 'medium' | 'hard';
  question: string;
  options: string[];
  answer: string; // 'A' | 'B' | 'C' | 'D'
  answer_explanation?: string;
  topic_tags?: string[];
}

export interface Topic {
  id: string;
  title: string;
  order: number;
  full_text?: string;
  raw_text?: string;
  key_concepts?: KeyConcept[];
  flashcards?: TopicFlashcard[];
  pyq_ids?: string[];
  pyqs?: PYQQuestion[];
  mcqs?: MCQItem[]; // Added for custom-imported MCQs
  mains_questions?: MainsQuestion[];
  socratic_questions?: string[];
  feynman_prompts?: string[];
  ca_angles?: string[];
  lesson_slides?: LessonSlide[];
  section_heading?: string;
}

export interface Chapter {
  id: string; // compatibility
  folderId: string; // compatibility
  title: string; // compatibility
  description?: string; // compatibility
  subject: string; // compatibility
  createdAt?: string; // compatibility
  source?: string; // compatibility
  metadata: ChapterMetadata;
  chapter_intro?: string;
  topics: Topic[];
  important_articles?: ImportantArticle[];
  chapter_background?: string;
}

export interface Flashcard {
  id: string;
  chapterId?: string;
  topicId?: string;
  front: string;
  back: string;
  subject: string;
  box: number; // 1 to 5 for Leitner
  nextReviewDate: string;
  createdAt: string;
  streak: number;
}

export interface Bookmark {
  id: string;
  chapterId: string;
  sectionId?: string;
  topicId?: string;
  chapterTitle: string;
  sectionTitle?: string;
  topicTitle?: string;
  excerpt: string;
  addedAt: string;
}

export interface StudySessionLog {
  id: string;
  date: string;
  minutes: number;
}

export interface StudyGoal {
  dailyTargetMinutes: number;
  targetYear: string;
  focusArea: string;
  userName?: string;
}

export interface UserSettings {
  geminiKey: string;
  hasCompletedOnboarding: boolean;
  preferences: {
    fontFamily: 'serif' | 'sans' | 'mono';
    fontSize: number;
    lineSpacing: number;
  };
  goal: StudyGoal;
  userName?: string;
}

export interface TopicProgress {
  read: boolean;
  slides: boolean;
  concepts: boolean;
  flashcards: boolean;
  pyq: Record<string, string>; // qid -> answer
  notes?: string;
  fc?: { r: number; t: number };
  pyqAttempts?: Record<string, { answer: string; date: string; isCorrect: boolean }[]>;
  mcqAttempts?: Record<string, { answer: string; date: string; isCorrect: boolean }[]>;
}

export interface PlannerTask {
  id: string;
  text: string;
  completed: boolean;
  chapterId?: string;
  subject?: string;
  subsection?: string;
}

export interface DailyPlanner {
  date: string; // "YYYY-MM-DD"
  targets: PlannerTask[];
  notes?: string;
  leitnerCompleted?: boolean;
}

export interface PersonalGoal {
  id: string;
  text: string;
  completed: boolean;
  category?: string; // e.g. "Polity", "GS1", "Revision"
  createdAt: string;
}

export interface UPSCState {
  folders: Folder[];
  chapters: Chapter[];
  flashcards: Flashcard[];
  bookmarks: Bookmark[];
  logs: StudySessionLog[];
  settings: UserSettings;
  topicProgress?: Record<string, TopicProgress>; // topicId -> progress record
  theme?: ThemeKey;
  planner?: Record<string, DailyPlanner>; // YYYY-MM-DD -> DailyPlanner
  personalGoals?: PersonalGoal[];
  leitnerStreak?: {
    streak: number;
    lastReviewedDate?: string; // YYYY-MM-DD
  };
}

export interface MCQItem {
  id: string;
  question: string;
  options: string[];
  answer: string; // 'A' | 'B' | 'C' | 'D'
  explanation: string;
  source: 'ai' | 'import';
}

export type ThemeKey = 'scholar' | 'manuscript' | 'midnight' | 'slate' | 'paper';
