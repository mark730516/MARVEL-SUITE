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
  duration: number; // ms, exact time to stop animation for this char
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
  duration: number; // ms
  stagger: number; // ms
  solidFinal: boolean;
  speed: number; // ms (flash speed)
  jitter: number; // % (position jitter)
  startScale: number; // %
  offsetY: number; // px

  // Scene
  bgImage: string | null;
  bgDimmer: number;
  bgBlur: number; // New: Background blur intensity
  halftone: boolean;
  cineBars: boolean;
  audioUrl: string | null;
  volume: number;
}