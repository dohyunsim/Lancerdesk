"use client";

import { useState } from "react";
import { Project } from "@/lib/api";

type ProjectFormData = Omit<Project, "id" | "created_at" | "updated_at" | "user_id">;

interface ProjectFormProps {
  initialData?: Project | null;
  onSubmit: (data: ProjectFormData) => Promise<void>;
  onCancel: () => void;
}

const CATEGORIES = ["ppt", "design", "video", "writing", "dev", "general"];
const STATUSES = ["active", "completed", "paused", "cancelled"];

const STATUS_LABELS: Record<string, string> = {
  active: "진행 중",
  completed: "완료",
  paused: "보류",
  cancelled: "취소",
};

const CATEGORY_LABELS: Record<string, string> = {
  ppt: "PPT/프레젠테이션",
  design: "디자인",
  video: "영상/편집",
  writing: "글쓰기/번역",
  dev: "개발",
  general: "일반",
};

export default function ProjectForm({
  initialData,
  onSubmit,
  onCancel,
}: ProjectFormProps) {
  const [form, setForm] = useState<ProjectFormData>({
    title: initialData?.title ?? "",
    category: initialData?.category ?? "general",
    status: initialData?.status ?? "active",
    budget: initialData?.budget ?? null,
    client_name: initialData?.client_name ?? "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: name === "budget" ? (value === "" ? null : Number(value)) : value,
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) {
      setError("프로젝트명을 입력해주세요.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await onSubmit(form);
    } catch (err) {
      setError("저장에 실패했습니다.");
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {/* Title */}
        <div className="sm:col-span-2">
          <label className="block text-xs font-semibold text-gray-600 mb-1">
            프로젝트명 *
          </label>
          <input
            name="title"
            value={form.title}
            onChange={handleChange}
            placeholder="예) OO 회사 PPT 제작"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
          />
        </div>

        {/* Category */}
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">
            카테고리
          </label>
          <select
            name="category"
            value={form.category}
            onChange={handleChange}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {CATEGORY_LABELS[c]}
              </option>
            ))}
          </select>
        </div>

        {/* Status */}
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">
            상태
          </label>
          <select
            name="status"
            value={form.status}
            onChange={handleChange}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </div>

        {/* Client Name */}
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">
            클라이언트명
          </label>
          <input
            name="client_name"
            value={form.client_name}
            onChange={handleChange}
            placeholder="클라이언트 이름"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
          />
        </div>

        {/* Budget */}
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">
            예산 (원)
          </label>
          <input
            name="budget"
            type="number"
            min="0"
            value={form.budget ?? ""}
            onChange={handleChange}
            placeholder="예) 300000"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={submitting}
          className="bg-indigo-600 text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors"
        >
          {submitting ? "저장 중..." : "저장"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-5 py-2 rounded-lg text-sm font-semibold border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
        >
          취소
        </button>
      </div>
    </form>
  );
}
