import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ProjectPicker from '../components/ProjectPicker';
import * as projectsApi from '../api/projectsApi';
import type { ProjectRes } from '../types/projectTypes';

vi.mock('../api/projectsApi', () => ({
  fetchProjectsPage: vi.fn(),
  ProjectsApiError: class extends Error {},
}));

const project = (id: number, code: string, name: string) => ({ id, projectCode: code, name }) as ProjectRes;

describe('ProjectPicker — ô chọn dự án có tìm kiếm (NCL-09)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(projectsApi.fetchProjectsPage).mockImplementation(async (keyword) => {
      const all = [project(1, 'DA-ALPHA', 'Cổng thông tin'), project(2, 'DA-BETA', 'Ứng dụng di động')];
      const content = all.filter((p) => !keyword || `${p.projectCode} ${p.name}`.toLowerCase().includes(keyword.toLowerCase()));
      return { content, page: 0, size: 8, totalElements: content.length, totalPages: content.length ? 1 : 0 };
    });
  });

  it('tải trang dự án đầu tiên, tìm theo mã/tên ở máy chủ và chọn dự án', async () => {
    const onSelect = vi.fn();
    render(<ProjectPicker onSelect={onSelect} testId="picker" />);

    expect(await screen.findByTestId('picker-option-1')).toHaveTextContent('DA-ALPHA');
    expect(projectsApi.fetchProjectsPage).toHaveBeenCalledWith('', 0, 8);

    fireEvent.change(screen.getByTestId('picker-search'), { target: { value: 'beta' } });
    await waitFor(() => expect(screen.queryByTestId('picker-option-1')).toBeNull());
    expect(projectsApi.fetchProjectsPage).toHaveBeenLastCalledWith('beta', 0, 8);

    fireEvent.click(screen.getByTestId('picker-option-2'));
    expect(onSelect).toHaveBeenCalledWith(2);
  });

  it('báo không có kết quả khi từ khoá không khớp dự án nào', async () => {
    render(<ProjectPicker onSelect={vi.fn()} testId="picker" />);
    await screen.findByTestId('picker-option-1');

    fireEvent.change(screen.getByTestId('picker-search'), { target: { value: 'khong-co' } });
    expect(await screen.findByText(/Không có dự án nào khớp "khong-co"/)).toBeInTheDocument();
  });
});
