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
            placeholder="Tìm theo tên đăng nhập, họ tên hoặc vai trò chuyên môn..."
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
        <table className="user-data-table">
          <thead>
            <tr>
              <th>Nhân sự</th>
              <th>Bộ phận</th>
              <th>Vai trò chuyên môn</th>
              <th>Giờ chuẩn / tuần</th>
              <th>Ngày vào làm</th>
              <th>Ngày kết thúc</th>
              <th style={{ width: '110px', textAlign: 'right' }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <TableSkeleton columns={7} />
            ) : filteredEmployees.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: '#787774' }}>
                  Không tìm thấy hồ sơ nhân sự nào.
                </td>
              </tr>
            ) : (
              filteredEmployees.map((emp) => (
                <tr key={emp.id}>
                  <td>
                    <div className="user-profile-cell">
                      <div className="avatar-circle">{emp.fullName.charAt(0).toUpperCase()}</div>
                      <div className="user-profile-meta">
                        <span className="user-profile-fullname">{emp.fullName}</span>
                        <span className="user-profile-username">@{emp.username}</span>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className="cell-dept">{emp.departmentName || 'Chưa gán bộ phận'}</span>
                  </td>
                  <td>{emp.professionalRole || '—'}</td>
                  <td>
                    <strong>{emp.standardHoursPerWeek}</strong>
                    {Number(emp.standardHoursPerWeek) !== DEFAULT_STANDARD_HOURS_PER_WEEK && (
                      <span className="user-tag badge--orange" style={{ marginLeft: 6 }}>
                        Tùy chỉnh
                      </span>
                    )}
                  </td>
                  <td>{emp.hireDate}</td>
                  <td>{emp.endDate || '—'}</td>
                  <td style={{ textAlign: 'right' }}>
                    <RowActionsMenu
                      actions={[
                        { key: 'edit', label: 'Chỉnh sửa hồ sơ', icon: ICONS.edit, onClick: () => onEdit(emp) },
                        { key: 'detail', label: 'Xem chi tiết & hợp đồng', icon: ICONS.eye, onClick: () => onViewDetail(emp) },
                      ]}
                    />
                  </td>
                </tr>
              ))
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
