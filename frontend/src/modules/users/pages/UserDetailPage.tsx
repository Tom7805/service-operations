import React, { useEffect, useState } from 'react';
import { getUserById } from '../api/usersApi';
import type { User } from '../types/userTypes';
import { SYSTEM_DEPARTMENTS, SYSTEM_ROLES } from '../types/userTypes';

interface UserDetailPageProps {
  userId: number;
  onBack: () => void;
}

export const UserDetailPage: React.FC<UserDetailPageProps> = ({ userId, onBack }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadDetail() {
      setLoading(true);
      try {
        const data = await getUserById(userId);
        setUser(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Không thể tải chi tiết thông tin người dùng.');
      } finally {
        setLoading(false);
      }
    }
    loadDetail();
  }, [userId]);

  if (loading) {
    return (
      <div className="user-detail-page p-6">
        <div className="skeleton skeleton-text" style={{ width: '200px', height: '30px' }} />
        <div className="skeleton skeleton-card mt-4" style={{ height: '300px' }} />
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="user-detail-page p-6">
        <button type="button" className="btn-secondary mb-4" onClick={onBack}>
          ← Quay lại danh sách
        </button>
        <div className="alert alert--error">
          <span>⚠️ {error || 'Không tìm thấy người dùng'}</span>
        </div>
      </div>
    );
  }

  const dept = SYSTEM_DEPARTMENTS.find((d) => d.id === user.departmentId);

  return (
    <div className="user-detail-page">
      <div className="mb-4">
        <button type="button" className="btn-secondary" onClick={onBack}>
          ← Quay lại danh sách tài khoản
        </button>
      </div>

      <div className="detail-card">
        <div className="detail-header">
          <div className="avatar-circle avatar-circle--xl">{user.fullName.charAt(0).toUpperCase()}</div>
          <div>
            <h1 className="detail-name">{user.fullName}</h1>
            <span className="detail-username">@{user.username}</span>
            <div className="mt-2">
              <span className={`status-pill status-pill--${user.status.toLowerCase()}`}>
                {user.status === 'ACTIVE' ? 'Hoạt động' : user.status === 'LOCKED' ? 'Đã khóa' : 'Ngưng hoạt động'}
              </span>
            </div>
          </div>
        </div>

        <hr className="divider" />

        <div className="detail-grid">
          <div className="detail-field">
            <span className="detail-label">Email liên hệ</span>
            <strong className="detail-value">{user.email || 'Chưa khai báo'}</strong>
          </div>

          <div className="detail-field">
            <span className="detail-label">Bộ phận / Phòng ban</span>
            <strong className="detail-value">{dept ? `[${dept.code}] ${dept.name}` : 'Chưa gán'}</strong>
          </div>

          <div className="detail-field">
            <span className="detail-label">Thời điểm khởi tạo</span>
            <strong className="detail-value">{new Date(user.createdAt).toLocaleString('vi-VN')}</strong>
          </div>

          <div className="detail-field">
            <span className="detail-label">Cập nhật lần cuối</span>
            <strong className="detail-value">{new Date(user.updatedAt).toLocaleString('vi-VN')}</strong>
          </div>
        </div>

        <hr className="divider" />

        <div className="detail-section">
          <h3 className="section-title">Danh sách vai trò và quyền hạn</h3>
          <div className="user-tags-wrap mt-2">
            {user.roleCodes.map((code) => {
              const role = SYSTEM_ROLES.find((r) => r.code === code);
              return (
                <div key={code} className="role-detail-card">
                  <div>
                    <span className="role-title">{role ? role.name : code}</span>
                    <p className="role-desc">{role ? role.description : ''}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserDetailPage;
