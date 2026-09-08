package com.serviceops.modules.contract.mapper;

import com.serviceops.modules.contract.dto.response.AmendmentRes;
import com.serviceops.modules.contract.entity.ContractAmendment;
import org.springframework.stereotype.Component;

/**
 * Anh xa entity {@link ContractAmendment} sang {@link AmendmentRes}.
 */
@Component
public class AmendmentMapper {

	public AmendmentRes toResponse(ContractAmendment amendment) {
		return new AmendmentRes(
				amendment.getId(),
				amendment.getContractId(),
				amendment.getAmendmentNo(),
				amendment.getReason(),
				amendment.getOldTotalValue(),
				amendment.getNewTotalValue(),
				amendment.getOldEndDate(),
				amendment.getNewEndDate(),
				amendment.getEffectiveDate(),
				amendment.getNotes(),
				amendment.getCreatedBy(),
				amendment.getCreatedAt()
		);
	}
}
