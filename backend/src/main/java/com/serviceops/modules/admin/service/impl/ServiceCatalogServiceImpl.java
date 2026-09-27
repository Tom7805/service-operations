package com.serviceops.modules.admin.service.impl;

import com.serviceops.common.audit.AuditTargetType;
import com.serviceops.common.audit.service.AuditLogService;
import com.serviceops.common.exception.BusinessRuleException;
import com.serviceops.common.exception.ErrorCode;
import com.serviceops.modules.admin.dto.request.ServiceCatalogReq;
import com.serviceops.modules.admin.dto.request.ServiceCatalogStatusReq;
import com.serviceops.modules.admin.dto.request.ServiceCatalogUpdateReq;
import com.serviceops.modules.admin.dto.request.ServicePriceReq;
import com.serviceops.modules.admin.dto.response.EffectivePriceRes;
import com.serviceops.modules.admin.dto.response.ServiceCatalogRes;
import com.serviceops.modules.admin.entity.ServiceCatalogItem;
import com.serviceops.modules.admin.entity.ServicePrice;
import com.serviceops.modules.admin.mapper.AdminMapper;
import com.serviceops.modules.admin.repository.ServiceCatalogItemRepository;
import com.serviceops.modules.admin.repository.ServicePriceRepository;
import com.serviceops.modules.admin.service.ServiceCatalogService;
import com.serviceops.modules.admin.validator.ServiceNameUniqueValidator;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

import static com.serviceops.modules.admin.service.impl.AdminSupport.blankToNull;
import static com.serviceops.modules.admin.service.impl.AdminSupport.currentUsername;

