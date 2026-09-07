import { useEffect, useMemo, useState } from 'react';
import { ICONS } from '../../../components/common/icons';
import { fetchOpportunities } from '../api/opportunitiesApi';
import type { Opportunity } from '../types/opportunityTypes';

interface OpportunitySearchPickerProps {
  onSelect: (opportunityId: number, opportunityName: string) => void;
}

/**
 * Cơ hội không có "mã số" hiển thị ở đâu trong hệ thống để người dùng tra cứu —
 * ID chỉ là khoá kỹ thuật trong database. Vì vậy thay vì bắt nhập số ID mù,
 * cho tìm theo tên cơ hội / tên khách hàng rồi chọn từ danh sách khớp.
 */
export default function OpportunitySearchPicker({ onSelect }: OpportunitySearchPickerProps) {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setIsLoading(true);
      setLoadError(null);
      try {
        const data = await fetchOpportunities();
        if (!cancelled) setOpportunities(data);
      } catch {
        if (!cancelled) setLoadError('Không thể tải danh sách cơ hội. Vui lòng thử lại.');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const results = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return opportunities.slice(0, 8);
    return opportunities
      .filter(
        (o) =>
          o.name.toLowerCase().includes(trimmed) ||
          o.customerName?.toLowerCase().includes(trimmed) ||
          String(o.id).includes(trimmed)
      )
      .slice(0, 8);
  }, [opportunities, query]);

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
