package com.serviceops.modules.rate.controller;

import com.serviceops.common.api.BaseRes;
import com.serviceops.modules.rate.dto.request.WorkTypeRateFactorReq;
import com.serviceops.modules.rate.dto.response.WorkTypeRateFactorRes;
import com.serviceops.modules.rate.service.WorkTypeRateService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * He so nhan don gia theo loai hinh cong viec (NCL-07-CN-006, Epic NCL-07).
 *
 * <p>Khai bao gioi han cho Ke toan (VT-05)/Quan tri vien (VT-07) — cung nhom
 * quyen voi cac endpoint quan ly don gia khac. Danh sach he so cho phep them
 * Nhan vien chuyen mon (VT-03) xem — ho la nguoi chon loai hinh cong viec khi
 * ghi gio cong nen can biet cac lua chon hop le.</p>
 */
@RestController
@RequestMapping("/work-type-rates")
@RequiredArgsConstructor
public class WorkTypeRateController {

	private final WorkTypeRateService workTypeRateService;

	@PostMapping
	@PreAuthorize("hasRole('VT-05') or hasRole('VT-07')")
	public BaseRes<WorkTypeRateFactorRes> upsert(@Valid @RequestBody WorkTypeRateFactorReq request) {
		return BaseRes.ok("Khai bao he so don gia theo loai hinh cong viec thanh cong",
				workTypeRateService.upsert(request));
	}

	@GetMapping
	@PreAuthorize("hasAnyRole('VT-03', 'VT-05', 'VT-07')")
	public BaseRes<List<WorkTypeRateFactorRes>> listAll() {
		return BaseRes.ok(workTypeRateService.listAll());
	}
}