/**
 * NCL-15-CN-001: danh muc dich vu va gia.
 *
 * <ul>
 *   <li>TC-01: tao dich vu kem moc gia dau tien — xuat hien ngay trong danh muc dung chung;</li>
 *   <li>TC-02: trung ten (sau chuan hoa) thi {@code DUPLICATE_DATA}, khong tao — chan ca o tang du lieu
 *       (UNIQUE {@code name_normalized}) cho truong hop hai request dong thoi;</li>
 *   <li>TC-03: chi Quan tri vien (chan o controller); TC-04: moi thay doi ghi Nhat ky he thong (SYSTEM);</li>
 *   <li>QTN-28: gia la chuoi moc theo ngay hieu luc, doi gia = them moc; tra gia theo ngay lap chung tu.</li>
 * </ul>
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class ServiceCatalogServiceImpl implements ServiceCatalogService {

	static final String CODE_PREFIX = "DV";

	private final ServiceCatalogItemRepository itemRepository;
	private final ServicePriceRepository priceRepository;
	private final ServiceNameUniqueValidator nameUniqueValidator;
	private final AdminMapper mapper;
	private final AuditLogService auditLogService;
	private final Clock clock;

	@Override
	@Transactional(readOnly = true)
	public List<ServiceCatalogRes> search(String keyword, Boolean active, LocalDate asOf) {
		LocalDate date = asOf == null ? LocalDate.now(clock) : asOf;
		String needle = blankToNull(keyword) == null ? null : keyword.trim().toLowerCase(Locale.ROOT);
		List<ServiceCatalogItem> items = itemRepository.findAllByOrderByNameAsc().stream()
				.filter(item -> active == null || item.isActive() == active)
				.filter(item -> needle == null || contains(item.getName(), needle) || contains(item.getCode(), needle))
				.toList();
		Map<Long, List<ServicePrice>> prices = pricesByItem(items);
		return items.stream()
				.map(item -> mapper.toCatalogRes(item, prices.getOrDefault(item.getId(), List.of()), date, false))
				.toList();
	}

	@Override
	@Transactional(readOnly = true)
	public ServiceCatalogRes get(Long id, LocalDate asOf) {
		ServiceCatalogItem item = requireItem(id);
		return mapper.toCatalogRes(item, priceRepository.findByServiceItemIdOrderByEffectiveFromDesc(id),
				asOf == null ? LocalDate.now(clock) : asOf, true);
	}

	@Override
	public ServiceCatalogRes create(ServiceCatalogReq request) {
		String name = request.name().trim();
		nameUniqueValidator.validate(name, null);

		LocalDateTime now = LocalDateTime.now(clock);
		ServiceCatalogItem item = new ServiceCatalogItem();
		item.setName(name);
		item.setNameNormalized(ServiceNameUniqueValidator.normalize(name));
		item.setUnit(request.unit().trim());
		item.setDescription(blankToNull(request.description()));
		item.setActive(true);
		item.setCreatedBy(currentUsername());
		item.setCreatedAt(now);
		item.setUpdatedAt(now);
		item = saveItem(item, name);
		// Ma dich vu sinh tu id nen chac chan duy nhat, khong can vong lap thu ma ngau nhien.
		item.setCode(CODE_PREFIX + String.format("%05d", item.getId()));
		item = itemRepository.save(item);

		ServicePrice price = newPrice(item.getId(), request.price(), request.effectiveFrom(), "Gia khoi tao");
		priceRepository.save(price);

		log.info("SERVICE_CATALOG_CREATED id={} code={} by={}", item.getId(), item.getCode(), item.getCreatedBy());
		auditLogService.record("Tạo dịch vụ trong danh mục", AuditTargetType.SYSTEM, item.getId(),
				"Dịch vụ " + item.getCode() + " - " + item.getName(),
				"Tao dich vu " + item.getName() + " (don vi " + item.getUnit() + "), gia " + request.price().toPlainString()
						+ " hieu luc tu " + request.effectiveFrom());
		return get(item.getId(), null);
	}

	@Override
	public ServiceCatalogRes update(Long id, ServiceCatalogUpdateReq request) {
		ServiceCatalogItem item = requireItem(id);
		String name = request.name().trim();
		nameUniqueValidator.validate(name, id);

		String before = describe(item);
		item.setName(name);
		item.setNameNormalized(ServiceNameUniqueValidator.normalize(name));
		item.setUnit(request.unit().trim());
		item.setDescription(blankToNull(request.description()));
		item.setUpdatedAt(LocalDateTime.now(clock));
		item = saveItem(item, name);

		log.info("SERVICE_CATALOG_UPDATED id={} by={}", id, currentUsername());
		auditLogService.record("Cập nhật dịch vụ trong danh mục", AuditTargetType.SYSTEM, id,
				"Dịch vụ " + item.getCode() + " - " + item.getName(),
				"Truoc: " + before + ". Sau: " + describe(item));
		return get(id, null);
	}

	@Override
	public ServiceCatalogRes updateStatus(Long id, ServiceCatalogStatusReq request) {
		ServiceCatalogItem item = requireItem(id);
		boolean active = request.active();
		if (item.isActive() == active) {
			throw new BusinessRuleException(ErrorCode.INVALID_STATE, active
					? "Dich vu " + item.getCode() + " dang hoat dong"
					: "Dich vu " + item.getCode() + " da ngung su dung");
		}
		item.setActive(active);
		item.setUpdatedAt(LocalDateTime.now(clock));
		itemRepository.save(item);

		log.info("SERVICE_CATALOG_STATUS id={} active={} by={}", id, active, currentUsername());
		auditLogService.record(active ? "Mở lại dịch vụ trong danh mục" : "Ngừng dịch vụ trong danh mục",
				AuditTargetType.SYSTEM, id, "Dịch vụ " + item.getCode() + " - " + item.getName(),
				(active ? "Mo lai" : "Ngung") + " dich vu " + item.getName());
		return get(id, null);
	}

	@Override
	public ServiceCatalogRes addPrice(Long id, ServicePriceReq request) {
		ServiceCatalogItem item = requireItem(id);
		if (priceRepository.existsByServiceItemIdAndEffectiveFrom(id, request.effectiveFrom())) {
			throw new BusinessRuleException(ErrorCode.DUPLICATE_DATA, "Dich vu " + item.getCode()
					+ " da co moc gia hieu luc tu ngay " + request.effectiveFrom() + ", hay chon ngay khac");
		}
		ServicePrice price = newPrice(id, request.price(), request.effectiveFrom(), blankToNull(request.note()));
		try {
			priceRepository.saveAndFlush(price);
		} catch (DataIntegrityViolationException race) {
			throw new BusinessRuleException(ErrorCode.DUPLICATE_DATA, "Dich vu " + item.getCode()
					+ " da co moc gia hieu luc tu ngay " + request.effectiveFrom() + ", hay chon ngay khac");
		}
		item.setUpdatedAt(LocalDateTime.now(clock));
		itemRepository.save(item);

		log.info("SERVICE_PRICE_ADDED itemId={} price={} from={} by={}", id, request.price(),
				request.effectiveFrom(), currentUsername());
		auditLogService.record("Thêm mốc giá dịch vụ", AuditTargetType.SYSTEM, id,
				"Dịch vụ " + item.getCode() + " - " + item.getName(),
				"Gia moi " + request.price().toPlainString() + " hieu luc tu " + request.effectiveFrom()
						+ (price.getNote() == null ? "" : ", ghi chu: " + price.getNote()));
		return get(id, null);
	}

	@Override
	@Transactional(readOnly = true)
	public List<ServiceCatalogRes> listSelectable(LocalDate date) {
		LocalDate day = date == null ? LocalDate.now(clock) : date;
		return search(null, true, day).stream()
				.filter(ServiceCatalogRes::hasEffectivePrice)
				.toList();
	}

	@Override
	@Transactional(readOnly = true)
	public EffectivePriceRes resolveEffectivePrice(Long id, LocalDate date) {
		ServiceCatalogItem item = requireItem(id);
		LocalDate day = date == null ? LocalDate.now(clock) : date;
		if (!item.isActive()) {
			throw new BusinessRuleException(ErrorCode.INVALID_STATE,
					"Dich vu " + item.getCode() + " da ngung su dung, khong chon duoc khi lap bao gia/hoa don");
		}
		ServicePrice price = priceRepository
				.findFirstByServiceItemIdAndEffectiveFromLessThanEqualOrderByEffectiveFromDesc(id, day)
				.orElseThrow(() -> new BusinessRuleException(ErrorCode.INVALID_STATE, "Dich vu " + item.getCode()
						+ " chua co gia hieu luc tai ngay " + day + ", khong chon duoc khi lap bao gia/hoa don"));
		return new EffectivePriceRes(item.getId(), item.getCode(), item.getName(), item.getUnit(), day,
				price.getPrice(), price.getEffectiveFrom());
	}

	private ServiceCatalogItem saveItem(ServiceCatalogItem item, String name) {
		try {
			return itemRepository.saveAndFlush(item);
		} catch (DataIntegrityViolationException race) {
			// Hai request cung ten qua duoc buoc kiem tra truoc do — rang buoc UNIQUE la chot chan cuoi.
			throw ServiceNameUniqueValidator.duplicate(name);
		}
	}

	private ServicePrice newPrice(Long itemId, java.math.BigDecimal amount, LocalDate effectiveFrom, String note) {
		ServicePrice price = new ServicePrice();
		price.setServiceItemId(itemId);
		price.setPrice(amount);
		price.setEffectiveFrom(effectiveFrom);
		price.setNote(note);
		price.setCreatedBy(currentUsername());
		price.setCreatedAt(LocalDateTime.now(clock));
		return price;
	}

	private Map<Long, List<ServicePrice>> pricesByItem(List<ServiceCatalogItem> items) {
		if (items.isEmpty()) {
			return Map.of();
		}
		return priceRepository.findByServiceItemIdIn(items.stream().map(ServiceCatalogItem::getId).toList()).stream()
				.sorted(Comparator.comparing(ServicePrice::getEffectiveFrom).reversed())
				.collect(Collectors.groupingBy(ServicePrice::getServiceItemId));
	}

	private ServiceCatalogItem requireItem(Long id) {
		return itemRepository.findById(id).orElseThrow(() -> new BusinessRuleException(ErrorCode.RESOURCE_NOT_FOUND,
				"Khong tim thay dich vu voi id=" + id));
	}

	private static String describe(ServiceCatalogItem item) {
		return "ten=" + item.getName() + ", don vi=" + item.getUnit() + ", mo ta="
				+ Objects.requireNonNullElse(item.getDescription(), "(trong)");
	}

	private static boolean contains(String value, String needle) {
		return value != null && value.toLowerCase(Locale.ROOT).contains(needle);
	}
}
