/**
 * Phím Esc đóng hộp thoại đang ở trên cùng — cho MỌI hộp thoại, không phải sửa từng tệp.
 *
 * Vì sao: trong ~64 hộp thoại chỉ 5 cái tự bắt phím Esc; số còn lại (vd "Khai báo đơn giá") bắt
 * người dùng phải với chuột tới nút ✕. Esc ở đây được coi như BẤM VÀO NỀN MỜ của hộp thoại trên
 * cùng, nên mỗi hộp thoại giữ nguyên luật đóng của chính nó: đang lưu (useBackdropClick bị khoá)
 * thì không đóng, hộp thoại cố ý không cho bấm nền để đóng thì Esc cũng không đóng.
 *
 * Không đóng nhầm hai lớp:
 * - Đang mở menu ⋮ hoặc danh sách chọn (role menu/listbox — chỉ được dựng khi đang mở): Esc chỉ
 *   dành để đóng lớp đó.
 * - Hộp thoại tự bắt Esc và đã tự đóng: xét lại ở nhịp sau, nền mờ đã rời khỏi trang thì thôi.
 */
export function installModalEscape(doc: Document = document): () => void {
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key !== 'Escape' || event.defaultPrevented || event.isComposing) return;
    if (doc.querySelector('[role="menu"], [role="listbox"]')) return;
    const backdrops = doc.querySelectorAll<HTMLElement>('.modal-backdrop');
    const top = backdrops[backdrops.length - 1];
    if (!top) return;
    window.setTimeout(() => {
      if (!top.isConnected) return;
      top.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
      top.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    }, 0);
  };
  doc.addEventListener('keydown', onKeyDown);
  return () => doc.removeEventListener('keydown', onKeyDown);
}
