// Gobble Dash — the renderer, one job: draw everything on the canvas.
// The turkey, the farmer, the farm, the barn, the kitchen, the HUD and all
// screens are drawn here in code. No images, no external assets.

import {
  VIEW_WIDTH,
  VIEW_HEIGHT,
  GROUND_Y,
  ESCAPE_DISTANCE,
  TURKEY_X,
  PALETTE,
  STAGES,
  clamp,
} from './config.js';

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.scrollX = 0;
    this.clouds = [
      { x: 120, y: 90, s: 1.1 },
      { x: 520, y: 60, s: 0.8 },
      { x: 900, y: 110, s: 1.3 },
      { x: 1150, y: 70, s: 0.7 },
    ];
  }

  render(world, time) {
    const ctx = this.ctx;
    this.scrollX += world.speed * 0.016;
    this._drawSky(world, time);
    this._drawGround(world, time);
    this._drawPickups(world, time);
    this._drawObstacles(world, time);
    // The actors only run on screen while the game is in play; the title
    // and end screens draw their own mascot instead of a second turkey.
    if (world.state === 'playing' || world.state === 'paused') {
      this._drawFarmer(world, time);
      this._drawTurkey(world, time);
    }
    this._drawParticles(world);
    this._drawFloaters(world);
    if (world.state === 'playing' || world.state === 'paused') {
      this._drawHud(world);
      this._drawBanner(world);
    }
    if (world.state === 'title') this._drawTitle(world);
    if (world.state === 'escaped') this._drawEndScreen(world, true);
    if (world.state === 'caught') this._drawEndScreen(world, false);
    if (world.state === 'paused') this._drawPaused();
  }

  // --- backdrop -----------------------------------------------------------

  _drawSky(world, time) {
    const ctx = this.ctx;
    const stage = world.stageIndex;
    const grad = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
    if (stage === 2) {
      grad.addColorStop(0, '#f7e8c8');
      grad.addColorStop(1, '#f0d3a0');
    } else {
      grad.addColorStop(0, PALETTE.skyTop);
      grad.addColorStop(0.55, PALETTE.skyMid);
      grad.addColorStop(1, PALETTE.skyLow);
    }
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, VIEW_WIDTH, GROUND_Y + 4);

    // Sun.
    ctx.fillStyle = PALETTE.sun;
    ctx.beginPath();
    ctx.arc(1080, 96, 44, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 180, 60, 0.55)';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(1080, 96, 56, 0, Math.PI * 2);
    ctx.stroke();

    // Drifting clouds.
    ctx.fillStyle = PALETTE.cloud;
    for (const c of this.clouds) {
      const cx = ((c.x - this.scrollX * 0.08) % 1500 + 1500) % 1500 - 110;
      this._cloud(cx, c.y, c.s);
    }

    if (stage === 2) {
      this._drawKitchenWall(world, time);
    } else {
      this._drawFarmHills(world, time);
    }
  }

  _cloud(x, y, s) {
    const ctx = this.ctx;
    ctx.beginPath();
    ctx.arc(x, y, 22 * s, 0, Math.PI * 2);
    ctx.arc(x + 26 * s, y - 8 * s, 18 * s, 0, Math.PI * 2);
    ctx.arc(x + 52 * s, y, 20 * s, 0, Math.PI * 2);
    ctx.fill();
  }

  _drawFarmHills(world, time) {
    const ctx = this.ctx;
    // Far hill + barn silhouette.
    ctx.fillStyle = PALETTE.hillFar;
    ctx.beginPath();
    ctx.moveTo(0, 470);
    for (let x = 0; x <= VIEW_WIDTH; x += 40) {
      ctx.lineTo(x, 470 - Math.sin((x + this.scrollX * 0.15) * 0.004) * 26 - 20);
    }
    ctx.lineTo(VIEW_WIDTH, GROUND_Y);
    ctx.lineTo(0, GROUND_Y);
    ctx.closePath();
    ctx.fill();

    // Barn on the far hill, sliding past slowly, its base on the hill line.
    const barnX = 760 - ((this.scrollX * 0.15) % 1600);
    this._barn(barnX, 460, 0.85);
    const barnX2 = barnX + 900;
    if (barnX2 < VIEW_WIDTH + 200) this._barn(barnX2, 468, 0.7);

    // Near hill.
    ctx.fillStyle = PALETTE.hillNear;
    ctx.beginPath();
    ctx.moveTo(0, 540);
    for (let x = 0; x <= VIEW_WIDTH; x += 40) {
      ctx.lineTo(x, 540 - Math.sin((x + this.scrollX * 0.3) * 0.006) * 14 - 8);
    }
    ctx.lineTo(VIEW_WIDTH, GROUND_Y);
    ctx.lineTo(0, GROUND_Y);
    ctx.closePath();
    ctx.fill();

    // Autumn trees on the near hill.
    for (let i = 0; i < 5; i++) {
      const tx = ((i * 317 - this.scrollX * 0.3) % 1400 + 1400) % 1400 - 60;
      this._tree(tx, 520, 0.9 + (i % 3) * 0.15);
    }
  }

  _barn(x, y, s) {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    ctx.fillStyle = PALETTE.barnRed;
    ctx.fillRect(-70, -70, 140, 90);
    ctx.fillStyle = PALETTE.barnDark;
    ctx.beginPath();
    ctx.moveTo(-82, -68);
    ctx.lineTo(0, -118);
    ctx.lineTo(82, -68);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#fff3d6';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(-70, -68);
    ctx.lineTo(70, -68);
    ctx.moveTo(-70, 20);
    ctx.lineTo(70, 20);
    ctx.moveTo(0, -68);
    ctx.lineTo(0, 20);
    ctx.stroke();
    ctx.fillStyle = '#3a2410';
    ctx.fillRect(-24, -34, 48, 54);
    ctx.restore();
  }

  _tree(x, y, s) {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    ctx.fillStyle = '#6e451f';
    ctx.fillRect(-6, -34, 12, 34);
    ctx.fillStyle = '#d96a1e';
    ctx.beginPath();
    ctx.arc(0, -52, 30, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#e8b64c';
    ctx.beginPath();
    ctx.arc(-18, -40, 18, 0, Math.PI * 2);
    ctx.arc(18, -44, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  _drawKitchenWall(world, time) {
    const ctx = this.ctx;
    // Kitchen wall: warm tiles, a window, hanging pots and a shelf.
    ctx.fillStyle = PALETTE.kitchenWall;
    ctx.fillRect(0, 0, VIEW_WIDTH, 470);
    ctx.strokeStyle = 'rgba(180, 140, 80, 0.35)';
    ctx.lineWidth = 2;
    for (let y = 40; y < 470; y += 56) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(VIEW_WIDTH, y);
      ctx.stroke();
    }
    for (let x = 28; x < VIEW_WIDTH; x += 56) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 470);
      ctx.stroke();
    }
    // Window with the farm outside — the way out.
    ctx.fillStyle = '#8ec8e8';
    ctx.fillRect(96, 90, 190, 150);
    ctx.fillStyle = PALETTE.grass;
    ctx.fillRect(96, 190, 190, 50);
    ctx.fillStyle = '#fff3d6';
    ctx.fillRect(180, 90, 12, 150);
    ctx.fillRect(96, 158, 190, 12);
    ctx.strokeStyle = '#6b4423';
    ctx.lineWidth = 8;
    ctx.strokeRect(96, 90, 190, 150);
    // Hanging pots.
    for (let i = 0; i < 4; i++) {
      const px = 560 + i * 130;
      ctx.strokeStyle = '#6b4423';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(px, 20);
      ctx.lineTo(px, 64);
      ctx.stroke();
      ctx.fillStyle = i % 2 ? '#4a4a52' : '#a83c2a';
      ctx.beginPath();
      ctx.arc(px, 92, 30, 0, Math.PI);
      ctx.fill();
      ctx.fillRect(px - 30, 88, 60, 8);
    }
    // Shelf with jam jars.
    ctx.fillStyle = '#8a5a28';
    ctx.fillRect(880, 300, 320, 12);
    const jarColors = ['#d92626', '#e07b2a', '#7da23f', '#ffb52e'];
    jarColors.forEach((color, i) => {
      ctx.fillStyle = color;
      ctx.fillRect(900 + i * 72, 262, 44, 38);
      ctx.fillStyle = '#fff3d6';
      ctx.fillRect(900 + i * 72, 262, 44, 10);
    });
    // Chalkboard menu — the turkey's worst nightmare, written in chalk.
    ctx.fillStyle = '#3a3a42';
    ctx.fillRect(420, 130, 300, 150);
    ctx.strokeStyle = '#8a5a28';
    ctx.lineWidth = 8;
    ctx.strokeRect(420, 130, 300, 150);
    ctx.fillStyle = '#fff3d6';
    ctx.textAlign = 'center';
    ctx.font = 'bold 24px Georgia, serif';
    ctx.fillText("TODAY'S MENU", 570, 168);
    ctx.font = 'bold 30px Georgia, serif';
    ctx.fillStyle = '#ffd23e';
    ctx.fillText('ROAST TURKEY', 570, 208);
    ctx.font = '20px Georgia, serif';
    ctx.fillStyle = '#fff3d6';
    ctx.fillText('with all the trimmings', 570, 242);
    ctx.fillText('— served at noon —', 570, 266);
  }

  _drawGround(world, time) {
    const ctx = this.ctx;
    if (world.stageIndex === 2) {
      // Kitchen checkerboard floor.
      const tile = 64;
      for (let y = GROUND_Y; y < VIEW_HEIGHT; y += tile) {
        for (let x = -((this.scrollX | 0) % tile); x < VIEW_WIDTH; x += tile) {
          const col = (Math.floor(x / tile) + Math.floor(y / tile)) % 2 === 0;
          ctx.fillStyle = col ? PALETTE.kitchenTile : PALETTE.kitchenTileDark;
          ctx.fillRect(x, y, tile, tile);
        }
      }
      ctx.fillStyle = '#c8932f';
      ctx.fillRect(0, GROUND_Y - 6, VIEW_WIDTH, 6);
      return;
    }
    // Farm dirt path with grass tufts.
    ctx.fillStyle = PALETTE.dirt;
    ctx.fillRect(0, GROUND_Y, VIEW_WIDTH, VIEW_HEIGHT - GROUND_Y);
    ctx.fillStyle = PALETTE.dirtDark;
    ctx.fillRect(0, GROUND_Y, VIEW_WIDTH, 8);
    ctx.fillStyle = PALETTE.grass;
    ctx.fillRect(0, GROUND_Y - 10, VIEW_WIDTH, 12);
    // A proper fence: two rails across the whole field, posts scrolling past.
    ctx.fillStyle = PALETTE.fence;
    ctx.fillRect(0, GROUND_Y - 62, VIEW_WIDTH, 9);
    ctx.fillRect(0, GROUND_Y - 34, VIEW_WIDTH, 9);
    const off = this.scrollX % 260;
    for (let i = -1; i < 6; i++) {
      const fx = i * 260 - off;
      ctx.fillStyle = PALETTE.fence;
      ctx.fillRect(fx, GROUND_Y - 72, 10, 62);
      ctx.beginPath();
      ctx.moveTo(fx, GROUND_Y - 72);
      ctx.lineTo(fx + 5, GROUND_Y - 82);
      ctx.lineTo(fx + 10, GROUND_Y - 72);
      ctx.closePath();
      ctx.fill();
      if (i % 2 === 0) {
        ctx.fillStyle = '#e07b2a';
        ctx.beginPath();
        ctx.arc(fx + 90, GROUND_Y - 14, 16, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#5d7d2e';
        ctx.fillRect(fx + 86, GROUND_Y - 34, 8, 12);
      }
    }
    // Dust kicked up by the run.
    ctx.fillStyle = 'rgba(217, 185, 131, 0.5)';
    for (let i = 0; i < 6; i++) {
      const dx = ((i * 211 - this.scrollX * 1.6) % 1400 + 1400) % 1400 - 60;
      ctx.beginPath();
      ctx.arc(dx, GROUND_Y + 66 + (i % 3) * 18, 5 + (i % 3) * 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // --- actors --------------------------------------------------------------

  _drawTurkey(world, time, atOrigin = false) {
    const ctx = this.ctx;
    const t = world.turkey;
    const blink = t.invulnT > 0 && Math.floor(time * 12) % 2 === 0;
    if (blink) ctx.globalAlpha = 0.35;
    ctx.save();
    ctx.translate(atOrigin ? 0 : TURKEY_X, t.y);
    const squash = t.ducking ? 0.62 : 1 - (t.squash || 0) * 0.18;
    ctx.scale(1.22, squash);
    const flap = !t.grounded ? Math.sin(time * 18) * 0.5 : 0;

    // Tail fan: arcs up and back behind the body.
    const tailColors = [PALETTE.tailBrown, PALETTE.tailOrange, PALETTE.tailRed, PALETTE.tailOrange, PALETTE.tailBrown];
    for (let i = 0; i < 5; i++) {
      const ang = -0.28 + (i - 2) * 0.38;
      ctx.save();
      ctx.rotate(ang);
      ctx.fillStyle = tailColors[i];
      ctx.beginPath();
      ctx.ellipse(0, -46, 13, 34, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255, 243, 214, 0.85)';
      ctx.beginPath();
      ctx.ellipse(0, -72, 4, 10, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Body.
    ctx.fillStyle = PALETTE.turkeyBody;
    ctx.beginPath();
    ctx.ellipse(0, -34, 34, 30, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PALETTE.turkeyLight;
    ctx.beginPath();
    ctx.ellipse(6, -28, 20, 18, 0, 0, Math.PI * 2);
    ctx.fill();

    // Wing, flapping when airborne.
    ctx.save();
    ctx.translate(-6, -36);
    ctx.rotate(flap - 0.3);
    ctx.fillStyle = PALETTE.turkeyDark;
    ctx.beginPath();
    ctx.ellipse(-14, 0, 20, 11, -0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Legs, running.
    const legSwing = t.grounded ? Math.sin(t.runPhase * 0.55) * 14 : 8;
    ctx.strokeStyle = '#e07b2a';
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-8, -8);
    ctx.lineTo(-8 + legSwing, 0);
    ctx.moveTo(8, -8);
    ctx.lineTo(8 - legSwing, 0);
    ctx.stroke();

    // Head, beak, wattle, eye.
    ctx.fillStyle = PALETTE.turkeyBody;
    ctx.beginPath();
    ctx.arc(26, -66, 15, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PALETTE.beak;
    ctx.beginPath();
    ctx.moveTo(38, -70);
    ctx.lineTo(54, -64);
    ctx.lineTo(38, -58);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = PALETTE.wattle;
    ctx.beginPath();
    ctx.ellipse(40, -54, 4, 8, 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(30, -70, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath();
    ctx.arc(32, -70, 2.5, 0, Math.PI * 2);
    ctx.fill();
    // Panic sweat when spotted is high.
    if (world.spotted > 60 && world.state === 'playing') {
      ctx.fillStyle = '#8ec8e8';
      ctx.beginPath();
      ctx.arc(14, -82, 4, 0, Math.PI * 2);
      ctx.arc(22, -88, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  _drawFarmer(world, time) {
    const ctx = this.ctx;
    // The farmer trails behind the turkey: gap in metres maps to pixels.
    const gapPx = world.farmerGap * 9;
    const x = TURKEY_X - 90 - gapPx;
    if (x < -160) return;
    const bob = Math.sin(time * 10) * 3;
    ctx.save();
    ctx.translate(x, GROUND_Y + bob);

    // Legs.
    const swing = Math.sin(time * 11) * 16;
    ctx.strokeStyle = PALETTE.farmerOveralls;
    ctx.lineWidth = 9;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-6, -52);
    ctx.lineTo(-6 + swing, 0);
    ctx.moveTo(6, -52);
    ctx.lineTo(6 - swing, 0);
    ctx.stroke();

    // Body: red shirt, blue overalls.
    ctx.fillStyle = PALETTE.farmerShirt;
    ctx.beginPath();
    ctx.ellipse(0, -78, 30, 30, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PALETTE.farmerOveralls;
    ctx.fillRect(-24, -84, 48, 40);
    ctx.fillStyle = '#ffd23e';
    ctx.fillRect(-10, -78, 6, 6);
    ctx.fillRect(6, -78, 6, 6);

    // Pitchfork arm, raised when sprinting.
    const armUp = world.farmerState === 'sprint' ? -0.9 : -0.3;
    ctx.save();
    ctx.translate(18, -92);
    ctx.rotate(armUp);
    ctx.strokeStyle = '#8a5a28';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(34, -30);
    ctx.stroke();
    ctx.strokeStyle = '#dfe6ea';
    ctx.lineWidth = 3;
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.moveTo(34 + i * 6, -30);
      ctx.lineTo(40 + i * 6, -46);
      ctx.stroke();
    }
    ctx.restore();

    // Head, beard, straw hat.
    ctx.fillStyle = PALETTE.farmerSkin;
    ctx.beginPath();
    ctx.arc(6, -122, 17, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#e8e0d0';
    ctx.beginPath();
    ctx.ellipse(10, -108, 13, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PALETTE.farmerHat;
    ctx.beginPath();
    ctx.ellipse(6, -134, 26, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(-12, -152, 36, 20);
    // Angry eyes.
    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath();
    ctx.arc(12, -124, 2.5, 0, Math.PI * 2);
    ctx.arc(22, -124, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(8, -131);
    ctx.lineTo(16, -128);
    ctx.moveTo(26, -128);
    ctx.lineTo(18, -131);
    ctx.stroke();
    ctx.restore();

    // Speech bubble: "!" when sprinting, "?" when searching.
    if (world.farmerState === 'sprint' || world.farmerState === 'search') {
      const mark = world.farmerState === 'sprint' ? '!' : '?';
      ctx.fillStyle = '#fff3d6';
      ctx.strokeStyle = '#3a2410';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(x + 44, GROUND_Y - 178, 20, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#c23b22';
      ctx.font = 'bold 26px Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(mark, x + 44, GROUND_Y - 177);
    }
  }

  // --- obstacles & pickups ---------------------------------------------------

  _drawObstacles(world, time) {
    const ctx = this.ctx;
    for (const o of world.obstacles) this._drawObstacle(o, time);
  }

  _drawObstacle(o, time) {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(o.x, o.y);
    if (o.kind === 'haybale') {
      ctx.fillStyle = PALETTE.hay;
      ctx.beginPath();
      ctx.arc(0, -o.h / 2, o.w / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = PALETTE.hayDark;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, -o.h / 2, o.w / 2 - 8, 0, Math.PI * 2);
      ctx.arc(0, -o.h / 2, o.w / 2 - 18, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = PALETTE.hayDark;
      ctx.fillRect(-o.w / 2, -o.h / 2 - 4, o.w, 4);
    } else if (o.kind === 'fence') {
      ctx.fillStyle = PALETTE.fence;
      ctx.fillRect(-6, -o.h, 12, o.h);
      ctx.fillRect(-o.w / 2, -o.h + 8, o.w, 10);
      ctx.fillRect(-o.w / 2, -o.h + 40, o.w, 10);
      ctx.beginPath();
      ctx.moveTo(-6, -o.h);
      ctx.lineTo(0, -o.h - 10);
      ctx.lineTo(6, -o.h);
      ctx.closePath();
      ctx.fill();
    } else if (o.kind === 'crate') {
      ctx.fillStyle = '#b07a3f';
      ctx.fillRect(-o.w / 2, -o.h, o.w, o.h);
      ctx.strokeStyle = '#6e451f';
      ctx.lineWidth = 4;
      ctx.strokeRect(-o.w / 2, -o.h, o.w, o.h);
      ctx.beginPath();
      ctx.moveTo(-o.w / 2, -o.h);
      ctx.lineTo(o.w / 2, 0);
      ctx.moveTo(o.w / 2, -o.h);
      ctx.lineTo(-o.w / 2, 0);
      ctx.stroke();
    } else if (o.kind === 'pitchfork') {
      ctx.strokeStyle = '#8a5a28';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, -o.h);
      ctx.stroke();
      ctx.strokeStyle = '#dfe6ea';
      ctx.lineWidth = 4;
      for (let i = -1; i <= 1; i++) {
        ctx.beginPath();
        ctx.moveTo(i * 10, -o.h);
        ctx.lineTo(i * 12, -o.h - 26);
        ctx.stroke();
      }
      ctx.fillStyle = '#c23b22';
      ctx.beginPath();
      ctx.arc(0, -o.h - 30, 7, 0, Math.PI * 2);
      ctx.fill();
    } else if (o.kind === 'oven') {
      // The oven: dark body, round door, chimney, and fire jets when lit.
      ctx.fillStyle = PALETTE.ovenBody;
      ctx.fillRect(-o.w / 2, -o.h, o.w, o.h);
      ctx.fillStyle = PALETTE.ovenDoor;
      ctx.beginPath();
      ctx.arc(0, -o.h / 2 - 6, 34, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#8a8a96';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(0, -o.h / 2 - 6, 34, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = PALETTE.fireMid;
      ctx.beginPath();
      ctx.arc(0, -o.h / 2 - 6, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = PALETTE.ovenBody;
      ctx.fillRect(-14, -o.h - 34, 28, 36);
      ctx.fillStyle = '#2e2e36';
      ctx.fillRect(-20, -o.h - 40, 40, 8);
      // Warning sign.
      ctx.fillStyle = '#ffd23e';
      ctx.fillRect(-o.w / 2 + 8, -o.h + 8, 26, 22);
      ctx.fillStyle = '#1a1a1a';
      ctx.font = 'bold 16px Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('!', -o.w / 2 + 21, -o.h + 20);
      if (o.jetOn) {
        const flick = Math.sin(time * 30) * 8;
        ctx.fillStyle = PALETTE.fireEdge;
        ctx.beginPath();
        ctx.moveTo(-26, -o.h);
        ctx.quadraticCurveTo(-34, -o.h - 90 + flick, -6, -o.h - 150 + flick);
        ctx.quadraticCurveTo(10, -o.h - 90 + flick, 26, -o.h);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = PALETTE.fireMid;
        ctx.beginPath();
        ctx.moveTo(-16, -o.h);
        ctx.quadraticCurveTo(-20, -o.h - 60, -2, -o.h - 110);
        ctx.quadraticCurveTo(8, -o.h - 60, 16, -o.h);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = PALETTE.fireCore;
        ctx.beginPath();
        ctx.ellipse(0, -o.h - 46, 10, 26, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  _drawPickups(world, time) {
    const ctx = this.ctx;
    for (const p of world.pickups) {
      ctx.save();
      ctx.translate(p.x, p.y + Math.sin(p.bob || 0) * 4);
      if (p.kind === 'knife') {
        // Falling carving knife, with a warning shadow on the ground.
        if (p.stuckT <= 0 && p.y < GROUND_Y - 60) {
          ctx.fillStyle = 'rgba(60, 30, 8, 0.35)';
          ctx.beginPath();
          ctx.ellipse(0, GROUND_Y - p.y + 4, 18, 5, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#e2481f';
          ctx.font = 'bold 20px Arial, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('!', 0, GROUND_Y - p.y - 14);
        }
        ctx.rotate(p.stuckT > 0 ? 0.12 : Math.sin(time * 6) * 0.08);
        ctx.fillStyle = PALETTE.knifeBlade;
        ctx.beginPath();
        ctx.moveTo(0, -p.h / 2 - 14);
        ctx.lineTo(11, -p.h / 2 + 22);
        ctx.lineTo(11, p.h / 2 - 18);
        ctx.lineTo(-11, p.h / 2 - 18);
        ctx.lineTo(-11, -p.h / 2 + 22);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#3a2410';
        ctx.lineWidth = 2.5;
        ctx.stroke();
        ctx.fillStyle = PALETTE.knifeHandle;
        ctx.fillRect(-11, p.h / 2 - 18, 22, 18);
        ctx.fillStyle = '#ffd23e';
        ctx.fillRect(-11, p.h / 2 - 18, 22, 4);
      } else if (p.kind === 'corn') {
        ctx.fillStyle = '#5d7d2e';
        ctx.beginPath();
        ctx.ellipse(-14, 4, 8, 16, 0.5, 0, Math.PI * 2);
        ctx.ellipse(14, 4, 8, 16, -0.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffd23e';
        ctx.beginPath();
        ctx.ellipse(0, 0, 13, 19, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#e8a91c';
        ctx.lineWidth = 2;
        for (let i = -1; i <= 1; i++) {
          ctx.beginPath();
          ctx.moveTo(i * 6, -16);
          ctx.lineTo(i * 6, 16);
          ctx.stroke();
        }
      } else if (p.kind === 'goldencorn') {
        ctx.fillStyle = '#ffd23e';
        ctx.beginPath();
        ctx.ellipse(0, 0, 16, 23, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#fff3d6';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 0, 20 + Math.sin(time * 6) * 3, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = '#fff3d6';
        ctx.font = 'bold 14px Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('★', 0, 5);
      } else if (p.kind === 'feather') {
        ctx.fillStyle = '#fff3d6';
        ctx.beginPath();
        ctx.ellipse(0, 0, 9, 20, 0.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#d9b983';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, -18);
        ctx.lineTo(-6, 18);
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  _drawParticles(world) {
    const ctx = this.ctx;
    for (const p of world.particles) {
      ctx.globalAlpha = clamp(p.life / p.maxLife, 0, 1);
      ctx.fillStyle = p.color;
      if (p.leaf) {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.life * 4);
        ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        ctx.restore();
      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }

  _drawFloaters(world) {
    const ctx = this.ctx;
    ctx.font = 'bold 20px Arial, sans-serif';
    ctx.textAlign = 'center';
    for (const f of world.floaters) {
      ctx.globalAlpha = clamp(f.life, 0, 1);
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, f.x, f.y);
    }
    ctx.globalAlpha = 1;
  }

  // --- HUD & banners -------------------------------------------------------

  _panel(x, y, w, h) {
    const ctx = this.ctx;
    ctx.fillStyle = PALETTE.hudPanel;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 12);
    ctx.fill();
  }

  _drawHud(world) {
    const ctx = this.ctx;
    ctx.textBaseline = 'middle';

    // Score + corn.
    this._panel(16, 14, 250, 64);
    ctx.fillStyle = PALETTE.hudText;
    ctx.font = 'bold 26px Arial, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`SCORE ${Math.floor(world.score)}`, 30, 34);
    ctx.font = 'bold 18px Arial, sans-serif';
    ctx.fillStyle = '#ffd23e';
    ctx.fillText(`🌽 ${world.corn}   🪶 ${world.feathers}`, 30, 62);

    // Distance bar to the forest gate.
    const barX = 300;
    const barW = 680;
    this._panel(barX - 10, 14, barW + 20, 64);
    ctx.fillStyle = '#3a2410';
    ctx.beginPath();
    ctx.roundRect(barX, 30, barW, 14, 7);
    ctx.fill();
    const progress = clamp(world.distance / ESCAPE_DISTANCE, 0, 1);
    const grad = ctx.createLinearGradient(barX, 0, barX + barW, 0);
    grad.addColorStop(0, '#ffb52e');
    grad.addColorStop(1, '#7dc242');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.roundRect(barX, 30, Math.max(14, barW * progress), 14, 7);
    ctx.fill();
    // Stage ticks.
    ctx.fillStyle = '#fff3d6';
    for (const stage of STAGES) {
      const tx = barX + (stage.from / ESCAPE_DISTANCE) * barW;
      ctx.fillRect(tx - 1, 26, 2, 22);
    }
    ctx.font = 'bold 18px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = PALETTE.hudText;
    ctx.fillText(
      `${Math.floor(world.distance)}m / ${ESCAPE_DISTANCE}m — ${STAGES[world.stageIndex].name} — 🌲 FOREST GATE`,
      barX + barW / 2,
      62,
    );

    // Lives.
    this._panel(1010, 14, 254, 64);
    ctx.font = 'bold 26px Arial, sans-serif';
    ctx.textAlign = 'left';
    let hearts = '';
    for (let i = 0; i < 3; i++) hearts += i < world.lives ? '❤' : '♡';
    ctx.fillStyle = '#ff6b6b';
    ctx.fillText(hearts, 1024, 34);
    ctx.font = 'bold 15px Arial, sans-serif';
    ctx.fillStyle = PALETTE.hudText;
    ctx.fillText('LIVES — DON\'T GET CAUGHT', 1024, 62);

    // Spotted meter.
    const spotW = 220;
    this._panel(1010, 86, 254, 52);
    ctx.font = 'bold 14px Arial, sans-serif';
    ctx.fillStyle = PALETTE.hudText;
    ctx.fillText(world.spotted > 60 ? '👁 SPOTTED!' : '👁 SPOTTED', 1024, 98);
    ctx.fillStyle = '#3a2410';
    ctx.beginPath();
    ctx.roundRect(1024, 108, spotW, 12, 6);
    ctx.fill();
    ctx.fillStyle = world.spotted > 60 ? PALETTE.danger : PALETTE.accent;
    ctx.beginPath();
    ctx.roundRect(1024, 108, Math.max(4, spotW * (world.spotted / 100)), 12, 6);
    ctx.fill();
    ctx.textAlign = 'right';
    ctx.fillStyle = PALETTE.hudText;
    ctx.fillText(`${Math.floor(world.spotted)}%`, 1250, 114);
    ctx.textAlign = 'left';

    // Message flash.
    if (world.messageT > 0) {
      ctx.globalAlpha = clamp(world.messageT, 0, 1);
      ctx.font = 'bold 34px Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#fff3d6';
      ctx.strokeStyle = '#3a2410';
      ctx.lineWidth = 6;
      ctx.strokeText(world.message, VIEW_WIDTH / 2, 170);
      ctx.fillText(world.message, VIEW_WIDTH / 2, 170);
      ctx.globalAlpha = 1;
    }

    // Duck-to-hide hint when a haybale is near.
    if (world.turkey.ducking && world.turkey.hidden) {
      ctx.font = 'bold 20px Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#7dc242';
      ctx.fillText('HIDDEN! The farmer lost your trail…', VIEW_WIDTH / 2, 210);
    }
  }

  _drawBanner(world) {
    if (world.stageBannerT <= 0) return;
    const ctx = this.ctx;
    ctx.globalAlpha = clamp(world.stageBannerT, 0, 1);
    ctx.font = 'bold 44px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fff3d6';
    ctx.strokeStyle = '#3a2410';
    ctx.lineWidth = 8;
    ctx.strokeText(world.stageBanner, VIEW_WIDTH / 2, 300);
    ctx.fillText(world.stageBanner, VIEW_WIDTH / 2, 300);
    ctx.globalAlpha = 1;
  }

  // --- screens --------------------------------------------------------------

  _drawTitle(world) {
    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(60, 30, 8, 0.36)';
    ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);

    // Big turkey mascot on the right, feet on the ground line.
    ctx.save();
    ctx.translate(1100, 600);
    ctx.scale(1.6, 1.6);
    const fake = { turkey: { y: 0, vy: 0, grounded: true, flaps: 0, ducking: false, invulnT: 0, stumbleT: 0, runPhase: 0, squash: 0 }, spotted: 0, state: 'title' };
    this._drawTurkey(fake, 1.2, true);
    ctx.restore();

    // The farmer peeking in from the left edge, already reaching for his fork.
    ctx.save();
    ctx.translate(80, GROUND_Y);
    ctx.fillStyle = PALETTE.farmerSkin;
    ctx.beginPath();
    ctx.arc(0, -122, 17, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#e8e0d0';
    ctx.beginPath();
    ctx.ellipse(4, -108, 13, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PALETTE.farmerHat;
    ctx.beginPath();
    ctx.ellipse(0, -134, 26, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(-18, -152, 36, 20);
    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath();
    ctx.arc(-6, -124, 2.5, 0, Math.PI * 2);
    ctx.arc(6, -124, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.textAlign = 'center';
    ctx.fillStyle = '#fff3d6';
    ctx.font = 'bold 92px Georgia, serif';
    ctx.strokeStyle = '#3a2410';
    ctx.lineWidth = 10;
    ctx.strokeText('GOBBLE DASH', VIEW_WIDTH / 2, 150);
    ctx.fillText('GOBBLE DASH', VIEW_WIDTH / 2, 150);
    ctx.font = 'bold 34px Georgia, serif';
    ctx.fillStyle = '#ffd23e';
    ctx.fillText('— Turkey\'s Last Thanksgiving —', VIEW_WIDTH / 2, 205);

    ctx.font = '22px Georgia, serif';
    ctx.fillStyle = '#fff3d6';
    ctx.fillText('Thanksgiving is tomorrow. The farmer has the oven lit', VIEW_WIDTH / 2, 268);
    ctx.fillText('and the carving knife out. Run 1000m to the forest gate!', VIEW_WIDTH / 2, 298);

    // Controls panel.
    this._panel(430, 330, 420, 150);
    ctx.font = 'bold 20px Arial, sans-serif';
    ctx.fillStyle = PALETTE.hudText;
    ctx.textAlign = 'left';
    ctx.fillText('SPACE / CLICK — jump & flap (×2)', 452, 360);
    ctx.fillText('↓ / S — duck & hide in the hay', 452, 392);
    ctx.fillText('Dodge hay, fences, ovens & knives', 452, 424);
    ctx.fillText('P pause · M mute · R restart', 452, 456);

    const pulse = 0.7 + Math.sin(performance.now() / 300) * 0.3;
    ctx.globalAlpha = pulse;
    ctx.font = 'bold 36px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffd23e';
    ctx.strokeStyle = '#3a2410';
    ctx.lineWidth = 7;
    ctx.strokeText('CLICK OR PRESS SPACE TO START', VIEW_WIDTH / 2, 560);
    ctx.fillText('CLICK OR PRESS SPACE TO START', VIEW_WIDTH / 2, 560);
    ctx.globalAlpha = 1;

    if (world.bestDistance > 0) {
      ctx.font = 'bold 22px Arial, sans-serif';
      ctx.fillStyle = '#fff3d6';
      ctx.fillText(`Best escape so far: ${world.bestDistance}m`, VIEW_WIDTH / 2, 610);
    }
    ctx.font = '18px Arial, sans-serif';
    ctx.fillStyle = 'rgba(255, 243, 214, 0.8)';
    ctx.fillText('An original game — no turkeys were harmed in the making. Probably.', VIEW_WIDTH / 2, 690);
  }

  _drawEndScreen(world, escaped) {
    const ctx = this.ctx;
    ctx.fillStyle = escaped ? 'rgba(40, 90, 30, 0.55)' : 'rgba(90, 20, 10, 0.55)';
    ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);

    ctx.textAlign = 'center';
    ctx.font = 'bold 96px Georgia, serif';
    ctx.strokeStyle = '#3a2410';
    ctx.lineWidth = 10;
    const headline = escaped ? 'ESCAPED!' : 'CAUGHT!';
    ctx.strokeText(headline, VIEW_WIDTH / 2, 180);
    ctx.fillStyle = escaped ? '#7dc242' : '#ff6b6b';
    ctx.fillText(headline, VIEW_WIDTH / 2, 180);

    ctx.font = '26px Georgia, serif';
    ctx.fillStyle = '#fff3d6';
    ctx.fillText(world.endReason, VIEW_WIDTH / 2, 232);

    if (escaped) {
      // Free turkey with a feather crown, at the forest gate.
      ctx.save();
      ctx.translate(640, 470);
      ctx.scale(1.55, 1.55);
      const fake = { turkey: { y: 0, vy: 0, grounded: true, flaps: 0, ducking: false, invulnT: 0, stumbleT: 0, runPhase: 0, squash: 0 }, spotted: 0, state: 'escaped' };
      this._drawTurkey(fake, 0.6, true);
      ctx.restore();
      ctx.fillStyle = '#7da23f';
      ctx.font = 'bold 24px Arial, sans-serif';
      ctx.fillText('🌲 🌲 🌲  THE FOREST GATE  🌲 🌲 🌲', VIEW_WIDTH / 2, 560);
    } else {
      // Comic: the turkey on a platter under a serving dome.
      ctx.save();
      ctx.translate(640, 430);
      ctx.fillStyle = '#dfe6ea';
      ctx.beginPath();
      ctx.ellipse(0, 30, 170, 26, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(223, 230, 234, 0.75)';
      ctx.beginPath();
      ctx.arc(0, -10, 110, Math.PI, 0);
      ctx.fill();
      ctx.fillStyle = '#ffd23e';
      ctx.beginPath();
      ctx.arc(0, -122, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#3a2410';
      ctx.font = 'bold 22px Arial, sans-serif';
      ctx.fillText('🦃', 0, 10);
      ctx.restore();
      ctx.fillStyle = '#fff3d6';
      ctx.font = 'bold 24px Arial, sans-serif';
      ctx.fillText('The farmer is already preheating the oven…', VIEW_WIDTH / 2, 560);
    }

    // Stats panel.
    this._panel(440, 590, 400, 84);
    ctx.font = 'bold 24px Arial, sans-serif';
    ctx.fillStyle = PALETTE.hudText;
    ctx.textAlign = 'left';
    ctx.fillText(`SCORE ${Math.floor(world.score)}`, 462, 620);
    ctx.fillText(`DISTANCE ${Math.floor(world.distance)}m`, 462, 652);
    ctx.textAlign = 'right';
    ctx.fillText(`BEST ${world.bestDistance}m`, 818, 620);
    ctx.fillText(`🌽 ${world.corn}  🪶 ${world.feathers}`, 818, 652);
    ctx.textAlign = 'center';

    const pulse = 0.7 + Math.sin(performance.now() / 300) * 0.3;
    ctx.globalAlpha = pulse;
    ctx.font = 'bold 32px Arial, sans-serif';
    ctx.fillStyle = '#ffd23e';
    ctx.strokeStyle = '#3a2410';
    ctx.lineWidth = 6;
    ctx.strokeText('PRESS R OR CLICK TO RUN AGAIN', VIEW_WIDTH / 2, 712 - 6);
    ctx.fillText('PRESS R OR CLICK TO RUN AGAIN', VIEW_WIDTH / 2, 712 - 6);
    ctx.globalAlpha = 1;
  }

  _drawPaused() {
    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(60, 30, 8, 0.55)';
    ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
    ctx.textAlign = 'center';
    ctx.font = 'bold 64px Georgia, serif';
    ctx.fillStyle = '#fff3d6';
    ctx.strokeStyle = '#3a2410';
    ctx.lineWidth = 8;
    ctx.strokeText('PAUSED', VIEW_WIDTH / 2, 360);
    ctx.fillText('PAUSED', VIEW_WIDTH / 2, 360);
    ctx.font = '24px Arial, sans-serif';
    ctx.fillText('Press P to keep running', VIEW_WIDTH / 2, 410);
  }
}
