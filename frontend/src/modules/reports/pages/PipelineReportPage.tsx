import { useCallback, useEffect, useState } from 'react';
import { getPipelineReport, ReportsApiError } from '../api/reportsApi';
import type { PipelineReportRes, PipelineStageRes } from '../types/pipelineReportTypes';
import { STAGE_CONFIGS, type OpportunityStage } from '../../opportunities/types/opportunityTypes';
import { fetchOpportunities } from '../../opportunities/api/opportunitiesApi';
import { ICONS } from '../../../components/common/icons';

interface PipelineReportPageProps {
  currentUserRoles?: string[];
  currentUserName?: string;
  /** Mở cơ hội đọng lâu ngay tại "Cơ hội bán hàng" để xử lý (chuyển giai đoạn,
   *  chốt kết quả...) — trước đây báo cáo chỉ in ra "ID: 2001, 2002" trần trụi,
   *  không có cách nào bấm vào để thao tác tiếp. */
  onViewOpportunity?: (opportunityId: number, opportunityName: string) => void;
}

const currencyFormatter = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0,
});

function formatVND(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return '0 ₫';
  return currencyFormatter.format(value);
}

/** Nhãn tiếng Việt cho từng giai đoạn — dùng chung một nguồn với màn "Cơ hội
 *  bán hàng" (STAGE_CONFIGS) để hai nơi không lệch cách gọi tên. */
function stageLabel(stage: string): string {
  return STAGE_CONFIGS[stage as OpportunityStage]?.shortLabel ?? stage;
}

/**
 * Màu có CHỦ ĐÍCH ngữ nghĩa thay vì tô mỗi giai đoạn một màu cầu vồng tùy
 * tiện (5 màu pastel khác nhau chỉ để phân biệt là kiểu biểu đồ mặc định của
 * AI, không mang ý nghĩa gì). Ở đây:
 *  - 3 giai đoạn còn đang xử lý (Tiếp cận → Đề xuất → Đàm phán) dùng MỘT thang
 *    xám đậm dần — càng đi sâu vào đường ống, khối càng đậm, gợi đúng ý "cơ
 *    hội càng chắc chắn hơn" mà không cần thêm màu mới.
 *  - Chỉ 2 màu thật sự mang nghĩa: xanh lá cho kết quả THẮNG, đỏ cho kết quả
 *    THUA — đúng tinh thần "một điểm nhấn màu, dùng đúng lúc" thay vì tô màu
 *    khắp nơi.
 */
const STAGE_TONE: Record<string, { bg: string; fg: string; dot: string }> = {
  APPROACH: { bg: '#F1F0EE', fg: 'var(--ink-muted)', dot: '#C9C6BF' },
  PROPOSAL: { bg: '#E2DFDA', fg: 'var(--ink)', dot: '#A6A29A' },
  NEGOTIATION: { bg: '#C9C5BC', fg: 'var(--ink-strong)', dot: '#7A756B' },
  WON: { bg: 'var(--pale-green-bg)', fg: 'var(--pale-green-fg)', dot: '#346538' },
  LOST: { bg: 'var(--pale-red-bg)', fg: 'var(--pale-red-fg)', dot: '#9F2F2D' },
};

function stageTone(stage: string): { bg: string; fg: string; dot: string } {
  return STAGE_TONE[stage] ?? { bg: '#F1F0EE', fg: 'var(--ink-muted)', dot: '#C9C6BF' };
}

