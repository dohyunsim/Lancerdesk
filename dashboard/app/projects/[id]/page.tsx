"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { projectsApi, Project } from "@/lib/api";

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const data = await projectsApi.get(id);
        setProject(data);
      } catch {
        setError("프로젝트를 불러오지 못했습니다.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  if (loading) return (
    <div className="flex justify-center py-12">
      <div className="animate-spin rounded-full h-8 w-8 border-4 border-indigo-600 border-t-transparent" />
    </div>
  );
  if (error) return <div className="text-red-500 p-4">{error}</div>;
  if (!project) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <a href="/projects" className="text-indigo-600 hover:underline text-sm">← 프로젝트 목록</a>
      </div>
      <h1 className="text-2xl font-bold text-gray-900">{project.title}</h1>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 space-y-3">
        {project.client_name && (
          <div><span className="text-sm text-gray-500">고객명</span>
            <p className="font-semibold">{project.client_name}</p></div>
        )}
        {project.category && (
          <div><span className="text-sm text-gray-500">카테고리</span>
            <p className="font-semibold">{project.category}</p></div>
        )}
        <div><span className="text-sm text-gray-500">상태</span>
          <p className="font-semibold">{project.status}</p></div>
        {project.budget && (
          <div><span className="text-sm text-gray-500">예산</span>
            <p className="font-semibold">{project.budget.toLocaleString()}원</p></div>
        )}
      </div>
    </div>
  );
}
