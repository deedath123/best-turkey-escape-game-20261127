// Gobble Dash — the world, one job: the run's state and rules.
// Turkey physics, obstacle and pickup spawning, the farmer's chase AI,
// the spotted meter, stages, collisions, score and lives. No drawing here.

import {
  GROUND_Y,
  ESCAPE_DISTANCE,
  TURKEY_X,
  TUNING,
  clamp,
  stageIndexForDistance,
} from './config.js';

const OBSTACLE_DEFS = {
  haybale: { w: 74, h: 64, jumpable: true, hideable: true },
  fence: { w: 56, h: 78, jumpable: true, hideable: false },
  crate: { w: 66, h: 66, jumpable: true, hideable: false },
  pitchfork: { w: 40, h: 110, jumpable: true, hideable: false },
  oven: { w: 120, h: 130, jumpable: true, hideable: false },
};

export class World {
  constructor(randomFn) {
    this.random = randomFn || Math.random;
    this.reset();
  }

  reset() {
    this.state = 'title';
    this.distance = 0;
    this.score = 0;
    this.corn = 0;
    this.feathers = 0;
    this.lives = TUNING.lives;
    this.speed = TUNING.baseSpeed;
    this.spotted = 0;
    this.stageIndex = 0;
    this.stageBanner = '';
    this.stageBannerT = 0;
    this.time = 0;
    this.bestDistance = 0;
    this.runTime = 0;
    this.farmerGap = TUNING.farmerStartGap;
    this.farmerState = 'chase';
    this.farmerSprintT = 0;
    this.farmerSearchT = 0;
    this.dashT = 0;
    this.turkey = {
      y: GROUND_Y,
      vy: 0,
      grounded: true,
      flaps: 0,
      ducking: false,
      hidden: false,
      invulnT: 0,
      stumbleT: 0,
      runPhase: 0,
      squash: 0,
    };
    this.obstacles = [];
    this.pickups = [];
    this.particles = [];
    this.floaters = [];
    this.spawnT = 1.1;
    this.pickupT = 0.6;
    this.knifeT = 2.2;
    this.leafT = 0;
    this.message = '';
    this.messageT = 0;
    this.escaped = false;
    this.caught = false;
    this.endReason = '';
    this.events = [];
  }

  startRun() {
    this.reset();
    this.state = 'playing';
    this.stageBanner = 'FARMYARD — RUN, TURKEY, RUN!';
    this.stageBannerT = 2.4;
    this.events.push('start');
  }

  endRun(escaped, reason) {
    this.state = escaped ? 'escaped' : 'caught';
    this.escaped = escaped;
    this.caught = !escaped;
    this.endReason = reason;
    this.bestDistance = Math.max(this.bestDistance, Math.floor(this.distance));
    this.events.push(escaped ? 'escaped' : 'caught');
  }

  get stage() {
    return stageIndexForDistance(this.distance);
  }

  get runSpeed() {
    const target = Math.min(
      TUNING.maxSpeed,
      TUNING.baseSpeed + this.distance * TUNING.speedPerMetre,
    );
    let speed = target;
    if (this.turkey.stumbleT > 0) speed *= TUNING.stumbleSlow;
    if (this.dashT > 0) speed *= 1.45;
    return speed;
  }

  // --- spawning ----------------------------------------------------------

  _pickObstacleKind() {
    const stage = this.stage;
    const roll = this.random();
    if (stage === 2) {
      if (roll < 0.34) return 'oven';
      if (roll < 0.52) return 'pitchfork';
      if (roll < 0.72) return 'crate';
      if (roll < 0.88) return 'fence';
      return 'haybale';
    }
    if (stage === 1) {
      if (roll < 0.3) return 'pitchfork';
      if (roll < 0.55) return 'crate';
      if (roll < 0.8) return 'haybale';
      return 'fence';
    }
    if (roll < 0.42) return 'haybale';
    if (roll < 0.7) return 'fence';
    return 'crate';
  }

  _spawnObstacle() {
    const kind = this._pickObstacleKind();
    const def = OBSTACLE_DEFS[kind];
    const obstacle = {
      kind,
      x: 1360,
      y: GROUND_Y,
      w: def.w,
      h: def.h,
      jumpable: def.jumpable,
      hideable: def.hideable,
      hit: false,
      jetT: 0,
      jetOn: false,
      jetCycle: 1.6 + this.random() * 1.2,
    };
    this.obstacles.push(obstacle);
    return obstacle;
  }

