export interface PrelimsTerm {
  term: string;
  wiki?: string;
  upsc_context?: string;
}

export interface Article {
  id: string;                  // same as code
  code: string;                // format: NM-YYYYMMDD-001 (sequential per day)
  date: string;                // YYYY-MM-DD
  newspaper: string;           // default "Indian Express"
  paperId: string;             // groups articles imported in the same batch
  page: number;
  ie_section: string;          // e.g. "Editorial", "Explained", "Front Page", "Economy", "Ideas"
  headline: string;
  source_excerpt: string;      // short verbatim quote from the article
  quick_summary: string;       // 2-3 sentence summary
  detail_markdown: string;     // full structured notes in markdown (generated or imported)
  detail_generated_at: string | null;
  prelims_tags: string[];      // specific facts/terms relevant for Prelims
  mains_tags: string[];        // themes relevant for Mains GS papers
  essay_tags: string[];        // themes relevant for Essay paper
  broad_subjects: string[];    // e.g. ["Economy", "Polity & Governance"]
  syllabus_points: string[];   // array of SYLLABUS ids this article maps to
  keywords: string[];
  priority: 'High' | 'Medium' | 'Low';
  why_relevant: string;        // 1-2 sentence explanation of UPSC relevance
  cluster_theme: string;       // free-text theme used to auto-link related articles
  parent_code: string;         // for satellite/follow-up articles
  is_satellite: boolean;
  starred: boolean;
  personal_notes: string;
  personal_notes_sections?: {
    statistics?: { id: string; text: string; created_at: string }[];
    mains?: { id: string; text: string; created_at: string }[];
    prelims?: { id: string; text: string; created_at: string }[];
    essay?: { id: string; text: string; created_at: string }[];
    explore?: { id: string; text: string; created_at: string }[];
  };
  manual_links: string[];      // user-added related article codes
  auto_links: string[];        // computed related article codes
  revision_status: 'new' | 'read' | 'revise-later' | 'use-prelims' | 'use-mains' | 'use-essay' | 'done';
  prelims_terms: PrelimsTerm[]; // glossary-style terms worth a flashcard
  created_at: string;          // ISO timestamp
  updated_at: string;          // ISO timestamp
}

export interface SyllabusEntry {
  id: string;
  paper: string;
  subject: string;
  title: string;
  kw: string[];
}

export interface TopicSummary {
  id: string;
  topicId: string;
  topicTitle: string;
  period: string;
  from: string;
  to: string;
  markdown: string;
  article_codes: string[];
  created_at: string;
}

export interface AskHistoryEntry {
  id: string;
  question: string;
  answer_markdown: string;
  scope: {
    subj: string;
    syl: string;
    onlyStarred: boolean;
  };
  article_codes_used: string[];
  created_at: string;
}

export interface NewspaperMapperSettings {
  modelDetail: string;
  modelAsk: string;
  confirmCalls: boolean;
  maxAskArticles: number;
}

