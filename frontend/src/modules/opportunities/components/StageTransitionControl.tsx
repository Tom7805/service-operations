import { useState, useEffect, useCallback } from 'react';
import type {
  Opportunity,
  OpportunityStage,
  StageHistoryItem,
} from '../types/opportunityTypes';
import {
  STAGE_CONFIGS,
  ACTIVE_STAGES_ORDER,
  LOSS_REASON_OPTIONS,
} from '../types/opportunityTypes';
import {
  canTransitionStage,
  getNextAllowedStages,
} from '../validators/opportunityValidators';
import {
  changeOpportunityStage,
  fetchOpportunityStageHistory,
  OpportunityApiError,
} from '../api/opportunitiesApi';
import { ICONS } from '../../../components/common/icons';

interface StageTransitionControlProps {
  opportunity: Opportunity;
  onOpportunityUpdated?: (updated: Opportunity) => void;
  currentUserRoles?: string[];
  /** NCL-03-CN-005: chốt Thắng/Thua luôn phải đi qua màn "Ghi nhận kết quả"
   *  (bắt buộc nhập lý do khi Thua — QTN-06) thay vì tự đổi giai đoạn ở đây,
   *  nên khi bấm "Đóng Thất bại"/"Chốt Thành công" chỉ báo lên trang cha để
   *  mở đúng modal đó, không tự gọi API đổi giai đoạn nữa. */
  onRequestClose?: (result: 'WON' | 'LOST') => void;
}

/** NCL-03-CN-005 — nhãn tiếng Việt cho lý do thua đã lưu của cơ hội. */
function lossReasonLabel(reason?: string | null): string | null {
  if (!reason) return null;
  return LOSS_REASON_OPTIONS.find((o) => o.value === reason)?.label ?? reason;
}

