
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { PrepperImage, LibraryAsset } from '../types';
import { ControlGroup, RangeControl, CheckboxControl, Button, TextInput, Select } from './Controls';
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
  const [slotMode, setSlotMode] = useState(true);
  const [selectedFont, setSelectedFont] = useState(font);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const [safeAreaRatio, setSafeAreaRatio] = useState<number>(0);
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

  // --- NEW: Grouping Logic for Library ---
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

  const saveToLibrary = async (img: PrepperImage) => {
    try {
      const db = await getDB();
      const tx = db.transaction('assets', 'readwrite');
      const store = tx.objectStore('assets');
      const asset: LibraryAsset = {
        id: img.id,
        name: img.name,
        src: img.src,
        timestamp: Date.now()
      };
      store.put(asset);
      await new Promise(r => tx.oncomplete = r);
      loadLibrary();
    } catch (e) { console.error("Failed to save to library", e); }
  };

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
      alert(`已成功將 ${images.length} 張圖片存入雲端庫！`);
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
      scale: scale, x: 0, y: 0, rotation: 0, blur: isPort,
      brightness: 1, contrast: 1, saturate: 1, vignette: 0,
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
          updateSetting('x', img.settings.x + dx);
          updateSetting('y', img.settings.y + dy);
          dragStart.current = currentPos;
      }
  };

  const handleMouseUp = () => { setIsDragging(false); dragStart.current = null; };

  const handleWheel = (e: React.WheelEvent) => {
      if (!activeId) return;
      const img = images.find(i => i.id === activeId);
      if (!img) return;
      const pos = getMousePos(e);
      if (e.altKey) {
          const delta = e.deltaY > 0 ? 2 : -2;
          updateSetting('rotation', (img.settings.rotation || 0) + delta);
          return;
      }
      const oldScale = img.settings.scale;
      const newScale = Math.max(0.01, Math.min(5, oldScale - (e.deltaY * 0.001)));
      const w = img.originalWidth * oldScale;
      const h = img.originalHeight * oldScale;
      const tl_x = (CANVAS_WIDTH - w) / 2 + img.settings.x;
      const tl_y = (CANVAS_HEIGHT - h) / 2 + img.settings.y;
      const relX = (pos.x - tl_x) / w;
      const relY = (pos.y - tl_y) / h;
      const newW = img.originalWidth * newScale;
      const newH = img.originalHeight * newScale;
      const newX = (pos.x - (relX * newW)) - (CANVAS_WIDTH - newW) / 2;
      const newY = (pos.y - (relY * newH)) - (CANVAS_HEIGHT - newH) / 2;
      batchUpdateSettings({ scale: newScale, x: newX, y: newY });
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
    const { scale, x, y, rotation = 0, blur, brightness, contrast, saturate, vignette } = activeImage.settings;
    const w = activeImage.originalWidth * scale;
    const h = activeImage.originalHeight * scale;
    const centerX = (CANVAS_WIDTH/2) + x;
    const centerY = (CANVAS_HEIGHT/2) + y;
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
      ctx.save(); ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
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
  }, [images, activeId, showMask, maskText, maskSize, slotMode, selectedFont]);

  useEffect(() => { requestAnimationFrame(draw); }, [draw]);

  const handleTransfer = async () => {
    if (images.length === 0) return;
    setIsProcessing(true);
    const blobs: string[] = [];
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if(!ctx) return;
    for (const image of images) {
        const img = new Image(); img.src = image.src;
        await new Promise<void>(r => { if(img.complete) r(); else img.onload = () => r(); });
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        const { scale, x, y, rotation = 0, blur, brightness, contrast, saturate, vignette } = image.settings;
        const filter = `brightness(${brightness}) contrast(${contrast}) saturate(${saturate})`;
        if (blur) {
            ctx.save(); ctx.filter = `blur(40px) brightness(0.4) ${filter}`;
            const bScale = Math.max(CANVAS_WIDTH / image.originalWidth, CANVAS_HEIGHT / image.originalHeight) * 1.2;
            ctx.drawImage(img, (CANVAS_WIDTH - image.originalWidth * bScale) / 2, (CANVAS_HEIGHT - image.originalHeight * bScale) / 2, image.originalWidth * bScale, image.originalHeight * bScale);
            ctx.restore();
        }
        ctx.save(); ctx.filter = filter; ctx.translate((CANVAS_WIDTH/2) + x, (CANVAS_HEIGHT/2) + y); ctx.rotate((rotation * Math.PI) / 180);
        ctx.drawImage(img, -(image.originalWidth * scale)/2, -(image.originalHeight * scale)/2, image.originalWidth * scale, image.originalHeight * scale);
        ctx.restore();
        const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.9));
        if (blob) blobs.push(URL.createObjectURL(blob));
    }
    onTransfer(blobs.map(url => ({ url })), maskText, selectedFont);
    setIsProcessing(false);
  };

  const activeImage = images.find(i => i.id === activeId);

  return (
    <div className="flex w-full h-full">
      {/* Sidebar */}
      <div className="w-[420px] bg-panel border-r border-border flex flex-col z-10">
        
        {/* Tab Switcher */}
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
                    <ControlGroup title="1. 匯入與管理">
                        <div className="grid grid-cols-2 gap-2 mb-4">
                            <button onClick={() => fileInputRef.current?.click()} className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-gray-700 rounded-lg hover:border-primary hover:bg-primary/5 transition-all text-gray-400 hover:text-white">
                                <span className="text-sm font-bold">本地上傳</span>
                                <input type="file" ref={fileInputRef} className="hidden" multiple accept="image/*" onChange={handleFileUpload} />
                            </button>
                            <button onClick={() => setSidebarTab('library')} className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-gray-700 rounded-lg hover:border-accent hover:bg-accent/5 transition-all text-gray-400 hover:text-white">
                                <span className="text-sm font-bold">從庫中選取</span>
                            </button>
                        </div>

                        {/* Batch Actions Bar */}
                        {images.length > 0 && (
                            <div className="flex items-center gap-2 mb-3 p-2 bg-black/40 rounded border border-white/5">
                                <button 
                                    onClick={saveAllToLibrary} 
                                    className="flex-1 flex items-center justify-center gap-2 py-2 text-[10px] font-bold bg-accent/20 text-accent border border-accent/30 rounded hover:bg-accent hover:text-white transition-all"
                                >
                                    💾 全部存入雲端庫
                                </button>
                                <button 
                                    onClick={() => { if(confirm('確定要清空目前的編輯序列嗎？')) setImages([]); }} 
                                    className="flex items-center justify-center p-2 text-[10px] bg-red-900/20 text-red-500 border border-red-900/30 rounded hover:bg-red-600 hover:text-white transition-all"
                                    title="清空序列"
                                >
                                    🗑️
                                </button>
                            </div>
                        )}

                        <div className="space-y-1 max-h-[120px] overflow-y-auto bg-black/30 p-2 rounded">
                            {images.map((img, idx) => (
                                <div key={img.id} className={`flex items-center justify-between p-2 rounded cursor-pointer ${activeId === img.id ? 'bg-primary/20 border border-primary/50' : 'hover:bg-white/5 text-gray-400'}`} onClick={() => setActiveId(img.id)}>
                                    <span className="text-[10px] truncate max-w-[150px]">{idx+1}. {img.name}</span>
                                    <div className="flex gap-1">
                                        <button onClick={(e) => { e.stopPropagation(); saveToLibrary(img); }} className="p-1 hover:text-accent" title="存入圖庫">💾</button>
                                        <button onClick={(e) => { e.stopPropagation(); setImages(prev => prev.filter(i => i.id !== img.id)); }} className="p-1 hover:text-red-500">✕</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </ControlGroup>

                    {activeImage && (
                        <>
                            <ControlGroup title="2. 構圖與變形">
                                <RangeControl label="縮放" min={0.1} max={3} step={0.01} value={activeImage.settings.scale} onChange={e => updateSetting('scale', parseFloat(e.target.value))} />
                                <RangeControl label="旋轉" min={-180} max={180} step={1} value={activeImage.settings.rotation} onChange={e => updateSetting('rotation', parseFloat(e.target.value))} />
                                <CheckboxControl label="自動模糊背景" checked={activeImage.settings.blur} onChange={e => updateSetting('blur', e.target.checked)} />
                            </ControlGroup>
                            <ControlGroup title="3. 調色濾鏡">
                                <div className="grid grid-cols-4 gap-1 mb-3">
                                    {FILTER_PRESETS.map(p => <button key={p.label} onClick={() => batchUpdateSettings(p.settings)} className="text-[9px] py-1 bg-gray-800 rounded hover:bg-gray-700">{p.label.split(' ')[0]}</button>)}
                                </div>
                                <RangeControl label="對比度" min={0} max={2} step={0.05} value={activeImage.settings.contrast} onChange={e => updateSetting('contrast', parseFloat(e.target.value))} />
                                <RangeControl label="飽和度" min={0} max={2} step={0.05} value={activeImage.settings.saturate} onChange={e => updateSetting('saturate', parseFloat(e.target.value))} />
                            </ControlGroup>
                        </>
                    )}
                </>
            ) : (
                <div className="space-y-6 pr-2">
                    {/* Fix: Explicitly type assets to avoid 'unknown' errors */}
                    {Object.entries(groupedLibrary).map(([dateLabel, assets]: [string, LibraryAsset[]]) => (
                        <div key={dateLabel}>
                            {/* Sticky Date Header */}
                            <div className="sticky top-0 z-20 flex items-center justify-between py-2 mb-3 bg-[#1e1e1e] border-b border-white/5">
                                <h3 className="text-[10px] font-black text-gray-400 tracking-widest uppercase flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 bg-primary rounded-full"></span>
                                    {dateLabel}
                                </h3>
                                <span className="text-[9px] bg-white/5 px-1.5 py-0.5 rounded text-gray-500">{assets.length} items</span>
                            </div>
                            
                            {/* Asset Grid for this date */}
                            <div className="grid grid-cols-3 gap-2">
                                {assets.map((asset: LibraryAsset) => (
                                    <div key={asset.id} className="relative group aspect-square bg-[#111] rounded border border-gray-800 overflow-hidden cursor-pointer hover:border-primary transition-all">
                                        <img src={asset.src} className="w-full h-full object-cover opacity-60 group-hover:opacity-100" onClick={() => addFromLibrary(asset)} />
                                        <div className="absolute top-0 right-0 p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => removeFromLibrary(asset.id)} className="bg-red-600 text-white w-5 h-5 rounded-full text-[10px] flex items-center justify-center">✕</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                    {library.length === 0 && <div className="col-span-3 text-center py-20 text-gray-600 text-xs">圖庫空空如也</div>}
                </div>
            )}
        </div>

        <div className="p-4 bg-black/40 border-t border-border mt-auto">
            <Button variant="primary" className="w-full py-3" onClick={handleTransfer} disabled={isProcessing || images.length === 0}>
                {isProcessing ? '渲染中...' : '🚀 傳送到動畫導演'}
            </Button>
        </div>
      </div>

      {/* Workspace */}
      <div className="flex-1 bg-[#0d0d0d] flex items-center justify-center relative overflow-hidden bg-[radial-gradient(#222_1px,transparent_1px)] [background-size:20px_20px]">
         <div className="relative shadow-2xl ring-1 ring-[#333]">
            <canvas 
                ref={canvasRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} 
                className={`max-w-full max-h-[90vh] aspect-video block bg-[#111] ${activeId ? 'cursor-move' : ''}`}
                onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp} onWheel={handleWheel}
            />
            {isProcessing && <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-50 text-white font-bold">處理中...</div>}
         </div>
      </div>
    </div>
  );
};
