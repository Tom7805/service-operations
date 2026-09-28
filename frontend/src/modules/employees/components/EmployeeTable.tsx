import { useState } from 'react';
import type { Employee } from '../types/employeeTypes';
import { DEFAULT_STANDARD_HOURS_PER_WEEK } from '../types/employeeTypes';
import { ICONS } from '../../../components/common/icons';
import TableSkeleton from '../../../components/common/TableSkeleton';
import RowActionsMenu from '../../../components/common/RowActionsMenu';

interface EmployeeTableProps {
  employees: Employee[];
  loading: boolean;
  onEdit: (employee: Employee) => void;
  onViewDetail: (employee: Employee) => void;
  onRefresh: () => void;
}

/** yyyy-MM-dd → dd/MM/yyyy (không qua Date để tránh lệch múi giờ). */
function formatDay(iso: string | null | undefined): string {
  if (!iso) return '—';
  const [y, m, d] = iso.slice(0, 10).split('-');
  return y && m && d ? `${d}/${m}/${y}` : iso;
}

/**
 * Danh sách nhân sự dạng GỌN: mỗi hàng đúng một dòng, chỉ giữ thông tin để nhận ra và chọn đúng
 * người. Giờ chuẩn, ngày kết thúc, chi phí giờ công… xem ở trang chi tiết (bấm vào hàng).
 * Giờ chuẩn chỉ hiện ngay trong danh sách khi KHÁC mặc định — đó là ngoại lệ cần thấy ngay.
 */
export default function EmployeeTable({ employees, loading, onEdit, onViewDetail, onRefresh }: EmployeeTableProps) {
  const [search, setSearch] = useState('');

  const filteredEmployees = employees.filter((emp) => {
    const term = search.toLowerCase().trim();
    if (!term) return true;
    return (
      emp.username.toLowerCase().includes(term) ||
      emp.fullName.toLowerCase().includes(term) ||
      (emp.professionalRole && emp.professionalRole.toLowerCase().includes(term))
    );
  });

  return (
    <div className="user-table-card">
      <div className="user-table-toolbar">
        <div className="search-box">
          <svg className="search-box__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            type="text"
            className="search-box__input"
            placeholder="Tìm theo họ tên, tài khoản hoặc vai trò"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button type="button" className="search-box__clear" onClick={() => setSearch('')} aria-label="Xóa tìm kiếm">
              {ICONS.close}
            </button>
          )}
        </div>

        <button type="button" className="btn-icon-refresh" onClick={onRefresh} title="Tải lại danh sách" aria-label="Tải lại danh sách">
          {ICONS.refresh}
        </button>
      </div>

      <div className="table-responsive">
        <table className="user-data-table list-table">
          <thead>
            <tr>
              <th style={{ width: '28%' }}>Nhân sự</th>
              <th className="list-table__hide-sm" style={{ width: '20%' }}>Bộ phận</th>
              <th className="list-table__hide-sm" style={{ width: '24%' }}>Vai trò chuyên môn</th>
              <th className="list-table__hide-sm" style={{ width: '11%' }}>Vào làm</th>
              <th style={{ width: '12%' }}>Trạng thái</th>
              <th className="list-table__actions">
              <span className="visually-hidden">Thao tác</span>
            </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <TableSkeleton columns={6} />
            ) : filteredEmployees.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: 'var(--ink-muted)' }}>
                  Không tìm thấy hồ sơ nhân sự nào.
                </td>
              </tr>
            ) : (
              filteredEmployees.map((emp) => {
                const customHours = Number(emp.standardHoursPerWeek) !== DEFAULT_STANDARD_HOURS_PER_WEEK;
                const ended = Boolean(emp.endDate);
                return (
                  <tr key={emp.id} className="list-table__row" onClick={() => onViewDetail(emp)}>
                    <td>
                      <div className="user-profile-cell">
                        <div className="avatar-circle">{emp.fullName.charAt(0).toUpperCase()}</div>
                        <div className="user-profile-meta">
                          <button
                            type="button"
                            className="list-table__title"
                            onClick={(e) => {
                              e.stopPropagation();
                              onViewDetail(emp);
                            }}
                            title={emp.fullName}
                          >
                            {emp.fullName}
                          </button>
                          <span className="list-table__sub list-table__hide-sm">@{emp.username}</span>
                          <span className="list-table__sub list-table__show-sm">{emp.professionalRole || '—'}</span>
                        </div>
                      </div>
                    </td>
                    <td className="list-table__hide-sm">
                      <span className="list-table__clip" title={emp.departmentName || undefined}>
                        {emp.departmentName || 'Chưa gán bộ phận'}
                      </span>
                    </td>
                    <td className="list-table__hide-sm">
                      <span className="list-table__inline">
                        <span className="list-table__clip" title={emp.professionalRole || undefined}>
                          {emp.professionalRole || '—'}
                        </span>
                        {customHours && (
                          <span className="list-chip" title={`Giờ chuẩn tùy chỉnh (mặc định ${DEFAULT_STANDARD_HOURS_PER_WEEK} giờ/tuần)`}>
                            {emp.standardHoursPerWeek} giờ/tuần
                          </span>
                        )}
                      </span>
                    </td>
                    <td className="list-table__muted list-table__hide-sm">{formatDay(emp.hireDate)}</td>
                    <td>
                      {ended ? (
                        <span className="list-status list-status--off" title={`Kết thúc ${formatDay(emp.endDate)}`}>
                          Đã nghỉ
                        </span>
                      ) : (
                        <span className="list-status list-status--on">Đang làm</span>
                      )}
                    </td>
                    <td className="list-table__actions" onClick={(e) => e.stopPropagation()}>
                      <RowActionsMenu
                        ariaLabel={`Thao tác với ${emp.fullName}`}
                        actions={[
                          { key: 'edit', label: 'Chỉnh sửa hồ sơ', icon: ICONS.edit, onClick: () => onEdit(emp) },
                          { key: 'detail', label: 'Xem chi tiết & hợp đồng', icon: ICONS.eye, onClick: () => onViewDetail(emp) },
                        ]}
                      />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="table-footer">
        Hiển thị <strong>{filteredEmployees.length}</strong> / <strong>{employees.length}</strong> hồ sơ nhân sự
      </div>
    </div>
  );
}
