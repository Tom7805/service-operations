package com.serviceops.modules.admin.validator;

import com.serviceops.common.exception.BusinessRuleException;
import com.serviceops.common.exception.ErrorCode;
import com.serviceops.modules.admin.repository.ServiceCatalogItemRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.text.Normalizer;
import java.util.Locale;

/**
 * NCL-15-CN-001-TC-02: moi dich vu mot ten duy nhat. So sanh tren ten da chuan hoa — bo khoang trang thua va
 * khong phan biet hoa thuong — nen "Tu van  trien khai" va "tu van trien khai" bi coi la trung.
 * Dau tieng Viet duoc GIU lai: "Bảo trì" va "Bao tri" van la hai ten khac nhau.
 */
@Component
@RequiredArgsConstructor
public class ServiceNameUniqueValidator {

	private final ServiceCatalogItemRepository repository;

	public static String normalize(String name) {
		String composed = Normalizer.normalize(name.trim(), Normalizer.Form.NFC);
		return composed.replaceAll("\\s+", " ").toLowerCase(Locale.ROOT);
	}

	/** @param excludeId id dich vu dang sua (bo qua chinh no), {@code null} khi tao moi. */
	public void validate(String name, Long excludeId) {
		String normalized = normalize(name);
		boolean duplicated = excludeId == null
				? repository.existsByNameNormalized(normalized)
				: repository.existsByNameNormalizedAndIdNot(normalized, excludeId);
		if (duplicated) {
			throw duplicate(name);
		}
	}

	public static BusinessRuleException duplicate(String name) {
		return new BusinessRuleException(ErrorCode.DUPLICATE_DATA,
				"Dich vu ten \"" + name.trim() + "\" da ton tai trong danh muc");
	}
}
