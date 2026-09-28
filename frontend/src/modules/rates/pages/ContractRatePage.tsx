import PageHeader from '../../../components/common/PageHeader';
import ContractRateManager from '../components/ContractRateManager';
import RateAccessDenied from '../components/RateAccessDenied';
import { useRateOptions } from '../hooks/useRateOptions';
import { canManageRates } from '../utils/rateAccess';

interface Props {
  currentUserRoles?: string[];
  currentUserName?: string;
}

/** Tab "Theo hợp đồng" của khu Đơn giá — NCL-07-CN-003: đơn giá riêng được ưu tiên hơn bảng giá chung. */
export default function ContractRatePage({ currentUserRoles = [], currentUserName = 'Người dùng' }: Props) {
  const allowed = canManageRates(currentUserRoles);
  const { roleOptions, levelsByRole } = useRateOptions(allowed);

  if (!allowed) {
    return (
      <RateAccessDenied
        title="Bạn không có thẩm quyền quản lý đơn giá theo hợp đồng"
        currentUserName={currentUserName}
        currentUserRoles={currentUserRoles}
        testId="contract-rate-access-denied"
      />
    );
  }

  return (
    <div className="user-management-page">
      <PageHeader title="Đơn giá theo hợp đồng" />
      <ContractRateManager currentUserRoles={currentUserRoles} roleOptions={roleOptions} levelsByRole={levelsByRole} />
    </div>
  );
}
