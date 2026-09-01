import { useEffect, useState } from 'react';
import { ICONS } from '../../../components/common/icons';
import type { AuthSession, TwoFactorChallenge } from '../types/authTypes';
import LoginForm from '../components/LoginForm';
import ForgotPasswordForm from '../components/ForgotPasswordForm';
import ResetPasswordForm from '../components/ResetPasswordForm';
import TwoFactorVerifyForm from '../components/TwoFactorVerifyForm';

interface LoginPageProps { onAuthenticated: (session: AuthSession) => void }

const HIGHLIGHTS = [
  { number: '01', title: 'Sức khỏe dự án', caption: 'Nhìn rõ tiến độ và biên lợi nhuận theo thời gian thực.', detail: 'Quyết định sớm, đúng thời điểm.' },
  { number: '02', title: 'Phối hợp nhịp nhàng', caption: 'Kết nối công việc, giờ công và nguồn lực trong một luồng.', detail: 'Đúng người, đúng việc, đúng lúc.' },
  { number: '03', title: 'Dữ liệu vững tin', caption: 'Theo dõi toàn bộ vận hành từ cơ hội đến lợi nhuận thực.', detail: 'Minh bạch cho mọi quyết định.' },
];

function Highlights() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const timer = window.setInterval(() => setActiveIndex((current) => (current + 1) % HIGHLIGHTS.length), 5000);
    return () => window.clearInterval(timer);
  }, [paused]);

  const active = HIGHLIGHTS[activeIndex];
  return (
    <div className="highlights" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocusCapture={() => setPaused(true)} onBlurCapture={(event) => {
      if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setPaused(false);
    }}>
      <div className="story" role="tablist" aria-label="Các lợi ích của nền tảng">
        <div className="story__line" />
        {HIGHLIGHTS.map((item, index) => <button key={item.number} type="button" role="tab" aria-selected={index === activeIndex} className={`story__item ${index === activeIndex ? 'story__item--active' : ''}`} onClick={() => setActiveIndex(index)}>
          <span>{item.number}</span><strong>{item.title}</strong><p>{item.caption}</p>
          {index === activeIndex && !paused && <i className="story__progress" />}
        </button>)}
      </div>
      <div className="highlight-detail" role="tabpanel" aria-live="polite">
        <div key={active.number} className="highlight-detail__content"><span className="icon-sm">{ICONS.spark}</span><p>{active.detail}</p></div>
      </div>
    </div>
  );
}

type AuthView = 'LOGIN' | 'FORGOT' | 'RESET' | 'TWO_FACTOR';

export default function LoginPage({ onAuthenticated }: LoginPageProps) {
  const [view, setView] = useState<AuthView>('LOGIN');
  const [resetToken, setResetToken] = useState<string | null>(null);
  // NCL-01-CN-009: bước 1 (mật khẩu đúng) trả về challenge khi vai trò đang bật 2FA.
  const [twoFactorChallenge, setTwoFactorChallenge] = useState<TwoFactorChallenge | null>(null);

  // Liên kết khôi phục mật khẩu (mô phỏng qua log backend — QTN-04) đưa người dùng thẳng
  // vào đây kèm ?token=..., không cần đăng nhập trước.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    if (token) {
      setResetToken(token);
      setView('RESET');
    }
  }, []);

  const handleResetDone = () => {
    window.history.replaceState({}, '', window.location.pathname);
    setResetToken(null);
    setView('LOGIN');
  };

  return (
    <main className="login-shell">
      <div className="ambient ambient--one" />
      <div className="ambient ambient--two" />
      <section className="login-brand" aria-label="Giới thiệu hệ thống">
        <a className="brand" href="/" aria-label="Vận Hành Dịch Vụ">
          <span className="brand__mark"><i /><i /><i /></span>
          <span>Vận hành <b>dịch vụ</b></span>
        </a>
        <div className="brand-copy">
          <h1>Mọi quyết định đều<br /><em>có điểm tựa.</em></h1>
          <p className="brand-copy__description">Kết nối con người, dự án và dòng tiền trong một nhịp vận hành rõ ràng.</p>
          <div className="brand-signals" aria-label="Giá trị vận hành">
            <span><i />Dữ liệu thống nhất</span>
            <span><i />Quyền truy cập bảo mật</span>
          </div>
        </div>
        <Highlights />
        <p className="brand-footer">© {new Date().getFullYear()} Vận Hành Dịch Vụ</p>
      </section>
      <section className="login-panel">
        {view === 'LOGIN' && (
          <LoginForm
            onAuthenticated={onAuthenticated}
            onForgotPassword={() => setView('FORGOT')}
            onTwoFactorRequired={(challenge) => {
              setTwoFactorChallenge(challenge);
              setView('TWO_FACTOR');
            }}
          />
        )}
        {view === 'FORGOT' && <ForgotPasswordForm onBackToLogin={() => setView('LOGIN')} />}
        {view === 'RESET' && resetToken && <ResetPasswordForm token={resetToken} onDone={handleResetDone} />}
        {view === 'TWO_FACTOR' && twoFactorChallenge && (
          <TwoFactorVerifyForm
            challengeToken={twoFactorChallenge.challengeToken}
            username={twoFactorChallenge.username}
            totpEnrollment={twoFactorChallenge.totpEnrollment}
            otpauthUri={twoFactorChallenge.otpauthUri}
            totpSecretForDisplay={twoFactorChallenge.totpSecretForDisplay}
            onVerified={onAuthenticated}
            onBackToLogin={() => {
              setTwoFactorChallenge(null);
              setView('LOGIN');
            }}
          />
        )}
      </section>
    </main>
  );
}
