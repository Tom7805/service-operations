package com.serviceops.modules.acceptance.repository;

import com.serviceops.modules.acceptance.entity.DeliverableVersion;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;

public interface DeliverableVersionRepository extends JpaRepository<DeliverableVersion, Long> {

	/** Moi nhat truoc: ngay ban giao giam dan, cung ngay thi ban ghi tao sau dung truoc. */
	List<DeliverableVersion> findByDeliverableIdOrderByDeliveredDateDescIdDesc(Long deliverableId);

	List<DeliverableVersion> findByDeliverableIdInOrderByDeliveredDateDescIdDesc(Collection<Long> deliverableIds);

	boolean existsByDeliverableIdAndVersionNoIgnoreCase(Long deliverableId, String versionNo);
}