  _spawnKnife() {
    this.pickups.push({
      kind: 'knife',
      x: TURKEY_X + 260 + this.random() * 420,
      y: -40,
      vy: 520 + this.distance * 0.12,
      w: 26,
      h: 84,
      stuckT: 0,
      warned: false,
      bob: 0,
    });
  }

  _spawnPickup() {
    const roll = this.random();
    const kind = roll < 0.08 ? 'goldencorn' : roll < 0.3 ? 'feather' : 'corn';
    const low = this.random() < 0.45;
    this.pickups.push({
      kind,
      x: 1360,
      y: low ? GROUND_Y - 46 : GROUND_Y - 170 - this.random() * 60,
      w: 40,
      h: 40,
      vy: 0,
      stuckT: 0,
      warned: true,
      bob: this.random() * Math.PI * 2,
    });
  }

  // --- particles / feedback ----------------------------------------------

  _puff(x, y, count, color) {
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x,
        y,
        vx: -60 - this.random() * 120,
        vy: -40 - this.random() * 120,
        life: 0.5 + this.random() * 0.4,
        maxLife: 0.9,
        size: 4 + this.random() * 7,
        color,
      });
    }
  }

  _floater(x, y, text, color) {
    this.floaters.push({ x, y, text, color, life: 1.1 });
  }

  // --- main update --------------------------------------------------------

  update(dt, input, sfx) {
    this.time += dt;
    if (this.state !== 'playing') {
      this._updateAmbient(dt);
      return;
    }
    this.runTime += dt;
    this.speed = this.runSpeed;
    const metres = (this.speed * dt) / 26;
    this.distance += metres;
    this.score += metres;
    this.bestDistance = Math.max(this.bestDistance, Math.floor(this.distance));

    // Stage changes.
    const stage = this.stage;
    if (stage !== this.stageIndex) {
      this.stageIndex = stage;
      const names = ['THE BARN — MIND THE PITCHFORKS!', 'THE KITCHEN — THE OVEN IS LIT!'];
      this.stageBanner = names[stage - 1] || '';
      this.stageBannerT = 2.6;
      sfx.stageHorn();
      this.events.push('stage:' + stage);
    }
    if (this.stageBannerT > 0) this.stageBannerT -= dt;
    if (this.messageT > 0) this.messageT -= dt;

    this._updateTurkey(dt, input, sfx);
    this._updateFarmer(dt, sfx);
    this._updateSpawning(dt);
    this._updateObstacles(dt);
    this._updatePickups(dt);
    this._updateParticles(dt);
    this._updateAmbient(dt);

    if (this.distance >= ESCAPE_DISTANCE) {
      this.endRun(true, 'You reached the forest gate — free at last!');
      sfx.escaped();
      return;
    }
    if (this.lives <= 0) {
      this.endRun(false, 'The farmer caught you at the kitchen door…');
      sfx.caught();
    }
  }

  _updateAmbient(dt) {
    this.leafT -= dt;
    if (this.leafT <= 0 && this.state !== 'caught') {
      this.leafT = 0.24 + this.random() * 0.3;
      this.particles.push({
        x: 1280 + 20,
        y: -10,
        vx: -40 - this.random() * 60,
        vy: 30 + this.random() * 40,
        life: 6,
        maxLife: 6,
        size: 6 + this.random() * 6,
        color: ['#e07b2a', '#c23b22', '#e8b64c'][Math.floor(this.random() * 3)],
        leaf: true,
      });
    }
    this._updateParticles(dt);
  }

  _updateTurkey(dt, input, sfx) {
    const t = this.turkey;
    if (t.invulnT > 0) t.invulnT -= dt;
    if (t.stumbleT > 0) t.stumbleT -= dt;
    if (this.dashT > 0) this.dashT -= dt;
    t.runPhase += dt * (this.speed / 26);
    if (t.squash > 0) t.squash -= dt * 3;

    const wantDuck = input.isDuckHeld() && t.grounded;
    t.ducking = wantDuck;

    if (input.consumeJumpPressed()) {
      if (t.grounded) {
        t.vy = TUNING.jumpVelocity;
        t.grounded = false;
        t.flaps = 1;
        sfx.jump();
        this._puff(TURKEY_X, GROUND_Y, 4, '#d9b983');
      } else if (t.flaps < TUNING.maxFlaps) {
        t.vy = TUNING.flapVelocity;
        t.flaps++;
        sfx.flap();
        this._puff(TURKEY_X - 20, t.y + 10, 5, '#fff3d6');
      }
    }

    if (!t.grounded) {
      t.vy += TUNING.gravity * dt;
      t.y += t.vy * dt;
      if (t.y >= GROUND_Y) {
        t.y = GROUND_Y;
        t.vy = 0;
        t.grounded = true;
        t.flaps = 0;
        t.squash = 1;
        this._puff(TURKEY_X, GROUND_Y, 3, '#d9b983');
      }
    }

    // Hiding: ducking behind a haybale breaks the farmer's line of sight.
    t.hidden = false;
    if (t.ducking) {
      for (const o of this.obstacles) {
        if (o.hideable && Math.abs(o.x - TURKEY_X) < 90) {
          t.hidden = true;
          break;
        }
      }
    }
  }

  _updateFarmer(dt, sfx) {
    const wasSpotted = this.spotted >= TUNING.spottedSprintAt;
    // Spotted meter: rises while the turkey is visible and the farmer is near.
    if (!this.turkey.hidden && this.farmerGap < 24) {
      this.spotted = clamp(this.spotted + TUNING.spottedRise * dt, 0, 100);
    } else {
      this.spotted = clamp(this.spotted - TUNING.spottedFall * dt, 0, 100);
    }
    if (this.spotted >= TUNING.spottedSprintAt && !wasSpotted) {
      this.farmerSprintT = 2.0;
      sfx.spotted();
      this.message = 'SPOTTED! RUN!';
      this.messageT = 1.4;
    }

    if (this.farmerSprintT > 0) {
      this.farmerSprintT -= dt;
      this.farmerState = 'sprint';
      this.farmerGap -= 7.5 * dt;
    } else if (this.farmerGap > TUNING.farmerSearchGap) {
      // Too far behind: the farmer stops, looks around, and loses the trail.
      this.farmerState = 'search';
      this.farmerSearchT += dt;
      this.farmerGap -= 2.2 * dt;
      this.spotted = clamp(this.spotted - 20 * dt, 0, 100);
    } else {
      this.farmerState = 'chase';
      this.farmerSearchT = 0;
      // He closes in when the turkey stumbles, drifts back when the run is clean.
      const drift = this.turkey.stumbleT > 0 ? -3.2 : 1.15;
      this.farmerGap = clamp(this.farmerGap + drift * dt, 2, 60);
    }

    if (this.farmerGap <= TUNING.farmerCatchGap) {
      this._caughtByFarmer(sfx);
    }
  }

  _caughtByFarmer(sfx) {
    this.lives -= 1;
    sfx.hit();
    this._puff(TURKEY_X - 40, this.turkey.y - 30, 14, '#fff3d6');
    this._floater(TURKEY_X, this.turkey.y - 90, 'CAUGHT! -1 LIFE', '#e2481f');
    if (this.lives > 0) {
      this.farmerGap = 15;
      this.spotted = 25;
      this.turkey.invulnT = TUNING.invulnSeconds;
      this.turkey.stumbleT = 0.9;
      this.message = 'HE GOT YOU — SHAKE HIM OFF!';
      this.messageT = 1.6;
      this.events.push('caught-by-farmer');
    }
  }

  _updateSpawning(dt) {
    this.spawnT -= dt;
    if (this.spawnT <= 0) {
      this._spawnObstacle();
      const base = 1.55 - this.stage * 0.22 - this.distance * 0.0004;
      this.spawnT = Math.max(0.85, base + this.random() * 0.7);
    }
    this.pickupT -= dt;
    if (this.pickupT <= 0) {
      this._spawnPickup();
      this.pickupT = 1.1 + this.random() * 1.4;
    }
    if (this.stage === 2) {
      this.knifeT -= dt;
      if (this.knifeT <= 0) {
        this._spawnKnife();
        this.knifeT = 1.6 + this.random() * 1.4;
      }
    }
  }

  _updateObstacles(dt) {
    const move = this.speed * dt;
    for (const o of this.obstacles) {
      o.x -= move;
      if (o.kind === 'oven') {
        o.jetT += dt;
        if (o.jetT >= o.jetCycle) {
          o.jetT = 0;
          o.jetOn = !o.jetOn;
          o.jetCycle = o.jetOn ? 0.9 + this.random() * 0.5 : 1.4 + this.random() * 1.0;
        }
      }
    }
    this.obstacles = this.obstacles.filter((o) => o.x > -220);
    if (this.state === 'playing') this._checkObstacleHits();
  }

  _checkObstacleHits() {
    const t = this.turkey;
    if (t.invulnT > 0) return;
    const turkeyTop = t.y - (t.ducking ? 44 : 72);
    const turkeyBottom = t.y;
    const turkeyLeft = TURKEY_X - 34;
    const turkeyRight = TURKEY_X + 34;
    for (const o of this.obstacles) {
      if (o.hit) continue;
      const ox1 = o.x - o.w / 2;
      const ox2 = o.x + o.w / 2;
      const oy1 = o.y - o.h;
      const oy2 = o.y;
      const overlap =
        turkeyRight > ox1 + 8 && turkeyLeft < ox2 - 8 && turkeyBottom > oy1 + 6 && turkeyTop < oy2;
      if (overlap) {
        // Ducking under a low bar is a dodge, not a hit: fences and crates are
        // too tall to duck under, haybales are not.
        if (t.ducking && o.kind === 'haybale') continue;
        o.hit = true;
        this._takeHit(o.x, o.y - o.h / 2);
        continue;
      }
      // The oven's fire jet is a second, taller hazard while it burns: it
      // reaches above the oven, so a jump timed over a lit oven still stings.
      if (o.kind === 'oven' && o.jetOn) {
        const jetTop = oy1 - 150;
        const inJet =
          turkeyRight > ox1 + 14 && turkeyLeft < ox2 - 14 && turkeyBottom > jetTop && turkeyTop < oy1;
        if (inJet) {
          o.hit = true;
          this._takeHit(o.x, oy1 - 80);
        }
      }
    }
  }

  _takeHit(x, y) {
    this.lives -= 1;
    this.turkey.stumbleT = 0.9;
    this.turkey.invulnT = TUNING.invulnSeconds;
    this.farmerGap = Math.max(3, this.farmerGap - TUNING.hitGapLoss);
    this.spotted = clamp(this.spotted + 18, 0, 100);
    this._puff(x, y, 12, '#ffb52e');
    this._floater(TURKEY_X, this.turkey.y - 100, 'OUCH! -1 LIFE', '#e2481f');
    this.events.push('hit');
  }

  _updatePickups(dt) {
    const move = this.speed * dt;
    for (const p of this.pickups) {
      p.bob += dt * 4;
      if (p.kind === 'knife') {
        if (p.stuckT > 0) {
          p.stuckT -= dt;
        } else {
          p.y += p.vy * dt;
          p.vy += 900 * dt;
          if (p.y >= GROUND_Y - 10) {
            p.y = GROUND_Y - 10;
            p.stuckT = 1.4;
          }
        }
      } else {
        p.x -= move;
      }
    }
    this.pickups = this.pickups.filter((p) => p.x > -80 && (p.kind !== 'knife' || p.stuckT > -0.5));
    if (this.state === 'playing') this._checkPickupHits();
  }

  _checkPickupHits() {
    const t = this.turkey;
    const turkeyTop = t.y - (t.ducking ? 44 : 72);
    const turkeyBottom = t.y + 4;
    const turkeyLeft = TURKEY_X - 36;
    const turkeyRight = TURKEY_X + 36;
    const kept = [];
    for (const p of this.pickups) {
      const px1 = p.x - p.w / 2;
      const px2 = p.x + p.w / 2;
      const py1 = p.y - p.h / 2;
      const py2 = p.y + p.h / 2;
      const overlap =
        turkeyRight > px1 && turkeyLeft < px2 && turkeyBottom > py1 && turkeyTop < py2;
      if (!overlap) {
        kept.push(p);
        continue;
      }
      if (p.kind === 'knife') {
        if (t.invulnT <= 0) {
          this._takeHit(p.x, p.y);
          this.events.push('knife-hit');
        }
        kept.push(p);
        continue;
      }
      if (p.kind === 'corn') {
        this.score += TUNING.cornScore;
        this.corn += 1;
        this._floater(p.x, p.y - 30, '+50 CORN', '#ffb52e');
        this.events.push('corn');
      } else if (p.kind === 'goldencorn') {
        this.score += TUNING.goldenCornScore;
        this.corn += 1;
        this._floater(p.x, p.y - 30, '+150 GOLDEN CORN!', '#ffd23e');
        this.events.push('goldencorn');
      } else if (p.kind === 'feather') {
        this.score += TUNING.featherScore;
        this.feathers += 1;
        this.dashT = TUNING.featherDashSeconds;
        this.spotted = clamp(this.spotted - 20, 0, 100);
        this._floater(p.x, p.y - 30, '+25 FEATHER DASH!', '#7dc242');
        this.events.push('feather');
      }
    }
    this.pickups = kept;
  }

  _updateParticles(dt) {
    for (const p of this.particles) {
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.leaf) {
        p.x += Math.sin(this.time * 3 + p.size) * 20 * dt;
        p.vy += 12 * dt;
      }
    }
    this.particles = this.particles.filter((p) => p.life > 0 && p.y < 760);
    for (const f of this.floaters) {
      f.life -= dt;
      f.y -= 42 * dt;
    }
    this.floaters = this.floaters.filter((f) => f.life > 0);
  }

  // --- scripted states for screenshots / tests ---------------------------

  forceTitle() {
    this.reset();
    this.state = 'title';
  }

  forcePlayShot() {
    this.reset();
    this.state = 'playing';
    this.distance = 238;
    this.score = 412;
    this.corn = 6;
    this.feathers = 2;
    this.lives = 3;
    this.spotted = 46;
    this.farmerGap = 16;
    this.stageIndex = 0;
    this.turkey.runPhase = 2.4;
    this._spawnObstacleAt('haybale', 620);
    this._spawnObstacleAt('fence', 980);
    this._spawnPickupAt('corn', 520, GROUND_Y - 46);
    this._spawnPickupAt('corn', 760, GROUND_Y - 170);
    this._spawnPickupAt('feather', 1080, GROUND_Y - 46);
  }

  forceKitchenShot() {
    this.reset();
    this.state = 'playing';
    this.distance = 812;
    this.score = 1240;
    this.corn = 14;
    this.feathers = 5;
    this.lives = 2;
    this.spotted = 82;
    this.farmerGap = 7;
    this.farmerState = 'sprint';
    this.stageIndex = 2;
    this.stageBanner = '';
    this.stageBannerT = 0;
    this.message = '';
    this.messageT = 0;
    this.turkey.runPhase = 2.4;
    this._spawnObstacleAt('oven', 700, true);
    this._spawnObstacleAt('pitchfork', 1020);
    this._spawnKnifeAt(800, 180);
    this._spawnPickupAt('corn', 880, GROUND_Y - 46);
  }

  forceEscaped() {
    this.reset();
    this.state = 'escaped';
    this.escaped = true;
    this.distance = ESCAPE_DISTANCE;
    this.score = 2380;
    this.corn = 19;
    this.feathers = 7;
    this.lives = 2;
    this.bestDistance = ESCAPE_DISTANCE;
    this.endReason = 'You reached the forest gate — free at last!';
  }

  forceCaught() {
    this.reset();
    this.state = 'caught';
    this.caught = true;
    this.distance = 486;
    this.score = 913;
    this.corn = 9;
    this.feathers = 3;
    this.lives = 0;
    this.bestDistance = 486;
    this.endReason = 'The farmer caught you at the kitchen door…';
  }

  _spawnObstacleAt(kind, x, jetOn = false) {
    const def = OBSTACLE_DEFS[kind];
    this.obstacles.push({
      kind,
      x,
      y: GROUND_Y,
      w: def.w,
      h: def.h,
      jumpable: def.jumpable,
      hideable: def.hideable,
      hit: false,
      jetT: 0,
      jetOn,
      jetCycle: jetOn ? 3.2 : 1.6,
    });
  }

  _spawnPickupAt(kind, x, y) {
    this.pickups.push({ kind, x, y, w: 40, h: 40, vy: 0, stuckT: 0, warned: true, bob: 0 });
  }

  _spawnKnifeAt(x, y) {
    this.pickups.push({ kind: 'knife', x, y, w: 26, h: 84, vy: 420, stuckT: 0, warned: true, bob: 0 });
  }
}
