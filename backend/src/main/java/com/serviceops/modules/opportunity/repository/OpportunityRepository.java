package com.serviceops.modules.opportunity.repository;

import com.serviceops.modules.opportunity.entity.Opportunity;
import com.serviceops.modules.opportunity.enums.OpportunityStage;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface OpportunityRepository extends JpaRepository<Opportunity, Long> {

	/** Lay cac co hoi cua mot khach hang (pipeline theo khach hang). */
	List<Opportunity> findByCustomerId(Long customerId);

	/** Lay cac co hoi theo giai doan (hien thi pipeline ban hang). */
	List<Opportunity> findByStage(OpportunityStage stage);

	/** Lay toan bo co hoi, moi nhat len truoc (NCL-03-CN-001 buoc hien thi danh sach pipeline). */
	List<Opportunity> findAllByOrderByCreatedAtDesc();

	/**
	 * Kiem tra da co co hoi cung ten (khong phan biet hoa/thuong) cho cung mot
	 * khach hang chua — chan tao trung ten gay nham lan khi dua vao du bao
	 * doanh thu hoac bao cao duong ong (phat hien tu du lieu trung ten
	 * "Trien khai giai phap ARG voi cong ty TNHH APex" bi tao lap lai nhieu lan).
	 */
	boolean existsByCustomerIdAndNameIgnoreCase(Long customerId, String name);
}
