package com.serviceops.modules.contract.service.impl;

import com.serviceops.modules.contract.dto.response.ContractExpiryAlertRes;
import com.serviceops.modules.contract.entity.Contract;
import com.serviceops.modules.contract.enums.ContractAuditAction;
import com.serviceops.modules.contract.enums.ContractStatus;
import com.serviceops.modules.contract.logging.ContractAuditLogger;
import com.serviceops.modules.contract.repository.ContractAuditLogRepository;
import com.serviceops.modules.contract.repository.ContractRepository;
import com.serviceops.modules.contract.service.ContractExpiryReminderService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.temporal.ChronoUnit;
import java.util.List;

/**
 * Nghiep vu nhac hop dong sap het hieu luc (NCL-04-CN-006).
 *
 * <p>Luong xu ly (TC-01): ra soat hop dong dang ACTIVE co ngay ket thuc nam
 * trong cua so ba muoi ngay toi - voi moi hop dong, bo qua neu da gui nhac
 * trong ngay hom nay (QTN-27, chong tac vu ra soat chay nhieu lan trong cung
 * mot ngay lam trung thong bao) - con lai thi ghi nhat ky EXPIRY_REMINDER
 * (TC-04) va tra ve trong danh sach da gui.</p>
 *
 * <p>TC-02 (liet ke hop dong het hieu luc nhung van dang chay) tach rieng o
 * {@link #listOverdueActiveContracts()}: chua co du lieu du an trong pham vi
 * he thong hien tai nen dung chinh trang thai ACTIVE cua hop dong da qua
 * ngay ket thuc lam dau hieu - hop dong chua duoc dong hay gia han thi coi
 * nhu van con cong viec chay ngoai hop dong.</p>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ContractExpiryReminderServiceImpl implements ContractExpiryReminderService {

	/** Gui nhac truoc han bao nhieu ngay (mo ta story: "truoc ba muoi ngay"). */
	private static final int REMINDER_WINDOW_DAYS = 30;

	private final ContractRepository contractRepository;
	private final ContractAuditLogRepository contractAuditLogRepository;
	private final ContractAuditLogger contractAuditLogger;

	/** Tac vu ra soat hang ngay, cung logic voi tac vu kich hoat thu cong qua API. */
	@Scheduled(cron = "${contract.expiry-reminder.cron:0 0 6 * * *}")
	public void scheduledReminderScan() {
		List<ContractExpiryAlertRes> sent = runReminderScan();
		log.info("CONTRACT_EXPIRY_REMINDER_SCAN_DONE sentCount={}", sent.size());
	}

	@Override
	@Transactional
	public List<ContractExpiryAlertRes> runReminderScan() {
		LocalDate today = LocalDate.now();
		LocalDate windowEnd = today.plusDays(REMINDER_WINDOW_DAYS);
		LocalDateTime startOfToday = LocalDateTime.of(today, LocalTime.MIN);
		LocalDateTime endOfToday = LocalDateTime.of(today, LocalTime.MAX);

		List<Contract> candidates = contractRepository.findByStatusAndEndDateBetween(
				ContractStatus.ACTIVE, today, windowEnd);

		return candidates.stream()
				.filter(contract -> !contractAuditLogRepository.existsByContractIdAndActionTypeAndCreatedAtBetween(
						contract.getId(), ContractAuditAction.EXPIRY_REMINDER, startOfToday, endOfToday))
				.map(contract -> {
					ContractExpiryAlertRes alert = toAlert(contract, "EXPIRING_SOON");

					// TC-04: ghi nguoi phu trach nhan nhac, so ngay con lai va thoi diem.
					contractAuditLogger.record(contract.getId(), ContractAuditAction.EXPIRY_REMINDER,
							"Nhac hop dong " + contract.getContractCode() + " con " + alert.daysRemaining()
									+ " ngay la het hieu luc (ngay ket thuc=" + contract.getEndDate()
									+ "), gui toi ke toan va nguoi phu trach=" + contract.getCreatedBy());

					log.info("CONTRACT_EXPIRY_REMINDER_SENT contractId={} code={} daysRemaining={}",
							contract.getId(), contract.getContractCode(), alert.daysRemaining());
					return alert;
				})
				.toList();
	}

	@Override
	@Transactional(readOnly = true)
	public List<ContractExpiryAlertRes> listOverdueActiveContracts() {
		List<Contract> overdue = contractRepository.findByStatusAndEndDateBefore(
				ContractStatus.ACTIVE, LocalDate.now());
		return overdue.stream()
				.map(contract -> toAlert(contract, "OVERDUE_ACTIVE"))
				.toList();
	}

	private ContractExpiryAlertRes toAlert(Contract contract, String alertType) {
		long daysRemaining = ChronoUnit.DAYS.between(LocalDate.now(), contract.getEndDate());
		return new ContractExpiryAlertRes(
				contract.getId(),
				contract.getContractCode(),
				contract.getName(),
				contract.getCustomerId(),
				contract.getEndDate(),
				daysRemaining,
				contract.getStatus() == null ? null : contract.getStatus().name(),
				contract.getCreatedBy(),
				alertType
		);
	}
}
