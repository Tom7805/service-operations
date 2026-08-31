# Design

<!-- impeccable:design-schema 1 -->

## World

Hệ thống đã có một ngôn ngữ thị giác nhất quán và ở mức khá chuyên nghiệp (không phải "slop" AI mặc định) tại các
trang mới nhất (module Tài khoản, Khách hàng): nền trung tính sáng, thẻ bo góc mềm, một màu nhấn emerald duy nhất,
badge màu ngữ nghĩa cho trạng thái/vai trò. Quyết định: **kế thừa và nâng cấp** hệ này (không thay thế bằng một thế
giới thị giác hoàn toàn khác) — đúng tinh thần "Established world: inherit it" của Impeccable, đồng thời người dùng
đã xác nhận được tự do chỉnh màu/kiểu chữ nếu cần, nên các điểm yếu (tương phản thấp, spacing không đều, phân cấp
tiêu đề chưa rõ) sẽ được sửa triệt để theo từng trang.

## Color Strategy

**Restrained** — nền trung tính (trắng/xám lạnh rất nhạt) chiếm phần lớn bề mặt, một màu nhấn duy nhất (emerald) cho
hành động chính và điểm nhấn trạng thái tích cực; các màu ngữ nghĩa khác (đỏ/vàng/xanh dương/tím...) chỉ dùng cho
badge/pill trạng thái, không dùng làm accent chính. Đây là lựa chọn đúng cho một hệ thống Operate — vận hành nội bộ,
thao tác lặp lại hàng ngày, quét trạng thái là ưu tiên số một, không phải thuyết phục hay giải trí.

### Tokens

| Token | Giá trị | Vai trò |
|---|---|---|
| `--ink-900` | `#0f172a` | Tiêu đề, giá trị số liệu quan trọng |
| `--ink-700` | `#334155` | Nội dung chính trong bảng |
| `--ink-500` | `#5b6b7a` | Mô tả phụ, breadcrumb, nhãn |
| `--ink-400` | `#64748b` | Chữ phụ mờ hơn (đã đủ tương phản trên nền trắng) |
| `--line` | `#e2e8f0` | Viền thẻ/bảng mặc định |
| `--line-soft` | `#f1f5f9` | Viền phân cách hàng, nền hover nhẹ |
| `--surface` | `#ffffff` | Nền thẻ, bảng, modal |
| `--surface-muted` | `#f8fafc` | Nền toolbar, header bảng, footer |
| `--accent` | `#10b981` | Emerald — hành động chính, focus ring, trạng thái tích cực |
| `--accent-strong` | `#059669` | Hover/active của accent |
| `--danger` | `#dc2626` | Lỗi, khóa tài khoản, hành động phá hủy |
| `--warning` | `#d97706` | Cảnh báo |

Các badge màu ngữ nghĩa hiện có (`--badge-purple/gold/blue/green/orange/teal/pink/gray/red`) được giữ nguyên — đã đủ
đa dạng để phân biệt vai trò/phòng ban mà không cần thêm màu mới.

## Typography

- **Chữ**: DM Sans (đã tải qua Google Fonts) cho toàn bộ giao diện vận hành — đúng khuyến nghị "system/workhorse
  face" cho surface Operate, không cần đổi sang serif/display có cá tính vì đây không phải trang Persuade.
- **Thang chữ** (áp dụng nhất quán, không tự do chọn size mới ngoài thang này):
  - Tiêu đề trang: 26px / 700 / -0.01em
  - Tiêu đề thẻ/mục: 18px / 700
  - Nội dung bảng chính: 13.5–14px / 400–700 tùy vai trò
  - Nhãn phụ, breadcrumb, badge: 11–12.5px / 600–700 / uppercase khi là nhãn cột hoặc eyebrow
- Số liệu quan trọng (thẻ thống kê) dùng `font-variant-numeric: tabular-nums` khi xuất hiện nhiều số cạnh nhau.

## Navigation Shell (v2 — "windowed app")

Quyết định mới nhất, thay thế bản sidebar dọc trước đó, theo tham chiếu người dùng cung cấp (dashboard dạng
"Settings: Email accounts" — nền gradient pastel, app nổi trong khối bo góc lớn, header sạch + thanh tab pill).
Đã lấy đúng phần là ngôn ngữ UI thật, bỏ phần chrome trình bày Figma (khung viền đen giả thiết bị, nhãn
`/SETTINGS`, số trang — không áp dụng cho web app thật).

- **`.app-frame`**: toàn trang có nền gradient pastel rất nhạt (`body`), app nằm giữa trong một khối
  `.app-shell` bo góc 28px, viền mảnh, đổ bóng sâu (`--shadow-lg`) — giống cửa sổ ứng dụng desktop, không
  chiếm full viewport cứng nhắc.
