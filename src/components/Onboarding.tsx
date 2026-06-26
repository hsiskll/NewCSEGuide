import React, { useState } from 'react';
import { motion } from 'motion/react';
import { BookOpen, Key, Award, Clock, ArrowRight, ShieldCheck, Check } from 'lucide-react';
import { StudyGoal } from '../types';
import { setStoredGeminiKey, testGeminiConnection } from '../utils/gemini';

interface OnboardingProps {
  onComplete: (goal: StudyGoal, apiKey: string) => void;
}

export default function Onboarding({ onComplete }: OnboardingProps) {
  const [step, setStep] = useState(0);
  const [targetYear, setTargetYear] = useState('2026');
  const [userName, setUserName] = useState('Ray');
  const [dailyMinutes, setDailyMinutes] = useState(60);
  const [apiKey, setApiKey] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'failed' | null>(null);

  const handleTestKey = async () => {
    if (!apiKey) return;
    setTesting(true);
    setTestResult(null);
    const success = await testGeminiConnection(apiKey);
    setTesting(false);
    setTestResult(success ? 'success' : 'failed');
  };

  const handleFinish = () => {
    onComplete(
      {
        targetYear,
        focusArea: 'Indian Polity & Constitution',
        dailyTargetMinutes: Number(dailyMinutes),
        userName,
      },
      apiKey
    );
  };

  const stepsContent = [
    // Step 0: Welcome
    <div key="welcome" className="space-y-6 text-center">
      <div className="mx-auto w-24 h-24 rounded-full bg-[#0C1E36] border-2 border-[#C59B27] flex items-center justify-center shadow-lg">
        <BookOpen className="w-12 h-12 text-[#C59B27]" />
      </div>
      <h1 className="text-3xl font-bold tracking-tight text-[#0C1E36]">
        CSE<span className="text-[#C59B27]">Guide</span>
      </h1>
      <p className="text-[#4B5E75] text-lg font-serif italic max-w-md mx-auto">
        "Siddhim Sansthanam Ch"—The path of scholarship, discipline, and systematic preparation.
      </p>
      <div className="max-w-md mx-auto bg-[#0C1E36] p-5 rounded-lg border border-[#C59B27] text-white text-left space-y-3 shadow-md">
        <p className="text-sm leading-relaxed text-gray-200">
          Welcome to your personal <strong>UPSC Civil Services Examination</strong> companion. CSEGuide is a fully offline-first, browser-secure reader engineered to convert standard syllabus readings into active scholarship using direct Gemini AI integration and Leitner spaced-repetition memory cycles.
        </p>
        <div className="flex items-center gap-2 text-[#14B8A6] text-xs font-semibold">
          <ShieldCheck className="w-4 h-4 text-[#14B8A6]" />
          <span>No Server Backend — Your studies and keys remain 100% private.</span>
        </div>
      </div>
    </div>,

    // Step 1: Syllabus & Goals
    <div key="goals" className="space-y-5 text-left">
      <div className="flex items-center gap-3 border-b border-[#0C1E36] pb-3">
        <Award className="w-8 h-8 text-[#C59B27]" />
        <h2 className="text-xl font-bold text-[#0C1E36]">Configure Your Aspirations</h2>
      </div>
      <p className="text-sm text-[#4B5E75] font-serif">
        Setting clear micro-targets establishes the daily rigor required to master the three stages of the Civil Services exam (Prelims, Mains, and Interview).
      </p>
      
      <div className="space-y-4 pt-2">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-[#0C1E36] mb-1">Target UPSC Attempt Year</label>
          <select 
            className="w-full bg-white border border-[#0C1E36] rounded-md p-2.5 text-sm text-[#0C1E36] focus:outline-none focus:ring-2 focus:ring-[#C59B27]"
            value={targetYear}
            onChange={(e) => setTargetYear(e.target.value)}
          >
            <option value="2026">CSE 2026 (Active preparation)</option>
            <option value="2027">CSE 2027 (Long-term planner)</option>
            <option value="2028">CSE 2028+ (Foundation program)</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-[#0C1E36] mb-1">Your Name</label>
          <input 
            type="text"
            className="w-full bg-white border border-[#0C1E36] rounded-md p-2.5 text-sm text-[#0C1E36] focus:outline-none focus:ring-2 focus:ring-[#C59B27]"
            placeholder="e.g. Ray, Alex, Sam"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-[#0C1E36] mb-1">Daily Study Reading Target</label>
          <div className="flex items-center gap-3">
            <input 
              type="range"
              min="15"
              max="240"
              step="15"
              className="flex-1 accent-[#C59B27]"
              value={dailyMinutes}
              onChange={(e) => setDailyMinutes(Number(e.target.value))}
            />
            <span className="bg-[#0C1E36] text-[#C59B27] text-xs font-mono font-bold px-3 py-1.5 rounded-md border border-[#C59B27] min-w-[80px] text-center">
              {dailyMinutes} Min
            </span>
          </div>
          <span className="text-[11px] text-gray-500 italic block mt-1">Recommended: 60-120 minutes of high-focus smart reading per day.</span>
        </div>
      </div>
    </div>,

    // Step 2: Gemini Setup
    <div key="api" className="space-y-4 text-left">
      <div className="flex items-center gap-3 border-b border-[#0C1E36] pb-3">
        <Key className="w-8 h-8 text-[#C59B27]" />
        <h2 className="text-xl font-bold text-[#0C1E36]">Activate Gemini AI Copilot</h2>
      </div>
      <p className="text-xs text-[#4B5E75] leading-relaxed font-serif">
        CSEGuide utilizes Google's modern <strong>Gemini 3.5 Flash</strong> to generate simple explanations, UPSC Prelims-vs-Mains briefs, flashcards, and Socratic questions. 
      </p>

      <div className="bg-amber-50 border border-[#C59B27] p-3.5 rounded text-xs text-amber-900 space-y-1 font-sans">
        <p className="font-bold">🔐 Privacy and Key Security Guarantee:</p>
        <p>This is a <strong>static browser application</strong>. Your API key is saved solely in your browser's private local storage. It is sent directly to Google Gemini's API endpoints from your computer—never routed through any intermediate backend server. You can revoke it anytime in Settings.</p>
      </div>

      <div className="space-y-3 pt-2">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-[#0C1E36] mb-1">Gemini API Key</label>
          <div className="flex gap-2">
            <input 
              type="password"
              className="flex-1 bg-white border border-[#0C1E36] rounded-md p-2.5 text-sm text-[#0C1E36] focus:outline-none focus:ring-2 focus:ring-[#C59B27] font-mono"
              placeholder="AIzaSy..."
              value={apiKey}
              onChange={(e) => {
                setApiKey(e.target.value);
                setTestResult(null);
              }}
            />
            <button
              onClick={handleTestKey}
              disabled={!apiKey || testing}
              className="bg-[#4B5E75] hover:bg-[#0C1E36] text-[#14B8A6] border border-[#14B8A6] text-xs font-mono px-3 py-1 rounded-md transition duration-200 disabled:opacity-50"
            >
              {testing ? 'Verifying...' : 'Test Key'}
            </button>
          </div>
        </div>

        {testResult === 'success' && (
          <div className="p-2.5 bg-green-50 border border-green-400 text-green-800 text-xs rounded-md flex items-center gap-2">
            <Check className="w-4 h-4 text-green-600 shrink-0" />
            <span>Connection verified successfully! Your study copilot is operational.</span>
          </div>
        )}

        {testResult === 'failed' && (
          <div className="p-2.5 bg-red-50 border border-red-400 text-red-800 text-xs rounded-md">
            <span>Authentication failed. Please verify the key has correct permissions and retry, or proceed without a key first.</span>
          </div>
        )}

        <div className="text-center pt-2">
          <button
            onClick={() => {
              setApiKey('');
              setStep(3);
            }}
            className="text-xs text-[#4B5E75] hover:text-[#C59B27] underline font-semibold"
          >
            I will provide my key later. Proceed with demo reader.
          </button>
        </div>
      </div>
    </div>,

    // Step 3: All Set!
    <div key="finish" className="space-y-6 text-center">
      <div className="mx-auto w-20 h-20 rounded-full bg-[#C59B27] text-[#0C1E36] flex items-center justify-center shadow-md animate-bounce">
        <Check className="w-10 h-10" />
      </div>
      <h2 className="text-2xl font-bold text-[#0C1E36]">Scholarship Activated</h2>
      <p className="text-[#4B5E75] font-serif max-w-sm mx-auto text-sm leading-relaxed">
        Your goals are set, your secure workspace is initialized, and your study materials are staged. Let the systematic preparation begin.
      </p>
      <div className="max-w-xs mx-auto border-t border-[#C59B27]/50 my-4"></div>
      <div className="text-xs text-[#4B5E75] italic bg-[#FDFBF7] border border-[#0C1E36]/10 p-3 rounded-lg font-mono">
        "Uncompromising clarity for the Civil Services."
      </div>
    </div>
  ];

  return (
    <div id="onboarding_container" className="fixed inset-0 z-50 bg-[#0C1E36] flex items-center justify-center p-4">
      {/* Decorative architectural layout */}
      <div className="absolute inset-0 bg-[radial-gradient(#C59B27_1px,transparent_1px)] [background-size:24px_24px] opacity-10"></div>
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-[#FDFBF7] border-2 border-[#C59B27] shadow-2xl rounded-xl w-full max-w-lg p-6 md:p-8 relative overflow-hidden flex flex-col justify-between min-h-[460px] z-10"
      >
        {/* Subtle classical gold borders */}
        <div className="absolute top-2 left-2 right-2 bottom-2 border border-[#C59B27]/30 pointer-events-none rounded-lg"></div>
        
        {/* Content body */}
        <div className="py-4 flex-1 flex flex-col justify-center">
          {stepsContent[step]}
        </div>

        {/* Footer controls */}
        <div className="mt-8 flex items-center justify-between border-t border-[#0C1E36]/10 pt-4 z-20">
          <div className="flex gap-1.5">
            {stepsContent.map((_, i) => (
              <div 
                key={i} 
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === step ? 'w-6 bg-[#C59B27]' : 'w-2 bg-[#0C1E36]/20'
                }`}
              />
            ))}
          </div>

          <div className="flex gap-3">
            {step > 0 && step < stepsContent.length - 1 && (
              <button
                onClick={() => setStep(step - 1)}
                className="px-4 py-2 text-xs font-bold tracking-wider uppercase text-[#0C1E36] hover:text-[#C59B27] transition duration-200"
              >
                Back
              </button>
            )}

            {step < stepsContent.length - 1 ? (
              <button
                onClick={() => {
                  if (step === 2 && apiKey) {
                    setStoredGeminiKey(apiKey);
                  }
                  setStep(step + 1);
                }}
                className="bg-[#0C1E36] hover:bg-[#4B5E75] text-[#C59B27] border border-[#C59B27] px-5 py-2 rounded-md text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition duration-200 shadow-md"
              >
                Continue
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                onClick={handleFinish}
                className="bg-[#0C1E36] hover:bg-[#4B5E75] text-[#C59B27] border border-[#C59B27] px-6 py-2 rounded-md text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition duration-200 shadow-lg"
              >
                Enter Academy
                <Check className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
