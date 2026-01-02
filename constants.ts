import { IntroSettings } from './types';

export const FONTS = [
  { label: 'Anton (英文標準)', value: '"Anton", sans-serif' },
  { label: 'Archivo Black (粗體)', value: '"Archivo Black", sans-serif' },
  { label: 'Black Ops (軍事風)', value: '"Black Ops One", cursive' },
  { label: 'Bebas Neue (高窄)', value: '"Bebas Neue", sans-serif' },
  { label: 'Noto Sans TC (思源黑體)', value: '"Noto Sans TC", sans-serif' },
  { label: 'Oswald (簡潔)', value: '"Oswald", sans-serif' },
  { label: 'Righteous (現代)', value: '"Righteous", cursive' },
];

export const ANIMATION_PRESETS = [
  {
    id: 'classic',
    label: '經典漫威 (Classic)',
    settings: {
      solidBaseDuration: 1000,
      duration: 4000,
      zoomDuration: 8000,
      endHoldDuration: 2000,
      stagger: 300,
      speed: 80,
      jitter: 5,
      startScale: 100,
      slotEffect: true,
      tilt: false,
      endStyle: 'image',
      offsetY: 0
    }
  },
  {
    id: 'rapid',
    label: '快節奏 (Rapid)',
    settings: {
      solidBaseDuration: 500,
      duration: 1500,
      zoomDuration: 3000,
      endHoldDuration: 1000,
      stagger: 100,
      speed: 40,
      jitter: 8,
      startScale: 150,
      slotEffect: true,
      tilt: true,
      endStyle: 'image',
      offsetY: 0
    }
  },
  {
    id: 'epic',
    label: '史詩長鏡頭 (Epic)',
    settings: {
      solidBaseDuration: 2000,
      duration: 6000,
      zoomDuration: 12000,
      endHoldDuration: 3000,
      stagger: 800,
      speed: 100,
      jitter: 3,
      startScale: 80,
      slotEffect: true,
      tilt: false,
      endStyle: 'image',
      offsetY: 0
    }
  }
];

export const DEFAULT_INTRO_SETTINGS: IntroSettings = {
  text: 'MARVEL',
  font: '"Anton", sans-serif',
  bgColor: '#ffffff',
  textColor: '#000000',
  bgOpacity: 1,
  
  textSize: 15,
  spacing: -0.05,
  depth: 0,
  glow: 0,
  shadowColor: '#555555',
  
  subEnabled: false,
  subText: 'STUDIOS',
  subSize: 5,
  subSpacing: 0.5,
  subMargin: 1,
  
  slotEffect: true,
  tilt: false,
  tiltAuto: false,
  tiltAngleX: 0,
  tiltAngleY: 0,
  
  // Revised Defaults based on user request
  solidBaseDuration: 1000, // 1s Solid
  duration: 5000,          // 5s Spinning
  stagger: 500,            // Slow stop
  zoomDuration: 8000,      // Slow zoom
  endHoldDuration: 2000,
  
  startStyle: 'solid',
  endStyle: 'image',
  speed: 80,
  jitter: 5,
  startScale: 100,
  offsetY: 0,

  bgImage: null,
  bgDimmer: 0.5,
  bgBlur: 0,
  halftone: false,
  cineBars: false,
  audioUrl: null,
  volume: 1,
};