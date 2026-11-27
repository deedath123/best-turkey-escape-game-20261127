// Gobble Dash — keyboard + mouse input, one job: turn presses into game intents.
// Space / ArrowUp / W / click = jump or flap. ArrowDown / S = duck and hide.
// R = restart on an end screen. P = pause. M = mute. Enter = start too.

export class InputTracker {
  constructor(canvas) {
    this.canvas = canvas;
    this.down = new Set();
    this.pressed = new Set();
    this.clickQueue = [];
    this.onFirstGesture = null;
    this._gestureFired = false;

    window.addEventListener('keydown', (event) => {
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) {
        event.preventDefault();
      }
      if (!event.repeat) this.pressed.add(event.code);
      this.down.add(event.code);
      this._noteGesture();
    });
    window.addEventListener('keyup', (event) => {
      this.down.delete(event.code);
    });
    window.addEventListener('blur', () => {
      this.down.clear();
    });
    canvas.addEventListener('pointerdown', (event) => {
      const rect = canvas.getBoundingClientRect();
      this.clickQueue.push({
        x: (event.clientX - rect.left) * (canvas.width / rect.width),
        y: (event.clientY - rect.top) * (canvas.height / rect.height),
      });
      this._noteGesture();
    });
  }

  _noteGesture() {
    if (!this._gestureFired) {
      this._gestureFired = true;
      if (this.onFirstGesture) this.onFirstGesture();
    }
  }

  isDown(code) {
    return this.down.has(code);
  }

  // True once per physical press; callers consume it so one press never double-fires.
  consumePressed(code) {
    if (this.pressed.has(code)) {
      this.pressed.delete(code);
      return true;
    }
    return false;
  }

  consumeJumpPressed() {
    if (this.consumePressed('Space')) return true;
    if (this.consumePressed('ArrowUp')) return true;
    if (this.consumePressed('KeyW')) return true;
    // A mouse / touch tap is a flap too.
    if (this.clickQueue.length > 0) {
      this.clickQueue.shift();
      return true;
    }
    return false;
  }

  consumeStartPressed() {
    return (
      this.consumeJumpPressed() ||
      this.consumePressed('Enter') ||
      this.clickQueue.length > 0
    );
  }

  consumeRestartPressed() {
    if (this.consumePressed('KeyR')) return true;
    if (this.consumePressed('Enter')) return true;
    if (this.consumePressed('Space')) return true;
    if (this.clickQueue.length > 0) {
      this.clickQueue.length = 0;
      return true;
    }
    return false;
  }

  isDuckHeld() {
    return this.isDown('ArrowDown') || this.isDown('KeyS');
  }

  consumePausePressed() {
    return this.consumePressed('KeyP');
  }

  consumeMutePressed() {
    return this.consumePressed('KeyM');
  }

  consumeClick() {
    return this.clickQueue.shift() || null;
  }

  hasClick() {
    return this.clickQueue.length > 0;
  }

  // End of frame: drop presses nobody consumed so a stale press never leaks into the next state.
  endFrame() {
    this.pressed.clear();
  }
}
