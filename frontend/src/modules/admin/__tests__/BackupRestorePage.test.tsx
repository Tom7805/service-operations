import '@testing-library/jest-dom';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import BackupRestorePage from '../pages/BackupRestorePage';
import * as api from '../api/backupApi';
import type { BackupRecordRes, RestoreChallengeRes } from '../types/adminTypes';

vi.mock('../api/backupApi', async () => {
  const { AdminApiError } = await vi.importActual<typeof import('../api/adminHttp')>('../api/adminHttp');
  return {
    listBackups: vi.fn(),
    getBackup: vi.fn(),
    createBackup: vi.fn(),
    requestRestore: vi.fn(),
    confirmRestore: vi.fn(),
    AdminApiError,
  };
});

const OK: BackupRecordRes = {
  id: 8,
  code: 'BK-20260925-100000-8',
  status: 'COMPLETED',
  triggerType: 'MANUAL',
  fileName: 'BK-20260925-100000-8.json',
  sizeBytes: 482113,
  checksumSha256: 'a'.repeat(64),
  tableCount: 71,
  rowCount: 5230,
  note: 'Truoc khi nang cap',
  createdBy: 'admin',
  startedAt: '2026-09-25T10:00:00',
  completedAt: '2026-09-25T10:00:02',
  restorable: true,
};
const FAILED: BackupRecordRes = {
  id: 7,
  code: 'BK-20260924-020000-7',
  status: 'FAILED',
  triggerType: 'SCHEDULED',
  errorMessage: 'Het dung luong dia',
  startedAt: '2026-09-24T02:00:00',
  restorable: false,
};
const DANGLING: BackupRecordRes = {
  id: 6,
  code: 'BK-20260923-020000-6',
  status: 'IN_PROGRESS',
  triggerType: 'SCHEDULED',
  startedAt: '2026-09-23T02:00:00',
  restorable: false,
};

function challenge(minutes = 5): RestoreChallengeRes {
  const exp = new Date(Date.now() + minutes * 60000);
  const pad = (n: number) => String(n).padStart(2, '0');
  const local = `${exp.getFullYear()}-${pad(exp.getMonth() + 1)}-${pad(exp.getDate())}T${pad(exp.getHours())}:${pad(exp.getMinutes())}:${pad(exp.getSeconds())}`;
  return {
    requestId: 15,
    backupId: 8,
    backupCode: OK.code,
    backupCreatedAt: OK.startedAt,
    confirmationToken: 'tok-123',
    expiresAt: local,
    warning: 'Phuc hoi se THAY TOAN BO du lieu van hanh hien tai.',
  };
}

async function openStep2() {
  fireEvent.click(await screen.findByTestId('backup-restore-8'));
  fireEvent.click(screen.getByTestId('restore-step1'));
  await screen.findByTestId('restore-warning');
}

