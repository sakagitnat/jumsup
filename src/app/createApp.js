import { store } from "../lib/store.js";
import { tr } from "../lib/i18n.js";
import { speak,todayKey,escapeHtml } from "../lib/utils.js";
import { backendEnabled,getSession,signInGoogle,signOut,onAuthChange } from "../lib/auth.js";
import { loadCloudState,pushCloudState,loadCommunity,importCommunityItem,uploadAvatar,toggleCommunityLike,saveCommunityReview,reportCommunityContent } from "../lib/cloud.js";
import { api } from "../lib/api.js";
import { canPrivateLocally,startDailyFeature } from "../lib/policy.js";
import { isPro } from "../lib/entitlements.js";
import { PRO_LIMITS } from "../lib/plans.js";
import { supabase } from "../lib/supabase.js";
import { renderHome } from "../features/home/home.js";
import { renderDecks,renderStudy,masteredWords } from "../features/flashcards/flashcards.js";
import { renderList,renderReading,renderListening,renderWriting,renderMock,renderPracticeResult } from "../features/practice/practice.js";
import { renderCommunity } from "../features/community/community.js";
import { renderPricing } from "../features/pricing/pricing.js";
import { renderAccount } from "../features/account/account.js";
import { renderLanding } from "../features/landing/landing.js";
import { renderOnboarding } from "../features/onboarding/onboarding.js";
import { modal } from "../components/modal.js";
import { importerModal,parseCsv,validateImport,downloadTemplate,buildImportedContent,TYPES } from "../features/importer/bulkImporter.js";


