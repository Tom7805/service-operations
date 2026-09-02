package com.serviceops.modules.identity.auth.repository;

import com.serviceops.modules.identity.auth.entity.PasswordResetToken;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PasswordResetTokenRepository extends JpaRepository<PasswordResetToken, Long> {

    /**
     * Tra cuu theo BAN BAM SHA-256, khong phai ma tho.
     *
     * <p>Ben goi phai tu bam roi truyen ban bam vao day. Khong co phuong thuc tra
     * cuu theo ma tho, va do la co y: neu con mot duong tra cuu nhu vay thi som
     * muon cung co nguoi luu ma tho tro lai.</p>
     */
    Optional<PasswordResetToken> findByTokenHash(String tokenHash);

    /**
     * Ma khoi phuc MOI NHAT chua dung cua mot nguoi dung.
     *
     * <p>Ke tu khi chuyen sang ma 6 so, KHONG duoc tra cuu bang ma tran nua. Hai
     * ly do:</p>
     * <ol>
     *   <li><b>Tranh trung cheo.</b> Voi khong gian chi 1.000.000, mot ma doan bua
     *       co the trung vao ma dang hieu luc cua MOT NGUOI DUNG BAT KY khac. Tra
     *       cuu theo nguoi dung roi moi so khop thi dieu do khong xay ra.</li>
     *   <li><b>De dem duoc so lan sai.</b> Muon tang {@code attempts} thi phai biet
     *       tang tren ban ghi NAO. Tra cuu bang ma sai thi khong tim thay gi ca,
     *       nen khong co gi de dem — va khong dem duoc thi rao chan chong do
     *       khong ton tai.</li>
     * </ol>
     */
    Optional<PasswordResetToken> findFirstByUserIdAndUsedAtIsNullOrderByIdDesc(Long userId);
}
