import { ICONS } from './icons';

interface PaginationProps {
  /** Trang hiện tại, bắt đầu từ 0. */
  page: number;
  totalPages: number;
  totalElements: number;
  pageSize: number;
  /** Danh từ cho số bản ghi, vd "hồ sơ khách hàng". */
  itemLabel: string;
  loading?: boolean;
  onPageChange: (page: number) => void;
  testIdPrefix?: string;
}

/** Các số trang cần hiện: trang đầu, trang cuối và hai trang kề trang hiện tại; `null` = dấu "…". */
export function visiblePages(page: number, totalPages: number): Array<number | null> {
  const pages = new Set<number>([0, totalPages - 1, page - 1, page, page + 1]);
  const sorted = [...pages].filter((p) => p >= 0 && p < totalPages).sort((a, b) => a - b);
  const result: Array<number | null> = [];
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) result.push(null);
    result.push(p);
  });
  return result;
}

/**
 * Chân bảng phân trang phía máy chủ — cùng khung `table-footer--paginated` với Nhật ký/Thông báo,
 * thêm số trang để nhảy nhanh. Nút bị khoá khi đang tải để không bắn chồng yêu cầu.
 */
export default function Pagination({
  page,
  totalPages,
  totalElements,
  pageSize,
  itemLabel,
  loading = false,
  onPageChange,
  testIdPrefix = 'pagination',
}: PaginationProps) {
  const from = totalElements === 0 ? 0 : page * pageSize + 1;
  const to = Math.min(totalElements, (page + 1) * pageSize);

  return (
    <div className="table-footer table-footer--paginated" data-testid={testIdPrefix}>
      <span aria-live="polite" data-testid={`${testIdPrefix}-summary`}>
        {totalElements === 0 ? (
          <>Không có {itemLabel} nào</>
        ) : (
          <>
            Hiển thị <strong>{from}–{to}</strong> / <strong>{totalElements}</strong> {itemLabel}
          </>
        )}
      </span>
      {totalPages > 1 && (
        <nav className="table-footer__pagination pager" aria-label="Phân trang">
          <button
            type="button"
            className="btn-secondary pager__step"
            disabled={page <= 0 || loading}
            onClick={() => onPageChange(page - 1)}
            aria-label="Trang trước"
            data-testid={`${testIdPrefix}-prev`}
          >
            <span className="icon-sm" aria-hidden="true">{ICONS.arrowLeft}</span>
            <span className="pager__step-label">Trang trước</span>
          </button>
          <span className="pager__pages">
            {visiblePages(page, totalPages).map((p, i) =>
              p === null ? (
                <span key={`gap-${i}`} className="pager__gap" aria-hidden="true">
                  …
                </span>
              ) : (
                <button
                  key={p}
                  type="button"
                  className={`pager__page${p === page ? ' pager__page--current' : ''}`}
                  aria-current={p === page ? 'page' : undefined}
                  aria-label={`Trang ${p + 1}`}
                  disabled={loading && p !== page}
                  onClick={() => p !== page && onPageChange(p)}
                  data-testid={`${testIdPrefix}-page-${p + 1}`}
                >
                  {p + 1}
                </button>
              ),
            )}
          </span>
          <button
            type="button"
            className="btn-secondary pager__step"
            disabled={page + 1 >= totalPages || loading}
            onClick={() => onPageChange(page + 1)}
            aria-label="Trang sau"
            data-testid={`${testIdPrefix}-next`}
          >
            <span className="pager__step-label">Trang sau</span>
            <span className="icon-sm" aria-hidden="true">{ICONS.arrowRight}</span>
          </button>
        </nav>
      )}
    </div>
  );
}
