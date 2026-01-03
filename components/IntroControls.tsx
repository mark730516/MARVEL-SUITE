
import React, { useState } from 'react';
import { IntroSettings, IntroAsset, CharMapping, LibraryAsset } from '../types';
import { ControlGroup, RangeControl, CheckboxControl, TextInput, Select, Button, ColorControl, CompactNumberInput } from './Controls';
import { FONTS, ANIMATION_PRESETS, DEFAULT_INTRO_SETTINGS } from '../constants';

interface IntroControlsProps {
  activeModule: 'assets' | 'mapping' | 'text' | 'motion' | 'scene';
  settings: IntroSettings;
  updateSetting: (key: keyof IntroSettings, value: any) => void;
  assets: IntroAsset[];
  library: LibraryAsset[];
  mappings: CharMapping[];
  updateMapping: (index: number, changes: Partial<CharMapping>) => void;
  onApplyPreset: (preset: Partial<IntroSettings>) => void;
  
  // Asset Actions
  onUploadAssets: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onAddFromLibrary: (asset: LibraryAsset) => void;
  onDeleteFromLibrary: (id: string) => void;
  onRemoveAsset: (id: string) => void;
  onUploadAudio: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onUploadBg: (e: React.ChangeEvent<HTMLInputElement>) => void;

  // Transport
  isPlaying: boolean;
  onPlay: () => void;
  onSnapshot: () => void;
  onExportGif: () => void;
  isExporting: boolean;
  totalDuration: number;
  manualTime: number | null;
  onScrub: (time: number) => void;
  cinemaMode: boolean;
  toggleCinema: () => void;
}

