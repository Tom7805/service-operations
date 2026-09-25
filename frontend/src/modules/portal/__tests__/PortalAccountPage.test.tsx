import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PortalAccountPage from '../pages/PortalAccountPage';
import * as portalApi from '../api/portalAccountApi';
import * as customersApi from '../../customers/api/customersApi';
import type { PortalAccountRes, PortalContactCandidateRes } from '../types/portalAccountTypes';
import type { AuditLogEntry } from '../../auditLog/types/auditLogTypes';

vi.mock('../api/portalAccountApi', async () => {
  const actual = await vi.importActual<typeof import('../api/portalAccountApi')>('../api/portalAccountApi');
  return {
    PortalAccountApiError: actual.PortalAccountApiError,
    fetchPortalAccounts: vi.fn(),
    fetchPortalCandidates: vi.fn(),
    createPortalAccount: vi.fn(),
    updatePortalAccountStatus: vi.fn(),
    getPortalAccount: vi.fn(),
    checkPortalAccountAccess: vi.fn(),
    fetchPortalAccountHistory: vi.fn(),
  };
});

vi.mock('../../customers/api/customersApi', () => ({
  searchCustomerOptions: vi.fn(),
}));

const api = vi.mocked(portalApi);
const { PortalAccountApiError } = portalApi;

const customers = [
  { id: 1001, code: 'KH-100001', name: 'Cong ty CP Giai Phap So Viet', status: 'ACTIVE' },
  { id: 1002, code: 'KH-100002', name: 'Cong ty TNHH Da Gop', status: 'MERGED' },
];

function account(overrides: Partial<PortalAccountRes> = {}): PortalAccountRes {
  return {
    id: 3,
    userId: 41,
    username: 'nhi.abc',
    fullName: 'Nguyen Thi Nhi',
    email: 'nhi@abc.example',
    status: 'ACTIVE',
    customerId: 1001,
    customerCode: 'KH-100001',
    customerName: 'Cong ty CP Giai Phap So Viet',
    contactId: 12,
    contactName: 'Nguyen Thi Nhi',
    contactTitle: 'Truong phong Cong nghe',
    contactRole: 'SECONDARY',
    statusReason: null,
    statusChangedBy: null,
    statusChangedAt: null,
    createdBy: 'admin',
    createdAt: '2026-09-24T10:00:00',
    ...overrides,
  };
}

const candidates: PortalContactCandidateRes[] = [
  {
    contactId: 11,
    fullName: 'Tran Van B',
    title: 'Giam doc',
    email: 'b@abc.example',
    role: 'PRIMARY',
    portalAccountId: null,
    portalUsername: null,
    portalStatus: null,
  },
  {
    contactId: 12,
    fullName: 'Nguyen Thi Nhi',
    title: 'Truong phong Cong nghe',
    email: 'nhi@abc.example',
    role: 'SECONDARY',
    portalAccountId: 3,
    portalUsername: 'nhi.abc',
    portalStatus: 'ACTIVE',
  },
];

const historyEntry: AuditLogEntry = {
  id: 90,
  actorUserId: 1,
  actorUsername: 'admin',
  actorRole: 'VT-07',
  action: 'Cấp tài khoản cổng khách hàng',
  targetType: 'PORTAL',
  targetId: 3,
  targetLabel: 'Tài khoản cổng nhi.abc',
  detail: 'Cap tai khoan cong nhi.abc cho nguoi lien he Nguyen Thi Nhi cua khach hang KH-100001',
  performedAt: '2026-09-24T10:00:00',
};

async function renderAdmin() {
  render(<PortalAccountPage currentUserRoles={['VT-07']} currentUserName="Quản trị viên" />);
  await waitFor(() => expect(api.fetchPortalAccounts).toHaveBeenCalled());
}

function openRowMenu(username: string) {
  fireEvent.click(screen.getByRole('button', { name: `Thao tác với tài khoản ${username}` }));
}

