// Gobble Dash — shared tuning, palette and helpers.
// One job: every number the rest of the game agrees on lives here.

export const VIEW_WIDTH = 1280;
export const VIEW_HEIGHT = 720;
export const GROUND_Y = 600;
export const ESCAPE_DISTANCE = 1000;
export const TURKEY_X = 300;

// Autumn palette: orange / brown / cream, coherent across farmyard, barn and kitchen.
export const PALETTE = {
  skyTop: '#ffe9c4',
  skyMid: '#ffd9a0',
  skyLow: '#ffb877',
  sun: '#ffdf6b',
  cloud: '#fff6e8',
  hillFar: '#c98f4e',
  hillNear: '#a86f35',
  dirt: '#b07a3f',
  dirtDark: '#8f5f2c',
  grass: '#7da23f',
  grassDark: '#5d7d2e',
  fence: '#8a5a28',
  hay: '#e8b64c',
  hayDark: '#c8932f',
  barnRed: '#a83c2a',
  barnDark: '#7e2b1d',
  kitchenWall: '#f3e2c2',
  kitchenTile: '#e8cfa3',
  kitchenTileDark: '#d9b983',
  ovenBody: '#4a4a52',
  ovenDoor: '#2e2e36',
  fireCore: '#ffd23e',
  fireMid: '#ff8a2a',
  fireEdge: '#e2481f',
  knifeBlade: '#dfe6ea',
  knifeHandle: '#6b4423',
  turkeyBody: '#8b5a2b',
  turkeyDark: '#6e451f',
  turkeyLight: '#b07a3f',
  tailOrange: '#e07b2a',
  tailRed: '#c23b22',
  tailBrown: '#7a4a1f',
  beak: '#ff9f1c',
  wattle: '#d92626',
  farmerShirt: '#c23b22',
  farmerOveralls: '#3b5b8c',
  farmerHat: '#e8c95c',
  farmerSkin: '#f2c79b',
  hudPanel: 'rgba(60, 30, 8, 0.72)',
  hudText: '#fff3d6',
  accent: '#ffb52e',
  danger: '#e2481f',
  good: '#7dc242',
};

export const STAGES = [
  { name: 'FARMYARD', from: 0, to: 350, sky: 'farm' },
  { name: 'THE BARN', from: 350, to: 700, sky: 'barn' },
  { name: 'THE KITCHEN', from: 700, to: ESCAPE_DISTANCE, sky: 'kitchen' },
];

export const TUNING = {
  baseSpeed: 270,
  maxSpeed: 640,
  speedPerMetre: 0.38,
  gravity: 2500,
  jumpVelocity: -880,
  maxFlaps: 2,
  flapVelocity: -720,
  stumbleSlow: 0.55,
  invulnSeconds: 2.0,
  farmerStartGap: 18,
  farmerCatchGap: 0,
  farmerSearchGap: 42,
  spottedRise: 13,
  spottedFall: 30,
  spottedSprintAt: 100,
  hitGapLoss: 8,
  stumbleGapLoss: 5,
  cornScore: 50,
  featherScore: 25,
  goldenCornScore: 150,
  featherDashSeconds: 1.6,
  lives: 3,
};

export function clamp(value, min, max) {
  return value < min ? min : value > max ? max : value;
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

// Deterministic RNG (mulberry32) so screenshot states reproduce exactly.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function nextRandom() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function stageForDistance(distance) {
  for (const stage of STAGES) {
    if (distance < stage.to) return stage;
  }
  return STAGES[STAGES.length - 1];
}

export function stageIndexForDistance(distance) {
  for (let i = 0; i < STAGES.length; i++) {
    if (distance < STAGES[i].to) return i;
  }
  return STAGES.length - 1;
}
