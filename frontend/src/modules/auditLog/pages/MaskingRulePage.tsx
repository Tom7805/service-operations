import { useCallback, useEffect, useState } from 'react';
import { AuditLogApiError, getMaskingRules } from '../api/auditLogApi';
import { ROLE_LABELS, roleLabel, roleLabels, type MaskingRule } from '../types/auditLogTypes';
import { ICONS } from '../../../components/common/icons';
import TableSkeleton from '../../../components/common/TableSkeleton';
import PageHeader from '../../../components/common/PageHeader';

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
            Trang này dành cho <strong>Nhân sự</strong>, <strong>Kế toán</strong> và <strong>Ban giám đốc</strong>. Lần truy cập đã được ghi vào nhật ký.
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
      <PageHeader
        title="Quyền xem dữ liệu"
        actions={
          <button
            type="button"
            className="btn-icon-refresh"
            onClick={() => void load()}
            title="Làm mới dữ liệu"
            aria-label="Làm mới dữ liệu"
          >
            {ICONS.refresh}
          </button>
        }
      />

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
                  <td colSpan={4} style={{ textAlign: 'center', padding: '40px', color: 'var(--ink-muted)' }}>
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
                      <td style={{ color: 'var(--ink-muted)' }}>{masked.map(roleLabel).join(', ')}</td>
                      <td style={{ color: 'var(--ink-muted)' }}>{APPLIED_TO[rule.level] ?? '—'}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <p className="customer-summary-scope-note cell-muted" style={{ marginTop: 16 }}>
        <span className="icon-xs">{ICONS.info}</span> Mỗi lần xem hoặc xuất dữ liệu nhạy cảm đều được ghi nhật ký.
      </p>
    </div>
  );
}
