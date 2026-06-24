import { GoogleGenAI, Type } from '@google/genai';

// Retrieve the stored API key from localStorage
export function getStoredGeminiKey(): string {
  return localStorage.getItem('cseguide_gemini_key') || '';
}

// Store the API key in localStorage
export function setStoredGeminiKey(key: string): void {
  localStorage.setItem('cseguide_gemini_key', key.trim());
}

// Initialize the Google GenAI client dynamically
export function getGeminiClient(customKey?: string): GoogleGenAI {
  const key = customKey || getStoredGeminiKey();
  if (!key) {
    throw new Error('Gemini API key is missing. Please provide it in the Settings panel.');
  }
  return new GoogleGenAI({
    apiKey: key,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build', // required telemetry header
      }
    }
  });
}

// Test the Gemini connection
export async function testGeminiConnection(key: string): Promise<boolean> {
  try {
    const ai = getGeminiClient(key);
    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: 'Respond with the word "Success" and nothing else to confirm this connection works.',
    });
    return response.text?.trim().toLowerCase().includes('success') || false;
  } catch (error) {
    console.error('Gemini connection test failed:', error);
    return false;
  }
}

// Helper to sanitize JSON response from the model
function cleanJsonResponse(rawText: string): string {
  let text = rawText.trim();
  // Strip markdown code fences if present
  if (text.startsWith('```json')) {
    text = text.substring(7);
  } else if (text.startsWith('```')) {
    text = text.substring(3);
  }
  if (text.endsWith('```')) {
    text = text.substring(0, text.length - 3);
  }
  return text.trim();
}

// 1. Simple Explanation Action
export async function generateSimpleExplanation(textSection: string): Promise<string> {
  const ai = getGeminiClient();
  const response = await ai.models.generateContent({
    model: 'gemini-3.5-flash',
    contents: `Explain the following text in an easy-to-understand, intuitive way. Break down any complex constitutional, administrative, legal, or economic jargon into simple terms. Use analogies if possible, but maintain intellectual precision suitable for a UPSC Civil Services aspirant:
    
    "${textSection}"`,
  });
  return response.text || 'No response generated.';
}

// 2. UPSC Lens (Prelims vs Mains) Action
export async function generateUPSCLens(textSection: string): Promise<string> {
  const ai = getGeminiClient();
  const response = await ai.models.generateContent({
    model: 'gemini-3.5-flash',
    contents: `Analyze the following study text through the lens of the UPSC Civil Services Examination. Provide an analytical breakdown with two clear, well-structured sections:
    
1. PRELIMS FOCUS (What factual trivia, specific clauses, constitutional articles, names, dates, reports, or institutional compositions should be memorized for multiple-choice questions?)
2. MAINS FOCUS (What analytical arguments, socio-economic debates, policy critique, structural challenges, committee recommendations, or conceptual summaries should be structured for GS descriptive essay answers?)

Format the output in clean, highly professional Markdown with bold bullet points.

Text to analyze:
"${textSection}"`,
  });
  return response.text || 'No response generated.';
}

// 3. Socratic Questions Action
export async function generateSocraticQuestions(textSection: string): Promise<string> {
  const ai = getGeminiClient();
  const response = await ai.models.generateContent({
    model: 'gemini-3.5-flash',
    contents: `You are an expert UPSC mentor. Formulate 3 thought-provoking Socratic questions based on the text below to challenge the reader's critical understanding, encourage them to think about real-world policy implications, trade-offs, and ethical or constitutional issues. For each question, provide a brief, high-level guiding hint or counter-perspective to stimulate their analysis:
    
    "${textSection}"`,
  });
  return response.text || 'No response generated.';
}

// 4. MCQ Drill Action (returns a typed MCQ question set)
export interface GeneratedMCQ {
  text: string;
  options: string[];
  correctAnswer: number; // index 0-3
  explanation: string;
}

