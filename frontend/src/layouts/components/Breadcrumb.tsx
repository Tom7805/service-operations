import { Fragment } from 'react';

export interface Crumb {
  label: string;
  /** Có thì mắt xích bấm được (quay về màn hình cha). */
  onClick?: () => void;
}

/** Đường dẫn "Nhóm › Mục › Màn hình con" trên thanh tiêu đề — trả lời "tôi đang ở đâu". */
export default function Breadcrumb({ crumbs }: { crumbs: Crumb[] }) {
  return (
    <nav className="topbar-crumbs" aria-label="Vị trí hiện tại">
      {crumbs.map((crumb, index) => {
        const last = index === crumbs.length - 1;
        return (
          <Fragment key={`${crumb.label}-${index}`}>
            {index > 0 && (
              <span className="topbar-crumbs__sep" aria-hidden="true">
                /
              </span>
            )}
            {crumb.onClick && !last ? (
              <button type="button" className="topbar-crumbs__link" onClick={crumb.onClick}>
                {crumb.label}
              </button>
            ) : (
              <span className={last ? 'topbar-crumbs__current' : 'topbar-crumbs__item'} aria-current={last ? 'page' : undefined}>
                {crumb.label}
              </span>
            )}
          </Fragment>
        );
      })}
    </nav>
  );
}
