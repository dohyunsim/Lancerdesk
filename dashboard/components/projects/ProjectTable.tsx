import { Project } from "@/lib/api";

const STATUS_LABELS: Record<string, string> = {
  active: "진행 중",
  completed: "완료",
  cancelled: "취소",
  paused: "보류",
};

const STATUS_COLORS: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-700",
  completed: "bg-blue-100 text-blue-700",
  cancelled: "bg-red-100 text-red-700",
  paused: "bg-gray-100 text-gray-600",
};

interface ProjectTableProps {
  projects: Project[];
  onEdit: (project: Project) => void;
  onDelete: (id: string) => void;
}

export default function ProjectTable({
  projects,
  onEdit,
  onDelete,
}: ProjectTableProps) {
  if (projects.length === 0) {
    return (
      <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-8 text-center text-gray-400">
        프로젝트가 없습니다. 새 프로젝트를 추가해보세요.
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
      <table className="w-full text-sm">
        <thead className="border-b border-gray-100 bg-gray-50">
          <tr>
            <th className="text-left py-3 px-4 text-gray-500 font-semibold">프로젝트명</th>
            <th className="text-left py-3 px-4 text-gray-500 font-semibold">카테고리</th>
            <th className="text-left py-3 px-4 text-gray-500 font-semibold">클라이언트</th>
            <th className="text-right py-3 px-4 text-gray-500 font-semibold">예산</th>
            <th className="text-left py-3 px-4 text-gray-500 font-semibold">상태</th>
            <th className="text-left py-3 px-4 text-gray-500 font-semibold">등록일</th>
            <th className="py-3 px-4" />
          </tr>
        </thead>
        <tbody>
          {projects.map((project) => (
            <tr key={project.id} className="border-b border-gray-50 hover:bg-gray-50">
              <td className="py-3 px-4 font-medium text-gray-900">
                {project.title}
              </td>
              <td className="py-3 px-4 text-gray-600">{project.category}</td>
              <td className="py-3 px-4 text-gray-600">
                {project.client_name || "-"}
              </td>
              <td className="py-3 px-4 text-right text-gray-700">
                {project.budget != null
                  ? `₩${project.budget.toLocaleString()}`
                  : "-"}
              </td>
              <td className="py-3 px-4">
                <span
                  className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${
                    STATUS_COLORS[project.status] ?? "bg-gray-100 text-gray-600"
                  }`}
                >
                  {STATUS_LABELS[project.status] ?? project.status}
                </span>
              </td>
              <td className="py-3 px-4 text-gray-500">
                {new Date(project.created_at).toLocaleDateString("ko-KR")}
              </td>
              <td className="py-3 px-4">
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => onEdit(project)}
                    className="text-indigo-600 hover:text-indigo-800 text-xs font-medium"
                  >
                    수정
                  </button>
                  <button
                    onClick={() => onDelete(project.id)}
                    className="text-red-500 hover:text-red-700 text-xs font-medium"
                  >
                    삭제
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
