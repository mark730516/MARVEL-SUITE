
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
  cinemaMode?: boolean;
}

const easeOutExpo = (x: number): number => {
  return x === 1 ? 1 : 1 - Math.pow(2, -10 * x);
};

export const IntroStage: React.FC<IntroStageProps> = ({ 
  settings, onUpdateSettings, assets, mappings, isPlaying, manualTime, onFinish, isWireframe = false, cinemaMode 
}) => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const logoFrontRef = useRef<HTMLDivElement>(null);
  const logoShadowRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const rafVisualizerRef = useRef<number | null>(null);
  const [scaleFactor, setScaleFactor] = useState(1);
  const bassBoostRef = useRef(1);

  // 視窗自適應縮放
  useEffect(() => {
    const handleResize = () => {
        if (wrapperRef.current) {
            const { clientWidth, clientHeight } = wrapperRef.current;
            setScaleFactor(Math.min(clientWidth / 1920, clientHeight / 1080));
        }
    };
    handleResize();
    const obs = new ResizeObserver(handleResize);
    if (wrapperRef.current) obs.observe(wrapperRef.current);
    window.addEventListener('resize', handleResize);
    return () => { obs.disconnect(); window.removeEventListener('resize', handleResize); };
  }, [cinemaMode]);

  // 音效處理與視覺化連動
  useEffect(() => {
    if (settings.audioUrl && isPlaying && manualTime === null) {
      if (!audioRef.current) { audioRef.current = new Audio(settings.audioUrl); }
      const audio = audioRef.current;
      audio.volume = settings.volume;
      audio.play().catch(() => {});
    } else {
      if (audioRef.current) { 
        audioRef.current.pause(); 
        audioRef.current.currentTime = 0; 
      }
    }
  }, [isPlaying, settings.audioUrl, settings.volume, manualTime]);

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
          return { backgroundImage: settings.sceneBgGradientDir === 'radial' 
            ? `radial-gradient(circle, ${settings.sceneBgColor}, ${settings.sceneBgColor2})` 
            : `linear-gradient(${settings.sceneBgGradientDir}, ${settings.sceneBgColor}, ${settings.sceneBgColor2})` };
      }
      return { backgroundColor: settings.sceneBgColor };
  }, [settings.sceneBgType, settings.sceneBgColor, settings.sceneBgColor2, settings.sceneBgGradientDir]);

  const mainFontSize = `${(1920 * settings.textSize) / 100}px`;
  const subFontSize = `${(1920 * settings.subSize) / 100}px`;

  useEffect(() => {
    const isManual = typeof manualTime === 'number';
    if (!isPlaying && !isManual) return;

    const renderFrame = (t: number) => {
        const startS = settings.startScale / 100;
        const easedProgress = easeOutExpo(Math.min(Math.max(t / settings.zoomDuration, 0), 1));
        const currentScale = (startS + (1 - startS) * easedProgress) * bassBoostRef.current;
        const transform = `translateY(${settings.offsetY}px) scale(${currentScale})`;

        if(logoFrontRef.current) logoFrontRef.current.style.transform = transform;
        if(logoShadowRef.current) logoShadowRef.current.style.transform = transform;

        const spinStartTime = settings.solidBaseDuration;
        const spinEndTime = spinStartTime + settings.duration;

        if (logoFrontRef.current) {
            const chars = logoFrontRef.current.children;
            
            for (let i = 0; i < chars.length; i++) {
                const charEl = chars[i] as HTMLElement;
                const charStopTime = spinEndTime + (i * settings.stagger);
                const map = mappings[i] || { char: '', imgId: null, scale: 100, x: 0, y: 0, fitHeight: false, duration: 0 };

                // Phase 1: 起始純色
                if (t < spinStartTime) {
                    charEl.style.color = settings.textColor;
                    charEl.style.backgroundImage = 'none';
                    charEl.style.webkitBackgroundClip = 'initial';
                } 
                // Phase 3 & 4: 逐字停止與定格
                else if (t >= charStopTime) {
                    if (settings.endStyle === 'solid') {
                        charEl.style.backgroundImage = 'none';
                        charEl.style.webkitBackgroundClip = 'initial';
                        charEl.style.color = settings.textColor;
                    } else {
                        const asset = assets.find(a => a.id === map.imgId) || assets[0];
                        if (asset) {
                            charEl.style.backgroundImage = `url('${asset.url}')`;
                            charEl.style.webkitBackgroundClip = 'text';
                            charEl.style.color = 'transparent';
                            charEl.style.backgroundRepeat = 'no-repeat';
                            // 對齊參數：確保計算與 IntroControls 預覽一致
                            charEl.style.backgroundSize = map.fitHeight ? `auto ${map.scale}%` : `${map.scale}% auto`;
                            charEl.style.backgroundPosition = `${50 + map.x}% ${50 + map.y}%`;
                        }
                    }
                } 
                // Phase 2: 老虎機或隨機圖片
                else {
                    let assetToUse: IntroAsset | null = null;
                    if (settings.slotEffect) {
                        const seed = Math.floor(t / settings.speed);
                        assetToUse = assets[(seed + i) % assets.length] || assets[0];
                    } else {
                        const slowSeed = Math.floor(t / 200); 
                        assetToUse = assets[(slowSeed + i) % assets.length] || assets[0];
                    }

                    if (assetToUse) {
                        charEl.style.backgroundImage = `url('${assetToUse.url}')`;
                        charEl.style.webkitBackgroundClip = 'text';
                        charEl.style.color = 'transparent';
                        charEl.style.backgroundRepeat = 'no-repeat';
                        charEl.style.backgroundSize = 'cover';
                        charEl.style.backgroundPosition = 'center';
                        
                        if (settings.rimLight > 0) {
                            const flash = Math.sin((t / settings.speed) * Math.PI) * settings.rimLight;
                            charEl.style.filter = `brightness(${1 + flash}) drop-shadow(0 0 ${flash * 10}px white)`;
                        } else {
                            charEl.style.filter = 'none';
                        }
                    }
                }
            }
        }
    }

    if (isManual) { renderFrame(manualTime!); return; }

    const startTime = Date.now();
    const totalDuration = settings.solidBaseDuration + settings.duration + (settings.text.length * settings.stagger) + settings.endHoldDuration;
    let rafId: number;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      if (elapsed > totalDuration) { onFinish?.(); return; }
      renderFrame(elapsed);
      rafId = requestAnimationFrame(animate);
    };
    rafId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafId);
  }, [isPlaying, settings, assets, mappings, manualTime]);

  return (
    <div ref={wrapperRef} className="w-full h-full flex items-center justify-center bg-black overflow-hidden relative">
        <div id="intro-stage" className="relative overflow-hidden flex items-center justify-center" style={{ width: 1920, height: 1080, ...sceneBgStyle, transform: `scale(${scaleFactor})` }}>
            <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: settings.bgImage ? `url(${settings.bgImage})` : 'none', filter: `blur(${settings.bgBlur}px)`, opacity: 1 - settings.bgDimmer }} />
            
            <div className="w-full h-full flex flex-col justify-center items-center relative z-20" style={{ transformStyle: 'preserve-3d' }}>
                <div className="relative inline-block" style={{ transformStyle: 'preserve-3d' }}>
                    <div ref={logoShadowRef} className="absolute top-0 left-0 w-full h-full text-center z-[-1] pointer-events-none select-none whitespace-nowrap px-[0.1em]" style={{ fontFamily: settings.font, fontSize: mainFontSize, letterSpacing: `${settings.spacing}em`, color: 'transparent', textShadow: shadowStyle }}>
                        {settings.text.split('').map((c,i)=>(
                          <span key={i} className="inline-flex items-center justify-center px-[0.1em] -mx-[0.1em]" style={{ lineHeight: 1 }}>{c}</span>
                        ))}
                    </div>
                    <div ref={logoFrontRef} className="relative z-[2] inline-block text-center select-none whitespace-nowrap px-[0.1em]" style={{ fontFamily: settings.font, fontSize: mainFontSize, letterSpacing: `${settings.spacing}em`, backgroundColor: (isPlaying || typeof manualTime === 'number') ? 'transparent' : bgRgba }}>
                        {settings.text.split('').map((char, i) => (
                            <span key={i} className="inline-flex items-center justify-center px-[0.1em] -mx-[0.1em] bg-no-repeat transition-filter duration-75" style={{ lineHeight: 1 }}>{char}</span>
                        ))}
                    </div>
                </div>
                {settings.subEnabled && (
                    <div className="uppercase text-center z-30 font-bebas" style={{ color: settings.subColor, marginTop: `${settings.subMargin}%`, fontSize: subFontSize, letterSpacing: `${settings.subSpacing}em` }}>
                        {settings.subText}
                    </div>
                )}
            </div>
        </div>
    </div>
  );
};
