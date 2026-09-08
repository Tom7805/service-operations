import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import MilestoneTable from '../components/MilestoneTable';
import { fetchContractBasic } from '../api/contractsApi';

export default function ContractDetailPage() {
  const { id } = useParams();
  const contractId = Number(id || 0);
  const [loading, setLoading] = useState(true);
  const [contract, setContract] = useState<{ id: number; value: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!contractId) return;
    setLoading(true);
    fetchContractBasic(contractId)
      .then((c) => setContract(c))
      .catch(() => setError('Không thể tải thông tin hợp đồng'))
      .finally(() => setLoading(false));
  }, [contractId]);

  if (!contractId) return <div>Không có id hợp đồng</div>;
  if (loading) return <div>Đang tải...</div>;
  if (error) return <div>{error}</div>;

  return (
    <div>
      <h2>Chi tiết hợp đồng #{contract?.id}</h2>
      <div>Giá trị hợp đồng: {contract?.value?.toLocaleString()}</div>
      <div style={{ marginTop: 16 }}>
        <MilestoneTable contract={{ id: contract!.id, value: contract!.value }} />
      </div>
    </div>
  );
}
