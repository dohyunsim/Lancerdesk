"use client";

import { useState, useMemo } from "react";
import { Project } from "@/lib/api";
import { SOOMGO_CATEGORIES } from "@/lib/soomgo-categories";

type ProjectFormData = Omit<Project, "id" | "created_at" | "updated_at" | "user_id">;

interface ProjectFormProps {
  initialData?: Project | null;
  onSubmit: (data: ProjectFormData) => Promise<void>;
  onCancel: () => void;
}

const STATUSES = ["active", "completed", "paused", "cancelled"];
const STATUS_LABELS: Record<string, string> = {
  active: "진행 중",
  completed: "완료",
  paused: "보류",
  cancelled: "취소",
};

const PARENT_CATS = Object.keys(SOOMGO_CATEGORIES);

export default function ProjectForm({ initialData, onSubmit, onCancel }: ProjectFormProps) {
  const [form, setForm] = useState<ProjectFormData>({
    title: initialData?.title ?? "",
    category: initialData?.category ?? "",
    status: initialData?.status ?? "active",
    budget: initialData?.budget ?? null,
    client_name: initialData?.client_name ?? "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 카테고리 선택 상태
  const [parentCat, setParentCat] = useState<string>(() => {
    if (!initialData?.category) return "";
    return PARENT_CATS.find((p) =>
      SOOMGO_CATEGORIES[p].includes(initialData.category)
    ) ?? "";
  });
  const [catSearch, setCatSearch] = useState("");
  const [catDropdownOpen, setCatDropdownOpen] = useState(false);

  // 소분류 목록: 대분류 선택 시 해당 목록, 미선택 시 전체
  const subCats = useMemo(() => {
    const pool = parentCat ? SOOMGO_CATEGORIES[parentCat] : Object.values(SOOMGO_CATEGORIES).flat();
    if (!catSearch.trim()) return pool;
    return pool.filter((c) => c.toLowerCase().includes(catSearch.toLowerCase()));
  }, [parentCat, catSearch]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: name === "budget" ? (value === "" ? null : Number(value)) : value,
    }));
  }

  function selectCategory(cat: string) {
    setForm((prev) => ({ ...prev, category: cat }));
    setCatSearch("");
    setCatDropdownOpen(false);
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
    } catch {
      setError("저장에 실패했습니다.");
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
          <label className="block text-xs font-semibold text-gray-600 mb-1">프로젝트명 *</label>
          <input
            name="title"
            value={form.title}
            onChange={handleChange}
            placeholder="예) 김희연 - 프레젠테이션 디자인 상담"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
          />
        </div>

        {/* Category — 대분류 + 소분류 검색 */}
        <div className="sm:col-span-2">
          <label className="block text-xs font-semibold text-gray-600 mb-1">카테고리</label>

          {/* 대분류 탭 */}
          <div className="flex flex-wrap gap-1.5 mb-2">
            <button
              type="button"
              onClick={() => setParentCat("")}
              className={`px-2.5 py-1 rounded-full text-xs font-semibold border transition-colors ${
                parentCat === ""
                  ? "bg-indigo-600 text-white border-indigo-600"
                  : "border-gray-200 text-gray-600 hover:border-indigo-400"
              }`}
            >
              전체
            </button>
            {PARENT_CATS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setParentCat(p)}
                className={`px-2.5 py-1 rounded-full text-xs font-semibold border transition-colors ${
                  parentCat === p
                    ? "bg-indigo-600 text-white border-indigo-600"
                    : "border-gray-200 text-gray-600 hover:border-indigo-400"
                }`}
              >
                {p}
              </button>
            ))}
          </div>

          {/* 소분류 검색 + 드롭다운 */}
          <div className="relative">
            <input
              type="text"
              value={catSearch || form.category}
              onFocus={() => { setCatSearch(""); setCatDropdownOpen(true); }}
              onChange={(e) => { setCatSearch(e.target.value); setCatDropdownOpen(true); }}
              onBlur={() => setTimeout(() => setCatDropdownOpen(false), 150)}
              placeholder="서비스명 검색 (예: PPT, 번역, 영상...)"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
            />
            {form.category && !catDropdownOpen && (
              <span className="absolute right-3 top-2 text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-semibold">
                {form.category}
              </span>
            )}
            {catDropdownOpen && subCats.length > 0 && (
              <ul className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {subCats.slice(0, 50).map((cat) => (
                  <li
                    key={cat}
                    onMouseDown={() => selectCategory(cat)}
                    className={`px-3 py-2 text-sm cursor-pointer hover:bg-indigo-50 ${
                      form.category === cat ? "font-semibold text-indigo-600" : "text-gray-700"
                    }`}
                  >
                    {cat}
                  </li>
                ))}
                {subCats.length > 50 && (
                  <li className="px-3 py-2 text-xs text-gray-400 text-center">
                    {subCats.length - 50}개 더 있음 — 검색어를 입력하세요
                  </li>
                )}
              </ul>
            )}
          </div>
        </div>

        {/* Status */}
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">상태</label>
          <select
            name="status"
            value={form.status}
            onChange={handleChange}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>{STATUS_LABELS[s]}</option>
            ))}
          </select>
        </div>

        {/* Client Name */}
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">클라이언트명</label>
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
          <label className="block text-xs font-semibold text-gray-600 mb-1">예산 (원)</label>
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
