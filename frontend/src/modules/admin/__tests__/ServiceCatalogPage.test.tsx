import '@testing-library/jest-dom';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ServiceCatalogPage from '../pages/ServiceCatalogPage';
import * as api from '../api/serviceCatalogApi';
import type { ServiceCatalogRes } from '../types/adminTypes';
import { todayIso } from '../utils/serviceCatalogUtils';

vi.mock('../api/serviceCatalogApi', () => {
  class MockAdminApiError extends Error {
    constructor(
      public readonly code: string,
      message: string,
      public readonly statusCode?: number,
      public readonly fieldErrors: { field: string; message: string }[] = []
    ) {
      super(message);
      this.name = 'AdminApiError';
    }
  }
  return {
    searchServiceCatalog: vi.fn(),
    getServiceCatalogItem: vi.fn(),
    createServiceCatalogItem: vi.fn(),
    updateServiceCatalogItem: vi.fn(),
    setServiceCatalogStatus: vi.fn(),
    addServicePrice: vi.fn(),
    AdminApiError: MockAdminApiError,
  };
});

const TODAY = todayIso();

const CONSULT: ServiceCatalogRes = {
  id: 3,
  code: 'DV00003',
  name: 'Tư vấn triển khai',
  unit: 'giờ',
  description: 'Tư vấn tại chỗ cho khách hàng',
  active: true,
  asOf: TODAY,
  hasEffectivePrice: true,
  currentPrice: 450000,
  currentPriceEffectiveFrom: '2026-07-01',
  createdBy: 'admin',
  createdAt: '2026-01-02T09:00:00',
  updatedAt: '2026-07-01T08:30:00',
};

const CONSULT_DETAIL: ServiceCatalogRes = {
  ...CONSULT,
  prices: [
    { id: 12, price: 480000, effectiveFrom: '2999-01-01', current: false, createdBy: 'admin', createdAt: '2026-09-20T10:00:00' },
    {
      id: 9,
      price: 450000,
      effectiveFrom: '2026-07-01',
      effectiveTo: '2998-12-31',
      current: true,
      note: 'Tăng giá giữa năm',
      createdBy: 'admin',
      createdAt: '2026-06-25T10:00:00',
    },
    {
      id: 5,
      price: 400000,
      effectiveFrom: '2026-01-01',
      effectiveTo: '2026-06-30',
      current: false,
      createdBy: 'admin',
      createdAt: '2026-01-02T09:00:00',
    },
  ],
};

const FUTURE_ONLY: ServiceCatalogRes = {
  id: 4,
  code: 'DV00004',
  name: 'Bảo trì hệ thống',
  unit: 'tháng',
  active: true,
  asOf: TODAY,
  hasEffectivePrice: false,
};

function forbidden() {
  return new api.AdminApiError('FORBIDDEN', 'Forbidden', 403);
}