export const SYLLABUS: SyllabusEntry[] = [
  { id: 'pre-current', paper: 'Prelims', subject: 'Current Events', title: 'Current events of national and international importance', kw: ['current','government','policy','scheme','summit','report','india','global','ministry','bilateral'] },
  { id: 'pre-history', paper: 'Prelims', subject: 'History', title: 'History of India and Indian National Movement', kw: ['history','freedom','heritage','archaeology','monument','culture','movement','ancient','medieval'] },
  { id: 'pre-geography', paper: 'Prelims', subject: 'Geography', title: 'Indian and World Geography', kw: ['geography','cyclone','river','monsoon','urban','resource','mineral','climate','map','ocean','strait'] },
  { id: 'pre-polity', paper: 'Prelims', subject: 'Polity & Governance', title: 'Indian Polity and Governance', kw: ['constitution','court','parliament','governance','rights','policy','panchayat','federal','election','bill','act','lok sabha','rajya sabha','speaker'] },
  { id: 'pre-economy', paper: 'Prelims', subject: 'Economy & Social Development', title: 'Economic and Social Development', kw: ['economy','growth','inflation','budget','rbi','tax','poverty','employment','development','inclusion','bank','market','gdp','fiscal','scheme','welfare'] },
  { id: 'pre-env', paper: 'Prelims', subject: 'Environment', title: 'Environmental ecology, biodiversity and climate change', kw: ['environment','climate','forest','biodiversity','pollution','wildlife','carbon','emission','eia','ozone','heat','ecology'] },
  { id: 'pre-sci', paper: 'Prelims', subject: 'Science & Technology', title: 'General Science and science/technology developments', kw: ['science','technology','space','ai','digital','health','vaccine','research','cyber','biotech','isro','defence','missile','satellite'] },
  { id: 'gs1-culture', paper: 'GS1', subject: 'History & Culture', title: 'Indian culture: art forms, literature and architecture', kw: ['culture','art','literature','architecture','heritage','temple','museum','classical','folk'] },
  { id: 'gs1-modern', paper: 'GS1', subject: 'History & Culture', title: 'Modern Indian history and freedom struggle', kw: ['freedom','independence','partition','colonial','nationalist','british','gandhi','nehru'] },
  { id: 'gs1-society', paper: 'GS1', subject: 'Society', title: 'Indian society: diversity, women, population, urbanisation', kw: ['society','women','population','poverty','urbanisation','communalism','secularism','empowerment','caste','gender','tribal'] },
  { id: 'gs1-geography', paper: 'GS1', subject: 'Geography', title: 'World and Indian geography: resources and geophysical phenomena', kw: ['resource','earthquake','tsunami','volcano','cyclone','water','glacier','flora','fauna','agriculture','crop'] },
  { id: 'gs2-constitution', paper: 'GS2', subject: 'Polity & Governance', title: 'Constitution: evolution, features, amendments, basic structure', kw: ['constitution','amendment','basic structure','supreme court','judiciary','executive','legislature','fundamental rights','directive principles'] },
  { id: 'gs2-federalism', paper: 'GS2', subject: 'Polity & Governance', title: 'Federalism, Union-State relations, devolution, local governance', kw: ['federal','state','union','devolution','local government','panchayat','municipal','finance commission','centre state'] },
  { id: 'gs2-governance', paper: 'GS2', subject: 'Polity & Governance', title: 'Governance, transparency, accountability, e-governance', kw: ['governance','transparency','accountability','e-governance','civil service','administration','rti','corruption','reform'] },
  { id: 'gs2-policy', paper: 'GS2', subject: 'Polity & Governance', title: 'Government policies, design and implementation', kw: ['policy','scheme','mission','programme','implementation','ministry','beneficiary','subsidy','flagship','yojana'] },
  { id: 'gs2-socialjustice', paper: 'GS2', subject: 'Society & Social Justice', title: 'Welfare schemes, health, education, vulnerable sections', kw: ['welfare','vulnerable','health','education','poverty','hunger','nutrition','social sector','neet','sc st','obc','disability'] },
  { id: 'gs2-ir', paper: 'GS2', subject: 'International Relations', title: 'India and neighbourhood, bilateral/global groupings, international institutions', kw: ['us','china','russia','pakistan','g7','g20','un','trade','bilateral','diaspora','neighbourhood','west asia','asean','brics','sco','nato'] },
  { id: 'gs3-economy', paper: 'GS3', subject: 'Economy', title: 'Indian economy: planning, growth, development, employment', kw: ['economy','planning','growth','development','employment','gdp','inflation','rbi','fiscal','monetary','credit','npa','banking','investment','fdi','startup','msme'] },
  { id: 'gs3-budget', paper: 'GS3', subject: 'Economy', title: 'Government budgeting, taxation, fiscal policy', kw: ['budget','taxation','gst','direct tax','fiscal deficit','revenue','expenditure','disinvestment','public finance','capex'] },
  { id: 'gs3-agri', paper: 'GS3', subject: 'Agriculture', title: 'Agriculture: cropping patterns, irrigation, MSP, food security', kw: ['agriculture','crop','irrigation','msp','food security','pds','kisan','farmer','rural','harvest','grain','fertilizer'] },
  { id: 'gs3-industry', paper: 'GS3', subject: 'Economy', title: 'Liberalisation, industrial policy, industrial growth', kw: ['industry','manufacturing','pli','make in india','industrial','liberalisation','export','import','trade','tariff','semiconductor'] },
  { id: 'gs3-infra', paper: 'GS3', subject: 'Infrastructure', title: 'Infrastructure: energy, ports, roads, airports, railways', kw: ['infrastructure','energy','port','road','airport','railway','metro','highway','power','grid','logistics'] },
  { id: 'gs3-scitech', paper: 'GS3', subject: 'Science & Technology', title: 'Science and technology, IT, space, robotics, biotech, IPR', kw: ['science','technology','it','space','isro','ai','artificial intelligence','robot','nano','biotech','ipr','patent','digital','semiconductor','cyber','quantum','drone'] },
  { id: 'gs3-env', paper: 'GS3', subject: 'Environment', title: 'Conservation, environmental pollution, EIA, climate change', kw: ['conservation','pollution','degradation','eia','climate','carbon','emission','forest','wildlife','plastic','waste','biodiversity','cop','unfccc','net zero'] },
  { id: 'gs3-security', paper: 'GS3', subject: 'Security & Disaster', title: 'Internal security, cyber security, money-laundering, borders, terrorism', kw: ['security','terrorism','cyber','border','money laundering','naxal','insurgency','organised crime','intelligence','defence','military','bsf','crpf'] },
  { id: 'gs3-disaster', paper: 'GS3', subject: 'Security & Disaster', title: 'Disaster and disaster management', kw: ['disaster','flood','earthquake','cyclone','drought','heat wave','relief','ndrf','ndma','early warning'] },
  { id: 'gs4-ethics', paper: 'GS4', subject: 'Ethics', title: 'Ethics and human interface, human values, attitude', kw: ['ethics','values','attitude','moral','integrity','compassion','empathy','justice','character','virtue'] },
  { id: 'gs4-probity', paper: 'GS4', subject: 'Ethics', title: 'Probity in governance, transparency, RTI, corruption', kw: ['probity','transparency','rti','corruption','conflict of interest','public servant','accountability','whistle','ombudsman'] },
  { id: 'essay-economy', paper: 'Essay', subject: 'Essay', title: 'Essay: economy, development and inequality', kw: ['inequality','development','poverty','growth','globalisation','capitalism'] },
  { id: 'essay-governance', paper: 'Essay', subject: 'Essay', title: 'Essay: governance, democracy, state capacity', kw: ['democracy','governance','state','federalism','institution','bureaucracy','reform'] },
  { id: 'essay-society', paper: 'Essay', subject: 'Essay', title: 'Essay: society, technology, environment, justice', kw: ['society','technology','environment','justice','gender','education','health','culture','tradition'] },
];

