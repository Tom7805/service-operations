package com.serviceops.modules.report.service.impl;

import com.serviceops.common.audit.AuditTargetType;
import com.serviceops.common.audit.service.AuditLogService;
import com.serviceops.modules.contract.enums.ContractType;
import com.serviceops.modules.identity.employee.entity.Employee;
import com.serviceops.modules.identity.employee.repository.EmployeeRepository;
import com.serviceops.modules.profitability.service.impl.EntryMarginCalculator;
import com.serviceops.modules.report.dto.request.RevenueReportReq;
import com.serviceops.modules.report.dto.response.MonthlyRevenueReportRes;
import com.serviceops.modules.report.dto.response.MonthlyRevenueRes;
import com.serviceops.modules.report.projection.RevenueProjection;
import com.serviceops.modules.report.repository.RevenueQueryRepository;
import com.serviceops.modules.report.service.RevenueReportService;
import com.serviceops.modules.timesheet.entity.TimeEntry;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.Collections;
import java.util.EnumMap;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * NCL-11-CN-005 — Báo cáo doanh thu theo tháng.
 *
 * <p>Doanh thu của một tháng = tổng các dòng giờ công ĐÃ DUYỆT, tính phí có ngày làm việc trong tháng × đơn giá bán áp
 * dụng tại ngày đó ({@link EntryMarginCalculator}, QTN-15/QTN-16). Cùng nguồn với chỉ số doanh thu của bảng điều khiển
 * (NCL-11-CN-001) nên một tháng xem ở hai nơi ra cùng số. Doanh thu tách theo loại hợp đồng của dự án chứa dòng giờ
 * công; so sánh với đúng các tháng đó của năm trước.</p>
 *
 * <p>Giới hạn: hợp đồng trọn gói ghi nhận theo tỷ lệ hoàn thành (NCL-09-CN-002) chỉ tính được lũy kế tới hiện tại vì
 * công việc không lưu ngày hoàn thành, nên theo tháng vẫn quy từ giờ công tính phí × đơn giá; báo cáo nêu rõ điều này
 * trong {@code warnings} khi kỳ có doanh thu từ hợp đồng trọn gói.</p>
 */
@Service
@RequiredArgsConstructor
public class RevenueReportServiceImpl implements RevenueReportService {

	static final String REPORT_LABEL = "Báo cáo doanh thu theo tháng";
	private static final BigDecimal HUNDRED = new BigDecimal("100");
	private static final BigDecimal ZERO = BigDecimal.ZERO.setScale(2);

	private final RevenueQueryRepository revenueQueryRepository;
	private final EmployeeRepository employeeRepository;
	private final EntryMarginCalculator entryMarginCalculator;
	private final AuditLogService auditLogService;

	@Override
	@Transactional
	public MonthlyRevenueReportRes getMonthlyRevenue(RevenueReportReq request) {
		YearMonth fromMonth = request.fromMonth();
		YearMonth toMonth = request.toMonth();

		Totals current = aggregate(fromMonth, toMonth);
		Totals previous = aggregate(fromMonth.minusYears(1), toMonth.minusYears(1));

		List<MonthlyRevenueRes> months = new ArrayList<>();
		for (YearMonth month = fromMonth; !month.isAfter(toMonth); month = month.plusMonths(1)) {
			Map<ContractType, BigDecimal> byType = current.byMonth().getOrDefault(month, emptyByType());
			BigDecimal revenue = sum(byType);
			BigDecimal previousRevenue = sum(previous.byMonth().getOrDefault(month.minusYears(1), emptyByType()));
			months.add(new MonthlyRevenueRes(month, revenue, byType, previousRevenue,
					changePercent(revenue, previousRevenue)));
		}

		Map<ContractType, BigDecimal> totalByType = emptyByType();
		current.byMonth().values().forEach(byType -> byType.forEach((type, value) -> totalByType.merge(type, value,
				BigDecimal::add)));
		BigDecimal total = sum(totalByType);
		BigDecimal previousTotal = previous.byMonth().values().stream().map(RevenueReportServiceImpl::sum)
				.reduce(ZERO, BigDecimal::add);

		// TC-02: kỳ không có dòng giờ công tính phí nào -> không có dữ liệu (dòng đảo triệt tiêu nhau vẫn là có dữ liệu).
		boolean hasData = current.entryCount() > 0;

		List<String> warnings = new ArrayList<>();
		if (current.missingRevenue() > 0) {
			warnings.add(current.missingRevenue() + " dòng giờ công tính phí đã duyệt thiếu đơn giá bán hoặc hồ sơ"
					+ " nhân sự nên doanh thu thấp hơn thực tế.");
		}
		if (totalByType.get(ContractType.FIXED_PRICE).signum() != 0) {
			warnings.add("Doanh thu hợp đồng trọn gói theo tháng quy từ giờ công tính phí × đơn giá; số lũy kế theo tỷ"
					+ " lệ hoàn thành xem ở màn hình doanh thu ghi nhận của từng dự án.");
		}

		String detail = "Xem báo cáo doanh thu theo tháng từ " + fromMonth + " đến " + toMonth;
		auditLogService.record("Xem báo cáo doanh thu theo tháng", AuditTargetType.GENERAL, null, REPORT_LABEL, detail);

		return new MonthlyRevenueReportRes(fromMonth, toMonth, hasData, total, totalByType, previousTotal,
				changePercent(total, previousTotal), months, current.missingRevenue(), warnings);
	}

