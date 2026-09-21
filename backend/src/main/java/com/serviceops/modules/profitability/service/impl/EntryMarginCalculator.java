package com.serviceops.modules.profitability.service.impl;

import com.serviceops.common.exception.BusinessRuleException;
import com.serviceops.modules.identity.employee.entity.Employee;
import com.serviceops.modules.rate.dto.response.ResolvedContractBillRateRes;
import com.serviceops.modules.rate.dto.response.ResolvedEmployeeHourlyRateRes;
import com.serviceops.modules.rate.service.ContractBillRateService;
import com.serviceops.modules.rate.service.EmployeeHourlyRateService;
import com.serviceops.modules.rate.service.WorkTypeRateService;
import com.serviceops.modules.timesheet.entity.TimeEntry;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;

/**
 * Tính giá vốn (QTN-17) và doanh thu (QTN-15/QTN-16) của MỘT dòng giờ công đã duyệt — dùng chung cho
 * mọi báo cáo biên lợi nhuận đọc trực tiếp từ {@code TimeEntry} (NCL-09-CN-005, NCL-09-CN-006) thay vì
 * mỗi nơi tự lặp lại công thức, tránh hai báo cáo lệch số với nhau.
 *
 * <p>Cấp bậc dùng để tra đơn giá bán ({@code BillRate}/{@code ContractBillRate}, khóa theo cặp vai
 * trò + cấp bậc) lấy trực tiếp từ {@code Employee.level} — cùng nguồn với
 * {@code RateResolutionService#resolveForTimeEntry(Long)} (NCL-09-CN-002) để không lệch công thức
 * giữa các báo cáo của Epic 9. Nhân sự chưa khai báo cấp bậc bị loại khỏi doanh thu (vẫn tính vào giá
 * vốn), đếm vào {@code missingRevenue} thay vì làm hỏng cả báo cáo.</p>
 */
@Component
@RequiredArgsConstructor
public class EntryMarginCalculator {

	/** 40 giờ chuẩn/tuần (QTN-23) chia 5 ngày làm việc — quy đổi đơn giá theo ngày sang theo giờ. */
	public static final BigDecimal STANDARD_HOURS_PER_DAY = new BigDecimal("8");

	private final EmployeeHourlyRateService employeeHourlyRateService;
	private final ContractBillRateService contractBillRateService;
	private final WorkTypeRateService workTypeRateService;

	/**
	 * @param contractId hợp đồng của dự án chứa dòng gio công này — dùng tra đơn giá bán ưu tiên
	 *                    theo hợp đồng (QTN-16); {@code null} nếu chỉ cần tính giá vốn (không cần
	 *                    doanh thu), khi đó doanh thu luôn trả về thiếu dữ liệu.
	 */
	public Result resolve(TimeEntry entry, Employee employee, Long contractId) {
		ResolvedEmployeeHourlyRateRes costResolved = employeeHourlyRateService.resolve(employee.getId(), entry.getWorkDate());
		BigDecimal cost;
		boolean missingCost = costResolved.missingCostData();
		if (missingCost) {
			cost = BigDecimal.ZERO;
		} else {
			cost = entry.getHours().multiply(costResolved.hourlyRate()).setScale(2, RoundingMode.HALF_UP);
		}

		BigDecimal revenue = BigDecimal.ZERO;
		boolean missingRevenue = false;
		if (Boolean.TRUE.equals(entry.getBillable())) {
			String role = employee.getProfessionalRole() == null ? "" : employee.getProfessionalRole().trim();
			String level = employee.getLevel() == null ? "" : employee.getLevel().trim();
			if (role.isBlank() || level.isBlank() || contractId == null) {
				missingRevenue = true;
			} else {
				try {
					ResolvedContractBillRateRes billRate = contractBillRateService.resolve(
							contractId, role, level, entry.getWorkDate());
					BigDecimal factor = workTypeRateService.resolveFactor(entry.getWorkType());
					BigDecimal hourlyRevenueRate = billRate.dailyRate().multiply(factor)
							.divide(STANDARD_HOURS_PER_DAY, 4, RoundingMode.HALF_UP);
					revenue = entry.getHours().multiply(hourlyRevenueRate).setScale(2, RoundingMode.HALF_UP);
				} catch (BusinessRuleException missingRate) {
					// Chua khai bao don gia ban / he so loai hinh cong viec o cap bac cua nhan su nay —
					// loai dong nay khoi doanh thu thay vi lam hong ca bao cao (van tinh vao gia von o tren).
					missingRevenue = true;
				}
			}
		}

		return new Result(cost, missingCost, revenue, missingRevenue);
	}

	public record Result(BigDecimal cost, boolean missingCost, BigDecimal revenue, boolean missingRevenue) {
	}
}
