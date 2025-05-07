// stt.js
let recognition;
let isRecording = false;

export function startSTT(callback) {
  if (isRecording) return;

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    alert("이 브라우저는 음성 인식을 지원하지 않습니다.");
    return;
  }

  recognition = new SpeechRecognition();
  recognition.lang = 'ko-KR';
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;
  isRecording = true;

  recognition.onresult = (event) => {
    const result = event.results[0][0].transcript;
    console.log("🎙️ 인식된 음성:", result);
    callback(result);
  };

  recognition.onerror = (event) => {
    console.error("❌ 음성 인식 오류:", event.error);
    isRecording = false;
  };

  recognition.onend = () => {
    console.log("🎤 음성 인식 종료");
    isRecording = false;
  };

  recognition.start();
}

export function stopSTT() {
  if (recognition && isRecording) {
    recognition.stop();
    isRecording = false;
  }
}
