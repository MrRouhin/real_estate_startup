// Floor-plan geometry for flats. A unit type stores rooms as rectangles (metres), plus doors,
// windows and furniture. Everything the 3D tour, the 2D plan and the walk-through need is
// derived here: wall pieces with openings cut out, walkable space, viewpoints, dimensions.
// Plan axes: x to the right, y "down" the page (y = 0 is the entrance / corridor side).

export type RoomKind = 'living' | 'bedroom' | 'kitchen' | 'bath' | 'balcony' | 'foyer' | 'passage' | 'dress' | 'utility';
export type Room = { id: string; kind: RoomKind; name: string; x: number; y: number; w: number; d: number };
export type Side = 'n' | 's' | 'w' | 'e';
export type Opening = {
  type: 'entry' | 'door' | 'open' | 'window' | 'slider';
  room?: string; rooms?: [string, string]; side?: Side; at?: number; width?: number; sill?: number; head?: number;
};
export type FurnitureItem = {
  type: string; room: string; x: number; y: number; rot?: number; w?: number; d?: number;
  size?: 'single' | 'double' | 'queen'; seats?: number; sink?: boolean; hob?: boolean; upper?: boolean;
};
export type Layout = { w: number; d: number; height: number; rooms: Room[]; openings: Opening[]; furniture: FurnitureItem[] };

const EPS = 1e-4;
const near = (a: number, b: number) => Math.abs(a - b) < EPS;

/** Flip a layout left-to-right (neighbouring flats are mirror images). */
export function mirrorLayout(L: Layout): Layout {
  const W = L.w;
  const flipSide = (s?: Side) => (s === 'w' ? 'e' : s === 'e' ? 'w' : s);
  return {
    ...L,
    rooms: L.rooms.map((r) => ({ ...r, x: +(W - r.x - r.w).toFixed(4) })),
    openings: L.openings.map((o) => {
      const side = flipSide(o.side);
      // for openings on an x-running edge (n/s, or a shared horizontal edge) `at` is an x coordinate
      const horizontal = o.side ? o.side === 'n' || o.side === 's' : sharedEdgeIsHorizontal(L, o);
      return { ...o, side, at: o.at == null ? undefined : horizontal ? +(W - o.at).toFixed(4) : o.at };
    }),
    furniture: L.furniture.map((f) => ({ ...f, x: +(W - f.x).toFixed(4), rot: -(f.rot ?? 0) })),
  };
}

function sharedEdgeIsHorizontal(L: Layout, o: Opening) {
  if (!o.rooms) return true;
  const e = sharedEdge(L, o.rooms[0], o.rooms[1]);
  return e ? e.axis === 'x' : true;
}

export const roomById = (L: Layout, id: string) => L.rooms.find((r) => r.id === id);

/** The straight edge two rooms share: axis along which it runs, the fixed coordinate, and the interval. */
export function sharedEdge(L: Layout, a: string, b: string): { axis: 'x' | 'y'; fixed: number; from: number; to: number } | null {
  const A = roomById(L, a), B = roomById(L, b);
  if (!A || !B) return null;
  const overlap = (a0: number, a1: number, b0: number, b1: number) => [Math.max(a0, b0), Math.min(a1, b1)] as const;
  if (near(A.y + A.d, B.y) || near(B.y + B.d, A.y)) {
    const [f, t] = overlap(A.x, A.x + A.w, B.x, B.x + B.w);
    if (t - f > EPS) return { axis: 'x', fixed: near(A.y + A.d, B.y) ? B.y : A.y, from: f, to: t };
  }
  if (near(A.x + A.w, B.x) || near(B.x + B.w, A.x)) {
    const [f, t] = overlap(A.y, A.y + A.d, B.y, B.y + B.d);
    if (t - f > EPS) return { axis: 'y', fixed: near(A.x + A.w, B.x) ? B.x : A.x, from: f, to: t };
  }
  return null;
}

