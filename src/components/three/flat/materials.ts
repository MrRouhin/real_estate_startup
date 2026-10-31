'use client';
// Procedural textures and materials for the flat tour. Everything is drawn on canvases at
// runtime (no image downloads), cached per style, and tuned for physically based lighting.
import * as THREE from 'three';

export type StyleId = 'warm' | 'scandi' | 'classic';
export const STYLES: { id: StyleId; label: string }[] = [
  { id: 'warm', label: 'Warm modern' }, { id: 'scandi', label: 'Scandinavian' }, { id: 'classic', label: 'Classic' },
];

type Palette = {
  wood: [string, string, string]; floorTile: [string, string]; vein: string; wall: Record<string, string>; accentWall: string;
  fabric: string; fabric2: string; cushion: string; rug: [string, string, string]; cabinet: string; cabinetTop: string; counter: [string, string];
  metal: string; leaf: string; bedding: string; art: [string, string, string];
};

export const PALETTES: Record<StyleId, Palette> = {
  warm: {
    wood: ['#8a5a3b', '#9c6845', '#7a4e33'], floorTile: ['#e8e1d6', '#ddd4c6'], vein: '#c9bba6',
    wall: { living: '#f1ebe1', bedroom: '#efe6da', kitchen: '#f4f1ea', bath: '#ece8e1', foyer: '#f1ebe1', passage: '#f1ebe1', dress: '#efe6da', balcony: '#ece6dc', utility: '#f1ebe1' },
    accentWall: '#b9805f', fabric: '#8f7f6d', fabric2: '#c4a484', cushion: '#c96f4a', rug: ['#c9b49a', '#8d6e57', '#e6dccd'],
    cabinet: '#3b3f45', cabinetTop: '#d8cfc3', counter: ['#2d2a28', '#4a4440'], metal: '#c7a76c', leaf: '#4f7a3c', bedding: '#f3eee6', art: ['#c96f4a', '#2f4b5a', '#e8c48a'],
  },
  scandi: {
    wood: ['#c8a77e', '#d4b48c', '#bf9c72'], floorTile: ['#f2f2ef', '#e9e9e5'], vein: '#d5d5d0',
    wall: { living: '#f7f6f2', bedroom: '#f4f3ee', kitchen: '#f8f8f5', bath: '#f1f1ee', foyer: '#f7f6f2', passage: '#f7f6f2', dress: '#f4f3ee', balcony: '#efefea', utility: '#f7f6f2' },
    accentWall: '#9fb3a8', fabric: '#a8adb0', fabric2: '#d9d6cf', cushion: '#7f9c8f', rug: ['#e7e3db', '#b9b4aa', '#f4f1ea'],
    cabinet: '#e9e6df', cabinetTop: '#f6f4ef', counter: ['#e4e1da', '#cfcac0'], metal: '#2b2b2b', leaf: '#5d8a4a', bedding: '#f8f7f3', art: ['#7f9c8f', '#d9b48f', '#3d4a52'],
  },
  classic: {
    wood: ['#6e3f22', '#7d4a2a', '#5f361d'], floorTile: ['#efe7d8', '#e3d8c3'], vein: '#bda882',
    wall: { living: '#f3e6cf', bedroom: '#eedfc8', kitchen: '#f5ecdc', bath: '#efe7da', foyer: '#f3e6cf', passage: '#f3e6cf', dress: '#eedfc8', balcony: '#eadfcc', utility: '#f3e6cf' },
    accentWall: '#7b2d26', fabric: '#7b2d26', fabric2: '#d9b878', cushion: '#d4a64a', rug: ['#8b2e2a', '#d9b46a', '#2f3e5c'],
    cabinet: '#5a3420', cabinetTop: '#d9c7a6', counter: ['#1f1d1b', '#3d342c'], metal: '#c9a14a', leaf: '#3f6b33', bedding: '#f6efe2', art: ['#7b2d26', '#d4a64a', '#2f3e5c'],
  },
};

const cache = new Map<string, THREE.Texture>();
function canvasTexture(key: string, w: number, h: number, draw: (g: CanvasRenderingContext2D, w: number, h: number) => void, repeat: [number, number] = [1, 1], color = true) {
  const k = `${key}|${repeat.join('x')}`;
  const hit = cache.get(k);
  if (hit) return hit;
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d')!;
  draw(g, w, h);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat[0], repeat[1]);
  t.anisotropy = 8;
  if (color) t.colorSpace = THREE.SRGBColorSpace;
  cache.set(k, t);
  return t;
}

// deterministic noise
let seed = 1;
const rnd = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;

function shade(hex: string, amt: number) {
  const c = new THREE.Color(hex); const hsl = { h: 0, s: 0, l: 0 }; c.getHSL(hsl);
  c.setHSL(hsl.h, hsl.s, Math.min(1, Math.max(0, hsl.l + amt))); return '#' + c.getHexString();
}

