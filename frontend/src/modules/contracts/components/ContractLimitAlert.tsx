import { useEffect, useState } from 'react';
import { ICONS } from '../../../components/common/icons';
import type { ContractRes, ContractUsageRes } from '../types/contractTypes';
import { getContractUsage, ContractsApiError } from '../api/contractsApi';

/**
 * Chỉ cần đủ để hiển thị tiêu đề — KHÔNG dùng `ContractRes` đầy đủ vì màn hình
 * này phải mở được cho cả VT-02 (Quản lý dự án), trong khi API `GET
 * /contracts/{id}` (nguồn của `ContractRes` đầy đủ) chỉ cấp quyền cho VT-05.
 * Giữ prop hẹp lại giúp trang gọi component không bị buộc phải gọi API bị
 * chặn quyền chỉ để lấy tên/mã hợp đồng hiển thị ở tiêu đề.
 */
export type ContractLimitAlertTarget = Pick<ContractRes, 'id' | 'contractCode' | 'name'>;

export interface ContractLimitAlertProps {
  contract: ContractLimitAlertTarget;
  isOpen?: boolean;
  onClose?: () => void;
  currentUserRoles?: string[];
  initialUsage?: ContractUsageRes;
}

const formatAmount = (num: number | null | undefined): string => {
  if (num == null) return '—';
  return `${num.toLocaleString('vi-VN')} đ`;
};

