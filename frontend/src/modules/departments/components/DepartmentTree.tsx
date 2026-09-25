import React, { useCallback, useMemo, useState } from 'react';
import type { Department, DepartmentTreeNode } from '../types/departmentTypes';
import { getUnitTypeLabel, getUnitTypeMonogram } from '../constants/departmentUnitTypes';
import { ICONS } from '../../../components/common/icons';
import RowActionsMenu from '../../../components/common/RowActionsMenu';

export type ViewMode = 'TREE' | 'LIST' | 'TABLE';

interface DepartmentTreeProps {
  treeData: DepartmentTreeNode[];
  flatData: Department[];
  loading: boolean;
  searchKeyword: string;
  viewMode: ViewMode;
  onAddChild: (parentId: number) => void;
  onEdit: (dept: Department) => void;
  onMove: (dept: Department) => void;
  onDelete: (dept: Department) => void;
}

export const DepartmentTree: React.FC<DepartmentTreeProps> = ({
  treeData,
  flatData,
  loading,
  searchKeyword,
  viewMode,
  onAddChild,
  onEdit,
  onMove,
  onDelete,
}) => {
  // Track expanded node IDs in Tree/List view
  const [collapsedNodes, setCollapsedNodes] = useState<Set<number>>(new Set());

  const toggleNode = useCallback((nodeId: number) => {
    setCollapsedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  }, []);

  const isCollapsed = (nodeId: number) => collapsedNodes.has(nodeId);

  const keyword = searchKeyword.trim().toLowerCase();

  /* Chỉ mục dựng MỘT lần mỗi khi dữ liệu đổi. Trước đây mỗi dòng của chế độ Bảng gọi
   * flatData.find()/filter() (và getDepth gọi find() theo từng bậc cha) — O(n²)–O(n³) với
   * cây vài trăm bộ phận, chạy lại ở mỗi phím gõ tìm kiếm. */
  const { byId, childCountByParent, depthById } = useMemo(() => {
    const map = new Map<number, Department>();
    const childCounts = new Map<number, number>();
    for (const d of flatData) {
      map.set(d.id, d);
      if (d.parentId) childCounts.set(d.parentId, (childCounts.get(d.parentId) ?? 0) + 1);
    }
    const depths = new Map<number, number>();
    const depthOf = (id: number): number => {
      const cached = depths.get(id);
      if (cached !== undefined) return cached;
      let depth = 0;
      let current = map.get(id);
      const seen = new Set<number>();
      while (current && current.parentId && !seen.has(current.id)) {
        seen.add(current.id);
        depth += 1;
        current = map.get(current.parentId);
      }
      depths.set(id, depth);
      return depth;
    };
    for (const d of flatData) depthOf(d.id);
    return { byId: map, childCountByParent: childCounts, depthById: depths };
  }, [flatData]);

  /* Tập id của các nút KHỚP từ khóa hoặc có hậu duệ khớp — tính một lượt từ dưới lên thay
   * cho nodeMatchesSearch() đệ quy lại toàn bộ cây con ở MỖI cấp khi vẽ. */
  const visibleIds = useMemo(() => {
    if (!keyword) return null;
    const ids = new Set<number>();
    const visit = (node: DepartmentTreeNode): boolean => {
      let match = node.name.toLowerCase().includes(keyword);
      for (const child of node.children) {
        if (visit(child)) match = true;
      }
      if (match) ids.add(node.id);
      return match;
    };
    treeData.forEach(visit);
    return ids;
  }, [treeData, keyword]);

  const filteredFlatData = useMemo(
    () => (keyword === '' ? flatData : flatData.filter((d) => d.name.toLowerCase().includes(keyword))),
    [flatData, keyword]
  );

  // Độ sâu thực tế của một bộ phận trong cây (0 = cấp gốc) — dùng để hiển thị "Cấp N" đúng vị trí
  // thay vì chỉ ghi chung chung "Trực thuộc" cho mọi hàng không phải gốc ở chế độ Bảng dữ liệu.
  const getDepth = (deptId: number): number => depthById.get(deptId) ?? 0;

  // Convert tree node to flat Department object helper
  const nodeToDepartment = (node: DepartmentTreeNode, parentId: number | null): Department => {
    return {
      id: node.id,
      name: node.name,
      parentId,
      managerId: node.managerId,
      managerName: node.managerName,
      unitType: node.unitType,
    };
  };

  if (loading) {
    return (
      <div className="tree-loading-state" role="status" aria-label="Đang tải cấu trúc cây tổ chức">
        <div className="skeleton" />
        <div className="skeleton ia-tree-skel--child" />
        <div className="skeleton ia-tree-skel--child" />
        <div className="skeleton ia-tree-skel--grandchild" />
        <div className="skeleton" />
        <div className="skeleton ia-tree-skel--child" />
      </div>
    );
  }

  if (treeData.length === 0) {
    return (
      <div className="tree-empty-state">
        <div className="empty-icon">{ICONS.building}</div>
        <h3>Chưa có bộ phận nào trong cây tổ chức</h3>
        <p>Hệ thống chưa ghi nhận khai báo bộ phận. Hãy bắt đầu bằng cách thêm bộ phận cấp gốc đầu tiên.</p>
      </div>
    );
  }

  // Nút (hoặc một hậu duệ của nó) có khớp từ khóa không — tra tập đã tính sẵn, O(1).
  const nodeMatchesSearch = (node: DepartmentTreeNode): boolean => visibleIds === null || visibleIds.has(node.id);

  // Shared action menu, reused by both Tree and Branch-List views — một menu kebab (⋮)
  // gọn gàng thay cho 4 nút riêng lẻ, cùng mẫu với bảng Tài khoản (RowActionsMenu).
  const renderActionButtons = (dept: Department) => (
    <RowActionsMenu
      actions={[
        { key: 'add', label: 'Thêm bộ phận con', icon: ICONS.plus, onClick: () => onAddChild(dept.id) },
        { key: 'edit', label: 'Chỉnh sửa bộ phận', icon: ICONS.edit, onClick: () => onEdit(dept) },
        { key: 'move', label: 'Di chuyển vị trí', icon: ICONS.moveVertical, onClick: () => onMove(dept) },
        { key: 'delete', label: 'Xóa bộ phận', icon: ICONS.trash, onClick: () => onDelete(dept), tone: 'danger' },
      ]}
    />
  );

  // Flatten the tree into a depth-first, non-nested row list for "Danh sách nhánh" —
  // unlike the Tree view, rows are NOT indented and carry a breadcrumb path instead,
  // so the whole org can be scanned/searched top-to-bottom without expanding nodes.
  const flattenForList = (): Array<{ dept: Department; level: number; path: string; childCount: number }> => {
    const rows: Array<{ dept: Department; level: number; path: string; childCount: number }> = [];
    const walk = (nodes: DepartmentTreeNode[], level: number, parentId: number | null, ancestorNames: string[]) => {
      nodes.forEach((node) => {
        if (!nodeMatchesSearch(node)) return;
        rows.push({
          dept: nodeToDepartment(node, parentId),
          level,
          path: ancestorNames.join(' › '),
          childCount: node.children.length,
        });
        walk(node.children, level + 1, node.id, [...ancestorNames, node.name]);
      });
    };
    walk(treeData, 0, null, []);
    return rows;
  };

  // Render recursive Tree Node component
  const renderTreeNode = (node: DepartmentTreeNode, level: number = 0, parentId: number | null = null) => {
    const hasChildren = node.children && node.children.length > 0;
    const collapsed = isCollapsed(node.id);
    if (!nodeMatchesSearch(node)) {
      return null;
    }

    const matchesKw = keyword !== '' && node.name.toLowerCase().includes(keyword);
    const departmentObj = nodeToDepartment(node, parentId);

    return (
      <div key={node.id} className={`tree-node-wrapper level-${level}`}>
        <div className={`tree-node-card ${hasChildren ? 'tree-node-card--group' : ''} ${matchesKw ? 'tree-node-card--highlight' : ''}`}>
          <div className="tree-node-left">
            {hasChildren ? (
              <button
                type="button"
                className={`tree-toggle-btn ${collapsed ? 'tree-toggle-btn--collapsed' : ''}`}
                onClick={() => toggleNode(node.id)}
                title={collapsed ? 'Mở rộng nhánh con' : 'Thu gọn nhánh con'}
                aria-expanded={!collapsed}
                aria-label={`${collapsed ? 'Mở rộng' : 'Thu gọn'} nhánh ${node.name}`}
              >
                {/* MỘT icon xoay đi, không phải hai ký tự khác nhau (`▶` / `▼`).
                    Hai lý do: ký tự hình học lấy nét từ font hệ thống nên không
                    khớp độ dày với bộ icon Phosphor còn lại; và việc xoay cho
                    thấy hai trạng thái là MỘT vật ở hai tư thế, đúng nguyên tắc
                    "vào và ra theo cùng một đường" (apple-design §7). */}
                <span className="icon-xs tree-toggle-btn__caret">{ICONS.chevronDown}</span>
              </button>
            ) : (
              <span className="tree-node-dot" aria-hidden="true" />
            )}

            <div className="tree-node-info">
              <div className="tree-node-header">
                <span className="tree-node-title">{node.name}</span>
                <span className="user-tag badge--blue">{getUnitTypeLabel(node.unitType)}</span>
                {level === 0 && <span className="badge-level badge-level--root">Cấp gốc</span>}
                {hasChildren && <span className="badge-children">{node.children.length} bộ phận con</span>}
              </div>

              <div className="tree-node-manager">
                <span>Trưởng bộ phận:</span>
                <strong>{node.managerName ? node.managerName : 'Chưa phân công'}</strong>
              </div>
            </div>
          </div>

          {renderActionButtons(departmentObj)}
        </div>

        {/* Render child nodes if not collapsed */}
        {hasChildren && !collapsed && (
          <div className="tree-children-container">
            {node.children.map((child) => renderTreeNode(child, level + 1, node.id))}
          </div>
        )}
      </div>
    );
  };

  // TABLE VIEW RENDER
  if (viewMode === 'TABLE') {
    return (
      <div className="user-table-card">
        <div className="table-responsive">
          <table className="user-data-table">
            <thead>
              <tr>
                <th>Mã / tên bộ phận</th>
                <th>Cấp độ cây</th>
                <th>Bộ phận cha</th>
                <th>Trưởng bộ phận</th>
                <th>Số đơn vị con</th>
                <th className="text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filteredFlatData.length === 0 ? (
                <tr>
                  <td colSpan={6} className="ia-table-empty-cell">
                    Không tìm thấy bộ phận nào phù hợp với từ khóa "{searchKeyword}".
                  </td>
                </tr>
              ) : (
                filteredFlatData.map((dept) => {
                  const parentDept = dept.parentId ? byId.get(dept.parentId) : undefined;
                  const childCount = childCountByParent.get(dept.id) ?? 0;
                  const isRoot = !dept.parentId;
                  const depth = getDepth(dept.id);

                  return (
                    <tr key={dept.id}>
                      <td>
                        <div className="user-profile-cell">
                          <span className={`avatar-circle avatar-circle--lg ${isRoot ? 'ia-dept-avatar--root' : 'ia-dept-avatar--branch'}`} aria-hidden="true">
                            {getUnitTypeMonogram(dept.unitType)}
                          </span>
                          <div className="user-profile-meta">
                            <span className="user-profile-fullname">{dept.name}</span>
                            <span className="user-profile-username">ID: DEPT-{dept.id} • {getUnitTypeLabel(dept.unitType)}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        {isRoot ? (
                          <span className="badge-level badge-level--root">Cấp 1 (Gốc)</span>
                        ) : (
                          <span className="badge-level badge-level--branch">Cấp {depth + 1}</span>
                        )}
                      </td>
                      <td>
                        {parentDept ? (
                          <span className="cell-dept">{parentDept.name}</span>
                        ) : (
                          <span className="ia-dash">-- Cấp cao nhất --</span>
                        )}
                      </td>
                      <td>
                        <strong className="ia-strong">{dept.managerName || 'Chưa gán'}</strong>
                      </td>
                      <td>
                        <span className="badge-children">{childCount} bộ phận con</span>
                      </td>
                      <td className="text-right">
                        {renderActionButtons(dept)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // BRANCH LIST VIEW RENDER — flat rows in hierarchical (depth-first) order, no indentation,
  // no expand/collapse; each row shows its breadcrumb path instead so every branch of the
  // org is visible on one scroll, which is what distinguishes it from the Tree diagram view.
  if (viewMode === 'LIST') {
    const listRows = flattenForList();

    if (listRows.length === 0) {
      return (
        <div className="tree-empty-state">
          <div className="empty-icon">{ICONS.search}</div>
          <h3>Không tìm thấy bộ phận nào phù hợp</h3>
          <p>Không có bộ phận nào khớp với từ khóa "{searchKeyword}". Hãy thử một từ khóa khác.</p>
        </div>
      );
    }

    return (
      <div className="department-tree-container mode-list">
        {listRows.map(({ dept, level, path, childCount }) => (
          <div key={dept.id} className="dept-list-row">
            <div className="tree-node-left">
              <div className="tree-node-info">
                <div className="tree-node-header">
                  <span className="tree-node-title">{dept.name}</span>
                  <span className="user-tag badge--blue">{getUnitTypeLabel(dept.unitType)}</span>
                  {level === 0 ? (
                    <span className="badge-level badge-level--root">Cấp gốc</span>
                  ) : (
                    <span className="badge-level badge-level--branch">Cấp {level + 1}</span>
                  )}
                  {childCount > 0 && <span className="badge-children">{childCount} bộ phận con</span>}
                </div>
                {path && <div className="dept-list-path">{path}</div>}
                <div className="tree-node-manager">
                  <span>Trưởng bộ phận:</span>
                  <strong>{dept.managerName ? dept.managerName : 'Chưa phân công'}</strong>
                </div>
              </div>
            </div>
            {renderActionButtons(dept)}
          </div>
        ))}
      </div>
    );
  }

  // TREE (Sơ Đồ Cây) VIEW RENDER — nested cards with indentation + expand/collapse per branch
  return (
    <div className="department-tree-container mode-tree">
      {treeData.map((rootNode) => renderTreeNode(rootNode, 0, null))}
    </div>
  );
};

export default DepartmentTree;
