import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { HubContext } from '../../components/common/PageHeader';
import type { NavLeaf, Tab } from '../menuConfig';

interface HubFrameProps {
  title: string;
  tabs: NavLeaf[];
  activeTab: Tab;
  onSelect: (tab: Tab) => void;
  /** Điều khiển dùng chung cho mọi tab (vd ô chọn dự án của "Lợi nhuận dự án"). */
  toolbar?: ReactNode;
  children: ReactNode;
}

/** Phần bị cắt bỏ ở hai bên lớp "đang chọn" — chỉ chừa đúng ô của tab đang chọn. */
interface ClipInset {
  left: number;
  right: number;
}

/**
 * Vị trí lần cuối của từng khu làm việc. `<main>` được gắn `key={activeTab}` nên mỗi lần đổi tab cả
 * khung được dựng lại — nhớ vị trí cũ ở đây để viên chọn TRƯỢT từ tab trước sang tab mới thay vì bật
 * tức thì (tính liên tục không gian: mắt theo được mình vừa đi từ đâu tới đâu).
 */
const lastClip = new Map<string, ClipInset>();

function measure(list: HTMLElement | null, layer: HTMLElement | null): ClipInset | null {
  const el = list?.querySelector<HTMLElement>('[role="tab"][aria-selected="true"]');
  if (!el || !layer) return null;
  return { left: el.offsetLeft, right: Math.max(0, layer.offsetWidth - (el.offsetLeft + el.offsetWidth)) };
}

const clipPath = (c: ClipInset) => `inset(0 ${c.right}px 0 ${c.left}px round 9px)`;

/**
 * Khu làm việc: một tiêu đề + dải tab bao quanh các màn hình cùng một việc. Màn hình con nhận
 * `HubContext.embedded = true` nên tự bỏ tiêu đề riêng; nút thao tác của nó hiện ở khe bên phải dải tab.
 *
 * Tab đang chọn là một viên nền bo tròn. Thay vì đổi nền/màu chữ từng tab (hai trạng thái chồng
 * nhau lúc chuyển), dải tab được vẽ HAI lớp: lớp thường và một bản sao ở kiểu "đang chọn" nằm đè
 * lên, bị `clip-path` cắt chỉ còn đúng ô của tab đang chọn. Đổi tab chỉ là trượt vùng cắt — viên nền
 * và màu chữ đổi cùng một nhịp, liền mạch tuyệt đối.
 */
export default function HubFrame({ title, tabs, activeTab, onSelect, toolbar, children }: HubFrameProps) {
  const [actionSlot, setActionSlot] = useState<HTMLElement | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const layerRef = useRef<HTMLDivElement>(null);
  const [clip, setClip] = useState<ClipInset | null>(() => lastClip.get(title) ?? null);
  const [animate, setAnimate] = useState(false);

  useLayoutEffect(() => {
    const next = measure(listRef.current, layerRef.current);
    if (!next) return;
    const prev = lastClip.get(title);
    lastClip.set(title, next);
    if (!prev || (prev.left === next.left && prev.right === next.right)) {
      setAnimate(false);
      setClip(next);
      return;
    }
    // Khung hình đầu vẽ vùng cắt ở vị trí CŨ (giá trị khởi tạo), khung sau mới đặt vị trí mới —
    // nếu đặt ngay trong layout effect thì cả hai rơi vào cùng một lần vẽ và không có chuyển động.
    const frame = requestAnimationFrame(() => {
      setAnimate(true);
      setClip(next);
    });
    return () => cancelAnimationFrame(frame);
  }, [activeTab, title]);

  // Bề rộng tab đổi khi co giãn cửa sổ: đo lại, đặt thẳng vị trí mới không chuyển động.
  useEffect(() => {
    const onResize = () => {
      const next = measure(listRef.current, layerRef.current);
      if (!next) return;
      lastClip.set(title, next);
      setAnimate(false);
      setClip(next);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [title]);

  const isSelected = (leaf: NavLeaf) => leaf.tab === activeTab || (leaf.matches ?? []).includes(activeTab);

  return (
    <div className="user-management-page hub-frame">
      <div className="hub-frame__head">
        <h1 className="page-title">{title}</h1>
        {toolbar && <div className="hub-frame__toolbar">{toolbar}</div>}
      </div>
      <div className="hub-tabs-row">
        <div className="hub-tabs hub-tabs--layered" role="tablist" aria-label={title} ref={listRef}>
          {tabs.map((leaf) => {
            const selected = isSelected(leaf);
            return (
              <button
                key={leaf.tab}
                type="button"
                role="tab"
                aria-selected={selected}
                className={`hub-tabs__tab ${selected ? 'hub-tabs__tab--active' : ''}`}
                onClick={() => onSelect(leaf.tab)}
                data-testid={`hub-tab-${leaf.tab}`}
              >
                {leaf.label}
              </button>
            );
          })}
          <div
            ref={layerRef}
            className={`hub-tabs__layer ${animate ? 'hub-tabs__layer--animate' : ''}`}
            style={clip ? { clipPath: clipPath(clip) } : { visibility: 'hidden' }}
            aria-hidden="true"
          >
            {tabs.map((leaf) => (
              <span key={leaf.tab} className="hub-tabs__ghost">
                {leaf.label}
              </span>
            ))}
          </div>
        </div>
        <div className="hub-tabs-row__actions" ref={setActionSlot} />
      </div>
      <HubContext.Provider value={{ embedded: true, actionSlot }}>
        <div className="hub-frame__body" role="tabpanel">
          {children}
        </div>
      </HubContext.Provider>
    </div>
  );
}
