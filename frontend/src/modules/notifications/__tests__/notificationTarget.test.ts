import { describe, expect, it } from 'vitest';
import { resolveNotificationDestination } from '../utils/notificationTarget';
import type { NotificationRes } from '../types/notificationTypes';

function n(overrides: Partial<NotificationRes>): NotificationRes {
  return {
    id: 1,
    recipientId: 2,
    type: 'TIMESHEET_SUBMITTED',
    title: 't',
    content: 'c',
    channel: 'IN_APP',
    referenceId: 10,
    referenceType: null,
    targetType: 'TIMESHEET',
    isRead: false,
    readAt: null,
    sentAt: '2026-09-25T09:00:00',
    ...overrides,
  };
}

describe('resolveNotificationDestination (NCL-14-CN-001 TC-02)', () => {
  it('cảnh báo vượt ngân sách mở thẳng tới công việc theo referenceId', () => {
    expect(resolveNotificationDestination(n({ type: 'TASK_BUDGET_EXCEEDED', targetType: 'TASK', referenceId: 55 }))).toEqual({
      kind: 'TASK',
      taskId: 55,
      label: 'công việc liên quan',
    });
  });

  it('bảng chấm công chờ duyệt → màn Duyệt; bị từ chối/nhắc nộp → Công việc và giờ công', () => {
    expect(resolveNotificationDestination(n({}))).toMatchObject({ kind: 'TAB', tab: 'TIMESHEET_APPROVAL' });
    expect(resolveNotificationDestination(n({ type: 'TIMESHEET_REMINDER' }))).toMatchObject({ kind: 'TAB', tab: 'MY_WORK' });
  });

  it('hóa đơn, phiếu nghiệm thu, hợp đồng mở trang chi tiết kèm id', () => {
    expect(resolveNotificationDestination(n({ type: 'DUNNING_REMINDER', targetType: 'INVOICE', referenceId: 5 }))).toMatchObject({
      tab: 'INVOICE_DETAIL',
      recordId: 5,
    });
    expect(
      resolveNotificationDestination(n({ type: 'ACCEPTANCE_DECIDED_ON_PORTAL', targetType: 'ACCEPTANCE_CERTIFICATE', referenceId: 45 }))
    ).toMatchObject({ tab: 'ACCEPTANCE_DETAIL', recordId: 45 });
    expect(resolveNotificationDestination(n({ type: 'CONTRACT_EXPIRING', targetType: 'CONTRACT', referenceId: 3 }))).toMatchObject({
      tab: 'CONTRACT_DETAIL',
      recordId: 3,
    });
  });

  it('lợi nhuận âm → Biên lợi nhuận dự án; mốc tiến độ → cấu trúc công việc của dự án', () => {
    expect(resolveNotificationDestination(n({ type: 'NEGATIVE_MARGIN_ALERT', targetType: 'PROJECT', referenceId: 8 }))).toMatchObject({
      tab: 'PROJECT_MARGIN',
      recordId: 8,
    });
    expect(resolveNotificationDestination(n({ type: 'PROJECT_MILESTONE_DUE', targetType: 'PROJECT', referenceId: 8 }))).toMatchObject({
      kind: 'PROJECT_WBS',
      projectId: 8,
    });
  });

  it('bản tổng hợp và cảnh báo bảo mật không có đích điều hướng', () => {
    expect(resolveNotificationDestination(n({ type: 'DAILY_DIGEST_SUMMARY', targetType: 'NONE', referenceId: null }))).toEqual({
      kind: 'NONE',
    });
    expect(resolveNotificationDestination(n({ type: 'SECURITY_ALERT', targetType: 'NONE' }))).toEqual({ kind: 'NONE' });
  });
});
