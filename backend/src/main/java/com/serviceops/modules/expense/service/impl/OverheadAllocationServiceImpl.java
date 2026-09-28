package com.serviceops.modules.expense.service.impl;

import com.serviceops.common.audit.AuditTargetType;
import com.serviceops.common.audit.service.AuditLogService;
import com.serviceops.common.exception.BusinessRuleException;
import com.serviceops.common.exception.ErrorCode;
import com.serviceops.modules.expense.dto.request.OverheadAllocationRunReq;
import com.serviceops.modules.expense.dto.response.OverheadAllocationLineRes;
import com.serviceops.modules.expense.dto.response.OverheadAllocationRes;
import com.serviceops.modules.expense.entity.OverheadAllocation;
import com.serviceops.modules.expense.entity.OverheadPool;
import com.serviceops.modules.expense.repository.OverheadAllocationRepository;
import com.serviceops.modules.expense.repository.OverheadPoolRepository;
import com.serviceops.modules.expense.service.OverheadAllocationService;
import com.serviceops.modules.project.entity.Task;
import com.serviceops.modules.project.repository.TaskRepository;
import com.serviceops.modules.timesheet.repository.TimeEntryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Clock;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;

/**
 * NCL-08-CN-005: phan bo chi phi chung cho du an theo ty trong gio cong da duyet trong ky
 * (QTN-29).
 *
 * <p>Quy tac:</p>
 * <ul>
 *   <li>Ky duoc xac dinh theo thang ({@code year}/{@code month}), giong NCL-06-CN-006.</li>
 *   <li>Chi cac du an co gio cong DA DUYET phat sinh trong ky moi tham gia mau so va nhan
 *       duoc mot phan; du an khong phat sinh gio cong trong ky khong xuat hien trong ket qua
 *       (TC-02) va khong lam sai lech ty trong cua cac du an con lai.</li>
 *   <li>Moi ky (thang) chi duoc phan bo mot lan de tranh cong don chi phi chung vao bien
 *       loi nhuan hai lan; chay lai cho ky da phan bo se bi tu choi.</li>
 *   <li>Du an nhan phan cuoi cung (theo thu tu ma du an) duoc gan phan con lai thay vi tinh
 *       theo ty le va lam tron, de tong cac phan luon khop dung {@code totalAmount}.</li>
 *   <li>TC-04: moi lan phan bo deu ghi Nhat ky he thong (nguoi thuc hien, noi dung, thoi
 *       diem) qua {@link AuditLogService}.</li>
 * </ul>
 */
@Service
@RequiredArgsConstructor
@Transactional
public class OverheadAllocationServiceImpl implements OverheadAllocationService {

	private final OverheadPoolRepository overheadPoolRepository;
	private final OverheadAllocationRepository overheadAllocationRepository;
	private final TimeEntryRepository timeEntryRepository;
	private final TaskRepository taskRepository;
	private final AuditLogService auditLogService;
	private final Clock clock;

