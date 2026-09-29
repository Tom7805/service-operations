---
name: Vận Hành Dịch Vụ
description: Hệ vận hành nội bộ theo lối Claude — nền trắng gần tuyệt đối hai tầng, tấm làm việc nổi bo tròn, viền là mực trong suốt, chữ nhẹ tay, nút chính mực đen, một màu nhấn xanh dương Claude cho điểm tương tác.
colors:
  accent: "#2A78D6"
  accent-hover: "#1F66C0"
  accent-ink: "#1F63B8"
  accent-soft: "#EBF3FD"
  accent-ring: "rgba(42, 120, 214, 0.24)"
  primary-ink: "#1F1E1D"
  primary-ink-hover: "#3A3936"
  primary-ink-press: "#141413"
  ink-strong: "#141413"
  ink: "#3D3D3A"
  ink-muted: "#5E5D59"
  ink-faint: "#6F6E69"
  frame: "#F6F6F4"
  frame-hover: "rgba(20, 20, 19, 0.045)"
  frame-active: "rgba(20, 20, 19, 0.065)"
  canvas: "#FCFCFB"
  surface: "#FFFFFF"
  surface-alt: "#F8F8F7"
  surface-sunken: "#F0F0EF"
  line: "rgba(20, 20, 19, 0.09)"
  line-strong: "rgba(20, 20, 19, 0.18)"
  line-input: "rgba(20, 20, 19, 0.13)"
  line-focus: "#2A78D6"
  hairline: "rgba(31, 30, 29, 0.06)"
  scrim: "rgba(20, 20, 19, 0.20)"
  pale-red-bg: "#FDE9EB"
  pale-red-fg: "#B42331"
  pale-blue-bg: "#EAF2FC"
  pale-blue-fg: "#1F63B8"
  pale-green-bg: "#E6F4E6"
  pale-green-fg: "#1E6E2E"
  pale-yellow-bg: "#FCF1D6"
  pale-yellow-fg: "#8A5A00"
  pale-gray-bg: "#F0F0EF"
  pale-gray-fg: "#5E5D59"
  on-primary: "#FFFFFF"
  danger-solid: "#B42331"
  success-solid: "#1E6E2E"
  warning-solid: "#8A5A00"
typography:
  display:
    fontFamily: "Manrope Variable, -apple-system, SF Pro Text, Segoe UI Variable Text, Segoe UI, system-ui, Helvetica Neue, Arial, sans-serif"
    fontSize: "clamp(38px, 3.6vw, 58px)"
    fontWeight: 600
    lineHeight: 1.08
    letterSpacing: "-0.036em"
  headline:
    fontFamily: "Manrope Variable, -apple-system, SF Pro Text, Segoe UI Variable Text, Segoe UI, system-ui, Helvetica Neue, Arial, sans-serif"
    fontSize: "clamp(26px, 2.3vw, 32px)"
    fontWeight: 600
    lineHeight: 1.15
    letterSpacing: "-0.02em"
  metric:
    fontFamily: "Manrope Variable, -apple-system, SF Pro Text, Segoe UI Variable Text, Segoe UI, system-ui, Helvetica Neue, Arial, sans-serif"
    fontSize: "clamp(24px, 2vw, 28px)"
    fontWeight: 500
    lineHeight: 1
    letterSpacing: "-0.02em"
  section:
    fontFamily: "Manrope Variable, -apple-system, SF Pro Text, Segoe UI Variable Text, Segoe UI, system-ui, Helvetica Neue, Arial, sans-serif"
    fontSize: "24px"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-0.02em"
  titleLarge:
    fontFamily: "Manrope Variable, -apple-system, SF Pro Text, Segoe UI Variable Text, Segoe UI, system-ui, Helvetica Neue, Arial, sans-serif"
    fontSize: "20px"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "-0.016em"
  title:
    fontFamily: "Manrope Variable, -apple-system, SF Pro Text, Segoe UI Variable Text, Segoe UI, system-ui, Helvetica Neue, Arial, sans-serif"
    fontSize: "18px"
    fontWeight: 600
    lineHeight: 1.35
    letterSpacing: "-0.01em"
  lead:
    fontFamily: "Manrope Variable, -apple-system, SF Pro Text, Segoe UI Variable Text, Segoe UI, system-ui, Helvetica Neue, Arial, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: "-0.008em"
  bodyLarge:
    fontFamily: "Manrope Variable, -apple-system, SF Pro Text, Segoe UI Variable Text, Segoe UI, system-ui, Helvetica Neue, Arial, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: "-0.004em"
  body:
    fontFamily: "Manrope Variable, -apple-system, SF Pro Text, Segoe UI Variable Text, Segoe UI, system-ui, Helvetica Neue, Arial, sans-serif"
    fontSize: "14.5px"
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: "0em"
  control:
    fontFamily: "Manrope Variable, -apple-system, SF Pro Text, Segoe UI Variable Text, Segoe UI, system-ui, Helvetica Neue, Arial, sans-serif"
    fontSize: "14.5px"
    fontWeight: 500
    letterSpacing: "0em"
  bodySmall:
    fontFamily: "Manrope Variable, -apple-system, SF Pro Text, Segoe UI Variable Text, Segoe UI, system-ui, Helvetica Neue, Arial, sans-serif"
    fontSize: "13.5px"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "0.004em"
  label:
    fontFamily: "Manrope Variable, -apple-system, SF Pro Text, Segoe UI Variable Text, Segoe UI, system-ui, Helvetica Neue, Arial, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    letterSpacing: "0em"
  mono:
    fontFamily: "SF Mono, SFMono-Regular, Segoe UI Mono, JetBrains Mono, Consolas, Liberation Mono, Menlo, monospace"
    fontSize: "13.5px"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "0.03em"
rounded:
  sm: "8px"
  md: "10px"
  lg: "16px"
  2xl: "20px"
  full: "999px"
components:
  button-primary:
    backgroundColor: "{colors.primary-ink}"
    textColor: "{colors.on-primary}"
    typography: "{typography.control}"
    rounded: "{rounded.md}"
    padding: "8px 15px"
  button-primary-hover:
    backgroundColor: "{colors.primary-ink-hover}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink-strong}"
    typography: "{typography.control}"
    rounded: "{rounded.md}"
    padding: "8px 15px"
  button-secondary-hover:
    backgroundColor: "{colors.surface-alt}"
  link:
    textColor: "{colors.accent-ink}"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink-strong}"
    rounded: "{rounded.md}"
  nav-item:
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "8px 10px"
  nav-item-hover:
    backgroundColor: "{colors.frame-hover}"
    textColor: "{colors.ink-strong}"
  nav-item-active:
    backgroundColor: "{colors.frame-active}"
    textColor: "{colors.ink-strong}"
  tab-pill:
    textColor: "{colors.ink-muted}"
    padding: "7px 13px"
  tab-pill-active:
    backgroundColor: "{colors.surface-sunken}"
    textColor: "{colors.ink-strong}"
  selected-chip:
    backgroundColor: "{colors.accent-soft}"
    textColor: "{colors.accent-ink}"
  content-panel:
    backgroundColor: "{colors.canvas}"
    rounded: "{rounded.2xl}"
  card:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.lg}"
  stat-tile:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.lg}"
    padding: "16px 18px 18px"
  dialog:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.2xl}"
  menu-item:
    rounded: "{rounded.sm}"
  avatar:
    backgroundColor: "{colors.surface-sunken}"
    textColor: "{colors.ink-strong}"
