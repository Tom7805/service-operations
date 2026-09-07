package com.serviceops.modules.contract.mapper;

import com.serviceops.modules.contract.dto.response.ContractRes;
import com.serviceops.modules.contract.entity.Contract;
import org.springframework.stereotype.Component;

/**
 * Anh xa entity {@link Contract} sang {@link ContractRes}.
 */
@Component
public class ContractMapper {

/**
 * @param customerName Ten khach hang (lay truoc tu bang customers) de hien thi; null neu khong co.
 */
public ContractRes toResponse(Contract contract, String customerName) {
return new ContractRes(
contract.getId(),
contract.getContractCode(),
contract.getName(),
contract.getOpportunityId(),
contract.getCustomerId(),
customerName,
contract.getQuoteId(),
contract.getContractType() == null ? null : contract.getContractType().name(),
contract.getTotalValue(),
contract.getStartDate(),
contract.getEndDate(),
contract.getStatus() == null ? null : contract.getStatus().name(),
contract.getNotes(),
contract.getCreatedBy(),
contract.getCreatedAt()
);
}
}