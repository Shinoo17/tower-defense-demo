export interface PerformanceProfile {
  tier: 'low' | 'balanced' | 'high';
  pixelRatioCap: number;
  shadowMapSize: number;
  particlesPerBurst: number;
  maxParticleBursts: number;
  antialias: boolean;
}

interface NavigatorCapabilities extends Navigator {
  deviceMemory?: number;
}

export function getPerformanceProfile(): PerformanceProfile {
  const nav = navigator as NavigatorCapabilities;
  const compact = Math.min(window.innerWidth, window.innerHeight) < 600;
  const coarse = matchMedia('(pointer: coarse)').matches;
  const constrained = (nav.deviceMemory ?? 8) <= 4 || navigator.hardwareConcurrency <= 4;
  if ((compact && coarse) || constrained) {
    return {
      tier: 'low', pixelRatioCap: 1.25, shadowMapSize: 768,
      particlesPerBurst: 7, maxParticleBursts: 20, antialias: false,
    };
  }
  if (coarse || Math.min(window.innerWidth, window.innerHeight) < 900) {
    return {
      tier: 'balanced', pixelRatioCap: 1.5, shadowMapSize: 1024,
      particlesPerBurst: 10, maxParticleBursts: 30, antialias: true,
    };
  }
  return {
    tier: 'high', pixelRatioCap: 2, shadowMapSize: 2048,
    particlesPerBurst: 14, maxParticleBursts: 40, antialias: true,
  };
}