	@Override
	public OverheadAllocationRes run(OverheadAllocationRunReq request) {
		YearMonth yearMonth = YearMonth.of(request.year(), request.month());
		if (overheadPoolRepository.findByPeriodStart(yearMonth.atDay(1)).isPresent()) {
			throw new BusinessRuleException(ErrorCode.DUPLICATE_DATA,
					"Ky " + yearMonth + " da duoc phan bo chi phi chung tu truoc");
		}

		Map<Long, BigDecimal> hoursByProject = approvedHoursByProject(yearMonth);
		BigDecimal totalHours = hoursByProject.values().stream().reduce(BigDecimal.ZERO, BigDecimal::add);
		if (totalHours.compareTo(BigDecimal.ZERO) <= 0) {
			throw new BusinessRuleException(ErrorCode.INVALID_STATE,
					"Ky " + yearMonth + " chua co gio cong duoc duyet cho du an nao, khong the phan bo chi phi chung");
		}

		LocalDateTime now = LocalDateTime.now(clock);
		OverheadPool pool = new OverheadPool();
		pool.setPeriodStart(yearMonth.atDay(1));
		pool.setPeriodEnd(yearMonth.atEndOfMonth());
		pool.setTotalAmount(request.totalAmount().setScale(2, RoundingMode.HALF_UP));
		pool.setCreatedBy(currentUsername());
		pool.setCreatedAt(now);
		OverheadPool savedPool = overheadPoolRepository.save(pool);

		List<OverheadAllocationLineRes> lines = allocate(savedPool, hoursByProject, totalHours, now);

		auditLogService.record("Phân bổ chi phí chung", AuditTargetType.EXPENSE, savedPool.getId(),
				"Phân bổ chi phí chung cho dự án",
				"Kỳ " + savedPool.getPeriodStart() + " - " + savedPool.getPeriodEnd() + ": "
						+ request.totalAmount().toPlainString() + " cho " + lines.size() + " dự án");

		return new OverheadAllocationRes(savedPool.getId(), savedPool.getPeriodStart(), savedPool.getPeriodEnd(),
				savedPool.getTotalAmount(), lines, savedPool.getCreatedAt());
	}

	/** Tong gio cong DA DUYET cua tung du an trong ky, quy tu gio cong theo cong viec sang du an. */
	private Map<Long, BigDecimal> approvedHoursByProject(YearMonth yearMonth) {
		List<Object[]> hoursByTask = timeEntryRepository.sumApprovedHoursGroupByTaskIdBetween(
				yearMonth.atDay(1), yearMonth.atEndOfMonth());
		if (hoursByTask.isEmpty()) {
			return Map.of();
		}
		List<Long> taskIds = hoursByTask.stream().map(row -> (Long) row[0]).toList();
		Map<Long, Long> projectIdByTask = new LinkedHashMap<>();
		for (Task task : taskRepository.findAllById(taskIds)) {
			projectIdByTask.put(task.getId(), task.getProjectId());
		}

		Map<Long, BigDecimal> hoursByProject = new TreeMap<>();
		for (Object[] row : hoursByTask) {
			Long taskId = (Long) row[0];
			BigDecimal hours = (BigDecimal) row[1];
			Long projectId = projectIdByTask.get(taskId);
			if (projectId == null || hours.compareTo(BigDecimal.ZERO) <= 0) {
				continue;
			}
			hoursByProject.merge(projectId, hours, BigDecimal::add);
		}
		return hoursByProject;
	}

	/** Chia deu theo ty trong gio cong; du an cuoi cung nhan phan con lai de tong khop du. */
	private List<OverheadAllocationLineRes> allocate(OverheadPool pool, Map<Long, BigDecimal> hoursByProject,
			BigDecimal totalHours, LocalDateTime now) {
		List<Long> projectIds = new ArrayList<>(hoursByProject.keySet());
		List<OverheadAllocationLineRes> lines = new ArrayList<>();
		BigDecimal remaining = pool.getTotalAmount();

		for (int i = 0; i < projectIds.size(); i++) {
			Long projectId = projectIds.get(i);
			BigDecimal approvedHours = hoursByProject.get(projectId);
			BigDecimal allocatedAmount;
			if (i == projectIds.size() - 1) {
				allocatedAmount = remaining;
			} else {
				allocatedAmount = pool.getTotalAmount().multiply(approvedHours)
						.divide(totalHours, 2, RoundingMode.HALF_UP);
				remaining = remaining.subtract(allocatedAmount);
			}

			OverheadAllocation allocation = new OverheadAllocation();
			allocation.setOverheadPoolId(pool.getId());
			allocation.setProjectId(projectId);
			allocation.setApprovedHours(approvedHours);
			allocation.setAllocatedAmount(allocatedAmount);
			allocation.setCreatedAt(now);
			overheadAllocationRepository.save(allocation);

			lines.add(new OverheadAllocationLineRes(projectId, approvedHours, allocatedAmount));
		}
		return lines;
	}

	private String currentUsername() {
		Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
		return authentication == null ? null : authentication.getName();
	}
}
