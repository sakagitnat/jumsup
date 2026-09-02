export const todayKey=()=>{const d=new Date(),y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,"0"),day=String(d.getDate()).padStart(2,"0");return `${y}-${m}-${day}`};
export function speak(text,lang="en-US",rate=.86,voiceURI){
  if(!("speechSynthesis" in window))return;
  speechSynthesis.cancel();
  const u=new SpeechSynthesisUtterance(text);
  u.rate=Number(rate)||.86;
  const v=voiceURI&&speechSynthesis.getVoices().find(x=>x.voiceURI===voiceURI);
  if(v){u.voice=v;u.lang=v.lang;}else{u.lang=lang;}
  speechSynthesis.speak(u);
}
export function englishVoices(){
  if(!("speechSynthesis" in window))return [];
  return speechSynthesis.getVoices()
    .filter(v=>/^en(-|$)/i.test(v.lang))
    .map(v=>({uri:v.voiceURI,name:v.name,lang:v.lang}));
}
export const escapeHtml=s=>String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
