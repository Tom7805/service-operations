import { useEffect, useState, type FormEvent } from "react";
import { ICONS } from "../../../components/common/icons";
import { closeOpportunity, OpportunityApiError } from "../api/opportunitiesApi";
import {
  LOSS_REASON_OPTIONS,
  type LossReason,
  type Opportunity,
} from "../types/opportunityTypes";
import { validateOpportunityClose } from "../validators/opportunityValidators";

interface OpportunityCloseModalProps {
  isOpen: boolean;
  opportunity: Opportunity | null;
  currentUserRoles?: string[];
  onClose: () => void;
  onSuccess: (updated: Opportunity) => void;
}

const currencyFormatter = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

export default function OpportunityCloseModal({
  isOpen,
  opportunity,
  currentUserRoles = ["VT-04"],
  onClose,
  onSuccess,
}: OpportunityCloseModalProps) {
  const isSales = currentUserRoles.includes("VT-04");

  const [result, setResult] = useState<"WON" | "LOST">("LOST");
  const [lossReason, setLossReason] = useState<LossReason | "">("");
  const [competitorName, setCompetitorName] = useState("");
  const [reasonDetail, setReasonDetail] = useState("");

  const [validationErrors, setValidationErrors] = useState<
    Record<string, string>
  >({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Reset form khi mở modal
  useEffect(() => {
    if (isOpen) {
      setResult("LOST");
      setLossReason("");
      setCompetitorName("");
      setReasonDetail("");
      setValidationErrors({});
      setServerError(null);
      setSubmitting(false);
    }
  }, [isOpen]);

  if (!isOpen || !opportunity) return null;

  // QTN-06 & NCL-03-CN-005: Chỉ cho phép chốt khi cơ hội đang ở giai đoạn đàm phán (NEGOTIATION) và đang mở
  const isEligibleToClose =
    opportunity.stage === "NEGOTIATION" && opportunity.status === "OPEN";

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setServerError(null);

    // Kiểm tra tính hợp lệ dữ liệu (TC-01, TC-02)
    const validation = validateOpportunityClose({
      result,
      lossReason: result === "LOST" ? (lossReason as LossReason) : undefined,
      reasonDetail,
      competitorName,
    });

    if (!validation.isValid) {
      setValidationErrors(validation.errors);
      return;
    }

    setValidationErrors({});
    setSubmitting(true);

    try {
      const updated = await closeOpportunity(opportunity.id, {
        result,
        lossReason: result === "LOST" ? (lossReason as LossReason) : undefined,
        reasonDetail: reasonDetail.trim() || undefined,
        competitorName: competitorName.trim() || undefined,
      });

      onSuccess(updated);
      onClose();
    } catch (err) {
      const message =
        err instanceof OpportunityApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Không thể ghi nhận kết quả đóng cơ hội.";
      setServerError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" data-testid="opportunity-close-modal">
      <div className="modal-card modal-card--md">
        {/* Modal Header */}
        <div className="modal-header">
          <div className="modal-title">
            <span className="modal-title__icon text-ink-strong">
              {ICONS.target}
            </span>
            <span>Ghi nhận kết quả cơ hội bán hàng</span>
          </div>
          <button
            type="button"
            className="modal-close"
            onClick={onClose}
            title="Đóng modal (Esc)"
            data-testid="btn-close-modal"
          >
            {ICONS.close}
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body space-y-4">
            {/* Tóm tắt thông tin cơ hội */}
            <div className="p-3.5 bg-surface-alt border border-line rounded-md text-sm">
              <div className="font-semibold text-ink-strong mb-1">
                {opportunity.name}
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-muted">
                {opportunity.customerName && (
                  <span>
                    Khách hàng: <strong>{opportunity.customerName}</strong>
                  </span>
                )}
                {opportunity.expectedValue != null && (
                  <span>
                    Giá trị dự kiến:{" "}
                    <strong>
                      {currencyFormatter.format(opportunity.expectedValue)}
                    </strong>
                  </span>
                )}
                <span>
                  Giai đoạn hiện tại:{" "}
                  <span className="font-semibold text-ink-strong">
                    {opportunity.stage === "NEGOTIATION"
                      ? "Thương lượng / Đàm phán (NEGOTIATION)"
                      : opportunity.stage}
                  </span>
                </span>
              </div>
            </div>

            {/* Kiểm tra điều kiện giai đoạn bắt đầu (QTN-06) */}
            {!isEligibleToClose && (
              <div
                className="p-3 bg-pale-red-bg text-pale-red-fg rounded-md text-sm flex items-start gap-2"
                data-testid="ineligible-stage-alert"
              >
                <span className="mt-0.5">{ICONS.alertTriangle}</span>
                <div>
                  <strong>Không thể ghi nhận kết quả:</strong> Cơ hội phải đang
                  ở giai đoạn{" "}
                  <strong>Thương lượng / Đàm phán (NEGOTIATION)</strong> và đang
                  mở để chốt kết quả thắng hoặc thua.
                  {opportunity.status === "CLOSED" &&
                    " Cơ hội này đã đóng và không thể mở lại."}
                </div>
              </div>
            )}

            {/* Lựa chọn kết quả Thắng / Thua */}
            <div>
              <label className="filter-label mb-2 block font-semibold">
                Kết quả chốt cơ hội <span className="text-danger">*</span>
              </label>
              <div
                className="grid grid-cols-2 gap-3"
                data-testid="result-selector"
              >
                {/* Lựa chọn Thắng */}
                <button
                  type="button"
                  className={`p-3.5 border rounded-lg text-left transition-all ${
                    result === "WON"
                      ? "border-success bg-surface shadow-sm ring-1 ring-success"
                      : "border-line bg-surface-alt hover:bg-surface"
                  }`}
                  onClick={() => {
                    setResult("WON");
                    setValidationErrors({});
                  }}
                  data-testid="btn-select-won"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-xs font-bold">
                      ✓
                    </span>
                    <strong className="text-emerald-900 text-sm">
                      Thành công (WON)
                    </strong>
                  </div>
                  <p className="text-xs text-ink-muted">
                    Chốt hợp đồng thành công. Xác suất nâng lên 100%.
                  </p>
                </button>

                {/* Lựa chọn Thua */}
                <button
                  type="button"
                  className={`p-3.5 border rounded-lg text-left transition-all ${
                    result === "LOST"
                      ? "border-danger bg-surface shadow-sm ring-1 ring-danger"
                      : "border-line bg-surface-alt hover:bg-surface"
                  }`}
                  onClick={() => {
                    setResult("LOST");
                    setValidationErrors({});
                  }}
                  data-testid="btn-select-lost"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-5 h-5 rounded-full bg-rose-100 text-rose-800 flex items-center justify-center text-xs font-bold">
                      ✕
                    </span>
                    <strong className="text-rose-900 text-sm">
                      Thất bại (LOST)
                    </strong>
                  </div>
                  <p className="text-xs text-ink-muted">
                    Không chốt được hợp đồng. Bắt buộc ghi nhận lý do.
                  </p>
                </button>
              </div>
            </div>

            {/* Khi chọn Thua (LOST) -> Hiển thị danh sách 7 lý do (TC-01, TC-02) */}
            {result === "LOST" && (
              <div className="space-y-1.5" data-testid="lost-reason-section">
                <label
                  htmlFor="loss-reason-select"
                  className="filter-label block font-semibold"
                >
                  Lý do thất bại <span className="text-danger">*</span>
                </label>
                <select
                  id="loss-reason-select"
                  className={`w-full filter-select ${
                    validationErrors.lossReason ? "border-danger" : ""
                  }`}
                  value={lossReason}
                  onChange={(e) => {
                    setLossReason(e.target.value as LossReason);
                    if (validationErrors.lossReason) {
                      setValidationErrors((prev) => {
                        const next = { ...prev };
                        delete next.lossReason;
                        return next;
                      });
                    }
                  }}
                  data-testid="select-loss-reason"
                >
                  <option value="">
                    -- Chọn lý do cơ hội thất bại (bắt buộc) --
                  </option>
                  {LOSS_REASON_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                {validationErrors.lossReason && (
                  <p
                    className="text-xs text-danger font-medium mt-1"
                    data-testid="loss-reason-error"
                  >
                    {validationErrors.lossReason}
                  </p>
                )}
              </div>
            )}

            {/* Ô nhập đối thủ cạnh tranh */}
            <div className="space-y-1.5">
              <label
                htmlFor="competitor-name-input"
                className="filter-label block"
              >
                Đối thủ cạnh tranh{" "}
                {result === "LOST" ? "(nếu mất vào tay đối thủ)" : "(nếu có)"}:
              </label>
              <input
                id="competitor-name-input"
                type="text"
                className="w-full filter-select"
                value={competitorName}
                onChange={(e) => setCompetitorName(e.target.value)}
                placeholder="Nhập tên công ty / đối thủ cạnh tranh..."
                maxLength={255}
                data-testid="input-competitor-name"
              />
              {validationErrors.competitorName && (
                <p className="text-xs text-danger mt-1">
                  {validationErrors.competitorName}
                </p>
              )}
            </div>

            {/* Ô nhập ghi chú chi tiết */}
            <div className="space-y-1.5">
              <label
                htmlFor="reason-detail-input"
                className="filter-label block"
              >
                Ghi chú chi tiết{" "}
                {result === "LOST"
                  ? "để công ty rút kinh nghiệm"
                  : "về kết quả"}
                :
              </label>
              <textarea
                id="reason-detail-input"
                rows={3}
                className="w-full p-2.5 border border-line rounded-md text-sm focus:border-ink-strong focus:outline-none"
                value={reasonDetail}
                onChange={(e) => setReasonDetail(e.target.value)}
                placeholder={
                  result === "LOST"
                    ? "Ví dụ: Giá cao hơn đối thủ 15%, khách hàng chọn đơn vị cũ..."
                    : "Ví dụ: Khách hàng đánh giá cao phương án triển khai và năng lực đội ngũ..."
                }
                maxLength={500}
                data-testid="textarea-reason-detail"
              />
              <div className="flex justify-between text-xs text-ink-faint">
                <span>
                  {validationErrors.reasonDetail && (
                    <span className="text-danger font-medium">
                      {validationErrors.reasonDetail}
                    </span>
                  )}
                </span>
                <span>{reasonDetail.length}/500</span>
              </div>
            </div>

            {/* Báo lỗi từ máy chủ nếu có */}
            {serverError && (
              <div
                className="p-3 bg-pale-red-bg text-pale-red-fg rounded-md text-sm flex items-center gap-2"
                data-testid="modal-server-error"
              >
                <span>{ICONS.alertTriangle}</span>
                <span>{serverError}</span>
              </div>
            )}
          </div>

          {/* Modal Footer */}
          <div className="modal-footer">
            <button
              type="button"
              className="btn-secondary"
              onClick={onClose}
              disabled={submitting}
              data-testid="btn-cancel-close"
            >
              Hủy
            </button>
            <button
              type="submit"
              className={result === "LOST" ? "btn-danger" : "btn-primary"}
              disabled={!isEligibleToClose || !isSales || submitting}
              data-testid="btn-submit-close-opportunity"
            >
              {submitting
                ? "Đang lưu kết quả..."
                : result === "LOST"
                  ? "Xác nhận cơ hội Thua"
                  : "Xác nhận cơ hội Thắng"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
