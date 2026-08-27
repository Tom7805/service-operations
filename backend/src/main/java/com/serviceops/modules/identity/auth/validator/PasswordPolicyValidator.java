package com.serviceops.modules.identity.auth.validator;

import com.serviceops.common.exception.BusinessRuleException;
import com.serviceops.common.exception.ErrorCode;
import java.util.regex.Pattern;
import org.springframework.stereotype.Component;

/**
 * Quy tắc "mật khẩu mới hợp lệ" dùng chung cho cả đổi mật khẩu và đặt lại mật
 * khẩu (NCL-01-CN-008): tối thiểu 8 ký tự, có ít nhất một chữ cái và một chữ
 * số. Tách riêng thành validator để hai luồng (change/reset) không lệch luật.
 */
@Component
public class PasswordPolicyValidator {

    private static final int MIN_LENGTH = 8;
    private static final Pattern HAS_LETTER = Pattern.compile("[A-Za-z]");
    private static final Pattern HAS_DIGIT = Pattern.compile("[0-9]");

    public void validate(String rawPassword) {
        if (rawPassword == null || rawPassword.length() < MIN_LENGTH) {
            throw new BusinessRuleException(ErrorCode.VALIDATION_ERROR,
                    "Mật khẩu mới phải có ít nhất " + MIN_LENGTH + " ký tự");
        }
        if (!HAS_LETTER.matcher(rawPassword).find() || !HAS_DIGIT.matcher(rawPassword).find()) {
            throw new BusinessRuleException(ErrorCode.VALIDATION_ERROR,
                    "Mật khẩu mới phải chứa cả chữ cái và chữ số");
        }
    }
}
