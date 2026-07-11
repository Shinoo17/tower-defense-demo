export class GameLoop {
  speed = 1;
  paused = false;
  private running = false;
  private last = 0;
  private tick: (dt: number, rawDt: number) => void;
  private hidden = document.hidden;

  constructor(tick: (dt: number, rawDt: number) => void) {
    this.tick = tick;
    document.addEventListener('visibilitychange', () => {
      this.hidden = document.hidden;
      this.last = performance.now();
    });
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.last = performance.now();
    const frame = (now: number) => {
      if (!this.running) return;
      if (this.hidden) {
        this.last = now;
        requestAnimationFrame(frame);
        return;
      }
      const rawDt = Math.min((now - this.last) / 1000, 0.05);
      this.last = now;
      const dt = this.paused ? 0 : rawDt * this.speed;
      this.tick(dt, rawDt);
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }

  stop(): void {
    this.running = false;
  }
}