	private Totals aggregate(YearMonth fromMonth, YearMonth toMonth) {
		List<RevenueProjection> rows = revenueQueryRepository.findApprovedBillableEntries(fromMonth.atDay(1),
				toMonth.atEndOfMonth());
		if (rows.isEmpty()) {
			return new Totals(Map.of(), 0, 0);
		}

		Map<Long, Employee> employeesByUserId = employeeRepository
				.findByUser_IdIn(rows.stream().map(row -> row.entry().getUserId()).distinct().toList()).stream()
				.collect(Collectors.toMap(employee -> employee.getUser().getId(), Function.identity()));

		Map<YearMonth, Map<ContractType, BigDecimal>> byMonth = new HashMap<>();
		int missingRevenue = 0;
		for (RevenueProjection row : rows) {
			TimeEntry entry = row.entry();
			Employee employee = employeesByUserId.get(entry.getUserId());
			if (employee == null) {
				// Tài khoản chưa có hồ sơ nhân sự: không tra được đơn giá, đếm thiếu thay vì làm hỏng cả báo cáo.
				missingRevenue++;
				continue;
			}
			EntryMarginCalculator.Result resolved = entryMarginCalculator.resolve(entry, employee, row.contractId());
			if (resolved.missingRevenue()) {
				missingRevenue++;
			}
			ContractType type = row.contractType() == null ? ContractType.TIME_AND_MATERIAL : row.contractType();
			byMonth.computeIfAbsent(YearMonth.from(entry.getWorkDate()), month -> emptyByType())
					.merge(type, resolved.revenue(), BigDecimal::add);
		}
		byMonth.values().forEach(byType -> byType.replaceAll((type, value) -> value.setScale(2, RoundingMode.HALF_UP)));
		return new Totals(byMonth, rows.size(), missingRevenue);
	}

	private static Map<ContractType, BigDecimal> emptyByType() {
		Map<ContractType, BigDecimal> byType = new EnumMap<>(ContractType.class);
		for (ContractType type : ContractType.values()) {
			byType.put(type, ZERO);
		}
		return byType;
	}

	private static BigDecimal sum(Map<ContractType, BigDecimal> byType) {
		return byType.values().stream().reduce(ZERO, BigDecimal::add);
	}

	/** (hiện tại − năm trước) ÷ năm trước × 100, 2 chữ số; null khi năm trước bằng 0 thay vì chia cho 0. */
	private static BigDecimal changePercent(BigDecimal current, BigDecimal previous) {
		if (previous.signum() == 0) {
			return null;
		}
		return current.subtract(previous).multiply(HUNDRED).divide(previous, 2, RoundingMode.HALF_UP);
	}

	private record Totals(Map<YearMonth, Map<ContractType, BigDecimal>> byMonth, int entryCount, int missingRevenue) {
		Totals {
			byMonth = Collections.unmodifiableMap(byMonth);
		}
	}
}
