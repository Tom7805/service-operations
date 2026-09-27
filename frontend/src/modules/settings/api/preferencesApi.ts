import { API_BASE_URL, requestBackend } from '../../admin/api/adminHttp';
import { normalizePreferences, type UiPreferences } from '../../../utils/preferences';

/** GET /me/preferences — tùy chọn giao diện của người dùng hiện tại (chưa lưu thì máy chủ trả mặc định). */
export async function getPreferences(): Promise<UiPreferences> {
  return normalizePreferences(await requestBackend<Partial<UiPreferences>>(`${API_BASE_URL}/me/preferences`));
}

/** PUT /me/preferences — ghi đè toàn bộ tùy chọn giao diện. */
export async function savePreferences(prefs: UiPreferences): Promise<UiPreferences> {
  const saved = await requestBackend<Partial<UiPreferences>>(`${API_BASE_URL}/me/preferences`, {
    method: 'PUT',
    body: JSON.stringify({ ...prefs, landingTab: prefs.landingTab ?? '' }),
  });
  return normalizePreferences(saved);
}
