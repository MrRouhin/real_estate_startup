// Construction photo checks: was the photo taken at the site and recently (EXIF), and does it
// show the work being claimed (vision, when an AI key is set)?
import 'server-only';
import exifr from 'exifr';
import { aiJSON } from './client';

export type ExifCheck = { takenAt: string | null; lat: number | null; lng: number | null; distanceM: number | null; device: string | null; edited: boolean };
export type VisionCheck = { verdict: 'matches' | 'partly' | 'does_not_match' | 'unclear'; estimated_range: [number, number] | null; observations: string[]; safety: string[] };
export type PhotoFlag = { id: string; severity: 'info' | 'warn' | 'critical'; label: string; detail: string };
export type PhotoCheck = { checked_at: string; exif: ExifCheck | null; vision: VisionCheck | null; flags: PhotoFlag[]; source: 'rules' | 'ai'; claim: { milestone: string | null; progress: number | null } };

export function haversine(a: [number, number], b: [number, number]) {
  const R = 6371000, toR = (x: number) => (x * Math.PI) / 180;
  const dLat = toR(b[0] - a[0]), dLng = toR(b[1] - a[1]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toR(a[0])) * Math.cos(toR(b[0])) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(h)));
}

export async function readExif(bytes: Uint8Array, site: { lat: number | null; lng: number | null }): Promise<ExifCheck | null> {
  try {
    const [meta, gps] = await Promise.all([
      exifr.parse(bytes, ['DateTimeOriginal', 'CreateDate', 'Make', 'Model', 'Software']).catch(() => null),
      exifr.gps(bytes).catch(() => null),
    ]);
    if (!meta && !gps) return null;
    const taken = (meta?.DateTimeOriginal || meta?.CreateDate) as Date | undefined;
    const lat = gps?.latitude ?? null, lng = gps?.longitude ?? null;
    return {
      takenAt: taken instanceof Date && !isNaN(taken.getTime()) ? taken.toISOString() : null,
      lat, lng, distanceM: lat != null && lng != null && site.lat != null && site.lng != null ? haversine([lat, lng], [site.lat, site.lng]) : null,
      device: [meta?.Make, meta?.Model].filter(Boolean).join(' ') || null,
      edited: /photoshop|lightroom|snapseed|picsart|gimp|canva/i.test(String(meta?.Software || '')),
    };
  } catch { return null; }
}

const VISION_SYSTEM = `You check construction progress photos for a plotted residential layout in India (roads, storm-water drains, street lights, overhead water tank, compound wall, park, clubhouse).
Be strict and literal: describe only what is visible. If the photo cannot show the claimed work, say "unclear".
JSON shape: {"verdict": "matches"|"partly"|"does_not_match"|"unclear", "estimated_range": [low, high] | null (percent complete of the claimed work that the visible part suggests), "observations": [up to 4 short factual sentences], "safety": [visible safety issues only, e.g. "workers without helmets", "open trench without barricade"; empty if none]}`;

export async function visionCheck(bytes: Uint8Array, mediaType: string, claim: { title: string; milestone: string | null; progress: number | null }) {
  if (!/^image\/(jpeg|png|webp|gif)$/.test(mediaType) || bytes.byteLength > 4.5 * 1024 * 1024) return null;
  const r = await aiJSON<VisionCheck>({
    system: VISION_SYSTEM, maxTokens: 500, temperature: 0, timeoutMs: 20000,
    messages: [{ role: 'user', images: [{ mediaType, base64: Buffer.from(bytes).toString('base64') }],
      content: `Update title: "${claim.title}". Claimed work: ${claim.milestone || 'not specified'}${claim.progress != null ? `, claimed ${claim.progress}% complete` : ''}. Check the photo.` }],
  });
  if (!r) return null;
  const v = r.data;
  const verdicts = ['matches', 'partly', 'does_not_match', 'unclear'] as const;
  return {
    result: r.result,
    vision: {
      verdict: verdicts.includes(v.verdict) ? v.verdict : 'unclear',
      estimated_range: Array.isArray(v.estimated_range) && v.estimated_range.length === 2 ? [Number(v.estimated_range[0]), Number(v.estimated_range[1])] as [number, number] : null,
      observations: (v.observations || []).slice(0, 4).map(String), safety: (v.safety || []).slice(0, 4).map(String),
    } satisfies VisionCheck,
  };
}

/** Turn the EXIF and vision results into flags a supervisor can act on. */
export function photoFlags(exif: ExifCheck | null, vision: VisionCheck | null, claim: { progress: number | null }, postedAt: Date, geofenceM: number): PhotoFlag[] {
  const f: PhotoFlag[] = [];
  if (!exif) f.push({ id: 'no_exif', severity: 'info', label: 'No camera data in the photo', detail: 'Location and time could not be verified (the photo may have been forwarded on WhatsApp, which strips this data). Ask for the original from the phone camera.' });
  else {
    if (exif.takenAt) {
      const days = (postedAt.getTime() - new Date(exif.takenAt).getTime()) / 86400000;
      if (days > 3) f.push({ id: 'old_photo', severity: days > 14 ? 'critical' : 'warn', label: `Photo taken ${Math.round(days)} days before posting`, detail: `Taken ${new Date(exif.takenAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}. Progress may have changed since.` });
    }
    if (exif.distanceM != null && exif.distanceM > Math.max(300, geofenceM * 1.5))
      f.push({ id: 'off_site', severity: 'critical', label: `Photo taken ${exif.distanceM > 2000 ? (exif.distanceM / 1000).toFixed(1) + ' km' : exif.distanceM + ' m'} from the site`, detail: 'The GPS position in the photo is outside the site boundary. It may be from another project.' });
    if (exif.edited) f.push({ id: 'edited', severity: 'warn', label: 'Photo was edited', detail: 'The file was saved by an editing app.' });
  }
  if (vision) {
    if (vision.verdict === 'does_not_match') f.push({ id: 'mismatch', severity: 'critical', label: 'Photo does not show the claimed work', detail: vision.observations.join(' ') });
    else if (vision.verdict === 'partly') f.push({ id: 'partly', severity: 'warn', label: 'Photo only partly shows the claimed work', detail: vision.observations.join(' ') });
    if (vision.estimated_range && claim.progress != null && claim.progress > vision.estimated_range[1] + 15)
      f.push({ id: 'overclaim', severity: 'warn', label: `Claimed ${claim.progress}%, photo suggests ${vision.estimated_range[0]}–${vision.estimated_range[1]}%`, detail: 'One photo shows only part of the site. Ask for photos of the remaining stretch before accepting the figure.' });
    for (const s of vision.safety) f.push({ id: 'safety', severity: 'warn', label: 'Safety: ' + s, detail: 'Raise it with the contractor’s site engineer today.' });
  }
  return f;
}