/** Wooden planks with grain. */
export function woodTexture(cols: [string, string, string], key: string) {
  return canvasTexture('wood-' + key, 1024, 1024, (g, w, h) => {
    seed = 7;
    const rows = 8, plankH = h / rows;
    for (let r = 0; r < rows; r++) {
      let x = -rnd() * w * 0.5;
      while (x < w) {
        const len = w * (0.35 + rnd() * 0.45);
        const base = cols[Math.floor(rnd() * 3)]!;
        g.fillStyle = shade(base, (rnd() - 0.5) * 0.06);
        g.fillRect(x, r * plankH, len, plankH);
        for (let i = 0; i < 26; i++) { // grain lines
          g.strokeStyle = `rgba(40,20,10,${0.04 + rnd() * 0.07})`; g.lineWidth = 1 + rnd() * 1.5;
          const y = r * plankH + rnd() * plankH;
          g.beginPath(); g.moveTo(x, y);
          for (let s = 0; s <= 8; s++) g.lineTo(x + (len * s) / 8, y + Math.sin(s * 1.3 + i) * 2.2 * rnd());
          g.stroke();
        }
        g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(x, r * plankH, 2, plankH); // end joint
        x += len;
      }
      g.fillStyle = 'rgba(0,0,0,0.28)'; g.fillRect(0, r * plankH, w, 2); // long joint
    }
  }, [1, 1]);
}

/** Large-format tiles with soft marble veins. */
export function tileTexture(cols: [string, string], vein: string, key: string, tilesPerSide = 2, grout = '#b9b2a7', veins = true) {
  return canvasTexture('tile-' + key + tilesPerSide, 1024, 1024, (g, w, h) => {
    seed = 11;
    const s = w / tilesPerSide;
    for (let i = 0; i < tilesPerSide; i++) for (let j = 0; j < tilesPerSide; j++) {
      const gr = g.createLinearGradient(i * s, j * s, (i + 1) * s, (j + 1) * s);
      gr.addColorStop(0, cols[(i + j) % 2]!); gr.addColorStop(1, shade(cols[(i + j + 1) % 2]!, 0.01));
      g.fillStyle = gr; g.fillRect(i * s, j * s, s, s);
      if (veins) for (let v = 0; v < 5; v++) {
        g.strokeStyle = vein; g.globalAlpha = 0.18 + rnd() * 0.25; g.lineWidth = 0.6 + rnd() * 2.2;
        g.beginPath(); let x = i * s + rnd() * s, y = j * s; g.moveTo(x, y);
        for (let k = 0; k < 14; k++) { x += (rnd() - 0.4) * s * 0.12; y += s / 14; g.lineTo(x, y); }
        g.stroke(); g.globalAlpha = 1;
      }
    }
    g.fillStyle = grout;
    for (let i = 0; i <= tilesPerSide; i++) { g.fillRect(i * s - 1.5, 0, 3, h); g.fillRect(0, i * s - 1.5, w, 3); }
  });
}

/** Small rectangular wall / bathroom tiles. */
export function wallTileTexture(color: string, key: string, cols = 4, rows = 8, grout = '#d8d4cc') {
  return canvasTexture('wtile-' + key, 512, 1024, (g, w, h) => {
    seed = 3;
    const cw = w / cols, rh = h / rows;
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      g.fillStyle = shade(color, (rnd() - 0.5) * 0.03); g.fillRect(c * cw, r * rh, cw, rh);
      const gr = g.createLinearGradient(c * cw, r * rh, (c + 1) * cw, (r + 1) * rh);
      gr.addColorStop(0, 'rgba(255,255,255,0.12)'); gr.addColorStop(1, 'rgba(0,0,0,0.04)');
      g.fillStyle = gr; g.fillRect(c * cw, r * rh, cw, rh);
    }
    g.fillStyle = grout;
    for (let c = 0; c <= cols; c++) g.fillRect(c * cw - 1.5, 0, 3, h);
    for (let r = 0; r <= rows; r++) g.fillRect(0, r * rh - 1.5, w, 3);
  });
}

export function fabricTexture(color: string, key: string) {
  return canvasTexture('fabric-' + key + color, 256, 256, (g, w, h) => {
    seed = 5;
    g.fillStyle = color; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 4000; i++) { g.fillStyle = `rgba(${rnd() > 0.5 ? '255,255,255' : '0,0,0'},${0.03 + rnd() * 0.05})`; g.fillRect(rnd() * w, rnd() * h, 1.5, 1.5); }
    for (let y = 0; y < h; y += 3) { g.fillStyle = 'rgba(0,0,0,0.035)'; g.fillRect(0, y, w, 1); }
  }, [3, 3]);
}

