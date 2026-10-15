/** Notification links are written by the database in a short form; map them to app routes. */
export function resolveLink(link: string | null | undefined, role?: string | null) {
  if (!link) return null;
  const m = /^\/my-property\/([0-9a-f-]{36})/.exec(link);
  if (m) return `/me/bookings/${m[1]}`;
  const p = /^\/project\/([0-9a-f-]{36})/.exec(link);
  if (p) return `/project/${p[1]}`;
  if (link === '/portal' && role && !['contractor', 'vendor', 'employee'].includes(role)) return '/me';
  return link;
}
