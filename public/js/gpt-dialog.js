// js/gpt-dialog.js

/**
 * 백엔드 서버를 통해 GPT 응답을 가져옵니다.
 * @param {string} userText 사용자의 현재 발화 또는 분석 대상 발화.
 * @param {Array<Object>} conversationHistory 이전 대화 기록 배열.
 * 각 객체는 { role: "user" | "assistant" | "system", content: "..." } 형태.
 * @param {Object} options 추가 옵션 (예: { analysisType: 'detailedUtteranceEmotion' | 'detailedPattern' })
 * @returns {Promise<Object>} GPT 응답을 파싱한 JSON 객체.
 */
export async function getGptResponse(userText, conversationHistory = [], options = {}) {
  let messages;
  const { analysisType } = options;

  if (!analysisType) {
    // 일반 대화 (talk.html에서 사용)
    const defaultSystemPrompt = `너는 감정 상담 전문가야. 하지만 딱딱한 상담자가 아니라, 민후라는 어린아이에게 말하듯 따뜻하고 다정한 말투를 써줘.
민후가 긴장하지 않도록 공감해주고, 혼내지 않고 친구처럼 말해줘. 말은 짧고 자연스럽게 해줘. 너무 어른스럽지 않게.
대화를 이어가기 위한 질문을 꼭 해줘. 민후가 더 편하게 얘기할 수 있도록 가볍고 친근하게.
응답은 반드시 아래 JSON 형식으로 해줘:
{
  "cognitiveDistortion": "...",
  "rephrasing": "...",
  "followUpQuestion": "..."
}`;
    messages = [
      { role: "system", content: defaultSystemPrompt },
      ...conversationHistory,
      { role: "user", content: userText }
    ];
  } else {
    // 특정 분석 요청 (analysis.html에서 사용)
    // 백엔드(server.js)가 analysisType에 따라 시스템 프롬프트를 생성하고,
    // 여기서 전달된 userText (분석 대상 발화)와 conversationHistory (맥락)를 사용합니다.
    // 따라서, 클라이언트는 시스템 프롬프트를 보내지 않고, 분석 대상 데이터만 전달합니다.
    messages = [
      ...conversationHistory, // 패턴 분석 등에서 문맥으로 사용될 수 있음
      { role: "user", content: userText } // 이것이 분석 대상 발화가 됨
    ];
  }

  console.log(`➡️ /api/gpt-chat 요청 전송. 분석 타입: ${analysisType || 'general'}, 메시지 수: ${messages.length}`);
  // console.log("전송될 messages 배열 (일부):", JSON.stringify(messages).substring(0, 300) + "...");


  try {
    const response = await fetch('/api/gpt-chat', { // Railway/Heroku 배포 시 상대 경로 사용
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: messages,
        model: "gpt-4", // 또는 gpt-4-turbo 등 최신 모델
        temperature: 0.7,
        analysisType: analysisType // 백엔드에 분석 타입 전달
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ GPT API 호출 실패 (클라이언트): 상태 ${response.status}`, errorText);
      let friendlyMessage = `서버 통신 오류 (${response.status}). 잠시 후 다시 시도해주세요.`;
      try {
        const errorJson = JSON.parse(errorText);
        friendlyMessage = errorJson.details || errorJson.error || friendlyMessage;
      } catch (e) {
        // JSON 파싱 실패 시 텍스트 그대로 사용 (너무 길지 않으면)
        if(errorText && errorText.length < 200) friendlyMessage = errorText;
      }
      throw new Error(friendlyMessage);
    }

    const data = await response.json(); // 백엔드에서 전달된 GPT API의 원본 응답
    
    // OpenAI 응답 구조는 data.choices[0].message.content 에 실제 GPT 답변이 있음
    const gptMessageContent = data.choices?.[0]?.message?.content;
    console.log("💡 GPT 응답 원문 (클라이언트 수신):", gptMessageContent);

    if (!gptMessageContent) {
      console.warn("⚠️ GPT 응답 내용은 받았으나, message.content가 비어있습니다. 응답 전체:", data);
      throw new Error("GPT로부터 유효한 응답 내용을 받지 못했습니다.");
    }

    try {
      return JSON.parse(gptMessageContent); // JSON 형식의 응답 내용 파싱
    } catch (parseError) {
      console.error("❌ GPT 응답 JSON 파싱 실패:", parseError, "\n원문:", gptMessageContent);
      // 파싱 실패 시, 분석 타입에 따라 다른 처리
      if (analysisType === 'detailedUtteranceEmotion') {
        return { 
            mainEmotion: "분석 결과 형식 오류", 
            reasonForEmotion: "AI의 답변을 정확히 이해하기 어려웠어요.", 
            underlyingThoughts: gptMessageContent, // 원문이라도 보여주기
            profanityAnalysis: "" 
        };
      } else if (analysisType === 'detailedPattern') {
        return { 
            profanityAnalysis: "분석 결과 형식 오류", 
            keyExpressionAnalysis: "AI의 답변을 정확히 이해하기 어려웠어요.", 
            associatedTargetAnalysis: "", 
            recurringPatternComment: gptMessageContent // 원문이라도 보여주기
        };
      }
      // 일반 대화 시 파싱 실패
      return {
        cognitiveDistortion: "",
        rephrasing: "AI 친구가 조금 다른 방식으로 이야기했네요.",
        followUpQuestion: gptMessageContent // 원문을 후속 질문으로
      };
    }
  } catch (error) {
    console.error("❌ GPT 처리 중 예외 발생 (클라이언트):", error);
    // 최종 오류 처리: 사용자에게 안내할 수 있는 기본 응답
    if (analysisType) {
        return { 
            error: error.message || "AI 분석 중 문제가 발생했어요.", 
            // 각 분석 타입별 기본 오류 구조를 맞춰줄 수 있음
            mainEmotion: "오류", reasonForEmotion: error.message, underlyingThoughts: "", profanityAnalysis: "",
            keyExpressionAnalysis: "", associatedTargetAnalysis: "", recurringPatternComment: ""
        };
    }
    return {
      cognitiveDistortion: "이런, 이야기 도중에 문제가 생겼나 봐.",
      rephrasing: "잠시 후에 다시 시도해 줄래?",
      followUpQuestion: "지금은 잠시 연결이 어려운 것 같아요. (" + error.message + ")"
    };
  }
}
