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
  root.querySelectorAll("[data-lang]").forEach(el=>el.onclick=()=>{store.set({lang:el.dataset.lang});scheduleSync()});
  const uiLanguage=root.querySelector("#uiLanguage");if(uiLanguage)uiLanguage.onchange=()=>{store.set({lang:uiLanguage.value});scheduleSync()};
  root.querySelectorAll("[data-theme-choice]").forEach(el=>el.onclick=()=>store.set({theme:el.dataset.themeChoice}));
  const st=root.querySelector("#soundToggle");if(st)st.onchange=()=>store.set({sound:st.checked});
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
  root.querySelectorAll(".read-word").forEach(el=>el.onclick=()=>openWord(el));
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
   if(a==="start-deck"){const d=s.decks.find(x=>x.id===el.dataset.id);if(el.dataset.mode!=="flash"){const game=el.dataset.mode==="match"?"match":"crossword",p=s.progress[d.id]||{mastered:[]},m=masteredWords(s,d.id,p),minimum=game==="match"?4:3;if(m.length<minimum)return openGame(game,d,m);if(currentUser&&backendEnabled){try{await startDailyFeature(game,`${game}:${crypto.randomUUID()}`,{content_id:d.id})}catch(err){if(String(err.message).includes("DAILY_LIMIT_REACHED"))return proPopup(`${game==="match"?"Match":"Crossword"} ครบโควต้าแล้ว`,game==="match"?"Free เล่น Match ได้ 10 รอบต่อวัน":"Free เล่น Crossword ได้ 3 รอบต่อวัน");throw err}}return openGame(game,d,m)}study={deckId:d.id,poolSize:Math.min(s.flashSettings.loopSize,d.words.length),mastered:[...((s.progress[d.id]||{}).mastered||[])],cursor:0};route="study";render()}
   if(a==="know-word"){await markKnown(Number(el.dataset.index));study.cursor=0}
   if(a==="miss-word"){study.cursor++;render()}
   if(a==="speak")speak(el.dataset.word)
   if(a==="open-flash-settings")openFlashSettings()
   if(a==="save-study-settings")saveFlashSettings()
   if(a==="next-loop"){const d=s.decks.find(x=>x.id===study.deckId),…4595 tokens truncated…การมองเห็น<select id="modalVisibility"><option value="private" ${d?.visibility!=="public"?"selected":""}>ส่วนตัว</option><option value="public" ${d?.visibility==="public"?"selected":""}>สาธารณะ</option></select></label></div>`,`<button class="btn" data-action="close-modal">ยกเลิก</button><button class="btn btn-primary" data-action="save-deck" data-id="${id||""}">บันทึก</button>`);render()
 }
 async function saveDeck(id){
  const name=root.querySelector("#modalName").value.trim(),visibility=root.querySelector("#modalVisibility").value;if(!name)return;
  const before=store.get();if(!id&&!isPro(before)&&(before.decks||[]).filter(d=>(d.sourceType||"own")==="own").length>=FREE_LIMITS.privateVocab)return proPopup("สร้าง Flashcard ครบ 3 ชุดแล้ว","Free สร้างชุดของตัวเองได้สูงสุด 3 ชุด อัปเกรดเป็น Pro เพื่อสร้างได้ไม่จำกัด");
  const creator=store.get().profile?.username||"guest",newId=id||`deck-${crypto.randomUUID()}`;
  const localSave=(v)=>store.update(s=>({...s,decks:id?s.decks.map(d=>d.id===id?{...d,name,visibility:v}:d):[...s.decks,{id:newId,name,visibility:v,sourceType:"own",creator,words:[]}]}));
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

 function showWordPopover(anchor,word){
  root.querySelector(".word-popover")?.remove();
  const rect=anchor.getBoundingClientRect(),width=Math.min(320,window.innerWidth-24);
  const left=Math.max(12,Math.min(window.innerWidth-width-12,rect.left+rect.width/2-width/2));
  const top=Math.max(12,Math.min(window.innerHeight-205,rect.bottom+10));
  const box=document.createElement("aside");
  box.className="word-popover";box.setAttribute("role","dialog");box.setAttribute("aria-label",`คำแปล ${word}`);
  box.style.setProperty("--word-x",`${left}px`);box.style.setProperty("--word-y",`${top}px`);box.style.setProperty("--word-width",`${width}px`);
  box.innerHTML=`<button class="word-popover-close" aria-label="ปิด">×</button><span class="word-popover-label">READING WORD</span><strong>${escapeHtml(word)}</strong><p data-word-meaning>กำลังค้นหาคำแปล…</p><button class="word-popover-add" disabled>+ เพิ่มเข้า Flashcard</button>`;
  root.append(box);box.querySelector(".word-popover-close").onclick=()=>box.remove();
  return box;
 }
 function addReadingWord(word,meaning,anchor,box){
  const s0=store.get(),existing0=s0.decks.find(d=>d.id==="deck-2")||s0.decks[0],limit=isPro(s0)?PRO_LIMITS.wordsPerDeck:FREE_LIMITS.wordsPerDeck;
  if(existing0&&(existing0.words?.length||0)>=limit){box.remove();return proPopup("คำศัพท์ในชุดเต็มแล้ว",`แพ็กเกจปัจจุบันเก็บได้สูงสุด ${limit.toLocaleString()} คำต่อชุด`)}
  store.update(s=>{
   const existing=s.decks.find(d=>d.id==="deck-2")||s.decks[0];
   if(!existing)return {...s,decks:[...s.decks,{id:"deck-2",name:"Reading Words",visibility:"private",creator:s.profile?.username||"user",words:[{w:word,m:meaning||"",p:"",e:""}]}]};
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

 store.subscribe(()=>{render();scheduleSync()});

 if(backendEnabled){
  const session=await getSession();currentUser=session?.user||null;
  if(currentUser)await hydrateFromCloud(currentUser);else store.set({backend:true,user:null});
  onAuthChange(async session=>{currentUser=session?.user||null;if(currentUser)await hydrateFromCloud(currentUser);else store.set({user:null,profile:null,subscription:null,community:[],backend:true})});
 }else store.set({backend:false,user:null});
 render();
}
