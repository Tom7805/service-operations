import { ICONS } from '../../../components/common/icons';
import type { DashboardKpiRes } from '../types/reportTypes';

export interface DashboardKpiRowProps {
  kpis: DashboardKpiRes;
  /** Bấm vào thẻ "Dự án âm biên" thì mở sang báo cáo biên lợi nhuận để xem cụ thể dự án nào. */
  onViewNegativeMarginProjects?: () => void;
  /** Bấm vào thẻ "Hóa đơn quá hạn" thì mở sang danh sách hóa đơn để xử lý tiếp. */
  onViewOverdueInvoices?: () => void;
}

const currencyFormatter = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0,
});

function formatVND(value: number): string {
  return currencyFormatter.format(value);
}

/** `averageMarginRate`/`billableHoursRatio` là phân số (0.1000 = 10%) — nhân 100 để hiển thị %. */
function formatPercent(fraction: number): string {
  return `${new Intl.NumberFormat('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(
    fraction * 100
  )}%`;
}

/**
 * Dải 5 chỉ số chính của bảng điều khiển vận hành (NCL-11-CN-001): doanh thu ghi nhận, tỷ
 * suất biên lợi nhuận bình quân, tỷ lệ giờ tính phí, số dự án âm biên, số hóa đơn quá hạn.
 * Hai chỉ số cảnh báo (âm biên, quá hạn) bấm được để mở thẳng sang màn hình liên quan xử lý
 * tiếp — không chỉ là con số tĩnh.
 */
export default function DashboardKpiRow({
  kpis,
  onViewNegativeMarginProjects,
  onViewOverdueInvoices,
}: DashboardKpiRowProps) {
  return (
    <div className="stats-grid" data-testid="dashboard-kpi-grid">
      <div className="stat-card" data-testid="kpi-recognized-revenue">
        <span className="stat-card__label">
          <span className="stat-card__icon stat-card__icon--green">{ICONS.money}</span>
          Doanh thu ghi nhận
        </span>
        <span className="stat-card__value stat-card__value--md text-success">
          {formatVND(kpis.recognizedRevenue)}
        </span>
      </div>

      <div className="stat-card" data-testid="kpi-average-margin-rate">
        <span className="stat-card__label">
          <span className="stat-card__icon stat-card__icon--blue">{ICONS.chart}</span>
          Tỷ suất biên lợi nhuận BQ
        </span>
        <span className={`stat-card__value ${kpis.averageMarginRate < 0 ? 'text-danger' : ''}`}>
          {formatPercent(kpis.averageMarginRate)}
        </span>
      </div>

      <div className="stat-card" data-testid="kpi-billable-hours-ratio">
        <span className="stat-card__label">
          <span className="stat-card__icon stat-card__icon--purple">{ICONS.clock}</span>
          Tỷ lệ giờ tính phí
        </span>
        <span className="stat-card__value">{formatPercent(kpis.billableHoursRatio)}</span>
      </div>

      <button
        type="button"
        className="stat-card"
        data-testid="kpi-negative-margin-projects"
        onClick={onViewNegativeMarginProjects}
        disabled={!onViewNegativeMarginProjects}
        style={{ textAlign: 'left', cursor: onViewNegativeMarginProjects ? 'pointer' : 'default' }}
        title={onViewNegativeMarginProjects ? 'Xem chi tiết dự án âm biên' : undefined}
      >
        <span className="stat-card__label">
          <span className="stat-card__icon stat-card__icon--red">{ICONS.alertTriangle}</span>
          Dự án âm biên
        </span>
        <span className={`stat-card__value ${kpis.negativeMarginProjectCount > 0 ? 'text-danger' : ''}`}>
          {kpis.negativeMarginProjectCount.toLocaleString('vi-VN')}
        </span>
      </button>

      <button
        type="button"
        className="stat-card"
        data-testid="kpi-overdue-invoices"
        onClick={onViewOverdueInvoices}
        disabled={!onViewOverdueInvoices}
        style={{ textAlign: 'left', cursor: onViewOverdueInvoices ? 'pointer' : 'default' }}
        title={onViewOverdueInvoices ? 'Xem danh sách hóa đơn quá hạn' : undefined}
      >
        <span className="stat-card__label">
          <span className="stat-card__icon stat-card__icon--amber">{ICONS.receipt}</span>
          Hóa đơn quá hạn
        </span>
        <span className={`stat-card__value ${kpis.overdueInvoiceCount > 0 ? 'text-warning' : ''}`}>
          {kpis.overdueInvoiceCount.toLocaleString('vi-VN')}
        </span>
      </button>
    </div>
  );
}
