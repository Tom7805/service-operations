import type { ReactNode } from 'react';

interface MaskedCellProps {
  canView: boolean;
  children: ReactNode;
  maskedText?: string;
  className?: string;
}

export default function MaskedCell({
  canView,
  children,
  maskedText = '•••',
  className = '',
}: MaskedCellProps) {
  if (!canView) {
    return (
      <span className={`masked-cell ${className}`} title="Bạn không có quyền xem dữ liệu này">
        {maskedText}
      </span>
    );
  }
  return <span className={className}>{children}</span>;
}