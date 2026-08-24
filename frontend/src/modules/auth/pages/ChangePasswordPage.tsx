import { useState } from 'react';
import ChangePasswordForm from '../components/ChangePasswordForm';

interface ChangePasswordPageProps {
  onBack: () => void;
  /** Gọi sau khi đổi mật khẩu thành công — App cần đăng xuất vì token hiện tại đã hết hiệu lực. */
  onPasswordChanged: () => void;
}

export default function ChangePasswordPage({ onBack, onPasswordChanged }: ChangePasswordPageProps) {
  const [done, setDone] = useState(false);

  const handleSuccess = () => {
    setDone(true);
    window.setTimeout(onPasswordChanged, 1800);
  };

  return (
    <div className="user-detail-page">
      <div className="mb-4">
        <button type="button" className="btn-secondary" onClick={onBack} disabled={done}>
          ← Quay lại
        </button>
      </div>

      <div className="detail-card" style={{ maxWidth: 520, margin: '0 auto' }}>
        <div className="breadcrumb">
          <span>Tài khoản</span> / <span className="active">Đổi mật khẩu</span>
        </div>
        <h1 className="page-title">Đổi mật khẩu</h1>
        <p className="page-subtitle" style={{ marginBottom: 24 }}>
          Nhập mật khẩu hiện tại và mật khẩu mới để cập nhật thông tin đăng nhập của bạn.
        </p>

        {done ? (
          <div
            className="alert"
            style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#15803d' }}
            role="status"
          >
            <span>✅ Đổi mật khẩu thành công! Đang chuyển về màn hình đăng nhập...</span>
          </div>
        ) : (
          <ChangePasswordForm onSuccess={handleSuccess} />
        )}
      </div>
    </div>
  );
}
