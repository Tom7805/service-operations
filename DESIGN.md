---
name: Vận Hành Dịch Vụ
description: Hệ vận hành nội bộ dựng bằng Apple Liquid Glass — kính chỉ ở tầng chức năng, dữ liệu ở tầng đục.
colors:
  accent: "#4f46e5"
  accent-bright: "#6366f1"
  accent-deep: "#4338ca"
  accent-light: "#7075f5"
  ink-900: "#0f172a"
  ink-800: "#17203a"
  ink-700: "#334155"
  ink-600: "#475569"
  ink-500: "#64748b"
  ink-on-glass: "#4b5566"
  surface-opaque: "#ffffff"
  surface-muted: "#f8fafc"
  line: "#d6dde6"
  line-soft: "#f1f5f9"
  success: "#16a34a"
  danger: "#dc2626"
  warning: "#d97706"
  env-sun: "#f3e7d6"
  env-shade: "#9ea5b4"
typography:
  display:
    fontFamily: "DM Sans, Segoe UI, Roboto, Arial, sans-serif"
    fontSize: "clamp(43px, 4.25vw, 70px)"
    fontWeight: 700
    lineHeight: 1.12
    letterSpacing: "-0.06em"
  headline:
    fontFamily: "DM Sans, Segoe UI, Roboto, Arial, sans-serif"
    fontSize: "26px"
    fontWeight: 700
    lineHeight: 1.3
    letterSpacing: "-0.01em"
  title:
    fontFamily: "DM Sans, Segoe UI, Roboto, Arial, sans-serif"
    fontSize: "22px"
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: "-0.015em"
  body:
    fontFamily: "DM Sans, Segoe UI, Roboto, Arial, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
  label:
    fontFamily: "DM Sans, Segoe UI, Roboto, Arial, sans-serif"
    fontSize: "12.5px"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "0.05em"
  mono:
    fontFamily: "SFMono-Regular, Consolas, Liberation Mono, Menlo, monospace"
    fontSize: "13.5px"
    fontWeight: 700
    letterSpacing: "0.02em"
rounded:
  capsule: "999px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  menu: "14px"
  content: "20px"
  modal: "26px"
  window: "30px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  base: "16px"
  lg: "24px"
  xl: "28px"
components:
  window-shell:
    backgroundColor: "{colors.surface-opaque}"
    rounded: "{rounded.window}"
    width: "min(100%, 1600px)"
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.surface-opaque}"
    rounded: "{rounded.capsule}"
    padding: "11px 22px"
    typography: "{typography.body}"
  button-primary-hover:
    backgroundColor: "{colors.accent-light}"
    textColor: "{colors.surface-opaque}"
  button-secondary:
    textColor: "{colors.ink-800}"
    rounded: "{rounded.capsule}"
    padding: "11px 22px"
    typography: "{typography.body}"
  input-glass:
    textColor: "{colors.ink-800}"
    rounded: "{rounded.capsule}"
    padding: "0 36px 0 38px"
    height: "40px"
  input-form:
    backgroundColor: "{colors.surface-opaque}"
    textColor: "{colors.ink-900}"
    rounded: "{rounded.capsule}"
    padding: "0 16px"
    height: "44px"
  nav-item:
    textColor: "#435061"
    rounded: "{rounded.capsule}"
    padding: "10px 14px"
  nav-item-active:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.surface-opaque}"
    rounded: "{rounded.capsule}"
    padding: "10px 14px"
  segmented-tab-active:
    backgroundColor: "{colors.surface-opaque}"
    textColor: "{colors.ink-800}"
    rounded: "{rounded.capsule}"
    padding: "7px 15px"
  card-content:
    backgroundColor: "{colors.surface-opaque}"
    rounded: "{rounded.content}"
    padding: "18px"
  menu-panel:
    rounded: "{rounded.menu}"
    padding: "6px"
    width: "216px"
  status-pill:
    rounded: "{rounded.capsule}"
    padding: "4px 10px"
    typography: "{typography.label}"
---

# Design System: Vận Hành Dịch Vụ

## Overview

**Creative North Star: "Cửa Sổ Kính Trên Nội Thất Ấm"**

Đây là **Apple Liquid Glass (iOS/macOS 26)** dựng cho một công cụ vận hành nội bộ. Hướng thiết kế do người
dùng **ghim** bằng ba ảnh tham chiếu — ảnh trọng tâm là một khung cửa sổ trình duyệt bằng kính mờ nổi trên
một bức ảnh nội thất ấm xóa phông, với các điều khiển hình viên nang, một pill đang chọn được đổ đầy màu
giữa những pill chỉ-chữ, và bên dưới là các thẻ nội dung hoàn toàn đục. Hướng này thắng vòng bốc thăm concept:
brief đã ghim thì thắng.

