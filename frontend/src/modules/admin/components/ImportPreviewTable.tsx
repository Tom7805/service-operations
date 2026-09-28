import type { DuplicateAction, ImportPreviewRow, ImportRowStatus, ImportTargetType } from '../types/adminTypes';

/** Cột hiển thị theo loại dữ liệu — khoá khớp tên trường chuẩn backend trả trong `data`. */
export const IMPORT_COLUMNS: Record<ImportTargetType, { key: string; label: string }[]> = {
  CUSTOMER: [
    { key: 'name', label: 'Tên khách hàng' },
    { key: 'taxCode', label: 'Mã số thuế' },
    { key: 'phone', label: 'Điện thoại' },
    { key: 'industry', label: 'Lĩnh vực' },
    { key: 'address', label: 'Địa chỉ' },
  ],
  EMPLOYEE: [
    { key: 'username', label: 'Tài khoản' },
    { key: 'department', label: 'Bộ phận' },
    { key: 'professionalRole', label: 'Vai trò chuyên môn' },
    { key: 'level', label: 'Cấp bậc' },
    { key: 'hireDate', label: 'Ngày vào làm' },
    { key: 'endDate', label: 'Ngày kết thúc' },
    { key: 'standardHoursPerWeek', label: 'Giờ chuẩn/tuần' },
  ],
};

export const ROW_STATUS_META: Record<ImportRowStatus, { label: string; badge: string }> = {
  VALID: { label: 'Hợp lệ', badge: 'badge--green' },
  INVALID: { label: 'Lỗi', badge: 'badge--red' },
  DUPLICATE: { label: 'Trùng', badge: 'badge--gold' },
};

interface ImportPreviewTableProps {
  targetType: ImportTargetType;
  rows: ImportPreviewRow[];
  /** Lựa chọn cho từng dòng trùng (thiếu = theo lựa chọn chung). */
  rowActions: Record<number, DuplicateAction>;
  defaultAction: DuplicateAction;
  onRowActionChange: (rowNumber: number, action: DuplicateAction) => void;
  disabled?: boolean;
}

export default function ImportPreviewTable({
  targetType,
  rows,
  rowActions,
  defaultAction,
  onRowActionChange,
  disabled,
}: ImportPreviewTableProps) {
  const columns = IMPORT_COLUMNS[targetType];
  return (
    <div className="table-responsive table-responsive--bounded">
      <table className="user-data-table import-table">
        <thead>
          <tr>
            <th scope="col" className="svc-table__num">Dòng</th>
            <th scope="col">Kết quả</th>
            {columns.map((c) => (
              <th scope="col" key={c.key}>
                {c.label}
              </th>
            ))}
            <th scope="col">Chi tiết</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length + 3} className="svc-table__empty">
                Không có dòng nào ở mục này.
              </td>
            </tr>
          ) : (
            rows.map((row) => {
              const meta = ROW_STATUS_META[row.status];
              return (
                <tr key={row.rowNumber} className={`import-table__row--${row.status.toLowerCase()}`} data-testid={`import-row-${row.rowNumber}`}>
                  <td className="svc-table__num">{row.rowNumber}</td>
                  <td>
                    <span className={`badge ${meta.badge}`}>{meta.label}</span>
                  </td>
                  {columns.map((c) => (
                    <td key={c.key} className="import-table__cell">
                      {row.data[c.key] ?? <span className="import-table__blank">—</span>}
                    </td>
                  ))}
                  <td className="import-table__detail">
                    {row.status === 'DUPLICATE' ? (
                      <div className="import-dup">
                        <span className="import-dup__of">Đã có: {row.duplicateOfLabel ?? `#${row.duplicateOfId}`}</span>
                        <select
                          className="form-select import-dup__select"
                          value={rowActions[row.rowNumber] ?? defaultAction}
                          onChange={(e) => onRowActionChange(row.rowNumber, e.target.value as DuplicateAction)}
                          disabled={disabled}
                          aria-label={`Xử lý dòng ${row.rowNumber}`}
                          data-testid={`import-row-action-${row.rowNumber}`}
                        >
                          <option value="SKIP">Bỏ qua</option>
                          <option value="UPDATE">Cập nhật hồ sơ đã có</option>
                        </select>
                      </div>
                    ) : row.errors.length > 0 ? (
                      <ul className="import-errors">
                        {row.errors.map((e) => (
                          <li key={e}>{e}</li>
                        ))}
                      </ul>
                    ) : (
                      <span className="import-table__blank">—</span>
                    )}
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
