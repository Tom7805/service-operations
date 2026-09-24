package com.serviceops.modules.acceptance.validator;

import com.serviceops.common.exception.BusinessRuleException;
import com.serviceops.common.exception.ErrorCode;
import com.serviceops.modules.acceptance.repository.DeliverableVersionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/**
 * NCL-12-CN-004 (TC-02): so phien ban khong duoc trung trong cung mot san pham ban giao (khong phan
 * biet hoa thuong). Rang buoc UNIQUE cua bang {@code deliverable_versions} la chot chan cuoi cung khi
 * hai nguoi luu cung luc.
 */
@Component
@RequiredArgsConstructor
public class DeliverableVersionUniqueValidator {

	private final DeliverableVersionRepository versionRepository;

	public void validate(Long deliverableId, String versionNo) {
		if (versionRepository.existsByDeliverableIdAndVersionNoIgnoreCase(deliverableId, versionNo)) {
			throw duplicate(versionNo);
		}
	}

	public BusinessRuleException duplicate(String versionNo) {
		return new BusinessRuleException(ErrorCode.DUPLICATE_DATA,
				"Phien ban \"" + versionNo + "\" da ton tai cho san pham nay, vui long dat so phien ban khac");
	}
}
