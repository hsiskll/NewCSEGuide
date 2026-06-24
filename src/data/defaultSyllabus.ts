import { Folder, Chapter, Flashcard, PYQQuestion } from '../types';

export const DEFAULT_FOLDERS: Folder[] = [
  {
    id: 'f-polity',
    name: 'Polity and Governance',
    subject: 'Polity',
    color: 'bg-indigo-950/80 border-indigo-800 text-indigo-200'
  },
  {
    id: 'f-economy',
    name: 'Economy',
    subject: 'Economy',
    color: 'bg-emerald-950/80 border-emerald-800 text-emerald-200'
  },
  {
    id: 'f-modern-history',
    name: 'Modern History',
    subject: 'History',
    color: 'bg-amber-950/80 border-amber-800 text-amber-200'
  },
  {
    id: 'f-ancient-history',
    name: 'Ancient History',
    subject: 'History',
    color: 'bg-orange-950/80 border-orange-900 text-orange-200'
  },
  {
    id: 'f-medieval-history',
    name: 'Medieval History',
    subject: 'History',
    color: 'bg-yellow-950/80 border-yellow-900 text-yellow-200'
  },
  {
    id: 'f-art-culture',
    name: 'Art and Culture',
    subject: 'History',
    color: 'bg-rose-950/80 border-rose-900 text-rose-200'
  },
  {
    id: 'f-geography',
    name: 'Geography',
    subject: 'Geography',
    color: 'bg-sky-950/80 border-sky-800 text-sky-200'
  },
  {
    id: 'f-environment-ecology',
    name: 'Environment and Ecology',
    subject: 'Environment',
    color: 'bg-teal-950/80 border-teal-800 text-teal-200'
  },
  {
    id: 'f-science-tech',
    name: 'Science and Technology',
    subject: 'Science',
    color: 'bg-slate-900 border-slate-750 text-slate-200'
  },
  {
    id: 'f-ir',
    name: 'International Relations',
    subject: 'Polity',
    color: 'bg-cyan-950/80 border-cyan-800 text-cyan-200'
  },
  {
    id: 'f-society',
    name: 'Society and Social Justice',
    subject: 'Polity',
    color: 'bg-violet-950/80 border-violet-800 text-violet-200'
  },
  {
    id: 'f-ethics',
    name: 'Ethics',
    subject: 'Ethics',
    color: 'bg-fuchsia-950/80 border-fuchsia-800 text-fuchsia-200'
  },
  {
    id: 'f-essay',
    name: 'Essay',
    subject: 'Ethics',
    color: 'bg-stone-900 border-stone-750 text-stone-200'
  },
  {
    id: 'f-security',
    name: 'Security',
    subject: 'Science',
    color: 'bg-zinc-900 border-zinc-750 text-zinc-200'
  },
  {
    id: 'f-disaster',
    name: 'Disaster Management',
    subject: 'Geography',
    color: 'bg-red-950/80 border-red-800 text-red-200'
  },
  {
    id: 'f-ca',
    name: 'Current Affairs',
    subject: 'CSAT',
    color: 'bg-blue-950/80 border-blue-800 text-blue-200'
  },
  {
    id: 'f-econ-optional',
    name: 'Economics Optional',
    subject: 'Economy',
    color: 'bg-lime-950/80 border-lime-800 text-lime-200'
  },
  {
    id: 'f-misc',
    name: 'Miscellaneous',
    subject: 'CSAT',
    color: 'bg-neutral-900 border-neutral-750 text-neutral-200'
  }
];

