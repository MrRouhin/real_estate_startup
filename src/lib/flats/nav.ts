// Walkable grid for the flat walk-through: walls and furniture are blocked, doorways are open.
// Used for click-to-walk (A* path, then straightened) and for keyboard movement with collisions.
import { footprintRect, isWalkable, type Layout } from './layout';

export type Nav = {
  cell: number; nx: number; ny: number; ok: Uint8Array;
  free: (x: number, y: number) => boolean;
  nearest: (x: number, y: number, maxR?: number) => { x: number; y: number } | null;
  path: (ax: number, ay: number, bx: number, by: number) => { x: number; y: number }[] | null;
};

export function makeNav(L: Layout, opts: { furniture?: boolean; body?: number } = {}): Nav {
  const cell = 0.1, nx = Math.ceil(L.w / cell), ny = Math.ceil(L.d / cell);
  const ok = new Uint8Array(nx * ny);
  const body = opts.body ?? 0.16;
  const rects = opts.furniture === false ? [] : L.furniture.map(footprintRect).filter((r): r is NonNullable<typeof r> => !!r);
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    const x = (i + 0.5) * cell, y = (j + 0.5) * cell;
    if (!isWalkable(L, x, y, 0.24)) continue;
    if (rects.some((r) => x > r.x0 - body && x < r.x1 + body && y > r.y0 - body && y < r.y1 + body)) continue;
    ok[j * nx + i] = 1;
  }
  const idx = (x: number, y: number) => {
    const i = Math.floor(x / cell), j = Math.floor(y / cell);
    return i < 0 || j < 0 || i >= nx || j >= ny ? -1 : j * nx + i;
  };
  const free = (x: number, y: number) => { const k = idx(x, y); return k >= 0 && ok[k] === 1; };
  const nearest = (x: number, y: number, maxR = 3) => {
    if (free(x, y)) return { x, y };
    for (let r = cell; r <= maxR; r += cell) {
      let best: { x: number; y: number; d: number } | null = null;
      for (let a = 0; a < 32; a++) {
        const px = x + Math.cos((a / 32) * Math.PI * 2) * r, py = y + Math.sin((a / 32) * Math.PI * 2) * r;
        if (free(px, py)) { const d = Math.hypot(px - x, py - y); if (!best || d < best.d) best = { x: px, y: py, d }; }
      }
      if (best) return { x: best.x, y: best.y };
    }
    return null;
  };
  const clear = (ax: number, ay: number, bx: number, by: number) => {
    const n = Math.ceil(Math.hypot(bx - ax, by - ay) / 0.04);
    for (let s = 1; s < n; s++) if (!free(ax + ((bx - ax) * s) / n, ay + ((by - ay) * s) / n)) return false;
    return true;
  };
  const path = (ax: number, ay: number, bx: number, by: number) => {
    const s = nearest(ax, ay, 1), t = nearest(bx, by, 2);
    if (!s || !t) return null;
    if (clear(s.x, s.y, t.x, t.y)) return [t];
    const start = idx(s.x, s.y), goal = idx(t.x, t.y);
    const g = new Float32Array(nx * ny).fill(Infinity), from = new Int32Array(nx * ny).fill(-1);
    const closed = new Uint8Array(nx * ny);
    const heap: [number, number][] = [];
    const push = (k: number, f: number) => { heap.push([f, k]); let i = heap.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (heap[p]![0] <= heap[i]![0]) break; [heap[p], heap[i]] = [heap[i]!, heap[p]!]; i = p; } };
    const pop = () => { const top = heap[0]!; const last = heap.pop()!; if (heap.length) { heap[0] = last; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < heap.length && heap[l]![0] < heap[m]![0]) m = l; if (r < heap.length && heap[r]![0] < heap[m]![0]) m = r; if (m === i) break; [heap[m], heap[i]] = [heap[i]!, heap[m]!]; i = m; } } return top[1]; };
    const gi = goal % nx, gj = Math.floor(goal / nx);
    const h = (k: number) => { const dx = Math.abs((k % nx) - gi), dy = Math.abs(Math.floor(k / nx) - gj); return Math.max(dx, dy) + 0.4142 * Math.min(dx, dy); };
    g[start] = 0; push(start, h(start));
    while (heap.length) {
      const k = pop();
      if (k === goal) break;
      if (closed[k]) continue;
      closed[k] = 1;
      const i = k % nx, j = Math.floor(k / nx);
      for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
        if (!di && !dj) continue;
        const ii = i + di, jj = j + dj;
        if (ii < 0 || jj < 0 || ii >= nx || jj >= ny) continue;
        const n = jj * nx + ii;
        if (!ok[n] || closed[n]) continue;
        if (di && dj && (!ok[j * nx + ii] || !ok[jj * nx + i])) continue; // no corner cutting
        const c = g[k]! + (di && dj ? 1.4142 : 1);
        if (c < g[n]!) { g[n] = c; from[n] = k; push(n, c + h(n)); }
      }
    }
    if (from[goal] === -1 && goal !== start) return null;
    const cells: { x: number; y: number }[] = [];
    for (let k = goal; k !== -1 && k !== start; k = from[k]!) cells.push({ x: ((k % nx) + 0.5) * cell, y: (Math.floor(k / nx) + 0.5) * cell });
    cells.reverse();
    cells[cells.length - 1] = t;
    // straighten: keep only the points needed for clear lines of sight
    const out: { x: number; y: number }[] = [];
    let cur = s, i = 0;
    while (i < cells.length) {
      let j = cells.length - 1;
      while (j > i && !clear(cur.x, cur.y, cells[j]!.x, cells[j]!.y)) j--;
      out.push(cells[j]!); cur = cells[j]!; i = j + 1;
    }
    return out;
  };
  return { cell, nx, ny, ok, free, nearest, path };
}
