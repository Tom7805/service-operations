package com.serviceops.modules.invoice.entity;

import com.serviceops.common.entity.BaseEntity;
import com.serviceops.modules.invoice.enums.DunningStage;
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
 * Một lần nhắc thu nợ đã gửi cho một hóa đơn (NCL-10-CN-006) — lịch sử nhắc nợ riêng của hóa đơn,
 * tách khỏi bảng {@code notifications} (nơi lưu từng thông báo cho từng người nhận). Ràng buộc
 * UNIQUE(invoice_id, stage, reference_date) ở tầng DB (khớp {@code uq_dunning_logs_cycle}) là chốt
 * cuối chặn gửi trùng (QTN-27) khi tác vụ chạy lại nhiều lần trong cùng ngày (TC-02).
 */
@Getter
@Setter
@Entity
@Table(name = "dunning_logs")
public class DunningLog extends BaseEntity {

	@Column(name = "invoice_id", nullable = false)
	private Long invoiceId;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, columnDefinition = "VARCHAR(30)")
	private DunningStage stage;

	/** Mốc gắn với lần nhắc này: hạn thanh toán (UPCOMING_3_DAYS/DUE_TODAY) hoặc mốc 7 ngày quá hạn (OVERDUE). */
	@Column(name = "reference_date", nullable = false)
	private LocalDate referenceDate;

	/** Số ngày quá hạn tại thời điểm nhắc; NULL với UPCOMING_3_DAYS/DUE_TODAY. */
	@Column(name = "days_overdue")
	private Integer daysOverdue;

	@Column(name = "remaining_amount", nullable = false, precision = 18, scale = 2)
	private BigDecimal remainingAmount;

	/** Danh sách id người nhận, phân cách bởi dấu phẩy (Kế toán + người phụ trách khách hàng). */
	@Column(name = "recipient_ids", nullable = false, length = 500)
	private String recipientIds;

	@Column(name = "sent_at", nullable = false)
	private LocalDateTime sentAt;
}
