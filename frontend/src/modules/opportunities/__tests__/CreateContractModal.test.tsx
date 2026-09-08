import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, vi, beforeEach } from 'vitest';
import CreateContractModal from '../components/CreateContractModal';
import type { Opportunity } from '../types/opportunityTypes';
import * as opportunitiesApi from '../api/opportunitiesApi';

const mockOpportunity: Opportunity = {
  id: 100,
  name: '  Cơ hội Demo  ',
  customerId: 5,
  stage: 'WON',
  status: 'CLOSED',
  expectedValue: 1000000,
  probability: 100,
};

vi.mock('../api/opportunitiesApi', () => ({
  createContractFromOpportunity: vi.fn(),
}));

describe('CreateContractModal', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders and submits form to create contract', async () => {
    vi.mocked(opportunitiesApi.createContractFromOpportunity).mockResolvedValue({ id: 55, name: 'Cơ hội Demo' });

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

    fireEvent.change(screen.getByLabelText(/Loại hợp đồng/i), { target: { value: 'FIXED_PRICE' } });
    fireEvent.change(screen.getByLabelText(/Giá trị hợp đồng/i), { target: { value: '2000000' } });
    fireEvent.change(screen.getByLabelText(/Ghi chú/i), { target: { value: 'Ghi chú thử' } });

    fireEvent.click(screen.getByRole('button', { name: /Tạo hợp đồng/i }));

    await waitFor(() => {
      expect(opportunitiesApi.createContractFromOpportunity).toHaveBeenCalledWith(100, expect.objectContaining({ contractType: 'FIXED_PRICE' }));
    });

    expect(onCreated).toHaveBeenCalled();
  });
});
