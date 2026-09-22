package com.serviceops.modules.invoice.validator;

import com.serviceops.common.exception.BusinessRuleException;
import com.serviceops.common.exception.ErrorCode;
import com.serviceops.modules.contract.entity.ContractMilestone;
import com.serviceops.modules.contract.enums.ContractMilestoneStatus;
import org.springframework.stereotype.Component;

/**
 * Chi cho lap hoa don khi moc thanh toan da du dieu kien (NCL-10-CN-002, QTN-25):
 * moc phai o {@link ContractMilestoneStatus#READY_TO_INVOICE}. Viec chuyen moc sang
 * trang thai nay thuoc story nghiem thu (NCL-12-CN-003), khong lam o day.
 */
@Component
public class MilestoneAcceptanceValidator {

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
	}
}
