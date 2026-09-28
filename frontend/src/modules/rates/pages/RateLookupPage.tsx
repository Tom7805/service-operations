import { useState } from 'react';
import PageHeader from '../../../components/common/PageHeader';
import RateAccessDenied from '../components/RateAccessDenied';
import RateResolveLookup from '../components/RateResolveLookup';
import TimeEntryRateResolveLookup from '../components/TimeEntryRateResolveLookup';
import { useRateOptions } from '../hooks/useRateOptions';
import { canManageRates } from '../utils/rateAccess';

interface Props {
  currentUserRoles?: string[];
  currentUserName?: string;
}

type LookupMode = 'date' | 'entry';

const MODES: Array<{ id: LookupMode; label: string }> = [
  { id: 'date', label: 'Theo thời điểm' },
  { id: 'entry', label: 'Theo dòng giờ công' },
];

/**
 * Tab "Tra cứu" của khu Đơn giá: hai cách tra (NCL-07-CN-002 theo vai trò + ngày, NCL-07-CN-005 theo một
 * dòng giờ công đã duyệt) dùng chung một chỗ — mỗi lúc chỉ hiện một khối để trang không dài ra.
 */
export default function RateLookupPage({ currentUserRoles = [], currentUserName = 'Người dùng' }: Props) {
  const allowed = canManageRates(currentUserRoles);
  const { roleOptions, levelsByRole, levelOptions } = useRateOptions(allowed);
  const [mode, setMode] = useState<LookupMode>('date');

  if (!allowed) {
    return (
      <RateAccessDenied
        title="Bạn không có thẩm quyền tra cứu đơn giá"
        currentUserName={currentUserName}
        currentUserRoles={currentUserRoles}
        testId="rate-lookup-access-denied"
      />
    );
  }

  return (
    <div className="user-management-page rate-lookup">
      <PageHeader title="Tra cứu đơn giá" />
      <div className="segmented" role="radiogroup" aria-label="Cách tra đơn giá">
        {MODES.map((m) => (
          <button
            key={m.id}
            type="button"
            role="radio"
            aria-checked={mode === m.id}
            className={`segmented__item ${mode === m.id ? 'segmented__item--active' : ''}`}
            onClick={() => setMode(m.id)}
            data-testid={`rate-lookup-mode-${m.id}`}
          >
            {m.label}
          </button>
        ))}
      </div>
      {mode === 'date' ? (
        <RateResolveLookup roleOptions={roleOptions} levelsByRole={levelsByRole} />
      ) : (
        <TimeEntryRateResolveLookup levelOptions={levelOptions} />
      )}
    </div>
  );
}
