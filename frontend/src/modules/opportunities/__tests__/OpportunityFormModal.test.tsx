import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import OpportunityFormModal from '../components/OpportunityFormModal';
import * as opportunitiesApi from '../api/opportunitiesApi';
import type { CustomerOption, Opportunity } from '../types/opportunityTypes';

vi.mock('../api/opportunitiesApi', () => ({
  createOpportunity: vi.fn(),
  fetchCustomersForSelect: vi.fn(),
  OpportunityApiError: class extends Error {
    constructor(
      public code: string,
      message: string,
      public statusCode?: number,
      public fieldErrors?: Array<{ field: string; message: string }>
    ) {
      super(message);
      this.name = 'OpportunityApiError';
    }
  },
}));

const mockCustomers: CustomerOption[] = [
  { id: 1, code: 'KH-000001', name: 'Công ty TNHH Giải Pháp Công Nghệ ABC' },
];

const mockCreatedOpportunity: Opportunity = {
  id: 101,
  name: 'Triển khai hệ thống ERP',
  customerId: 1,
  customerName: 'Công ty TNHH Giải Pháp Công Nghệ ABC',
  expectedValue: 500000000,
  expectedCloseDate: '2026-12-31',
  stage: 'APPROACH',
  status: 'OPEN',
  probability: 10,
  ownerId: 3,
  createdBy: 'sale01',
  createdAt: '2026-09-04T09:00:00',
};

describe('OpportunityFormModal Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(opportunitiesApi.fetchCustomersForSelect).mockResolvedValue(mockCustomers);
  });

  it('không hiển thị khi isOpen = false', () => {
    render(<OpportunityFormModal isOpen={false} onClose={vi.fn()} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('hiển thị đầy đủ form khi isOpen = true', () => {
    render(<OpportunityFormModal isOpen={true} onClose={vi.fn()} initialCustomerList={mockCustomers} />);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Tạo cơ hội bán hàng/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/Tên cơ hội/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Khách hàng/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Giá trị dự kiến/i)).toBeInTheDocument();
  });

  it('tạo cơ hội thành công và gọi callback', async () => {
    const handleClose = vi.fn();
    const handleSuccess = vi.fn();
    vi.mocked(opportunitiesApi.createOpportunity).mockResolvedValue(mockCreatedOpportunity);

    render(
      <OpportunityFormModal
        isOpen={true}
        onClose={handleClose}
        onSuccess={handleSuccess}
        initialCustomerList={mockCustomers}
      />
    );

    fireEvent.change(screen.getByLabelText(/Tên cơ hội/i), {
      target: { value: 'Triển khai hệ thống ERP' },
    });
    fireEvent.change(screen.getByLabelText(/Khách hàng/i), {
      target: { value: '1' },
    });
    fireEvent.change(screen.getByLabelText(/Giá trị dự kiến/i), {
      target: { value: '500000000' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Tạo cơ hội bán hàng/i }));

    await waitFor(() => {
      expect(opportunitiesApi.createOpportunity).toHaveBeenCalled();
      expect(handleSuccess).toHaveBeenCalledWith(mockCreatedOpportunity);
      expect(handleClose).toHaveBeenCalled();
    });
  });
});
