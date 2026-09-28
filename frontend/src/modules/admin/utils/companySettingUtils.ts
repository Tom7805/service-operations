import type { CompanyCurrency, CompanySettingReq, CompanySettingRes, FiscalPeriodRes } from '../types/adminTypes';
import type { FieldErrors } from './serviceCatalogUtils';

/** Kiểm tra form cấu hình công ty — khớp `CompanySettingReq` phía backend (NCL-15-CN-002). */

export const MAX_COMPANY_NAME = 255;
export const MAX_ADDRESS = 500;
export const MAX_EMAIL = 255;

export const CURRENCY_OPTIONS: { value: CompanyCurrency; label: string }[] = [
  { value: 'VND', label: 'VND — Việt Nam đồng' },
  { value: 'USD', label: 'USD — Đô la Mỹ' },
  { value: 'EUR', label: 'EUR — Euro' },
];

export const MONTH_LABELS = Array.from({ length: 12 }, (_, i) => `Tháng ${i + 1}`);

export interface CompanyForm {
  companyName: string;
  taxCode: string;
  address: string;
  phone: string;
  email: string;
  currency: CompanyCurrency;
  fiscalYearStartMonth: number;
  standardWorkingDaysPerMonth: string;
}

export function formFromSetting(s: CompanySettingRes): CompanyForm {
  return {
    companyName: s.companyName ?? '',
    taxCode: s.taxCode ?? '',
    address: s.address ?? '',
    phone: s.phone ?? '',
    email: s.email ?? '',
    currency: s.currency ?? 'VND',
    fiscalYearStartMonth: s.fiscalYearStartMonth ?? 1,
    standardWorkingDaysPerMonth: String(s.standardWorkingDaysPerMonth ?? 22),
  };
}

const TAX_CODE = /^\d{10}(-\d{3})?$/;
const PHONE = /^0\d{9,10}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateCompanyForm(f: CompanyForm): FieldErrors {
  const e: FieldErrors = {};
  const name = f.companyName.trim();
  if (!name) e.companyName = 'Nhập tên công ty — tên được in trên báo giá, hóa đơn và báo cáo.';
  else if (name.length > MAX_COMPANY_NAME) e.companyName = `Tên công ty tối đa ${MAX_COMPANY_NAME} ký tự.`;
  const tax = f.taxCode.trim();
  if (tax && !TAX_CODE.test(tax)) e.taxCode = 'Mã số thuế gồm 10 chữ số (VD 0101234567); chi nhánh thêm “-XXX”.';
  if (f.address.trim().length > MAX_ADDRESS) e.address = `Địa chỉ tối đa ${MAX_ADDRESS} ký tự.`;
  const phone = f.phone.replace(/[\s.]/g, '');
  if (phone && !PHONE.test(phone)) e.phone = 'Số điện thoại gồm 10–11 chữ số, bắt đầu bằng 0.';
  const email = f.email.trim();
  if (email && (!EMAIL.test(email) || email.length > MAX_EMAIL)) e.email = 'Email không đúng định dạng.';
  if (!(f.fiscalYearStartMonth >= 1 && f.fiscalYearStartMonth <= 12)) e.fiscalYearStartMonth = 'Chọn tháng từ 1 đến 12.';
  const days = f.standardWorkingDaysPerMonth.trim();
  if (!/^\d+$/.test(days) || Number(days) < 1 || Number(days) > 31) {
    e.standardWorkingDaysPerMonth = 'Số ngày công chuẩn là số nguyên từ 1 đến 31.';
  }
  return e;
}

/** Trường trống gửi `null` (backend chấp nhận rỗng / null cho trường tùy chọn). */
export function toRequest(f: CompanyForm): CompanySettingReq {
  const opt = (v: string) => (v.trim() ? v.trim() : null);
  return {
    companyName: f.companyName.trim(),
    taxCode: opt(f.taxCode),
    address: opt(f.address),
    phone: opt(f.phone.replace(/[\s.]/g, '')),
    email: opt(f.email),
    currency: f.currency,
    fiscalYearStartMonth: f.fiscalYearStartMonth,
    standardWorkingDaysPerMonth: Number(f.standardWorkingDaysPerMonth.trim()),
  };
}

export function sameForm(a: CompanyForm, b: CompanyForm): boolean {
  return JSON.stringify(toComparable(a)) === JSON.stringify(toComparable(b));
}

function toComparable(f: CompanyForm) {
  return { ...f, companyName: f.companyName.trim(), taxCode: f.taxCode.trim(), address: f.address.trim(), phone: f.phone.trim(), email: f.email.trim(), standardWorkingDaysPerMonth: f.standardWorkingDaysPerMonth.trim() };
}

/* ---------- Kỳ tài chính: cùng quy tắc với FiscalPeriodService phía backend ---------- */

const pad = (n: number) => String(n).padStart(2, '0');

function lastDay(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

/** Năm tài chính chứa ngày `iso` khi năm bắt đầu từ `startMonth` — mang số năm dương lịch của ngày bắt đầu. */
export function fiscalYearOf(iso: string, startMonth: number): number {
  const [y, m] = iso.split('-').map(Number);
  return m >= startMonth ? y : y - 1;
}

/** Chia năm tài chính — dùng để xem trước ngay trên form trước khi lưu (TC-01). */
export function computeFiscalYear(fiscalYear: number, startMonth: number): FiscalPeriodRes {
  const months = Array.from({ length: 12 }, (_, i) => {
    const idx = startMonth - 1 + i;
    const y = fiscalYear + Math.floor(idx / 12);
    const m = (idx % 12) + 1;
    return {
      period: i + 1,
      yearMonth: `${y}-${pad(m)}`,
      startDate: `${y}-${pad(m)}-01`,
      endDate: `${y}-${pad(m)}-${pad(lastDay(y, m))}`,
    };
  });
  const quarters = [0, 1, 2, 3].map((q) => ({
    quarter: q + 1,
    startDate: months[q * 3].startDate,
    endDate: months[q * 3 + 2].endDate,
  }));
  return { fiscalYear, startMonth, startDate: months[0].startDate, endDate: months[11].endDate, quarters, months };
}

/** Nhãn ngắn "T4/2026" cho một tháng yyyy-MM. */
export function monthLabel(yearMonth: string): string {
  const [y, m] = yearMonth.split('-');
  return `T${Number(m)}/${y}`;
}