export default function StageTransitionControl({
  opportunity,
  onOpportunityUpdated,
  currentUserRoles = ['VT-04'],
  onRequestClose,
}: StageTransitionControlProps) {
  const isAllowedRole = currentUserRoles.includes('VT-04');
  const isClosed = opportunity.status === 'CLOSED' || opportunity.stage === 'WON' || opportunity.stage === 'LOST';

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // Lịch sử chuyển giai đoạn (TC-05)
  const [showHistory, setShowHistory] = useState(false);
  const [historyItems, setHistoryItems] = useState<StageHistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const loadHistory = useCallback(async () => {
    if (!opportunity.id) return;
    setLoadingHistory(true);
    try {
      const data = await fetchOpportunityStageHistory(opportunity.id);
      setHistoryItems(data);
    } catch {
      // Bỏ qua lỗi âm thầm khi tải lịch sử
    } finally {
      setLoadingHistory(false);
    }
  }, [opportunity.id]);

  useEffect(() => {
    if (showHistory) {
      loadHistory();
    }
  }, [showHistory, loadHistory]);

  const handleTransition = async (targetStage: OpportunityStage) => {
    setErrorMessage(null);
    setSuccessNotice(null);

    // Kiểm tra client-side rule
    const check = canTransitionStage(opportunity.stage, targetStage, opportunity.status);
    if (!check.allowed) {
      setErrorMessage(check.reason || 'Chuyển giai đoạn không hợp lệ');
      return;
    }

    setLoading(true);
    try {
      const updated = await changeOpportunityStage(opportunity.id, targetStage);
      setSuccessNotice(
        `Đã chuyển giai đoạn sang "${STAGE_CONFIGS[targetStage]?.shortLabel}" (xác suất ${updated.probability}%).`
      );
      if (onOpportunityUpdated) {
        onOpportunityUpdated(updated);
      }
      if (showHistory) {
        loadHistory();
      }
    } catch (err) {
      if (err instanceof OpportunityApiError) {
        setErrorMessage(err.message);
      } else if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Không thể cập nhật giai đoạn cơ hội. Vui lòng thử lại.');
      }
    } finally {
      setLoading(false);
    }
  };

  const nextStages = getNextAllowedStages(opportunity.stage, opportunity.status);

  const formatDateTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return isNaN(d.getTime()) ? dateStr : d.toLocaleString('vi-VN');
    } catch {
      return dateStr;
    }
  };

  const getStageDisplay = (stageKey?: string | null) => {
    if (!stageKey) return 'Khởi tạo ban đầu';
    return STAGE_CONFIGS[stageKey as OpportunityStage]?.shortLabel ?? stageKey;
  };

  return (
    <div
      className="stage-transition-card"
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--line)',
        borderRadius: 'var(--radius-lg)',
        padding: '20px 24px',
        marginBottom: '20px',
      }}
    >
      {/* Tiêu đề thanh tiến trình */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div>
          <div
            style={{
              fontFamily: 'var(--font-mono, monospace)',
              fontSize: '11px',
              fontWeight: 500,
              textTransform: 'uppercase',
              letterSpacing: 'var(--track-caps)',
              color: 'var(--ink-muted)',
              marginBottom: '4px',
            }}
          >
            Tiến trình bán hàng & Xác suất thành công
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '16px', fontWeight: 600, color: 'var(--ink-strong)' }}>
              Giai đoạn: {STAGE_CONFIGS[opportunity.stage as OpportunityStage]?.label ?? opportunity.stage}
            </span>
            <span
              style={{
                fontFamily: 'var(--font-mono, monospace)',
                fontSize: '12px',
                fontWeight: 600,
                padding: '2px 8px',
                borderRadius: '999px',
                background:
                  opportunity.stage === 'WON'
                    ? 'var(--pale-green-bg)'
                    : opportunity.stage === 'LOST'
                    ? 'var(--pale-red-bg)'
                    : 'var(--pale-blue-bg)',
                color:
                  opportunity.stage === 'WON'
                    ? 'var(--pale-green-fg)'
                    : opportunity.stage === 'LOST'
                    ? 'var(--pale-red-fg)'
                    : 'var(--pale-blue-fg)',
              }}
            >
              {opportunity.probability}% xác suất
            </span>
          </div>

          {/* Trước đây "còn bao nhiêu ngày ở giai đoạn" và "lý do thua" bị rải rác
              trong bảng danh sách (mỗi hàng một dòng phụ), gây rối mắt và trùng lặp.
              Gom cả hai về đúng MỘT nơi — ngay dưới nhãn giai đoạn/xác suất của cơ
              hội đang được điều khiển — để xem đủ mà không làm rối bảng bên dưới. */}
          {opportunity.status !== 'CLOSED' && opportunity.daysInCurrentStage != null && (() => {
            const threshold = opportunity.stalledThresholdDays ?? 60;
            const days = opportunity.daysInCurrentStage;
            const ratio = days / threshold;
            const color =
              ratio >= 1 ? 'var(--pale-red-fg)' : ratio >= 0.75 ? 'var(--pale-yellow-fg)' : 'var(--ink-muted)';
            const label = ratio >= 1 ? 'Đã quá hạn xử lý' : ratio >= 0.75 ? 'Sắp quá hạn xử lý' : 'Đã đứng ở giai đoạn này';
            return (
              <div
                style={{
                  marginTop: '6px', fontSize: '12.5px', fontWeight: ratio >= 0.75 ? 700 : 500,
                  color, fontFamily: 'var(--font-mono, monospace)',
                }}
              >
                {label}: {days}/{threshold} ngày
              </div>
            );
          })()}

          {opportunity.stage === 'LOST' && (opportunity.lossReason || opportunity.competitorName) && (
            <div style={{ marginTop: '6px', fontSize: '12.5px', color: 'var(--pale-red-fg)' }}>
              Lý do thua: {lossReasonLabel(opportunity.lossReason)}
              {opportunity.competitorName ? ` · Đối thủ: ${opportunity.competitorName}` : ''}
            </div>
          )}
        </div>

        {/* Nút xem lịch sử chuyển đổi */}
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => setShowHistory((v) => !v)}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}
        >
          <span className="icon-sm">{ICONS.history}</span>
          <span>{showHistory ? 'Ẩn lịch sử' : 'Lịch sử giai đoạn'}</span>
        </button>
      </div>

      {/* Thông báo lỗi nếu có */}
      {errorMessage && (
        <div
          className="alert-box alert-box--danger"
          role="alert"
          style={{
            marginBottom: '16px',
            padding: '10px 14px',
            background: 'var(--pale-red-bg)',
            color: 'var(--pale-red-fg)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid rgba(159, 47, 45, 0.2)',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '8px',
            fontSize: '13.5px',
          }}
        >
          <span style={{ flexShrink: 0, marginTop: '2px' }}>{ICONS.alertTriangle}</span>
          <div>
            <strong>Không thể chuyển giai đoạn:</strong> {errorMessage}
          </div>
        </div>
      )}

      {/* Thông báo thành công */}
      {successNotice && (
        <div
          role="status"
          style={{
            marginBottom: '16px',
            padding: '10px 14px',
            background: 'var(--pale-green-bg)',
            color: 'var(--pale-green-fg)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid rgba(52, 101, 56, 0.2)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '13.5px',
          }}
        >
          <span>{ICONS.checkCircle}</span>
          <span>{successNotice}</span>
        </div>
      )}

      {/* Thanh Stepper giai đoạn chuẩn Design System */}
      <div
        className="stage-stepper"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '8px',
          marginBottom: '20px',
        }}
      >
        {ACTIVE_STAGES_ORDER.map((stageKey, idx) => {
          const config = STAGE_CONFIGS[stageKey];
          const currentIdx = ACTIVE_STAGES_ORDER.indexOf(opportunity.stage as OpportunityStage);
          const isCurrent = opportunity.stage === stageKey;
          const isPassed = currentIdx > idx || opportunity.stage === 'WON' || opportunity.stage === 'LOST';

          return (
            <div
              key={stageKey}
              style={{
                border: isCurrent
                  ? '2px solid var(--ink-strong)'
                  : isPassed
                  ? '1px solid var(--line)'
                  : '1px solid var(--line)',
                borderRadius: 'var(--radius-md)',
                padding: '10px 12px',
                background: isCurrent
                  ? 'var(--surface)'
                  : isPassed
                  ? 'var(--surface-alt)'
                  : 'var(--surface-sunken)',
                opacity: !isPassed && !isCurrent ? 0.65 : 1,
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span
                  style={{
                    fontFamily: 'var(--font-mono, monospace)',
                    fontSize: '11px',
                    color: isCurrent ? 'var(--ink-strong)' : 'var(--ink-muted)',
                    fontWeight: 600,
                  }}
                >
                  Bước {idx + 1}
                </span>
                {isPassed && !isCurrent ? (
                  <span style={{ color: 'var(--pale-green-fg)', display: 'flex' }}>{ICONS.check}</span>
                ) : isCurrent ? (
                  <span
                    style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: 'var(--ink-strong)',
                    }}
                  />
                ) : null}
              </div>
              <div
                style={{
                  fontSize: '13.5px',
                  fontWeight: isCurrent ? 700 : 500,
                  color: isCurrent ? 'var(--ink-strong)' : 'var(--ink)',
                }}
              >
                {config.shortLabel}
              </div>
              <div
                style={{
                  fontFamily: 'var(--font-mono, monospace)',
                  fontSize: '11px',
                  color: 'var(--ink-muted)',
                }}
              >
                {config.defaultProbability}% xác suất
              </div>
            </div>
          );
        })}

        {/* Cột thứ 4: Kết quả chốt (WON / LOST) */}
        <div
          style={{
            border:
              opportunity.stage === 'WON'
                ? '2px solid var(--pale-green-fg)'
                : opportunity.stage === 'LOST'
                ? '2px solid var(--pale-red-fg)'
                : '1px dashed var(--line)',
            borderRadius: 'var(--radius-md)',
            padding: '10px 12px',
            background:
              opportunity.stage === 'WON'
                ? 'var(--pale-green-bg)'
                : opportunity.stage === 'LOST'
                ? 'var(--pale-red-bg)'
                : 'var(--surface-sunken)',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span
              style={{
                fontFamily: 'var(--font-mono, monospace)',
                fontSize: '11px',
                color:
                  opportunity.stage === 'WON'
                    ? 'var(--pale-green-fg)'
                    : opportunity.stage === 'LOST'
                    ? 'var(--pale-red-fg)'
                    : 'var(--ink-muted)',
                fontWeight: 600,
              }}
            >
              Chốt kết quả
            </span>
            {isClosed && (
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  color: opportunity.stage === 'WON' ? 'var(--pale-green-fg)' : 'var(--pale-red-fg)',
                }}
              >
                {opportunity.stage === 'WON' ? 'Thành công' : 'Thất bại'}
              </span>
            )}
          </div>
          <div
            style={{
              fontSize: '13.5px',
              fontWeight: isClosed ? 700 : 500,
              color:
                opportunity.stage === 'WON'
                  ? 'var(--pale-green-fg)'
                  : opportunity.stage === 'LOST'
                  ? 'var(--pale-red-fg)'
                  : 'var(--ink-muted)',
            }}
          >
            {opportunity.stage === 'WON'
              ? 'WON (100%)'
              : opportunity.stage === 'LOST'
              ? 'LOST (0%)'
              : 'Won / Lost'}
          </div>
          <div
            style={{
              fontFamily: 'var(--font-mono, monospace)',
              fontSize: '11px',
              color: 'var(--ink-muted)',
            }}
          >
            {isClosed ? 'Đã đóng hồ sơ' : 'Chốt từ Đàm phán'}
          </div>
        </div>
      </div>

      {/* Vùng hành động chuyển giai đoạn */}
      <div
        style={{
          borderTop: '1px solid var(--line)',
          paddingTop: '16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div style={{ fontSize: '13.5px', color: 'var(--ink-soft)' }}>
          {isClosed ? (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--ink-muted)' }}>
              <span>{ICONS.lock}</span>
              <span>Cơ hội đã đóng. Quy tắc hệ thống không cho phép chuyển tiếp.</span>
            </span>
          ) : !isAllowedRole ? (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--ink-muted)' }}>
              <span>{ICONS.lock}</span>
              <span>Chức năng chuyển giai đoạn yêu cầu vai trò Nhân viên kinh doanh.</span>
            </span>
          ) : (
            <span>
              Quy tắc: Chỉ được chuyển tuần tự sang bước kế tiếp liền kề, không nhảy cóc hay chuyển lùi.
            </span>
          )}
        </div>

        {/* Nhóm nút bấm chuyển giai đoạn */}
        {isAllowedRole && !isClosed && (
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            {opportunity.stage === 'APPROACH' && (
              <button
                type="button"
                className="btn btn-primary"
                disabled={loading}
                onClick={() => handleTransition('PROPOSAL')}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
              >
                {loading ? (
                  <span className="spinner-sm" aria-hidden="true" />
                ) : (
                  <span className="icon-sm">{ICONS.arrowRight}</span>
                )}
                <span>Chuyển sang Đề xuất (40%)</span>
              </button>
            )}

            {opportunity.stage === 'PROPOSAL' && (
              <button
                type="button"
                className="btn btn-primary"
                disabled={loading}
                onClick={() => handleTransition('NEGOTIATION')}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
              >
                {loading ? (
                  <span className="spinner-sm" aria-hidden="true" />
                ) : (
                  <span className="icon-sm">{ICONS.arrowRight}</span>
                )}
                <span>Chuyển sang Đàm phán (70%)</span>
              </button>
            )}

            {opportunity.stage === 'NEGOTIATION' && (
              <>
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={loading}
                  onClick={() => onRequestClose?.('LOST')}
                  style={{
                    color: 'var(--pale-red-fg)',
                    borderColor: 'rgba(159, 47, 45, 0.3)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <span className="icon-sm">{ICONS.close}</span>
                  <span>Đóng Thất bại (Lost)</span>
                </button>

                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={loading}
                  onClick={() => onRequestClose?.('WON')}
                  style={{
                    background: '#1F6C9F',
                    borderColor: '#1F6C9F',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <span className="icon-sm">{ICONS.checkCircle}</span>
                  <span>Chốt Thành công (Won)</span>
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Panel lịch sử chuyển giai đoạn (TC-05) */}
      {showHistory && (
        <div
          className="stage-history-panel"
          style={{
            marginTop: '20px',
            paddingTop: '16px',
            borderTop: '1px solid var(--line)',
          }}
        >
          <div
            style={{
              fontFamily: 'var(--font-mono, monospace)',
              fontSize: '11px',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: 'var(--track-caps)',
              color: 'var(--ink-muted)',
              marginBottom: '12px',
            }}
          >
            Nhật ký các lần chuyển giai đoạn
          </div>

          {loadingHistory ? (
            <div style={{ padding: '16px', color: 'var(--ink-muted)', fontSize: '13.5px' }}>
              Đang tải lịch sử chuyển đổi...
            </div>
          ) : historyItems.length === 0 ? (
            <div style={{ padding: '16px', color: 'var(--ink-muted)', fontSize: '13.5px' }}>
              Chưa có bản ghi lịch sử chuyển giai đoạn nào.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {historyItems.map((item, i) => (
                <div
                  key={item.id || i}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    background: 'var(--surface-alt)',
                    border: '1px solid var(--line)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '13px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ color: 'var(--ink-muted)' }}>{ICONS.clock}</span>
                    <span>
                      {item.fromStage ? (
                        <>
                          <span style={{ color: 'var(--ink-soft)' }}>{getStageDisplay(item.fromStage)}</span>
                          <span style={{ margin: '0 6px', color: 'var(--ink-muted)' }}>→</span>
                          <strong style={{ color: 'var(--ink-strong)' }}>{getStageDisplay(item.toStage)}</strong>
                        </>
                      ) : (
                        <>
                          <span style={{ color: 'var(--ink-muted)' }}>Khởi tạo ban đầu: </span>
                          <strong style={{ color: 'var(--ink-strong)' }}>{getStageDisplay(item.toStage)}</strong>
                        </>
                      )}
                    </span>
                    {item.changedByUsername && (
                      <span
                        style={{
                          fontSize: '11.5px',
                          color: 'var(--ink-muted)',
                          marginLeft: '8px',
                        }}
                      >
                        bởi @{item.changedByUsername}
                      </span>
                    )}
                  </div>
                  <div
                    style={{
                      fontFamily: 'var(--font-mono, monospace)',
                      fontSize: '12px',
                      color: 'var(--ink-muted)',
                    }}
                  >
                    {formatDateTime(item.changedAt)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
