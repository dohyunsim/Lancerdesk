'use client'

export default function SettingsPage() {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">설정</h1>
        <p className="text-gray-500 text-sm mt-1">Lancerdesk 연동 설정</p>
      </div>

      {/* Claude API Key */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-1">
          Claude API 키
        </h2>
        <p className="text-sm text-gray-500 mb-4">
          AI 답변 추천 기능을 사용하려면 Anthropic Claude API 키가 필요합니다.
          아래 링크에서 무료로 발급받을 수 있습니다.
        </p>
        <a
          href="https://console.anthropic.com/settings/keys"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
          Anthropic Console에서 API 키 발급받기
        </a>
        <p className="text-xs text-gray-400 mt-3">
          발급받은 키는 서버 환경변수 <code className="bg-gray-100 px-1 py-0.5 rounded">CLAUDE_API_KEY</code>에 설정하세요.
        </p>
      </div>

      {/* Chrome Extension */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-1">
          Chrome 확장 프로그램 연결
        </h2>
        <p className="text-sm text-gray-500 mb-4">
          숨고 페이지에서 AI CRM 기능을 사용하려면 Chrome 확장 프로그램을 설치하고 API 키를 입력하세요.
        </p>
        <ol className="text-sm text-gray-600 space-y-2 list-decimal list-inside">
          <li>Chrome에서 <code className="bg-gray-100 px-1 py-0.5 rounded">chrome://extensions</code> 접속</li>
          <li>개발자 모드 활성화</li>
          <li>&quot;압축해제된 확장 프로그램 로드&quot; 클릭 후 <code className="bg-gray-100 px-1 py-0.5 rounded">extension/</code> 폴더 선택</li>
          <li>숨고 채팅 페이지에서 사이드패널 아이콘 클릭</li>
          <li>발급받은 API 키와 User ID 입력 후 저장</li>
        </ol>
      </div>
    </div>
  )
}
