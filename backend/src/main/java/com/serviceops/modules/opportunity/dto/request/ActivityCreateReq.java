package com.serviceops.modules.opportunity.dto.request;

import com.serviceops.modules.opportunity.enums.ActivityType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDateTime;

/** NCL-03-CN-006 (TC-01): du lieu tao mot hoat dong cham soc cho co hoi. */
public record ActivityCreateReq(
	@NotNull(message = "Loai hoat dong khong duoc de trong")
	ActivityType activityType,

	@NotNull(message = "Thoi diem hoat dong khong duoc de trong")
	LocalDateTime occurredAt,

	@Size(max = 500, message = "Nguoi tham gia khong qua 500 ky tu")
	String participants,

	@NotBlank(message = "Noi dung trao doi khong duoc de trong")
	@Size(max = 2000, message = "Noi dung trao doi khong qua 2000 ky tu")
	String content
) {}
