# 002 — Popover phải biến mất theo đúng đường nó hiện ra

**Mốc mã nguồn:** `5937bb2` · **Mức:** LOW · **Nhóm:** đối xứng không gian

## Vấn đề

apple-design §7: *"If something disappears one way, we expect it to emerge from where it came."*
Đường vào và đường ra phải đối xứng.

Hai popover ở `frontend/src/App.tsx` được dựng **có điều kiện**:

- dòng 275: `{notifOpen && (<div className="notif-panel" role="menu">…)}`
- dòng 324: `{userMenuOpen && (<div className="user-chip__menu" role="menu">…)}`

Chúng **có** hoạt hình vào (`menu-enter` trong `index.css`, nở từ `scale(0.97)` với
`transform-origin: top right` — đúng, nở ra từ chính nút bấm). Nhưng khi đóng, React gỡ phần tử
khỏi cây ngay lập tức, nên **không có đường ra**: nó cắt phụt.

Cùng vấn đề ở `frontend/src/components/common/RowActionsMenu.tsx` — panel giữ trong cây nhưng
nội dung chỉ dựng khi mở, nên cũng không có đường ra.

## Vì sao đáng làm (và vì sao chỉ LOW)

Cổng tần suất của `improve-animations`: menu thông báo và menu tài khoản thuộc bậc
"vài chục lần/ngày" → được phép có hoạt hình tiêu chuẩn, nhưng **dưới 300ms**.

Đây **không** phải trường hợp của bảng lệnh `Ctrl+K` — cái đó khởi từ bàn phím, chạy 100+
lần/ngày, và đã cố ý **không** có hoạt hình mở/đóng. **Đừng thêm hoạt hình cho bảng lệnh.**

## Cách sửa

Dùng CSS thuần, không thêm state. `@starting-style` + `transition-behavior: allow-discrete`
cho phép làm hoạt hình cả hai chiều mà không cần giữ phần tử trong cây bằng tay — nhưng nó
**chỉ chạy nếu phần tử không bị gỡ khỏi cây**. Nên vẫn phải đổi cách dựng.

### Bước 1 — đổi dựng-có-điều-kiện thành ẩn bằng thuộc tính

`App.tsx`, cả hai chỗ. Thay:

```tsx
{notifOpen && (
  <div className="notif-panel" role="menu">
```

bằng:

```tsx
<div className="notif-panel" role="menu" data-open={notifOpen || undefined} hidden={!notifOpen}>
```

Làm y hệt cho `user-chip__menu` với `userMenuOpen`.

`hidden` giữ đúng ngữ nghĩa cho trình đọc màn hình (phần tử bị ẩn khỏi cây trợ năng khi đóng),
và `display: none` do `hidden` sinh ra chính là thứ `allow-discrete` cần để chuyển tiếp.

### Bước 2 — CSS

Trong `index.css`, cạnh quy tắc `.notif-panel, .user-chip__menu` hiện có:

```css
.notif-panel, .user-chip__menu {
  transform-origin: top right;          /* da co san — nu ra tu chinh nut bam */
  opacity: 1; transform: none;
  transition:
    opacity var(--dur-fast) var(--ease-out),
    transform var(--dur-fast) var(--ease-out),
    display var(--dur-fast) allow-discrete;
}
/* Duong RA: guong lai dung duong VAO, khong phai mot duong khac. */
.notif-panel[hidden], .user-chip__menu[hidden] {
  opacity: 0; transform: scale(0.97) translateY(-4px);
}
/* Duong VAO */
@starting-style {
  .notif-panel:not([hidden]), .user-chip__menu:not([hidden]) {
    opacity: 0; transform: scale(0.97) translateY(-4px);
  }
}
```

Quan trọng: `[hidden]` mặc định là `display: none`, và trình duyệt cần `display` nằm trong
danh sách `transition` kèm `allow-discrete` thì mới hoãn việc ẩn cho tới khi chuyển tiếp xong.

### Bước 3 — gỡ hoạt hình cũ

`menu-enter` giờ thừa cho hai popover này. Gỡ `animation: menu-enter …` khỏi quy tắc của chúng.
**Giữ** `@keyframes menu-enter` nếu còn chỗ khác dùng — kiểm bằng
`grep -n "menu-enter" index.css` trước khi xoá.

### Ranh giới phạm vi

- **Không** đụng `CommandPalette.tsx`. Nó cố ý không có hoạt hình mở/đóng.
- **Không** đổi thời lượng vượt `--dur-fast` (120ms). Trần cho hoạt hình giao diện là 300ms;
  popover ở bậc thấp hơn nhiều.
- **Không** thêm nảy/overshoot. Không có cử chỉ nào mang quán tính ở đây, nên
  nảy sẽ đọc ra là sai (apple-design §4: chỉ thêm nảy khi chính cử chỉ mang quán tính).

## Kiểm chứng

1. `@starting-style` và `transition-behavior: allow-discrete` cần Chrome/Edge 117+, Safari 17.4+,
   Firefox 129+. Ở trình duyệt cũ hơn, popover hiện/ẩn **tức thì** — vẫn dùng được, chỉ không có
   hoạt hình. Đây là suy giảm chấp nhận được, **phải kiểm tra thật** một lần trên Firefox.
2. Mở rồi đóng nhanh nhiều lần. Không được có nhấp nháy hay popover "kẹt lại".
3. Trợ năng: khi đóng, `document.querySelector('.notif-panel').hidden` phải là `true`, và
   nội dung bên trong không được Tab tới được.
4. Bật `prefers-reduced-motion` — phải chỉ còn mờ dần, không tịnh tiến, không phóng to
   (khối trợ năng ở cuối `index.css` đã lo phần này, chỉ cần xác nhận).
5. `npx vitest run` — 164/164. Đặc biệt chú ý các test mở menu rồi tìm mục bên trong: chúng
   từng hỏng vì lý do tương tự.