export const BROAD_SUBJECTS = [
  'Economy',
  'Polity & Governance',
  'International Relations',
  'Environment',
  'Science & Technology',
  'Society & Social Justice',
  'History & Culture',
  'Geography',
  'Security & Disaster',
  'Ethics',
  'Essay',
  'Current Events',
  'Agriculture',
  'Infrastructure'
];

export function normText(s: string): string {
  return String(s || '').toLowerCase().replace(/[^a-z0-9\s]+/g, ' ').trim();
}

/**
 * Auto syllabus mapping based on keyword frequency score.
 * Multi-word keywords (containing a space) score 3 points, single-word score 1 point.
 */
export function autoMap(headline: string, summary: string, keywords: string[]): string[] {
  const text = normText(`${headline} ${summary} ${keywords.join(' ')}`);
  const scores: Record<string, number> = {};

  SYLLABUS.forEach(entry => {
    let score = 0;
    entry.kw.forEach(keyword => {
      const kwNorm = keyword.toLowerCase();
      // Use substring/word boundaries checking
      if (text.includes(kwNorm)) {
        const isMultiWord = kwNorm.includes(' ');
        score += isMultiWord ? 3 : 1;
      }
    });
    if (score > 0) {
      scores[entry.id] = score;
    }
  });

  return Object.entries(scores)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(e => e[0]);
}

/**
 * Calculate the next NM code sequence for a given date YYYY-MM-DD.
 * Code format: NM-YYYYMMDD-001 (or sequential per day)
 */
export function nextCode(dateStr: string, existingArticles: Article[]): string {
  const cleanDate = dateStr.replace(/\D/g, '').slice(0, 8); // YYYYMMDD
  const prefix = `NM-${cleanDate}-`;
  
  const dailyNums = existingArticles
    .filter(a => a.code.startsWith(prefix))
    .map(a => {
      const parts = a.code.split('-');
      const numPart = parts[2];
      return numPart ? parseInt(numPart, 10) : 0;
    })
    .filter(n => !isNaN(n));

  const maxNum = dailyNums.length > 0 ? Math.max(...dailyNums) : 0;
  const nextNum = maxNum + 1;
  return `${prefix}${String(nextNum).padStart(3, '0')}`;
}

/**
 * Compute auto-linked article codes based on scoring criteria:
 * - Shared syllabus points: +5 each
 * - Shared broad subjects: +3 each
 * - Shared keywords: +2 each
 * - Identical non-empty cluster theme: +8
 * Threshold: score >= 5. Returns top 6 article codes.
 */
