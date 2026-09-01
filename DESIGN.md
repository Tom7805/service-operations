---
name: Vận Hành Dịch Vụ
description: Hệ vận hành nội bộ theo lối tối giản biên tập — đơn sắc ấm, tương phản bằng chữ, màu chỉ dùng cho ngữ nghĩa.
colors:
  ink-strong: "#111111"
  ink: "#2F3437"
  ink-muted: "#787774"
  ink-faint: "#9B9A97"
  ink-soft: "#5F5E5B"
  ink-hover: "#333333"
  canvas: "#F7F6F3"
  surface: "#FFFFFF"
  surface-alt: "#F9F9F8"
  surface-sunken: "#F1F0EE"
  surface-pressed: "#EAE9E6"
  line: "#EAEAEA"
  line-hover: "#DCDCDC"
  pale-red-bg: "#FDEBEC"
  pale-red-fg: "#9F2F2D"
  pale-blue-bg: "#E1F3FE"
  pale-blue-fg: "#1F6C9F"
  pale-green-bg: "#EDF3EC"
  pale-green-fg: "#346538"
  pale-yellow-bg: "#FBF3DB"
  pale-yellow-fg: "#956400"
typography:
  display:
    fontFamily: "-apple-system, SF Pro Display, Segoe UI Variable Display, Segoe UI, system-ui, Helvetica Neue, Arial, sans-serif"
    fontSize: "clamp(38px, 3.6vw, 58px)"
    fontWeight: 600
    lineHeight: 1.08
    letterSpacing: "-0.035em"
  headline:
    fontFamily: "-apple-system, SF Pro Display, Segoe UI Variable Display, Segoe UI, system-ui, Helvetica Neue, Arial, sans-serif"
    fontSize: "26px"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "-0.02em"
  title:
    fontFamily: "-apple-system, SF Pro Text, Segoe UI Variable Text, Segoe UI, system-ui, Helvetica Neue, Arial, sans-serif"
    fontSize: "18px"
    fontWeight: 600
    lineHeight: 1.35
    letterSpacing: "-0.01em"
  body:
    fontFamily: "-apple-system, SF Pro Text, Segoe UI Variable Text, Segoe UI, system-ui, Helvetica Neue, Arial, sans-serif"
    fontSize: "14.5px"
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: "0"
  label:
    fontFamily: "-apple-system, SF Pro Text, Segoe UI Variable Text, Segoe UI, system-ui, Helvetica Neue, Arial, sans-serif"
    fontSize: "12.5px"
    fontWeight: 700
    lineHeight: 1.3
    letterSpacing: "0.05em"
  mono:
    fontFamily: "SF Mono, Segoe UI Mono, JetBrains Mono, Consolas, monospace"
    fontSize: "13.5px"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "0"
---

# Design

## Overview

Hệ vận hành nội bộ bằng tiếng Việt, dùng lặp lại hằng ngày. Ngôn ngữ thị giác là **tối giản biên tập**:
giao diện đọc ra như một tài liệu được sắp chữ cẩn thận, không như một "sản phẩm SaaS" có màu thương hiệu.

Ba câu tóm tắt cả hệ:

1. **Cấu trúc do đường kẻ 1px đảm nhiệm, không phải bóng đổ.** Bóng gần như không tồn tại.
2. **Tương phản đến từ CHỮ** — cỡ chữ và độ đậm — chứ không từ khối màu.
3. **Màu là tài nguyên khan hiếm**, chỉ dùng cho ngữ nghĩa (trạng thái), không bao giờ làm nền cho mảng lớn.

Bản này **thay thế hoàn toàn** hệ "Liquid Glass" trước đó. Mọi gradient, `backdrop-filter`, vệt chói,
vòng khúc xạ rìa và nút bo tròn viên nang đã bị gỡ bỏ và **không được đưa trở lại**.

## Colors

Bảng màu là **đơn sắc ấm** (ngả vàng rất nhẹ), cố tình tránh xám lạnh. Toàn hệ chỉ còn 22 giá trị màu.

### Nền & bề mặt
| Token | Giá trị | Vai trò |
|---|---|---|
| `--canvas` | `#F7F6F3` | Nền trang, nền sidebar |
| `--surface` | `#FFFFFF` | Thẻ, bảng, modal, popover |
| `--surface-alt` | `#F9F9F8` | Nền phụ rất nhẹ |
| `--surface-sunken` | `#F1F0EE` | Máng chìm, hover, mục điều hướng đang chọn |
| `--surface-pressed` | `#EAE9E6` | Hover của mục đang chọn |

### Chữ — không bao giờ dùng `#000000` thuần
| Token | Giá trị | Vai trò | Tương phản trên `#FFFFFF` |
|---|---|---|---|
| `--ink-strong` | `#111111` | Tiêu đề, số liệu, nút chính | 18.9:1 |
| `--ink` | `#2F3437` | Nội dung chính | 12.4:1 |
| `--ink-muted` | `#787774` | Mô tả phụ, nhãn | 4.9:1 |
| `--ink-faint` | `#9B9A97` | Placeholder, chữ mờ nhất | 3.0:1 — **chỉ cho chữ ≥18px hoặc phi văn bản** |
| `--ink-soft` | `#5F5E5B` | Chữ trên nền pastel xám | 6.9:1 |

