package com.serviceops.common.util;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;

/** Chuan hoa tham so phan trang tu request: trang am -> 0, kich thuoc gioi han trong [1, MAX_SIZE]. */
public final class PageRequests {

	public static final int DEFAULT_SIZE = 20;
	public static final int MAX_SIZE = 100;

	private PageRequests() {
	}

	public static PageRequest of(Integer page, Integer size, Sort sort) {
		int safePage = page == null || page < 0 ? 0 : page;
		int safeSize = size == null || size < 1 ? DEFAULT_SIZE : Math.min(size, MAX_SIZE);
		return PageRequest.of(safePage, safeSize, sort);
	}
}
