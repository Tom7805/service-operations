package com.serviceops.modules.admin.dto.request;

import jakarta.validation.constraints.Size;

/** NCL-15-CN-003-TC-01: tao ban sao luu theo yeu cau, kem ghi chu tuy chon. */
public record BackupCreateReq(
		@Size(max = 500, message = "Ghi chu khong qua 500 ky tu")
		String note
) {}
