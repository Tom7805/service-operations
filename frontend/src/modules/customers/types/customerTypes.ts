/**
 * Định nghĩa các kiểu dữ liệu cho mô-đun Khách hàng (Customer Profile Module)
 * Tuân thủ Backend API Contract NCL-02-CN-001 (POST /customers)
 */

export interface Customer {
  id: number;
  code: string; // Tự sinh duy nhất dạng KH-xxxxxx
  name: string;
  taxCode?: string | null;
  industry?: string | null;
  address?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface CustomerCreatePayload {
  name: string;
  taxCode?: string;
  industry?: string;
  address?: string;
}

export interface CustomerCreateResponse {
  success: boolean;
  message: string;
  data: Customer;
}

export interface CustomerFormErrors {
  name?: string;
  taxCode?: string;
  industry?: string;
  address?: string;
  general?: string;
}

export type CustomerSortField = 'code' | 'name' | 'taxCode' | 'industry' | 'createdAt';
export type SortOrder = 'asc' | 'desc';