function sideLine(r: Room, side: Side) {
  switch (side) {
    case 'n': return { axis: 'x' as const, fixed: r.y, from: r.x, to: r.x + r.w, inward: 1 };
    case 's': return { axis: 'x' as const, fixed: r.y + r.d, from: r.x, to: r.x + r.w, inward: -1 };
    case 'w': return { axis: 'y' as const, fixed: r.x, from: r.y, to: r.y + r.d, inward: 1 };
    case 'e': return { axis: 'y' as const, fixed: r.x + r.w, from: r.y, to: r.y + r.d, inward: -1 };
  }
}

/** One opening, resolved to a position on a wall line. */
export type OpeningInstance = {
  type: Opening['type']; axis: 'x' | 'y'; fixed: number; from: number; to: number; sill: number; head: number;
  rooms: string[]; exterior: boolean; side?: Side;
};

export function resolveOpenings(L: Layout): OpeningInstance[] {
  const out: OpeningInstance[] = [];
  for (const o of L.openings) {
    if (o.rooms) {
      const e = sharedEdge(L, o.rooms[0], o.rooms[1]);
      if (!e) continue;
      if (o.type === 'open') { out.push({ type: 'open', axis: e.axis, fixed: e.fixed, from: e.from, to: e.to, sill: 0, head: L.height, rooms: [...o.rooms], exterior: false }); continue; }
      const w = o.width ?? 0.9, at = o.at ?? (e.from + e.to) / 2;
      const from = Math.max(e.from + 0.05, at - w / 2), to = Math.min(e.to - 0.05, at + w / 2);
      out.push({ type: o.type, axis: e.axis, fixed: e.fixed, from, to, sill: 0, head: o.type === 'slider' ? 2.3 : 2.1, rooms: [...o.rooms], exterior: false });
    } else if (o.room && o.side) {
      const r = roomById(L, o.room); if (!r) continue;
      const s = sideLine(r, o.side);
      const w = o.width ?? 1.2, at = o.at ?? (s.from + s.to) / 2;
      const isWin = o.type === 'window';
      out.push({ type: o.type, axis: s.axis, fixed: s.fixed, from: Math.max(s.from + 0.05, at - w / 2), to: Math.min(s.to - 0.05, at + w / 2),
        sill: isWin ? o.sill ?? 0.9 : 0, head: isWin ? o.head ?? 2.1 : 2.1, rooms: [o.room], exterior: true, side: o.side });
    }
  }
  return out;
}

export type WallPiece = {
  room: string; side: Side; axis: 'x' | 'y'; fixed: number; from: number; to: number; bottom: number; top: number;
  thickness: number; offset: number; exterior: boolean; railing?: boolean;
};

const INT_T = 0.06, EXT_T = 0.14;

/** Wall pieces for every room side, with openings cut out. Each room owns the inner half of its walls. */
export function buildWalls(L: Layout): WallPiece[] {
  const ops = resolveOpenings(L);
  const pieces: WallPiece[] = [];
  for (const r of L.rooms) {
    for (const side of ['n', 's', 'w', 'e'] as Side[]) {
      const s = sideLine(r, side);
      // which parts of this side touch another room
      const shared: [number, number, string][] = [];
      for (const o of L.rooms) {
        if (o.id === r.id) continue;
        const e = sharedEdge(L, r.id, o.id);
        if (e && e.axis === s.axis && near(e.fixed, s.fixed)) shared.push([e.from, e.to, o.id]);
      }
      // gaps on this side: openings that sit on this line and belong to this room
      const gaps = ops.filter((op) => op.axis === s.axis && near(op.fixed, s.fixed) && op.rooms.includes(r.id) && op.to > s.from + EPS && op.from < s.to - EPS)
        .map((op) => ({ from: Math.max(s.from, op.from), to: Math.min(s.to, op.to), sill: op.sill, head: op.head })).sort((a, b) => a.from - b.from);
      const isExt = (a: number, b: number) => !shared.some(([f, t]) => f <= a + EPS && t >= b - EPS);
      // split the side at shared-interval boundaries so each piece is either interior or exterior
      const cuts = new Set<number>([s.from, s.to]);
      for (const [f, t] of shared) { if (f > s.from + EPS) cuts.add(f); if (t < s.to - EPS) cuts.add(t); }
      for (const g of gaps) { cuts.add(g.from); cuts.add(g.to); }
      const xs = [...cuts].sort((a, b) => a - b);
      const railing = r.kind === 'balcony';
      for (let i = 0; i < xs.length - 1; i++) {
        const a = xs[i]!, b = xs[i + 1]!;
        if (b - a < EPS) continue;
        const mid = (a + b) / 2;
        const g = gaps.find((x) => x.from <= mid && x.to >= mid);
        const ext = isExt(a, b);
        const t = ext ? (railing ? 0.05 : EXT_T) : INT_T;
        const base = { room: r.id, side, axis: s.axis, fixed: s.fixed, from: a, to: b, thickness: t, offset: (s.inward * t) / 2, exterior: ext };
        if (railing && ext) { if (!g) pieces.push({ ...base, bottom: 0, top: 1.1, railing: true }); continue; }
        if (!g) { pieces.push({ ...base, bottom: 0, top: L.height }); continue; }
        if (g.sill > 0) pieces.push({ ...base, bottom: 0, top: g.sill });
        if (g.head < L.height) pieces.push({ ...base, bottom: g.head, top: L.height });
      }
    }
  }
  return pieces;
}