export default function ContractLimitAlert({
  contract,
  isOpen = true,
  onClose,
  currentUserRoles = ['VT-02'],
  initialUsage,
}: ContractLimitAlertProps) {
  // NCL-04-CN-005 (TC-03): Chỉ Quản lý dự án (VT-02) hoặc Kế toán (VT-05) được phép xem.
  const isAllowed = currentUserRoles.includes('VT-02') || currentUserRoles.includes('VT-05');

  const [usage, setUsage] = useState<ContractUsageRes | null>(initialUsage ?? null);
  const [isLoading, setIsLoading] = useState(!initialUsage && isAllowed && isOpen);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !isAllowed) return;
    if (initialUsage) {
      setUsage(initialUsage);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setLoadError(null);

    getContractUsage(contract.id)
      .then((data) => {
        if (!cancelled) {
          setUsage(data);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setLoadError(
            err instanceof ContractsApiError
              ? err.message
              : 'Không thể tải thông tin sử dụng hạn mức hợp đồng.'
          );
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [contract.id, isOpen, isAllowed, initialUsage]);

  if (!isOpen) return null;

  const renderContent = () => {
    if (!isAllowed) {
      return (
        <div className="alert-box alert-box--danger" role="alert">
          <span className="alert-box__icon">{ICONS.alertTriangle}</span>
          <div className="alert-box__content">
            <strong>Từ chối truy cập</strong>
            <p>Chức năng yêu cầu vai trò Quản lý dự án (VT-02) hoặc Kế toán (VT-05).</p>
          </div>
        </div>
      );
    }

    if (isLoading) {
      return (
        <div className="table-loading-state" role="status">
          <div className="spinner-sm" style={{ width: '24px', height: '24px', borderWidth: '3px' }} />
          <p>Đang tải dữ liệu hạn mức...</p>
        </div>
      );
    }

    if (loadError) {
      return (
        <div className="alert-box alert-box--danger" role="alert">
          <span className="alert-box__icon">{ICONS.alertTriangle}</span>
          <div className="alert-box__content">
            <strong>Lỗi tải dữ liệu</strong>
            <p>{loadError}</p>
          </div>
        </div>
      );
    }

    if (!usage) return null;

    const hasLimit = usage.limitValue != null;
    const progressWidth = hasLimit
      ? Math.min(100, Math.max(0, usage.usedPercentage ?? 0))
      : 0;

    return (
      <div className="contract-limit-alert-body">
        {/* Banner cảnh báo theo trạng thái (TC-01, TC-02, Neutral) */}
        {!hasLimit && (
          <div className="alert-box alert-box--info" role="status" data-testid="limit-alert-no-limit">
            <span className="alert-box__icon">{ICONS.info}</span>
            <div className="alert-box__content">
              <strong>Hợp đồng không đặt hạn mức</strong>
              <p>Hợp đồng này không khai báo hạn mức trần nên không áp dụng cơ chế cảnh báo vượt hạn mức.</p>
            </div>
          </div>
        )}

        {hasLimit && usage.overLimit && (
          <div className="alert-box alert-box--danger" role="alert" data-testid="limit-alert-over">
            <span className="alert-box__icon">{ICONS.alertTriangle}</span>
            <div className="alert-box__content">
              <strong>CẢNH BÁO: ĐÃ VƯỢT HẠN MỨC!</strong>
              <p>
                Giá trị đã xuất hóa đơn ({formatAmount(usage.usedValue)}) đã vượt quá hạn mức cho phép ({formatAmount(usage.limitValue)}). Số tiền vượt: {formatAmount(Math.abs(usage.remainingValue ?? 0))}.
              </p>
            </div>
          </div>
        )}

        {hasLimit && usage.nearLimit && (
          <div className="alert-box alert-box--warning" role="alert" data-testid="limit-alert-near">
            <span className="alert-box__icon">{ICONS.alertTriangle}</span>
            <div className="alert-box__content">
              <strong>CẢNH BÁO: SẮP VƯỢT HẠN MỨC TRẦN!</strong>
              <p>
                Hợp đồng đã sử dụng {usage.usedPercentage}% hạn mức (đạt ngưỡng cảnh báo 80%). Giá trị còn lại có thể xuất hóa đơn: {formatAmount(usage.remainingValue)}.
              </p>
            </div>
          </div>
        )}

        {hasLimit && !usage.nearLimit && !usage.overLimit && (
          <div className="alert-box alert-box--success" role="status" data-testid="limit-alert-safe">
            <span className="alert-box__icon">{ICONS.checkCircle}</span>
            <div className="alert-box__content">
              <strong>Mức sử dụng an toàn</strong>
              <p>
                Hợp đồng đã sử dụng {usage.usedPercentage}% hạn mức. Giá trị còn lại: {formatAmount(usage.remainingValue)}.
              </p>
            </div>
          </div>
        )}

        {/* Thanh tiến độ trực quan */}
        {hasLimit && (
          <div className="contract-limit-progress-wrap">
            <div className="contract-limit-progress-header">
              <span>Tỷ lệ sử dụng hạn mức</span>
              <span>
                {usage.usedPercentage}% (Ngưỡng cảnh báo: 80%)
              </span>
            </div>
            <div className="contract-limit-progress-bar" role="progressbar" aria-valuenow={usage.usedPercentage ?? 0} aria-valuemin={0} aria-valuemax={100}>
              <div
                className={`contract-limit-progress-fill ${
                  usage.overLimit
                    ? 'contract-limit-progress-fill--over'
                    : usage.nearLimit
                    ? 'contract-limit-progress-fill--near'
                    : 'contract-limit-progress-fill--safe'
                }`}
                style={{ width: `${progressWidth}%` }}
              />
            </div>
          </div>
        )}

        {/* Lưới thông số chi tiết */}
        <div className="contract-limit-metrics">
          <div className="contract-limit-metric-card">
            <div className="contract-limit-metric-label">Tổng giá trị hợp đồng</div>
            <div className="contract-limit-metric-value">{formatAmount(usage.totalValue)}</div>
          </div>

          <div className="contract-limit-metric-card">
            <div className="contract-limit-metric-label">Hạn mức trần (QTN-19)</div>
            <div className="contract-limit-metric-value">
              {hasLimit ? formatAmount(usage.limitValue) : 'Chưa thiết lập'}
            </div>
          </div>

          <div className="contract-limit-metric-card">
            <div className="contract-limit-metric-label">Đã xuất hóa đơn (INVOICED)</div>
            <div className="contract-limit-metric-value">{formatAmount(usage.usedValue)}</div>
          </div>

          <div className="contract-limit-metric-card">
            <div className="contract-limit-metric-label">Giá trị còn lại</div>
            <div
              className={`contract-limit-metric-value ${
                usage.overLimit
                  ? 'contract-limit-metric-value--danger'
                  : usage.nearLimit
                  ? 'contract-limit-metric-value--warning'
                  : 'contract-limit-metric-value--safe'
              }`}
            >
              {formatAmount(usage.remainingValue)}
            </div>
          </div>

          <div className="contract-limit-metric-card">
            <div className="contract-limit-metric-label">Tỷ lệ đã dùng</div>
            <div
              className={`contract-limit-metric-value ${
                usage.overLimit
                  ? 'contract-limit-metric-value--danger'
                  : usage.nearLimit
                  ? 'contract-limit-metric-value--warning'
                  : 'contract-limit-metric-value--safe'
              }`}
            >
              {usage.usedPercentage != null ? `${usage.usedPercentage}%` : '—'}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const cardContent = (
    <div className="modal-card contract-modal-card">
      <div className="modal-header">
        <div className="modal-header__title-wrap">
          <h3 className="modal-title">
            <span className="modal-title__icon">{ICONS.alertTriangle}</span>
            Tình trạng sử dụng hạn mức hợp đồng
          </h3>
          <p className="field-hint">
            Mã: {contract.contractCode} · {contract.name}
          </p>
        </div>
        {onClose && (
          <button
            type="button"
            className="modal-close"
            onClick={onClose}
            aria-label="Đóng"
          >
            {ICONS.close}
          </button>
        )}
      </div>

      <div className="modal-body">{renderContent()}</div>

      {onClose && (
        <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', padding: '12px 24px' }}>
          <button type="button" className="btn" onClick={onClose}>
            Đóng
          </button>
        </div>
      )}
    </div>
  );

  if (onClose) {
    return (
      <div
        className="modal-backdrop"
        role="dialog"
        aria-modal="true"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        {cardContent}
      </div>
    );
  }

  return cardContent;
}
