package com.serviceops.modules.invoice.repository;

import com.serviceops.modules.invoice.entity.RecurringInvoiceSchedule;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface RecurringInvoiceScheduleRepository extends JpaRepository<RecurringInvoiceSchedule, Long> {

	Optional<RecurringInvoiceSchedule> findByContractId(Long contractId);

	List<RecurringInvoiceSchedule> findByActiveTrue();
}