/** Is this point inside the flat and not inside a wall? (rooms shrunk a little; doorways count) */
export function isWalkable(L: Layout, x: number, y: number, margin = 0.22) {
  for (const r of L.rooms) {
    if (x > r.x + margin && x < r.x + r.w - margin && y > r.y + margin && y < r.y + r.d - margin) return true;
  }
  for (const o of resolveOpenings(L)) {
    if (o.type === 'window' || o.type === 'entry') continue;
    if (o.axis === 'x' && x > o.from + 0.12 && x < o.to - 0.12 && Math.abs(y - o.fixed) < margin + 0.05) return true;
    if (o.axis === 'y' && y > o.from + 0.12 && y < o.to - 0.12 && Math.abs(x - o.fixed) < margin + 0.05) return true;
  }
  return false;
}

export const roomAt = (L: Layout, x: number, y: number) => L.rooms.find((r) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.d) || null;

export type Viewpoint = { room: string; x: number; y: number; yaw: number };

/** A standing point per room, a step inside its main door and looking into the room, like a photographer would. */
export function viewpoints(L: Layout): Viewpoint[] {
  const ops = resolveOpenings(L);
  return L.rooms.filter((r) => r.kind !== 'passage').map((r) => {
    const cx = r.x + r.w / 2, cy = r.y + r.d / 2;
    const door = ops.find((o) => o.type !== 'window' && o.rooms.includes(r.id) && (o.type !== 'entry' || r.kind === 'foyer'));
    let px = cx, py = cy;
    if (door) {
      const dx = door.axis === 'x' ? (door.from + door.to) / 2 : door.fixed;
      const dy = door.axis === 'x' ? door.fixed : (door.from + door.to) / 2;
      const k = r.kind === 'bath' || r.kind === 'balcony' || r.kind === 'dress' ? 0.45 : 0.3;
      px = dx + (cx - dx) * k; py = dy + (cy - dy) * k;
      if (!isWalkable(L, px, py)) { px = cx; py = cy; }
    }
    // look towards the far corner of the room from where you stand (towards windows if any)
    const win = ops.find((o) => o.type === 'window' && o.rooms.includes(r.id)) || ops.find((o) => o.type === 'slider' && o.rooms.includes(r.id));
    const tx = win ? (win.axis === 'x' ? (win.from + win.to) / 2 : win.fixed) : cx + (cx - px);
    const ty = win ? (win.axis === 'x' ? win.fixed : (win.from + win.to) / 2) : cy + (cy - py);
    return { room: r.id, x: +px.toFixed(3), y: +py.toFixed(3), yaw: Math.atan2(tx - px, ty - py) };
  });
}

