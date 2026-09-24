package com.serviceops.modules.portal.dto.response;

import com.serviceops.modules.acceptance.enums.AcceptanceStatus;
import com.serviceops.modules.acceptance.enums.DeliverableType;
import com.serviceops.modules.project.enums.MilestoneProgressStatus;

import java.time.LocalDate;
import java.util.List;

/**
 * NCL-13-CN-002: tien do chi tiet cua mot du an tren cong — moc tien do, ty le hoan thanh tung hang muc va
 * san pham da ban giao. Co y KHONG co truong mo ta/ghi chu nao cua moc, hang muc, cong viec hay phien ban
 * ban giao: day la noi quan ly du an ghi chu noi bo (TC-03).
 */
public record PortalProjectProgressRes(
		PortalProjectRes project,
		List<WorkPackageProgressRes> workPackages,
		List<MilestoneProgressRes> milestones,
		List<DeliveredItemRes> deliverables) {

	/**
	 * Hang muc (long nhieu cap qua {@code parentId}); so cong viec tinh ca hang muc con chau.
	 *
	 * @param acceptanceStatus trang thai phieu nghiem thu cua hang muc (NCL-12), null neu chua lap phieu
	 */
	public record WorkPackageProgressRes(Long id, Long parentId, String name, int totalTasks, int doneTasks,
			int progressPercent, AcceptanceStatus acceptanceStatus) {
	}

	/** Moc tien do: DONE / ON_TRACK / LATE tinh nhu NCL-05-CN-008; {@code daysLate} chi co khi LATE. */
	public record MilestoneProgressRes(Long id, String name, LocalDate plannedDate, LocalDate actualDate,
			MilestoneProgressStatus status, Long daysLate) {
	}

	/** San pham da ban giao it nhat mot lan, kem phien ban moi nhat. */
	public record DeliveredItemRes(Long deliverableId, Long workPackageId, String workPackageName, String name,
			DeliverableType deliverableType, String latestVersionNo, LocalDate latestDeliveredDate,
			String latestFileUrl, int versionCount) {
	}
}