Toàn bộ hệ thống được tổ chức quanh **một học thuyết duy nhất: phân tầng vật liệu**. Kính chỉ thuộc **tầng
chức năng** — khung cửa sổ app, sidebar, thanh công cụ, nút, menu, sheet. Nó nổi **trên** một **tầng nội dung
hoàn toàn đục** — bảng dữ liệu, thẻ số liệu, form. Đây không phải sự thỏa hiệp với Apple mà là cách đọc đúng
Apple: chính ảnh tham chiếu cũng làm y hệt (khung trình duyệt là kính, poster phim là ảnh đục; sidebar là kính,
danh sách plugin là thẻ trắng đục). Nó đồng thời bảo vệ tốc độ quét thông tin của một công cụ nghiệp vụ dày dữ
liệu (PRODUCT.md, Nguyên tắc #1). Một người rà soát hoàn thiện độc lập đã xác nhận cách đọc này đúng với bộ ảnh
tham chiếu. **Ai phủ kính lên một bảng dữ liệu là đang phá hệ thống.**

Hệ từ chối rõ ràng "glassmorphism 2020" (nền mờ + viền trắng đều). Kính ở đây là một **vật liệu quang học** có
bốn thuộc tính bắt buộc (xem § Elevation & Depth): khúc xạ rìa, bóng chói, trong-suốt-kèm-bão-hòa, và chiều sâu
có độ lệch. Thiếu bất kỳ thuộc tính nào thì thứ dựng ra không được gọi là kính trong hệ này.

**Key Characteristics:**
- Cửa sổ kính r=30px nổi trên một môi trường ấm nhòe tiêu cự; biên quanh cửa sổ luôn đủ rộng để môi trường lộ ra.
- Mọi điều khiển là **viên nang** (`border-radius: 999px`); mọi tấm nội dung là **hình chữ nhật bo 20px, đục**.
- Mép vát bắt sáng bằng vòng gradient 1px `mask-composite: exclude` — không bao giờ là viền trắng đều.
- Chàm `#4f46e5` đổ đầy **chỉ** cho hành động chính và mục điều hướng đang chọn.
- Tối đa **một** lớp `backdrop-filter` theo chiều sâu; blur chồng blur ra bùn xám.
- Một khoảnh khắc chuyển động được dàn dựng: popover kính **nở ra** từ chính nút bấm.
- Ship cả nhánh `prefers-reduced-transparency: reduce` đục hoàn toàn — trung thành với Apple là ship cả phần không đẹp.

## Colors

Bảng màu là **một nhấn chàm duy nhất trên nền trung tính ấm-lạnh của môi trường**, cộng một bộ màu ngữ nghĩa
tách bạch hoàn toàn khỏi màu thương hiệu.

### Primary
- **Chàm Vận Hành** (`{colors.accent}`): màu đổ đầy của **hành động chính** và **mục điều hướng đang chọn**.
  Nút chính là gradient dọc `#7075f5 → #5b5fe3 → #4f46e5` với bóng đổ nhuộm chính màu nó. Đây là màu duy nhất
  được phép chiếm trọn một khối trong giao diện.
- **Chàm Sáng** (`{colors.accent-bright}`): vòng focus (`rgba(99,102,241,.32–.40)`), `accent-color` cho
  checkbox/radio, các vạch của brand mark, `::selection`.
- **Chàm Sâu** (`{colors.accent-deep}`): trạng thái nhấn/hover của link và các mã (`.customer-code-pill`,
  `.btn-link:hover` dùng `#3730a3`).

### Neutral
- **Mực 900** (`{colors.ink-900}`): tiêu đề trang, giá trị số liệu, tên riêng trong bảng.
- **Mực trên kính** (`{colors.ink-800}`): chữ đặt trên các bề mặt kính (nút phụ, ô nhập kính) — đậm hơn mực
  thân bài vì nền phía sau thay đổi liên tục.
- **Mực 700 / 600 / 500** (`{colors.ink-700}` / `{colors.ink-600}` / `{colors.ink-500}`): nội dung bảng, nhãn,
  chữ phụ. `#64748b` là **sàn**: không dùng xám nhạt hơn cho chữ.
- **Mực nhạt trên kính** (`{colors.ink-on-glass}`): placeholder trong ô nhập kính. Ngả sắc nền ấm, **không** dùng
  xám lạnh `#6b7688` cũ — trên viên nang trong suốt nó không đạt 4.5:1.
- **Tấm đục** (`{colors.surface-opaque}`) và **Nền phụ** (`{colors.surface-muted}`): tầng nội dung và header bảng/footer.
- **Đường kẻ** (`{colors.line}`) và **Đường kẻ mềm** (`{colors.line-soft}`): viền thẻ ở tầng nội dung, kẻ phân cách hàng.

### Tertiary — Môi trường sau kính
- **Nắng Ấm** (`{colors.env-sun}`) đến **Bóng Lạnh** (`{colors.env-shade}`): dải nền của `body` —
  nắng vàng hắt từ góc trên-trái, mảng gỗ/da trung tính ở giữa, bóng lam-xám dồn về dưới-phải, phủ một lớp hạt
  nhiễu SVG (`opacity .5`, `mix-blend-mode: overlay`) để phá banding và đọc ra "ảnh nhòe" chứ không phải gradient.
- **Trạng thái đã biết, cố ý:** môi trường này hiện được dựng bằng **gradient CSS, không phải ảnh**, thuần túy vì
  phiên dựng không có công cụ tạo ảnh. `index.css` giữ sẵn một dòng `background-image` đã chú thích ngay trên rule
  `body`, kèm art direction (nội thất ấm, xóa phông f/1.4–f/2, nguồn sáng góc trên-trái). Đây là **việc bàn giao còn
  treo**, không phải quyết định đã chốt — thay ảnh vào là xong, không phải sửa gì thêm.

### Semantic (tách khỏi thương hiệu)
- **Xanh thành công** (`{colors.success}`), **Đỏ nguy hiểm** (`{colors.danger}`), **Hổ phách cảnh báo**
  (`{colors.warning}`): chỉ dùng cho trạng thái, alert, hành động phá hủy, và biến thể nút `.btn-danger` /
  `.btn-success`. Bộ badge phòng ban/vai trò (`--purple/gold/blue/green/orange/teal/pink/gray/red`) giữ nguyên.

### Named Rules
**The Filled-Indigo Rule.** Chàm đổ đầy chỉ dành cho **hành động chính của màn hình** và **mục điều hướng đang
chọn**. Không lặp lại nó trên hành động theo hàng, không dùng cho nút phụ, không dùng làm nền trang trí. Hành
động phụ là kính trong — sự khác biệt chính/phụ là **đặc so với trong**, không phải hai sắc độ của cùng một màu.

**The Semantic-Is-Not-Brand Rule.** Xanh/đỏ/hổ phách mang nghĩa (thành công/lỗi/cảnh báo) và **không bao giờ**
được đổi theo màu thương hiệu. Ngược lại, chàm **không** được dùng để báo trạng thái.

**The Glass-Takes-Its-Color Rule.** Kính lấy màu từ thứ nằm sau nó (`saturate`), nó **không tự sơn** vệt ngũ sắc,
cầu vồng hay quầng sáng vẽ tay lên mình. Mọi quầng sáng giả phía sau chrome đã bị gỡ vì chồng hai nguồn sáng mâu
thuẫn khiến kính đọc ra là hình vẽ.

## Typography

**Body & Display Font:** DM Sans (400/500/600/700/800), fallback `Segoe UI, Roboto, Arial, sans-serif`
**Mono Font:** `SFMono-Regular, Consolas, Liberation Mono, Menlo, monospace`

**Character:** Một mặt chữ workhorse hình học, trung tính, đọc tốt ở cỡ nhỏ dày đặc. Đây là surface Operate —
không có mặt chữ display có cá tính, không serif. Toàn bộ phân cấp làm bằng **cân nặng và cỡ**, không bằng đổi họ chữ.

### Hierarchy
- **Display** (700, `clamp(43px, 4.25vw, 70px)`, 1.12, `-0.06em`): chỉ ở panel thương hiệu màn đăng nhập.
- **Headline** (700, 26px, 1.3, `-0.01em`): tiêu đề trang (`.page-title`).
- **Title** (700, 22px, `-0.015em`): tiêu đề trên thanh topbar của cửa sổ app; 18–19px cho tiêu đề modal/mục.
- **Body** (400–600, 15px, 1.5): nội dung bảng, nhãn nút, mục điều hướng. 14–14.5px cho hàng bảng dày.
- **Label** (700, 12.5px, `0.05em`, UPPERCASE): header cột bảng, nhãn thẻ số liệu, nhãn nhóm sidebar (12px/`.06em`).
- **Mono** (700, 13–14px): mã nghiệp vụ — mã khách hàng, mã vai trò, username.

### Named Rules
**The Tabular-Numbers Rule.** Bất cứ nơi nào nhiều con số xếp cạnh/chồng nhau (giá trị thẻ số liệu, cột tiền,
cột ngày trong timeline) phải dùng `font-variant-numeric: tabular-nums`.

**The One-Line Cell Rule.** Ô bảng chứa nội dung dài (họ tên, email, bộ phận, chip vai trò) **cắt gọn một dòng
kèm ellipsis** với `max-width` cố định; nội dung đầy đủ đi vào thuộc tính `title`. Cho phép bọc dòng tự do làm
chiều cao các hàng so le và đẩy cột thao tác ra ngoài khung.

**The No-Wrap Capsule Rule.** Nhãn của một viên nang không bao giờ được xuống dòng (`white-space: nowrap`).
Bo 999px trên nhãn hai dòng biến nút thành quả cầu méo.

## Layout

- **Khung ngoài** (`.app-frame`): toàn viewport, đệm `clamp(14px, 2.2vw, 34px)` — biên này tồn tại để **môi trường
  lộ ra quanh cửa sổ**; kính không có gì bao quanh để so sánh thì mắt không đọc ra nó trong suốt.
- **Cửa sổ app** (`.app-shell`): `max-width: 1600px`, cao tối thiểu `calc(100vh − biên)`, `flex-direction: row`,
  `overflow: hidden`.
- **Sidebar** (`.side-nav`): 260px ↔ 76px khi thu gọn, trạng thái nhớ qua `localStorage`. `.app-main` là `flex: 1`
  nên tự co giãn — không tính toán chiều rộng bằng tay.
- **Nội dung trang**: container `max-width: 1280px` (900px cho trang chi tiết), đệm ngang 24px.
- **Nhịp khoảng cách**: bội số 4/8 — 8/12/16/24 giữa các khối; số lẻ (11px, 14px, 18px) chỉ dùng cho đệm bên
  trong một thành phần nhỏ.
- **Lưới thẻ số liệu**: `repeat(auto-fit, minmax(180px, 1fr))`, gap 16px. 180px chứ không phải 220px, để hàng 5
  thẻ vẫn vừa **một** hàng bên trong khung app có sidebar.
- **Chiều cao thanh công cụ**: mọi ô nhập/select/nút trong `.toolbar-filters` dùng chung **40px** để luôn thẳng
  hàng khi xuống dòng.
- **Responsive** (`max-width: 900px`): cửa sổ kính **được giữ nguyên**, chỉ thu nhỏ (`padding: 10px`, `r=22px`).
  Sidebar xoay thành thanh cuộn ngang **vẫn giữ nhãn chữ** (icon trần trong khung cuộn ẩn mất bốn đích đến),
  nhãn nhóm xoay thành dải phân cách dọc, mép phải có vệt mờ báo còn mục bị khuất. Ở `max-width: 640px`,
  `.page-header` xếp chồng và nút chính giãn full-width.
- **Bảng rộng** cuộn ngang **trong khung của chính nó** (`.table-responsive`), không bao giờ để `body` cuộn ngang;
  hai vệt bóng ở mép chỉ hiện khi còn nội dung bị khuất.

### Named Rules
**The Environment-Margin Rule.** Không bao giờ để cửa sổ app chạm mép viewport ở bất kỳ khổ màn hình nào.
Biên co lại chứ không biến mất — bỏ biên là xóa bằng chứng rằng cửa sổ làm bằng kính.

## Elevation & Depth

Hệ dùng **vật liệu + bóng nhiều lớp**, không dùng tô phẳng. Bốn thuộc tính dưới đây là **bắt buộc** cho bất
cứ thứ gì tự gọi mình là kính; thiếu một cái là ra glassmorphism rẻ tiền:

1. **LENSING (khúc xạ rìa)** — thuộc tính phân biệt số 1. Một vòng gradient dày 1px (`--lg-rim` / `--lg-rim-soft`,
   `linear-gradient(145deg, …)`) sáng ở hai mép đón sáng (trên-trái, dưới-phải) và gần như tắt ở giữa cạnh, vẽ
   bằng `mask-composite: exclude` nên **lõi bị cắt rỗng hoàn toàn**. Chính vì lõi rỗng (cộng `pointer-events: none`)
   mà lớp này **không bao giờ đè lên chữ hay chặn click** — đây là lời giải cố ý cho lỗi đã ghi nhận trong dự án:
   một `::before` định vị `absolute` luôn vẽ đè lên text trần của nút. Có sẵn lớp tiện ích `.lg-rim` / `.lg-rim--soft`.
2. **SPECULAR (bóng chói)** — `--lg-specular`, một vệt sáng mép trên mờ dần xuống. Nó nằm **trong layer
   `background`** của chính phần tử, **không bao giờ** là pseudo-element, vì cùng lý do ở trên.
3. **TRANSLUCENCY** — `backdrop-filter` blur **kèm tăng bão hòa**. Kính thật làm màu phía sau **rực hơn**, không xám đi.
4. **DEPTH** — bóng nhiều lớp **có độ lệch (offset)**. Quầng sáng không lệch là trang trí, không phải chiều sâu.

### Ba tầng vật liệu
- **Tầng 1 — cửa sổ / popover nổi**: `--lg-blur-window: blur(44px) saturate(185%) brightness(1.06)`,
  tint `rgba(255,255,255,.60)`. Trong nhất, blur mạnh nhất.
- **Tầng 2 — vật liệu lồng trong cửa sổ (sidebar)**: `--lg-tint-panel` — **không blur lại**, chỉ nhuộm trong suốt
  để đọc ra là một tấm khác chất liệu.
- **Tầng 3 — điều khiển (nút, ô nhập, pill)**: `--lg-blur-control: blur(20px) saturate(180%)`,
  tint `rgba(255,255,255,.72)` → `.86` khi hover. Nền sáng hơn để chữ luôn đủ tương phản.

### Shadow Vocabulary
- **`--lg-shadow-control`** (`0 1px 2px …, 0 6px 14px -6px …, 0 2px 5px -2px …`): nút, ô nhập, chip ở trạng thái nghỉ.
- **`--lg-shadow-float`** (`0 2px 6px …, 0 18px 38px -14px …, 0 6px 14px -6px …`): hover của điều khiển, menu và popover.
- **`--lg-shadow-window`** (`0 4px 12px …, 0 44px 92px -32px …, 0 16px 34px -18px …`): cửa sổ app, modal, thẻ đăng nhập.
- **`--shadow-xs/sm/md/lg`**: bộ bóng trung tính kế thừa, còn dùng cho vài phần tử ở tầng nội dung
  (`.audit-log-link:hover`, `.app-topbar__mark`). Ở tầng nội dung, "chiều sâu" chủ yếu là
  `inset 0 0 0 1px rgba(16,24,40,.06)` cộng một bóng khuếch tán rất nhẹ — **không** dùng viền cứng.

### Motion
- `--ease-out: cubic-bezier(.16,1,.3,1)`, `--dur-fast: 120ms`, `--dur-base: 180ms` — cho màu, bóng, kích thước.
- `--ease-gel: cubic-bezier(.32,1.12,.52,1)`, `--dur-gel: 300ms` — cho biến dạng đàn hồi khi chạm (`transform`).
  Độ vọt cố ý **rất nhẹ (~12%)**, không phải 56% như đường cong nảy thường gặp: đây là công cụ bấm hàng trăm lần
  mỗi ngày, nảy mạnh đọc ra là đồ chơi và gây mệt rất nhanh. Apple cũng vọt nhẹ chứ không nảy.
  *(Đây là một phát hiện của bộ dò thiết kế đã được rà soát và chấp nhận có chủ đích — không phải lỗi cần "sửa".)*
- Quy ước tương tác: hover nổi `translateY(-1px…-2px)` kèm bóng đậm hơn một cấp; nhấn lún `scale(.90….98)`;
  `.btn-icon-refresh:active` xoay `-35deg`.
- **Khoảnh khắc chữ ký**: popover kính (`.notif-panel`, `.user-chip__menu`, `.row-menu__panel`) **nở ra** từ
  chính nút bấm — `transform-origin` đặt ở góc nút, bắt đầu bị nén (`scale(.88–.90)`) và gần như trong veo
  (`backdrop-filter: blur(0)`), độ đặc của kính **dâng lên trong lúc nở**. Liquid Glass là vật liệu nở ra từ điểm
  chạm, **không** trượt vào từ ngoài như một lớp phủ. Đây là MỘT khoảnh khắc dàn dựng cho toàn hệ.
- `prefers-reduced-motion: reduce` ép mọi animation/transition xuống `.01ms`.

### Named Rules
**The One-Blur-Deep Rule.** Theo bất kỳ đường xuyên tầng nào, chỉ được có **một** `backdrop-filter`. Cửa sổ blur
môi trường; mọi thứ lồng bên trong (sidebar, thanh công cụ, mục điều hướng) **chỉ nhuộm trong suốt**. Blur chồng
blur cho ra bùn xám, không phải kính. Ngoại lệ duy nhất: popover **nổi trên** tầng nội dung đục, nên nó tự blur
được (tint đẩy lên `.88` vì phía sau là bảng dày chữ).

**The Rim-Not-Border Rule.** Mép kính luôn là vòng gradient bị mask, không bao giờ là `border: 1px solid
rgba(255,255,255,…)` đều một vòng. Viền trắng đều là dấu hiệu rõ nhất của kính giả.

**The Offset-Shadow Rule.** Mọi bóng phải có độ lệch dọc. `box-shadow: 0 0 Npx …` (quầng không lệch) bị cấm ở
mọi bề mặt nổi — nó là trang trí, không phải chiều sâu. Vòng focus là ngoại lệ duy nhất.

**The Background-Layer Rule.** Bóng chói và mọi lớp phủ trang trí đi trong layer `background` của chính phần tử.
Chỉ vòng khúc xạ rìa được dùng pseudo-element, và chỉ vì lõi của nó bị cắt rỗng.

## Shapes

Hai hình thái, và ranh giới giữa chúng chính là ranh giới giữa hai tầng vật liệu:

- **Viên nang** (`999px`) cho **mọi điều khiển**: nút, ô nhập, ô tìm kiếm, select, mục điều hướng, tab phân đoạn,
  chip, pill trạng thái, user-chip. Nút icon và nút thu/mở sidebar là hình tròn (`50%`) — viên nang ở tỉ lệ 1:1.
- **Chữ nhật bo** cho **mọi tấm**: cửa sổ app 30px (22px trên màn hẹp), modal 26px, thẻ đăng nhập 28px,
  tấm nội dung/thẻ số liệu 20px, menu/popover 14–16px, khối phụ 8–12px.

**Bán kính đồng tâm** là quy tắc hình học của hệ: **bán kính trong = bán kính ngoài − đệm**. Panel menu r=14 với
đệm 6 → item r=8. Thẻ số liệu r=20 với đệm 18 → ô icon r=12. Máng segmented r=999 với đệm 4 → mục con r=999.

Viền cứng đã bị gỡ khỏi tầng kính hoàn toàn (`border: none` + vòng rìa). Ở tầng nội dung, viền là
`inset 0 0 0 1px rgba(16,24,40,.06)` hoặc `1px solid #d6dde6`, không dày hơn.

### Named Rules
**The Capsule-Control Rule.** Nếu người dùng bấm/gõ được vào nó, nó là viên nang. Nếu nó chứa dữ liệu, nó là
chữ nhật bo. Không có trường hợp ở giữa.

**The No-Color-Bar Rule.** Không dùng `border-left` màu dày >1px trên thẻ, hàng, hay cảnh báo. Vạch màu trái của
thẻ số liệu đã bị gỡ (`.stat-card--blue/green/red/purple { border-left: none }`): ô icon bên trong đã mang đúng
màu ngữ nghĩa đó rồi, vạch chỉ lặp lại thông tin bằng một hình thức kém tinh tế hơn. Sắc thái toast cũng mã hóa
bằng nền nhuộm + vòng viền mảnh, không bằng vạch trái.

## Components

### Buttons
- **Shape:** viên nang (`999px`), đệm `11px 22px` (`.btn-lg`: `13px 26px`), 15px/700, `white-space: nowrap`.
- **Primary** (`.btn-primary`): viên nang **đặc** chàm — gradient dọc `#7075f5 → #5b5fe3 → #4f46e5`, chữ trắng,
  vệt chói mép trên trong layer `background`, `inset 0 1px 0 rgba(255,255,255,.46)`, bóng đổ nhuộm chàm.
  Vòng rìa `::after` sáng hơn (`rgba(255,255,255,.70)` ở góc đón sáng).
- **Secondary** (`.btn-secondary`): kính trong thật sự — `--lg-specular` + `--lg-tint-control`,
  `--lg-blur-control`, `--lg-shadow-control`, vòng rìa `--lg-rim`, chữ `{colors.ink-800}` 700.
  Đây là hình thái **mặc định** của mọi nút không phải hành động chính.
- **Hover:** `translateY(-2px)` + tint/bóng lên một cấp. **Active:** `translateY(0) scale(.96)`.
  **Focus:** `0 0 0 3px rgba(99,102,241,.40)` + `--lg-shadow-float`, `outline: none`.
- **Danger / Success** (`.btn-danger`, `.btn-success`): cùng công thức viên nang đặc, đổi sang gradient đỏ/xanh
  ngữ nghĩa. Dùng cho hành động phá hủy hoặc xác nhận, **không** dùng như một biến thể trang trí.
- **Link** (`.btn-link`): chữ chàm 13.5px/700 không nền không viền, gạch chân khi hover — hành động phụ trong bảng.

### Chips & Pills
- **Trạng thái** (`.status-pill`): viên nang + **chấm tròn `currentColor` 6px** + chữ 13.5px/700. Trạng thái luôn
  mã hóa bằng **hình + màu**, không chỉ bằng màu. `--active` xanh, `--locked` đỏ, `--inactive` xám.
- **Vai trò / phạm vi** (`.role-chip`, `.scope-chip`): trung tính (`#f1f5f9` / viền `#d6dde6` / chữ `#334155`),
  **chỉ chữ** — không icon, không mã vai trò kèm theo (đã thử và bị đánh giá rối, thiếu chuyên nghiệp), không
  bảng màu ngẫu nhiên theo vai trò. Mã vai trò còn xem được qua `title`. `max-width: 150px` + ellipsis.
- **Badge phòng ban/loại** (`.badge--*`): nền nhạt + chữ đậm cùng hue + viền cùng hue, `radius: 6px`.

### Cards / Containers
- **Tấm nội dung** (`.stat-card`, `.user-table-card`): nền `#ffffff` **đục tuyệt đối**, `r=20px`, `border: none`,
  `inset 0 0 0 1px rgba(16,24,40,.06)` + bóng khuếch tán nhẹ. Hover: `translateY(-2px)` + bóng lên một cấp.
- **Đệm trong:** 18px (thẻ số liệu), 20–24px (bảng, modal), 32px (thẻ chi tiết).
- **Thanh công cụ trong tấm nội dung** (`.user-table-toolbar`, `.modal-header`, `.modal-footer`): đây là tầng
  **chức năng** nằm trong tấm nội dung → máng gradient sáng mờ (`rgba(247,249,252,.92) → rgba(241,244,249,.88)`),
  **không** phải nền xám phẳng.

### Inputs / Fields
- **Ô nhập kính** (`.search-box__input`, `.filter-select`): viên nang h=40px, `--lg-specular` + `--lg-tint-control`,
  `--lg-blur-control`, `inset 0 0 0 1px rgba(255,255,255,.75)` + `--lg-shadow-control`. Placeholder `{colors.ink-on-glass}`.
- **Ô nhập form** (`.form-input`, `.form-select`): viên nang h=44px, viền `rgba(15,23,42,.10)`, nền trắng có
  gradient bóng láng nhẹ. **Cố ý KHÔNG dùng `backdrop-filter`** — ô nhập luôn nằm trên nền trắng của thẻ/modal,
  blur không có gì để "trong" ra, chỉ tốn hiệu năng; và chữ đang gõ cần độ rõ tuyệt đối.
- **Focus:** `0 0 0 3px rgba(99,102,241,.32)` trên kính, `.14` trên form; nền sáng lên `rgba(255,255,255,.92)`.
- **Lỗi:** viền `{colors.danger}` + `.field-error` 13.5px bên dưới. **Nhãn bắt buộc:** `*` màu danger.

### Navigation
- **Sidebar** (`.side-nav`): vật liệu tầng 2 — gradient nhuộm trắng `.46 → .28`, **không blur lại**, viền phải
  `rgba(255,255,255,.55)` + `inset -1px 0 0 rgba(16,24,40,.05)`. Thu/mở 260px ↔ 76px.
- **Mục điều hướng** (`.side-nav__item`): viên nang, 15px/600, chữ `#435061`. Hover: `rgba(255,255,255,.62)`.
  **Đang chọn:** viên nang **đặc chàm** nổi trên kính — trên nền kính trong, một mảng xám nhạt gần như tàng hình.
- **Segmented control** (`.status-tabs`): máng viên nang lõm
  (`inset 0 1px 2px rgba(16,24,40,.10)`, `inset 0 -1px 0 rgba(255,255,255,.60)`); mục chưa chọn là **chữ trần**,
  mục đang chọn là **viên nang trắng nổi lên**. Đúng mô hình pill trong ảnh tham chiếu.
- **Thu/mở**: `transition: width, padding` theo `--ease-out`. *(Bộ dò thiết kế nêu việc transition `width` —
  đã rà soát và chấp nhận: một nút thu gọn phải làm các phần tử anh em **dồn lại** thật; `transform` không làm được điều đó.)*

### Menus & Popovers
`.notif-panel`, `.user-chip__menu`, `.row-menu__panel`: kính tầng 1 nổi trên tầng nội dung —
`--lg-specular` + `rgba(255,255,255,.88)`, `blur(30px) saturate(180%)`, `--lg-shadow-float`, `r=14–16px`,
đệm 6px → item `r=8px`. Xuất hiện bằng animation morph từ góc nút (xem § Elevation & Depth).

### Modals / Sheets
`.modal-backdrop` vừa **làm tối** (`rgba(20,26,42,0.42)`) vừa **làm nhòe** (`blur(20px) saturate(120%)`) nền —
đúng cách Apple đẩy nội dung ra sau khi có sheet. `.modal-card` là tấm **trắng đục** `r=26px` với
`--lg-shadow-window`, mở bằng `modal-pop` (`translateY(14px) scale(.95)` → nguyên bản) theo `--ease-gel`.

### Signature Component — Cửa sổ kính (`.app-shell`)
Tấm kính **duy nhất** blur môi trường phía sau: `--lg-blur-window` + `--lg-tint-window` + `--lg-shadow-window`,
`r=30px`, `border: none`, vòng rìa `--lg-rim` ở `z-index: 3`. Mọi thứ bên trong nó thuộc tầng 2 hoặc 3.

### Bề mặt do trình duyệt vẽ
`::selection`, `caret-color`, `accent-color`, thanh cuộn (`scrollbar-width: thin`, thumb
`rgba(16,24,40,.24)` bo tròn với `border: 3px solid transparent; background-clip: content-box`), và
`:focus-visible { outline: 2px solid #6366f1; outline-offset: 2px }` toàn cục đều được nhuộm theo bảng màu.
Đây là chi tiết rẻ nhất để cả trang đọc ra là "được dựng".

### Reduced transparency
`@media (prefers-reduced-transparency: reduce)` đặt lại `--lg-blur-*: none`, mọi tint thành màu đục
(`#ffffff` / `#f7f8fa` / `#f4f6f8`), `body` thành `#e9ebef` phẳng và tắt lớp hạt nhiễu. Nhánh này **thuộc hệ**,
không phải phụ lục.

## Do's and Don'ts

### Do:
- **Do** giữ mọi bảng dữ liệu, thẻ số liệu và form ở nền **đục** `#ffffff`, `r=20px`.
- **Do** dựng mọi điều khiển mới bằng **viên nang** (`999px`) và mọi tấm mới bằng bán kính đồng tâm
  (bán kính trong = bán kính ngoài − đệm).
- **Do** dùng vòng rìa gradient bị mask (`.lg-rim` hoặc `::after` với `mask-composite: exclude`) cho mọi mép kính.
- **Do** đặt bóng chói vào layer `background` của chính phần tử, không bao giờ vào pseudo-element.
- **Do** ghép `backdrop-filter: blur(...)` **luôn kèm** `saturate(≥180%)`.
- **Do** dùng `--ease-gel`/`--dur-gel` cho `transform` và `--ease-out`/`--dur-fast|base` cho màu, bóng, kích thước.
- **Do** mã hóa trạng thái bằng **hình + màu** (pill có chấm `currentColor`), không chỉ bằng màu.
- **Do** cắt gọn nội dung ô bảng dài về một dòng kèm ellipsis và đưa nội dung đầy đủ vào `title`.
- **Do** giữ chữ phụ tối thiểu ở `#64748b`, và dùng `#4b5566` trở lên khi chữ đặt trên bề mặt kính.
- **Do** cập nhật cả nhánh `prefers-reduced-transparency: reduce` khi thêm một biến vật liệu mới.

### Don't:
- **Don't** phủ `backdrop-filter` lên bảng dữ liệu, thẻ số liệu hay form. Đây là vi phạm nghiêm trọng nhất
  có thể phạm với hệ này.
- **Don't** xếp hai `backdrop-filter` chồng lên nhau theo chiều sâu.
- **Don't** dùng `border: 1px solid rgba(255,255,255,…)` đều một vòng để giả mép kính.
- **Don't** dùng bóng không lệch (`0 0 Npx`) làm chiều sâu — trừ vòng focus.
- **Don't** đổ đầy chàm cho bất cứ thứ gì ngoài hành động chính và mục điều hướng đang chọn; đặc biệt **không**
  lặp lại nó trên các hành động theo hàng.
- **Don't** đổi màu ngữ nghĩa (xanh/đỏ/hổ phách) theo màu thương hiệu, và **don't** dùng chàm để báo trạng thái.
- **Don't** vẽ quầng sáng, vệt ngũ sắc hay gradient trang trí lên/sau kính — kính lấy màu từ thứ phía sau nó.
- **Don't** dùng `border-left` màu dày >1px trên thẻ, hàng hay cảnh báo.
- **Don't** bỏ bo góc / bóng / biên của cửa sổ kính trên màn hẹp; thu nhỏ nó, đừng xóa nó.
- **Don't** để nội dung rộng làm `body` cuộn ngang — cho nó cuộn trong khung của chính nó.
- **Don't** cho nhãn viên nang xuống dòng.
- **Don't** thay `--ease-gel` bằng một đường cong nảy mạnh (>20% overshoot); độ vọt nhẹ là có chủ đích.
