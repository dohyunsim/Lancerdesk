"use client";

import { useEffect, useState } from "react";
import { analyticsApi, AnalyticsSummary, MonthlyData } from "@/lib/api";
import StatCard from "@/components/dashboard/StatCard";

const CATEGORY_LABELS: Record<string, string> = {
  ppt: "PPT/프레젠테이션",
  design: "디자인",
  video: "영상/편집",
  writing: "글쓰기/번역",
  dev: "개발",
  general: "일반",
};

export default function DashboardPage() {
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [monthly, setMonthly] = useState<MonthlyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const currentYear = new Date().getFullYear();

  useEffect(() => {
    async function load() {
      try {
        const [summaryData, monthlyData] = await Promise.all([
          analyticsApi.summary(),
          analyticsApi.monthly(currentYear),
        ]);
        setSummary(summaryData);
        setMonthly(monthlyData);
      } catch (err) {
        setError("데이터를 불러오지 못했습니다. 백엔드 서버를 확인해주세요.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [currentYear]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">대시보드</h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard
          label="전체 프로젝트"
          value={summary?.total_projects ?? 0}
          color="indigo"
        />
        <StatCard
          label="활성 프로젝트"
          value={summary?.active_projects ?? 0}
          color="emerald"
        />
        <StatCard
          label="전체 대화"
          value={summary?.total_conversations ?? 0}
          color="violet"
        />
        <StatCard
          label="AI 답변 생성"
          value={summary?.total_ai_responses ?? 0}
          color="amber"
        />
      </div>

      {/* Category Breakdown */}
      <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
          카테고리별 대화 수
        </h2>
        <div className="flex flex-wrap gap-3">
          {Object.entries(summary?.category_breakdown ?? {}).map(([cat, count]) => (
            <div
              key={cat}
              className="flex items-center gap-2 bg-indigo-50 rounded-full px-4 py-1.5"
            >
              <span className="text-xs font-semibold text-indigo-700">
                {CATEGORY_LABELS[cat] ?? cat}
              </span>
              <span className="text-xs text-indigo-500 font-bold">{count}</span>
            </div>
          ))}
          {Object.keys(summary?.category_breakdown ?? {}).length === 0 && (
            <p className="text-sm text-gray-400">데이터 없음</p>
          )}
        </div>
      </section>

      {/* Monthly Activity */}
      <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
          {currentYear}년 월별 활동
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left py-2 px-3 text-gray-500 font-medium">월</th>
                <th className="text-right py-2 px-3 text-gray-500 font-medium">대화 수</th>
                <th className="text-right py-2 px-3 text-gray-500 font-medium">프로젝트 수</th>
              </tr>
            </thead>
            <tbody>
              {monthly.map((row) => (
                <tr key={row.month} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="py-2 px-3 font-medium">{row.month}월</td>
                  <td className="py-2 px-3 text-right text-indigo-600 font-semibold">
                    {row.conversations}
                  </td>
                  <td className="py-2 px-3 text-right text-emerald-600 font-semibold">
                    {row.projects}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