describe('BackupRestorePage (NCL-15-CN-003)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.listBackups).mockResolvedValue([OK, FAILED, DANGLING]);
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('liệt kê bản sao kèm trạng thái, thời điểm, dung lượng và người tạo', async () => {
    render(<BackupRestorePage currentUserRoles={['VT-07']} />);
    const row = await screen.findByTestId('backup-row-8');
    expect(within(row).getByText('Hoàn tất')).toBeInTheDocument();
    expect(screen.getByTestId('backup-size-8')).toHaveTextContent('470,8 KB');
    expect(within(row).getByText('admin')).toBeInTheDocument();
    expect(within(screen.getByTestId('backup-row-7')).getByText('Hệ thống')).toBeInTheDocument();
    expect(within(screen.getByTestId('backup-row-7')).getByText('Het dung luong dia')).toBeInTheDocument();
  });

  it('TC-01: tạo bản sao theo yêu cầu → báo thời điểm và dung lượng, bản sao đứng đầu danh sách', async () => {
    const created: BackupRecordRes = { ...OK, id: 9, code: 'BK-20260927-090000-9', sizeBytes: 1048576, note: 'Kiem thu', completedAt: '2026-09-27T09:00:03' };
    vi.mocked(api.createBackup).mockResolvedValue(created);
    render(<BackupRestorePage currentUserRoles={['VT-07']} />);
    await screen.findByTestId('backup-row-8');
    vi.mocked(api.listBackups).mockResolvedValue([created, OK, FAILED]);

    fireEvent.change(screen.getByTestId('backup-note'), { target: { value: '  Kiem thu ' } });
    fireEvent.click(screen.getByTestId('backup-create'));

    await waitFor(() => expect(api.createBackup).toHaveBeenCalledWith('Kiem thu'));
    expect(await screen.findByText(/Đã tạo bản sao lưu BK-20260927-090000-9 lúc .* — 1 MB/)).toBeInTheDocument();
    expect(await screen.findByTestId('backup-row-9')).toBeInTheDocument();
    expect(screen.getByTestId('backup-note')).toHaveValue('');
  });

  it('TC-01: máy chủ trả 200 nhưng status FAILED → báo thất bại, không báo thành công', async () => {
    vi.mocked(api.createBackup).mockResolvedValue({ ...FAILED, id: 10, code: 'BK-X-10', triggerType: 'MANUAL' });
    render(<BackupRestorePage currentUserRoles={['VT-07']} />);
    await screen.findByTestId('backup-row-8');
    fireEvent.click(screen.getByTestId('backup-create'));

    expect(await screen.findByText(/Tạo bản sao lưu BK-X-10 thất bại: Het dung luong dia/)).toBeInTheDocument();
    expect(screen.queryByText(/Đã tạo bản sao lưu/)).not.toBeInTheDocument();
  });

  it('đang có sao lưu/phục hồi khác (400 INVALID_STATE) → báo thử lại sau', async () => {
    vi.mocked(api.listBackups).mockResolvedValue([OK]);
    vi.mocked(api.createBackup).mockRejectedValue(new api.AdminApiError('INVALID_STATE', 'Dang sao luu du lieu, vui long thu lai sau', 400));
    render(<BackupRestorePage currentUserRoles={['VT-07']} />);
    await screen.findByTestId('backup-row-8');
    fireEvent.click(screen.getByTestId('backup-create'));
    expect(await screen.findByText(/Vui lòng thử lại sau ít phút/)).toBeInTheDocument();
  });

  it('TC-02: bản sao lỗi hoặc dở dang không phục hồi được — nút khóa và hiện lý do', async () => {
    render(<BackupRestorePage currentUserRoles={['VT-07']} />);
    await screen.findByTestId('backup-row-8');

    expect(screen.getByTestId('backup-restore-8')).toBeEnabled();
    expect(screen.getByTestId('backup-restore-7')).toBeDisabled();
    expect(screen.getByTestId('backup-reason-7')).toHaveTextContent('Bản sao lỗi — không phục hồi được');
    expect(screen.getByTestId('backup-restore-6')).toBeDisabled();
    expect(screen.getByTestId('backup-reason-6')).toHaveTextContent('Bản sao dở dang');
    fireEvent.click(screen.getByTestId('backup-toggle-7'));
    expect(screen.getByTestId('backup-detail-7')).toHaveTextContent('bị lỗi khi tạo: Het dung luong dia');
  });

  it('TC-02: bản sao COMPLETED nhưng tệp hỏng → bước 1 bị chặn, báo bản sao không hợp lệ, không cho xác nhận', async () => {
    vi.mocked(api.requestRestore).mockRejectedValue(
      new api.AdminApiError('INVALID_STATE', `Ban sao luu ${OK.code} khong hop le (tep sao luu da bi thay doi hoac hong (sai checksum)), khong the phuc hoi`, 400)
    );
    render(<BackupRestorePage currentUserRoles={['VT-07']} />);
    fireEvent.click(await screen.findByTestId('backup-restore-8'));
    fireEvent.click(screen.getByTestId('restore-step1'));

    expect(await screen.findByTestId('restore-error')).toHaveTextContent(`Bản sao lưu ${OK.code} không hợp lệ`);
    expect(screen.getByTestId('restore-error')).toHaveTextContent('sai mã kiểm tra SHA-256');
    expect(screen.queryByTestId('restore-confirm')).not.toBeInTheDocument();
    expect(api.confirmRestore).not.toHaveBeenCalled();
  });

  it('phục hồi 2 bước: cảnh báo + đếm ngược, phải tích xác nhận và nhập mật khẩu; thành công thì mời tải lại trang', async () => {
    vi.mocked(api.requestRestore).mockResolvedValue(challenge());
    vi.mocked(api.confirmRestore).mockResolvedValue({
      requestId: 15, backupId: 8, backupCode: OK.code, status: 'COMPLETED', tablesRestored: 71, rowsRestored: 5230,
      restoredToPointInTime: '2026-09-25T10:00:00', completedAt: '2026-09-27T10:31:12',
    });
    const onReloadApp = vi.fn();
    render(<BackupRestorePage currentUserRoles={['VT-07']} onReloadApp={onReloadApp} />);
    await openStep2();

    expect(api.requestRestore).toHaveBeenCalledWith(8);
    expect(screen.getByTestId('restore-warning')).toHaveTextContent('THAY TOAN BO');
    expect(screen.getByTestId('restore-countdown')).toHaveTextContent(/4:5\d|5:00/);
    const confirm = screen.getByTestId('restore-confirm');
    expect(confirm).toBeDisabled();
    fireEvent.change(screen.getByTestId('restore-password'), { target: { value: 'Admin@123' } });
    expect(confirm).toBeDisabled();
    fireEvent.click(screen.getByTestId('restore-ack'));
    expect(confirm).toBeEnabled();
    fireEvent.click(confirm);

    await waitFor(() => expect(api.confirmRestore).toHaveBeenCalledWith(15, 'tok-123', 'Admin@123'));
    expect(await screen.findByTestId('restore-done')).toHaveTextContent('71 bảng, 5.230 dòng');
    fireEvent.click(screen.getByTestId('restore-reload'));
    expect(onReloadApp).toHaveBeenCalledTimes(1);
    // Mã xác nhận không bao giờ được lưu xuống localStorage.
    expect(JSON.stringify({ ...localStorage })).not.toContain('tok-123');
  });

  it('sai mật khẩu → báo lỗi, xóa ô mật khẩu, cho nhập lại; quá số lần → yêu cầu bị hủy, phải tạo yêu cầu mới', async () => {
    vi.mocked(api.requestRestore).mockResolvedValue(challenge());
    vi.mocked(api.confirmRestore)
      .mockRejectedValueOnce(new api.AdminApiError('VALIDATION_ERROR', 'Ma xac nhan hoac mat khau khong dung', 400))
      .mockRejectedValueOnce(
        new api.AdminApiError('VALIDATION_ERROR', 'Sai ma xac nhan hoac mat khau qua so lan cho phep, yeu cau phuc hoi da bi huy', 400)
      );
    render(<BackupRestorePage currentUserRoles={['VT-07']} />);
    await openStep2();

    fireEvent.click(screen.getByTestId('restore-ack'));
    fireEvent.change(screen.getByTestId('restore-password'), { target: { value: 'sai1' } });
    fireEvent.click(screen.getByTestId('restore-confirm'));
    expect(await screen.findByTestId('restore-error')).toHaveTextContent('lần sai thứ 1');
    expect(screen.getByTestId('restore-password')).toHaveValue('');

    fireEvent.change(screen.getByTestId('restore-password'), { target: { value: 'sai2' } });
    fireEvent.click(screen.getByTestId('restore-confirm'));
    expect(await screen.findByText(/yêu cầu phục hồi đã bị hủy/)).toBeInTheDocument();
    expect(screen.queryByTestId('restore-password')).not.toBeInTheDocument();

    vi.mocked(api.requestRestore).mockResolvedValue({ ...challenge(), requestId: 16, confirmationToken: 'tok-456' });
    fireEvent.click(screen.getByTestId('restore-restart'));
    await screen.findByTestId('restore-warning');
    expect(api.requestRestore).toHaveBeenCalledTimes(2);
  });

  it('mã xác nhận hết hạn trên đồng hồ → bỏ mã, yêu cầu tạo yêu cầu mới', async () => {
    vi.mocked(api.requestRestore).mockResolvedValue(challenge(0.05)); // ~3 giây
    render(<BackupRestorePage currentUserRoles={['VT-07']} />);
    await openStep2();

    await waitFor(() => expect(screen.getByText(/Mã xác nhận đã hết hạn/)).toBeInTheDocument(), { timeout: 5000 });
    expect(screen.queryByTestId('restore-confirm')).not.toBeInTheDocument();
    expect(screen.getByTestId('restore-restart')).toBeInTheDocument();
  });

  it('quản trị viên khác người tạo yêu cầu (403 ở bước 2) → báo rõ, không chuyển sang trang từ chối', async () => {
    vi.mocked(api.requestRestore).mockResolvedValue(challenge());
    vi.mocked(api.confirmRestore).mockRejectedValue(new api.AdminApiError('FORBIDDEN', 'x', 403));
    render(<BackupRestorePage currentUserRoles={['VT-07']} />);
    await openStep2();
    fireEvent.click(screen.getByTestId('restore-ack'));
    fireEvent.change(screen.getByTestId('restore-password'), { target: { value: 'p' } });
    fireEvent.click(screen.getByTestId('restore-confirm'));

    expect(await screen.findByTestId('restore-error')).toHaveTextContent('Chỉ quản trị viên đã tạo yêu cầu');
    expect(screen.queryByTestId('backup-access-denied')).not.toBeInTheDocument();
  });

  it('TC-03: vai trò không phải Quản trị viên vẫn gọi API (để backend ghi nhật ký) và thấy trang từ chối khi 403', async () => {
    vi.mocked(api.listBackups).mockRejectedValue(new api.AdminApiError('FORBIDDEN', 'Forbidden', 403));
    render(<BackupRestorePage currentUserRoles={['VT-01']} />);

    expect(await screen.findByTestId('backup-access-denied')).toHaveTextContent('đã được ghi vào nhật ký hệ thống');
    expect(api.listBackups).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId('backup-create')).not.toBeInTheDocument();
  });

  it('TC-04: nút Nhật ký hệ thống mở nhật ký để tra lịch sử sao lưu / phục hồi', async () => {
    const onViewAuditLog = vi.fn();
    render(<BackupRestorePage currentUserRoles={['VT-07']} onViewAuditLog={onViewAuditLog} />);
    fireEvent.click(await screen.findByTestId('backup-btn-audit'));
    expect(onViewAuditLog).toHaveBeenCalledTimes(1);
  });

  it('bản sao vừa bắt đầu tạo (theo lịch) → tự làm mới danh sách tới khi hoàn tất', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    // Giờ máy chủ gửi không kèm múi giờ → dựng theo giờ địa phương.
    const d = new Date(Date.now() - 60000);
    const pad = (n: number) => String(n).padStart(2, '0');
    const startedAt = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    const running: BackupRecordRes = { ...DANGLING, id: 11, code: 'BK-RUN-11', startedAt };
    vi.mocked(api.listBackups).mockResolvedValue([running, OK]);
    render(<BackupRestorePage currentUserRoles={['VT-07']} />);
    await screen.findByTestId('backup-row-11');
    expect(screen.getByTestId('backup-busy-hint')).toBeInTheDocument();

    vi.mocked(api.listBackups).mockResolvedValue([{ ...running, status: 'COMPLETED', restorable: true }, OK]);
    await act(async () => {
      vi.advanceTimersByTime(5100);
    });
    await waitFor(() => expect(screen.getByTestId('backup-restore-11')).toBeEnabled());
  });

  it('bản sao dở dang từ lâu không khóa việc tạo bản mới và không bị làm mới liên tục', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    render(<BackupRestorePage currentUserRoles={['VT-07']} />);
    await screen.findByTestId('backup-row-6');
    expect(screen.getByTestId('backup-create')).toBeEnabled();
    expect(screen.queryByTestId('backup-busy-hint')).not.toBeInTheDocument();
    await act(async () => {
      vi.advanceTimersByTime(12000);
    });
    expect(api.listBackups).toHaveBeenCalledTimes(1);
  });
});
