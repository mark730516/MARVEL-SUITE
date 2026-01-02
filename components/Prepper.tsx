import React, { useState, useRef, useEffect, useCallback } from 'react';
import { PrepperImage } from '../types';
import { ControlGroup, RangeControl, CheckboxControl, Button, TextInput, Select } from './Controls';
import { FONTS } from '../constants';

interface PrepperProps {
  onTransfer: (assets: { url: string }[], text: string, font: string) => void;
  font: string;
}

const CANVAS_WIDTH = 1920;
const CANVAS_HEIGHT = 1080;

// Filter Presets
const FILTER_PRESETS = [
    { label: '標準 (Reset)', settings: { brightness: 1, contrast: 1, saturate: 1, vignette: 0 } },
    { label: '黑白 (Noir)', settings: { brightness: 1.1, contrast: 1.3, saturate: 0, vignette: 0.4 } },
    { label: '動作 (Action)', settings: { brightness: 1.05, contrast: 1.2, saturate: 1.3, vignette: 0.2 } },
    { label: '復古 (Vintage)', settings: { brightness: 1.1, contrast: 0.9, saturate: 0.6, vignette: 0.3 } },
];

const ASPECT_RATIOS = [
    { label: '無 (None)', value: 0 },
    { label: '9:16 (IG Reel)', value: 9/16 },
    { label: '4:5 (IG Post)', value: 4/5 },
    { label: '1:1 (Square)', value: 1 },
    { label: '2.35:1 (Cinema)', value: 2.35 },
];

