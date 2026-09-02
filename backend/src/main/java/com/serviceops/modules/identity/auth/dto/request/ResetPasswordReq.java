package com.serviceops.modules.identity.auth.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ResetPasswordReq {

    /**
     * Email da nhap o buoc "quen mat khau".
     *
     * <p>BAT BUOC ke tu khi chuyen sang ma 6 so. May chu tra cuu ma theo NGUOI
     * DUNG roi moi so khop, chu khong tra cuu bang ma tran — neu tra cuu bang ma
     * tran thi voi khong gian 1.000.000, mot ma doan bua co the trung vao ma dang
     * hieu luc cua mot nguoi dung bat ky khac.</p>
     */
    @NotBlank(message = "Thiếu địa chỉ email")
    @Email(message = "Địa chỉ email không hợp lệ")
    private String email;

    /** Ma 6 chu so gui qua thu dien tu. */
    @NotBlank(message = "Vui lòng nhập mã khôi phục")
    @Pattern(regexp = "\\d{6}", message = "Mã khôi phục gồm đúng 6 chữ số")
    private String code;

    @NotBlank(message = "Vui lòng nhập mật khẩu mới")
    private String newPassword;
}
