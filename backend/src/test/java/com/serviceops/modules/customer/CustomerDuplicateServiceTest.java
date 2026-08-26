package com.serviceops.modules.customer;

import com.serviceops.modules.customer.dto.response.DuplicateCandidateRes;
import com.serviceops.modules.customer.entity.Customer;
import com.serviceops.modules.customer.repository.CustomerRepository;
import com.serviceops.modules.customer.service.impl.CustomerDuplicateServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.when;

/**
 * Unit test CustomerDuplicateServiceImpl - thuat toan tinh diem giong nhau cho
 * NCL-02-CN-002 (TC-01, TC-03). Quyet dinh co chan luu hay khong dua tren diem nay
 * thuoc ve {@link com.serviceops.modules.customer.validator.CustomerDuplicateValidator},
 * duoc test rieng o {@link CustomerDuplicateValidatorTest}.
 */
@ExtendWith(MockitoExtension.class)
class CustomerDuplicateServiceTest {

	@Mock
	private CustomerRepository customerRepository;

	private CustomerDuplicateServiceImpl service;

	@BeforeEach
	void setUp() {
		service = new CustomerDuplicateServiceImpl(customerRepository);
		lenient().when(customerRepository.findByNameContainingIgnoreCase(anyString())).thenReturn(List.of());
		lenient().when(customerRepository.findByTaxCode(anyString())).thenReturn(Optional.empty());
	}

	private Customer customer(Long id, String name, String taxCode, String phone) {
		Customer c = new Customer();
		c.setId(id);
		c.setCode("KH-" + id);
		c.setName(name);
		c.setTaxCode(taxCode);
		c.setPhone(phone);
		return c;
	}

	@Test
	@DisplayName("TC-01: cung ma so thue thi phai hien ho so nghi trung voi diem giong cao")
	void findsBlockingDuplicateByTaxCode() {
		when(customerRepository.findByTaxCode("0101234567"))
				.thenReturn(Optional.of(customer(1L, "Cong ty TNHH ABC", "0101234567", "0987654321")));

		List<DuplicateCandidateRes> candidates =
				service.findDuplicates("Cong Ty TNHH ABC", "0101234567", "0987654321");

		assertThat(candidates).hasSize(1);
		assertThat(candidates.get(0).similarity()).isGreaterThanOrEqualTo(0.9);
		assertThat(candidates.get(0).matchedFields()).contains("maSoThue");
	}

	@Test
	@DisplayName("TC-03: khong co ho so tuong tu -> tra ve rong")
	void noDuplicateWhenNothingMatches() {
		List<DuplicateCandidateRes> candidates = service.findDuplicates("Cong ty hoan toan moi", "99", "8888888888");

		assertThat(candidates).isEmpty();
	}
}
