package com.serviceops.modules.rate.controller;

import com.serviceops.common.api.BaseRes;
import com.serviceops.modules.rate.dto.response.BillRateRes;
import com.serviceops.modules.rate.service.BillRateService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/bill-rates")
@RequiredArgsConstructor
public class BillRateController {

	private final BillRateService billRateService;

	/**
	 * Danh sach chuc danh dang co don gia ban hieu luc, dung de dung o chon
	 * chuc danh o man hinh lap bao gia (NCL-03-CN-003) thay vi go tay tu do.
	 * Cho phep ca ke toan (VT-05, nguoi quan ly bang gia) va quan tri vien
	 * (VT-07) cung xem duoc, khong chi rieng nhan vien kinh doanh.
	 */
	@GetMapping("/current")
	@PreAuthorize("hasAnyRole('VT-04', 'VT-05', 'VT-07')")
	public BaseRes<List<BillRateRes>> listCurrent() {
		return BaseRes.ok(billRateService.listCurrentlyEffective());
	}
}
