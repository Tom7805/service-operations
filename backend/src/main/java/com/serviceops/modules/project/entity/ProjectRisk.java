package com.serviceops.modules.project.entity;

import com.serviceops.common.entity.BaseEntity;
import com.serviceops.modules.project.enums.RiskLevel;
import com.serviceops.modules.project.enums.RiskStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

/**
 * NCL-05-CN-009: rui ro cua du an — mo ta, muc tac dong, kha nang xay ra,
 * bien phap giam thieu va nguoi theo doi (watcher).
 *
 * <p>Diem rui ro va muc do rui ro (severity) KHONG luu DB ma tinh dong khi doc tu
 * {@code impact} x {@code likelihood} (xem {@link RiskLevel}).</p>
 */
@Getter
@Setter
@Entity
@Table(name = "project_risks")
public class ProjectRisk extends BaseEntity {

	@Column(name = "project_id", nullable = false)
	private Long projectId;

	@Column(nullable = false, columnDefinition = "TEXT")
	private String description;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, columnDefinition = "VARCHAR(10)")
	private RiskLevel impact;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, columnDefinition = "VARCHAR(10)")
	private RiskLevel likelihood;

	/** Bien phap giam thieu; null nghia la chua khai bao. */
	@Column(columnDefinition = "TEXT")
	private String mitigation;

	/** Nguoi theo doi rui ro — tro toi {@code users.id}. */
	@Column(name = "watcher_id", nullable = false)
	private Long watcherId;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, columnDefinition = "VARCHAR(15)")
	private RiskStatus status = RiskStatus.OPEN;

	@Column(name = "created_by", length = 100)
	private String createdBy;

	@Column(name = "created_at", nullable = false)
	private LocalDateTime createdAt;

	@Column(name = "updated_at", nullable = false)
	private LocalDateTime updatedAt;

	/** Diem rui ro 1..9 = trong so impact x trong so likelihood (tinh dong). */
	public int score() {
		return impact.weight() * likelihood.weight();
	}

	/** Muc do rui ro suy ra tu {@link #score()} (tinh dong). */
	public RiskLevel severity() {
		return RiskLevel.fromScore(score());
	}
}