export const DEFAULT_PYQS = [
  {
    id: "PYQ_PRES_001",
    year: 2025,
    type: "Prelims",
    question: "With reference to the Indian polity, consider the following statements:\nI. An Ordinance can come into effect from a back date.\nII. An Ordinance can amend any Central Act.\nIII. An Ordinance can abridge a Fundamental Right.\nWhich of the statements given above are correct?",
    options: ["I and II only", "II and III only", "I and III only", "I, II and III"],
    answer: "A",
    answer_explanation: "Ordinances can be retrospective (back date) and can amend Central Acts, but cannot abridge Fundamental Rights (Article 13 includes ordinances in definition of 'law').",
    topic_tags: ["Ordinance", "Article 123", "Fundamental Rights", "Legislative Powers of President"],
    difficulty: "medium"
  },
  {
    id: "PYQ_PRES_002",
    year: 2025,
    type: "Prelims",
    question: "With reference to the Indian polity, consider the following statements:\nI. The Governor of a State is not answerable to any court for the exercise and performance of the powers and duties of his/her office.\nII. No criminal proceedings shall be instituted or continued against the Governor during his/her term of office.\nIII. Members of a State Legislature are not liable to any proceedings in any court in respect of anything said within the House.\nWhich of the statements given above are correct?",
    options: ["I and II only", "II and III only", "I and III only", "I, II and III"],
    answer: "D",
    answer_explanation: "All three are correct constitutional provisions. Governor has immunity from court proceedings (Article 361). MLAs have freedom of speech in legislature (Article 194).",
    topic_tags: ["Governor", "Immunity", "State Legislature", "Article 361", "Article 194"],
    difficulty: "hard"
  }
];

