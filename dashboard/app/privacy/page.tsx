export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">개인정보처리방침</h1>
        <p className="text-sm text-gray-400 mb-8">최종 수정일: 2026년 6월 26일</p>

        <section className="mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-2">1. 수집하는 개인정보</h2>
          <p className="text-gray-600 text-sm leading-relaxed">
            Lancerdesk는 서비스 제공을 위해 다음 정보를 수집합니다:
          </p>
          <ul className="list-disc list-inside text-sm text-gray-600 mt-2 space-y-1">
            <li>이름, 이메일 주소 (회원가입 시)</li>
            <li>숨고 플랫폼 내 채팅 메시지 데이터 (AI 답변 생성 목적)</li>
            <li>프로젝트 및 대화 관련 정보</li>
          </ul>
        </section>

        <section className="mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-2">2. 수집 목적</h2>
          <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
            <li>AI 기반 상담 답변 제안 서비스 제공</li>
            <li>프리랜서 업무 관리 기능 제공</li>
            <li>서비스 개선 및 통계 분석</li>
          </ul>
        </section>

        <section className="mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-2">3. 제3자 제공</h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            수집된 개인정보는 서비스 제공 목적 외에 제3자에게 제공하지 않습니다.
            단, AI 답변 생성을 위해 Anthropic의 Claude API를 이용하며, 이 과정에서
            대화 내용이 API 요청에 포함될 수 있습니다.
          </p>
        </section>

        <section className="mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-2">4. 보유 및 파기</h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            회원 탈퇴 시 또는 수집 목적이 달성된 후 지체 없이 개인정보를 파기합니다.
          </p>
        </section>

        <section className="mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-2">5. 정보주체의 권리</h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            이용자는 언제든지 개인정보 열람, 수정, 삭제를 요청할 수 있습니다.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-800 mb-2">6. 문의</h2>
          <p className="text-sm text-gray-600">
            개인정보 관련 문의:{' '}
            <a
              href="mailto:representative@ramus-kr.com"
              className="text-indigo-600 hover:underline"
            >
              representative@ramus-kr.com
            </a>
          </p>
        </section>

        <div className="mt-8 pt-6 border-t border-gray-100">
          <a href="/login" className="text-sm text-indigo-600 hover:underline">
            &larr; 로그인으로 돌아가기
          </a>
        </div>
      </div>
    </div>
  )
}
