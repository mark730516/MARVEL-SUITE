
import React, { useRef, useEffect } from 'react';
import { ControlGroup, TextInput, Select, RangeControl } from './Controls';
import { FONTS } from '../constants';

interface TextEditorProps {
    text: string;
    setText: (t: string) => void;
    font: string;
    setFont: (f: string) => void;
    opacity: number;
    setOpacity: (o: number) => void;
}

export const TextEditor: React.FC<TextEditorProps> = ({ text, setText, font, setFont, opacity, setOpacity }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    // 即時預覽繪製
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // 設定畫布尺寸
        canvas.width = 1280;
        canvas.height = 720;

        // 1. 繪製模擬背景 (棋盤格 + 漸層)
        ctx.fillStyle = '#111';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // 繪製一些假內容代表 "素材"
        const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        grad.addColorStop(0, '#ec1d24');
        grad.addColorStop(0.5, '#121212');
        grad.addColorStop(1, '#3b82f6');
        ctx.fillStyle = grad;
        ctx.fillRect(200, 100, 880, 520);
        
        // 2. 繪製遮罩層
        ctx.save();
        ctx.fillStyle = `rgba(0,0,0,${opacity})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // 3. 挖空文字 (Destination Out)
        ctx.globalCompositeOperation = 'destination-out';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        // 自動計算字體大小以適應寬度
        const fontSize = Math.min(400, (canvas.width * 0.8) / Math.max(text.length, 1) * 1.5);
        ctx.font = `900 ${fontSize}px ${font.split(',')[0]}`;
        ctx.fillText(text, canvas.width / 2, canvas.height / 2);
        ctx.restore();

        // 4. 繪製邊框
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 2;
        ctx.strokeRect(0, 0, canvas.width, canvas.height);

    }, [text, font, opacity]);

    return (
        <div className="flex w-full h-full bg-[#0d0d0d]">
             <div className="w-[420px] bg-panel border-r border-border p-5 shrink-0 overflow-y-auto">
                 <ControlGroup title="全域文字與遮罩設定 (GLOBAL SETTINGS)">
                    <div className="space-y-6">
                        <TextInput 
                            label="主標題文字 (GLOBAL TEXT)" 
                            value={text} 
                            onChange={e => setText(e.target.value.toUpperCase())} 
                            placeholder="輸入文字..."
                        />
                        
                        <Select label="全域字體 (GLOBAL FONT)" value={font} onChange={e => setFont(e.target.value)}>
                             {FONTS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                        </Select>

                        <RangeControl 
                            label="遮罩不透明度 (MASK OPACITY)" 
                            min={0} 
                            max={1} 
                            step={0.01} 
                            value={opacity} 
                            onChange={e => setOpacity(parseFloat(e.target.value))} 
                        />
                        
                        <div className="p-4 bg-primary/10 border border-primary/30 rounded-lg text-[10px] text-gray-400 leading-relaxed">
                            <strong className="text-primary block mb-1">ℹ️ 模組說明</strong>
                            此處設定為全域共用，將同步影響：
                            <ul className="list-disc pl-4 mt-1 space-y-1">
                                <li><strong>素材工廠 (Prepper)</strong> 的預覽遮罩效果</li>
                                <li><strong>動畫導演 (Director)</strong> 的開場文字內容與背景遮罩濃度</li>
                            </ul>
                        </div>
                    </div>
                 </ControlGroup>
             </div>
             
             <div className="flex-1 flex flex-col items-center justify-center bg-[radial-gradient(#222_1px,transparent_1px)] [background-size:20px_20px] relative overflow-hidden p-10">
                  <div className="mb-4 text-xs font-bold text-gray-500 tracking-widest uppercase">Mask Preview Simulation</div>
                  <canvas 
                      ref={canvasRef} 
                      className="w-full max-w-[1000px] shadow-2xl rounded-lg border border-white/10 bg-black"
                  />
             </div>
        </div>
    );
};
