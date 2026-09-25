import { useId, useMemo, useState } from 'react';
import { ICONS } from '../../../components/common/icons';
import Pagination from '../../../components/common/Pagination';
import { useDebounce } from '../../../hooks/useDebounce';
import { useServerPagedList } from '../../../hooks/usePagination';
import { fetchProjectsPage, ProjectsApiError } from '../api/projectsApi';

const PICKER_PAGE_SIZE = 8;

const fetchPage = (filters: { keyword: string }, page: number, size: number) =>
  fetchProjectsPage(filters.keyword, page, size);

interface ProjectPickerProps {
  onSelect: (projectId: number) => void;
  testId?: string;
}

/**
 * Ô chọn dự án có tìm kiếm cho các màn Giá vốn/Biên lợi nhuận (NCL-09). Thay cho thẻ
 * `<select>` chứa TOÀN BỘ dự án (nạp ngay khi đăng nhập): gõ mã hoặc tên để máy chủ lọc,
 * mỗi lần chỉ tải một trang nhỏ — dùng được cả khi hệ thống có hàng nghìn dự án, và
 * các lựa chọn là nút lớn, bấm được bằng ngón tay trên điện thoại.
 */
export default function ProjectPicker({ onSelect, testId = 'project-selector-dropdown' }: ProjectPickerProps) {
  const [search, setSearch] = useState('');
  const keyword = useDebounce(search.trim(), 300);
  const filters = useMemo(() => ({ keyword }), [keyword]);
  const list = useServerPagedList({ filters, fetchPage, pageSize: PICKER_PAGE_SIZE });
  const listId = useId();

  const errorMessage = list.error
    ? list.error instanceof ProjectsApiError
      ? list.error.message
      : 'Không tải được danh sách dự án. Vui lòng thử lại.'
    : null;

  return (
    <div className="project-picker" data-testid={testId}>
      <div className="search-box project-picker__search">
        <span className="search-box__icon" aria-hidden="true">{ICONS.search}</span>
        <input
          type="search"
          className="search-box__input"
          placeholder="Tìm dự án theo mã hoặc tên..."
          aria-label="Tìm dự án theo mã hoặc tên"
          aria-controls={listId}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          data-testid={`${testId}-search`}
        />
      </div>

      {errorMessage ? (
        <div className="table-error-state" role="alert">
          <div className="table-error-state__icon">{ICONS.alertTriangle}</div>
          <div className="table-error-state__body">
            <h3>Không tải được danh sách dự án</h3>
            <p>{errorMessage}</p>
          </div>
          <button type="button" className="btn btn-secondary" onClick={list.reload}>
            Thử lại
          </button>
        </div>
      ) : (
        <>
          <ul
            id={listId}
            className={`project-picker__list${list.isLoading && list.hasLoaded ? ' is-refreshing' : ''}`}
            aria-label="Chọn dự án"
            aria-busy={list.isLoading}
          >
            {!list.hasLoaded
              ? Array.from({ length: 4 }, (_, i) => (
                  <li key={i} className="project-picker__skeleton">
                    <div className="skeleton skeleton-text" />
                  </li>
                ))
              : list.items.map((project) => (
                  <li key={project.id}>
                    <button
                      type="button"
                      className="project-picker__option"
                      onClick={() => onSelect(project.id)}
                      data-testid={`${testId}-option-${project.id}`}
                    >
                      <span className="project-picker__code">{project.projectCode}</span>
                      <span className="project-picker__name">{project.name}</span>
                      <span className="project-picker__chevron" aria-hidden="true">{ICONS.arrowRight}</span>
                    </button>
                  </li>
                ))}
          </ul>
          {list.hasLoaded && list.items.length === 0 && (
            <p className="project-picker__empty cell-muted">
              {keyword ? `Không có dự án nào khớp "${keyword}".` : 'Chưa có dự án nào trong hệ thống.'}
            </p>
          )}
          {list.hasLoaded && list.totalPages > 1 && (
            <Pagination
              page={list.page}
              totalPages={list.totalPages}
              totalElements={list.totalElements}
              pageSize={list.pageSize}
              itemLabel="dự án"
              loading={list.isLoading}
              onPageChange={list.setPage}
              testIdPrefix={`${testId}-pagination`}
            />
          )}
        </>
      )}
    </div>
  );
}
