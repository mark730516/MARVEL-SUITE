
import React, { useMemo } from 'react';
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

  // --- Timeline Calculations ---
  const timelineStats = useMemo(() => {
      const t1 = settings.solidBaseDuration;
      const t2 = t1 + settings.duration; // Spin End
      const charCount = Math.max(settings.text.length, 1);
      const rippleDuration = Math.max(0, (charCount - 1) * settings.stagger);
      const t3 = t2 + rippleDuration; // All Locked
      const total = t3 + settings.endHoldDuration;
      
      return {
          solid: t1,
          spin: settings.duration,
          ripple: rippleDuration,
          hold: settings.endHoldDuration,
          total: total
      };
  }, [settings.solidBaseDuration, settings.duration, settings.stagger, settings.text, settings.endHoldDuration]);

  // Visualizer Percentages
  const pctSolid = (timelineStats.solid / timelineStats.total) * 100;
  const pctSpin = (timelineStats.spin / timelineStats.total) * 100;
  const pctRipple = (timelineStats.ripple / timelineStats.total) * 100;
  const pctHold = (timelineStats.hold / timelineStats.total) * 100;

  const currentT = manualTime ?? 0;

  return (
    <div className={`w-[450px] bg-panel border-r border-border flex flex-col p-4 overflow-y-auto shrink-0 z-10 h-full ${isExporting ? 'opacity-50 pointer-events-none' : ''}`}>
        
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

        <ControlGroup title="1. 內容設定 (Content)">
            <TextInput label="主標題" value={settings.text} onChange={e => updateSetting('text', e.target.value.toUpperCase())} />
            <div className="mt-2">
                <Select label="字體" value={settings.font} onChange={e => updateSetting('font', e.target.value)}>
                    {FONTS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                </Select>
            </div>

            {/* Sub-Title Controls */}
            <div className="mt-4 pt-3 border-t border-gray-700">
                <CheckboxControl 
                    label="啟用副標題 (Sub-Title)" 
                    checked={settings.subEnabled} 
                    onChange={e => updateSetting('subEnabled', e.target.checked)} 
                    className="mb-2"
                />
                
                {settings.subEnabled && (
                    <div className="space-y-2 pl-3 border-l-2 border-gray-600 ml-1 transition-all bg-[#1a1a1a] p-2 rounded-r">
                        <TextInput 
                            label="副標題文字" 
                            value={settings.subText} 
                            onChange={e => updateSetting('subText', e.target.value.toUpperCase())} 
                        />
                        <RangeControl 
                            label="大小 (Size)" 
                            min={1} max={10} step={0.1} 
                            value={settings.subSize} 
                            onChange={e => updateSetting('subSize', parseFloat(e.target.value))} 
                        />
                        <RangeControl 
                            label="字元間距 (Spacing)" 
                            min={0} max={2} step={0.05} 
                            value={settings.subSpacing} 
                            onChange={e => updateSetting('subSpacing', parseFloat(e.target.value))} 
                        />
                        <RangeControl 
                            label="垂直位置 (Margin Top)" 
                            min={0} max={20} step={0.1} 
                            value={settings.subMargin} 
                            onChange={e => updateSetting('subMargin', parseFloat(e.target.value))} 
                        />
                    </div>
                )}
            </div>

            <div className="flex gap-2 mt-3 bg-[#111] p-2 rounded">
                <div className="flex-1">
                     <label className="text-[10px] text-gray-400 block mb-1">背景色 (Logo Box)</label>
                     <input type="color" className="w-full h-8 cursor-pointer bg-transparent" value={settings.bgColor} onChange={e => updateSetting('bgColor', e.target.value)} />
                </div>
                <div className="flex-1">
                     <label className="text-[10px] text-gray-400 block mb-1">文字顏色</label>
                     <input type="color" className="w-full h-8 cursor-pointer bg-transparent" value={settings.textColor} onChange={e => updateSetting('textColor', e.target.value)} />
                </div>
            </div>
        </ControlGroup>

        <ControlGroup title="2. 外觀樣式 (Appearance)">
            <RangeControl label="背景不透明度 (Logo Box)" min={0} max={1} step={0.01} value={settings.bgOpacity} onChange={e => updateSetting('bgOpacity', parseFloat(e.target.value))} />
            <RangeControl label="文字大小" min={1} max={50} value={settings.textSize} onChange={e => updateSetting('textSize', parseFloat(e.target.value))} />
            <RangeControl label="字元間距" min={-0.2} max={0.5} step={0.01} value={settings.spacing} onChange={e => updateSetting('spacing', parseFloat(e.target.value))} />
            <RangeControl label="3D 厚度" min={0} max={30} value={settings.depth} onChange={e => updateSetting('depth', parseFloat(e.target.value))} />
            <RangeControl label="發光強度" min={0} max={50} value={settings.glow} onChange={e => updateSetting('glow', parseFloat(e.target.value))} />
            
            <div className="flex items-center justify-between mb-2 mt-2 bg-[#111] p-2 rounded">
                <label className="text-[10px] text-gray-400 uppercase tracking-wider">Shadow Color</label>
                <div className="flex items-center gap-2">
                    <span className="text-[10px] text-gray-500 font-mono">{settings.shadowColor}</span>
                    <input type="color" className="h-6 w-8 cursor-pointer bg-transparent border-none p-0" value={settings.shadowColor} onChange={e => updateSetting('shadowColor', e.target.value)} />
                </div>
            </div>
        </ControlGroup>

        <ControlGroup title="3. 逐格動畫控制 (Timeline Control)">
            <div className="bg-[#111] p-3 rounded mb-2 border border-gray-700 font-mono text-[10px] select-none">
                <div className="flex justify-between items-end mb-2">
                    <span className="text-gray-400 font-bold">手動預覽控制 (Scrubber)</span>
                    <span className="text-accent font-bold bg-gray-800 px-2 py-0.5 rounded border border-gray-600">
                        {(currentT / 1000).toFixed(2)}s / {(totalDuration / 1000).toFixed(1)}s
                    </span>
                </div>
                
                <div className="h-6 w-full bg-gray-900 rounded-md flex relative overflow-hidden ring-1 ring-gray-700 mb-4">
                    <div className="h-full bg-blue-900/40 border-r border-blue-500/30 flex items-center justify-center text-blue-200" style={{width: `${pctSolid}%`}}></div>
                    <div className="h-full bg-orange-900/40 border-r border-orange-500/30 flex items-center justify-center text-orange-200" style={{width: `${pctSpin}%`}}></div>
                    <div className="h-full bg-purple-900/40 border-r border-purple-500/30 flex items-center justify-center text-purple-200" style={{width: `${pctRipple}%`}}></div>
                    <div className="h-full bg-green-900/40 flex items-center justify-center text-green-200" style={{width: `${pctHold}%`}}></div>
                    
                    {/* Playhead Indicator */}
                    <div 
                        className="absolute top-0 bottom-0 w-1 bg-white shadow-lg z-10 transition-transform duration-75 pointer-events-none" 
                        style={{ left: `${(currentT / totalDuration) * 100}%` }}
                    />
                </div>

                {/* Scrubber Range Input */}
                <input
                    type="range"
                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-primary mb-3"
                    min={0}
                    max={totalDuration}
                    step={10}
                    value={currentT}
                    onChange={(e) => onScrub(parseFloat(e.target.value))}
                />

                <div className="flex gap-2">
                    <Button className="flex-1 py-1 text-[10px]" onClick={() => onScrub(Math.max(0, currentT - 100))}>
                        ⏮ -100ms
                    </Button>
                    <Button className="flex-1 py-1 text-[10px]" onClick={() => onScrub(Math.min(totalDuration, currentT + 100))}>
                        ⏭ +100ms
                    </Button>
                    <Button className="px-3 py-1 text-[10px] bg-accent/20 border-accent/40 text-accent" onClick={() => onScrub(0)}>
                        ↺ 重置
                    </Button>
                </div>
            </div>

            <div className="space-y-4 mt-6">
                <div className="relative border-l-2 border-blue-500 pl-3">
                    <RangeControl 
                        label="Phase 1: 純色持續 (Solid)" 
                        min={0} max={5000} step={100} 
                        value={settings.solidBaseDuration} 
                        onChange={e => updateSetting('solidBaseDuration', parseFloat(e.target.value))} 
                    />
                </div>
                <div className="relative border-l-2 border-orange-500 pl-3">
                    <RangeControl 
                        label="Phase 2: 運轉持續 (Spinning)" 
                        min={500} max={10000} step={100} 
                        value={settings.duration} 
                        onChange={e => updateSetting('duration', parseFloat(e.target.value))} 
                    />
                </div>
                <div className="relative border-l-2 border-purple-500 pl-3">
                    <RangeControl 
                        label="Phase 3: 逐字停止 (Stagger)" 
                        min={0} max={2000} step={10} 
                        value={settings.stagger} 
                        onChange={e => updateSetting('stagger', parseFloat(e.target.value))} 
                    />
                </div>
                <div className="relative border-l-2 border-green-500 pl-3">
                    <RangeControl 
                        label="Phase 4: 結尾停留 (Hold)" 
                        min={0} max={5000} step={100} 
                        value={settings.endHoldDuration} 
                        onChange={e => updateSetting('endHoldDuration', parseFloat(e.target.value))} 
                    />
                </div>
            </div>

            {settings.slotEffect && (
                <div className="mt-6 pt-4 border-t border-gray-600">
                    <div className="flex justify-between items-center mb-2">
                        <label className="text-[10px] uppercase text-gray-300 font-bold">字母映射 (Mapping)</label>
                        <div className="flex gap-1">
                            <button onClick={handleRandomizeImages} title="隨機圖片" className="text-[10px] px-2 py-0.5 bg-gray-700 hover:bg-gray-600 rounded text-gray-300">🎲</button>
                            <button onClick={handleResetMappings} title="重置" className="text-[10px] px-2 py-0.5 bg-gray-700 hover:bg-red-900 rounded text-red-300">↺</button>
                        </div>
                    </div>
                    <div className="max-h-[250px] overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                        {mappings.map((map, i) => {
                            const asset = assets.find(a => a.id === map.imgId) || assets[0];
                            const fontName = settings.font.split(',')[0].replace(/['"]/g, '');
                            const bgStyle: React.CSSProperties = asset ? {
                                backgroundImage: `url(${asset.url})`,
                                backgroundPosition: `${50 + map.x}% ${50 + map.y}%`,
                                backgroundSize: (map.scale === 100 && !map.fitHeight) ? 'cover' : (map.fitHeight ? `auto ${map.scale}%` : `${map.scale}% auto`),
                                WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent', fontFamily: fontName,
                            } : { fontFamily: fontName };

                            return (
                                <div key={i} className="flex gap-3 bg-black/40 p-2 rounded border border-transparent hover:border-gray-700 transition-colors">
                                    <div className="w-[80px] h-[80px] bg-[#111] rounded border border-gray-700 flex items-center justify-center overflow-hidden shrink-0 relative shadow-inner">
                                        {asset ? <span className="text-5xl font-black leading-none" style={bgStyle}>{map.char}</span> : <span className="text-gray-500 text-3xl font-mono">{map.char}</span>}
                                    </div>
                                    <div className="flex-1 flex flex-col justify-center gap-2 min-w-0">
                                        <select 
                                            className="bg-[#333] text-[10px] text-white rounded p-1.5 w-full border border-gray-600 focus:border-primary appearance-none"
                                            value={map.imgId || ''}
                                            onChange={(e) => updateMapping(i, { imgId: e.target.value || null })}
                                        >
                                            <option value="">預設</option>
                                            {assets.map((a, idx) => <option key={a.id} value={a.id}>圖 {idx+1}</option>)}
                                        </select>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </ControlGroup>

        <ControlGroup title="4. 場景與素材 (Scene & Assets)">
            <div className="mb-4">
                <label className="text-[10px] uppercase text-gray-400 mb-2 block">圖片素材庫 (Assets)</label>
                <div className="flex gap-2 mb-2">
                    <label className="flex-1 cursor-pointer bg-[#333] hover:bg-gray-600 text-white text-xs py-2 px-3 rounded flex items-center justify-center border border-gray-600 transition-colors">
                        <span>+ 新增圖片</span>
                        <input type="file" multiple accept="image/*" onChange={onUploadAssets} className="hidden" />
                    </label>
                    <Button onClick={onClearAssets} className="px-3 bg-red-900/30 border-red-800/50 text-red-400 hover:bg-red-900">清空</Button>
                </div>
                <div className="grid grid-cols-5 gap-2 mt-2 max-h-[100px] overflow-y-auto p-1 custom-scrollbar">
                  {assets.map((asset, idx) => (
                    <div key={asset.id} className="relative w-full aspect-square rounded border border-gray-700 bg-cover bg-center group" style={{backgroundImage: `url(${asset.url})`}}>
                       <button onClick={() => onRemoveAsset(asset.id)} className="absolute inset-0 bg-red-900/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-20 font-bold">✕</button>
                    </div>
                  ))}
                </div>
            </div>

            <div className="mb-4 pt-3 border-t border-gray-700">
                <label className="text-[10px] uppercase text-gray-400 mb-2 block">場景底色 (Scene Base)</label>
                <div className="flex gap-1 mb-2">
                    <button 
                        onClick={() => updateSetting('sceneBgType', 'solid')}
                        className={`flex-1 py-1.5 text-[10px] rounded border transition-colors ${settings.sceneBgType === 'solid' ? 'bg-primary border-primary text-white' : 'bg-[#151515] border-gray-700 text-gray-400 hover:text-white'}`}
                    >
                        純色 (Solid)
                    </button>
                    <button 
                        onClick={() => updateSetting('sceneBgType', 'gradient')}
                        className={`flex-1 py-1.5 text-[10px] rounded border transition-colors ${settings.sceneBgType === 'gradient' ? 'bg-primary border-primary text-white' : 'bg-[#151515] border-gray-700 text-gray-400 hover:text-white'}`}
                    >
                        漸層 (Gradient)
                    </button>
                </div>
                
                <div className="flex gap-2 items-center bg-[#151515] p-2 rounded border border-gray-700">
                     <input type="color" className="h-6 flex-1 cursor-pointer bg-transparent border-none p-0" value={settings.sceneBgColor} onChange={e => updateSetting('sceneBgColor', e.target.value)} title="Primary Color" />
                     {settings.sceneBgType === 'gradient' && (
                         <>
                            <span className="text-gray-500 text-[10px]">to</span>
                            <input type="color" className="h-6 flex-1 cursor-pointer bg-transparent border-none p-0" value={settings.sceneBgColor2} onChange={e => updateSetting('sceneBgColor2', e.target.value)} title="Secondary Color" />
                         </>
                     )}
                </div>

                {settings.sceneBgType === 'gradient' && (
                    <div className="mt-2">
                        <Select value={settings.sceneBgGradientDir} onChange={e => updateSetting('sceneBgGradientDir', e.target.value)}>
                            <option value="to bottom">⬇ 垂直 (Top to Bottom)</option>
                            <option value="to right">➡ 水平 (Left to Right)</option>
                            <option value="135deg">↘ 對角 (Diagonal)</option>
                            <option value="radial">◎ 放射狀 (Radial)</option>
                        </Select>
                    </div>
                )}
            </div>

            <div className="mb-4 pt-3 border-t border-gray-700">
                <label className="text-[10px] uppercase text-gray-400 mb-2 block">疊加背景圖 (Overlay Image)</label>
                <div className="flex gap-2 mb-2">
                    <label className="flex-1 cursor-pointer bg-[#151515] hover:bg-[#222] text-gray-400 hover:text-white text-xs py-2 px-3 rounded flex items-center justify-center border border-gray-700 transition-colors">
                        <span>{settings.bgImage ? '更換圖片...' : '上傳圖片...'}</span>
                        <input type="file" accept="image/*" onChange={onUploadBg} className="hidden" />
                    </label>
                    {settings.bgImage && (
                        <Button onClick={() => updateSetting('bgImage', null)} className="px-3 bg-red-900/30 border-red-800/50 text-red-400 hover:bg-red-900" title="移除背景圖">✕</Button>
                    )}
                </div>
                
                <div className="mb-2">
                   <RangeControl label="背景模糊 (Blur)" min={0} max={20} step={1} value={settings.bgBlur} onChange={e => updateSetting('bgBlur', parseFloat(e.target.value))} />
                </div>

                <div className="flex gap-4 mt-2">
                    <CheckboxControl label="半色調 (Halftone)" checked={settings.halftone} onChange={e => updateSetting('halftone', e.target.checked)} />
                    <CheckboxControl label="電影黑邊" checked={settings.cineBars} onChange={e => updateSetting('cineBars', e.target.checked)} />
                </div>
            </div>

            <div className="pt-3 border-t border-gray-700">
                <label className="text-[10px] uppercase text-gray-400">音效 (Audio)</label>
                <label className="cursor-pointer bg-[#151515] hover:bg-[#222] text-gray-400 hover:text-white text-xs py-2 px-3 rounded flex items-center justify-center border border-gray-700 transition-colors mb-2">
                    <span>{settings.audioUrl ? '更換音效...' : '上傳 MP3...'}</span>
                    <input type="file" accept="audio/*" onChange={onUploadAudio} className="hidden" />
                </label>
            </div>
        </ControlGroup>

        <div className="mt-auto pt-4 space-y-2 pb-6">
            <div className="flex gap-2">
                <Button variant="primary" className="flex-1 py-3 text-base flex items-center justify-center gap-2" onClick={onPlay} disabled={isExporting}>
                    {isPlaying ? '⏹ 停止播放' : '▶ 開始播放'}
                </Button>
                <Button className="w-12 flex items-center justify-center text-lg" onClick={toggleWireframe}>
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
