import { describe, expect, it } from 'vitest';
import type { WorkBreakdownRes, TaskRes } from '../../projects/types/taskTypes';
import type { AcceptanceCertificateRes } from '../types/acceptanceTypes';
import { acceptanceStateOf, flattenWorkPackages } from '../utils/workPackageTree';
import { milestoneEligibility, milestoneStatusAfterLink } from '../utils/milestoneEligibility';
import {
  parseMoneyInput,
  simulatedMinutesPath,
  todayLocalIso,
  validateAcceptanceForm,
  validateConfirmForm,
  validateRejectForm,
} from '../validators/acceptanceValidators';

function task(id: number, status: TaskRes['status'], workPackageId = 1): TaskRes {
  return {
    id, projectId: 12, workPackageId, parentTaskId: null, name: `Task ${id}`, description: null,
    expectedStartDate: null, expectedEndDate: null, status,
  };
}

const TREE: WorkBreakdownRes[] = [
  {
    id: 40, parentId: null, name: 'Giai doan 1', description: null,
    tasks: [task(100, 'DONE', 40)],
    children: [
      { id: 41, parentId: 40, name: 'Thiet ke', description: null, tasks: [task(101, 'DONE', 41)], children: [] },
      { id: 42, parentId: 40, name: 'Trien khai', description: null, tasks: [task(102, 'IN_PROGRESS', 42)], children: [] },
    ],
  },
  { id: 50, parentId: null, name: 'Giai doan 2', description: null, tasks: [], children: [] },
];

function cert(workPackageId: number): AcceptanceCertificateRes {
  return {
    id: 5, certificateCode: 'NT-1', projectId: 12, projectCode: 'DA-001', projectName: 'ERP', contractId: 3,
    workPackageId, workPackageName: 'x', title: 't', acceptedValue: 1, status: 'PENDING_CONFIRMATION',
    revisionNo: 1, contractMilestoneId: null, contractMilestoneName: null, createdBy: 'pm01',
    createdAt: '2026-09-24T10:00:00', confirmedAt: null,
  };
}

describe('flattenWorkPackages', () => {
  it('trải phẳng cây theo thứ tự cha trước con và gộp công việc của hạng mục con cháu', () => {
    const flat = flattenWorkPackages(TREE);
    expect(flat.map((w) => w.id)).toEqual([40, 41, 42, 50]);
    expect(flat[0]).toMatchObject({ depth: 0, totalTasks: 3, doneTasks: 2, descendantIds: [41, 42] });
    expect(flat[1]).toMatchObject({ depth: 1, path: 'Giai doan 1 › Thiet ke', ancestorIds: [40], totalTasks: 1, doneTasks: 1 });
  });
});

describe('acceptanceStateOf', () => {
  const flat = flattenWorkPackages(TREE);
  it('phân loại đủ điều kiện / còn dang dở / chưa có công việc (QTN-24)', () => {
    expect(acceptanceStateOf(flat[1], []).state).toBe('READY');
    expect(acceptanceStateOf(flat[0], []).state).toBe('UNFINISHED');
    expect(acceptanceStateOf(flat[2], []).state).toBe('UNFINISHED');
    expect(acceptanceStateOf(flat[3], []).state).toBe('EMPTY');
  });

  it('mỗi nhánh cây chỉ một phiếu: hạng mục cha/con đã có phiếu cũng chặn', () => {
    expect(acceptanceStateOf(flat[1], [cert(41)]).state).toBe('HAS_CERTIFICATE');
    expect(acceptanceStateOf(flat[0], [cert(41)]).state).toBe('BRANCH_CERTIFICATE');
    expect(acceptanceStateOf(flat[2], [cert(40)]).state).toBe('BRANCH_CERTIFICATE');
    expect(acceptanceStateOf(flat[3], [cert(40)]).state).toBe('EMPTY');
  });
});

describe('parseMoneyInput', () => {
  it('hiểu số thường, dấu chấm ngăn cách hàng nghìn và dấu phẩy thập phân', () => {
    expect(parseMoneyInput('300000000')).toBe(300000000);
    expect(parseMoneyInput('300.000.000')).toBe(300000000);
    expect(parseMoneyInput('1.500.000,5')).toBe(1500000.5);
    expect(parseMoneyInput('1500.25')).toBe(1500.25);
    expect(parseMoneyInput('')).toBeNaN();
    expect(parseMoneyInput('abc')).toBeNaN();
  });
});

