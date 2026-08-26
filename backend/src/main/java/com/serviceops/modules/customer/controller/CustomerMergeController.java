package com.serviceops.modules.customer.controller;

import com.serviceops.common.api.BaseRes;
import com.serviceops.modules.customer.dto.request.CustomerMergeReq;
import com.serviceops.modules.customer.dto.response.CustomerRes;
import com.serviceops.modules.customer.dto.response.MergePreviewRes;
import com.serviceops.modules.customer.service.CustomerMergeService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * NCL-02-CN-006: Gop hai ho so khach hang trung.
 *
 * <p>Chi Quan tri vien (VT-07) duoc thuc hien (TC-03) - thao tac nay anh huong toan
 * bo du lieu lien quan cua khach hang nen duoc gioi han chat hon so voi Nhan vien
 * kinh doanh/Quan ly du an dang duoc dung o {@link CustomerController}. Khi bi
 * tu choi, {@link com.serviceops.modules.customer.logging.CustomerDuplicateAccessDeniedAspect}
 * (bao trum ca package controller nay) tu dong ghi nhat ky lan tu choi truy cap.</p>
 */
@RestController
@RequestMapping("/customers/merge")
@RequiredArgsConstructor
public class CustomerMergeController {

	private final CustomerMergeService customerMergeService;

	/** Xem truoc anh huong truoc khi gop that - khong thay doi du lieu. */
	@PostMapping("/preview")
	@PreAuthorize("hasRole('VT-07')")
	public BaseRes<MergePreviewRes> preview(@Valid @RequestBody CustomerMergeReq request) {
		return BaseRes.ok(customerMergeService.preview(request));
	}

	/** Thuc hien gop hai ho so khach hang trung (TC-01, TC-02). */
	@PostMapping
	@PreAuthorize("hasRole('VT-07')")
	public BaseRes<CustomerRes> merge(@Valid @RequestBody CustomerMergeReq request) {
		return BaseRes.ok("Gop ho so khach hang thanh cong", customerMergeService.merge(request));
	}
}
