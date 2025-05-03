
const emotions = [
  "기쁨", "행복", "설렘", "평온함", "자신감",
  "짜증", "속상함", "억울함", "화남", "불안",
  "무서움", "외로움", "지루함", "슬픔", "무력감"
];

const tagContainer = document.getElementById("emotionTags");
const transcriptDisplay = document.getElementById("transcript");
const sentimentResult = document.getElementById("sentimentResult");
const diaryContent = document.getElementById("diaryContent");
const diaryCards = document.getElementById("diaryCards");

let selectedEmotions = [];
emotions.forEach(emotion => {
  const tag = document.createElement("span");
  tag.innerText = emotion;
  tag.addEventListener("click", () => {
    if (selectedEmotions.includes(emotion)) {
      selectedEmotions = selectedEmotions.filter(e => e !== emotion);
      tag.classList.remove("selected");
    } else if (selectedEmotions.length < 5) {
      selectedEmotions.push(emotion);
      tag.classList.add("selected");
    }
  });
  tagContainer.appendChild(tag);
});

let recognition;
if ("webkitSpeechRecognition" in window) {
  recognition = new webkitSpeechRecognition();
  recognition.lang = "ko-KR";
  recognition.continuous = false;
  recognition.interimResults = false;

  document.getElementById("recordBtn").addEventListener("click", () => {
    recognition.start();
  });

  recognition.onresult = function (event) {
    const transcript = event.results[0][0].transcript;
    transcriptDisplay.innerText = transcript;
  };
}

document.getElementById("analyzeBtn").addEventListener("click", () => {
  const transcript = transcriptDisplay.innerText;
  if (!transcript) return;

  sentimentResult.innerHTML = `
    <p><strong>감정:</strong> ${selectedEmotions.join(", ")}</p>
    <p><strong>내용:</strong> ${transcript}</p>
    <p><strong>분석 결과:</strong> 짜증 / 부정적 감정 (예시)</p>
  `;

  const diaryText = `오늘 민후는 '${transcript}' 라고 말했어. 감정은 ${selectedEmotions.join(", ")} 이었고, 전반적으로 부정적인 감정이 우세했어.`;
  diaryContent.innerText = diaryText;

  const card = document.createElement("div");
  card.classList.add("card");
  card.innerHTML = `
    <p><strong>일기 제목:</strong> ${selectedEmotions[0]} 느낌이 들었던 날</p>
    <p>${diaryText}</p>
    <div class="tags">${selectedEmotions.map(e => `#${e}`).join(" ")}</div>
  `;
  diaryCards.prepend(card);
});

const copyAll = document.getElementById("copyAll");
copyAll.addEventListener("click", () => {
  const texts = Array.from(diaryCards.querySelectorAll(".card")).map(card => card.innerText);
  const joined = texts.join("\n\n");
  navigator.clipboard.writeText(joined).then(() => alert("전체 일기가 복사되었어요!"));
});
