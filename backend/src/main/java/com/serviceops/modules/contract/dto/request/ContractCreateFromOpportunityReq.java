package com.serviceops.modules.contract.dto.request;

import com.serviceops.modules.contract.enums.ContractType;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * Request tao hop dong tu co hoi da thang (NCL-04-CN-001).
 *
 * <p>He thong tu dong dung san khach hang, gia tri va bao gia cua co hoi
 * (khong truyen tu client de tranh sai lech du lieu ban hang); nguoi dung
 * chi bo sung cac thong tin con lai cua hop dong o day. Gia tri hop dong
 * (totalValue) la tuy chon - bo trong thi lay tu quotes.total_amount.</p>
 *
 * @param name         Ten hop dong; bo trong thi lay ten co hoi (TC-01).
 * @param contractType Loai hop dong - bat buoc chon.
 * @param totalValue   Gia tri hop dong tu chinh sua; null thi dung gia tri bao gia.
 * @param startDate    Ngay bat dau hieu luc, khong bat buoc o buoc dung san.
 * @param endDate      Ngay ket thuc, khong bat buoc; khong duoc som hon startDate.
 * @param notes        Ghi chu/noi dung bo sung, toi da 1000 ky tu.
 */
public record ContractCreateFromOpportunityReq(
		@Size(max = 255, message = "Ten hop dong khong qua 255 ky tu")
		String name,

		@NotNull(message = "Phai chon loai hop dong")
		ContractType contractType,

		BigDecimal totalValue,

		LocalDate startDate,

		LocalDate endDate,

		@Size(max = 1000, message = "Ghi chu khong qua 1000 ky tu")
		String notes
) {}