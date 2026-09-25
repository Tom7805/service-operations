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

	/** {@code true} = bo ho so da gop (MERGED) — cho cac o chon khach hang cua thao tac nghiep vu moi. */
	private Boolean excludeMerged;

	/**
	 * {@code false} = khong tinh so lieu tong hop (the thong ke, gia tri o loc) — o chon/tim kiem
	 * chi can danh sach, bo duoc cac truy van tong hop moi lan go phim. Mac dinh co tinh.
	 */
	private Boolean includeSummary;

	/** So trang, bat dau tu 0. */
	private Integer page;

	/** So dong moi trang (mac dinh 20, toi da 100). */
	private Integer size;
}
