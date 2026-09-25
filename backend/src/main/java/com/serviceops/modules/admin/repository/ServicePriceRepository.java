package com.serviceops.modules.admin.repository;

import com.serviceops.modules.admin.entity.ServicePrice;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface ServicePriceRepository extends JpaRepository<ServicePrice, Long> {

	boolean existsByServiceItemIdAndEffectiveFrom(Long serviceItemId, LocalDate effectiveFrom);

	/** QTN-28: moc gia co ngay hieu luc gan nhat truoc hoac bang ngay can tra. */
	Optional<ServicePrice> findFirstByServiceItemIdAndEffectiveFromLessThanEqualOrderByEffectiveFromDesc(
			Long serviceItemId, LocalDate date);

	List<ServicePrice> findByServiceItemIdOrderByEffectiveFromDesc(Long serviceItemId);

	List<ServicePrice> findByServiceItemIdIn(Collection<Long> serviceItemIds);
}
