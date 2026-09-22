import { useState } from 'react';
import InvoiceListPage from './InvoiceListPage';
import InvoiceProposalPage from './InvoiceProposalPage';
import RecurringInvoicePage from './RecurringInvoicePage';
import ReceivableAgingPage from './ReceivableAgingPage';

interface Props {
  currentUserRoles?: string[];
  currentUserName?: string;
  onOpenInvoice: (invoiceId: number) => void;
}

type Section = 'LIST' | 'PROPOSALS' | 'RECURRING' | 'AGING';

const SECTIONS: Array<{ key: Section; label: string }> = [
  { key: 'LIST', label: 'Danh sách hóa đơn' },
  { key: 'PROPOSALS', label: 'Đề xuất hóa đơn' },
  { key: 'RECURRING', label: 'Hóa đơn định kỳ' },
  { key: 'AGING', label: 'Báo cáo tuổi nợ' },
];

/**
 * Gộp 4 chức năng của Epic 10 (danh sách/chi tiết hóa đơn, đề xuất hóa đơn, hóa đơn
 * định kỳ, báo cáo tuổi nợ) vào MỘT mục sidebar duy nhất — theo đúng mẫu
 * BillRatePage đang bó nhiều story con vào một trang. Điều hướng giữa các phần dùng
 * đúng segmented control `.status-tabs`/`.status-tab` mà RolePermissionPage/
 * DepartmentTreePage đang dùng, không tự chế nút bấm rời để tránh lệch phong cách.
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
      {section === 'PROPOSALS' && (
        <InvoiceProposalPage currentUserRoles={currentUserRoles} currentUserName={currentUserName} />
      )}
      {section === 'RECURRING' && (
        <RecurringInvoicePage currentUserRoles={currentUserRoles} currentUserName={currentUserName} />
      )}
      {section === 'AGING' && (
        <ReceivableAgingPage currentUserRoles={currentUserRoles} currentUserName={currentUserName} onOpenInvoice={onOpenInvoice} />
      )}
    </div>
  );
}
