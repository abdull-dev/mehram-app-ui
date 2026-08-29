// Design system — mirrors CSS custom properties from ui-docs/mehram-onboarding-styled.html

export const Colors = {
  // Rose / pink
  rose: '#F2559A',
  roseD: '#E6396E',
  roseInk: '#A31C48',
  roseSoft: '#FDEEF5',

  // Violet
  vio: '#9B7BF0',
  vioD: '#7C5AE0',
  vioInk: '#3E2A73',
  vioSoft: '#F0EBFE',

  // Mint
  mint: '#3FCF9A',
  mintSoft: '#E6F9F1',
  mintInk: '#0A6B4C',

  // Gold
  gold: '#E0A93B',
  goldSoft: '#FDF4E3',
  goldInk: '#7A5709',

  // Surface / structure
  page: '#F7F4FD',
  line: '#EFEBF9',

  // Ink (text)
  ink: '#1B1630',
  ink2: '#635C7E',
  ink3: '#A29CBB',

  // Ambient background blobs
  blobLavender: 'rgba(220, 210, 251, 0.65)',
  blobPink: 'rgba(251, 220, 235, 0.65)',
} as const;

// Named gradient shorthands — used by wali onboarding screens
export const GRAD      = ['#F2789F', '#C77BE0', '#A78BFA'] as const;
export const HERO_GRAD = ['#5F55A8', '#3E3776', '#2B2653'] as const;
export const GOLD_GRAD = ['#E0A93B', '#B5820D'] as const;
export const VIO_GRAD  = ['#9B7BF0', '#5B41B8', '#3A2A78'] as const;
export const ROSE_GRAD = ['#F2559A', '#E6396E'] as const;

// Primary gradient: 96deg, #F2789F → #C77BE0 → #A78BFA
export const GradientColors = {
  primary: ['#F2789F', '#C77BE0', '#A78BFA'] as const,
  primaryLocations: [0, 0.52, 1] as const,

  // Orbit core gradients
  orbitRose: ['#F97DAE', '#E6396E'] as const,
  orbitVio: ['#A98CF5', '#6E4FD6'] as const,

  // Dark vertical gradient (live counter bg)
  vertDark: ['#9B7BF0', '#5B41B8', '#3A2A78'] as const,
} as const;
