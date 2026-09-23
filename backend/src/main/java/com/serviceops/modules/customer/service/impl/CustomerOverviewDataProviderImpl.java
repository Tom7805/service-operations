package com.serviceops.modules.customer.service.impl;

import com.serviceops.modules.contract.entity.Contract;
import com.serviceops.modules.contract.repository.ContractRepository;
import com.serviceops.modules.customer.dto.response.CustomerOverviewItemRes;
import com.serviceops.modules.customer.service.CustomerOverviewDataProvider;
import com.serviceops.modules.opportunity.entity.Opportunity;
import com.serviceops.modules.opportunity.repository.OpportunityRepository;
import com.serviceops.modules.project.entity.Project;
import com.serviceops.modules.project.repository.ProjectRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Doc du lieu that cho ho so tong hop khach hang (NCL-02-CN-004): co hoi ban
 * hang, hop dong va du an lay tu cac module da xay dung xong (opportunity,
 * contract, project).
 *
 * <p>{@code invoices} va {@code receivables} van tra ve rong vi module Hoa
 * don (NCL-10) hien chi la file rong (chua co entity/repository nao that su
 * ton tai) — se noi vao day khi Epic do duoc trien khai, khong phai loi cua
 * man hinh nay.</p>
 */
@Component
@RequiredArgsConstructor
public class CustomerOverviewDataProviderImpl implements CustomerOverviewDataProvider {

	private final OpportunityRepository opportunityRepository;
	private final ContractRepository contractRepository;
	private final ProjectRepository projectRepository;

	@Override
	public List<CustomerOverviewItemRes> opportunities(Long customerId) {
		return opportunityRepository.findByCustomerId(customerId).stream()
				.map(this::toItem)
				.toList();
	}

	@Override
	public List<CustomerOverviewItemRes> contracts(Long customerId) {
		return contractRepository.findByCustomerId(customerId).stream()
				.map(this::toItem)
				.toList();
	}

	@Override
	public List<CustomerOverviewItemRes> projects(Long customerId) {
		return projectRepository.findByCustomerIdOrderByIdDesc(customerId).stream()
				.map(this::toItem)
				.toList();
	}

	@Override
	public List<CustomerOverviewItemRes> invoices(Long customerId) {
		return List.of();
	}

	@Override
	public List<CustomerOverviewItemRes> receivables(Long customerId) {
		return List.of();
	}

	/** Co hoi khong co ma rieng (chi hop dong moi co contractCode) nen code = null. */
	private CustomerOverviewItemRes toItem(Opportunity opportunity) {
		return new CustomerOverviewItemRes(opportunity.getId(), null, opportunity.getName(),
				opportunity.getStage().name(), opportunity.getExpectedValue(), opportunity.getExpectedCloseDate(), null, null);
	}

	private CustomerOverviewItemRes toItem(Contract contract) {
		return new CustomerOverviewItemRes(contract.getId(), contract.getContractCode(), contract.getName(),
				contract.getStatus().name(), contract.getTotalValue(), contract.getStartDate(),
				contract.getContractType() == null ? null : contract.getContractType().name(), contract.getEndDate());
	}

	/** Du an khong co "gia tri hop dong" rieng nen dung han muc ke thua (limitValue) cho cot Gia tri. */
	private CustomerOverviewItemRes toItem(Project project) {
		return new CustomerOverviewItemRes(project.getId(), project.getProjectCode(), project.getName(),
				project.getStatus().name(), project.getLimitValue(), project.getStartDate(), null, null);
	}
}
