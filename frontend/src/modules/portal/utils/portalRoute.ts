/**
 * Đường dẫn của cổng khách hàng nằm trên hash (`#/portal/...`) — ứng dụng không dùng router, còn hash cho phép khách
 * hàng lưu/chia sẻ và nhập trực tiếp đường dẫn một dự án (NCL-13-CN-002-TC-02).
 */
export type PortalRoute =
  | { view: 'projects' }
  | { view: 'project'; projectId: number }
  | { view: 'invalid-project'; raw: string }
  | { view: 'change-password' };

export const PORTAL_HASH_PREFIX = '#/portal';

export function isPortalHash(hash: string): boolean {
  return hash === PORTAL_HASH_PREFIX || hash.startsWith(`${PORTAL_HASH_PREFIX}/`);
}

export function parsePortalHash(hash: string): PortalRoute {
  const path = isPortalHash(hash) ? hash.slice(PORTAL_HASH_PREFIX.length) : '';
  const segments = path.split('/').filter(Boolean);
  if (segments[0] === 'projects' && segments.length >= 2) {
    const raw = decodeURIComponent(segments[1]);
    return /^\d+$/.test(raw) && Number(raw) > 0 ? { view: 'project', projectId: Number(raw) } : { view: 'invalid-project', raw };
  }
  if (segments[0] === 'change-password') return { view: 'change-password' };
  return { view: 'projects' };
}

export function portalHash(route: PortalRoute): string {
  switch (route.view) {
    case 'project':
      return `${PORTAL_HASH_PREFIX}/projects/${route.projectId}`;
    case 'change-password':
      return `${PORTAL_HASH_PREFIX}/change-password`;
    default:
      return `${PORTAL_HASH_PREFIX}/projects`;
  }
}
