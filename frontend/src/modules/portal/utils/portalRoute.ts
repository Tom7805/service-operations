/**
 * Đường dẫn của cổng khách hàng nằm trên hash (`#/portal/...`) — ứng dụng không dùng router, còn hash cho phép khách
 * hàng lưu/chia sẻ và nhập trực tiếp đường dẫn một dự án/phiếu (NCL-13-CN-002-TC-02).
 */
export type PortalRoute =
  | { view: 'projects' }
  | { view: 'project'; projectId: number }
  | { view: 'invalid-project'; raw: string }
  | { view: 'acceptances'; projectId?: number | null }
  | { view: 'acceptance'; certificateId: number }
  | { view: 'invalid-acceptance'; raw: string }
  | { view: 'change-password' };

export const PORTAL_HASH_PREFIX = '#/portal';

export function isPortalHash(hash: string): boolean {
  return hash === PORTAL_HASH_PREFIX || hash.startsWith(`${PORTAL_HASH_PREFIX}/`) || hash.startsWith(`${PORTAL_HASH_PREFIX}?`);
}

function positiveId(raw: string): number | null {
  return /^\d+$/.test(raw) && Number(raw) > 0 ? Number(raw) : null;
}

export function parsePortalHash(hash: string): PortalRoute {
  const rest = isPortalHash(hash) ? hash.slice(PORTAL_HASH_PREFIX.length) : '';
  const [path, queryString = ''] = rest.split('?');
  const query = new URLSearchParams(queryString);
  const segments = path.split('/').filter(Boolean);
  if (segments[0] === 'projects' && segments.length >= 2) {
    const raw = decodeURIComponent(segments[1]);
    const id = positiveId(raw);
    return id ? { view: 'project', projectId: id } : { view: 'invalid-project', raw };
  }
  if (segments[0] === 'acceptances') {
    if (segments.length >= 2) {
      const raw = decodeURIComponent(segments[1]);
      const id = positiveId(raw);
      return id ? { view: 'acceptance', certificateId: id } : { view: 'invalid-acceptance', raw };
    }
    return { view: 'acceptances', projectId: positiveId(query.get('project') ?? '') };
  }
  if (segments[0] === 'change-password') return { view: 'change-password' };
  return { view: 'projects' };
}

export function portalHash(route: PortalRoute): string {
  switch (route.view) {
    case 'project':
      return `${PORTAL_HASH_PREFIX}/projects/${route.projectId}`;
    case 'acceptances':
      return `${PORTAL_HASH_PREFIX}/acceptances${route.projectId ? `?project=${route.projectId}` : ''}`;
    case 'acceptance':
      return `${PORTAL_HASH_PREFIX}/acceptances/${route.certificateId}`;
    case 'change-password':
      return `${PORTAL_HASH_PREFIX}/change-password`;
    default:
      return `${PORTAL_HASH_PREFIX}/projects`;
  }
}

/** Chức năng cổng mà đường dẫn trỏ tới — để màn từ chối (tài khoản nội bộ) gọi đúng API, ghi đúng tên chức năng. */
export function portalFeatureOf(hash: string): 'acceptances' | 'projects' {
  const view = parsePortalHash(hash).view;
  return view === 'acceptances' || view === 'acceptance' || view === 'invalid-acceptance' ? 'acceptances' : 'projects';
}
