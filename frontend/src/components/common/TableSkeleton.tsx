import React from 'react';

interface TableSkeletonProps {
  /** Số cột của bảng — phải khớp để khung xương trùng đúng lưới cột thật. */
  columns: number;
  /** Số hàng giả. Mặc định 5, đủ để lấp phần đầu bảng mà không tốn công dựng. */
  rows?: number;
}

/**
 * Khung xương cho bảng đang tải.
 *
 * Vì sao không dùng con quay tròn: con quay chỉ nói "đang chờ" và chiếm một ô trống
 * duy nhất, nên khi dữ liệu về thì bố cục nhảy một nhịp. Khung xương giữ đúng số cột
 * và chiều cao hàng, nên trang đứng yên — người dùng đọc được cấu trúc trước cả khi
 * có dữ liệu. Đây là yêu cầu chung của cả minimalist-skill, stitch-skill và redesign-skill.
 *
 * Bề rộng mỗi ô được lấy so le theo một chu kỳ cố định (không phải ngẫu nhiên) để trông
 * giống văn bản thật, đồng thời không đổi giữa các lần render gây nhấp nháy.
 */
const WIDTHS = ['72%', '54%', '84%', '46%', '66%', '38%', '78%'];

export const TableSkeleton: React.FC<TableSkeletonProps> = ({ columns, rows = 5 }) => (
  <>
    {Array.from({ length: rows }).map((_, r) => (
      <tr key={r} aria-hidden="true">
        {Array.from({ length: columns }).map((__, c) => (
          <td key={c}>
            <div className="skeleton skeleton-text" style={{ width: WIDTHS[(r + c) % WIDTHS.length] }} />
          </td>
        ))}
      </tr>
    ))}
    <tr className="sr-only-row">
      <td colSpan={columns} role="status" aria-live="polite">
        Đang tải dữ liệu…
      </td>
    </tr>
  </>
);

export default TableSkeleton;
