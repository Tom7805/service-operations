package com.serviceops.modules.contract.entity;

import com.serviceops.common.entity.BaseEntity;
import com.serviceops.modules.contract.enums.ContractStatus;
import com.serviceops.modules.contract.enums.ContractType;
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
 * Hop dong dich vu (NCL-04). Hop dong tao tu co hoi da thang (NCL-04-CN-001,
 * QTN-08) duoc dung san tu khach hang, gia tri va bao gia moi nhat cua co hoi:
 * opportunityId la lien ket nguoc ve co hoi goc de giu duong tu ban hang
 * sang trien khai; rang buoc UNIQUE(opportunity_id) o tang DB dam bao mot co hoi
 * thang chi tao duoc mot hop dong. Hop dong moi khoi tao o trang thai
 * {@link ContractStatus#DRAFT}, nguoi dung bo sung cac thong tin con lai.
 */
@Getter
@Setter
@Entity
@Table(name = "contracts")
public class Contract extends BaseEntity {

/** Ma hop dong duy nhat (HD-xxxx), sinh tu dong o tang service. */
@Column(name = "contract_code", nullable = false, unique = true, length = 50)
private String contractCode;

@Column(nullable = false, length = 255)
private String name;

/**
 * Co hoi goc ma hop dong duoc tao tu (NCL-04-CN-001). NULL voi hop dong
 * khong phat sinh tu pipeline ban hang.
 */
@Column(name = "opportunity_id", unique = true)
private Long opportunityId;

/** Khach hang cua hop dong, lay tu co hoi khi dung san. */
@Column(name = "customer_id", nullable = false)
private Long customerId;

/** Bao gia dung san hop dong, de truy nguoc ve phia ban hang. Khong bat buoc. */
@Column(name = "quote_id")
private Long quoteId;

@Enumerated(EnumType.STRING)
@Column(name = "contract_type", nullable = false, columnDefinition = "VARCHAR(30)")
private ContractType contractType;

/** Gia tri hop dong, dung san tu quotes.total_amount cua bao gia moi nhat. */
@Column(name = "total_value", nullable = false, precision = 18, scale = 2)
private BigDecimal totalValue;

@Column(name = "start_date")
private LocalDate startDate;

/** Ngay ket thuc khong duoc som hon ngay bat dau - kiem soat o tang service. */
@Column(name = "end_date")
private LocalDate endDate;

@Enumerated(EnumType.STRING)
@Column(nullable = false, columnDefinition = "VARCHAR(30)")
private ContractStatus status = ContractStatus.DRAFT;

/** Ghi chu/noi dung bo sung cua nguoi dung khi hoan thien hop dong. */
@Column(length = 1000)
private String notes;

@Column(name = "created_by", length = 100)
private String createdBy;

@Column(name = "created_at", nullable = false)
private LocalDateTime createdAt;
}
