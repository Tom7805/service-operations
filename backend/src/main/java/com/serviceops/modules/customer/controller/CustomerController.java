package com.serviceops.modules.customer.controller;

import com.serviceops.common.api.BaseRes;
import com.serviceops.modules.customer.dto.request.CustomerCreateReq;
import com.serviceops.modules.customer.dto.request.CustomerCreateWithOverrideReq;
import com.serviceops.modules.customer.dto.request.CustomerSearchReq;
import com.serviceops.modules.customer.dto.response.CustomerRes;
import com.serviceops.modules.customer.dto.response.CustomerOverviewRes;
import com.serviceops.modules.customer.dto.response.DuplicateCandidateRes;
import com.serviceops.modules.customer.service.CustomerOverviewService;
import com.serviceops.modules.customer.service.CustomerService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/customers")
@RequiredArgsConstructor
public class CustomerController {

	private final CustomerService customerService;
	private final CustomerOverviewService customerOverviewService;

	/**
	 * NCL-02-CN-001 (buoc D/P): Sales (VT-04) va PM (VT-02) xem danh sach ho so khach hang hien co,
	 * lam diem vao man hinh Xem ho so tong hop (NCL-02-CN-004). Ho tro tim theo ten / ma KH / MST / SDT.
	 */
	@GetMapping
	@PreAuthorize("hasRole('VT-04') or hasRole('VT-02')")
	public BaseRes<List<CustomerRes>> list(CustomerSearchReq request) {
		return BaseRes.ok(customerService.findAll(request));
	}

	/** NCL-02-CN-004: Sales va PM duoc xem du lieu tong hop trong pham vi khach hang. */
	@GetMapping("/{customerId}/overview")
	@PreAuthorize("hasRole('VT-04') or hasRole('VT-02')")
	public BaseRes<CustomerOverviewRes> overview(@PathVariable Long customerId) {
		return BaseRes.ok(customerOverviewService.getOverview(customerId));
	}

	/** NCL-02-CN-001: chi Nhan vien kinh doanh (VT-04) hoac Quan ly du an (VT-02) duoc tao ho so khach hang. */
	@PostMapping
	@PreAuthorize("hasRole('VT-04') or hasRole('VT-02')")
	public BaseRes<CustomerRes> create(@Valid @RequestBody CustomerCreateReq request) {
		return BaseRes.ok("Tao ho so khach hang thanh cong", customerService.create(request));
	}

	/** NCL-02-CN-002: kiem tra ho so moi co nghi trung voi ho so da co (TC-01, TC-03). */
	@PostMapping("/check-duplicate")
	@PreAuthorize("hasRole('VT-04') or hasRole('VT-02')")
	public BaseRes<List<DuplicateCandidateRes>> checkDuplicate(@Valid @RequestBody CustomerCreateReq request) {
		return BaseRes.ok(customerService.checkDuplicates(request));
	}

	/** NCL-02-CN-002: xac nhan tao moi bo qua canh bao trung, bat buoc kem ly do (TC-02). */
	@PostMapping("/create-with-override")
	@PreAuthorize("hasRole('VT-04') or hasRole('VT-02')")
	public BaseRes<CustomerRes> createWithOverride(
			@Valid @RequestBody CustomerCreateWithOverrideReq request) {
		return BaseRes.ok("Tao ho so khach hang thanh cong (bo qua canh bao trung)",
				customerService.createWithOverride(request.customer(), request.override()));
	}
}
