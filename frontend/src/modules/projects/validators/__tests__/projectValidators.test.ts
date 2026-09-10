import { describe, expect, it } from 'vitest';
import {
  validateProjectCreateForm,
  validateProjectCreateFromTemplateForm,
} from '../projectValidators';


describe('projectValidators (NCL-05-CN-001 — Tạo dự án từ hợp đồng)', () => {
  it('TC-01: chấp nhận dữ liệu hợp lệ đầy đủ', () => {
    const result = validateProjectCreateForm({
      name: 'Triển khai ERP cho ABC',
      startDate: '2027-01-01',
      expectedEndDate: '2027-12-31',
      projectManagerId: 7,
    });

    expect(result.isValid).toBe(true);
    expect(result.errors).toEqual({});
  });

  it('TC-03a: từ chối tên dự án để trống hoặc chỉ có khoảng trắng', () => {
    const emptyResult = validateProjectCreateForm({
      name: '',
      startDate: '2027-01-01',
      expectedEndDate: '2027-12-31',
      projectManagerId: 7,
    });
    expect(emptyResult.isValid).toBe(false);
    expect(emptyResult.errors.name).toBe('Tên dự án không được để trống');

    const whitespaceResult = validateProjectCreateForm({
      name: '    ',
      startDate: '2027-01-01',
      expectedEndDate: '2027-12-31',
      projectManagerId: 7,
    });
    expect(whitespaceResult.isValid).toBe(false);
    expect(whitespaceResult.errors.name).toBe('Tên dự án không được để trống');
  });

  it('TC-03a: từ chối tên dự án vượt quá 255 ký tự', () => {
    const longName = 'A'.repeat(256);
    const result = validateProjectCreateForm({
      name: longName,
      startDate: '2027-01-01',
      expectedEndDate: '2027-12-31',
      projectManagerId: 7,
    });
    expect(result.isValid).toBe(false);
    expect(result.errors.name).toBe('Tên dự án không được vượt quá 255 ký tự');
  });

  it('TC-03b: từ chối khi thiếu ngày bắt đầu', () => {
    const result = validateProjectCreateForm({
      name: 'Dự án ERP',
      startDate: '',
      expectedEndDate: '2027-12-31',
      projectManagerId: 7,
    });
    expect(result.isValid).toBe(false);
    expect(result.errors.startDate).toBe('Ngày bắt đầu không được để trống');
  });

  it('TC-03b: từ chối khi thiếu ngày kết thúc dự kiến', () => {
    const result = validateProjectCreateForm({
      name: 'Dự án ERP',
      startDate: '2027-01-01',
      expectedEndDate: '',
      projectManagerId: 7,
    });
    expect(result.isValid).toBe(false);
    expect(result.errors.expectedEndDate).toBe('Ngày kết thúc dự kiến không được để trống');
  });

  it('TC-03c: từ chối khi ngày kết thúc dự kiến sớm hơn ngày bắt đầu', () => {
    const result = validateProjectCreateForm({
      name: 'Dự án ERP',
      startDate: '2027-10-01',
      expectedEndDate: '2027-09-30',
      projectManagerId: 7,
    });
    expect(result.isValid).toBe(false);
    expect(result.errors.expectedEndDate).toBe(
      'Ngày kết thúc dự kiến không được sớm hơn ngày bắt đầu'
    );
  });

  it('TC-03c: chấp nhận khi ngày kết thúc trùng ngày bắt đầu', () => {
    const result = validateProjectCreateForm({
      name: 'Dự án 1 ngày',
      startDate: '2027-10-01',
      expectedEndDate: '2027-10-01',
      projectManagerId: 7,
    });
    expect(result.isValid).toBe(true);
    expect(result.errors).toEqual({});
  });

  it('TC-03d: từ chối khi thiếu người quản lý dự án hoặc ID <= 0', () => {
    const missingResult = validateProjectCreateForm({
      name: 'Dự án ERP',
      startDate: '2027-01-01',
      expectedEndDate: '2027-12-31',
      projectManagerId: undefined,
    });
    expect(missingResult.isValid).toBe(false);
    expect(missingResult.errors.projectManagerId).toBe('Người quản lý dự án không được để trống');

    const zeroResult = validateProjectCreateForm({
      name: 'Dự án ERP',
      startDate: '2027-01-01',
      expectedEndDate: '2027-12-31',
      projectManagerId: 0,
    });
    expect(zeroResult.isValid).toBe(false);
    expect(zeroResult.errors.projectManagerId).toBe('Người quản lý dự án không được để trống');

    const negativeResult = validateProjectCreateForm({
      name: 'Dự án ERP',
      startDate: '2027-01-01',
      expectedEndDate: '2027-12-31',
      projectManagerId: -5,
    });
    expect(negativeResult.isValid).toBe(false);
    expect(negativeResult.errors.projectManagerId).toBe('Người quản lý dự án không được để trống');
  });
});


