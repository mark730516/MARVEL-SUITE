import React, { useState, useEffect } from 'react';
import { IntroSettings, IntroAsset, CharMapping } from '../types';
import { DEFAULT_INTRO_SETTINGS } from '../constants';
import { IntroControls } from './IntroControls';
import { IntroStage } from './IntroStage';
// @ts-ignore
import html2canvas from 'html2canvas';

interface IntroProps {
  importedAssets: { url: string }[],
  initialText: string;
  initialFont: string;
}

export const Intro: React.FC<IntroProps> = ({ importedAssets, initialText, initialFont }) => {
  const [settings, setSettings] = useState<IntroSettings>(DEFAULT_INTRO_SETTINGS);
  const [assets, setAssets] = useState<IntroAsset[]>([]);
  const [mappings, setMappings] = useState<CharMapping[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [manualTime, setManualTime] = useState<number | null>(null);

  // Load imported assets on mount/change
  useEffect(() => {
    if (importedAssets.length > 0) {
      const newAssets = importedAssets.map(a => ({ id: Math.random().toString(36).substr(2, 9), url: a.url }));
      setAssets(prev => [...prev, ...newAssets]);
    }
  }, [importedAssets]);

  // Sync settings if props change (only if they are meaningful)
  useEffect(() => {
      if(initialText && initialText !== 'MARVEL') setSettings(s => ({ ...s, text: initialText }));
      if(initialFont) setSettings(s => ({ ...s, font: initialFont }));
  }, [initialText, initialFont]);

  // Update mappings when text, assets, or global timing settings change
  useEffect(() => {
    setMappings(prev => {
        const newText = settings.text;
        const newMappings: CharMapping[] = [];
        for (let i = 0; i < newText.length; i++) {
            const char = newText[i];
            const existing = prev[i];
            // If existing char matches, keep settings, else reset.
            // Also try to default imgId round-robin style if assets exist
            const defaultImgId = assets.length > 0 ? assets[i % assets.length].id : null;
            
            // Calculate default duration based on global sliders
            const defaultDuration = settings.duration + (i * settings.stagger);

            if (existing && existing.char === char) {
                // We overwrite duration with the new calculated one to ensure sliders work dynamically
                // Users can manually override later, but moving the slider resets the "pattern"
                newMappings.push({
                    ...existing,
                    duration: defaultDuration
                });
            } else {
                newMappings.push({
                    char,
                    imgId: defaultImgId,
                    scale: 100,
                    x: 0,
                    y: 0,
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
      ...prev,
      ...presetSettings,
      text: prev.text,
      font: prev.font,
      bgImage: prev.bgImage,
      audioUrl: prev.audioUrl,
    }));
  };

  const handleUpdateMapping = (index: number, changes: Partial<CharMapping>) => {
    setMappings(prev => prev.map((m, i) => i === index ? { ...m, ...changes } : m));
  };

  const handleUploadAssets = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files?.length) {
          const files = Array.from(e.target.files) as File[];
          const newAssets = files.map(f => ({
              id: Math.random().toString(36).substr(2, 9),
              url: URL.createObjectURL(f)
          }));
          setAssets(prev => [...prev, ...newAssets]);
      }
  };

  const handleUploadBg = (e: React.ChangeEvent<HTMLInputElement>) => {
      if(e.target.files?.[0]) {
          setSettings(prev => ({ ...prev, bgImage: URL.createObjectURL(e.target.files![0]) }));
      }
  };

  const handleUploadAudio = (e: React.ChangeEvent<HTMLInputElement>) => {
      if(e.target.files?.[0]) {
          setSettings(prev => ({ ...prev, audioUrl: URL.createObjectURL(e.target.files![0]) }));
      }
  };

  const handleSnapshot = async () => {
    const el = document.getElementById('intro-stage');
    if (el) {
        // Temporarily hide UI overlays if any
        const canvas = await html2canvas(el, { scale: 2, backgroundColor: null, useCORS: true });
        const link = document.createElement('a');
        link.download = 'marvel-intro-snapshot.png';
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
        // Load worker blob dynamically
        const workerBlob = await fetch('https://cdnjs.cloudflare.com/ajax/libs/gif.js/0.2.0/gif.worker.js').then(r => r.blob());
        const workerUrl = URL.createObjectURL(workerBlob);

        // @ts-ignore
        const gif = new GIF({
            workers: 2,
            quality: 10,
            workerScript: workerUrl,
            // Canvas width/height will be determined by added frames
        });

        const fps = 10;
        const maxDuration = Math.max(
            settings.duration + (settings.text.length * settings.stagger),
            ...mappings.map(m => m.duration)
        ) + 500; // Add buffer

        const step = 1000 / fps;
        const stageEl = document.getElementById('intro-stage');

        for (let t = 0; t <= maxDuration; t += step) {
            setManualTime(t);
            // Wait for React to render and browser to paint
            await new Promise(r => setTimeout(r, 150));
            
            if (stageEl) {
                const canvas = await html2canvas(stageEl, {
                    useCORS: true,
                    scale: 0.5, // 50% scale for performance
                    backgroundColor: null,
                    logging: false
                });
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
        console.error("Export failed", e);
        alert("匯出失敗");
        setIsExporting(false);
        setManualTime(null);
    }
  };

  return (
    <div className="flex w-full h-full">
        <IntroControls 
            settings={settings}
            updateSetting={handleUpdateSetting}
            onApplyPreset={handleApplyPreset}
            assets={assets}
            mappings={mappings}
            updateMapping={handleUpdateMapping}
            onUploadAssets={handleUploadAssets}
            onClearAssets={() => setAssets([])}
            onUploadBg={handleUploadBg}
            onUploadAudio={handleUploadAudio}
            onPlay={() => setIsPlaying(!isPlaying)}
            onSnapshot={handleSnapshot}
            onExportGif={handleExportGif}
            isPlaying={isPlaying}
            isExporting={isExporting}
        />
        <div className="flex-1 bg-black flex items-center justify-center relative overflow-hidden">
            <div className="max-w-full max-h-full aspect-video shadow-2xl">
                <IntroStage 
                    settings={settings}
                    assets={assets}
                    mappings={mappings}
                    isPlaying={isPlaying}
                    manualTime={manualTime}
                    progress={0}
                    onFinish={() => setIsPlaying(false)}
                />
            </div>
        </div>
    </div>
  );
};