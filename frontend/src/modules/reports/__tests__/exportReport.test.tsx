import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { exportReport, parseFileName, ReportsApiError } from '../api/reportsApi';
import ExportReportModal from '../components/ExportReportModal';

/** Node >= 25 có localStorage thử nghiệm che mất bản của jsdom (undefined) — dùng bộ nhớ tạm riêng cho ổn định. */
function memoryStorage(): Storage {
  const data = new Map<string, string>();
  return {
    get length() {
      return data.size;
    },
    clear: () => data.clear(),
    getItem: (key) => data.get(key) ?? null,
    key: (index) => Array.from(data.keys())[index] ?? null,
    removeItem: (key) => void data.delete(key),
    setItem: (key, value) => void data.set(key, String(value)),
  };
}

describe('reportsApi — exportReport (NCL-11-CN-004)', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', memoryStorage());
    vi.stubGlobal('sessionStorage', memoryStorage());
    localStorage.setItem('token', 'fake-token');
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('TC-01: gửi loại báo cáo + kỳ và trả về tệp kèm tên tệp từ Content-Disposition', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response('﻿Mã dự án\r\nDA-01\r\n', {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=UTF-8',
          'Content-Disposition':
            "attachment; filename=\"bao-cao-hieu-qua-du-an_2026-07-01_2026-09-30.csv\"; filename*=UTF-8''bao-cao-hieu-qua-du-an_2026-07-01_2026-09-30.csv",
          'X-Report-Row-Count': '1',
        },
      })
    );

    const file = await exportReport({ reportType: 'PROJECT_PERFORMANCE', from: '2026-07-01', to: '2026-09-30' });

    expect(file.fileName).toBe('bao-cao-hieu-qua-du-an_2026-07-01_2026-09-30.csv');
    expect(file.rowCount).toBe(1);
    const url = vi.mocked(fetch).mock.calls[0][0] as string;
    expect(url).toContain('/reports/export?reportType=PROJECT_PERFORMANCE&from=2026-07-01&to=2026-09-30&format=CSV');
    expect(vi.mocked(fetch).mock.calls[0][1]).toMatchObject({ headers: { Authorization: 'Bearer fake-token' } });
  });

  it('TC-02: kỳ không có dữ liệu -> ném ReportsApiError INVALID_STATE', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ success: false, errorCode: 'INVALID_STATE', message: 'Khong co du lieu' }), {
        status: 400,
      })
    );

    await expect(
      exportReport({ reportType: 'PROJECT_PERFORMANCE', from: '2026-07-01', to: '2026-09-30' })
    ).rejects.toMatchObject({ code: 'INVALID_STATE', statusCode: 400 });
  });

  it('ném ReportsApiError khi không kết nối được máy chủ', async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error('down'));

    await expect(
      exportReport({ reportType: 'PROJECT_PERFORMANCE', from: '2026-07-01', to: '2026-09-30' })
    ).rejects.toBeInstanceOf(ReportsApiError);
  });

  it('parseFileName ưu tiên filename* rồi tới filename, thiếu header thì dùng tên dự phòng', () => {
    expect(parseFileName("attachment; filename*=UTF-8''b%C3%A1o-c%C3%A1o.csv", 'x.csv')).toBe('báo-cáo.csv');
    expect(parseFileName('attachment; filename="a.csv"', 'x.csv')).toBe('a.csv');
    expect(parseFileName(null, 'x.csv')).toBe('x.csv');
  });
});

describe('ExportReportModal (NCL-11-CN-004)', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', memoryStorage());
    vi.stubGlobal('sessionStorage', memoryStorage());
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('chặn kỳ có ngày kết thúc trước ngày bắt đầu, không gọi backend', async () => {
    render(<ExportReportModal onClose={() => {}} />);

    fireEvent.change(screen.getByLabelText('Từ ngày'), { target: { value: '2026-09-30' } });
    fireEvent.change(screen.getByLabelText('Đến ngày'), { target: { value: '2026-07-01' } });
    fireEvent.click(screen.getByRole('button', { name: 'Xuất tệp' }));

    expect(await screen.findByText('Ngày kết thúc không được trước ngày bắt đầu.')).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('TC-02: hiện thông báo không có dữ liệu để xuất và giữ modal mở', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ success: false, errorCode: 'INVALID_STATE', message: 'x' }), { status: 400 })
    );
    const onClose = vi.fn();
    render(<ExportReportModal onClose={onClose} />);

    fireEvent.click(screen.getByRole('button', { name: 'Xuất tệp' }));

    await waitFor(() =>
      expect(screen.getByTestId('export-report-error')).toHaveTextContent('Không có dữ liệu trong kỳ đã chọn')
    );
    expect(onClose).not.toHaveBeenCalled();
  });

  it('TC-01: xuất thành công thì tải tệp, báo lại tên tệp và đóng modal', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response('a,b\r\n', {
        status: 200,
        headers: { 'Content-Disposition': 'attachment; filename="r.csv"', 'X-Report-Row-Count': '3' },
      })
    );
    const createObjectURL = vi.fn(() => 'blob:x');
    vi.stubGlobal('URL', Object.assign(URL, { createObjectURL, revokeObjectURL: vi.fn() }));
    const onClose = vi.fn();
    const onExported = vi.fn();
    render(<ExportReportModal onClose={onClose} onExported={onExported} />);

    fireEvent.click(screen.getByRole('button', { name: 'Xuất tệp' }));

    await waitFor(() => expect(onExported).toHaveBeenCalledWith('r.csv', 3));
    expect(createObjectURL).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });
});
