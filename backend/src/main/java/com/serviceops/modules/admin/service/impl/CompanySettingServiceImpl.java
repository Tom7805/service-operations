package com.serviceops.modules.admin.service.impl;

import com.serviceops.common.audit.AuditTargetType;
import com.serviceops.common.audit.service.AuditLogService;
import com.serviceops.common.enums.Currency;
import com.serviceops.common.exception.BusinessRuleException;
import com.serviceops.common.exception.ErrorCode;
import com.serviceops.modules.admin.dto.request.CompanySettingReq;
import com.serviceops.modules.admin.dto.response.CompanySettingRes;
import com.serviceops.modules.admin.entity.CompanySetting;
import com.serviceops.modules.admin.mapper.AdminMapper;
import com.serviceops.modules.admin.repository.CompanySettingRepository;
import com.serviceops.modules.admin.service.CompanySettingService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

import static com.serviceops.modules.admin.service.impl.AdminSupport.blankToNull;
import static com.serviceops.modules.admin.service.impl.AdminSupport.currentUsername;

/**
 * NCL-15-CN-002: thong tin cong ty va moc ky tai chinh — mot dong duy nhat trong {@code company_settings}.
 *
 * <ul>
 *   <li>TC-01: doi thang bat dau nam tai chinh — {@code FiscalPeriodService} doc lai ngay o lan tinh ky ke tiep;</li>
 *   <li>TC-02: thieu ten cong ty bi chan o {@code @Valid} (400 VALIDATION_ERROR) va chan lai o day cho goi noi bo;</li>
 *   <li>TC-03: chi Quan tri vien (controller); TC-04: ghi Nhat ky he thong voi danh sach truong da doi.</li>
 * </ul>
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class CompanySettingServiceImpl implements CompanySettingService {

	static final Currency DEFAULT_CURRENCY = Currency.VND;
	static final int DEFAULT_FISCAL_START_MONTH = 1;
	static final int DEFAULT_WORKING_DAYS = 22;

	private final CompanySettingRepository repository;
	private final AdminMapper mapper;
	private final AuditLogService auditLogService;
	private final Clock clock;

	@Override
	@Transactional(readOnly = true)
	public CompanySettingRes get() {
		return repository.findById(CompanySetting.SINGLETON_ID)
				.map(mapper::toCompanySettingRes)
				.orElseGet(() -> new CompanySettingRes(false, null, null, null, null, null, DEFAULT_CURRENCY,
						DEFAULT_FISCAL_START_MONTH, DEFAULT_WORKING_DAYS, null, null));
	}

	@Override
	public CompanySettingRes update(CompanySettingReq request) {
		String companyName = blankToNull(request.companyName());
		if (companyName == null) {
			throw new BusinessRuleException(ErrorCode.VALIDATION_ERROR, "Ten cong ty khong duoc de trong");
		}
		CompanySetting setting = repository.findById(CompanySetting.SINGLETON_ID).orElse(null);
		boolean created = setting == null;
		if (created) {
			setting = new CompanySetting();
			setting.setId(CompanySetting.SINGLETON_ID);
		}
		List<String> changes = diff(setting, request, companyName);

		setting.setCompanyName(companyName);
		setting.setTaxCode(blankToNull(request.taxCode()));
		setting.setAddress(blankToNull(request.address()));
		setting.setPhone(blankToNull(request.phone()));
		setting.setEmail(blankToNull(request.email()));
		setting.setCurrency(request.currency());
		setting.setFiscalYearStartMonth(request.fiscalYearStartMonth());
		setting.setStandardWorkingDaysPerMonth(request.standardWorkingDaysPerMonth());
		setting.setUpdatedBy(currentUsername());
		setting.setUpdatedAt(LocalDateTime.now(clock));
		setting = repository.save(setting);

		log.info("COMPANY_SETTING_UPDATED fiscalStartMonth={} by={}", setting.getFiscalYearStartMonth(),
				setting.getUpdatedBy());
		auditLogService.record("Cập nhật cấu hình công ty", AuditTargetType.SYSTEM, CompanySetting.SINGLETON_ID,
				"Cấu hình công ty", created ? "Khai bao cau hinh cong ty lan dau: " + String.join("; ", changes)
						: changes.isEmpty() ? "Luu lai cau hinh, khong co truong nao thay doi"
						: "Thay doi: " + String.join("; ", changes));
		return mapper.toCompanySettingRes(setting);
	}

	@Override
	@Transactional(readOnly = true)
	public int fiscalYearStartMonth() {
		return repository.findById(CompanySetting.SINGLETON_ID)
				.map(CompanySetting::getFiscalYearStartMonth)
				.orElse(DEFAULT_FISCAL_START_MONTH);
	}

	private static List<String> diff(CompanySetting before, CompanySettingReq after, String companyName) {
		List<String> changes = new ArrayList<>();
		track(changes, "ten cong ty", before.getCompanyName(), companyName);
		track(changes, "ma so thue", before.getTaxCode(), blankToNull(after.taxCode()));
		track(changes, "dia chi", before.getAddress(), blankToNull(after.address()));
		track(changes, "so dien thoai", before.getPhone(), blankToNull(after.phone()));
		track(changes, "email", before.getEmail(), blankToNull(after.email()));
		track(changes, "don vi tien te", before.getCurrency(), after.currency());
		track(changes, "thang bat dau nam tai chinh", before.getFiscalYearStartMonth(), after.fiscalYearStartMonth());
		track(changes, "so ngay cong chuan/thang", before.getStandardWorkingDaysPerMonth(),
				after.standardWorkingDaysPerMonth());
		return changes;
	}

	private static void track(List<String> changes, String label, Object before, Object after) {
		if (!Objects.equals(before, after)) {
			changes.add(label + ": " + (before == null ? "(trong)" : before) + " -> " + (after == null ? "(trong)" : after));
		}
	}
}
