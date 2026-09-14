package com.serviceops.modules.contract.dto.request;

import com.serviceops.modules.contract.enums.ContractMilestoneStatus;
import jakarta.validation.constraints.NotNull;

public record ContractMilestoneStatusReq(
        @NotNull(message = "Trang thai moc thanh toan khong duoc de trong") ContractMilestoneStatus status
) {
}
