
export interface IntroSettings {
  text: string;
  font: string;
  bgColor: string;
  textColor: string;
  bgOpacity: number;
  
  textSize: number; // percentage
  spacing: number; // em
  depth: number; // px
  glow: number; // px
  shadowColor: string;
  
  subEnabled: boolean;
  subText: string;
  subFont: string; // 新增副標題字體
  subSize: number;
  subSpacing: number;
  subMargin: number; 
  subColor: string;
  
  // Motion
  slotEffect: boolean;
  tilt: boolean;
  tiltAuto: boolean;
  tiltAngleX: number; 
  tiltAngleY: number; 
  
  // Timeline
  solidBaseDuration: number; 
  duration: number; 
  zoomDuration: number; 
  endHoldDuration: number; 
  stagger: number; 
  
  startStyle: 'solid' | 'image';
  endStyle: 'solid' | 'image';
  
  speed: number; 
  independentRoll: boolean; 
  jitter: number; 
  startScale: number; 
  offsetY: number; 

  // Scene
  sceneBgType: 'solid' | 'gradient' | 'transparent'; 
  sceneBgColor: string; 
  sceneBgColor2: string; 
  sceneBgGradientDir: string; 
  sceneBgOpacity: number; // New: Background opacity
  bgImage: string | null;
  bgDimmer: number;
  bgBlur: number; 
  halftone: boolean;
  cineBars: boolean;
  
  // Audio
  audioUrl: string | null;
  audioName: string | null;
  volume: number;
  showVisualizer: boolean;

  // VFX
  chromaticAberration: boolean;
  filmGrain: boolean;
  rimLight: number; 
  scanlines: boolean;
}

export interface PrepperImage {
  id: string;
  name: string;
  src: string;
  originalWidth: number;
  originalHeight: number;
  settings: {
    scale: number;
    x: number;
    y: number;
    rotation: number;
    blur: boolean;
    brightness: number;
    contrast: number;
    saturate: number;
    vignette: number;
  };
}

export interface LibraryAsset {
  id: string;
  name: string;
  src: string;
  timestamp: number;
}

export interface IntroAsset {
  id: string;
  url: string;
}

export interface CharMapping {
  char: string;
  imgId: string | null;
  scale: number;
  x: number;
  y: number;
  fitHeight: boolean;
  duration: number;
}
