import React, { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import type { MilestoneRes, MilestoneCreatePayload, ContractBasic } from '../types/contractTypes';
import { fetchMilestones, createMilestone, updateMilestone, deleteMilestone } from '../api/contractsApi';

interface MilestoneTableProps {
  contract: ContractBasic;
}

export default function MilestoneTable({ contract }: MilestoneTableProps) {
  const [items, setItems] = useState<MilestoneRes[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<MilestoneRes | null>(null);
  const [form, setForm] = useState<MilestoneCreatePayload>({ name: '', amount: 0 });
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const list = await fetchMilestones(contract.id);
      setItems(list || []);
    } catch (e) {
      setError('Không thể tải mốc thanh toán');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [contract.id]);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', amount: 0 });
    setError(null);
    setIsModalOpen(true);
  };

  const openEdit = (m: MilestoneRes) => {
    setEditing(m);
    setForm({ name: m.name, amount: m.amount, percentage: m.percentage ?? null, expectedDate: m.expectedDate ?? null, acceptanceCondition: m.acceptanceCondition ?? null });
    setIsModalOpen(true);
  };

  const handleChange = (k: keyof MilestoneCreatePayload) => (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const v = e.target.value;
    setForm((prev) => ({ ...prev, [k]: k === 'amount' || k === 'percentage' ? Number(v || 0) : v }));
  };

  const sumAmounts = (list: MilestoneRes[]) => list.reduce((s, it) => s + Number(it.amount || 0), 0) + Number(form.amount || 0) - (editing ? Number(editing.amount || 0) : 0);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    // Basic validation: name and positive amount
    if (!form.name || Number(form.amount) <= 0) {
      setError('Vui lòng nhập tên mốc và giá trị > 0');
      return;
    }

    const totalAfter = sumAmounts(items);
    if (Math.abs(totalAfter - contract.value) > 0.001) {
      setError(`Tổng các mốc phải bằng giá trị hợp đồng (${contract.value}). Hiện: ${totalAfter}`);
      return;
    }

    try {
      if (editing) {
        await updateMilestone(contract.id, editing.id, form);
      } else {
        await createMilestone(contract.id, form);
      }
      setIsModalOpen(false);
      await load();
    } catch (err) {
      setError((err as Error).message || 'Lỗi khi lưu mốc');
    }
  };

  const handleDelete = async (m: MilestoneRes) => {
    if (!confirm(`Xóa mốc "${m.name}"?`)) return;
    try {
      await deleteMilestone(contract.id, m.id);
      await load();
    } catch (err) {
      setError('Không thể xóa mốc');
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3>Mốc thanh toán</h3>
        <button onClick={openCreate}>+ Thêm mốc</button>
      </div>

      {loading ? (
        <div>Đang tải...</div>
      ) : items.length === 0 ? (
        <div className="table-empty-state">Chưa có mốc thanh toán</div>
      ) : (
        <div className="table-responsive">
          <table className="user-data-table">
            <thead>
              <tr>
                <th>Tên mốc</th>
                <th>Phần trăm</th>
                <th>Giá trị</th>
                <th>Ngày dự kiến</th>
                <th>Trạng thái</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.map((m) => (
                <tr key={m.id}>
                  <td>{m.name}</td>
                  <td>{m.percentage ? `${m.percentage}%` : '-'}</td>
                  <td>{m.amount.toLocaleString()}</td>
                  <td>{m.expectedDate ?? '-'}</td>
                  <td>{m.status}</td>
                  <td style={{ textAlign: 'right' }}>
                    <button onClick={() => openEdit(m)}>Sửa</button>
                    <button onClick={() => handleDelete(m)} style={{ marginLeft: 8 }}>
                      Xóa
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {isModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsModalOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <form onSubmit={handleSubmit} style={{ padding: 16 }}>
              <h4 className="modal-title">{editing ? 'Sửa mốc' : 'Tạo mốc'}</h4>
              {error && <div className="form-error">{error}</div>}

              <label style={{ marginTop: 8 }}>Tên mốc</label>
              <input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />

              <label style={{ marginTop: 8 }}>Phần trăm (%)</label>
              <input value={form.percentage ?? ''} onChange={(e) => setForm((p) => ({ ...p, percentage: e.target.value ? Number(e.target.value) : null }))} />

              <label style={{ marginTop: 8 }}>Giá trị</label>
              <input type="number" value={form.amount} onChange={(e) => setForm((p) => ({ ...p, amount: Number(e.target.value) }))} />

              <label style={{ marginTop: 8 }}>Ngày dự kiến</label>
              <input type="date" value={form.expectedDate ?? ''} onChange={(e) => setForm((p) => ({ ...p, expectedDate: e.target.value || null }))} />

              <label style={{ marginTop: 8 }}>Điều kiện nghiệm thu</label>
              <textarea value={form.acceptanceCondition ?? ''} onChange={(e) => setForm((p) => ({ ...p, acceptanceCondition: e.target.value }))} />

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
                <button type="button" onClick={() => setIsModalOpen(false)}>
                  Hủy
                </button>
                <button type="submit">Lưu</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