export const DEFAULT_CHAPTERS: Chapter[] = [
  {
    id: "ch-pol-18",
    folderId: "f-polity",
    title: "Chapter 18 — The President",
    description: "Deconstructs presidential authority, electoral systems, pardoning powers, and emergency power systems.",
    subject: "Polity",
    createdAt: new Date().toISOString(),
    source: "M. Laxmikanth (8th Edition)",
    metadata: {
      book: "Indian Polity by M. Laxmikanth (8th Edition)",
      chapter_number: 18,
      chapter_title: "The President",
      part: "Part V — The Union",
      articles: "Articles 52–78",
      subject: "Indian Polity",
      generated: "2026-06-20"
    },
    chapter_intro: "Articles 52 to 78 in Part V of the Constitution deal with the Union executive. The Union executive consists of the President, the Vice-President, the Prime Minister, the council of ministers and the attorney general of India. The President is the head of the Indian State. He/she is the first citizen of India and acts as the symbol of unity, integrity and solidarity of the nation.",
    chapter_background: "**A**rticles 52 to 78 in Part V of the Constitution deal with the Union executive.\n\nThe Union executive consists of the President, the Vice-President, the Prime Minister, the council of ministers and the attorney general of India.\n\nThe President is the head of the Indian State. He/she is the first citizen of India and acts as the symbol of unity, integrity and solidarity of the nation.",
    important_articles: [
      { article: "52", subject: "The President of India" },
      { article: "53", subject: "Executive power of the Union vested in President" },
      { article: "54", subject: "Election of President — Electoral College" },
      { article: "55", subject: "Manner of election — STV, proportional representation" },
      { article: "56", subject: "Term of office — 5 years" },
      { article: "57", subject: "Eligibility for re-election — unlimited" },
      { article: "58", subject: "Qualifications for Presidential election" },
      { article: "59", subject: "Conditions of President's office" },
      { article: "60", subject: "Oath or affirmation by President" },
      { article: "61", subject: "Procedure for impeachment — 2/3 of total membership" },
      { article: "62", subject: "Time for election to fill Presidential vacancy" },
      { article: "72", subject: "Pardoning power — pardon, commute, remit, respite, reprieve" },
      { article: "74", subject: "Council of Ministers to aid and advise — advice binding" },
      { article: "111", subject: "Assent to bills — three veto options" },
      { article: "123", subject: "Power to promulgate ordinances during Parliament recess" }
    ],
    topics: [
      {
        id: "t01",
        title: "Election of the President",
        order: 1,
        full_text: "The President is elected not directly by the people but by members of electoral college consisting of:\n• the elected members of both the Houses of Parliament;\n• the elected members of the legislative assemblies of the states; and\n• the elected members of the legislative assemblies of the Union Territories of Delhi and Puducherry.\n\nThus, the nominated members of both the Houses of Parliament, the nominated members of the state legislative assemblies, the members (both elected and nominated) of the state legislative councils (in case of the bicameral legislature) and the nominated members of the Legislative Assembly of Puducherry do not participate in the election of the President.\n\nThe 104th Constitutional Amendment Act of 2019 has discontinued the provision of special representation of the Anglo-Indian community in the Lok Sabha and State Legislative Assemblies by nomination.\n\nFurther, where an assembly is dissolved, the members cease to be qualified to vote in the presidential election.\n\nTo achieve uniformity in the scale of representation of different states as well as parity between the states as a whole and the Union, the number of votes is determined as follows:\n• MLA Vote Value = (State Population / Total Elected MLAs) / 1000\n• MP Vote Value = Total value of votes of all MLAs / Total elected members of LS + RS.\n\nThe President's election is held in accordance with the system of proportional representation by means of the single transferable vote and the voting is by secret ballot.",
        key_concepts: [
          {
            concept: "Electoral College — Who is IN",
            explanation: "The Electoral College consists of: (1) elected members of both Houses of Parliament, (2) elected members of State Legislative Assemblies, and (3) elected members of Delhi and Puducherry assemblies.",
            article: "Article 54",
            exam_angle: "UPSC frequently asks who is EXCLUDED — know the negative list as well as the positive."
          },
          {
            concept: "Electoral College — Who is OUT (Excluded)",
            explanation: "Excluded: (1) Nominated members of Parliament, (2) Nominated members of State Assemblies, (3) Members (both elected/nominated) of State Legislative Councils (upper houses), (4) Members of dissolved assemblies.",
            article: "Article 54",
            exam_angle: "State Legislative Council members do NOT vote — this is a classic UPSC trap."
          }
        ],
        flashcards: [
          { front: "Which UTs participate in the Presidential election and why?", back: "Only Delhi and Puducherry — because they have elected Legislative Assemblies. Added by the 70th Constitutional Amendment Act, 1992." },
          { front: "Are State Legislative Council members part of the Electoral College?", back: "NO. Members of State Legislative Councils (upper houses like UP Vidhan Parishad) are completely excluded." }
        ],
        pyq_ids: ["PYQ_PRES_001", "PYQ_PRES_002"],
        mains_questions: [
          {
            question: "Examine the rationale behind the indirect election of the President of India and evaluate whether it adequately ensures the representative character of the office. (250 words)",
            answer_skeleton: {
              intro: "Introduce constitutional basis: Articles 54–55 establish an Electoral College mechanism rather than direct popular election. State the core rationale.",
              body_points: [
                "Reason 1: Parliamentary system harmony — A directly elected President would demand real executive powers, which contradicts the Prime Ministerial real authority.",
                "Reason 2: Practicality & Cost — Direct election for a ceremonial head across a massive electorate is extremely expensive and logistically wasteful.",
                "Reason 3: Federalism — Including state MLAs guarantees the President represents the Union and the States equally, rather than being a single party's choice."
              ],
              conclusion: "The indirect election is constitutionally consistent and federally sound."
            }
          }
        ],
        socratic_questions: [
          "If the President is only a ceremonial head, why does the electoral college mechanism matter so much?",
          "The 1971 Census is used for MLA vote value calculation even today. What are the political implications of this freeze?"
        ],
        feynman_prompts: [
          "Explain to a friend who knows nothing about Indian Polity why we don't let ordinary people vote directly for the President of India."
        ],
        ca_angles: [
          "2022 Presidential election: Droupadi Murmu elected as India's first tribal President with 64% of electoral college votes.",
          "104th Constitutional Amendment (2019) ending Anglo-Indian nomination."
        ],
        lesson_slides: [
          {
            slide_number: 1,
            title: "Who Elects the President?",
            type: "concept",
            content: "The President is NOT elected by the people directly.\n\nThe Electoral College votes — made up of:\n• Elected MPs of Lok Sabha + Rajya Sabha\n• Elected MLAs of all State Legislatures\n• Elected MLAs of Delhi and Puducherry\n\nNominated members, MLCs, and dissolved assembly members are EXCLUDED."
          },
          {
            slide_number: 2,
            title: "MLA Vote Value Formula",
            type: "formula",
            content: "MLA Vote Value =\nPopulation of State (1971 Census)\n÷ (Total Elected MLAs × 1000)\n\nKey facts:\n• 1971 Census frozen by 84th Amendment (2001)\n• Stays frozen until post-2026 Census is published"
          }
        ],
        section_heading: "ELECTION OF THE PRESIDENT"
      },
      {
        id: "t02",
        title: "Qualifications, Oath and Conditions of Office",
        order: 2,
        full_text: "To be eligible for election as President, a person should:\n• be a citizen of India;\n• have completed 35 years of age;\n• be qualified for election as a member of the Lok Sabha;\n• not hold any office of profit.\n\nThe nomination of a candidate must be subscribed by at least 50 electors as proposers and 50 electors as seconders. Security deposit is ₹15,000 in RBI, forfeited if the candidate fails to secure 1/6th of the votes polled.\n\nThe President swears to faithfully execute the office, preserve, protect and defend the Constitution and the law, and devote himself/herself to the service and well-being of the people of India. The oath is administered by the Chief Justice of India.\n\nThe President enjoys absolute personal immunity from legal liability for official acts, complete immunity from criminal proceedings, and civil proceedings only after 2 months' notice.",
        key_concepts: [
          {
            concept: "Qualifications for Presidential Election (Article 58)",
            explanation: "Requires Indian citizenship, 35+ age, Lok Sabha eligibility, and no office of profit. Exceptions: sitting President, VP, Governors, or Union/State Ministers.",
            article: "Article 58",
            exam_angle: "The office-of-profit exception is frequently tested. Memorise the list."
          },
          {
            concept: "Presidential Immunities (Article 361)",
            explanation: "Personal immunity for official acts. Criminal proceedings completely barred. Civil proceedings permitted only after 2 months' written notice.",
            article: "Article 361",
            exam_angle: "Criminal immunity is absolute during term; civil immunity requires 2-month notice."
          }
        ],
        flashcards: [
          { front: "Who administers the oath of office to the President?", back: "The Chief Justice of India, or in his/her absence, the seniormost judge of the Supreme Court." },
          { front: "Can civil proceedings be instituted against the President during his/her term?", back: "Yes, but only for personal acts and only after giving two months' written notice." }
        ],
        pyq_ids: ["PYQ_PRES_002"],
        mains_questions: [
          {
            question: "Discuss the constitutional immunities enjoyed by the President of India. Are these immunities absolute? (150 words)",
            answer_skeleton: {
              intro: "Article 361 grants special immunities to the President to enable independent functioning.",
              body_points: [
                "Criminal immunity is absolute during term.",
                "Civil immunity is conditional on 2 months' notice.",
                "Official acts are immune, but judicial review can check decisions for malafide."
              ],
              conclusion: "Wide but not unlimited protection under the rule of law."
            }
          }
        ],
        socratic_questions: [
          "Is absolute criminal immunity for personal acts during the term justified in a democracy?"
        ],
        feynman_prompts: [
          "Explain the oath of the President — what is the President actually promising, and to whom?"
        ],
        ca_angles: [
          "Office of profit debates and recent disqualifications of legislators."
        ],
        lesson_slides: [
          {
            slide_number: 1,
            title: "Qualifications (Article 58)",
            type: "list",
            content: "Must satisfy ALL:\n• Indian Citizen\n• 35+ years old\n• Lok Sabha eligible\n• No Office of Profit (exempt: President, VP, Gov, Ministers)"
          }
        ],
        section_heading: "QUALIFICATIONS, OATH AND CONDITIONS"
      }
    ]
  }
];

export const DEFAULT_FLASHCARDS: Flashcard[] = [
  {
    id: 'fc-01',
    chapterId: 'ch-pol-18',
    front: 'Which Constitutional Amendment added the terms "Socialist", "Secular", and "Integrity" to the Preamble?',
    back: 'The 42nd Constitutional Amendment Act, passed in 1976 during the Emergency.',
    subject: 'Polity',
    box: 1,
    nextReviewDate: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    streak: 0
  },
  {
    id: 'fc-02',
    chapterId: 'ch-pol-18',
    front: 'What is the key difference between "Equality Before Law" and "Equal Protection of Laws" in Article 14?',
    back: '"Equality Before Law" (British origin) is a negative concept indicating the absence of special privileges. "Equal Protection of Laws" (American origin) is a positive concept requiring equal treatment under equal circumstances, allowing for reasonable classification.',
    subject: 'Polity',
    box: 1,
    nextReviewDate: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    streak: 0
  }
];
