import { useState } from 'react';
import LoginPage from './modules/auth/pages/LoginPage';
import type { AuthSession } from './modules/auth/types/authTypes';

const ROLE_HOME: Record<string, string> = {
  'VT-01': 'Tổng quan điều hành',
  'VT-02': 'Không gian dự án',
  'VT-03': 'Công việc của tôi',
  'VT-04': 'Cơ hội kinh doanh',
  'VT-05': 'Tài chính & công nợ',
  'VT-06': 'Nhân sự',
  'VT-07': 'Quản trị hệ thống',
  'VT-08': 'Không gian làm việc',
  'VT-09': 'Cổng khách hàng',
};

export default function App() {
  const [session, setSession] = useState<AuthSession | null>(null);

  if (!session) return <LoginPage onAuthenticated={setSession} />;

  const destination = ROLE_HOME[session.roles[0]] ?? 'Không gian làm việc';
  return (
    <main className="signed-in" aria-live="polite">
      <div className="signed-in__orb" />
      <section>
        <span className="eyebrow">Đăng nhập thành công</span>
        <h1>Chào mừng trở lại, {session.fullName}.</h1>
        <p>Bạn đang được chuyển đến <strong>{destination}</strong> theo vai trò được cấp.</p>
        <div className="signed-in__progress"><span /></div>
        <button type="button" onClick={() => setSession(null)}>Đăng xuất</button>
      </section>
    </main>
  );
}
