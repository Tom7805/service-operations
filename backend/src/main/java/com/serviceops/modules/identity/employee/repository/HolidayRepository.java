package com.serviceops.modules.identity.employee.repository;

import com.serviceops.modules.identity.employee.entity.Holiday;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;

public interface HolidayRepository extends JpaRepository<Holiday, Long> {

	List<Holiday> findAllByOrderByHolidayDateAsc();

	boolean existsByHolidayDate(LocalDate holidayDate);

	boolean existsByHolidayDateAndIdNot(LocalDate holidayDate, Long id);

	/** Ngày lễ có thể rơi vào khoảng: lễ một lần nằm trong khoảng, hoặc mọi lễ lặp hằng năm (so ngày/tháng ở tầng ứng dụng). */
	@Query("""
			SELECT h FROM Holiday h
			WHERE h.recurringYearly = true
			OR h.holidayDate BETWEEN :from AND :to
			""")
	List<Holiday> findApplicableBetween(@Param("from") LocalDate from, @Param("to") LocalDate to);
}
