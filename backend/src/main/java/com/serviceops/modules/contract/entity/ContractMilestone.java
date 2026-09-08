package com.serviceops.modules.contract.entity;

import com.serviceops.common.entity.BaseEntity;
import com.serviceops.modules.contract.enums.MilestoneStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Moc thanh toan cua hop dong (NCL-04-CN-003). Moi lan luu thay the toan bo
 * danh sach moc cua mot hop dong ({@code ContractMilestoneServiceImpl}); tong
 * {@code amount} cua danh sach phai dung bang {@code total_value} cua hop dong
 * (TC-01 luong thanh cong, TC-02 vuot gia tri thi tu choi luu).
 *
 * <p>{@code status} mac dinh {@link MilestoneStatus#PLANNED} - cac story sau
 * (NCL-12 Nghiem thu va ban giao, QTN-25) se cap nhat khi moc duoc gan voi
 * phieu nghiem thu da ky va mo khoa xuat hoa don.</p>
 */
@Getter
@Setter
@Entity
@Table(name = "contract_milestones")
public class ContractMilestone extends BaseEntity {

	@Column(name = "contract_id", nullable = false)
	private Long contractId;

	@Column(nullable = false, length = 255)
	private String name;

	/** Ty le phan tram cua moc so voi gia tri hop dong; co the null neu nguoi dung nhap truc tiep so tien. */
	@Column(precision = 5, scale = 2)
	private BigDecimal percentage;

	/** So tien cua moc - da duoc quy doi tu ty le neu nguoi dung chi nhap ty le. */
	@Column(nullable = false, precision = 18, scale = 2)
	private BigDecimal amount;

	@Column(name = "expected_date")
	private LocalDate expectedDate;

	@Column(name = "acceptance_condition", length = 500)
	private String acceptanceCondition;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, columnDefinition = "VARCHAR(30)")
	private MilestoneStatus status = MilestoneStatus.PLANNED;

	/** Thu tu hien thi cua moc trong danh sach, tinh theo vi tri trong request. */
	@Column(name = "sort_order", nullable = false)
	private Integer sortOrder = 0;

	@Column(name = "created_at", nullable = false)
	private LocalDateTime createdAt;
}
