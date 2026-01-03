
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { PrepperImage, LibraryAsset } from '../types';
import { ControlGroup, RangeControl, CheckboxControl, Button, TextInput, Select, CompactNumberInput } from './Controls';
import { FONTS } from '../constants';

interface PrepperProps {
  onTransfer: (assets: { url: string }[], text: string, font: string) => void;
  font: string;
}

const CANVAS_WIDTH = 1920;
const CANVAS_HEIGHT = 1080;

const FILTER_PRESETS = [
    { label: '標準 (Reset)', settings: { brightness: 1, contrast: 1, saturate: 1, vignette: 0 } },
    { label: '黑白 (Noir)', settings: { brightness: 1.1, contrast: 1.3, saturate: 0, vignette: 0.4 } },
    { label: '動作 (Action)', settings: { brightness: 1.05, contrast: 1.2, saturate: 1.3, vignette: 0.2 } },
    { label: '復古 (Vintage)', settings: { brightness: 1.1, contrast: 0.9, saturate: 0.6, vignette: 0.3 } },
];

export const Prepper: React.FC<PrepperProps> = ({ onTransfer, font }) => {
  const [images, setImages] = useState<PrepperImage[]>([]);
  const [library, setLibrary] = useState<LibraryAsset[]>([]);
  const [sidebarTab, setSidebarTab] = useState<'current' | 'library'>('current');
  const [activeId, setActiveId] = useState<string | null>(null);
  const [maskText, setMaskText] = useState('MARVEL');
  const [maskSize, setMaskSize] = useState(15);
  const [showMask, setShowMask] = useState(true);
  const [maskOpacity, setMaskOpacity] = useState(0.85); // 新增：遮罩透明度狀態
  const [slotMode, setSlotMode] = useState(true);
  const [selectedFont, setSelectedFont] = useState(font);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef<{x: number, y: number} | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- IndexedDB Helper ---
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

  const loadLibrary = async () => {
    try {
      const db = await getDB();
      const tx = db.transaction('assets', 'readonly');
      const store = tx.objectStore('assets');
      const request = store.getAll();
      request.onsuccess = () => {
        setLibrary(request.result.sort((a: any, b: any) => b.timestamp - a.timestamp));
      };
    } catch (e) { console.error("Failed to load library", e); }
  };

  useEffect(() => { loadLibrary(); }, []);

  const groupedLibrary = useMemo(() => {
      const groups: Record<string, LibraryAsset[]> = {};
      const today = new Date().toLocaleDateString('zh-TW');
      const yesterday = new Date(Date.now() - 86400000).toLocaleDateString('zh-TW');

      library.forEach(asset => {
          const dateStr = new Date(asset.timestamp).toLocaleDateString('zh-TW');
          let label = dateStr;
          if (dateStr === today) label = '今天 (Today)';
          else if (dateStr === yesterday) label = '昨天 (Yesterday)';
          
          if (!groups[label]) groups[label] = [];
          groups[label].push(asset);
      });
      return groups;
  }, [library]);

  const saveAllToLibrary = async () => {
    if (images.length === 0) return;
    setIsProcessing(true);
    try {
      const db = await getDB();
      const tx = db.transaction('assets', 'readwrite');
      const store = tx.objectStore('assets');
      images.forEach(img => {
        store.put({
          id: img.id,
          name: img.name,
          src: img.src,
          timestamp: Date.now()
        });
      });
      await new Promise(r => tx.oncomplete = r);
      loadLibrary();
      alert(`已成功將 ${images.length} 張圖片存入圖庫！`);
    } catch (e) { 
      console.error("Batch save failed", e); 
    } finally {
      setIsProcessing(false);
    }
  };

  const removeFromLibrary = async (id: string) => {
    const db = await getDB();
    const tx = db.transaction('assets', 'readwrite');
    tx.objectStore('assets').delete(id);
    await new Promise(r => tx.oncomplete = r);
    loadLibrary();
  };

  const calculateSettings = (w: number, h: number) => {
    const isPort = h > w;
    let scale = 1;
    if (isPort) scale = CANVAS_HEIGHT / h;
    else scale = Math.max(CANVAS_WIDTH / w, CANVAS_HEIGHT / h);
    
    return {
      scale: 100, 
      x: 0, 
      y: -50, 
      rotation: 0, 
      blur: isPort,
      brightness: 1, 
      contrast: 1, 
      saturate: 1, 
      vignette: 0,
    };
  };

  const processImageFile = (file: File | Blob, fileName: string): Promise<{ src: string, width: number, height: number, name: string }> => {
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
                    canvas.width = newW; canvas.height = newH;
                    const ctx = canvas.getContext('2d');
                    if (ctx) {
                        ctx.drawImage(img, 0, 0, newW, newH);
                        finalUrl = canvas.toDataURL('image/jpeg', 0.9);
                        w = newW; h = newH;
                    }
                }
                resolve({ src: finalUrl, width: w, height: h, name: fileName });
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
      const processed = await processImageFile(file, file.name);
      const settings = calculateSettings(processed.width, processed.height);
      newImages.push({
        id: Math.random().toString(36).substr(2, 9),
        name: processed.name, src: processed.src,
        originalWidth: processed.width, originalHeight: processed.height, settings
      });
    }
    setImages(prev => [...prev, ...newImages]);
    if (!activeId && newImages.length > 0) setActiveId(newImages[0].id);
    setIsProcessing(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setSidebarTab('current');
  };

  const addFromLibrary = (asset: LibraryAsset) => {
      const img = new Image();
      img.onload = () => {
          const settings = calculateSettings(img.width, img.height);
          const newImg: PrepperImage = {
              id: Math.random().toString(36).substr(2, 9),
              name: asset.name,
              src: asset.src,
              originalWidth: img.width,
              originalHeight: img.height,
              settings
          };
          setImages(prev => [...prev, newImg]);
          setActiveId(newImg.id);
          setSidebarTab('current');
      };
      img.src = asset.src;
  };

  const updateSetting = useCallback((key: keyof PrepperImage['settings'], value: number | boolean) => {
    setImages(prev => prev.map(img => img.id === activeId ? { ...img, settings: { ...img.settings, [key]: value } } : img));
  }, [activeId]);

  const batchUpdateSettings = useCallback((newSettings: Partial<PrepperImage['settings']>) => {
    setImages(prev => prev.map(img => img.id === activeId ? { ...img, settings: { ...img.settings, ...newSettings } } : img));
  }, [activeId]);

  const getMousePos = (e: React.MouseEvent | MouseEvent | React.WheelEvent) => {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return { x: 0, y: 0 };
      const scaleX = CANVAS_WIDTH / rect.width;
      const scaleY = CANVAS_HEIGHT / rect.height;
      return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
      if (!activeId) return;
      setIsDragging(true);
      dragStart.current = getMousePos(e);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
      if (!isDragging || !activeId || !dragStart.current) return;
      const currentPos = getMousePos(e);
      const dx = currentPos.x - dragStart.current.x;
      const dy = currentPos.y - dragStart.current.y;
      const img = images.find(i => i.id === activeId);
      if (img) {
          updateSetting('x', img.settings.x + (dx / 5)); 
          updateSetting('y', img.settings.y + (dy / 5));
          dragStart.current = currentPos;
      }
  };

  const handleMouseUp = () => { setIsDragging(false); dragStart.current = null; };

  const handleWheel = (e: React.WheelEvent) => {
      if (!activeId) return;
      const img = images.find(i => i.id === activeId);
      if (!img) return;
      if (e.altKey) {
          const delta = e.deltaY > 0 ? 2 : -2;
          updateSetting('rotation', (img.settings.rotation || 0) + delta);
          return;
      }
      const oldScale = img.settings.scale;
      const newScale = Math.max(10, Math.min(1000, oldScale - (e.deltaY * 0.1)));
      updateSetting('scale', newScale);
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
    if (!img.complete) { img.onload = () => draw(); return; }
    
    const scale = activeImage.settings.scale / 100;
    const { x, y, rotation = 0, blur, brightness, contrast, saturate, vignette } = activeImage.settings;
    
    const w = activeImage.originalWidth * scale;
    const h = activeImage.originalHeight * scale;
    const centerX = (CANVAS_WIDTH/2) + (x * 10); 
    const centerY = (CANVAS_HEIGHT/2) + (y * 10);
    
    const filter = `brightness(${brightness}) contrast(${contrast}) saturate(${saturate})`;
    if (blur) {
      ctx.save();
      const bScale = Math.max(CANVAS_WIDTH / activeImage.originalWidth, CANVAS_HEIGHT / activeImage.originalHeight) * 1.2;
      ctx.filter = `blur(40px) brightness(0.4) ${filter}`;
      ctx.drawImage(img, (CANVAS_WIDTH - activeImage.originalWidth * bScale) / 2, (CANVAS_HEIGHT - activeImage.originalHeight * bScale) / 2, activeImage.originalWidth * bScale, activeImage.originalHeight * bScale);
      ctx.restore();
    }
    ctx.save();
    ctx.filter = filter;
    ctx.translate(centerX, centerY);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.drawImage(img, -w/2, -h/2, w, h);
    ctx.restore();
    
    if (vignette > 0) {
        ctx.save(); ctx.translate(centerX, centerY); ctx.rotate((rotation * Math.PI) / 180);
        const radius = Math.max(w, h) * 0.8;
        const grad = ctx.createRadialGradient(0, 0, Math.max(w, h) * 0.2, 0, 0, radius);
        grad.addColorStop(0, 'rgba(0,0,0,0)'); grad.addColorStop(1, `rgba(0,0,0,${vignette * 1.5})`);
        ctx.fillStyle = grad; ctx.fillRect(-w/2, -h/2, w, h); ctx.restore();
    }
    
    if (showMask) {
      ctx.save(); 
      ctx.fillStyle = `rgba(0,0,0,${maskOpacity})`; // 使用動態透明度
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      ctx.globalCompositeOperation = 'destination-out';
      const fontSize = (CANVAS_WIDTH * maskSize) / 100;
      ctx.font = `900 ${fontSize}px ${selectedFont.split(',')[0]}`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      let text = maskText || 'MARVEL';
      if (slotMode) {
        const idx = images.findIndex(i => i.id === activeId);
        text = text[idx % text.length] || '?';
      }
      ctx.fillText(text, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
      ctx.restore();
    }
  }, [images, activeId, showMask, maskOpacity, maskText, maskSize, slotMode, selectedFont]);

  useEffect(() => { requestAnimationFrame(draw); }, [draw]);

  const handleTransfer = async () => {
    if (images.length === 0) return;
    setIsProcessing(true);
    const finalAssets = images.map(img => ({ url: img.src }));
    onTransfer(finalAssets, maskText, selectedFont);
    setIsProcessing(false);
  };

  const activeImage = images.find(i => i.id === activeId);

  return (
    <div className="flex w-full h-full">
      <div className="w-[420px] bg-panel border-r border-border flex flex-col z-10">
        
        <div className="flex bg-black/50 p-1 m-4 rounded-lg border border-white/5">
            <button 
                onClick={() => setSidebarTab('current')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${sidebarTab === 'current' ? 'bg-primary text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
            >
                編輯序列 ({images.length})
            </button>
            <button 
                onClick={() => setSidebarTab('library')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${sidebarTab === 'library' ? 'bg-primary text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
            >
                雲端庫 ({library.length})
            </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-4 custom-scrollbar">
            {sidebarTab === 'current' ? (
                <>
                    <ControlGroup title="1. 素材序列與預覽">
                        <div className="flex flex-col items-center gap-3 mb-4 pt-2">
                             <div className="w-[200px] h-[200px] bg-[#0a0a0a] rounded-lg border border-primary relative overflow-hidden shadow-2xl">
                                {activeImage ? (
                                    <div 
                                        className="w-full h-full bg-no-repeat transition-all"
                                        style={{ 
                                            backgroundImage: `url(${activeImage.src})`,
                                            backgroundSize: `auto ${activeImage.settings.scale}%`,
                                            backgroundPosition: `${50 + activeImage.settings.x}% ${50 + activeImage.settings.y}%`
                                        }}
                                    >
                                        <div className="absolute inset-0 flex items-center justify-center text-white/5 font-black text-[150px] pointer-events-none" style={{ fontFamily: selectedFont }}>
                                            {(maskText || 'M')[images.findIndex(i => i.id === activeId) % (maskText.length || 1)]}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-[10px] text-gray-700 font-bold uppercase tracking-widest text-center px-4">請選取素材以對比 1:1 槽位預覽</div>
                                )}
                             </div>
                             <span className="text-[9px] text-gray-500 font-black tracking-widest uppercase">專業字元槽位對比 (Slot Preview)</span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 mb-4">
                            <button onClick={() => fileInputRef.current?.click()} className="flex flex-col items-center justify-center p-3 border border-dashed border-gray-700 rounded-lg hover:border-primary hover:bg-primary/5 transition-all text-gray-400 hover:text-white">
                                <span className="text-[10px] font-bold">上傳素材</span>
                                <input type="file" ref={fileInputRef} className="hidden" multiple accept="image/*" onChange={handleFileUpload} />
                            </button>
                            <button onClick={() => setSidebarTab('library')} className="flex flex-col items-center justify-center p-3 border border-dashed border-gray-700 rounded-lg hover:border-accent hover:bg-accent/5 transition-all text-gray-400 hover:text-white">
                                <span className="text-[10px] font-bold">從圖庫加入</span>
                            </button>
                        </div>

                        <div className="space-y-1 max-h-[140px] overflow-y-auto bg-black/30 p-2 rounded border border-white/5">
                            {images.map((img, idx) => (
                                <div key={img.id} className={`flex items-center justify-between p-2 rounded cursor-pointer transition-colors ${activeId === img.id ? 'bg-primary/20 border border-primary/40' : 'hover:bg-white/5 text-gray-500'}`} onClick={() => setActiveId(img.id)}>
                                    <div className="flex items-center gap-3">
                                        <span className="w-4 h-4 bg-gray-800 text-[9px] flex items-center justify-center rounded text-gray-400">{idx+1}</span>
                                        <span className="text-[10px] truncate max-w-[140px]">{img.name}</span>
                                    </div>
                                    <button onClick={(e) => { e.stopPropagation(); setImages(prev => prev.filter(i => i.id !== img.id)); }} className="text-gray-600 hover:text-red-500 text-xs">✕</button>
                                </div>
                            ))}
                        </div>
                    </ControlGroup>

                    {activeImage && (
                        <>
                            <ControlGroup title="2. 精確構圖 (COMPOSITION)">
                                <div className="space-y-4">
                                    <CompactNumberInput label="圖片縮放" min={10} max={1000} value={activeImage.settings.scale} onChange={val => updateSetting('scale', val)} suffix="%" />
                                    <div className="grid grid-cols-2 gap-3">
                                        <CompactNumberInput label="X 軸偏移" min={-200} max={200} value={activeImage.settings.x} onChange={val => updateSetting('x', val)} />
                                        <CompactNumberInput label="Y 軸偏移" min={-200} max={200} value={activeImage.settings.y} onChange={val => updateSetting('y', val)} />
                                    </div>
                                    <div className="pt-2">
                                        <RangeControl label="旋轉角度" min={-180} max={180} value={activeImage.settings.rotation} onChange={e => updateSetting('rotation', parseFloat(e.target.value))} />
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 pt-2">
                                        <CheckboxControl label="自動背景模糊" checked={activeImage.settings.blur} onChange={e => updateSetting('blur', e.target.checked)} />
                                        <CheckboxControl label="置中預覽引導" checked={showMask} onChange={e => setShowMask(e.target.checked)} />
                                    </div>
                                    {showMask && (
                                        <div className="pt-2 border-t border-white/5">
                                            <RangeControl label="遮罩透明度" min={0} max={1} step={0.01} value={maskOpacity} onChange={e => setMaskOpacity(parseFloat(e.target.value))} />
                                        </div>
                                    )}
                                </div>
                            </ControlGroup>
                            <ControlGroup title="3. 專業色彩 (COLOR)">
                                <div className="grid grid-cols-4 gap-1 mb-3">
                                    {FILTER_PRESETS.map(p => <button key={p.label} onClick={() => batchUpdateSettings(p.settings)} className="text-[8px] py-1 bg-gray-800 text-gray-400 rounded hover:bg-gray-700 hover:text-white transition-all uppercase">{p.label.split(' ')[0]}</button>)}
                                </div>
                                <div className="space-y-4">
                                    <RangeControl label="對比度" min={0} max={2} step={0.05} value={activeImage.settings.contrast} onChange={e => updateSetting('contrast', parseFloat(e.target.value))} />
                                    <RangeControl label="飽和度" min={0} max={2} step={0.05} value={activeImage.settings.saturate} onChange={e => updateSetting('saturate', parseFloat(e.target.value))} />
                                </div>
                            </ControlGroup>
                        </>
                    )}
                </>
            ) : (
                <div className="space-y-6 pr-2">
                    {Object.entries(groupedLibrary).map(([dateLabel, assets]: [string, LibraryAsset[]]) => (
                        <div key={dateLabel}>
                            <div className="sticky top-0 z-20 flex items-center justify-between py-2 mb-3 bg-[#1e1e1e] border-b border-white/5">
                                <h3 className="text-[9px] font-black text-gray-400 tracking-widest uppercase flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 bg-primary rounded-full"></span>
                                    {dateLabel}
                                </h3>
                                <span className="text-[9px] text-gray-600">{assets.length}</span>
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                                {assets.map((asset: LibraryAsset) => (
                                    <div key={asset.id} className="relative group aspect-square bg-[#111] rounded border border-gray-800 overflow-hidden cursor-pointer hover:border-primary transition-all">
                                        <img src={asset.src} className="w-full h-full object-cover opacity-60 group-hover:opacity-100" onClick={() => addFromLibrary(asset)} />
                                        <button onClick={(e) => { e.stopPropagation(); removeFromLibrary(asset.id); }} className="absolute top-1 right-1 bg-red-600/80 text-white w-4 h-4 rounded-full text-[8px] opacity-0 group-hover:opacity-100 transition-opacity">✕</button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                    {library.length === 0 && <div className="text-center py-20 text-gray-600 text-[10px] uppercase font-bold tracking-widest">圖庫空空如也</div>}
                </div>
            )}
        </div>

        <div className="p-4 bg-black/40 border-t border-border mt-auto">
            <Button variant="primary" className="w-full py-4 text-xs shadow-2xl" onClick={handleTransfer} disabled={isProcessing || images.length === 0}>
                {isProcessing ? '渲染處理中...' : '🚀 傳送到動畫導演 (TRANSFER)'}
            </Button>
        </div>
      </div>

      <div className="flex-1 bg-[#0d0d0d] flex items-center justify-center relative overflow-hidden bg-[radial-gradient(#222_1px,transparent_1px)] [background-size:30px_30px]">
         <div className="relative shadow-2xl ring-1 ring-white/5">
            <canvas 
                ref={canvasRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} 
                className={`max-w-full max-h-[85vh] aspect-video block bg-black ${activeId ? 'cursor-move' : ''} shadow-[0_0_100px_rgba(0,0,0,0.5)]`}
                onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp} onWheel={handleWheel}
            />
            {isProcessing && <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-50 text-white font-bold text-sm tracking-widest animate-pulse">GENERATING PREVIEWS...</div>}
            <div className="absolute bottom-5 left-5 bg-black/60 backdrop-blur px-3 py-1.5 rounded-full border border-white/10 flex items-center gap-4">
                <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                    <span className="text-[9px] text-gray-300 font-bold uppercase tracking-widest">Live Material Factory Preview</span>
                </div>
                <div className="h-3 w-px bg-white/10"></div>
                <span className="text-[9px] text-gray-500 font-mono uppercase">1920x1080 Native Master</span>
            </div>
         </div>
      </div>
    </div>
  );
};
