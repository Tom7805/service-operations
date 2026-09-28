import { useCallback, useEffect, useState } from 'react';
import { ICONS } from '../../../components/common/icons';
import ModalPortal from '../../../components/common/ModalPortal';
import { useBackdropClick } from '../../../hooks/useBackdropClick';
import { fetchWorkTypeRates, RatesApiError } from '../api/ratesApi';
import { WORK_TYPE_LABELS, type WorkType, type WorkTypeRateFactorRes } from '../types/rateTypes';
import WorkTypeRateManager from './WorkTypeRateManager';

const ORDER = Object.keys(WORK_TYPE_LABELS) as WorkType[];

function formatFactor(value: number): string {
  return `×${value.toLocaleString('vi-VN', { maximumFractionDigits: 2 })}`;
}

/**
 * NCL-07-CN-006 thu gọn: 4 hệ số loại giờ chỉ là 4 con số ít đổi, nên hiện thành một dải ngay trên
 * bảng giá chung (đọc cùng lúc với đơn giá ngày) thay vì một khối riêng. Sửa trong hộp thoại, dùng lại
 * đúng bảng sửa hệ số của {@link WorkTypeRateManager}.
 */
export default function WorkTypeRateStrip() {
  const [rates, setRates] = useState<WorkTypeRateFactorRes[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const close = useCallback(() => setEditing(false), []);
  const backdrop = useBackdropClick(close);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      setRates(await fetchWorkTypeRates());
    } catch (err) {
      setLoadError(err instanceof RatesApiError ? err.message : 'Không tải được hệ số loại giờ.');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!editing) return undefined;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [editing, close]);

  const handleSaved = (updated: WorkTypeRateFactorRes) =>
    setRates((prev) => (prev ?? []).map((r) => (r.workType === updated.workType ? updated : r)));

  const sorted = [...(rates ?? [])].sort((a, b) => ORDER.indexOf(a.workType) - ORDER.indexOf(b.workType));

  return (
    <div className="rate-factor-strip" data-testid="work-type-rate-strip">
      <span className="rate-factor-strip__label" title="Đơn giá giờ = đơn giá ngày × hệ số ÷ 8 giờ">
        Hệ số loại giờ
      </span>
      <div className="rate-factor-strip__list">
        {loadError ? (
          <span className="rate-factor-strip__note">
            {loadError}{' '}
            <button type="button" className="btn-link" onClick={() => void load()}>
              Thử lại
            </button>
          </span>
        ) : rates === null ? (
          <span className="rate-factor-strip__note">Đang tải…</span>
        ) : sorted.length === 0 ? (
          <span className="rate-factor-strip__note">Chưa khai báo hệ số nào</span>
        ) : (
          sorted.map((r) => (
            <span key={r.workType} className="rate-factor" data-testid={`work-type-factor-${r.workType}`}>
              {WORK_TYPE_LABELS[r.workType]} <strong>{formatFactor(r.factor)}</strong>
            </span>
          ))
        )}
      </div>
      <button
        type="button"
        className="btn btn-secondary btn-sm"
        onClick={() => setEditing(true)}
        data-testid="work-type-rate-edit"
      >
        <span className="icon-xs">{ICONS.edit}</span> Sửa hệ số
      </button>

      {editing && (
        <ModalPortal>
          <div
            className="modal-backdrop"
            onMouseDown={backdrop.onMouseDown}
            onClick={backdrop.onClick}
            role="dialog"
            aria-modal="true"
            aria-labelledby="work-type-rate-dialog-title"
          >
            <div className="modal-card">
              <div className="modal-header">
                <div className="modal-header__title-wrap">
                  <h3 className="modal-title" id="work-type-rate-dialog-title">
                    <span className="modal-title__icon">{ICONS.settings}</span>
                    Hệ số theo loại giờ
                  </h3>
                </div>
                <button type="button" className="modal-close" onClick={close} aria-label="Đóng">
                  {ICONS.close}
                </button>
              </div>
              <div className="modal-body">
                <p className="field-hint" style={{ marginTop: 0 }}>
                  Đơn giá giờ = đơn giá ngày × hệ số ÷ 8 giờ. Lưu sẽ ghi đè hệ số hiện tại và áp dụng cho các lần
                  tính doanh thu, đề nghị xuất hóa đơn sau đó.
                </p>
                <WorkTypeRateManager embedded onSaved={handleSaved} />
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
}
