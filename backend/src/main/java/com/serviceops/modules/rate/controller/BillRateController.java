package com.serviceops.modules.rate.controller;

import com.serviceops.common.api.BaseRes;
import com.serviceops.modules.rate.dto.request.BillRateCreateReq;
import com.serviceops.modules.rate.dto.response.BillRateHistoryRes;
import com.serviceops.modules.rate.dto.response.BillRateRes;
import com.serviceops.modules.rate.service.BillRateService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/bill-rates")
@RequiredArgsConstructor
public class BillRateController {

	private final BillRateService billRateService;

	@PostMapping
	@PreAuthorize("hasRole('VT-05') or hasRole('VT-07')")
	public BaseRes<BillRateRes> create(@Valid @RequestBody BillRateCreateReq request) {
		return BaseRes.ok("Tao bang don gia theo vai tro thanh cong", billRateService.create(request));
	}

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

	/**
	 * Tra dung don gia hieu luc tai mot ngay phat sinh cu the (NCL-07-CN-002, QTN-15) —
	 * dung de tinh doanh thu cho gio cong da ghi nhan trong qua khu, tranh bi anh huong
	 * boi lan tang gia sau ngay do. Gioi han cho Ke toan/Quan tri vien nhu thao tac khai
	 * bao vi day cung la mot phan cua "quan ly hieu luc cua don gia" (TC-04).
	 */
	@GetMapping("/resolve")
	@PreAuthorize("hasRole('VT-05') or hasRole('VT-07')")
	public BaseRes<BillRateRes> resolve(
			@RequestParam String professionalRole,
			@RequestParam String level,
			@RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate asOf) {
		return BaseRes.ok(billRateService.resolve(professionalRole, level, asOf));
	}

	/**
	 * NCL-07-CN-007: toan bo cac moc don gia da khai bao cho mot cap (vai tro, cap bac), giup Ke
	 * toan giai trinh vi sao hai ky co doanh thu khac nhau. Cung nhom quyen voi thao tac khai bao/
	 * tra cuu hieu luc — vai tro khac nhan {@code 403 FORBIDDEN} va bi ghi nhat ky lan tu choi
	 * (TC-03).
	 */
	@GetMapping("/history")
	@PreAuthorize("hasRole('VT-05') or hasRole('VT-07')")
	public BaseRes<BillRateHistoryRes> history(
			@RequestParam String professionalRole,
			@RequestParam String level) {
		return BaseRes.ok(billRateService.history(professionalRole, level));
	}
}
