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
  else if(route==="reading-play")html=renderReading(selected);
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
   const remoteHasData=(remote.decks?.length||0)+(remote.reading?.length||0)+(remote.listening?.length||0)+(remote.writing?.length||0)+(remote.mocks?.length||0)>0;
   if(remoteHasData){
    store.set({...remote,theme:remote.profile?.ui_theme||local.theme,lang:remote.profile?.ui_language||local.lang,sound:remote.profile?.sound_enabled??local.sound,backend:true,syncing:false});
   }else{
    store.set({user,profile:remote.profile,subscription:remote.subscription,backend:true,syncing:false});
    await pushCloudState(user,store.get());
    const again=await loadCloudState(user);store.set({...again,backend:true,syncing:false});
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
  root.querySelectorAll("[data-nav]").forEach(el=>el.onclick=()=>{route=el.dataset.nav;if(route==="pricing"&&store.get().user){route="account";accountTab="plan"}selected=null;study=null;if(route==="community")refreshCommunity();render()});
  root.querySelectorAll("[data-account-tab]").forEach(el=>el.onclick=()=>{accountTab=el.dataset.accountTab;route="account";render()});
  root.querySelectorAll("[data-account-back]").forEach(el=>el.onclick=()=>{accountTab="menu";render()});
  root.querySelectorAll("[data-action]").forEach(el=>el.onclick=e=>handleAction(el.dataset.action,el,e));
  root.querySelectorAll("[data-lang]").forEach(el=>el.onclick=()=>store.set({lang:el.dataset.lang}));
  root.querySelectorAll("[data-theme-choice]").forEach(el=>el.onclick=()=>store.set({theme:el.dataset.themeChoice}));
  const st=root.querySelector("#soundToggle");if(st)st.onchange=()=>store.set({sound:st.checked});
  const billingCurrency=root.querySelector("#billingCurrency");if(billingCurrency)billingCurrency.onchange=()=>store.set({billingCurrency:billingCurrency.value});
  const communitySort=root.querySelector("#communitySort");if(communitySort)communitySort.onchange=()=>store.set({communitySort:communitySort.value});
  root.querySelectorAll("[data-community-tab]").forEach(el=>el.onclick=async()=>{communityTab=el.dataset.communityTab;await refreshCommunity();render()});
  root.querySelectorAll(".choice").forEach(el=>el.onclick=()=>{
   const host=el.closest(".question");
   host.querySelectorAll(".choice").forEach(x=>x.classList.remove("selected","correct","wrong"));
   el.classList.add("selected",Number(el.dataset.answer)===Number(el.dataset.correct)?"correct":"wrong");
   host.dataset.answered="true";if(practiceAttempt)practiceAttempt.answers[el.dataset.question]=Number(el.dataset.answer);
   const answered=root.querySelectorAll('.question[data-answered="true"]').length,total=root.querySelectorAll(".question").length,count=root.querySelector("#answeredCount");
   if(count)count.textContent=`${answered}/${total}${route==="mock-play"?" ตัวอย่าง":""}`;
   const number=Number((host.id.match(/(\d+)$/)||[])[1]);if(number)root.querySelector(`[data-jump="mock-${number}"]`)?.classList.add("done");
  });
  root.querySelectorAll("[data-jump]").forEach(el=>el.onclick=()=>document.getElementById(el.dataset.jump)?.scrollIntoView({behavior:"smooth",block:"start"}));
  root.querySelectorAll(".read-word").forEach(el=>el.onclick=()=>openWord(el.dataset.word));
  const avatar=root.querySelector("#avatarFile");if(avatar)avatar.onchange=async()=>{if(!avatar.files?.[0]||!currentUser)return;try{const url=await uploadAvatar(currentUser,avatar.files[0]);store.set({profile:{...store.get().profile,avatar_url:url}})}catch(e){toast(e.message)}};
  const importFile=root.querySelector("#bulkImportFile");if(importFile)importFile.onchange=async()=>{const file=importFile.files?.[0];if(!file)return;const error=root.querySelector("#importFileError");if(!file.name.toLowerCase().endsWith(".csv")){error.textContent="ตอนนี้รองรับ CSV เท่านั้น กรุณาดาวน์โหลดเทมเพลต CSV แล้วนำข้อมูลมาวาง";error.classList.remove("hidden");return}try{const parsed=parseCsv(await file.text());if(!parsed.headers.length||!parsed.rows.length)throw new Error("ไฟล์ไม่มีข้อมูล");const limit=isPro(store.get())?PRO_LIMITS.importRows:100;if(parsed.rows.length>limit)throw new Error(`แพ็กเกจปัจจุบันนำเข้าได้สูงสุด ${limit.toLocaleString()} แถวต่อครั้ง`);bulkImportState={...bulkImportState,fileName:file.name,...parsed,step:2};openBulkImport()}catch(err){error.textContent=err.message||"อ่านไฟล์ไม่สำเร็จ";error.classList.remove("hidden")}};
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
   if(a==="start-deck"){const d=s.decks.find(x=>x.id===el.dataset.id);if(el.dataset.mode!=="flash"){const p=s.progress[d.id]||{mastered:[]};const m=masteredWords(s,d.id,p);if(el.dataset.mode==="match")return openGame("match",d,m);if(el.dataset.mode==="crossword")return openGame("crossword",d,m)}study={deckId:d.id,poolSize:Math.min(s.flashSettings.loopSize,d.words.length),mastered:[...((s.progress[d.id]||{}).mastered||[])],cursor:0};route="study";render()}
   if(a==="know-word"){await markKnown(Number(el.dataset.index));study.cursor=0}
   if(a==="miss-word"){study.cursor++;render()}
   if(a==="speak")speak(el.dataset.word)
   if(a==="open-flash-settings")openFlashSettings()
   if(a==="save-study-settings")saveFlashSettings()
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
      catch(err){if(String(err.message).includes("DAILY_LIMIT_REACHED"))return toast("วันนี้ใช้สิทธิ์ "+kind+" ฟรีไปแล้ว");throw err}
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
   if(a==="checkout-monthly"||a==="checkout-yearly"){const d=await api("/api/stripe/create-checkout",{method:"POST",body:JSON.stringify({plan:a==="checkout-yearly"?"yearly":"monthly",currency:(store.get().billingCurrency||"THB").toLowerCase()})});location.href=d.url}
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
  modalHtml=modal("ตั้งค่า Flashcard",`<div class="flash-study-settings-modal"><div class="flash-setting-section"><div class="flash-setting-heading"><div><b>จำนวนคำใน Loop</b><small>กำหนดจำนวนคำที่จะวนซ้ำในรอบนี้</small></div></div><div class="loop-input-row"><input id="studyLoopSize" type="number" min="1" max="${max}" value="${Math.min(study?.poolSize||s.flashSettings.loopSize,max)}"></div></div><div class="flash-setting-list"><label class="flash-setting-row"><span><b>อ่านเสียงอัตโนมัติ</b></span><span class="switch"><input id="studyAutoSpeak" type="checkbox" ${s.flashSettings.autoSpeak?"checked":""}><span></span></span></label><label class="flash-setting-row"><span><b>แสดงคำแปลทันที</b></span><span class="switch"><input id="studyShowMeaning" type="checkbox" ${s.flashSettings.showMeaning?"checked":""}><span></span></span></label><label class="flash-setting-row"><span><b>สุ่มลำดับคำ</b></span><span class="switch"><input id="studyShuffle" type="checkbox" ${s.flashSettings.shuffle?"checked":""}><span></span></span></label></div></div>`,`<button class="btn" data-action="close-modal">ยกเลิก</button><button class="btn btn-primary" data-action="save-study-settings">บันทึก</button>`);render()
 }
 function saveFlashSettings(){
  if(!study)return;const s=store.get(),deck=s.decks.find(d=>d.id===study.deckId),max=Math.max(1,deck.words.length);
  const settings={loopSize:Math.max(1,Math.min(max,Number(root.querySelector("#studyLoopSize").value)||1)),autoSpeak:root.querySelector("#studyAutoSpeak").checked,showMeaning:root.querySelector("#studyShowMeaning").checked,shuffle:root.querySelector("#studyShuffle").checked};
  study.poolSize=settings.loopSize;study.mastered=study.mastered.filter(i=>i<settings.loopSize);study.cursor=0;modalHtml="";store.set({flashSettings:settings});
 }
 function openDeckModal(id){
  const s=store.get(),d=id?s.decks.find(x=>x.id===id):null;
  modalHtml=modal(d?"แก้ไขชุดคำศัพท์":"สร้างชุดคำศัพท์",`<div class="modal-form"><label>ชื่อชุด<input id="modalName" value="${escapeHtml(d?.name||"")}"></label><label>การมองเห็น<select id="modalVisibility"><option value="private" ${d?.visibility!=="public"?"selected":""}>ส่วนตัว</option><option value="public" ${d?.visibility==="public"?"selected":""}>สาธารณะ</option></select></label></div>`,`<button class="btn" data-action="close-modal">ยกเลิก</button><button class="btn btn-primary" data-action="save-deck" data-id="${id||""}">บันทึก</button>`);render()
 }
 async function saveDeck(id){
  const name=root.querySelector("#modalName").value.trim(),visibility=root.querySelector("#modalVisibility").value;if(!name)return;
  const creator=store.get().profile?.username||"guest",newId=id||`deck-${crypto.randomUUID()}`;
  const localSave=(v)=>store.update(s=>({...s,decks:id?s.decks.map(d=>d.id===id?{...d,name,visibility:v}:d):[...s.decks,{id:newId,name,visibility:v,creator,words:[]}]}));
  if(visibility==="private"&&!canPrivateLocally(store.get(),"vocab",id)){
    pendingPublicSave=async()=>{if(currentUser&&backendEnabled)await api("/api/content/publish-confirmed",{method:"POST",body:JSON.stringify({kind:"vocab",id:newId,title:name,confirm_public:true})});localSave("public")};
    modalHtml=modal("โควตาชุดส่วนตัวเต็ม",`<p class="modal-desc">Free เก็บ Flashcard ส่วนตัวได้ 3 ชุด ชุดนี้จะเป็น Public เฉพาะเมื่อคุณกดยืนยันเผยแพร่</p>`,`<button class="btn" data-action="close-modal">ยกเลิก</button><button class="btn btn-primary" data-action="confirm-public-save">ยืนยันเผยแพร่</button>`);return render()
  }
  if(currentUser&&backendEnabled)await api("/api/content/save",{method:"POST",body:JSON.stringify({kind:"vocab",id:newId,title:name,visibility})});
  localSave(visibility);modalHtml="";render()
 }
 function openPracticeModal(kind,id){
  const s=store.get(),arr=kind==="mock"?s.mocks:s[kind],x=id?arr.find(v=>v.id===id):null;
  const content=kind==="reading"?x?.text||"":kind==="listening"?x?.script||"":kind==="writing"?x?.passage||x?.prompt||"":"";
  const questionData=kind==="mock"?(x?.sections||[]):(x?.questions||[]);
  modalHtml=modal(x?"แก้ไขชุดฝึก":"สร้างชุดฝึก",`<div class="modal-form practice-editor"><div class="modal-two"><label>ชื่อชุด<input id="modalName" value="${escapeHtml(x?.title||"")}"></label><label>การมองเห็น<select id="modalVisibility"><option value="private" ${x?.visibility!=="public"?"selected":""}>ส่วนตัว</option><option value="public" ${x?.visibility==="public"?"selected":""}>สาธารณะ</option></select></label></div><div class="modal-two"><label>เวลา (นาที)<input id="practiceMinutes" type="number" min="1" max="240" value="${Number(x?.minutes||10)}"></label>${kind==="writing"?`<label>ประเภท<select id="practiceType"><option ${x?.type!=="Paragraph Organization"?"selected":""}>Text Completion</option><option ${x?.type==="Paragraph Organization"?"selected":""}>Paragraph Organization</option></select></label>`:`<label>หมวด/ประเภท<input id="practiceCategory" value="${escapeHtml(x?.category||x?.type||"")}"></label>`}</div>${kind!=="mock"?`<label>${kind==="reading"?"บทความ":kind==="listening"?"บทสนทนา / Transcript":"ข้อความหรือ Passage"}<textarea id="practiceContent" rows="7" placeholder="ใส่เนื้อหาที่ผู้เรียนจะใช้ตอบคำถาม">${escapeHtml(content)}</textarea></label>`:""}<label>${kind==="mock"?"Sections และข้อสอบ":"คำถาม"} (JSON)<textarea id="practiceQuestions" rows="12" spellcheck="false" placeholder='[{"prompt":"Question","choices":["A","B","C","D"],"answer":0}]'>${escapeHtml(JSON.stringify(questionData,null,2))}</textarea></label><div class="modal-note">answer ใช้เลข 0–3 ตามลำดับตัวเลือก หากเป็น Mock ให้ใช้โครงสร้าง sections ที่มี title, description, context และ questions</div></div>`,`<button class="btn" data-action="close-modal">ยกเลิก</button><button class="btn btn-primary" data-action="save-practice" data-kind="${kind}" data-id="${id||""}">บันทึก</button>`);render()
 }
 async function savePractice(kind,id){
  const title=root.querySelector("#modalName").value.trim(),visibility=root.querySelector("#modalVisibility").value;if(!title)return;
  const key=kind==="mock"?"mocks":kind,creator=store.get().profile?.username||"guest",newId=id||`${kind}-${crypto.randomUUID()}`;
  const cur=(store.get()[key]||[]).find(x=>x.id===id);let parsed;
  try{parsed=JSON.parse(root.querySelector("#practiceQuestions")?.value||"[]")}catch{throw new Error("รูปแบบ JSON ของคำถามไม่ถูกต้อง")}
  if(!Array.isArray(parsed))throw new Error("ข้อมูลคำถามต้องเป็น JSON Array");
  const payload=cur?Object.fromEntries(Object.entries(cur).filter(([k])=>!["id","title","visibility","creator"].includes(k))):{};
  payload.minutes=Math.max(1,Number(root.querySelector("#practiceMinutes")?.value)||10);
  if(kind==="mock"){payload.sections=parsed;payload.questions=parsed.reduce((n,section)=>n+(section.questions?.length||0),0)||80;payload.itemCount=payload.questions}
  else{
   payload.questions=parsed;payload.itemCount=parsed.length;
   const content=root.querySelector("#practiceContent")?.value.trim()||"";
   if(kind==="reading"){payload.text=content;payload.category=root.querySelector("#practiceCategory")?.value.trim()||"General article"}
   if(kind==="listening"){payload.script=content;payload.type=root.querySelector("#practiceCategory")?.value.trim()||"Conversation";payload.accent=payload.accent||"en-US"}
   if(kind==="writing"){payload.passage=content;payload.type=root.querySelector("#practiceType")?.value||"Text Completion"}
  }
  const localSave=(v)=>store.update(s=>({...s,[key]:id?s[key].map(x=>x.id===id?{...x,title,visibility:v}:x):[...s[key],{id:newId,title,visibility:v,creator,...payload}]}));
  if(visibility==="private"&&!canPrivateLocally(store.get(),kind,id)){
    pendingPublicSave=async()=>{if(currentUser&&backendEnabled)await api("/api/content/publish-confirmed",{method:"POST",body:JSON.stringify({kind,id:newId,title,payload,confirm_public:true})});localSave("public")};
    modalHtml=modal("โควตาชุดส่วนตัวเต็ม",`<p class="modal-desc">Free เก็บ ${kind} ส่วนตัวได้ 1 ชุด ชุดนี้จะเป็น Public เฉพาะเมื่อคุณกดยืนยันเผยแพร่</p>`,`<button class="btn" data-action="close-modal">ยกเลิก</button><button class="btn btn-primary" data-action="confirm-public-save">ยืนยันเผยแพร่</button>`);return render()
  }
  if(currentUser&&backendEnabled)await api("/api/content/save",{method:"POST",body:JSON.stringify({kind,id:newId,title,visibility,payload})});
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
  if(kind==="match"){
   if(words.length<4){modalHtml=modal("Match","ต้องจำศัพท์อย่างน้อย 4 คำก่อนเล่น");return render()}
   const pairs=words.slice(0,6),tiles=pairs.flatMap((w,i)=>[{pair:i,text:w.w},{pair:i,text:w.m}]).sort(()=>Math.random()-.5);
   root.innerHTML=layout(`<div class="content-header"><div><p class="content-eyebrow">VOCABULARY GAME</p><h1 class="content-title">Match · ${escapeHtml(deck.name)}</h1><p class="content-desc">จับคู่คำศัพท์กับความหมายให้ครบโดยใช้จำนวนครั้งให้น้อยที่สุด</p></div><span class="content-mode">Mastered words</span></div><div class="match-toolbar"><div>เวลา <strong id="matchTime">0:00</strong></div><div>ครั้ง <strong id="matchMoves">0</strong></div><div>คู่ <strong id="matchPairs">0/${pairs.length}</strong></div></div><div class="match-board quizlet-match">${tiles.map(t=>`<button class="match-tile" data-pair="${t.pair}">${escapeHtml(t.text)}</button>`).join("")}</div>`);bind();let first=null,moves=0,matched=0,seconds=0;const clock=setInterval(()=>{seconds++;const el=root.querySelector("#matchTime");if(el)el.textContent=`${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,"0")}`;else clearInterval(clock)},1000);root.querySelectorAll(".match-tile").forEach(t=>t.onclick=()=>{if(t.classList.contains("matched"))return;if(!first){first=t;t.classList.add("selected");return}if(first===t)return;moves++;root.querySelector("#matchMoves").textContent=moves;if(first.dataset.pair===t.dataset.pair){first.classList.add("matched");t.classList.add("matched");matched++;root.querySelector("#matchPairs").textContent=`${matched}/${pairs.length}`;first=null;if(matched===pairs.length){clearInterval(clock);setTimeout(()=>toast(`จบ Match ใน ${seconds} วินาที · ${moves} ครั้ง`),250)}}else{const old=first;first=null;t.classList.add("wrong");setTimeout(()=>{old.classList.remove("selected");t.classList.remove("wrong")},350)}});return
  }
  if(words.length<3){modalHtml=modal("Crossword","ต้องจำศัพท์อย่างน้อย 3 คำก่อนเล่น");return render()}
  const selectedWords=words.filter(w=>/^[a-z]+$/i.test(w.w)).slice(0,5);root.innerHTML=layout(`<div class="content-header"><div><p class="content-eyebrow">VOCABULARY GAME</p><h1 class="content-title">Crossword · ${escapeHtml(deck.name)}</h1><p class="content-desc">เติมคำจากคำใบ้โดยใช้เฉพาะคำที่จำแล้ว</p></div><span class="content-mode" id="crossTime">0:00</span></div><div class="crossword-layout"><div class="crossword-main">${selectedWords.map((w,wi)=>`<div class="cross-word-row"><b>${wi+1}</b><div class="cross-letter-row">${[...w.w].map(c=>`<input class="cross-cell" maxlength="1" data-a="${escapeHtml(c.toUpperCase())}" aria-label="คำที่ ${wi+1}">`).join("")}</div></div>`).join("")}<div class="actions"><button class="btn btn-primary" id="checkCross">ตรวจคำตอบ</button><button class="btn" id="clearCross">ล้างคำตอบ</button></div></div><aside class="clue-panel"><h3>คำใบ้</h3>${selectedWords.map((w,i)=>`<div class="clue-item"><b>${i+1}. ${escapeHtml(w.m)}</b><small>${w.w.length} ตัวอักษร</small></div>`).join("")}</aside></div>`);bind();let seconds=0;const clock=setInterval(()=>{seconds++;const el=root.querySelector("#crossTime");if(el)el.textContent=`${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,"0")}`;else clearInterval(clock)},1000);root.querySelectorAll(".cross-cell").forEach((x,i,all)=>x.oninput=()=>{x.value=x.value.replace(/[^a-z]/gi,"").toUpperCase();if(x.value)all[i+1]?.focus()});root.querySelector("#clearCross").onclick=()=>root.querySelectorAll(".cross-cell").forEach(x=>{x.value="";x.classList.remove("wrong")});root.querySelector("#checkCross").onclick=()=>{const cells=[...root.querySelectorAll(".cross-cell")];cells.forEach(x=>x.classList.toggle("wrong",x.value.toUpperCase()!==x.dataset.a));if(cells.every(x=>x.value.toUpperCase()===x.dataset.a)){clearInterval(clock);toast(`ถูกทั้งหมด · ใช้เวลา ${seconds} วินาที`)}}
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
