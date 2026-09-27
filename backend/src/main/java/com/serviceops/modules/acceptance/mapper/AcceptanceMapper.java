package com.serviceops.modules.acceptance.mapper;

import com.serviceops.modules.acceptance.dto.response.AcceptanceCertificateRes;
import com.serviceops.modules.acceptance.dto.response.AcceptanceDetailRes;
import com.serviceops.modules.acceptance.entity.AcceptanceCertificate;
import com.serviceops.modules.acceptance.entity.AcceptanceDecision;
import com.serviceops.modules.acceptance.entity.AcceptanceItem;
import com.serviceops.modules.acceptance.enums.AcceptanceItemType;
import com.serviceops.modules.contract.entity.ContractMilestone;
import com.serviceops.modules.project.entity.Project;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class AcceptanceMapper {

	public AcceptanceCertificateRes toSummary(AcceptanceCertificate certificate, Project project,
			String workPackageName, ContractMilestone milestone) {
		return new AcceptanceCertificateRes(certificate.getId(), certificate.getCertificateCode(),
				certificate.getProjectId(), project == null ? null : project.getProjectCode(),
				project == null ? null : project.getName(), project == null ? null : project.getContractId(),
				certificate.getWorkPackageId(), workPackageName, certificate.getTitle(),
				certificate.getAcceptedValue(), certificate.getStatus(), certificate.getRevisionNo(),
				certificate.getContractMilestoneId(), milestone == null ? null : milestone.getName(),
				certificate.getCreatedBy(), certificate.getCreatedAt(), certificate.getConfirmedAt());
	}

	public AcceptanceDetailRes toDetail(AcceptanceCertificate certificate, Project project, String workPackageName,
			ContractMilestone milestone, List<AcceptanceItem> items, List<AcceptanceDecision> decisions) {
		List<AcceptanceDetailRes.TaskItemRes> tasks = items.stream()
				.filter(item -> item.getItemType() == AcceptanceItemType.TASK)
				.map(item -> new AcceptanceDetailRes.TaskItemRes(item.getTaskId(), item.getItemName()))
				.toList();
		List<AcceptanceDetailRes.DeliverableItemRes> deliverables = items.stream()
				.filter(item -> item.getItemType() == AcceptanceItemType.DELIVERABLE)
				.map(item -> new AcceptanceDetailRes.DeliverableItemRes(item.getDeliverableId(),
						item.getDeliverableVersionId(), item.getItemName(), item.getVersionNo()))
				.toList();
		AcceptanceDetailRes.LinkedMilestoneRes linkedMilestone = milestone == null ? null
				: new AcceptanceDetailRes.LinkedMilestoneRes(milestone.getId(), milestone.getName(),
						milestone.getAmount(), milestone.getExpectedDate(), milestone.getStatus());
		List<AcceptanceDetailRes.DecisionRes> history = decisions.stream()
				.map(decision -> new AcceptanceDetailRes.DecisionRes(decision.getId(), decision.getDecision(),
						decision.getChannel(), decision.getRevisionNo(), decision.getSignerName(),
						decision.getSignedDate(), decision.getMinutesUrl(), decision.getReason(),
						decision.getRecordedBy(), decision.getRecordedAt()))
				.toList();
		return new AcceptanceDetailRes(certificate.getId(), certificate.getCertificateCode(),
				certificate.getProjectId(), project.getProjectCode(), project.getName(), project.getContractId(),
				certificate.getWorkPackageId(), workPackageName, certificate.getTitle(),
				certificate.getAcceptedValue(), certificate.getNote(), certificate.getStatus(),
				certificate.getRevisionNo(), certificate.getLastRejectionReason(), certificate.getSignerName(),
				certificate.getSignedDate(), certificate.getMinutesUrl(), certificate.getConfirmationChannel(),
				certificate.getConfirmedBy(), certificate.getConfirmedAt(), linkedMilestone,
				certificate.getLinkedBy(), certificate.getLinkedAt(), tasks, deliverables, history,
				certificate.getCreatedBy(), certificate.getCreatedAt(), certificate.getUpdatedAt());
	}
}
