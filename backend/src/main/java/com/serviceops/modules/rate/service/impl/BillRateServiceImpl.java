package com.serviceops.modules.rate.service.impl;

import com.serviceops.modules.rate.dto.response.BillRateRes;
import com.serviceops.modules.rate.repository.BillRateRepository;
import com.serviceops.modules.rate.service.BillRateService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

@Service
@Transactional(readOnly = true)
public class BillRateServiceImpl implements BillRateService {

	private final BillRateRepository billRateRepository;

	public BillRateServiceImpl(BillRateRepository billRateRepository) {
		this.billRateRepository = billRateRepository;
	}

	@Override
	public List<BillRateRes> listCurrentlyEffective() {
		return billRateRepository.findAllCurrentlyEffective(LocalDate.now()).stream()
				.map(rate -> new BillRateRes(rate.getProfessionalRole(), rate.getDailyRate(), rate.getEffectiveFrom()))
				.toList();
	}
}
