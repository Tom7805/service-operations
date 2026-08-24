package com.serviceops.common.masking;

import com.serviceops.common.api.BaseRes;
import com.serviceops.common.masking.dto.MaskingRuleRes;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Arrays;
import java.util.List;
import java.util.Set;

/**
 * Man hinh cau hinh quy tac che du lieu luong/gia von (NCL-01-CN-005, TC-04).
 * Chi nhan su, ke toan va ban giam doc (cung nhom duoc phep xem du lieu that)
 * moi duoc mo chuc nang nay; vai tro khac bi tu choi va duoc ghi nhat ky boi
 * {@link com.serviceops.common.exception.GlobalExceptionHandler} (QTN-01).
 */
@RestController
@RequestMapping("/masking-rules")
@RequiredArgsConstructor
@PreAuthorize("hasRole('VT-01') or hasRole('VT-05') or hasRole('VT-06')")
public class MaskingRuleController {
	private final DataMaskingService dataMaskingService;

	@GetMapping
	public BaseRes<List<MaskingRuleRes>> findAll() {
		Set<String> allowedRoles = dataMaskingService.allowedRoles();
		List<MaskingRuleRes> rules = Arrays.stream(MaskingLevel.values())
				.map(level -> new MaskingRuleRes(level, level.getLabel(), allowedRoles))
				.toList();
		return BaseRes.ok(rules);
	}
}
