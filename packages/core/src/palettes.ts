// Jelly palettes: design tokens for how a body's material looks.

export type Theme = 'light' | 'dark';

/**
 * - `tint`: a glassy, dark tint that colours what's behind it (the dock's jelly).
 * - `milk`: milky and almost solid (switch thumbs).
 * - `glass`: a plain, opaque panel for text: white in light mode, charcoal in dark (popovers).
 * - `frost`: clear jelly glass, a little frosted, over a blurred backdrop (buttons).
 */
export type JellyMaterial = 'tint' | 'milk' | 'glass' | 'frost';

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
  /**
   * How strong each lighting effect is, 0 to 1. With `lens`, the four are the
   * top reflection, the rim light, the inner shading and the fresnel glow.
   */
  specular: number;
  rim: number;
  glow: number;
  stroke: number;
  shadow: number;
  /**
   * Lens lighting, for clear glass: no colour of its own, only shading and
   * light on what's behind it (after bilalgursen/liquid-glass).
   */
  lens: boolean;
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
      lens: false,
    },
    dark: {
      tintTop: { red: 0, green: 0, blue: 0, alpha: 0.32 },
      tintBottom: { red: 0, green: 0, blue: 0, alpha: 0.16 },
      specular: 0.32,
      rim: 0.16,
      glow: 0.12,
      stroke: 0.12,
      shadow: 0.3,
      lens: false,
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
      lens: false,
    },
    dark: {
      tintTop: { red: 0.86, green: 0.9, blue: 0.97, alpha: 0.92 },
      tintBottom: { red: 0.7, green: 0.76, blue: 0.86, alpha: 0.84 },
      specular: 0.5,
      rim: 0.1,
      glow: 0.08,
      stroke: 0.2,
      shadow: 0.4,
      lens: false,
    },
  },
  glass: {
    light: {
      tintTop: { red: 1, green: 1, blue: 1, alpha: 1 },
      tintBottom: { red: 0.97, green: 0.975, blue: 0.98, alpha: 1 },
      specular: 0.45,
      rim: 0.3,
      glow: 0.25,
      stroke: 0.3,
      shadow: 0.2,
      lens: false,
    },
    dark: {
      tintTop: { red: 0.17, green: 0.18, blue: 0.2, alpha: 1 },
      tintBottom: { red: 0.13, green: 0.14, blue: 0.16, alpha: 1 },
      specular: 0.3,
      rim: 0.18,
      glow: 0.14,
      stroke: 0.18,
      shadow: 0.4,
      lens: false,
    },
  },
  // Clear glass, after bilalgursen/liquid-glass: lens lighting, at their
  // strengths, with a brighter rim (theirs adds its light; ours lays white
  // over the darkened page). The tint is only the Canvas 2D fallback's fill,
  // about as dark as the lens makes the page.
  frost: {
    light: {
      tintTop: { red: 0.4, green: 0.4, blue: 0.55, alpha: 0.12 },
      tintBottom: { red: 0.4, green: 0.4, blue: 0.55, alpha: 0.12 },
      specular: 0.3,
      rim: 1,
      glow: 0.1,
      stroke: 0.02,
      shadow: 0.066,
      lens: true,
    },
    dark: {
      tintTop: { red: 1, green: 1, blue: 1, alpha: 0.06 },
      tintBottom: { red: 1, green: 1, blue: 1, alpha: 0.06 },
      specular: 0.3,
      rim: 0.35,
      glow: 0.1,
      stroke: 0.02,
      shadow: 0.066,
      lens: true,
    },
  },
};
