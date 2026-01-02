import React, { useState, useRef, useEffect, useCallback } from 'react';
import { PrepperImage } from '../types';
import { ControlGroup, RangeControl, CheckboxControl, Button, TextInput, Select } from './Controls';
import { FONTS } from '../constants';
// @ts-ignore
import JSZip from 'jszip';

interface PrepperProps {
  onTransfer: (assets: { url: string }[], text: string, font: string) => void;
  font: string;
}

const CANVAS_WIDTH = 1920;
const CANVAS_HEIGHT = 1080;

export const Prepper: React.FC<PrepperProps> = ({ onTransfer, font }) => {
  const [images, setImages] = useState<PrepperImage[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [maskText, setMaskText] = useState('MARVEL');
  const [maskSize, setMaskSize] = useState(15);
  const [showMask, setShowMask] = useState(true);
  const [slotMode, setSlotMode] = useState(true);
  const [selectedFont, setSelectedFont] = useState(font);
  const [isProcessing, setIsProcessing] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Helper to calculate initial settings
  const calculateSettings = (img: HTMLImageElement) => {
    const rC = CANVAS_WIDTH / CANVAS_HEIGHT;
    const rI = img.width / img.height;
    const isPort = img.height > img.width;
    
    // Scale Logic: "Contain" if very different aspect, else cover
    // But defaults usually prefer 'cover' for this app style, or 'contain' if detailed.
    // The legacy code used a mix. Let's do a smart cover.
    
    let scale = 1;
    if (isPort) {
        // If portrait, fit height
        scale = CANVAS_HEIGHT / img.height;
    } else {
        // If landscape, fit width or height to cover
        scale = Math.max(CANVAS_WIDTH / img.width, CANVAS_HEIGHT / img.height);
    }
    
    return {
      scale: scale, // raw scale factor
      x: 0,
      y: 0,
      blur: isPort
    };
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    setIsProcessing(true);
    
    const newImages: PrepperImage[] = [];
    
    // Process sequentially to keep order
    for (let i = 0; i < e.target.files.length; i++) {
      const file = e.target.files[i];
      if (!file.type.startsWith('image/')) continue;

      await new Promise<void>((resolve) => {
        const reader = new FileReader();
        reader.onload = (ev) => {
          const img = new Image();
          img.onload = () => {
            const settings = calculateSettings(img);
            newImages.push({
              id: Math.random().toString(36).substr(2, 9),
              name: file.name,
              src: ev.target?.result as string,
              originalWidth: img.width,
              originalHeight: img.height,
              settings
            });
            resolve();
          };
          img.src = ev.target?.result as string;
        };
        reader.readAsDataURL(file);
      });
    }

    setImages(prev => [...prev, ...newImages]);
    if (!activeId && newImages.length > 0) setActiveId(newImages[0].id);
    setIsProcessing(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const updateSetting = (key: keyof PrepperImage['settings'], value: number | boolean) => {
    if (!activeId) return;
    setImages(prev => prev.map(img => 
      img.id === activeId ? { ...img, settings: { ...img.settings, [key]: value } } : img
    ));
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
    
    // We need to wait for img load if it's fresh, but usually src is dataURL and fast.
    // Since we are in a hook, ideally we should use an effect to track activeImage changes
    // but drawing immediately is better for sliders. 
    // Assuming img is cached by browser after first load.

    if (!img.complete) {
      img.onload = () => draw(); // retry
      return;
    }

    const { scale, x, y, blur } = activeImage.settings;
    const w = activeImage.originalWidth * scale;
    const h = activeImage.originalHeight * scale;
    const cx = (CANVAS_WIDTH - w) / 2 + x;
    const cy = (CANVAS_HEIGHT - h) / 2 + y;

    // Background Blur
    if (blur) {
      ctx.save();
      const bScale = Math.max(CANVAS_WIDTH / activeImage.originalWidth, CANVAS_HEIGHT / activeImage.originalHeight) * 1.2;
      const bw = activeImage.originalWidth * bScale;
      const bh = activeImage.originalHeight * bScale;
      ctx.filter = 'blur(40px) brightness(0.4)';
      ctx.drawImage(img, (CANVAS_WIDTH - bw) / 2, (CANVAS_HEIGHT - bh) / 2, bw, bh);
      ctx.restore();
    }

    // Main Image
    ctx.save();
    if (blur) {
      ctx.shadowColor = 'rgba(0,0,0,0.5)';
      ctx.shadowBlur = 30;
    }
    ctx.drawImage(img, cx, cy, w, h);
    ctx.restore();

    // Mask Overlay
    if (showMask) {
      ctx.save();
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      
      ctx.globalCompositeOperation = 'destination-out';
      const fontSize = (CANVAS_WIDTH * maskSize) / 100;
      // Extract family name from font string e.g., "'Anton', sans-serif" -> "Anton"
      const fontFamily = selectedFont.split(',')[0].replace(/['"]/g, '');
      ctx.font = `900 ${fontSize}px "${fontFamily}"`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      let text = maskText || 'MARVEL';
      if (slotMode) {
        // Find index of active image
        const idx = images.findIndex(i => i.id === activeId);
        if (idx >= 0) {
            text = text[idx % text.length] || '?';
        }
      }
      
      ctx.fillText(text, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
      ctx.restore();
    }
  }, [images, activeId, showMask, maskText, maskSize, slotMode, selectedFont]);

  useEffect(() => {
    requestAnimationFrame(draw);
  }, [draw]);

  const handleTransfer = async () => {
    if (images.length === 0) return;
    setIsProcessing(true);

    const blobs: string[] = [];
    const savedMaskState = showMask;
    setShowMask(false); // Disable mask for export

    // We need to render each image to the canvas and grab the blob
    // This requires asynchronous sequential processing
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if(!ctx) return;

    for (const image of images) {
        // 1. Draw logic (duplicated temporarily for export purity)
        const img = new Image();
        img.src = image.src;
        await new Promise<void>(r => { if(img.complete) r(); else img.onload = () => r(); });

        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        
        const { scale, x, y, blur } = image.settings;
        const w = image.originalWidth * scale;
        const h = image.originalHeight * scale;
        const cx = (CANVAS_WIDTH - w) / 2 + x;
        const cy = (CANVAS_HEIGHT - h) / 2 + y;

        if (blur) {
            ctx.save();
            const bScale = Math.max(CANVAS_WIDTH / image.originalWidth, CANVAS_HEIGHT / image.originalHeight) * 1.2;
            const bw = image.originalWidth * bScale;
            const bh = image.originalHeight * bScale;
            ctx.filter = 'blur(40px) brightness(0.4)';
            ctx.drawImage(img, (CANVAS_WIDTH - bw) / 2, (CANVAS_HEIGHT - bh) / 2, bw, bh);
            ctx.restore();
        }
        ctx.drawImage(img, cx, cy, w, h);

        const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.9));
        if (blob) {
            blobs.push(URL.createObjectURL(blob));
        }
    }

    setShowMask(savedMaskState); // Restore state
    onTransfer(blobs.map(url => ({ url })), maskText, selectedFont);
    setIsProcessing(false);
  };
  
  const activeImage = images.find(i => i.id === activeId);

  return (
    <div className="flex w-full h-full">
      {/* Sidebar */}
      <div className="w-[400px] bg-panel border-r border-border flex flex-col p-4 overflow-y-auto shrink-0 z-10">
        <ControlGroup title="1. 匯入與調整">
          <div 
            className="border-2 border-dashed border-gray-600 rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer hover:border-accent hover:bg-accent/5 transition-colors group"
            onClick={() => fileInputRef.current?.click()}
          >
            <span className="text-gray-400 group-hover:text-accent text-sm font-medium mb-1">點擊上傳圖片</span>
            <span className="text-xs text-gray-500">支援 JPG, PNG (自動縮放)</span>
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
                    {slotMode && <span className="opacity-50 font-mono">[{maskText[idx % maskText.length] || '?'}]</span>}
                </div>
             ))}
             {images.length === 0 && <div className="text-xs text-center text-gray-600 py-4">尚未載入圖片</div>}
          </div>
          <div className="text-right text-[10px] text-gray-500 mt-1">總數: {images.length}</div>
        </ControlGroup>

        <ControlGroup title="2. 幾何調整">
             <CheckboxControl 
                label="自動模糊背景 (填滿)" 
                checked={activeImage?.settings.blur ?? true}
                onChange={(e) => updateSetting('blur', e.target.checked)}
             />
             <div className="border-t border-gray-700 my-3"></div>
             
             <RangeControl 
                label="縮放" 
                min={0.1} max={3} step={0.01} 
                value={activeImage?.settings.scale ?? 1} 
                valueDisplay={`${Math.round((activeImage?.settings.scale ?? 1) * 100)}%`}
                onChange={(e) => updateSetting('scale', parseFloat(e.target.value))}
             />
             
             <div className="grid grid-cols-2 gap-2 mt-2">
                 <RangeControl 
                    label="位置 X" 
                    min={-1000} max={1000} 
                    value={activeImage?.settings.x ?? 0}
                    onChange={(e) => updateSetting('x', parseFloat(e.target.value))}
                 />
                 <RangeControl 
                    label="位置 Y" 
                    min={-1000} max={1000} 
                    value={activeImage?.settings.y ?? 0}
                    onChange={(e) => updateSetting('y', parseFloat(e.target.value))}
                 />
             </div>
             <div className="flex gap-2 mt-2">
                <Button className="flex-1 text-xs" onClick={() => {
                    if(!activeImage) return;
                    // Reset to smart defaults
                    const img = new Image(); img.src = activeImage.src;
                    img.onload = () => {
                       const s = calculateSettings(img);
                       if(activeId) setImages(prev => prev.map(p => p.id === activeId ? { ...p, settings: s } : p));
                    }
                }}>重置</Button>
                <Button className="flex-1 text-xs" onClick={() => {
                     // Fit logic (contain)
                     if(!activeImage) return;
                     const img = new Image(); img.src = activeImage.src;
                     img.onload = () => {
                         const scale = Math.min(CANVAS_WIDTH/img.width, CANVAS_HEIGHT/img.height);
                         updateSetting('scale', scale);
                         updateSetting('blur', true);
                     }
                }}>適應</Button>
             </div>
        </ControlGroup>

        <ControlGroup title="3. 遮罩預覽">
            <CheckboxControl label="顯示遮罩疊加" checked={showMask} onChange={e => setShowMask(e.target.checked)} />
            <CheckboxControl label="老虎機對應模式" checked={slotMode} onChange={e => setSlotMode(e.target.checked)} className="mt-2 text-primary" />
            
            <div className="mt-3 space-y-2">
                <TextInput value={maskText} onChange={e => setMaskText(e.target.value.toUpperCase())} placeholder="預覽文字" />
                <Select value={selectedFont} onChange={e => setSelectedFont(e.target.value)}>
                    {FONTS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                </Select>
                <RangeControl 
                    label="遮罩字體大小" 
                    min={5} max={50} 
                    value={maskSize} 
                    valueDisplay={`${maskSize}%`}
                    onChange={e => setMaskSize(parseFloat(e.target.value))}
                />
            </div>
        </ControlGroup>

        <div className="mt-auto pt-4">
            <Button variant="primary" className="w-full py-3 text-lg" onClick={handleTransfer} disabled={isProcessing || images.length === 0}>
                {isProcessing ? '處理中...' : '🚀 傳送到動畫導演'}
            </Button>
        </div>
      </div>

      {/* Workspace */}
      <div className="flex-1 bg-[#0d0d0d] flex items-center justify-center relative overflow-hidden bg-[radial-gradient(#222_1px,transparent_1px)] [background-size:20px_20px]">
         <div className="relative shadow-2xl shadow-black/80">
            <canvas 
                ref={canvasRef} 
                width={CANVAS_WIDTH} 
                height={CANVAS_HEIGHT} 
                className="max-w-full max-h-[90vh] aspect-video block bg-[#111]"
            />
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