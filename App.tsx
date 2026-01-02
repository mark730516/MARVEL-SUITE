import React, { useState } from 'react';
import { Prepper } from './components/Prepper';
import { Intro } from './components/Intro';

type Tab = 'prepper' | 'intro';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('prepper');
  const [cinemaMode, setCinemaMode] = useState(false);
  
  // Shared State passed from Prepper to Intro
  const [transferAssets, setTransferAssets] = useState<{ url: string }[]>([]);
  const [transferText, setTransferText] = useState('MARVEL');
  const [transferFont, setTransferFont] = useState('"Anton", sans-serif');

  const handleTransfer = (assets: { url: string }[], text: string, font: string) => {
    setTransferAssets(assets);
    setTransferText(text);
    setTransferFont(font);
    setActiveTab('intro');
  };

  return (
    <div className={`flex flex-col h-full w-full ${cinemaMode ? 'bg-black' : 'bg-dark'}`}>
      {/* Cinema Overlay Button */}
      {cinemaMode && (
        <button 
            onClick={() => setCinemaMode(false)}
            className="fixed top-5 right-5 z-[9999] bg-white/10 backdrop-blur border border-white/30 text-white px-4 py-2 rounded-full hover:bg-primary hover:border-primary transition-all shadow-lg font-bold"
        >
            ✕ 退出劇院模式
        </button>
      )}

      {/* Header */}
      {!cinemaMode && (
        <header className="h-[54px] bg-black border-b border-border flex items-center justify-between px-5 shrink-0 z-50">
          <div className="flex items-center gap-2">
            <h1 className="text-primary font-black text-xl tracking-wider">MARVEL SUITE</h1>
            <span className="text-[10px] bg-[#333] px-2 py-0.5 rounded text-gray-400">Genesis V13.3</span>
          </div>
          
          <div className="flex gap-4 h-full items-center">
            <button 
                onClick={() => setCinemaMode(true)}
                className="bg-[#222] border border-[#444] text-gray-300 px-3 py-1.5 rounded text-xs hover:border-white hover:text-white transition-colors"
            >
                🔲 劇院模式
            </button>
          </div>

          <div className="flex h-full gap-1">
             <button 
                onClick={() => setActiveTab('prepper')}
                className={`px-6 font-bold text-sm h-full border-b-4 transition-colors ${activeTab === 'prepper' ? 'border-primary text-white bg-[#1a1a1a]' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
             >
                1. 素材工廠
             </button>
             <button 
                onClick={() => setActiveTab('intro')}
                className={`px-6 font-bold text-sm h-full border-b-4 transition-colors ${activeTab === 'intro' ? 'border-primary text-white bg-[#1a1a1a]' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
             >
                2. 動畫導演
             </button>
          </div>
        </header>
      )}

      {/* Main Content Area */}
      <main className="flex-1 relative overflow-hidden">
         {/* Prepper View */}
         <div className={`absolute inset-0 w-full h-full bg-dark transition-opacity duration-300 ${activeTab === 'prepper' ? 'opacity-100 z-10 pointer-events-auto' : 'opacity-0 z-0 pointer-events-none'}`}>
             <Prepper onTransfer={handleTransfer} font={transferFont} />
         </div>
         
         {/* Intro View */}
         <div className={`absolute inset-0 w-full h-full bg-dark transition-opacity duration-300 ${activeTab === 'intro' ? 'opacity-100 z-10 pointer-events-auto' : 'opacity-0 z-0 pointer-events-none'}`}>
             <Intro 
                importedAssets={transferAssets}
                initialText={transferText}
                initialFont={transferFont}
             />
         </div>
      </main>
    </div>
  );
};

export default App;