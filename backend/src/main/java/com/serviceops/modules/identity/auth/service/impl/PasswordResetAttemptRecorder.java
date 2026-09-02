package com.serviceops.modules.identity.auth.service.impl;

import com.serviceops.modules.identity.auth.entity.PasswordResetToken;
import com.serviceops.modules.identity.auth.repository.PasswordResetTokenRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/**
 * Ghi nhan mot lan nhap SAI ma khoi phuc, trong mot GIAO DICH RIENG.
 *
 * <p><b>Vi sao phai tach ra thanh mot bean rieng.</b> Viec dem so lan sai truoc
 * day nam thang trong {@code resetPassword}, von mang {@code @Transactional}, va
 * ngay sau khi dem thi phuong thuc do NEM LOI de tu choi yeu cau. Nem loi runtime
 * lam Spring CUON NGUOC ca giao dich — keo theo xoa luon con so vua dem. Ket qua:
 * bo dem luon quay ve 0, va rao chan chong do ma khong ton tai.</p>
 *
 * <p>Do la loi that va no da lot qua unit test: test dung mock nen doi tuong giu
 * nguyen gia tri trong bo nho, khong he co giao dich nao de ma cuon nguoc. Chi khi
 * CHAY THAT moi lo ra — nhap sai 5 lan roi nhap dung, va ma van duoc chap nhan.</p>
 *
 * <p>{@code REQUIRES_NEW} tao mot giao dich doc lap: no commit ngay khi phuong
 * thuc nay ket thuc, khong lien quan gi toi so phan cua giao dich goi no. Va vi
 * Spring dung proxy, goi tu chinh lop cu se KHONG di qua proxy nen annotation
 * mat tac dung — bat buoc phai la mot bean khac, khong the la mot phuong thuc
 * private trong cung lop.</p>
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class PasswordResetAttemptRecorder {

    private final PasswordResetTokenRepository repository;

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void ghiNhanLanSai(Long tokenId, Long userId) {
        repository.findById(tokenId).ifPresent(token -> {
            token.setAttempts(token.getAttempts() + 1);
            repository.save(token);
            log.warn("PASSWORD_RESET_CODE_SAI userId={} lanThu={}/{}",
                    userId, token.getAttempts(), PasswordResetToken.MAX_ATTEMPTS);
        });
    }
}
