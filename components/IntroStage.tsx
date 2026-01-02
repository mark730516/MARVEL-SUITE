import React, { useEffect, useRef, useMemo, useState } from 'react';
import { IntroSettings, IntroAsset, CharMapping } from '../types';

interface IntroStageProps {
  settings: IntroSettings;
  onUpdateSettings: (vals: Partial<IntroSettings>) => void;
  assets: IntroAsset[];
  mappings: CharMapping[]; // We use this for the slot machine finish state
  isPlaying: boolean;
  manualTime?: number | null; // For manual rendering/exporting
  progress: number; // 0 to 1, or driven internally if playing
  onFinish?: () => void;
}

export const IntroStage: React.FC<IntroStageProps> = ({ settings, onUpdateSettings, assets, mappings, isPlaying, manualTime, onFinish }) => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const logoFrontRef = useRef<HTMLDivElement>(null);
  const logoShadowRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  
  const [scale, setScale] = useState(1);

  // Auto-scale logic to fit 1920x1080 into the parent container
  useEffect(() => {
    const handleResize = () => {
        if (wrapperRef.current) {
            const { clientWidth, clientHeight } = wrapperRef.current;
            const targetW = 1920;
            const targetH = 1080;
            
            const scaleX = clientWidth / targetW;
            const scaleY = clientHeight / targetH;
            
            // Fit contain
            setScale(Math.min(scaleX, scaleY));
        }
    };

    handleResize();
    const observer = new ResizeObserver(handleResize);
    if (wrapperRef.current) observer.observe(wrapperRef.current);

    return () => observer.disconnect();
  }, []);

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

  // --- 3D Tilt Logic (Drag to Rotate) ---
  const [isDragging, setIsDragging] = useState(false);
  // We use a ref for the visual state during drag to prevent React render lag
  const tiltRef = useRef({ x: settings.tiltAngleX, y: settings.tiltAngleY });

  // Sync ref with settings if settings change externally (e.g. Reset button)
  useEffect(() => {
      if (!isDragging) {
          tiltRef.current = { x: settings.tiltAngleX, y: settings.tiltAngleY };
      }
  }, [settings.tiltAngleX, settings.tiltAngleY, isDragging]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    if (!settings.tilt) {
        container.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg)';
        return;
    }

    let rafId: number;
    
    if (settings.tiltAuto) {
        // Auto Float Mode (Sine Wave)
        const startTime = Date.now();
        const animateTilt = () => {
            const t = (Date.now() - startTime) * 0.001;
            const rotX = Math.sin(t * 0.5) * 5; 
            const rotY = Math.cos(t * 0.3) * 5;
            container.style.transform = `perspective(1000px) rotateX(${rotX}deg) rotateY(${rotY}deg)`;
            rafId = requestAnimationFrame(animateTilt);
        };
        animateTilt();
    } else {
        // Manual / Stored Mode
        const animateManual = () => {
            container.style.transform = `perspective(1000px) rotateX(${tiltRef.current.x}deg) rotateY(${tiltRef.current.y}deg)`;
            rafId = requestAnimationFrame(animateManual);
        };
        animateManual();

        // Mouse Event Handlers for Dragging
        const handleMouseDown = (e: MouseEvent) => {
            if(settings.tilt && !settings.tiltAuto) {
                // Only enable drag if clicked inside the stage (or container)
                if (container.contains(e.target as Node)) {
                    setIsDragging(true);
                    e.preventDefault(); // Prevent text selection
                }
            }
        };

        const handleMouseMove = (e: MouseEvent) => {
            if (!isDragging) return;
            
            // Adjust sensitivity here
            const sensitivity = 0.5;
            tiltRef.current.y += e.movementX * sensitivity;
            tiltRef.current.x -= e.movementY * sensitivity;
            
            // Limit angles slightly to prevent flipping? Optional.
            tiltRef.current.x = Math.max(-60, Math.min(60, tiltRef.current.x));
            tiltRef.current.y = Math.max(-60, Math.min(60, tiltRef.current.y));
        };

        const handleMouseUp = () => {
            if (isDragging) {
                setIsDragging(false);
                // Save to global settings on release
                onUpdateSettings({ 
                    tiltAngleX: tiltRef.current.x, 
                    tiltAngleY: tiltRef.current.y 
                });
            }
        };
        
        window.addEventListener('mousedown', handleMouseDown);
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        
        return () => {
            window.removeEventListener('mousedown', handleMouseDown);
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
            cancelAnimationFrame(rafId);
        };
    }

    return () => cancelAnimationFrame(rafId);
  }, [settings.tilt, settings.tiltAuto, isDragging, onUpdateSettings]); // Re-bind if modes change

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

  // Font Size Helpers (Convert % of Canvas Width to PX)
  const mainFontSize = `${(1920 * settings.textSize) / 100}px`;
  const subFontSize = `${(1920 * settings.subSize) / 100}px`;

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
         
         if (map.scale === 100 && !map.fitHeight) {
             charEl.style.backgroundSize = 'cover';
         } else {
             charEl.style.backgroundSize = map.fitHeight ? `auto ${map.scale}%` : `${map.scale}% auto`;
         }
      }
  };

  const applySolidToChar = (charEl: HTMLElement) => {
      charEl.style.backgroundImage = 'none';
      charEl.style.backgroundColor = 'transparent'; // Let container bg show, or handled by parent
      charEl.style.color = settings.textColor;
      charEl.style.webkitBackgroundClip = 'border-box';
      charEl.style.backgroundClip = 'border-box';
  }

  // Animation Loop Logic
  useEffect(() => {
    const isManual = typeof manualTime === 'number';

    if (!isPlaying && !isManual) {
        // --- IDLE / STOPPED STATE ---
        if(logoFrontRef.current) {
            // Ensure no animation transform residue
            logoFrontRef.current.style.transform = `translateY(${settings.offsetY}px) scale(1)`;
            logoFrontRef.current.style.transition = 'none';

            if (settings.endStyle === 'image') {
                 // Frozen Image Mode
                 const chars = logoFrontRef.current.children;
                 for(let i=0; i<chars.length; i++) {
                     const charEl = chars[i] as HTMLElement;
                     const map = mappings[i] || { imgId: null, scale: 100, x: 0, y: 0, fitHeight: false, duration: 0 };
                     const asset = assets.find(a => a.id === map.imgId) || assets[0];
                     
                     if (asset) {
                         applyBackgroundToChar(charEl, asset.url, map);
                         charEl.style.backgroundColor = 'transparent'; 
                     } else {
                         applySolidToChar(charEl);
                         charEl.style.backgroundColor = bgRgba;
                     }
                 }
            } else {
                 // Solid Color Mode
                 const chars = logoFrontRef.current.children;
                 for(let i=0; i<chars.length; i++) {
                     applySolidToChar(chars[i] as HTMLElement);
                 }
                 logoFrontRef.current.style.backgroundColor = bgRgba;
                 logoFrontRef.current.style.color = settings.textColor;
            }
        }
        if(logoShadowRef.current) {
            logoShadowRef.current.style.transform = `translateY(${settings.offsetY}px) scale(1)`;
            logoShadowRef.current.style.transition = 'none';
        }
        return;
    }

    // --- SHARED RENDER LOGIC (Manual & Playing) ---
    const renderFrame = (t: number) => {
        // 1. Calculate Scale based on Phase 1 progress (0 -> settings.duration)
        const startS = settings.startScale / 100;
        const scaleProgress = Math.min(Math.max(t / settings.duration, 0), 1);
        const currentScale = startS + (1 - startS) * scaleProgress;
        const transform = `translateY(${settings.offsetY}px) scale(${currentScale})`;

        if(logoFrontRef.current) {
            logoFrontRef.current.style.transition = 'none'; // DISABLE CSS TRANSITION
            logoFrontRef.current.style.transform = transform;
        }
        if(logoShadowRef.current) {
            logoShadowRef.current.style.transition = 'none'; // DISABLE CSS TRANSITION
            logoShadowRef.current.style.transform = transform;
        }

        // 2. Handle Text Content (Solid vs Images)
        const isPhase1 = t < settings.duration;

        if (settings.slotEffect) {
            const chars = logoFrontRef.current?.children;
            if (chars) {
                // If we are in Phase 1 AND startStyle is 'solid', enforce solid text
                if (isPhase1 && settings.startStyle === 'solid') {
                     // Force Solid Appearance
                     for (let i = 0; i < chars.length; i++) {
                         const charEl = chars[i] as HTMLElement;
                         if (charEl.style.backgroundImage !== 'none') {
                             applySolidToChar(charEl);
                         }
                     }
                     // Container BG should be active
                     if (logoFrontRef.current) {
                         logoFrontRef.current.style.backgroundColor = bgRgba;
                     }
                } 
                else {
                    // Running Slot Machine Logic
                    if (logoFrontRef.current) logoFrontRef.current.style.backgroundColor = 'transparent'; // Hide container bg, use span bgs

                    for (let i = 0; i < chars.length; i++) {
                        const charEl = chars[i] as HTMLElement;
                        const map = mappings[i] || { imgId: null, scale: 100, x: 0, y: 0, fitHeight: false, duration: settings.duration + (i * settings.stagger) };
                        const lockTime = map.duration;
                        
                        if (t > lockTime) {
                            // Phase 3/4: Locked
                            if (!charEl.dataset.locked || isManual) { // In manual mode, always re-apply
                                charEl.dataset.locked = "true";
                                const asset = assets.find(a => a.id === map.imgId) || assets[0];
                                if (asset) applyBackgroundToChar(charEl, asset.url, map);
                            }
                        } else {
                             // Phase 2: Slotting
                             // Only update if enough time passed since last update (for RAF) or if Manual (always update)
                             // Note: For smooth manual scrubbing, we might want consistent randomness based on T.
                             // For now, we use T to seed the choice in manual mode roughly.
                             
                             if (isManual) {
                                 const randomAsset = assets[Math.floor((t % (assets.length * 100)) / 100 * assets.length)] || assets[0];
                                 if(randomAsset) applyBackgroundToChar(charEl, randomAsset.url, null, true, t, settings.jitter);
                             } else {
                                 // RAF Mode: controlled by speed
                                 const lastFlash = parseInt(charEl.dataset.lastFlash || '0');
                                 if (t - lastFlash > settings.speed) {
                                     const randomAsset = assets[Math.floor(Math.random() * assets.length)];
                                     if(randomAsset) applyBackgroundToChar(charEl, randomAsset.url, null, true, t, settings.jitter);
                                     charEl.dataset.lastFlash = t.toString();
                                 }
                             }
                        }
                    }
                }
            }
        }
    }

    // MANUAL MODE
    if (isManual && manualTime !== undefined && manualTime !== null) {
        renderFrame(manualTime);
        return;
    }

    // PLAYING MODE (RAF)
    let rafId: number;
    let startTime = Date.now();
    
    // Clear locked state on start
    if(logoFrontRef.current) {
        const chars = logoFrontRef.current.children;
        for(let i=0; i<chars.length; i++) (chars[i] as HTMLElement).dataset.locked = "";
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

      renderFrame(elapsed);
      rafId = requestAnimationFrame(animate);
    };

    rafId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(rafId);
    };
  }, [isPlaying, settings, assets, mappings, bgRgba, manualTime]);

  // Determine if we are in "Slot Mode" visually (individual spans)
  // This depends on: Playing OR Manual OR (Idle AND EndStyle is Image)
  const showSlots = settings.slotEffect && (isPlaying || typeof manualTime === 'number' || settings.endStyle === 'image');

  return (
    <div ref={wrapperRef} className="w-full h-full flex items-center justify-center bg-black/10 overflow-hidden relative">
        <div 
            id="intro-stage" 
            className={`relative bg-white overflow-hidden flex items-center justify-center shadow-2xl ${settings.tilt && !settings.tiltAuto ? 'cursor-grab active:cursor-grabbing' : ''}`}
            style={{
                width: 1920,
                height: 1080,
                transform: `scale(${scale})`,
                // Force hardware acceleration for smoother scaling
                backfaceVisibility: 'hidden',
                willChange: 'transform',
            }}
        >
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
            className="w-full h-full flex flex-col justify-center items-center transition-transform ease-out duration-100 relative z-20"
            style={{ transformStyle: 'preserve-3d' }}
        >
            <div className="relative inline-block" style={{ transformStyle: 'preserve-3d' }}>
                <div 
                    ref={logoShadowRef}
                    className="absolute top-0 left-0 w-full h-full flex justify-center z-[-1] pointer-events-none select-none"
                    style={{ 
                        fontFamily: settings.font.split(',')[0].replace(/['"]/g, ''), 
                        fontSize: mainFontSize,
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
                        fontSize: mainFontSize,
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
                    className="font-bebas text-white uppercase text-center drop-shadow-md z-30"
                    style={{
                        marginTop: `${settings.subMargin}%`,
                        fontSize: subFontSize,
                        letterSpacing: `${settings.subSpacing}em`,
                        transform: 'translateZ(20px)'
                    }}
                >
                    {settings.subText}
                </div>
            )}
        </div>

        <div className={`absolute left-0 w-full bg-black z-50 transition-all duration-500 top-0 ${settings.cineBars && (isPlaying || typeof manualTime === 'number') ? 'h-[10%]' : 'h-0'}`} />
        <div className={`absolute left-0 w-full bg-black z-50 transition-all duration-500 bottom-0 ${settings.cineBars && (isPlaying || typeof manualTime === 'number') ? 'h-[10%]' : 'h-0'}`} />
        </div>
    </div>
  );
};