import {
  calculateResponsiveZoom,
  getResponsiveCameraTilt,
  getResponsiveFOV,
  getAutoQualityPreset,
} from './responsive-helpers';

export function getOptimizedTableView(): { zoom: number; tilt: number; fov: number; quality: string } {
  const width = window.innerWidth;
  const height = window.innerHeight;
  const aspectRatio = width / height;

  return {
    zoom: calculateResponsiveZoom(aspectRatio),
    tilt: getResponsiveCameraTilt(aspectRatio),
    fov: getResponsiveFOV(),
    quality: getAutoQualityPreset(),
  };
}
