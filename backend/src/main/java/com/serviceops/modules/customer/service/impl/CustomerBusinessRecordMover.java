package com.serviceops.modules.customer.service.impl;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.springframework.stereotype.Component;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * NCL-02-CN-006 TC-01/TC-02: chuyen du lieu nghiep vu (co hoi, hop dong, du an, hoa don, de nghi xuat hoa don)
 * cua ho so bi gop sang ho so giu lai, ghi vet nguon goc vao {@code originalCustomerId} cua tung ban ghi.
 *
 * <p>Dung cap nhat hang loat JPQL thay vi nap tung ban ghi: mot khach hang co the co hang nghin hoa don, va
 * khong can nap ban ghi nao vao bo nho. Khong kiem tra trang thai cua ban ghi (hoa don con no van chuyen —
 * TC-02 "gop van thuc hien va giu nguyen cong no"). {@code originalCustomerId} chi ghi o lan gop dau tien.</p>
 *
 * <p>Nguoi lien he (NCL-02-CN-003) co y KHONG chuyen: moi khach hang chi co mot dau moi chinh, va tai khoan cong
 * (NCL-13) gan voi nguoi lien he da tu hieu ho so da gop la cung phap nhan.</p>
 */
@Component
public class CustomerBusinessRecordMover {

	/** Ten entity JPA -> nhan hien thi trong nhat ky gop. Thu tu giu nguyen khi in tom tat. */
	static final Map<String, String> ENTITIES = new LinkedHashMap<>();

	static {
		ENTITIES.put("Opportunity", "co hoi");
		ENTITIES.put("Contract", "hop dong");
		ENTITIES.put("Project", "du an");
		ENTITIES.put("Invoice", "hoa don");
		ENTITIES.put("InvoiceProposal", "de nghi xuat hoa don");
	}

	@PersistenceContext
	private EntityManager entityManager;

	/** So ban ghi nghiep vu con gan voi ho so — dung cho man hinh xem truoc khi gop. */
	public long countRecords(Long customerId) {
		return ENTITIES.keySet().stream()
				.mapToLong(entity -> entityManager
						.createQuery("SELECT COUNT(e) FROM " + entity + " e WHERE e.customerId = :customerId", Long.class)
						.setParameter("customerId", customerId)
						.getSingleResult())
				.sum();
	}

	/** Chuyen toan bo ban ghi nghiep vu tu {@code sourceId} sang {@code targetId}; tra so ban ghi da chuyen theo loai. */
	public MovedRecords moveRecords(Long sourceId, Long targetId) {
		entityManager.flush();
		Map<String, Integer> moved = new LinkedHashMap<>();
		for (Map.Entry<String, String> entry : ENTITIES.entrySet()) {
			int count = entityManager.createQuery("UPDATE " + entry.getKey() + " e"
							+ " SET e.originalCustomerId = COALESCE(e.originalCustomerId, :sourceId), e.customerId = :targetId"
							+ " WHERE e.customerId = :sourceId")
					.setParameter("sourceId", sourceId)
					.setParameter("targetId", targetId)
					.executeUpdate();
			moved.put(entry.getValue(), count);
		}
		return new MovedRecords(moved);
	}

	/** So ban ghi da chuyen theo nhan hien thi (co hoi, hop dong, ...). */
	public record MovedRecords(Map<String, Integer> countsByLabel) {

		public int total() {
			return countsByLabel.values().stream().mapToInt(Integer::intValue).sum();
		}

		public String summary() {
			return countsByLabel.entrySet().stream()
					.map(entry -> entry.getValue() + " " + entry.getKey())
					.collect(Collectors.joining(", "));
		}
	}
}
