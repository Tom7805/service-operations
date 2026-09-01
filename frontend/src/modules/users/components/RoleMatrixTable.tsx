import React from 'react';
import { SYSTEM_ROLES } from '../types/userTypes';
import type { User } from '../types/userTypes';
import { ICONS } from './icons';

interface RoleMatrixTableProps {
  users: User[];
  onSelectRoleFilter?: (roleCode: string) => void;
}

export const RoleMatrixTable: React.FC<RoleMatrixTableProps> = ({
  users,
  onSelectRoleFilter,
}) => {
  return (
    <div className="user-table-card">
      <div className="table-responsive">
        <table className="user-data-table">
          <thead>
            <tr>
              <th style={{ width: '220px' }}>Vai trò & chức năng</th>
              <th style={{ width: '280px' }}>Mô tả nghiệp vụ</th>
              <th>Quyền hạn chi tiết</th>
              <th style={{ width: '150px' }}>Tài khoản đang giữ</th>
              <th style={{ width: '110px', textAlign: 'right' }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {SYSTEM_ROLES.map((role) => {
              const assignedUsers = users.filter((u) => u.roleCodes && u.roleCodes.includes(role.code));

              return (
                <tr key={role.code}>
                  <td>
                    <strong className="role-matrix-name">{role.name}</strong>
                  </td>
                  <td className="role-matrix-desc">{role.description}</td>
                  <td>
                    <div className="capability-list">
                      {role.capabilities ? (
                        role.capabilities.map((cap, i) => (
                          <span key={i} className="capability-chip">
                            <span className="capability-chip__icon">{ICONS.checkCircle}</span>
                            {cap}
                          </span>
                        ))
                      ) : (
                        <span className="cell-muted">Quyền cơ bản</span>
                      )}
                    </div>
                  </td>
                  <td>
                    <span className="badge-children">{assignedUsers.length} tài khoản</span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    {onSelectRoleFilter && (
                      <button
                        type="button"
                        className="btn-link"
                        onClick={() => onSelectRoleFilter(role.code)}
                        title={`Lọc danh sách người dùng có vai trò ${role.name}`}
                      >
                        Xem tài khoản
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default RoleMatrixTable;
