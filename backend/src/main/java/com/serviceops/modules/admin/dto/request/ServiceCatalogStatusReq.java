package com.serviceops.modules.admin.dto.request;

import jakarta.validation.constraints.NotNull;

/** Ngung / mo lai dich vu. Dich vu ngung khong duoc chon khi lap bao gia, hoa don nhung van giu lich su. */
public record ServiceCatalogStatusReq(
		@NotNull(message = "Phai chon trang thai cua dich vu")
		Boolean active
) {}