### Đường kẻ
| Token | Giá trị | Vai trò |
|---|---|---|
| `--line` | `#EAEAEA` | Viền thẻ, bảng, ô nhập — **giá trị mặc định cho MỌI viền** |
| `--line-hover` | `#DCDCDC` | Viền khi rê chuột |

### Màu ngữ nghĩa — chỉ 4 cặp pastel đã khử bão hòa
Dùng theo cặp `bg` + `fg`, không bao giờ dùng lẻ. Không có màu nào ngoài 4 cặp này.

| Ý nghĩa | Nền | Chữ / icon | Dùng cho |
|---|---|---|---|
| Thành công / đang hoạt động | `#EDF3EC` | `#346538` | pill trạng thái ACTIVE, toast thành công |
| Lỗi / đã khóa / phá hủy | `#FDEBEC` | `#9F2F2D` | pill LOCKED, lỗi biểu mẫu, nút xóa |
| Cảnh báo | `#FBF3DB` | `#956400` | pill cảnh báo, hạn mức |
| Thông tin / trung tính | `#E1F3FE` | `#1F6C9F` | nhãn phân loại, thống kê |

**Không có màu thương hiệu.** Nhấn mạnh dùng `--ink-strong` (đen), không dùng màu.

## Typography

**Chữ hệ thống, không tải font qua mạng.** SF Pro trên máy Apple, Segoe UI Variable trên Windows 11.
Sắc nét sẵn ở mọi cỡ, không nhấp nháy khi tải, và không mang "vân tay" của một font web bị dùng quá nhiều.

Phân cấp bằng **cỡ chữ + độ đậm**, không bằng màu và không bằng chữ IN HOA.

| Vai trò | Cỡ | Đậm | Ghi chú |
|---|---|---|---|
| Display (bìa đăng nhập) | `clamp(38px, 3.6vw, 58px)` | 600 | `letter-spacing: -0.035em`, `line-height: 1.08` |
| Tiêu đề trang | 26px | 600 | `-0.02em` |
| Tiêu đề thẻ / modal | 18px | 600 | |
| Nội dung | 14.5px | 400 | `line-height: 1.6` |
| Nhãn cột bảng | 12.5px | 700 | IN HOA + `0.05em` — **ngoại lệ duy nhất được phép** |
| Số liệu | — | — | luôn kèm `font-variant-numeric: tabular-nums` |

**Quy tắc chữ:**
- Nhãn thẻ, nhãn chi tiết, nhãn meta dùng **chữ thường**, độ đậm 500, màu `--ink-muted`.
  IN HOA chỉ còn ở nhãn cột bảng, nơi nó thật sự giúp phân biệt hàng tiêu đề với dữ liệu.
- **Tiếng Việt dùng sentence case, KHÔNG dùng Title Case.** Viết hoa mọi chữ là quy ước tiếng Anh;
  áp vào tiếng Việt nó đọc ra như bản dịch máy.
- Tiêu đề có `text-wrap: balance`, đoạn văn có `text-wrap: pretty` để tránh chữ mồ côi cuối dòng.

## Layout

- Ứng dụng trải hết khung nhìn như một tài liệu (`min-height: 100dvh`), **không** phải "cửa sổ nổi".
- Sidebar 244px (thu gọn 68px), phân tách bằng `border-right: 1px solid var(--line)`.
- Vùng nội dung: `max-width: 1280px`, padding 24px.
- Thẻ số liệu: `repeat(auto-fit, minmax(180px, 1fr))` — đủ để 5 thẻ nằm một hàng.
- Khoảng cách giữa các khối lớn: bội số 8px.
- Nội dung rộng (bảng) cuộn ngang **trong khung của chính nó**, không để `body` cuộn ngang.

## Elevation & Depth

Bóng đổ gần như không tồn tại — độ mờ luôn **< 0.05**. Chiều sâu do đường kẻ và nền chìm tạo ra.

| Token | Giá trị | Dùng cho |
|---|---|---|
| `--shadow-xs` | `0 1px 2px rgba(0,0,0,0.03)` | Tab đang chọn |
| `--shadow-sm` | `0 1px 3px rgba(0,0,0,0.04)` | Thẻ hover |
| `--shadow-md` | `0 2px 8px rgba(0,0,0,0.04)` | Toast |
| `--shadow-lg` | `0 4px 16px rgba(0,0,0,0.05)` | Popover, modal |
| `--shadow-focus` | `0 0 0 3px rgba(17,17,17,0.10)` | Vòng focus |

## Shapes

Bán kính **dứt khoát, tối đa 12px**. Viên nang (`999px`) chỉ dành cho **nhãn/pill trạng thái**.

