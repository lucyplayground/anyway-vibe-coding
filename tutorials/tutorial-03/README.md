# 튜토리얼 03

## 실습 제목
Tutorial 3 AI에 기반한 컬러 팔레트 생성기 만들기

## 목표
단순한 키워드로 조화로운 색상 조합을 제안하는 도구를 만드세요.

## 실행 방법
Node.js 22 이상이 필요합니다. 외부 패키지 설치는 필요 없습니다.

1. [Google AI Studio](https://aistudio.google.com/)에서 Gemini API 키를 발급받습니다.
2. `app/.env.example`을 참고해 **사용자가 직접** `app/.env` 파일을 만들고 `GEMINI_API_KEY`에 키를 입력합니다. `.env`는 Git에서 제외됩니다. 키를 HTML이나 `app.js`에 넣지 않습니다.
3. 저장소 루트에서 실행합니다.

   ```sh
   cd tutorials/tutorial-03/app
   npm start
   ```

4. 브라우저에서 [http://127.0.0.1:3000](http://127.0.0.1:3000)을 엽니다.
5. 단어를 입력하고 `생성` 또는 Enter를 누릅니다. `셔플`은 현재 입력한 단어로 새 팔레트를 요청합니다.

이제 HTML 파일을 직접 여는 대신 로컬 서버 주소로 접속해야 합니다. 설정을 바꾼 뒤에는 서버를 다시 시작합니다. 종료는 터미널에서 `Ctrl+C`를 누릅니다.

기본 모델은 `gemini-3.8-flash`입니다. `GEMINI_MODEL`로 변경할 수 있으며, 해당 모델은 구조화된 JSON 출력을 지원해야 합니다. API 키의 모델 접근 권한과 할당량에 따라 요청이 실패할 수 있습니다.

단순한 색상 생성에 맞춰 `generation_config.thinking_level`은 `low`로 지정합니다.

### 재시도와 대체 모델
- 기본 모델(`GEMINI_MODEL`)에 최대 3번 요청합니다. 요청마다 20초까지 기다리고, 실패하면 약 1초, 2초 간격으로 다시 시도합니다.
- 다시 시도하는 오류는 혼잡(503), 시간 초과(504·응답 지연), 요청 한도(429), 기타 서버 오류(500·502), 잘못된 색상 응답입니다.
- 3번 모두 실패하면 대체 모델(`GEMINI_FALLBACK_MODEL`, 기본값 `gemini-3.5-flash-lite`)에 한 번 더 요청합니다. 기본 모델 이름을 찾을 수 없는 경우(404)는 재시도 없이 바로 대체 모델로 넘어갑니다.
- API 키나 요청 형식 문제(400·401·403)는 다시 시도해도 해결되지 않으므로 바로 안내합니다.
- 대체 모델로 생성하면 화면에 사용한 모델 이름을 알려 줍니다. 재시도와 전환 기록은 서버 터미널에 표시됩니다.
- 기본 모델과 대체 모델이 같으면 대체 요청은 보내지 않습니다.
- 최악의 경우 서버는 약 83초 동안 시도하며, 브라우저는 최대 100초까지 기다립니다.

## 현재 구현
- 단어 입력 상자와 나란히 배치한 `생성`·`셔플` 버튼
- 서버를 통한 Gemini API 요청과 서로 다른 HEX 색상 다섯 개 검증
- 색상별 정사각형 다섯 개와 HEX 코드 표시
- 로딩 중 중복 요청 방지, 빈 입력·요청 실패·시간 초과 안내
- 일시적 오류 시 기본 모델 최대 3회 재시도 후 대체 모델로 자동 전환

## API 구성과 참고 문서

브라우저는 `/api/palette`에 단어를 보내고, 로컬 Node 서버가 API 키를 헤더에 넣어 Gemini Interactions REST API를 호출합니다. `response_format`의 JSON Schema로 다섯 색상을 요청하며, REST 응답의 `steps` 중 `model_output`의 텍스트를 읽습니다. 서버는 공개 파일 세 개만 제공하고 `.env`나 서버 코드는 제공하지 않습니다. 이 서버는 로컬 실습용이며 `127.0.0.1`에서만 연결을 받습니다.

- [공식 시작 안내: REST 요청 및 응답 구조](https://ai.google.dev/gemini-api/docs/get-started)
- [공식 구조화 출력 안내: JSON Schema](https://ai.google.dev/gemini-api/docs/structured-output)
- [공식 모델 안내: Gemini 3.8 Flash](https://ai.google.dev/gemini-api/docs/models/gemini-3.8-flash)
- [공식 추론 수준 안내](https://ai.google.dev/gemini-api/docs/thinking)

## 검증 방법

`app/`에서 `npm test`를 실행합니다. 테스트는 가짜 API 키와 모의 Gemini 응답만 사용하며 `.env`를 읽거나 실제 Gemini에 요청하지 않습니다. 실제 키 설정과 생성 결과 확인은 사용자가 직접 진행합니다.