describe('validateAcceptanceForm', () => {
  const base = { workPackageId: 40, title: '', acceptedValue: '300000000', note: '' };

  it('hợp lệ khi có hạng mục và giá trị ≥ 0', () => {
    expect(validateAcceptanceForm(base).isValid).toBe(true);
    expect(validateAcceptanceForm({ ...base, acceptedValue: '0' }).isValid).toBe(true);
  });

  it('bắt buộc hạng mục và giá trị nghiệm thu', () => {
    const { errors } = validateAcceptanceForm({ ...base, workPackageId: null, acceptedValue: '' });
    expect(errors.workPackageId).toBeTruthy();
    expect(errors.acceptedValue).toBe('Giá trị nghiệm thu không được để trống');
  });

  it('chặn giá trị âm, sai định dạng, quá 2 chữ số thập phân và chuỗi quá dài', () => {
    expect(validateAcceptanceForm({ ...base, acceptedValue: '-1' }).errors.acceptedValue).toMatch(/âm/);
    expect(validateAcceptanceForm({ ...base, acceptedValue: '12a' }).errors.acceptedValue).toMatch(/số/);
    expect(validateAcceptanceForm({ ...base, acceptedValue: '10,123' }).errors.acceptedValue).toMatch(/2 chữ số/);
    expect(validateAcceptanceForm({ ...base, title: 'x'.repeat(256) }).errors.title).toBeTruthy();
    expect(validateAcceptanceForm({ ...base, note: 'x'.repeat(1001) }).errors.note).toBeTruthy();
  });
});

describe('validateConfirmForm / validateRejectForm (NCL-12-CN-002)', () => {
  const created = '2026-09-24T10:00:00';
  const today = '2026-09-25';

  it('xác nhận hợp lệ khi đủ người ký, ngày ký trong khoảng [ngày lập, hôm nay] và biên bản', () => {
    expect(
      validateConfirmForm({ signerName: 'A', signedDate: '2026-09-24', minutesUrl: '/f.pdf' }, created, today).isValid
    ).toBe(true);
  });

  it('chặn ngày ký trước ngày lập phiếu hoặc ở tương lai', () => {
    expect(
      validateConfirmForm({ signerName: 'A', signedDate: '2026-09-23', minutesUrl: '/f.pdf' }, created, today).errors
        .signedDate
    ).toBe('Ngày ký không được trước ngày lập phiếu (24/09/2026)');
    expect(
      validateConfirmForm({ signerName: 'A', signedDate: '2026-09-26', minutesUrl: '/f.pdf' }, created, today).errors
        .signedDate
    ).toMatch(/tương lai/);
  });

  it('từ chối bắt buộc lý do, giới hạn độ dài', () => {
    expect(validateRejectForm({ reason: '  ', signerName: '', minutesUrl: '' }).errors.reason).toBeTruthy();
    expect(validateRejectForm({ reason: 'x'.repeat(1001), signerName: '', minutesUrl: '' }).errors.reason).toBeTruthy();
    expect(validateRejectForm({ reason: 'Thieu tai lieu', signerName: '', minutesUrl: '' }).isValid).toBe(true);
  });

  it('tạo đường dẫn biên bản mô phỏng từ tên tệp', () => {
    expect(simulatedMinutesPath('NT-1', 'bien ban ky.pdf')).toBe('/files/nghiem-thu/NT-1/bien-ban-ky.pdf');
    expect(todayLocalIso(new Date(2026, 0, 5))).toBe('2026-01-05');
  });
});

describe('milestoneEligibility (NCL-12-CN-003, QTN-25)', () => {
  const row = {
    milestoneId: 1, contractId: 3, milestoneName: 'Dot 1', amount: 1, expectedDate: null, acceptanceCondition: null,
    milestoneStatus: 'PENDING' as const, certificateId: null, certificateCode: null, certificateStatus: null,
    projectCode: null, workPackageName: null,
  };

  it('đủ điều kiện khi mốc sẵn sàng và phiếu gắn kèm đã xác nhận (hoặc mốc mở không gắn phiếu)', () => {
    expect(milestoneEligibility({ ...row, milestoneStatus: 'READY_TO_INVOICE', certificateId: 5, certificateCode: 'NT', certificateStatus: 'ACCEPTED' }).state).toBe('ELIGIBLE');
    expect(milestoneEligibility({ ...row, milestoneStatus: 'READY_TO_INVOICE' }).state).toBe('ELIGIBLE');
  });

  it('chưa đủ điều kiện khi phiếu gắn kèm chưa xác nhận — kể cả mốc đã mở tay', () => {
    const r = milestoneEligibility({ ...row, milestoneStatus: 'READY_TO_INVOICE', certificateId: 5, certificateCode: 'NT-5', certificateStatus: 'NEEDS_REVISION' });
    expect(r.state).toBe('CERTIFICATE_NOT_ACCEPTED');
    expect(r.reason).toContain('NT-5');
    expect(milestoneEligibility(row).state).toBe('NO_CERTIFICATE');
    expect(milestoneEligibility({ ...row, milestoneStatus: 'INVOICED' }).state).toBe('INVOICED');
  });

  it('trạng thái mốc sau khi gắn theo bảng đồng bộ QTN-25', () => {
    expect(milestoneStatusAfterLink('PENDING', true)).toBe('READY_TO_INVOICE');
    expect(milestoneStatusAfterLink('READY_TO_INVOICE', false)).toBe('PENDING');
    expect(milestoneStatusAfterLink('PENDING', false)).toBe('PENDING');
    expect(milestoneStatusAfterLink('INVOICED', true)).toBe('INVOICED');
  });
});
