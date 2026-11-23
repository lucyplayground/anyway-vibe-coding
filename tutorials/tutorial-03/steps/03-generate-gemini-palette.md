# 03. Gemini API로 팔레트 생성

- 상태: 완료

## 사용자 프롬프트 원문
```text
내 단어를 Gemini API를 사용해서 보내고 다채로운 사각형 다섯 개를 보여 주는 코드를 추가해 줘.
Gemini API 공식 문서를 참고해줘.
```

## AI 응답 (요약)
Gemini 공식 시작 안내와 구조화 출력 문서를 참고해 서버에서 Interactions REST API를 호출하고, 입력 단어에 어울리는 서로 다른 HEX 색상 다섯 개를 받아 정사각형으로 표시하도록 구현했다. 생성·Enter·셔플을 연결하고 로딩, 중복 클릭 방지, 입력 및 API 오류 안내를 추가했다. API 키는 서버 환경 설정에서만 사용하며 실제 키 입력과 실행은 사용자가 직접 진행한다. 실행 방법은 HTML 직접 열기에서 Node.js 로컬 서버 접속으로 변경했다.

참고 문서:
- https://ai.google.dev/gemini-api/docs/get-started
- https://ai.google.dev/gemini-api/docs/structured-output
- https://ai.google.dev/gemini-api/docs/models/gemini-3.8-flash

## 생성·변경 내용
- `app/gemini.mjs`: API 키 헤더, JSON Schema, REST 응답 파싱, 색상 수·HEX·중복 검증 및 오류 처리.
- `app/server.mjs`: 로컬 서버, `/api/palette` 경로, 입력 크기 제한, 동일 출처 검사 및 공개 파일 허용 목록.
- `app/app.js`: 단어 전송, 생성·셔플 연결, 다섯 색상 표시, 요청 중 상태와 오류 안내.
- `app/index.html`: 폼, 스크립트, 상태 안내와 버튼 식별자 연결.
- `app/style.css`: 정사각형 색상과 HEX 표시, 반응형 배치 및 로딩 상태 스타일.
- `app/package.json`: Node.js 실행과 테스트 명령.
- `app/.env.example`, `app/.gitignore`: 비밀 값 없는 설정 예시와 환경 파일 Git 제외 규칙.
- `app/tests/palette.test.mjs`, `app/tests/ui.test.mjs`: 가짜 키·모의 응답 기반 API, HTTP 경로, 화면 갱신 및 오류 흐름 검증 코드.
- `README.md`: API 키 설정, 서버 실행, 모델, 공식 문서 및 검증 방법 안내.
- `steps/03-generate-gemini-palette.md`: 개발 요청 원문과 변경 내용 기록.