- **`.app-topbar`**: logo tròn tối màu bên trái + tiêu đề trang lớn (đổi theo mục đang chọn, không còn tên hệ
  thống tĩnh); bên phải là cụm hành động tối giản — 2 nút icon tròn (trợ giúp, thông báo) + "user chip" (avatar
  + tên + chevron) mở menu tài khoản (đổi mật khẩu, vai trò hiện tại, đăng xuất).
- **`.pill-tabbar`**: điều hướng chính chuyển thành **thanh pill ngang** ngay dưới header — nền xám be nhạt
  bo tròn hoàn toàn, mục đang chọn nổi bằng nền trắng + bóng nhẹ (không phải nền đen như v1). Đây là điểm khác
  biệt rõ nhất so với v1 (sidebar dọc nền đen) — chuyển hẳn sang ngôn ngữ macOS System Settings.
- Trên màn hình hẹp (<900px): bỏ khung/bo góc/đổ bóng ngoài (app chiếm full viewport như app thường), thanh
  pill cuộn ngang được.

## Elevation & Motion

Mọi bề mặt nổi lên (card, nút, menu, modal) dùng chung một "nguồn sáng" — bóng mềm nhiều lớp, không dùng bóng
đơn cứng — và di chuyển bằng easing giảm tốc tự nhiên (`cubic-bezier(.16,1,.3,1)`), không dùng `linear`/`ease`
mặc định của trình duyệt. Khai báo tại `:root` trong `index.css`:

- `--shadow-xs/sm/md/lg`: 4 mức độ sâu, dùng đúng thứ tự (thẻ tĩnh → xs, hover thẻ → sm/md, menu/modal nổi → lg).
- `--ease-out`, `--dur-fast` (120ms), `--dur-base` (180ms): mọi `transition`/`animation` UI dùng lại các biến
  này thay vì hằng số rời rạc.
- `--radius-sm/md/lg/xl` (8/12/16/20px): bo góc theo cấp bậc bề mặt — nút/hàng nhỏ dùng sm, thẻ dùng md/lg, khối
  lớn (login panel...) dùng xl.
- Quy ước tương tác: hover nổi nhẹ (`translateY(-1px)` đến `-2px`) kèm bóng đậm hơn một cấp; bấm xuống lún nhẹ
  (`scale(.98)`); menu/modal xuất hiện bằng fade + dịch chuyển 4-8px, không bao giờ bật tắt đột ngột.

## Layout & Spacing

- Container trang: `max-width: 1280px`, padding ngang 24px.
- Thẻ (card): bo góc 12–16px, viền `--line`, đổ bóng rất nhẹ (`0 1px 3px rgba(0,0,0,.04)` tĩnh, đậm hơn khi hover).
- Khoảng cách giữa các khối lớn trong trang: bội số của 8px (8/16/24/32) — không dùng giá trị lẻ như 14px/18px cho
  margin giữa các khối, chỉ dùng cho padding nội bộ một thành phần nhỏ (nút, badge).
- Bảng dữ liệu: header `--surface-muted`, hàng phân cách bằng `--line-soft`, hover hàng bằng `--surface-muted`.

## Component Language

- **Trạng thái** luôn mã hóa bằng hình (pill có chấm tròn currentColor) + màu ngữ nghĩa, không chỉ bằng chữ.
- **Hành động theo hàng** dùng menu kebab (⋮) gộp các thao tác thay vì dãy icon rời — đã áp dụng ở bảng Tài khoản,
  là mẫu chuẩn để nhân rộng sang các bảng dữ liệu khác (Khách hàng, Hợp đồng, Dự án...).
- **Focus state**: viền accent + ring mờ (`box-shadow: 0 0 0 3px rgba(16,185,129,.12)`) — áp dụng cho mọi input,
  select, ô tìm kiếm.

## Rollout Plan (từng trang một, theo lựa chọn của người dùng)

1. Trang Tài khoản (Users) — đã có nền tảng tốt nhất, dùng làm chuẩn tham chiếu khi mở rộng sang trang khác.
2. Các trang bảng dữ liệu nghiệp vụ khác (Khách hàng, Hợp đồng, Dự án, Chấm công, Hóa đơn...) — áp lại đúng token và
   component language ở trên, ưu tiên trang có nhiều người dùng thao tác hằng ngày trước.
3. Các form nhập liệu / modal — chuẩn hoá theo `.form-grid`, `.form-label`, `.form-input` đã có.

## Accessibility

Tương phản chữ trên nền trắng giữ tối thiểu ở mức `--ink-400` (#64748b, ~4.6:1) cho chữ phụ và `--ink-700` trở lên
cho nội dung chính. Mọi phần tử tương tác giữ focus-visible rõ ràng bằng accent ring ở trên.
