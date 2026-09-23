import React, { useState, useEffect, useRef } from 'react';
import { 
  Video, 
  Camera,
  Upload, 
  Sparkles, 
  Copy, 
  Check, 
  TrendingUp, 
  AlertTriangle, 
  RefreshCw, 
  Layers, 
  Sliders, 
  Image as ImageIcon,
  BookOpen,
  FileVideo,
  Award,
  ChevronRight,
  Plus,
  ShieldCheck,
  Aperture,
  Sun,
  Maximize2,
  FileText
} from 'lucide-react';
import { 
  GenerationSettings, 
  GenerationResponse, 
  GeneratedPrompt, 
  MediaType, 
  BokehEffect, 
  LensProfile, 
  LightingPreference 
} from './types';

// Curated reference images for immediate testing across photo & video modalities
const SAMPLE_IMAGES = [
  {
    name: "Artisanal Pour-Over Coffee",
    category: "Culinary & Commercial",
    type: "image",
    url: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=600&q=80",
    mimeType: "image/jpeg",
  },
  {
    name: "Scandinavian Creative Studio",
    category: "Lifestyle & Workspace",
    type: "image",
    url: "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=600&q=80",
    mimeType: "image/jpeg",
  },
  {
    name: "Botanical Morning Dewdrops",
    category: "Nature & Macro Detail",
    type: "image",
    url: "https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?auto=format&fit=crop&w=600&q=80",
    mimeType: "image/jpeg",
  },
  {
    name: "Cyberpunk Neon Fluid Loop",
    category: "Abstract & Motion",
    type: "video",
    url: "https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&w=600&q=80",
    mimeType: "image/jpeg",
  },
  {
    name: "Golden Hour Ocean Drift",
    category: "Landscape & Ambient",
    type: "video",
    url: "https://images.unsplash.com/photo-1505118380757-91f5f5632de0?auto=format&fit=crop&w=600&q=80",
    mimeType: "image/jpeg",
  }
];

interface SavedSession {
  id: string;
  timestamp: string;
  settings: GenerationSettings;
  imagePreviewUrl: string;
  result: GenerationResponse;
}

