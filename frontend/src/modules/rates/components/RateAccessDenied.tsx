import { ICONS } from '../../../components/common/icons';
import { roleLabels } from '../../../utils/roleLabel';

interface Props {
  title: string;
  currentUserName: string;
  currentUserRoles: string[];
  testId: string;
}

/** Màn từ chối quyền dùng chung cho các tab của khu "Đơn giá" (chỉ Kế toán VT-05 / Quản trị viên VT-07). */
export default function RateAccessDenied({ title, currentUserName, currentUserRoles, testId }: Props) {
  return (
    <div className="access-denied-container" data-testid={testId}>
      <div className="access-denied-card">
        <div className="access-denied-icon">{ICONS.shieldOff}</div>
        <h2>{title}</h2>
        <p>
          Trang này dành cho <strong>Kế toán</strong> và <strong>Quản trị viên</strong>. Lần truy cập đã được ghi vào nhật ký.
        </p>
        <div className="security-log-badge">
          <span className="security-log-badge__item">
            {ICONS.shield} Thời điểm ghi nhận: {new Date().toLocaleString('vi-VN')}
          </span>
          <span className="security-log-badge__item">Tài khoản: {currentUserName}</span>
          <span className="security-log-badge__item">
            Vai trò tài khoản: {roleLabels(currentUserRoles) || '(không xác định)'}
          </span>
        </div>
      </div>
    </div>
  );
}
