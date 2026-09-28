package com.serviceops.modules.rate.entity;

import com.serviceops.common.entity.BaseEntity;
import com.serviceops.modules.timesheet.enums.WorkType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;

/**
 * He so nhan don gia theo loai hinh cong viec (NCL-07-CN-006).
 *
 * <p>Moi {@link WorkType} chi co dung mot dong (khoa duy nhat) — khac voi
 * {@link BillRate}/{@link ContractBillRate} khong can lich su hieu luc theo
 * ngay vi day la he so nghiep vu it thay doi, khong phai muc gia thuong luong;
 * cap nhat ({@code PUT}) ghi de truc tiep gia tri hien co.</p>
 */
@Getter
@Setter
@Entity
@Table(name = "work_type_rate_factors")
public class WorkTypeRateFactor extends BaseEntity {

	@Enumerated(EnumType.STRING)
	@Column(name = "work_type", nullable = false, unique = true, columnDefinition = "VARCHAR(20)")
	private WorkType workType;

	@Column(name = "factor", nullable = false, precision = 6, scale = 2)
	private BigDecimal factor;
}
