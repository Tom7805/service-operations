# Kế hoạch chuyển động & giao diện

Sinh ra từ đợt rà theo `improve-animations` (recon → soát → thẩm định → kế hoạch),
lấy `apple-design` làm thước đo. Mốc mã nguồn: `5937bb2`.

`improve-animations` là skill **chỉ đọc**: nó soát và viết kế hoạch, không tự sửa mã.
Các mục ĐÃ XONG dưới đây được thực thi trong cùng phiên sau khi kế hoạch được duyệt.

## Bảng phát hiện đã thẩm định

Sắp theo đòn bẩy (tác động ÷ công sức). Mọi mục đều đã đọc lại đúng `file:dòng` trước khi ghi.

| # | Mức | Nhóm | Vị trí | Phát hiện | Trạng thái |
|---|---|---|---|---|---|
| 1 | HIGH | Định hướng | `index.css` `.app-frame` | Cả trang cuộn → cuộn xuống đáy mất sạch điều hướng, tên trang, menu tài khoản. Đo: topbar ở `-1516px`, **0/10** mục điều hướng còn thấy | ✅ XONG |
| 2 | HIGH | Trợ năng | `index.css:137` | `*{animation-duration:.01ms!important}` đè lên chính khối giảm-chuyển-động có cân nhắc ở cuối file | ✅ XONG |
| 3 | HIGH | Chữ | 20 chỗ | `letter-spacing` không liên quan tới `font-size`. Cỡ 24px có ba giá trị; nhãn IN HOA 12.5px có năm; 32px chặt hơn 58px | ✅ XONG |
| 4 | HIGH | Vật liệu | `.app-topbar` | Không có lớp vật liệu nào; thanh tiêu đề là dải đục chiếm chỗ, không phải lớp nổi | ✅ XONG |
| 5 | MED | Trợ năng | toàn cục | Thiếu `prefers-reduced-transparency` và `prefers-contrast` (apple-design §14 yêu cầu đủ **ba** tín hiệu) | ✅ XONG |
| 6 | MED | Hình khối | 110 chỗ | 14 giá trị `border-radius` ngoài hệ; token chỉ dùng 28/170 lần | ✅ XONG |
| 7 | MED | Tương tác | `tr.row--locked` | Nền đỏ cả hàng thắng `tr:hover` → 5/25 hàng không phản hồi rê chuột | ✅ XONG |
| 8 | MED | Bảng dữ liệu | `.user-data-table th` | `position: sticky` là **code chết**: bám vào `.table-responsive` vốn không cuộn dọc. Đo: `th` ở `-485px` | ⏸ [001](001-sticky-table-header.md) |
| 9 | LOW | Đối xứng | `App.tsx:275,324` | Popover có hoạt hình vào nhưng **cắt phụt** khi đóng (dựng có điều kiện) — apple-design §7 | ⏸ [002](002-popover-exit-symmetry.md) |
| 10 | LOW | Gắn kết | `package.json` | `lucide-react` còn trong phụ thuộc, 0 lần import | ✅ XONG |

## Đợt rà thứ hai — mức `deep` (toàn repo) + minimalist-skill

| # | Mức | Nhóm | Vị trí | Phát hiện | Trạng thái |
|---|---|---|---|---|---|
| 11 | HIGH | Gắn kết | 27 file | 45 **ký tự** dùng như icon (`X` ×9, `←` ×12, `→` ×10, `✓` ×13, `🔎`, `✦`, `⇐`, `▶`/`▼`). Ký tự lấy nét từ font hệ thống nên không khớp `weight="bold"` của Phosphor | ✅ XONG |
| 12 | HIGH | Mục đích | `.dot-pulse` (2 chỗ) | Chấm nhấp nháy **vô hạn** cạnh một nhãn tĩnh, không báo trạng thái gì. AUDIT §1 + detector có sẵn luật `pulsing-dot` | ✅ XONG |
| 13 | MED | Đối xứng | `.toast-notification` | Neo mép **phải** (`right: 24px`) nhưng bay vào từ **trái** (`translateX(-22px)`) | ✅ XONG |
| 14 | MED | Hiệu năng | `.skip-link` | Chuyển động `top` — thuộc tính bố cục. Và đây là phần tử người dùng bàn phím thấy đầu tiên | ✅ XONG |
| 15 | MED | Bề mặt | 6 chỗ | Gradient: 3 chỗ **hai đầu cùng màu**, 3 chỗ chênh **0.24/255** (mắt người không thấy) | ✅ XONG |
| 16 | MED | Độ cao | 12 chỗ | Bóng vượt trần 0.05, gồm 2 bóng **nhuộm màu** (đỏ, xanh) trong hệ đơn sắc ấm | ✅ XONG |
| 17 | MED | Nội dung | 9 modal | Eyebrow trên tiêu đề; 3 chỗ rò mã yêu cầu nội bộ (`NCL-02-CN-003`, `QTN-01`) ra người dùng cuối | ✅ XONG |

**Bẫy phép đo thứ ba của đợt này.** Lần quét thời lượng đầu báo `.brand-copy` chạy **8000ms** và
`.story__item` **45000ms** — nghe như lỗi nghiêm trọng. Nguyên nhân: regex `(\d+(?:\.\d+)?)` không
khớp dạng `.8s` (không có số 0 dẫn đầu), nên nó đọc `8` thay vì `.8`, sai **10 lần**. Đo lại đúng:
800ms và 600ms, đều nằm ở màn đăng nhập và đều chạy một lần. Nếu tin con số đầu, tôi đã "sửa"
những thứ không hỏng.

## Cơ hội bị bỏ lỡ (bổ sung, không phải sửa lỗi)

- **Bàn giao trạng thái vận tốc khi kéo** (apple-design §5). Hiện không có tương tác kéo nào.
  Nếu sau này thêm kéo-thả nhánh cây tổ chức, đó là chỗ dùng đúng.
- **Chỉ báo tiến trình cho thao tác dài** (lưu, xuất báo cáo): hiện chỉ có spinner trong nút.

## Thứ tự thực thi

1. **001** trước — nó là thay đổi cấu trúc bố cục; làm 002 trước rồi phải sửa lại.
2. **002** độc lập, làm lúc nào cũng được.

## Bài học từ đợt này

**Đo trước, kết luận sau.** Hai lần trong đợt này phép đo lật ngược phán đoán ban đầu:

- Định tắt vùng cuộn ngang của bảng ở màn rộng. Đo bề rộng thật: bảng tràn 15px ở 1366px và
  101px ở 1280px — hai khổ laptop phổ biến nhất. Phán đoán "màn rộng thì bảng vừa" là **sai**.
- Đã thử chặn `max-height` cho `.table-responsive` để hàng tiêu đề dính. Đo lại: sinh ra vùng
  cuộn thứ hai mà tiêu đề **vẫn** trôi (`th` ở `-57px`). Kết quả **tệ hơn** bản gốc → hoàn tác.

Và **kiểm chứng chính công cụ đo**: `detect.mjs` báo `[]` cho toàn bộ `frontend/src`. Trước khi
tin con số đó, đã chạy nó trên một file cố tình vi phạm — nó bắt đúng 2 lỗi. Kết quả 0 là thật.