export function computeAutoLinks(target: Article, allArticles: Article[]): string[] {
  const scores: Record<string, number> = {};

  allArticles.forEach(other => {
    if (other.code === target.code) return;

    let score = 0;

    // Shared syllabus points
    if (target.syllabus_points && other.syllabus_points) {
      target.syllabus_points.forEach(sp => {
        if (other.syllabus_points.includes(sp)) {
          score += 5;
        }
      });
    }

    // Shared broad subjects
    if (target.broad_subjects && other.broad_subjects) {
      target.broad_subjects.forEach(sub => {
        if (other.broad_subjects.includes(sub)) {
          score += 3;
        }
      });
    }

    // Shared keywords
    if (target.keywords && other.keywords) {
      target.keywords.forEach(kw => {
        if (other.keywords.map(k => k.toLowerCase()).includes(kw.toLowerCase())) {
          score += 2;
        }
      });
    }

    // Identical non-empty cluster theme
    if (
      target.cluster_theme && 
      other.cluster_theme && 
      target.cluster_theme.trim().toLowerCase() === other.cluster_theme.trim().toLowerCase()
    ) {
      score += 8;
    }

    if (score >= 5) {
      scores[other.code] = score;
    }
  });

  return Object.entries(scores)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(e => e[0]);
}

/**
 * Normalise any raw article object into the strict Article structure
 */
export function normaliseArticle(
  raw: any, 
  meta: { date: string; newspaper: string; paperId: string }, 
  existingArticles: Article[]
): Article {
  const date = meta.date || raw.date || new Date().toISOString().slice(0, 10);
  const code = raw.code && /^NM-\d{8}-\d{3,}$/.test(raw.code) ? raw.code : nextCode(date, existingArticles);

  // Parse prelims terms safely
  let rawTerms = raw.prelims_terms || [];
  if (!Array.isArray(rawTerms)) {
    rawTerms = [];
  }
  const prelims_terms: PrelimsTerm[] = rawTerms.map((t: any) => {
    if (typeof t === 'string') {
      return {
        term: t,
        wiki: `https://en.wikipedia.org/wiki/${encodeURIComponent(t)}`,
        upsc_context: ''
      };
    }
    return {
      term: t.term || 'Unnamed Term',
      wiki: t.wiki || `https://en.wikipedia.org/wiki/${encodeURIComponent(t.term || '')}`,
      upsc_context: t.upsc_context || ''
    };
  });

  const keywords: string[] = Array.isArray(raw.keywords) ? raw.keywords : [];
  const headline = String(raw.headline || raw.title || 'Untitled Article').trim();
  const quick_summary = String(raw.quick_summary || raw.summary || '').trim();

  // If syllabus points are absent, run auto syllabus scoring mapping
  let syllabus_points: string[] = Array.isArray(raw.syllabus_points) ? raw.syllabus_points : [];
  if (syllabus_points.length === 0) {
    syllabus_points = autoMap(headline, quick_summary, keywords);
  }

  const ie_section = String(raw.ie_section || raw.section || 'General').trim();
  const priority = ['High', 'Medium', 'Low'].includes(raw.priority) ? raw.priority : 'Medium';
  const revision_status = ['new', 'read', 'revise-later', 'use-prelims', 'use-mains', 'use-essay', 'done'].includes(raw.revision_status) 
    ? raw.revision_status 
    : 'new';

  return {
    id: code,
    code,
    date,
    newspaper: meta.newspaper || raw.newspaper || 'Indian Express',
    paperId: meta.paperId || raw.paperId || '',
    page: parseInt(raw.page, 10) || 1,
    ie_section,
    headline,
    source_excerpt: String(raw.source_excerpt || raw.excerpt || '').trim(),
    quick_summary,
    detail_markdown: String(raw.detail_markdown || raw.detailed_notes || '').trim(),
    detail_generated_at: raw.detail_markdown ? 'Imported' : null,
    prelims_tags: Array.isArray(raw.prelims_tags) ? raw.prelims_tags : [],
    mains_tags: Array.isArray(raw.mains_tags) ? raw.mains_tags : [],
    essay_tags: Array.isArray(raw.essay_tags) ? raw.essay_tags : [],
    broad_subjects: Array.isArray(raw.broad_subjects) ? raw.broad_subjects : (Array.isArray(raw.subjects) ? raw.subjects : []),
    syllabus_points,
    keywords,
    priority,
    why_relevant: String(raw.why_relevant || '').trim(),
    cluster_theme: String(raw.cluster_theme || '').trim(),
    parent_code: String(raw.parent_code || '').trim(),
    is_satellite: !!(raw.is_satellite || raw.satellite),
    starred: !!(raw.starred || raw.saved),
    personal_notes: String(raw.personal_notes || '').trim(),
    manual_links: Array.isArray(raw.manual_links) ? raw.manual_links : [],
    auto_links: [],
    revision_status,
    prelims_terms,
    created_at: raw.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
}
