package com.serviceops.modules.contract.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;

import java.util.List;

/**
 * Request khai bao danh sach moc thanh toan cua hop dong (NCL-04-CN-003).
 *
 * <p>Moi lan luu thay the toan bo danh sach moc hien co cua hop dong (khong
 * phai them noi tiep). Tong so tien cua {@code milestones} phai dung bang gia
 * tri hop dong, kiem soat boi {@code MilestoneTotalValidator} (TC-01/TC-02).</p>
 */
public record MilestoneCreateReq(
		@NotEmpty(message = "Phai co it nhat mot moc thanh toan")
		@Valid
		List<MilestoneItemReq> milestones
) {}
