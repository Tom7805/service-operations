import { useState } from 'react';
import ExportReportModal from '../components/ExportReportModal';
import { EXPORT_REPORT_OPTIONS, type ExportReportType } from '../types/reportTypes';
import { ICONS } from '../../../components/common/icons';

interface ReportExportPageProps {
  currentUserRoles?: string[];
}

/** NCL-11-CN-004 — Xuất báo cáo ra tệp. Chỉ Quản lý dự án (VT-02) thao tác được (TC-03). */
export default function ReportExportPage({ currentUserRoles = [] }: ReportExportPageProps) {
  const isAllowed = currentUserRoles.includes('VT-02');
  const [openType, setOpenType] = useState<ExportReportType | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  return (
    <div className="user-management-page">
      <div className="page-header">
        <div>
          <div className="page-header__kicker">
            <span className="page-header__tag">{ICONS.download} BÁO CÁO</span>
            <span className="page-header__dot" />
            <span className="page-header__meta">XUẤT TỆP</span>
          </div>
          <h1 className="page-title">Xuất báo cáo ra tệp</h1>
          <p className="page-subtitle">
            Chọn báo cáo và kỳ, hệ thống tạo tệp bảng tính để gửi khách hàng hoặc lưu trữ ngoài hệ thống.
          </p>
        </div>
      </div>

      {!isAllowed ? (
        <div className="alert-box alert-box--danger" role="alert">
          <span className="icon-xs">{ICONS.lock}</span> Chỉ Quản lý dự án được xuất báo cáo ra tệp.
        </div>
      ) : (
        <div className="report-catalog-grid">
          {EXPORT_REPORT_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              className="report-card"
              onClick={() => setOpenType(option.value)}
            >
              <span className="report-card__icon">{ICONS.document}</span>
              <span className="report-card__body">
                <span className="report-card__title">{option.label}</span>
                <span className="report-card__desc">{option.description}</span>
              </span>
              <span className="report-card__arrow">{ICONS.download}</span>
            </button>
          ))}
        </div>
      )}

      {openType && (
        <ExportReportModal
          initialReportType={openType}
          onClose={() => setOpenType(null)}
          onExported={(fileName, rowCount) =>
            setToast(`Đã xuất ${rowCount} dòng ra tệp ${fileName}.`)
          }
        />
      )}

      {toast && (
        <div className="toast-banner toast-banner--success" role="status">
          <span className="toast-banner__icon">{ICONS.checkCircle}</span>
          <span>{toast}</span>
          <button type="button" className="toast-banner__close" onClick={() => setToast(null)}
            aria-label="Đóng thông báo">
            <span className="icon-sm">{ICONS.close}</span>
          </button>
        </div>
      )}
    </div>
  );
}
