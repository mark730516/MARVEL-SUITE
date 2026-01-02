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

export const Prepper: React.FC<PrepperProps> = ({ onTransfer, font }) => {
  const [images, setImages] = useState<PrepperImage[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [maskText, setMaskText] = useState('MARVEL');
  const [maskSize, setMaskSize] = useState(15);
  const [showMask, setShowMask] = useState(true);
  const [slotMode, setSlotMode] = useState(true);
  const [selectedFont, setSelectedFont] = useState(font);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Grid State
  const [showGrid, setShowGrid] = useState(false);
  const [gridType, setGridType] = useState<'thirds' | 'cross'>('thirds');

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Helper to calculate initial settings based on dimensions
  const calculateSettings = (w: number, h: number) => {
    const isPort = h > w;
    // Smart cover logic:
    // If Portrait: Fit to Height (Contain) to avoid cropping heads/feet, add blur bars.
    // If Landscape: Fill Width/Height (Cover) to maximize impact.
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
      blur: isPort
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

                // Optimization: Downscale huge images to max width 1920 to match output specs
                // This ensures WYSIWYG and prevents performance issues with 4K/8K images
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
                        // Use high quality jpeg for the optimized asset
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

  // Keyboard Shortcuts for Precision Nudging
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if (!activeId) return;
        // Ignore if user is typing in an input
        if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;

        const shift = e.shiftKey ? 10 : 1;
        const scaleStep = e.shiftKey ? 0.1 : 0.01;

        let processed = false;
        
        // Find current image to get current values
        const currentImg = images.find(i => i.id === activeId);
        if(!currentImg) return;

        switch(e.key) {
            case 'ArrowUp':
                updateSetting('y', currentImg.settings.y - shift);
                processed = true;
                break;
            case 'ArrowDown':
                updateSetting('y', currentImg.settings.y + shift);
                processed = true;
                break;
            case 'ArrowLeft':
                updateSetting('x', currentImg.settings.x - shift);
                processed = true;
                break;
            case 'ArrowRight':
                updateSetting('x', currentImg.settings.x + shift);
                processed = true;
                break;
            case '=': 
            case '+':
                updateSetting('scale', currentImg.settings.scale + scaleStep);
                processed = true;
                break;
            case '-':
            case '_':
                updateSetting('scale', Math.max(0.01, currentImg.settings.scale - scaleStep));
                processed = true;
                break;
        }

        if (processed) e.preventDefault();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeId, images, updateSetting]);

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
  }, [images, activeId, showMask, maskText, maskSize, slotMode, selectedFont]);

  useEffect(() => {
    requestAnimationFrame(draw);
  }, [draw]);

  const handleTransfer = async () => {
    if (images.length === 0) return;
    setIsProcessing(true);

    const blobs: string[] = [];
    const savedMaskState = showMask;
    setShowMask(false); 

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if(!ctx) return;

    // Bake all images with their transforms
    for (const image of images) {
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

        const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.95));
        if (blob) {
            blobs.push(URL.createObjectURL(blob));
        }
    }

    setShowMask(savedMaskState);
    onTransfer(blobs.map(url => ({ url })), maskText, selectedFont);
    setIsProcessing(false);
  };
  
  const activeImage = images.find(i => i.id === activeId);

  // Alignment Helpers
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

        <ControlGroup title="2. 精細規格 (Precision Specs)">
             {activeImage ? (
                 <div className="bg-black/40 p-3 rounded mb-3 border border-gray-700">
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-[10px] font-mono mb-2">
                        <div className="flex justify-between"><span className="text-gray-500">原始寬度</span> <span className="text-gray-200">{activeImage.originalWidth}px</span></div>
                        <div className="flex justify-between"><span className="text-gray-500">原始高度</span> <span className="text-gray-200">{activeImage.originalHeight}px</span></div>
                        <div className="flex justify-between"><span className="text-gray-500">長寬比例</span> <span className="text-accent font-bold">{getAspectRatioLabel(activeImage.originalWidth, activeImage.originalHeight)}</span></div>
                    </div>
                    
                    <div className="flex items-center justify-between text-[10px] text-gray-500 border-t border-gray-700 pt-2">
                        <span>縮放比: <span className="text-white font-bold">{Math.round(activeImage.settings.scale * 100)}%</span></span>
                        <span className="text-gray-600">渲染: {Math.round(activeImage.originalWidth * activeImage.settings.scale)}x{Math.round(activeImage.originalHeight * activeImage.settings.scale)}</span>
                    </div>

                    <div className="text-[9px] text-gray-600 mt-2 text-center">
                        提示: 使用鍵盤 <span className="text-gray-300 border border-gray-700 px-1 rounded">↑↓←→</span> 微調，<span className="text-gray-300 border border-gray-700 px-1 rounded">Shift</span> 加速
                    </div>
                 </div>
             ) : (
                 <div className="text-[10px] text-gray-500 text-center py-2">請選擇圖片以查看齒錯資料</div>
             )}

             <div className="flex gap-2 mb-3">
                <Button className="flex-1 text-[10px] py-1" onClick={() => setShowGrid(!showGrid)}>
                    {showGrid ? '隱藏網格' : '顯示輔助網格'}
                </Button>
                {showGrid && (
                    <Button className="w-10 text-[10px] py-1 px-0" onClick={() => setGridType(g => g === 'thirds' ? 'cross' : 'thirds')}>
                        {gridType === 'thirds' ? '#': '+'}
                    </Button>
                )}
             </div>

             <RangeControl 
                label="縮放 (Scale)" 
                min={0.1} max={3} step={0.001} 
                value={activeImage?.settings.scale ?? 1} 
                valueDisplay={`${((activeImage?.settings.scale ?? 1) * 100).toFixed(1)}%`}
                onChange={(e) => updateSetting('scale', parseFloat(e.target.value))}
             />
             
             {/* 智慧對齊按鈕群組 */}
             <div className="grid grid-cols-3 gap-1 mb-3">
                 <Button className="col-span-3 text-[10px] px-1 py-1 bg-accent/20 border-accent/50 text-accent hover:bg-accent/30 hover:text-white mb-1 transition-all" onClick={() => getImageObj(img => {
                     const s = calculateSettings(img.width, img.height);
                     updateSetting('scale', s.scale);
                     updateSetting('x', s.x);
                     updateSetting('y', s.y);
                     updateSetting('blur', s.blur);
                 })}>✨ 自動最佳化 (Auto-Optimize)</Button>

                 <Button className="text-[10px] px-1 py-1 bg-gray-800 hover:bg-gray-700" onClick={() => getImageObj(img => {
                     // Fill (Cover)
                     const scale = Math.max(CANVAS_WIDTH/img.width, CANVAS_HEIGHT/img.height);
                     updateSetting('scale', scale);
                     updateSetting('x', 0); updateSetting('y', 0);
                     updateSetting('blur', false);
                 })}>全螢幕 (Fill)</Button>
                 
                 <Button className="text-[10px] px-1 py-1 bg-gray-800 hover:bg-gray-700" onClick={() => getImageObj(img => {
                     // Fit (Contain)
                     const scale = Math.min(CANVAS_WIDTH/img.width, CANVAS_HEIGHT/img.height);
                     updateSetting('scale', scale);
                     updateSetting('x', 0); updateSetting('y', 0);
                     updateSetting('blur', true);
                 })}>完整 (Fit)</Button>

                 <Button className="text-[10px] px-1 py-1 bg-gray-800 hover:bg-gray-700" onClick={() => {
                     updateSetting('scale', 1);
                 }}>1:1 原始</Button>

                 <Button className="text-[10px] px-1 py-1 bg-gray-800 hover:bg-gray-700" onClick={() => getImageObj(img => {
                     updateSetting('scale', CANVAS_WIDTH / img.width);
                     updateSetting('x', 0);
                 })}>寬度滿版</Button>
                 
                 <Button className="text-[10px] px-1 py-1 bg-gray-800 hover:bg-gray-700" onClick={() => getImageObj(img => {
                     updateSetting('scale', CANVAS_HEIGHT / img.height);
                     updateSetting('y', 0);
                 })}>高度滿版</Button>

                 <Button className="text-[10px] px-1 py-1 bg-gray-800 hover:bg-gray-700" onClick={() => {
                     updateSetting('x', 0);
                     updateSetting('y', 0);
                 }}>置中歸零</Button>
             </div>

             <div className="space-y-2 mt-2">
                 <div className="flex items-center gap-2">
                     <span className="text-[10px] text-gray-400 w-8">X 軸</span>
                     <input 
                        type="number" 
                        className="bg-[#111] border border-gray-700 text-white text-xs rounded px-2 py-1 flex-1"
                        value={activeImage?.settings.x ?? 0}
                        onChange={(e) => updateSetting('x', parseFloat(e.target.value))}
                     />
                 </div>
                 <div className="flex items-center gap-2">
                     <span className="text-[10px] text-gray-400 w-8">Y 軸</span>
                     <input 
                        type="number" 
                        className="bg-[#111] border border-gray-700 text-white text-xs rounded px-2 py-1 flex-1"
                        value={activeImage?.settings.y ?? 0}
                        onChange={(e) => updateSetting('y', parseFloat(e.target.value))}
                     />
                 </div>
                 <CheckboxControl 
                    label="自動模糊背景 (填滿黑邊)" 
                    checked={activeImage?.settings.blur ?? true}
                    onChange={(e) => updateSetting('blur', e.target.checked)}
                    className="mt-2"
                 />
             </div>
        </ControlGroup>

        <ControlGroup title="3. 預覽與輸出">
            <CheckboxControl label="預覽遮罩 (Overlay)" checked={showMask} onChange={e => setShowMask(e.target.checked)} />
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
                {isProcessing ? '處理中...' : '🚀 無縫傳送到動畫導演'}
            </Button>
            <p className="text-[9px] text-center text-gray-500 mt-2">將自動裁切並保留目前的精確對齊設定</p>
        </div>
      </div>

      {/* Workspace */}
      <div className="flex-1 bg-[#0d0d0d] flex items-center justify-center relative overflow-hidden bg-[radial-gradient(#222_1px,transparent_1px)] [background-size:20px_20px] outline-none group" tabIndex={-1}>
         <div className="relative shadow-2xl shadow-black/80 ring-1 ring-[#333]">
            <canvas 
                ref={canvasRef} 
                width={CANVAS_WIDTH} 
                height={CANVAS_HEIGHT} 
                className="max-w-full max-h-[90vh] aspect-video block bg-[#111]"
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