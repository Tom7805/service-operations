package com.serviceops.modules.invoice.validator;

import com.serviceops.common.exception.BusinessRuleException;
import com.serviceops.common.exception.ErrorCode;
import com.serviceops.modules.acceptance.enums.AcceptanceStatus;
import com.serviceops.modules.acceptance.repository.AcceptanceCertificateRepository;
import com.serviceops.modules.contract.entity.ContractMilestone;
import com.serviceops.modules.contract.enums.ContractMilestoneStatus;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/**
 * Chi cho lap hoa don khi moc thanh toan da du dieu kien (NCL-10-CN-002, QTN-25): moc phai o
 * {@link ContractMilestoneStatus#READY_TO_INVOICE}, va neu moc da gan phieu nghiem thu thi phieu do
 * phai da duoc khach hang xac nhan (NCL-12-CN-003, TC-02). Kiem tra phieu o day la chot chan cuoi,
 * phong truong hop moc da duoc mo truoc khi gan phieu.
 */
@Component
@RequiredArgsConstructor
public class MilestoneAcceptanceValidator {

	private final AcceptanceCertificateRepository acceptanceCertificateRepository;

	public void validate(ContractMilestone milestone) {
		switch (milestone.getStatus()) {
			case READY_TO_INVOICE -> {
			}
			case INVOICED -> throw new BusinessRuleException(ErrorCode.INVALID_STATE,
					"Moc thanh toan \"" + milestone.getName() + "\" da duoc xuat hoa don");
			case PENDING -> throw new BusinessRuleException(ErrorCode.INVALID_STATE,
					"Moc thanh toan \"" + milestone.getName()
							+ "\" chua du dieu kien lap hoa don (chua nghiem thu - QTN-25)");
		}
		acceptanceCertificateRepository.findByContractMilestoneId(milestone.getId())
				.filter(certificate -> certificate.getStatus() != AcceptanceStatus.ACCEPTED)
				.ifPresent(certificate -> {
					throw new BusinessRuleException(ErrorCode.INVALID_STATE,
							"Moc thanh toan \"" + milestone.getName() + "\" chua du dieu kien lap hoa don: phieu nghiem thu "
									+ certificate.getCertificateCode() + " chua duoc khach hang xac nhan (QTN-25)");
				});
	}
}