export const Prepper: React.FC<PrepperProps> = ({ onTransfer, font }) => {
  const [images, setImages] = useState<PrepperImage[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [maskText, setMaskText] = useState('MARVEL');
  const [maskSize, setMaskSize] = useState(15);
  const [showMask, setShowMask] = useState(true);
  const [slotMode, setSlotMode] = useState(true);
  const [selectedFont, setSelectedFont] = useState(font);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Grid & Guides State
  const [showGrid, setShowGrid] = useState(false);
  const [gridType, setGridType] = useState<'thirds' | 'cross'>('thirds');
  const [safeAreaRatio, setSafeAreaRatio] = useState<number>(0);
  const [snapActiveX, setSnapActiveX] = useState(false);
  const [snapActiveY, setSnapActiveY] = useState(false);

  // Interaction State
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef<{x: number, y: number} | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Helper to calculate initial settings based on dimensions
  const calculateSettings = (w: number, h: number) => {
    const isPort = h > w;
    let scale = 1;
    if (isPort) {
        scale = CANVAS_HEIGHT / h;
    } else {
        scale = Math.max(CANVAS_WIDTH / w, CANVAS_HEIGHT / h);
    }
    
    return {
      scale: scale,
      x: 0,
      y: 0,
      rotation: 0,
      blur: isPort,
      brightness: 1,
      contrast: 1,
      saturate: 1,
      vignette: 0,
    };
  };

  const getAspectRatioLabel = (w: number, h: number) => {
    const r = w / h;
    let label = "自訂";
    if (Math.abs(r - 1.77) < 0.05) label = "16:9 (橫向)";
    else if (Math.abs(r - 1.33) < 0.05) label = "4:3 (橫向)";
    else if (Math.abs(r - 1.0) < 0.05) label = "1:1 (正方)";
    else if (Math.abs(r - 0.56) < 0.05) label = "9:16 (直向)";
    else if (Math.abs(r - 0.75) < 0.05) label = "3:4 (直向)";
    else label = r > 1 ? "橫向" : "直向";
    return `${label} [${r.toFixed(2)}]`;
  };

  const processImageFile = (file: File): Promise<{ src: string, width: number, height: number, name: string }> => {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                let w = img.width;
                let h = img.height;
                let finalUrl = e.target?.result as string;

                if (w > 1920) {
                    const scale = 1920 / w;
                    const newW = 1920;
                    const newH = Math.round(h * scale);
                    
                    const canvas = document.createElement('canvas');
                    canvas.width = newW;
                    canvas.height = newH;
                    const ctx = canvas.getContext('2d');
                    if (ctx) {
                        ctx.drawImage(img, 0, 0, newW, newH);
                        finalUrl = canvas.toDataURL('image/jpeg', 0.95);
                        w = newW;
                        h = newH;
                    }
                }

                resolve({
                    src: finalUrl,
                    width: w,
                    height: h,
                    name: file.name
                });
            };
            img.src = e.target?.result as string;
        };
        reader.readAsDataURL(file);
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    setIsProcessing(true);
    
    const newImages: PrepperImage[] = [];
    
    for (let i = 0; i < e.target.files.length; i++) {
      const file = e.target.files[i];
      if (!file.type.startsWith('image/')) continue;

      const processed = await processImageFile(file);
      const settings = calculateSettings(processed.width, processed.height);
      
      newImages.push({
        id: Math.random().toString(36).substr(2, 9),
        name: processed.name,
        src: processed.src,
        originalWidth: processed.width,
        originalHeight: processed.height,
        settings
      });
    }

    setImages(prev => [...prev, ...newImages]);
    if (!activeId && newImages.length > 0) setActiveId(newImages[0].id);
    setIsProcessing(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const updateSetting = useCallback((key: keyof PrepperImage['settings'], value: number | boolean) => {
    setActiveId(curr => {
        if (!curr) return null;
        setImages(prev => prev.map(img => 
          img.id === curr ? { ...img, settings: { ...img.settings, [key]: value } } : img
        ));
        return curr;
    });
  }, []);

  const batchUpdateSettings = useCallback((newSettings: Partial<PrepperImage['settings']>) => {
    setActiveId(curr => {
        if (!curr) return null;
        setImages(prev => prev.map(img => 
          img.id === curr ? { ...img, settings: { ...img.settings, ...newSettings } } : img
        ));
        return curr;
    });
  }, []);

  // --- Interaction Logic (Mouse Drag & Wheel) ---
  const getMousePos = (e: React.MouseEvent | MouseEvent | React.WheelEvent) => {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return { x: 0, y: 0 };
      const scaleX = CANVAS_WIDTH / rect.width;
      const scaleY = CANVAS_HEIGHT / rect.height;
      return {
          x: (e.clientX - rect.left) * scaleX,
          y: (e.clientY - rect.top) * scaleY
      };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
      if (!activeId) return;
      setIsDragging(true);
      dragStart.current = getMousePos(e);
      // Don't auto show grid, let user decide, but show snapping if moving
  };

  const handleMouseMove = (e: React.MouseEvent) => {
      if (!isDragging || !activeId || !dragStart.current) return;
      const currentPos = getMousePos(e);
      const dx = currentPos.x - dragStart.current.x;
      const dy = currentPos.y - dragStart.current.y;
      
      const img = images.find(i => i.id === activeId);
      if (img) {
          let newX = img.settings.x + dx;
          let newY = img.settings.y + dy;
          
          // Smart Snapping
          const SNAP_THRESHOLD = 15;
          let snappedX = false;
          let snappedY = false;

          // Snap to Center X (0)
          if (Math.abs(newX) < SNAP_THRESHOLD) {
              newX = 0;
              snappedX = true;
          }
          
          // Snap to Center Y (0)
          if (Math.abs(newY) < SNAP_THRESHOLD) {
              newY = 0;
              snappedY = true;
          }

          setSnapActiveX(snappedX);
          setSnapActiveY(snappedY);

          updateSetting('x', newX);
          updateSetting('y', newY);
          dragStart.current = currentPos;
      }
  };

  const handleMouseUp = () => {
      setIsDragging(false);
      dragStart.current = null;
      setSnapActiveX(false);
      setSnapActiveY(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
      if (!activeId) return;
      const img = images.find(i => i.id === activeId);
      if (!img) return;

      const pos = getMousePos(e);
      const mx = pos.x;
      const my = pos.y;
      
      // If Alt key is pressed, Rotate instead of Zoom
      if (e.altKey) {
          const rotationStep = 2;
          const delta = e.deltaY > 0 ? rotationStep : -rotationStep;
          let newRot = (img.settings.rotation || 0) + delta;
          if (e.shiftKey) {
             // Snap rotation to 45 deg
             if (Math.abs(newRot % 45) < 5) newRot = Math.round(newRot/45)*45;
          }
          updateSetting('rotation', newRot);
          return;
      }

      const oldScale = img.settings.scale;
      const scaleFactor = 0.001;
      const newScale = Math.max(0.01, Math.min(5, oldScale - (e.deltaY * scaleFactor)));

      // Logic to zoom towards mouse position needs to account for rotation? 
      // Complicated with rotation. Let's simplify: Zoom towards center if rotated?
      // Or just standard zoom logic, assuming user adjusts position.
      // Standard zoom logic works on the computed width/height which are independent of rotation visually for scale calc.
      // However, the displacement calculation `mx - (relX * newW)` assumes axis aligned.
      // For now, let's keep the existing zoom logic. It might feel slightly off if rotated heavily, but it's acceptable.
      
      const w = img.originalWidth * oldScale;
      const h = img.originalHeight * oldScale;
      // Current center
      const cx = (CANVAS_WIDTH - w) / 2 + img.settings.x + w/2; // This is the center point X in canvas space
      const cy = (CANVAS_HEIGHT - h) / 2 + img.settings.y + h/2;

      // Current top-left (unrotated)
      const tl_x = (CANVAS_WIDTH - w) / 2 + img.settings.x;
      const tl_y = (CANVAS_HEIGHT - h) / 2 + img.settings.y;

      // Mouse relative to top-left
      const relX = (mx - tl_x) / w;
      const relY = (my - tl_y) / h;

      const newW = img.originalWidth * newScale;
      const newH = img.originalHeight * newScale;

      const new_tl_x = mx - (relX * newW);
      const new_tl_y = my - (relY * newH);

      const newX = new_tl_x - (CANVAS_WIDTH - newW) / 2;
      const newY = new_tl_y - (CANVAS_HEIGHT - newH) / 2;

      batchUpdateSettings({ scale: newScale, x: newX, y: newY });
  };
  
  const handleDoubleClick = () => {
      if (!activeId) return;
      const img = images.find(i => i.id === activeId);
      if(!img) return;
      const scale = Math.max(CANVAS_WIDTH/img.originalWidth, CANVAS_HEIGHT/img.originalHeight);
      batchUpdateSettings({ scale, x: 0, y: 0, blur: false, rotation: 0 });
  };

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if (!activeId) return;
        if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;

        const shift = e.shiftKey ? 10 : 1;
        const scaleStep = e.shiftKey ? 0.1 : 0.01;
        const rotStep = e.shiftKey ? 15 : 1;
        
        let processed = false;
        
        const currentImg = images.find(i => i.id === activeId);
        if(!currentImg) return;

        switch(e.key) {
            case 'ArrowUp': updateSetting('y', currentImg.settings.y - shift); processed = true; break;
            case 'ArrowDown': updateSetting('y', currentImg.settings.y + shift); processed = true; break;
            case 'ArrowLeft': updateSetting('x', currentImg.settings.x - shift); processed = true; break;
            case 'ArrowRight': updateSetting('x', currentImg.settings.x + shift); processed = true; break;
            case '=': case '+': updateSetting('scale', currentImg.settings.scale + scaleStep); processed = true; break;
            case '-': case '_': updateSetting('scale', Math.max(0.01, currentImg.settings.scale - scaleStep)); processed = true; break;
            case 'r': case 'R': updateSetting('rotation', (currentImg.settings.rotation || 0) + (e.shiftKey ? -rotStep : rotStep)); processed = true; break;
        }

        if (processed) e.preventDefault();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeId, images, updateSetting]);

  const handleAutoFitText = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const fontFamily = selectedFont.split(',')[0].replace(/['"]/g, '');
    const baseFontSize = 100;
    ctx.font = `900 ${baseFontSize}px "${fontFamily}"`;
    const textToMeasure = maskText || 'MARVEL';
    const metrics = ctx.measureText(textToMeasure);
    
    const textWidth = metrics.width;
    const textHeight = metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent || baseFontSize;
    const targetW = CANVAS_WIDTH * 0.9;
    const targetH = CANVAS_HEIGHT * 0.9;
    const ratioW = targetW / textWidth;
    const ratioH = targetH / textHeight;
    const optimalRatio = Math.min(ratioW, ratioH);
    const optimalFontSizePx = baseFontSize * optimalRatio;
    const optimalPercentage = (optimalFontSizePx * 100) / CANVAS_WIDTH;
    setMaskSize(parseFloat(optimalPercentage.toFixed(2)));
  };

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    const activeImage = images.find(img => img.id === activeId);
    if (!activeImage) return;

    const img = new Image();
    img.src = activeImage.src;
    
    if (!img.complete) {
      img.onload = () => draw(); 
      return;
    }

    const { scale, x, y, rotation = 0, blur, brightness, contrast, saturate, vignette } = activeImage.settings;
    const w = activeImage.originalWidth * scale;
    const h = activeImage.originalHeight * scale;
    // Calculate center point of image in canvas coordinates
    // Unrotated top-left is: (CANVAS_WIDTH - w)/2 + x, (CANVAS_HEIGHT - h)/2 + y
    // Center is top-left + w/2, h/2
    const centerX = (CANVAS_WIDTH/2) + x;
    const centerY = (CANVAS_HEIGHT/2) + y;

    // Filter String Construction
    const filterString = `brightness(${brightness}) contrast(${contrast}) saturate(${saturate})`;

    // Background Blur (Fill) - Static, does not rotate
    if (blur) {
      ctx.save();
      const bScale = Math.max(CANVAS_WIDTH / activeImage.originalWidth, CANVAS_HEIGHT / activeImage.originalHeight) * 1.2;
      const bw = activeImage.originalWidth * bScale;
      const bh = activeImage.originalHeight * bScale;
      // Combined filter: background dimming + user corrections
      ctx.filter = `blur(40px) brightness(0.4) ${filterString}`;
      ctx.drawImage(img, (CANVAS_WIDTH - bw) / 2, (CANVAS_HEIGHT - bh) / 2, bw, bh);
      ctx.restore();
    }

    // Main Image with Rotation
    ctx.save();
    if (blur) {
      ctx.shadowColor = 'rgba(0,0,0,0.5)';
      ctx.shadowBlur = 30;
    }
    // Apply User Filters
    ctx.filter = filterString;
    
    // Rotate around center
    ctx.translate(centerX, centerY);
    ctx.rotate((rotation * Math.PI) / 180);
    // Draw centered at origin
    ctx.drawImage(img, -w/2, -h/2, w, h);
    ctx.restore();

    // Vignette (Post-process on top of image area) - Follows rotation?
    // Usually vignette is a lens effect, so it follows the image frame.
    if (vignette > 0) {
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate((rotation * Math.PI) / 180);
        
        const radius = Math.max(w, h) * 0.8;
        const gradient = ctx.createRadialGradient(
            0, 0, Math.max(w, h) * 0.2, // Inner circle
            0, 0, radius // Outer circle
        );
        gradient.addColorStop(0, 'rgba(0,0,0,0)');
        gradient.addColorStop(0.5, 'rgba(0,0,0,0)');
        gradient.addColorStop(1, `rgba(0,0,0,${vignette * 1.5})`); 
        
        ctx.fillStyle = gradient;
        ctx.fillRect(-w/2, -h/2, w, h);
        ctx.restore();
    }

    // Mask Overlay
    if (showMask) {
      ctx.save();
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      
      ctx.globalCompositeOperation = 'destination-out';
      const fontSize = (CANVAS_WIDTH * maskSize) / 100;
      const fontFamily = selectedFont.split(',')[0].replace(/['"]/g, '');
      ctx.font = `900 ${fontSize}px "${fontFamily}"`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      let text = maskText || 'MARVEL';
      if (slotMode) {
        const idx = images.findIndex(i => i.id === activeId);
        if (idx >= 0) {
            text = text[idx % text.length] || '?';
        }
      }
      
      ctx.fillText(text, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
      ctx.restore();
    }

    // --- GUIDES & OVERLAYS (Drawn on top of mask for visibility) ---
    
    // 1. Safe Area Guides
    if (safeAreaRatio > 0) {
        ctx.save();
        ctx.strokeStyle = 'rgba(255, 255, 0, 0.5)';
        ctx.lineWidth = 2;
        ctx.setLineDash([10, 10]);
        
        let guideW, guideH;
        if (safeAreaRatio === 2.35) { // Ultra wide
            guideW = CANVAS_WIDTH;
            guideH = CANVAS_WIDTH / safeAreaRatio;
        } else if (safeAreaRatio <= 1) { // Vertical or Square
            guideH = CANVAS_HEIGHT;
            guideW = CANVAS_HEIGHT * safeAreaRatio;
        } else { // Horizontal 16:9 etc
            guideW = CANVAS_WIDTH;
            guideH = CANVAS_WIDTH / safeAreaRatio;
            if (guideH > CANVAS_HEIGHT) {
                guideH = CANVAS_HEIGHT;
                guideW = CANVAS_HEIGHT * safeAreaRatio;
            }
        }
        
        const gx = (CANVAS_WIDTH - guideW) / 2;
        const gy = (CANVAS_HEIGHT - guideH) / 2;
        
        // Draw rectangle
        ctx.strokeRect(gx, gy, guideW, guideH);
        
        // Darken outside area
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        // Top
        ctx.fillRect(0, 0, CANVAS_WIDTH, gy);
        // Bottom
        ctx.fillRect(0, gy + guideH, CANVAS_WIDTH, CANVAS_HEIGHT - (gy + guideH));
        // Left
        ctx.fillRect(0, gy, gx, guideH);
        // Right
        ctx.fillRect(gx + guideW, gy, CANVAS_WIDTH - (gx + guideW), guideH);
        
        ctx.restore();
    }

    // 2. Smart Snap Lines
    if (snapActiveX || snapActiveY) {
        ctx.save();
        ctx.lineWidth = 2;
        if (snapActiveX) {
            ctx.strokeStyle = '#00ffff';
            ctx.beginPath();
            ctx.moveTo(CANVAS_WIDTH/2, 0);
            ctx.lineTo(CANVAS_WIDTH/2, CANVAS_HEIGHT);
            ctx.stroke();
        }
        if (snapActiveY) {
            ctx.strokeStyle = '#00ffff';
            ctx.beginPath();
            ctx.moveTo(0, CANVAS_HEIGHT/2);
            ctx.lineTo(CANVAS_WIDTH, CANVAS_HEIGHT/2);
            ctx.stroke();
        }
        ctx.restore();
    }

  }, [images, activeId, showMask, maskText, maskSize, slotMode, selectedFont, safeAreaRatio, snapActiveX, snapActiveY]);

  useEffect(() => {
    requestAnimationFrame(draw);
  }, [draw]);

  const handleTransfer = async () => {
    if (images.length === 0) return;
    setIsProcessing(true);

    const blobs: string[] = [];
    const savedMaskState = showMask;
    const savedSafeArea = safeAreaRatio;
    const savedGrid = showGrid;
    
    // Disable overlays for export
    setShowMask(false); 
    setSafeAreaRatio(0);
    setShowGrid(false);

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if(!ctx) return;

    for (const image of images) {
        const img = new Image();
        img.src = image.src;
        await new Promise<void>(r => { if(img.complete) r(); else img.onload = () => r(); });

        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        
        const { scale, x, y, rotation = 0, blur, brightness, contrast, saturate, vignette } = image.settings;
        const w = image.originalWidth * scale;
        const h = image.originalHeight * scale;
        const centerX = (CANVAS_WIDTH/2) + x;
        const centerY = (CANVAS_HEIGHT/2) + y;
        const filterString = `brightness(${brightness}) contrast(${contrast}) saturate(${saturate})`;

        if (blur) {
            ctx.save();
            const bScale = Math.max(CANVAS_WIDTH / image.originalWidth, CANVAS_HEIGHT / image.originalHeight) * 1.2;
            const bw = image.originalWidth * bScale;
            const bh = image.originalHeight * bScale;
            ctx.filter = `blur(40px) brightness(0.4) ${filterString}`;
            ctx.drawImage(img, (CANVAS_WIDTH - bw) / 2, (CANVAS_HEIGHT - bh) / 2, bw, bh);
            ctx.restore();
        }
        
        ctx.save();
        ctx.filter = filterString;
        ctx.translate(centerX, centerY);
        ctx.rotate((rotation * Math.PI) / 180);
        ctx.drawImage(img, -w/2, -h/2, w, h);
        ctx.restore();

        if (vignette > 0) {
            ctx.save();
            ctx.translate(centerX, centerY);
            ctx.rotate((rotation * Math.PI) / 180);
            const radius = Math.max(w, h) * 0.8;
            const gradient = ctx.createRadialGradient(0, 0, Math.max(w, h) * 0.2, 0, 0, radius);
            gradient.addColorStop(0, 'rgba(0,0,0,0)');
            gradient.addColorStop(0.5, 'rgba(0,0,0,0)');
            gradient.addColorStop(1, `rgba(0,0,0,${vignette * 1.5})`);
            ctx.fillStyle = gradient;
            ctx.fillRect(-w/2, -h/2, w, h);
            ctx.restore();
        }

        const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.95));
        if (blob) {
            blobs.push(URL.createObjectURL(blob));
        }
    }

    // Restore state
    setShowMask(savedMaskState);
    setSafeAreaRatio(savedSafeArea);
    setShowGrid(savedGrid);
    
    onTransfer(blobs.map(url => ({ url })), maskText, selectedFont);
    setIsProcessing(false);
  };
  
  const activeImage = images.find(i => i.id === activeId);

  const getImageObj = (cb: (img: HTMLImageElement) => void) => {
      if(!activeImage) return;
      const img = new Image(); img.src = activeImage.src;
      if(img.complete) cb(img); else img.onload = () => cb(img);
  };

  return (
    <div className="flex w-full h-full" ref={wrapperRef} tabIndex={0}>
      {/* Sidebar */}
      <div className="w-[400px] bg-panel border-r border-border flex flex-col p-4 overflow-y-auto shrink-0 z-10">
        <ControlGroup title="1. 素材匯入 (Import)">
          <div 
            className="border-2 border-dashed border-gray-600 rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer hover:border-accent hover:bg-accent/5 transition-colors group"
            onClick={() => fileInputRef.current?.click()}
          >
            <span className="text-gray-400 group-hover:text-accent text-sm font-medium mb-1">點擊上傳圖片</span>
            <span className="text-xs text-gray-500">支援 JPG, PNG (自動縮放至1920px)</span>
            <input type="file" ref={fileInputRef} className="hidden" multiple accept="image/*" onChange={handleFileUpload} />
          </div>
          
          <div className="mt-4 max-h-[150px] overflow-y-auto space-y-1 bg-black/20 p-2 rounded">
             {images.map((img, idx) => (
                <div 
                    key={img.id}
                    className={`text-xs p-2 rounded cursor-pointer flex justify-between items-center ${activeId === img.id ? 'bg-primary text-white' : 'hover:bg-white/5 text-gray-400'}`}
                    onClick={() => setActiveId(img.id)}
                >
                    <span className="truncate max-w-[200px]">{idx + 1}. {img.name}</span>
                    <span className="opacity-70 font-mono text-[10px] ml-2">
                         {img.originalWidth}x{img.originalHeight}
                    </span>
                </div>
             ))}
             {images.length === 0 && <div className="text-xs text-center text-gray-600 py-4">尚未載入圖片</div>}
          </div>
        </ControlGroup>

        <ControlGroup title="2. 構圖與對齊 (Composition)">
             {activeImage ? (
                 <div className="bg-black/40 p-3 rounded mb-3 border border-gray-700">
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-[10px] font-mono mb-2">
                        <div className="flex justify-between"><span className="text-gray-500">原始寬度</span> <span className="text-gray-200">{activeImage.originalWidth}px</span></div>
                        <div className="flex justify-between"><span className="text-gray-500">原始高度</span> <span className="text-gray-200">{activeImage.originalHeight}px</span></div>
                        <div className="flex justify-between"><span className="text-gray-500">長寬比例</span> <span className="text-accent font-bold">{getAspectRatioLabel(activeImage.originalWidth, activeImage.originalHeight)}</span></div>
                    </div>
                 </div>
             ) : (
                 <div className="text-[10px] text-gray-500 text-center py-2">請選擇圖片以啟用控制項</div>
             )}

             <div className="grid grid-cols-3 gap-1 mb-3">
                 <Button className="col-span-3 text-[10px] px-1 py-1 bg-accent/20 border-accent/50 text-accent hover:bg-accent/30 hover:text-white mb-1 transition-all" onClick={() => getImageObj(img => {
                     const s = calculateSettings(img.width, img.height);
                     // Keep existing color settings on reset? Maybe better to keep them.
                     batchUpdateSettings({ scale: s.scale, x: s.x, y: s.y, blur: s.blur, rotation: 0 });
                 })}>↺ 重置構圖 (Reset Pos)</Button>

                 <Button className="text-[10px] px-1 py-1 bg-gray-800 hover:bg-gray-700" onClick={() => getImageObj(img => {
                     const scale = Math.max(CANVAS_WIDTH/img.width, CANVAS_HEIGHT/img.height);
                     const h = img.height * scale;
                     batchUpdateSettings({ scale, x: 0, y: (h - CANVAS_HEIGHT) / 2, blur: false });
                 })}>⬆ 頂部</Button>

                <Button className="text-[10px] px-1 py-1 bg-gray-800 hover:bg-gray-700" onClick={() => batchUpdateSettings({x:0, y:0})}>✚ 置中</Button>

                 <Button className="text-[10px] px-1 py-1 bg-gray-800 hover:bg-gray-700" onClick={() => getImageObj(img => {
                     const scale = Math.max(CANVAS_WIDTH/img.width, CANVAS_HEIGHT/img.height);
                     const h = img.height * scale;
                     batchUpdateSettings({ scale, x: 0, y: (CANVAS_HEIGHT - h) / 2, blur: false });
                 })}>⬇ 底部</Button>
             </div>

             <div className="space-y-2 mt-2">
                 <RangeControl 
                    label="縮放 (Scale)" 
                    min={0.1} max={3} step={0.001} 
                    value={activeImage?.settings.scale ?? 1} 
                    valueDisplay={`${((activeImage?.settings.scale ?? 1) * 100).toFixed(1)}%`}
                    onChange={(e) => updateSetting('scale', parseFloat(e.target.value))}
                 />
                 <RangeControl 
                    label="旋轉 (Rotate)" 
                    min={-180} max={180} step={1} 
                    value={activeImage?.settings.rotation ?? 0} 
                    valueDisplay={`${activeImage?.settings.rotation ?? 0}°`}
                    onChange={(e) => updateSetting('rotation', parseFloat(e.target.value))}
                 />
             </div>
                 
             <div className="space-y-2 mt-3 pt-2 border-t border-gray-700">
                 <div className="flex items-center gap-2">
                     <span className="text-[10px] text-gray-400 w-8">X 軸</span>
                     <input type="number" className="bg-[#111] border border-gray-700 text-white text-xs rounded px-2 py-1 flex-1" value={Math.round(activeImage?.settings.x ?? 0)} onChange={(e) => updateSetting('x', parseFloat(e.target.value))} />
                 </div>
                 <div className="flex items-center gap-2">
                     <span className="text-[10px] text-gray-400 w-8">Y 軸</span>
                     <input type="number" className="bg-[#111] border border-gray-700 text-white text-xs rounded px-2 py-1 flex-1" value={Math.round(activeImage?.settings.y ?? 0)} onChange={(e) => updateSetting('y', parseFloat(e.target.value))} />
                 </div>
                 <CheckboxControl label="自動模糊背景 (填滿)" checked={activeImage?.settings.blur ?? true} onChange={(e) => updateSetting('blur', e.target.checked)} className="mt-2" />
             </div>
        </ControlGroup>

        <ControlGroup title="2.5 調色與濾鏡 (Color & Filters)">
            {/* Filter Presets */}
            <div className="grid grid-cols-4 gap-1 mb-4">
                {FILTER_PRESETS.map((p, i) => (
                    <Button 
                        key={i} 
                        className="text-[9px] px-0 py-1.5 bg-gray-800 hover:bg-gray-700 hover:text-white border-gray-700" 
                        onClick={() => batchUpdateSettings(p.settings)}
                    >
                        {p.label.split(' ')[0]}
                    </Button>
                ))}
            </div>

            <RangeControl label="亮度 (Brightness)" min={0} max={2} step={0.05} value={activeImage?.settings.brightness ?? 1} valueDisplay={(activeImage?.settings.brightness ?? 1).toFixed(2)} onChange={e => updateSetting('brightness', parseFloat(e.target.value))} />
            <RangeControl label="對比度 (Contrast)" min={0} max={2} step={0.05} value={activeImage?.settings.contrast ?? 1} valueDisplay={(activeImage?.settings.contrast ?? 1).toFixed(2)} onChange={e => updateSetting('contrast', parseFloat(e.target.value))} />
            <RangeControl label="飽和度 (Saturate)" min={0} max={2} step={0.05} value={activeImage?.settings.saturate ?? 1} valueDisplay={(activeImage?.settings.saturate ?? 1).toFixed(2)} onChange={e => updateSetting('saturate', parseFloat(e.target.value))} />
            <RangeControl label="暗角 (Vignette)" min={0} max={1} step={0.05} value={activeImage?.settings.vignette ?? 0} valueDisplay={(activeImage?.settings.vignette ?? 0).toFixed(2)} onChange={e => updateSetting('vignette', parseFloat(e.target.value))} />
        </ControlGroup>

        <ControlGroup title="3. 預覽與輸出">
            <CheckboxControl label="預覽遮罩 (Overlay)" checked={showMask} onChange={e => setShowMask(e.target.checked)} />
            <CheckboxControl label="老虎機對應模式" checked={slotMode} onChange={e => setSlotMode(e.target.checked)} className="mt-2 text-primary" />
            
            <div className="mt-3 space-y-2">
                <div className="flex gap-1 items-end">
                    <TextInput value={maskText} onChange={e => setMaskText(e.target.value.toUpperCase())} placeholder="預覽文字" className="flex-1" />
                    <Button onClick={handleAutoFitText} title="自動適配大小" className="px-2 py-1.5 text-xs bg-accent/20 text-accent border-accent/50 hover:bg-accent hover:text-white shrink-0">
                        ✨ 適配
                    </Button>
                </div>
                <Select value={selectedFont} onChange={e => setSelectedFont(e.target.value)}>
                    {FONTS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                </Select>
                <RangeControl label="遮罩字體大小" min={5} max={100} value={maskSize} valueDisplay={`${maskSize}%`} onChange={e => setMaskSize(parseFloat(e.target.value))} />
                
                <div className="pt-2 border-t border-gray-700">
                    <Select label="安全框 (Safe Area)" value={safeAreaRatio} onChange={e => setSafeAreaRatio(parseFloat(e.target.value))}>
                        {ASPECT_RATIOS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                    </Select>
                </div>
            </div>
        </ControlGroup>

        <div className="mt-auto pt-4">
            <Button variant="primary" className="w-full py-3 text-lg" onClick={handleTransfer} disabled={isProcessing || images.length === 0}>
                {isProcessing ? '處理中...' : '🚀 無縫傳送到動畫導演'}
            </Button>
            <p className="text-[9px] text-center text-gray-500 mt-2">將自動裁切並保留目前的精確對齊設定</p>
        </div>
      </div>

      {/* Workspace */}
      <div 
        className="flex-1 bg-[#0d0d0d] flex items-center justify-center relative overflow-hidden bg-[radial-gradient(#222_1px,transparent_1px)] [background-size:20px_20px] outline-none group select-none" 
        tabIndex={-1}
        onWheel={handleWheel} 
      >
         <div className="relative shadow-2xl shadow-black/80 ring-1 ring-[#333]">
            <canvas 
                ref={canvasRef} 
                width={CANVAS_WIDTH} 
                height={CANVAS_HEIGHT} 
                className={`max-w-full max-h-[90vh] aspect-video block bg-[#111] ${activeId ? 'cursor-move' : 'cursor-default'}`}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onDoubleClick={handleDoubleClick}
            />
            {/* Grid Overlay */}
            {showGrid && (
                <div className="absolute inset-0 pointer-events-none z-20">
                    {gridType === 'thirds' ? (
                        <>
                            <div className="absolute top-[33.33%] left-0 w-full h-px bg-cyan-500/30"></div>
                            <div className="absolute top-[66.66%] left-0 w-full h-px bg-cyan-500/30"></div>
                            <div className="absolute top-0 left-[33.33%] w-px h-full bg-cyan-500/30"></div>
                            <div className="absolute top-0 left-[66.66%] w-px h-full bg-cyan-500/30"></div>
                        </>
                    ) : (
                        <>
                            <div className="absolute top-1/2 left-0 w-full h-px bg-cyan-500/50"></div>
                            <div className="absolute top-0 left-1/2 w-px h-full bg-cyan-500/50"></div>
                        </>
                    )}
                </div>
            )}
            {isProcessing && (
                <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-50">
                    <div className="text-white font-bold mb-2">處理中...</div>
                    <div className="w-64 h-1 bg-gray-800 rounded overflow-hidden">
                        <div className="h-full bg-primary animate-pulse w-full"></div>
                    </div>
                </div>
            )}
         </div>
      </div>
    </div>
  );
};
