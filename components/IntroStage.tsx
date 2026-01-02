import React, { useEffect, useRef, useMemo, useState } from 'react';
import { IntroSettings, IntroAsset, CharMapping } from '../types';

interface IntroStageProps {
  settings: IntroSettings;
  onUpdateSettings: (vals: Partial<IntroSettings>) => void;
  assets: IntroAsset[];
  mappings: CharMapping[];
  isPlaying: boolean;
  manualTime?: number | null;
  progress: number;
  onFinish?: () => void;
  isWireframe?: boolean;
}

const easeOutExpo = (x: number): number => {
  return x === 1 ? 1 : 1 - Math.pow(2, -10 * x);
};

export const IntroStage: React.FC<IntroStageProps> = ({ 
  settings, onUpdateSettings, assets, mappings, isPlaying, manualTime, onFinish, isWireframe = false 
}) => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const logoFrontRef = useRef<HTMLDivElement>(null);
  const logoShadowRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  
  const [scale, setScale] = useState(1);

  // Auto-scale
  useEffect(() => {
    const handleResize = () => {
        if (wrapperRef.current) {
            const { clientWidth, clientHeight } = wrapperRef.current;
            setScale(Math.min(clientWidth / 1920, clientHeight / 1080));
        }
    };
    handleResize();
    const observer = new ResizeObserver(handleResize);
    if (wrapperRef.current) observer.observe(wrapperRef.current);
    return () => observer.disconnect();
  }, []);

  // Audio
  useEffect(() => {
    if (settings.audioUrl && isPlaying && manualTime === null) {
      if (!audioRef.current) audioRef.current = new Audio(settings.audioUrl);
      else if (audioRef.current.src !== settings.audioUrl) audioRef.current.src = settings.audioUrl;
      
      audioRef.current.volume = settings.volume;
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
    } else if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  }, [isPlaying, settings.audioUrl, settings.volume, manualTime]);

  // Tilt Logic
  const [isDragging, setIsDragging] = useState(false);
  const tiltRef = useRef({ x: settings.tiltAngleX, y: settings.tiltAngleY });

  useEffect(() => {
      if (!isDragging) tiltRef.current = { x: settings.tiltAngleX, y: settings.tiltAngleY };
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
        const animateManual = () => {
            container.style.transform = `perspective(1000px) rotateX(${tiltRef.current.x}deg) rotateY(${tiltRef.current.y}deg)`;
            rafId = requestAnimationFrame(animateManual);
        };
        animateManual();
        const handleMouseDown = (e: MouseEvent) => {
            if(settings.tilt && !settings.tiltAuto && container.contains(e.target as Node)) {
                setIsDragging(true); e.preventDefault();
            }
        };
        const handleMouseMove = (e: MouseEvent) => {
            if (!isDragging) return;
            tiltRef.current.y += e.movementX * 0.5;
            tiltRef.current.x -= e.movementY * 0.5;
            tiltRef.current.x = Math.max(-60, Math.min(60, tiltRef.current.x));
            tiltRef.current.y = Math.max(-60, Math.min(60, tiltRef.current.y));
        };
        const handleMouseUp = () => {
            if (isDragging) {
                setIsDragging(false);
                onUpdateSettings({ tiltAngleX: tiltRef.current.x, tiltAngleY: tiltRef.current.y });
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
  }, [settings.tilt, settings.tiltAuto, isDragging, onUpdateSettings]);

  // Styling
  const bgRgba = useMemo(() => {
    const hex = settings.bgColor;
    const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${settings.bgOpacity})`;
  }, [settings.bgColor, settings.bgOpacity]);

  const shadowStyle = useMemo(() => {
    if (isWireframe) return 'none';
    let s = settings.glow > 0 ? `0 0 ${settings.glow}px ${settings.shadowColor}` : '';
    if (settings.depth > 0) {
      const layers = Array.from({ length: settings.depth }, (_, i) => `${i + 1}px ${i + 1}px 0 ${settings.shadowColor}`);
      s = s ? `${s}, ${layers.join(',')}` : layers.join(',');
    }
    return s || 'none';
  }, [settings.depth, settings.glow, settings.shadowColor, isWireframe]);

  const sceneBgStyle = useMemo(() => {
      if (settings.sceneBgType === 'gradient') {
          if (settings.sceneBgGradientDir === 'radial') {
              return { backgroundImage: `radial-gradient(circle, ${settings.sceneBgColor}, ${settings.sceneBgColor2})` };
          }
          return { backgroundImage: `linear-gradient(${settings.sceneBgGradientDir}, ${settings.sceneBgColor}, ${settings.sceneBgColor2})` };
      }
      return { backgroundColor: settings.sceneBgColor };
  }, [settings.sceneBgType, settings.sceneBgColor, settings.sceneBgColor2, settings.sceneBgGradientDir]);

  const mainFontSize = `${(1920 * settings.textSize) / 100}px`;
  const subFontSize = `${(1920 * settings.subSize) / 100}px`;

  // --- Rendering Helpers ---
  const applyWireframeToChar = (charEl: HTMLElement, active: boolean) => {
      charEl.style.backgroundImage = 'none';
      charEl.style.backgroundColor = active ? 'rgba(59, 130, 246, 0.2)' : 'transparent';
      charEl.style.border = active ? '2px solid #3b82f6' : '1px solid #444';
      charEl.style.color = active ? '#3b82f6' : '#666';
      charEl.style.webkitBackgroundClip = 'border-box';
      charEl.style.backgroundClip = 'border-box';
  };

  const applyBackgroundToChar = (charEl: HTMLElement, assetUrl: string, map: CharMapping | null, jiggleMode = false, t = 0, jitterSettings = 0) => {
      if (isWireframe) { applyWireframeToChar(charEl, true); return; }
      charEl.style.border = 'none';
      charEl.style.backgroundImage = `url('${assetUrl}')`;
      charEl.style.color = 'transparent';
      charEl.style.webkitBackgroundClip = 'text';
      charEl.style.backgroundClip = 'text';

      if (jiggleMode) {
         const j = jitterSettings;
         const ox = 50 + (Math.random() * j * 2 - j);
         const oy = 50 + (Math.random() * j * 2 - j);
         charEl.style.backgroundPosition = `${ox}% ${oy}%`;
         charEl.style.backgroundSize = 'cover';
      } else if (map) {
         const ox = 50 + map.x;
         const oy = 50 + map.y;
         charEl.style.backgroundPosition = `${ox}% ${oy}%`;
         charEl.style.backgroundSize = (map.scale === 100 && !map.fitHeight) ? 'cover' : (map.fitHeight ? `auto ${map.scale}%` : `${map.scale}% auto`);
      }
  };

  const applySolidToChar = (charEl: HTMLElement) => {
      if (isWireframe) { applyWireframeToChar(charEl, false); return; }
      charEl.style.border = 'none';
      charEl.style.backgroundImage = 'none';
      charEl.style.backgroundColor = 'transparent';
      charEl.style.color = settings.textColor;
      charEl.style.webkitBackgroundClip = 'border-box';
      charEl.style.backgroundClip = 'border-box';
  }

  // --- Animation Loop ---
  useEffect(() => {
    const isManual = typeof manualTime === 'number';

    if (!isPlaying && !isManual) {
        // --- IDLE STATE ---
        if(logoFrontRef.current) {
            logoFrontRef.current.style.transform = `translateY(${settings.offsetY}px) scale(1)`;
            logoFrontRef.current.style.transition = 'none';
            logoFrontRef.current.style.backgroundColor = 'transparent';
            logoFrontRef.current.style.backgroundImage = 'none'; // Reset parent BG

            const chars = logoFrontRef.current.children;
            for(let i=0; i<chars.length; i++) {
                const charEl = chars[i] as HTMLElement;
                const map = mappings[i] || { imgId: null, scale: 100, x: 0, y: 0, fitHeight: false };
                
                // Idle state respects endStyle
                if (settings.endStyle === 'image') {
                    const asset = assets.find(a => a.id === map.imgId) || assets[0];
                    if (asset) applyBackgroundToChar(charEl, asset.url, map);
                    else applySolidToChar(charEl);
                } else {
                    applySolidToChar(charEl);
                    if (!isWireframe) logoFrontRef.current.style.backgroundColor = bgRgba;
                }
            }
        }
        if(logoShadowRef.current) {
            logoShadowRef.current.style.transform = `translateY(${settings.offsetY}px) scale(1)`;
        }
        return;
    }

    // --- RENDER LOGIC ---
    const renderFrame = (t: number) => {
        // 1. Zoom Logic (Independent)
        const startS = settings.startScale / 100;
        const rawProgress = Math.min(Math.max(t / settings.zoomDuration, 0), 1);
        const easedProgress = easeOutExpo(rawProgress);
        const currentScale = startS + (1 - startS) * easedProgress;
        const transform = `translateY(${settings.offsetY}px) scale(${currentScale})`;

        if(logoFrontRef.current) {
            logoFrontRef.current.style.transition = 'none';
            logoFrontRef.current.style.transform = transform;
        }
        if(logoShadowRef.current) {
            logoShadowRef.current.style.transition = 'none';
            logoShadowRef.current.style.transform = transform;
        }

        // 2. Timeline Logic
        // Phase 1: Solid Base (0 -> solidBaseDuration)
        // Phase 2: Spinning (solidBaseDuration -> solidBaseDuration + duration)
        // Phase 3: Ripple Stop (Spin End + i * stagger -> lock)
        
        const spinStartTime = settings.solidBaseDuration;
        const spinEndTime = spinStartTime + settings.duration;

        if (logoFrontRef.current) {
            const chars = logoFrontRef.current.children;
            
            // Phase 1: Force Solid
            if (t < spinStartTime) {
                if(!isWireframe) {
                    logoFrontRef.current.style.backgroundColor = bgRgba;
                    logoFrontRef.current.style.backgroundImage = 'none';
                    logoFrontRef.current.style.webkitBackgroundClip = 'border-box';
                    logoFrontRef.current.style.backgroundClip = 'border-box';
                }
                for (let i = 0; i < chars.length; i++) {
                     const charEl = chars[i] as HTMLElement;
                     // Only re-apply if it's not already solid to save perf
                     if (charEl.dataset.state !== 'solid') {
                         applySolidToChar(charEl);
                         charEl.dataset.state = 'solid';
                     }
                }
            } else {
                // Phase 2 & 3: Slotting
                // Handle UNIFIED MASK Logic (Apply bg to parent) or INDEPENDENT Logic (Apply bg to children)
                const seed = Math.floor(t / settings.speed);
                const lastSeed = parseInt(logoFrontRef.current.dataset.lastSeed || '-1');

                if (!settings.independentRoll && !isWireframe) {
                    // UNIFIED MODE: Apply background to Parent Container for single continuous image
                    if (seed !== lastSeed) {
                        const asset = assets[seed % assets.length] || assets[0];
                        if (asset) {
                            logoFrontRef.current.style.backgroundColor = 'transparent';
                            logoFrontRef.current.style.backgroundImage = `url('${asset.url}')`;
                            logoFrontRef.current.style.backgroundSize = 'cover';
                            logoFrontRef.current.style.backgroundPosition = 'center';
                            logoFrontRef.current.style.color = 'transparent';
                            logoFrontRef.current.style.webkitBackgroundClip = 'text';
                            logoFrontRef.current.style.backgroundClip = 'text';
                        }
                        logoFrontRef.current.dataset.lastSeed = seed.toString();
                    }
                } else {
                    // INDEPENDENT or WIREFRAME: Clear parent background
                     logoFrontRef.current.style.backgroundColor = 'transparent';
                     logoFrontRef.current.style.backgroundImage = 'none';
                }

                for (let i = 0; i < chars.length; i++) {
                    const charEl = chars[i] as HTMLElement;
                    const charStopTime = spinEndTime + (i * settings.stagger);
                    const map = mappings[i] || { imgId: null, scale: 100, x: 0, y: 0, fitHeight: false };

                    if (t >= charStopTime) {
                        // LOCKED (Phase 3 Complete for this char)
                        if (charEl.dataset.state !== 'locked' || isManual) {
                            const asset = assets.find(a => a.id === map.imgId) || assets[0];
                            if (asset) applyBackgroundToChar(charEl, asset.url, map);
                            charEl.dataset.state = 'locked';
                        }
                    } else {
                        // SPINNING (Phase 2 or waiting for ripple in Phase 3)
                        
                        // If Unified Mode, we want the child to be transparent so parent bg shows through
                        if (!settings.independentRoll && !isWireframe) {
                            charEl.style.backgroundImage = 'none';
                            charEl.style.backgroundColor = 'transparent';
                            charEl.style.color = 'transparent'; // Parent has bg-clip:text, so child text cuts it out
                        } else {
                            // Independent Mode: Randomize per character
                            // Use determinstic jitter for manual preview, random for play
                            const charSeed = seed + (i * 3); // Different per char
                            const lastCharSeed = parseInt(charEl.dataset.lastSeed || '-1');
                            
                            if (seed !== lastCharSeed) {
                                const randomAsset = assets[charSeed % assets.length] || assets[0];
                                if (randomAsset) applyBackgroundToChar(charEl, randomAsset.url, null, true, t, settings.jitter);
                                charEl.dataset.lastSeed = seed.toString();
                                charEl.dataset.state = 'spinning';
                            }
                        }
                    }
                }
            }
        }
    }

    if (isManual && manualTime !== undefined && manualTime !== null) {
        renderFrame(manualTime);
        return;
    }

    let rafId: number;
    let startTime = Date.now();
    
    // Total Duration = Solid + Spin + Ripple + EndHold
    const totalDuration = settings.solidBaseDuration + settings.duration + (settings.text.length * settings.stagger) + settings.endHoldDuration;

    const animate = () => {
      const now = Date.now();
      const elapsed = now - startTime;
      
      if (elapsed > totalDuration) {
        onFinish?.();
        return;
      }
      renderFrame(elapsed);
      rafId = requestAnimationFrame(animate);
    };

    rafId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafId);
  }, [isPlaying, settings, assets, mappings, bgRgba, manualTime, isWireframe]);

  const showSlots = settings.slotEffect; // Always use slot structure in DOM to allow seamless switching

  return (
    <div ref={wrapperRef} className="w-full h-full flex items-center justify-center bg-black/10 overflow-hidden relative">
        <div 
            id="intro-stage" 
            className={`relative overflow-hidden flex items-center justify-center shadow-2xl ${settings.tilt && !settings.tiltAuto ? 'cursor-grab active:cursor-grabbing' : ''}`}
            style={{
                width: 1920, height: 1080,
                ...sceneBgStyle,
                transform: `scale(${scale})`,
                backfaceVisibility: 'hidden', willChange: 'transform',
            }}
        >
        {isWireframe ? (
            <div className="absolute inset-0 bg-[#0a0a0a] z-0">
                <div className="w-full h-full opacity-20 bg-[linear-gradient(to_right,#333_1px,transparent_1px),linear-gradient(to_bottom,#333_1px,transparent_1px)] [background-size:40px_40px]"></div>
            </div>
        ) : (
            <>
                <div className="absolute inset-0 bg-cover bg-center z-0" style={{ backgroundImage: settings.bgImage ? `url(${settings.bgImage})` : 'none', opacity: 1, filter: `blur(${settings.bgBlur}px)` }} />
                <div className="absolute inset-0 z-[5] bg-black pointer-events-none" style={{ opacity: settings.bgDimmer }} />
                {settings.halftone && <div className="absolute inset-0 z-[15] pointer-events-none opacity-30 bg-[radial-gradient(circle,#000_1px,transparent_1.2px)] [background-size:4px_4px]" />}
            </>
        )}

        <div ref={containerRef} id="intro-container" className="w-full h-full flex flex-col justify-center items-center relative z-20" style={{ transformStyle: 'preserve-3d' }}>
            <div className="relative inline-block" style={{ transformStyle: 'preserve-3d' }}>
                <div ref={logoShadowRef} className="absolute top-0 left-0 w-full h-full text-center z-[-1] pointer-events-none select-none whitespace-nowrap px-[0.1em]" style={{ fontFamily: settings.font.split(',')[0].replace(/['"]/g, ''), fontSize: mainFontSize, letterSpacing: `${settings.spacing}em`, color: 'transparent', textShadow: shadowStyle }}>
                    {settings.text.split('').map((c,i)=><span key={i} className="inline-block px-[0.1em] -mx-[0.1em]">{c}</span>)}
                </div>

                <div ref={logoFrontRef} className="relative z-[2] inline-block text-center select-none whitespace-nowrap px-[0.1em]" style={{ fontFamily: settings.font.split(',')[0].replace(/['"]/g, ''), fontSize: mainFontSize, letterSpacing: `${settings.spacing}em`, color: isWireframe ? '#444' : settings.textColor, backgroundColor: (isPlaying || isWireframe) ? 'transparent' : bgRgba }}>
                    {settings.text.split('').map((char, i) => (
                        <span key={i} className="inline-block px-[0.1em] -mx-[0.1em] bg-no-repeat bg-center" data-state="init">{char}</span>
                    ))}
                </div>
            </div>
            {settings.subEnabled && (
                <div className="font-bebas text-white uppercase text-center drop-shadow-md z-30" style={{ marginTop: `${settings.subMargin}%`, fontSize: subFontSize, letterSpacing: `${settings.subSpacing}em`, transform: 'translateZ(20px)', color: isWireframe ? '#aaa' : '#fff' }}>
                    {settings.subText}
                </div>
            )}
        </div>
        {!isWireframe && (
            <>
                <div className={`absolute left-0 w-full bg-black z-50 transition-all duration-500 top-0 ${settings.cineBars && (isPlaying || typeof manualTime === 'number') ? 'h-[10%]' : 'h-0'}`} />
                <div className={`absolute left-0 w-full bg-black z-50 transition-all duration-500 bottom-0 ${settings.cineBars && (isPlaying || typeof manualTime === 'number') ? 'h-[10%]' : 'h-0'}`} />
            </>
        )}
        </div>
    </div>
  );
};