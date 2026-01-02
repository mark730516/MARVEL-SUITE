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
  onUploadBg: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onUploadAudio: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onPlay: () => void;
  onSnapshot: () => void;
  onExportGif: () => void;
  isPlaying: boolean;
  isExporting: boolean;
}

export const IntroControls: React.FC<IntroControlsProps> = ({
  settings, updateSetting, onApplyPreset, assets, mappings, updateMapping,
  onUploadAssets, onClearAssets, onUploadBg, onUploadAudio,
  onPlay, onSnapshot, onExportGif, isPlaying, isExporting
}) => {

  // Batch Tools
  const handleRandomizeImages = () => {
    if (assets.length === 0) return;
    mappings.forEach((_, i) => {
        const randomAsset = assets[Math.floor(Math.random() * assets.length)];
        updateMapping(i, { imgId: randomAsset.id });
    });
  };

  const handleResetMappings = () => {
    mappings.forEach((_, i) => {
        updateMapping(i, { 
            imgId: assets.length > 0 ? assets[i % assets.length].id : null,
            scale: 100,
            x: 0,
            y: 0,
            fitHeight: false,
            duration: settings.duration + (i * settings.stagger)
        });
    });
  };

  const handleSyncTimes = () => {
      mappings.forEach((_, i) => {
          updateMapping(i, { duration: settings.duration + (i * settings.stagger) });
      });
  };

  const handleResetTilt = () => {
      updateSetting('tiltAngleX', 0);
      updateSetting('tiltAngleY', 0);
  };

  // Calculate Timeline Stats
  const timelineStats = useMemo(() => {
      const charCount = settings.text.length || 0;
      const firstLock = settings.duration / 1000;
      // Last char locks at: duration + ((count-1) * stagger)
      const totalAnimTime = charCount > 0 
        ? (settings.duration + ((charCount - 1) * settings.stagger)) / 1000 
        : 0;
      
      return {
          firstLock: firstLock.toFixed(1),
          lastLock: totalAnimTime.toFixed(1),
          total: (totalAnimTime + 0.5).toFixed(1) // Add small buffer
      };
  }, [settings.duration, settings.stagger, settings.text]);

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
                    <input 
                        type="color" 
                        className="h-6 w-8 cursor-pointer bg-transparent border-none p-0" 
                        value={settings.shadowColor} 
                        onChange={e => updateSetting('shadowColor', e.target.value)} 
                    />
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

        <ControlGroup title="3. 動畫流程 (Animation Flow)">
            {/* Timeline Visualizer */}
            <div className="bg-[#111] p-3 rounded mb-4 border border-gray-700 font-mono text-[10px]">
                <div className="flex justify-between text-gray-400 mb-1">
                    <span>開始</span>
                    <span>結束</span>
                </div>
                <div className="h-1.5 w-full bg-gray-800 rounded-full overflow-hidden flex">
                    <div className="h-full bg-blue-500" style={{width: '20%'}} title="進場"></div>
                    <div className="h-full bg-primary" style={{width: '50%'}} title="循環與定格"></div>
                    <div className="h-full bg-green-500" style={{width: '30%'}} title="結尾"></div>
                </div>
                <div className="flex justify-between mt-1 text-white font-bold">
                    <span>0s</span>
                    <span>首字定格: {timelineStats.firstLock}s</span>
                    <span>總時長: ~{timelineStats.lastLock}s</span>
                </div>
            </div>

            <div className="space-y-6">
                {/* Phase 1 */}
                <div className="relative border-l-2 border-blue-500 pl-3">
                    <h3 className="text-xs font-bold text-blue-400 uppercase mb-2">Phase 1: 進場 (Start)</h3>
                    <div className="mb-2">
                        <label className="block text-[10px] uppercase text-gray-400 mb-1 tracking-wider">起始樣式 (Start Style)</label>
                        <div className="flex gap-2">
                            <button
                                onClick={() => updateSetting('startStyle', 'solid')}
                                className={`flex-1 py-1.5 text-xs rounded border transition-colors ${
                                    settings.startStyle === 'solid' 
                                    ? 'bg-gray-100 text-black border-white font-bold' 
                                    : 'bg-transparent text-gray-500 border-gray-700 hover:border-gray-500'
                                }`}
                            >
                                預設顏色
                            </button>
                            <button
                                onClick={() => updateSetting('startStyle', 'image')}
                                className={`flex-1 py-1.5 text-xs rounded border transition-colors ${
                                    settings.startStyle === 'image' 
                                    ? 'bg-gray-100 text-black border-white font-bold' 
                                    : 'bg-transparent text-gray-500 border-gray-700 hover:border-gray-500'
                                }`}
                            >
                                照片套用
                            </button>
                        </div>
                    </div>
                    <RangeControl label="起始縮放 (Start Scale)" min={0} max={300} value={settings.startScale} onChange={e => updateSetting('startScale', parseFloat(e.target.value))} />
                    <RangeControl label="Y 軸起始偏移" min={-200} max={200} value={settings.offsetY} onChange={e => updateSetting('offsetY', parseFloat(e.target.value))} />
                </div>

                {/* Phase 2 */}
                <div className="relative border-l-2 border-primary pl-3">
                    <div className="flex justify-between items-center mb-2">
                        <h3 className="text-xs font-bold text-primary uppercase">Phase 2: 運轉 (Loop)</h3>
                        <CheckboxControl label="開啟特效" checked={settings.slotEffect} onChange={e => updateSetting('slotEffect', e.target.checked)} />
                    </div>
                    {settings.slotEffect && (
                        <>
                            <RangeControl label="圖片切換速度 (ms)" min={30} max={200} step={1} value={settings.speed} onChange={e => updateSetting('speed', parseFloat(e.target.value))} />
                            <RangeControl label="圖片位置抖動 (%)" min={0} max={20} value={settings.jitter} onChange={e => updateSetting('jitter', parseFloat(e.target.value))} />
                        </>
                    )}
                </div>

                {/* Phase 3 */}
                <div className="relative border-l-2 border-orange-500 pl-3">
                    <h3 className="text-xs font-bold text-orange-400 uppercase mb-2">Phase 3: 定格 (Freeze)</h3>
                    <RangeControl 
                        label="首字鎖定時間 (Base Duration)" 
                        min={500} max={10000} step={100} 
                        value={settings.duration} 
                        onChange={e => updateSetting('duration', parseFloat(e.target.value))} 
                    />
                    <div className="bg-orange-500/10 p-2 rounded border border-orange-500/30">
                        <RangeControl 
                            label="➔ 後續字母間隔 (Interval/Stagger)" 
                            min={0} max={1000} step={10} 
                            value={settings.stagger} 
                            onChange={e => updateSetting('stagger', parseFloat(e.target.value))} 
                        />
                        <div className="text-[9px] text-orange-300 mt-1 text-center">
                            每個字母將比前一個晚 {settings.stagger}ms 停止
                        </div>
                    </div>
                </div>

                {/* Phase 4 */}
                <div className="relative border-l-2 border-green-500 pl-3">
                    <h3 className="text-xs font-bold text-green-400 uppercase mb-2">Phase 4: 結尾 (End)</h3>
                    
                    <div className="mb-2">
                        <label className="block text-[10px] uppercase text-gray-400 mb-1 tracking-wider">結束狀態 (Final State)</label>
                        <div className="flex gap-2">
                            <button
                                onClick={() => updateSetting('endStyle', 'solid')}
                                className={`flex-1 py-1.5 text-xs rounded border transition-colors ${
                                    settings.endStyle === 'solid' 
                                    ? 'bg-gray-100 text-black border-white font-bold' 
                                    : 'bg-transparent text-gray-500 border-gray-700 hover:border-gray-500'
                                }`}
                            >
                                變回純色
                            </button>
                            <button
                                onClick={() => updateSetting('endStyle', 'image')}
                                className={`flex-1 py-1.5 text-xs rounded border transition-colors ${
                                    settings.endStyle === 'image' 
                                    ? 'bg-gray-100 text-black border-white font-bold' 
                                    : 'bg-transparent text-gray-500 border-gray-700 hover:border-gray-500'
                                }`}
                            >
                                保留影像
                            </button>
                        </div>
                    </div>
                    
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
                        <label className="text-[10px] uppercase text-gray-300 font-bold">字母獨立微調 (Fine Tune)</label>
                        <div className="flex gap-1">
                            <button onClick={handleRandomizeImages} title="隨機圖片" className="text-[10px] px-2 py-0.5 bg-gray-700 hover:bg-gray-600 rounded text-gray-300">🎲</button>
                            <button onClick={handleSyncTimes} title="重算時間" className="text-[10px] px-2 py-0.5 bg-gray-700 hover:bg-gray-600 rounded text-gray-300">⏱ 同步</button>
                            <button onClick={handleResetMappings} title="全部重置" className="text-[10px] px-2 py-0.5 bg-gray-700 hover:bg-red-900 rounded text-red-300">↺</button>
                        </div>
                    </div>
                    <div className="max-h-[350px] overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                        {mappings.map((map, i) => {
                            const asset = assets.find(a => a.id === map.imgId) || assets[0];
                            const fontName = settings.font.split(',')[0].replace(/['"]/g, '');
                            
                            // Background style for preview
                            const bgStyle: React.CSSProperties = asset ? {
                                backgroundImage: `url(${asset.url})`,
                                backgroundPosition: `${50 + map.x}% ${50 + map.y}%`,
                                backgroundSize: (map.scale === 100 && !map.fitHeight) ? 'cover' : (map.fitHeight ? `auto ${map.scale}%` : `${map.scale}% auto`),
                                WebkitBackgroundClip: 'text',
                                backgroundClip: 'text',
                                color: 'transparent',
                                fontFamily: fontName,
                            } : {
                                fontFamily: fontName,
                            };

                            return (
                                <div key={i} className="flex gap-3 bg-black/40 p-2 rounded border border-transparent hover:border-gray-700 transition-colors">
                                    {/* Visual Thumbnail (100x100) */}
                                    <div className="w-[100px] h-[100px] bg-[#111] rounded border border-gray-700 flex items-center justify-center overflow-hidden shrink-0 relative shadow-inner">
                                        {asset ? (
                                            <span className="text-6xl font-black leading-none" style={bgStyle}>
                                                {map.char}
                                            </span>
                                        ) : (
                                                <span className="text-gray-500 text-3xl font-mono">{map.char}</span>
                                        )}
                                        <div className="absolute bottom-0 right-0 bg-black/70 text-[9px] text-white px-1">
                                            {(map.duration / 1000).toFixed(1)}s
                                        </div>
                                    </div>
                                    
                                    {/* Controls */}
                                    <div className="flex-1 flex flex-col justify-center gap-2 min-w-0">
                                        <div className="flex gap-2 items-center">
                                            <select 
                                                className="bg-[#333] text-[10px] text-white rounded p-1.5 flex-1 border border-gray-600 focus:border-primary appearance-none min-w-0"
                                                value={map.imgId || ''}
                                                onChange={(e) => updateMapping(i, { imgId: e.target.value || null })}
                                            >
                                                <option value="">預設</option>
                                                {assets.map((a, idx) => <option key={a.id} value={a.id}>圖 {idx+1}</option>)}
                                            </select>

                                            {/* Individual Duration Override */}
                                            <input 
                                                type="number" 
                                                step="0.01"
                                                className="w-12 bg-[#222] text-[10px] text-orange-400 rounded p-1.5 border border-gray-600 focus:border-orange-500 text-right focus:outline-none"
                                                value={(map.duration / 1000).toFixed(2)}
                                                onChange={(e) => updateMapping(i, { duration: parseFloat(e.target.value) * 1000 })}
                                                title="定格時間 (秒)"
                                                placeholder="秒"
                                            />
                                        </div>

                                        <div className="grid grid-cols-3 gap-1">
                                            <div className="flex items-center bg-[#222] rounded px-1 border border-gray-700">
                                                <span className="text-[9px] text-gray-500 mr-1">S</span>
                                                <input 
                                                    type="number" 
                                                    className="w-full bg-transparent text-[10px] text-white py-1 text-center focus:outline-none"
                                                    value={map.scale}
                                                    onChange={(e) => updateMapping(i, { scale: parseInt(e.target.value) })}
                                                />
                                            </div>
                                            <div className="flex items-center bg-[#222] rounded px-1 border border-gray-700">
                                                <span className="text-[9px] text-gray-500 mr-1">X</span>
                                                <input 
                                                    type="number" 
                                                    className="w-full bg-transparent text-[10px] text-white py-1 text-center focus:outline-none"
                                                    value={map.x}
                                                    onChange={(e) => updateMapping(i, { x: parseInt(e.target.value) })}
                                                />
                                            </div>
                                            <div className="flex items-center bg-[#222] rounded px-1 border border-gray-700">
                                                <span className="text-[9px] text-gray-500 mr-1">Y</span>
                                                <input 
                                                    type="number" 
                                                    className="w-full bg-transparent text-[10px] text-white py-1 text-center focus:outline-none"
                                                    value={map.y}
                                                    onChange={(e) => updateMapping(i, { y: parseInt(e.target.value) })}
                                                />
                                            </div>
                                        </div>

                                        <label className="flex items-center gap-1.5 cursor-pointer">
                                            <input 
                                                type="checkbox" 
                                                className="w-3 h-3 rounded bg-gray-700 border-gray-600 text-primary focus:ring-primary accent-primary"
                                                checked={map.fitHeight}
                                                onChange={(e) => updateMapping(i, { fitHeight: e.target.checked })}
                                            />
                                            <span className="text-[9px] text-gray-400">依高度縮放</span>
                                        </label>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </ControlGroup>

        <ControlGroup title="4. 場景素材 (Scene Assets)">
             <div className="flex gap-2 mb-2">
                <label className="flex-1 flex items-center justify-center p-2 border border-dashed border-gray-600 rounded cursor-pointer hover:border-white text-xs text-gray-400 hover:text-white transition-colors">
                    <span>+ 新增圖片</span>
                    <input type="file" className="hidden" multiple accept="image/*" onChange={onUploadAssets} />
                </label>
                <Button onClick={onClearAssets} className="text-xs px-2">清空</Button>
             </div>
             
             <div className="grid grid-cols-5 gap-1 mb-4">
                {assets.map((a, i) => (
                    <div key={a.id} className="aspect-square bg-cover bg-center rounded border border-gray-700 relative group" style={{backgroundImage: `url(${a.url})`}}>
                        <div className="absolute inset-0 bg-black/50 hidden group-hover:flex items-center justify-center text-[10px] text-white">#{i+1}</div>
                    </div>
                ))}
                {assets.length === 0 && <div className="col-span-5 text-[10px] text-gray-500 text-center py-2 border border-dashed border-gray-800 rounded">尚未載入素材</div>}
             </div>

             <div className="flex items-center gap-2 mb-2">
                 <label className="flex-1 truncate text-xs text-gray-400 border border-gray-700 rounded p-1 cursor-pointer hover:border-white">
                    {settings.bgImage ? '更換背景' : '上傳背景圖'}
                    <input type="file" className="hidden" accept="image/*" onChange={onUploadBg} />
                 </label>
                 {settings.bgImage && <Button onClick={() => updateSetting('bgImage', null)} className="px-2 py-1 text-xs">✕</Button>}
             </div>
             <RangeControl label="背景暗化" min={0} max={1} step={0.01} value={settings.bgDimmer} onChange={e => updateSetting('bgDimmer', parseFloat(e.target.value))} />
             <RangeControl label="背景模糊" min={0} max={20} step={1} value={settings.bgBlur} onChange={e => updateSetting('bgBlur', parseFloat(e.target.value))} />
             
             <div className="flex gap-4 my-2">
                 <CheckboxControl label="網點特效" checked={settings.halftone} onChange={e => updateSetting('halftone', e.target.checked)} />
                 <CheckboxControl label="電影黑邊" checked={settings.cineBars} onChange={e => updateSetting('cineBars', e.target.checked)} />
             </div>

             <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-700">
                 <label className="flex-1 truncate text-xs text-gray-400 border border-gray-700 rounded p-1 cursor-pointer hover:border-white">
                    {settings.audioUrl ? '更換音效' : '上傳 MP3'}
                    <input type="file" className="hidden" accept="audio/*" onChange={onUploadAudio} />
                 </label>
                 {settings.audioUrl && <Button onClick={() => updateSetting('audioUrl', null)} className="px-2 py-1 text-xs">✕</Button>}
                 <div className="w-16">
                     <RangeControl label="音量" min={0} max={1} step={0.1} value={settings.volume} onChange={e => updateSetting('volume', parseFloat(e.target.value))} className="mb-0" />
                 </div>
             </div>
        </ControlGroup>

        <div className="mt-auto pt-2 space-y-2">
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