export async function createApp(root){
 let route="landing",accountTab="menu",study=null,selected=null,practiceAttempt=null,practiceKind=null,communityTab="vocab",communityQuery="",modalHtml="",syncTimer=null,examTimer=null,hydrating=false;
 let pendingPublicSave=null,bulkImportState=null;const activeUsageSessions={};
 let currentUser=null;
 const apiUnavailable=err=>/\bHTTP (404|405)\b/.test(String(err?.message||err||""));


 const nav=()=>[
  ["flash","Aa","flash"],["match","↔","match"],["crossword","+","cross"],
  ["reading","R","reading"],["listening","L","listening"],["writing","W","writing"],
  ["mock","M","mock"],["home","⌂","home"],["community","◇","community"],["account","◎","account"]
 ];
 const navIcon=r=>({flash:'<svg viewBox="0 0 24 24"><path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3V4Z"/><path d="M8 8h8M8 12h6"/></svg>',match:'<svg viewBox="0 0 24 24"><path d="m8 7-4 4 4 4M4 11h16M16 17l4-4-4-4"/></svg>',crossword:'<svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7"/><rect x="10" y="10" width="7" height="7"/><rect x="3" y="17" width="7" height="4"/><rect x="17" y="3" width="4" height="7"/></svg>',home:'<svg viewBox="0 0 24 24"><path d="m3 11 9-8 9 8"/><path d="M5 10v10h14V10M9 20v-6h6v6"/></svg>',reading:'<svg viewBox="0 0 24 24"><path d="M4 5c4-1 6 0 8 2v14c-2-2-4-3-8-2V5ZM20 5c-4-1-6 0-8 2v14c2-2 4-3 8-2V5Z"/></svg>',listening:'<svg viewBox="0 0 24 24"><path d="M4 13v-2a8 8 0 0 1 16 0v2"/><path d="M4 13h3v7H5a2 2 0 0 1-2-2v-3a2 2 0 0 1 1-2ZM20 13h-3v7h2a2 2 0 0 0 2-2v-3a2 2 0 0 0-1-2Z"/></svg>',writing:'<svg viewBox="0 0 24 24"><path d="m4 20 4.5-1 10-10a2.1 2.1 0 0 0-3-3l-10 10L4 20Z"/><path d="m13.5 8 3 3"/></svg>',mock:'<svg viewBox="0 0 24 24"><rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 3v3h6V3M9 11h6M9 15h6"/></svg>',community:'<svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2"/><path d="M3 20c.5-4 2.5-6 6-6s5.5 2 6 6M15 15c3-.4 5 1.3 6 4"/></svg>',account:'<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4.5 20c.8-4 3.3-6 7.5-6s6.7 2 7.5 6"/></svg>'}[r]||'');


 const displayIcon=r=>r==="match"?'<svg viewBox="0 0 24 24"><path d="M6 7h12M15 4l3 3-3 3M18 17H6M9 14l-3 3 3 3"/></svg>':navIcon(r);


 function accountMini(s){
  if(!s.user)return `<button class="profile-mini" data-nav="account"><div class="avatar">G</div><span><strong>Guest</strong><small>Login to sync</small></span></button>`;
  const p=s.profile||{},letter=(p.username||s.user.email||"U").slice(0,1).toUpperCase();
  return `<button class="profile-mini" data-nav="account"><div class="avatar">${p.avatar_url?`<img src="${p.avatar_url}" alt="">`:letter}</div><span><strong>${p.username||"User"}</strong><small>${s.subscription?.status==="active"?"Pro · ":""}Cloud Sync</small></span></button>`;
 }
 function layout(content){
  const s=store.get();
  if(route==="landing"&&!s.user)return content;
  if(route==="onboarding"&&s.user)return content;
  return `<div class="app-root"><header class="mobile-top"><div class="mobile-brand"><span>J</span><div><b>Jumsup</b><small>English Practice</small></div></div><button class="mobile-profile" data-nav="account" aria-label="บัญชี">${navIcon("account")}</button></header><div class="app-shell"><aside class="app-sidebar">
   <div class="brand"><div class="brand-mark">J</div><div><strong>Jumsup</strong><small>English Practice</small></div></div>
   <div class="side-section"><p class="side-label">${tr(s.lang,"vocab")}</p><div class="nav-grid">${nav().slice(0,3).map(([r,i,k])=>`<button class="nav-card ${route===r?"active":""}" data-nav="${r}"><span>${displayIcon(r)}</span>${tr(s.lang,k)}</button>`).join("")}</div></div>
   <div class="side-section"><p class="side-label">${tr(s.lang,"practice")}</p><div class="nav-grid">${nav().slice(3,7).map(([r,i,k])=>`<button class="nav-card ${route===r?"active":""}" data-nav="${r}"><span>${displayIcon(r)}</span>${tr(s.lang,k)}</button>`).join("")}</div></div>
   <div class="side-section"><p class="side-label">${tr(s.lang,"manage")}</p><div class="nav-grid">${nav().slice(7).map(([r,i,k])=>`<button class="nav-card ${route===r?"active":""}" data-nav="${r}"><span>${displayIcon(r)}</span>${tr(s.lang,k)}</button>`).join("")}</div></div>
   <div class="sidebar-bottom">${accountMini(s)}</div>
  </aside><main class="app-content">${s.syncing?`<div class="sync-chip">Syncing…</div>`:""}${content}</main></div><nav class="bottom-nav"><button class="${route==="home"?"active":""}" data-nav="home"><span>⌂</span>Home</button><button class="${route.startsWith("reading")?"active":""}" data-nav="reading"><span>R</span>Reading</button><button class="${route.startsWith("listening")?"active":""}" data-nav="listening"><span>L</span>Listening</button><button class="${route.startsWith("writing")?"active":""}" data-nav="writing"><span>W</span>Writing</button><button class="${route.startsWith("mock")?"active":""}" data-nav="mock"><span>M</span>Mock</button></nav>${modalHtml}</div>`;
 }


 function render(){
  const s=store.get();document.documentElement.dataset.theme=s.theme;
  let html;
  if(route==="landing"&&!s.user)html=renderLanding();
  else if(route==="onboarding"&&s.user)html=renderOnboarding(s);
  else if(route==="home")html=renderHome(s);
  else if(route==="flash")html=renderDecks(s,"flash");
  else if(route==="match")html=renderDecks(s,"match");
  else if(route==="crossword")html=renderDecks(s,"crossword");
  else if(route==="study")html=renderStudy(s,study);
  else if(route==="reading")html=renderList("reading",s.reading);
  else if(route==="listening")html=renderList("listening",s.listening);
  else if(route==="writing")html=renderList("writing",s.writing);
  else if(route==="mock")html=renderList("mock",s.mocks);
  else if(route==="reading-play")html=renderReading(selected,s);
  else if(route==="listening-play")html=renderListening(selected);
  else if(route==="writing-play")html=renderWriting(selected);
  else if(route==="mock-play")html=renderMock(selected);
  else if(route==="practice-result")html=renderPracticeResult(selected,practiceAttempt);
  else if(route==="community")html=renderCommunity(s,communityQuery,communityTab);
  else if(route==="account")html=renderAccount(s,accountTab);
  else if(route==="pricing")html=s.user?renderAccount(s,"plan"):renderPricing(s);
  else html=renderHome(s);
  const detailRoutes=["study","reading-play","listening-play","writing-play","mock-play","practice-result"];
  if(detailRoutes.includes(route))html=`<button class="page-back" data-action="go-back"><svg viewBox="0 0 24 24"><path d="M19 12H5"/><path d="m10 7-5 5 5 5"/></svg> ย้อนกลับ</button>${html}`;
  root.innerHTML=layout(html);bind();startExamTimer();
 }


 function toast(message){
  modalHtml=modal("Jumsup",`<p class="modal-desc">${escapeHtml(message)}</p>`,`<button class="btn btn-primary" data-action="close-modal">ตกลง</button>`);render();
 }


 async function hydrateFromCloud(user){
  if(!backendEnabled||!user)return;
  hydrating=true;store.set({syncing:true,backend:true,user});
  try{
   const remote=await loadCloudState(user);
   if(!remote.profile?.onboarding_completed_at)route="onboarding";
   const local=store.get();
   const restoreOfficialPractice=cloud=>{const restored={...cloud};for(const key of ["reading","listening","writing","mocks"]){const cloudItems=Array.isArray(cloud[key])?cloud[key]:[],official=(local[key]||[]).filter(item=>item.creator==="Jumsup Official"&&!cloudItems.some(saved=>saved.id===item.id));restored[key]=[...cloudItems,...official]}const cloudDecks=Array.isArray(cloud.decks)?cloud.decks:[],starters=(local.decks||[]).filter(deck=>["deck-1","deck-2"].includes(deck.id));restored.decks=[...cloudDecks.map(deck=>{const starter=starters.find(sample=>sample.id===deck.id);return starter&&!deck.words?.length?{...deck,words:starter.words}:deck}),...starters.filter(sample=>!cloudDecks.some(deck=>deck.id===sample.id))];return restored};
   const remoteHasData=(remote.decks?.length||0)+(remote.reading?.length||0)+(remote.listening?.length||0)+(remote.writing?.length||0)+(remote.mocks?.length||0)>0;
   if(remoteHasData){
    const restored=restoreOfficialPractice(remote);
    store.set({...restored,theme:remote.profile?.ui_theme||local.theme,lang:remote.profile?.ui_language||local.lang,sound:remote.profile?.sound_enabled??local.sound,backend:true,syncing:false});
    const starterRepair=(restored.decks||[]).some(deck=>["deck-1","deck-2"].includes(deck.id)&&deck.words?.length)&&!(remote.decks||[]).some(deck=>["deck-1","deck-2"].includes(deck.id)&&deck.words?.length);if(starterRepair)await pushCloudState(user,store.get());
   }else{
    store.set({user,profile:remote.profile,subscription:remote.subscription,backend:true,syncing:false});
    await pushCloudState(user,store.get());
    const again=restoreOfficialPractice(await loadCloudState(user));store.set({...again,backend:true,syncing:false});
   }
   await refreshCommunity();
  }catch(e){console.error(e);store.set({syncing:false,user,backend:true})}
  hydrating=false;
 }


 async function refreshCommunity(){
  if(!currentUser||!backendEnabled){store.set({community:buildDemoCommunity(store.get())});return}
  try{
   const items=await loadCommunity(communityQuery,communityTab);
   store.set({community:items});
  }catch(e){console.error(e)}
 }


 function buildDemoCommunity(s){
  const likes=s.communityLikes||{},reviews=s.communityReviews||{},imports=s.communityImportCounts||{};
  const decorate=x=>{const review=reviews[x.id],rating=review?.rating||x.rating||0,ratingCount=review?1:(x.ratingCount||0);return {...x,liked:!!likes[x.id],likeCount:(x.likeCount||0)+(likes[x.id]?1:0),importCount:(x.importCount||0)+(imports[x.id]||0),rating,ratingCount}};
  const vocab=(s.decks||[]).slice(0,2).map((x,i)=>decorate({id:x.id,type:"vocab",title:x.name,creator:i?"Jumsup Tutor":"Jumsup Official",count:x.words?.length||0,official:!i,likeCount:18-i*5,importCount:42-i*11,rating:4.7-i*.2,ratingCount:12-i*3,createdAt:"2026-08-20"}));
  const skill=[...(s.reading||[]).map(x=>({...x,kind:"reading"})),...(s.listening||[]).map(x=>({...x,kind:"listening"})),...(s.writing||[]).map(x=>({...x,kind:"writing"})),...(s.mocks||[]).map(x=>({...x,kind:"mock"}))].filter(x=>x.creator==="Jumsup Official").map((x,i)=>decorate({id:x.id,type:"skill",kind:x.kind,title:x.title,creator:x.creator,count:x.itemCount||x.questions?.length||1,official:true,sourceKind:x.kind,likeCount:24-i*2,importCount:61-i*7,rating:Math.max(4.2,4.9-i*.12),ratingCount:18-i,createdAt:"2026-08-21"}));
  return [...vocab,...skill];
 }


 function scheduleSync(){
  if(hydrating||!currentUser||!backendEnabled)return;
  clearTimeout(syncTimer);
  syncTimer=setTimeout(async()=>{
   store.set({syncing:true});
   try{await pushCloudState(currentUser,store.get())}
   catch(e){console.error("Sync failed",e)}
   finally{store.set({syncing:false})}
  },900);
 }


 function bind(){
  const modalCard=root.querySelector("[data-modal-card]");if(modalCard)modalCard.onclick=e=>e.stopPropagation();
  root.querySelectorAll("[data-nav]").forEach(el=>el.onclick=()=>{route=el.dataset.nav;selected=null;study=null;if(route==="community")refreshCommunity();render()});
  root.querySelectorAll("[data-account-tab]").forEach(el=>el.onclick=()=>{accountTab=el.dataset.accountTab;route="account";render()});
  root.querySelectorAll("[data-account-back]").forEach(el=>el.onclick=()=>{accountTab="menu";render()});
  root.querySelectorAll("[data-action]").forEach(el=>el.onclick=e=>handleAction(el.dataset.action,el,e));
  root.querySelectorAll("[data-lang]").forEach(el=>el.onclick=()=>store.set({lang:el.dataset.lang}));
  root.querySelectorAll("[data-theme-choice]").forEach(el=>el.onclick=()=>store.set({theme:el.dataset.themeChoice}));
  const st=root.querySelector("#soundToggle");if(st)st.onchange=()=>store.set({sound:st.checked});
  const communitySort=root.querySelector("#communitySort");if(communitySort)communitySort.onchange=()=>store.set({communitySort:communitySort.value});
  root.querySelectorAll("[data-community-tab]").forEach(el=>el.onclick=async()=>{communityTab=el.dataset.communityTab;await refreshCommunity();render()});
  root.querySelectorAll(".choice").forEach(el=>el.onclick=()=>{
   const host=el.closest(".question");
   host.querySelectorAll(".choice").forEach(x=>x.classList.remove("selected","correct","wrong"));
   el.classList.add("selected");
   host.dataset.answered="true";if(practiceAttempt)practiceAttempt.answers[el.dataset.question]=Number(el.dataset.answer);
   const answered=root.querySelectorAll('.question[data-answered="true"]').length,total=root.querySelectorAll(".question").length,count=root.querySelector("#answeredCount");
   if(count)count.textContent=`${answered}/${total}${route==="mock-play"?" ตัวอย่าง":""}`;
   const number=Number((host.id.match(/(\d+)$/)||[])[1]);if(number)root.querySelector(`[data-jump="mock-${number}"]`)?.classList.add("done");
  });
  root.querySelectorAll("[data-jump]").forEach(el=>el.onclick=()=>document.getElementById(el.dataset.jump)?.scrollIntoView({behavior:"smooth",block:"start"}));
  root.querySelectorAll(".read-word").forEach(el=>el.onclick=e=>{e.stopPropagation();openWord(el.dataset.word,el)});
  root.querySelectorAll(".writing-response").forEach(el=>el.oninput=()=>{const count=el.closest(".writing-task-card")?.querySelector("[data-word-count]");if(count)count.textContent=(el.value.trim().match(/\S+/g)||[]).length});
  const avatar=root.querySelector("#avatarFile");if(avatar)avatar.onchange=async()=>{if(!avatar.files?.[0]||!currentUser)return;try{const url=await uploadAvatar(currentUser,avatar.files[0]);store.set({profile:{...store.get().profile,avatar_url:url}})}catch(e){toast(e.message)}};
  const importFile=root.querySelector("#bulkImportFile"),dropZone=root.querySelector("[data-import-drop]");
  const acceptImportFile=async file=>{
   if(!file)return;const error=root.querySelector("#importFileError"),status=root.querySelector("[data-import-drop-status]");
   error?.classList.add("hidden");if(!file.name.toLowerCase().endsWith(".csv")){if(error){error.textContent=file.name.toLowerCase().endsWith(".zip")?"ไฟล์ ZIP ใช้อัปโหลดพร้อมกันไม่ได้ กรุณาแตกไฟล์แล้วลาก CSV ของหมวดนี้มาวาง":"รองรับเฉพาะไฟล์ CSV กรุณาใช้ไฟล์ตามเทมเพลต";error.classList.remove("hidden")}return}
   try{if(status)status.textContent="กำลังอ่าน "+file.name+"…";const parsed=parseCsv(await file.text());if(!parsed.headers.length||!parsed.rows.length)throw new Error("ไฟล์ไม่มีข้อมูล");bulkImportState={...bulkImportState,fileName:file.name,...parsed,step:2};openBulkImport()}catch(err){if(error){error.textContent=err.message||"อ่านไฟล์ไม่สำเร็จ";error.classList.remove("hidden")}if(status)status.textContent="ลากไฟล์ CSV มาวางตรงนี้"}
  };
  if(importFile)importFile.onchange=()=>acceptImportFile(importFile.files?.[0]);
  if(dropZone){let dragDepth=0;dropZone.ondragenter=e=>{e.preventDefault();dragDepth++;dropZone.classList.add("is-dragging")};dropZone.ondragover=e=>{e.preventDefault();if(e.dataTransfer)e.dataTransfer.dropEffect="copy"};dropZone.ondragleave=e=>{e.preventDefault();dragDepth=Math.max(0,dragDepth-1);if(!dragDepth)dropZone.classList.remove("is-dragging")};dropZone.ondrop=e=>{e.preventDefault();dragDepth=0;dropZone.classList.remove("is-dragging");acceptImportFile(e.dataTransfer?.files?.[0])}}


  bindDeckEditor();
  bindPracticeEditor();
  bindSwipe();
 }


 async function handleAction(a,el,e){
  const s=store.get();
  try{
   if(a==="login-google")return signInGoogle();
   if(a==="go-back"){if(route==="study")route="flash";else if(route==="practice-result"||route.endsWith("-play"))route=practiceKind||route.replace("-play","");selected=null;practiceAttempt=null;return render()}
   if(a==="save-onboarding"){
    if(!currentUser||!backendEnabled)return toast("กรุณาเข้าสู่ระบบก่อนสร้างแผน");
    const goal=root.querySelector('input[name="examGoal"]:checked')?.value||"alevel",minutes=Number(root.querySelector('input[name="dailyMinutes"]:checked')?.value||10),skills=[...root.querySelectorAll('input[name="weakSkill"]:checked')].map(x=>x.value),examDate=root.querySelector("#onboardingExamDate")?.value||null;
    const {data,error}=await supabase.rpc("save_learning_profile",{p_exam_goal:goal,p_exam_date:examDate,p_daily_minutes:minutes,p_weak_skills:skills});if(error)throw error;
    store.set({profile:{...s.profile,...data}});route="home";return render()
   }
   if(a==="explore-free"){route="home";return render()}
   if(a==="landing-features"){document.getElementById("landingFeatures")?.scrollIntoView({behavior:"smooth"});return}
   if(a==="landing-demo"){document.getElementById("landingDemo")?.scrollIntoView({behavior:"smooth",block:"center"});return}
   if(a==="demo-miss"||a==="demo-know"){const card=root.querySelector(".landing-demo-card");card?.classList.add("demo-revealed");return}
   if(a==="logout"){await signOut();return}
   if(a==="checkin"){
    if(currentUser&&backendEnabled){
     const {data,error}=await supabase.rpc("do_daily_checkin");if(error)throw error;
     store.set({lastCheckin:todayKey(),streak:data.streak,xp:data.xp});
    }else if(s.lastCheckin!==todayKey())store.set({lastCheckin:todayKey(),streak:s.streak+1,xp:s.xp+20});
   }
   if(a==="start-deck"){const d=s.decks.find(x=>x.id===el.dataset.id);if(el.dataset.mode!=="flash"){const p=s.progress[d.id]||{mastered:[]},mastered=masteredWords(s,d.id,p),minimum=el.dataset.mode==="match"?4:3,playable=mastered.length>=minimum?mastered:d.words;if(el.dataset.mode==="match")return openGame("match",d,playable);if(el.dataset.mode==="crossword")return openGame("crossword",d,playable)}study={deckId:d.id,poolSize:Math.min(s.flashSettings.loopSize,d.words.length),mastered:[],cursor:0};route="study";render()}
   if(a==="know-word"){await markKnown(Number(el.dataset.index));study.cursor=0}
   if(a==="miss-word"){study.cursor++;render()}
   if(a==="speak")speak(el.dataset.word)
   if(a==="open-flash-settings")openFlashSettings()
   if(a==="save-study-settings")saveFlashSettings()
   if(a==="review-loop"){study.mastered=[];study.cursor=0;render()}
   if(a==="reset-flash-progress")return resetFlashProgress()
   if(a==="next-loop"){const d=s.decks.find(x=>x.id===study.deckId),remain=d.words.length-study.poolSize;if(remain<=0)return;const n=Math.max(1,Math.min(remain,Number(prompt("เพิ่มอีกกี่คำ?","10"))||1));study.poolSize+=n;render()}
   if(a==="new-deck")openDeckModal()
   if(a==="open-bulk-import")return openBulkImport(el.dataset.type||"vocab")
   if(a==="import-change-type")return openBulkImport(el.dataset.type)
   if(a==="import-download-template")return downloadTemplate(el.dataset.type)
   if(a==="import-next")return importNext()
   if(a==="import-back")return importBack()
   if(a==="edit-deck")openDeckModal(el.dataset.id)
   if(a==="delete-deck")openDelete("deck",el.dataset.id)
   if(a==="new-practice")openPracticeModal(el.dataset.kind)
   if(a==="edit-practice")openPracticeModal(el.dataset.kind,el.dataset.id)
   if(a==="delete-practice")openDelete(el.dataset.kind,el.dataset.id)
   if(a==="open-practice"){
    const kind=el.dataset.kind,arr=kind==="mock"?s.mocks:s[kind];selected=arr.find(x=>x.id===el.dataset.id);
    if(currentUser&&backendEnabled&&["listening","writing","mock"].includes(kind)){
      const sessionKey=activeUsageSessions[kind]||`${kind}:${selected.id}:${crypto.randomUUID()}`;
      try{const usage=await startDailyFeature(kind,sessionKey,{content_id:selected.id});activeUsageSessions[kind]=usage.existing_session_key||sessionKey}
      catch(err){if(String(err.message).includes("DAILY_LIMIT_REACHED"))return toast("วันนี้ใช้สิทธิ์ "+kind+" ฟรีไปแล้ว");if(!apiUnavailable(err))throw err}
    }
    practiceKind=kind;const questions=selected.sections?.length?selected.sections.flatMap(section=>section.questions||[]):(selected.questions||[{id:selected.id,prompt:selected.question||"Question",choices:selected.choices||[],answer:selected.answer}]);practiceAttempt={answers:{},questions,startedAt:Date.now()};
    route=kind==="reading"?"reading-play":kind==="listening"?"listening-play":kind==="writing"?"writing-play":"mock-play";render()
   }
   if(a==="speak-script")speak(el.dataset.script,root.querySelector("#listenAccent")?.value||"en-US",root.querySelector("#listenRate")?.value||.9);
   if(a==="pause-speech")speechSynthesis?.pause();
   if(a==="resume-speech")speechSynthesis?.resume();
   if(a==="stop-speech")speechSynthesis?.cancel();
   if(a==="submit-practice"){if(!practiceAttempt)return;clearInterval(examTimer);examTimer=null;route="practice-result";return render()}
   if(a==="retry-practice"){practiceAttempt={answers:{},questions:practiceAttempt.questions,startedAt:Date.now()};route=practiceKind==="reading"?"reading-play":practiceKind==="listening"?"listening-play":practiceKind==="writing"?"writing-play":"mock-play";return render()}
   if(a==="back-practice-list"){route=practiceKind||"home";selected=null;practiceAttempt=null;return render()}
   if(a==="community-search"){communityQuery=root.querySelector("#communitySearch").value;await refreshCommunity();render()}
   if(a==="community-refresh"){await refreshCommunity();render()}
   if(a==="import-community"){
    const item=s.community.find(x=>x.id===el.dataset.id);
    if(!backendEnabled){localCommunityImport(item);return toast("นำเข้าเป็นสำเนาใหม่ในโหมดทดสอบแล้ว")}
    if(!currentUser)return toast("กรุณาเข้าสู่ระบบก่อนนำเข้า Community");
    await importCommunityItem(currentUser,item);await hydrateFromCloud(currentUser);return toast("นำเข้าเป็นสำเนาใหม่แล้ว");
   }
   if(a==="like-community"){const id=el.dataset.id,item=s.community.find(x=>x.id===id);if(backendEnabled){if(!currentUser)return toast("กรุณาเข้าสู่ระบบก่อนกดถูกใจ");await toggleCommunityLike(currentUser,item)}else store.set({communityLikes:{...(s.communityLikes||{}),[id]:!s.communityLikes?.[id]}});await refreshCommunity();return}
   if(a==="review-community")return openCommunityReview(el.dataset.id)
   if(a==="save-community-review"){const id=el.dataset.id,rating=Number(root.querySelector("#reviewRating")?.value),body=root.querySelector("#reviewBody")?.value.trim()||"",item=s.community.find(x=>x.id===id);if(backendEnabled){if(!currentUser)return toast("กรุณาเข้าสู่ระบบก่อนให้คะแนน");await saveCommunityReview(currentUser,item,rating,body)}else store.set({communityReviews:{...(s.communityReviews||{}),[id]:{rating,body,createdAt:new Date().toISOString()}}});modalHtml="";await refreshCommunity();return toast("บันทึกคะแนนและรีวิวแล้ว")}
   if(a==="report-community")return openCommunityReport(el.dataset.id)
   if(a==="send-community-report"){const item=s.community.find(x=>x.id===el.dataset.id),reason=root.querySelector("#reportReason")?.value||"รายงานเนื้อหา";if(backendEnabled){if(!currentUser)return toast("กรุณาเข้าสู่ระบบก่อนรายงานเนื้อหา");await reportCommunityContent(currentUser,item,reason)}modalHtml="";return toast("ส่งรายงานให้ผู้ดูแลตรวจสอบแล้ว")}
   if(a==="close-modal"){modalHtml="";render()}
   if(a==="confirm-delete")confirmDelete(el.dataset.type,el.dataset.id)
   if(a==="save-deck")saveDeck(el.dataset.id||null)
   if(a==="save-practice")savePractice(el.dataset.kind,el.dataset.id||null)
   if(a==="confirm-public-save"){if(pendingPublicSave){const fn=pendingPublicSave;pendingPublicSave=null;await fn();modalHtml="";render()}}
   if(a==="export-account"){const d=await api("/api/account/export");const blob=new Blob([JSON.stringify(d,null,2)],{type:"application/json"});const u=URL.createObjectURL(blob);const x=document.createElement("a");x.href=u;x.download="jumsup-data.json";x.click();URL.revokeObjectURL(u)}
   if(a==="request-account-delete"){const d=await api("/api/account/request-delete",{method:"POST",body:"{}"});return toast(`ส่งคำขอลบบัญชีแล้ว กำหนดดำเนินการหลัง ${new Date(d.execute_after).toLocaleDateString()}`)}
   if(a==="open-refund-request")openRefundRequest()
   if(a==="submit-refund-request"){const reason=root.querySelector("#refundReason")?.value||"";const cancel=root.querySelector("#refundCancelSub")?.checked!==false;await api("/api/refund/request",{method:"POST",body:JSON.stringify({reason,cancel_subscription:cancel})});modalHtml="";await hydrateFromCloud(currentUser);return toast("ส่งคำขอคืนเงินแล้ว ผู้ดูแลจะตรวจสอบก่อนดำเนินการ")}
   if(a==="admin-load-refunds")await loadAdminRefunds()
   if(a==="admin-approve-refund"){const amount=el.dataset.amount?Number(el.dataset.amount):null;await api("/api/admin/refund-action",{method:"POST",body:JSON.stringify({action:"approve",refund_request_id:el.dataset.id,amount})});await loadAdminRefunds();return toast("ส่งคำสั่งคืนเงินไปยัง Stripe แล้ว")}
   if(a==="admin-reject-refund"){const note=prompt("เหตุผลที่ปฏิเสธ","ไม่เข้าเงื่อนไขนโยบายคืนเงิน")||"Rejected";await api("/api/admin/refund-action",{method:"POST",body:JSON.stringify({action:"reject",refund_request_id:el.dataset.id,admin_note:note})});await loadAdminRefunds();return toast("ปฏิเสธคำขอแล้ว")}
   if(a==="checkout-monthly"||a==="checkout-yearly"){const d=await api("/api/stripe/create-checkout",{method:"POST",body:JSON.stringify({plan:a==="checkout-yearly"?"yearly":"monthly"})});location.href=d.url}
   if(a==="billing-portal"){const d=await api("/api/stripe/create-portal",{method:"POST",body:"{}"});location.href=d.url}
   if(a==="redeem-gift"){const code=root.querySelector("#giftCode")?.value;await api("/api/gift/redeem",{method:"POST",body:JSON.stringify({code})});await hydrateFromCloud(currentUser);return toast("แลก Gift Code สำเร็จ")}
   if(a==="claim-referral"){const code=root.querySelector("#referralCode")?.value;await api("/api/referral/claim",{method:"POST",body:JSON.stringify({code})});await hydrateFromCloud(currentUser);return toast("ใช้ Referral สำเร็จ")}
   if(a==="admin-create-gift"){const code=root.querySelector("#adminGiftCode")?.value,days=root.querySelector("#adminGiftDays")?.value;await api("/api/admin/gift-code",{method:"POST",body:JSON.stringify({code,days})});return toast("สร้าง Gift Code แล้ว")}
  }catch(err){console.error(err);toast(err.message||"เกิดข้อผิดพลาด")}
 }
 function openBulkImport(type){
  const nextType=type||bulkImportState?.type||"vocab";
  if(!bulkImportState||bulkImportState.type!==nextType)bulkImportState={type:nextType,step:1,headers:[],rows:[]};
  const step=bulkImportState.step||1;
  modalHtml=modal("นำเข้าข้อมูลจำนวนมาก",importerModal(nextType,step,bulkImportState),`<button class="btn" data-action="close-modal">ยกเลิก</button>${step>1?`<button class="btn" data-action="import-back">ย้อนกลับ</button>`:""}${step===1?"":`<button class="btn btn-primary" data-action="import-next">${step===2?"ตรวจข้อมูล":step===3?"ไปขั้นยืนยัน":"ยืนยันนำเข้า"}</button>`}`);render()
 }
 function importBack(){if(!bulkImportState)return;bulkImportState.step=Math.max(1,(bulkImportState.step||1)-1);openBulkImport()}
 function importNext(){
  if(!bulkImportState)return;const type=bulkImportState.type;
  if(bulkImportState.step===2){const mapping={};root.querySelectorAll("[data-import-map]").forEach(x=>mapping[x.dataset.importMap]=x.value);const missing=TYPES[type].required.filter(h=>!mapping[h]);if(missing.length)return toast(`กรุณาจับคู่คอลัมน์ที่จำเป็น: ${missing.join(", ")}`);bulkImportState.mapping=mapping;bulkImportState.checked=validateImport(type,bulkImportState.rows,mapping);bulkImportState.step=3;return openBulkImport()}
  if(bulkImportState.step===3){if(!bulkImportState.checked?.valid?.length)return toast("ยังไม่มีรายการที่พร้อมนำเข้า");bulkImportState.step=4;return openBulkImport()}
  if(bulkImportState.step===4){const built=buildImportedContent(type,bulkImportState.checked.valid,store.get().profile?.username||"guest");store.update(s=>({...s,[built.key]:[...(s[built.key]||[]),built.value]}));scheduleSync();bulkImportState=null;modalHtml="";route=type==="vocab"?"flash":type;render();return toast("นำเข้าเป็นฉบับร่างส่วนตัวเรียบร้อยแล้ว")}
 }


 function localCommunityImport(item){
  if(!item)return;
  const id=`import-${crypto.randomUUID()}`;
  store.update(s=>{
   const counts={...(s.communityImportCounts||{}),[item.id]:(s.communityImportCounts?.[item.id]||0)+1};
   if(item.type==="vocab"){
    const source=s.decks.find(x=>x.id===item.id);if(!source)return {...s,communityImportCounts:counts};
    return {...s,communityImportCounts:counts,decks:[...s.decks,{...structuredClone(source),id,name:`${source.name} · สำเนา`,visibility:"private",creator:"guest"}]};
   }
   const key=item.sourceKind==="mock"?"mocks":item.sourceKind,source=(s[key]||[]).find(x=>x.id===item.id);if(!source)return {...s,communityImportCounts:counts};
   return {...s,communityImportCounts:counts,[key]:[...s[key],{...structuredClone(source),id:`${item.sourceKind}-${id}`,title:`${source.title} · สำเนา`,visibility:"private",creator:"guest"}]};
  });
 }


 function openCommunityReview(id){
  const previous=store.get().communityReviews?.[id];
  modalHtml=modal("ให้คะแนนชุดฝึก",`<div class="modal-form"><label>คะแนน<select id="reviewRating"><option value="5" ${previous?.rating===5?"selected":""}>5 - ดีมาก</option><option value="4" ${previous?.rating===4?"selected":""}>4 - ดี</option><option value="3" ${previous?.rating===3?"selected":""}>3 - ปานกลาง</option><option value="2" ${previous?.rating===2?"selected":""}>2 - ควรปรับปรุง</option><option value="1" ${previous?.rating===1?"selected":""}>1 - มีปัญหา</option></select></label><label>รีวิว<textarea id="reviewBody" rows="4" maxlength="1000" placeholder="บอกสิ่งที่เป็นประโยชน์กับผู้เรียนคนอื่น">${escapeHtml(previous?.body||"")}</textarea></label></div>`,`<button class="btn" data-action="close-modal">ยกเลิก</button><button class="btn btn-primary" data-action="save-community-review" data-id="${id}">บันทึก</button>`);render()
 }


 function openCommunityReport(id){
  modalHtml=modal("รายงานเนื้อหา",`<div class="modal-form"><label>เหตุผล<select id="reportReason"><option>ข้อมูลหรือเฉลยไม่ถูกต้อง</option><option>ละเมิดลิขสิทธิ์</option><option>Spam หรือโฆษณา</option><option>เนื้อหาไม่เหมาะสม</option></select></label><label>รายละเอียด<textarea rows="4" maxlength="1000" placeholder="อธิบายสิ่งที่พบ"></textarea></label></div>`,`<button class="btn" data-action="close-modal">ยกเลิก</button><button class="btn btn-danger" data-action="send-community-report" data-id="${id}">ส่งรายงาน</button>`);render()
 }


 function openRefundRequest(){
  const s=store.get(),last=s.payments?.find(p=>p.status==="succeeded");
  if(!last)return toast("ยังไม่พบรายการชำระเงินที่คืนได้");
  const amount=last.amount!=null?`${(last.amount/100).toFixed(2)} ${String(last.currency||"").toUpperCase()}`:"รายการล่าสุด";
  modalHtml=modal("ขอคืนเงิน",`<div class="modal-form"><div class="modal-note">คำขอนี้จะส่งให้ผู้ดูแลตรวจสอบก่อน ไม่มีการคืนเงินอัตโนมัติ<br>รายการล่าสุด: ${amount}</div><label>เหตุผลในการขอคืนเงิน<textarea id="refundReason" rows="4" maxlength="1000" placeholder="กรุณาอธิบายเหตุผลอย่างน้อย 5 ตัวอักษร"></textarea></label><label class="delete-check-row"><input id="refundCancelSub" type="checkbox" checked><span>ถ้าเป็นการคืนเต็มจำนวน ให้ยกเลิกสมาชิกที่เกี่ยวข้องด้วย</span></label></div>`,`<button class="btn" data-action="close-modal">ยกเลิก</button><button class="btn btn-primary" data-action="submit-refund-request">ส่งคำขอ</button>`);render()
 }
 async function loadAdminRefunds(){
  const d=await api("/api/admin/refunds");const host=root.querySelector("#adminRefundQueue");if(!host)return;
  host.innerHTML=(d.refunds||[]).map(r=>`<div class="refund-admin-row"><div><b>@${escapeHtml(r.profiles?.username||"user")}</b><small>${escapeHtml(r.reason)}</small><small>${r.payment_events?.amount!=null?(r.payment_events.amount/100).toFixed(2)+" "+String(r.payment_events.currency||"").toUpperCase():""}</small></div><div class="actions"><button class="btn btn-primary" data-action="admin-approve-refund" data-id="${r.id}">คืนเต็มจำนวน</button><button class="btn btn-danger" data-action="admin-reject-refund" data-id="${r.id}">ปฏิเสธ</button></div></div>`).join("")||"<p class='tool-note'>ไม่มีคำขอรอตรวจ</p>";
  host.querySelectorAll("[data-action]").forEach(el=>el.onclick=e=>handleAction(el.dataset.action,el,e));
 }
 function openFlashSettings(){
  const s=store.get(),deck=study?s.decks.find(d=>d.id===study.deckId):null,max=Math.max(1,deck?.words.length||1);
  modalHtml=modal("ตั้งค่า Flashcard",`<div class="flash-study-settings-modal"><div class="flash-setting-section"><div class="flash-setting-heading"><div><b>จำนวนคำใน Loop</b><small>กำหนดจำนวนคำที่จะวนซ้ำในรอบนี้</small></div></div><div class="loop-input-row"><input id="studyLoopSize" type="number" min="1" max="${max}" value="${Math.min(study?.poolSize||s.flashSettings.loopSize,max)}"></div></div><div class="flash-setting-list"><label class="flash-setting-row"><span><b>อ่านเสียงอัตโนมัติ</b></span><span class="switch"><input id="studyAutoSpeak" type="checkbox" ${s.flashSettings.autoSpeak?"checked":""}><span></span></span></label><label class="flash-setting-row"><span><b>แสดงคำแปลทันที</b></span><span class="switch"><input id="studyShowMeaning" type="checkbox" ${s.flashSettings.showMeaning?"checked":""}><span></span></span></label><label class="flash-setting-row"><span><b>สุ่มลำดับคำ</b></span><span class="switch"><input id="studyShuffle" type="checkbox" ${s.flashSettings.shuffle?"checked":""}><span></span></span></label></div><div class="flash-reset-section"><b>ความคืบหน้าชุดนี้</b><small>ล้างเฉพาะสถานะคำที่จำแล้ว คำศัพท์ในชุดจะไม่ถูกลบ</small><button type="button" class="btn btn-danger" data-action="reset-flash-progress">ล้างความคืบหน้า</button></div></div>`,`<button class="btn" data-action="close-modal">ยกเลิก</button><button class="btn btn-primary" data-action="save-study-settings">บันทึก</button>`);render()
 }
 function saveFlashSettings(){
  if(!study)return;const s=store.get(),deck=s.decks.find(d=>d.id===study.deckId),max=Math.max(1,deck.words.length);
  const settings={loopSize:Math.max(1,Math.min(max,Number(root.querySelector("#studyLoopSize").value)||1)),autoSpeak:root.querySelector("#studyAutoSpeak").checked,showMeaning:root.querySelector("#studyShowMeaning").checked,shuffle:root.querySelector("#studyShuffle").checked};
  study.poolSize=settings.loopSize;study.mastered=study.mastered.filter(i=>i<settings.loopSize);study.cursor=0;modalHtml="";store.set({flashSettings:settings});
 }
 async function resetFlashProgress(){
  if(!study)return;
  if(currentUser&&backendEnabled){const {error}=await supabase.rpc("reset_learning_progress",{p_set_id:study.deckId});if(error)throw error}
  study.mastered=[];study.cursor=0;
  store.update(s=>({...s,progress:{...s.progress,[study.deckId]:{mastered:[]}}}));
  modalHtml="";toast("ล้างความคืบหน้าชุดนี้แล้ว");render()
 }
 function openBulkImport(type){
  const nextType=type||bulkImportState?.type||"vocab";
  if(!bulkImportState||bulkImportState.type!==nextType)bulkImportState={type:nextType,step:1,headers:[],rows:[]};
  const step=bulkImportState.step||1;
  modalHtml=modal("นำเข้าข้อมูลจำนวนมาก",importerModal(nextType,step,bulkImportState),`<button class="btn" data-action="close-modal">ยกเลิก</button>${step>1?`<button class="btn" data-action="import-back">ย้อนกลับ</button>`:""}${step===1?"":`<button class="btn btn-primary" data-action="import-next">${step===2?"ตรวจข้อมูล":step===3?"ไปขั้นยืนยัน":"ยืนยันนำเข้า"}</button>`}`);render()
 }
 function importBack(){if(!bulkImportState)return;bulkImportState.step=Math.max(1,(bulkImportState.step||1)-1);openBulkImport()}
 function importNext(){
  if(!bulkImportState)return;const type=bulkImportState.type;
  if(bulkImportState.step===2){const mapping={};root.querySelectorAll("[data-import-map]").forEach(x=>mapping[x.dataset.importMap]=x.value);const missing=TYPES[type].required.filter(h=>!mapping[h]);if(missing.length)return toast(`กรุณาจับคู่คอลัมน์ที่จำเป็น: ${missing.join(", ")}`);bulkImportState.mapping=mapping;bulkImportState.checked=validateImport(type,bulkImportState.rows,mapping);bulkImportState.step=3;return openBulkImport()}
  if(bulkImportState.step===3){if(!bulkImportState.checked?.valid?.length)return toast("ยังไม่มีรายการที่พร้อมนำเข้า");bulkImportState.step=4;return openBulkImport()}
  if(bulkImportState.step===4){const built=buildImportedContent(type,bulkImportState.checked.valid,store.get().profile?.username||"guest");bulkImportState=null;modalHtml="";route=type==="vocab"?"flash":type;store.update(s=>({...s,[built.key]:[...(s[built.key]||[]),built.value]}));return toast("นำเข้าเป็นฉบับร่างส่วนตัวเรียบร้อยแล้ว")}
 }
 const unavailableMeanings=new Set(["กำลังค้นหาคำแปล…","รอแปล","ยังไม่พบคำแปล","แปลไม่สำเร็จ แต่ยังเพิ่มคำไว้ใน Flashcard ได้","เข้าสู่ระบบเพื่อแปลออนไลน์ หรือเพิ่มคำนี้ไว้แปลภายหลัง"]);
 const cleanFlashMeaning=value=>unavailableMeanings.has(String(value||"").trim())?"":String(value||"");
 function deckWordRow(word={},index=0){return `<div class="deck-word-row" data-deck-word><span class="deck-word-number">${index+1}</span><label class="deck-term">คำหรือวลี<input data-word-term value="${escapeHtml(word.w||"")}" placeholder="เช่น significant"></label><label class="deck-pronunciation">คำอ่าน / การออกเสียง<input data-word-stress value="${escapeHtml(word.stress||word.p||"")}" placeholder="เช่น sig-NIF-i-cant"></label><label class="deck-meaning">ความหมาย<input data-word-meaning value="${escapeHtml(cleanFlashMeaning(word.m))}" placeholder="เช่น สำคัญ / มีนัยสำคัญ"></label><label class="deck-example">ประโยคตัวอย่าง<input data-word-example value="${escapeHtml(word.e||"")}" placeholder="เช่น The change had a significant effect."></label><div class="deck-word-actions"><button type="button" class="btn btn-quiet" data-deck-editor-action="copy">ทำสำเนา</button><button type="button" class="btn btn-quiet" data-deck-editor-action="delete">ลบ</button></div></div>`}
 function renumberDeckWords(){root.querySelectorAll("[data-deck-word] .deck-word-number").forEach((x,i)=>x.textContent=i+1)}
 function bindDeckEditor(){
  const list=root.querySelector("#deckWordList"),add=root.querySelector("#addDeckWord");if(!list||!add)return;
  add.onclick=()=>{list.insertAdjacentHTML("beforeend",deckWordRow({},list.children.length));renumberDeckWords();list.querySelector("[data-deck-word]:last-child [data-word-term]")?.focus()};
  list.onclick=e=>{const button=e.target.closest("[data-deck-editor-action]");if(!button)return;const row=button.closest("[data-deck-word]"),action=button.dataset.deckEditorAction;if(action==="delete"){if(list.children.length>1)row.remove();else row.querySelectorAll("input").forEach(x=>x.value="")}if(action==="copy"){const copy={w:row.querySelector("[data-word-term]").value,stress:row.querySelector("[data-word-stress]").value,m:row.querySelector("[data-word-meaning]").value,e:row.querySelector("[data-word-example]").value};row.insertAdjacentHTML("afterend",deckWordRow(copy,0))}renumberDeckWords()};
 }
 function openDeckModal(id){
  const s=store.get(),d=id?s.decks.find(x=>x.id===id):null,words=d?.words?.length?d.words:[{}];
  modalHtml=modal(d?"แก้ไขชุดคำศัพท์":"สร้างชุดคำศัพท์",`<div class="deck-editor-modal"><div class="modal-two deck-meta"><label>ชื่อชุด<input id="modalName" value="${escapeHtml(d?.name||"")}" placeholder="เช่น คำศัพท์ A-Level บทที่ 1"></label><label>การมองเห็น<select id="modalVisibility"><option value="private" ${d?.visibility!=="public"?"selected":""}>ส่วนตัว</option><option value="public" ${d?.visibility==="public"?"selected":""}>สาธารณะ</option></select></label></div><div class="deck-editor-head"><div><b>คำศัพท์ในชุด</b><small>กรอกคำศัพท์ คำอ่าน ความหมาย และประโยคตัวอย่างให้ตรงกับหน้าเรียน</small></div><button id="addDeckWord" type="button" class="btn">+ เพิ่มคำศัพท์</button></div><div id="deckWordList" class="deck-word-list">${words.map(deckWordRow).join("")}</div></div>`,`<button class="btn" data-action="close-modal">ยกเลิก</button><button class="btn btn-primary" data-action="save-deck" data-id="${id||""}">บันทึกชุด</button>`);render()
 }
 async function saveDeck(id){
  const name=root.querySelector("#modalName").value.trim(),visibility=root.querySelector("#modalVisibility").value;if(!name)return toast("กรุณาตั้งชื่อชุด");
  const words=[...root.querySelectorAll("[data-deck-word]")].map(row=>({w:row.querySelector("[data-word-term]").value.trim(),stress:row.querySelector("[data-word-stress]").value.trim(),m:cleanFlashMeaning(row.querySelector("[data-word-meaning]").value),e:row.querySelector("[data-word-example]").value.trim()})).filter(x=>x.w);
  if(!words.length)return toast("กรุณาเพิ่มคำศัพท์อย่างน้อย 1 คำ");
  const creator=store.get().profile?.username||"guest",newId=id||`deck-${crypto.randomUUID()}`;
  const localSave=(v)=>store.update(s=>({...s,decks:id?s.decks.map(d=>d.id===id?{...d,name,visibility:v,words}:d):[...s.decks,{id:newId,name,visibility:v,creator,words}]}));
  if(visibility==="private"&&!canPrivateLocally(store.get(),"vocab",id)){
    pendingPublicSave=async()=>{if(currentUser&&backendEnabled)await api("/api/content/publish-confirmed",{method:"POST",body:JSON.stringify({kind:"vocab",id:newId,title:name,payload:{words},confirm_public:true})});localSave("public")};
    modalHtml=modal("โควตาชุดส่วนตัวเต็ม",`<p class="modal-desc">Free เก็บ Flashcard ส่วนตัวได้ 3 ชุด ชุดนี้จะเป็น Public เฉพาะเมื่อคุณกดยืนยันเผยแพร่</p>`,`<button class="btn" data-action="close-modal">ยกเลิก</button><button class="btn btn-primary" data-action="confirm-public-save">ยืนยันเผยแพร่</button>`);return render()
  }
  if(currentUser&&backendEnabled)try{await api("/api/content/save",{method:"POST",body:JSON.stringify({kind:"vocab",id:newId,title:name,visibility,payload:{words}})})}catch(err){if(!apiUnavailable(err))throw err}
  localSave(visibility);modalHtml="";render()
 }
 function practiceQuestionEditor(q={},index=0){
  const choices=[...(q.choices||[]),...Array(4).fill("")].slice(0,4),answer=Math.max(0,Math.min(3,Number(q.answer)||0));
  return `<article class="practice-question-editor" data-practice-question><div class="practice-builder-row-head"><strong>คำถาม <span data-question-number>${index+1}</span></strong><div><button type="button" class="mini-btn" data-practice-copy-question>คัดลอก</button><button type="button" class="mini-btn danger" data-practice-delete-question>ลบ</button></div></div><label>คำถาม<input data-question-prompt value="${escapeHtml(q.prompt||"")}" placeholder="เช่น What is the main idea of the passage?"></label><div class="practice-choice-grid">${choices.map((choice,i)=>`<label><span>ตัวเลือก ${String.fromCharCode(65+i)}</span><input data-question-choice="${i}" value="${escapeHtml(choice)}" placeholder="พิมพ์ตัวเลือก"></label>`).join("")}</div><div class="modal-two compact"><label>คำตอบที่ถูก<select data-question-answer>${choices.map((_,i)=>`<option value="${i}" ${answer===i?"selected":""}>${String.fromCharCode(65+i)}</option>`).join("")}</select></label><label>คำอธิบาย (ไม่บังคับ)<input data-question-explanation value="${escapeHtml(q.explanation||"")}" placeholder="อธิบายเหตุผลหลังส่งคำตอบ"></label></div></article>`;
 }
 function practiceSectionEditor(kind,section={},index=0){
  const content=kind==="reading"?section.text||section.context||"":kind==="listening"?section.script||section.context||"":kind==="writing"?section.passage||section.prompt||section.context||"":section.context||"";
  const contentLabel=kind==="reading"?"บทความ":kind==="listening"?"บทพูด / Transcript":kind==="writing"?"ข้อความหรือโจทย์ประกอบ":"เนื้อหาประกอบของ Section";
  const questions=section.questions?.length?section.questions:[{}];
  const transcriptControl=kind==="listening"?`<label>การแสดงบทสนทนา<select data-section-transcript><option value="hidden" ${!section.showTranscript?"selected":""}>ซ่อนไว้ก่อน</option><option value="visible" ${section.showTranscript?"selected":""}>แสดงทันที</option></select></label>`:"";
  const partControl=kind==="listening"?`<label>ส่วนของข้อสอบ<select data-section-part><option value="short_conversation" ${section.part==="short_conversation"?"selected":""}>Short Conversation</option><option value="long_conversation" ${section.part==="long_conversation"?"selected":""}>Long Conversation</option></select></label>`:kind==="writing"?`<label>ส่วนของข้อสอบ<select data-section-part><option value="text_completion" ${section.part==="text_completion"?"selected":""}>Text Completion</option><option value="paragraph_organization" ${section.part==="paragraph_organization"?"selected":""}>Paragraph Organization</option></select></label>`:"";
  return `<section class="practice-section-editor" data-practice-section><div class="practice-builder-row-head"><div><span class="tag blue">SECTION <span data-section-number>${index+1}</span></span><strong data-section-heading>${escapeHtml(section.title||`ส่วนที่ ${index+1}`)}</strong></div><div><button type="button" class="mini-btn" data-practice-copy-section>คัดลอก Section</button><button type="button" class="mini-btn danger" data-practice-delete-section>ลบ</button></div></div><div class="modal-two"><label>ชื่อ Section<input data-section-title value="${escapeHtml(section.title||"")}" placeholder="เช่น General article 1"></label>${kind==="mock"?`<label>ประเภท<select data-section-type><option value="reading" ${section.type==="reading"?"selected":""}>Reading</option><option value="listening" ${section.type==="listening"?"selected":""}>Listening</option><option value="writing" ${section.type==="writing"?"selected":""}>Writing</option></select></label>`:`${partControl}${transcriptControl}<label>${kind==="listening"?"สถานการณ์":"คำแนะนำ"}<input data-section-description value="${escapeHtml(section.description||section.situation||section.directions||section.instructions||"")}" placeholder="ข้อความที่ผู้ทำแบบฝึกจะเห็น"></label>`}</div><label>${contentLabel}<textarea data-section-content rows="6" placeholder="วางหรือพิมพ์เนื้อหาสำหรับ Section นี้">${escapeHtml(content)}</textarea></label><div class="practice-question-list">${questions.map((q,i)=>practiceQuestionEditor(q,i)).join("")}</div><div class="practice-section-footer"><button type="button" class="btn practice-add-question" data-practice-add-question>+ เพิ่มคำถามใน Section นี้</button><button type="button" class="btn btn-primary" data-practice-add-section-after>+ เพิ่ม Section ถัดไป</button></div></section>`;
 }
 function renumberPracticeEditor(){
  root.querySelectorAll("[data-practice-section]").forEach((section,si)=>{const n=section.querySelector("[data-section-number]");if(n)n.textContent=si+1;section.querySelectorAll("[data-practice-question]").forEach((q,qi)=>{const x=q.querySelector("[data-question-number]");if(x)x.textContent=qi+1})})
 }
 function bindPracticeEditor(){
  const host=root.querySelector("#practiceSectionList");if(!host)return;
  const kind=host.dataset.kind;
  const addQuestion=section=>{section.querySelector(".practice-question-list")?.insertAdjacentHTML("beforeend",practiceQuestionEditor({},section.querySelectorAll("[data-practice-question]").length));renumberPracticeEditor()};
  root.querySelector("[data-practice-add-section]")?.addEventListener("click",()=>{host.insertAdjacentHTML("beforeend",practiceSectionEditor(kind,{},host.querySelectorAll("[data-practice-section]").length));renumberPracticeEditor();host.lastElementChild?.scrollIntoView({behavior:"smooth",block:"nearest"})});
  host.onclick=e=>{
   const section=e.target.closest("[data-practice-section]"),question=e.target.closest("[data-practice-question]");
   if(e.target.closest("[data-practice-add-section-after]")){section.insertAdjacentHTML("afterend",practiceSectionEditor(kind,{},0));renumberPracticeEditor();section.nextElementSibling?.scrollIntoView({behavior:"smooth",block:"start"});return}
   if(e.target.closest("[data-practice-add-question]"))return addQuestion(section);
   if(e.target.closest("[data-practice-delete-question]")){if(section.querySelectorAll("[data-practice-question]").length<=1)return;question.remove();return renumberPracticeEditor()}
   if(e.target.closest("[data-practice-copy-question]")){question.insertAdjacentHTML("afterend",practiceQuestionEditor(readPracticeQuestion(question),0));return renumberPracticeEditor()}
   if(e.target.closest("[data-practice-delete-section]")){if(host.querySelectorAll("[data-practice-section]").length<=1)return;section.remove();return renumberPracticeEditor()}
   if(e.target.closest("[data-practice-copy-section]")){section.insertAdjacentHTML("afterend",practiceSectionEditor(kind,readPracticeSection(section,kind),0));return renumberPracticeEditor()}
  };
 }
 function readPracticeQuestion(row){
  return {id:row.dataset.questionId||crypto.randomUUID(),prompt:row.querySelector("[data-question-prompt]")?.value.trim()||"",choices:[...row.querySelectorAll("[data-question-choice]")].map(x=>x.value.trim()),answer:Number(row.querySelector("[data-question-answer]")?.value||0),explanation:row.querySelector("[data-question-explanation]")?.value.trim()||""}
 }
 function readPracticeSection(row,kind){
  const title=row.querySelector("[data-section-title]")?.value.trim()||"",part=row.querySelector("[data-section-part]")?.value||"",description=row.querySelector("[data-section-description]")?.value.trim()||"",content=row.querySelector("[data-section-content]")?.value.trim()||"",questions=[...row.querySelectorAll(":scope > .practice-question-list > [data-practice-question]")].map(readPracticeQuestion),section={title,description,questions};
  if(kind==="reading")section.text=content;
  else if(kind==="listening"){section.script=content;section.situation=description;section.part=part||"short_conversation";section.showTranscript=(row.querySelector("[data-section-transcript]")?.value||"hidden")==="visible"}
  else if(kind==="writing"){section.passage=content;section.directions=description;section.part=part||"text_completion"}
  else{section.context=content;section.type=row.querySelector("[data-section-type]")?.value||"reading"}
  return section
 }
 function openPracticeModal(kind,id){
  const s=store.get(),arr=kind==="mock"?s.mocks:s[kind],x=id?arr.find(v=>v.id===id):null;
  let sections=x?.sections?.length?x.sections:null;
  if(!sections){const content=kind==="reading"?x?.text||"":kind==="listening"?x?.script||"":kind==="writing"?x?.passage||x?.prompt||"":"";sections=[{title:x?.title||"",text:kind==="reading"?content:undefined,script:kind==="listening"?content:undefined,passage:kind==="writing"?content:undefined,questions:x?.questions||[]}]} 
  modalHtml=modal(x?"แก้ไขชุดฝึก":"สร้างชุดฝึก",`<div class="modal-form practice-builder-modal"><div class="modal-two"><label>ชื่อชุด<input id="modalName" value="${escapeHtml(x?.title||"")}" placeholder="ตั้งชื่อชุดฝึก"></label><label>การมองเห็น<select id="modalVisibility"><option value="private" ${x?.visibility!=="public"?"selected":""}>ส่วนตัว</option><option value="public" ${x?.visibility==="public"?"selected":""}>สาธารณะ</option></select></label><label>เวลา (นาที)<input id="practiceMinutes" type="number" min="1" value="${x?.minutes||10}"></label><label>หมวด/ประเภท<input id="practiceCategory" value="${escapeHtml(x?.category||x?.type||"")}" placeholder="ไม่บังคับ"></label></div><div class="practice-builder-intro"><div><b>สร้างแบบฝึกได้โดยไม่ต้องอัปไฟล์</b><p>แบ่งเป็นหลาย Section และเพิ่มคำถามทีละข้อ ระบบจะแสดงผลตัวอย่างตามประเภทที่เลือกไว้</p></div><button type="button" class="btn btn-primary" data-practice-add-section>+ เพิ่ม Section</button></div><div id="practiceSectionList" class="practice-section-list" data-kind="${kind}">${sections.map((section,i)=>practiceSectionEditor(kind,section,i)).join("")}</div></div>`,`<button class="btn" data-action="close-modal">ยกเลิก</button><button class="btn btn-primary" data-action="save-practice" data-kind="${kind}" data-id="${id||""}">บันทึก</button>`);render()
 }
 async function savePractice(kind,id){
  const title=root.querySelector("#modalName")?.value.trim()||"",visibility=root.querySelector("#modalVisibility")?.value||"private";if(!title)throw new Error("กรุณาตั้งชื่อชุดฝึก");
  const rows=[...root.querySelectorAll("[data-practice-section]")];if(!rows.length)throw new Error("กรุณาเพิ่มอย่างน้อย 1 Section");
  const sections=rows.map(row=>readPracticeSection(row,kind));
  for(let si=0;si<sections.length;si++)for(let qi=0;qi<sections[si].questions.length;qi++){const q=sections[si].questions[qi],filled=q.choices.filter(Boolean);if(!q.prompt)throw new Error(`Section ${si+1} คำถาม ${qi+1}: กรุณาพิมพ์คำถาม`);if(filled.length<2)throw new Error(`Section ${si+1} คำถาม ${qi+1}: กรุณาใส่อย่างน้อย 2 ตัวเลือก`);if(!q.choices[q.answer])throw new Error(`Section ${si+1} คำถาม ${qi+1}: ตัวเลือกคำตอบที่ถูกยังว่างอยู่`)}
  const key=kind==="mock"?"mocks":kind,creator=store.get().profile?.username||"guest",newId=id||`${kind}-${crypto.randomUUID()}`,cur=(store.get()[key]||[]).find(x=>x.id===id);
  const payload=cur?Object.fromEntries(Object.entries(cur).filter(([k])=>!["id","title","visibility","creator"].includes(k))):{},questions=sections.flatMap(section=>section.questions);
  payload.minutes=Math.max(1,Number(root.querySelector("#practiceMinutes")?.value)||10);payload.sections=sections;payload.itemCount=questions.length;
  const category=root.querySelector("#practiceCategory")?.value.trim()||"";
  if(kind==="mock")payload.questions=questions.length;
  else{payload.questions=questions;if(kind==="reading"){payload.text=sections[0]?.text||"";payload.category=category||"General article"}if(kind==="listening"){payload.script=sections[0]?.script||"";payload.type=category||"Conversation";payload.accent=payload.accent||"en-US"}if(kind==="writing"){payload.passage=sections[0]?.passage||"";payload.type=category||"Text Completion"}}
  const localSave=v=>store.update(s=>({...s,[key]:id?s[key].map(x=>x.id===id?{...x,title,visibility:v,...payload}:x):[...s[key],{id:newId,title,visibility:v,creator,...payload}]}));
  if(visibility==="private"&&!canPrivateLocally(store.get(),kind,id)){pendingPublicSave=async()=>{if(currentUser&&backendEnabled)await api("/api/content/publish-confirmed",{method:"POST",body:JSON.stringify({kind,id:newId,title,payload,confirm_public:true})});localSave("public")};modalHtml=modal("โควตาชุดส่วนตัวเต็ม",`<p class="modal-desc">Free เก็บ ${kind} ส่วนตัวได้ 1 ชุด ชุดนี้จะเป็น Public เฉพาะเมื่อคุณกดยืนยันเผยแพร่</p>`,`<button class="btn" data-action="close-modal">ยกเลิก</button><button class="btn btn-primary" data-action="confirm-public-save">ยืนยันเผยแพร่</button>`);return render()}
  if(currentUser&&backendEnabled)try{await api("/api/content/save",{method:"POST",body:JSON.stringify({kind,id:newId,title,visibility,payload})})}catch(err){if(!apiUnavailable(err))throw err}
  localSave(visibility);modalHtml="";render()
 }
 function openDelete(type,id){modalHtml=modal("ยืนยันการลบ",`<div class="delete-warning"><b>การลบไม่สามารถย้อนกลับได้</b></div><div class="modal-form"><label>พิมพ์คำว่า ลบ<input id="deleteText"></label><label class="delete-check-row"><input id="deleteCheck" type="checkbox"><span>ฉันเข้าใจว่ารายการนี้จะถูกลบถาวร</span></label></div>`,`<button class="btn" data-action="close-modal">ยกเลิก</button><button class="btn btn-danger" data-action="confirm-delete" data-type="${type}" data-id="${id}">ลบถาวร</button>`);render()}
 function confirmDelete(type,id){if(root.querySelector("#deleteText").value.trim()!=="ลบ"||!root.querySelector("#deleteCheck").checked)return;store.update(s=>{const key=type==="deck"?"decks":type==="mock"?"mocks":type;return {...s,[key]:s[key].filter(x=>x.id!==id)}});modalHtml="";render()}


 async function openWord(word){
  const local=store.get().decks.flatMap(d=>d.words).find(w=>w.w===word)?.m;
  if(local){
   if(!currentUser)return toast(`${word}: เข้าสู่ระบบเพื่อใช้การแปล`);
   try{
    if(backendEnabled)api("/api/dictionary/suggest",{method:"POST",body:JSON.stringify({word,meaning:local,target:"th"})}).catch(()=>{});
    const d=await api("/api/translate",{method:"POST",body:JSON.stringify({text:word,target:"th",local_translation:local})});
    return toast(`${word}: ${d.translation}`);
   }catch(e){return toast(e.message)}
  }
  if(!currentUser)return toast(`${word}: เข้าสู่ระบบเพื่อใช้การแปลออนไลน์`);
  try{const d=await api("/api/translate",{method:"POST",body:JSON.stringify({text:word,target:store.get().lang==="en"?"th":store.get().lang})});toast(`${word}: ${d.translation||"ยังไม่ได้ตั้ง Translation API"}`)}catch(e){toast(e.message)}
 }
 function openGame(kind,deck,words){
  const recordKey=`jumsup.game.${kind}.${deck.id}`,readRecords=()=>{try{return JSON.parse(localStorage.getItem(recordKey)||"[]")}catch{return[]}},saveRecord=(time,score)=>{const records=[...readRecords(),{time,score,at:Date.now()}].sort((a,b)=>b.score-a.score||a.time-b.time).slice(0,5);localStorage.setItem(recordKey,JSON.stringify(records));return records},formatTime=ms=>(ms/1000).toFixed(2)+"s";
  if(kind==="match"){
   if(words.length<4){modalHtml=modal("Match","ต้องจำศัพท์อย่างน้อย 4 คำก่อนเล่น");return render()}
   const pairs=[...words].sort(()=>Math.random()-.5).slice(0,Math.min(8,words.length)),tiles=pairs.flatMap((w,i)=>[{pair:i,text:w.w,type:"word"},{pair:i,text:w.m,type:"meaning"}]).sort(()=>Math.random()-.5),previous=readRecords(),best=previous[0];
   root.innerHTML=layout(`<section class="game-hero match-hero"><div><p class="content-eyebrow">SPEED MATCH</p><h1 class="content-title">Match · ${escapeHtml(deck.name)}</h1><p class="content-desc">แตะคำศัพท์และความหมายที่ตรงกันให้เร็วที่สุด เวลาเริ่มทันทีเมื่อแตะแผ่นแรก</p></div><button class="btn" id="matchRestart">↻ เล่นใหม่</button></section><div class="game-hud"><div><small>เวลา</small><strong id="matchTime">0.00s</strong></div><div><small>คู่ที่จับได้</small><strong id="matchPairs">0/${pairs.length}</strong></div><div><small>พลาด</small><strong id="matchMistakes">0</strong></div><div class="best-stat"><small>สถิติของฉัน</small><strong>${best?formatTime(best.time):"—"}</strong></div></div><div class="match-progress"><i id="matchProgress"></i></div><div class="match-board quizlet-match">${tiles.map(t=>`<button class="match-tile ${t.type}" data-pair="${t.pair}">${escapeHtml(t.text)}</button>`).join("")}</div><aside class="personal-ranking"><div><p class="content-eyebrow">PERSONAL BEST</p><h3>อันดับของฉัน</h3></div><ol id="matchRanking">${previous.length?previous.map((r,i)=>`<li><b>#${i+1}</b><span>${formatTime(r.time)}</span><small>${r.score.toLocaleString()} pts</small></li>`).join(""):`<li class="empty-rank">เล่นรอบแรกเพื่อสร้างสถิติ</li>`}</ol></aside>`);bind();
   let first=null,matched=0,mistakes=0,startedAt=0,frame=0,locked=false;const tick=()=>{if(!startedAt)return;const elapsed=performance.now()-startedAt,el=root.querySelector("#matchTime");if(!el)return;if(elapsed>30000)el.closest("div")?.classList.add("danger");el.textContent=formatTime(elapsed);frame=requestAnimationFrame(tick)},start=()=>{if(startedAt)return;startedAt=performance.now();root.querySelector(".match-hero")?.classList.add("playing");tick()};
   root.querySelector("#matchRestart").onclick=()=>{cancelAnimationFrame(frame);openGame("match",deck,words)};
   root.querySelectorAll(".match-tile").forEach(t=>t.onclick=()=>{if(locked||t.classList.contains("matched")){return}start();if(!first){first=t;t.classList.add("selected");return}if(first===t)return;if(first.dataset.pair===t.dataset.pair){locked=true;const old=first;first=null;old.classList.add("matched","pop");t.classList.add("matched","pop");matched++;root.querySelector("#matchPairs").textContent=`${matched}/${pairs.length}`;root.querySelector("#matchProgress").style.width=`${matched/pairs.length*100}%`;setTimeout(()=>{old.classList.add("gone");t.classList.add("gone");locked=false},190);if(matched===pairs.length){const elapsed=performance.now()-startedAt;cancelAnimationFrame(frame);const score=Math.max(100,Math.round(pairs.length*10000/Math.max(elapsed/1000,1)-mistakes*75)),wasBest=!best||elapsed<best.time,records=saveRecord(Math.round(elapsed),score);setTimeout(()=>{const ranking=root.querySelector("#matchRanking");if(!ranking)return;ranking.innerHTML=records.map((r,i)=>`<li class="${r.time===Math.round(elapsed)?"new-record":""}"><b>#${i+1}</b><span>${formatTime(r.time)}</span><small>${r.score.toLocaleString()} pts</small></li>`).join("");modalHtml=modal(wasBest?"🏆 สถิติใหม่!":"Match สำเร็จ",`<div class="game-result"><strong>${formatTime(elapsed)}</strong><p>${score.toLocaleString()} คะแนน · พลาด ${mistakes} ครั้ง</p></div>`,`<button class="btn" data-action="close-modal">ดูอันดับ</button><button class="btn btn-primary" id="playMatchAgain">ทำลายสถิติอีกครั้ง</button>`);render();root.querySelector("#playMatchAgain").onclick=()=>{modalHtml="";openGame("match",deck,words)}},260)}}else{mistakes++;root.querySelector("#matchMistakes").textContent=mistakes;locked=true;const old=first;first=null;old.classList.add("wrong");t.classList.add("wrong");setTimeout(()=>{old.classList.remove("selected","wrong");t.classList.remove("wrong");locked=false},260)}});return
  }
  const playable=words.filter(w=>/^[a-z]{3,14}$/i.test(w.w)&&String(w.m||"").trim());
  if(playable.length<3){modalHtml=modal("Crossword","ต้องมีคำศัพท์ภาษาอังกฤษที่มีความหมายอย่างน้อย 3 คำก่อนเล่น");return render()}
  function makeCrossword(source){
   const attempt=seed=>{
    const picked=[...source].sort((a,b)=>b.w.length-a.w.length||((seed+a.w.length)%3)-1).slice(0,Math.min(10,source.length));
    const cells=new Map(),placed=[],key=(x,y)=>`${x},${y}`,get=(x,y)=>cells.get(key(x,y));
    const put=(entry,x,y,dir)=>{
     const dx=dir==="across"?1:0,dy=dir==="down"?1:0;
     entry.w.toUpperCase().split("").forEach((letter,i)=>{const cx=x+dx*i,cy=y+dy*i,k=key(cx,cy),old=cells.get(k);cells.set(k,old?{...old,wordIds:[...old.wordIds,placed.length]}:{letter,wordIds:[placed.length]})});
     placed.push({entry,x,y,dir,length:entry.w.length});
    };
    const valid=(entry,x,y,dir)=>{
     const dx=dir==="across"?1:0,dy=dir==="down"?1:0;
     if(get(x-dx,y-dy)||get(x+dx*entry.w.length,y+dy*entry.w.length))return false;
     let crossings=0;
     for(let i=0;i<entry.w.length;i++){
      const cx=x+dx*i,cy=y+dy*i,old=get(cx,cy),letter=entry.w[i].toUpperCase();
      if(old){if(old.letter!==letter)return false;const sameDirection=old.wordIds.some(id=>placed[id]?.dir===dir);if(sameDirection)return false;crossings++}
      else if(dir==="across"){if(get(cx,cy-1)||get(cx,cy+1))return false}
      else if(get(cx-1,cy)||get(cx+1,cy))return false;
     }
     return crossings>0;
    };
    put(picked[0],0,0,"across");
    let pending=picked.slice(1),changed=true;
    while(changed&&pending.length){changed=false;pending=pending.filter(entry=>{
     for(let i=0;i<entry.w.length;i++)for(const [pos,cell] of cells){
      if(cell.letter!==entry.w[i].toUpperCase())continue;
      const [cx,cy]=pos.split(",").map(Number);
      for(const dir of ["down","across"]){const x=cx-(dir==="across"?i:0),y=cy-(dir==="down"?i:0);if(valid(entry,x,y,dir)){put(entry,x,y,dir);changed=true;return false}}
     }
     return true;
    })}
    return {cells,placed};
   };
   let best=null;
   for(let seed=0;seed<18;seed++){const board=attempt(seed);if(!best||board.placed.length>best.placed.length)best=board}
   if(!best||best.placed.length<3)return null;
   const xs=[...best.cells.keys()].map(k=>Number(k.split(",")[0])),ys=[...best.cells.keys()].map(k=>Number(k.split(",")[1])),minX=Math.min(...xs),minY=Math.min(...ys),maxX=Math.max(...xs),maxY=Math.max(...ys);
   const normalized=new Map();for(const [k,v] of best.cells){const [x,y]=k.split(",").map(Number);normalized.set(`${x-minX},${y-minY}`,v)}
   const placed=best.placed.map(w=>({...w,x:w.x-minX,y:w.y-minY})).sort((a,b)=>a.y-b.y||a.x-b.x);
   let number=0;const starts=new Map();placed.forEach(w=>{const k=`${w.x},${w.y}`;if(!starts.has(k))starts.set(k,++number);w.number=starts.get(k)});
   return {cells:normalized,placed,width:maxX-minX+1,height:maxY-minY+1,starts};
  }
  const board=makeCrossword(playable);
  if(!board){modalHtml=modal("ยังสร้างตารางคำไขว้ไม่ได้","ชุดนี้ต้องมีอย่างน้อย 3 คำที่มีตัวอักษรร่วมกัน เช่น CAT, TABLE และ LATE");return render()}
  const previous=readRecords(),best=previous[0],cellHtml=[];
  for(let y=0;y<board.height;y++)for(let x=0;x<board.width;x++){const cell=board.cells.get(`${x},${y}`),num=board.starts.get(`${x},${y}`);cellHtml.push(cell?`<label class="cross-cell-wrap">${num?`<small>${num}</small>`:""}<input class="cross-cell" maxlength="1" data-x="${x}" data-y="${y}" data-a="${escapeHtml(cell.letter)}" data-words="${cell.wordIds.join(",")}" aria-label="ช่อง ${x+1},${y+1}"></label>`:'<span class="cross-block" aria-hidden="true"></span>')}
  const clues=dir=>board.placed.map((w,id)=>({...w,id})).filter(w=>w.dir===dir).map(w=>`<button class="clue-item" data-cross-word="${w.id}"><b>${w.number}. ${escapeHtml(w.entry.m)}</b><small>${w.entry.w.length} ตัวอักษร</small></button>`).join("");
  root.innerHTML=layout(`<section class="game-hero cross-hero"><div><p class="content-eyebrow">CROSSWORD</p><h1 class="content-title">Crossword · ${escapeHtml(deck.name)}</h1><p class="content-desc">เติมคำแนวนอนและแนวตั้งที่ตัดกันจากคำใบ้</p></div><button class="btn" id="crossRestart">↻ กระดานใหม่</button></section><div class="game-hud"><div><small>เวลา</small><strong id="crossTime">0.00s</strong></div><div><small>คำสำเร็จ</small><strong id="crossSolved">0/${board.placed.length}</strong></div><div><small>ใช้คำใบ้</small><strong id="crossHints">0</strong></div><div class="best-stat"><small>สถิติสูงสุด</small><strong>${best?best.score.toLocaleString():"—"}</strong></div></div><div class="crossword-layout"><div class="crossword-main"><div class="cross-grid-pro" style="--cols:${board.width}">${cellHtml.join("")}</div><div class="cross-feedback" id="crossFeedback">เลือกคำใบ้แล้วเริ่มพิมพ์ได้เลย</div><div class="actions"><button class="btn btn-primary" id="checkCross">ตรวจทั้งตาราง</button><button class="btn" id="hintCross">💡 เปิดหนึ่งตัวอักษร</button></div></div><aside class="clue-panel"><h3>แนวนอน</h3>${clues("across")||"<p>—</p>"}<h3>แนวตั้ง</h3>${clues("down")||"<p>—</p>"}<div class="quest-ranking"><h3>สถิติ 5 อันดับ</h3><ol id="crossRanking">${previous.length?previous.map((r,i)=>`<li><b>#${i+1}</b><span>${r.score.toLocaleString()} pts</span><small>${formatTime(r.time)}</small></li>`).join(""):`<li class="empty-rank">ยังไม่มีสถิติ</li>`}</ol></div></aside></div>`);bind();
  let activeWord=0,hints=0,startedAt=performance.now(),frame=0,finished=false;
  const inputs=[...root.querySelectorAll(".cross-cell")],wordCells=id=>{const w=board.placed[id],dx=w.dir==="across"?1:0,dy=w.dir==="down"?1:0;return [...Array(w.length)].map((_,i)=>root.querySelector(`[data-x="${w.x+dx*i}"][data-y="${w.y+dy*i}"]`))},updateSolved=()=>{const solved=board.placed.filter((_,id)=>wordCells(id).every(x=>x.value===x.dataset.a)).length;root.querySelector("#crossSolved").textContent=`${solved}/${board.placed.length}`;return solved};
  const selectWord=id=>{activeWord=Number(id);root.querySelectorAll("[data-cross-word]").forEach(x=>x.classList.toggle("active",Number(x.dataset.crossWord)===activeWord));wordCells(activeWord).find(x=>!x.value)?.focus()||wordCells(activeWord)[0]?.focus()};
  const tick=()=>{const el=root.querySelector("#crossTime");if(!el||finished)return;el.textContent=formatTime(performance.now()-startedAt);frame=requestAnimationFrame(tick)};tick();selectWord(0);
  root.querySelector("#crossRestart").onclick=()=>{cancelAnimationFrame(frame);openGame("crossword",deck,words)};
  root.querySelectorAll("[data-cross-word]").forEach(x=>x.onclick=()=>selectWord(x.dataset.crossWord));
  inputs.forEach(x=>{x.onfocus=()=>{const ids=x.dataset.words.split(",").map(Number);if(!ids.includes(activeWord))selectWord(ids[0])};x.oninput=()=>{x.value=x.value.replace(/[^a-z]/gi,"").toUpperCase();x.classList.remove("wrong");const list=wordCells(activeWord),i=list.indexOf(x);if(x.value)list[i+1]?.focus();updateSolved()};x.onkeydown=e=>{if(e.key==="Backspace"&&!x.value){const list=wordCells(activeWord),i=list.indexOf(x);list[i-1]?.focus()}}});
  root.querySelector("#hintCross").onclick=()=>{const target=wordCells(activeWord).find(x=>x.value!==x.dataset.a)||inputs.find(x=>x.value!==x.dataset.a);if(!target)return;target.value=target.dataset.a;target.classList.add("hinted");hints++;root.querySelector("#crossHints").textContent=hints;updateSolved()};
  root.querySelector("#checkCross").onclick=()=>{inputs.forEach(x=>x.classList.toggle("wrong",x.value!==x.dataset.a));const solved=updateSolved();if(solved<board.placed.length){root.querySelector("#crossFeedback").textContent=`ถูกแล้ว ${solved} คำ · ช่องสีแดงยังไม่ถูก`;return}finished=true;cancelAnimationFrame(frame);inputs.forEach(x=>x.classList.add("correct"));const elapsed=Math.round(performance.now()-startedAt),score=Math.max(100,board.placed.length*1000-Math.floor(elapsed/100)-hints*100),wasBest=!best||score>best.score;saveRecord(elapsed,score);modalHtml=modal(wasBest?"🏆 สถิติใหม่!":"ไข Crossword สำเร็จ",`<div class="game-result"><strong>${score.toLocaleString()} pts</strong><p>${formatTime(elapsed)} · ${board.placed.length} คำ · ใช้คำใบ้ ${hints} ครั้ง</p></div>`,`<button class="btn" data-action="close-modal">ดูตาราง</button><button class="btn btn-primary" id="playCrossAgain">เล่นกระดานใหม่</button>`);render();root.querySelector("#playCrossAgain").onclick=()=>{modalHtml="";openGame("crossword",deck,words)}};


 }


 async function markKnown(i){
  if(!study)return;
  if(currentUser&&backendEnabled){
    const {data,error}=await supabase.rpc("mark_word_mastered",{p_set_id:study.deckId,p_index:i});
    if(error)throw error;
    study.mastered=[...(data.mastered||[])];
    store.set({xp:data.xp,progress:{...store.get().progress,[study.deckId]:{mastered:study.mastered}}});
  }else{
    const fresh=!study.mastered.includes(i);
    if(fresh)study.mastered.push(i);
    store.update(s=>({...s,progress:{...s.progress,[study.deckId]:{mastered:study.mastered}},xp:s.xp+(fresh?10:0)}));
  }
 }
 function bindSwipe(){
  const card=root.querySelector("#swipeCard");if(!card||!study)return;let sx=null,dx=0;
  const known=async()=>{const i=Number(card.dataset.index);try{await markKnown(i)}catch(err){toast(err.message||"บันทึกความก้าวหน้าไม่สำเร็จ")}};
  const missed=()=>{study.cursor++;render()};
  card.onpointerdown=e=>{if(e.target.closest("button"))return;sx=e.clientX;card.setPointerCapture?.(e.pointerId)};
  card.onpointermove=e=>{if(sx===null)return;dx=e.clientX-sx;card.style.transform=`translateX(${dx}px) rotate(${dx/25}deg)`};
  card.onpointerup=()=>{if(Math.abs(dx)>90){dx>0?known():missed();return}card.style.transform="";sx=null;dx=0};
  document.onkeydown=e=>{if(route!=="study")return;if(e.key==="ArrowRight"){e.preventDefault();known()}else if(e.key==="ArrowLeft"){e.preventDefault();missed()}};
 }


 function startExamTimer(){
  clearInterval(examTimer);examTimer=null;
  const el=root.querySelector("#examTimer");if(!el)return;
  let remaining=Number(el.dataset.seconds)||0;
  examTimer=setInterval(()=>{remaining=Math.max(0,remaining-1);const m=Math.floor(remaining/60),s=remaining%60;el.textContent=`${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;if(!remaining){clearInterval(examTimer);examTimer=null;toast("หมดเวลาฝึกแล้ว")}},1000);
 }


 store.subscribe(()=>{render();scheduleSync()});


 if(backendEnabled){
  const session=await getSession();currentUser=session?.user||null;
  if(currentUser)await hydrateFromCloud(currentUser);else store.set({backend:true,user:null});
  onAuthChange(async session=>{currentUser=session?.user||null;if(currentUser)await hydrateFromCloud(currentUser);else store.set({user:null,profile:null,subscription:null,community:[],backend:true})});
 }else store.set({backend:false,user:null});
 render();
}
