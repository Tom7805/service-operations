package com.serviceops.modules.profitability.service.impl;

import com.serviceops.modules.identity.employee.entity.Employee;
import com.serviceops.modules.identity.employee.repository.EmployeeRepository;
import com.serviceops.modules.quotation.entity.Quote;
import com.serviceops.modules.quotation.entity.QuoteItem;
import com.serviceops.modules.rate.dto.response.ResolvedEmployeeHourlyRateRes;
import com.serviceops.modules.rate.service.EmployeeHourlyRateService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.List;

/**
 * Số liệu "kế hoạch" của dự án lấy từ báo giá — dùng chung cho so sánh biên dự kiến/thực tế (NCL-09-CN-006) và
 * báo cáo hiệu quả theo dự án (NCL-11-CN-003) để hai nơi không lệch số.
 *
 * <p>Doanh thu dự kiến là {@code Quote#totalAmount}. Báo giá lập trước khi giao việc cho người cụ thể nên chi phí dự
 * kiến là ước tính: số ngày công × 8 × chi phí giờ công bình quân của các nhân sự đang giữ cùng vai trò chuyên môn,
 * tại ngày lập báo giá. Dòng có vai trò chưa ai đảm nhiệm bị loại khỏi chi phí và đếm vào
 * {@link Plan#missingCostItemCount()}.</p>
 */
@Component
@RequiredArgsConstructor
public class QuotePlanEstimator {

	private final EmployeeRepository employeeRepository;
	private final EmployeeHourlyRateService employeeHourlyRateService;

	public Plan estimate(Quote quote) {
		LocalDate asOf = quote.getCreatedAt().toLocalDate();
		BigDecimal workDays = BigDecimal.ZERO;
		BigDecimal cost = BigDecimal.ZERO;
		int missingCostItemCount = 0;

		for (QuoteItem item : quote.getItems()) {
			workDays = workDays.add(item.getWorkDays());

			BigDecimal avgHourlyCost = averageHourlyCostForRole(item.getProfessionalRole(), asOf);
			if (avgHourlyCost == null) {
				missingCostItemCount++;
				continue;
			}
			BigDecimal itemCost = item.getWorkDays().multiply(EntryMarginCalculator.STANDARD_HOURS_PER_DAY)
					.multiply(avgHourlyCost).setScale(2, RoundingMode.HALF_UP);
			cost = cost.add(itemCost);
		}

		BigDecimal revenue = quote.getTotalAmount() == null ? BigDecimal.ZERO : quote.getTotalAmount();
		return new Plan(workDays, workDays.multiply(EntryMarginCalculator.STANDARD_HOURS_PER_DAY), revenue, cost,
				missingCostItemCount);
	}

	/** Trung bình cộng chi phí giờ công (theo giờ) của các nhân sự đang giữ vai trò này; null nếu không ước tính được. */
	private BigDecimal averageHourlyCostForRole(String professionalRole, LocalDate asOf) {
		String role = professionalRole == null ? "" : professionalRole.trim();
		if (role.isBlank()) {
			return null;
		}
		List<Employee> employees = employeeRepository.findByProfessionalRoleIgnoreCase(role);
		if (employees.isEmpty()) {
			return null;
		}
		BigDecimal sum = BigDecimal.ZERO;
		int count = 0;
		for (Employee employee : employees) {
			ResolvedEmployeeHourlyRateRes resolved = employeeHourlyRateService.resolve(employee.getId(), asOf);
			if (!resolved.missingCostData()) {
				sum = sum.add(resolved.hourlyRate());
				count++;
			}
		}
		if (count == 0) {
			return null;
		}
		return sum.divide(BigDecimal.valueOf(count), 4, RoundingMode.HALF_UP);
	}

	/** {@code hours} = {@code workDays} × 8. */
	public record Plan(BigDecimal workDays, BigDecimal hours, BigDecimal revenue, BigDecimal cost,
					   int missingCostItemCount) {

		public BigDecimal margin() {
			return revenue.subtract(cost);
		}
	}
}
