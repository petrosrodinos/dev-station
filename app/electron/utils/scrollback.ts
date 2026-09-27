/** Bounded character buffer for PTY output so a re-attached view can replay history. */
export class Scrollback {
  private chunks: string[] = [];
  private size = 0;
  private readonly max: number;

  constructor(max = 1_000_000) {
    this.max = max;
  }

  push(data: string) {
    this.chunks.push(data);
    this.size += data.length;
    while (this.size > this.max && this.chunks.length > 1) {
      this.size -= this.chunks.shift()!.length;
    }
  }

  toString() {
    if (this.chunks.length > 64) {
      const joined = this.chunks.join("");
      this.chunks = [joined];
      return joined;
    }
    return this.chunks.join("");
  }
}
