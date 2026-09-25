package com.serviceops.modules.customer.dto.response;

import java.util.List;

/**
 * So lieu tong hop cho man danh sach khach hang, tinh tren TOAN BO ho so trong pham vi cua
 * nguoi xem (khong phu thuoc bo loc/trang): the thong ke va gia tri cho cac o loc phan khuc.
 */
public record CustomerPageSummaryRes(long total, long createdToday, List<String> industries,
		List<String> companySizes, List<String> priorities) {
}
