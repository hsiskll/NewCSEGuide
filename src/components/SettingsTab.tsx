import React, { useState, useRef } from 'react';
import { 
  Key, ShieldCheck, Download, Upload, Trash2, Check,
  AlertCircle, RefreshCw, FileText, Sparkles
} from 'lucide-react';
import { getStoredGeminiKey, setStoredGeminiKey, testGeminiConnection, getStoredGeminiModel, setStoredGeminiModel } from '../utils/gemini';
import { UPSCState } from '../types';

interface SettingsTabProps {
  state: UPSCState;
  onImportFullState: (newState: UPSCState) => void;
  onResetToDemo: () => void;
  onUpdateKey: (key: string) => void;
}

export default function SettingsTab({
  state,
  onImportFullState,
  onResetToDemo,
  onUpdateKey
}: SettingsTabProps) {
  const [apiKey, setApiKey] = useState(getStoredGeminiKey());
  const [selectedModel, setSelectedModel] = useState(getStoredGeminiModel());
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'failed' | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [importStatus, setImportStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSaveKey = () => {
    setStoredGeminiKey(apiKey);
    onUpdateKey(apiKey);
    setTestResult(null);
  };

  const handleTestKey = async () => {
    if (!apiKey) return;
    setTesting(true);
    setTestResult(null);
    const success = await testGeminiConnection(apiKey, selectedModel);
    setTesting(false);
    setTestResult(success ? 'success' : 'failed');
  };

  // Export full UPSC study records to a downloadable JSON file
  const handleExportBackup = () => {
    try {
      const dataStr = JSON.stringify(state, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
      
      const exportFileDefaultName = `cseguide_upsc_backup_${new Date().toISOString().split('T')[0]}.json`;
      
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
    } catch (error) {
      console.error('Failed to export backup:', error);
    }
  };

  // Import full UPSC study records from parsed JSON
  const processImportText = (text: string) => {
    try {
      const parsed = JSON.parse(text);
      
      // Basic sanity checks for UPSCState matching keys
      if (!parsed.folders || !parsed.chapters || !parsed.settings) {
        throw new Error('JSON structure does not resemble valid CSEGuide study backups.');
      }

      onImportFullState(parsed);
      setImportStatus({ type: 'success', message: 'UPSC study records restored successfully! All chapters, logs, and Leitner flashcards loaded.' });
    } catch (error: any) {
      setImportStatus({ type: 'error', message: error?.message || 'Failed to parse JSON file.' });
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      processImportText(text);
    };
    reader.readAsText(file);
  };

  // Drag and Drop implementation for files
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    if (file.type !== 'application/json' && !file.name.endsWith('.json')) {
      setImportStatus({ type: 'error', message: 'Invalid file type. Please upload a .json backup file.' });
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      processImportText(text);
    };
    reader.readAsText(file);
  };

  return (
    <div id="settings_tab" className="space-y-6 text-left max-w-4xl mx-auto">
      
      {/* Title */}
      <div className="border-b border-brand-navy/15 pb-4">
        <h2 className="font-display text-xl font-bold text-brand-navy">Workspace Settings</h2>
        <p className="text-xs text-brand-slate font-serif">Configure parameters, test secure cloud endpoints, and backup local UPSC archives.</p>
      </div>

      {/* Gemini AI Settings Section */}
      <div className="bg-white p-5 rounded-lg border border-brand-navy/10 shadow-sm space-y-4">
        <div className="flex items-center gap-2 border-b border-brand-navy/5 pb-2">
          <Key className="w-5 h-5 text-brand-gold" />
          <h3 className="font-display font-bold text-sm uppercase text-brand-navy">Gemini Copilot API Configuration</h3>
        </div>

        <p className="text-xs text-brand-slate font-serif leading-relaxed">
          CSEGuide calls your selected <strong>Gemini model</strong> directly from your browser to power interactive explanations, Mains answers, and MCQs. No studies or secrets are transmitted through intermediary servers.
        </p>

        <div className="space-y-3 pt-2">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-brand-navy mb-1.5">Paste Google Gemini API Key</label>
            <div className="flex gap-2">
              <input
                type="password"
                className="flex-1 bg-brand-cream border border-brand-navy/25 rounded p-2.5 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-brand-gold text-brand-navy"
                placeholder="AIzaSy..."
                value={apiKey}
                onChange={(e) => {
                  setApiKey(e.target.value);
                  setTestResult(null);
                }}
              />
              <button
                onClick={handleSaveKey}
                disabled={!apiKey}
                className="bg-brand-navy hover:bg-brand-slate text-brand-gold border border-brand-gold px-4 py-2 rounded text-xs font-bold uppercase tracking-wider transition disabled:opacity-50"
              >
                Save Key
              </button>
            </div>
          </div>

          <div className="pt-1">
            <label className="block text-xs font-bold uppercase tracking-wider text-brand-navy mb-1.5">Select Gemini Model Version (Free Tiers Only)</label>
            <select
              className="w-full bg-brand-cream border border-brand-navy/25 rounded p-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-brand-gold text-brand-navy cursor-pointer font-medium"
              value={selectedModel}
              onChange={(e) => {
                const model = e.target.value;
                setSelectedModel(model);
                setStoredGeminiModel(model);
                setTestResult(null);
              }}
            >
              <option value="gemini-2.5-flash">Gemini 2.5 Flash (Default — Recommended, fast & free)</option>
              <option value="gemini-2.5-flash-lite">Gemini 2.5 Flash Lite (Lite — Ultra-low latency & free)</option>
              <option value="gemini-1.5-flash">Gemini 1.5 Flash (Reliable — Multimodal & free)</option>
              <option value="gemini-1.5-flash-8b">Gemini 1.5 Flash 8B (Lightweight — High efficiency & free)</option>
            </select>
            <p className="text-[10px] text-brand-slate font-serif mt-1 leading-relaxed">
              These options are restricted exclusively to <strong>Gemini Free API Tiers</strong>. They offer high-speed, zero-cost responses directly from your browser.
            </p>
          </div>

          <div className="flex items-center justify-between flex-wrap gap-2 pt-2">
            <div className="flex items-center gap-1 text-xs text-brand-slate font-semibold">
              <ShieldCheck className="w-4 h-4 text-brand-teal" />
              <span>Keys remain locally isolated inside this device's localStorage.</span>
            </div>

            <button
              onClick={handleTestKey}
              disabled={!apiKey || testing}
              className="bg-brand-cream hover:bg-brand-navy hover:text-white text-brand-navy border border-brand-navy/20 px-3.5 py-1.5 rounded text-xs font-bold uppercase tracking-wider transition duration-150 disabled:opacity-50 flex items-center gap-1"
            >
              {testing ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Testing...
                </>
              ) : (
                <>
                  <Sparkles className="w-3 h-3 text-brand-gold" />
                  Test Connectivity
                </>
              )}
            </button>
          </div>

          {testResult === 'success' && (
            <div className="p-3 bg-green-50 border border-green-400 text-green-900 text-xs rounded flex items-center gap-2 animate-fade-in">
              <Check className="w-4 h-4 text-green-600 shrink-0" />
              <span>API key confirmed working. Gemini model {selectedModel} is fully operational!</span>
            </div>
          )}

          {testResult === 'failed' && (
            <div className="p-3 bg-red-50 border border-red-400 text-red-900 text-xs rounded animate-fade-in">
              <span>Authentication failed. Please verify that your Gemini API key is valid and supports the selected model ({selectedModel}).</span>
            </div>
          )}
        </div>
      </div>

      {/* Backup and Restore Section */}
      <div className="bg-white p-5 rounded-lg border border-brand-navy/10 shadow-sm space-y-4">
        <div className="flex items-center gap-2 border-b border-brand-navy/5 pb-2">
          <Download className="w-5 h-5 text-brand-teal" />
          <h3 className="font-display font-bold text-sm uppercase text-brand-navy">UPSC Study Records Backup Console</h3>
        </div>

        <p className="text-xs text-brand-slate font-serif leading-relaxed">
          Because this application stores all custom materials, Leitner memory schedules, bookmarks, and study logs directly in your browser's local cache (localStorage), clearing cookies or switching browsers could wipe your progress. Export systematic backups regularly.
        </p>

        {importStatus && (
          <div className={`p-3 text-xs rounded border animate-fade-in ${
            importStatus.type === 'success' ? 'bg-green-50 border-green-400 text-green-900' : 'bg-red-50 border-red-400 text-red-950'
          }`}>
            {importStatus.message}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
          
          {/* Export card */}
          <div className="bg-brand-cream p-4 rounded border border-brand-navy/5 flex flex-col justify-between">
            <div className="space-y-1">
              <span className="text-[9px] uppercase font-bold text-gray-400">Export Study Profile</span>
              <h4 className="text-xs font-bold text-brand-navy">Download UPSC Study Archive (.json)</h4>
              <p className="text-[11px] text-brand-slate font-serif leading-relaxed">
                Save a single, comprehensive file containing your custom folders, added chapters, due memory flashcards, and reading hour logs.
              </p>
            </div>
            <button
              onClick={handleExportBackup}
              className="mt-4 bg-brand-navy hover:bg-brand-slate text-brand-gold border border-brand-gold py-2 rounded text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition shadow-xs"
            >
              <Download className="w-4 h-4" />
              Download Backup File
            </button>
          </div>

          {/* Import card */}
          <div 
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`p-4 rounded border flex flex-col justify-between transition-all duration-150 ${
              dragOver 
                ? 'bg-amber-50 border-brand-gold border-dashed scale-[1.01]' 
                : 'bg-brand-cream border-brand-navy/5'
            }`}
          >
            <div className="space-y-1">
              <span className="text-[9px] uppercase font-bold text-gray-400">Import Study Profile</span>
              <h4 className="text-xs font-bold text-brand-navy">Upload/Drop UPSC Study Archive</h4>
              <p className="text-[11px] text-brand-slate font-serif leading-relaxed">
                Drag and drop your exported <strong className="font-mono">.json</strong> file here, or click manually to restore your entire study progress.
              </p>
            </div>

            <div className="mt-4 flex gap-2">
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept=".json,application/json"
                onChange={handleFileUpload}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full bg-white hover:bg-brand-cream text-brand-navy border border-brand-navy py-2 rounded text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition"
              >
                <Upload className="w-4 h-4 text-brand-gold" />
                Select Backup File
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* Restore Demo Defaults */}
      <div className="bg-red-50/40 p-5 rounded-lg border border-red-200 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <h4 className="text-xs font-bold text-red-900 uppercase tracking-wide flex items-center gap-1.5">
            <Trash2 className="w-4 h-4 text-red-700" />
            Reset Application and Clear Data
          </h4>
          <p className="text-[11px] text-brand-slate font-serif leading-relaxed max-w-xl">
            This action will wipe your current database (localStorage), clear all bookmarks, logs, added custom chapters, and flashcards, and restore the default UPSC Indian Polity, Spectrum, and Economics chapters.
          </p>
        </div>
        <button
          onClick={() => {
            if (confirm('Are you absolutely sure you want to clear all custom study records, Leitner schedules, and progress logs? This is irreversible.')) {
              onResetToDemo();
              setApiKey('');
              setTestResult(null);
              setImportStatus({ type: 'success', message: 'CSEGuide database reset to factory demo state.' });
            }
          }}
          className="bg-red-700 hover:bg-red-800 text-white border border-transparent px-4 py-2 rounded text-xs font-bold uppercase tracking-wider transition shrink-0"
        >
          Reset to Factory Demo
        </button>
      </div>

    </div>
  );
}
