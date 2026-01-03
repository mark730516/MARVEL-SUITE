
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
    id: 'cinematic_pro',
    label: '專業電影 (Cinematic Pro)',
    settings: {
      solidBaseDuration: 1200,
      duration: 5000,
      zoomDuration: 10000,
      endHoldDuration: 2500,
      stagger: 400,
      speed: 60,
      jitter: 3,
      independentRoll: true,
      startScale: 110,
      slotEffect: true,
      tilt: true,
      chromaticAberration: true,
      rimLight: 0.8,
      filmGrain: true
    }
  },
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
      independentRoll: false,
      startScale: 100,
      slotEffect: true,
      tilt: false,
      endStyle: 'image',
      chromaticAberration: false,
      rimLight: 0,
      filmGrain: false
    }
  },
  {
    id: 'glitch_action',
    label: '動作故障 (Action Glitch)',
    settings: {
      solidBaseDuration: 500,
      duration: 2000,
      zoomDuration: 4000,
      endHoldDuration: 1500,
      stagger: 80,
      speed: 30,
      jitter: 15,
      independentRoll: true,
      startScale: 140,
      slotEffect: true,
      tilt: true,
      chromaticAberration: true,
      rimLight: 1,
      scanlines: true
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
  subFont: '"Bebas Neue", sans-serif',
  subSize: 5,
  subSpacing: 0.5,
  subMargin: 1,
  subColor: '#ffffff', 
  
  slotEffect: true,
  tilt: false,
  tiltAuto: false,
  tiltAngleX: 0,
  tiltAngleY: 0,
  
  solidBaseDuration: 1000,
  duration: 5000,
  stagger: 500,
  zoomDuration: 8000,
  endHoldDuration: 2000,
  
  startStyle: 'solid',
  endStyle: 'image',
  speed: 80,
  independentRoll: false,
  jitter: 5,
  startScale: 100,
  offsetY: 0,

  sceneBgType: 'solid',
  sceneBgColor: '#ffffff',
  sceneBgColor2: '#000000',
  sceneBgGradientDir: 'to bottom',
  sceneBgOpacity: 1,
  bgImage: null,
  bgDimmer: 0.5,
  bgBlur: 0,
  halftone: false,
  cineBars: false,
  
  audioUrl: null,
  audioName: null,
  volume: 0.8,
  showVisualizer: true,

  chromaticAberration: false,
  filmGrain: false,
  rimLight: 0,
  scanlines: false,
};
