import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import CreateContractModal from '../components/CreateContractModal';
import type { Opportunity, QuoteRes } from '../types/opportunityTypes';
import type { ContractRes } from '../../contracts/types/contractTypes';
import * as opportunitiesApi from '../api/opportunitiesApi';
import * as quotesApi from '../api/quotesApi';

const mockOpportunity: Opportunity = {
  id: 100,
  name: '  Cơ hội Demo  ',
  customerId: 5,
  stage: 'WON',
  status: 'CLOSED',
  expectedValue: 1000000,
  probability: 100,
};

const mockLatestQuote: QuoteRes = {
  id: 30,
  opportunityId: 100,
  version: 2,
  totalAmount: 2000000,
  items: [],
  missingRates: [],
};

vi.mock('../api/opportunitiesApi', () => ({
  createContractFromOpportunity: vi.fn(),
}));

vi.mock('../api/quotesApi', () => ({
  fetchOpportunityQuoteHistory: vi.fn(),
}));

describe('CreateContractModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders and submits form to create contract, using the latest quote amount', async () => {
    const createdContract: ContractRes = {
      id: 55,
      contractCode: 'HD-TEST01',
      name: 'Cơ hội Demo',
      opportunityId: 100,
      customerId: 5,
      quoteId: 30,
      contractType: 'FIXED_PRICE',
      totalValue: 2000000,
      status: 'DRAFT',
      createdBy: 'sale01',
    };
    // Danh sách trả về mới nhất trước (giảm dần theo version) — mô phỏng đúng contract của API thật.
    vi.mocked(quotesApi.fetchOpportunityQuoteHistory).mockResolvedValue([mockLatestQuote]);
    vi.mocked(opportunitiesApi.createContractFromOpportunity).mockResolvedValue(createdContract);

    const onCreated = vi.fn();
    render(
      <CreateContractModal
        opportunity={mockOpportunity}
        isOpen={true}
        onClose={() => {}}
        onCreated={onCreated}
        currentUserRoles={['VT-04']}
      />
    );

    // default name should be opportunity.name
    expect(screen.getByDisplayValue(/Cơ hội Demo/i)).toBeInTheDocument();

    // Giá trị hợp đồng phải tự lấy từ báo giá mới nhất, không cho gõ tay (tránh sai lệch với báo giá thật).
    const expectedFormatted = new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0,
    }).format(2000000);
    await waitFor(() => {
      expect(screen.getByLabelText(/Giá trị hợp đồng/i)).toHaveValue(expectedFormatted);
    });
    expect(screen.getByLabelText(/Giá trị hợp đồng/i)).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/Loại hợp đồng/i), { target: { value: 'FIXED_PRICE' } });
    fireEvent.change(screen.getByLabelText(/Ghi chú/i), { target: { value: 'Ghi chú thử' } });

    fireEvent.click(screen.getByRole('button', { name: /Tạo hợp đồng/i }));

    await waitFor(() => {
      expect(opportunitiesApi.createContractFromOpportunity).toHaveBeenCalledWith(
        100,
        expect.objectContaining({ contractType: 'FIXED_PRICE', totalValue: 2000000 })
      );
    });

    expect(onCreated).toHaveBeenCalled();
  });

  it('chặn tạo hợp đồng khi cơ hội chưa có báo giá nào', async () => {
    vi.mocked(quotesApi.fetchOpportunityQuoteHistory).mockResolvedValue([]);

    render(
      <CreateContractModal
        opportunity={mockOpportunity}
        isOpen={true}
        onClose={() => {}}
        currentUserRoles={['VT-04']}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/chưa có báo giá nào/i)).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: /Tạo hợp đồng/i })).toBeDisabled();
  });
});
