"use client";

import { useEffect, useState } from "react";
import { conversationsApi, Conversation } from "@/lib/api";
import ConversationCard from "@/components/conversations/ConversationCard";

export default function ConversationsPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadConversations() {
    try {
      setLoading(true);
      const data = await conversationsApi.list();
      setConversations(data);
    } catch (err) {
      setError("대화 목록을 불러오지 못했습니다.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadConversations();
  }, []);

  async function handleDelete(id: string) {
    if (!confirm("이 대화를 삭제하시겠습니까?")) return;
    await conversationsApi.delete(id);
    await loadConversations();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">대화 목록</h1>
        <span className="text-sm text-gray-500">
          총 {conversations.length}건
        </span>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-4 border-indigo-600 border-t-transparent" />
        </div>
      ) : conversations.length === 0 ? (
        <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-8 text-center text-gray-400">
          대화가 없습니다. Chrome 확장 프로그램을 사용해 숨고 대화를 수집해보세요.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {conversations.map((conv) => (
            <ConversationCard
              key={conv.id}
              conversation={conv}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
