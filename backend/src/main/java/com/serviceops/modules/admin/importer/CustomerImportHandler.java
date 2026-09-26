package com.serviceops.modules.admin.importer;

import com.serviceops.modules.admin.enums.ImportRowStatus;
import com.serviceops.modules.admin.enums.ImportTargetType;
import com.serviceops.modules.customer.dto.request.CustomerCreateReq;
import com.serviceops.modules.customer.dto.request.CustomerUpdateReq;
import com.serviceops.modules.customer.dto.response.CustomerRes;
import com.serviceops.modules.customer.dto.response.DuplicateCandidateRes;
import com.serviceops.modules.customer.service.CustomerDuplicateService;
import com.serviceops.modules.customer.service.CustomerService;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validator;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;

/**
 * NCL-15-CN-004: nhap ho so khach hang tu tep.
 *
 * <ul>
 *   <li>Rang buoc tung dong = rang buoc cua man hinh tao khach hang ({@link CustomerCreateReq}): thieu ten, ma so thue
 *       / so dien thoai sai dinh dang thi dong do INVALID (TC-02);</li>
 *   <li>Trung ho so da co = cung thuat toan chong trung NCL-02-CN-002, nguong chan 0.9 — dong do DUPLICATE va nguoi
 *       dung chon bo qua hoac cap nhat ho so da co (TC-03);</li>
 *   <li>Hai dong trong cung tep trung ma so thue hoac trung ten thi dong sau INVALID — tranh tao hai ho so cho mot
 *       cong ty ngay trong mot lan nhap.</li>
 * </ul>
 * Ghi du lieu qua {@link CustomerService} nen moi ho so tao ra deu co ma, nguoi phu trach va nhat ky nhu tao tay.
 */
@Component
@RequiredArgsConstructor
public class CustomerImportHandler implements ImportHandler {

	/** Cung nguong chan luu cua {@code CustomerDuplicateValidator}. */
	static final double DUPLICATE_THRESHOLD = 0.9;

	private final CustomerService customerService;
	private final CustomerDuplicateService customerDuplicateService;
	private final Validator validator;

	@Override
	public ImportTargetType targetType() {
		return ImportTargetType.CUSTOMER;
	}

	@Override
	public List<String> templateHeaders() {
		return List.of("Tên khách hàng", "Mã số thuế", "Số điện thoại", "Lĩnh vực", "Địa chỉ");
	}

	@Override
	public List<String> templateSample() {
		return List.of("Công ty TNHH Mô Phỏng Minh An", "0109999991", "0912345678", "Phần mềm",
				"Số 1 Đường Mô Phỏng, Hà Nội");
	}

	@Override
	public Map<String, String> headerAliases() {
		Map<String, String> aliases = new HashMap<>();
		alias(aliases, "name", "Tên khách hàng", "Tên công ty", "Tên", "name", "customerName");
		alias(aliases, "taxCode", "Mã số thuế", "MST", "taxCode");
		alias(aliases, "phone", "Số điện thoại", "Điện thoại", "SĐT", "phone");
		alias(aliases, "industry", "Lĩnh vực", "Ngành nghề", "industry");
		alias(aliases, "address", "Địa chỉ", "address");
		return aliases;
	}

	@Override
	public List<RowCheck> check(List<ImportRowParser.ParsedRow> rows) {
		Map<String, Integer> seenTaxCodes = new HashMap<>();
		Map<String, Integer> seenNames = new HashMap<>();
		List<RowCheck> result = new ArrayList<>(rows.size());
		for (ImportRowParser.ParsedRow row : rows) {
			Map<String, String> v = row.values();
			CustomerCreateReq request = new CustomerCreateReq(v.get("name"), nullToEmpty(v.get("taxCode")),
					nullToEmpty(v.get("phone")), v.get("industry"), v.get("address"));
			List<String> errors = new ArrayList<>(validator.validate(request).stream()
					.sorted(Comparator.comparing(violation -> violation.getPropertyPath().toString()))
					.map(ConstraintViolation::getMessage)
					.toList());

			if (request.name() != null && !request.name().isBlank()) {
				Integer sameName = seenNames.putIfAbsent(request.name().trim().toLowerCase(Locale.ROOT), row.rowNumber());
				if (sameName != null) {
					errors.add("Trung ten khach hang voi dong " + sameName + " trong tep");
				}
			}
			if (!request.taxCode().isEmpty()) {
				Integer sameTax = seenTaxCodes.putIfAbsent(request.taxCode(), row.rowNumber());
				if (sameTax != null) {
					errors.add("Trung ma so thue voi dong " + sameTax + " trong tep");
				}
			}
			if (!errors.isEmpty()) {
				result.add(new RowCheck(row.rowNumber(), v, row.raw(), ImportRowStatus.INVALID, errors, null, null, null));
				continue;
			}
			Optional<DuplicateCandidateRes> duplicate = customerDuplicateService
					.findDuplicates(request.name(), request.taxCode(), request.phone()).stream()
					.filter(candidate -> candidate.similarity() >= DUPLICATE_THRESHOLD)
					.findFirst();
			if (duplicate.isPresent()) {
				DuplicateCandidateRes existing = duplicate.get();
				result.add(new RowCheck(row.rowNumber(), v, row.raw(), ImportRowStatus.DUPLICATE,
						List.of("Trung ho so khach hang da co " + existing.code() + " - " + existing.name()
								+ " (" + String.join(", ", existing.matchedFields()) + ")"),
						existing.id(), existing.code() + " - " + existing.name(), request));
			} else {
				result.add(new RowCheck(row.rowNumber(), v, row.raw(), ImportRowStatus.VALID, List.of(), null, null,
						request));
			}
		}
		return result;
	}

	@Override
	public String create(RowCheck row) {
		CustomerRes created = customerService.create((CustomerCreateReq) row.payload());
		return created.code() + " - " + created.name();
	}

	@Override
	public String update(RowCheck row) {
		CustomerCreateReq source = (CustomerCreateReq) row.payload();
		CustomerRes updated = customerService.update(row.duplicateOfId(), new CustomerUpdateReq(source.name(),
				source.taxCode(), source.phone(), source.industry(), source.address()));
		return updated.code() + " - " + updated.name();
	}

	private static void alias(Map<String, String> aliases, String field, String... headers) {
		for (String header : headers) {
			aliases.put(ImportRowParser.normalizeHeader(header), field);
		}
	}

	private static String nullToEmpty(String value) {
		return value == null ? "" : value;
	}
}