export async function generateMCQDrill(textSection: string, subject: string): Promise<GeneratedMCQ[]> {
  const ai = getGeminiClient();
  const prompt = `Generate exactly 3 UPSC-style, high-quality, conceptual Multiple Choice Questions (MCQs) based on the text below. 
  Each question must have exactly 4 choices, with only one correct choice. 
  UPSC MCQs are highly analytical (e.g. statement-based, or finding correct assertions).
  Provide a detailed explanation for why the answer is correct and why other options are incorrect.
  
  Format the response STRICTLY as a JSON array of objects conforming exactly to this TS interface:
  interface GeneratedMCQ {
    text: string;
    options: string[];
    correctAnswer: number; // 0-indexed number representing the correct option (0, 1, 2, or 3)
    explanation: string;
  }
  
  Do not include any outer markdown wrappers. Only return a raw JSON array.
  
  Subject context: ${subject}
  Study Text:
  "${textSection}"`;

  const response = await ai.models.generateContent({
    model: 'gemini-3.5-flash',
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.ARRAY,
        description: 'An array of exactly 3 multiple choice questions.',
        items: {
          type: Type.OBJECT,
          properties: {
            text: { type: Type.STRING, description: 'The question text, analytical and UPSC-style.' },
            options: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING },
              description: 'Exactly 4 distinct plausible options.'
            },
            correctAnswer: { type: Type.INTEGER, description: 'Index of the correct answer (0, 1, 2, or 3).' },
            explanation: { type: Type.STRING, description: 'Comprehensive explanation referencing key concepts.' },
          },
          required: ['text', 'options', 'correctAnswer', 'explanation'],
        }
      }
    }
  });

  try {
    const cleaned = cleanJsonResponse(response.text || '[]');
    return JSON.parse(cleaned) as GeneratedMCQ[];
  } catch (error) {
    console.error('Failed to parse MCQ JSON. Trying manual extraction...', error);
    // fallback parsing logic if somehow config fails
    const match = response.text?.match(/\[\s*\{[\s\S]*\}\s*\]/);
    if (match) {
      return JSON.parse(match[0]) as GeneratedMCQ[];
    }
    throw new Error('The model response was not in a valid JSON format. Please try again.');
  }
}

// 5. Flashcard Maker Action
export interface GeneratedFlashcard {
  front: string;
  back: string;
}

export async function generateFlashcards(textSection: string, subject: string): Promise<GeneratedFlashcard[]> {
  const ai = getGeminiClient();
  const prompt = `Based on the following text, extract exactly 3 core factual or conceptual points and format them as high-quality question-and-answer revision flashcards. 
  The "front" should ask a concise, targeted question (e.g. "What are the exceptions to Article 15?", "What is the base year of CPI in India?"). 
  The "back" should provide a precise, high-yield summary answer that can be memorized quickly.
  
  Format the response STRICTLY as a JSON array of objects conforming exactly to this TS interface:
  interface GeneratedFlashcard {
    front: string;
    back: string;
  }
  
  Do not include any outer markdown wrappers. Only return a raw JSON array.
  
  Subject context: ${subject}
  Study Text:
  "${textSection}"`;

  const response = await ai.models.generateContent({
    model: 'gemini-3.5-flash',
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.ARRAY,
        description: 'An array of exactly 3 flashcards.',
        items: {
          type: Type.OBJECT,
          properties: {
            front: { type: Type.STRING, description: 'A clear question or prompt for the front of the card.' },
            back: { type: Type.STRING, description: 'A concise high-yield answer for the back of the card.' },
          },
          required: ['front', 'back'],
        }
      }
    }
  });

  try {
    const cleaned = cleanJsonResponse(response.text || '[]');
    return JSON.parse(cleaned) as GeneratedFlashcard[];
  } catch (error) {
    console.error('Failed to parse Flashcard JSON:', error);
    const match = response.text?.match(/\[\s*\{[\s\S]*\}\s*\]/);
    if (match) {
      return JSON.parse(match[0]) as GeneratedFlashcard[];
    }
    throw new Error('The model response was not in a valid JSON format. Please try again.');
  }
}

