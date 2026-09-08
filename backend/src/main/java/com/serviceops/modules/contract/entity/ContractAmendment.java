package com.serviceops.modules.contract.entity;

import com.serviceops.common.entity.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Phu luc dieu chinh hop dong (NCL-04-CN-004). Moi lan lap phu luc la THEM
 * NOI TIEP mot dong moi ({@code ContractAmendmentServiceImpl}) - khac voi moc
 * thanh toan ({@link ContractMilestone}) la thay the toan bo danh sach. Luu
 * ca gia tri cu ({@code old*}) va gia tri moi ({@code new*}) de giu vet lich
 * su dieu chinh; it nhat mot cap gia tri/thoi han phai khac NULL (TC-02).
 */
@Getter
@Setter
@Entity
@Table(name = "contract_amendments")
public class ContractAmendment extends BaseEntity {

	@Column(name = "contract_id", nullable = false)
	private Long contractId;

	/** Ma phu luc duy nhat (PL-<ma hop dong>-NN), sinh tu dong o tang service theo so thu tu. */
	@Column(name = "amendment_no", nullable = false, unique = true, length = 50)
	private String amendmentNo;

	@Column(nullable = false, length = 500)
	private String reason;

	@Column(name = "old_total_value", precision = 18, scale = 2)
	private BigDecimal oldTotalValue;

	/** Gia tri hop dong moi sau dieu chinh; NULL neu phu luc nay khong dieu chinh gia tri. */
	@Column(name = "new_total_value", precision = 18, scale = 2)
	private BigDecimal newTotalValue;

	@Column(name = "old_end_date")
	private LocalDate oldEndDate;

	/** Ngay ket thuc moi sau dieu chinh; NULL neu phu luc nay khong dieu chinh thoi han. */
	@Column(name = "new_end_date")
	private LocalDate newEndDate;

	/** Ngay phu luc co hieu luc, co the khac ngay lap phu luc. */
	@Column(name = "effective_date", nullable = false)
	private LocalDate effectiveDate;

	@Column(length = 1000)
	private String notes;

	@Column(name = "created_by", length = 100)
	private String createdBy;

	@Column(name = "created_at", nullable = false)
	private LocalDateTime createdAt;
}
