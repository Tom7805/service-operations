package com.serviceops.modules.customer.dto.request;

import lombok.Getter;
import lombok.Setter;

/** Bo loc + phan trang cho danh sach khach hang phia may chu (GET /customers/paged). */
@Getter
@Setter
public class CustomerPageReq {

	/** Tim "chua" theo ten, ma KH, MST, SDT, nganh nghe hoac dia chi (khong phan biet hoa thuong). */
	private String keyword;

	private String industry;

	private String companySize;

	private String priority;

	/** So trang, bat dau tu 0. */
	private Integer page;

	/** So dong moi trang (mac dinh 20, toi da 100). */
	private Integer size;
}
