import type { TaskRes, WorkBreakdownRes } from '../../projects/types/taskTypes';
import type { AcceptanceCertificateRes } from '../types/acceptanceTypes';

/** Một hạng mục đã "trải phẳng" từ cây WBS, kèm số liệu công việc gộp cả hạng mục con cháu. */
export interface FlatWorkPackage {
  id: number;
  name: string;
  depth: number;
  /** Đường dẫn từ gốc, ví dụ "Giai đoạn 1 › Thiết kế". */
  path: string;
  ancestorIds: number[];
  descendantIds: number[];
  /** Công việc của hạng mục và mọi hạng mục con cháu (QTN-24 xét toàn bộ nhánh). */
  tasks: TaskRes[];
  totalTasks: number;
  doneTasks: number;
}

function collectTasks(node: WorkBreakdownRes): TaskRes[] {
  return [...(node.tasks ?? []), ...(node.children ?? []).flatMap(collectTasks)];
}

function collectIds(node: WorkBreakdownRes): number[] {
  return (node.children ?? []).flatMap((child) => [child.id, ...collectIds(child)]);
}

/** Trải phẳng cây hạng mục theo thứ tự duyệt sâu (cha đứng trước con) để hiển thị dạng bảng/ô chọn. */
export function flattenWorkPackages(
  nodes: WorkBreakdownRes[],
  depth = 0,
  ancestors: Array<{ id: number; name: string }> = []
): FlatWorkPackage[] {
  return nodes.flatMap((node) => {
    const tasks = collectTasks(node);
    const flat: FlatWorkPackage = {
      id: node.id,
      name: node.name,
      depth,
      path: [...ancestors.map((a) => a.name), node.name].join(' › '),
      ancestorIds: ancestors.map((a) => a.id),
      descendantIds: collectIds(node),
      tasks,
      totalTasks: tasks.length,
      doneTasks: tasks.filter((t) => t.status === 'DONE').length,
    };
    return [flat, ...flattenWorkPackages(node.children ?? [], depth + 1, [...ancestors, { id: node.id, name: node.name }])];
  });
}

export type WorkPackageAcceptanceState = 'READY' | 'UNFINISHED' | 'EMPTY' | 'HAS_CERTIFICATE' | 'BRANCH_CERTIFICATE';

/**
 * Tình trạng lập phiếu của một hạng mục, tính sẵn ở client để PM nhìn bảng là biết hạng mục nào lập
 * được ngay. Backend (acceptance-readiness) vẫn là nơi quyết định cuối cùng khi mở biểu mẫu.
 * Mỗi nhánh cây chỉ có một phiếu: hạng mục cha/con đã có phiếu cũng chặn.
 */
export function acceptanceStateOf(
  wp: FlatWorkPackage,
  certificates: AcceptanceCertificateRes[]
): { state: WorkPackageAcceptanceState; certificate?: AcceptanceCertificateRes } {
  const own = certificates.find((c) => c.workPackageId === wp.id);
  if (own) return { state: 'HAS_CERTIFICATE', certificate: own };
  const related = new Set([...wp.ancestorIds, ...wp.descendantIds]);
  const branch = certificates.find((c) => related.has(c.workPackageId));
  if (branch) return { state: 'BRANCH_CERTIFICATE', certificate: branch };
  if (wp.totalTasks === 0) return { state: 'EMPTY' };
  if (wp.doneTasks < wp.totalTasks) return { state: 'UNFINISHED' };
  return { state: 'READY' };
}
