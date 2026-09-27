import type { ReactNode } from 'react';
import { ICONS } from '../../../components/common/icons';
import PageHeader from '../../../components/common/PageHeader';
import type { Tab } from '../../../layouts/menuConfig';

interface ReportEntry {
  tab: Tab;
  title: string;
  desc: string;
  icon: ReactNode;
  /** Vai trò xem được — khớp phân quyền của chính trang báo cáo và backend. */
  roles: string[];
}

interface ReportSection {
  label: string;
  reports: ReportEntry[];
}

const SECTIONS: ReportSection[] = [
  {
    label: 'Tổng quan',
    reports: [
      { tab: 'OPERATIONAL_DASHBOARD', title: 'Bảng điều khiển', desc: 'Doanh thu, biên lợi nhuận, giờ tính phí và công nợ quá hạn', icon: ICONS.chart, roles: ['VT-01'] },
      { tab: 'REVENUE_REPORT', title: 'Doanh thu theo tháng', desc: 'Theo loại hợp đồng, so với cùng kỳ năm trước', icon: ICONS.chartLine, roles: ['VT-01', 'VT-05'] },
    ],
  },
  {
    label: 'Kinh doanh',
    reports: [
      { tab: 'PIPELINE_REPORT', title: 'Đường ống bán hàng', desc: 'Cơ hội và giá trị ở từng giai đoạn, cơ hội đọng lâu', icon: ICONS.target, roles: ['VT-01', 'VT-04'] },
      { tab: 'REVENUE_FORECAST', title: 'Dự báo doanh thu', desc: 'Doanh thu kỳ vọng theo tháng dự kiến ký', icon: ICONS.trendUp, roles: ['VT-01', 'VT-04'] },
    ],
  },
  {
    label: 'Lợi nhuận',
    reports: [
      { tab: 'MARGIN_BY_CUSTOMER', title: 'Lợi nhuận theo khách hàng', desc: 'Doanh thu, giá vốn và biên của từng khách hàng', icon: ICONS.briefcase, roles: ['VT-01'] },
      { tab: 'MARGIN_BY_EMPLOYEE', title: 'Lợi nhuận theo nhân sự', desc: 'Doanh thu, giá vốn và biên do từng người tạo ra', icon: ICONS.userList, roles: ['VT-01'] },
      { tab: 'PROJECT_PERFORMANCE_REPORT', title: 'Hiệu quả dự án', desc: 'Kế hoạch trong báo giá so với thực tế', icon: ICONS.briefcase, roles: ['VT-02'] },
    ],
  },
  {
    label: 'Nhân lực',
    reports: [
      { tab: 'UTILIZATION_REPORT', title: 'Tỷ lệ giờ tính phí', desc: 'Theo công ty, bộ phận và từng người', icon: ICONS.users, roles: ['VT-01'] },
      { tab: 'TIMESHEET_REPORT', title: 'Giờ công theo nhân sự', desc: 'Giờ đã duyệt trên các dự án bạn quản lý', icon: ICONS.clock, roles: ['VT-02'] },
    ],
  },
  {
    label: 'Công cụ',
    reports: [
      { tab: 'REPORT_EXPORT', title: 'Xuất báo cáo', desc: 'Tải báo cáo về dạng bảng tính', icon: ICONS.download, roles: ['VT-02'] },
      { tab: 'FISCAL_PERIODS', title: 'Kỳ tài chính', desc: 'Năm, quý và tháng tài chính của công ty', icon: ICONS.calendar, roles: ['VT-01', 'VT-02', 'VT-05'] },
    ],
  },
];

interface ReportCatalogPageProps {
  currentUserRoles: string[];
  onOpen: (tab: Tab) => void;
}

/** Danh mục báo cáo — mỗi người chỉ thấy báo cáo đúng vai trò của mình. */
export default function ReportCatalogPage({ currentUserRoles, onOpen }: ReportCatalogPageProps) {
  const sections = SECTIONS.map((section) => ({
    ...section,
    reports: section.reports.filter((r) => r.roles.some((role) => currentUserRoles.includes(role))),
  })).filter((section) => section.reports.length > 0);

  return (
    <div className="user-management-page">
      <PageHeader title="Báo cáo" />
      {sections.map((section) => (
        <section key={section.label} className="report-section">
          <h2 className="report-section__label">{section.label}</h2>
          <div className="report-catalog-grid">
            {section.reports.map((report) => (
              <button
                key={report.tab}
                type="button"
                className="report-card"
                onClick={() => onOpen(report.tab)}
                data-testid={`report-card-${report.tab}`}
              >
                <span className="report-card__icon">{report.icon}</span>
                <span className="report-card__body">
                  <span className="report-card__title">{report.title}</span>
                  <span className="report-card__desc">{report.desc}</span>
                </span>
                <span className="report-card__arrow">{ICONS.arrowRight}</span>
              </button>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