beforeEach(() => {
  vi.clearAllMocks();
  // Máy chủ giả: tìm theo tên/mã và bỏ hồ sơ đã gộp (excludeMerged) như GET /customers/paged.
  vi.mocked(customersApi.searchCustomerOptions).mockImplementation(async (keyword: string) =>
    customers.filter(
      (c) =>
        c.status !== 'MERGED' &&
        (!keyword || `${c.code} ${c.name}`.toLowerCase().includes(keyword.toLowerCase()))
    ) as never
  );
  api.fetchPortalAccounts.mockResolvedValue([account()]);
  api.fetchPortalCandidates.mockResolvedValue(candidates);
  api.fetchPortalAccountHistory.mockResolvedValue([historyEntry]);
  api.checkPortalAccountAccess.mockRejectedValue(new Error('403'));
});

describe('NCL-13-CN-001 — Cấp tài khoản cổng cho khách hàng', () => {
  it('liệt kê tài khoản cổng kèm khách hàng, người liên hệ và trạng thái', async () => {
    await renderAdmin();
    const row = await screen.findByTestId('portal-account-row-3');
    expect(within(row).getByText('@nhi.abc')).toBeInTheDocument();
    expect(within(row).getByText('KH-100001')).toBeInTheDocument();
    expect(within(row).getByText('Đang hoạt động')).toBeInTheDocument();
    expect(screen.getByTestId('portal-account-total')).toHaveTextContent('1');
  });

  it('TC-01: chọn khách hàng → đầu mối chính được chọn sẵn, người đã có tài khoản bị khoá chọn, cấp thành công', async () => {
    api.createPortalAccount.mockResolvedValue(
      account({ id: 4, userId: 42, username: 'b', fullName: 'Tran Van B', email: 'b@abc.example', contactId: 11, contactName: 'Tran Van B', contactRole: 'PRIMARY' })
    );
    await renderAdmin();
    fireEvent.click(screen.getByTestId('portal-account-open-grant'));
    const modal = await screen.findByTestId('portal-grant-modal');

    // Hồ sơ đã gộp không có trong danh sách chọn.
    const select = within(modal).getByTestId('portal-grant-customer') as HTMLSelectElement;
    await within(select).findByRole('option', { name: /KH-100001/ });
    expect(within(select).queryByText(/KH-100002/)).not.toBeInTheDocument();

    fireEvent.change(select, { target: { value: '1001' } });
    await waitFor(() => expect(api.fetchPortalCandidates).toHaveBeenCalledWith(1001));

    const primary = await within(modal).findByTestId('portal-grant-contact-11');
    expect(within(primary).getByRole('radio')).toBeChecked();
    expect(within(within(modal).getByTestId('portal-grant-contact-12')).getByRole('radio')).toBeDisabled();

    // Tên đăng nhập gợi ý: phần trước @ của email quá ngắn ("b") nên lấy từ họ tên.
    expect(within(modal).getByTestId('portal-grant-username')).toHaveValue('tran.van.b');
    fireEvent.change(within(modal).getByTestId('portal-grant-username'), { target: { value: 'tranvanb' } });
    fireEvent.change(within(modal).getByTestId('portal-grant-password'), { target: { value: 'Matkhau123' } });
    fireEvent.change(within(modal).getByTestId('portal-grant-confirm'), { target: { value: 'Matkhau123' } });
    expect(within(modal).getByTestId('portal-grant-summary')).toHaveTextContent('KH-100001');

    fireEvent.click(within(modal).getByTestId('portal-grant-submit'));

    await waitFor(() =>
      expect(api.createPortalAccount).toHaveBeenCalledWith({ contactId: 11, username: 'tranvanb', password: 'Matkhau123' })
    );
    // Không gửi customerId — khách hàng suy ra từ người liên hệ.
    expect(api.createPortalAccount.mock.calls[0][0]).not.toHaveProperty('customerId');
    expect(await screen.findByTestId('portal-grant-success')).toBeInTheDocument();
    expect(screen.getByTestId('portal-grant-success-password')).toHaveTextContent('Matkhau123');
    expect(screen.getByTestId('portal-account-notice')).toHaveTextContent('Đã cấp tài khoản cổng @b');
    expect(api.fetchPortalAccounts).toHaveBeenCalledTimes(2);
  });

  it('TC-01: chặn ngay trên form khi tên đăng nhập sai định dạng, mật khẩu không đạt luật hoặc nhập lại không khớp', async () => {
    await renderAdmin();
    fireEvent.click(screen.getByTestId('portal-account-open-grant'));
    const modal = await screen.findByTestId('portal-grant-modal');
    await within(modal).findByRole('option', { name: /KH-100001/ });
    fireEvent.change(within(modal).getByTestId('portal-grant-customer'), { target: { value: '1001' } });
    await within(modal).findByTestId('portal-grant-contact-11');

    fireEvent.change(within(modal).getByTestId('portal-grant-username'), { target: { value: 'tên có dấu' } });
    fireEvent.change(within(modal).getByTestId('portal-grant-password'), { target: { value: 'abcdefgh' } });
    fireEvent.click(within(modal).getByTestId('portal-grant-submit'));

    expect(await within(modal).findByText(/chỉ gồm chữ không dấu/)).toBeInTheDocument();
    expect(within(modal).getByText(/có ít nhất một chữ số/, { selector: '.field-error' })).toBeInTheDocument();
    expect(api.createPortalAccount).not.toHaveBeenCalled();

    fireEvent.change(within(modal).getByTestId('portal-grant-username'), { target: { value: 'tranvanb' } });
    fireEvent.change(within(modal).getByTestId('portal-grant-password'), { target: { value: 'Matkhau123' } });
    fireEvent.change(within(modal).getByTestId('portal-grant-confirm'), { target: { value: 'Matkhau124' } });
    fireEvent.click(within(modal).getByTestId('portal-grant-submit'));
    expect(await within(modal).findByText('Mật khẩu nhập lại không khớp')).toBeInTheDocument();
    expect(api.createPortalAccount).not.toHaveBeenCalled();
  });

  it('TC-01: nút "Tạo ngẫu nhiên" điền mật khẩu đạt luật vào cả hai ô', async () => {
    await renderAdmin();
    fireEvent.click(screen.getByTestId('portal-account-open-grant'));
    const modal = await screen.findByTestId('portal-grant-modal');
    await within(modal).findByRole('option', { name: /KH-100001/ });
    fireEvent.change(within(modal).getByTestId('portal-grant-customer'), { target: { value: '1001' } });
    await within(modal).findByTestId('portal-grant-contact-11');
    fireEvent.click(within(modal).getByTestId('portal-grant-generate'));
    const pwd = (within(modal).getByTestId('portal-grant-password') as HTMLInputElement).value;
    expect(pwd).toMatch(/^(?=.*[A-Za-z])(?=.*\d).{12}$/);
    expect(within(modal).getByTestId('portal-grant-confirm')).toHaveValue(pwd);
  });

  it('TC-01: trùng tên đăng nhập (409) báo ngay dưới ô tên đăng nhập', async () => {
    api.createPortalAccount.mockRejectedValue(
      new PortalAccountApiError('DUPLICATE_DATA', 'Ten dang nhap b da ton tai', 409)
    );
    await renderAdmin();
    fireEvent.click(screen.getByTestId('portal-account-open-grant'));
    const modal = await screen.findByTestId('portal-grant-modal');
    await within(modal).findByRole('option', { name: /KH-100001/ });
    fireEvent.change(within(modal).getByTestId('portal-grant-customer'), { target: { value: '1001' } });
    await within(modal).findByTestId('portal-grant-contact-11');
    fireEvent.change(within(modal).getByTestId('portal-grant-password'), { target: { value: 'Matkhau123' } });
    fireEvent.change(within(modal).getByTestId('portal-grant-confirm'), { target: { value: 'Matkhau123' } });
    fireEvent.click(within(modal).getByTestId('portal-grant-submit'));
    expect(await within(modal).findByText(/Tên đăng nhập này đã được dùng/)).toBeInTheDocument();
    expect(screen.queryByTestId('portal-grant-success')).not.toBeInTheDocument();
  });

  it('TC-01: khách hàng chưa có người liên hệ thì hướng dẫn thêm người liên hệ trước, không cho cấp', async () => {
    api.fetchPortalCandidates.mockResolvedValue([]);
    await renderAdmin();
    fireEvent.click(screen.getByTestId('portal-account-open-grant'));
    const modal = await screen.findByTestId('portal-grant-modal');
    await within(modal).findByRole('option', { name: /KH-100001/ });
    fireEvent.change(within(modal).getByTestId('portal-grant-customer'), { target: { value: '1001' } });
    expect(await within(modal).findByTestId('portal-grant-no-contacts')).toBeInTheDocument();
    expect(within(modal).getByTestId('portal-grant-submit')).toBeDisabled();
  });

  it('TC-02: khoá tài khoản của người liên hệ đã nghỉ việc — gửi LOCKED kèm lý do, bảng cập nhật trạng thái', async () => {
    api.updatePortalAccountStatus.mockResolvedValue(
      account({ status: 'LOCKED', statusReason: 'Người liên hệ đã nghỉ việc ở phía khách hàng', statusChangedBy: 'admin', statusChangedAt: '2026-09-25T09:00:00' })
    );
    await renderAdmin();
    await screen.findByTestId('portal-account-row-3');
    openRowMenu('nhi.abc');
    fireEvent.click(await screen.findByTestId('portal-account-toggle-3'));

    const modal = await screen.findByTestId('portal-status-modal');
    expect(modal).toHaveTextContent('Không xóa dữ liệu nào');
    fireEvent.click(within(modal).getByText('Người liên hệ đã nghỉ việc ở phía khách hàng'));
    fireEvent.click(within(modal).getByTestId('portal-status-submit'));

    await waitFor(() =>
      expect(api.updatePortalAccountStatus).toHaveBeenCalledWith(3, {
        status: 'LOCKED',
        reason: 'Người liên hệ đã nghỉ việc ở phía khách hàng',
      })
    );
    const row = await screen.findByTestId('portal-account-row-3');
    expect(within(row).getByText('Đã khóa')).toBeInTheDocument();
    expect(within(row).getByText('Người liên hệ đã nghỉ việc ở phía khách hàng')).toBeInTheDocument();
    expect(screen.getByTestId('portal-account-notice')).toHaveTextContent('dữ liệu được giữ nguyên');
    expect(screen.getByTestId('portal-account-locked')).toHaveTextContent('1');
  });

  it('TC-02: mở khoá lại tài khoản đang khoá', async () => {
    api.fetchPortalAccounts.mockResolvedValue([account({ status: 'LOCKED', statusReason: 'Nghi viec' })]);
    api.updatePortalAccountStatus.mockResolvedValue(account({ status: 'ACTIVE' }));
    await renderAdmin();
    await screen.findByTestId('portal-account-row-3');
    openRowMenu('nhi.abc');
    const item = await screen.findByTestId('portal-account-toggle-3');
    expect(item).toHaveTextContent('Mở khóa tài khoản');
    fireEvent.click(item);
    fireEvent.click(within(await screen.findByTestId('portal-status-modal')).getByTestId('portal-status-submit'));
    await waitFor(() => expect(api.updatePortalAccountStatus).toHaveBeenCalledWith(3, { status: 'ACTIVE', reason: null }));
    expect(await screen.findByTestId('portal-account-notice')).toHaveTextContent('Đã mở khóa');
  });

  it('TC-02: trạng thái đã đổi ở nơi khác (INVALID_STATE) thì báo lỗi và nạp lại danh sách', async () => {
    api.updatePortalAccountStatus.mockRejectedValue(
      new PortalAccountApiError('INVALID_STATE', 'Tai khoan cong nhi.abc da bi khoa', 400)
    );
    await renderAdmin();
    await screen.findByTestId('portal-account-row-3');
    openRowMenu('nhi.abc');
    fireEvent.click(await screen.findByTestId('portal-account-toggle-3'));
    fireEvent.click(within(await screen.findByTestId('portal-status-modal')).getByTestId('portal-status-submit'));
    expect(await screen.findByTestId('portal-status-error')).toHaveTextContent('đã ở trạng thái khóa');
    await waitFor(() => expect(api.fetchPortalAccounts).toHaveBeenCalledTimes(2));
  });

  it('TC-03: người không phải Quản trị viên thấy màn từ chối và endpoint thật được gọi để backend ghi nhật ký', async () => {
    render(<PortalAccountPage currentUserRoles={['VT-04']} currentUserName="Sales A" />);
    expect(screen.getByTestId('portal-account-access-denied')).toHaveTextContent('Quản trị viên');
    await waitFor(() => expect(api.checkPortalAccountAccess).toHaveBeenCalledTimes(1));
    expect(api.fetchPortalAccounts).not.toHaveBeenCalled();
    expect(customersApi.searchCustomerOptions).not.toHaveBeenCalled();
  });

  it('TC-04: chi tiết tài khoản hiện lịch sử với người thực hiện, nội dung và thời điểm', async () => {
    await renderAdmin();
    await screen.findByTestId('portal-account-row-3');
    openRowMenu('nhi.abc');
    fireEvent.click(await screen.findByTestId('portal-account-detail-3'));
    const modal = await screen.findByTestId('portal-detail-modal');
    const history = await within(modal).findByTestId('portal-detail-history');
    expect(api.fetchPortalAccountHistory).toHaveBeenCalledWith(3);
    expect(history).toHaveTextContent('Cấp tài khoản cổng khách hàng');
    expect(history).toHaveTextContent('admin');
    expect(history).toHaveTextContent('Cap tai khoan cong nhi.abc');
    expect(history).toHaveTextContent(new Date('2026-09-24T10:00:00').toLocaleString('vi-VN'));
  });

  it('TC-04: trang hiển thị nhật ký cổng khách hàng gần đây', async () => {
    await renderAdmin();
    const panel = await screen.findByTestId('portal-account-recent');
    await waitFor(() => expect(panel).toHaveTextContent('Cấp tài khoản cổng khách hàng'));
    expect(api.fetchPortalAccountHistory).toHaveBeenCalledWith(undefined, 50, true);
  });

  it('lọc theo khách hàng gọi lại API với customerId, lọc trạng thái và tìm kiếm trên danh sách', async () => {
    api.fetchPortalAccounts.mockResolvedValue([
      account(),
      account({
        id: 5,
        username: 'old.contact',
        fullName: 'Le Van C',
        email: 'c@abc.example',
        status: 'LOCKED',
        contactId: 13,
        contactName: 'Le Van C',
      }),
    ]);
    await renderAdmin();
    await screen.findByTestId('portal-account-row-5');

    fireEvent.click(screen.getByTestId('portal-account-tab-LOCKED'));
    expect(screen.queryByTestId('portal-account-row-3')).not.toBeInTheDocument();
    expect(screen.getByTestId('portal-account-row-5')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('portal-account-tab-ALL'));
    fireEvent.change(screen.getByLabelText('Tìm tài khoản cổng'), { target: { value: 'nhi' } });
    expect(screen.getByTestId('portal-account-row-3')).toBeInTheDocument();
    expect(screen.queryByTestId('portal-account-row-5')).not.toBeInTheDocument();

    await waitFor(() => expect(screen.getByTestId('portal-account-customer-filter')).not.toBeDisabled());
    await within(screen.getByTestId('portal-account-customer-filter')).findByRole('option', { name: /KH-100001/ });
    fireEvent.change(screen.getByTestId('portal-account-customer-filter'), { target: { value: '1001' } });
    await waitFor(() => expect(api.fetchPortalAccounts).toHaveBeenLastCalledWith({ customerId: 1001 }));
  });

  it('lỗi tải danh sách hiện thông báo và cho thử lại', async () => {
    api.fetchPortalAccounts.mockRejectedValueOnce(new Error('Máy chủ lỗi'));
    await renderAdmin();
    expect(await screen.findByText('Máy chủ lỗi')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }));
    expect(await screen.findByTestId('portal-account-row-3')).toBeInTheDocument();
  });
});
