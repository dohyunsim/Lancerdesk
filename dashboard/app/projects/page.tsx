"use client";

import { useEffect, useState } from "react";
import { projectsApi, Project } from "@/lib/api";
import ProjectTable from "@/components/projects/ProjectTable";
import ProjectForm from "@/components/projects/ProjectForm";

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  async function loadProjects() {
    try {
      setLoading(true);
      const data = await projectsApi.list();
      setProjects(data);
    } catch (err) {
      setError("프로젝트를 불러오지 못했습니다.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProjects();
  }, []);

  async function handleDelete(id: string) {
    if (!confirm("이 프로젝트를 삭제하시겠습니까?")) return;
    await projectsApi.delete(id);
    await loadProjects();
  }

  function handleEdit(project: Project) {
    setEditingProject(project);
    setShowForm(true);
  }

  function handleCloseForm() {
    setShowForm(false);
    setEditingProject(null);
  }

  async function handleFormSubmit(
    data: Omit<Project, "id" | "created_at" | "updated_at" | "user_id">
  ) {
    if (editingProject) {
      await projectsApi.update(editingProject.id, data);
    } else {
      await projectsApi.create(data);
    }
    handleCloseForm();
    await loadProjects();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">프로젝트</h1>
        <button
          onClick={() => setShowForm(true)}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors"
        >
          + 새 프로젝트
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
          {error}
        </div>
      )}

      {showForm && (
        <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-5">
          <h2 className="text-base font-semibold mb-4">
            {editingProject ? "프로젝트 수정" : "새 프로젝트 추가"}
          </h2>
          <ProjectForm
            initialData={editingProject}
            onSubmit={handleFormSubmit}
            onCancel={handleCloseForm}
          />
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-4 border-indigo-600 border-t-transparent" />
        </div>
      ) : (
        <ProjectTable
          projects={projects}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
}
