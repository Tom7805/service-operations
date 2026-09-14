package com.serviceops.config;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Khoa lai mot dam bao BAO MAT ma khong test hanh vi nao bat duoc: o profile
 * {@code prod}, duong du phong "ghi lien ket khoi phuc ra log khi gui thu that
 * bai" phai BI TAT VINH VIEN va khong the bat lai bang bien moi truong.
 *
 * <p>Vi sao kiem tra bang cach doc file cau hinh chu khong khoi dong ung dung:
 * dam bao o day khong nam o hanh vi luc chay ma nam o CACH VIET cau hinh. Neu
 * ai do doi</p>
 *
 * <pre>    fallback-to-log: false</pre>
 *
 * <p>thanh</p>
 *
 * <pre>    fallback-to-log: ${MAIL_FALLBACK_TO_LOG:false}</pre>
 *
 * <p>thi ung dung van chay dung y het, moi test hanh vi van xanh, va khong ai
 * nhan ra gi — cho toi khi mot dong bien moi truong dat sai luc trien khai mo
 * lai lo hong: ai doc duoc log se dat lai duoc mat khau nguoi khac.</p>
 *
 * <p>Khoi dong that voi profile prod cung khong kiem duoc dieu nay, vi no doi
 * mot CSDL that. Doc file la cach duy nhat kiem dung cai can kiem.</p>
 */
class ProdMailConfigContractTest {

    private static final Path PROD_YML =
            Path.of("src/main/resources/application-prod.yml");

    @Test
    @DisplayName("prod: fallback-to-log phai la false GHIM CUNG, khong qua bien moi truong")
    void prodGhimCungFallbackToLog() throws IOException {
        String noiDung = Files.readString(PROD_YML, StandardCharsets.UTF_8);

        // Loai bo dong chu thich de khong khop nham vao phan giai thich
        String chiCauHinh = noiDung.lines()
                .filter(d -> !d.strip().startsWith("#"))
                .reduce("", (a, b) -> a + "\n" + b);

        assertThat(chiCauHinh)
                .as("application-prod.yml phai ghim fallback-to-log: false")
                .contains("fallback-to-log: false");

        assertThat(chiCauHinh)
                .as("KHONG duoc doc tu bien moi truong — mot dong bien dat sai luc "
                        + "trien khai la du mo lai lo hong chiem tai khoan qua log")
                .doesNotContain("fallback-to-log: ${");
    }

    @Test
    @DisplayName("prod: khong duoc ghi de logger AUDIT_MOCK_EMAIL sang muc de lo token")
    void prodKhongHaMucLogAuditMockEmail() throws IOException {
        String noiDung = Files.readString(PROD_YML, StandardCharsets.UTF_8);
        assertThat(noiDung)
                .as("neu can bat logger nay o prod thi phai ra soat lai — no la kenh in lien ket khoi phuc")
                .doesNotContain("AUDIT_MOCK_EMAIL");
    }
}
