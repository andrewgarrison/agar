/**
 * @agar/core: the jelly engine (physics, shared renderer, animation stage) and
 * design tokens. Pure TypeScript, no React, no UI SDK.
 */
export type { BodyOptions } from './body';
export type { Point, Rect } from './geometry';
export type { DrawItem, DrawTarget } from './draw-target';
export type { JellyParams } from './params';
export type { JellyMaterial, JellyPalette, Rgba, Theme } from './palettes';

export { JellyBody } from './body';
export { prefersReducedMotion } from './motion';
export { JELLY_PALETTES } from './palettes';
export { DEFAULT_PARAMS, RING, ROUND, STEP } from './params';
export { drawSurface, isWebGL } from './renderer';
export { JellySurface, surfaceCount } from './stage';
