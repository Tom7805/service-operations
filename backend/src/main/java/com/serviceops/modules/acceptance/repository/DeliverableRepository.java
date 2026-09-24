package com.serviceops.modules.acceptance.repository;

import com.serviceops.modules.acceptance.entity.Deliverable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;

public interface DeliverableRepository extends JpaRepository<Deliverable, Long> {

	List<Deliverable> findByProjectIdOrderByWorkPackageIdAscIdAsc(Long projectId);

	List<Deliverable> findByWorkPackageIdInOrderByWorkPackageIdAscIdAsc(Collection<Long> workPackageIds);

	boolean existsByWorkPackageIdAndNameIgnoreCase(Long workPackageId, String name);
}
