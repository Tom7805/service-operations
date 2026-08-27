package com.serviceops.modules.customer.controller;

import com.serviceops.common.api.BaseRes;
import com.serviceops.modules.customer.dto.request.CustomerContactReq;
import com.serviceops.modules.customer.dto.response.CustomerContactRes;
import com.serviceops.modules.customer.service.CustomerContactService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/customers/{customerId}/contacts")
@RequiredArgsConstructor
public class CustomerContactController {

	private final CustomerContactService customerContactService;

	/** NCL-02-CN-003: danh sach nguoi lien he cua khach hang, dau moi chinh hien o dau danh sach (TC-01). */
	@GetMapping
	@PreAuthorize("hasRole('VT-04')")
	public BaseRes<List<CustomerContactRes>> list(@PathVariable Long customerId) {
		return BaseRes.ok(customerContactService.listByCustomer(customerId));
	}

	/** NCL-02-CN-003: chi Nhan vien kinh doanh (VT-04) duoc them nguoi lien he (TC-01, TC-03). */
	@PostMapping
	@PreAuthorize("hasRole('VT-04')")
	public BaseRes<CustomerContactRes> add(@PathVariable Long customerId,
			@Valid @RequestBody CustomerContactReq request) {
		return BaseRes.ok("Them nguoi lien he thanh cong", customerContactService.addContact(customerId, request));
	}

	/** NCL-02-CN-003: danh dau mot nguoi lien he da co san la dau moi chinh (TC-02, TC-03). */
	@PatchMapping("/{contactId}/primary")
	@PreAuthorize("hasRole('VT-04')")
	public BaseRes<CustomerContactRes> setPrimary(@PathVariable Long customerId, @PathVariable Long contactId) {
		return BaseRes.ok("Cap nhat dau moi chinh thanh cong",
				customerContactService.setPrimary(customerId, contactId));
	}
}
