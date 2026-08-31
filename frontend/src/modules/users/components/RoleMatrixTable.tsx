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
              <th>Tên Vai Trò & Chức Năng</th>
              <th>Mô Tả Nghiệp Vụ</th>
              <th>Phạm Vi & Quyền Hạn Chi Tiết</th>
              <th>Tài Khoản Đang Giữ</th>
              <th style={{ textAlign: 'right' }}>Thao Tác</th>
            </tr>
          </thead>
          <tbody>
            {SYSTEM_ROLES.map((role) => {
              const assignedUsers = users.filter((u) => u.roleCodes && u.roleCodes.includes(role.code));

              return (
                <tr key={role.code}>
                  <td>
                    <strong style={{ fontSize: '14px', color: '#0f172a' }}>{role.name}</strong>
                  </td>
                  <td style={{ maxWidth: '320px', fontSize: '12.5px', color: '#475569', lineHeight: '1.5' }}>
                    {role.description}
                  </td>
                  <td style={{ maxWidth: '380px' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                      {role.capabilities ? (
                        role.capabilities.map((cap, i) => (
                          <span key={i} className="user-tag badge--gray" style={{ fontSize: '11px', padding: '2px 7px' }}>
                            ✓ {cap}
                          </span>
                        ))
                      ) : (
                        <span className="user-tag badge--gray">Quyền cơ bản</span>
                      )}
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span className="badge-children" style={{ fontWeight: 700 }}>
                        {assignedUsers.length} tài khoản
                      </span>
                    </div>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    {onSelectRoleFilter && (
                      <button
                        type="button"
                        className="btn-secondary"
                        style={{ padding: '4px 10px', fontSize: '12px' }}
                        onClick={() => onSelectRoleFilter(role.code)}
                        title={`Lọc danh sách người dùng có vai trò ${role.name}`}
                      >
                        <span className="icon-xs">{ICONS.search}</span> Xem tài khoản
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
