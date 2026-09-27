package com.serviceops.modules.acceptance.repository;

import com.serviceops.modules.acceptance.entity.AcceptanceItem;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AcceptanceItemRepository extends JpaRepository<AcceptanceItem, Long> {

	List<AcceptanceItem> findByCertificateIdOrderBySortOrderAscIdAsc(Long certificateId);

	void deleteByCertificateId(Long certificateId);
}
