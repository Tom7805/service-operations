import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ContractDetailPage from '../pages/ContractDetailPage';
import * as acceptanceApi from '../../acceptance/api/acceptanceApi';

vi.mock('../../acceptance/api/acceptanceApi', () => ({
  checkMilestoneLinkAccess: vi.fn(),
  fetchMilestoneAcceptances: vi.fn(),
  AcceptanceApiError: class extends Error {},
}));

describe('ContractDetailPage — NCL-12-CN-003 TC-03', () => {
  beforeEach(() => {
    vi.mocked(acceptanceApi.checkMilestoneLinkAccess).mockReset().mockResolvedValue(undefined);
  });

  it('người không phải Kế toán bị từ chối và có request thật để backend ghi nhật ký lần từ chối', async () => {
    render(<ContractDetailPage contractId={3} currentUserRoles={['VT-02']} currentUserName="PM" onBack={vi.fn()} />);
    expect(screen.getByTestId('contract-detail-access-denied')).toHaveTextContent('gắn phiếu nghiệm thu với mốc thanh toán');
    await waitFor(() => expect(acceptanceApi.checkMilestoneLinkAccess).toHaveBeenCalledWith(3));
    expect(acceptanceApi.fetchMilestoneAcceptances).not.toHaveBeenCalled();
  });
});
