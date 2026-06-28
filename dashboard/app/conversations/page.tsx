"use client";

import { useEffect, useMemo, useState } from "react";
import { conversationsApi, Conversation } from "@/lib/api";
import ConversationCard from "@/components/conversations/ConversationCard";

export default function ConversationsPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 검색 + 카테고리 필터 상태
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");

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

  // 카테고리 동적 목록 (데이터 기반)
  const categoryOptions = useMemo(() => {
    const cats = Array.from(
      new Set(conversations.map((c) => c.category).filter(Boolean))
    ).sort();
    return cats;
  }, [conversations]);

  // 프론트엔드 필터 (client_name 또는 category 기준)
  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return conversations.filter((conv) => {
      const matchesSearch =
        !q ||
        (conv.client_name ?? "").toLowerCase().includes(q) ||
        (conv.category ?? "").toLowerCase().includes(q);
      const matchesCategory =
        !selectedCategory || conv.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [conversations, searchQuery, selectedCategory]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">대화 목록</h1>
        <span className="text-sm text-gray-500">
          총 {conversations.length}건
        </span>
      </div>

      {/* 검색 + 카테고리 필터 */}
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="고객명 또는 카테고리 검색..."
          className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
        />
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white min-w-[140px]"
        >
          <option value="">전체 카테고리</option>
          {categoryOptions.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </div>

      {/* 필터 결과 수 */}
      {(searchQuery || selectedCategory) && !loading && (
        <p className="text-sm text-gray-500">
          {filtered.length}건 표시 중 (전체 {conversations.length}건)
        </p>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-4 border-indigo-600 border-t-transparent" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-8 text-center text-gray-400">
          {conversations.length === 0
            ? "대화가 없습니다. Chrome 확장 프로그램을 사용해 숨고 대화를 수집해보세요."
            : "검색 결과가 없습니다."}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((conv) => (
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
