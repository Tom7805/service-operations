import { useEffect, useState } from 'react';
import type { AuthSession } from '../types/authTypes';
import LoginForm from '../components/LoginForm';

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
        <div key={active.number} className="highlight-detail__content"><span>✦</span><p>{active.detail}</p></div>
      </div>
    </div>
  );
}

export default function LoginPage({ onAuthenticated }: LoginPageProps) {
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
          <p className="eyebrow">Nền tảng vận hành thông minh</p>
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
        <LoginForm onAuthenticated={onAuthenticated} />
      </section>
    </main>
  );
}
