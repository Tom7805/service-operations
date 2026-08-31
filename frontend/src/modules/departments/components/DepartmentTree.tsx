import React, { useEffect, useRef, useState } from 'react';
import type { Department, DepartmentTreeNode } from '../types/departmentTypes';
import { getUnitTypeLabel, getUnitTypeMonogram } from '../constants/departmentUnitTypes';
import { ICONS } from '../../../components/common/icons';

export type ViewMode = 'TREE' | 'LIST' | 'TABLE';

interface RowAction {
  key: string;
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  tone?: 'default' | 'danger';
}

/** Menu thao tác gọn theo từng dòng — thay cho dãy nút riêng lẻ, cùng mẫu với bảng Tài khoản. */
function RowActionsMenu({ actions }: { actions: RowAction[] }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open]);

  return (
    <div className="row-menu" ref={containerRef}>
      <button
        type="button"
        className="row-menu__trigger"
        aria-label="Thao tác"
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        {ICONS.more}
      </button>
      <div className={`row-menu__panel ${open ? 'row-menu__panel--open' : ''}`} role="menu">
        {actions.map((action) => (
          <button
            key={action.key}
            type="button"
            role="menuitem"
            className={`row-menu__item ${action.tone === 'danger' ? 'row-menu__item--danger' : ''}`}
            title={action.label}
            onClick={() => {
              setOpen(false);
              action.onClick();
            }}
          >
            <span className="row-menu__icon">{action.icon}</span>
            {action.label}
          </button>
        ))}
      </div>
    </div>
  );
}

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

  const toggleNode = (nodeId: number) => {
    setCollapsedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  };

  const isCollapsed = (nodeId: number) => collapsedNodes.has(nodeId);

  // Độ sâu thực tế của một bộ phận trong cây (0 = cấp gốc) — dùng để hiển thị "Cấp N" đúng vị trí
  // thay vì chỉ ghi chung chung "Trực thuộc" cho mọi hàng không phải gốc ở chế độ Bảng Dữ Liệu.
  const getDepth = (deptId: number): number => {
    let depth = 0;
    let current = flatData.find((d) => d.id === deptId);
    while (current && current.parentId) {
      depth += 1;
      current = flatData.find((d) => d.id === current!.parentId);
    }
    return depth;
  };

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
      <div className="tree-loading-state">
        <div className="loader" style={{ width: '28px', height: '28px', borderWidth: '3px', borderColor: '#6366f1', borderTopColor: 'transparent' }} />
        <span>Đang tải cấu trúc cây tổ chức...</span>
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

  // Filter flat data if search keyword is present
  const filteredFlatData = flatData.filter((d) =>
    searchKeyword.trim() === '' ? true : d.name.toLowerCase().includes(searchKeyword.trim().toLowerCase())
  );

  // Helper to check if a node or its children match search keyword
  const nodeMatchesSearch = (node: DepartmentTreeNode, keyword: string): boolean => {
    if (!keyword.trim()) return true;
    const kw = keyword.trim().toLowerCase();
    if (node.name.toLowerCase().includes(kw)) return true;
    return node.children.some((child) => nodeMatchesSearch(child, keyword));
  };

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

  // Flatten the tree into a depth-first, non-nested row list for "Danh sách Nhánh" —
  // unlike the Tree view, rows are NOT indented and carry a breadcrumb path instead,
  // so the whole org can be scanned/searched top-to-bottom without expanding nodes.
  const flattenForList = (): Array<{ dept: Department; level: number; path: string; childCount: number }> => {
    const rows: Array<{ dept: Department; level: number; path: string; childCount: number }> = [];
    const walk = (nodes: DepartmentTreeNode[], level: number, parentId: number | null, ancestorNames: string[]) => {
      nodes.forEach((node) => {
        if (searchKeyword.trim() !== '' && !nodeMatchesSearch(node, searchKeyword)) return;
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
    const matchesKw = searchKeyword.trim() !== '' && node.name.toLowerCase().includes(searchKeyword.trim().toLowerCase());
    const departmentObj = nodeToDepartment(node, parentId);

    if (searchKeyword.trim() !== '' && !nodeMatchesSearch(node, searchKeyword)) {
      return null;
    }

    return (
      <div key={node.id} className={`tree-node-wrapper level-${level}`}>
        <div className={`tree-node-card ${hasChildren ? 'tree-node-card--group' : ''} ${matchesKw ? 'tree-node-card--highlight' : ''}`}>
          <div className="tree-node-left">
            {hasChildren ? (
              <button
                type="button"
                className="tree-toggle-btn"
                onClick={() => toggleNode(node.id)}
                title={collapsed ? 'Mở rộng nhánh con' : 'Thu gọn nhánh con'}
              >
                {collapsed ? '▶' : '▼'}
              </button>
            ) : (
              <span className="tree-node-dot" />
            )}

            <div className="tree-node-info">
              <div className="tree-node-header">
                <span className="tree-node-title">{node.name}</span>
                <span className="user-tag badge--blue">{getUnitTypeLabel(node.unitType)}</span>
                {level === 0 && <span className="badge-level badge-level--root">Cấp Gốc</span>}
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
                <th>Mã / Tên Bộ Phận</th>
                <th>Cấp Độ Cây</th>
                <th>Bộ Phận Cha</th>
                <th>Trưởng Bộ Phận</th>
                <th>Số Đơn Vị Con</th>
                <th style={{ textAlign: 'right' }}>Thao Tác</th>
              </tr>
            </thead>
            <tbody>
              {filteredFlatData.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '32px', color: '#64748b' }}>
                    Không tìm thấy bộ phận nào phù hợp với từ khóa "{searchKeyword}".
                  </td>
                </tr>
              ) : (
                filteredFlatData.map((dept) => {
                  const parentDept = flatData.find((d) => d.id === dept.parentId);
                  const childCount = flatData.filter((d) => d.parentId === dept.id).length;
                  const isRoot = !dept.parentId;
                  const depth = getDepth(dept.id);

                  return (
                    <tr key={dept.id}>
                      <td>
                        <div className="user-profile-cell">
                          <span className="avatar-circle avatar-circle--lg" style={{ background: isRoot ? '#4f46e5' : '#0284c7' }}>
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
                          <span style={{ color: '#7c8a9c', fontStyle: 'italic' }}>-- Cấp cao nhất --</span>
                        )}
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <strong style={{ color: '#0f172a' }}>{dept.managerName || 'Chưa gán'}</strong>
                        </div>
                      </td>
                      <td>
                        <span className="badge-children">{childCount} bộ phận con</span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
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
                    <span className="badge-level badge-level--root">Cấp Gốc</span>
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
