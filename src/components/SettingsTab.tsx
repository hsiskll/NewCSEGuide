import React, { useState, useRef } from 'react';
import { 
  Key, ShieldCheck, Download, Upload, Trash2, Check,
  AlertCircle, RefreshCw, FileText, Sparkles, Palette
} from 'lucide-react';
import { getStoredGeminiKey, setStoredGeminiKey, testGeminiConnection, getStoredGeminiModel, setStoredGeminiModel } from '../utils/gemini';
import { UPSCState } from '../types';

interface SettingsTabProps {
  state: UPSCState;
  onImportFullState: (newState: UPSCState) => void;
  onResetToDemo: () => void;
  onUpdateKey: (key: string) => void;
  universalFont: string;
  onUpdateUniversalFont: (font: string) => void;
  customSecondaryColor?: string;
  onUpdateCustomSecondaryColor?: (color: string) => void;
}

const STANDARDS_FONTS = [
  { name: 'Inter (Sans-Serif - Default)', value: 'Inter, ui-sans-serif, system-ui, sans-serif' },
  { name: 'System Sans-Serif', value: 'ui-sans-serif, system-ui, sans-serif' },
  { name: 'Playfair Display (Elegant Serif)', value: '"Playfair Display", serif' },
  { name: 'Georgia (Classic Serif)', value: 'Georgia, serif' },
  { name: 'EB Garamond (Elegant Book Serif)', value: '"EB Garamond", serif' },
  { name: 'Crimson Pro (Warm Academic Serif)', value: '"Crimson Pro", serif' },
  { name: 'Times New Roman (Academic Serif)', value: '"Times New Roman", Times, serif' },
  { name: 'Space Grotesk (Modern Tech Sans)', value: '"Space Grotesk", sans-serif' },
  { name: 'Outfit (Polished Geometric)', value: '"Outfit", sans-serif' },
  { name: 'JetBrains Mono (Developer Monospace)', value: '"JetBrains Mono", monospace' },
  { name: 'Fira Code (Modern Monospace)', value: '"Fira Code", monospace' },
  { name: 'Courier New (Classic Monospace)', value: '"Courier New", Courier, monospace' },
  { name: 'Arial (Neutral Sans)', value: 'Arial, Helvetica, sans-serif' }
];

