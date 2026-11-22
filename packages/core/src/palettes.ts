// Jelly palettes: design tokens for how a body's material looks.

export type Theme = 'light' | 'dark';

/**
 * - `tint`: a glassy, dark tint that colours what's behind it (the dock's jelly).
 * - `milk`: milky and almost solid (switch thumbs).
 * - `glass`: frosted, nearly opaque glass for panels with text on them (popovers).
 */
export type JellyMaterial = 'tint' | 'milk' | 'glass';

/** A colour with straight (not premultiplied) alpha, every channel 0 to 1. */
export interface Rgba {
  red: number;
  green: number;
  blue: number;
  alpha: number;
}

export interface JellyPalette {
  /** The body's colour at its top edge, blending to `tintBottom` at its bottom edge. */
  tintTop: Rgba;
  tintBottom: Rgba;
  /** How strong each lighting effect is, 0 to 1. */
  specular: number;
  rim: number;
  glow: number;
  stroke: number;
  shadow: number;
}

export const JELLY_PALETTES: Readonly<Record<JellyMaterial, Readonly<Record<Theme, Readonly<JellyPalette>>>>> = {
  tint: {
    light: {
      tintTop: { red: 0.02, green: 0.18, blue: 0.32, alpha: 0.16 },
      tintBottom: { red: 0.02, green: 0.18, blue: 0.32, alpha: 0.06 },
      specular: 0.55,
      rim: 0.28,
      glow: 0.22,
      stroke: 0.22,
      shadow: 0.16,
    },
    dark: {
      tintTop: { red: 0, green: 0, blue: 0, alpha: 0.32 },
      tintBottom: { red: 0, green: 0, blue: 0, alpha: 0.16 },
      specular: 0.32,
      rim: 0.16,
      glow: 0.12,
      stroke: 0.12,
      shadow: 0.3,
    },
  },
  milk: {
    light: {
      tintTop: { red: 1, green: 1, blue: 1, alpha: 0.94 },
      tintBottom: { red: 0.9, green: 0.95, blue: 1, alpha: 0.86 },
      specular: 0.7,
      rim: 0.12,
      glow: 0.1,
      stroke: 0.25,
      shadow: 0.22,
    },
    dark: {
      tintTop: { red: 0.86, green: 0.9, blue: 0.97, alpha: 0.92 },
      tintBottom: { red: 0.7, green: 0.76, blue: 0.86, alpha: 0.84 },
      specular: 0.5,
      rim: 0.1,
      glow: 0.08,
      stroke: 0.2,
      shadow: 0.4,
    },
  },
  glass: {
    light: {
      tintTop: { red: 0.9, green: 0.94, blue: 0.98, alpha: 0.92 },
      tintBottom: { red: 0.8, green: 0.87, blue: 0.94, alpha: 0.94 },
      specular: 0.45,
      rim: 0.3,
      glow: 0.25,
      stroke: 0.3,
      shadow: 0.2,
    },
    dark: {
      tintTop: { red: 0.1, green: 0.14, blue: 0.24, alpha: 0.92 },
      tintBottom: { red: 0.05, green: 0.08, blue: 0.15, alpha: 0.95 },
      specular: 0.3,
      rim: 0.18,
      glow: 0.14,
      stroke: 0.18,
      shadow: 0.4,
    },
  },
};
