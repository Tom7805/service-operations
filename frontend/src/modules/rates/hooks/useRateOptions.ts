import { useEffect, useMemo, useState } from 'react';
import { fetchCurrentBillRates } from '../api/ratesApi';
import type { BillRateRes } from '../types/rateTypes';

export interface RateOptions {
  /** Vai trò chuyên môn đã từng khai báo — để chọn theo tên thay vì gõ tay. */
  roleOptions: string[];
  /** Cấp bậc đã khai báo cho từng vai trò. */
  levelsByRole: Record<string, string[]>;
  /** Mọi cấp bậc đã khai báo. */
  levelOptions: string[];
}

/** Dựng danh sách lựa chọn từ chính các dòng của bảng đơn giá, nên luôn khớp dữ liệu thật. */
export function deriveRateOptions(billRates: BillRateRes[]): RateOptions {
  const byName = (a: string, b: string) => a.localeCompare(b);
  const levelsByRole: Record<string, string[]> = {};
  for (const r of billRates) {
    const list = levelsByRole[r.professionalRole] ?? (levelsByRole[r.professionalRole] = []);
    if (!list.includes(r.level)) list.push(r.level);
  }
  Object.values(levelsByRole).forEach((list) => list.sort(byName));
  return {
    roleOptions: Array.from(new Set(billRates.map((r) => r.professionalRole))).sort(byName),
    levelsByRole,
    levelOptions: Array.from(new Set(billRates.map((r) => r.level))).sort(byName),
  };
}

/**
 * Nạp bảng đơn giá hiện hành để lấy danh sách vai trò / cấp bậc cho các tab "Theo hợp đồng" và "Tra cứu".
 * Lỗi tải chỉ làm danh sách rỗng — mỗi khối tự báo khi người dùng thao tác.
 */
export function useRateOptions(enabled = true): RateOptions {
  const [billRates, setBillRates] = useState<BillRateRes[]>([]);

  useEffect(() => {
    if (!enabled) return undefined;
    let cancelled = false;
    fetchCurrentBillRates()
      .then((data) => {
        if (!cancelled) setBillRates(data);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return useMemo(() => deriveRateOptions(billRates), [billRates]);
}
