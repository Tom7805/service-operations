package com.serviceops.modules.customer.dto.response;

import java.math.BigDecimal;
import java.time.LocalDate;

public record CustomerOverviewItemRes(
	Long id,
	String code,
	String name,
	String status,
	BigDecimal amount,
	LocalDate date,
	/** Chi co o hop dong (vi du TIME_AND_MATERIAL) — null voi co hoi ban hang.
	 * Man hinh "Tao du an tu hop dong" dung truc tiep gia tri nay thay vi goi
	 * GET /contracts/{id} (endpoint do chi cap quyen cho VT-05, khong phai VT-02). */
	String contractType,
	/** Ngay ket thuc hop dong — chi co o dong hop dong, null voi co hoi/du an. Dung de
	 * tu dien san "Ngay ket thuc du kien" khi tao du an tu hop dong (NCL-05-CN-001). */
	LocalDate endDate
) {}