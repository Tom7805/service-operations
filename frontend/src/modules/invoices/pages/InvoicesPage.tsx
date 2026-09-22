import { useState } from 'react';
import { ICONS } from '../../../components/common/icons';
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

const SECTIONS: Array<{ key: Section; label: string; icon: keyof typeof ICONS }> = [
  { key: 'LIST', label: 'Danh sách hóa đơn', icon: 'receipt' },
  { key: 'PROPOSALS', label: 'Đề xuất hóa đơn', icon: 'document' },
  { key: 'RECURRING', label: 'Hóa đơn định kỳ', icon: 'clock' },
  { key: 'AGING', label: 'Báo cáo tuổi nợ', icon: 'chart' },
];

/**
 * Gộp 4 chức năng của Epic 10 (danh sách/chi tiết hóa đơn, đề xuất hóa đơn, hóa đơn
 * định kỳ, báo cáo tuổi nợ) vào MỘT mục sidebar duy nhất — trước đây mỗi chức năng
 * một mục riêng khiến sidebar phình thêm 4 dòng cùng lúc, đồng đội không theo kịp.
 * Theo đúng mẫu BillRatePage đang bó nhiều story con vào một trang; điều hướng giữa
 * các phần bằng dải nút đơn giản, không thêm route/tab cấp App.tsx nào khác ngoài
 * "Hóa đơn" (INVOICE_DETAIL vẫn là tab con riêng vì đó là màn "đào sâu" một hóa đơn
 * cụ thể, không phải một chế độ xem ngang hàng).
 */
export default function InvoicesPage({ currentUserRoles = [], currentUserName = 'Người dùng', onOpenInvoice }: Props) {
  const [section, setSection] = useState<Section>('LIST');

  return (
    <div>
      <div
        style={{
          display: 'flex',
          gap: '8px',
          flexWrap: 'wrap',
          padding: '16px 16px 0',
        }}
        role="tablist"
        aria-label="Chức năng Hóa đơn"
      >
        {SECTIONS.map((s) => (
          <button
            key={s.key}
            type="button"
            role="tab"
            aria-selected={section === s.key}
            className={section === s.key ? 'btn-primary' : 'btn btn-secondary'}
            onClick={() => setSection(s.key)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <span className="icon-xs">{ICONS[s.icon]}</span> {s.label}
          </button>
        ))}
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