describe('projectValidators - NCL-05-CN-007 (Tạo dự án từ mẫu)', () => {
  it('báo lỗi khi chưa chọn mẫu dự án hoặc templateId <= 0', () => {
    const res1 = validateProjectCreateFromTemplateForm({ templateId: undefined });
    expect(res1.isValid).toBe(false);
    expect(res1.errors.templateId).toContain('Vui lòng chọn mẫu dự án');

    const res2 = validateProjectCreateFromTemplateForm({ templateId: 0 });
    expect(res2.isValid).toBe(false);
    expect(res2.errors.templateId).toContain('Vui lòng chọn mẫu dự án');
  });

  it('báo lỗi khi tên dự án bị để trống hoặc chỉ có khoảng trắng', () => {
    const res1 = validateProjectCreateFromTemplateForm({ name: '' });
    expect(res1.isValid).toBe(false);
    expect(res1.errors.name).toContain('Tên dự án không được để trống');

    const res2 = validateProjectCreateFromTemplateForm({ name: '   ' });
    expect(res2.isValid).toBe(false);
    expect(res2.errors.name).toContain('Tên dự án không được để trống');
  });

  it('báo lỗi khi tên dự án vượt quá 255 ký tự', () => {
    const res = validateProjectCreateFromTemplateForm({ name: 'A'.repeat(256) });
    expect(res.isValid).toBe(false);
    expect(res.errors.name).toContain('không được vượt quá 255 ký tự');
  });

  it('báo lỗi khi thiếu ngày bắt đầu hoặc ngày kết thúc dự kiến', () => {
    const res1 = validateProjectCreateFromTemplateForm({ startDate: '' });
    expect(res1.isValid).toBe(false);
    expect(res1.errors.startDate).toContain('Ngày bắt đầu không được để trống');

    const res2 = validateProjectCreateFromTemplateForm({ expectedEndDate: '' });
    expect(res2.isValid).toBe(false);
    expect(res2.errors.expectedEndDate).toContain('Ngày kết thúc dự kiến không được để trống');
  });

  it('báo lỗi khi ngày kết thúc dự kiến sớm hơn ngày bắt đầu', () => {
    const res = validateProjectCreateFromTemplateForm({
      startDate: '2027-06-01',
      expectedEndDate: '2027-05-31',
    });
    expect(res.isValid).toBe(false);
    expect(res.errors.expectedEndDate).toContain('Ngày kết thúc dự kiến không được sớm hơn ngày bắt đầu');
  });

  it('hợp lệ khi ngày kết thúc trùng hoặc sau ngày bắt đầu', () => {
    const resSame = validateProjectCreateFromTemplateForm({
      templateId: 5,
      name: 'Dự án chuẩn hóa',
      startDate: '2027-06-01',
      expectedEndDate: '2027-06-01',
      projectManagerId: 7,
    });
    expect(resSame.errors.expectedEndDate).toBeUndefined();

    const resAfter = validateProjectCreateFromTemplateForm({
      templateId: 5,
      name: 'Dự án chuẩn hóa',
      startDate: '2027-06-01',
      expectedEndDate: '2027-12-31',
      projectManagerId: 7,
    });
    expect(resAfter.errors.expectedEndDate).toBeUndefined();
  });

  it('báo lỗi khi thiếu người quản lý dự án hoặc ID <= 0', () => {
    const res1 = validateProjectCreateFromTemplateForm({ projectManagerId: undefined });
    expect(res1.isValid).toBe(false);
    expect(res1.errors.projectManagerId).toContain('Người quản lý dự án không được để trống');

    const res2 = validateProjectCreateFromTemplateForm({ projectManagerId: 0 });
    expect(res2.isValid).toBe(false);
    expect(res2.errors.projectManagerId).toContain('Người quản lý dự án không được để trống');
  });

  it('trả về isValid = true và errors rỗng khi dữ liệu hợp lệ hoàn toàn', () => {
    const res = validateProjectCreateFromTemplateForm({
      templateId: 5,
      name: 'Dự án ERP Alpha',
      startDate: '2027-01-01',
      expectedEndDate: '2027-12-31',
      projectManagerId: 7,
    });
    expect(res.isValid).toBe(true);
    expect(Object.keys(res.errors)).toHaveLength(0);
  });
});
