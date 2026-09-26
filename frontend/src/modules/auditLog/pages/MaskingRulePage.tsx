import { useCallback, useEffect, useState } from 'react';
import { AuditLogApiError, getMaskingRules } from '../api/auditLogApi';
import { ROLE_LABELS, roleLabel, roleLabels, type MaskingRule } from '../types/auditLogTypes';
import { ICONS } from '../../../components/common/icons';
import TableSkeleton from '../../../components/common/TableSkeleton';

interface MaskingRulePageProps {
  currentUserRoles: string[];
}

/** Các màn hình/tệp xuất áp dụng quy tắc — để người xem biết quy tắc có hiệu lực ở đâu. */
const APPLIED_TO: Record<string, string> = {
  SALARY: 'Hồ sơ nhân sự (chi phí giờ công nội bộ), giá vốn theo nhân sự, báo cáo biên lợi nhuận theo nhân sự',
  COST: 'Giá vốn giờ công dự án, biên lợi nhuận dự án, báo cáo hiệu quả dự án và mọi tệp báo cáo xuất ra',
};

/**
 * NCL-01-CN-005 — quy tắc che dữ liệu lương và giá vốn theo cấp quản lý (QTN-02).
 *
 * Luôn gọi API thật kể cả khi vai trò hiện tại không đủ quyền: người không phải Nhân sự/Kế toán/
 * Ban giám đốc sẽ nhận 403 và backend ghi lại lần từ chối vào Nhật ký hệ thống (TC-04).
 */
export default function MaskingRulePage({ currentUserRoles }: MaskingRulePageProps) {
  const [rules, setRules] = useState<MaskingRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setRules(await getMaskingRules());
      setForbidden(false);
    } catch (err) {
      if (err instanceof AuditLogApiError && err.statusCode === 403) {
        setForbidden(true);
      } else {
        setError(err instanceof Error ? err.message : 'Không thể tải quy tắc che dữ liệu.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (forbidden) {
    return (
      <div className="access-denied-container">
        <div className="access-denied-card">
          <div className="access-denied-icon">{ICONS.shieldOff}</div>
          <h2>Bạn không có thẩm quyền truy cập màn hình này</h2>
          <p>
            Quy tắc che dữ liệu lương và giá vốn chỉ dành cho <strong>Nhân sự</strong>, <strong>Kế toán</strong> và{' '}
            <strong>Ban giám đốc</strong>. Lần truy cập này đã được ghi vào nhật ký hệ thống.
          </p>
          <div className="security-log-badge">
            <span className="security-log-badge__item">Vai trò hiện tại: {roleLabels(currentUserRoles) || '—'}</span>
          </div>
        </div>
      </div>
    );
  }

  const allRoles = Object.keys(ROLE_LABELS).filter((code) => code !== 'VT-08');

  return (
    <div className="user-management-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Quy tắc che dữ liệu nhạy cảm</h1>
          <p className="page-subtitle">
            Cột lương, chi phí giờ công và giá vốn chỉ hiển thị cho vai trò được phép — trên mọi màn hình và mọi tệp
            xuất. Vai trò khác chỉ thấy ký hiệu che <strong>***</strong> thay cho số liệu.
          </p>
        </div>
        <button
          type="button"
          className="btn-icon-refresh"
          onClick={() => void load()}
          title="Làm mới dữ liệu"
          aria-label="Làm mới dữ liệu"
        >
          {ICONS.refresh}
        </button>
      </div>

      {error && (
        <div className="alert alert--error" role="alert">
          <span className="alert__icon">{ICONS.alertTriangle}</span>
          <span>{error}</span>
          <button type="button" className="btn-secondary text-dark ml-auto" onClick={() => void load()}>
            Thử lại
          </button>
        </div>
      )}

      <div className="user-table-card">
        <div className="table-responsive">
          <table className="user-data-table">
            <thead>
              <tr>
                <th>Loại dữ liệu</th>
                <th>Được xem số liệu thật</th>
                <th>Bị che</th>
                <th>Áp dụng tại</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <TableSkeleton columns={4} />
              ) : rules.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', padding: '40px', color: '#5B5A57' }}>
                    Chưa có quy tắc che dữ liệu nào.
                  </td>
                </tr>
              ) : (
                rules.map((rule) => {
                  const allowed = [...rule.allowedRoles].sort();
                  const masked = allRoles.filter((code) => !allowed.includes(code));
                  return (
                    <tr key={rule.level}>
                      <td>
                        <strong>{rule.levelLabel}</strong>
                      </td>
                      <td>
                        {allowed.map((code) => (
                          <span key={code} className="user-tag badge--green" style={{ marginRight: 6 }}>
                            {roleLabel(code)}
                          </span>
                        ))}
                      </td>
                      <td className="cell-email">{masked.map(roleLabel).join(', ')}</td>
                      <td className="cell-email">{APPLIED_TO[rule.level] ?? '—'}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <p className="page-subtitle" style={{ marginTop: 16 }}>
        {ICONS.info} Mỗi lần xem hoặc xuất dữ liệu lương, giá vốn và biên lợi nhuận đều được ghi vào nhật ký truy cập dữ
        liệu nhạy cảm (QTN-03). Quy tắc này cố định theo quy định công ty (QTN-02), không chỉnh sửa trên giao diện.
      </p>
    </div>
  );
}
