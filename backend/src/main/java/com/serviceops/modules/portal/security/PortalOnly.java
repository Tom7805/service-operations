package com.serviceops.modules.portal.security;

import org.springframework.security.access.prepost.PreAuthorize;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Chi tai khoan cong khach hang (VT-09) goi duoc (QTN-26). {@code SecurityConfig} da chan
 * {@code /portal/**} voi vai tro khac o tang bo loc; annotation nay chan lan nua o tang phuong thuc de
 * controller khong phu thuoc vao quy tac duong dan.
 */
@Target({ElementType.TYPE, ElementType.METHOD})
@Retention(RetentionPolicy.RUNTIME)
@Documented
@PreAuthorize("hasRole('VT-09')")
public @interface PortalOnly {
}