export function rugTexture(cols: [string, string, string], key: string) {
  return canvasTexture('rug-' + key, 512, 512, (g, w, h) => {
    seed = 9;
    g.fillStyle = cols[2]; g.fillRect(0, 0, w, h);
    g.strokeStyle = cols[0]; g.lineWidth = 22; g.strokeRect(26, 26, w - 52, h - 52);
    g.strokeStyle = cols[1]; g.lineWidth = 6; g.strokeRect(54, 54, w - 108, h - 108);
    for (let i = 0; i < 9; i++) { g.fillStyle = i % 2 ? cols[0] : cols[1]; g.globalAlpha = 0.55; g.beginPath(); g.arc(w / 2, h / 2, 170 - i * 18, 0, Math.PI * 2); g.fill(); }
    g.globalAlpha = 1;
    for (let i = 0; i < 6000; i++) { g.fillStyle = `rgba(0,0,0,${rnd() * 0.06})`; g.fillRect(rnd() * w, rnd() * h, 2, 2); }
  });
}

export function concreteTexture(key = 'c', tone = '#a9a7a2') {
  return canvasTexture('concrete-' + key, 512, 512, (g, w, h) => {
    seed = 13;
    g.fillStyle = tone; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 9000; i++) { const a = rnd() * 0.08; g.fillStyle = rnd() > 0.5 ? `rgba(255,255,255,${a})` : `rgba(0,0,0,${a})`; g.fillRect(rnd() * w, rnd() * h, 1 + rnd() * 3, 1 + rnd() * 3); }
    for (let i = 0; i < 30; i++) { g.fillStyle = `rgba(0,0,0,${0.05 + rnd() * 0.08})`; g.beginPath(); g.arc(rnd() * w, rnd() * h, 1 + rnd() * 2.5, 0, Math.PI * 2); g.fill(); }
  }, [2, 2]);
}

/** Grey AAC / concrete blocks with mortar joints (for walls under construction). */
export function blockTexture() {
  return canvasTexture('blocks', 512, 512, (g, w, h) => {
    seed = 17;
    g.fillStyle = '#9b9890'; g.fillRect(0, 0, w, h);
    const bh = h / 6, bw = w / 2.5;
    for (let r = 0; r < 6; r++) {
      for (let x = (r % 2) * -bw / 2; x < w; x += bw) {
        g.fillStyle = shade('#c9c5bb', (rnd() - 0.5) * 0.06); g.fillRect(x + 3, r * bh + 3, bw - 6, bh - 6);
        for (let i = 0; i < 60; i++) { g.fillStyle = `rgba(0,0,0,${rnd() * 0.07})`; g.fillRect(x + rnd() * bw, r * bh + rnd() * bh, 2, 2); }
      }
    }
  }, [1.5, 1.5]);
}

export function artTexture(cols: [string, string, string], key: string) {
  return canvasTexture('art-' + key, 512, 384, (g, w, h) => {
    seed = 21;
    g.fillStyle = '#f4f1ea'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 7; i++) {
      g.fillStyle = cols[i % 3]!; g.globalAlpha = 0.7;
      g.beginPath(); g.ellipse(rnd() * w, rnd() * h, 40 + rnd() * 120, 30 + rnd() * 90, rnd() * 3, 0, Math.PI * 2); g.fill();
    }
    g.globalAlpha = 1; g.strokeStyle = '#2b2b2b'; g.lineWidth = 3;
    g.beginPath(); g.moveTo(0, h * 0.62); for (let x = 0; x <= w; x += 16) g.lineTo(x, h * 0.62 + Math.sin(x / 40) * 18); g.stroke();
  }, [1, 1]);
}

export function grassTexture() {
  return canvasTexture('grass', 256, 256, (g, w, h) => {
    seed = 23; g.fillStyle = '#5d8a45'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 5000; i++) { g.fillStyle = `rgba(${rnd() > 0.5 ? '30,60,20' : '140,180,90'},${rnd() * 0.25})`; g.fillRect(rnd() * w, rnd() * h, 1, 3); }
  }, [40, 40]);
}