// 6. Mains Answer Skeleton Action
export async function generateMainsSkeleton(textSection: string): Promise<string> {
  const ai = getGeminiClient();
  const response = await ai.models.generateContent({
    model: 'gemini-3.5-flash',
    contents: `Based on the text below, formulate a highly probable UPSC Civil Services Mains-style descriptive question (typically worth 10 marks/150 words or 15 marks/250 words). 
    Then, provide a premium "Answer Skeleton" or structural draft that teaches the aspirant how to write a high-scoring response. 
    
    The skeleton must follow the standard UPSC evaluation rubric:
    1. PROPOSED QUESTION (Formulate a clear, UPSC-style question using directives like "Critically Analyze", "Elucidate", or "Discuss").
    2. INTRODUCTION (Outline a 30-word start, e.g. defining terms, citing a constitutional article, or referencing a current report).
    3. MAIN BODY STRUCTURE (Point-by-point headings with placeholder references for constitutional articles, Supreme Court cases, economic committees, historical precedents, or real-world statistics).
    4. WAY FORWARD / CONCLUSION (Suggest a constructive, progressive, and balanced summary ending).

Format the output in clean, elegant, professional Markdown.

Text to structure:
"${textSection}"`,
  });
  return response.text || 'No response generated.';
}

// 7. Current Affairs Classifier Action
export interface CAClassification {
  syllabusCode: string; // e.g. "GS Paper II: Polity & Constitution"
  topicsJoined: string; // e.g. "Fundamental Rights, Article 14, Judiciary"
  revisionNote: string; // strict 20-word revision note
}

export async function generateCAClassifier(textSection: string): Promise<CAClassification> {
  const ai = getGeminiClient();
  const prompt = `Analyze the study text below and classify it according to the UPSC CSE General Studies (GS) Mains Syllabus papers (GS Paper I, II, III, or IV). 
  Provide:
  1. A clear syllabus code/classification (e.g., "GS Paper II: Indian Constitution & Polity", "GS Paper III: Economic Development", etc.).
  2. A list of key topics or tags joined by commas.
  3. A strict, high-impact revision note summarizing the absolute core takeaway of this text in EXACTLY 20 words (or under 20 words). This note must be highly concise, punching in facts and concepts for last-minute revision.
  
  Format the response STRICTLY as a JSON object conforming exactly to this TS interface:
  interface CAClassification {
    syllabusCode: string;
    topicsJoined: string;
    revisionNote: string;
  }
  
  Study Text:
  "${textSection}"`;

  const response = await ai.models.generateContent({
    model: 'gemini-3.5-flash',
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          syllabusCode: { type: Type.STRING, description: 'Syllabus paper designation (e.g., GS Paper II: Polity & Constitution).' },
          topicsJoined: { type: Type.STRING, description: 'Comma-separated core keywords.' },
          revisionNote: { type: Type.STRING, description: 'A highly concise, factual revision note containing strictly 20 words or fewer.' },
        },
        required: ['syllabusCode', 'topicsJoined', 'revisionNote'],
      }
    }
  });

  try {
    const cleaned = cleanJsonResponse(response.text || '{}');
    return JSON.parse(cleaned) as CAClassification;
  } catch (error) {
    console.error('Failed to parse CA classification JSON:', error);
    const match = response.text?.match(/\{\s*[\s\S]*\s*\}/);
    if (match) {
      return JSON.parse(match[0]) as CAClassification;
    }
    return {
      syllabusCode: 'UPSC Syllabus General Studies',
      topicsJoined: 'UPSC CSE Core Topics',
      revisionNote: 'Factual review required for civil services syllabus components.'
    };
  }
}

// 8. General-purpose Gemini caller for chat & custom prompts with optional attachment support
export async function callGemini(
  prompt: string, 
  modelId: string = 'gemini-3.5-flash',
  attachment?: { mimeType: string; data: string }
): Promise<string> {
  try {
    const ai = getGeminiClient();
    let response;
    
    if (attachment) {
      const part = {
        inlineData: {
          mimeType: attachment.mimeType,
          data: attachment.data,
        },
      };
      response = await ai.models.generateContent({
        model: modelId,
        contents: [part, prompt],
      });
    } else {
      response = await ai.models.generateContent({
        model: modelId,
        contents: prompt,
      });
    }
    
    return response.text || 'No response generated.';
  } catch (error: any) {
    console.error('Gemini call failed:', error);
    return `Error: ${error.message || error}`;
  }
}

