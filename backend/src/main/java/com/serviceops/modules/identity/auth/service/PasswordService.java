package com.serviceops.modules.identity.auth.service;

import com.serviceops.modules.identity.auth.dto.request.ChangePasswordReq;
import com.serviceops.modules.identity.auth.dto.request.ForgotPasswordReq;
import com.serviceops.modules.identity.auth.dto.request.ResetPasswordReq;

/**
 * Xử lý nghiệp vụ đổi mật khẩu (người dùng đang đăng nhập) và khôi phục mật
 * khẩu (quên mật khẩu → gửi liên kết qua thư điện tử mô phỏng → đặt lại).
 *
 * Tương ứng NCL-01-CN-008-CV-03 "Xây dựng xử lý đổi và khôi phục mật khẩu
 * phía máy chủ" — xem phân tích nghiệp vụ chi tiết (CV-01) tại
 * {@code docs/01-backlog/tasks/NCL-01-CN-008-doi-khoi-phuc-mat-khau.md}.
 */
public interface PasswordService {

    /** NCL-01-CN-008-TC-01: đổi mật khẩu khi đang đăng nhập, chấm dứt các phiên khác. */
    void changePassword(Long currentUserId, ChangePasswordReq request);

    /** Khởi tạo yêu cầu khôi phục: tạo liên kết có hạn dùng, gửi qua email mô phỏng. */
    void forgotPassword(ForgotPasswordReq request);

    /** NCL-01-CN-008-TC-02: kiểm tra liên kết khôi phục còn hiệu lực trước khi hiển thị form. */
    /**
     * Ma khoi phuc con dung duoc khong? Can CA email lan ma: ma duoc tra cuu theo
     * nguoi dung roi moi so khop, khong tra cuu bang ma tran.
     *
     * <p>Luu y: goi ham nay KHONG lam tang so lan nhap sai — no chi de giao dien
     * kiem tra truoc, khong phai mot lan thu that.</p>
     */
    boolean isResetCodeValid(String email, String code);

    /** Đặt mật khẩu mới từ liên kết khôi phục còn hiệu lực. */
    void resetPassword(ResetPasswordReq request);
}