describe('ServiceCatalogPage (NCL-15-CN-001)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.searchServiceCatalog).mockResolvedValue([CONSULT, FUTURE_ONLY]);
    vi.mocked(api.getServiceCatalogItem).mockResolvedValue(CONSULT_DETAIL);
  });

  it('hiển thị danh mục với giá hiện hành, dịch vụ chưa có giá hiệu lực được đánh dấu', async () => {
    render(<ServiceCatalogPage currentUserRoles={['VT-07']} />);

    const row = await screen.findByTestId('svc-row-3');
    expect(within(row).getByText('DV00003')).toBeInTheDocument();
    expect(within(row).getByText(/450\.000/)).toBeInTheDocument();
    expect(within(screen.getByTestId('svc-row-4')).getByText('Chưa có giá')).toBeInTheDocument();
    expect(screen.getByTestId('svc-summary')).toHaveTextContent('1 chưa có giá hiệu lực');
    expect(api.searchServiceCatalog).toHaveBeenCalledWith({ keyword: '', active: undefined, asOf: TODAY });
  });

  it('TC-01: tạo dịch vụ mới kèm giá và ngày hiệu lực → gọi API, dịch vụ xuất hiện trong danh mục', async () => {
    const created: ServiceCatalogRes = {
      id: 7,
      code: 'DV00007',
      name: 'Đào tạo người dùng',
      unit: 'buổi',
      active: true,
      asOf: TODAY,
      hasEffectivePrice: true,
      currentPrice: 3000000,
      currentPriceEffectiveFrom: TODAY,
      createdBy: 'admin',
      createdAt: '2026-09-27T10:00:00',
      prices: [{ id: 30, price: 3000000, effectiveFrom: TODAY, current: true, createdBy: 'admin', createdAt: '2026-09-27T10:00:00' }],
    };
    vi.mocked(api.createServiceCatalogItem).mockResolvedValue(created);
    render(<ServiceCatalogPage currentUserRoles={['VT-07']} />);
    await screen.findByTestId('svc-row-3');
    vi.mocked(api.searchServiceCatalog).mockResolvedValue([CONSULT, FUTURE_ONLY, created]);

    fireEvent.click(screen.getByTestId('svc-btn-create'));
    fireEvent.change(screen.getByTestId('svc-input-name'), { target: { value: '  Đào tạo người dùng ' } });
    fireEvent.change(screen.getByTestId('svc-input-unit'), { target: { value: 'buổi' } });
    fireEvent.change(screen.getByTestId('svc-input-price'), { target: { value: '3.000.000' } });
    expect(screen.getByTestId('svc-price-preview')).toHaveTextContent('3.000.000');
    fireEvent.click(screen.getByTestId('svc-submit'));

    await waitFor(() =>
      expect(api.createServiceCatalogItem).toHaveBeenCalledWith({
        name: 'Đào tạo người dùng',
        unit: 'buổi',
        description: null,
        price: 3000000,
        effectiveFrom: TODAY,
      })
    );
    expect(await screen.findByText(/Đã tạo dịch vụ DV00007/)).toBeInTheDocument();
    expect(await screen.findByTestId('svc-row-7')).toBeInTheDocument();
    // Mở ngay chi tiết dịch vụ vừa tạo.
    expect(screen.getByTestId('svc-detail')).toHaveTextContent('Đào tạo người dùng');
  });

  it('TC-02: máy chủ báo trùng tên (409) → hiện lỗi dưới ô tên, không đóng form', async () => {
    vi.mocked(api.createServiceCatalogItem).mockRejectedValue(
      new api.AdminApiError('DUPLICATE_DATA', 'Da ton tai dich vu cung ten', 409)
    );
    render(<ServiceCatalogPage currentUserRoles={['VT-07']} />);
    await screen.findByTestId('svc-row-3');

    fireEvent.click(screen.getByTestId('svc-btn-create'));
    fireEvent.change(screen.getByTestId('svc-input-name'), { target: { value: 'Dịch vụ ẩn ở trang khác' } });
    fireEvent.change(screen.getByTestId('svc-input-unit'), { target: { value: 'giờ' } });
    fireEvent.change(screen.getByTestId('svc-input-price'), { target: { value: '100000' } });
    fireEvent.click(screen.getByTestId('svc-submit'));

    expect(await screen.findByTestId('svc-error-name')).toHaveTextContent('Đã có dịch vụ cùng tên');
    expect(screen.getByTestId('svc-form')).toBeInTheDocument();
    expect(screen.queryByTestId('svc-row-7')).not.toBeInTheDocument();
  });

  it('TC-02: trùng tên với dịch vụ đang hiển thị (khác hoa thường/khoảng trắng) → báo ngay, không gọi API', async () => {
    render(<ServiceCatalogPage currentUserRoles={['VT-07']} />);
    await screen.findByTestId('svc-row-3');

    fireEvent.click(screen.getByTestId('svc-btn-create'));
    fireEvent.change(screen.getByTestId('svc-input-name'), { target: { value: 'tư vấn   TRIỂN khai' } });
    fireEvent.change(screen.getByTestId('svc-input-unit'), { target: { value: 'giờ' } });
    fireEvent.change(screen.getByTestId('svc-input-price'), { target: { value: '100000' } });
    fireEvent.click(screen.getByTestId('svc-submit'));

    expect(await screen.findByTestId('svc-error-name')).toHaveTextContent('DV00003');
    expect(api.createServiceCatalogItem).not.toHaveBeenCalled();
  });

  it('kiểm tra dữ liệu bắt buộc trên form trước khi gửi', async () => {
    render(<ServiceCatalogPage currentUserRoles={['VT-07']} />);
    await screen.findByTestId('svc-row-3');
    fireEvent.click(screen.getByTestId('svc-btn-create'));
    fireEvent.change(screen.getByTestId('svc-input-price'), { target: { value: '0' } });
    fireEvent.click(screen.getByTestId('svc-submit'));

    expect(await screen.findByTestId('svc-error-name')).toHaveTextContent('Nhập tên dịch vụ.');
    expect(screen.getByTestId('svc-error-unit')).toHaveTextContent('Nhập đơn vị tính.');
    expect(screen.getByTestId('svc-error-price')).toHaveTextContent('lớn hơn 0');
    expect(api.createServiceCatalogItem).not.toHaveBeenCalled();
  });

  it('TC-03: vai trò không phải Quản trị viên vẫn gọi API (để backend ghi nhật ký) và thấy trang từ chối khi 403', async () => {
    vi.mocked(api.searchServiceCatalog).mockRejectedValue(forbidden());
    render(<ServiceCatalogPage currentUserRoles={['VT-04']} />);

    expect(await screen.findByTestId('svc-access-denied')).toBeInTheDocument();
    expect(api.searchServiceCatalog).toHaveBeenCalledTimes(1);
    expect(screen.getByText(/đã được ghi vào nhật ký hệ thống/)).toBeInTheDocument();
    expect(screen.queryByTestId('svc-btn-create')).not.toBeInTheDocument();
  });

  it('TC-04: chi tiết hiện lịch sử mốc giá (giữ mốc cũ) kèm người tạo, thời điểm', async () => {
    render(<ServiceCatalogPage currentUserRoles={['VT-07']} />);
    fireEvent.click(await screen.findByTestId('svc-open-3'));

    const detail = await screen.findByTestId('svc-detail');
    await within(detail).findByTestId('svc-price-history');
    expect(within(detail).getByTestId('svc-price-9')).toHaveTextContent('Đang áp dụng');
    expect(within(detail).getByTestId('svc-price-12')).toHaveTextContent('Sắp áp dụng');
    expect(within(detail).getByTestId('svc-price-5')).toHaveTextContent('Đã hết hiệu lực');
    expect(within(detail).getByTestId('svc-price-9')).toHaveTextContent('Tăng giá giữa năm');
    expect(within(detail).getByTestId('svc-detail-audit')).toHaveTextContent('Tạo bởi admin');
    expect(api.getServiceCatalogItem).toHaveBeenCalledWith(3, TODAY);
  });

  it('thêm mốc giá mới → gọi POST prices và cập nhật lịch sử; trùng ngày (409) báo dưới ô ngày', async () => {
    render(<ServiceCatalogPage currentUserRoles={['VT-07']} />);
    fireEvent.click(await screen.findByTestId('svc-open-3'));
    await screen.findByTestId('svc-price-history');

    // Trùng ngày với mốc đã có → chặn ngay, không gọi API.
    fireEvent.click(screen.getByTestId('svc-btn-add-price'));
    fireEvent.change(screen.getByTestId('svc-price-input'), { target: { value: '500000' } });
    fireEvent.change(screen.getByTestId('svc-price-effective'), { target: { value: '2026-07-01' } });
    fireEvent.click(screen.getByTestId('svc-price-submit'));
    expect(await screen.findByTestId('svc-price-error-effectiveFrom')).toHaveTextContent('cùng ngày hiệu lực');
    expect(api.addServicePrice).not.toHaveBeenCalled();

    const updated: ServiceCatalogRes = {
      ...CONSULT_DETAIL,
      prices: [
        { id: 40, price: 500000, effectiveFrom: '2999-06-01', current: false, note: 'Điều chỉnh', createdBy: 'admin' },
        ...(CONSULT_DETAIL.prices ?? []),
      ],
    };
    vi.mocked(api.addServicePrice).mockResolvedValue(updated);
    fireEvent.change(screen.getByTestId('svc-price-effective'), { target: { value: '2999-06-01' } });
    fireEvent.change(screen.getByTestId('svc-price-note'), { target: { value: 'Điều chỉnh' } });
    fireEvent.click(screen.getByTestId('svc-price-submit'));

    await waitFor(() =>
      expect(api.addServicePrice).toHaveBeenCalledWith(3, { price: 500000, effectiveFrom: '2999-06-01', note: 'Điều chỉnh' })
    );
    expect(await screen.findByTestId('svc-price-40')).toBeInTheDocument();
    expect(screen.getByTestId('svc-price-5')).toBeInTheDocument();
    expect(screen.getByText(/Các mốc giá cũ được giữ nguyên/)).toBeInTheDocument();
  });

  it('sửa thông tin dịch vụ gọi PUT, không gửi giá', async () => {
    vi.mocked(api.updateServiceCatalogItem).mockResolvedValue({ ...CONSULT_DETAIL, name: 'Tư vấn triển khai hệ thống' });
    render(<ServiceCatalogPage currentUserRoles={['VT-07']} />);
    fireEvent.click(await screen.findByTestId('svc-open-3'));
    await screen.findByTestId('svc-price-history');

    fireEvent.click(screen.getByTestId('svc-btn-edit'));
    expect(screen.getByTestId('svc-input-name')).toHaveValue('Tư vấn triển khai');
    expect(screen.queryByTestId('svc-input-price')).not.toBeInTheDocument();
    fireEvent.change(screen.getByTestId('svc-input-name'), { target: { value: 'Tư vấn triển khai hệ thống' } });
    fireEvent.click(screen.getByTestId('svc-submit'));

    await waitFor(() =>
      expect(api.updateServiceCatalogItem).toHaveBeenCalledWith(3, {
        name: 'Tư vấn triển khai hệ thống',
        unit: 'giờ',
        description: 'Tư vấn tại chỗ cho khách hàng',
      })
    );
  });

  it('ngừng dịch vụ phải xác nhận, rồi gọi PATCH status', async () => {
    vi.mocked(api.setServiceCatalogStatus).mockResolvedValue({ ...CONSULT_DETAIL, active: false });
    render(<ServiceCatalogPage currentUserRoles={['VT-07']} />);
    fireEvent.click(await screen.findByTestId('svc-open-3'));
    await screen.findByTestId('svc-price-history');

    fireEvent.click(screen.getByTestId('svc-btn-deactivate'));
    expect(screen.getByTestId('svc-confirm-deactivate')).toHaveTextContent('không còn chọn được');
    expect(api.setServiceCatalogStatus).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId('svc-btn-confirm-deactivate'));

    await waitFor(() => expect(api.setServiceCatalogStatus).toHaveBeenCalledWith(3, false));
    expect(await screen.findByTestId('svc-detail-status')).toHaveTextContent('Đã ngừng');
    expect(screen.getByTestId('svc-btn-activate')).toBeInTheDocument();
  });

  it('đang xem giá tại ngày khác hôm nay: sau khi lưu, nạp lại chi tiết theo đúng ngày đang xem', async () => {
    const FUTURE = '2999-02-01';
    vi.mocked(api.getServiceCatalogItem).mockImplementation(async (_id, asOf) => ({
      ...CONSULT_DETAIL,
      asOf: asOf ?? TODAY,
      currentPrice: asOf === FUTURE ? 480000 : 450000,
    }));
    // Response của API ghi tính theo "hôm nay" của máy chủ.
    vi.mocked(api.setServiceCatalogStatus).mockResolvedValue({ ...CONSULT_DETAIL, active: false, asOf: TODAY });
    render(<ServiceCatalogPage currentUserRoles={['VT-07']} />);
    fireEvent.click(await screen.findByTestId('svc-open-3'));
    await screen.findByTestId('svc-price-history');
    fireEvent.change(screen.getByTestId('svc-asof'), { target: { value: FUTURE } });
    await waitFor(() => expect(screen.getByTestId('svc-detail-price')).toHaveTextContent('480.000'));

    fireEvent.click(screen.getByTestId('svc-btn-deactivate'));
    fireEvent.click(screen.getByTestId('svc-btn-confirm-deactivate'));

    await waitFor(() => expect(api.getServiceCatalogItem).toHaveBeenLastCalledWith(3, FUTURE));
    await waitFor(() => expect(screen.getByTestId('svc-detail-price')).toHaveTextContent('480.000'));
  });

  it('tìm kiếm (debounce) và lọc trạng thái gửi đúng tham số', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      render(<ServiceCatalogPage currentUserRoles={['VT-07']} />);
      await screen.findByTestId('svc-row-3');
      fireEvent.change(screen.getByTestId('svc-search'), { target: { value: 'DV0000' } });
      await act(async () => {
        vi.advanceTimersByTime(350);
      });
      await waitFor(() =>
        expect(api.searchServiceCatalog).toHaveBeenLastCalledWith({ keyword: 'DV0000', active: undefined, asOf: TODAY })
      );
      fireEvent.change(screen.getByTestId('svc-status-filter'), { target: { value: 'INACTIVE' } });
      await waitFor(() =>
        expect(api.searchServiceCatalog).toHaveBeenLastCalledWith({ keyword: 'DV0000', active: false, asOf: TODAY })
      );
      fireEvent.change(screen.getByTestId('svc-asof'), { target: { value: '2026-01-15' } });
      await waitFor(() =>
        expect(api.searchServiceCatalog).toHaveBeenLastCalledWith({ keyword: 'DV0000', active: false, asOf: '2026-01-15' })
      );
    } finally {
      vi.useRealTimers();
    }
  });

  it('nút Nhật ký hệ thống mở nhật ký để tra lịch sử thao tác (TC-04)', async () => {
    const onViewAuditLog = vi.fn();
    render(<ServiceCatalogPage currentUserRoles={['VT-07']} onViewAuditLog={onViewAuditLog} />);
    fireEvent.click(await screen.findByTestId('svc-btn-audit'));
    expect(onViewAuditLog).toHaveBeenCalledTimes(1);
  });
});
