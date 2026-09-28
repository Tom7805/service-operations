import { describe, expect, it } from 'vitest';
import { isPortalHash, parsePortalHash, portalHash } from '../utils/portalRoute';

describe('portalRoute', () => {
  it('nhận diện đường dẫn cổng', () => {
    expect(isPortalHash('#/portal')).toBe(true);
    expect(isPortalHash('#/portal/projects/1')).toBe(true);
    expect(isPortalHash('#/portalx')).toBe(false);
    expect(isPortalHash('')).toBe(false);
  });

  it('phân tích và dựng lại đường dẫn', () => {
    expect(parsePortalHash('#/portal')).toEqual({ view: 'projects' });
    expect(parsePortalHash('#/portal/projects')).toEqual({ view: 'projects' });
    expect(parsePortalHash('#/portal/projects/12')).toEqual({ view: 'project', projectId: 12 });
    expect(parsePortalHash('#/portal/projects/0')).toEqual({ view: 'invalid-project', raw: '0' });
    expect(parsePortalHash('#/portal/projects/1e3')).toEqual({ view: 'invalid-project', raw: '1e3' });
    expect(parsePortalHash('#/portal/change-password')).toEqual({ view: 'change-password' });
    expect(portalHash({ view: 'project', projectId: 12 })).toBe('#/portal/projects/12');
    expect(portalHash({ view: 'projects' })).toBe('#/portal/projects');
  });
});
