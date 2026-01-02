import React, { useState } from 'react';
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
  const [fontOptions, setFontOptions] = useState(FONTS);
  const [loadingFonts, setLoadingFonts] = useState(false);

  const handleLoadSystemFonts = async () => {
    if (loadingFonts) return;
    setLoadingFonts(true);
    try {
      // @ts-ignore - queryLocalFonts is an experimental feature
      if (typeof window.queryLocalFonts !== 'function') {
        alert('您的瀏覽器不支援讀取本機字體 (請使用 Chrome/Edge 電腦版)');
        setLoadingFonts(false);
        return;
      }

      // @ts-ignore
      const availableFonts = await window.queryLocalFonts();
      const uniqueFonts = new Set<string>();
      const formattedFonts = [];

      // Start with default fonts to ensure they remain available
      formattedFonts.push(...FONTS);
      
      // Initialize Set with default font names to avoid duplicates if possible
      FONTS.forEach(f => {
         const match = f.value.match(/"([^"]+)"/);
         if(match) uniqueFonts.add(match[1]);
      });

      for (const fontData of availableFonts) {
        if (!uniqueFonts.has(fontData.family)) {
          uniqueFonts.add(fontData.family);
          formattedFonts.push({
            label: fontData.family,
            value: `"${fontData.family}", sans-serif`
          });
        }
      }
      
      setFontOptions(formattedFonts);
      alert(`成功載入 ${formattedFonts.length - FONTS.length} 個系統字體！`);
    } catch (err) {
      console.error(err);
      alert('無法讀取字體：請確認您已允許存取權限。');
    } finally {
      setLoadingFonts(false);
    }
  };

  return (
    <div className={`w-[450px] bg-panel border-r border-border flex flex-col p-4 overflow-y-auto shrink-0 z-10 h-full ${isExporting ? 'opacity-50 pointer-events-none' : ''}`}>
        
        <ControlGroup title="0. 快速預設">
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

        <ControlGroup title="1. 內容設定">
            <TextInput label="主標題" value={settings.text} onChange={e => updateSetting('text', e.target.value.toUpperCase())} />
            <div className="mt-2">
                <div className="flex justify-between items-end mb-1">
                    <label className="text-[10px] uppercase text-gray-400 tracking-wider">字體</label>
                    <button 
                        onClick={handleLoadSystemFonts}
                        disabled={loadingFonts}
                        className="text-[10px] text-accent hover:text-white underline cursor-pointer disabled:opacity-50"
                    >
                        {loadingFonts ? '讀取中...' : '📂 載入系統字體'}
                    </button>
                </div>
                <Select value={settings.font} onChange={e => updateSetting('font', e.target.value)}>
                    {fontOptions.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
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

        <ControlGroup title="2. 外觀樣式">
            <RangeControl label="背景不透明度" min={0} max={1} step={0.05} value={settings.bgOpacity} valueDisplay={`${Math.round(settings.bgOpacity*100)}%`} onChange={e => updateSetting('bgOpacity', parseFloat(e.target.value))} />
            <RangeControl label="文字大小" min={1} max={50} value={settings.textSize} valueDisplay={`${settings.textSize}%`} onChange={e => updateSetting('textSize', parseFloat(e.target.value))} />
            <RangeControl label="字元間距" min={-0.2} max={0.5} step={0.01} value={settings.spacing} valueDisplay={`${settings.spacing}em`} onChange={e => updateSetting('spacing', parseFloat(e.target.value))} />
            <RangeControl label="3D 厚度" min={0} max={30} value={settings.depth} valueDisplay={`${settings.depth}px`} onChange={e => updateSetting('depth', parseFloat(e.target.value))} />
            <RangeControl label="發光強度" min={0} max={50} value={settings.glow} valueDisplay={`${settings.glow}px`} onChange={e => updateSetting('glow', parseFloat(e.target.value))} />
            
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
                    <RangeControl label="Size" min={1} max={30} value={settings.subSize} valueDisplay={`${settings.subSize}%`} onChange={e => updateSetting('subSize', parseFloat(e.target.value))} />
                    <RangeControl label="Spacing" min={0} max={2} step={0.1} value={settings.subSpacing} valueDisplay={`${settings.subSpacing}em`} onChange={e => updateSetting('subSpacing', parseFloat(e.target.value))} />
                    <RangeControl label="頂部邊距" min={0} max={10} step={0.5} value={settings.subMargin} valueDisplay={`${settings.subMargin}%`} onChange={e => updateSetting('subMargin', parseFloat(e.target.value))} />
                </div>
            )}
        </ControlGroup>

        <ControlGroup title="3. 動畫設定">
            <div className="flex gap-4">
                <CheckboxControl label="老虎機特效" checked={settings.slotEffect} onChange={e => updateSetting('slotEffect', e.target.checked)} className="text-primary" />
                <CheckboxControl label="3D 傾斜" checked={settings.tilt} onChange={e => updateSetting('tilt', e.target.checked)} />
            </div>
            <div className="border-t border-gray-700 my-3"></div>
            
            <RangeControl label="總時長 (毫秒)" min={500} max={10000} step={100} value={settings.duration} valueDisplay={`${settings.duration}ms`} onChange={e => updateSetting('duration', parseFloat(e.target.value))} />
            
            {settings.slotEffect && (
                <div className="bg-[#1a1a1a] p-2 rounded mt-2 border border-gray-700">
                    <RangeControl label="定格延遲 (毫秒)" min={50} max={500} step={10} value={settings.stagger} valueDisplay={`${settings.stagger}ms`} onChange={e => updateSetting('stagger', parseFloat(e.target.value))} />
                    <RangeControl label="閃爍速度 (毫秒)" min={30} max={200} step={10} value={settings.speed} valueDisplay={`${settings.speed}ms`} onChange={e => updateSetting('speed', parseFloat(e.target.value))} />
                    <RangeControl label="抖動幅度" min={0} max={20} value={settings.jitter} valueDisplay={`${settings.jitter}%`} onChange={e => updateSetting('jitter', parseFloat(e.target.value))} />
                    <CheckboxControl label="結尾變回純色" checked={settings.solidFinal} onChange={e => updateSetting('solidFinal', e.target.checked)} className="mt-2" />
                    
                    <div className="mt-3">
                        <label className="text-[10px] uppercase text-gray-400 mb-1 block">字母映射與秒數 (秒)</label>
                        <div className="max-h-[200px] overflow-y-auto space-y-1 pr-1">
                            {mappings.map((map, i) => (
                                <div key={i} className="flex gap-1 items-center bg-black/40 p-1 rounded">
                                    <span className="font-bold text-primary w-5 text-center text-lg shrink-0">{map.char}</span>
                                    
                                    {/* Image Selector */}
                                    <select 
                                        className="bg-[#333] text-[10px] text-white rounded p-1 flex-1 border border-gray-600 focus:border-primary w-20"
                                        value={map.imgId || ''}
                                        onChange={(e) => updateMapping(i, { imgId: e.target.value || null })}
                                    >
                                        <option value="">預設</option>
                                        {assets.map((a, idx) => <option key={a.id} value={a.id}>圖 {idx+1}</option>)}
                                    </select>
                                    
                                    {/* Scale Input */}
                                    <input 
                                        type="number" 
                                        className="w-10 bg-[#333] text-[10px] text-white rounded p-1 border border-gray-600"
                                        value={map.scale}
                                        onChange={(e) => updateMapping(i, { scale: parseInt(e.target.value) })}
                                        title="縮放 %"
                                        placeholder="%"
                                    />

                                    {/* Duration Input (Seconds) */}
                                    <input 
                                        type="number" 
                                        step="0.1"
                                        className="w-10 bg-[#333] text-[10px] text-accent rounded p-1 border border-gray-600 focus:border-accent"
                                        value={(map.duration / 1000).toFixed(1)}
                                        onChange={(e) => updateMapping(i, { duration: parseFloat(e.target.value) * 1000 })}
                                        title="停止秒數 (秒)"
                                        placeholder="秒"
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
            <RangeControl label="起始縮放" min={0} max={300} value={settings.startScale} valueDisplay={`${settings.startScale}%`} onChange={e => updateSetting('startScale', parseFloat(e.target.value))} className="mt-2"/>
            <RangeControl label="Y 軸偏移" min={-200} max={200} value={settings.offsetY} valueDisplay={`${settings.offsetY}px`} onChange={e => updateSetting('offsetY', parseFloat(e.target.value))} />
        </ControlGroup>

        <ControlGroup title="4. 場景素材">
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
             <RangeControl label="背景暗化" min={0} max={1} step={0.05} value={settings.bgDimmer} valueDisplay={`${Math.round(settings.bgDimmer*100)}%`} onChange={e => updateSetting('bgDimmer', parseFloat(e.target.value))} />
             <RangeControl label="背景模糊" min={0} max={20} step={1} value={settings.bgBlur} valueDisplay={`${settings.bgBlur}px`} onChange={e => updateSetting('bgBlur', parseFloat(e.target.value))} />
             
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