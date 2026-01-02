export interface PrepperImage {
  id: string;
  name: string;
  src: string; // Data URL or Blob URL
  originalWidth: number;
  originalHeight: number;
  settings: {
    scale: number;
    x: number;
    y: number;
    blur: boolean;
  };
}

export interface IntroAsset {
  id: string;
  url: string;
}

export interface CharMapping {
  char: string;
  imgId: string | null; // ID of the asset in localAssets
  scale: number;
  x: number;
  y: number;
  fitHeight: boolean;
  duration: number; // ms, calculated override time
}

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
  shadowColor: string; // New: Color of the 3D depth/shadow
  
  subEnabled: boolean;
  subText: string;
  subSize: number;
  subSpacing: number;
  subMargin: number; // percentage top margin
  
  // Motion
  slotEffect: boolean;
  tilt: boolean;
  tiltAuto: boolean;
  tiltAngleX: number; // Manual tilt state X
  tiltAngleY: number; // Manual tilt state Y
  
  // Timeline / Phases
  solidBaseDuration: number; // ms (Phase 1: Solid Color Time)
  duration: number; // ms (Phase 2: Spinning Loop Time)
  zoomDuration: number; // ms (Independent: Zoom animation duration)
  endHoldDuration: number; // ms (Phase 4: Final Hold time)
  stagger: number; // ms (Phase 3: Stop Interval per char)
  
  startStyle: 'solid' | 'image'; // (Deprecated logic, overrides by solidBaseDuration)
  endStyle: 'solid' | 'image'; // Phase 4 appearance
  
  speed: number; // ms (flash speed)
  independentRoll: boolean; // NEW: If true, each char shows a different random image
  jitter: number; // % (position jitter)
  startScale: number; // %
  offsetY: number; // px

  // Scene
  sceneBgType: 'solid' | 'gradient'; // NEW
  sceneBgColor: string; // Color 1
  sceneBgColor2: string; // NEW: Color 2
  sceneBgGradientDir: string; // NEW: 'to bottom', 'to right', '135deg', 'radial'
  bgImage: string | null;
  bgDimmer: number;
  bgBlur: number; // Background blur intensity
  halftone: boolean;
  cineBars: boolean;
  audioUrl: string | null;
  volume: number;
}