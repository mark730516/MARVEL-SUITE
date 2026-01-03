
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { IntroSettings, IntroAsset, CharMapping, LibraryAsset } from './types';
import { DEFAULT_INTRO_SETTINGS } from './constants';
import { IntroStage } from './components/IntroStage';
import { IntroControls } from './components/IntroControls';
// @ts-ignore
import html2canvas from 'html2canvas';

// Helper to init DB
const getDB = () => {
    return new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('MarvelSuiteDB', 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains('assets')) {
          db.createObjectStore('assets', { keyPath: 'id' });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
};

const App: React.FC = () => {
  // --- Global State ---
  // Default to 'assets' as the first step in the workflow
  const [activeModule, setActiveModule] = useState<'assets' | 'mapping' | 'text' | 'motion' | 'scene'>('assets');
  const [settings, setSettings] = useState<IntroSettings>(DEFAULT_INTRO_SETTINGS);
  const [assets, setAssets] = useState<IntroAsset[]>([]);
  const [library, setLibrary] = useState<LibraryAsset[]>([]);
  const [mappings, setMappings] = useState<CharMapping[]>([]);
  
  // --- Playback State ---
  const [isPlaying, setIsPlaying] = useState(false);
  const [manualTime, setManualTime] = useState<number | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isWireframe, setIsWireframe] = useState(false);
  const [cinemaMode, setCinemaMode] = useState(false);

  // --- Load Library on Mount ---
  useEffect(() => {
      const loadLib = async () => {
          try {
              const db = await getDB();
              const tx = db.transaction('assets', 'readonly');
              const store = tx.objectStore('assets');
              const request = store.getAll();
              request.onsuccess = () => {
                  setLibrary(request.result.sort((a: any, b: any) => b.timestamp - a.timestamp));
              };
          } catch(e) { console.error(e); }
      };
      loadLib();
  }, []);

  // --- Mappings Logic (Sync with Text/Assets) ---
  useEffect(() => {
    setMappings(prev => {
        const newText = settings.text;
        const newMappings: CharMapping[] = [];
        for (let i = 0; i < newText.length; i++) {
            const char = newText[i];
            const existing = prev[i];
            const defaultImgId = assets.length > 0 ? assets[i % assets.length].id : null;
            const defaultDuration = settings.duration + (i * settings.stagger);
            
            // Try to preserve existing mapping if char matches or it's a generic slot
            let keepExisting = false;
            if (existing && existing.char === char) keepExisting = true;
            
            if (keepExisting) {
                newMappings.push({ ...existing, duration: defaultDuration });
            } else {
                newMappings.push({
                    char, 
                    imgId: defaultImgId, 
                    scale: 100, 
                    x: 0, 
                    y: -50, 
                    fitHeight: false, 
                    duration: defaultDuration
                });
            }
        }
        return newMappings;
    });
  }, [settings.text, assets.length, settings.duration, settings.stagger]); 

  // --- Handlers ---
  const updateSetting = (key: keyof IntroSettings, value: any) => {
      setSettings(prev => ({ ...prev, [key]: value }));
  };

  const updateMapping = (index: number, changes: Partial<CharMapping>) => {
      setMappings(prev => prev.map((m, i) => i === index ? { ...m, ...changes } : m));
  };

  const handleApplyPreset = (preset: Partial<IntroSettings>) => {
      setSettings(prev => ({ 
          ...prev, ...preset, 
          text: prev.text, font: prev.font, audioUrl: prev.audioUrl, audioName: prev.audioName 
      }));
  };

  // Asset Management
  const handleUploadAssets = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!e.target.files?.length) return;
      const files = Array.from(e.target.files) as File[];
      
      // 1. Pre-read files to avoid transaction inactivity
      const processedFiles = await Promise.all(files.map(file => {
          return new Promise<{id: string, name: string, src: string}>((resolve) => {
              const reader = new FileReader();
              reader.onload = (ev) => {
                  resolve({
                      id: Math.random().toString(36).substr(2, 9),
                      name: file.name,
                      src: ev.target?.result as string
                  });
              };
              reader.readAsDataURL(file);
          });
      }));

      // 2. Update Session State
      const newAssets: IntroAsset[] = processedFiles.map(f => ({ id: f.id, url: f.src }));
      setAssets(prev => [...prev, ...newAssets]);
      
      // 3. Save to IndexedDB (Library)
      try {
        const db = await getDB();
        const tx = db.transaction('assets', 'readwrite');
        const store = tx.objectStore('assets');

        processedFiles.forEach(f => {
             store.put({ id: f.id, name: f.name, src: f.src, timestamp: Date.now() });
        });
        
        // Fetch within same transaction scope (or queue it)
        const libRequest = store.getAll();
        libRequest.onsuccess = () => {
             setLibrary(libRequest.result.sort((a: any, b: any) => b.timestamp - a.timestamp));
        };
      } catch (err) {
          console.error("IDB Error:", err);
      }
  };

  const handleAddFromLibrary = (libAsset: LibraryAsset) => {
      setAssets(prev => [...prev, { id: Math.random().toString(36).substr(2,9), url: libAsset.src }]);
  };

  const handleDeleteFromLibrary = async (id: string) => {
      const db = await getDB();
      const tx = db.transaction('assets', 'readwrite');
      tx.objectStore('assets').delete(id);
      tx.oncomplete = () => {
          setLibrary(prev => prev.filter(i => i.id !== id));
      };
  };

  // Export Logic
  const totalDuration = useMemo(() => {
      const charCount = Math.max(settings.text.length, 1);
      return settings.solidBaseDuration + settings.duration + ((charCount - 1) * settings.stagger) + settings.endHoldDuration;
  }, [settings]);

  const handleSnapshot = async () => {
    const el = document.getElementById('intro-stage');
    if (el) {
        setIsPlaying(false);
        setManualTime(manualTime ?? totalDuration);
        await new Promise(r => setTimeout(r, 100));
        const canvas = await html2canvas(el, { scale: 1, backgroundColor: null, useCORS: true, width: 1920, height: 1080 });
        const link = document.createElement('a');
        link.download = `marvel-snapshot-${Date.now()}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
    }
  };

  const handleExportGif = async () => {
    if (assets.length === 0 && settings.slotEffect) { alert("請先上傳圖片素材"); return; }
    setIsExporting(true);
    setIsPlaying(false);
    try {
        const workerBlob = await fetch('https://cdnjs.cloudflare.com/ajax/libs/gif.js/0.2.0/gif.worker.js').then(r => r.blob());
        const workerUrl = URL.createObjectURL(workerBlob);
        // @ts-ignore
        const gif = new GIF({ workers: 2, quality: 10, workerScript: workerUrl, width: 960, height: 540 });
        const fps = 10;
        const step = 1000 / fps;
        const stageEl = document.getElementById('intro-stage');
        
        for (let t = 0; t <= totalDuration; t += step) {
            setManualTime(t);
            await new Promise(r => setTimeout(r, 100));
            if (stageEl) {
                const canvas = await html2canvas(stageEl, { useCORS: true, scale: 0.5, backgroundColor: null, logging: false, width: 1920, height: 1080 });
                gif.addFrame(canvas, { delay: step });
            }
        }
        gif.on('finished', (blob: Blob) => {
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = 'marvel-intro.gif';
            link.click();
            setIsExporting(false);
            setManualTime(null);
            URL.revokeObjectURL(workerUrl);
        });
        gif.render();
    } catch (e) { setIsExporting(false); setManualTime(null); console.error(e); }
  };

  // Keyboard
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
        if ((e.target as HTMLElement).tagName.match(/INPUT|TEXTAREA|SELECT/)) return;
        if (e.key === ' ' || e.key.toLowerCase() === 'p') {
            e.preventDefault();
            setIsPlaying(p => !p);
            if (!isPlaying) setManualTime(null);
        }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isPlaying]);

  return (
    <div className={`flex w-full h-full ${cinemaMode ? 'bg-black' : 'bg-[#121212]'} overflow-hidden`}>
        {/* Left Sidebar (Modules) */}
        {!cinemaMode && (
            <div className="w-[450px] flex flex-col border-r border-[#333] bg-[#1a1a1a] z-20 shrink-0 h-full shadow-2xl">
                {/* Header / Tabs */}
                <div className="flex items-center bg-[#000] border-b border-[#333]">
                    <div className="flex-1 flex overflow-x-auto custom-scrollbar">
                        {[
                            { id: 'assets', label: '📂 素材', icon: '' },
                            { id: 'text', label: '📝 文字遮罩', icon: '' },
                            { id: 'mapping', label: '🔠 文字映射', icon: '' },
                            { id: 'motion', label: '⏱ 動態設計', icon: '' },
                            { id: 'scene', label: '🎨 場景設計', icon: '' },
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveModule(tab.id as any)}
                                className={`px-4 py-4 text-[10px] font-bold uppercase tracking-widest whitespace-nowrap transition-all border-b-2 hover:bg-[#222] ${activeModule === tab.id ? 'text-primary border-primary bg-[#222]' : 'text-gray-500 border-transparent'}`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Module Content */}
                <IntroControls 
                    activeModule={activeModule}
                    settings={settings}
                    updateSetting={updateSetting}
                    assets={assets}
                    library={library}
                    mappings={mappings}
                    updateMapping={updateMapping}
                    onApplyPreset={handleApplyPreset}
                    onUploadAssets={handleUploadAssets}
                    onAddFromLibrary={handleAddFromLibrary}
                    onDeleteFromLibrary={handleDeleteFromLibrary}
                    onRemoveAsset={(id) => setAssets(p => p.filter(a => a.id !== id))}
                    onUploadAudio={(e) => {
                        const f = e.target.files?.[0];
                        if(f) {
                            updateSetting('audioUrl', URL.createObjectURL(f));
                            updateSetting('audioName', f.name);
                        }
                    }}
                    onUploadBg={(e) => {
                        const f = e.target.files?.[0];
                        if(f) updateSetting('bgImage', URL.createObjectURL(f));
                    }}
                    // Transport Props
                    isPlaying={isPlaying}
                    onPlay={() => { setIsPlaying(!isPlaying); if(!isPlaying) setManualTime(null); }}
                    onSnapshot={handleSnapshot}
                    onExportGif={handleExportGif}
                    isExporting={isExporting}
                    totalDuration={totalDuration}
                    manualTime={manualTime}
                    onScrub={(t) => { setIsPlaying(false); setManualTime(t); }}
                    cinemaMode={cinemaMode}
                    toggleCinema={() => setCinemaMode(!cinemaMode)}
                />
            </div>
        )}

        {/* Right Stage (Preview) */}
        <div className={`flex-1 relative bg-black flex items-center justify-center overflow-hidden transition-all duration-500`}>
            <IntroStage 
                settings={settings}
                onUpdateSettings={() => {}} 
                assets={assets}
                mappings={mappings}
                isPlaying={isPlaying}
                manualTime={manualTime}
                progress={0}
                onFinish={() => setIsPlaying(false)}
                isWireframe={isWireframe}
                cinemaMode={cinemaMode}
            />

            {/* Cinema Controls Overlay */}
            {cinemaMode && (
                <button 
                    onClick={() => setCinemaMode(false)}
                    className="absolute top-5 right-5 z-50 bg-white/10 backdrop-blur border border-white/20 text-white px-4 py-2 rounded-full hover:bg-primary transition-all font-bold text-xs"
                >
                    ✕ 退出劇院模式
                </button>
            )}

            {/* Wireframe Toggle (Floating) */}
            {!cinemaMode && (
                <button 
                    onClick={() => setIsWireframe(!isWireframe)}
                    className={`absolute bottom-5 right-5 z-40 px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider border transition-all ${isWireframe ? 'bg-primary border-primary text-white' : 'bg-black/50 border-white/20 text-gray-500 hover:text-white'}`}
                >
                    {isWireframe ? 'Wireframe On' : 'Wireframe Off'}
                </button>
            )}
        </div>
    </div>
  );
};

export default App;
