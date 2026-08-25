import { store } from "../lib/store.js";
import { tr,localizePage } from "../lib/i18n.js";
import { speak,todayKey,escapeHtml } from "../lib/utils.js";
import { backendEnabled,getSession,signInGoogle,signOut,onAuthChange } from "../lib/auth.js";
import { loadCloudState,pushCloudState,loadCommunity,importCommunityItem,uploadAvatar,toggleCommunityLike,saveCommunityReview,reportCommunityContent } from "../lib/cloud.js";
import { api } from "../lib/api.js";
import { canPrivateLocally,startDailyFeature } from "../lib/policy.js";
import { isPro } from "../lib/entitlements.js";
import { FREE_LIMITS,PRO_LIMITS } from "../lib/plans.js";
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
 let route="landing",accountTab="menu",study=null,selected=null,practiceAttempt=null,practiceKind=null,communityTab="vocab",communityQuery="",modalHtml="",syncTimer=null,examTimer=null,renderFrame=0,hydrating=false;
 let pendingPublicSave=null,bulkImportState=null,lastSyncedSnapshot="",syncingCloud=false,syncPending=false;const activeUsageSessions={};
 let currentUser=null;
 const syncSnapshot=s=>JSON.stringify({theme:s.theme,lang:s.lang,sound:s.sound,profile:s.profile,decks:s.decks,progress:s.progress,reading:s.reading,listening:s.listening,writing:s.writing,mocks:s.mocks});

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
  const avatar=typeof p.avatar_url==="string"&&/^https:\/\//i.test(p.avatar_url)
    ?`<img src="${escapeHtml(p.avatar_url)}" alt="">`
    :letter;
  return `<button class="profile-mini" data-nav="account"><div class="avatar">${avatar}</div><span><strong>${escapeHtml(p.username||"User")}</strong><small>${s.subscription?.status==="active"?"Pro · ":""}Cloud Sync</small></span></button>`;
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
  if(renderFrame){cancelAnimationFrame(renderFrame);renderFrame=0}
  const s=store.get();document.documentElement.dataset.theme=s.theme;document.documentElement.lang=s.lang==="zh"?"zh-CN":s.lang==="pt"?"pt-BR":s.lang;
  let html;
  if(route==="landing"&&!s.user)html=renderLanding(s.lang);
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
  mount(layout(html));bind();startExamTimer();
 }
 function mount(html){
  const next=document.createElement("template");
  next.innerHTML=html;
  localizePage(next.content,store.get().lang);
  root.replaceChildren(next.content);
 }

 function toast(message){
  modalHtml=modal("Jumsup",`<p class="modal-desc">${escapeHtml(message)}</p>`,`<button class="btn btn-primary" data-action="close-modal">ตกลง</button>`);render();
 }

 function proPopup(title,description){
  modalHtml=modal(title,`<p class="modal-desc">${escapeHtml(description)}</p><div class="modal-note">อัปเกรดเป็น Jumsup Pro เพื่อใช้งานต่อได้ทันที</div>`,`<button class="btn" data-action="close-modal">ไว้ก่อน</button><button class="btn btn-primary" data-nav="pricing">ดู Jumsup Pro</button>`);render();
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
   lastSyncedSnapshot=syncSnapshot(store.get());await refreshCommunity();
  }catch(e){console.error(e);store.set({syncing:false,user,backend:true})}
  hydrating=false;
 }

 async function refreshCommunity(){
  if(!currentUser||!backendEnabled){store.set({community:buildDemoCommunity(store.get())});return}
  try{
   const remote=await loadCommunity(communityQuery,communityTab),official=buildDemoCommunity(store.get()).filter(item=>item.official&&(communityTab==="vocab"?item.type==="vocab":item.type==="skill"));
   const items=[...official,...remote.filter(item=>!official.some(seed=>seed.id===item.id))];
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
  syncTimer=setTimeout(()=>{
   const run=async()=>{const snapshot=syncSnapshot(store.get());if(snapshot===lastSyncedSnapshot)return;if(syncingCloud){syncPending=true;return}syncingCloud=true;
   try{await pushCloudState(currentUser,store.get());lastSyncedSnapshot=snapshot}
   catch(e){console.error("Sync failed",e)}finally{syncingCloud=false;if(syncPending){syncPending=false;scheduleSync()}}
   };
   if("requestIdleCallback" in window)requestIdleCallback(run,{timeout:2000});else setTimeout(run,0);
  },900);
 }

 function bind(){
  root.querySelectorAll("[data-nav]").forEach(el=>el.onclick=()=>{route=el.dataset.nav;if(route==="pricing"&&store.get().user){route="account";accountTab="plan"}selected=null;study=null;if(route==="community")refreshCommunity();render()});
  root.querySelectorAll("[data-account-tab]").forEach(el=>el.onclick=()=>{accountTab=el.dataset.accountTab;route="account";render()});
  root.querySelectorAll("[data-account-back]").forEach(el=>el.onclick=()=>{accountTab="menu";render()});
  root.querySelectorAll("[data-action]").forEach(el=>el.onclick=e=>handleAction(el.dataset.action,el,e));
  root.querySelectorAll("[data-lang]").forEach(el=>el.onclick=()=>{store.set({lang:el.dataset.lang});scheduleSync()});
  const uiLanguage=root.querySelector("#uiLanguage");if(uiLanguage)uiLanguage.onchange=()=>{store.set({lang:uiLanguage.value});scheduleSync()};
  root.querySelectorAll("[data-theme-choice]").forEach(el=>el.onclick=()=>store.set({theme:el.dataset.themeChoice}));
  const st=root.querySelector("#soundToggle");if(st)st.onchange=()=>store.set({sound:st.checked});
  const communitySort=root.querySelector("#communitySort");if(communitySort)communitySort.onchange=()=>store.set({communitySort:communitySort.value});
  root.querySelectorAll("[data-community-tab]").forEach(el=>el.onclick=async()=>{communityTab=el.dataset.communityTab;await refreshCommunity();render()});
  root.querySelectorAll(".choice").forEach(el=>el.onclick=()=>{
   const host=el.closest(".question");
   host.querySelectorAll(".choice").forEach(x=>x.classList.remove("selected","correct","wrong"));
   host.querySelectorAll(".choice").forEach(x=>x.setAttribute("aria-pressed","false"));
   el.classList.add("selected");el.setAttribute("aria-pressed","true");
   host.dataset.answered="true";if(practiceAttempt)practiceAttempt.answers[el.dataset.question]=Number(el.dataset.answer);
   const answered=root.querySelectorAll('.question[data-answered="true"]').length,total=root.querySelectorAll(".question").length,count=root.querySelector("#answeredCount");
   if(count)count.textContent=`${answered}/${total}${route==="mock-play"?" ตัวอย่าง":""}`;
   const number=Number((host.id.match(/(\d+)$/)||[])[1]);if(number)root.querySelector(`[data-jump="mock-${number}"]`)?.classList.add("done");
  });
  root.querySelectorAll("[data-jump]").forEach(el=>el.onclick=()=>document.getElementById(el.dataset.jump)?.scrollIntoView({behavior:"smooth",block:"start"}));
  root.querySelectorAll(".read-word").forEach(el=>el.onclick=()=>openWord(el));
  const avatar=root.querySelector("#avatarFile");if(avatar)avatar.onchange=async()=>{if(!avatar.files?.[0]||!currentUser)return;try{const url=await uploadAvatar(currentUser,avatar.files[0]);store.set({profile:{...store.get().profile,avatar_url:url}})}catch(e){toast(e.message)}};
  const processImportFile=async file=>{if(!file)return;const error=root.querySelector("#importFileError");if(!file.name.toLowerCase().endsWith(".csv")){error.textContent="ตอนนี้รองรับ CSV เท่านั้น กรุณาดาวน์โหลดเทมเพลต CSV";error.classList.remove("hidden");return}try{const parsed=parseCsv(await file.text());if(!parsed.headers.length||!parsed.rows.length)throw new Error("ไฟล์ไม่มีข้อมูล");const limit=isPro(store.get())?PRO_LIMITS.importRows:100;if(parsed.rows.length>limit)throw new Error(`แพ็กเกจปัจจุบันนำเข้าได้สูงสุด ${limit.toLocaleString()} แถวต่อครั้ง`);bulkImportState={...bulkImportState,fileName:file.name,...parsed,step:2};openBulkImport()}catch(err){error.textContent=err.message||"อ่านไฟล์ไม่สำเร็จ";error.classList.remove("hidden")}};
  const importFile=root.querySelector("#bulkImportFile");if(importFile)importFile.onchange=()=>processImportFile(importFile.files?.[0]);
  const drop=root.querySelector("[data-import-drop]");if(drop){for(const event of ["dragenter","dragover"])drop.addEventListener(event,e=>{e.preventDefault();drop.classList.add("drag-active")});for(const event of ["dragleave","drop"])drop.addEventListener(event,e=>{e.preventDefault();drop.classList.remove("drag-active")});drop.addEventListener("drop",e=>processImportFile(e.dataTransfer?.files?.[0]))}
  bindDeckEditor();bindPracticeEditor();
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
   if(a==="start-deck"){const d=s.decks.find(x=>x.id===el.dataset.id);if(el.dataset.mode!=="flash"){const game=el.dataset.mode==="match"?"match":"crossword",p=s.progress[d.id]||{mastered:[]},m=masteredWords(s,d.id,p),minimum=game==="match"?4:3;if(m.length<minimum)return openGame(game,d,m);if(currentUser&&backendEnabled){try{await startDailyFeature(game,`${game}:${crypto.randomUUID()}`,{content_id:d.id})}catch(err){if(String(err.message).includes("DAILY_LIMIT_REACHED"))return proPopup(`${game==="match"?"Match":"Crossword"} ครบโควต้าแล้ว`,game==="match"?"Free เล่น Match ได้ 10 รอบต่อวัน":"Free เล่น Crossword ได้ 3 รอบต่อวัน");throw err}}return openGame(game,d,m)}study={deckId:d.id,poolSize:Math.min(s.flashSettings.loopSize,d.words.length),mastered:[...((s.progress[d.id]||{}).mastered||[])],cursor:0};route="study";render()}
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
    let endsAt=Date.now()+Math.max(1,Number(selected.minutes||10))*60000;
    if(currentUser&&backendEnabled&&["reading","listening","writing","mock"].includes(kind)){
      const sessionKey=activeUsageSessions[kind]||`${kind}:${selected.id}:${crypto.randomUUID()}`;
      try{const usage=await startDailyFeature(kind,sessionKey,{content_id:selected.id,minutes:Number(selected.minutes||10)});activeUsageSessions[kind]=usage.existing_session_key||sessionKey;endsAt=usage.ends_at?new Date(usage.ends_at).getTime():endsAt}
      catch(err){if(String(err.message).includes("DAILY_LIMIT_REACHED")){const seconds=Math.max(0,Number(err.details?.remaining_seconds||0)),days=Math.floor(seconds/86400),hours=Math.floor(seconds%86400/3600),minutes=Math.max(1,Math.ceil(seconds%3600/60)),wait=days?`${days} วัน ${hours} ชั่วโมง`:hours?`${hours} ชั่วโมง ${minutes} นาที`:`${minutes} นาที`;return proPopup("ใช้สิทธิ์ทดลองครบ 3 ครั้งแล้ว",`แพ็กเกจ Free จะปลดล็อก ${kind.toUpperCase()} อีกครั้งใน ${wait} หรืออัปเกรดเป็น Pro เพื่อใช้งานได้ทันที`) }throw err}
    }
    selected={...selected,_endsAt:endsAt};practiceKind=kind;const rawQuestions=selected.sections?.length?selected.sections.flatMap(section=>section.questions||[]):(selected.questions||[{id:selected.id,prompt:selected.question||"Question",choices:selected.choices||[],answer:selected.answer}]);const questions=rawQuestions.map((q,i)=>({...q,_attemptKey:q.id||(kind==="mock"?`mock-${q.number||i+1}`:`${kind}-${i+1}`)}));practiceAttempt={answers:{},questions,startedAt:Date.now(),endsAt};
    route=kind==="reading"?"reading-play":kind==="listening"?"listening-play":kind==="writing"?"writing-play":"mock-play";render()
   }
   if(a==="speak-script")speak(el.dataset.script,root.querySelector("#listenAccent")?.value||"en-US",root.querySelector("#listenRate")?.value||.9);
   if(a==="pause-speech")speechSynthesis?.pause();
   if(a==="resume-speech")speechSynthesis?.resume();
   if(a==="stop-speech")speechSynthesis?.cancel();
   if(a==="submit-practice"){if(!practiceAttempt)return;clearInterval(examTimer);examTimer=null;const key=activeUsageSessions[practiceKind];if(key&&backendEnabled)api("/api/usage/save",{method:"POST",body:JSON.stringify({session_key:key,state:{content_id:selected?.id,answers:practiceAttempt.answers},complete:true})}).catch(console.error);route="practice-result";return render()}
   if(a==="retry-practice"){route=practiceKind||"home";practiceAttempt=null;selected=null;return proPopup("เริ่มรอบใหม่","เลือกรอบใหม่จากหน้ารายการ ระบบจะตรวจสิทธิ์ทดลองหรือเวลาพักให้อัตโนมัติ")}
   if(a==="back-practice-list"){route=practiceKind||"home";selected=null;practiceAttempt=null;return render()}
   if(a==="community-search"){communityQuery=root.querySelector("#communitySearch").value;await refreshCommunity();render()}
   if(a==="community-refresh"){await refreshCommunity();render()}
   if(a==="import-community"){
   const item=s.community.find(x=>x.id===el.dataset.id);
   if(!backendEnabled){localCommunityImport(item);return toast("นำเข้าเป็นสำเนาใหม่ในโหมดทดสอบแล้ว")}
   if(!currentUser)return toast("กรุณาเข้าสู่ระบบก่อนนำเข้า Community");
   if(item?.official){localCommunityImport(item);scheduleSync();return toast("นำเข้าชุดทางการของ Jumsup แล้ว")}
    try{await importCommunityItem(currentUser,item)}catch(err){if(String(err.message).includes("COMMUNITY_SET_LIMIT_REACHED"))return proPopup("เก็บชุด Community ครบ 3 ชุดแล้ว","ลบชุด Community เดิมก่อนเลือกชุดใหม่ หรืออัปเกรดเป็น Pro เพื่อเก็บได้ไม่จำกัด");throw err}await hydrateFromCloud(currentUser);return toast("นำเข้าเป็นสำเนาใหม่แล้ว");
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
   if(a==="checkout-monthly"||a==="checkout-yearly"){const d=await api("/api/stripe/create-checkout",{method:"POST",body:JSON.stringify({plan:a==="checkout-yearly"?"yearly":"monthly",currency:store.get().lang==="th"?"thb":"usd"})});location.href=d.url}
   if(a==="billing-portal"){const d=await api("/api/stripe/create-portal",{method:"POST",body:"{}"});location.href=d.url}
   if(a==="redeem-gift"){const code=root.querySelector("#giftCode")?.value;await api("/api/gift/redeem",{method:"POST",body:JSON.stringify({code})});await hydrateFromCloud(currentUser);return toast("แลก Gift Code สำเร็จ")}
   if(a==="claim-referral"){const code=root.querySelector("#referralCode")?.value;await api("/api/referral/claim",{method:"POST",body:JSON.stringify({code})});await hydrateFromCloud(currentUser);return toast("ใช้ Referral สำเร็จ")}
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
 function openFlashSettings(){
  const s=store.get(),deck=study?s.decks.find(d=>d.id===study.deckId):null,max=Math.max(1,deck?.words.length||1);
  modalHtml=modal("ตั้งค่า Flashcard",`<div class="flash-study-settings-modal"><div class="flash-setting-section"><div class="flash-setting-heading"><div><b>จำนวนคำใน Loop</b><small>กำหนดจำนวนคำที่จะวนซ้ำในรอบนี้</small></div></div><div class="loop-input-row"><input id="studyLoopSize" type="number" min="1" max="${max}" value="${Math.min(study?.poolSize||s.flashSettings.loopSize,max)}"></div></div><div class="flash-setting-list"><label class="flash-setting-row"><span><b>อ่านเสียงอัตโนมัติ</b></span><span class="switch"><input id="studyAutoSpeak" type="checkbox" ${s.flashSettings.autoSpeak?"checked":""}><span></span></span></label><label class="flash-setting-row"><span><b>แสดงคำแปลทันที</b></span><span class="switch"><input id="studyShowMeaning" type="checkbox" ${s.flashSettings.showMeaning?"checked":""}><span></span></span></label><label class="flash-setting-row"><span><b>สุ่มลำดับคำ</b></span><span class="switch"><input id="studyShuffle" type="checkbox" ${s.flashSettings.shuffle?"checked":""}><span></span></span></label></div></div>`,`<button class="btn" data-action="close-modal">ยกเลิก</button><button class="btn btn-primary" data-action="save-study-settings">บันทึก</button>`);render()
 }
 function saveFlashSettings(){
  if(!study)return;const s=store.get(),deck=s.decks.find(d=>d.id===study.deckId),max=Math.max(1,deck.words.length);
  const settings={loopSize:Math.max(1,Math.min(max,Number(root.querySelector("#studyLoopSize").value)||1)),autoSpeak:root.querySelector("#studyAutoSpeak").checked,showMeaning:root.querySelector("#studyShowMeaning").checked,shuffle:root.querySelector("#studyShuffle").checked};
  study.poolSize=settings.loopSize;study.mastered=study.mastered.filter(i=>i<settings.loopSize);study.cursor=0;modalHtml="";store.set({flashSettings:settings});
 }
 function deckWordRow(word={},index=0){return `<article class="deck-word-row" data-deck-word><span class="deck-word-number">${index+1}</span><div class="deck-word-fields"><label>คำหรือวลี<input data-deck-field="w" value="${escapeHtml(word.w||"")}" placeholder="เช่น analyze"></label><label>คำอ่าน / การเน้นเสียง<input data-deck-field="p" value="${escapeHtml(word.p||word.stress||"")}" placeholder="เช่น AN-a-lyze (ไม่บังคับ)"></label><label>ความหมาย<input data-deck-field="m" value="${escapeHtml(word.m||"")}" placeholder="เช่น วิเคราะห์"></label><label class="deck-example">ประโยคตัวอย่าง<input data-deck-field="e" value="${escapeHtml(word.e||"")}" placeholder="ไม่บังคับ"></label></div><div class="deck-word-actions"><button type="button" class="btn" data-deck-copy>ทำสำเนา</button><button type="button" class="btn" data-deck-remove>ลบ</button></div></article>`}
 function renumberDeckWords(){root.querySelectorAll("[data-deck-word]").forEach((row,i)=>row.querySelector(".deck-word-number").textContent=i+1)}
 function bindDeckEditor(){const list=root.querySelector("#deckWords");if(!list)return;const add=word=>{list.insertAdjacentHTML("beforeend",deckWordRow(word,list.children.length));renumberDeckWords();list.lastElementChild?.scrollIntoView({behavior:"smooth",block:"nearest"})};root.querySelector("[data-deck-add]")?.addEventListener("click",()=>add({}));list.addEventListener("click",e=>{const row=e.target.closest("[data-deck-word]");if(!row)return;if(e.target.closest("[data-deck-remove]")){if(list.children.length>1)row.remove();else row.querySelectorAll("input").forEach(x=>x.value="");renumberDeckWords()}if(e.target.closest("[data-deck-copy]")){const word=Object.fromEntries([...row.querySelectorAll("[data-deck-field]")].map(x=>[x.dataset.deckField,x.value]));row.insertAdjacentHTML("afterend",deckWordRow(word,0));renumberDeckWords()}})}
 function openDeckModal(id){
  const s=store.get(),d=id?s.decks.find(x=>x.id===id):null;
  const words=d?.words?.length?d.words:[{}];
  modalHtml=modal(d?"แก้ไขชุดคำศัพท์":"สร้างชุดคำศัพท์",`<div class="modal-form deck-editor"><div class="modal-two"><label>ชื่อชุด<input id="modalName" value="${escapeHtml(d?.name||"")}" placeholder="เช่น คำศัพท์ A-Level บทที่ 1"></label><label>การมองเห็น<select id="modalVisibility"><option value="private" ${d?.visibility!=="public"?"selected":""}>ส่วนตัว</option><option value="public" ${d?.visibility==="public"?"selected":""}>สาธารณะ</option></select></label></div><div class="deck-editor-heading"><div><h3>คำศัพท์ในชุด</h3><p>เพิ่มคำ คำอ่าน ความหมาย และตัวอย่างได้โดยไม่ต้องอัปโหลดไฟล์</p></div><button class="btn" type="button" data-deck-add>+ เพิ่มคำศัพท์</button></div><div id="deckWords" class="deck-word-list">${words.map(deckWordRow).join("")}</div></div>`,`<button class="btn" data-action="close-modal">ยกเลิก</button><button class="btn btn-primary" data-action="save-deck" data-id="${id||""}">บันทึกชุด</button>`);render()
 }
 async function saveDeck(id){
  const name=root.querySelector("#modalName").value.trim(),visibility=root.querySelector("#modalVisibility").value;if(!name)return toast("กรุณาตั้งชื่อชุด");
  const words=[...root.querySelectorAll("[data-deck-word]")].map(row=>Object.fromEntries([...row.querySelectorAll("[data-deck-field]")].map(x=>[x.dataset.deckField,x.value.trim()]))).filter(x=>x.w||x.m||x.p||x.e);
  if(words.some(x=>!x.w))return toast("กรุณากรอกคำศัพท์ให้ครบทุกรายการ");
  const before=store.get();if(!id&&!isPro(before)&&(before.decks||[]).filter(d=>(d.sourceType||"own")==="own").length>=FREE_LIMITS.privateVocab)return proPopup("สร้าง Flashcard ครบ 3 ชุดแล้ว","Free สร้างชุดของตัวเองได้สูงสุด 3 ชุด อัปเกรดเป็น Pro เพื่อสร้างได้ไม่จำกัด");
  const wordLimit=isPro(before)?PRO_LIMITS.wordsPerDeck:FREE_LIMITS.wordsPerDeck;if(words.length>wordLimit)return proPopup("คำศัพท์เกินจำนวนที่แพ็กเกจรองรับ",`แพ็กเกจปัจจุบันบันทึกได้สูงสุด ${wordLimit.toLocaleString()} คำต่อชุด`);
  const creator=store.get().profile?.username||"guest",newId=id||`deck-${crypto.randomUUID()}`;
  const localSave=(v)=>store.update(s=>({...s,decks:id?s.decks.map(d=>d.id===id?{...d,name,visibility:v,words}:d):[...s.decks,{id:newId,name,visibility:v,sourceType:"own",creator,words}]}));
  if(visibility==="private"&&!canPrivateLocally(store.get(),"vocab",id)){
    pendingPublicSave=async()=>{if(currentUser&&backendEnabled)await api("/api/content/publish-confirmed",{method:"POST",body:JSON.stringify({kind:"vocab",id:newId,title:name,confirm_public:true})});localSave("public")};
    modalHtml=modal("โควตาชุดส่วนตัวเต็ม",`<p class="modal-desc">Free เก็บ Flashcard ส่วนตัวได้ 3 ชุด ชุดนี้จะเป็น Public เฉพาะเมื่อคุณกดยืนยันเผยแพร่</p>`,`<button class="btn" data-action="close-modal">ยกเลิก</button><button class="btn btn-primary" data-action="confirm-public-save">ยืนยันเผยแพร่</button>`);return render()
  }
  if(currentUser&&backendEnabled)await api("/api/content/save",{method:"POST",body:JSON.stringify({kind:"vocab",id:newId,title:name,visibility,payload:{words}})});
  localSave(visibility);modalHtml="";render()
 }
 function practiceQuestionEditor(q={},index=0){const choices=[...(q.choices||[]),"","","",""].slice(0,4);return `<article class="practice-question-editor" data-practice-question><header><b>คำถาม ${index+1}</b><span><button type="button" class="btn" data-question-copy>ทำสำเนา</button><button type="button" class="btn" data-question-remove>ลบ</button></span></header><label>โจทย์<input data-question-field="prompt" value="${escapeHtml(q.prompt||q.question||"")}" placeholder="พิมพ์คำถาม"></label><div class="practice-choice-editor">${choices.map((choice,i)=>`<label><span>${"ABCD"[i]}</span><input data-question-choice="${i}" value="${escapeHtml(choice)}" placeholder="ตัวเลือก ${"ABCD"[i]}"></label>`).join("")}</div><div class="modal-two"><label>คำตอบที่ถูก<select data-question-field="answer">${choices.map((_,i)=>`<option value="${i}" ${Number(q.answer)===i?"selected":""}>${"ABCD"[i]}</option>`).join("")}</select></label><label>คำอธิบายคำตอบ<input data-question-field="explanation" value="${escapeHtml(q.explanation||"")}" placeholder="ไม่บังคับ"></label></div></article>`}
 function practiceSectionEditor(kind,section={},index=0){const content=section.text||section.script||section.passage||section.prompt||section.context||"",questions=section.questions?.length?section.questions:[{}];return `<section class="practice-section-editor" data-practice-section><header><div><span class="section-number">SECTION ${index+1}</span><input data-section-field="title" value="${escapeHtml(section.title||"")}" placeholder="ชื่อ Section"></div><span><button type="button" class="btn" data-section-copy>ทำสำเนา</button><button type="button" class="btn" data-section-remove>ลบ</button></span></header><label>${kind==="reading"?"บทความ":kind==="listening"?"บทสนทนา / Transcript":kind==="writing"?"Passage / คำสั่ง":"เนื้อหาประกอบ"}<textarea data-section-field="content" rows="5" placeholder="วางเนื้อหาของ Section นี้">${escapeHtml(content)}</textarea></label><div class="practice-question-list">${questions.map(practiceQuestionEditor).join("")}</div><div class="section-add-row"><button type="button" class="btn" data-question-add>+ เพิ่มคำถาม</button><button type="button" class="btn btn-primary" data-section-add-after>+ เพิ่ม Section ถัดไป</button></div></section>`}
 function renumberPracticeEditor(){root.querySelectorAll("[data-practice-section]").forEach((section,si)=>{section.querySelector(".section-number").textContent=`SECTION ${si+1}`;section.querySelectorAll("[data-practice-question]").forEach((q,qi)=>q.querySelector("header b").textContent=`คำถาม ${qi+1}`)})}
 function bindPracticeEditor(){const sections=root.querySelector("#practiceSections");if(!sections)return;const addSection=(after=null,data={})=>{const html=practiceSectionEditor(sections.dataset.kind,data,0);if(after)after.insertAdjacentHTML("afterend",html);else sections.insertAdjacentHTML("beforeend",html);renumberPracticeEditor()};root.querySelector("[data-section-add]")?.addEventListener("click",()=>addSection());sections.addEventListener("click",e=>{const section=e.target.closest("[data-practice-section]"),question=e.target.closest("[data-practice-question]");if(!section)return;if(e.target.closest("[data-section-add-after]"))addSection(section);if(e.target.closest("[data-section-remove]")){if(sections.children.length>1)section.remove();renumberPracticeEditor()}if(e.target.closest("[data-section-copy]")){addSection(section,readPracticeSection(section,sections.dataset.kind))}if(e.target.closest("[data-question-add]")){section.querySelector(".practice-question-list").insertAdjacentHTML("beforeend",practiceQuestionEditor({},0));renumberPracticeEditor()}if(e.target.closest("[data-question-remove]")&&question){const list=question.parentElement;if(list.children.length>1)question.remove();renumberPracticeEditor()}if(e.target.closest("[data-question-copy]")&&question){question.insertAdjacentHTML("afterend",practiceQuestionEditor(readPracticeQuestion(question),0));renumberPracticeEditor()}})}
 function readPracticeQuestion(row){return{prompt:row.querySelector('[data-question-field="prompt"]')?.value.trim()||"",choices:[...row.querySelectorAll("[data-question-choice]")].map(x=>x.value.trim()),answer:Number(row.querySelector('[data-question-field="answer"]')?.value||0),explanation:row.querySelector('[data-question-field="explanation"]')?.value.trim()||""}}
 function readPracticeSection(section,kind){const content=section.querySelector('[data-section-field="content"]')?.value.trim()||"",out={title:section.querySelector('[data-section-field="title"]')?.value.trim()||"",questions:[...section.querySelectorAll("[data-practice-question]")].map(readPracticeQuestion)};if(kind==="reading")out.text=content;else if(kind==="listening")out.script=content;else if(kind==="writing")out.passage=content;else out.context=content;return out}
 function openPracticeModal(kind,id){
  const s=store.get(),arr=kind==="mock"?s.mocks:s[kind],x=id?arr.find(v=>v.id===id):null;
  let sections=x?.sections?.length?x.sections:null;if(!sections){const content=kind==="reading"?x?.text:kind==="listening"?x?.script:kind==="writing"?(x?.passage||x?.prompt):x?.context;sections=[{title:x?.category||x?.type||"",text:kind==="reading"?content:"",script:kind==="listening"?content:"",passage:kind==="writing"?content:"",context:kind==="mock"?content:"",questions:x?.questions||[{}]}]}
  modalHtml=modal(x?`แก้ไข ${kind}`:`สร้าง ${kind}`,`<div class="modal-form practice-editor"><div class="modal-two"><label>ชื่อชุด<input id="modalName" value="${escapeHtml(x?.title||"")}" placeholder="ชื่อแบบฝึก"></label><label>การมองเห็น<select id="modalVisibility"><option value="private" ${x?.visibility!=="public"?"selected":""}>ส่วนตัว</option><option value="public" ${x?.visibility==="public"?"selected":""}>สาธารณะ</option></select></label></div><div class="modal-two"><label>เวลารวม (นาที)<input id="practiceMinutes" type="number" min="1" max="240" value="${Number(x?.minutes||10)}"></label><label>หมวด/ประเภท<input id="practiceCategory" value="${escapeHtml(x?.category||x?.type||"")}" placeholder="ไม่บังคับ"></label></div><div class="practice-builder-heading"><div><h3>เนื้อหาและคำถาม</h3><p>แยกบทความหรือบทสนทนาแต่ละชุดเป็น Section และเพิ่มคำถามในแต่ละ Section</p></div><button type="button" class="btn btn-primary" data-section-add>+ เพิ่ม Section</button></div><div id="practiceSections" data-kind="${kind}">${sections.map((section,i)=>practiceSectionEditor(kind,section,i)).join("")}</div></div>`,`<button class="btn" data-action="close-modal">ยกเลิก</button><button class="btn btn-primary" data-action="save-practice" data-kind="${kind}" data-id="${id||""}">บันทึกชุดฝึก</button>`);render()
 }
 async function savePractice(kind,id){
  const title=root.querySelector("#modalName").value.trim(),visibility=root.querySelector("#modalVisibility").value;if(!title)return;
  const key=kind==="mock"?"mocks":kind,creator=store.get().profile?.username||"guest",newId=id||`${kind}-${crypto.randomUUID()}`;
  const cur=(store.get()[key]||[]).find(x=>x.id===id),sections=[...root.querySelectorAll("[data-practice-section]")].map(x=>readPracticeSection(x,kind));
  if(!sections.length)return toast("กรุณาเพิ่มอย่างน้อย 1 Section");if(sections.some(x=>x.questions.some(q=>!q.prompt||q.choices.filter(Boolean).length<2)))return toast("กรุณากรอกโจทย์และตัวเลือกอย่างน้อย 2 ตัวเลือกให้ครบ");
  const payload=cur?Object.fromEntries(Object.entries(cur).filter(([k])=>!["id","title","visibility","creator"].includes(k))):{};
  payload.minutes=Math.max(1,Number(root.querySelector("#practiceMinutes")?.value)||10);
  payload.sections=sections;payload.itemCount=sections.reduce((n,section)=>n+section.questions.length,0);payload.questions=sections.flatMap(x=>x.questions);const category=root.querySelector("#practiceCategory")?.value.trim()||"";if(kind==="reading"){payload.text=sections[0].text;payload.category=category||"General article"}if(kind==="listening"){payload.script=sections[0].script;payload.type=category||"Conversation";payload.accent=payload.accent||"en-US"}if(kind==="writing"){payload.passage=sections[0].passage;payload.type=category||"Text Completion"}if(kind==="mock")payload.questions=payload.itemCount;
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

 function showWordPopover(anchor,word){
  root.querySelector(".word-popover")?.remove();
  const rect=anchor.getBoundingClientRect(),width=Math.min(320,window.innerWidth-24);
  const left=Math.max(12,Math.min(window.innerWidth-width-12,rect.left+rect.width/2-width/2));
  const top=Math.max(12,Math.min(window.innerHeight-205,rect.bottom+10));
  const box=document.createElement("aside");
  box.className="word-popover";box.setAttribute("role","dialog");box.setAttribute("aria-label",`คำแปล ${word}`);
  box.style.setProperty("--word-x",`${left}px`);box.style.setProperty("--word-y",`${top}px`);box.style.setProperty("--word-width",`${width}px`);
  const decks=store.get().decks||[];
  box.innerHTML=`<button class="word-popover-close" aria-label="ปิด">×</button><span class="word-popover-label">READING WORD</span><strong>${escapeHtml(word)}</strong><p data-word-meaning>กำลังค้นหาคำแปล…</p><label class="word-deck-picker"><span>บันทึกลงชุด</span><select data-word-deck>${decks.map(d=>`<option value="${escapeHtml(d.id)}">${escapeHtml(d.name)}</option>`).join("")}</select></label><button class="word-popover-add" disabled>+ เพิ่มเข้า Flashcard</button>`;
  root.append(box);box.querySelector(".word-popover-close").onclick=()=>box.remove();
  return box;
 }
 function addReadingWord(word,meaning,anchor,box){
  const deckId=box.querySelector("[data-word-deck]")?.value,s0=store.get(),existing0=s0.decks.find(d=>d.id===deckId)||s0.decks[0],limit=isPro(s0)?PRO_LIMITS.wordsPerDeck:FREE_LIMITS.wordsPerDeck;
  if(existing0&&(existing0.words?.length||0)>=limit){box.remove();return proPopup("คำศัพท์ในชุดเต็มแล้ว",`แพ็กเกจปัจจุบันเก็บได้สูงสุด ${limit.toLocaleString()} คำต่อชุด`)}
  store.update(s=>{
   const existing=s.decks.find(d=>d.id===deckId)||s.decks[0];
   if(!existing)return s;
   if(existing.words.some(x=>x.w.toLowerCase()===word.toLowerCase()))return s;
   return {...s,decks:s.decks.map(d=>d.id===existing.id?{...d,words:[...d.words,{w:word,m:meaning||"",p:"",e:""}]}:d)};
  });
  anchor.classList.add("saved");scheduleSync();
  const button=box.querySelector(".word-popover-add");button.textContent="เพิ่มแล้ว ✓";button.disabled=true;
  setTimeout(()=>box.remove(),650);
 }
 async function openWord(anchor){
  const word=anchor.dataset.word,box=showWordPopover(anchor,word),meaningEl=box.querySelector("[data-word-meaning]"),add=box.querySelector(".word-popover-add");
  const local=store.get().decks.flatMap(d=>d.words).find(w=>w.w===word)?.m;
  if(!currentUser){meaningEl.textContent="เข้าสู่ระบบเพื่อแปลและบันทึกคำศัพท์";return}
  try{
   if(local&&backendEnabled)api("/api/dictionary/suggest",{method:"POST",body:JSON.stringify({word,meaning:local,target:"th"})}).catch(()=>{});
   const target=store.get().lang==="en"?"th":store.get().lang;
   const d=await api("/api/translate",{method:"POST",body:JSON.stringify({text:word,target,local_translation:local||undefined})});
   const meaning=d.translation||"";meaningEl.textContent=meaning||"ยังไม่พบคำแปล — เพิ่มคำไว้แล้วเติมความหมายภายหลังได้";
   add.disabled=false;add.onclick=()=>addReadingWord(word,meaning,anchor,box);
  }catch(e){meaningEl.textContent=e.message||"แปลไม่สำเร็จ";add.disabled=false;add.onclick=()=>addReadingWord(word,"",anchor,box)}
 }
 function openGame(kind,deck,words){
  if(kind==="match"){
   if(words.length<4){modalHtml=modal("Match","ต้องจำศัพท์อย่างน้อย 4 คำก่อนเล่น");return render()}
   const pairs=words.slice(0,6),tiles=pairs.flatMap((w,i)=>[{pair:i,text:w.w},{pair:i,text:w.m}]).sort(()=>Math.random()-.5);
   mount(layout(`<div class="content-header"><div><p class="content-eyebrow">VOCABULARY GAME</p><h1 class="content-title">Match · ${escapeHtml(deck.name)}</h1><p class="content-desc">จับคู่คำศัพท์กับความหมายให้ครบโดยใช้จำนวนครั้งให้น้อยที่สุด</p></div><span class="content-mode">Mastered words</span></div><div class="match-toolbar"><div>เวลา <strong id="matchTime">0:00</strong></div><div>ครั้ง <strong id="matchMoves">0</strong></div><div>คู่ <strong id="matchPairs">0/${pairs.length}</strong></div></div><div class="match-board quizlet-match">${tiles.map(t=>`<button class="match-tile" data-pair="${t.pair}">${escapeHtml(t.text)}</button>`).join("")}</div>`));bind();let first=null,moves=0,matched=0,seconds=0;const clock=setInterval(()=>{seconds++;const el=root.querySelector("#matchTime");if(el)el.textContent=`${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,"0")}`;else clearInterval(clock)},1000);root.querySelectorAll(".match-tile").forEach(t=>t.onclick=()=>{if(t.classList.contains("matched"))return;if(!first){first=t;t.classList.add("selected");return}if(first===t)return;moves++;root.querySelector("#matchMoves").textContent=moves;if(first.dataset.pair===t.dataset.pair){first.classList.add("matched");t.classList.add("matched");matched++;root.querySelector("#matchPairs").textContent=`${matched}/${pairs.length}`;first=null;if(matched===pairs.length){clearInterval(clock);setTimeout(()=>toast(`จบ Match ใน ${seconds} วินาที · ${moves} ครั้ง`),250)}}else{const old=first;first=null;t.classList.add("wrong");setTimeout(()=>{old.classList.remove("selected");t.classList.remove("wrong")},350)}});return
  }
  if(words.length<3){modalHtml=modal("Crossword","ต้องจำศัพท์อย่างน้อย 3 คำก่อนเล่น");return render()}
  const selectedWords=words.filter(w=>/^[a-z]+$/i.test(w.w)).slice(0,5);mount(layout(`<div class="content-header"><div><p class="content-eyebrow">VOCABULARY GAME</p><h1 class="content-title">Crossword · ${escapeHtml(deck.name)}</h1><p class="content-desc">เติมคำจากคำใบ้โดยใช้เฉพาะคำที่จำแล้ว</p></div><span class="content-mode" id="crossTime">0:00</span></div><div class="crossword-layout"><div class="crossword-main">${selectedWords.map((w,wi)=>`<div class="cross-word-row"><b>${wi+1}</b><div class="cross-letter-row">${[...w.w].map(c=>`<input class="cross-cell" maxlength="1" data-a="${escapeHtml(c.toUpperCase())}" aria-label="คำที่ ${wi+1}">`).join("")}</div></div>`).join("")}<div class="actions"><button class="btn btn-primary" id="checkCross">ตรวจคำตอบ</button><button class="btn" id="clearCross">ล้างคำตอบ</button></div></div><aside class="clue-panel"><h3>คำใบ้</h3>${selectedWords.map((w,i)=>`<div class="clue-item"><b>${i+1}. ${escapeHtml(w.m)}</b><small>${w.w.length} ตัวอักษร</small></div>`).join("")}</aside></div>`));bind();let seconds=0;const clock=setInterval(()=>{seconds++;const el=root.querySelector("#crossTime");if(el)el.textContent=`${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,"0")}`;else clearInterval(clock)},1000);root.querySelectorAll(".cross-cell").forEach((x,i,all)=>x.oninput=()=>{x.value=x.value.replace(/[^a-z]/gi,"").toUpperCase();if(x.value)all[i+1]?.focus()});root.querySelector("#clearCross").onclick=()=>root.querySelectorAll(".cross-cell").forEach(x=>{x.value="";x.classList.remove("wrong")});root.querySelector("#checkCross").onclick=()=>{const cells=[...root.querySelectorAll(".cross-cell")];cells.forEach(x=>x.classList.toggle("wrong",x.value.toUpperCase()!==x.dataset.a));if(cells.every(x=>x.value.toUpperCase()===x.dataset.a)){clearInterval(clock);toast(`ถูกทั้งหมด · ใช้เวลา ${seconds} วินาที`)}}
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
  const endsAt=Number(el.dataset.endsAt)||practiceAttempt?.endsAt||Date.now()+(Number(el.dataset.seconds)||0)*1000;
  const tick=()=>{const remaining=Math.max(0,Math.ceil((endsAt-Date.now())/1000)),m=Math.floor(remaining/60),s=remaining%60;el.textContent=`${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;el.parentElement?.classList.toggle("warning",remaining>0&&remaining<=300);if(!remaining){clearInterval(examTimer);examTimer=null;el.parentElement?.classList.add("expired");if(practiceAttempt){route="practice-result";render()}}};tick();if(examTimer===null&&endsAt>Date.now())examTimer=setInterval(tick,1000);
 }

 store.subscribe(()=>{scheduleSync();if(!renderFrame)renderFrame=requestAnimationFrame(()=>{renderFrame=0;render()})});

 if(backendEnabled){
  const session=await getSession();currentUser=session?.user||null;
  if(currentUser)await hydrateFromCloud(currentUser);else store.set({backend:true,user:null});
  onAuthChange(async session=>{currentUser=session?.user||null;if(currentUser)await hydrateFromCloud(currentUser);else store.set({user:null,profile:null,subscription:null,community:[],backend:true})});
 }else store.set({backend:false,user:null});
 render();
}

