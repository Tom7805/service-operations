package com.serviceops.modules.contract.entity;

import com.serviceops.common.entity.BaseEntity;
import com.serviceops.modules.contract.enums.ContractAuditAction;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

/**
 * Nhat ky hop dong (NCL-04, TC-04): moi thao tac khai bao/sua doi tren hop dong
 * duoc luu nguoi thuc hien, hanh dong, noi dung va thoi diem. Rieng le voi
 * opportunity_audit_logs vi hop dong co the khong phat sinh tu co hoi.
 */
@Getter
@Setter
@Entity
@Table(name = "contract_audit_logs")
public class ContractAuditLog extends BaseEntity {

/** Hop dong ma dong nhat ky quan tam den; NULL voi thao tac khong gan hop dong cu the. */
@Column(name = "contract_id")
private Long contractId;

@Enumerated(EnumType.STRING)
@Column(name = "action_type", nullable = false, columnDefinition = "VARCHAR(30)")
private ContractAuditAction actionType;

/** Noi dung mo ta thao tac (vd. loai + han muc cu -> moi), toi da 1000 ky tu. */
@Column(length = 1000)
private String detail;

/**
 * Id nguoi thuc hien. Lay tu SecurityContext tai thoi diem thuc hien; voi thao
 * tac chay ngoai phien dang nhap thi luu 0 de van giu duoc su kien.
 */
@Column(name = "actor_id")
private Long actorId;

/** Ten dang nhap nguoi thuc hien, luu song song actorId de tra cuu nhanh. */
@Column(name = "actor_username", length = 100)
private String actorUsername;

/** Ma vai tro nguoi thuc hien (VT-xx) tai thoi diem ghi log, NULL neu khong xac dinh. */
@Column(name = "actor_role", length = 20)
private String actorRole;

@Column(name = "created_at", nullable = false)
private LocalDateTime createdAt;
}