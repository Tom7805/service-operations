import { createContext, useContext, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

/**
 * Trang đang được nhúng làm một tab trong khu làm việc (xem `HubFrame`). Khi đó khu làm việc đã có
 * tiêu đề và dải tab riêng, nên đầu trang của trang con chỉ còn các nút thao tác — đặt vào khe bên
 * phải dải tab (`actionSlot`) để tab và thao tác nằm trên cùng một hàng.
 */
export const HubContext = createContext<{ embedded: boolean; actionSlot: HTMLElement | null }>({
  embedded: false,
  actionSlot: null,
});

export function useIsEmbedded(): boolean {
  return useContext(HubContext).embedded;
}

interface PageHeaderProps {
  title: ReactNode;
  /** Nút thao tác ở góc phải (thêm mới, làm mới, nhật ký…). */
  actions?: ReactNode;
  /**
   * Dòng phụ ngắn đứng ngay dưới tiêu đề — chỉ dùng cho DỮ LIỆU (mã, khách hàng, trạng thái), không cho
   * lời giải thích. Mỗi phần tử con tự được ngăn bằng dấu "·".
   */
  meta?: ReactNode;
  /** Trang chi tiết: liên kết "← Trang cha" phía trên tiêu đề. */
  back?: { label: string; onClick: () => void; testId?: string; ariaLabel?: string };
}

/** Đầu trang dùng chung: tiêu đề + nút thao tác, không có đoạn mô tả. */
export default function PageHeader({ title, actions, meta, back }: PageHeaderProps) {
  const { embedded, actionSlot } = useContext(HubContext);
  const backLink = back && (
    <button
      type="button"
      className="page-header__back"
      onClick={back.onClick}
      aria-label={back.ariaLabel}
      data-testid={back.testId}
    >
      <span aria-hidden="true">←</span> {back.label}
    </button>
  );

  if (embedded) {
    const actionNode = actions ? <div className="page-header__actions">{actions}</div> : null;
    return (
      <>
        {actionNode && actionSlot && createPortal(actionNode, actionSlot)}
        {(meta || (actionNode && !actionSlot)) && (
          <div className="page-header page-header--embedded">
            {meta ? <div className="page-header__meta-line">{meta}</div> : <span />}
            {!actionSlot && actionNode}
          </div>
        )}
      </>
    );
  }

  return (
    <div className="page-header">
      <div className="page-header__main">
        {backLink}
        <h1 className="page-title">{title}</h1>
        {meta && <div className="page-header__meta-line">{meta}</div>}
      </div>
      {actions && <div className="page-header__actions">{actions}</div>}
    </div>
  );
}
