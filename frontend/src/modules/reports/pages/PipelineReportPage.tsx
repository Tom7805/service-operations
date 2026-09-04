import React, { useEffect, useState } from 'react';
import { getPipelineReport } from '../api/reportsApi';
import type { PipelineReportRes } from '../types/pipelineReportTypes';
import FunnelChart from '../components/FunnelChart';

export default function PipelineReportPage(): JSX.Element {
  const [data, setData] = useState<PipelineReportRes | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    getPipelineReport()
      .then((res) => {
        if (!mounted) return;
        setData(res);
        setError(null);
      })
      .catch((err) => {
        console.error(err);
        setError(err?.message || 'Đã có lỗi khi tải báo cáo.');
        setData(null);
      })
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, []);

  if (loading) return <div>Đang tải báo cáo...</div>;
  if (error) return <div className="text-red-600">{error}</div>;
  if (!data) return <div>Không có dữ liệu.</div>;

  return (
      <div>
        <h1 className="text-2xl font-semibold mb-4">Báo cáo đường ống bán hàng theo giai đoạn</h1>
        <div className="mb-4">
          <strong>Tổng cơ hội:</strong> {data.totalOpportunityCount.toLocaleString('vi-VN')} —{' '}
          <strong>Tổng giá trị:</strong> {data.totalExpectedValue.toLocaleString('vi-VN')} VND
        </div>
        <div className="mb-2 text-sm text-gray-600">Sinh lúc: {new Date(data.generatedAt).toLocaleString()}</div>

        <div className="mb-6 overflow-x-auto">
          <FunnelChart stages={data.stages} total={data.totalOpportunityCount} />
        </div>

        <div className="mt-6 grid grid-cols-1 gap-3">
          {data.stages.map((s) => (
            <div key={s.stage} className="p-3 border rounded flex justify-between items-center">
              <div>
                <div className="font-medium">{s.stage}</div>
                <div className="text-sm text-gray-600">Cơ hội: {s.opportunityCount} — Trung bình: {s.averageDaysInStage} ngày</div>
              </div>
              <div className="text-right">
                <div className="font-medium">{s.totalExpectedValue.toLocaleString('vi-VN')} VND</div>
                {s.stalledCount > 0 && (
                  <div className="text-yellow-700 text-sm mt-1">Có {s.stalledCount} cơ hội đọng lâu — ID: {s.stalledOpportunityIds.join(', ')}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
  );
}
