
import React, { useMemo, useState } from 'react';
import { IntroSettings, IntroAsset, CharMapping } from '../types';
import { ControlGroup, RangeControl, CheckboxControl, TextInput, Select, Button, ColorControl } from './Controls';
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

  const currentT = manualTime ?? 0;

  // 計算時間軸視覺條占比
  const timelineSegments = useMemo(() => {
    const p1 = settings.solidBaseDuration;
    const p2 = settings.duration;
    const p3 = (settings.text.length - 1) * settings.stagger;
    const p4 = settings.endHoldDuration;
    const total = p1 + p2 + p3 + p4;
    return {
      p1: (p1 / total) * 100,
      p2: (p2 / total) * 100,
      p3: (p3 / total) * 100,
      p4: (p4 / total) * 100,
    };
  }, [settings, totalDuration]);

  return (
    <div className={`w-[450px] bg-[#121212] border-r border-[#333] flex flex-col p-5 overflow-y-auto shrink-0 z-10 h-full ${isExporting ? 'opacity-50 pointer-events-none' : ''} custom-scrollbar shadow-2xl`}>
        
        <ControlGroup title="0. 快速預設 (PRESETS)">
            <div className="grid grid-cols-2 gap-2">
                {ANIMATION_PRESETS.map(preset => (
                    <button
                        key={preset.id}
                        onClick={() => onApplyPreset(preset.settings as any)}
                        className="bg-[#222] hover:bg-primary/20 text-gray-400 hover:text-white text-[10px] py-2.5 px-2 rounded-md transition-all border border-[#333] hover:border-primary active:scale-95"
                    >
                        {preset.label}
                    </button>
                ))}
            </div>
        </ControlGroup>

        <ControlGroup title="1. 標題與字體 (MAIN TEXT)">
            <TextInput label="主標題文字" value={settings.text} onChange={e => updateSetting('text', e.target.value.toUpperCase())} />
            <div className="mt-3">
                <Select label="主字體選擇" value={settings.font} onChange={e => updateSetting('font', e.target.value)}>
                    {FONTS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                </Select>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-4">
                <RangeControl label="文字大小 (%)" min={1} max={50} value={settings.textSize} onChange={e => updateSetting('textSize', parseFloat(e.target.value))} />
                <RangeControl label="字元間距 (EM)" min={-0.2} max={0.5} step={0.01} value={settings.spacing} onChange={e => updateSetting('spacing', parseFloat(e.target.value))} />
            </div>

            <div className="mt-4 pt-4 border-t border-[#333] space-y-4">
                <div className="grid grid-cols-2 gap-3">
                    <ColorControl label="文字顏色" value={settings.textColor} onChange={val => updateSetting('textColor', val)} />
                    <ColorControl label="標題背景顏色" value={settings.bgColor} onChange={val => updateSetting('bgColor', val)} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <RangeControl label="標題背景透明度" min={0} max={1} step={0.01} value={settings.bgOpacity} onChange={e => updateSetting('bgOpacity', parseFloat(e.target.value))} />
                    <ColorControl label="陰影/深度顏色" value={settings.shadowColor} onChange={val => updateSetting('shadowColor', val)} />
                </div>
            </div>
        </ControlGroup>

        <ControlGroup title="2. 副標題控制 (SUB-TITLE)">
            <CheckboxControl label="啟用副標題" checked={settings.subEnabled} onChange={e => updateSetting('subEnabled', e.target.checked)} />
            {settings.subEnabled && (
                <div className="space-y-4 mt-4 pl-3 border-l-2 border-primary/40 bg-black/20 p-4 rounded-r-lg">
                    <TextInput label="副標題文字" value={settings.subText} onChange={e => updateSetting('subText', e.target.value.toUpperCase())} />
                    <div className="grid grid-cols-2 gap-4">
                         <RangeControl label="字體大小" min={1} max={20} step={0.1} value={settings.subSize} onChange={e => updateSetting('subSize', parseFloat(e.target.value))} />
                         <RangeControl label="字元間距" min={-0.2} max={1} step={0.01} value={settings.subSpacing} onChange={e => updateSetting('subSpacing', parseFloat(e.target.value))} />
                    </div>
                    <div className="grid grid-cols-2 gap-4 items-end">
                        <RangeControl label="垂直邊距 (Margin Top)" min={-10} max={30} step={0.1} value={settings.subMargin} onChange={e => updateSetting('subMargin', parseFloat(e.target.value))} />
                        <ColorControl label="副標題顏色" value={settings.subColor} onChange={val => updateSetting('subColor', val)} />
                    </div>
                </div>
            )}
        </ControlGroup>

        <ControlGroup title="3. 場景與背景 (SCENE)">
            <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                    <Select label="背景類型" value={settings.sceneBgType} onChange={e => updateSetting('sceneBgType', e.target.value)}>
                        <option value="solid">單色背景 (Solid)</option>
                        <option value="gradient">漸層背景 (Gradient)</option>
                    </Select>
                    <Select label="漸層方向" value={settings.sceneBgGradientDir} onChange={e => updateSetting('sceneBgGradientDir', e.target.value)}>
                        <option value="to bottom">由上至下 ↓</option>
                        <option value="to right">由左至右 →</option>
                        <option value="radial">放射狀 ☉</option>
                    </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <ColorControl label="主要顏色 1" value={settings.sceneBgColor} onChange={val => updateSetting('sceneBgColor', val)} />
                    <ColorControl label="主要顏色 2" value={settings.sceneBgColor2} onChange={val => updateSetting('sceneBgColor2', val)} />
                </div>
                <div className="pt-2">
                    <label className="cursor-pointer bg-[#222] hover:bg-[#333] text-gray-400 text-[10px] py-2 px-3 rounded border border-[#444] block text-center truncate mb-2">
                        {settings.bgImage ? '✅ 背景圖已載入' : '📁 上傳背景圖片'}
                        <input type="file" accept="image/*" onChange={onUploadBg} className="hidden" />
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                        <RangeControl label="背景模糊" min={0} max={40} value={settings.bgBlur} onChange={e => updateSetting('bgBlur', parseFloat(e.target.value))} />
                        <RangeControl label="背景調暗" min={0} max={1} step={0.01} value={settings.bgDimmer} onChange={e => updateSetting('bgDimmer', parseFloat(e.target.value))} />
                    </div>
                </div>
            </div>
        </ControlGroup>

        <ControlGroup title="4. 3D 效果與發光 (3D EFFECTS)">
            <div className="grid grid-cols-2 gap-4">
                <RangeControl label="3D 深度厚度" min={0} max={40} value={settings.depth} onChange={e => updateSetting('depth', parseFloat(e.target.value))} />
                <RangeControl label="外發光 (Glow)" min={0} max={100} value={settings.glow} onChange={e => updateSetting('glow', parseFloat(e.target.value))} />
            </div>
            <div className="grid grid-cols-2 gap-4 mt-3">
                <RangeControl label="進場縮放起點" min={50} max={200} value={settings.startScale} onChange={e => updateSetting('startScale', parseFloat(e.target.value))} />
                <RangeControl label="邊緣閃耀" min={0} max={2} step={0.1} value={settings.rimLight} onChange={e => updateSetting('rimLight', parseFloat(e.target.value))} />
            </div>
        </ControlGroup>

        <ControlGroup title="5. 時間軸與動態規劃 (TIMELINE)">
            {/* 彩色四階段視覺化進度條 */}
            <div className="mb-4">
                <div className="flex justify-between items-center mb-1">
                    <span className="text-[9px] text-gray-500 font-black tracking-widest uppercase">Phase Visualization</span>
                    <span className="text-[9px] text-gray-500 font-mono">{(currentT / 1000).toFixed(2)}s</span>
                </div>
                <div className="h-2 w-full flex rounded-full overflow-hidden border border-black/50 shadow-inner mb-2">
                    <div className="bg-gray-600" style={{ width: `${timelineSegments.p1}%` }} title="Phase 1: Solid"></div>
                    <div className="bg-red-600" style={{ width: `${timelineSegments.p2}%` }} title="Phase 2: Action"></div>
                    <div className="bg-orange-500" style={{ width: `${timelineSegments.p3}%` }} title="Phase 3: Stagger"></div>
                    <div className="bg-green-600" style={{ width: `${timelineSegments.p4}%` }} title="Phase 4: Hold"></div>
                </div>
                <input type="range" className="w-full h-1.5 bg-[#222] rounded-lg appearance-none cursor-pointer accent-primary" min={0} max={totalDuration} step={10} value={currentT} onChange={(e) => onScrub(parseFloat(e.target.value))} />
            </div>

            <div className="grid grid-cols-2 gap-x-4 gap-y-3 pt-3 border-t border-[#333]">
                <CheckboxControl label="開啟老虎機捲動" checked={settings.slotEffect} onChange={e => updateSetting('slotEffect', e.target.checked)} />
                <Select label="結束樣式" value={settings.endStyle} onChange={e => updateSetting('endStyle', e.target.value)}>
                    <option value="image">定格於照片 (Images)</option>
                    <option value="solid">定格於純色 (Solid Color)</option>
                </Select>
            </div>

            <div className="space-y-4 mt-4">
                <RangeControl label="1. 起始純色時間" min={0} max={3000} step={100} value={settings.solidBaseDuration} onChange={e => updateSetting('solidBaseDuration', parseFloat(e.target.value))} />
                <RangeControl label="2. 主要動態時間" min={500} max={10000} step={100} value={settings.duration} onChange={e => updateSetting('duration', parseFloat(e.target.value))} />
                <RangeControl label="3. 字元停止間隔" min={0} max={1000} step={10} value={settings.stagger} onChange={e => updateSetting('stagger', parseFloat(e.target.value))} />
                <RangeControl label="4. 結尾定格時間" min={500} max={5000} step={100} value={settings.endHoldDuration} onChange={e => updateSetting('endHoldDuration', parseFloat(e.target.value))} />
            </div>
        </ControlGroup>

        <ControlGroup title="6. 字母映射設定 (CHAR MAPPING)">
            <div className="flex justify-between items-center mb-4">
                <label className="text-[10px] uppercase text-gray-500 font-bold tracking-widest">逐字映射與預覽</label>
                <div className="flex gap-2">
                    <button onClick={handleRandomizeImages} className="text-[9px] px-2 py-1 bg-[#222] border border-[#444] text-gray-400 rounded hover:text-white transition-all">🎲 隨機分配</button>
                    <button onClick={handleResetMappings} className="text-[9px] px-2 py-1 bg-red-900/10 border border-red-900/30 text-red-500 rounded hover:bg-red-600 hover:text-white transition-all">↺ 重設</button>
                </div>
            </div>

            <div className="space-y-3">
                {mappings.map((map, i) => (
                    <div key={i} className={`bg-[#181818] rounded-lg border overflow-hidden transition-all ${expandedMapping === i ? 'border-primary shadow-lg shadow-red-900/10' : 'border-[#333]'}`}>
                        <div className="p-3 flex items-center justify-between cursor-pointer hover:bg-white/5" onClick={() => setExpandedMapping(expandedMapping === i ? null : i)}>
                            <div className="flex items-center gap-4">
                                <div className="w-8 h-8 bg-primary text-white font-black flex items-center justify-center rounded text-sm">{map.char}</div>
                                <span className="text-[10px] text-gray-400 font-bold uppercase">Character {i+1}</span>
                            </div>
                            <span className={`text-primary text-xs transition-transform ${expandedMapping === i ? 'rotate-180' : ''}`}>▼</span>
                        </div>
                        
                        {expandedMapping === i && (
                            <div className="p-4 bg-black/40 border-t border-[#333] flex gap-4">
                                {/* 100x100 高解析預覽視窗 */}
                                <div className="w-[100px] h-[100px] shrink-0 bg-[#111] border border-primary/30 rounded overflow-hidden relative group">
                                    {map.imgId && assets.find(a => a.id === map.imgId) ? (
                                        <div 
                                            className="w-full h-full bg-no-repeat transition-all"
                                            style={{ 
                                                backgroundImage: `url(${assets.find(a => a.id === map.imgId)?.url})`,
                                                backgroundSize: map.fitHeight ? `auto ${map.scale}%` : `${map.scale}% auto`,
                                                backgroundPosition: `${50 + map.x}% ${50 + map.y}%`
                                            }}
                                        >
                                            {/* 預覽疊加字元遮罩 */}
                                            <div className="absolute inset-0 flex items-center justify-center text-white/20 font-black text-6xl pointer-events-none select-none" style={{ fontFamily: settings.font }}>
                                                {map.char}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-[9px] text-gray-700 italic text-center p-2 uppercase">No Asset Assigned</div>
                                    )}
                                </div>

                                <div className="flex-1 space-y-3">
                                    <Select label="選擇映射素材" value={map.imgId || ''} onChange={e => updateMapping(i, { imgId: e.target.value || null })}>
                                        <option value="">預設 (不分配)</option>
                                        {assets.map((a, idx) => <option key={a.id} value={a.id}>素材庫 #{idx + 1}</option>)}
                                    </Select>
                                    <div className="grid grid-cols-1 gap-2">
                                        <RangeControl label="圖片縮放" min={10} max={300} value={map.scale} onChange={e => updateMapping(i, { scale: parseFloat(e.target.value) })} />
                                        <div className="flex items-center gap-4">
                                            <RangeControl label="X 軸" className="flex-1" min={-100} max={100} value={map.x} onChange={e => updateMapping(i, { x: parseFloat(e.target.value) })} />
                                            <RangeControl label="Y 軸" className="flex-1" min={-100} max={100} value={map.y} onChange={e => updateMapping(i, { y: parseFloat(e.target.value) })} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </ControlGroup>

        <div className="mt-auto pt-6 space-y-3 pb-8">
            <Button variant="primary" className="w-full py-4 text-sm flex items-center justify-center gap-3 shadow-2xl active:scale-95" onClick={onPlay} disabled={isExporting}>
                {isPlaying ? '⏹ 停止播放 (STOP)' : '▶ 開始播放序幕 (PLAY)'}
            </Button>
            <div className="flex gap-2">
                <Button className="flex-1 py-2.5" onClick={onSnapshot}>📷 截圖</Button>
                <Button className="flex-1 py-2.5" onClick={onExportGif} disabled={isExporting}>{isExporting ? '處理中...' : '🎬 匯出 GIF'}</Button>
            </div>
        </div>
    </div>
  );
};
