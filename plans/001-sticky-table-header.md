# 001 — Hàng tiêu đề bảng phải thật sự dính

**Mốc mã nguồn:** `5937bb2` · **Mức:** MEDIUM · **Nhóm:** bảng dữ liệu / định hướng

## Vấn đề

`frontend/src/assets/styles/index.css`, quy tắc `.user-data-table th` đã khai báo:

```css
position: sticky; top: 0; z-index: 2;
```

**Khai báo này không có tác dụng.** `position: sticky` bám vào vùng cuộn tổ tiên *gần nhất*.
Chuỗi tổ tiên hiện tại:

```
.app-main          overflow-y: auto     <- vung cuon THAT cua ung dung
  .user-table-card   overflow: hidden   <- cung la vung cuon, khong cuon doc
    .table-responsive  overflow-x: auto <- cung la vung cuon, khong cuon doc  <-- th bam vao day
      table > thead > th
```

`overflow-x: auto` khiến trục còn lại tính là `auto`, nên `.table-responsive` là một vùng cuộn
đầy đủ — nhưng nó không bao giờ cuộn dọc, nên sticky không bao giờ kích hoạt.

**Số đo** (bảng 25 dòng, khung nhìn 1440×900, cuộn `.app-main` 900px):

| | `th` top |
|---|---|
| Đầu trang | `415px` |
| Sau khi cuộn 900px | `-485px` (đã ra khỏi màn hình) |

Hệ quả: từ khoảng dòng 12 trở đi người dùng không còn biết cột nào là cột nào.

## Hai cách ĐÃ THỬ và ĐÃ LOẠI

Ghi lại để người thực thi không mất công thử lại.

**Cách A — bỏ vùng cuộn ngang ở màn rộng** (`overflow-x: clip` từ 1100px):
đã đo bề rộng thật của bảng ở 7 khổ màn hình.

| Bề rộng | Nội dung / khung | Kết quả |
|---|---|---|
| 1100px | 1089 / 808 | tràn 281px |
| 1200px | 1089 / 908 | tràn 181px |
| 1280px | 1089 / 988 | tràn 101px |
| 1366px | 1089 / 1074 | tràn 15px |
| 1440px | 1148 / 1148 | vừa khít |
| 1600px | 1232 / 1232 | vừa khít |

Chỉ an toàn từ **1440px** trở lên. 1366px và 1280px là hai khổ laptop phổ biến nhất, và ở đó
`clip` sẽ **cắt cụt im lặng** phần bảng bị tràn. Loại.

**Cách B — chặn `max-height` cho `.table-responsive`** để nó tự cuộn dọc:
đã cài và đo lại. Sinh ra vùng cuộn thứ hai, và hàng tiêu đề **vẫn** trôi mất (`th` ở `-57px`),
vì cả khối bảng bị `.app-main` cuốn lên. Tệ hơn bản gốc. Đã hoàn tác.

## Cách sửa đúng: dựng bố cục ứng dụng thật

Trang chiếm đúng chiều cao khung nhìn; thanh công cụ đứng yên; chỉ thân bảng cuộn.

### Các bước

1. `frontend/src/assets/styles/index.css`, quy tắc `.app-content` (hiện `flex: 1; min-width: 0;`):
   thêm `min-height: 0;` để phần tử flex co được dưới kích thước nội dung.

2. Quy tắc `.user-management-page` (hiện `max-width: 1280px; margin: 0 auto; padding: 24px;`):

   ```css
   .user-management-page {
     max-width: 1280px; margin: 0 auto; padding: 24px;
     display: flex; flex-direction: column;
     min-height: 100%;
   }
   ```

3. Thẻ bảng chiếm hết phần còn lại và **không** tự cuộn:

   ```css
   .user-management-page > .user-table-card {
     flex: 1; min-height: 0;
     display: flex; flex-direction: column;
     overflow: clip;        /* `clip` KHONG phai vung cuon — sticky di xuyen qua */
   }
   ```

4. `.table-responsive` trở thành vùng cuộn duy nhất của bảng:

   ```css
   .table-responsive { flex: 1; min-height: 0; overflow: auto; }
   ```

5. Giữ nguyên `position: sticky; top: 0;` trên `.user-data-table th`. Sau bước 4 nó bám đúng
   `.table-responsive` và **hộp này giờ có cuộn dọc thật**, nên sticky kích hoạt.
   `background` của `th` phải đục (`#F9F9F8`) — đã có sẵn, đừng đổi sang màu trong suốt,
   nếu không các dòng sẽ hiện xuyên qua khi cuộn.

### Ranh giới phạm vi

- **Không** đụng vào `.app-topbar`, `.side-nav`, `.app-main`. Khung ứng dụng đã đúng rồi.
- **Không** bỏ `overflow-x` của `.table-responsive` — số đo ở trên cho thấy vẫn cần cuộn ngang.
- **Không** đổi bất kỳ file `.tsx` nào. Đây thuần CSS.

## Kiểm chứng

Bắt buộc **đo**, không nhìn bằng mắt rồi kết luận.

1. Ở 1440×900 với bảng 25 dòng, cuộn `.table-responsive` xuống 900px, rồi đọc:
   `document.querySelector('.user-data-table th').getBoundingClientRect().top`
   → phải nằm trong khoảng `[0, 5]`, **không** âm.
2. Lặp lại ở **1280×800** và **1366×768** — hai khổ có tràn ngang. Hàng tiêu đề phải dính
   ở cả hai, và cuộn ngang vẫn phải hoạt động (kéo ngang, cột "Thao tác" phải tới được).
3. Đếm số vùng cuộn nhìn thấy được: phải là **một** trong vùng nội dung. Nếu xuất hiện hai
   thanh cuộn dọc lồng nhau thì bước 2 hoặc 3 sai — dừng lại, đừng ship.
4. `npx vitest run` — 164/164 phải xanh.
5. Kiểm bằng cảm giác: cuộn nhanh bằng con lăn. Khi bảng cuộn hết, cuộn phải **chuyển tiếp**
   sang trang (hành vi mặc định của `overscroll-behavior: auto`), không được khựng lại.

## Rủi ro

`.user-management-page` được dùng ở hầu hết các module, kể cả những trang **không có bảng**
(cây tổ chức, ma trận phân quyền, thiết lập 2FA). `min-height: 100%` + flex column phải không
được làm vỡ các trang đó. Kiểm ít nhất: **Tổ chức**, **Phân quyền**, **2FA** sau khi sửa.
