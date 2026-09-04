package com.serviceops.modules.opportunity.entity;

import com.serviceops.common.entity.BaseEntity;
import com.serviceops.modules.opportunity.enums.OpportunityStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

/**
 * Co hoi ban hang (Epic NCL-03).
 *
 * <p>Pham vi hien thuc hien tai chi gom cac truong can thiet de
 * {@code NCL-03-CN-006} (ghi nhan hoat dong cham soc co hoi) hoat dong duoc:
 * dinh danh co hoi, khach hang gan voi, va trang thai mo/dong quyet dinh co
 * con duoc them hoat dong moi hay khong (TC-02). Cac truong con lai (gia tri
 * du kien, giai doan ban hang, nguoi phu trach, ket qua thang/thua...) se
 * duoc bo sung bang migration rieng khi trien khai {@code NCL-03-CN-001},
 * {@code 002}, {@code 005} — giong cach bang {@code customers} da tien hoa
 * dan qua nhieu migration (V20, V25, V26, V34) thay vi tao san tu dau.</p>
 */
@Getter
@Setter
@Entity
@Table(name = "opportunities")
public class Opportunity extends BaseEntity {

	@Column(name = "customer_id", nullable = false)
	private Long customerId;

	@Column(nullable = false, length = 255)
	private String name;

	/** TC-02: chi co hoi con "mo" ({@link OpportunityStatus#OPEN}) moi duoc them hoat dong cham soc moi. */
	@Enumerated(EnumType.STRING)
	@Column(nullable = false, columnDefinition = "VARCHAR(10)")
	private OpportunityStatus status = OpportunityStatus.OPEN;

	@Column(name = "created_by", length = 100)
	private String createdBy;

	@Column(name = "created_at", nullable = false)
	private LocalDateTime createdAt;
}
