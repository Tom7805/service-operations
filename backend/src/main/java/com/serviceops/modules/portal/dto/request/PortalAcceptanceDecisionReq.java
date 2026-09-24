package com.serviceops.modules.portal.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** NCL-13-CN-003 (TC-02): khach hang tu choi phieu nghiem thu tren cong — bat buoc nhap ly do. */
public record PortalAcceptanceDecisionReq(
		@NotBlank(message = "Vui long nhap ly do tu choi nghiem thu")
		@Size(max = 1000, message = "Ly do tu choi toi da 1000 ky tu") String reason) {
}
