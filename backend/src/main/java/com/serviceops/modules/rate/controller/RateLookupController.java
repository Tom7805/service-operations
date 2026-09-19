package com.serviceops.modules.rate.controller;

import com.serviceops.common.api.BaseRes;
import com.serviceops.modules.rate.dto.request.RateLookupReq;
import com.serviceops.modules.rate.dto.response.ResolvedRateRes;
import com.serviceops.modules.rate.dto.response.TimeEntryLookupCandidateRes;
import com.serviceops.modules.rate.dto.response.TimeEntryLookupEmployeeRes;
import com.serviceops.modules.rate.service.RateResolutionService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Tra cuu don gia ap dung cho mot dong gio cong (NCL-07-CN-005, Epic NCL-07).
 *
 * <p>Cung nhom quyen voi cac endpoint tra cuu don gia khac ({@code /bill-rates/resolve},
 * {@code /contracts/{id}/bill-rates/resolve}) vi day cung la mot phan cua "quan ly hieu
 * luc cua don gia" phuc vu tinh doanh thu — chi Ke toan (VT-05) hoac Quan tri vien
 * (VT-07) duoc goi.</p>
 */
@RestController
@RequestMapping("/timesheet-entries")
@RequiredArgsConstructor
public class RateLookupController {

	private final RateResolutionService rateResolutionService;

	@GetMapping("/{entryId}/bill-rate/resolve")
	@PreAuthorize("hasRole('VT-05') or hasRole('VT-07')")
	public BaseRes<ResolvedRateRes> resolve(@PathVariable Long entryId, @RequestParam String level) {
		return BaseRes.ok(rateResolutionService.resolveForTimeEntry(entryId, new RateLookupReq(level)));
	}

	/**
	 * Danh sach nhan su DA TUNG co dong gio cong duoc duyet, de chon truoc khi xem cac dong gio
	 * cong cua nguoi do ({@link #lookupCandidates}) — thay vi phai tu biet truoc "ID dong gio
	 * cong" (NCL-07-CN-005), con so ma truoc gio chi hien o man hinh "Dieu chinh gio cong da
	 * duyet" danh rieng cho Quan ly du an (VT-02), khac voi Ke toan/Quan tri vien o day.
	 */
	@GetMapping("/lookup-employees")
	@PreAuthorize("hasRole('VT-05') or hasRole('VT-07')")
	public BaseRes<List<TimeEntryLookupEmployeeRes>> lookupEmployees() {
		return BaseRes.ok(rateResolutionService.findEmployeesWithApprovedEntries());
	}

	/**
	 * Danh sach dong gio cong DA DUYET cua mot nhan su da chon o {@link #lookupEmployees}, de
	 * chon truc tiep truoc khi goi {@link #resolve} (NCL-07-CN-005).
	 */
	@GetMapping("/lookup-candidates")
	@PreAuthorize("hasRole('VT-05') or hasRole('VT-07')")
	public BaseRes<List<TimeEntryLookupCandidateRes>> lookupCandidates(@RequestParam Long userId) {
		return BaseRes.ok(rateResolutionService.findLookupCandidates(userId));
	}
}
