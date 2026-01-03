
import React, { useState, useEffect, useMemo } from 'react';
import { IntroSettings, IntroAsset, CharMapping } from '../types';
import { DEFAULT_INTRO_SETTINGS } from '../constants';
import { IntroControls } from './IntroControls';
import { IntroStage } from './IntroStage';
// @ts-ignore
import html2canvas from 'html2canvas';

interface IntroProps {
  importedAssets: { url: string }[],
  globalText: string;
  globalFont: string;
  globalOpacity: number;
  cinemaMode?: boolean;
}

export const Intro: React.FC<IntroProps> = ({ importedAssets, globalText, globalFont, globalOpacity, cinemaMode = false }) => {
  const [settings, setSettings] = useState<IntroSettings>(DEFAULT_INTRO_SETTINGS);
  const [assets, setAssets] = useState<IntroAsset[]>([]);
  const [mappings, setMappings] = useState<CharMapping[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [manualTime, setManualTime] = useState<number | null>(null);
  const [isWireframe, setIsWireframe] = useState(false);

  // Sync Global State
  useEffect(() => {
    setSettings(prev => ({
        ...prev,
        text: globalText,
        font: globalFont,
        bgOpacity: globalOpacity
    }));
  }, [globalText, globalFont, globalOpacity]);

  // Calculate total duration for the scrubber
  const totalDuration = useMemo(() => {
      const charCount = Math.max(settings.text.length, 1);
      const rippleDuration = (charCount - 1) * settings.stagger;
      return settings.solidBaseDuration + settings.duration + rippleDuration + settings.endHoldDuration;
  }, [settings.solidBaseDuration, settings.duration, settings.stagger, settings.text]);

  // Load imported assets on mount/change
  useEffect(() => {
    if (importedAssets.length > 0) {
      const newAssets = importedAssets.map(a => ({ id: Math.random().toString(36).substr(2, 9), url: a.url }));
      setAssets(newAssets); 
      setMappings([]); 
    }
  }, [importedAssets]);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') {
        return;
      }

      const key = e.key.toLowerCase();
      
      if (key === 'p' || key === ' ') {
        e.preventDefault(); 
        handlePlayToggle();
      } else if (key === 'w') {
        setIsWireframe(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, isWireframe]);

  // Update mappings when text, assets, or global timing settings change
  useEffect(() => {
    setMappings(prev => {
        const newText = settings.text;
        const newMappings: CharMapping[] = [];
        for (let i = 0; i < newText.length; i++) {
            const char = newText[i];
            const existing = prev[i];
            const defaultImgId = assets.length > 0 ? assets[i % assets.length].id : null;
            const defaultDuration = settings.duration + (i * settings.stagger);
            
            let keepExisting = false;
            if (existing && existing.char === char) {
                if (existing.imgId && assets.find(a => a.id === existing.imgId)) {
                    keepExisting = true;
                } else if (existing.imgId === null) {
                    keepExisting = true;
                }
            }

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
  }, [settings.text, assets, settings.duration, settings.stagger]); 

  const handleUpdateSetting = (key: keyof IntroSettings, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleApplyPreset = (presetSettings: Partial<IntroSettings>) => {
    setSettings(prev => ({
      ...prev, ...presetSettings,
      text: prev.text, font: prev.font, bgImage: prev.bgImage, audioUrl: prev.audioUrl, audioName: prev.audioName
    }));
  };

  const handleUpdateMapping = (index: number, changes: Partial<CharMapping>) => {
    setMappings(prev => prev.map((m, i) => i === index ? { ...m, ...changes } : m));
  };

  const handleUploadAssets = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files?.length) {
          const files = Array.from(e.target.files) as File[];
          const newAssets = files.map(f => ({ id: Math.random().toString(36).substr(2, 9), url: URL.createObjectURL(f) }));
          setAssets(prev => [...prev, ...newAssets]);
      }
  };

  const handleUploadAudio = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
        setSettings(s => ({
            ...s, 
            audioUrl: URL.createObjectURL(file),
            audioName: `自訂音效: ${file.name}`
        }));
    }
  };

  const handleSnapshot = async () => {
    const el = document.getElementById('intro-stage');
    if (el) {
        const canvas = await html2canvas(el, { 
            scale: 1, backgroundColor: null, useCORS: true, width: 1920, height: 1080
        });
        const link = document.createElement('a');
        link.download = `marvel-snapshot-${manualTime ? Math.round(manualTime) : 'final'}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
    }
  };

  const handleExportGif = async () => {
    if (assets.length === 0 && settings.slotEffect) {
        alert("請先上傳圖片素材");
        return;
    }
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
            await new Promise(r => setTimeout(r, 150));
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
    } catch (e) {
        setIsExporting(false);
        setManualTime(null);
    }
  };

  const handleScrub = (time: number) => {
      setIsPlaying(false);
      setManualTime(time);
  };

  const handlePlayToggle = () => {
      if (!isPlaying) {
          setManualTime(null);
      }
      setIsPlaying(!isPlaying);
  };

  return (
    <div className="flex w-full h-full relative group/container">
        {!cinemaMode && (
            <IntroControls 
                settings={settings}
                updateSetting={handleUpdateSetting}
                onApplyPreset={handleApplyPreset}
                assets={assets}
                mappings={mappings}
                updateMapping={handleUpdateMapping}
                onUploadAssets={handleUploadAssets}
                onClearAssets={() => setAssets([])}
                onRemoveAsset={(id) => setAssets(prev => prev.filter(a => a.id !== id))}
                onUploadBg={(e) => e.target.files?.[0] && setSettings(s => ({...s, bgImage: URL.createObjectURL(e.target.files![0])}))}
                onUploadAudio={handleUploadAudio}
                onPlay={handlePlayToggle}
                onSnapshot={handleSnapshot}
                onExportGif={handleExportGif}
                isPlaying={isPlaying}
                isExporting={isExporting}
                isWireframe={isWireframe}
                toggleWireframe={() => setIsWireframe(!isWireframe)}
                manualTime={manualTime}
                onScrub={handleScrub}
                totalDuration={totalDuration}
            />
        )}

        <div className="flex-1 bg-black flex items-center justify-center relative overflow-hidden">
             <IntroStage 
                    settings={settings}
                    onUpdateSettings={(vals) => setSettings(s => ({...s, ...vals}))}
                    assets={assets}
                    mappings={mappings}
                    isPlaying={isPlaying}
                    manualTime={manualTime}
                    progress={0}
                    onFinish={() => setIsPlaying(false)}
                    isWireframe={isWireframe}
                    cinemaMode={cinemaMode}
            />
            
            {cinemaMode && (
                <div className="absolute inset-0 z-50 pointer-events-none flex flex-col items-center justify-center">
                    {!isPlaying && (
                        <button 
                            onClick={handlePlayToggle}
                            className="pointer-events-auto group relative flex items-center justify-center"
                        >
                            <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl group-hover:bg-primary/40 transition-all duration-500"></div>
                            <div className="relative w-24 h-24 rounded-full border-2 border-primary/50 bg-black/50 backdrop-blur-sm flex items-center justify-center group-hover:scale-110 group-hover:border-primary transition-all duration-300">
                                <span className="text-4xl text-white ml-2">▶</span>
                            </div>
                            <span className="absolute -bottom-10 text-white/50 text-xs font-bold tracking-[0.2em] group-hover:text-white transition-colors">START SEQUENCE</span>
                        </button>
                    )}
                    
                    {isPlaying && (
                        <div className="absolute bottom-10 opacity-0 group-hover/container:opacity-100 transition-opacity duration-500 pointer-events-auto">
                             <button 
                                onClick={handlePlayToggle}
                                className="px-6 py-2 bg-white/10 backdrop-blur border border-white/20 rounded-full text-white text-sm font-bold hover:bg-red-600 hover:border-red-600 transition-all flex items-center gap-2"
                             >
                                <span className="animate-pulse">●</span> 停止播放 (STOP)
                             </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    </div>
  );
};
