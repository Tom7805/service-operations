import { describe, expect, it } from 'vitest';
import {
  validateProjectCreateForm,
  validateProjectCreateFromTemplateForm,
  validateMilestoneForm,
  validateMilestoneCompleteForm,
  validateRiskForm,
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

describe('validateMilestoneForm (NCL-05-CN-008 — Quản lý mốc tiến độ của dự án)', () => {
  it('TC-01: chấp nhận dữ liệu hợp lệ đầy đủ', () => {
    const result = validateMilestoneForm({
      name: 'Bàn giao giai đoạn một',
      description: 'Chữ ký nghiệm thu giai đoạn 1',
      plannedDate: '2027-10-01',
      taskIds: [11, 12],
    });
    expect(result.isValid).toBe(true);
    expect(result.errors).toEqual({});
  });

  it('từ chối tên mốc để trống hoặc chỉ có khoảng trắng', () => {
    const emptyResult = validateMilestoneForm({ name: '', plannedDate: '2027-10-01', taskIds: [1] });
    expect(emptyResult.isValid).toBe(false);
    expect(emptyResult.errors.name).toBe('Tên mốc tiến độ không được để trống');

    const whitespaceResult = validateMilestoneForm({ name: '   ', plannedDate: '2027-10-01', taskIds: [1] });
    expect(whitespaceResult.isValid).toBe(false);
    expect(whitespaceResult.errors.name).toBe('Tên mốc tiến độ không được để trống');
  });

  it('từ chối tên mốc vượt quá 255 ký tự', () => {
    const result = validateMilestoneForm({
      name: 'a'.repeat(256),
      plannedDate: '2027-10-01',
      taskIds: [1],
    });
    expect(result.isValid).toBe(false);
    expect(result.errors.name).toBe('Tên mốc tiến độ không được vượt quá 255 ký tự');
  });

  it('từ chối khi thiếu ngày kế hoạch', () => {
    const result = validateMilestoneForm({ name: 'Mốc 1', plannedDate: '', taskIds: [1] });
    expect(result.isValid).toBe(false);
    expect(result.errors.plannedDate).toBe('Ngày kế hoạch không được để trống');
  });

  it('từ chối khi chưa chọn hạng mục phải hoàn thành nào', () => {
    const result = validateMilestoneForm({ name: 'Mốc 1', plannedDate: '2027-10-01', taskIds: [] });
    expect(result.isValid).toBe(false);
    expect(result.errors.taskIds).toBe('Phải chọn ít nhất một hạng mục phải hoàn thành');

    const undefinedResult = validateMilestoneForm({ name: 'Mốc 1', plannedDate: '2027-10-01' });
    expect(undefinedResult.isValid).toBe(false);
    expect(undefinedResult.errors.taskIds).toBe('Phải chọn ít nhất một hạng mục phải hoàn thành');
  });
});

describe('validateMilestoneCompleteForm (NCL-05-CN-008)', () => {
  it('chấp nhận ngày thực tế hợp lệ (không ở tương lai)', () => {
    const result = validateMilestoneCompleteForm({ actualDate: '2027-09-01' }, '2027-09-28');
    expect(result.isValid).toBe(true);
    expect(result.errors).toEqual({});
  });

  it('từ chối khi để trống ngày thực tế', () => {
    const result = validateMilestoneCompleteForm({ actualDate: '' }, '2027-09-28');
    expect(result.isValid).toBe(false);
    expect(result.errors.actualDate).toBe('Ngày thực tế không được để trống');
  });

  it('từ chối khi ngày thực tế ở tương lai (khớp INVALID_STATE của backend)', () => {
    const result = validateMilestoneCompleteForm({ actualDate: '2027-10-05' }, '2027-09-28');
    expect(result.isValid).toBe(false);
    expect(result.errors.actualDate).toBe('Ngày thực tế không được ở tương lai');
  });
});

describe('validateRiskForm (NCL-05-CN-009 — Quản lý rủi ro dự án)', () => {
  it('TC-01: chấp nhận dữ liệu hợp lệ đầy đủ', () => {
    const result = validateRiskForm({
      description: 'Nhà thầu phụ có nguy cơ chậm tiến độ tích hợp',
      impact: 'HIGH',
      likelihood: 'MEDIUM',
      mitigation: 'Chuẩn bị nhà thầu dự phòng',
      watcherId: 7,
    });
    expect(result.isValid).toBe(true);
    expect(result.errors).toEqual({});
  });

  it('chấp nhận khi không có biện pháp giảm thiểu (tùy chọn)', () => {
    const result = validateRiskForm({
      description: 'Rủi ro thiếu nhân sự',
      impact: 'LOW',
      likelihood: 'LOW',
      watcherId: 1,
    });
    expect(result.isValid).toBe(true);
  });

  it('từ chối mô tả rủi ro để trống hoặc chỉ có khoảng trắng', () => {
    const emptyResult = validateRiskForm({ description: '', impact: 'LOW', likelihood: 'LOW', watcherId: 1 });
    expect(emptyResult.isValid).toBe(false);
    expect(emptyResult.errors.description).toBe('Mô tả rủi ro không được để trống');

    const whitespaceResult = validateRiskForm({
      description: '   ',
      impact: 'LOW',
      likelihood: 'LOW',
      watcherId: 1,
    });
    expect(whitespaceResult.isValid).toBe(false);
    expect(whitespaceResult.errors.description).toBe('Mô tả rủi ro không được để trống');
  });

  it('từ chối khi thiếu mức tác động hoặc khả năng xảy ra', () => {
    const result = validateRiskForm({ description: 'Mô tả', watcherId: 1 });
    expect(result.isValid).toBe(false);
    expect(result.errors.impact).toBe('Mức tác động không được để trống');
    expect(result.errors.likelihood).toBe('Khả năng xảy ra không được để trống');
  });

  it('từ chối khi thiếu người theo dõi hoặc id <= 0', () => {
    const res1 = validateRiskForm({ description: 'Mô tả', impact: 'LOW', likelihood: 'LOW' });
    expect(res1.isValid).toBe(false);
    expect(res1.errors.watcherId).toBe('Người theo dõi không được để trống');

    const res2 = validateRiskForm({ description: 'Mô tả', impact: 'LOW', likelihood: 'LOW', watcherId: 0 });
    expect(res2.isValid).toBe(false);
    expect(res2.errors.watcherId).toBe('Người theo dõi không được để trống');
  });
});