export default function SettingsTab({
  state,
  onImportFullState,
  onResetToDemo,
  onUpdateKey,
  universalFont,
  onUpdateUniversalFont,
  customSecondaryColor = '',
  onUpdateCustomSecondaryColor
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

      {/* Universal Font Styling Option */}
      <div className="bg-white p-5 rounded-lg border border-brand-navy/10 shadow-sm space-y-4">
        <div className="flex items-center gap-2 border-b border-brand-navy/5 pb-2">
          <FileText className="w-5 h-5 text-brand-gold" />
          <h3 className="font-display font-bold text-sm uppercase text-brand-navy">Universal Font Styling</h3>
        </div>

        <p className="text-xs text-brand-slate font-serif leading-relaxed">
          Universally change the font family across the entire application workspace. Select your preferred reading typography to reduce eye strain during extended UPSC study sessions.
        </p>

        <div className="space-y-3 pt-2">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-brand-navy mb-1.5">Select App Typography</label>
            <select
              className="w-full bg-brand-cream border border-brand-navy/25 rounded p-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-brand-gold text-brand-navy cursor-pointer font-medium"
              value={universalFont}
              onChange={(e) => onUpdateUniversalFont(e.target.value)}
            >
              {STANDARDS_FONTS.map(font => (
                <option key={font.value} value={font.value}>{font.name}</option>
              ))}
            </select>
          </div>
          <div className="p-3 bg-brand-cream/50 rounded-xl border border-brand-navy/5 mt-2">
            <span className="text-[10px] uppercase font-mono tracking-wider text-brand-slate font-bold block mb-1">Live Typography Preview:</span>
            <p style={{ fontFamily: universalFont }} className="text-sm leading-relaxed text-brand-navy">
              "The Constitution of India is the supreme law of India. The document lays down the framework that demarcates fundamental political code, structure, procedures, powers, and duties of government institutions."
            </p>
          </div>
        </div>
      </div>

      {/* Custom Secondary / Accent Color Option */}
      <div className="bg-white p-5 rounded-lg border border-brand-navy/10 shadow-sm space-y-5 animate-fade-in">
        <div className="flex items-center gap-2 border-b border-brand-navy/5 pb-2">
          <Palette className="w-5 h-5 text-[var(--gd)]" />
          <h3 className="font-display font-bold text-sm uppercase text-brand-navy">Custom Secondary Accent Color</h3>
        </div>

        <p className="text-xs text-brand-slate font-serif leading-relaxed">
          Customize the secondary highlight/accent color (<strong className="font-mono">var(--gd)</strong>) applied to headers, buttons, current active items, and dashboard charts. 
        </p>

        <div className="space-y-4 pt-1">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-brand-navy mb-2">Choose Accent Preset</label>
            <div className="flex flex-wrap gap-2">
              {[
                { name: 'Historical Maroon', value: '#8C2222', desc: 'Old Newspaper Default' },
                { name: 'Imperial Blue', value: '#1E3A8A', desc: 'Pristine White Default' },
                { name: 'Aura Violet', value: '#9F7AEA', desc: 'Obsidian Default' },
                { name: 'Syllabus Teal', value: '#14B8A6', desc: 'Calming Study' },
                { name: 'Saffron Gold', value: '#C59B27', desc: 'Classic Scholar' },
                { name: 'Amber Glow', value: '#D97706', desc: 'High Visibility' },
                { name: 'Emerald Focus', value: '#10B981', desc: 'Balanced Green' },
                { name: 'Rose Petal', value: '#EC4899', desc: 'Bright Pastel' }
              ].map(preset => {
                const isSelected = customSecondaryColor === preset.value;
                return (
                  <button
                    key={preset.value}
                    onClick={() => onUpdateCustomSecondaryColor?.(preset.value)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition text-xs font-medium cursor-pointer ${
                      isSelected 
                        ? 'bg-[var(--gd)] text-[var(--bg)] border-transparent scale-105 shadow-md font-bold'
                        : 'bg-brand-cream hover:bg-gray-50 border-brand-navy/10 text-brand-navy'
                    }`}
                  >
                    <span 
                      className="w-3.5 h-3.5 rounded-full border border-black/10 shrink-0" 
                      style={{ backgroundColor: preset.value }}
                    />
                    <span>{preset.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Continuous Color Spectrum Picker */}
          <div className="p-4 rounded-xl border border-brand-navy/5 bg-brand-cream/30 space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-brand-navy flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--gd)] animate-pulse" />
              Continuous Spectrum Tuner
            </h4>

            {(() => {
              // Parse current color or fallback to a default royal blue
              const currHex = customSecondaryColor || '#1E3A8A';
              
              // Helper to parse hex to HSL
              const hexToHsl = (hexStr: string) => {
                let hex = hexStr.replace('#', '');
                if (hex.length === 3) {
                  hex = hex.split('').map(c => c + c).join('');
                }
                const r = parseInt(hex.substring(0, 2), 16) / 255 || 0;
                const g = parseInt(hex.substring(2, 4), 16) / 255 || 0;
                const b = parseInt(hex.substring(4, 6), 16) / 255 || 0;

                const max = Math.max(r, g, b);
                const min = Math.min(r, g, b);
                let h = 0;
                let s = 0;
                const l = (max + min) / 2;

                if (max !== min) {
                  const d = max - min;
                  s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
                  switch (max) {
                    case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                    case g: h = (b - r) / d + 2; break;
                    case b: h = (r - g) / d + 4; break;
                  }
                  h /= 6;
                }

                return {
                  h: Math.round(h * 360),
                  s: Math.round(s * 100),
                  l: Math.round(l * 100)
                };
              };

              // Helper to convert HSL to Hex
              const hslToHex = (h: number, s: number, l: number): string => {
                const hDecimal = h / 360;
                const sDecimal = s / 100;
                const lDecimal = l / 100;
                let r = 0, g = 0, b = 0;
                if (sDecimal === 0) {
                  r = g = b = lDecimal;
                } else {
                  const hue2rgb = (p: number, q: number, t: number) => {
                    if (t < 0) t += 1;
                    if (t > 1) t -= 1;
                    if (t < 1/6) return p + (q - p) * 6 * t;
                    if (t < 1/2) return q;
                    if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
                    return p;
                  };
                  const q = lDecimal < 0.5 ? lDecimal * (1 + sDecimal) : lDecimal + sDecimal - lDecimal * sDecimal;
                  const p = 2 * lDecimal - q;
                  r = hue2rgb(p, q, hDecimal + 1/3);
                  g = hue2rgb(p, q, hDecimal);
                  b = hue2rgb(p, q, hDecimal - 1/3);
                }
                const toHex = (x: number) => {
                  const hex = Math.round(x * 255).toString(16);
                  return hex.length === 1 ? '0' + hex : hex;
                };
                return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
              };

              const hsl = hexToHsl(currHex);

              const handleHslChange = (newH: number, newS: number, newL: number) => {
                const hexResult = hslToHex(newH, newS, newL);
                onUpdateCustomSecondaryColor?.(hexResult);
              };

              return (
                <div className="space-y-4">
                  {/* Spectrum Track Selector */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[11px] font-bold text-brand-navy">
                      <span>Hue Spectrum</span>
                      <span className="font-mono text-[var(--gd)] font-bold">{hsl.h}°</span>
                    </div>
                    <div className="relative flex items-center h-5">
                      <div 
                        className="absolute inset-x-0 h-2.5 rounded-full shadow-inner" 
                        style={{
                          background: 'linear-gradient(to right, #ff0000 0%, #ffff00 17%, #00ff00 33%, #00ffff 50%, #0000ff 67%, #ff00ff 83%, #ff0000 100%)'
                        }}
                      />
                      <input
                        type="range"
                        min="0"
                        max="360"
                        value={hsl.h}
                        onChange={(e) => handleHslChange(parseInt(e.target.value), hsl.s, hsl.l)}
                        className="w-full h-full appearance-none bg-transparent cursor-pointer relative z-10 accent-white [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-brand-navy/60 [&::-webkit-slider-thumb]:shadow-md"
                      />
                    </div>
                  </div>

                  {/* Saturation Slider */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[11px] font-bold text-brand-navy">
                      <span>Color Intensity / Saturation</span>
                      <span className="font-mono">{hsl.s}%</span>
                    </div>
                    <div className="relative flex items-center h-5">
                      <div 
                        className="absolute inset-x-0 h-2.5 rounded-full shadow-inner" 
                        style={{
                          background: `linear-gradient(to right, ${hslToHex(hsl.h, 0, 50)} 0%, ${hslToHex(hsl.h, 100, 50)} 100%)`
                        }}
                      />
                      <input
                        type="range"
                        min="10"
                        max="100"
                        value={hsl.s}
                        onChange={(e) => handleHslChange(hsl.h, parseInt(e.target.value), hsl.l)}
                        className="w-full h-full appearance-none bg-transparent cursor-pointer relative z-10 accent-white [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-brand-navy/60 [&::-webkit-slider-thumb]:shadow-md"
                      />
                    </div>
                  </div>

                  {/* Lightness Slider */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[11px] font-bold text-brand-navy">
                      <span>Brightness / Lightness</span>
                      <span className="font-mono">{hsl.l}%</span>
                    </div>
                    <div className="relative flex items-center h-5">
                      <div 
                        className="absolute inset-x-0 h-2.5 rounded-full shadow-inner" 
                        style={{
                          background: `linear-gradient(to right, #000000 0%, ${hslToHex(hsl.h, hsl.s, 50)} 50%, #ffffff 100%)`
                        }}
                      />
                      <input
                        type="range"
                        min="15"
                        max="85"
                        value={hsl.l}
                        onChange={(e) => handleHslChange(hsl.h, hsl.s, parseInt(e.target.value))}
                        className="w-full h-full appearance-none bg-transparent cursor-pointer relative z-10 accent-white [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-brand-navy/60 [&::-webkit-slider-thumb]:shadow-md"
                      />
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-4 pt-2 border-t border-brand-navy/5">
            <div className="flex items-center gap-2.5">
              <label className="text-xs font-bold uppercase tracking-wider text-brand-navy shrink-0">Native Color Picker:</label>
              <input
                type="color"
                value={customSecondaryColor || '#1E3A8A'}
                onChange={(e) => onUpdateCustomSecondaryColor?.(e.target.value)}
                className="w-10 h-8 rounded border border-brand-navy/10 cursor-pointer p-0 bg-transparent"
              />
              <span className="text-xs font-mono font-bold text-brand-navy">{customSecondaryColor || 'Theme Default'}</span>
            </div>

            {customSecondaryColor && (
              <button
                onClick={() => onUpdateCustomSecondaryColor?.('')}
                className="text-xs font-bold text-red-600 hover:text-red-800 transition py-1 px-2.5 rounded hover:bg-red-50 border border-transparent hover:border-red-100 cursor-pointer"
              >
                Reset to Theme Default Color
              </button>
            )}
          </div>
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
