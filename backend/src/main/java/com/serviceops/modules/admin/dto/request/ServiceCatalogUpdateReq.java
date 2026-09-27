package com.serviceops.modules.admin.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Sua thong tin mo ta cua dich vu. Gia KHONG sua o day — doi gia la them moc gia moi
 * ({@code POST /service-catalog/{id}/prices}) de giu lai cac moc cu (QTN-28).
 */
public record ServiceCatalogUpdateReq(
		@NotBlank(message = "Ten dich vu khong duoc de trong")
		@Size(max = 255, message = "Ten dich vu khong qua 255 ky tu")
		String name,
		@NotBlank(message = "Don vi tinh khong duoc de trong")
		@Size(max = 50, message = "Don vi tinh khong qua 50 ky tu")
		String unit,
		@Size(max = 1000, message = "Mo ta khong qua 1000 ky tu")
		String description
) {}
