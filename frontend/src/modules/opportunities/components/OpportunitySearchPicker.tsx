import { useState } from 'react';
import { ICONS } from '../../../components/common/icons';
import { useRemoteOptions } from '../../../hooks/useRemoteOptions';
import { searchOpportunityOptions } from '../api/opportunitiesApi';

interface OpportunitySearchPickerProps {
  onSelect: (opportunityId: number, opportunityName: string) => void;
}

/**
 * Cơ hội không có "mã số" hiển thị ở đâu trong hệ thống để người dùng tra cứu —
 * ID chỉ là khoá kỹ thuật trong database. Vì vậy thay vì bắt nhập số ID mù,
 * cho tìm theo tên cơ hội / tên khách hàng rồi chọn từ danh sách khớp. Máy chủ tìm và
 * chỉ trả 8 kết quả đầu (mới nhất trước) — không nạp cả pipeline về trình duyệt.
 */
export default function OpportunitySearchPicker({ onSelect }: OpportunitySearchPickerProps) {
  const [query, setQuery] = useState('');
  // Tìm theo tên cơ hội, tên khách hàng hoặc mã số — chạy ở máy chủ sau khi ngừng gõ 300ms.
  const search = useRemoteOptions({ keyword: query, fetchOptions: searchOpportunityOptions });
  const results = search.options;
  const isLoading = !search.hasLoaded && !search.error;
  const loadError = search.error ? 'Không thể tải danh sách cơ hội. Vui lòng thử lại.' : null;

  return (
    <div className="opportunity-picker">
      <div className="opportunity-picker__search">
        <span className="opportunity-picker__search-icon">{ICONS.search}</span>
        <input
          type="text"
          className="opportunity-picker__input"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Nhập tên cơ hội hoặc tên khách hàng để tìm..."
          aria-label="Tìm cơ hội"
        />
      </div>

      {isLoading ? (
        <div className="opportunity-picker__hint">Đang tải danh sách cơ hội…</div>
      ) : loadError ? (
        <div className="opportunity-picker__hint opportunity-picker__hint--error">{loadError}</div>
      ) : results.length === 0 ? (
        <div className="opportunity-picker__hint">Không tìm thấy cơ hội phù hợp.</div>
      ) : (
        <ul className="opportunity-picker__list">
          {results.map((o) => (
            <li key={o.id}>
              <button
                type="button"
                className="opportunity-picker__item"
                onClick={() => onSelect(o.id, o.name)}
              >
                <span className="opportunity-picker__item-name">{o.name}</span>
                {o.customerName && <span className="opportunity-picker__item-customer">{o.customerName}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
