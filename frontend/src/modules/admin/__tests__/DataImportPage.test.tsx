import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import DataImportPage from '../pages/DataImportPage';
import * as api from '../api/importApi';
import type { ImportPreviewRes, ImportResultRes } from '../types/adminTypes';

vi.mock('../api/importApi', async () => {
  const { AdminApiError } = await vi.importActual<typeof import('../api/adminHttp')>('../api/adminHttp');
  return {
    downloadImportTemplate: vi.fn(),
    previewImport: vi.fn(),
    commitImport: vi.fn(),
    listImports: vi.fn(),
    getImport: vi.fn(),
    AdminApiError,
  };
});

const PREVIEW: ImportPreviewRes = {
  jobId: 12,
  targetType: 'CUSTOMER',
  fileName: 'khach-hang.csv',
  status: 'PREVIEWED',
  totalRows: 4,
  validRows: 2,
  invalidRows: 1,
  duplicateRows: 1,
  notice: null,
  rows: [
    { rowNumber: 2, status: 'VALID', data: { name: 'Cong ty A', taxCode: '0101234567' }, errors: [] },
    { rowNumber: 3, status: 'VALID', data: { name: 'Cong ty B', taxCode: '0107654321' }, errors: [] },
    { rowNumber: 4, status: 'INVALID', data: { name: '' }, errors: ['Thiếu tên khách hàng'] },
    {
      rowNumber: 5,
      status: 'DUPLICATE',
      data: { name: 'Cong ty C', taxCode: '0109999999' },
      errors: [],
      duplicateOfId: 7,
      duplicateOfLabel: 'KH-000007 · Cong ty C',
    },
  ],
};

const RESULT: ImportResultRes = {
  jobId: 12,
  targetType: 'CUSTOMER',
  fileName: 'khach-hang.csv',
  status: 'COMMITTED',
  totalRows: 4,
  validRows: 2,
  invalidRows: 1,
  duplicateRows: 1,
  createdCount: 2,
  updatedCount: 1,
  skippedCount: 0,
  failedCount: 0,
  duplicateAction: 'UPDATE',
  createdBy: 'admin',
  createdAt: '2026-09-27T09:00:00',
  committedBy: 'admin',
  committedAt: '2026-09-27T09:01:00',
  errors: [],
};

function pickCsv(name = 'khach-hang.csv', size = 120) {
  const file = new File(['x'.repeat(size)], name, { type: 'text/csv' });
  fireEvent.change(screen.getByTestId('import-file'), { target: { files: [file] } });
  return file;
}

describe('DataImportPage (NCL-15-CN-004)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.listImports).mockResolvedValue([]);
  });

  it('kiểm tra tệp → xem trước số dòng hợp lệ/lỗi/trùng, chọn cập nhật dòng trùng rồi nhập', async () => {
    vi.mocked(api.previewImport).mockResolvedValue(PREVIEW);
    vi.mocked(api.commitImport).mockResolvedValue(RESULT);
    render(<DataImportPage currentUserRoles={['VT-07']} />);

    await waitFor(() => expect(api.listImports).toHaveBeenCalled());
    const file = pickCsv();
    fireEvent.click(screen.getByTestId('import-check'));

    expect(await screen.findByTestId('import-preview')).toBeInTheDocument();
    expect(api.previewImport).toHaveBeenCalledWith('CUSTOMER', file);
    // Mặc định bỏ qua dòng trùng → chỉ nhập 2 dòng hợp lệ
    expect(screen.getByTestId('import-commit')).toHaveTextContent('Nhập 2 dòng');

    fireEvent.change(screen.getByTestId('import-default-action'), { target: { value: 'UPDATE' } });
    expect(screen.getByTestId('import-commit')).toHaveTextContent('Nhập 3 dòng');

    fireEvent.click(screen.getByTestId('import-commit'));
    expect(await screen.findByTestId('import-result')).toBeInTheDocument();
    expect(api.commitImport).toHaveBeenCalledWith(12, { duplicateAction: 'UPDATE', rowActions: [] });
  });

  it('chặn tệp không phải CSV ngay trên trình duyệt, không gọi máy chủ', async () => {
    render(<DataImportPage currentUserRoles={['VT-07']} />);
    await waitFor(() => expect(api.listImports).toHaveBeenCalled());

    pickCsv('danh-sach.xlsx');
    expect(screen.getByTestId('import-file-error')).toHaveTextContent('Chỉ nhận tệp CSV');
    expect(screen.getByTestId('import-check')).toBeDisabled();
    expect(api.previewImport).not.toHaveBeenCalled();
  });

  it('chặn tệp lớn hơn 2 MB', async () => {
    render(<DataImportPage currentUserRoles={['VT-07']} />);
    await waitFor(() => expect(api.listImports).toHaveBeenCalled());

    pickCsv('lon.csv', 2 * 1024 * 1024 + 1);
    expect(screen.getByTestId('import-file-error')).toHaveTextContent('vượt quá 2 MB');
    expect(api.previewImport).not.toHaveBeenCalled();
  });

  it('lỗi kiểm tra từ máy chủ (sai mẫu) hiện ngay dưới ô chọn tệp', async () => {
    vi.mocked(api.previewImport).mockRejectedValue(
      new api.AdminApiError('VALIDATION_ERROR', 'Tệp không đúng mẫu: thiếu cột "Tên khách hàng".', 400)
    );
    render(<DataImportPage currentUserRoles={['VT-07']} />);
    await waitFor(() => expect(api.listImports).toHaveBeenCalled());

    pickCsv();
    fireEvent.click(screen.getByTestId('import-check'));
    expect(await screen.findByTestId('import-file-error')).toHaveTextContent('thiếu cột');
    expect(screen.queryByTestId('import-preview')).not.toBeInTheDocument();
  });

  it('vai trò không phải Quản trị viên vẫn gọi API (để máy chủ ghi nhật ký) và thấy trang từ chối khi 403', async () => {
    vi.mocked(api.listImports).mockRejectedValue(new api.AdminApiError('FORBIDDEN', 'Forbidden', 403));
    render(<DataImportPage currentUserRoles={['VT-05']} />);

    expect(await screen.findByTestId('import-access-denied')).toHaveTextContent('đã được ghi vào nhật ký');
    expect(api.listImports).toHaveBeenCalledTimes(1);
  });
});
