package com.serviceops.modules.opportunity.dto.response;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Response co hoi ban hang (NCL-03-CN-001).
 *
 * @param customerName Ten khach hang de hien thi (lay tu bang customers).
 * @param lossReason Ly do thua (NCL-03-CN-005) — chi co gia tri khi {@code stage = LOST}, nguoc lai {@code null}.
 * @param closeReasonDetail Ghi chu chi tiet them cho ket qua dong co hoi, {@code null} neu chua dong hoac khong nhap.
 * @param competitorName Ten doi thu canh tranh neu co, {@code null} neu chua dong hoac khong nhap.
 * @param closedAt Thoi diem dong co hoi (ket qua WON/LOST), {@code null} neu co hoi con dang mo.
 * @param daysInCurrentStage So ngay co hoi da nam o giai doan hien tai — cung mot cach tinh voi
 *        Bao cao duong ong (NCL-03-CN-007), de nguoi dung biet mot co hoi da "dung" bao lau va con
 *        bao nhieu ngay la den nguong canh bao qua han xu ly ({@code stalledThresholdDays}).
 * @param stalledThresholdDays Nguong (ngay) coi la qua han xu ly — hang so nghiep vu, giong het gia
 *        tri tra ve trong {@code PipelineReportRes}, lap lai o day de Frontend khong phai tu suy doan.
 */
public record OpportunityRes(
	Long id,
	String name,
	Long customerId,
	String customerName,
	BigDecimal expectedValue,
	LocalDate expectedCloseDate,
	String stage,
	String status,
	BigDecimal probability,
	Long ownerId,
	String createdBy,
	LocalDateTime createdAt,
	String lossReason,
	String closeReasonDetail,
	String competitorName,
	LocalDateTime closedAt,
	Long daysInCurrentStage,
	Integer stalledThresholdDays
) {}