---

# Design

## Overview

**Creative North Star: "Bàn làm việc mềm"** — một bề mặt vận hành bình tĩnh, bám sát ngôn ngữ thị giác
của chính Claude: nền trắng gần tuyệt đối hai tầng, nơi làm việc là một **tấm sáng bo tròn nổi lên** trên khung trầm
hơn một nấc; mép thẻ, ô nhập và bảng được vẽ bằng **mực ấm trong suốt** nên đọc ra mềm chứ không "vẽ
khung"; khi có việc chen ngang (hộp thoại), phần lề ngoài **tối nhẹ và nhoè đi**.

Hệ vận hành nội bộ bằng tiếng Việt, dùng lặp lại hằng ngày. Bản này **thay thế** giai đoạn "tối giản
biên tập" (bán kính ≤12px, viền xám đặc, nhãn mono IN HOA, không màu nhấn, lớp che chỉ làm tối, khoang
chỉ số chia lưới 1px). Những gì còn đúng được giữ nguyên: đơn sắc ấm, cặp pastel ngữ nghĩa, chữ hệ thống,
khung cố định chỉ `.app-main` cuộn, icon Phosphor bold, sentence case tiếng Việt.

Ba câu tóm tắt cả hệ:

1. **Tách nhóm bằng khoảng trắng và sắc nền, hạn chế tối đa đường kẻ.** Khi cần đường kẻ, nó là mực
   ấm trong suốt (6–15%), không bao giờ là xám đặc.
2. **Chữ nhẹ tay.** 400 cho nội dung và nhãn, 500 cho điều khiển và số liệu, 600 chỉ cho tiêu đề.
   Không có 700.
3. **Đúng một màu nhấn xanh dương Claude, chỉ ở điểm tương tác; nút chính là mực đen.** Mọi thứ còn
   lại là đơn sắc gần trắng; màu ngữ nghĩa là 4 cặp nền nhạt trong trẻo + chữ đậm.

Thế giới này **từ chối**: giao diện quản trị phẳng tràn mép với đường kẻ cứng, lưới chia khoang, dải
nền tiêu đề bảng, nhãn mono IN HOA, chữ đậm 700, và mọi dấu vết của hệ "Liquid Glass" cũ.

**Key Characteristics:**
- Khung `#F6F6F4` + tấm làm việc `#FCFCFB` bo 20px, viền 0.5px mực ấm và bóng khuếch tán.
- Viền là mực ấm `#1F1E1D` trong suốt: 6% (đường tóc), 10% (thẻ), 15% (ô nhập), 20% (hover).
- Một màu nhấn xanh dương Claude `#2A78D6` (đo từ công tắc trong hộp thoại Cài đặt của Claude) cho công tắc, ô tích, vòng focus, viền ô nhập khi focus, liên kết, trạng thái "đang chọn" và "chưa lưu".
- Nút chính mực đen `#1F1E1D`, không phải màu nhấn — người dùng đã thử nút xanh và chọn giữ nút đen.
- Bán kính 8 / 10 / 16 / 20; tab và hàng bảng khi rê chuột đều là viên bo tròn.
- Nhãn sentence case 13px/400; mono chỉ còn cho mã, số hiệu, phím tắt.
- Chuyển động chữ ký: viên tab trượt bằng `clip-path`, lớp che mờ + hộp thoại nhô lên, tấm trượt từ đáy trên điện thoại.
- **Hai giao diện Sáng / Tối (+ Theo hệ thống)** cùng một bộ token: mọi thành phần đọc màu qua biến, giao diện tối
  chỉ đổi giá trị biến (§ Giao diện tối). Người dùng chọn ở Cài đặt › Giao diện (không đặt nút Sáng/Tối trên thanh bên).

## Colors

Đơn sắc **gần trắng, chỉ thoáng ấm** lấy theo hộp thoại Cài đặt của Claude (đo từ ảnh tham chiếu: cột
trái `#FCFCFB`, nội dung `#FFFFFF`, mục đang chọn `#F0F0EF`, viền ô nhập ≈`#E6E6E6`), cộng đúng **một**
màu nhấn xanh dương Claude. Bảng ngà/be cũ (`#F6F6F4`/`#FCFCFB`) bị bỏ vì đọc ra "xỉn, cũ".

### Primary — màu nhấn xanh dương Claude
| Token | Vai trò |
|---|---|
| `accent` | Thành phần phi văn bản: công tắc bật, ô tích/nút chọn tròn khi chọn, viền ô nhập khi focus, viền 1px của mục đang chọn, viền thanh "chưa lưu". 4.4:1 trên trắng. |
| `accent-hover` | Hover của liên kết. |
| `accent-ink` | **Chữ** mang màu nhấn: liên kết, chữ mục đang chọn, nhãn "chưa lưu", số thứ tự điểm nhấn trang đăng nhập. 5.9:1 — đạt AA cho chữ thường. |
| `accent-soft` | Nền mục đang chọn, nhãn "chưa lưu". |
| `accent-ring` | Vòng focus 3px (qua `--shadow-focus`). |

### Nền & bề mặt — hai tầng
| Token | Vai trò |
|---|---|
| `frame` | **Khung**: nền `body`, thanh bên, nửa thương hiệu trang đăng nhập. |
| `frame-hover` / `frame-active` | Mực trong suốt 5% / 8% — hover và mục đang chọn **trên khung**; cũng là hover của tab viên. |
| `canvas` | **Tấm làm việc** nổi, thanh tiêu đề dính, nửa biểu mẫu trang đăng nhập. |
| `surface` | Thẻ, ô chỉ số, hộp thoại, popover, ô nhập, nút phụ. |
| `surface-alt` | Hover hàng bảng (viên), hover nút phụ, thanh lọc hạn. |
| `surface-sunken` | Viên tab đang chọn, mục bảng lệnh đang chọn, hover mục menu, dải tab trạng thái. |

Vùng nền mềm của ô trống, ghi chú và thẻ điểm nhấn dùng mực ấm rất nhạt (2.5–4%) thay cho khung viền.

### Chữ — không bao giờ dùng `#000000` thuần
| Token | Vai trò |
|---|---|
| `ink-strong` | Tiêu đề, số liệu, chữ trong ô nhập và nút phụ, mục đang chọn. |
| `ink` | Nội dung chính, mục điều hướng, nhãn biểu mẫu. |
| `ink-muted` | Nhãn sentence case (nhãn chỉ số, tiêu đề cột), tab chưa chọn, icon điều hướng. ~6.9:1. |
| `ink-faint` | Nhãn nhóm thanh bên, placeholder. ~5.4:1. |
| `primary-ink` / `primary-ink-hover` / `primary-ink-press` | Nền nút chính, nút đăng nhập, toast dải. |

### Đường kẻ — mực ấm trong suốt
`hairline` (6%) cho phân cách hàng bảng, chân hộp thoại, nhóm bảng lệnh, hàng tuỳ chọn; `line` (10%)
cho vòng viền thẻ/ô chỉ số và đường dưới tiêu đề bảng; `line-input` (15%) cho ô nhập và nút phụ;
`line-strong` (20%) cho hover; `line-focus` (35%) cho viền ô nhập khi focus. Vì trong suốt, viền hoà
vào bất kỳ nền nào bên dưới. Thang phủ đen cũ `--overlay-*` chỉ còn ở các quy tắc cũ (thanh cuộn,
lớp che dự phòng) — **đừng dùng cho viền mới**.

