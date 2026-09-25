package com.serviceops.modules.admin.backup;

import com.serviceops.common.exception.BusinessRuleException;
import com.serviceops.common.exception.ErrorCode;
import org.springframework.stereotype.Component;

import java.util.concurrent.atomic.AtomicReference;

/**
 * Chi mot thao tac sao luu HOAC phuc hoi chay tai mot thoi diem: sao luu giua luc dang phuc hoi se chup du lieu
 * nua cu nua moi, hai lan phuc hoi chong nhau thi ket qua khong xac dinh. Khoa trong bo nho — du cho mot phien
 * ban ung dung (pham vi do an).
 */
@Component
public class MaintenanceLock {

	private final AtomicReference<String> holder = new AtomicReference<>();

	/** @throws BusinessRuleException {@code INVALID_STATE} neu dang co thao tac khac giu khoa. */
	public void acquire(String operation) {
		if (!holder.compareAndSet(null, operation)) {
			throw new BusinessRuleException(ErrorCode.INVALID_STATE,
					"Dang " + holder.get() + ", vui long thu lai sau khi thao tac do ket thuc");
		}
	}

	public void release() {
		holder.set(null);
	}
}
