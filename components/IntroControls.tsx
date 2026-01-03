
import React, { useMemo, useState } from 'react';
import { IntroSettings, IntroAsset, CharMapping } from '../types';
import { ControlGroup, RangeControl, CheckboxControl, TextInput, Select, Button } from './Controls';
import { FONTS, ANIMATION_PRESETS } from '../constants';

interface IntroControlsProps {
  settings: IntroSettings;
  updateSetting: (key: keyof IntroSettings, value: any) => void;
  onApplyPreset: (preset: Partial<IntroSettings>) => void;
  assets: IntroAsset[];
  mappings: CharMapping[];
  updateMapping: (index: number, changes: Partial<CharMapping>) => void;
  onUploadAssets: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClearAssets: () => void;
  onRemoveAsset: (id: string) => void;
  onUploadBg: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onUploadAudio: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onPlay: () => void;
  onSnapshot: () => void;
  onExportGif: () => void;
  isPlaying: boolean;
  isExporting: boolean;
  isWireframe: boolean;
  toggleWireframe: () => void;
  manualTime: number | null;
  onScrub: (time: number) => void;
  totalDuration: number;
}

export const IntroControls: React.FC<IntroControlsProps> = ({
  settings, updateSetting, onApplyPreset, assets, mappings, updateMapping,
  onUploadAssets, onClearAssets, onRemoveAsset, onUploadBg, onUploadAudio,
  onPlay, onSnapshot, onExportGif, isPlaying, isExporting,
  isWireframe, toggleWireframe, manualTime, onScrub, totalDuration
}) => {
  const [expandedMapping, setExpandedMapping] = useState<number | null>(null);

  const handleRandomizeImages = () => {
    if (assets.length === 0) return;
    mappings.forEach((_, i) => updateMapping(i, { imgId: assets[Math.floor(Math.random() * assets.length)].id }));
  };

  const handleResetMappings = () => {
    mappings.forEach((_, i) => updateMapping(i, { 
        imgId: assets.length > 0 ? assets[i % assets.length].id : null,
        scale: 100, x: 0, y: 0, fitHeight: false, duration: 0 
    }));
  };

  const handleClearAudio = () => {
      updateSetting('audioUrl', null);
      updateSetting('audioName', null);
  };

  // --- Timeline Calculations ---
  const timelineStats = useMemo(() => {
      const t1 = settings.solidBaseDuration;
      const t2 = t1 + settings.duration;
      const charCount = Math.max(settings.text.length, 1);
      const rippleDuration = Math.max(0, (charCount - 1) * settings.stagger);
      const t3 = t2 + rippleDuration;
      const total = t3 + settings.endHoldDuration;
      
      return { solid: t1, spin: settings.duration, ripple: rippleDuration, hold: settings.endHoldDuration, total: total };
  }, [settings.solidBaseDuration, settings.duration, settings.stagger, settings.text, settings.endHoldDuration]);

  const pctSolid = (timelineStats.solid / timelineStats.total) * 100;
  const pctSpin = (timelineStats.spin / timelineStats.total) * 100;
  const pctRipple = (timelineStats.ripple / timelineStats.total) * 100;
  const pctHold = (timelineStats.hold / timelineStats.total) * 100;

  const currentT = manualTime ?? 0;

  return (
    <div className={`w-[450px] bg-panel border-r border-border flex flex-col p-4 overflow-y-auto shrink-0 z-10 h-full ${isExporting ? 'opacity-50 pointer-events-none' : ''} custom-scrollbar`}>
        
        <ControlGroup title="0. 快速預設 (Presets)">
            <div className="grid grid-cols-3 gap-2">
                {ANIMATION_PRESETS.map(preset => (
                    <button
                        key={preset.id}
                        onClick={() => onApplyPreset(preset.settings as any)}
                        className="bg-[#333] hover:bg-primary text-gray-300 hover:text-white text-[10px] py-2 px-1 rounded transition-colors border border-[#444]"
                    >
                        {preset.label}
                    </button>
                ))}
            </div>
        </ControlGroup>

        <ControlGroup title="1. 內容與排版 (Layout)">
            <TextInput label="主標題" value={settings.text} onChange={e => updateSetting('text', e.target.value.toUpperCase())} />
            <div className="mt-2">
                <Select label="字體" value={settings.font} onChange={e => updateSetting('font', e.target.value)}>
                    {FONTS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                </Select>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
                <RangeControl label="文字大小" min={1} max={50} value={settings.textSize} onChange={e => updateSetting('textSize', parseFloat(e.target.value))} />
                <RangeControl label="字元間距" min={-0.2} max={0.5} step={0.01} value={settings.spacing} onChange={e => updateSetting('spacing', parseFloat(e.target.value))} />
            </div>

            <div className="mt-4 pt-3 border-t border-gray-700">
                <CheckboxControl label="啟用副標題 (Sub-Title)" checked={settings.subEnabled} onChange={e => updateSetting('subEnabled', e.target.checked)} className="mb-2" />
                {settings.subEnabled && (
                    <div className="space-y-2 pl-3 border-l-2 border-gray-600 ml-1 transition-all bg-[#1a1a1a] p-2 rounded-r">
                        <TextInput label="副標題文字" value={settings.subText} onChange={e => updateSetting('subText', e.target.value.toUpperCase())} />
                        <div className="grid grid-cols-2 gap-2">
                             <RangeControl label="大小" min={1} max={10} step={0.1} value={settings.subSize} onChange={e => updateSetting('subSize', parseFloat(e.target.value))} />
                             <RangeControl label="間距" min={0} max={2} step={0.05} value={settings.subSpacing} onChange={e => updateSetting('subSpacing', parseFloat(e.target.value))} />
                        </div>
                    </div>
                )}
            </div>
        </ControlGroup>

        <ControlGroup title="2. 視覺風格 (Styling)">
            <div className="grid grid-cols-2 gap-3 mb-3">
                <div className="bg-[#111] p-2 rounded border border-gray-800">
                     <label className="text-[9px] text-gray-500 block mb-1 uppercase">背景不透明</label>
                     <RangeControl label="" min={0} max={1} step={0.01} value={settings.bgOpacity} onChange={e => updateSetting('bgOpacity', parseFloat(e.target.value))} />
                </div>
                <div className="bg-[#111] p-2 rounded border border-gray-800">
                     <label className="text-[9px] text-gray-500 block mb-1 uppercase">3D 厚度</label>
                     <RangeControl label="" min={0} max={30} value={settings.depth} onChange={e => updateSetting('depth', parseFloat(e.target.value))} />
                </div>
            </div>
            
            <div className="grid grid-cols-2 gap-2 bg-[#111] p-2 rounded border border-gray-800">
                <div className="flex items-center justify-between">
                     <label className="text-[10px] text-gray-400 uppercase tracking-wider">Logo Box</label>
                     <input type="color" className="h-6 w-8 cursor-pointer bg-transparent" value={settings.bgColor} onChange={e => updateSetting('bgColor', e.target.value)} />
                </div>
                <div className="flex items-center justify-between">
                     <label className="text-[10px] text-gray-400 uppercase tracking-wider">Shadow</label>
                     <input type="color" className="h-6 w-8 cursor-pointer bg-transparent" value={settings.shadowColor} onChange={e => updateSetting('shadowColor', e.target.value)} />
                </div>
            </div>
        </ControlGroup>

        <ControlGroup title="3. 時間與關鍵幀 (Timeline)">
            <div className="bg-[#111] p-3 rounded mb-2 border border-gray-700 font-mono text-[10px] select-none">
                <div className="flex justify-between items-end mb-2">
                    <span className="text-gray-400 font-bold">預覽進度 (Scrubber)</span>
                    <span className="text-accent font-bold bg-gray-800 px-2 py-0.5 rounded border border-gray-600">
                        {(currentT / 1000).toFixed(2)}s / {(totalDuration / 1000).toFixed(1)}s
                    </span>
                </div>
                
                <div className="h-6 w-full bg-gray-900 rounded-md flex relative overflow-hidden ring-1 ring-gray-700 mb-4">
                    <div className="h-full bg-blue-900/40 border-r border-blue-500/30" style={{width: `${pctSolid}%`}}></div>
                    <div className="h-full bg-orange-900/40 border-r border-orange-500/30" style={{width: `${pctSpin}%`}}></div>
                    <div className="h-full bg-purple-900/40 border-r border-purple-500/30" style={{width: `${pctRipple}%`}}></div>
                    <div className="h-full bg-green-900/40" style={{width: `${pctHold}%`}}></div>
                    <div className="absolute top-0 bottom-0 w-1 bg-white shadow-lg z-10 pointer-events-none" style={{ left: `${(currentT / totalDuration) * 100}%` }} />
                </div>

                <input type="range" className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-primary mb-3" min={0} max={totalDuration} step={10} value={currentT} onChange={(e) => onScrub(parseFloat(e.target.value))} />

                <div className="flex gap-2">
                    <Button className="flex-1 py-1 text-[10px]" onClick={() => onScrub(Math.max(0, currentT - 100))}>⏮ -100ms</Button>
                    <Button className="flex-1 py-1 text-[10px]" onClick={() => onScrub(Math.min(totalDuration, currentT + 100))}>⏭ +100ms</Button>
                    <Button className="px-3 py-1 text-[10px] bg-accent/20 border-accent/40 text-accent" onClick={() => onScrub(0)}>↺ 重置</Button>
                </div>
            </div>

            <div className="space-y-2 mt-4">
                <RangeControl label="Phase 1: 純色持續" min={0} max={5000} step={100} value={settings.solidBaseDuration} onChange={e => updateSetting('solidBaseDuration', parseFloat(e.target.value))} />
                <RangeControl label="Phase 2: 運轉持續" min={500} max={10000} step={100} value={settings.duration} onChange={e => updateSetting('duration', parseFloat(e.target.value))} />
                <RangeControl label="Phase 3: 逐字停止 (Stagger)" min={0} max={2000} step={10} value={settings.stagger} onChange={e => updateSetting('stagger', parseFloat(e.target.value))} />
            </div>

            <div className="mt-6 pt-4 border-t border-gray-600">
                <div className="flex justify-between items-center mb-3">
                    <label className="text-[10px] uppercase text-gray-300 font-bold tracking-widest">字母映射 (Mapping)</label>
                    <div className="flex gap-1">
                        <button onClick={handleRandomizeImages} title="隨機圖片" className="text-[10px] px-2 py-0.5 bg-gray-700 hover:bg-gray-600 rounded text-gray-300">🎲 隨機</button>
                        <button onClick={handleResetMappings} title="重置" className="text-[10px] px-2 py-0.5 bg-gray-700 hover:bg-red-900 rounded text-red-300">↺ 重設</button>
                    </div>
                </div>

                <div className="space-y-2">
                    {mappings.map((map, i) => {
                        const asset = assets.find(a => a.id === map.imgId) || assets[0];
                        const fontName = settings.font.split(',')[0].replace(/['"]/g, '');
                        const bgStyle: React.CSSProperties = asset ? {
                            backgroundImage: `url(${asset.url})`,
                            backgroundPosition: `${50 + map.x}% ${50 + map.y}%`,
                            backgroundSize: (map.scale === 100 && !map.fitHeight) ? 'cover' : (map.fitHeight ? `auto ${map.scale}%` : `${map.scale}% auto`),
                            WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent', fontFamily: fontName,
                        } : { fontFamily: fontName };

                        const isExpanded = expandedMapping === i;

                        return (
                            <div key={i} className={`bg-black/40 rounded border transition-all ${isExpanded ? 'border-primary/50 shadow-lg shadow-primary/5' : 'border-gray-800'}`}>
                                <div className="flex gap-3 p-2 items-center cursor-pointer hover:bg-white/5" onClick={() => setExpandedMapping(isExpanded ? null : i)}>
                                    <div className="w-12 h-12 bg-[#111] rounded border border-gray-700 flex items-center justify-center overflow-hidden shrink-0 relative shadow-inner">
                                        {asset ? <span className="text-2xl font-black leading-none" style={bgStyle}>{map.char}</span> : <span className="text-gray-500 text-xl font-mono">{map.char}</span>}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-[10px] font-bold text-gray-500 mb-1">LETTER {i+1}: <span className="text-white">{map.char}</span></div>
                                        <div className="bg-[#222] text-[10px] text-white rounded px-2 py-1 flex justify-between items-center border border-gray-700">
                                            <span className="truncate">{asset ? `圖庫資源: ${asset.url.slice(-10)}...` : '尚未對應'}</span>
                                            <span className="text-primary font-bold">▼</span>
                                        </div>
                                    </div>
                                </div>

                                {isExpanded && (
                                    <div className="p-3 border-t border-gray-800 bg-black/20 space-y-3">
                                        <div>
                                            <label className="text-[9px] uppercase text-gray-500 mb-1 block">選擇對應圖片</label>
                                            <select 
                                                className="bg-[#333] text-[10px] text-white rounded p-1.5 w-full border border-gray-600 focus:border-primary appearance-none mb-2"
                                                value={map.imgId || ''}
                                                onChange={(e) => updateMapping(i, { imgId: e.target.value || null })}
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                <option value="">預設系統隨機</option>
                                                {assets.map((a, idx) => <option key={a.id} value={a.id}>圖庫第 {idx+1} 張素材</option>)}
                                            </select>
                                        </div>
                                        
                                        <div className="grid grid-cols-2 gap-3">
                                            <RangeControl label="縮放 (Scale)" min={10} max={300} step={1} value={map.scale} onChange={e => updateMapping(i, { scale: parseFloat(e.target.value) })} />
                                            <div className="flex items-end pb-1">
                                                <CheckboxControl label="高度填滿 (Fit Height)" checked={map.fitHeight} onChange={e => updateMapping(i, { fitHeight: e.target.checked })} />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-3">
                                            <RangeControl label="水平偏移 (X)" min={-100} max={100} step={1} value={map.x} onChange={e => updateMapping(i, { x: parseFloat(e.target.value) })} />
                                            <RangeControl label="垂直偏移 (Y)" min={-100} max={100} step={1} value={map.y} onChange={e => updateMapping(i, { y: parseFloat(e.target.value) })} />
                                        </div>

                                        <Button className="w-full py-1 text-[9px] bg-primary/10 hover:bg-primary/20 text-primary border-primary/20" onClick={() => setExpandedMapping(null)}>
                                            套用並收合
                                        </Button>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </ControlGroup>

        <ControlGroup title="4. 音效工具 (Audio)">
            <div className="space-y-4">
                <div className="flex flex-col gap-3">
                    <label className="group relative cursor-pointer bg-primary/10 hover:bg-primary/20 text-primary text-[11px] font-bold py-3 px-3 rounded-lg flex items-center justify-center border border-primary/30 transition-all active:scale-[0.98]">
                        <span className="flex items-center gap-2">
                            {settings.audioUrl ? '🎵 已載入音效' : '➕ 上傳自訂音效 (MP3/WAV)'}
                        </span>
                        <input type="file" accept="audio/*" onChange={onUploadAudio} className="hidden" />
                    </label>
                    
                    {settings.audioUrl && (
                        <div className="flex flex-col gap-2">
                            <div className="bg-black/40 p-2 rounded border border-white/5 flex items-center justify-between overflow-hidden shadow-inner">
                                <div className="flex items-center gap-2 truncate">
                                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse shrink-0" />
                                    <div className="text-[10px] text-gray-400 font-mono truncate">
                                        {settings.audioName}
                                    </div>
                                </div>
                                <button 
                                    onClick={handleClearAudio} 
                                    className="p-1 hover:text-red-500 transition-colors shrink-0"
                                    title="移除音效"
                                >
                                    🗑️
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-800">
                    <div className="bg-[#111] p-2.5 rounded-lg border border-gray-800 shadow-lg">
                        <label className="text-[9px] text-gray-500 block mb-1 uppercase font-bold">輸出音量</label>
                        <RangeControl label="" min={0} max={1} step={0.01} value={settings.volume} onChange={e => updateSetting('volume', parseFloat(e.target.value))} />
                    </div>
                    <div className="flex flex-col justify-center gap-1 pl-1">
                        <CheckboxControl 
                            label="能量頻譜儀" 
                            checked={settings.showVisualizer} 
                            onChange={e => updateSetting('showVisualizer', e.target.checked)} 
                        />
                        <span className="text-[8px] text-gray-600 uppercase ml-6 tracking-tighter">伴隨音效跳動</span>
                    </div>
                </div>
            </div>
        </ControlGroup>

        <ControlGroup title="5. 素材管理 (Media)">
            <div className="mb-4">
                <div className="flex gap-2 mb-2">
                    <label className="flex-1 cursor-pointer bg-[#333] hover:bg-gray-600 text-white text-xs py-2 px-3 rounded flex items-center justify-center border border-gray-600 transition-colors">
                        <span>+ 匯入素材</span>
                        <input type="file" multiple accept="image/*" onChange={onUploadAssets} className="hidden" />
                    </label>
                    <Button onClick={onClearAssets} className="px-3 bg-red-900/30 border-red-800/50 text-red-400 hover:bg-red-900">清空</Button>
                </div>
                <div className="grid grid-cols-5 gap-2 mt-2 max-h-[100px] overflow-y-auto p-1 custom-scrollbar">
                  {assets.map((asset, idx) => (
                    <div key={asset.id} className="relative w-full aspect-square rounded border border-gray-700 bg-cover bg-center group" style={{backgroundImage: `url(${asset.url})`}}>
                       <button onClick={() => onRemoveAsset(asset.id)} className="absolute inset-0 bg-red-900/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-20 font-bold text-xs">✕</button>
                    </div>
                  ))}
                </div>
            </div>

            <div className="pt-3 border-t border-gray-700">
                <label className="text-[10px] uppercase text-gray-400 block mb-2">場景背景圖</label>
                <div className="grid grid-cols-1 gap-2">
                    <label className="cursor-pointer bg-[#151515] hover:bg-[#222] text-gray-400 hover:text-white text-[10px] py-2 px-2 rounded flex items-center justify-center border border-gray-700 transition-colors">
                        <span>{settings.bgImage ? '背景圖 ✓' : '上傳背景圖'}</span>
                        <input type="file" accept="image/*" onChange={onUploadBg} className="hidden" />
                    </label>
                </div>
            </div>
        </ControlGroup>

        <div className="mt-auto pt-4 space-y-2 pb-6">
            <div className="flex gap-2">
                <Button variant="primary" className="flex-1 py-3 text-base flex items-center justify-center gap-2" onClick={onPlay} disabled={isExporting}>
                    {isPlaying ? '⏹ 停止播放' : '▶ 開始播放'}
                </Button>
                <Button className="w-12 flex items-center justify-center text-lg" onClick={toggleWireframe} title="線框模式 (W)">
                    {isWireframe ? '▣' : '□'}
                </Button>
            </div>
            
            <div className="flex gap-2">
                <Button className="flex-1 py-2 text-xs" onClick={onSnapshot} disabled={isExporting || isPlaying}>📷 截圖</Button>
                <Button className="flex-1 py-2 text-xs" onClick={onExportGif} disabled={isExporting || isPlaying}>{isExporting ? '匯出中...' : '🎬 匯出 GIF'}</Button>
            </div>
        </div>
    </div>
  );
};
