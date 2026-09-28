package com.serviceops.modules.acceptance.dto.request;

import com.serviceops.modules.acceptance.enums.DeliverableType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/** NCL-12-CN-004: khai bao san pham ban giao gan voi mot hang muc cua du an. */
public record DeliverableCreateReq(
		@NotNull(message = "Hang muc cua san pham ban giao khong duoc de trong") Long workPackageId,
		@NotBlank(message = "Ten san pham ban giao khong duoc de trong")
		@Size(max = 255, message = "Ten san pham ban giao toi da 255 ky tu") String name,
		@NotNull(message = "Loai san pham ban giao khong duoc de trong") DeliverableType deliverableType,
		@Size(max = 1000, message = "Mo ta toi da 1000 ky tu") String description) {
}