export default function PipelineReportPage({
  currentUserRoles = ['VT-01'],
  onViewOpportunity,
}: PipelineReportPageProps) {
  // NCL-03-CN-007-TC-03: chỉ Ban giám đốc (VT-01) hoặc Nhân viên kinh doanh (VT-04) được xem báo cáo
  const isAllowed = currentUserRoles.includes('VT-01') || currentUserRoles.includes('VT-04');

  const [data, setData] = useState<PipelineReportRes | null>(null);
  const [loading, setLoading] = useState(isAllowed);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** Báo cáo đường ống chỉ trả về ID cơ hội đọng lâu, không có tên — tra thêm
   *  một lần danh sách cơ hội để đổi ID thành tên thật, hiển thị được và bấm
   *  thao tác được thay vì in ra một dãy số vô nghĩa với người dùng. */
  const [opportunityNames, setOpportunityNames] = useState<Record<number, string>>({});

  const load = useCallback(
    async (isManualRefresh = false) => {
      if (!isAllowed) return;
      if (isManualRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      try {
        const res = await getPipelineReport();
        setData(res);
      } catch (err) {
        const message =
          err instanceof ReportsApiError
            ? err.message
            : err instanceof Error
            ? err.message
            : 'Đã có lỗi khi tải báo cáo.';
        setError(message);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [isAllowed]
  );

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!isAllowed) return;
    let cancelled = false;
    fetchOpportunities()
      .then((list) => {
        if (cancelled) return;
        const map: Record<number, string> = {};
        list.forEach((o) => {
          map[o.id] = o.name;
        });
        setOpportunityNames(map);
      })
      .catch(() => {
        // Tra tên chỉ để hiển thị đẹp hơn — tra không được thì rơi về hiển thị "Cơ hội #id".
      });
    return () => {
      cancelled = true;
    };
  }, [isAllowed]);

  function opportunityLabel(id: number): string {
    return opportunityNames[id] ?? `Cơ hội #${id}`;
  }

  /** Bấm cờ "X đọng lâu" ngay trên dải chỉ số thì cuộn xuống đúng nhóm cơ hội
   *  tương ứng trong khối cảnh báo phía trên và nháy nền một nhịp để dễ nhận ra
   *  — thay vì chỉ là một nhãn tĩnh không thao tác được gì thêm. */
  const [flashedStage, setFlashedStage] = useState<string | null>(null);
  function jumpToStalledGroup(stage: string) {
    const el = document.getElementById(`stalled-group-${stage}`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setFlashedStage(stage);
    window.setTimeout(() => setFlashedStage((prev) => (prev === stage ? null : prev)), 1200);
  }

  if (!isAllowed) {
    return (
      <div className="access-denied-container" data-testid="pipeline-report-access-denied">
        <div className="access-denied-card">
          <div className="access-denied-icon">{ICONS.shieldOff}</div>
          <h2>Bạn không có thẩm quyền truy cập màn hình này</h2>
          <p>
            Báo cáo đường ống bán hàng theo giai đoạn chỉ dành riêng cho vai trò{' '}
            <strong>Ban giám đốc</strong> hoặc <strong>Nhân viên kinh doanh</strong>.
          </p>
        </div>
      </div>
    );
  }

  const stages: PipelineStageRes[] = data?.stages ?? [];
  const stalledStages = stages.filter((s) => s.stalledCount > 0);
  const totalStalledCount = stalledStages.reduce((sum, s) => sum + s.stalledCount, 0);

  return (
    <div className="user-management-page" data-testid="pipeline-report-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Báo cáo đường ống bán hàng theo giai đoạn</h1>
          <p className="page-subtitle">Số cơ hội và giá trị dự kiến theo từng giai đoạn, kèm cảnh báo quá hạn xử lý.</p>
        </div>
        <div className="page-header__actions">
          {data && (
            <span className="pipeline-generated-at">
              Cập nhật lúc {new Date(data.generatedAt).toLocaleString('vi-VN')}
            </span>
          )}
          <button
            type="button"
            className="btn-primary"
            onClick={() => load(true)}
            disabled={loading || refreshing}
            data-testid="btn-refresh-pipeline"
          >
            {refreshing ? <span className="spinner-sm" aria-hidden="true" /> : ICONS.refresh}{' '}
            {refreshing ? 'Đang tải lại...' : 'Làm mới báo cáo'}
          </button>
        </div>
      </div>

      {error && (
        <div className="alert-box alert-box--danger" style={{ justifyContent: 'space-between' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {ICONS.alertTriangle} {error}
          </span>
          <button type="button" className="btn-secondary" onClick={() => load()}>
            Thử lại
          </button>
        </div>
      )}

      {loading ? (
        <div className="forecast-loading-state" data-testid="pipeline-loading-state">
          <span className="spinner-lg" aria-hidden="true" />
          <p>Đang tính toán báo cáo đường ống bán hàng...</p>
        </div>
      ) : data ? (
        <>
          {/* Thẻ chỉ số tổng quan */}
          <div className="stats-grid" data-testid="pipeline-kpi-grid">
            <div className="stat-card">
              <span className="stat-card__label">
                <span className="stat-card__icon stat-card__icon--blue">{ICONS.briefcase}</span>
                Tổng cơ hội
              </span>
              <span className="stat-card__value">{data.totalOpportunityCount.toLocaleString('vi-VN')}</span>
            </div>
            <div className="stat-card">
              <span className="stat-card__label">
                <span className="stat-card__icon stat-card__icon--green">{ICONS.money}</span>
                Tổng giá trị dự kiến
              </span>
              <span className="stat-card__value text-success">{formatVND(data.totalExpectedValue)}</span>
            </div>
            <div className="stat-card">
              <span className="stat-card__label">
                <span className="stat-card__icon stat-card__icon--amber">{ICONS.alertTriangle}</span>
                Ngưỡng cảnh báo quá hạn
              </span>
              <span className="stat-card__value">{data.stalledThresholdDays} ngày</span>
            </div>
          </div>

          {/* Cơ hội quá hạn xử lý, nếu có — dựng thành thẻ trắng cùng ngôn ngữ thiết
              kế với các khối khác trên trang (viền 1px + bo góc, không đổ màu vàng
              tràn cả khối như alert-box mặc định) để đồng bộ toàn trang; màu vàng
              chỉ còn dùng cho icon và số đếm — đúng tinh thần "một điểm nhấn màu,
              dùng đúng lúc". Mỗi cơ hội là một chip bấm được (tên thật, không phải
              ID kỹ thuật) để mở thẳng ra "Cơ hội bán hàng" và xử lý tiếp. */}
          {stalledStages.length > 0 && (
            <div className="user-table-card pipeline-stalled-card" data-testid="pipeline-stalled-warning">
              <div className="pipeline-stalled-card__head">
                <span className="pipeline-stalled-card__icon">{ICONS.alertTriangle}</span>
                <div className="pipeline-stalled-card__heading">
                  <h2 className="pipeline-stalled-card__title">Cơ hội quá hạn xử lý</h2>
                  <p className="pipeline-stalled-card__subtitle">
                    Đứng quá {data.stalledThresholdDays} ngày ở cùng một giai đoạn — nên ưu tiên xử lý trước.
                  </p>
                </div>
                <span className="pipeline-stalled-card__count">{totalStalledCount}</span>
              </div>

              <div className="pipeline-stalled-groups">
                {stalledStages.map((s) => {
                  const tone = stageTone(s.stage);
                  return (
                    <div
                      key={s.stage}
                      id={`stalled-group-${s.stage}`}
                      className={`pipeline-stalled-group${flashedStage === s.stage ? ' pipeline-stalled-group--flash' : ''}`}
                    >
                      <div className="pipeline-stalled-group__head">
                        <span className="pipeline-share-legend__dot" style={{ background: tone.dot }} />
                        <strong>{stageLabel(s.stage)}</strong>
                        <span className="pipeline-stalled-group__count">{s.stalledCount} quá hạn</span>
                      </div>
                      <div className="pipeline-stalled-chip-row">
                        {s.stalledOpportunityIds.map((id) => (
                          <button
                            key={id}
                            type="button"
                            className="pipeline-stalled-chip"
                            onClick={() => onViewOpportunity?.(id, opportunityLabel(id))}
                            disabled={!onViewOpportunity}
                          >
                            {opportunityLabel(id)}
                            {onViewOpportunity && <span aria-hidden="true">{ICONS.arrowRight}</span>}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Đường ống theo giai đoạn — cố ý KHÔNG dựng thành 5 khối pastel cầu vồng
              (khuôn mẫu biểu đồ mặc định, cũng trùng cấu trúc pill-màu đã dùng ở
              khắp nơi khác trong app). Thay bằng dải chỉ số lấy con số làm trọng
              tâm (kiểu bảng chỉ số Stripe/Linear), ngăn cách bằng vạch dọc thay vì
              khung hộp riêng từng ô, và MỘT thanh tỷ trọng gộp duy nhất bên dưới —
              màu chỉ dùng khi thật sự mang nghĩa (xám đậm dần = càng chắc chắn,
              xanh lá = thắng, đỏ = thua), không tô ngẫu nhiên cho đủ 5 màu. */}
          <div className="user-table-card" data-testid="pipeline-funnel-chart">
            <div className="pipeline-flow-card">
              <div className="pipeline-flow-card__head">
                <h2 className="pipeline-flow-card__title">Số cơ hội theo giai đoạn</h2>
                <p className="pipeline-flow-card__subtitle">
                  Đậm dần từ trái sang phải theo mức độ cơ hội đã tiến sâu vào đường ống
                </p>
              </div>

              <div className="pipeline-flow">
                {stages.map((s, i) => {
                  const tone = stageTone(s.stage);
                  return (
                    <div key={s.stage} className="pipeline-flow__item-wrap">
                      <div className="pipeline-flow__item" data-testid={`pipeline-stage-row-${s.stage}`}>
                        {s.stalledCount > 0 && (
                          <button
                            type="button"
                            className="pipeline-flow__badge"
                            onClick={() => jumpToStalledGroup(s.stage)}
                            title={`${s.stalledCount} cơ hội quá hạn xử lý ở giai đoạn này — bấm để xem`}
                          >
                            {ICONS.alertTriangle} Quá hạn {s.stalledCount}
                          </button>
                        )}
                        <span className="pipeline-flow__label">{stageLabel(s.stage)}</span>
                        <span className="pipeline-flow__number" style={{ color: tone.fg }}>
                          {s.opportunityCount}
                        </span>
                        <span className="pipeline-flow__value">{formatVND(s.totalExpectedValue)}</span>
                      </div>
                      {i < stages.length - 1 && (
                        <span className="pipeline-flow__arrow" aria-hidden="true">
                          {ICONS.arrowRight}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Một thanh tỷ trọng gộp duy nhất — trung thực với dữ liệu (không
                  ép thành hình phễu thu hẹp giả tạo, vì số liệu thực tế không
                  giảm dần đều qua từng giai đoạn). */}
              <div className="pipeline-share-bar">
                {stages.map((s) => {
                  const tone = stageTone(s.stage);
                  const pct = data.totalOpportunityCount > 0 ? (s.opportunityCount / data.totalOpportunityCount) * 100 : 0;
                  return (
                    <div
                      key={s.stage}
                      className="pipeline-share-bar__segment"
                      style={{ width: `${pct}%`, background: tone.dot }}
                      title={`${stageLabel(s.stage)}: ${s.opportunityCount} cơ hội`}
                    />
                  );
                })}
              </div>
              <div className="pipeline-share-legend">
                {stages.map((s) => {
                  const tone = stageTone(s.stage);
                  const pct = data.totalOpportunityCount > 0 ? Math.round((s.opportunityCount / data.totalOpportunityCount) * 100) : 0;
                  return (
                    <span key={s.stage} className="pipeline-share-legend__item">
                      <span className="pipeline-share-legend__dot" style={{ background: tone.dot }} />
                      {stageLabel(s.stage)} · {pct}%
                    </span>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Bảng chi tiết theo giai đoạn */}
          <div className="user-table-card" data-testid="pipeline-detail-table">
            <div className="forecast-table-head">
              <h2 className="forecast-table-head__title">Chi tiết theo từng giai đoạn</h2>
              <span className="forecast-table-head__count">Hiển thị {stages.length} giai đoạn</span>
            </div>
            {stages.length === 0 ? (
              <div className="table-empty-state">
                <div className="table-empty-state__icon">{ICONS.target}</div>
                <h3>Chưa có cơ hội nào trong đường ống</h3>
                <p>Chưa có dữ liệu để lên báo cáo đường ống bán hàng.</p>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="user-data-table">
                  <thead>
                    <tr>
                      <th>Giai đoạn</th>
                      <th className="text-center">Số cơ hội</th>
                      <th className="text-right">Giá trị dự kiến</th>
                      <th className="text-center">TB số ngày ở giai đoạn</th>
                      <th>Cảnh báo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stages.map((s) => {
                      const tone = stageTone(s.stage);
                      return (
                        <tr key={s.stage}>
                          <td>
                            <span className="pipeline-stage-name">
                              <span className="pipeline-share-legend__dot" style={{ background: tone.dot }} />
                              {stageLabel(s.stage)}
                            </span>
                          </td>
                          <td className="text-center">
                            <span className="count-chip">{s.opportunityCount}</span>
                          </td>
                          <td className="text-right mono-cell">{formatVND(s.totalExpectedValue)}</td>
                          <td className="text-center mono-cell">{s.averageDaysInStage} ngày</td>
                          <td>
                            {s.stalledCount > 0 ? (
                              <button
                                type="button"
                                className="pipeline-stalled-chip"
                                onClick={() => jumpToStalledGroup(s.stage)}
                                title="Xem danh sách cơ hội quá hạn xử lý ở giai đoạn này"
                              >
                                {ICONS.alertTriangle} {s.stalledCount} quá hạn
                              </button>
                            ) : (
                              <span style={{ color: 'var(--ink-faint)' }}>—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}
