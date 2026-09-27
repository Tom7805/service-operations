package com.serviceops.modules.identity.employee.entity;

import com.serviceops.common.entity.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;

/**
 * Ngày nghỉ lễ của công ty — không tính vào giờ làm việc chuẩn (QTN-23). {@code recurringYearly} dùng cho ngày lễ
 * cố định theo dương lịch (1/1, 30/4, 1/5, 2/9): áp dụng cho cùng ngày/tháng của mọi năm từ năm của {@code holidayDate}.
 */
@Getter
@Setter
@Entity
@Table(name = "holidays")
public class Holiday extends BaseEntity {

	@Column(nullable = false, length = 255)
	private String name;

	@Column(name = "holiday_date", nullable = false)
	private LocalDate holidayDate;

	@Column(name = "recurring_yearly", nullable = false)
	private boolean recurringYearly;
}
