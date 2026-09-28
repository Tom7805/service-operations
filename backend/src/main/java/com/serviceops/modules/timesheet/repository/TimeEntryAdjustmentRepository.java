package com.serviceops.modules.timesheet.repository;

import com.serviceops.modules.timesheet.entity.TimeEntryAdjustment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface TimeEntryAdjustmentRepository extends JpaRepository<TimeEntryAdjustment, Long> {

	/** Lich su dieu chinh cua mot cong viec — moi nhat truoc (NCL-06-CN-005, "tra cuu duoc"). */
	List<TimeEntryAdjustment> findByTaskIdOrderByAdjustedAtDesc(Long taskId);

	/** Lich su dieu chinh cua chinh mot dong goc cu the. */
	List<TimeEntryAdjustment> findByOriginalEntryIdOrderByAdjustedAtDesc(Long originalEntryId);

	/** Dong goc nay da tung duoc dieu chinh chua — loai khoi danh sach "co the dieu chinh". */
	boolean existsByOriginalEntryId(Long originalEntryId);
}
