/**
 * Midnight Lagoon font family constants for use throughout the app.
 * Maps from old Inter references to new Outfit fonts.
 */
export const MIDNIGHT_LAGOON_FONTS = {
  regular: 'Outfit_400Regular',
  medium: 'Outfit_500Medium',
  semibold: 'Outfit_600SemiBold',
  bold: 'Outfit_700Bold',
} as const;

/** Backward compatibility - use these in existing code that references FLARE_FONT_FAMILY */
export const FLARE_FONT_FAMILY = {
  regular: MIDNIGHT_LAGOON_FONTS.regular,
  medium: MIDNIGHT_LAGOON_FONTS.medium,
  semibold: MIDNIGHT_LAGOON_FONTS.semibold,
  bold: MIDNIGHT_LAGOON_FONTS.bold,
} as const;
