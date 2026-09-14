package com.serviceops.modules.rate.repository;

import com.serviceops.modules.rate.entity.BillRate;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface BillRateRepository extends JpaRepository<BillRate, Long> {

	Optional<BillRate> findTopByProfessionalRoleIgnoreCaseAndEffectiveFromLessThanEqualOrderByEffectiveFromDesc(
			String professionalRole, LocalDate effectiveDate);

	/**
	 * Voi moi chuc danh, lay dung dong don gia dang hieu luc tai {@code asOf}
	 * (effective_from gan nhat nhung khong vuot qua asOf) — dung de dung danh
	 * sach chuc danh cho o chon o man hinh lap bao gia (NCL-03-CN-003), tranh
	 * nguoi dung go tay sai ten khien khong tra duoc don gia.
	 */
	@Query(value = """
			SELECT br1.* FROM bill_rates br1
			INNER JOIN (
				SELECT professional_role, MAX(effective_from) AS max_effective_from
				FROM bill_rates
				WHERE effective_from <= :asOf
				GROUP BY professional_role
			) br2 ON br1.professional_role = br2.professional_role
				AND br1.effective_from = br2.max_effective_from
			ORDER BY br1.professional_role
			""", nativeQuery = true)
	List<BillRate> findAllCurrentlyEffective(@Param("asOf") LocalDate asOf);
}