export const IntroControls: React.FC<IntroControlsProps> = ({
  activeModule, settings, updateSetting, assets, library, mappings, updateMapping, onApplyPreset,
  onUploadAssets, onAddFromLibrary, onDeleteFromLibrary, onRemoveAsset, onUploadAudio, onUploadBg,
  isPlaying, onPlay, onSnapshot, onExportGif, isExporting, totalDuration, manualTime, onScrub,
  cinemaMode, toggleCinema
}) => {
  const [expandedMapping, setExpandedMapping] = useState<number | null>(null);
  const currentT = manualTime ?? 0;

  // Helper for Frame Nudging
  const nudgeTime = (delta: number) => {
      const newTime = Math.min(Math.max((manualTime ?? 0) + delta, 0), totalDuration);
      onScrub(newTime);
  };

  // Helper for resetting settings
  const resetSetting = (key: keyof IntroSettings) => {
      updateSetting(key, DEFAULT_INTRO_SETTINGS[key]);
  };

  // --- Render Functions per Module ---

  const renderAssetsModule = () => (
      <div className="space-y-6">
          <ControlGroup title="1. 當前序列 (CURRENT SEQUENCE)">
              <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-[#333] rounded-lg hover:border-primary hover:bg-primary/5 transition-all cursor-pointer group">
                  <span className="text-2xl mb-2 group-hover:scale-110 transition-transform">📂</span>
                  <span className="text-xs font-bold text-gray-400 group-hover:text-white">點擊上傳圖片 (Multiple)</span>
                  <input type="file" multiple accept="image/*" onChange={onUploadAssets} className="hidden" />
              </label>
              
              <div className="grid grid-cols-4 gap-2 mt-4 max-h-[200px] overflow-y-auto custom-scrollbar pr-1">
                  {assets.map((a, idx) => (
                      <div key={a.id} className="relative group aspect-square bg-black border border-[#333] rounded overflow-hidden">
                          <img src={a.url} className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity" />
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                              <button onClick={() => onRemoveAsset(a.id)} className="text-red-500 font-bold text-xs hover:scale-125 transition-transform">✕</button>
                          </div>
                          <span className="absolute bottom-0 right-0 bg-black/80 text-[8px] text-gray-400 px-1">{idx+1}</span>
                      </div>
                  ))}
                  {assets.length === 0 && <div className="col-span-4 text-center text-[10px] text-gray-600 py-4 italic">序列中無素材</div>}
              </div>
          </ControlGroup>

          <ControlGroup title="2. 雲端圖庫 (LIBRARY)">
              <div className="grid grid-cols-3 gap-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-1">
                  {library.map((item) => (
                      <div key={item.id} className="relative group aspect-square bg-[#111] border border-[#333] rounded overflow-hidden cursor-pointer hover:border-gray-500" onClick={() => onAddFromLibrary(item)}>
                          <img src={item.src} className="w-full h-full object-cover" />
                          <button 
                            onClick={(e) => { e.stopPropagation(); onDeleteFromLibrary(item.id); }} 
                            className="absolute top-1 right-1 w-4 h-4 bg-red-600/80 rounded-full text-[8px] text-white opacity-0 group-hover:opacity-100 flex items-center justify-center hover:bg-red-500"
                          >✕</button>
                      </div>
                  ))}
              </div>
          </ControlGroup>
      </div>
  );

  const renderMappingModule = () => (
      <div className="space-y-4">
          <div className="flex justify-between items-center bg-[#111] p-2 rounded border border-[#333]">
              <span className="text-[10px] font-bold text-gray-400">快速操作</span>
              <div className="flex gap-2">
                  <button onClick={() => mappings.forEach((_, i) => updateMapping(i, { imgId: assets[Math.floor(Math.random() * assets.length)]?.id }))} className="px-2 py-1 bg-[#222] text-[9px] rounded hover:text-white">🎲 隨機分配</button>
                  <button onClick={() => mappings.forEach((_, i) => updateMapping(i, { imgId: assets[i % assets.length]?.id, scale: 100, x: 0, y: -50 }))} className="px-2 py-1 bg-red-900/20 text-red-500 text-[9px] rounded hover:bg-red-600 hover:text-white">↺ 重置所有</button>
              </div>
          </div>

          <div className="space-y-2">
              {mappings.map((map, i) => {
                  const isActive = expandedMapping === i;
                  return (
                      <div key={i} className={`bg-[#181818] rounded-lg border transition-all ${isActive ? 'border-primary ring-1 ring-primary/20' : 'border-[#333]'}`}>
                          <div 
                              className="flex items-center p-2 cursor-pointer hover:bg-white/5"
                              onClick={() => setExpandedMapping(isActive ? null : i)}
                          >
                              <div className="w-8 h-8 bg-black border border-[#333] flex items-center justify-center font-black text-white rounded mr-3 text-lg font-anton">{map.char}</div>
                              <div className="flex-1 min-w-0">
                                  <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Character {i+1}</div>
                                  <div className="text-[10px] text-primary truncate">{assets.find(a => a.id === map.imgId) ? 'Asset Assigned' : 'No Asset'}</div>
                              </div>
                              <span className="text-gray-600 text-[10px]">{isActive ? '▲' : '▼'}</span>
                          </div>

                          {isActive && (
                              <div className="p-3 border-t border-[#333] bg-black/20">
                                  {/* 精細預覽視窗 (Prepper Logic Integration) */}
                                  <div className="flex gap-4 mb-4">
                                      <div className="w-[120px] h-[120px] shrink-0 bg-[#0a0a0a] border border-primary/30 rounded overflow-hidden relative shadow-inner">
                                          {map.imgId && assets.find(a => a.id === map.imgId) ? (
                                              <div 
                                                  className="w-full h-full bg-no-repeat transition-all"
                                                  style={{ 
                                                      backgroundImage: `url(${assets.find(a => a.id === map.imgId)?.url})`,
                                                      backgroundSize: map.fitHeight ? `auto ${map.scale}%` : `${map.scale}% auto`,
                                                      backgroundPosition: `${50 + map.x}% ${50 + map.y}%`
                                                  }}
                                              >
                                                  <div className="absolute inset-0 flex items-center justify-center text-white/20 font-black text-[80px] pointer-events-none select-none" style={{ fontFamily: settings.font, lineHeight: 1 }}>
                                                      {map.char}
                                                  </div>
                                              </div>
                                          ) : <div className="w-full h-full flex items-center justify-center text-[8px] text-gray-700">NO IMAGE</div>}
                                      </div>
                                      <div className="flex-1 space-y-2">
                                          <Select value={map.imgId || ''} onChange={e => updateMapping(i, { imgId: e.target.value || null })}>
                                              <option value="">(無素材)</option>
                                              {assets.map((a, idx) => <option key={a.id} value={a.id}>Asset #{idx + 1}</option>)}
                                          </Select>
                                          <CompactNumberInput label="SCALE %" min={10} max={500} value={map.scale} onChange={v => updateMapping(i, { scale: v })} />
                                      </div>
                                  </div>
                                  
                                  <div className="grid grid-cols-2 gap-2">
                                      <CompactNumberInput label="POS X" min={-200} max={200} value={map.x} onChange={v => updateMapping(i, { x: v })} />
                                      <CompactNumberInput label="POS Y" min={-200} max={200} value={map.y} onChange={v => updateMapping(i, { y: v })} />
                                  </div>
                                  <div className="mt-2">
                                      <CheckboxControl label="Fit Height (適應高度)" checked={map.fitHeight} onChange={e => updateMapping(i, { fitHeight: e.target.checked })} />
                                  </div>
                              </div>
                          )}
                      </div>
                  );
              })}
          </div>
      </div>
  );

  const renderTextModule = () => (
      <div className="space-y-6">
          <ControlGroup title="1. 標題與字型 (TYPOGRAPHY)">
              <TextInput label="主標題 (MAIN TEXT)" value={settings.text} onChange={e => updateSetting('text', e.target.value.toUpperCase())} />
              <div className="h-2"></div>
              <Select label="字體 (FONT FAMILY)" value={settings.font} onChange={e => updateSetting('font', e.target.value)}>
                  {FONTS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
              </Select>
              <div className="grid grid-cols-2 gap-4 mt-4">
                  <RangeControl label="字體大小" min={5} max={40} value={settings.textSize} onChange={e => updateSetting('textSize', parseFloat(e.target.value))} onReset={() => resetSetting('textSize')} />
                  <RangeControl label="字元間距" min={-0.2} max={0.5} step={0.01} value={settings.spacing} onChange={e => updateSetting('spacing', parseFloat(e.target.value))} onReset={() => resetSetting('spacing')} />
              </div>
              <div className="mt-4 border-t border-[#333] pt-4 grid grid-cols-2 gap-3">
                  <ColorControl label="文字顏色" value={settings.textColor} onChange={v => updateSetting('textColor', v)} />
                  <ColorControl label="背景底色" value={settings.bgColor} onChange={v => updateSetting('bgColor', v)} />
              </div>
          </ControlGroup>

          <ControlGroup title="2. 遮罩設定 (MASK)">
              <RangeControl label="遮罩透明度 (Opacity)" min={0} max={1} step={0.01} value={settings.bgOpacity} onChange={e => updateSetting('bgOpacity', parseFloat(e.target.value))} onReset={() => resetSetting('bgOpacity')} />
              <p className="text-[9px] text-gray-500 mt-2">
                  * 調整此數值可改變背景對文字的遮擋程度，0 為完全透明（僅見文字），1 為完全不透明。
              </p>
          </ControlGroup>

          <ControlGroup title="3. 副標題 (SUBTITLE)">
              <CheckboxControl label="啟用副標題" checked={settings.subEnabled} onChange={e => updateSetting('subEnabled', e.target.checked)} />
              {settings.subEnabled && (
                  <div className="mt-3 pl-3 border-l border-primary/30 space-y-3">
                      <TextInput value={settings.subText} onChange={e => updateSetting('subText', e.target.value.toUpperCase())} placeholder="SUBTITLE TEXT" />
                      
                      <div className="mt-2">
                        <Select label="副標題字體" value={settings.subFont} onChange={e => updateSetting('subFont', e.target.value)}>
                            {FONTS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                        </Select>
                      </div>

                      <div className="grid grid-cols-2 gap-3 mt-2">
                          <RangeControl label="大小" min={1} max={10} step={0.1} value={settings.subSize} onChange={e => updateSetting('subSize', parseFloat(e.target.value))} onReset={() => resetSetting('subSize')} />
                          <RangeControl label="字元間距" min={-0.1} max={1.5} step={0.05} value={settings.subSpacing} onChange={e => updateSetting('subSpacing', parseFloat(e.target.value))} onReset={() => resetSetting('subSpacing')} />
                      </div>
                      <div className="mt-2">
                        <RangeControl label="位置 Y" min={0} max={20} step={0.5} value={settings.subMargin} onChange={e => updateSetting('subMargin', parseFloat(e.target.value))} onReset={() => resetSetting('subMargin')} />
                      </div>
                      <div className="mt-2">
                        <ColorControl label="副標題顏色" value={settings.subColor} onChange={v => updateSetting('subColor', v)} />
                      </div>
                  </div>
              )}
          </ControlGroup>
      </div>
  );

  const renderMotionModule = () => (
      <div className="space-y-6">
          <ControlGroup title="快速預設 (PRESETS)">
              <div className="grid grid-cols-3 gap-2">
                  {ANIMATION_PRESETS.map(p => (
                      <button key={p.id} onClick={() => onApplyPreset(p.settings as any)} className="bg-[#222] hover:bg-primary hover:text-white text-[9px] py-2 rounded text-gray-400 border border-[#333] transition-colors">
                          {p.label.split(' ')[0]}
                      </button>
                  ))}
              </div>
          </ControlGroup>

          {/* Color-Coded Block 1: Timeline (Blue) */}
          <div className="bg-[#15191e] border-l-2 border-blue-500 rounded p-3 relative">
            <h3 className="text-[10px] font-bold text-blue-400 mb-3 uppercase tracking-wider">A. 核心時序 (TIMELINE)</h3>
            <div className="space-y-3">
               <RangeControl label="1. 起始停留 (Hold)" min={0} max={3000} step={100} value={settings.solidBaseDuration} onChange={e => updateSetting('solidBaseDuration', parseFloat(e.target.value))} onReset={() => resetSetting('solidBaseDuration')} />
               <RangeControl label="2. 滾動時間 (Roll)" min={500} max={8000} step={100} value={settings.duration} onChange={e => updateSetting('duration', parseFloat(e.target.value))} onReset={() => resetSetting('duration')} />
               <RangeControl label="3. 漣漪延遲 (Stagger)" min={0} max={800} step={10} value={settings.stagger} onChange={e => updateSetting('stagger', parseFloat(e.target.value))} onReset={() => resetSetting('stagger')} />
               <RangeControl label="4. 結尾定格 (End)" min={500} max={5000} step={100} value={settings.endHoldDuration} onChange={e => updateSetting('endHoldDuration', parseFloat(e.target.value))} onReset={() => resetSetting('endHoldDuration')} />
            </div>
          </div>

          {/* Color-Coded Block 2: Scroll Behavior (Primary/Red) */}
          <div className="bg-[#1e1515] border-l-2 border-primary rounded p-3 relative">
            <h3 className="text-[10px] font-bold text-primary mb-3 uppercase tracking-wider">B. 滾動與隨機性 (SCROLL & JITTER)</h3>
            <div className="space-y-3">
               <div className="grid grid-cols-2 gap-4 bg-black/20 p-2 rounded">
                  <CheckboxControl label="啟用老虎機 (Slot)" checked={settings.slotEffect} onChange={e => updateSetting('slotEffect', e.target.checked)} onReset={() => resetSetting('slotEffect')} />
                  <CheckboxControl label="獨立滾動軸 (Indep.)" checked={settings.independentRoll} onChange={e => updateSetting('independentRoll', e.target.checked)} onReset={() => resetSetting('independentRoll')} />
               </div>
               <Select label="結束樣式 (END STYLE)" value={settings.endStyle} onChange={e => updateSetting('endStyle', e.target.value)}>
                   <option value="image">定格於圖片 (Images)</option>
                   <option value="solid">定格於純色 (Solid)</option>
               </Select>
               <div className="pt-2 border-t border-white/5">
                   <RangeControl label="滾動速度 (Speed)" min={10} max={150} value={settings.speed} onChange={e => updateSetting('speed', parseFloat(e.target.value))} onReset={() => resetSetting('speed')} />
                   <RangeControl label="畫面抖動 (Jitter)" min={0} max={20} step={0.5} value={settings.jitter} onChange={e => updateSetting('jitter', parseFloat(e.target.value))} onReset={() => resetSetting('jitter')} />
               </div>
            </div>
          </div>

          {/* Color-Coded Block 3: Camera & Transform (Purple) */}
          <div className="bg-[#18151e] border-l-2 border-purple-500 rounded p-3 relative">
            <h3 className="text-[10px] font-bold text-purple-400 mb-3 uppercase tracking-wider">C. 運鏡與變形 (CAMERA & TRANSFORM)</h3>
            <div className="space-y-3">
                <div className="grid grid-cols-2 gap-4 bg-black/20 p-2 rounded mb-2">
                    <CheckboxControl label="啟用傾斜 (Tilt)" checked={settings.tilt} onChange={e => updateSetting('tilt', e.target.checked)} onReset={() => resetSetting('tilt')} />
                    {settings.tilt && <CheckboxControl label="自動旋轉 (Auto)" checked={settings.tiltAuto} onChange={e => updateSetting('tiltAuto', e.target.checked)} onReset={() => resetSetting('tiltAuto')} />}
                </div>
                {settings.tilt && (
                    <div className="grid grid-cols-2 gap-2 mb-2">
                         <CompactNumberInput label="Tilt X" min={-45} max={45} value={settings.tiltAngleX} onChange={v => updateSetting('tiltAngleX', v)} onReset={() => resetSetting('tiltAngleX')} />
                         <CompactNumberInput label="Tilt Y" min={-45} max={45} value={settings.tiltAngleY} onChange={v => updateSetting('tiltAngleY', v)} onReset={() => resetSetting('tiltAngleY')} />
                    </div>
                )}
                <RangeControl label="起始縮放 (Zoom In)" min={100} max={200} value={settings.startScale} onChange={e => updateSetting('startScale', parseFloat(e.target.value))} onReset={() => resetSetting('startScale')} />
                <RangeControl label="垂直偏移 (Offset Y)" min={-200} max={200} value={settings.offsetY} onChange={e => updateSetting('offsetY', parseFloat(e.target.value))} onReset={() => resetSetting('offsetY')} />
            </div>
          </div>

          {/* Frame-by-Frame Controls (Slider Implementation) */}
          <div className="p-4 bg-[#111] border border-[#333] rounded">
              <label className="block text-[9px] uppercase text-gray-500 mb-2 font-bold text-center">逐楨微調 (FINE TUNE)</label>
              <div className="flex justify-center gap-2 pt-1">
                  <Button onClick={() => nudgeTime(-100)} className="w-8 text-[10px] px-0 bg-[#222] hover:bg-[#333]">&lt;</Button>
                  <Button onClick={() => nudgeTime(-500)} className="w-12 text-[10px] px-0 bg-[#222] hover:bg-[#333]">&lt;&lt;</Button>
                  <Button onClick={() => nudgeTime(500)} className="w-12 text-[10px] px-0 bg-[#222] hover:bg-[#333]">&gt;&gt;</Button>
                  <Button onClick={() => nudgeTime(100)} className="w-8 text-[10px] px-0 bg-[#222] hover:bg-[#333]">&gt;</Button>
              </div>
          </div>
      </div>
  );

  const renderSceneModule = () => (
      <div className="space-y-6">
          <ControlGroup title="背景基底 (BASE BACKGROUND)">
               <div className="space-y-3">
                   <Select 
                        label="背景類型 (Type)" 
                        value={settings.sceneBgType} 
                        onChange={e => updateSetting('sceneBgType', e.target.value)}
                   >
                        <option value="solid">單色 (Solid)</option>
                        <option value="gradient">漸層 (Gradient)</option>
                        <option value="transparent">透明 (Transparent)</option>
                   </Select>

                   {settings.sceneBgType !== 'transparent' && (
                       <div className="p-3 bg-black/20 rounded border border-white/5 space-y-3">
                            <ColorControl 
                                label={settings.sceneBgType === 'gradient' ? "起始顏色 (Start)" : "背景顏色 (Color)"} 
                                value={settings.sceneBgColor} 
                                onChange={v => updateSetting('sceneBgColor', v)} 
                            />
                            
                            {settings.sceneBgType === 'gradient' && (
                                <>
                                    <ColorControl 
                                        label="結束顏色 (End)" 
                                        value={settings.sceneBgColor2} 
                                        onChange={v => updateSetting('sceneBgColor2', v)} 
                                    />
                                    <Select 
                                        label="漸層方向 (Direction)" 
                                        value={settings.sceneBgGradientDir} 
                                        onChange={e => updateSetting('sceneBgGradientDir', e.target.value)}
                                    >
                                        <option value="to bottom">垂直 (Top to Bottom)</option>
                                        <option value="to right">水平 (Left to Right)</option>
                                        <option value="to bottom right">對角 (Diagonal)</option>
                                        <option value="radial">放射狀 (Radial)</option>
                                    </Select>
                                </>
                            )}
                            
                            <RangeControl 
                                label="背景不透明度 (Opacity)" 
                                min={0} max={1} step={0.01} 
                                value={settings.sceneBgOpacity} 
                                onChange={e => updateSetting('sceneBgOpacity', parseFloat(e.target.value))} 
                                onReset={() => resetSetting('sceneBgOpacity')}
                            />
                       </div>
                   )}
                   {settings.sceneBgType === 'transparent' && (
                       <div className="text-[10px] text-gray-500 text-center py-2 border border-dashed border-[#333] rounded">
                           背景將設為完全透明，可見底層網頁顏色或用於合成。
                       </div>
                   )}
               </div>
          </ControlGroup>

          <ControlGroup title="圖片疊加 (IMAGE OVERLAY)">
               <label className="block w-full text-center py-2 bg-[#222] border border-[#333] hover:border-gray-500 rounded cursor-pointer text-[10px] text-gray-400 mb-3">
                   {settings.bgImage ? '更換背景圖片' : '上傳背景圖片'}
                   <input type="file" onChange={onUploadBg} className="hidden" accept="image/*" />
               </label>
               <div className="grid grid-cols-2 gap-3">
                   <RangeControl label="圖片模糊 (Blur)" min={0} max={50} value={settings.bgBlur} onChange={e => updateSetting('bgBlur', parseFloat(e.target.value))} onReset={() => resetSetting('bgBlur')} />
                   <RangeControl label="圖片遮罩 (Dim)" min={0} max={1} step={0.05} value={settings.bgDimmer} onChange={e => updateSetting('bgDimmer', parseFloat(e.target.value))} onReset={() => resetSetting('bgDimmer')} />
               </div>
          </ControlGroup>

          <ControlGroup title="視覺特效 (VFX)">
               <div className="grid grid-cols-2 gap-4 mb-3">
                   <RangeControl label="3D 深度" min={0} max={50} value={settings.depth} onChange={e => updateSetting('depth', parseFloat(e.target.value))} onReset={() => resetSetting('depth')} />
                   <RangeControl label="外發光" min={0} max={100} value={settings.glow} onChange={e => updateSetting('glow', parseFloat(e.target.value))} onReset={() => resetSetting('glow')} />
               </div>
               <div className="grid grid-cols-2 gap-2 mt-2">
                   <CheckboxControl label="色散 (Aberration)" checked={settings.chromaticAberration} onChange={e => updateSetting('chromaticAberration', e.target.checked)} onReset={() => resetSetting('chromaticAberration')} />
                   <CheckboxControl label="底片顆粒 (Grain)" checked={settings.filmGrain} onChange={e => updateSetting('filmGrain', e.target.checked)} onReset={() => resetSetting('filmGrain')} />
                   <CheckboxControl label="掃描線 (Scanlines)" checked={settings.scanlines} onChange={e => updateSetting('scanlines', e.target.checked)} onReset={() => resetSetting('scanlines')} />
                   <CheckboxControl label="邊緣光 (Rim Light)" checked={settings.rimLight > 0} onChange={e => updateSetting('rimLight', e.target.checked ? 1 : 0)} onReset={() => resetSetting('rimLight')} />
               </div>
          </ControlGroup>

          <ControlGroup title="音效設定 (AUDIO)">
               <label className="block w-full text-center py-3 bg-[#222] border border-[#333] hover:border-primary/50 rounded cursor-pointer text-[10px] text-gray-300 mb-3">
                   {settings.audioName ? `🎵 ${settings.audioName}` : '上傳背景音樂 (MP3/WAV)'}
                   <input type="file" onChange={onUploadAudio} className="hidden" accept="audio/*" />
               </label>
               <RangeControl label="音量" min={0} max={1} step={0.05} value={settings.volume} onChange={e => updateSetting('volume', parseFloat(e.target.value))} />
          </ControlGroup>
      </div>
  );

  return (
    <div className="flex flex-col h-full bg-[#1e1e1e] text-white">
        
        {/* TOP TRANSPORT HEADER */}
        <div className="shrink-0 bg-[#121212] border-b border-[#333] p-4 flex flex-col gap-3 z-10 shadow-xl">
             {/* Play Button */}
            <Button variant="primary" className="w-full py-3 text-xs flex items-center justify-center gap-2 font-black tracking-wider hover:scale-[1.02] transition-transform shadow-lg shadow-primary/20" onClick={onPlay}>
                {isPlaying ? '⏹ 停止預覽 (STOP)' : '▶ 播放序列 (PLAY SEQUENCE)'}
            </Button>
            
            {/* Timeline */}
             <div className="flex items-center gap-3 bg-[#0a0a0a] p-2 rounded border border-[#333]">
                <span className="text-[10px] font-mono text-primary font-bold w-12 text-right">
                    {(currentT/1000).toFixed(2)}s
                </span>
                <input 
                    type="range" 
                    className="flex-1 h-1.5 bg-[#333] rounded-lg appearance-none cursor-pointer accent-white hover:accent-primary transition-colors" 
                    min={0} max={totalDuration} step={10} value={currentT} 
                    onChange={e => onScrub(parseFloat(e.target.value))} 
                />
                 <span className="text-[9px] font-mono text-gray-500 w-12">
                    {(totalDuration/1000).toFixed(1)}s
                </span>
            </div>

            {/* Tools Grid */}
            <div className="grid grid-cols-3 gap-2">
                 <Button className="text-[9px] py-1.5 bg-[#222] border-none hover:bg-[#333] text-gray-400 hover:text-white" onClick={toggleCinema} title="切換劇院模式">
                    🔲 劇院模式
                 </Button>
                 <Button className="text-[9px] py-1.5 bg-[#222] border-none hover:bg-[#333] text-gray-400 hover:text-white" onClick={onSnapshot} title="下載目前畫面截圖">
                    📷 截圖
                 </Button>
                 <Button className="text-[9px] py-1.5 bg-[#222] border-none hover:bg-[#333] text-gray-400 hover:text-white" onClick={onExportGif} disabled={isExporting} title="渲染並下載 GIF 動畫">
                    {isExporting ? '⏳ 處理中...' : '🎞️ 匯出 GIF'}
                 </Button>
            </div>
        </div>

        {/* Module Content Area */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-5 pb-10 space-y-8">
            {activeModule === 'assets' && renderAssetsModule()}
            {activeModule === 'mapping' && renderMappingModule()}
            {activeModule === 'text' && renderTextModule()}
            {activeModule === 'motion' && renderMotionModule()}
            {activeModule === 'scene' && renderSceneModule()}
        </div>
        
    </div>
  );
};