export const ftIn = (m: number) => {
  const inches = Math.round(m * 39.3701);
  return `${Math.floor(inches / 12)}′${inches % 12}″`;
};
export const roomSize = (r: Room) => `${ftIn(r.w)} × ${ftIn(r.d)}`;
export const roomSqft = (r: Room) => Math.round(r.w * r.d * 10.7639);

export const ROOM_FINISH: Record<RoomKind, string> = {
  living: '800 × 800 mm vitrified tiles, emulsion paint, UPVC sliding doors to the balcony',
  bedroom: 'Vitrified tiles (laminated wooden flooring in the master bedroom), emulsion paint',
  kitchen: 'Granite counter, stainless steel sink, dado tiles up to 2 ft above the counter',
  bath: 'Anti-skid floor tiles, wall tiles up to the ceiling, wall-hung WC, glass shower partition',
  balcony: 'Anti-skid tiles, toughened glass railing',
  foyer: 'Vitrified tiles, engineered wood main door with digital lock',
  passage: 'Vitrified tiles',
  dress: 'Vitrified tiles, space for full-height wardrobes',
  utility: 'Anti-skid tiles, washing machine point',
};

/** Floor footprint (metres, in the item's own axes) used to keep the walk-through out of furniture. */
export function footprint(f: FurnitureItem): { w: number; d: number; cz?: number } | null {
  switch (f.type) {
    case 'sofa': return { w: f.w ?? 2.2, d: 0.9 };
    case 'armchair': return { w: 0.82, d: 0.8 };
    case 'coffee_table': return { w: 1.0, d: 0.55 };
    case 'tv_unit': return { w: f.w ?? 1.8, d: 0.42 };
    case 'dining': return { w: (f.w ?? 1.6) + ((f.seats ?? 4) % 2 ? 0.5 : 0), d: (f.d ?? 0.9) + 0.9 };
    case 'bed': { const W = f.size === 'queen' ? 1.6 : f.size === 'double' ? 1.5 : 1.0; return { w: W + 0.22, d: 2.12 }; }
    case 'side_table': return { w: 0.45, d: 0.4 };
    case 'wardrobe': return { w: f.w ?? 2, d: 0.6 };
    case 'desk': return { w: f.w ?? 1.2, d: 1.2, cz: 0.3 };
    case 'counter': return { w: f.w ?? 2.4, d: 0.62 };
    case 'fridge': return { w: 0.7, d: 0.68 };
    case 'wc': return { w: 0.5, d: 0.72, cz: -0.04 };
    case 'vanity': return { w: f.w ?? 0.9, d: 0.5 };
    case 'shower': return { w: f.w ?? 1.2, d: f.d ?? 1.1 };
    case 'shoe_cabinet': return { w: f.w ?? 1, d: 0.35 };
    case 'plant': return { w: 0.38, d: 0.38 };
    case 'balcony_set': return { w: 2.0, d: 0.85 };
    case 'planter': return { w: f.w ?? 1.6, d: 0.32 };
    case 'washer': return { w: 0.6, d: 0.6 };
    case 'bookshelf': return { w: f.w ?? 0.9, d: 0.32 };
    case 'floor_lamp': return { w: 0.3, d: 0.3 };
    default: return null; // rugs and wall art do not block
  }
}

/** Footprint as a plan-space rectangle (x0, y0, x1, y1), for items turned in steps of 90°. */
export function footprintRect(f: FurnitureItem) {
  const fp = footprint(f);
  if (!fp) return null;
  const a = ((f.rot ?? 0) * Math.PI) / 180, c = Math.round(Math.cos(a)), s = Math.round(Math.sin(a));
  // local +z maps to (sin a, cos a); local +x maps to (cos a, -sin a)
  const cx = f.x + s * (fp.cz ?? 0), cy = f.y + c * (fp.cz ?? 0);
  const hw = Math.abs(c) * fp.w / 2 + Math.abs(s) * fp.d / 2, hd = Math.abs(s) * fp.w / 2 + Math.abs(c) * fp.d / 2;
  return { x0: cx - hw, y0: cy - hd, x1: cx + hw, y1: cy + hd };
}
