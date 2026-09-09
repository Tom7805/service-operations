import { useEffect, useState, type CSSProperties, type FormEvent } from "react";
import { ICONS } from "../../../components/common/icons";
import ModalPortal from '../../../components/common/ModalPortal';
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
  /** Kết quả chọn sẵn khi mở modal — ví dụ bấm "Chốt Thành công (Won)" ở panel
   *  tiến trình thì mở thẳng vào WON thay vì luôn mặc định LOST. */
  initialResult?: 'WON' | 'LOST';
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
  initialResult,
  onClose,
  onSuccess,
}: OpportunityCloseModalProps) {
  const isSales = currentUserRoles.includes("VT-04");

  const [result, setResult] = useState<"WON" | "LOST">(initialResult ?? "LOST");
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
      setResult(initialResult ?? "LOST");
      setLossReason("");
      setCompetitorName("");
      setReasonDetail("");
      setValidationErrors({});
      setServerError(null);
      setSubmitting(false);
    }
  }, [isOpen, initialResult]);

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

  const cardBaseStyle: CSSProperties = {
    padding: "12px 14px",
    border: "1px solid var(--line)",
    borderRadius: "var(--radius-md)",
    background: "var(--surface-alt)",
    textAlign: "left",
    cursor: "pointer",
    transition: "border-color 0.15s var(--ease-out), background 0.15s var(--ease-out)",
  };

  return (
    <ModalPortal>
    <div
      className="modal-backdrop"
      data-testid="opportunity-close-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="opportunity-close-title"
      onClick={(e) => {
        if (e.target === e.currentTarget && !submitting) onClose();
      }}
    >
      <div className="modal-card" style={{ maxWidth: "560px" }}>
        {/* Modal Header */}
        <div className="modal-header">
          <div className="modal-header__title-wrap">
            <h3 id="opportunity-close-title" className="modal-title">
              <span className="modal-title__icon" aria-hidden="true">
                {ICONS.target}
              </span>
              Ghi nhận kết quả cơ hội bán hàng
            </h3>
          </div>
          <button
            type="button"
            className="modal-close"
            onClick={onClose}
            aria-label="Đóng cửa sổ"
            data-testid="btn-close-modal"
          >
            {ICONS.close}
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className="modal-body">
            {/* Tóm tắt thông tin cơ hội */}
            <div
              style={{
                padding: "12px 14px",
                background: "var(--surface-alt)",
                border: "1px solid var(--line)",
                borderRadius: "var(--radius-md)",
                marginBottom: "16px",
              }}
            >
              <div style={{ fontWeight: 600, color: "var(--ink-strong)", marginBottom: "6px" }}>
                {opportunity.name}
              </div>
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  columnGap: "16px",
                  rowGap: "4px",
                  fontSize: "12.5px",
                  color: "var(--ink-muted)",
                }}
              >
                {opportunity.customerName && (
                  <span>
                    Khách hàng: <strong>{opportunity.customerName}</strong>
                  </span>
                )}
                {opportunity.expectedValue != null && (
                  <span>
                    Giá trị dự kiến:{" "}
                    <strong>{currencyFormatter.format(opportunity.expectedValue)}</strong>
                  </span>
                )}
                <span>
                  Giai đoạn hiện tại:{" "}
                  <strong style={{ color: "var(--ink-strong)" }}>
                    {opportunity.stage === "NEGOTIATION"
                      ? "Thương lượng / Đàm phán (NEGOTIATION)"
                      : opportunity.stage}
                  </strong>
                </span>
              </div>
            </div>

            {/* Kiểm tra điều kiện giai đoạn bắt đầu (QTN-06) */}
            {!isEligibleToClose && (
              <div
                className="alert-box alert-box--danger"
                data-testid="ineligible-stage-alert"
                role="alert"
              >
                <span className="alert-box__icon">{ICONS.alertTriangle}</span>
                <div className="alert-box__content">
                  <strong>Không thể ghi nhận kết quả:</strong> Cơ hội phải đang ở
                  giai đoạn <strong>Thương lượng / Đàm phán (NEGOTIATION)</strong>{" "}
                  và đang mở để chốt kết quả thắng hoặc thua.
                  {opportunity.status === "CLOSED" &&
                    " Cơ hội này đã đóng và không thể mở lại."}
                </div>
              </div>
            )}

            {/* Lựa chọn kết quả Thắng / Thua */}
            <div style={{ marginBottom: "16px" }}>
              <label className="form-label" style={{ display: "block", marginBottom: "8px" }}>
                Kết quả chốt cơ hội <span className="req">*</span>
              </label>
              <div
                data-testid="result-selector"
                style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}
              >
                {/* Lựa chọn Thắng */}
                <button
                  type="button"
                  onClick={() => {
                    setResult("WON");
                    setValidationErrors({});
                  }}
                  data-testid="btn-select-won"
                  style={{
                    ...cardBaseStyle,
                    borderColor: result === "WON" ? "var(--pale-green-fg)" : "var(--line)",
                    background: result === "WON" ? "var(--pale-green-bg)" : "var(--surface-alt)",
                  }}
                >
                  <strong
                    style={{
                      display: "block",
                      fontSize: "13.5px",
                      color: "var(--pale-green-fg)",
                      marginBottom: "4px",
                    }}
                  >
                    Thành công (WON)
                  </strong>
                  <span style={{ fontSize: "12px", color: "var(--ink-muted)" }}>
                    Chốt hợp đồng thành công. Xác suất nâng lên 100%.
                  </span>
                </button>

                {/* Lựa chọn Thua */}
                <button
                  type="button"
                  onClick={() => {
                    setResult("LOST");
                    setValidationErrors({});
                  }}
                  data-testid="btn-select-lost"
                  style={{
                    ...cardBaseStyle,
                    borderColor: result === "LOST" ? "var(--pale-red-fg)" : "var(--line)",
                    background: result === "LOST" ? "var(--pale-red-bg)" : "var(--surface-alt)",
                  }}
                >
                  <strong
                    style={{
                      display: "block",
                      fontSize: "13.5px",
                      color: "var(--pale-red-fg)",
                      marginBottom: "4px",
                    }}
                  >
                    Thất bại (LOST)
                  </strong>
                  <span style={{ fontSize: "12px", color: "var(--ink-muted)" }}>
                    Không chốt được hợp đồng. Bắt buộc ghi nhận lý do.
                  </span>
                </button>
              </div>
            </div>

            {/* Khi chọn Thua (LOST) -> Hiển thị danh sách 7 lý do (TC-01, TC-02) */}
            {result === "LOST" && (
              <div style={{ marginBottom: "16px" }} data-testid="lost-reason-section">
                <label
                  htmlFor="loss-reason-select"
                  className="form-label"
                  style={{ display: "block", marginBottom: "6px" }}
                >
                  Lý do thất bại <span className="req">*</span>
                </label>
                <select
                  id="loss-reason-select"
                  className={`form-select ${validationErrors.lossReason ? "form-input--error" : ""}`}
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
                  <span
                    className="field-error"
                    role="alert"
                    data-testid="loss-reason-error"
                  >
                    {validationErrors.lossReason}
                  </span>
                )}
              </div>
            )}

            {/* Ô nhập đối thủ cạnh tranh */}
            <div style={{ marginBottom: "16px" }}>
              <label
                htmlFor="competitor-name-input"
                className="form-label"
                style={{ display: "block", marginBottom: "6px" }}
              >
                Đối thủ cạnh tranh{" "}
                {result === "LOST" ? "(nếu mất vào tay đối thủ)" : "(nếu có)"}:
              </label>
              <input
                id="competitor-name-input"
                type="text"
                className={`form-input ${validationErrors.competitorName ? "form-input--error" : ""}`}
                value={competitorName}
                onChange={(e) => setCompetitorName(e.target.value)}
                placeholder="Nhập tên công ty / đối thủ cạnh tranh..."
                maxLength={255}
                data-testid="input-competitor-name"
              />
              {validationErrors.competitorName && (
                <span className="field-error" role="alert">
                  {validationErrors.competitorName}
                </span>
              )}
            </div>

            {/* Ô nhập ghi chú chi tiết */}
            <div style={{ marginBottom: "4px" }}>
              <label
                htmlFor="reason-detail-input"
                className="form-label"
                style={{ display: "block", marginBottom: "6px" }}
              >
                Ghi chú chi tiết{" "}
                {result === "LOST" ? "để công ty rút kinh nghiệm" : "về kết quả"}:
              </label>
              <textarea
                id="reason-detail-input"
                rows={3}
                className="form-textarea"
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
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "12px",
                  color: "var(--ink-muted)",
                  marginTop: "4px",
                }}
              >
                <span>
                  {validationErrors.reasonDetail && (
                    <span className="field-error" style={{ margin: 0 }} role="alert">
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
                className="alert-box alert-box--danger"
                data-testid="modal-server-error"
                role="alert"
                style={{ marginTop: "16px", marginBottom: 0 }}
              >
                <span className="alert-box__icon">{ICONS.alertTriangle}</span>
                <span className="alert-box__content">{serverError}</span>
              </div>
            )}
          </div>

          {/* Modal Footer */}
          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={submitting}
              data-testid="btn-cancel-close"
            >
              Hủy
            </button>
            <button
              type="submit"
              className={`btn btn-primary ${result === "LOST" ? "btn-danger" : ""}`}
              disabled={!isEligibleToClose || !isSales || submitting}
              data-testid="btn-submit-close-opportunity"
              style={{ minWidth: "180px" }}
            >
              {submitting ? (
                <>
                  <span className="spinner-sm" aria-hidden="true" />
                  <span>Đang lưu kết quả...</span>
                </>
              ) : result === "LOST" ? (
                "Xác nhận cơ hội Thua"
              ) : (
                "Xác nhận cơ hội Thắng"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
    </ModalPortal>
  );
}
