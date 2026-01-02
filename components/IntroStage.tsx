import React, { useEffect, useRef, useMemo } from 'react';
import { IntroSettings, IntroAsset, CharMapping } from '../types';

interface IntroStageProps {
  settings: IntroSettings;
  assets: IntroAsset[];
  mappings: CharMapping[]; // We use this for the slot machine finish state
  isPlaying: boolean;
  manualTime?: number | null; // For manual rendering/exporting
  progress: number; // 0 to 1, or driven internally if playing
  onFinish?: () => void;
}

export const IntroStage: React.FC<IntroStageProps> = ({ settings, assets, mappings, isPlaying, manualTime, onFinish }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const logoFrontRef = useRef<HTMLDivElement>(null);
  const logoShadowRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  
  // Audio Control
  useEffect(() => {
    if (settings.audioUrl && isPlaying && manualTime === null) {
      if (!audioRef.current) {
        audioRef.current = new Audio(settings.audioUrl);
      } else if (audioRef.current.src !== settings.audioUrl) {
        audioRef.current.src = settings.audioUrl;
      }
      audioRef.current.volume = settings.volume;
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {}); // Autoplay policies might block
    } else if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  }, [isPlaying, settings.audioUrl, settings.volume, manualTime]);

  // Derived styles
  const bgRgba = useMemo(() => {
    const hex = settings.bgColor;
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${settings.bgOpacity})`;
  }, [settings.bgColor, settings.bgOpacity]);

  const shadowStyle = useMemo(() => {
    let s = settings.glow > 0 ? `0 0 ${settings.glow}px ${settings.shadowColor}` : '';
    if (settings.depth > 0) {
      const layers = Array.from({ length: settings.depth }, (_, i) => `${i + 1}px ${i + 1}px 0 ${settings.shadowColor}`);
      const depthStr = layers.join(',');
      s = s ? `${s}, ${depthStr}` : depthStr;
    }
    return s || 'none';
  }, [settings.depth, settings.glow, settings.shadowColor]);

  // Helper to apply background style consistently
  const applyBackgroundToChar = (charEl: HTMLElement, assetUrl: string, map: CharMapping | null, jiggleMode = false, t = 0, jitterSettings = 0) => {
      charEl.style.backgroundImage = `url('${assetUrl}')`;
      charEl.style.color = 'transparent';
      charEl.style.webkitBackgroundClip = 'text';
      charEl.style.backgroundClip = 'text';

      if (jiggleMode) {
         // Jitter/Random state
         const j = jitterSettings;
         const ox = 50 + (Math.random() * j * 2 - j);
         const oy = 50 + (Math.random() * j * 2 - j);
         charEl.style.backgroundPosition = `${ox}% ${oy}%`;
         // Always cover for jitter to fill text
         charEl.style.backgroundSize = 'cover';
      } else if (map) {
         // Locked/Mapped state
         const ox = 50 + map.x;
         const oy = 50 + map.y;
         charEl.style.backgroundPosition = `${ox}% ${oy}%`;
         
         // CRITICAL FIX: If scale is exactly 100 (default from Prepper) and user hasn't forced fitHeight,
         // use 'cover' to perfectly match the baked 16:9 asset to the text shape without distortion.
         if (map.scale === 100 && !map.fitHeight) {
             charEl.style.backgroundSize = 'cover';
         } else {
             charEl.style.backgroundSize = map.fitHeight ? `auto ${map.scale}%` : `${map.scale}% auto`;
         }
      }
  };

  // Animation Loop Logic
  useEffect(() => {
    const isManual = typeof manualTime === 'number';

    if (!isPlaying && !isManual) {
        // Reset styles when stopped
        if(logoFrontRef.current) {
            logoFrontRef.current.style.transform = `translateY(${settings.offsetY}px) scale(1)`;
            logoFrontRef.current.style.backgroundImage = 'none';
            logoFrontRef.current.style.backgroundColor = bgRgba;
            logoFrontRef.current.style.color = settings.textColor;
            logoFrontRef.current.style.backgroundClip = 'border-box';
            logoFrontRef.current.style.webkitBackgroundClip = 'border-box';
            logoFrontRef.current.style.transition = 'none';
        }
        if(logoShadowRef.current) {
            logoShadowRef.current.style.transform = `translateY(${settings.offsetY}px) scale(1)`;
            logoShadowRef.current.style.transition = 'none';
        }
        return;
    }

    // MANUAL MODE (for Exporting)
    if (isManual && manualTime !== undefined && manualTime !== null) {
        const startS = settings.startScale / 100;
        const t = manualTime;
        const progress = Math.min(t / settings.duration, 1);
        const currentScale = startS + (1 - startS) * progress;
        
        const transform = `translateY(${settings.offsetY}px) scale(${currentScale})`;
        
        if(logoFrontRef.current) {
            logoFrontRef.current.style.transition = 'none';
            logoFrontRef.current.style.transform = transform;
        }
        if(logoShadowRef.current) {
            logoShadowRef.current.style.transition = 'none';
            logoShadowRef.current.style.transform = transform;
        }

        if (settings.slotEffect) {
            const chars = logoFrontRef.current?.children;
            if (chars) {
                for (let i = 0; i < chars.length; i++) {
                    const charEl = chars[i] as HTMLElement;
                    const map = mappings[i] || { imgId: null, scale: 100, x: 0, y: 0, fitHeight: false, duration: settings.duration + (i * settings.stagger) };
                    const lockTime = map.duration;
                    
                    if (t > lockTime) {
                        const asset = assets.find(a => a.id === map.imgId) || assets[0];
                        if (asset) applyBackgroundToChar(charEl, asset.url, map);
                    } else {
                         const randomAsset = assets[Math.floor((t % (assets.length * 10)) / 10)] || assets[0];
                         if (randomAsset) applyBackgroundToChar(charEl, randomAsset.url, null, true, t, settings.jitter);
                    }
                }
            }
        }
        return;
    }

    // PLAYING MODE (RAF)
    let rafId: number;
    let startTime = Date.now();
    let lastFlash = 0;
    
    if(logoFrontRef.current) {
        const startS = settings.startScale / 100;
        logoFrontRef.current.style.transition = `transform ${settings.duration}ms linear`;
        logoFrontRef.current.style.transform = `translateY(${settings.offsetY}px) scale(${startS})`;
        void logoFrontRef.current.offsetWidth;
        logoFrontRef.current.style.transform = `translateY(${settings.offsetY}px) scale(1)`;
    }
    if(logoShadowRef.current) {
         const startS = settings.startScale / 100;
         logoShadowRef.current.style.transition = `transform ${settings.duration}ms linear`;
         logoShadowRef.current.style.transform = `translateY(${settings.offsetY}px) scale(${startS})`;
         void logoShadowRef.current.offsetWidth;
         logoShadowRef.current.style.transform = `translateY(${settings.offsetY}px) scale(1)`;
    }

    const maxDuration = Math.max(
        settings.duration + (settings.text.length * settings.stagger),
        ...mappings.map(m => m.duration)
    );

    const animate = () => {
      const now = Date.now();
      const elapsed = now - startTime;
      
      if (elapsed > maxDuration + 500) {
        onFinish?.();
        return;
      }

      if (settings.slotEffect) {
        const chars = logoFrontRef.current?.children;
        
        if (chars) {
            for (let i = 0; i < chars.length; i++) {
                const charEl = chars[i] as HTMLElement;
                const map = mappings[i] || { imgId: null, scale: 100, x: 0, y: 0, fitHeight: false, duration: settings.duration + (i * settings.stagger) };
                const lockTime = map.duration;
                
                if (elapsed > lockTime) {
                    if (!charEl.dataset.locked) {
                        charEl.dataset.locked = "true";
                        charEl.classList.remove('animate-flash'); // Remove any flash classes if we had them
                        
                        const asset = assets.find(a => a.id === map.imgId) || assets[0];
                        if (asset) applyBackgroundToChar(charEl, asset.url, map);
                    }
                } else {
                     if (now - lastFlash > settings.speed) {
                         const randomAsset = assets[Math.floor(Math.random() * assets.length)];
                         if (randomAsset) applyBackgroundToChar(charEl, randomAsset.url, null, true, elapsed, settings.jitter);
                     }
                }
            }
        }
        if (now - lastFlash > settings.speed) lastFlash = now;
      } 

      rafId = requestAnimationFrame(animate);
    };

    rafId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(rafId);
      if(logoFrontRef.current) logoFrontRef.current.style.transition = 'none';
      if(logoShadowRef.current) logoShadowRef.current.style.transition = 'none';
    };
  }, [isPlaying, settings, assets, mappings, bgRgba, manualTime]);


  useEffect(() => {
      if(!isPlaying && manualTime === null && settings.solidFinal && logoFrontRef.current) {
           const chars = logoFrontRef.current.children;
           for(let i=0; i<chars.length; i++) {
               const el = chars[i] as HTMLElement;
               el.style.backgroundImage = 'none';
               el.style.color = settings.textColor;
               el.style.backgroundColor = 'transparent'; 
           }
      }
  }, [isPlaying, settings.solidFinal, settings.textColor, manualTime]);

  const showSlots = settings.slotEffect && (isPlaying || typeof manualTime === 'number');

  return (
    <div id="intro-stage" className="relative w-full aspect-video bg-white overflow-hidden flex items-center justify-center perspective-[1000px] shadow-2xl">
      <div 
        className="absolute inset-0 bg-cover bg-center z-0" 
        style={{ 
            backgroundImage: settings.bgImage ? `url(${settings.bgImage})` : 'none', 
            opacity: 1,
            filter: `blur(${settings.bgBlur}px)`
        }} 
      />
      <div className="absolute inset-0 z-[5] bg-black pointer-events-none" style={{ opacity: settings.bgDimmer }} />
      {settings.halftone && (
        <div className="absolute inset-0 z-[15] pointer-events-none opacity-30 bg-[radial-gradient(circle,#000_1px,transparent_1.2px)] [background-size:4px_4px]" />
      )}

      <div 
        ref={containerRef}
        id="intro-container"
        className="w-full h-full flex flex-col justify-center items-center transform-style-3d transition-transform ease-out duration-100 relative z-20"
      >
         <div className="relative transform-style-3d inline-block">
            <div 
                ref={logoShadowRef}
                className="absolute top-0 left-0 w-full h-full flex justify-center z-[-1] pointer-events-none select-none"
                style={{ 
                    fontFamily: settings.font.split(',')[0].replace(/['"]/g, ''), 
                    fontSize: `${settings.textSize}vw`,
                    letterSpacing: `${settings.spacing}em`,
                    color: 'transparent',
                    textShadow: shadowStyle
                }}
            >
                {showSlots ? (
                    settings.text.split('').map((char, i) => (
                        <span key={i} className="inline-block px-[0.1em]">{char}</span>
                    ))
                ) : (
                    <span className="block px-[0.1em] text-center whitespace-nowrap leading-none">{settings.text}</span>
                )}
            </div>

            <div 
                ref={logoFrontRef}
                className="relative z-[2] flex justify-center select-none"
                style={{
                    fontFamily: settings.font.split(',')[0].replace(/['"]/g, ''),
                    fontSize: `${settings.textSize}vw`,
                    letterSpacing: `${settings.spacing}em`,
                    color: settings.textColor,
                    backgroundColor: showSlots ? 'transparent' : bgRgba,
                }}
            >
                {showSlots ? (
                    settings.text.split('').map((char, i) => (
                         <span key={i} className="inline-block px-[0.1em] bg-no-repeat bg-center">{char}</span>
                    ))
                ) : (
                     <span className="block px-[0.1em] text-center whitespace-nowrap leading-none">{settings.text}</span>
                )}
            </div>
         </div>

         {settings.subEnabled && (
             <div 
                className="font-bebas text-white uppercase text-center transform-style-3d translate-z-[20px] drop-shadow-md z-30"
                style={{
                    marginTop: `${settings.subMargin}%`,
                    fontSize: `${settings.subSize}vw`,
                    letterSpacing: `${settings.subSpacing}em`
                }}
             >
                {settings.subText}
             </div>
         )}
      </div>

      <div className={`absolute left-0 w-full bg-black z-50 transition-all duration-500 top-0 ${settings.cineBars && (isPlaying || typeof manualTime === 'number') ? 'h-[10%]' : 'h-0'}`} />
      <div className={`absolute left-0 w-full bg-black z-50 transition-all duration-500 bottom-0 ${settings.cineBars && (isPlaying || typeof manualTime === 'number') ? 'h-[10%]' : 'h-0'}`} />
    </div>
  );
};