### Màu ngữ nghĩa — chỉ 4 cặp pastel (+ xám trung tính)
Dùng theo cặp `bg` + `fg`, không bao giờ dùng lẻ.

| Ý nghĩa | Cặp | Dùng cho |
|---|---|---|
| Thành công / đang hoạt động | `pale-green-*` | pill trạng thái, toast thành công |
| Lỗi / đã khóa / phá hủy | `pale-red-*` | pill khóa, lỗi biểu mẫu, nút xóa |
| Cảnh báo | `pale-yellow-*` | pill cảnh báo, hạn mức |
| Thông tin | `pale-blue-*` | nhãn phân loại |

### Giao diện tối
Bật bằng `data-theme="dark"` trên `<html>` (khối `:root[data-theme="dark"]`, mục 30 của `index.css`). Theo tông tối
của Claude: than ấm nhiều tầng, sáng dần từ khung ra thẻ; chữ ngà; viền là mực **sáng** trong suốt.

| Token | Sáng | Tối |
|---|---|---|
| `frame` | `#F6F6F4` | `#1C1B1A` |
| `canvas` | `#FCFCFB` | `#242322` |
| `surface` / `surface-alt` / `surface-sunken` | `#FFFFFF` / `#F8F8F7` / `#F0F0EF` | `#2B2A28` / `#32312E` / `#3A3936` |
| `ink-strong` / `ink` / `ink-muted` / `ink-faint` | `#141413` / `#3D3D3A` / `#5E5D59` / `#6F6E69` | `#F2F1EC` / `#D6D4CC` / `#AAA89F` / `#8F8D85` |
| `line` / `line-strong` / `line-input` | mực tối 9% / 18% / 13% | mực sáng `rgba(242,241,236,…)` 12% / 22% / 16% |
| `accent` / `accent-ink` | `#2A78D6` / `#1F63B8` | `#5A9BEA` / `#8DB9F2` (sáng hơn để đủ tương phản) |
| `primary` / `on-primary` | `#1F1E1D` / `#FFFFFF` | `#ECEAE3` / `#1C1B1A` — **nút chính đảo thành khối sáng chữ tối** |
| `danger-solid` / `success-solid` / `warning-solid` | `#B42331` / `#1E6E2E` / `#8A5A00` | `#C23A45` / `#2E8A40` / `#A8750F` |
| `pale-*-bg` / `pale-*-fg` | nền nhạt + chữ đậm | nền màu 16% trong suốt + chữ sáng |

**Kênh màu cho độ trong suốt.** Viền/nền mực viết `rgb(var(--ink-rgb) / 0.1)` để tự đảo sáng khi tối; bóng
đổ viết `rgb(var(--shadow-rgb) / …)` — luôn tối. Nền kính của thanh tiêu đề dùng `--canvas-rgb`/`--surface-rgb`.

**Nền đặc ≠ cặp pastel.** Nút xóa/thành công, huy hiệu đếm có chữ trắng dùng `*-solid`; `pale-*-fg` chỉ là màu chữ.

Mô phỏng chủ đề trong ô chọn "Sáng / Tối / Theo hệ thống" (`.theme-preview`) cố ý viết cứng màu — nó phải
trông như giao diện kia dù đang ở giao diện nào.

### Named Rules
**The Token-Only Color Rule.** Màu mới trong CSS và style nội tuyến TSX **luôn** là biến (`var(--surface)`,
`var(--ink-muted)`, `rgb(var(--ink-rgb) / .08)`…), không bao giờ `#hex` thẳng — nếu không, giao diện tối sẽ
để lại một mảng trắng. Ngoại lệ: màu chuỗi dữ liệu biểu đồ và `.theme-preview`.

**The Translucent Ink Line Rule.** Mọi viền và đường phân cách là mực ấm `#1F1E1D` ở độ trong suốt
thấp (`hairline` / `line` / `line-input` / `line-strong`), không bao giờ là một màu xám đặc. Viền xám
đặc là thứ biến một giao diện mềm thành "gai góc".

**The One Blue Rule.** Xanh dương Claude chỉ xuất hiện ở điểm tương tác — công tắc, ô tích/nút chọn,
viền + vòng focus, liên kết, trạng thái "đang chọn" và "chưa lưu". Không bao giờ làm nền
mảng lớn và **không bao giờ làm nền nút** — nút chính là mực đen (người dùng đã từ chối nút xanh).

**The One Selected Grammar Rule.** Mọi *lựa chọn* dạng chip/thẻ/radio nói cùng một câu: nền
`accent-soft` + chữ `accent-ink` + viền 1px `accent`. Ngoại lệ có chủ đích: *vị trí* (mục điều hướng,
tab viên, mục bảng lệnh) dùng nền trung tính `frame-active` / `surface-sunken`.

**The No Count Cards Rule.** Trang danh sách không mở đầu bằng hàng ô đếm số dòng ("Tổng hồ sơ 16",
"Đã khóa 0"…) — chúng đẩy nội dung chính xuống mà không giúp làm gì. Số đếm nằm ở nút lọc trạng thái
("Đang thực hiện 2 · Đã đóng 0") và chân bảng ("Hiển thị 4 / 4"); tổng tiền cần thiết đặt cạnh tiêu đề
khu hoặc ở chân bảng. Ô số liệu chỉ còn ở trang tổng hợp: Lợi nhuận, Báo cáo, chi tiết hợp đồng/hóa đơn.

**The Neutral Stat Rule.** Icon của ô chỉ số là `ink-muted` trên nền trung tính. Số đếm thông thường
luôn `ink-strong` — không tô xanh/đỏ để trang trí. Số báo vấn đề (tài khoản bị khoá, truy cập bị từ chối)
chỉ đỏ khi > 0; số tiền/biên lợi nhuận giữ màu theo dấu âm/dương.

## Typography

**Manrope, tự lưu trong dự án.** Phông giao diện là Manrope (bản biến thiên, SIL OFL) cài qua
`@fontsource-variable/manrope` và nạp trong `main.tsx` trước stylesheet — tệp phông đóng gói cùng ứng dụng,
**không tải qua mạng lúc chạy** (vẫn dùng được trong mạng LAN). Chọn sau khi so trực tiếp với ảnh chụp
giao diện Claude: phông của Claude là độc quyền, Manrope là phông miễn phí gần nhất có đủ bộ dấu tiếng
Việt (hình học ấm, "a" hai tầng, "y" đuôi thẳng, chữ thoáng). Đã loại: Figtree (thiếu tiếng Việt), Be
Vietnam Pro ("a" một tầng), Onest ("y" đuôi cong), Inter (quá trung tính), Plus Jakarta Sans (quá chặt).
Chữ hệ thống chỉ còn là phương án dự phòng trong `--font-sans`. `<select>`/`<textarea>` phải kế thừa
phông (`font: inherit`) vì trình duyệt không tự làm.
Hai chuỗi font khai báo **một lần** ở `:root` (`--font-sans`, `--font-mono`); **không bao giờ** dùng
`font-family: monospace` trần (trên Windows rơi về Courier New).

**Character:** một chữ sans duy nhất (Manrope), nhẹ tay; phân cấp bằng cỡ chữ trước, độ đậm sau, và độ
đậm dừng ở 600. Mono lùi về đúng vai "chữ máy".

