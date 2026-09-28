import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CompanySettingPage from '../pages/CompanySettingPage';
import * as api from '../api/companySettingApi';
import type { CompanySettingRes } from '../types/adminTypes';

vi.mock('../api/companySettingApi', () => {
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
    getCompanySettings: vi.fn(),
    updateCompanySettings: vi.fn(),
    getFiscalPeriod: vi.fn(),
    getCurrentFiscalPeriod: vi.fn(),
    AdminApiError: MockAdminApiError,
  };
});

const CONFIGURED: CompanySettingRes = {
  configured: true,
  companyName: 'Công ty TNHH Mô Phỏng Dịch Vụ',
  taxCode: '0101234567',
  address: 'Số 1 Đường Mô Phỏng, Hà Nội',
  phone: '02438123456',
  email: 'lienhe@mophong.example',
  currency: 'VND',
  fiscalYearStartMonth: 1,
  standardWorkingDaysPerMonth: 22,
  updatedBy: 'admin',
  updatedAt: '2026-09-25T10:00:00',
};

const DEFAULTS: CompanySettingRes = {
  configured: false,
  currency: 'VND',
  fiscalYearStartMonth: 1,
  standardWorkingDaysPerMonth: 22,
};

describe('CompanySettingPage (NCL-15-CN-002)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.getCompanySettings).mockResolvedValue(CONFIGURED);
  });

  it('hiện cấu hình đã lưu và người cập nhật lần cuối (TC-04)', async () => {
    render(<CompanySettingPage currentUserRoles={['VT-07']} />);

    expect(await screen.findByTestId('company-input-name')).toHaveValue('Công ty TNHH Mô Phỏng Dịch Vụ');
    expect(screen.getByTestId('company-input-fiscal-start')).toHaveValue('1');
    expect(screen.getByTestId('company-status')).toHaveTextContent('Cập nhật lần cuối bởi admin');
    expect(screen.getByTestId('company-save')).toBeDisabled();
  });

  it('chưa cấu hình lần nào → hiện lời nhắc và cho lưu ngay', async () => {
    vi.mocked(api.getCompanySettings).mockResolvedValue(DEFAULTS);
    render(<CompanySettingPage currentUserRoles={['VT-07']} />);

    expect(await screen.findByTestId('company-not-configured')).toHaveTextContent('Chưa khai báo thông tin công ty');
    expect(screen.getByTestId('company-save')).toBeEnabled();
  });

  it('TC-01: đặt tháng bắt đầu năm tài chính là tháng 4 → xem trước chia kỳ từ tháng 4 và gửi đúng payload', async () => {
    vi.mocked(api.updateCompanySettings).mockResolvedValue({ ...CONFIGURED, fiscalYearStartMonth: 4, updatedAt: '2026-09-27T10:00:00' });
    render(<CompanySettingPage currentUserRoles={['VT-07']} />);
    const select = await screen.findByTestId('company-input-fiscal-start');

    fireEvent.change(select, { target: { value: '4' } });
    expect(screen.getByTestId('company-fiscal-change')).toHaveTextContent('chia kỳ từ tháng 4 thay vì tháng 1');
    expect(screen.getByTestId('company-preview-q1')).toHaveTextContent(/T4\/\d{4} – T6\/\d{4}/);
    expect(screen.getByTestId('company-preview-q4')).toHaveTextContent(/T1\/\d{4} – T3\/\d{4}/);

    fireEvent.click(screen.getByTestId('company-save'));
    await waitFor(() =>
      expect(api.updateCompanySettings).toHaveBeenCalledWith({
        companyName: 'Công ty TNHH Mô Phỏng Dịch Vụ',
        taxCode: '0101234567',
        address: 'Số 1 Đường Mô Phỏng, Hà Nội',
        phone: '02438123456',
        email: 'lienhe@mophong.example',
        currency: 'VND',
        fiscalYearStartMonth: 4,
        standardWorkingDaysPerMonth: 22,
      })
    );
    expect(await screen.findByText(/chia kỳ bắt đầu từ tháng 4/)).toBeInTheDocument();
    expect(screen.getByTestId('company-save')).toBeDisabled();
  });

  it('TC-02: để trống tên công ty → yêu cầu bổ sung tên, không gọi API', async () => {
    render(<CompanySettingPage currentUserRoles={['VT-07']} />);
    const name = await screen.findByTestId('company-input-name');
    fireEvent.change(name, { target: { value: '   ' } });
    fireEvent.click(screen.getByTestId('company-save'));

    expect(await screen.findByTestId('company-error-companyName')).toHaveTextContent('Nhập tên công ty');
    expect(name).toHaveAttribute('aria-invalid', 'true');
    expect(name).toHaveFocus();
    expect(api.updateCompanySettings).not.toHaveBeenCalled();
  });

  it('TC-02: máy chủ trả 400 với fieldErrors companyName → hiện lỗi dưới ô tên', async () => {
    vi.mocked(api.getCompanySettings).mockResolvedValue(DEFAULTS);
    vi.mocked(api.updateCompanySettings).mockRejectedValue(
      new api.AdminApiError('VALIDATION_ERROR', 'Du lieu khong hop le', 400, [
        { field: 'companyName', message: 'Ten cong ty khong duoc de trong' },
      ])
    );
    render(<CompanySettingPage currentUserRoles={['VT-07']} />);
    fireEvent.change(await screen.findByTestId('company-input-name'), { target: { value: 'X' } });
    fireEvent.click(screen.getByTestId('company-save'));

    expect(await screen.findByTestId('company-error-companyName')).toHaveTextContent('Nhập tên công ty');
  });

  it('kiểm tra định dạng mã số thuế, số điện thoại, email, ngày công', async () => {
    render(<CompanySettingPage currentUserRoles={['VT-07']} />);
    fireEvent.change(await screen.findByTestId('company-input-tax'), { target: { value: '12345' } });
    fireEvent.change(screen.getByTestId('company-input-phone'), { target: { value: '12345' } });
    fireEvent.change(screen.getByTestId('company-input-email'), { target: { value: 'sai-email' } });
    fireEvent.change(screen.getByTestId('company-input-days'), { target: { value: '40' } });
    fireEvent.click(screen.getByTestId('company-save'));

    expect(await screen.findByTestId('company-error-taxCode')).toHaveTextContent('10 chữ số');
    expect(screen.getByTestId('company-error-phone')).toHaveTextContent('bắt đầu bằng 0');
    expect(screen.getByTestId('company-error-email')).toHaveTextContent('Email');
    expect(screen.getByTestId('company-error-standardWorkingDaysPerMonth')).toHaveTextContent('1 đến 31');
    expect(api.updateCompanySettings).not.toHaveBeenCalled();
  });

  it('trường tùy chọn để trống được gửi là null', async () => {
    vi.mocked(api.updateCompanySettings).mockResolvedValue(CONFIGURED);
    render(<CompanySettingPage currentUserRoles={['VT-07']} />);
    fireEvent.change(await screen.findByTestId('company-input-tax'), { target: { value: '' } });
    fireEvent.change(screen.getByTestId('company-input-email'), { target: { value: '' } });
    fireEvent.click(screen.getByTestId('company-save'));

    await waitFor(() =>
      expect(api.updateCompanySettings).toHaveBeenCalledWith(expect.objectContaining({ taxCode: null, email: null }))
    );
  });

  it('"Hoàn tác" trả form về cấu hình đã lưu', async () => {
    render(<CompanySettingPage currentUserRoles={['VT-07']} />);
    const name = await screen.findByTestId('company-input-name');
    fireEvent.change(name, { target: { value: 'Tên mới' } });
    expect(screen.getByTestId('company-status')).toHaveTextContent('Có thay đổi chưa lưu');
    fireEvent.click(screen.getByTestId('company-reset'));

    expect(name).toHaveValue('Công ty TNHH Mô Phỏng Dịch Vụ');
    expect(screen.getByTestId('company-save')).toBeDisabled();
  });

  it('TC-03: vai trò không phải Quản trị viên vẫn gọi API và thấy trang từ chối khi 403', async () => {
    vi.mocked(api.getCompanySettings).mockRejectedValue(new api.AdminApiError('FORBIDDEN', 'Forbidden', 403));
    render(<CompanySettingPage currentUserRoles={['VT-05']} />);

    expect(await screen.findByTestId('company-access-denied')).toHaveTextContent('đã được ghi vào nhật ký');
    expect(api.getCompanySettings).toHaveBeenCalledTimes(1);
  });

  it('nút Nhật ký hệ thống và Xem kỳ tài chính gọi điều hướng', async () => {
    const onViewAuditLog = vi.fn();
    const onViewFiscalPeriods = vi.fn();
    render(
      <CompanySettingPage currentUserRoles={['VT-07']} onViewAuditLog={onViewAuditLog} onViewFiscalPeriods={onViewFiscalPeriods} />
    );
    fireEvent.click(await screen.findByTestId('company-btn-audit'));
    fireEvent.click(screen.getByTestId('company-btn-fiscal'));
    expect(onViewAuditLog).toHaveBeenCalledTimes(1);
    expect(onViewFiscalPeriods).toHaveBeenCalledTimes(1);
  });
});
