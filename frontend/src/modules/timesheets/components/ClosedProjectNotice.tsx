import { ICONS } from '../../../components/common/icons';
import type { ProjectRes } from '../../projects/types/projectTypes';

interface ClosedProjectNoticeProps {
  project: Pick<ProjectRes, 'projectCode' | 'name' | 'status'>;
}

/**
 * Thông báo nổi bật khi dự án của công việc đang xem KHÔNG còn ở trạng thái RUNNING
 * (NCL-06-CN-007 — Chặn ghi giờ vào dự án đã đóng).
 *
 * Tách thành component riêng (thay vì `alert-box` inline như trước) để hiển thị rõ ràng,
 * nhất quán ở mọi nơi cần cảnh báo trạng thái này — hiện dùng trong `TimeEntryPage`, nơi nút
 * "Ghi giờ công"/"Sửa"/"Xóa" đã bị ẩn hoàn toàn khi dự án đóng (chặn từ backend ở tầng
 * `OpenProjectValidator`, đây chỉ là lớp UI chủ động tránh người dùng bấm rồi mới nhận lỗi).
 * Bản ghi giờ công cũ của công việc vẫn xem lại được bình thường bên dưới thông báo này.
 */
export default function ClosedProjectNotice({ project }: ClosedProjectNoticeProps) {
  return (
    <div
      className="user-table-card"
      style={{ padding: '28px 24px', textAlign: 'center', marginBottom: '16px' }}
      role="alert"
      data-testid="time-entry-project-closed-alert"
    >
      <div style={{ fontSize: '36px', color: '#9F2F2D', marginBottom: '10px', display: 'flex', justifyContent: 'center' }}>
        {ICONS.lock}
      </div>
      <h3 style={{ margin: '0 0 8px', fontSize: '17px', fontWeight: 700 }}>Dự án đã đóng — không thể ghi giờ công</h3>
      <p style={{ margin: '0 auto 14px', maxWidth: '540px', color: '#5B5A57', fontSize: '14px', lineHeight: 1.6 }}>
        Dự án <strong>{project.projectCode} — {project.name}</strong> hiện không còn đang chạy. Bạn vẫn xem lại
        được các bản ghi giờ công cũ của công việc này bên dưới, nhưng không thể ghi mới, sửa hay xóa nữa. Liên hệ
        Quản lý dự án nếu cần mở lại dự án.
      </p>
      <span className="status-pill status-pill--rejected">
        <span className="status-pill__dot" />
        {project.status}
      </span>
    </div>
  );
}
