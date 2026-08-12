/* GENERATED FROM tokens.json -- DO NOT EDIT. Run scripts/build-tokens.mjs. */
// Portable design tokens (colors as hex). Web consumes the theme via
// src/index.css; mobile (Expo) and any other platform import this object so the
// whole product shares one source of truth.
export const tokens = {
  "color": {
    "light": {
      "background": "#FAFAF9",
      "foreground": "#18181B",
      "border": "#E4E4E7",
      "card": "#ffffff",
      "cardForeground": "#18181B",
      "popover": "#ffffff",
      "popoverForeground": "#18181B",
      "primary": "#18181B",
      "primaryForeground": "#FAFAF9",
      "secondary": "#F5F5F4",
      "secondaryForeground": "#18181B",
      "muted": "#F5F5F4",
      "mutedForeground": "#71717A",
      "accent": "#F4F4F5",
      "accentForeground": "#18181B",
      "destructive": "#B85C5C",
      "destructiveForeground": "#FFFFFF",
      "input": "#E4E4E7",
      "ring": "#71717A",
      "chart1": "#4F8A68",
      "chart2": "#B85C5C",
      "chart3": "#5B7FA3",
      "chart4": "#A1A1AA",
      "chart5": "#D4D4D8",
      "sidebar": "#FAFAF9",
      "sidebarForeground": "#3F3F46",
      "sidebarBorder": "#E4E4E7",
      "sidebarPrimary": "#18181B",
      "sidebarPrimaryForeground": "#FAFAF9",
      "sidebarAccent": "#F1F1EF",
      "sidebarAccentForeground": "#18181B",
      "sidebarRing": "#71717A"
    },
    "dark": {
      "background": "#09090B",
      "foreground": "#FAFAFA",
      "border": "#27272A",
      "card": "#111113",
      "cardForeground": "#FAFAFA",
      "popover": "#111113",
      "popoverForeground": "#FAFAFA",
      "primary": "#FAFAFA",
      "primaryForeground": "#18181B",
      "secondary": "#18181B",
      "secondaryForeground": "#FAFAFA",
      "muted": "#18181B",
      "mutedForeground": "#A1A1AA",
      "accent": "#202023",
      "accentForeground": "#FAFAFA",
      "destructive": "#D47B7B",
      "destructiveForeground": "#18181B",
      "input": "#27272A",
      "ring": "#A1A1AA",
      "chart1": "#72A98A",
      "chart2": "#D47B7B",
      "chart3": "#7EA1C4",
      "chart4": "#71717A",
      "chart5": "#3F3F46",
      "sidebar": "#111113",
      "sidebarForeground": "#F4F4F5",
      "sidebarBorder": "#27272A",
      "sidebarPrimary": "#FAFAFA",
      "sidebarPrimaryForeground": "#18181B",
      "sidebarAccent": "#202023",
      "sidebarAccentForeground": "#FAFAFA",
      "sidebarRing": "#A1A1AA"
    }
  },
  "fontFamily": {
    "sans": [
      "Inter",
      "sans-serif"
    ],
    "serif": [
      "Georgia",
      "serif"
    ],
    "mono": [
      "Menlo",
      "monospace"
    ]
  },
  "radius": "0.5rem",
  "spacing": "0.25rem"
} as const;

export type Tokens = typeof tokens;
export default tokens;
