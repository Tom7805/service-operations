package com.serviceops.modules.project.repository;

import com.serviceops.modules.project.entity.Project;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ProjectRepository extends JpaRepository<Project, Long> {

	/** NCL-05-CN-001: danh sach du an cua mot hop dong, moi nhat truoc. */
	List<Project> findByContractIdOrderByIdDesc(Long contractId);

	/** NCL-02-CN-004: danh sach du an cua mot khach hang cho ho so tong hop, moi nhat truoc. */
	List<Project> findByCustomerIdOrderByIdDesc(Long customerId);

	/** NCL-06-CN-005: danh sach du an ma mot PM quan ly (dung de loc cong viec/dong gio cong dieu chinh duoc). */
	List<Project> findByProjectManagerId(Long projectManagerId);
}