### Hierarchy
- **Display** (bìa đăng nhập): xem `typography.display`.
- **Headline** (tiêu đề trang, `clamp(26–32px)`, 600, `ink-strong`).
- **Title** (tiêu đề hộp thoại / thẻ, 18px, 600).
- **Metric** (số liệu ô chỉ số, `clamp(24–28px)`, **500**, `tabular-nums`).
- **Body** (14.5px/400, `line-height: 1.6`) — gốc thang giãn chữ; cũng là cỡ của mục điều hướng và tab.
- **Control** (14.5px/500): nút, nhãn biểu mẫu, mục điều hướng đang chọn, badge/pill.
- **Label** (13px/**400**, `ink-muted`, sentence case, không giãn chữ): nhãn chỉ số, tiêu đề cột bảng,
  nhãn nhóm báo cáo / bảng lệnh / thanh bên.
- **Mono** (13.5px, `--track-mono`): mã hợp đồng, số hiệu, phím tắt `kbd`. **Không** IN HOA.

Thang cỡ chữ: `12.5 · 13 · 13.5 · 14.5 · 15 · 16 · 18 · 20 · 24 · 30 · 32 · 40` (px) cộng các bậc
`clamp()` cho display / tiêu đề trang / số liệu. Giãn chữ vẫn là **hàm của cỡ chữ** qua thang `--track-*`.

### Named Rules
**The Light Hand Rule.** Chỉ ba độ đậm: 400 (nội dung, nhãn, tab, tiêu đề cột), 500 (điều khiển, mục
đang chọn, số liệu, badge), 600 (tiêu đề trang / hộp thoại / thẻ). **Không có 700/800/bold** — ở cả CSS
lẫn style nội tuyến trong TSX. Tab đang chọn không đậm lên; nền viên đã nói nó đang chọn.

**The Sentence-Case Label Rule.** Nhãn là chữ người đọc, không phải mã máy: sans, 13px, 400, viết
thường theo câu, `letter-spacing: 0`. Không mono, không IN HOA. Không hiển thị mã sự kiện nội bộ
(kiểu `TASK_BUDGET_EXCEEDED`) cho người dùng.

**The Vietnamese Sentence Case Rule.** Tiếng Việt dùng sentence case, **không** Title Case.

Tiêu đề có `text-wrap: balance`, đoạn văn có `text-wrap: pretty`.

## Layout

- **Ứng dụng là một KHUNG CỐ ĐỊNH bằng đúng khung nhìn** (`height: 100dvh; overflow: hidden`). Chỉ
  **`.app-main` cuộn**; thanh bên và thanh tiêu đề đứng yên. Đo ở bản trước khi sửa: cuộn xuống đáy
  bảng 25 dòng thì thanh tiêu đề ở `-1516px` và 0/10 mục điều hướng còn nhìn thấy. **Đừng cho `body`
  cuộn trở lại.**
- **Tấm làm việc nổi:** `.app-main` cách mép khung 8px ở trên/phải/dưới, liền với thanh bên ở trái,
  bo `rounded.2xl`. Thanh tiêu đề dính bo cùng hai góc trên, đệm `14px 32px 12px`.
- Thanh bên 244px (thu gọn 68px) nằm thẳng trên nền khung, **không có đường kẻ phải**.
- Trang: `max-width: 1280px`, đệm **`28px 32px 40px`**; trang lồng trong khu làm việc không cộng đệm.
- **Ô chỉ số là các ô rời:** lưới `repeat(auto-fit, minmax(172px, 1fr))`, `gap: 12px` (10px ở ≤640px,
  xếp 2 cột).
- Dải tab khu làm việc cách phần thân 20px, không có đường kẻ dưới.
- Bảng trong thẻ có đệm trong 8px (≥641px) để viên hover không chạm mép thẻ. Bảng rộng cuộn ngang
  trong khung của chính nó; bảng dày dữ liệu giữ hàng tối đa hai dòng; trên điện thoại chỉ giữ cột
  định danh, tên, trạng thái và menu thao tác.
- Khoảng cách giữa các khối lớn: bội số 8px (và 12px giữa các ô).

### Điểm ngắt
- **≤900px:** thanh bên thành thanh ngang (giữ nhãn chữ), tấm làm việc cách mép 6px và bo `rounded.lg`,
  thanh tiêu đề đệm `14px 16px 10px`, trang không cộng đệm ngang; nút tìm nhanh dạng icon thay gợi ý phím tắt.
- **≤640px:** hộp thoại thành tấm trượt từ đáy; nút chân chia đều bề ngang, cao ≥44px.

## Elevation & Depth

Hệ **lai, bóng ấm**: bề mặt nội dung gần như phẳng, tách nhau bằng vòng viền mực mảnh và sắc nền;
**chỉ lớp nổi** (tấm làm việc, popover, hộp thoại, bảng lệnh, toast, thanh "chưa lưu", thẻ đăng nhập)
có bóng khuếch tán. Mọi bóng của lớp Claude đổ bằng **mực ấm `rgba(31,30,29,…)`**, không phải đen
trung tính, và mở đầu bằng **vòng 0.5px** thay cho viền 1px.

### Shadow Vocabulary
- **Vòng thẻ** (vòng 1px `line` + bóng tiếp xúc 3%): thẻ bảng, ô chỉ số.
- **Tấm làm việc** (vòng 0.5px 12% + tiếp xúc 3% + bóng xa 10%): `.app-main`.
- **Popover** (vòng 0.5px 12% + hai lớp khuếch tán tới 18%): menu, bảng thông báo, danh sách chọn.
- **Hộp thoại** (vòng 0.5px 10% + hai lớp khuếch tán tới 26%) và **bảng lệnh** (vòng 0.5px + một lớp 28%).
- **Toast** (vòng 0.5px + một lớp 22%); **thanh "chưa lưu"** (vòng 0.5px + một lớp 18%).
- **Nút phụ / ô làm mới** (`0 1px 2px` mực 4%).
- **Focus** (`--shadow-focus`): vòng 3px `accent-ring`.

Giá trị chính xác nằm trong các biến `--shadow-*` của `frontend/src/assets/styles/index.css`.

### Vật liệu mờ — chỉ trên lớp chức năng
| Bề mặt | Xử lý |
|---|---|
| Thanh tiêu đề dính | `canvas` 82% + `backdrop-filter: blur(20px) saturate(180%)`, mép cuộn mờ dần thay cho đường kẻ |
| Lớp che sau hộp thoại / bảng lệnh | `scrim` (nâu ấm 18%) + `blur(8px) saturate(120%)` |
| Mọi thẻ, bảng, hộp thoại, popover | **Đục hoàn toàn** |

### Named Rules
**The Floating-Only Shadow Rule.** Bóng khuếch tán chỉ dành cho lớp nổi. Bề mặt nội dung chỉ có vòng
viền mực và bóng tiếp xúc ≤3%.

**The Half-Pixel Ring Rule.** Lớp nổi được viền bằng vòng `0 0 0 0.5px` mực ấm trong `box-shadow`,
không bằng `border` 1px — mép đọc ra như một cạnh bắt sáng chứ không như nét vẽ.

**The Dim-and-Blur Interruption Rule.** Khi hộp thoại mở, lề ngoài **tối nhẹ và nhoè** để dồn chú ý vào
tấm chính. Nhoè chỉ ở lớp che, không bao giờ ở bề mặt chứa nội dung, và không chồng kính lên kính.

**The Warm Light Rule.** Bóng chỉ nhuộm bằng chính mực ấm của hệ; cấm bóng mang màu nhấn hay màu ngữ nghĩa.

## Shapes

Bo tròn **dịu và đồng đều, tăng theo kích thước bề mặt**: `sm` 8px (mục menu, mục bảng lệnh, ô nhập
nhỏ), `md` 10px (nút, ô nhập, mục điều hướng, dấu thương hiệu, viên hover hàng bảng), `lg` 16px (thẻ,
ô chỉ số, ô trống, tấm làm việc ở màn hẹp), `2xl` 20px (tấm làm việc, hộp thoại, bảng lệnh, thẻ đăng
nhập). `full` cho chip chọn hạn, công tắc và ba cột của dấu thương hiệu.

Các bậc **suy ra** theo quy tắc đồng tâm / kích thước, không phải bậc mới của thang:
- 9px — viên tab (khu làm việc và hồ sơ khách hàng), cũng là bán kính của vùng cắt `clip-path`.
- 12px — ghi chú, hộp cảnh báo, thanh lọc hạn, thẻ chọn vai trò, khối điểm nhấn đăng nhập.
- 14px — popover, menu, toast, ô điểm nhấn đăng nhập (đệm 6px → mục trong 8px).
- 5px — ô tích 17px.

**Không khung, chỉ nền.** Ô trống, ghi chú, hộp cảnh báo, callout không có viền — chỉ một vùng nền mềm
bo 12–16px. Không dùng viền đứt nét. Hộp thoại tách phần đầu bằng khoảng trắng; chân có một đường tóc.

## Components

### Buttons
- **Chính:** khối `primary-ink` đặc, chữ trắng, 14.5px/500, `rounded.md`, đệm 8×15. Ánh sáng mảnh mép
  trên (inset trắng 14% + dải sáng 9% ở nửa trên) và bóng tiếp xúc ngắn có độ lệch (1–2px) — nổi, bấm được,
  không thành khối nhựa. Hover `primary-ink-hover`, nhấn `primary-ink-press` + bóng lõm. Không bao giờ
  dùng màu nhấn làm nền nút.
- **Nguy hiểm / thành công:** cùng dáng, ánh sáng và bóng với nút chính, nền `pale-red-fg` / `pale-green-fg`
  (hover đậm hơn). Nút chỉ mang lớp `btn-danger`/`btn-success` vẫn nhận đủ dáng (quy tắc `:where()`).
- **Cỡ nhỏ:** `btn-sm` đệm 6×12, 13.5px; `btn-xs` đệm 4×9, 12.5px, bo `rounded.sm`.
- **Phụ:** nền `surface`, viền `line-input`, chữ `ink-strong`, bóng tiếp xúc 4%; hover nền
  `surface-alt` + viền `line-strong`. Nút chỉ mang lớp `btn` trần nhận đúng dáng này.
- **Nhấn:** `scale(0.97)` trong 160ms (nút đăng nhập 0.98). **Không** phóng to hay nhấc lên khi rê chuột.
- **Liên kết:** chữ `accent-ink`, hover `accent-hover`. Nút bị vô hiệu: opacity 0.5.

### Inputs / Fields
- Nền `surface`, viền `line-input`, chữ `ink-strong`, `rounded.md`; hover viền `line-strong`.
- **Focus:** viền `accent` + `--shadow-focus` (vòng xanh 3px). Không outline mặc định.
- **Ô chọn:** bỏ mũi tên hệ điều hành, vẽ lại chevron mảnh 14px (nét 1.6) cách phải 12px.
- **Ô tích / nút chọn tròn** (tuỳ biến toàn cục qua `:where()` để độ ưu tiên bằng 0): 17px, viền mực
  28% (hover 45%), ô tích bo 5px, nút chọn tròn; khi chọn nền và viền `accent`, dấu tích/chấm trắng
  **mờ dần và nở từ `scale(0.7)`** trong 120ms.

### Công tắc (switch)
Rãnh 36×20, mực trong suốt 18% khi tắt, `accent` khi bật; con trượt trắng 16px bóng mực nhẹ, trượt 16px
trong 200ms `--ease-out`, lún `scale(0.92)` khi nhấn.

### Navigation
- **Thanh bên** trên khung: mục 14.5px/400 `ink`, icon 17px `ink-muted`, `rounded.md`. Hover
  `frame-hover`; đang chọn `frame-active` + chữ 500 `ink-strong` — không khối màu đổ đầy.
- **Nhóm mục tách bằng đường kẻ, không có nhãn nhóm** (theo ảnh mẫu người dùng đưa, kiểu YouTube/Linky):
  `.side-nav__divider` 1px `line`, cách 8px; mỗi nhóm là `role="group"` có `aria-label` = tên nhóm để trình đọc
  màn hình vẫn đọc được.
- **Chân thanh bên** (`.side-nav__footer`, một đường `line` phía trên), từ trên xuống: *Cài đặt* (mở Cài đặt cá
  nhân), *Trợ giúp* (mở mục Trợ giúp & phím tắt), đường kẻ, rồi **khối tài khoản**: avatar 32px + họ tên 14px/500 + vai trò 12.5px `ink-muted` + ⋯.
  Bấm khối tài khoản mở menu **bật lên phía trên** (Cài đặt · Đổi mật khẩu · Quyền xem dữ liệu nếu có · Đăng xuất
  màu `pale-red-fg`). Thanh tiêu đề **không còn** chip tài khoản.
- Cấu hình hệ thống của quản trị (trước là "Cài đặt") đổi thành **"Cấu hình hệ thống"**, icon cờ lê, để không
  trùng với Cài đặt cá nhân.
- ≤900px: thanh ngang cuộn ngang; nhóm nối nhau bằng vạch dọc 1px; chân chỉ còn icon (Cài đặt, Trợ giúp,
  avatar); menu tài khoản mở xuống ở góc phải trên.
- **Dấu thương hiệu:** khối **mực ấm `#1F1E1D`** (cùng màu nút chính) bo 10px, ba cột **trắng `#FFFFFF`,
  bo tròn hoàn toàn** cao dần 8/13/19px. Dùng chung cho thanh bên và trang đăng nhập. **Không dùng màu
  cho logo** (yêu cầu của người dùng) — màu nhấn chỉ dành cho điểm tương tác.
- **Thu/mở không có chuyển động chiều rộng** (xem Known accepted deviations). Phím tắt `Ctrl/⌘+B`; trạng thái
  thu/mở là một tuỳ chọn cá nhân lưu lên máy chủ cùng các tuỳ chọn khác.

### Danh sách gọn (`.list-table`)
Danh sách là nơi **tìm và chọn**, không phải nơi đọc hồ sơ — thông tin chi tiết ở trang chi tiết.
- **Mỗi hàng đúng một dòng**, cao đều (~64px khi có dòng phụ dưới tên): `table-layout: fixed`, ô
  `nowrap` + `…`, nội dung đầy đủ trong `title`. Tổng % bề rộng các cột ≤ ~95% để chừa cột menu 52px.
- **Tối đa 5–6 cột**: cột định danh (tên + dòng phụ mono: mã/tài khoản) + 3–4 cột giúp nhận ra/lọc +
  trạng thái. Mã phụ (mã hợp đồng của hóa đơn, @tài khoản) thành dòng phụ, không thành cột riêng.
- **Bấm cả hàng để mở chi tiết** (`.list-table__row`); tên là `<button class="list-table__title">` cho
  bàn phím; ô menu `stopPropagation`.
- **Menu ⋮ chỉ hiện khi rê chuột/focus vào hàng** (thiết bị chạm luôn hiện).
- **Trạng thái bình thường là chấm + chữ nhạt** (`.list-status--on`); chỉ ngoại lệ mới được nhấn
  (`--off` nền xám, `--danger` nền đỏ). Một cột toàn pill giống hệt nhau là nhiễu.
- **Ngoại lệ đáng thấy ngay** hiện thành chip nhỏ cạnh ô (`.list-chip`, vd "20 giờ/tuần" khi giờ chuẩn
  khác mặc định), không thành cột riêng.
- **Ngày dạng dd/MM/yyyy, không bao giờ rút gọn "…"**; ô chỉ chứa pill không hiện "…".
- **Điện thoại**: ẩn cột phụ (`.list-table__hide-sm`), cột đầu tự giãn, các cột còn lại 126px, menu 44px.
- Đã áp dụng: Nhân sự, Tài khoản, Khách hàng, Hợp đồng, Hóa đơn (và rút gọn chữ ở bảng Cơ hội).

### Tab viên (chữ ký)
Tab khu làm việc và tab hồ sơ khách hàng là **viên bo 9px**, đệm 7×13, 14.5px/400 `ink-muted`; hover
`frame-hover`; đang chọn nền `surface-sunken` + chữ `ink-strong`, **không** đậm lên, **không** vạch dưới,
dải tab không có đường kẻ.

Ở khu làm việc, viên "đang chọn" trượt bằng kỹ thuật **clip-path hai lớp**: một bản sao dải tab ở kiểu
đang chọn (`aria-hidden`, không nhận chuột) nằm đè lên, bị cắt bằng `clip-path: inset(0 R 0 L round 9px)`
chỉ còn đúng ô của tab đang chọn. Đổi tab chỉ là trượt vùng cắt — `transition: clip-path 260ms
var(--ease-in-out)` — nên nền viên và màu chữ đổi cùng một nhịp. Vị trí cuối được nhớ theo từng khu làm
việc để viên **trượt từ tab trước** dù khung dựng lại khi đổi route; khi co giãn cửa sổ, vùng cắt đặt thẳng
vị trí mới, không chuyển động. Đổi tab chỉ phần thân xổ vào; tiêu đề và dải tab đứng yên.

### Cards / Containers
- **Thẻ bảng:** nền `surface`, `rounded.lg`, vòng viền `line` + bóng tiếp xúc; thanh công cụ trong suốt,
  không đường kẻ dưới; chân bảng có một đường tóc.
- **Bảng:** **không có dải nền tiêu đề** — tiêu đề cột trong suốt (trong vùng cuộn giới hạn, tiêu đề dính có nền kính mờ `surface` 92% + blur 12px để dòng cuộn bên dưới không lộ chồng chữ), 13px/400 `ink-muted`, một đường `line`
  bên dưới; giữa các hàng là đường tóc, hàng cuối không có; `border-collapse: separate`. **Rê chuột: cả hàng
  thành một viên** nền `surface-alt` bo 10px ở hai đầu, không phải dải vuông.
- **Ô chỉ số:** **các ô rời**, mỗi ô `surface` bo `rounded.lg`, vòng viền `line`, đệm 16/18/18; nhãn
  sentence case ở trên, số liệu 500 ở dưới. Không đổi nền khi rê chuột.
- **Ô trống / ghi chú / cảnh báo:** không viền, nền mực ấm rất nhạt hoặc pastel, bo 12–16px.
- **Thẻ chọn vai trò:** viền `line`, bo 12px; khi chọn theo The One Selected Grammar Rule.
- **Ô định danh (avatar)** — chữ cái đầu trong danh sách, chip tài khoản góc trên, ô icon thông báo: nền `surface-sunken`, chữ `ink-strong`, không viền. **Không dùng chữ xanh** (người dùng chê xấu).

### Dialogs (chữ ký)
- Tấm `surface`, không viền, `rounded.2xl`, vòng 0.5px + bóng hộp thoại.
- Đầu `22px 26px 6px` **không đường kẻ**; thân `14px 26px 22px`; chân `14px 26px 18px` với một đường tóc
  phía trên. Nút đóng `ink-muted`, hover nền `surface-sunken`.
- **Mở:** lớp che mờ dần 200ms; tấm nhô lên từ `translateY(8px) scale(0.97)` trong **240ms `--ease-out`**
  — nở từ tâm; không bao giờ từ `scale(0)`.
- **≤640px — tấm trượt từ đáy:** rộng 100%, cao tối đa 92dvh, bo hai góc trên, trượt lên
  `translateY(100%) → 0` trong **380ms `--ease-drawer`**; đệm 20px; chân tôn trọng `safe-area-inset-bottom`.
- **Bảng lệnh** (`Ctrl/⌘+K`) mượn cùng tấm và lớp che nhưng **mở/đóng tức thì**; phân nhóm bằng đường tóc.
  Tìm kiếm bỏ dấu tiếng Việt; mục đang chọn đánh dấu bằng `data-active` (nền `surface-sunken`), không bằng `:hover`.

### Popovers, menu, toast
Không viền, bo 14px, vòng 0.5px + bóng popover, đệm 6px, mục bên trong `rounded.sm` 400, hover
`surface-sunken`, phân cách bằng đường tóc. Toast dải nền `primary-ink`, vào từ `translateY(12px) scale(0.98)`.

### Trang Cài đặt cá nhân
Mở từ chân thanh bên, menu tài khoản, bảng lệnh (`Cài đặt: …`) hoặc phím `?` (mục Trợ giúp). Cột mục bên trái
(viên như tab, sticky) + một thẻ `surface` bên phải; ≤900px cột mục thành dải viên cuộn ngang.

| Mục | Nội dung |
|---|---|
| Tài khoản | Họ tên, @tài khoản, vai trò; chính sách tự đăng xuất khi không thao tác; nút Đăng xuất |
| Giao diện | Chủ đề (3 thẻ mô phỏng Sáng / Tối / Theo hệ thống), mật độ (Thoải mái / Gọn), màn hình mở đầu, thu gọn thanh bên, giảm hiệu ứng |
| Thông báo | Nhúng trang tuỳ chọn thông báo sẵn có |
| Bảo mật | Nhúng trang đổi mật khẩu |
| Quyền xem dữ liệu | Chỉ với vai trò được xem lương/giá vốn — nhúng trang che dữ liệu nhạy cảm |
| Trợ giúp & phím tắt | Bảng phím tắt (`kbd`), 8 bước luồng nghiệp vụ chính, nơi liên hệ |

- **Mỗi thay đổi áp dụng ngay và tự lưu** (gom 450ms) lên `GET/PUT /api/v1/me/preferences`; trạng thái lưu
  (`Đang lưu… / ✓ Đã lưu / Đã lưu trên máy này` — cái cuối là chữ nhạt khi máy chủ không nhận: tùy chọn vẫn áp dụng, không báo lỗi đỏ) nằm cạnh tiêu đề mục, `role="status"`. Không có nút "Lưu".
- Tuỳ chọn được **đệm ở `localStorage['ui-preferences']` và áp trước khi vẽ** (`main.tsx`) để không nháy trắng khi
  tải lại hay ở trang đăng nhập; máy chủ là nguồn đúng sau khi đăng nhập.
- Thẻ chủ đề đang chọn: vòng 2px `ink-strong` + nhãn 500 (xem trước chủ đề, nên không dùng màu nhấn); mật độ là điều khiển
  phân đoạn; hai tuỳ chọn bật/tắt là công tắc.
- Các trang được nhúng dùng `HubContext` (`embedded: true`) nên không lặp tiêu đề trang.

### Trạng thái "chưa lưu"
Là trạng thái **tương tác** nên mang màu nhấn: hàng có nền xanh rất nhạt `#F5F9FE`, nhãn `accent-soft`/`accent-ink`,
thanh hành động nổi có viền `accent` và chữ trạng thái `accent-ink`. Không dùng vạch trái dày.

### Trang đăng nhập
Cùng khung hai tầng với ứng dụng (thương hiệu trên `frame`, biểu mẫu trên `canvas`), thẻ bo `rounded.2xl`.
Ba điểm nhấn là **ô mềm bo 14px cách nhau 8px**, không đường kẻ; hover nền mực 4%; ô đang chọn là **ô
trắng nổi nhẹ** (vòng 0.5px + bóng tiếp xúc). Khối chi tiết điểm nhấn: nền mực 4%, bo 12px, không kính.

### Còn lại (giữ từ giai đoạn trước)
- **Pill trạng thái:** cặp pastel + chấm `currentColor`, chữ 500 — mã hoá bằng hình + màu.
- **Đang tải:** khung xương khớp số cột; spinner chỉ trong nút đang gửi.
- **Hành động theo hàng:** menu kebab (⋮).
- **Icon:** Phosphor qua `frontend/src/components/common/icons.tsx`, toàn bộ `weight="bold"`.

## Motion

Chuyển động gần như vô hình; hoạt hình `transform`, `opacity`, `clip-path` (viên tab) và màu nền.

| Token | Giá trị | Dùng cho |
|---|---|---|
| `--ease-out` | `cubic-bezier(0.23, 1, 0.32, 1)` | vào / ra, hộp thoại, công tắc, ô tích |
| `--ease-in-out` | `cubic-bezier(0.77, 0, 0.175, 1)` | viên tab trượt |
| `--ease-drawer` | `cubic-bezier(0.32, 0.72, 0, 1)` | tấm trượt từ đáy |

`--dur-fast 120ms` · `--dur-base 200ms` · `--dur-press 160ms` · `--dur-modal 240ms` · `--dur-sheet 380ms`;
viên tab 260ms. Trần 300ms cho hoạt hình giao diện; **tấm trượt 380ms là ngoại lệ duy nhất** (quãng
đường cả màn hình, đường cong drawer).

**Cổng tần suất:** thao tác 100+ lần/ngày hoặc khởi từ bàn phím thì **không hoạt hình** — bảng lệnh mở
và đóng tức thì.

## Accessibility

| Tín hiệu | Cách hệ phản ứng |
|---|---|
| `prefers-reduced-motion` | **Ít hơn và dịu hơn, không phải bằng không.** Hộp thoại, tấm trượt, toast chỉ còn mờ dần; viên tab đặt thẳng; công tắc bỏ lún; dấu tích hiện không chuyển động; cắt mọi hiệu ứng lặp vô hạn — **trừ** spinner báo "đang chạy". |
| `prefers-reduced-transparency` | Lớp che bỏ `backdrop-filter`, thay bằng nền nâu ấm đục hơn (36%); thanh tiêu đề thành nền đục + viền 1px. |
| Cài đặt › **Giảm hiệu ứng** (`data-motion="reduce"`) | Lựa chọn **chủ động** của người dùng nên tắt hẳn: mọi `transition`/`animation` 0.01ms — **trừ** spinner. Khác với khối `prefers-reduced-motion` ở trên (dịu đi, không tắt). |
| Cài đặt › **Mật độ Gọn** (`data-density="compact"`) | Hàng bảng/danh sách, mục thanh bên và đầu trang bớt đệm dọc; cỡ chữ và vùng bấm tối thiểu giữ nguyên. |
| Chủ đề **Theo hệ thống** | Theo `prefers-color-scheme`, đổi ngay khi hệ điều hành đổi (bộ nghe `matchMedia`). |
| `prefers-contrast: more` | Tấm làm việc, thẻ bảng, ô chỉ số có vòng viền `ink-muted`; ô nhập và ô tích viền `ink-muted`. |

**Đừng thêm lại** `*{ animation-duration: .01ms !important }` **không có phạm vi** — nó đè lên khối giảm-chuyển-động
có cân nhắc. Quy tắc tương tự chỉ được phép dưới `[data-motion="reduce"]` (người dùng tự bật).

## Do's and Don'ts

### Do:
- **Do** vẽ mọi viền bằng mực ấm trong suốt (`hairline` / `line` / `line-input` / `line-strong`).
- **Do** tách nhóm bằng khoảng trắng và sắc nền trước, đường kẻ sau cùng.
- **Do** tách khung và tấm làm việc bằng chênh sáng `frame` / `canvas` và vòng 0.5px.
- **Do** dùng đúng một ngữ pháp "đang chọn": `accent-soft` + `accent-ink` + viền 1px `accent`.
- **Do** giữ độ đậm trong 400 / 500 / 600; 600 chỉ cho tiêu đề.
- **Do** viết nhãn sentence case 13px/400; giữ mono cho mã, số hiệu, phím tắt.
- **Do** dùng `rounded.md` cho nút/ô nhập, `rounded.lg` cho thẻ và ô chỉ số, `rounded.2xl` cho tấm và hộp thoại.
- **Do** dùng `tabular-nums` ở mọi nơi có số xếp cột.
- **Do** cắt gọn nội dung ô bảng dài về một dòng kèm `…` và đưa đủ nội dung vào `title`.
- **Do** cho hộp thoại thành tấm trượt từ đáy ở ≤640px, nút chân ≥44px.
- **Do** kiểm cả hai giao diện Sáng và Tối khi thêm màn hình mới.

### Don't:
- **Don't** dùng viền xám đặc (`#EAEAEA`, `#E7E4DD`…) — viền là mực trong suốt.
- **Don't** viết `#hex` thẳng trong CSS/TSX mới (trừ màu chuỗi biểu đồ) — giao diện tối sẽ sót mảng sáng.
- **Don't** đặt lại nhãn nhóm hay chip tài khoản trên thanh tiêu đề — tài khoản ở chân thanh bên.
- **Don't** chia khoang bằng lưới đường kẻ 1px (`gap: 1px` trên nền đường kẻ); ô chỉ số là các ô rời.
- **Don't** đặt dải nền cho hàng tiêu đề bảng, và **don't** kẻ lưới dọc trong bảng.
- **Don't** dùng `font-weight` 700/800/`bold`, kể cả trong style nội tuyến.
- **Don't** dùng vạch dưới cho tab đang chọn; tab là viên.
- **Don't** đóng khung ô trống, ghi chú hay cảnh báo bằng viền (liền hay đứt) — dùng vùng nền mềm.
- **Don't** dùng màu nhấn làm nền mảng lớn, nền nút chính hay viền ô nhập khi focus.
- **Don't** thêm màu thứ hai ngoài xanh dương Claude, mực đen của nút và 4 cặp màu ngữ nghĩa.
- **Don't** dùng màu nhấn (xanh) làm nền nút — nút chính luôn mực đen.
- **Don't** đặt mờ/kính lên **bề mặt chứa nội dung** — chỉ thanh tiêu đề dính và lớp che hộp thoại.
- **Don't** dùng bóng khuếch tán cho bề mặt nội dung, và **don't** dùng bóng đen trung tính hay nhuộm màu cho lớp mới.
- **Don't** quay lại nhãn mono IN HOA, và **don't** hiển thị mã sự kiện nội bộ cho người dùng.
- **Don't** để `body` cuộn. Vùng cuộn duy nhất là `.app-main`.
- **Don't** thêm hoạt hình mở/đóng cho bảng lệnh hay `transition: width` cho thanh bên.
- **Don't** đổ nền màu cả một hàng bảng để báo trạng thái.
- **Don't** dùng `border-left` màu dày > 1px trên thẻ, hàng hay cảnh báo.
- **Don't** dùng `#000000` thuần cho chữ.
- **Don't** viết hoa mọi chữ trong nhãn tiếng Việt (Title Case).
- **Don't** quay lại Lucide/Feather, và **don't** trộn hai bộ icon.
- **Don't** thêm eyebrow/kicker phía trên tiêu đề.
- **Don't** tải font qua mạng lúc chạy — phông tự lưu qua `@fontsource-variable/*`.
- **Don't** dùng màu (cam, xanh…) cho logo/dấu thương hiệu — logo là khối mực đen.
- **Don't** để hàng danh sách gãy nhiều dòng hoặc bày mọi trường của hồ sơ thành cột — xem § Danh sách gọn.
- **Don't** thêm gradient, vệt chói, vòng khúc xạ rìa hay nút viên nang của hệ Liquid Glass cũ.

## Known accepted deviations

Đã được rà và **chấp nhận có chủ đích** — đừng "sửa" chúng:

- **Thu/mở sidebar KHÔNG có chuyển động.** Đo trên CPU chậm 4×, trang 25 dòng, 6 lần thu/mở: có
  chuyển động rơi 31/158 khung hình (20%), không có chỉ rơi 10/155 (6%). Đừng đưa `transition: width` trở lại.
- **Hai chỗ giãn chữ ngoài thang, có chủ đích:** `.masked-cell` (`0.14em`, đếm ký tự bị che) và
  `.totp-manual-entry code` (`0.12em`, mã 2FA gõ tay).
- **Bundle JS tăng ~128KB** do Phosphor tree-shake kém; chấp nhận vì là công cụ nội bộ chạy trong LAN.
- **Không dùng đúng phông của Claude.** Phông của Claude là độc quyền; dùng Manrope (SIL OFL, tự lưu)
  làm phương án gần nhất có tiếng Việt.
- **Tấm trượt từ đáy không có tay nắm / kéo-để-đóng.** Một tay nắm mà không kéo được là gợi ý sai.
- **Mono chỉ còn cho mã, số hiệu, `kbd`** — không còn cho nhãn.
- **Drift đã biết (chưa sửa):**
  - Đợt giao diện tối đã đổi ~940 khai báo màu viết cứng trong `index.css` và style nội tuyến của 16 tệp TSX sang
    biến. Còn lại có chủ đích: định nghĩa token, `.theme-preview`, con trượt công tắc, màu chuỗi biểu đồ doanh thu.
    Thang `--overlay-*` cũ vẫn còn ở vài quy tắc (đã có giá trị tối riêng).
  - Lớp Claude vẫn viết thẳng công thức bóng mực ấm cho từng lớp nổi thay vì tham chiếu token
    `--shadow-*` (các token này đã được đổi sang mực ấm `rgba(31,30,29,…)`, nhưng giá trị chưa trùng khớp
    từng lớp). Khi chạm vào, gom về token — đừng thêm công thức mới.
  - Các bán kính suy ra (5 / 9 / 12 / 14px) đang được viết thẳng số, chưa thành token.

## Provenance

- **Hướng thiết kế do người dùng ghim (brief-pinned).** Người dùng đưa hộp thoại Cài đặt của chính Claude
  làm ảnh tham chiếu và xác nhận qua một câu hỏi có cấu trúc: màu nhấn = cam đất Claude; khung = tấm nội
  dung nổi; chế độ tối = không làm đợt này.
- **Đổi bảng màu (đợt "tươi mới").** Người dùng thấy giao diện xỉn, được hỏi chọn màu chủ đạo và trả lời
  "màu như Claude". Đo lại chính ảnh tham chiếu: màu tương tác của Claude là xanh dương `#2A78D6` (công tắc),
  nền gần trắng `#FCFCFB`/`#FFFFFF` — không phải cam đất trên nền be. Bảng màu chuyển theo số đo đó. Nút chính
  thử màu xanh, người dùng từ chối ("đổi về đen") → nút chính giữ mực đen trên toàn hệ thống; xanh chỉ ở
  công tắc, ô chọn, focus, liên kết và trạng thái đang chọn. Sau đó người dùng chê chữ xanh ở ô định danh →
  ô định danh chuyển về chữ đen trên nền xám nhạt.
- **Thanh bên + Cài đặt + giao diện tối (2026-09-27).** Người dùng đưa ảnh thanh bên kiểu Linky/YouTube và yêu cầu
  "thêm phần cài đặt, bổ sung hết những thứ cần thiết và các logic liên quan". Chọn qua câu hỏi có cấu trúc: chế độ
  tối = làm đầy đủ; tài khoản = chân thanh bên; nhóm mục = chỉ đường kẻ như ảnh mẫu. Thay cho quyết định trước đó
  "chế độ tối = không làm đợt này". Kiểm bằng chụp 76 màn × 7 vai trò ở giao diện tối (0 lỗi console/API, không
  còn mảng trắng: tỷ lệ điểm ảnh sáng ≤2.3%) và giao diện điện thoại 390px cả hai chủ đề; **chưa chạy duyệt hoàn thiện**.
  Nút Sáng/Tối ở chân thanh bên đã làm rồi **bỏ theo yêu cầu người dùng** ("trong Cài đặt có lựa chọn sáng tối rồi,
  thanh bên không nhất thiết phải để") — đừng đặt lại.
- **Bỏ qua bước gieo concept (concept-seed roll).** Theo new-work.md §3 ("a user- or brief-pinned direction
  beats the roll, always"), không chạy roll nào — hướng đã được ghim.
- **Đợt 1 — dẫn bằng code** (không có công cụ sinh ảnh), không có comp. Người duyệt hoàn thiện chấm hai
  vòng: vòng 2 giải quyết 7/8 lỗi. Lỗi còn lại (mật độ bảng) và một hồi quy tiêu đề trên điện thoại được
  sửa sau đó và **kiểm bằng phép đo, chưa duyệt lại**: hàng bảng hợp đồng desktop 119px → 74px; bảng trên
  điện thoại 455px → 346px (= bề rộng khung).
- **Đợt 2 — tăng độ trung thành theo yêu cầu người dùng** sau vòng duyệt đầu ("vẫn còn gai góc; làm bo
  tròn và mềm đúng như Claude"): thang nền/chữ theo Claude, viền mực trong suốt, cam `#2A78D6`, bỏ độ đậm
  700, ô chỉ số rời, bảng không dải tiêu đề với hàng hover dạng viên, tab viên trượt bằng `clip-path`, ô
  tích tuỳ biến. **Không chạy lại duyệt hoàn thiện**; kiểm bằng một vòng chụp màn hình trên 62 màn desktop
  + 34 màn điện thoại: không lỗi console/API, không tràn ngang, 1096/1096 bài kiểm thử đạt, bộ dò sạch.
