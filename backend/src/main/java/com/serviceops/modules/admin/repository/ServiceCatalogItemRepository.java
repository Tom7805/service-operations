package com.serviceops.modules.admin.repository;

import com.serviceops.modules.admin.entity.ServiceCatalogItem;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ServiceCatalogItemRepository extends JpaRepository<ServiceCatalogItem, Long> {

	boolean existsByNameNormalized(String nameNormalized);

	boolean existsByNameNormalizedAndIdNot(String nameNormalized, Long id);

	List<ServiceCatalogItem> findAllByOrderByNameAsc();
}
