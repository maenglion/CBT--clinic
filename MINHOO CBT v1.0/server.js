// server.js (Node.js 백엔드 - Heroku 배포용)
// 필요한 패키지: express, node-fetch, cors, dotenv
// 프로젝트 루트에 .env 파일을 만들고 OPENAI_API_KEY="sk-..." 형태로 API 키를 저장하세요 (로컬 개발 시).
// Heroku 배포 시에는 Heroku Config Vars에 OPENAI_API_KEY를 설정해야 합니다.

import express from 'express';
import fetch from 'node-fetch';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path'; // path 모듈 추가
import { fileURLToPath } from 'url'; // __dirname, __filename을 위해 추가

dotenv.config(); // .env 파일에서 환경변수 로드 (로컬 개발 시)

const app = express();
// Heroku가 PORT 환경 변수를 제공합니다. 로컬에서는 3000번 포트 사용.
const port = process.env.PORT || 3000;

const OPENAI_API_KEY = process.env.OPENAI_API_KEY; // Heroku Config Vars 또는 .env 에서 로드

// ESM 환경에서 __dirname, __filename 설정
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// CORS 설정 (개발 중에는 모든 출처 허용, 프로덕션에서는 특정 프론트엔드 출처 지정 권장)
// 예: const corsOptions = { origin: 'https://your-frontend-domain.com' };
// app.use(cors(corsOptions));
app.use(cors());
app.use(express.json()); // 요청 본문을 JSON으로 파싱

// 정적 파일 제공 설정 (public 폴더 내 파일들 제공)
// 프로젝트 루트에 'public' 폴더를 만들고, 그 안에 index.html, talk.html, style.css, js 폴더 등을 위치시킵니다.
app.use(express.static(path.join(__dirname, 'public')));

if (!OPENAI_API_KEY) {
  console.error("❌ OpenAI API 키가 환경 변수에 설정되지 않았습니다. (OPENAI_API_KEY)");
  // 실제 프로덕션에서는 이 경우 서버가 시작되지 않도록 하거나,
  // API 호출 시점에서 명확한 오류를 반환하도록 처리해야 합니다.
}

// GPT API 호출을 위한 엔드포인트
app.post('/api/gpt-chat', async (req, res) => {
  if (!OPENAI_API_KEY) {
    return res.status(500).json({ error: "OpenAI API 키가 서버에 설정되지 않았습니다." });
  }

  const { messages, model = "gpt-4", temperature = 0.8, analysisType } = req.body;

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: "요청 본문에 'messages' 배열이 필요합니다." });
  }

  console.log("📨 백엔드 수신 messages:", JSON.stringify(messages, null, 2));
  if (analysisType) {
    console.log("📨 분석 타입:", analysisType); // analysis2.html 에서 요청 시 넘어올 수 있음
  }

  // analysisType에 따라 다른 시스템 프롬프트를 사용하거나 로직을 분기할 수 있습니다.
  // 예를 들어, analysisType === 'detailedUtterance' 일 경우,
  // messages 배열을 재구성하거나 다른 프롬프트를 사용할 수 있습니다.
  // 여기서는 일단 받은 messages를 그대로 사용합니다.
  // 실제 상세 분석을 위해서는 이 부분에서 프롬프트 재구성이 필요합니다.

  try {
    const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: model,
        messages: messages, // 클라이언트에서 구성한 messages 배열 사용
        temperature: temperature
      })
    });

    if (!openaiResponse.ok) {
      const errorData = await openaiResponse.json().catch(() => ({}));
      console.error("❌ OpenAI API 오류 응답:", openaiResponse.status, errorData);
      return res.status(openaiResponse.status).json({
        error: `OpenAI API 요청 실패 (상태: ${openaiResponse.status})`,
        details: errorData.error?.message || openaiResponse.statusText
      });
    }

    const data = await openaiResponse.json();
    console.log("💡 백엔드 GPT 응답:", JSON.stringify(data, null, 2));
    res.json(data); // 클라이언트에 GPT 응답 전달

  } catch (error) {
    console.error("❌ 백엔드 GPT API 호출 중 심각한 오류:", error);
    res.status(500).json({
      error: "서버 내부 오류 발생",
      details: error.message
    });
  }
});

// API 라우트 이후에 SPA fallback 처리 (모든 GET 요청에 대해 index.html 제공)
// public 폴더에 index.html이 있어야 합니다.
// 이 설정은 사용자가 직접 URL을 입력하거나 페이지를 새로고침할 때
// 프론트엔드 라우팅이 제대로 작동하도록 도와줍니다.
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'), (err) => {
    if (err) {
      // index.html을 찾을 수 없는 경우 등의 오류 처리
      res.status(500).send(err);
    }
  });
});


app.listen(port, () => {
  console.log(`🚀 서버가 http://localhost:${port} 에서 실행 중입니다.`);
  if (!OPENAI_API_KEY) {
    console.warn("⚠️ 경고: OpenAI API 키가 설정되지 않았습니다. GPT API 호출이 실패합니다.");
  }
});
