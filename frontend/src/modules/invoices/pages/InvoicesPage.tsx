import { useState } from 'react';
import InvoiceListPage from './InvoiceListPage';
import ReceivableAgingPage from './ReceivableAgingPage';

interface Props {
  currentUserRoles?: string[];
  currentUserName?: string;
  onOpenInvoice: (invoiceId: number) => void;
}

type Section = 'LIST' | 'AGING';

const SECTIONS: Array<{ key: Section; label: string }> = [
  { key: 'LIST', label: 'Tất cả hóa đơn' },
  { key: 'AGING', label: 'Công nợ quá hạn' },
];

/**
 * Gộp các chức năng của Epic 10 nhìn theo TOÀN CÔNG TY (không gắn với một hợp đồng cụ
 * thể) vào MỘT mục sidebar — danh sách hóa đơn mọi hợp đồng và báo cáo tuổi nợ theo
 * khách hàng. "Đề xuất hóa đơn" (T&M) và "Hóa đơn định kỳ" (Maintenance) đã chuyển hẳn
 * vào trang chi tiết từng hợp đồng (`ContractDetailPage`) — ở đó hợp đồng đã chọn sẵn,
 * không phải chọn lại từ dropdown — nên không còn là tab riêng ở đây nữa.
 */
export default function InvoicesPage({ currentUserRoles = [], currentUserName = 'Người dùng', onOpenInvoice }: Props) {
  const [section, setSection] = useState<Section>('LIST');

  return (
    <div className="user-management-page hub-frame">
      <div className="hub-frame__head">
        <h1 className="page-title">Hóa đơn</h1>
      </div>
      <div className="hub-tabs-row">
        <div className="hub-tabs" role="tablist" aria-label="Hóa đơn">
          {SECTIONS.map((s) => (
            <button
              key={s.key}
              type="button"
              role="tab"
              aria-selected={section === s.key}
              className={`hub-tabs__tab ${section === s.key ? 'hub-tabs__tab--active' : ''}`}
              onClick={() => setSection(s.key)}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="hub-frame__body">
      {section === 'LIST' && (
        <InvoiceListPage currentUserRoles={currentUserRoles} currentUserName={currentUserName} onOpenInvoice={onOpenInvoice} />
      )}
      {section === 'AGING' && (
        <ReceivableAgingPage currentUserRoles={currentUserRoles} currentUserName={currentUserName} onOpenInvoice={onOpenInvoice} />
      )}
      </div>
    </div>
  );
}
