import React, { useCallback, useEffect, useState } from 'react';
import type {
  CreateDepartmentPayload,
  Department,
  DepartmentAuditLog,
  DepartmentTreeNode,
  ManagerUserOption,
  MoveDepartmentPayload,
  UpdateDepartmentPayload,
} from '../types/departmentTypes';
import {
  createDepartment,
  deleteDepartment,
  getDepartments,
  getDepartmentTree,
  moveDepartment,
  updateDepartment,
} from '../api/departmentsApi';
import { getUsers } from '../../users/api/usersApi';

import DepartmentTree, { ViewMode } from '../components/DepartmentTree';
import DepartmentFormModal from '../components/DepartmentFormModal';
import DepartmentMoveModal from '../components/DepartmentMoveModal';
import DepartmentDeleteModal from '../components/DepartmentDeleteModal';

interface DepartmentTreePageProps {
  currentUserRoles?: string[];
  currentUserName?: string;
}

export const DepartmentTreePage: React.FC<DepartmentTreePageProps> = ({
  currentUserRoles = ['VT-07'],
  currentUserName = 'Quản trị viên',
}) => {
  // TC-04 Permission check: Only VT-07 (Quản trị viên) can manage organization tree
  const isAdmin = currentUserRoles.includes('VT-07');

  const [treeData, setTreeData] = useState<DepartmentTreeNode[]>([]);
  const [flatData, setFlatData] = useState<Department[]>([]);
  const [managersList, setManagersList] = useState<ManagerUserOption[]>([]);

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Search & View Mode filters
  const [searchKeyword, setSearchKeyword] = useState<string>('');
  const [viewMode, setViewMode] = useState<ViewMode>('TREE');

  // Modals state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [defaultParentId, setDefaultParentId] = useState<number | null>(null);

  const [isMoveOpen, setIsMoveOpen] = useState(false);
  const [moveDept, setMoveDept] = useState<Department | null>(null);

  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deleteDept, setDeleteDept] = useState<Department | null>(null);

  // Audit Logs (TC-05)
  const [auditLogs, setAuditLogs] = useState<DepartmentAuditLog[]>([
    {
      id: 'dept-log-1',
      timestamp: new Date(Date.now() - 7200000).toLocaleTimeString('vi-VN') + ' ' + new Date().toLocaleDateString('vi-VN'),
      action: 'Khởi tạo sơ đồ tổ chức',
      performedBy: 'Quản trị viên',
      targetDepartment: 'Ban Giám Đốc',
      details: 'Khai báo nút đơn vị cấp gốc hệ thống',
    },
  ]);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const addAuditLog = (action: string, targetDepartment: string, details: string) => {
    const newLog: DepartmentAuditLog = {
      id: `dept-log-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString('vi-VN') + ' ' + new Date().toLocaleDateString('vi-VN'),
      action,
      performedBy: currentUserName,
      targetDepartment,
      details,
    };
    setAuditLogs((prev) => [newLog, ...prev]);
  };

  const fetchTreeAndDepartments = useCallback(async () => {
    if (!isAdmin) return;
    setLoading(true);
    setError(null);
    try {
      const [treeRes, flatRes, usersRes] = await Promise.all([
        getDepartmentTree(),
        getDepartments(),
        getUsers().catch(() => []),
      ]);

      setTreeData(treeRes);
      setFlatData(flatRes);

      const managerOpts: ManagerUserOption[] = usersRes.map((u) => ({
        id: u.id,
        fullName: u.fullName,
        username: u.username,
        departmentId: u.departmentId,
      }));
      setManagersList(managerOpts);
    } catch (err: any) {
      setError(err.message || 'Không thể tải cấu trúc cây tổ chức từ máy chủ.');
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    fetchTreeAndDepartments();
  }, [fetchTreeAndDepartments]);

  // Actions
  const handleOpenCreateRoot = () => {
    setEditingDept(null);
    setDefaultParentId(null);
    setIsFormOpen(true);
  };

  const handleOpenCreateChild = (parentId: number) => {
    setEditingDept(null);
    setDefaultParentId(parentId);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (dept: Department) => {
    setEditingDept(dept);
    setDefaultParentId(null);
    setIsFormOpen(true);
  };

  const handleOpenMove = (dept: Department) => {
    setMoveDept(dept);
    setIsMoveOpen(true);
  };

  const handleOpenDelete = (dept: Department) => {
    setDeleteDept(dept);
    setIsDeleteOpen(true);
  };

  // API Call Handlers
  const handleSubmitCreate = async (payload: CreateDepartmentPayload) => {
    const created = await createDepartment(payload);
    showToast(`Đã thêm thành công bộ phận "${created.name}"`);
    addAuditLog('Tạo bộ phận', created.name, `Khai báo mới bộ phận thuộc ID cha: ${created.parentId ?? 'Root'}`);
    await fetchTreeAndDepartments();
  };

  const handleSubmitUpdate = async (id: number, payload: UpdateDepartmentPayload) => {
    const updated = await updateDepartment(id, payload);
    showToast(`Cập nhật bộ phận "${updated.name}" thành công`);
    addAuditLog('Cập nhật bộ phận', updated.name, `Đổi thông tin tên/người quản lý bộ phận ID: ${id}`);
    await fetchTreeAndDepartments();
  };

  const handleConfirmMove = async (id: number, payload: MoveDepartmentPayload) => {
    const moved = await moveDepartment(id, payload);
    showToast(`Đã di chuyển bộ phận "${moved.name}" sang vị trí mới`);
    addAuditLog('Di chuyển bộ phận', moved.name, `Di chuyển bộ phận sang vị trí cha mới: ${moved.parentId ?? 'Root'}`);
    await fetchTreeAndDepartments();
  };

  const handleConfirmDelete = async (id: number) => {
    const target = flatData.find((d) => d.id === id);
    const deptName = target ? target.name : `DEPT-${id}`;
    await deleteDepartment(id);
    showToast(`Đã xóa bộ phận "${deptName}" khỏi sơ đồ tổ chức`);
    addAuditLog('Xóa bộ phận', deptName, `Hủy bỏ khai báo bộ phận ID: ${id}`);
    await fetchTreeAndDepartments();
  };

  // TC-04 Render Access Denied screen for non-admin users
  if (!isAdmin) {
    return (
      <div className="access-denied-container">
        <div className="access-denied-card">
          <div className="access-denied-icon">🚫</div>
          <span className="eyebrow text-danger">Từ chối truy cập (Access Denied)</span>
          <h2>Bạn không có thẩm quyền truy cập màn hình này</h2>
          <p>
            Chức năng Khai báo cây tổ chức chỉ dành riêng cho vai trò <strong>Quản trị viên (VT-07)</strong>.
            Hệ thống đã ghi lại lần truy cập này vào nhật ký bảo mật.
          </p>
          <div className="security-log-badge">
            <span>🛡️ Lần thử truy cập: {new Date().toLocaleString('vi-VN')}</span>
            <span>Tài khoản: {currentUserName}</span>
          </div>
        </div>
      </div>
    );
  }

  // Dashboard Stats calculation
  const totalDepts = flatData.length;
  const rootDepts = flatData.filter((d) => d.parentId === null).length;
  const subDepts = flatData.filter((d) => d.parentId !== null).length;
  const uniqueManagers = new Set(flatData.map((d) => d.managerId).filter(Boolean)).size;

  return (
    <div className="user-management-page">
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className={`toast-notification toast--${toastMessage.type}`} role="status">
          <span className="toast__icon">{toastMessage.type === 'success' ? '✅' : '⚠️'}</span>
          <span>{toastMessage.text}</span>
          <button type="button" className="toast__close" onClick={() => setToastMessage(null)}>
            ✕
          </button>
        </div>
      )}

      {/* Page Header */}
      <div className="page-header">
        <div>
          <div className="breadcrumb">
            <span>Hệ thống</span> / <span>Quản trị & Phân quyền</span> / <span className="active">Khai báo cây tổ chức</span>
          </div>
          <h1 className="page-title">Màn hình khai báo cây tổ chức (NCL-01-CN-003)</h1>
          <p className="page-subtitle">
            Thiết lập sơ đồ thứ bậc phòng ban, đơn vị trực thuộc, gán người quản lý và quản lý mối quan hệ cây tổ chức công ty.
          </p>
        </div>
        <div className="page-header-actions">
          <button type="button" className="btn-primary btn-lg" onClick={handleOpenCreateRoot}>
            <span className="btn-icon">🏛️</span> Thêm bộ phận cấp gốc
          </button>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-card__icon stat-card__icon--blue">🏛️</div>
          <div>
            <span className="stat-card__label">Tổng số bộ phận</span>
            <strong className="stat-card__value">{totalDepts}</strong>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card__icon stat-card__icon--green">⭐</div>
          <div>
            <span className="stat-card__label">Đơn vị Cấp Gốc</span>
            <strong className="stat-card__value text-success">{rootDepts}</strong>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card__icon stat-card__icon--purple">📂</div>
          <div>
            <span className="stat-card__label">Bộ phận phụ thuộc</span>
            <strong className="stat-card__value">{subDepts}</strong>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card__icon stat-card__icon--red">👔</div>
          <div>
            <span className="stat-card__label">Trưởng bộ phận</span>
            <strong className="stat-card__value">{uniqueManagers}</strong>
          </div>
        </div>
      </div>

      {/* Global Error Banner */}
      {error && (
        <div className="alert alert--error mb-4" role="alert">
          <span>⚠️ {error}</span>
          <button type="button" className="btn-secondary text-dark ml-auto" onClick={fetchTreeAndDepartments}>
            Thử lại
          </button>
        </div>
      )}

      {/* Toolbar & Filter Bar */}
      <div className="user-table-card mb-4" style={{ borderRadius: '16px 16px 0 0', marginBottom: 0 }}>
        <div className="user-table-toolbar">
          <div className="search-box">
            <span className="search-box__icon">🔍</span>
            <input
              type="text"
              className="search-box__input"
              placeholder="Tìm kiếm theo tên bộ phận..."
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
            />
            {searchKeyword && (
              <button type="button" className="search-box__clear" onClick={() => setSearchKeyword('')}>
                ✕
              </button>
            )}
          </div>

          <div className="toolbar-filters">
            <div className="filter-group">
              <span className="filter-label">Chế độ xem:</span>
              <div className="status-tabs">
                <button
                  type="button"
                  className={`status-tab ${viewMode === 'TREE' ? 'status-tab--active' : ''}`}
                  onClick={() => setViewMode('TREE')}
                >
                  🌳 Sơ đồ Cây
                </button>
                <button
                  type="button"
                  className={`status-tab ${viewMode === 'LIST' ? 'status-tab--active' : ''}`}
                  onClick={() => setViewMode('LIST')}
                >
                  📋 Danh sách Nhánh
                </button>
                <button
                  type="button"
                  className={`status-tab ${viewMode === 'TABLE' ? 'status-tab--active' : ''}`}
                  onClick={() => setViewMode('TABLE')}
                >
                  📊 Bảng Dữ Liệu
                </button>
              </div>
            </div>

            <button
              type="button"
              className="btn-icon-refresh"
              onClick={fetchTreeAndDepartments}
              title="Làm mới dữ liệu từ máy chủ"
            >
              🔄
            </button>
          </div>
        </div>
      </div>

      {/* Tree Visualization */}
      <div className="tree-content-wrapper mb-4">
        <DepartmentTree
          treeData={treeData}
          flatData={flatData}
          loading={loading}
          searchKeyword={searchKeyword}
          viewMode={viewMode}
          onAddChild={handleOpenCreateChild}
          onEdit={handleOpenEdit}
          onMove={handleOpenMove}
          onDelete={handleOpenDelete}
        />
      </div>

      {/* Audit Log Stream section for TC-05 */}
      <div className="audit-log-card">
        <div className="audit-log-header">
          <h3 className="audit-log-title">📋 Nhật ký khai báo cây tổ chức (Audit Log)</h3>
          <span className="badge-pulse">Lưu vết 100% realtime</span>
        </div>
        <div className="audit-log-list">
          {auditLogs.map((log) => (
            <div key={log.id} className="audit-log-item">
              <div className="audit-log-icon">🏛️</div>
              <div className="audit-log-meta">
                <div className="audit-log-row">
                  <strong>{log.action}</strong> cho đơn vị <span className="highlight-username">{log.targetDepartment}</span>
                  <span className="audit-log-time">{log.timestamp}</span>
                </div>
                <p className="audit-log-details">{log.details} • Thực hiện bởi <em>{log.performedBy}</em></p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Create / Edit Form Modal */}
      <DepartmentFormModal
        isOpen={isFormOpen}
        editingDepartment={editingDept}
        defaultParentId={defaultParentId}
        departmentsList={flatData}
        managersList={managersList}
        onClose={() => setIsFormOpen(false)}
        onSubmitCreate={handleSubmitCreate}
        onSubmitUpdate={handleSubmitUpdate}
      />

      {/* Move Department Modal */}
      <DepartmentMoveModal
        isOpen={isMoveOpen}
        department={moveDept}
        departmentsList={flatData}
        onClose={() => setIsMoveOpen(false)}
        onConfirmMove={handleConfirmMove}
      />

      {/* Delete Department Modal */}
      <DepartmentDeleteModal
        isOpen={isDeleteOpen}
        department={deleteDept}
        hasChildren={deleteDept ? flatData.some((d) => d.parentId === deleteDept.id) : false}
        onClose={() => setIsDeleteOpen(false)}
        onConfirmDelete={handleConfirmDelete}
      />
    </div>
  );
};

export default DepartmentTreePage;
