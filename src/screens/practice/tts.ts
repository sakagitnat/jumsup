import { speak as _speak } from "../../lib/utils.js";

export function speakScript(text: string, accent = "en-US", rate: number | string = 0.9) {
  if (!text) return;
  _speak(text, accent, Number(rate));
}

export function pauseSpeech() {
  window.speechSynthesis?.pause();
}
export function resumeSpeech() {
  window.speechSynthesis?.resume();
}
export function stopSpeech() {
  window.speechSynthesis?.cancel();
}
