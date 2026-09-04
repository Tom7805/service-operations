import { useEffect, useState } from 'react';
import { getPipelineReport } from '../api/reportsApi';
import type { PipelineReportRes } from '../types/pipelineReportTypes';
import FunnelChart from '../components/FunnelChart';
import { ICONS } from '../../../components/common/icons';

interface PipelineReportPageProps {
  currentUserRoles?: string[];
  currentUserName?: string;
}

export default function PipelineReportPage({
  currentUserRoles = ['VT-01'],
}: PipelineReportPageProps): JSX.Element {
  // NCL-03-CN-007-TC-03: chỉ Ban giám đốc (VT-01) hoặc Nhân viên kinh doanh (VT-04) được xem báo cáo
  const isAllowed = currentUserRoles.includes('VT-01') || currentUserRoles.includes('VT-04');

  const [data, setData] = useState<PipelineReportRes | null>(null);
  const [loading, setLoading] = useState(isAllowed);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAllowed) return;
    let mounted = true;
    setLoading(true);
    getPipelineReport()
      .then((res) => {
        if (!mounted) return;
        setData(res);
        setError(null);
      })
      .catch((err) => {
        if (!mounted) return;
        setError(err?.message || 'Đã có lỗi khi tải báo cáo.');
        setData(null);
      })
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, [isAllowed]);

  if (!isAllowed) {
    return (
      <div className="access-denied-container" data-testid="pipeline-report-access-denied">
        <div className="access-denied-card">
          <div className="access-denied-icon">{ICONS.shieldOff}</div>
          <h2>Bạn không có thẩm quyền truy cập màn hình này</h2>
          <p>
            Báo cáo đường ống bán hàng theo giai đoạn chỉ dành riêng cho vai trò{' '}
            <strong>Ban giám đốc (VT-01)</strong> hoặc <strong>Nhân viên kinh doanh (VT-04)</strong>.
          </p>
        </div>
      </div>
    );
  }

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
