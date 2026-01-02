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
}

export const IntroControls: React.FC<IntroControlsProps> = ({
  settings, updateSetting, onApplyPreset, assets, mappings, updateMapping,
  onUploadAssets, onClearAssets, onRemoveAsset, onUploadBg, onUploadAudio,
  onPlay, onSnapshot, onExportGif, isPlaying, isExporting,
  isWireframe, toggleWireframe
}) => {

  const handleRandomizeImages = () => {
    if (assets.length === 0) return;
    mappings.forEach((_, i) => updateMapping(i, { imgId: assets[Math.floor(Math.random() * assets.length)].id }));
  };

  const handleResetMappings = () => {
    mappings.forEach((_, i) => updateMapping(i, { 
        imgId: assets.length > 0 ? assets[i % assets.length].id : null,
        scale: 100, x: 0, y: 0, fitHeight: false, duration: 0 // Duration unused in UI mapping override now
    }));
  };

  const handleResetTilt = () => {
      updateSetting('tiltAngleX', 0);
      updateSetting('tiltAngleY', 0);
  };

  // --- Timeline Calculations ---
  // Phase 1: Solid (0 -> solidBaseDuration)
  // Phase 2: Spin (solidBaseDuration -> solidBaseDuration + duration)
  // Phase 3: Ripple (Starts at Phase 2 End, Ends at Last Char Lock)
  // Phase 4: Hold (After Last Lock)
  const timelineStats = useMemo(() => {
      const t1 = settings.solidBaseDuration;
      const t2 = t1 + settings.duration; // Spin End
      const charCount = settings.text.length || 1;
      const rippleDuration = (charCount - 1) * settings.stagger;
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

  return (
    <div className={`w-[450px] bg-panel border-r border-border flex flex-col p-4 overflow-y-auto shrink-0 z-10 h-full ${isExporting ? 'opacity-50 pointer-events-none' : ''}`}>
        
        <ControlGroup title="0. 快速預設 (Presets)">
            <div className="grid grid-cols-3 gap-2">
                {ANIMATION_PRESETS.map(preset => (
                    <button
                        key={preset.id}
                        onClick={() => onApplyPreset(preset.settings)}
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
            <div className="flex gap-2 mt-3 bg-[#111] p-2 rounded">
                <div className="flex-1">
                     <label className="text-[10px] text-gray-400 block mb-1">背景色</label>
                     <input type="color" className="w-full h-8 cursor-pointer bg-transparent" value={settings.bgColor} onChange={e => updateSetting('bgColor', e.target.value)} />
                </div>
                <div className="flex-1">
                     <label className="text-[10px] text-gray-400 block mb-1">文字顏色</label>
                     <input type="color" className="w-full h-8 cursor-pointer bg-transparent" value={settings.textColor} onChange={e => updateSetting('textColor', e.target.value)} />
                </div>
            </div>
        </ControlGroup>

        <ControlGroup title="2. 外觀樣式 (Appearance)">
            <RangeControl label="背景不透明度" min={0} max={1} step={0.01} value={settings.bgOpacity} onChange={e => updateSetting('bgOpacity', parseFloat(e.target.value))} />
            <RangeControl label="文字大小" min={1} max={50} value={settings.textSize} onChange={e => updateSetting('textSize', parseFloat(e.target.value))} />
            <RangeControl label="字元間距" min={-0.2} max={0.5} step={0.01} value={settings.spacing} onChange={e => updateSetting('spacing', parseFloat(e.target.value))} />
            <RangeControl label="3D 厚度" min={0} max={30} value={settings.depth} onChange={e => updateSetting('depth', parseFloat(e.target.value))} />
            <RangeControl label="發光強度" min={0} max={50} value={settings.glow} onChange={e => updateSetting('glow', parseFloat(e.target.value))} />
            
            <div className="flex items-center justify-between mb-2 mt-2 bg-[#111] p-2 rounded">
                <label className="text-[10px] text-gray-400 uppercase tracking-wider">Text Shadow Color</label>
                <div className="flex items-center gap-2">
                    <span className="text-[10px] text-gray-500 font-mono">{settings.shadowColor}</span>
                    <input type="color" className="h-6 w-8 cursor-pointer bg-transparent border-none p-0" value={settings.shadowColor} onChange={e => updateSetting('shadowColor', e.target.value)} />
                </div>
            </div>

            <div className="border-t border-gray-700 my-3"></div>
            
            <CheckboxControl label="啟用副標題" checked={settings.subEnabled} onChange={e => updateSetting('subEnabled', e.target.checked)} />
            {settings.subEnabled && (
                <div className="space-y-2 mt-2 pl-2 border-l border-gray-700">
                    <TextInput value={settings.subText} onChange={e => updateSetting('subText', e.target.value)} />
                    <RangeControl label="Size" min={1} max={30} value={settings.subSize} onChange={e => updateSetting('subSize', parseFloat(e.target.value))} />
                    <RangeControl label="Spacing" min={0} max={2} step={0.1} value={settings.subSpacing} onChange={e => updateSetting('subSpacing', parseFloat(e.target.value))} />
                    <RangeControl label="頂部邊距" min={0} max={10} step={0.5} value={settings.subMargin} onChange={e => updateSetting('subMargin', parseFloat(e.target.value))} />
                </div>
            )}
        </ControlGroup>

        <ControlGroup title="3. 動畫流程 (Time Sequence)">
            {/* 4-Phase Timeline Visualizer */}
            <div className="bg-[#111] p-3 rounded mb-4 border border-gray-700 font-mono text-[10px] select-none">
                <div className="flex justify-between text-gray-400 mb-2">
                    <span>時間軸分佈</span>
                    <span className="text-gray-500 font-bold">總長: {(timelineStats.total / 1000).toFixed(1)}s</span>
                </div>
                <div className="h-5 w-full bg-gray-800 rounded flex relative overflow-hidden ring-1 ring-gray-700">
                    {/* Phase 1: Solid (Blue) */}
                    <div className="h-full bg-blue-600/70 border-r border-black/20 flex items-center justify-center text-white/70" style={{width: `${pctSolid}%`}} title="純色期">
                        {pctSolid > 10 && "1.純色"}
                    </div>
                    {/* Phase 2: Spin (Orange) */}
                    <div className="h-full bg-orange-600/70 border-r border-black/20 flex items-center justify-center text-white/70" style={{width: `${pctSpin}%`}} title="運轉期">
                        {pctSpin > 10 && "2.運轉"}
                    </div>
                    {/* Phase 3: Ripple (Purple) */}
                    <div className="h-full bg-purple-600/70 border-r border-black/20 flex items-center justify-center text-white/70" style={{width: `${pctRipple}%`}} title="鎖定期">
                        {pctRipple > 10 && "3.鎖定"}
                    </div>
                    {/* Phase 4: Hold (Green) */}
                    <div className="h-full bg-green-600/70 flex items-center justify-center text-white/70" style={{width: `${pctHold}%`}} title="展示期">
                        {pctHold > 10 && "4.展示"}
                    </div>
                </div>
            </div>

            <div className="space-y-4">
                {/* Phase 1 Control */}
                <div className="relative border-l-2 border-blue-500 pl-3">
                    <h3 className="text-xs font-bold text-blue-400 uppercase mb-2">Phase 1: 純色靜止 (Solid)</h3>
                    <RangeControl 
                        label="靜止持續時間 (Duration)" 
                        min={0} max={5000} step={100} 
                        value={settings.solidBaseDuration} 
                        onChange={e => updateSetting('solidBaseDuration', parseFloat(e.target.value))} 
                    />
                    <div className="pt-2 mt-2 border-t border-gray-700/50">
                        <RangeControl 
                            label="[獨立] 縮放動畫長度 (Zoom)" 
                            min={500} max={15000} step={100} 
                            value={settings.zoomDuration} 
                            onChange={e => updateSetting('zoomDuration', parseFloat(e.target.value))} 
                        />
                        <RangeControl label="起始縮放 (Start Scale)" min={0} max={300} value={settings.startScale} onChange={e => updateSetting('startScale', parseFloat(e.target.value))} />
                    </div>
                </div>

                {/* Phase 2 Control */}
                <div className="relative border-l-2 border-orange-500 pl-3">
                    <h3 className="text-xs font-bold text-orange-400 uppercase mb-2">Phase 2: 運轉 (Spinning)</h3>
                    <RangeControl 
                        label="滾動運轉時間 (Duration)" 
                        min={500} max={10000} step={100} 
                        value={settings.duration} 
                        onChange={e => updateSetting('duration', parseFloat(e.target.value))} 
                    />
                    <div className="grid grid-cols-2 gap-2 mt-2 bg-orange-500/10 p-2 rounded">
                        <CheckboxControl 
                            label="獨立圖片隨機 (Independent)" 
                            checked={settings.independentRoll} 
                            onChange={e => updateSetting('independentRoll', e.target.checked)} 
                        />
                         <div className="text-[9px] text-gray-400 col-span-2 mt-1">
                            {settings.independentRoll 
                                ? "目前模式：每個字顯示不同圖片 (混亂感)" 
                                : "目前模式：單張大圖遮罩 (滿版質感)"}
                        </div>
                    </div>
                    <RangeControl label="圖片切換速度 (Flash Speed)" min={30} max={200} step={1} value={settings.speed} onChange={e => updateSetting('speed', parseFloat(e.target.value))} />
                    <RangeControl label="位置抖動 (Jitter)" min={0} max={20} value={settings.jitter} onChange={e => updateSetting('jitter', parseFloat(e.target.value))} />
                </div>

                {/* Phase 3 Control */}
                <div className="relative border-l-2 border-purple-500 pl-3">
                    <h3 className="text-xs font-bold text-purple-400 uppercase mb-2">Phase 3: 鎖定 (Locking)</h3>
                    <div className="bg-purple-500/10 p-2 rounded border border-purple-500/30">
                        <RangeControl 
                            label="逐字停止間隔 (Stop Interval)" 
                            min={0} max={2000} step={10} 
                            value={settings.stagger} 
                            onChange={e => updateSetting('stagger', parseFloat(e.target.value))} 
                        />
                        <div className="text-[9px] text-purple-300 mt-1 text-center">
                            數值越大 = 減速感越明顯 (逐字停止越慢)
                        </div>
                    </div>
                </div>

                {/* Phase 4 Control */}
                <div className="relative border-l-2 border-green-500 pl-3">
                    <h3 className="text-xs font-bold text-green-400 uppercase mb-2">Phase 4: 結尾 (End)</h3>
                    <RangeControl 
                        label="結束停留時間 (Hold Duration)" 
                        min={0} max={5000} step={100} 
                        value={settings.endHoldDuration} 
                        onChange={e => updateSetting('endHoldDuration', parseFloat(e.target.value))} 
                    />
                    
                    <div className="mt-2 pt-2 border-t border-gray-700">
                        <div className="flex gap-2 items-center mb-2">
                            <CheckboxControl label="啟用 3D 視角" checked={settings.tilt} onChange={e => updateSetting('tilt', e.target.checked)} />
                            {settings.tilt && (
                                <button onClick={handleResetTilt} className="text-[10px] bg-gray-700 hover:bg-gray-600 px-2 py-0.5 rounded text-white ml-2">重置</button>
                            )}
                        </div>
                        {settings.tilt && (
                            <CheckboxControl label="自動懸浮 (Auto Float)" checked={settings.tiltAuto} onChange={e => updateSetting('tiltAuto', e.target.checked)} className="pl-4 text-gray-400" />
                        )}
                    </div>
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
                    <div className="max-h-[350px] overflow-y-auto space-y-2 pr-1 custom-scrollbar">
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
                                        <div className="grid grid-cols-3 gap-1">
                                            {['scale','x','y'].map(k => (
                                                <div key={k} className="flex items-center bg-[#222] rounded px-1 border border-gray-700">
                                                    <span className="text-[9px] text-gray-500 mr-1 uppercase">{k[0]}</span>
                                                    <input type="number" className="w-full bg-transparent text-[10px] text-white py-1 text-center focus:outline-none" value={(map as any)[k]} onChange={(e) => updateMapping(i, { [k]: parseInt(e.target.value) })} />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </ControlGroup>

        <ControlGroup title="4. 場景與素材 (Scene & Assets)">
            {/* Assets Management */}
            <div className="mb-4 p-2 bg-black/20 rounded border border-gray-700">
                <label className="text-[10px] uppercase text-gray-400 mb-2 block">圖片素材庫 (Assets)</label>
                <div className="flex gap-2 mb-2">
                    <label className="flex-1 cursor-pointer bg-[#333] hover:bg-gray-600 text-white text-xs py-2 px-3 rounded flex items-center justify-center border border-gray-600 transition-colors">
                        <span>+ 新增圖片</span>
                        <input type="file" multiple accept="image/*" onChange={onUploadAssets} className="hidden" />
                    </label>
                    <Button onClick={onClearAssets} className="px-3 bg-red-900/30 border-red-800/50 text-red-400 hover:bg-red-900 hover:text-white">
                        清空
                    </Button>
                </div>
                
                {/* Visual Grid of Assets for Quick Reference and Deletion */}
                <div className="grid grid-cols-5 gap-2 mt-2 max-h-[150px] overflow-y-auto p-1 custom-scrollbar">
                  {assets.map((asset, idx) => (
                    <div key={asset.id} className="relative w-full aspect-square rounded border border-gray-700 bg-cover bg-center group" style={{backgroundImage: `url(${asset.url})`}}>
                       <div className="absolute top-0 left-0 bg-black/80 text-[9px] text-white px-1.5 py-0.5 rounded-br font-mono z-10">{idx+1}</div>
                       <button 
                            onClick={() => onRemoveAsset(asset.id)} 
                            title="移除此圖片"
                            className="absolute inset-0 bg-red-900/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-20 font-bold"
                        >
                            ✕
                        </button>
                    </div>
                  ))}
                  {assets.length === 0 && (
                      <div className="col-span-5 text-[10px] text-gray-500 text-center py-4 italic border border-dashed border-gray-800 rounded">
                          尚未載入圖片
                      </div>
                  )}
                </div>

                <div className="text-[10px] text-gray-500 text-right mt-1">
                    目前共有 {assets.length} 張圖片
                </div>
            </div>

            {/* Background Image */}
            <div className="mb-4">
                <div className="flex justify-between items-center mb-1">
                     <label className="text-[10px] uppercase text-gray-400">背景圖片 (Background)</label>
                     {settings.bgImage && (
                         <button 
                            onClick={() => updateSetting('bgImage', null)}
                            className="text-[9px] text-red-400 hover:text-white"
                         >
                            移除
                         </button>
                     )}
                </div>
                <label className="block w-full cursor-pointer bg-[#151515] border border-gray-700 hover:border-gray-500 text-gray-400 text-xs py-2 px-3 rounded truncate transition-colors mb-2">
                    {settings.bgImage ? '更換背景圖片...' : '上傳背景圖片...'}
                    <input type="file" accept="image/*" onChange={onUploadBg} className="hidden" />
                </label>

                {!settings.bgImage && (
                    <div className="flex items-center gap-2 mt-2 mb-2 p-1.5 bg-black/20 rounded border border-gray-700">
                         <span className="text-[10px] text-gray-400 pl-1">背景底色</span>
                         <div className="flex-1 flex items-center gap-2">
                             <input 
                                type="color" 
                                className="h-5 w-8 bg-transparent border-none p-0 cursor-pointer"
                                value={settings.sceneBgColor || '#ffffff'} 
                                onChange={e => updateSetting('sceneBgColor', e.target.value)}
                             />
                             <span className="text-[10px] text-gray-500 font-mono uppercase">{settings.sceneBgColor}</span>
                         </div>
                    </div>
                )}
                
                <RangeControl 
                    label="背景暗化 (Dimmer)" 
                    min={0} max={1} step={0.05} 
                    value={settings.bgDimmer} 
                    onChange={e => updateSetting('bgDimmer', parseFloat(e.target.value))} 
                />
                <RangeControl 
                    label="背景模糊 (Blur)" 
                    min={0} max={20} step={1} 
                    value={settings.bgBlur} 
                    onChange={e => updateSetting('bgBlur', parseFloat(e.target.value))} 
                />
            </div>

            {/* Effects */}
            <div className="grid grid-cols-2 gap-2 mb-4">
                <CheckboxControl label="漫畫網點 (Halftone)" checked={settings.halftone} onChange={e => updateSetting('halftone', e.target.checked)} />
                <CheckboxControl label="電影黑邊 (CineBars)" checked={settings.cineBars} onChange={e => updateSetting('cineBars', e.target.checked)} />
            </div>

            {/* Audio */}
            <div className="border-t border-gray-700 pt-3">
                <div className="flex justify-between items-center mb-1">
                     <label className="text-[10px] uppercase text-gray-400">背景音樂 (Audio)</label>
                     {settings.audioUrl && (
                         <button 
                            onClick={() => updateSetting('audioUrl', null)}
                            className="text-[9px] text-red-400 hover:text-white"
                         >
                            移除
                         </button>
                     )}
                </div>
                <label className="block w-full cursor-pointer bg-[#151515] border border-gray-700 hover:border-gray-500 text-gray-400 text-xs py-2 px-3 rounded truncate transition-colors mb-2">
                    {settings.audioUrl ? '更換音樂 (MP3)...' : '上傳音樂 (MP3)...'}
                    <input type="file" accept="audio/*" onChange={onUploadAudio} className="hidden" />
                </label>
                <RangeControl 
                    label="音量 (Volume)" 
                    min={0} max={1} step={0.1} 
                    value={settings.volume} 
                    onChange={e => updateSetting('volume', parseFloat(e.target.value))} 
                />
            </div>
        </ControlGroup>

        <div className="mt-auto pt-2 space-y-2">
            <div className="flex items-center justify-between gap-2 mb-1">
                <button 
                    onClick={toggleWireframe}
                    className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded text-xs border transition-colors ${isWireframe ? 'bg-blue-900 border-blue-500 text-blue-200' : 'bg-[#222] border-gray-700 text-gray-400 hover:text-white'}`}
                >
                    {isWireframe ? '🦴 骨架預覽中' : '🦴 骨架預覽 (Wireframe)'}
                </button>
            </div>
            
            <div className="flex gap-2">
                <Button variant={isPlaying ? 'secondary' : 'primary'} className="flex-[2] text-base" onClick={onPlay}>
                    {isPlaying ? '⏹ 停止' : '▶ 播放序列'}
                </Button>
            </div>
            <div className="flex gap-2">
                 <Button className="flex-1" onClick={onSnapshot}>📷 截圖</Button>
                 <Button className="flex-1" onClick={onExportGif} disabled={isExporting}>
                    {isExporting ? '生成中...' : '🎬 匯出 GIF'}
                 </Button>
            </div>
        </div>
    </div>
  );
};