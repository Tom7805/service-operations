import React from 'react';

/**
 * Bộ icon nét mảnh dùng chung cho TOÀN BỘ frontend — thay cho emoji rời rạc, không đồng nhất.
 * Cùng viewBox 20x20, cùng độ dày nét (1.6), stroke=currentColor để ăn theo màu chữ ngữ cảnh.
 * Xem DESIGN.md để biết quy ước màu/kích thước khi dùng icon này trong stat-card, badge, nút...
 */
export const ICONS = {
  edit: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M13.5 3.5 16.5 6.5 7 16H4v-3L13.5 3.5Z" />
    </svg>
  ),
  role: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="7.5" cy="7.5" r="3.5" />
      <path d="M10.6 10.6 16.5 16.5M13.5 13.5l2-2" />
    </svg>
  ),
  lock: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4.5" y="9" width="11" height="7.5" rx="1.5" />
      <path d="M6.5 9V6.5a3.5 3.5 0 0 1 7 0V9" />
    </svg>
  ),
  unlock: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4.5" y="9" width="11" height="7.5" rx="1.5" />
      <path d="M6.5 9V6.5a3.5 3.5 0 0 1 6.7-1.4" />
    </svg>
  ),
  eye: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 10s2.7-5 8-5 8 5 8 5-2.7 5-8 5-8-5-8-5Z" />
      <circle cx="10" cy="10" r="2.2" />
    </svg>
  ),
  eyeOff: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2.5 2.5l15 15" />
      <path d="M8.2 4.4A9.4 9.4 0 0 1 10 4.2c5.3 0 8 5 8 5a15 15 0 0 1-2.9 3.4M5.4 6a15 15 0 0 0-3.4 4.2s2.7 5 8 5c1 0 1.9-.15 2.7-.4" />
      <path d="M8.1 8.2a2.2 2.2 0 0 0 3 3.1" />
    </svg>
  ),
  resetTwoFactor: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 10a6 6 0 1 1-1.9-4.4" />
      <path d="M16 3v3.5h-3.5" />
    </svg>
  ),
  more: (
    <svg viewBox="0 0 20 20" fill="currentColor">
      <circle cx="10" cy="4.5" r="1.4" />
      <circle cx="10" cy="10" r="1.4" />
      <circle cx="10" cy="15.5" r="1.4" />
    </svg>
  ),
  users: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="7" cy="6.5" r="2.6" />
      <path d="M2.3 16c.6-3 2.3-4.6 4.7-4.6s4.1 1.6 4.7 4.6" />
      <circle cx="14.5" cy="7.2" r="2.1" />
      <path d="M12.9 11.6c1.9.2 3.2 1.7 3.7 4.4" />
    </svg>
  ),
  userCheck: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="7.5" cy="6.5" r="3" />
      <path d="M2.5 16.2c.6-3.4 2.4-5.2 5-5.2s4.4 1.8 5 5.2" />
      <path d="M13 9.5l1.6 1.6L18 7.5" />
    </svg>
  ),
  user: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="10" cy="6.8" r="3.3" />
      <path d="M3.7 17c.7-3.8 2.9-5.8 6.3-5.8s5.6 2 6.3 5.8" />
    </svg>
  ),
  shield: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 2.5 16 5v4.3c0 4-2.6 6.7-6 8.2-3.4-1.5-6-4.2-6-8.2V5l6-2.5Z" />
    </svg>
  ),
  shieldOff: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 2.5 16 5v4.3c0 4-2.6 6.7-6 8.2-3.4-1.5-6-4.2-6-8.2V5l6-2.5Z" />
      <path d="M7.5 7.5 12.5 12.5" />
    </svg>
  ),
  checkCircle: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="10" cy="10" r="7.5" />
      <path d="M6.7 10.2 8.8 12.3 13.3 7.8" />
    </svg>
  ),
  alertTriangle: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 3 18 16.5H2L10 3Z" />
      <path d="M10 8.3v3.6" />
      <circle cx="10" cy="14.3" r="0.15" fill="currentColor" />
    </svg>
  ),
  info: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="10" cy="10" r="7.5" />
      <path d="M10 9.3v4.4" />
      <circle cx="10" cy="6.6" r="0.15" fill="currentColor" />
    </svg>
  ),
  clipboardList: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4.5" y="3.5" width="11" height="14" rx="1.5" />
      <path d="M7.5 2.8h5a1 1 0 0 1 1 1V5h-7v-.2a1 1 0 0 1 1-1Z" />
      <path d="M7.3 9h5.4M7.3 12h5.4M7.3 15h3.4" />
    </svg>
  ),
  clock: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="10" cy="10" r="7.5" />
      <path d="M10 5.8V10l3 2" />
    </svg>
  ),
  history: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="10" cy="10.5" r="6.7" />
      <path d="M10 6.8v3.9l2.6 1.6" />
      <path d="M4.3 5.2 3.8 8l2.7-.6" />
    </svg>
  ),
  close: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
      <path d="M5 5 15 15M15 5 5 15" />
    </svg>
  ),
  globe: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="10" cy="10" r="7.5" />
      <path d="M2.5 10h15M10 2.5c2.3 2.1 3.5 4.8 3.5 7.5s-1.2 5.4-3.5 7.5c-2.3-2.1-3.5-4.8-3.5-7.5S7.7 4.6 10 2.5Z" />
    </svg>
  ),
  building: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="3" width="9" height="14.5" rx="1" />
      <path d="M13 8h2.5v9.5H13M6.7 6.2h1.6M11 6.2h.1M6.7 9.2h1.6M11 9.2h.1M6.7 12.2h1.6M11 12.2h.1" />
    </svg>
  ),
  folder: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2.5 5.5A1.5 1.5 0 0 1 4 4h3.4l1.6 2h7A1.5 1.5 0 0 1 17.5 7.5v7A1.5 1.5 0 0 1 16 16H4a1.5 1.5 0 0 1-1.5-1.5v-9Z" />
    </svg>
  ),
  search: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8.7" cy="8.7" r="5.4" />
      <path d="M16.5 16.5 12.9 12.9" />
    </svg>
  ),
  refresh: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16.3 10a6.3 6.3 0 1 1-2-4.6" />
      <path d="M16.3 3.5V8h-4.5" />
    </svg>
  ),
  settings: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="10" cy="10" r="2.6" />
      <path d="M10 2.8v2M10 15.2v2M17.2 10h-2M4.8 10h-2M15.1 4.9l-1.4 1.4M6.3 13.7l-1.4 1.4M15.1 15.1l-1.4-1.4M6.3 6.3 4.9 4.9" />
    </svg>
  ),
  plus: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <path d="M10 4v12M4 10h12" />
    </svg>
  ),
  trash: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 6h12M8 6V4.5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1V6M6 6l.6 9.5a1.5 1.5 0 0 0 1.5 1.4h3.8a1.5 1.5 0 0 0 1.5-1.4L14 6" />
    </svg>
  ),
  mail: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2.5" y="4.5" width="15" height="11" rx="1.5" />
      <path d="M3 5.5 10 11l7-5.5" />
    </svg>
  ),
  phone: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4.3 3.2h2.6l1 3.4-1.7 1.4a10.6 10.6 0 0 0 5.8 5.8l1.4-1.7 3.4 1v2.6a1.5 1.5 0 0 1-1.6 1.5A14.2 14.2 0 0 1 2.8 4.8a1.5 1.5 0 0 1 1.5-1.6Z" />
    </svg>
  ),
  calendar: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4.5" width="14" height="12.5" rx="1.5" />
      <path d="M3 8.5h14M7 2.8v3M13 2.8v3" />
    </svg>
  ),
  money: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="10" cy="10" r="7.5" />
      <path d="M10 6v8M12.3 7.7c-.4-.6-1.2-1-2.3-1-1.4 0-2.4.7-2.4 1.7 0 2.4 4.7.9 4.7 3.3 0 1-1 1.7-2.4 1.7-1.1 0-1.9-.4-2.3-1" />
    </svg>
  ),
  tag: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.6 2.9 17 9.3a1.5 1.5 0 0 1 0 2.1l-5.6 5.6a1.5 1.5 0 0 1-2.1 0L2.9 10.6V4.4a1.5 1.5 0 0 1 1.5-1.5h6.2Z" />
      <circle cx="7.3" cy="7.3" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  ),
  chart: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 17V3M3 17h14" />
      <path d="M6.5 14v-4M10.5 14V6.5M14.5 14v-6.5" />
    </svg>
  ),
  bell: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 8.3a5 5 0 0 1 10 0c0 3.4 1 4.7 1 4.7H4s1-1.3 1-4.7Z" />
      <path d="M8.2 15.7a1.8 1.8 0 0 0 3.6 0" />
    </svg>
  ),
  briefcase: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2.5" y="6" width="15" height="10" rx="1.5" />
      <path d="M7 6V4.5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1V6M2.5 10.5h15" />
    </svg>
  ),
  target: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="10" cy="10" r="7.5" />
      <circle cx="10" cy="10" r="4" />
      <circle cx="10" cy="10" r="0.6" fill="currentColor" stroke="none" />
    </svg>
  ),
  save: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 3.5h9.5L16.5 6.5V16a.5.5 0 0 1-.5.5H4a.5.5 0 0 1-.5-.5V4a.5.5 0 0 1 .5-.5Z" />
      <path d="M6.5 3.5V8h7V3.5M6.5 16.5V12h7v4.5" />
    </svg>
  ),
  upload: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13V3.5M6.3 6.9 10 3.2l3.7 3.7" />
      <path d="M3.5 13.5V16a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1v-2.5" />
    </svg>
  ),
  download: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 3.5V13M6.3 9.6 10 13.3l3.7-3.7" />
      <path d="M3.5 13.5V16a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1v-2.5" />
    </svg>
  ),
  bank: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2.5 7.5 10 3l7.5 4.5" />
      <path d="M3.5 7.5h13v8h-13z" />
      <path d="M6.5 10v3M10 10v3M13.5 10v3M2.5 17h15" />
    </svg>
  ),
  receipt: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 2.5h10v15l-1.7-1.2L11.7 17.5 10 16.3l-1.7 1.2L6.7 16.3 5 17.5v-15Z" />
      <path d="M7.3 6.5h5.4M7.3 9.5h5.4M7.3 12.5h3.4" />
    </svg>
  ),
  link: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8.3 11.7 11.7 8.3" />
      <path d="M9.9 5.5 11.3 4.1a3 3 0 0 1 4.6 3.8l-.2.2-2 2" />
      <path d="M10.1 14.5 8.7 15.9a3 3 0 0 1-4.6-3.8l.2-.2 2-2" />
    </svg>
  ),
  key: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="6.3" cy="13.7" r="3.2" />
      <path d="M8.5 11.5 15.5 4.5M13 7l2 2M15.5 4.5l2 2" />
    </svg>
  ),
  star: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round">
      <path d="M10 2.8l2.2 4.5 4.9.7-3.5 3.5.8 4.9-4.4-2.3-4.4 2.3.8-4.9-3.5-3.5 4.9-.7L10 2.8Z" />
    </svg>
  ),
  wrench: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M13.7 3.3a4 4 0 0 0-5.4 4.9L3 13.5v2.5h2.5l5.3-5.3a4 4 0 0 0 4.9-5.4l-2.6 2.6-2-2 2.6-2.6Z" />
    </svg>
  ),
  pin: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 17.5s6-5.4 6-9.8a6 6 0 1 0-12 0c0 4.4 6 9.8 6 9.8Z" />
      <circle cx="10" cy="7.7" r="2.1" />
    </svg>
  ),
  spark: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 2.5c.5 3 2 4.5 5 5-3 .5-4.5 2-5 5-.5-3-2-4.5-5-5 3-.5 4.5-2 5-5Z" />
    </svg>
  ),
  document: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5.5 2.5h6l3 3v11.5a.5.5 0 0 1-.5.5h-8.5a.5.5 0 0 1-.5-.5V3a.5.5 0 0 1 .5-.5Z" />
      <path d="M11.5 2.5V5.5h3M7 9.5h6M7 12.5h6M7 15h3.5" />
    </svg>
  ),
  hash: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 2.5 5 17.5M15 2.5l-2 15M3 7h14M2.5 13h14" />
    </svg>
  ),
  copy: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="7" y="7" width="9.5" height="9.5" rx="1.5" />
      <path d="M4.5 12.5h-1a1 1 0 0 1-1-1v-7a1 1 0 0 1 1-1h7a1 1 0 0 1 1 1v1" />
    </svg>
  ),
  merge: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 3v6a3 3 0 0 0 3 3h5" />
      <path d="M11 9l3 3-3 3" />
      <circle cx="6" cy="3" r="1.6" />
      <circle cx="6" cy="16" r="1.6" />
      <path d="M6 5.6V14.4" />
    </svg>
  ),
};