export default function App() {
  const [image, setImage] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [result, setResult] = useState<GenerationResponse | null>(null);
  
  // Clipboard copy states
  const [copiedPromptId, setCopiedPromptId] = useState<number | null>(null);
  const [copiedKeywordsId, setCopiedKeywordsId] = useState<number | null>(null);
  const [copiedTitleId, setCopiedTitleId] = useState<number | null>(null);
  
  // App Stats
  const [tokensUsed, setTokensUsed] = useState<number>(14500);
  const [totalGenerated, setTotalGenerated] = useState<number>(12);
  const [approvalRate, setApprovalRate] = useState<number>(96);

  // Settings state
  const [settings, setSettings] = useState<GenerationSettings>({
    mediaType: 'image', // Default to Image Prompt Generator
    ratio: '3:2',
    cameraMovement: 'dynamic',
    aiAutoOptics: true, // Default to AI Auto Mode enabled for best automatic optical selection
    bokehEffect: 'auto',
    lensProfile: 'auto',
    lightingPreference: 'auto',
    includeText: false,
    copySpace: true,
    copySpacePosition: 'right',
    variationMode: 'variations',
    numPrompts: 2,
    allowPeople: false,
    singleSceneOnly: true,
    contentTheme: 'any',
    subjectHint: ''
  });

  // History state
  const [history, setHistory] = useState<SavedSession[]>([]);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load history & stats on mount
  useEffect(() => {
    try {
      const savedHistory = localStorage.getItem('vidstock_sessions');
      if (savedHistory) {
        setHistory(JSON.parse(savedHistory));
      }
      const savedTokens = localStorage.getItem('vidstock_tokens');
      if (savedTokens) setTokensUsed(Number(savedTokens));
      
      const savedCount = localStorage.getItem('vidstock_count');
      if (savedCount) setTotalGenerated(Number(savedCount));
    } catch (e) {
      console.error("Failed to load local storage data", e);
    }
  }, []);

  // Save history & stats helper
  const saveSession = (newSession: SavedSession) => {
    const updatedHistory = [newSession, ...history].slice(0, 20); // Keep last 20
    setHistory(updatedHistory);
    localStorage.setItem('vidstock_sessions', JSON.stringify(updatedHistory));

    const newTokens = tokensUsed + Math.floor(Math.random() * 800) + 1200;
    const newCount = totalGenerated + settings.numPrompts;
    setTokensUsed(newTokens);
    setTotalGenerated(newCount);
    localStorage.setItem('vidstock_tokens', String(newTokens));
    localStorage.setItem('vidstock_count', String(newCount));
  };

  const clearHistory = () => {
    if (!showClearConfirm) {
      setShowClearConfirm(true);
      setTimeout(() => {
        setShowClearConfirm(false);
      }, 4000);
    } else {
      setHistory([]);
      localStorage.removeItem('vidstock_sessions');
      setShowClearConfirm(false);
    }
  };

  // Convert File to Base64
  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setErrorMessage("Please upload a valid image file (PNG, JPG, WEBP).");
      return;
    }
    setErrorMessage(null);
    setMimeType(file.type);

    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result && typeof e.target.result === 'string') {
        setImage(e.target.result);
        setImagePreviewUrl(e.target.result);
      }
    };
    reader.readAsDataURL(file);
  };

  // Handle drop events
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  // Select sample image
  const selectSample = async (sample: typeof SAMPLE_IMAGES[0]) => {
    setErrorMessage(null);
    setGenerationStep("Loading sample image...");
    try {
      // Automatically switch mode if sample has preferred type
      if (sample.type && sample.type !== settings.mediaType) {
        setSettings(prev => ({
          ...prev,
          mediaType: sample.type as MediaType,
          ratio: sample.type === 'video' ? '16:9' : '3:2'
        }));
      }

      const response = await fetch(sample.url);
      const blob = await response.blob();
      setMimeType(sample.mimeType);

      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          setImage(reader.result);
          setImagePreviewUrl(reader.result);
        }
      };
      reader.readAsDataURL(blob);
    } catch (e) {
      setErrorMessage("Failed to fetch sample image. Please try uploading your own.");
    } finally {
      setGenerationStep("");
    }
  };

  // Switch Media Type
  const handleMediaTypeChange = (newType: MediaType) => {
    setSettings(prev => ({
      ...prev,
      mediaType: newType,
      ratio: newType === 'image' ? (prev.ratio === '16:9' ? '3:2' : prev.ratio) : (prev.ratio === '3:2' ? '16:9' : prev.ratio)
    }));
  };

  // Trigger prompt generation
  const generatePrompts = async () => {
    if (!image) {
      setErrorMessage("Please upload or select a reference image first.");
      return;
    }

    setIsGenerating(true);
    setErrorMessage(null);
    setResult(null);

    const isImageMode = settings.mediaType === 'image';
    const steps = isImageMode ? [
      "Analyzing reference composition & subject textures...",
      "Simulating optical depth of field & lens characteristics...",
      "Enforcing strict Adobe Stock real-life anatomy rules...",
      "Injecting mandatory 'NO TEXT / NO LOGOS' safety parameters...",
      "Generating 15 high-converting SEO stock keywords...",
      "Engineering professional submission titles & tags..."
    ] : [
      "Uploading reference file context...",
      "Extracting composition & mood vectors...",
      "Analyzing lighting & shadow values...",
      "Structuring continuous single-scene camera flow...",
      "Sanitizing keywords against copyright IP restrictions...",
      "Drafting seamless-loop motion parameters..."
    ];

    let stepIndex = 0;
    setGenerationStep(steps[0]);

    const stepInterval = setInterval(() => {
      stepIndex++;
      if (stepIndex < steps.length) {
        setGenerationStep(steps[stepIndex]);
      }
    }, 1400);

    try {
      const response = await fetch("/api/generate-prompts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          image: image,
          mimeType: mimeType,
          settings: settings
        })
      });

      clearInterval(stepInterval);

      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const responseText = await response.text().catch(() => "");
        console.error("Non-JSON response received:", responseText);
        throw new Error(`The server returned an unexpected response format. Status: ${response.status}`);
      }

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `HTTP error! status: ${response.status}`);
      }

      const data: GenerationResponse = await response.json();
      setResult(data);

      // Save to localStorage history
      const newSession: SavedSession = {
        id: Date.now().toString(),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        settings: { ...settings },
        imagePreviewUrl: imagePreviewUrl || "",
        result: data
      };
      saveSession(newSession);

    } catch (error: any) {
      clearInterval(stepInterval);
      console.error(error);
      setErrorMessage(error.message || "An unexpected error occurred while generating prompts.");
    } finally {
      setIsGenerating(false);
      setGenerationStep("");
    }
  };

  // Helper to copy text to clipboard
  const copyToClipboard = (text: string, id: number, type: 'prompt' | 'keywords' | 'title') => {
    navigator.clipboard.writeText(text);
    if (type === 'prompt') {
      setCopiedPromptId(id);
      setTimeout(() => setCopiedPromptId(null), 2000);
    } else if (type === 'keywords') {
      setCopiedKeywordsId(id);
      setTimeout(() => setCopiedKeywordsId(null), 2000);
    } else if (type === 'title') {
      setCopiedTitleId(id);
      setTimeout(() => setCopiedTitleId(null), 2000);
    }
  };

  // Restore history session
  const restoreSession = (session: SavedSession) => {
    setImage(session.imagePreviewUrl);
    setImagePreviewUrl(session.imagePreviewUrl);
    setSettings({
      mediaType: 'image',
      cameraMovement: 'dynamic',
      bokehEffect: 'creamy_bokeh',
      lensProfile: '85mm_portrait',
      lightingPreference: 'auto',
      ...session.settings
    });
    setResult(session.result);
    setErrorMessage(null);
  };

  const startNewSession = () => {
    setImage(null);
    setMimeType(null);
    setImagePreviewUrl(null);
    setResult(null);
    setErrorMessage(null);
  };

  const isImageMode = settings.mediaType === 'image';

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 text-slate-900 font-sans" id="app_root">
      
      {/* SIDEBAR */}
      <aside className="w-84 bg-white border-r border-slate-200 flex flex-col shrink-0 overflow-y-auto" id="sidebar_container">
        
        {/* LOGO & BRAND HEADER */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between" id="sidebar_header">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-md transition-colors duration-300 ${
              isImageMode ? 'bg-indigo-600 shadow-indigo-200' : 'bg-blue-600 shadow-blue-200'
            }`} id="logo_badge">
              {isImageMode ? (
                <Camera className="w-5 h-5 stroke-[2.5]" />
              ) : (
                <Video className="w-5 h-5 stroke-[2.5]" />
              )}
            </div>
            <div>
              <h1 className="text-base font-extrabold text-slate-900 tracking-tight" id="logo_title">
                {isImageMode ? 'PhotoStock Agent' : 'VidStock Agent'}
              </h1>
              <span className="text-[10px] text-indigo-600 font-bold uppercase tracking-wider block">
                Adobe Stock Co-Pilot
              </span>
            </div>
          </div>
          <button 
            onClick={startNewSession}
            title="New Generation Session"
            className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 transition-all duration-200"
            id="btn_new_session_top"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>

        {/* PRIMARY GENERATOR MODE SELECTOR (PHOTO vs VIDEO) */}
        <div className="p-4 bg-slate-50/80 border-b border-slate-200/80" id="generator_mode_tabs">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
            Generator Mode
          </label>
          <div className="grid grid-cols-2 gap-1.5 bg-slate-200/70 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => handleMediaTypeChange('image')}
              className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                isImageMode 
                  ? 'bg-white text-indigo-600 shadow-sm' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              id="tab_mode_image"
            >
              <Camera className="w-4 h-4" />
              <span>Image Prompts</span>
            </button>

            <button
              type="button"
              onClick={() => handleMediaTypeChange('video')}
              className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                !isImageMode 
                  ? 'bg-white text-blue-600 shadow-sm' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              id="tab_mode_video"
            >
              <Video className="w-4 h-4" />
              <span>Video Prompts</span>
            </button>
          </div>
        </div>

        {/* CONTROLS */}
        <div className="p-5 flex-grow flex flex-col gap-5" id="controls_wrapper">
          
          <div>
            <div className="flex items-center justify-between mb-3 text-xs font-bold text-slate-400 uppercase tracking-wider" id="section_config_title">
              <span className="flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5" />
                <span>{isImageMode ? 'Photography Optics' : 'Video Motion Specs'}</span>
              </span>
              <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded ${
                isImageMode ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' : 'bg-blue-50 text-blue-700 border border-blue-100'
              }`}>
                {isImageMode ? 'Commercial Photo' : 'Stock Footage'}
              </span>
            </div>
            
            <div className="space-y-3.5" id="config_fields">
              
              {/* Optional Subject Field */}
              <div className="flex flex-col gap-1.5" id="control_subject_hint">
                <label className="text-xs font-semibold text-slate-700 flex justify-between">
                  <span>Subject Description</span>
                  <span className="text-[10px] text-indigo-600 font-bold uppercase">Optional / AI Match</span>
                </label>
                <input
                  type="text"
                  value={settings.subjectHint || ''}
                  onChange={(e) => setSettings({ ...settings, subjectHint: e.target.value })}
                  placeholder={isImageMode ? "e.g., artisan sourdough bread with flour dust" : "e.g., crispy golden popcorn overflowing"}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  id="input_subject_hint"
                />
              </div>

              {/* IMAGE-SPECIFIC: AI AUTO OPTICS MASTER TOGGLE */}
              {isImageMode && (
                <div className="bg-gradient-to-r from-indigo-50 via-purple-50/50 to-indigo-50 border border-indigo-200/70 rounded-xl p-3 shadow-2xs" id="control_ai_auto_optics">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-2xs">
                        <Sparkles className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-indigo-950">AI Auto Mode</span>
                          <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.2 bg-indigo-600 text-white rounded-full">
                            Analytical AI
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-500 font-medium block">
                          Auto-selects 6 optics options from image
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        const nextVal = !settings.aiAutoOptics;
                        setSettings({
                          ...settings,
                          aiAutoOptics: nextVal,
                          bokehEffect: nextVal ? 'auto' : 'creamy_bokeh',
                          lensProfile: nextVal ? 'auto' : '85mm_portrait',
                          lightingPreference: nextVal ? 'auto' : settings.lightingPreference
                        });
                      }}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        settings.aiAutoOptics ? 'bg-indigo-600' : 'bg-slate-300'
                      }`}
                      id="btn_toggle_ai_auto_optics"
                      title={settings.aiAutoOptics ? "AI Auto Mode Active" : "Enable AI Auto Mode"}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                          settings.aiAutoOptics ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {settings.aiAutoOptics && (
                    <div className="mt-2.5 pt-2 border-t border-indigo-100/80 flex items-start gap-1.5 text-[10.5px] text-indigo-900 leading-tight">
                      <Sparkles className="w-3 h-3 text-indigo-600 shrink-0 mt-0.5" />
                      <span>The analytical AI will evaluate the uploaded reference image to auto-assign the most fitting Bokeh (f/1.4, f/2.8, Petzval, f/8, Panning, Macro) and Lens gear (85mm, 50mm, 35mm, 100mm Macro, 24mm, Hasselblad).</span>
                    </div>
                  )}
                </div>
              )}

              {/* IMAGE-SPECIFIC: BOKEH & BLURRED EFFECT */}
              {isImageMode && (
                <div className="flex flex-col gap-1.5" id="control_bokeh_effect">
                  <label className="text-xs font-semibold text-slate-700 flex justify-between items-center">
                    <span className="flex items-center gap-1">
                      <Aperture className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Bokeh & Blur Effect</span>
                    </span>
                    {settings.bokehEffect === 'auto' ? (
                      <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100">
                        AI Auto Selected
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-400">Manual Selection</span>
                    )}
                  </label>
                  <select 
                    value={settings.bokehEffect || 'auto'} 
                    onChange={(e) => {
                      const val = e.target.value as BokehEffect;
                      setSettings({ 
                        ...settings, 
                        bokehEffect: val,
                        aiAutoOptics: val === 'auto' && settings.lensProfile === 'auto'
                      });
                    }}
                    className={`w-full border rounded-lg px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all ${
                      settings.bokehEffect === 'auto'
                        ? 'bg-indigo-50/50 border-indigo-300 text-indigo-950 font-semibold'
                        : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                    id="select_bokeh_effect"
                  >
                    <option value="auto">✨ AI Auto Mode (Analytical AI Detects Depth)</option>
                    <option value="creamy_bokeh">Creamy Bokeh (f/1.4 - Soft circular background orbs)</option>
                    <option value="soft_blur">Soft Blur (f/2.8 - Gentle subject isolation)</option>
                    <option value="cinematic_swirl">Vintage Swirly Bokeh (Petzval optic character)</option>
                    <option value="deep_sharp">Deep Sharp Focus (f/8.0 - Edge-to-edge crisp detail)</option>
                    <option value="motion_blur">Motion & Panning Blur (Dynamic shutter streak)</option>
                    <option value="macro_dof">Macro Shallow Focus (100mm 1:1 tactile textures)</option>
                    <option value="natural_standard">Natural Standard (f/4.0 balanced human eye)</option>
                  </select>
                </div>
              )}

              {/* IMAGE-SPECIFIC: LENS PROFILE */}
              {isImageMode && (
                <div className="flex flex-col gap-1.5" id="control_lens_profile">
                  <label className="text-xs font-semibold text-slate-700 flex justify-between items-center">
                    <span className="flex items-center gap-1">
                      <Camera className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Lens & Sensor Profile</span>
                    </span>
                    {settings.lensProfile === 'auto' ? (
                      <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100">
                        AI Auto Matched
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-400">Manual Selection</span>
                    )}
                  </label>
                  <select 
                    value={settings.lensProfile || 'auto'} 
                    onChange={(e) => {
                      const val = e.target.value as LensProfile;
                      setSettings({ 
                        ...settings, 
                        lensProfile: val,
                        aiAutoOptics: val === 'auto' && settings.bokehEffect === 'auto'
                      });
                    }}
                    className={`w-full border rounded-lg px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all ${
                      settings.lensProfile === 'auto'
                        ? 'bg-indigo-50/50 border-indigo-300 text-indigo-950 font-semibold'
                        : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                    id="select_lens_profile"
                  >
                    <option value="auto">✨ AI Auto Mode (Analytical AI Matches Lens)</option>
                    <option value="85mm_portrait">85mm f/1.4 Prime (Portrait & subject separation)</option>
                    <option value="50mm_standard">50mm f/1.8 Standard Prime (Authentic documentary)</option>
                    <option value="35mm_street">35mm f/2.0 Environmental Wide (Storytelling context)</option>
                    <option value="100mm_macro">100mm f/2.8 Macro (Micro textures & culinary)</option>
                    <option value="24mm_wide">24mm f/2.8 Wide (Architectural & landscape)</option>
                    <option value="medium_format">100MP Medium Format Hasselblad (Ultra studio)</option>
                  </select>
                </div>
              )}

              {/* IMAGE-SPECIFIC: LIGHTING PREFERENCE */}
              {isImageMode && (
                <div className="flex flex-col gap-1.5" id="control_lighting_pref">
                  <label className="text-xs font-semibold text-slate-700 flex justify-between items-center">
                    <span className="flex items-center gap-1">
                      <Sun className="w-3.5 h-3.5 text-amber-500" />
                      <span>Lighting Style</span>
                    </span>
                    <span className="text-[10px] text-slate-400">Commercial Tone</span>
                  </label>
                  <select 
                    value={settings.lightingPreference || 'auto'} 
                    onChange={(e) => setSettings({ ...settings, lightingPreference: e.target.value as LightingPreference })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                    id="select_lighting_pref"
                  >
                    <option value="auto">✨ Auto (Extract and harmonize from reference)</option>
                    <option value="natural_golden">Natural Golden Hour / Warm Sunlight</option>
                    <option value="studio_softbox">Studio Softbox (Diffuse Commercial Bounce)</option>
                    <option value="high_key">Clean High-Key Commercial (Bright & Crisp)</option>
                    <option value="chiaroscuro">Moody Dramatic Rim & Side Lighting</option>
                    <option value="diffused_daylight">Soft Diffused Window / Overcast Light</option>
                    <option value="crisp_editorial">Crisp Editorial Flash / High Fashion</option>
                  </select>
                </div>
              )}

              {/* VIDEO-SPECIFIC: CAMERA MOVEMENT */}
              {!isImageMode && (
                <div className="flex flex-col gap-1.5" id="control_camera_movement">
                  <label className="text-xs font-semibold text-slate-700 flex justify-between">
                    <span>Camera Movement</span>
                    <span className="text-[10px] text-slate-400">Motion Style</span>
                  </label>
                  <select 
                    value={settings.cameraMovement || 'dynamic'} 
                    onChange={(e) => setSettings({ ...settings, cameraMovement: e.target.value as 'static' | 'dynamic' })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    id="select_camera_movement"
                  >
                    <option value="dynamic">Dynamic (Smooth panning, tracking & subtle drift)</option>
                    <option value="static">Static (Fixed / locked-off tripod, elements move)</option>
                  </select>
                </div>
              )}

              {/* Aspect Ratio Select */}
              <div className="flex flex-col gap-1.5" id="control_ratio">
                <label className="text-xs font-semibold text-slate-700 flex justify-between">
                  <span>Aspect Ratio</span>
                  <span className="text-[10px] text-slate-400">Adobe Stock Ratio</span>
                </label>
                <select 
                  value={settings.ratio} 
                  onChange={(e) => setSettings({ ...settings, ratio: e.target.value as any })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  id="select_ratio"
                >
                  {isImageMode ? (
                    <>
                      <option value="3:2">3:2 (Standard 35mm DSLR / Mirrorless)</option>
                      <option value="4:3">4:3 (Medium Format / Commercial)</option>
                      <option value="1:1">1:1 (Square Stock / Social Media)</option>
                      <option value="16:9">16:9 (Landscape Banner / Display)</option>
                      <option value="4:5">4:5 (Vertical Portrait / Instagram)</option>
                      <option value="2:3">2:3 (Vertical 35mm Portrait)</option>
                      <option value="9:16">9:16 (Vertical Story / Full Reel)</option>
                    </>
                  ) : (
                    <>
                      <option value="16:9">16:9 (Landscape - Web / YT / Broadcast)</option>
                      <option value="9:16">9:16 (Vertical - Reels / TikTok)</option>
                      <option value="1:1">1:1 (Square - Social Media)</option>
                      <option value="4:5">4:5 (Portrait Social Feed)</option>
                      <option value="2.39:1">2.39:1 (Cinematic Anamorphic)</option>
                    </>
                  )}
                </select>
              </div>

              {/* High-Demand Adobe Stock Content Themes */}
              <div className="flex flex-col gap-1.5" id="control_content_theme">
                <label className="text-xs font-semibold text-slate-700 flex justify-between">
                  <span>Adobe Stock Marketplace Theme</span>
                  <span className="text-[10px] text-indigo-600 font-bold">Trending</span>
                </label>
                <select 
                  value={settings.contentTheme || 'any'} 
                  onChange={(e) => setSettings({ ...settings, contentTheme: e.target.value as any })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  id="select_content_theme"
                >
                  <option value="any">Auto Theme (Detect from Ref)</option>
                  <option value="lifestyle">Lifestyle & Authentic People Moments</option>
                  <option value="culinary">Culinary, Gourmet & Food Still Life</option>
                  <option value="nature">Nature & Botanical Macro Details</option>
                  <option value="business">Business, Tech & Sustainable Enterprise</option>
                  <option value="health">Health & Clean Wellness</option>
                  <option value="abstract">Abstract Minimalist & Tactile Textures</option>
                  <option value="travel">Travel & Cultural Perspectives</option>
                </select>
              </div>

              {/* Variation Mode */}
              <div className="flex flex-col gap-1.5" id="control_variation_mode">
                <label className="text-xs font-semibold text-slate-700 flex justify-between">
                  <span>Variation Strategy</span>
                  <span className="text-[10px] text-slate-400">Creative Scope</span>
                </label>
                <select 
                  value={settings.variationMode} 
                  onChange={(e) => setSettings({ ...settings, variationMode: e.target.value as any })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  id="select_variation_mode"
                >
                  <option value="variations">Diverse Variations (Explore angles & lighting)</option>
                  <option value="similar">Close Series (Consistent batch for stock pack)</option>
                </select>
              </div>

              {/* Num Prompts */}
              <div className="flex flex-col gap-1.5" id="control_num_prompts">
                <label className="text-xs font-semibold text-slate-700">Prompts to Generate</label>
                <div className="grid grid-cols-5 gap-1.5" id="num_prompts_selector">
                  {[1, 2, 3, 4, 5].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setSettings({ ...settings, numPrompts: num })}
                      className={`py-1.5 rounded-md text-xs font-bold transition-all ${
                        settings.numPrompts === num 
                          ? (isImageMode ? 'bg-indigo-600 text-white shadow-sm' : 'bg-blue-600 text-white shadow-sm')
                          : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'
                      }`}
                      id={`btn_num_prompts_${num}`}
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>

              {/* MANDATORY ADOBE STOCK PHOTO RULES BADGE */}
              {isImageMode ? (
                <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-xl space-y-1.5 text-xs text-indigo-900" id="adobe_rules_notice">
                  <div className="flex items-center gap-1.5 font-bold text-indigo-950">
                    <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0" />
                    <span>Adobe Stock Quality Compliance</span>
                  </div>
                  <ul className="text-[11px] text-indigo-800/90 space-y-0.5 list-disc list-inside leading-relaxed">
                    <li><strong>Mandatory:</strong> "NO TEXT" directive enforced.</li>
                    <li><strong>Realism:</strong> Anatomically accurate humans/animals.</li>
                    <li><strong>Optics:</strong> True camera depth & texture fidelity.</li>
                  </ul>
                </div>
              ) : null}

              {/* Toggles */}
              <div className="space-y-3 pt-2 border-t border-slate-100" id="toggles_block">
                
                {/* Copy Space */}
                <div className="flex flex-col gap-1.5" id="toggle_copy_space_group">
                  <div className="flex items-center justify-between" id="toggle_copy_space">
                    <div className="flex flex-col">
                      <span className="text-xs font-semibold text-slate-700">Commercial Copy Space</span>
                      <span className="text-[10px] text-slate-400">Designated text overlay area</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSettings({ ...settings, copySpace: !settings.copySpace })}
                      className={`w-9 h-5 rounded-full p-0.5 transition-colors duration-200 focus:outline-none ${
                        settings.copySpace ? (isImageMode ? 'bg-indigo-600' : 'bg-blue-600') : 'bg-slate-200'
                      }`}
                      id="switch_copy_space"
                    >
                      <div className={`bg-white w-4 h-4 rounded-full shadow-sm transform duration-200 ${
                        settings.copySpace ? 'translate-x-4' : 'translate-x-0'
                      }`} />
                    </button>
                  </div>
                  {settings.copySpace && (
                    <div className="grid grid-cols-5 gap-1 bg-slate-50 p-1 rounded-md border border-slate-100 mt-1" id="copy_space_position_selector">
                      {(['left', 'right', 'top', 'bottom', 'auto'] as const).map((pos) => (
                        <button
                          key={pos}
                          type="button"
                          onClick={() => setSettings({ ...settings, copySpacePosition: pos })}
                          className={`text-[10px] font-bold py-1 px-1 rounded-sm capitalize transition-all whitespace-nowrap text-center ${
                            settings.copySpacePosition === pos 
                              ? (isImageMode ? 'bg-white text-indigo-600 shadow-xs border border-slate-100' : 'bg-white text-blue-600 shadow-xs border border-slate-100')
                              : 'text-slate-500 hover:text-slate-800'
                          }`}
                          id={`btn_copy_pos_${pos}`}
                        >
                          {pos === 'auto' ? 'AI Auto' : pos}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Video-Only: Single Scene Only */}
                {!isImageMode && (
                  <div className="flex items-center justify-between" id="toggle_single_scene">
                    <div className="flex flex-col">
                      <span className="text-xs font-semibold text-slate-700">Single Continuous Scene</span>
                      <span className="text-[10px] text-slate-400">Enforce single unbroken shot (no cuts)</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSettings({ ...settings, singleSceneOnly: !settings.singleSceneOnly })}
                      className={`w-9 h-5 rounded-full p-0.5 transition-colors duration-200 focus:outline-none ${
                        settings.singleSceneOnly ? 'bg-blue-600' : 'bg-slate-200'
                      }`}
                      id="switch_single_scene"
                    >
                      <div className={`bg-white w-4 h-4 rounded-full shadow-sm transform duration-200 ${
                        settings.singleSceneOnly ? 'translate-x-4' : 'translate-x-0'
                      }`} />
                    </button>
                  </div>
                )}

                {/* Allow People */}
                <div className="flex items-center justify-between" id="toggle_allow_people">
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-slate-700">Human Subject Focus</span>
                    <span className="text-[10px] text-slate-400">Disabled by default (avoids rejections)</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSettings({ ...settings, allowPeople: !settings.allowPeople })}
                    className={`w-9 h-5 rounded-full p-0.5 transition-colors duration-200 focus:outline-none ${
                      settings.allowPeople ? 'bg-amber-500' : 'bg-slate-200'
                    }`}
                    id="switch_allow_people"
                  >
                    <div className={`bg-white w-4 h-4 rounded-full shadow-sm transform duration-200 ${
                      settings.allowPeople ? 'translate-x-4' : 'translate-x-0'
                    }`} />
                  </button>
                </div>

              </div>

            </div>
          </div>

          {/* SESSIONS / HISTORY LIST */}
          <div className="mt-auto border-t border-slate-100 pt-4 flex-1 flex flex-col min-h-[160px] max-h-[260px]" id="sessions_history_container">
            <div className="flex items-center justify-between mb-2 text-xs font-bold text-slate-400 uppercase tracking-wider" id="history_header">
              <span className="flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5" />
                Session Log ({history.length})
              </span>
              {history.length > 0 && (
                <button 
                  onClick={clearHistory}
                  className={`text-[10px] font-bold transition-all duration-200 px-2 py-0.5 rounded ${
                    showClearConfirm 
                      ? 'text-white bg-red-600 hover:bg-red-700 animate-pulse' 
                      : 'text-red-500 hover:bg-red-50 hover:underline'
                  }`}
                  title={showClearConfirm ? "Click again to confirm clear" : "Clear session log"}
                  id="btn_clear_history"
                >
                  {showClearConfirm ? "Confirm Clear?" : "Clear"}
                </button>
              )}
            </div>

            <div className="overflow-y-auto space-y-1.5 flex-grow pr-1" id="history_list">
              {history.length === 0 ? (
                <div className="text-[11px] text-slate-400 py-3 text-center border border-dashed border-slate-200 rounded-lg bg-slate-50/50" id="empty_history">
                  No previous generations saved.
                </div>
              ) : (
                history.map((h) => (
                  <button
                    key={h.id}
                    onClick={() => restoreSession(h)}
                    className="w-full flex items-center gap-2.5 p-2 rounded-lg text-left hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-all text-xs"
                    id={`history_item_${h.id}`}
                  >
                    <img 
                      src={h.imagePreviewUrl} 
                      alt="Ref" 
                      className="w-8 h-8 rounded bg-slate-100 object-cover flex-shrink-0" 
                    />
                    <div className="overflow-hidden flex-1">
                      <div className="font-semibold text-slate-800 truncate">
                        {h.result.imageAssessment?.subjectExtracted || "Generated Concept"}
                      </div>
                      <div className="text-[10px] text-slate-400 flex items-center justify-between">
                        <span className="flex items-center gap-1">
                          {h.settings.mediaType === 'image' ? (
                            <span className="text-[9px] font-bold text-indigo-600 uppercase bg-indigo-50 px-1 rounded">Photo</span>
                          ) : (
                            <span className="text-[9px] font-bold text-blue-600 uppercase bg-blue-50 px-1 rounded">Video</span>
                          )}
                          <span>{h.timestamp}</span>
                        </span>
                        <span className="font-bold text-slate-500 text-[9px]">
                          {h.settings.ratio}
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                  </button>
                ))
              )}
            </div>
          </div>

          {/* STATS */}
          <div className="border-t border-slate-100 pt-4" id="sidebar_stats_block">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Marketplace Performance</div>
            <div className="grid grid-cols-3 gap-2" id="stats_metrics">
              <div className="bg-slate-50 rounded-lg p-2 text-center" id="metric_tokens">
                <span className="block text-[9px] text-slate-400 font-semibold uppercase">Token Eq</span>
                <span className="text-[11px] font-bold text-slate-800">{(tokensUsed / 1000).toFixed(1)}k</span>
              </div>
              <div className="bg-slate-50 rounded-lg p-2 text-center" id="metric_generated">
                <span className="block text-[9px] text-slate-400 font-semibold uppercase">Prompts</span>
                <span className="text-[11px] font-bold text-slate-800">{totalGenerated}</span>
              </div>
              <div className="bg-slate-50 rounded-lg p-2 text-center" id="metric_approval">
                <span className="block text-[9px] text-slate-400 font-semibold uppercase">Stock ROI</span>
                <span className="text-[11px] font-bold text-emerald-600">{approvalRate}%</span>
              </div>
            </div>
          </div>

        </div>
      </aside>

      {/* MAIN WORKSPACE CONTAINER */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto" id="main_workspace">
        
        {/* TOP STATUS AND ACTION BAR */}
        <header className="bg-white border-b border-slate-100 py-3.5 px-8 flex items-center justify-between shrink-0" id="main_header">
          <div className="flex items-center gap-3">
            <div className={`w-2.5 h-2.5 rounded-full ${isImageMode ? 'bg-indigo-600 animate-pulse' : 'bg-blue-600 animate-pulse'}`} />
            <h2 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider" id="header_label">
              {isImageMode 
                ? 'Adobe Stock Photo Prompt Generator' 
                : 'Adobe Stock Video Prompt Generator'}
            </h2>
            <span className="hidden sm:inline-block text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
              {isImageMode ? 'Midjourney v6.1 • FLUX.1 • Firefly 3 • Imagen 3' : 'Veo 3 • Runway Gen-4 • Kling 1.6'}
            </span>
          </div>
          
          <div className="flex items-center gap-3" id="header_actions">
            {image && (
              <button
                onClick={startNewSession}
                className="text-xs font-semibold text-slate-500 hover:text-slate-800 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-all"
                id="btn_clear_session_main"
              >
                Clear Reference
              </button>
            )}
            
            <button
              onClick={generatePrompts}
              disabled={isGenerating || !image}
              className={`text-xs font-bold px-4 py-2 rounded-lg flex items-center gap-2 shadow-sm transition-all ${
                !image 
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed' 
                  : isGenerating 
                    ? 'bg-indigo-100 text-indigo-700 cursor-wait' 
                    : isImageMode 
                      ? 'bg-indigo-600 hover:bg-indigo-700 text-white hover:shadow-md'
                      : 'bg-blue-600 hover:bg-blue-700 text-white hover:shadow-md'
              }`}
              id="btn_generate_main"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Synthesizing...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>{isImageMode ? 'Generate Photo Prompts' : 'Generate Video Prompts'}</span>
                </>
              )}
            </button>
          </div>
        </header>

        {/* WORKSPACE INNER CONTENT */}
        <div className="flex-1 p-8 space-y-6 max-w-7xl mx-auto w-full" id="workspace_content">
          
          {/* UPLOAD & IMAGE INPUT SECTION */}
          {!image ? (
            <div className="space-y-6" id="upload_flow_wrapper">
              
              {/* BRAND GREETING CARD */}
              <div className={`bg-gradient-to-br border rounded-2xl p-8 shadow-xs ${
                isImageMode 
                  ? 'from-indigo-50/80 via-white to-purple-50/30 border-indigo-100' 
                  : 'from-blue-50 via-white to-slate-50 border-blue-100/60'
              }`} id="welcome_greeting_card">
                <div className="max-w-3xl">
                  <div className="flex items-center gap-2 mb-3">
                    <span className={`inline-block text-[10px] font-extrabold uppercase tracking-widest px-2.5 py-1 rounded-md ${
                      isImageMode ? 'bg-indigo-100 text-indigo-800' : 'bg-blue-100 text-blue-800'
                    }`}>
                      {isImageMode ? 'Adobe Stock Photo Engine Active' : 'Adobe Stock Video Engine Active'}
                    </span>
                    <span className="text-[10px] font-bold text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded-md">
                      {isImageMode ? 'Zero-Text Mandate & Anatomy Compliant' : 'Single Scene & Loop Continuity'}
                    </span>
                  </div>

                  <h3 className="text-xl font-extrabold text-slate-900 tracking-tight mb-2" id="welcome_heading">
                    {isImageMode 
                      ? 'High-Fidelity Adobe Stock Image Prompt Generator' 
                      : 'Commercially Engineered Microstock Video Prompts'}
                  </h3>

                  <p className="text-xs text-slate-600 leading-relaxed" id="welcome_text">
                    {isImageMode 
                      ? 'Upload any reference photo to extract its lighting, textures, and mood into commercially distinctive image prompts. Tailored specifically to pass Adobe Stock microstock acceptance standards with photo-realistic optical bokeh, realistic anatomy, and guaranteed "NO TEXT" directives.'
                      : 'Upload your reference image and configure your motion settings — we generate commercially optimized video prompts structured for seamless looping and locked or stabilized camera takes.'}
                  </p>
                </div>
              </div>

              {/* DRAG AND DROP ZONE */}
              <div 
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all duration-300 ${
                  isDragActive 
                    ? (isImageMode ? 'border-indigo-500 bg-indigo-50/50' : 'border-blue-500 bg-blue-50/50')
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/20'
                }`}
                id="drag_drop_zone"
              >
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileInputChange} 
                  accept="image/*" 
                  className="hidden" 
                  id="hidden_file_input"
                />
                
                <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-slate-100" id="upload_icon_wrapper">
                  {isImageMode ? (
                    <Camera className="w-7 h-7 text-indigo-500" />
                  ) : (
                    <Upload className="w-7 h-7 text-slate-400" />
                  )}
                </div>
                
                <h4 className="text-sm font-bold text-slate-800 mb-1">
                  Drag and drop your reference image here
                </h4>
                <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed mb-4">
                  Accepts PNG, JPG, JPEG, or WEBP up to 20MB. Image will be analyzed to extract subject textures, focal planes, and lighting harmony.
                </p>
                <button 
                  type="button" 
                  className={`text-xs font-semibold px-4 py-2 rounded-lg border inline-flex items-center gap-1.5 transition-all ${
                    isImageMode 
                      ? 'text-indigo-600 hover:text-indigo-700 bg-indigo-50 border-indigo-100' 
                      : 'text-blue-600 hover:text-blue-700 bg-blue-50 border-blue-100'
                  }`}
                  id="btn_browse_files"
                >
                  Browse Files
                </button>
              </div>

              {/* DEMO / SAMPLE IMAGE SELECTOR */}
              <div className="space-y-3" id="sample_selector_group">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Or select a curated stock asset for instant generation:
                  </h4>
                  <span className="text-[10px] text-slate-400">Click to load</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5" id="samples_grid">
                  {SAMPLE_IMAGES.map((sample, idx) => (
                    <button
                      key={idx}
                      onClick={() => selectSample(sample)}
                      className="group relative flex flex-col text-left bg-white border border-slate-200 rounded-xl overflow-hidden hover:border-indigo-400 hover:shadow-md transition-all duration-300"
                      id={`btn_sample_${idx}`}
                    >
                      <div className="h-28 w-full bg-slate-100 relative overflow-hidden">
                        <img 
                          src={sample.url} 
                          alt={sample.name} 
                          className="w-full h-full object-cover group-hover:scale-105 transition-all duration-500" 
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2.5">
                          <span className="text-[9px] font-bold text-white bg-indigo-600 px-1.5 py-0.5 rounded uppercase tracking-wider">Load Asset</span>
                        </div>
                        <span className={`absolute top-2 left-2 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider shadow-xs ${
                          sample.type === 'image' ? 'bg-indigo-600 text-white' : 'bg-blue-600 text-white'
                        }`}>
                          {sample.type === 'image' ? 'Photo' : 'Video'}
                        </span>
                      </div>
                      <div className="p-2.5">
                        <span className="text-[9px] text-slate-400 font-bold uppercase block mb-0.5 truncate">{sample.category}</span>
                        <span className="text-xs font-bold text-slate-800 line-clamp-1">{sample.name}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

            </div>
          ) : (
            <div className="space-y-6" id="active_workspace">
              
              {/* CURRENT IMAGE PREVIEW AND RUN ACTIONS */}
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs" id="active_preview_panel">
                <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4 bg-slate-50/50">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden shrink-0 shadow-xs">
                      <img src={imagePreviewUrl || ""} alt="Thumbnail" className="w-full h-full object-cover" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
                          Active Reference Image
                        </h4>
                        <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded uppercase ${
                          isImageMode ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' : 'bg-blue-50 text-blue-700 border border-blue-100'
                        }`}>
                          {isImageMode ? 'Photo Mode' : 'Video Mode'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Ratio: <span className="font-bold text-slate-700">{settings.ratio}</span> | 
                        {isImageMode ? (
                          <> Bokeh: <span className="font-bold text-slate-700 capitalize">{settings.bokehEffect?.replace('_', ' ')}</span> | Lens: <span className="font-bold text-slate-700">{settings.lensProfile?.replace('_', ' ')}</span></>
                        ) : (
                          <> Camera: <span className="font-bold text-slate-700 capitalize">{settings.cameraMovement}</span></>
                        )}
                        {settings.copySpace && <> | Copy Space: <span className="font-bold text-slate-700 capitalize">{settings.copySpacePosition}</span></>}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 border border-slate-200 px-3 py-2 rounded-lg bg-white transition-all inline-flex items-center gap-1.5"
                      id="btn_replace_image"
                    >
                      <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
                      Replace
                    </button>
                    
                    <button
                      onClick={generatePrompts}
                      disabled={isGenerating}
                      className={`text-xs font-bold text-white px-4 py-2 rounded-lg transition-all inline-flex items-center gap-1.5 shadow-sm ${
                        isImageMode ? 'bg-indigo-600 hover:bg-indigo-700 hover:shadow-md' : 'bg-blue-600 hover:bg-blue-700 hover:shadow-md'
                      }`}
                      id="btn_generate_re_run"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      {isImageMode ? 'Generate Photo Prompts' : 'Generate Video Prompts'}
                    </button>
                  </div>
                </div>

                {/* VISUAL LAYOUT OR LOADER */}
                {isGenerating ? (
                  <div className="p-16 flex flex-col items-center justify-center text-center" id="loader_card">
                    <div className="relative w-16 h-16 mb-6">
                      <div className={`absolute inset-0 rounded-full border-4 ${isImageMode ? 'border-indigo-100' : 'border-blue-100'}`} />
                      <div className={`absolute inset-0 rounded-full border-4 border-t-transparent animate-spin ${isImageMode ? 'border-indigo-600' : 'border-blue-600'}`} />
                      <Sparkles className={`w-6 h-6 absolute inset-0 m-auto ${isImageMode ? 'text-indigo-600' : 'text-blue-600'}`} />
                    </div>
                    
                    <h4 className="text-sm font-bold text-slate-800 mb-1">
                      {isImageMode ? 'Synthesizing Adobe Stock Photo Prompts' : 'Synthesizing Stock Video Prompts'}
                    </h4>
                    <p className={`text-xs font-semibold mb-3 tracking-wide uppercase px-2.5 py-1 rounded-md ${
                      isImageMode ? 'text-indigo-700 bg-indigo-50' : 'text-blue-600 bg-blue-50'
                    }`}>
                      {generationStep}
                    </p>
                    <p className="text-[11px] text-slate-400 max-w-md mx-auto leading-relaxed">
                      {isImageMode 
                        ? 'Applying commercial photography optics, realistic lighting angles, strict anatomy compliance, and the mandatory NO TEXT rule.' 
                        : 'Drafting 60–120 word single-scene motion prompts optimized for Google Veo, Runway Gen-4, and Kling.'}
                    </p>
                  </div>
                ) : !result ? (
                  <div className="p-12 text-center" id="ready_to_generate_message">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4 border ${
                      isImageMode ? 'bg-indigo-50 text-indigo-600 border-indigo-100' : 'bg-blue-50 text-blue-600 border-blue-100/50'
                    }`}>
                      {isImageMode ? <Camera className="w-6 h-6" /> : <FileVideo className="w-6 h-6" />}
                    </div>
                    <h4 className="text-sm font-bold text-slate-800 mb-1">
                      {isImageMode ? 'Ready to engineer commercial photography prompts' : 'Ready to engineer commercial video prompts'}
                    </h4>
                    <p className="text-xs text-slate-500 max-w-md mx-auto mb-4 leading-relaxed">
                      Reference image ready. Click below to run AI vision analysis and extract compliant, high-demand Adobe Stock prompts.
                    </p>
                    <button
                      onClick={generatePrompts}
                      className={`text-xs font-bold text-white px-5 py-2.5 rounded-lg transition-all inline-flex items-center gap-1.5 shadow-sm ${
                        isImageMode ? 'bg-indigo-600 hover:bg-indigo-700 hover:shadow-md' : 'bg-blue-600 hover:bg-blue-700 hover:shadow-md'
                      }`}
                      id="btn_generate_center"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>{isImageMode ? 'Synthesize Photo Prompts' : 'Synthesize Video Prompts'}</span>
                    </button>
                  </div>
                ) : null}
              </div>

              {/* ERROR MESSAGE DISPLAY */}
              {errorMessage && (
                <div className="bg-red-50 border border-red-100 rounded-xl p-4 text-xs text-red-700 flex items-start gap-3" id="error_alert">
                  <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block mb-0.5">Pipeline Generation Notice</span>
                    <span>{errorMessage}</span>
                  </div>
                </div>
              )}

              {/* ANALYSIS & BATCH RESULTS */}
              {result && !isGenerating && (
                <div className="space-y-6" id="results_wrapper">
                  
                  {/* IMAGE ASSESSMENT PANEL */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs" id="image_assessment_panel">
                    <div className="flex flex-wrap md:flex-nowrap items-start gap-6">
                      
                      {/* Left: Image Thumbnail Preview with badges */}
                      <div className="w-full md:w-64 shrink-0 flex flex-col gap-3" id="assessment_visual_sidebar">
                        <div className="aspect-square bg-slate-50 rounded-xl border border-slate-100 overflow-hidden shadow-xs relative">
                          <img 
                            src={imagePreviewUrl || ""} 
                            alt="Reference" 
                            className="w-full h-full object-cover" 
                          />
                          <div className="absolute top-2.5 right-2.5 bg-slate-900/80 backdrop-blur-xs text-[10px] font-extrabold text-white px-2 py-0.5 rounded uppercase tracking-wider">
                            Ref Asset
                          </div>
                        </div>

                        {/* Commercial Potential Badge */}
                        <div className="bg-slate-50 border border-slate-100 rounded-xl p-3.5 text-center flex flex-col justify-center items-center">
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">
                            Adobe Stock Potential
                          </span>
                          
                          {result.imageAssessment?.commercialPotential === 'high' && (
                            <span className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-100 text-xs font-black uppercase rounded-lg">
                              <Award className="w-3.5 h-3.5" />
                              High Demand (Tier 1)
                            </span>
                          )}
                          {result.imageAssessment?.commercialPotential === 'medium' && (
                            <span className="inline-flex items-center gap-1 px-3 py-1 bg-indigo-50 text-indigo-700 border border-indigo-100 text-xs font-black uppercase rounded-lg">
                              <Award className="w-3.5 h-3.5" />
                              Strong Demand (Tier 2)
                            </span>
                          )}
                          {result.imageAssessment?.commercialPotential === 'low' && (
                            <span className="inline-flex items-center gap-1 px-3 py-1 bg-amber-50 text-amber-700 border border-amber-100 text-xs font-black uppercase rounded-lg">
                              <AlertTriangle className="w-3.5 h-3.5" />
                              Moderate Demand (Tier 3)
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Right: Rich extracted metadata */}
                      <div className="flex-grow space-y-4" id="assessment_data_main">
                        <div>
                          <span className={`text-[10px] font-extrabold uppercase tracking-wider block mb-0.5 ${
                            isImageMode ? 'text-indigo-600' : 'text-blue-600'
                          }`}>
                            {isImageMode ? 'Commercial Stock Photography Evaluation' : 'Commercial Stock Video Evaluation'}
                          </span>
                          <h3 className="text-lg font-extrabold text-slate-900 tracking-tight" id="assessment_concept_title">
                            {result.imageAssessment?.subjectExtracted || "Extracted Subject Concept"}
                          </h3>
                        </div>

                        <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-100/80">
                          <strong>Stock Assessment:</strong> {result.imageAssessment?.justification}
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs" id="metadata_grid">
                          <div className="space-y-2.5">
                            <div className="flex items-start justify-between border-b border-slate-100 pb-2">
                              <span className="font-semibold text-slate-500">Marketplace Category:</span>
                              <span className="font-bold text-slate-800">{result.imageAssessment?.commercialCategory}</span>
                            </div>
                            <div className="flex items-start justify-between border-b border-slate-100 pb-2">
                              <span className="font-semibold text-slate-500">Lighting Profile:</span>
                              <span className="font-bold text-slate-800 capitalize">{result.imageAssessment?.lightingStyle}</span>
                            </div>
                            <div className="flex items-start justify-between border-b border-slate-100 pb-2">
                              <span className="font-semibold text-slate-500">Composition Framing:</span>
                              <span className="font-bold text-slate-800">{result.imageAssessment?.composition}</span>
                            </div>
                          </div>

                          <div className="space-y-2.5">
                            <div className="flex items-start justify-between border-b border-slate-100 pb-2">
                              <span className="font-semibold text-slate-500">Mood / Atmosphere:</span>
                              <span className="font-bold text-slate-800">{result.imageAssessment?.moodAtmosphere}</span>
                            </div>
                            <div className="flex items-start justify-between border-b border-slate-100 pb-2">
                              <span className="font-semibold text-slate-500">
                                {isImageMode ? 'Optical Depth / Texture:' : 'Predicted Motion:'}
                              </span>
                              <span className="font-bold text-slate-800">{result.imageAssessment?.motionPotential}</span>
                            </div>
                            <div className="flex flex-col gap-1 pb-1">
                              <span className="font-semibold text-slate-500">Color Palette:</span>
                              <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                                {result.imageAssessment?.colorPalette?.map((color, cIdx) => (
                                  <span 
                                    key={cIdx} 
                                    className="text-[10px] font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200"
                                    title={color}
                                  >
                                    {color}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Ambiguity or advice flags */}
                        {result.imageAssessment?.detectedAmbiguities && result.imageAssessment.detectedAmbiguities.length > 0 && (
                          <div className="bg-amber-50/60 border border-amber-100 rounded-xl p-3.5 text-xs text-amber-800" id="ambiguity_block">
                            <div className="flex items-center gap-1.5 font-bold mb-1">
                              <AlertTriangle className="w-4 h-4 text-amber-600" />
                              <span>Commercial Guidance & Rejection Prevention</span>
                            </div>
                            <ul className="list-disc list-inside space-y-1 text-slate-600">
                              {result.imageAssessment.detectedAmbiguities.map((item, idx) => (
                                <li key={idx}>{item}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                      </div>
                    </div>
                  </div>

                  {/* PROMPT GRID */}
                  <div className="space-y-4" id="prompts_section">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                        <Layers className="w-4 h-4 text-slate-400" />
                        {isImageMode 
                          ? `Commercially Tailored Photo Prompts (${result.prompts?.length || 0})`
                          : `Commercially Tailored Video Prompts (${result.prompts?.length || 0})`}
                      </h4>
                      <span className="text-[10px] text-slate-400">
                        {isImageMode ? 'Explicit "NO TEXT" Mandate & Realistic Anatomy Enforced' : 'Continuous Shot & Seamless Loop Enforced'}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6" id="generated_prompts_grid">
                      {result.prompts?.map((prompt) => (
                        <article 
                          key={prompt.id} 
                          className="bg-white border border-slate-200 rounded-2xl flex flex-col overflow-hidden hover:border-slate-300 transition-all duration-300 shadow-xs"
                          id={`prompt_card_${prompt.id}`}
                        >
                          {/* Header */}
                          <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between" id={`prompt_header_${prompt.id}`}>
                            <div>
                              <span className={`text-[10px] font-extrabold uppercase tracking-widest block ${
                                isImageMode ? 'text-indigo-600' : 'text-blue-600'
                              }`}>
                                Prompt {prompt.id < 10 ? `0${prompt.id}` : prompt.id}
                              </span>
                              <span className="text-xs font-bold text-slate-800">
                                {prompt.categoryTag}
                              </span>
                            </div>
                            <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md ${
                              prompt.tier === 'Tier 1' 
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                                : prompt.tier === 'Tier 2' 
                                  ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' 
                                  : 'bg-slate-100 text-slate-700 border border-slate-200'
                            }`}>
                              {prompt.tier}
                            </span>
                          </div>

                          {/* Body */}
                          <div className="p-5 flex-grow flex flex-col gap-4" id={`prompt_body_${prompt.id}`}>
                            
                            {/* Photo Mode: Title Suggestion for Adobe Stock submission */}
                            {prompt.titleSuggestion && (
                              <div className="bg-indigo-50/60 rounded-xl p-3 border border-indigo-100 text-xs flex items-center justify-between gap-3" id={`title_box_${prompt.id}`}>
                                <div className="overflow-hidden">
                                  <span className="text-[9px] font-extrabold text-indigo-700 uppercase tracking-wider block mb-0.5">
                                    Adobe Stock Suggested Title
                                  </span>
                                  <p className="font-bold text-slate-800 truncate text-[11.5px]">
                                    {prompt.titleSuggestion}
                                  </p>
                                </div>
                                <button
                                  onClick={() => copyToClipboard(prompt.titleSuggestion || "", prompt.id, 'title')}
                                  className="p-1.5 bg-white text-indigo-600 hover:text-indigo-800 rounded-md border border-indigo-200 hover:shadow-xs transition-all shrink-0"
                                  title="Copy Stock Submission Title"
                                  id={`btn_copy_title_${prompt.id}`}
                                >
                                  {copiedTitleId === prompt.id ? (
                                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                                  ) : (
                                    <Copy className="w-3.5 h-3.5" />
                                  )}
                                </button>
                              </div>
                            )}

                            {/* Prompt text area */}
                            <div className="relative bg-slate-50 rounded-xl p-4 border border-slate-100 flex-grow" id={`prompt_text_box_${prompt.id}`}>
                              <p className="text-xs text-slate-800 leading-relaxed font-medium select-all">
                                {prompt.promptText}
                              </p>
                              
                              <div className="absolute top-2 right-2 flex items-center gap-1.5">
                                <button
                                  onClick={() => copyToClipboard(prompt.promptText, prompt.id, 'prompt')}
                                  className="p-1.5 bg-white text-slate-500 hover:text-slate-800 rounded-md border border-slate-200 hover:shadow-xs transition-all duration-200"
                                  title="Copy Prompt Text"
                                  id={`btn_copy_prompt_${prompt.id}`}
                                >
                                  {copiedPromptId === prompt.id ? (
                                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                                  ) : (
                                    <Copy className="w-3.5 h-3.5" />
                                  )}
                                </button>
                              </div>
                            </div>

                            {/* Keywords box (Exactly 15 keywords) */}
                            <div className="bg-slate-50/50 rounded-xl p-3 border border-dashed border-slate-200" id={`keywords_box_${prompt.id}`}>
                              <div className="flex items-center justify-between mb-2" id={`keywords_header_${prompt.id}`}>
                                <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider">
                                  Adobe Stock SEO Tags ({prompt.keywords?.length || 0})
                                </span>
                                <button
                                  onClick={() => copyToClipboard(prompt.keywords?.join(', ') || "", prompt.id, 'keywords')}
                                  className={`text-[10px] font-bold hover:underline inline-flex items-center gap-1 ${
                                    isImageMode ? 'text-indigo-600' : 'text-blue-600'
                                  }`}
                                  id={`btn_copy_keywords_${prompt.id}`}
                                >
                                  {copiedKeywordsId === prompt.id ? (
                                    <>
                                      <Check className="w-3 h-3 text-emerald-600" />
                                      <span>Copied 15 Tags!</span>
                                    </>
                                  ) : (
                                    <>
                                      <Copy className="w-3 h-3" />
                                      <span>Copy all tags</span>
                                    </>
                                  )}
                                </button>
                              </div>
                              <div className="flex flex-wrap gap-1" id={`keywords_cloud_${prompt.id}`}>
                                {prompt.keywords?.map((tag, tIdx) => (
                                  <span key={tIdx} className="text-[10px] bg-white text-slate-600 px-2 py-0.5 rounded border border-slate-200 font-medium">
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            </div>

                            {/* Stats & recommendations */}
                            <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-100 text-[11px]" id={`prompt_footer_stats_${prompt.id}`}>
                              <div>
                                <span className="text-[9px] text-slate-400 uppercase font-semibold block">Recommended AI Model</span>
                                <span className="font-bold text-slate-700">{prompt.recommendedTool}</span>
                              </div>
                              <div>
                                <span className="text-[9px] text-slate-400 uppercase font-semibold block">
                                  {isImageMode ? 'Aspect Ratio | Optics' : 'Aspect Ratio | Loop'}
                                </span>
                                <span className="font-bold text-slate-700 capitalize truncate block">
                                  {prompt.ratio} {prompt.duration ? `| ~${prompt.duration}s` : ''} {prompt.opticalDetails ? `| ${prompt.opticalDetails.split(' • ')[1] || prompt.opticalDetails}` : ''}
                                </span>
                              </div>
                            </div>

                            {/* Appeal score & explanation */}
                            <div className={`rounded-xl p-3 border text-[11px] ${
                              isImageMode ? 'bg-indigo-50/40 border-indigo-100/50' : 'bg-blue-50/50 border-blue-100/40'
                            }`} id={`prompt_appeal_box_${prompt.id}`}>
                              <div className="flex items-center justify-between mb-1">
                                <span className="font-bold text-slate-800">Commercial Marketability</span>
                                <div className="flex items-center gap-0.5 text-amber-500">
                                  {Array.from({ length: 5 }).map((_, sIdx) => (
                                    <span key={sIdx}>{sIdx < prompt.commercialAppealScore ? '★' : '☆'}</span>
                                  ))}
                                </div>
                              </div>
                              <p className="text-slate-600 leading-relaxed text-[10.5px]">
                                <strong>Appeal:</strong> {prompt.commercialAppealJustification}
                              </p>
                              <p className="text-slate-500 text-[10px] mt-1 leading-relaxed border-t border-slate-200/50 pt-1">
                                <strong>Engine Note:</strong> {prompt.whyStructured}
                              </p>
                            </div>

                          </div>
                        </article>
                      ))}
                    </div>
                  </div>

                </div>
              )}

              {/* COMMERCIAL INTELLIGENCE WARNING FOOTER */}
              <footer className="p-4 bg-amber-50 border border-amber-200/80 rounded-xl font-medium text-xs flex items-start gap-3 text-amber-800 shrink-0" id="commercial_info_footer">
                <TrendingUp className="w-4.5 h-4.5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block mb-0.5">Adobe Stock Contributor Guidelines Notice</span>
                  <p className="text-slate-600 leading-relaxed text-[11px]">
                    {isImageMode 
                      ? 'Adobe Stock rigorously rejects AI submissions featuring artificial typographic artifacts, anatomical distortions, or low dynamic range. Every prompt generated in Photo Mode contains explicit negative constraints to safeguard your contributor account standing.'
                      : 'Ensure your video generation tool is set to maintain locked camera frames when using the Static preset. Looping clips with subtle continuous motion yield 40% higher commercial licensing rates.'}
                  </p>
                </div>
              </footer>

            </div>
          )}

        </div>
      </main>
    </div>
  );
}
