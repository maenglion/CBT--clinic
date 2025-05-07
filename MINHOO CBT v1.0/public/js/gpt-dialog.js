// js/gpt-dialog.js

// 클라이언트 사이드에서는 API 키를 직접 사용하지 않습니다.
// const OPENAI_API_KEY = "YOUR_API_KEY_HERE"; // 이 줄은 반드시 제거하거나 주석 처리합니다.

/**
 * 백엔드 서버를 통해 GPT 응답을 가져옵니다.
 * @param {string} userText 사용자의 현재 발화.
 * @param {Array<Object>} conversationHistory 이전 대화 기록 배열.
 * 각 객체는 { role: "user" | "assistant", content: "..." } 형태.
 * @returns {Promise<Object>} GPT 응답을 파싱한 JSON 객체.
 */
export async function getGptResponse(userText, conversationHistory = []) {
  // 시스템 프롬프트는 클라이언트에서 정의하거나, 백엔드에서 고정할 수 있습니다.
  // 여기서는 클라이언트에서 정의하여 백엔드로 전달합니다.
  const systemMessage = {
    role: "system",
    content: `너는 감정 상담 전문가야. 하지만 딱딱한 상담자가 아니라, 민후라는 어린아이에게 말하듯 따뜻하고 다정한 말투를 써줘.
민후가 긴장하지 않도록 공감해주고, 혼내지 않고 친구처럼 말해줘. 말은 짧고 자연스럽게 해줘. 너무 어른스럽지 않게.
대화를 이어가기 위한 질문을 꼭 해줘. 민후가 더 편하게 얘기할 수 있도록 가볍고 친근하게.
응답은 반드시 아래 JSON 형식으로 해줘:
{
  "cognitiveDistortion": "...",
  "rephrasing": "...",
  "followUpQuestion": "..."
}`
  };

  const messages = [
    systemMessage,
    ...conversationHistory,
    { role: "user", content: userText } // API 명세에 따라 사용자 발화만 전달하거나, 프롬프트 전체를 구성할 수 있습니다.
                                        // 백엔드 예시에서는 messages 배열 전체를 받도록 되어 있습니다.
  ];

  try {
    // 백엔드 서버의 '/api/gpt-chat' 엔드포인트로 요청
    // 로컬 개발 시: 'http://localhost:3000/api/gpt-chat'
    // 실제 배포 시: 해당 서버 주소로 변경
    const response = await fetch('/api/gpt-chat', { // 상대 경로 또는 전체 URL
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages: messages, // 백엔드로 전체 messages 배열 전달
        model: "gpt-4", // 또는 원하는 모델
        temperature: 0.8
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: "알 수 없는 오류 응답" }));
      console.error("❌ GPT API 호출 실패 (클라이언트):", response.status, errorData);
      // 사용자에게 보여줄 수 있는 좀 더 친절한 오류 메시지 생성
      const friendlyErrorMessage = errorData.details || `서버 통신 오류 (${response.status})`;
      throw new Error(friendlyErrorMessage);
    }

    const data = await response.json(); // 백엔드에서 전달된 GPT API의 원본 응답
    const content = data.choices?.[0]?.message?.content;

    console.log("📨 GPT 응답 원문 (클라이언트 수신):", content);
    if (!content) {
      throw new Error("GPT 응답 내용이 비어있습니다.");
    }

    try {
      return JSON.parse(content); // JSON 형식의 응답 내용 파싱
    } catch (parseError) {
      console.error("❌ GPT 응답 JSON 파싱 실패:", parseError, "원문:", content);
      // 파싱 실패 시, 원문 내용을 후속 질문으로 사용하거나 기본 오류 객체 반환
      return {
        cognitiveDistortion: "",
        rephrasing: "응답 형식을 이해하기 어려웠어요.",
        followUpQuestion: content // 원문을 그대로 전달하여 최소한의 대화는 가능하도록
      };
    }
  } catch (error) {
    console.error("❌ GPT 처리 중 예외 발생 (클라이언트):", error);
    // 최종 오류 처리: 사용자에게 안내할 수 있는 기본 응답
    return {
      cognitiveDistortion: "이런, 이야기 도중에 문제가 생겼나 봐.",
      rephrasing: "잠시 후에 다시 시도해 줄래?",
      followUpQuestion: "지금은 잠시 연결이 어려운 것 같아요. 조금 뒤에 다시 말 걸어줘."
    };
  }
}
