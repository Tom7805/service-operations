package com.serviceops.common.api;

import java.util.List;

import org.springframework.data.domain.Page;

/**
 * Mot trang ket qua cua danh sach phan trang phia may chu.
 *
 * @param content       cac ban ghi cua trang hien tai
 * @param page          so trang (bat dau tu 0)
 * @param size          so ban ghi toi da moi trang
 * @param totalElements tong so ban ghi khop bo loc
 * @param totalPages    tong so trang
 * @param summary       so lieu tong hop tren TOAN BO pham vi du lieu cua nguoi xem (khong phu thuoc
 *                      trang hay bo loc) — the thong ke, gia tri cho o loc; {@code null} neu khong co
 */
public record PageRes<T, S>(List<T> content, int page, int size, long totalElements, int totalPages, S summary) {

	public static <E, T, S> PageRes<T, S> of(Page<E> page, List<T> content, S summary) {
		return new PageRes<>(content, page.getNumber(), page.getSize(), page.getTotalElements(),
				page.getTotalPages(), summary);
	}
}
