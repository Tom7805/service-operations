import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Lưới an toàn cuối cùng: ứng dụng không có router/nhiều error boundary con,
 * nên một lỗi render bất kỳ (kể cả lỗi không lường trước được) trước đây làm
 * toàn bộ trang trắng xóa mà không có cách nào tự phục hồi ngoài tải lại
 * trang thủ công. Bọc <App/> bằng boundary này để ít nhất còn nút "Tải lại"
 * thay vì màn hình trắng im lặng.
 */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error('Loi khong bat duoc trong ung dung:', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '16px',
            padding: '24px',
            textAlign: 'center',
            fontFamily: 'system-ui, sans-serif',
          }}
        >
          <h2 style={{ margin: 0 }}>Đã có lỗi xảy ra</h2>
          <p style={{ margin: 0, color: '#6b7280', maxWidth: '480px' }}>
            Trang gặp sự cố hiển thị. Bấm nút bên dưới để tải lại — nếu vẫn còn lỗi, hãy báo lại cho quản
            trị viên kèm theo bước bạn vừa làm.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{
              padding: '10px 20px',
              borderRadius: '8px',
              border: 'none',
              background: '#111827',
              color: '#fff',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Tải lại trang
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