/** Materials for one style. Memoised by the caller. */
export function makeMaterials(style: StyleId) {
  const p = PALETTES[style];
  const std = (o: THREE.MeshStandardMaterialParameters) => new THREE.MeshStandardMaterial(o);
  const wood = woodTexture(p.wood, style);
  const tiles = tileTexture(p.floorTile, p.vein, style, 2);
  return {
    palette: p,
    woodFloor: std({ map: wood, roughness: 0.42, metalness: 0 }),
    tileFloor: std({ map: tiles, roughness: 0.16, metalness: 0.02 }),
    bathFloor: std({ map: tileTexture(['#bdb7ad', '#b3ada3'], '#a19a8e', 'bath' + style, 5, '#8f897f', false), roughness: 0.6 }),
    balconyFloor: std({ map: tileTexture(['#b9a891', '#ad9c86'], '#9a8a74', 'balc' + style, 4, '#8a7d6c', false), roughness: 0.75 }),
    bathWall: std({ map: wallTileTexture(style === 'classic' ? '#e9e0cf' : style === 'scandi' ? '#f1f1ee' : '#e4ddd2', 'bw' + style), roughness: 0.25 }),
    kitchenBack: std({ map: wallTileTexture(style === 'scandi' ? '#f6f6f2' : '#efe8dc', 'kb' + style, 8, 16), roughness: 0.2 }),
    wall: (kind: string) => std({ color: p.wall[kind] || p.wall.living, roughness: 0.92 }),
    accent: std({ color: p.accentWall, roughness: 0.9 }),
    ceiling: std({ color: '#fbfaf7', roughness: 0.95 }),
    skirting: std({ color: style === 'classic' ? '#5a3420' : '#e8e4dc', roughness: 0.6 }),
    fabric: std({ map: fabricTexture(p.fabric, 'f' + style), roughness: 0.95 }),
    fabric2: std({ map: fabricTexture(p.fabric2, 'f2' + style), roughness: 0.95 }),
    cushion: std({ map: fabricTexture(p.cushion, 'c' + style), roughness: 0.9 }),
    bedding: std({ map: fabricTexture(p.bedding, 'b' + style), roughness: 0.95 }),
    rug: std({ map: rugTexture(p.rug, style), roughness: 1 }),
    woodFurniture: std({ map: wood, color: '#ffffff', roughness: 0.5 }),
    darkWood: std({ color: style === 'scandi' ? '#d6c3a5' : '#4a3424', roughness: 0.55 }),
    cabinet: std({ color: p.cabinet, roughness: 0.45, metalness: 0.05 }),
    cabinetTop: std({ color: p.cabinetTop, roughness: 0.5 }),
    counter: std({ map: tileTexture(p.counter, '#6b6158', 'ctr' + style, 1, p.counter[0], true), roughness: 0.12, metalness: 0.05 }),
    metal: std({ color: p.metal, roughness: 0.3, metalness: 0.85 }),
    steel: std({ color: '#c9ccd0', roughness: 0.25, metalness: 0.9 }),
    black: std({ color: '#1b1c1e', roughness: 0.35, metalness: 0.2 }),
    screen: std({ color: '#0b0d10', roughness: 0.08, metalness: 0.3, emissive: '#0a1220', emissiveIntensity: 0.4 }),
    white: std({ color: '#f6f6f4', roughness: 0.3 }),
    porcelain: std({ color: '#fbfbfa', roughness: 0.12, metalness: 0.02 }),
    glass: new THREE.MeshPhysicalMaterial({ color: '#dfeef2', roughness: 0.02, metalness: 0.0, transparent: true, opacity: 0.18, envMapIntensity: 1.5, side: THREE.DoubleSide, depthWrite: false }),
    mirror: std({ color: '#d7dde0', roughness: 0.02, metalness: 1 }),
    frame: std({ color: style === 'classic' ? '#4a2a18' : '#3a3c3f', roughness: 0.4, metalness: 0.4 }),
    door: std({ map: wood, color: '#ffffff', roughness: 0.45 }),
    leaf: std({ color: p.leaf, roughness: 0.8 }),
    pot: std({ color: style === 'scandi' ? '#e6e1d8' : '#a8613f', roughness: 0.8 }),
    soil: std({ color: '#3b2a1f', roughness: 1 }),
    art: std({ map: artTexture(p.art, style), roughness: 0.8 }),
    lampShade: std({ color: '#f6efe2', roughness: 0.9, emissive: '#ffd9a0', emissiveIntensity: 0 }),
    lightDisc: new THREE.MeshBasicMaterial({ color: '#fff6e5' }),
    concrete: std({ map: concreteTexture(), roughness: 0.95 }),
    screed: std({ map: concreteTexture('screed', '#b8b4ab'), roughness: 0.9 }),
    blocks: std({ map: blockTexture(), roughness: 0.95 }),
    plaster: std({ map: concreteTexture('plaster', '#cfccc4'), roughness: 0.95 }),
    primer: std({ color: '#f2f0ea', roughness: 0.97 }),
    ghost: new THREE.MeshBasicMaterial({ color: '#4fb8be', transparent: true, opacity: 0.12, depthWrite: false }),
    ghostEdge: new THREE.LineBasicMaterial({ color: '#4fb8be', transparent: true, opacity: 0.6 }),
    conduit: std({ color: '#f0b43a', roughness: 0.6 }),
    pipe: std({ color: '#7a8a96', roughness: 0.4, metalness: 0.4 }),
    grass: std({ map: grassTexture(), roughness: 1 }),
  };
}
export type Mats = ReturnType<typeof makeMaterials>;
