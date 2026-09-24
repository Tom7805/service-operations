package com.serviceops.modules.portal.repository;

import com.serviceops.modules.portal.entity.PortalAccount;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface PortalAccountRepository extends JpaRepository<PortalAccount, Long> {

	Optional<PortalAccount> findByUserId(Long userId);

	boolean existsByContactId(Long contactId);

	List<PortalAccount> findByCustomerIdOrderByIdDesc(Long customerId);

	List<PortalAccount> findAllByOrderByIdDesc();

	/** Khoa ghi dong tai khoan de hai luot khoa/mo khoa cung luc chay tuan tu. */
	@Lock(LockModeType.PESSIMISTIC_WRITE)
	@Query("SELECT p FROM PortalAccount p WHERE p.id = :id")
	Optional<PortalAccount> findByIdForUpdate(@Param("id") Long id);
}
