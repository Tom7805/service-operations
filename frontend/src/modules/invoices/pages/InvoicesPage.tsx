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
  { key: 'LIST', label: 'Danh sách hóa đơn' },
  { key: 'AGING', label: 'Báo cáo tuổi nợ' },
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
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Hóa đơn</h1>
        </div>
      </div>

      <div className="user-table-toolbar" style={{ padding: '0 16px 16px' }}>
        <div className="status-tabs" role="tablist" aria-label="Chức năng Hóa đơn">
          {SECTIONS.map((s) => (
            <button
              key={s.key}
              type="button"
              role="tab"
              aria-selected={section === s.key}
              className={`status-tab ${section === s.key ? 'status-tab--active' : ''}`}
              onClick={() => setSection(s.key)}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {section === 'LIST' && (
        <InvoiceListPage currentUserRoles={currentUserRoles} currentUserName={currentUserName} onOpenInvoice={onOpenInvoice} />
      )}
      {section === 'AGING' && (
        <ReceivableAgingPage currentUserRoles={currentUserRoles} currentUserName={currentUserName} onOpenInvoice={onOpenInvoice} />
      )}
    </div>
  );
}
