import { Conversation } from "@/lib/api";

const CATEGORY_LABELS: Record<string, string> = {
  ppt: "PPT",
  design: "디자인",
  video: "영상",
  writing: "글쓰기",
  dev: "개발",
  general: "일반",
};

const CATEGORY_COLORS: Record<string, string> = {
  ppt: "bg-orange-100 text-orange-700",
  design: "bg-pink-100 text-pink-700",
  video: "bg-purple-100 text-purple-700",
  writing: "bg-blue-100 text-blue-700",
  dev: "bg-green-100 text-green-700",
  general: "bg-gray-100 text-gray-600",
};

interface ConversationCardProps {
  conversation: Conversation;
  onDelete: (id: string) => void;
}

export default function ConversationCard({
  conversation,
  onDelete,
}: ConversationCardProps) {
  const messages = conversation.messages || [];
  const lastMessage = messages[messages.length - 1];
  const dateStr = new Date(conversation.created_at).toLocaleDateString(
    "ko-KR",
    { year: "numeric", month: "short", day: "numeric" }
  );

  return (
    <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-4 flex flex-col gap-3 hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <span
          className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold ${
            CATEGORY_COLORS[conversation.category] ?? CATEGORY_COLORS.general
          }`}
        >
          {CATEGORY_LABELS[conversation.category] ?? conversation.category}
        </span>
        <span className="text-xs text-gray-400 whitespace-nowrap">{dateStr}</span>
      </div>

      {/* URL */}
      {conversation.soomgo_url && (
        <a
          href={conversation.soomgo_url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-indigo-600 hover:underline truncate block"
          title={conversation.soomgo_url}
        >
          {conversation.soomgo_url}
        </a>
      )}

      {/* Last message preview */}
      {lastMessage ? (
        <div className="text-xs text-gray-600 bg-gray-50 rounded-lg p-2.5 line-clamp-3">
          <span className="font-semibold text-gray-500">
            {lastMessage.role === "freelancer" ? "나" : "클라이언트"}:
          </span>{" "}
          {lastMessage.content}
        </div>
      ) : (
        <p className="text-xs text-gray-400">메시지 없음</p>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-1">
        <span className="text-xs text-gray-400">
          메시지 {messages.length}개
        </span>
        <button
          onClick={() => onDelete(conversation.id)}
          className="text-xs text-red-500 hover:text-red-700 font-medium"
        >
          삭제
        </button>
      </div>
    </div>
  );
}
