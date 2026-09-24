package com.serviceops.modules.acceptance.mapper;

import com.serviceops.modules.acceptance.dto.response.DeliverableRes;
import com.serviceops.modules.acceptance.dto.response.DeliverableVersionRes;
import com.serviceops.modules.acceptance.entity.Deliverable;
import com.serviceops.modules.acceptance.entity.DeliverableVersion;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

@Component
public class DeliverableMapper {

	/**
	 * @param versionsNewestFirst phien ban cua san pham, da sap moi nhat truoc — phan tu dau duoc
	 *                            danh dau {@code latest}
	 */
	public DeliverableRes toResponse(Deliverable deliverable, String workPackageName,
			List<DeliverableVersion> versionsNewestFirst) {
		List<DeliverableVersionRes> versions = new ArrayList<>();
		for (int i = 0; i < versionsNewestFirst.size(); i++) {
			versions.add(toResponse(versionsNewestFirst.get(i), i == 0));
		}
		return new DeliverableRes(deliverable.getId(), deliverable.getProjectId(), deliverable.getWorkPackageId(),
				workPackageName, deliverable.getName(), deliverable.getDeliverableType(),
				deliverable.getDescription(), versions.size(), versions.isEmpty() ? null : versions.get(0),
				versions, deliverable.getCreatedBy(), deliverable.getCreatedAt());
	}

	public DeliverableVersionRes toResponse(DeliverableVersion version, boolean latest) {
		return new DeliverableVersionRes(version.getId(), version.getDeliverableId(), version.getVersionNo(),
				version.getDeliveredDate(), version.getReceiverName(), version.getFileUrl(), version.getNote(),
				latest, version.getCreatedBy(), version.getCreatedAt());
	}
}
