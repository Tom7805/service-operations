import React, { useState } from 'react';
import type { Department, DepartmentTreeNode } from '../types/departmentTypes';

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

  // Convert tree node to flat Department object helper
  const nodeToDepartment = (node: DepartmentTreeNode, parentId: number | null): Department => {
    return {
      id: node.id,
      name: node.name,
      parentId,
      managerId: node.managerId,
      managerName: node.managerName,
    };
  };

  if (loading) {
    return (
      <div className="tree-loading-state">
        <div className="loader" style={{ width: '28px', height: '28px', borderWidth: '3px', borderColor: '#10b981', borderTopColor: 'transparent' }} />
        <span>Đang tải cấu trúc cây tổ chức...</span>
      </div>
    );
  }

  if (treeData.length === 0) {
    return (
      <div className="tree-empty-state">
        <div className="empty-icon">🏢</div>
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
        <div className={`tree-node-card ${matchesKw ? 'tree-node-card--highlight' : ''}`}>
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

            <span className="tree-node-icon">{level === 0 ? '🏛️' : level === 1 ? '🏢' : '📂'}</span>

            <div className="tree-node-info">
              <div className="tree-node-header">
                <span className="tree-node-title">{node.name}</span>
                {level === 0 && <span className="badge-level badge-level--root">Cấp Gốc</span>}
                {hasChildren && <span className="badge-children">{node.children.length} bộ phận con</span>}
              </div>

              <div className="tree-node-manager">
                <span>👤 Trưởng bộ phận:</span>
                <strong>{node.managerName ? node.managerName : 'Chưa phân công'}</strong>
              </div>
            </div>
          </div>

          <div className="tree-node-actions">
            <button
              type="button"
              className="action-btn action-btn--add"
              onClick={() => onAddChild(node.id)}
              title="Thêm bộ phận con trực thuộc"
            >
              ➕ Con
            </button>
            <button
              type="button"
              className="action-btn"
              onClick={() => onEdit(departmentObj)}
              title="Chỉnh sửa bộ phận"
            >
              ✏️ Sửa
            </button>
            <button
              type="button"
              className="action-btn"
              onClick={() => onMove(departmentObj)}
              title="Di chuyển vị trí bộ phận"
            >
              ↕️ Di chuyển
            </button>
            <button
              type="button"
              className="action-btn action-btn--danger"
              onClick={() => onDelete(departmentObj)}
              title="Xóa bộ phận"
            >
              🗑️ Xóa
            </button>
          </div>
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

                  return (
                    <tr key={dept.id}>
                      <td>
                        <div className="user-profile-cell">
                          <span className="avatar-circle avatar-circle--lg" style={{ background: isRoot ? '#059669' : '#0284c7' }}>
                            {isRoot ? '🏛️' : '🏢'}
                          </span>
                          <div className="user-profile-meta">
                            <span className="user-profile-fullname">{dept.name}</span>
                            <span className="user-profile-username">ID: DEPT-{dept.id}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        {isRoot ? (
                          <span className="badge-level badge-level--root">Cấp 1 (Gốc)</span>
                        ) : (
                          <span className="user-tag badge--blue">Trực thuộc</span>
                        )}
                      </td>
                      <td>
                        {parentDept ? (
                          <span className="cell-dept">📂 {parentDept.name}</span>
                        ) : (
                          <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>-- Cấp cao nhất --</span>
                        )}
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span>👤</span>
                          <strong style={{ color: '#0f172a' }}>{dept.managerName || 'Chưa gán'}</strong>
                        </div>
                      </td>
                      <td>
                        <span className="badge-children">{childCount} bộ phận con</span>
                      </td>
                      <td>
                        <div className="table-actions">
                          <button
                            type="button"
                            className="action-btn"
                            onClick={() => onAddChild(dept.id)}
                            title="Thêm bộ phận con"
                          >
                            ➕
                          </button>
                          <button
                            type="button"
                            className="action-btn"
                            onClick={() => onEdit(dept)}
                            title="Chỉnh sửa"
                          >
                            ✏️
                          </button>
                          <button
                            type="button"
                            className="action-btn"
                            onClick={() => onMove(dept)}
                            title="Di chuyển"
                          >
                            ↕️
                          </button>
                          <button
                            type="button"
                            className="action-btn"
                            onClick={() => onDelete(dept)}
                            title="Xóa"
                          >
                            🗑️
                          </button>
                        </div>
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

  // TREE & LIST VIEW RENDER
  return (
    <div className={`department-tree-container mode-${viewMode.toLowerCase()}`}>
      {treeData.map((rootNode) => renderTreeNode(rootNode, 0, null))}
    </div>
  );
};

export default DepartmentTree;
