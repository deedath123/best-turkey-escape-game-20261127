// Gobble Dash — the entry point, one job: wire input, world, sound and
// renderer together and run the game loop. Also owns the ?shot= hooks the
// screenshots use and the window.__gobble handle the play-tests drive.

import { VIEW_WIDTH, VIEW_HEIGHT, mulberry32 } from './config.js';
import { InputTracker } from './input.js';
import { SoundBank } from './audio.js';
import { World } from './world.js';
import { Renderer } from './render.js';

const canvas = document.getElementById('game');
canvas.width = VIEW_WIDTH;
canvas.height = VIEW_HEIGHT;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seeded = shot !== null;
const randomFn = seeded ? mulberry32(20261127) : Math.random;

const input = new InputTracker(canvas);
const sfx = new SoundBank();
const world = new World(randomFn);
const renderer = new Renderer(canvas);

input.onFirstGesture = () => {
  sfx.unlock();
  if (world.state === 'title') startGame();
};

// --- state transitions -----------------------------------------------------

function startGame() {
  world.startRun();
  sfx.gobble();
  sfx.startMusic();
}

function restartGame() {
  sfx.click();
  startGame();
}

function applyShot(shotName) {
  if (shotName === 'title') world.forceTitle();
  else if (shotName === 'play') world.forcePlayShot();
  else if (shotName === 'kitchen') world.forceKitchenShot();
  else if (shotName === 'escaped') world.forceEscaped();
  else if (shotName === 'caught') world.forceCaught();
}

// Screenshot states are staged once and then frozen: the live loop keeps
// rendering (clouds, fire and leaves still animate) but the world does not
// advance, so the staged composition stays exactly as built.
const frozenShot = shot !== null;
if (shot) applyShot(shot);

// --- the loop ---------------------------------------------------------------

let lastTime = performance.now();
let paused = false;

function frame(now) {
  const dt = Math.min(0.05, (now - lastTime) / 1000);
  lastTime = now;

  if (input.consumeMutePressed()) {
    sfx.setMuted(!sfx.muted);
  }

  if (world.state === 'title') {
    if (input.consumeStartPressed()) startGame();
  } else if (world.state === 'playing') {
    if (input.consumePausePressed()) {
      paused = !paused;
      world.state = paused ? 'paused' : 'playing';
      if (!paused) lastTime = performance.now();
    }
  } else if (world.state === 'paused') {
    if (input.consumePausePressed()) {
      paused = false;
      world.state = 'playing';
      lastTime = performance.now();
    }
  } else if (world.state === 'escaped' || world.state === 'caught') {
    if (input.consumeRestartPressed()) restartGame();
  }

  if (!paused && !frozenShot) {
    world.update(dt, input, sfx);
    sfx.updateMusic(dt);
  }
  renderer.render(world, now / 1000);
  input.endFrame();
  requestAnimationFrame(frame);
}

// Drain any sound-effect events the world queued this frame.
const originalUpdate = world.update.bind(world);
world.update = (dt, inputArg, sfxArg) => {
  originalUpdate(dt, inputArg, sfxArg);
  for (const event of world.events) {
    if (event === 'corn' || event === 'goldencorn') sfx.pickupCorn();
    else if (event === 'feather') sfx.pickupFeather();
    else if (event === 'hit' || event === 'knife-hit' || event === 'caught-by-farmer') sfx.hit();
  }
  world.events.length = 0;
};

requestAnimationFrame(frame);

// Test / automation handle: the play-tests drive the game through this.
window.__gobble = {
  getState() {
    return {
      state: world.state,
      distance: Math.floor(world.distance),
      score: Math.floor(world.score),
      lives: world.lives,
      corn: world.corn,
      feathers: world.feathers,
      spotted: Math.floor(world.spotted),
      stage: world.stageIndex,
      farmerGap: Math.round(world.farmerGap * 10) / 10,
      farmerState: world.farmerState,
      turkeyY: Math.round(world.turkey.y),
      turkeyGrounded: world.turkey.grounded,
      obstacles: world.obstacles.length,
      pickups: world.pickups.length,
    };
  },
  start: startGame,
  restart: restartGame,
  forceCaught() {
    world.forceCaught();
  },
  forceEscaped() {
    world.forceEscaped();
  },
  forceKitchen() {
    world.forceKitchenShot();
  },
  setLives(n) {
    world.lives = n;
  },
  mute() {
    sfx.setMuted(true);
  },
};
