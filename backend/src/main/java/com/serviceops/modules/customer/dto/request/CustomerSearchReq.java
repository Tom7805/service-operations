package com.serviceops.modules.customer.dto.request;

import lombok.Getter;
import lombok.Setter;

/**
 * Bo loc tim kiem ho so khach hang (khong bat buoc) - NCL-02-CN-001 buoc D/P:
 * hien thi va cap nhat bang danh sach khach hang.
 */
@Getter
@Setter
public class CustomerSearchReq {

	/** Tim theo ten, ma khach hang (KH-xxxxxx), ma so thue hoac so dien thoai (tim chua, khong phan biet hoa thuong). */
	private String keyword;
}
