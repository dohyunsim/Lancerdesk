"use client";

import { useEffect, useState } from "react";
import { analyticsApi, AnalyticsSummary, MonthlyData } from "@/lib/api";
import StatCard from "@/components/dashboard/StatCard";

const MONTH_NAMES = [
  "1월", "2월", "3월", "4월", "5월", "6월",
  "7월", "8월", "9월", "10월", "11월", "12월",
];

const CATEGORY_LABELS: Record<string, string> = {
  ppt: "PPT/프레젠테이션",
  design: "디자인",
  video: "영상/편집",
  writing: "글쓰기/번역",
  dev: "개발",
  general: "일반",
};

export default function AnalyticsPage() {
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [monthly, setMonthly] = useState<MonthlyData[]>([]);
  const [year, setYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [s, m] = await Promise.all([
          analyticsApi.summary(),
          analyticsApi.monthly(year),
        ]);
        setSummary(s);
        setMonthly(m);
      } catch (err) {
        setError("분석 데이터를 불러오지 못했습니다.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [year]);

  const maxConversations = Math.max(...monthly.map((m) => m.conversations), 1);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">분석</h1>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Summary */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="전체 프로젝트" value={summary?.total_projects ?? 0} color="indigo" />
        <StatCard label="활성 프로젝트" value={summary?.active_projects ?? 0} color="emerald" />
        <StatCard label="전체 대화" value={summary?.total_conversations ?? 0} color="violet" />
        <StatCard label="AI 답변 생성" value={summary?.total_ai_responses ?? 0} color="amber" />
      </div>

      {/* Category Breakdown */}
      <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
          카테고리별 대화 비율
        </h2>
        <div className="space-y-3">
          {Object.entries(summary?.category_breakdown ?? {}).map(([cat, count]) => {
            const total = summary?.total_conversations || 1;
            const pct = Math.round((count / total) * 100);
            return (
              <div key={cat}>
                <div className="flex justify-between text-xs text-gray-600 mb-1">
                  <span>{CATEGORY_LABELS[cat] ?? cat}</span>
                  <span className="font-semibold">{count}건 ({pct}%)</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div
                    className="bg-indigo-500 h-2 rounded-full transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
          {Object.keys(summary?.category_breakdown ?? {}).length === 0 && (
            <p className="text-sm text-gray-400">데이터 없음</p>
          )}
        </div>
      </section>

      {/* Monthly Bar Chart */}
      <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
            월별 대화 현황
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setYear((y) => y - 1)}
              className="p-1 text-gray-400 hover:text-gray-700 text-lg"
            >
              ‹
            </button>
            <span className="text-sm font-semibold">{year}년</span>
            <button
              onClick={() => setYear((y) => y + 1)}
              className="p-1 text-gray-400 hover:text-gray-700 text-lg"
            >
              ›
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-4 border-indigo-600 border-t-transparent" />
          </div>
        ) : (
          <div className="flex items-end gap-2 h-40">
            {monthly.map((row) => (
              <div key={row.month} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full flex flex-col items-center gap-0.5">
                  <div
                    className="w-full bg-indigo-500 rounded-t transition-all"
                    style={{
                      height: `${Math.round((row.conversations / maxConversations) * 100)}px`,
                      minHeight: row.conversations > 0 ? "4px" : "0",
                    }}
                    title={`${row.conversations}건`}
                  />
                </div>
                <span className="text-xs text-gray-400">{MONTH_NAMES[row.month - 1]}</span>
                <span className="text-xs font-semibold text-indigo-600">{row.conversations}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