| Token | Giá trị | Dùng cho |
|---|---|---|
| `--radius-sm` | `4px` | Mục điều hướng, mục menu |
| `--radius-md` | `8px` | Nút, ô nhập, thẻ nhỏ, ô định danh |
| `--radius-lg` | `12px` | Thẻ lớn, modal, popover |
| — | `999px` | **Chỉ** pill trạng thái và nhãn phân loại |

Bán kính trong = bán kính ngoài − đệm (popover r=12, đệm 5 → mục r=7).

## Components

- **Nút chính**: khối `--ink-strong` đặc, chữ trắng, `--radius-md`, **không bóng đổ**. Hover `#333333`, nhấn `scale(0.98)`.
- **Nút phụ**: nền `--surface`, viền `--line`, chữ `--ink`.
- **Ô nhập**: cao 40px, viền `--line`, `--radius-md`. Focus: viền `--ink-strong` + `--shadow-focus`.
- **Thẻ**: nền `--surface`, viền 1px `--line`, `--radius-lg`, đệm trong rộng rãi (18–24px).
- **Bảng**: hàng tiêu đề nền `--surface-alt`, phân cách hàng bằng `--line`, hover hàng `--surface-alt`.
- **Pill trạng thái**: viên nang, cặp pastel, có chấm `currentColor` — **mã hóa bằng hình + màu**, không chỉ màu.
- **Ô định danh (avatar)**: khối **vuông bo góc**, nền `--surface-sunken`, viền `--line`, chữ mực.
  Cố ý không dùng hình tròn — tròn là mặc định ai cũng chọn.
- **Hành động theo hàng**: menu kebab (⋮) gộp thao tác, không phải dãy nút rời.
- **Mục điều hướng đang chọn**: nền `--surface-sunken` + chữ đậm. **Không** dùng khối màu đổ đầy.
- **Icon**: [Phosphor Icons](https://phosphoricons.com) qua `frontend/src/components/common/icons.tsx`,
  toàn bộ dùng chung `weight="bold"`. Lucide/Feather bị loại vì là lựa chọn mặc định của giao diện do AI sinh ra.

## Motion

Chuyển động phải gần như vô hình. `--ease-out: cubic-bezier(0.16, 1, 0.3, 1)`, `--dur-fast: 120ms`, `--dur-base: 200ms`.
Chỉ hoạt hình `transform` và `opacity`. Nhấn nút: `scale(0.98)`. Popover: trượt 4px + mờ dần.
Tôn trọng `prefers-reduced-motion`.

## Do's and Don'ts

### Do
- **Do** dùng `border: 1px solid var(--line)` làm công cụ tạo cấu trúc mặc định.
- **Do** phân cấp bằng cỡ chữ và độ đậm trước, chỉ dùng màu khi cần báo trạng thái.
- **Do** viết nhãn tiếng Việt ở dạng sentence case.
- **Do** dùng `tabular-nums` ở mọi nơi có số xếp cột.
- **Do** giữ bóng đổ ở độ mờ dưới 0.05.
- **Do** cắt gọn nội dung ô bảng dài về một dòng kèm `…` và đưa đủ nội dung vào `title`.

### Don't
- **Don't** thêm gradient, `backdrop-filter`, vệt chói hay bất kỳ hiệu ứng kính nào. Đây là điều cấm nặng nhất.
- **Don't** dùng `border-radius: 999px` cho nút, thẻ hay container — chỉ pill trạng thái được phép.
- **Don't** dùng `#000000` thuần cho chữ.
- **Don't** đổ màu (kể cả pastel) làm nền cho mảng lớn hay cả một khu vực.
- **Don't** dùng `border-left` màu dày > 1px trên thẻ, hàng hay cảnh báo.
- **Don't** thêm màu mới ngoài 4 cặp pastel; cần sắc thái mới thì dùng độ đậm chữ hoặc nền chìm.
- **Don't** viết hoa mọi chữ trong nhãn tiếng Việt (Title Case).
- **Don't** dùng IN HOA cho nhãn ngoài hàng tiêu đề bảng.
- **Don't** quay lại Lucide/Feather, và **don't** trộn hai bộ icon trong cùng dự án.
- **Don't** thêm eyebrow/kicker phía trên tiêu đề.
- **Don't** tải font qua mạng — hệ này cố ý dùng chữ hệ thống.

## Known accepted deviations

Đã được rà và **chấp nhận có chủ đích** — đừng "sửa" chúng:

- `.side-nav { transition: width, padding }` — detector báo `layout-transition`. Nút thu/mở sidebar
  buộc phải đẩy lại bố cục các phần tử bên cạnh; `transform` không làm được. Thao tác chủ động, tần suất thấp.
- Bundle JS tăng ~128KB so với bộ icon cũ do Phosphor tree-shake kém hơn. Đã thử import lẻ từng icon:
  gzip không đổi, chỉ làm bẩn code. Chấp nhận vì đây là công cụ nội bộ chạy trong mạng LAN.
