import { store } from "../lib/store.js";
import { tr } from "../lib/i18n.js";
import { speak,todayKey,escapeHtml } from "../lib/utils.js";
import { backendEnabled,getSession,signInGoogle,signOut,onAuthChange } from "../lib/auth.js";
import { loadCloudState,pushCloudState,loadCommunity,importCommunityItem,uploadAvatar,toggleCommunityLike,saveCommunityReview,reportCommunityContent } from "../lib/cloud.js";
import { api } from "../lib/api.js";
import { canPrivateLocally,startDailyFeature } from "../lib/policy.js";
import { isPro } from "../lib/entitlements.js";
import { supabase } from "../lib/supabase.js";
import { renderHome } from "../features/home/home.js";
import { renderDecks,renderStudy,masteredWords } from "../features/flashcards/flashcards.js";
import { renderList,renderReading,renderListening,renderWriting,renderMock,renderPracticeResult } from "../features/practice/practice.js";
import { renderCommunity } from "../features/community/community.js";
import { renderProfile } from "../features/profile/profile.js";
import { modal } from "../components/modal.js";
import { importerModal,parseCsv,validateImport,downloadTemplate,buildImportedContent,TYPES } from "../features/importer/bulkImporter.js";

export async function createApp(root){
 let route="home",study=null,selected=null,practiceAttempt=null,practiceKind=null,communityTab="vocab",communityQuery="",modalHtml="",syncTimer=null,examTimer=null,renderFrame=null,hydrating=false;
 let pendingPublicSave=null,bulkImportState=null;const activeUsageSessions={};
 let currentUser=null;

 const nav=()=>[
  ["flash","Aa","flash"],["match","↔","match"],["crossword","+","cross"],
  ["home","⌂","home"],["reading","R","reading"],["listening","L","listening"],
  ["writing","W","writing"],["mock","M","mock"],["community","◇","community"],
  ["profile","◎","profile"]
 ];

 function accountMini(s){
  if(!s.user)return `<button class="profile-mini" data-nav="profile"><div class="avatar">G</div><span><strong>Guest</strong><small>Login to sync</small></span></button>`;
  const p=s.profile||{},letter=(p.username||s.user.email||"U").slice(0,1).toUpperCase();
  return `<button class="profile-mini" data-nav="profile"><div class="avatar">${p.avatar_url?`<img src="${p.avatar_url}" alt="">`:letter}</div><span><strong>${p.username||"User"}</strong><small>${s.subscription?.status==="active"?"Pro · ":""}Cloud Sync</small></span></button>`;
 }
 function layout(content){
  const s=store.get();
  return `<div class="app-root"><header class="mobile-top"><div class="mobile-brand"><img class="brand-logo" src="/brand/jumsup-logo.png" alt="Jumsup"><div><b>Jumsup</b><small>English Practice</small></div></div><button class="mobile-profile" data-nav="profile">◎</button></header><div class="app-shell"><aside class="app-sidebar">
   <div class="brand"><img class="brand-logo" src="/brand/jumsup-logo.png" alt="Jumsup"><div><strong>Jumsup</strong><small>English Practice</small></div></div>
   <div class="side-section"><p class="side-label">${tr(s.lang,"vocab")}</p><div class="nav-grid">${nav().slice(0,4).map(([r,i,k])=>`<button class="nav-card ${route===r?"active":""}" data-nav="${r}"><span>${i}</span>${tr(s.lang,k)}</button>`).join("")}</div></div>
   <div class="side-section"><p class="side-label">${tr(s.lang,"practice")}</p><div class="nav-grid">${nav().slice(4,8).map(([r,i,k])=>`<button class="nav-card ${route===r?"active":""}" data-nav="${r}"><span>${i}</span>${tr(s.lang,k)}</button>`).join("")}</div></div>
   <div class="side-section"><p class="side-label">${tr(s.lang,"manage")}</p><div class="nav-grid">${nav().slice(8,10).map(([r,i,k])=>`<button class="nav-card ${route===r?"active":""}" data-nav="${r}"><span>${i}</span>${tr(s.lang,k)}</button>`).join("")}</div></div>
   <div class="sidebar-bottom">${accountMini(s)}</div>
  </aside><main class="app-content"><div class="sync-chip ${s.syncing?"show":""}" aria-live="polite">กำลังบันทึก…</div>${content}<footer class="legal-footer"><a href="/privacy/" target="_blank" rel="noopener">Privacy Policy</a><a href="/terms/" target="_blank" rel="noopener">Terms of Service</a><a href="mailto:sakagitnat@gmail.com">Contact</a></footer></main></div><nav class="bottom-nav"><button class="${route==="home"?"active":""}" data-nav="home"><span>⌂</span>Home</button><button class="${route.startsWith("reading")?"active":""}" data-nav="reading"><span>R</span>Reading</button><button class="${route.startsWith("listening")?"active":""}" data-nav="listening"><span>L</span>Listening</button><button class="${route.startsWith("writing")?"active":""}" data-nav="writing"><span>W</span>Writing</button><button class="${route.startsWith("mock")?"active":""}" data-nav="mock"><span>M</span>Mock</button></nav>${modalHtml}</div>`;
 }

 function render({preserveScroll=false}={}){
  if(renderFrame){cancelAnimationFrame(renderFrame);renderFrame=null}
  const previousScroll=preserveScroll?window.scrollY:0;
  const s=store.get();document.documentElement.dataset.theme=s.theme;
  let html;
  if(route==="home")html=renderHome(s);
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
  else if(route==="profile")html=renderProfile(s);
  else if(route==="settings"){route="profile";html=renderProfile(s)}
  else html=renderHome(s);
  root.innerHTML=layout(html);bind();startExamTimer();
  if(preserveScroll&&previousScroll)requestAnimationFrame(()=>window.scrollTo({top:previousScroll,behavior:"instant"}));
 }
 function requestRender(options={preserveScroll:true}){
  if(renderFrame)return;
  renderFrame=requestAnimationFrame(()=>{renderFrame=null;render(options)});
 }

 function toast(message){
  modalHtml=modal("Jumsup",`<p class="modal-desc">${escapeHtml(message)}</p>`,`<button class="btn btn-primary" data-action="close-modal">ตกลง</button>`);render();
 }

 async function hydrateFromCloud(user){
  if(!backendEnabled||!user)return;
  hydrating=true;store.set({syncing:true,backend:true,user});
  try{
   const remote=await loadCloudState(user);
   const local=store.get();
   const restoreOfficialPractice=cloud=>{
    const restored={...cloud};
    for(const key of ["reading","listening","writing","mocks"]){
     const cloudItems=Array.isArray(cloud[key])?cloud[key]:[];
     const official=(local[key]||[]).filter(item=>item.creator==="Jumsup Official"&&!cloudItems.some(saved=>saved.id===item.id));
     restored[key]=[...cloudItems,...official];
    }
    return restored;
   };
   const remoteHasData=(remote.decks?.length||0)+(remote.reading?.length||0)+(remote.listening?.length||0)+(remote.writing?.length||0)+(remote.mocks?.length||0)>0;
   if(remoteHasData){
    const restored=restoreOfficialPractice(remote);
    store.set({...restored,theme:remote.profile?.ui_theme||local.theme,lang:remote.profile?.ui_language||local.lang,sound:remote.profile?.sound_enabled??local.sound,backend:true,syncing:false});
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
   store.set({syncing:true});root.querySelector(".sync-chip")?.classList.add("show");
   try{await pushCloudState(currentUser,store.get())}
   catch(e){console.error("Sync failed",e)}
   finally{store.set({syncing:false});root.querySelector(".sync-chip")?.classList.remove("show")}
  },900);
 }

 function bind(){
  const modalCard=root.querySelector("[data-modal-card]");if(modalCard)modalCard.onclick=e=>e.stopPropagation();
  root.querySelectorAll("[data-nav]").forEach(el=>el.onclick=()=>{route=el.dataset.nav;selected=null;study=null;if(route==="community")refreshCommunity();render()});
  root.querySelectorAll("[data-action]").forEach(el=>el.onclick=e=>handleAction(el.dataset.action,el,e));
  root.querySelectorAll("[data-lang]").forEach(el=>el.onclick=()=>store.set({lang:el.dataset.lang}));
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
  root.querySelectorAll(".read-word").forEach(el=>el.onclick=()=>openWord(el.dataset.word));
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
   if(a==="logout"){await signOut();return}
   if(a==="open-edit-profile")return openEditProfile()
   if(a==="save-username"){
    if(!currentUser)return toast("กรุณาเข้าสู่ระบบก่อน");
    const username=(root.querySelector("#"+(el.dataset.input||"accountDisplayName"))?.value||"").normalize("NFKC").trim().replace(/\s+/g," ");
    const length=Array.from(username).length;
    if(length<1||length>40||/[\u0000-\u001F\u007F]/.test(username))return toast("ชื่อที่แสดงต้องมี 1–40 ตัวอักษร");
    const {data,error}=await supabase.from("profiles").update({username}).eq("user_id",currentUser.id).select("*").single();
    if(error)throw error
    modalHtml="";store.set({profile:{...s.profile,...data}});return toast("บันทึกชื่อที่แสดงแล้ว");
   }
   if(a==="open-membership-settings")return openMembershipSettings()
   if(a==="billing-help")return openBillingHelp()
   if(a==="open-apple-subscriptions"){location.href="https://apps.apple.com/account/subscriptions";return}
   if(a==="open-apple-refund"){location.href="https://reportaproblem.apple.com/";return}
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
      catch(err){const message=String(err?.message||err);if(message.includes("DAILY_LIMIT_REACHED"))return toast("วันนี้ใช้สิทธิ์ "+kind+" ฟรีไปแล้ว");if(!/HTTP (404|405)/.test(message))throw err}
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

 function openEditProfile(){
  const username=store.get().profile?.username||"";
  modalHtml=modal("แก้ไขโปรไฟล์",`<div class="modal-form"><label>ชื่อผู้ใช้<input id="profileUsername" maxlength="24" value="${escapeHtml(username)}" autocomplete="off"></label><p class="modal-note">ชื่อนี้จะแสดงใน Community แทนอีเมลของคุณ ใช้ตัวอักษร ตัวเลข หรือ _ จำนวน 3–24 ตัวอักษร</p></div>`,`<button class="btn" data-action="close-modal">ยกเลิก</button><button class="btn btn-primary" data-action="save-username" data-input="profileUsername">บันทึก</button>`);render()
 }
 function openMembershipSettings(){
  const s=store.get(),sub=s.subscription||{},provider=(sub.provider||sub.source||(sub.stripe_subscription_id?"stripe":"")).toLowerCase(),apple=provider.includes("apple")||provider.includes("ios"),active=["active","trialing"].includes(sub.status);
  const status=active?(sub.cancel_at_period_end?"สิทธิ์จะสิ้นสุดเมื่อจบรอบปัจจุบัน":"กำลังใช้งาน"):"ไม่มีการต่ออายุผ่านร้านค้า";
  const providerName=apple?"Apple App Store":provider==="stripe"?"เว็บไซต์ (Stripe)":"Jumsup";
  const actions=apple?`<button class="btn" data-action="billing-help">ความช่วยเหลือ</button><button class="btn btn-primary" data-action="open-apple-subscriptions">จัดการผ่าน Apple</button>`:provider==="stripe"?`<button class="btn" data-action="billing-help">ความช่วยเหลือด้านการชำระเงิน</button><button class="btn btn-primary" data-action="billing-portal">จัดการสมาชิก</button>`:`<button class="btn btn-primary" data-action="close-modal">เสร็จสิ้น</button>`;
  modalHtml=modal("การสมัครสมาชิก",`<div class="membership-modal"><div class="membership-status"><span>★</span><div><b>${isPro(s)?"Jumsup Pro":"Jumsup Free"}</b><small>${providerName} · ${status}</small></div></div><p class="modal-desc">การต่ออายุ การยกเลิก และการคืนเงินต้องจัดการผ่านช่องทางที่ใช้ชำระเงิน เพื่อความปลอดภัยของบัญชี</p></div>`,actions);render()
 }
 function openBillingHelp(){
  const sub=store.get().subscription||{},provider=(sub.provider||sub.source||(sub.stripe_subscription_id?"stripe":"")).toLowerCase(),apple=provider.includes("apple")||provider.includes("ios");
  const body=apple?`<p class="modal-desc">Apple เป็นผู้ดูแลการเรียกเก็บเงิน การยกเลิก และการคืนเงินของรายการที่ซื้อผ่าน App Store</p><div class="billing-help-list"><button class="btn" data-action="open-apple-subscriptions">จัดการการสมัครสมาชิก</button><button class="btn" data-action="open-apple-refund">ขอคืนเงินกับ Apple</button></div>`:`<p class="modal-desc">หากต้องการยกเลิก ให้เปิดหน้าจัดการสมาชิกของ Stripe การยกเลิกจะหยุดการต่ออายุและสิทธิ์ยังอยู่ถึงวันสิ้นสุดรอบ</p><div class="billing-help-list"><button class="btn" data-action="billing-portal">จัดการหรือยกเลิกสมาชิก</button><button class="btn btn-quiet" data-action="open-refund-request">ติดต่อเรื่องการเรียกเก็บเงิน</button><a class="btn" href="mailto:sakagitnat@gmail.com">ติดต่อฝ่ายช่วยเหลือ</a></div>`;
  modalHtml=modal("ความช่วยเหลือด้านการชำระเงิน",body,`<button class="btn btn-primary" data-action="close-modal">ปิด</button>`);render()
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
 function deckWordRow(word={},index=0){return `<div class="deck-word-row" data-deck-word><span class="deck-word-number">${index+1}</span><label>คำหรือวลี<input data-word-term value="${escapeHtml(word.w||"")}" placeholder="เช่น analyze"></label><label>ความหมาย<input data-word-meaning value="${escapeHtml(word.m||"")}" placeholder="เช่น วิเคราะห์"></label><label class="deck-example">ประโยคตัวอย่าง<input data-word-example value="${escapeHtml(word.e||"")}" placeholder="ไม่บังคับ"></label><div class="deck-word-actions"><button type="button" class="btn btn-quiet" data-deck-editor-action="copy">ทำสำเนา</button><button type="button" class="btn btn-quiet" data-deck-editor-action="delete">ลบ</button></div></div>`}
 function renumberDeckWords(){root.querySelectorAll("[data-deck-word] .deck-word-number").forEach((x,i)=>x.textContent=i+1)}
 function bindDeckEditor(){
  const list=root.querySelector("#deckWordList"),add=root.querySelector("#addDeckWord");if(!list||!add)return;
  add.onclick=()=>{list.insertAdjacentHTML("beforeend",deckWordRow({},list.children.length));renumberDeckWords();list.querySelector("[data-deck-word]:last-child [data-word-term]")?.focus()};
  list.onclick=e=>{const button=e.target.closest("[data-deck-editor-action]");if(!button)return;const row=button.closest("[data-deck-word]"),action=button.dataset.deckEditorAction;if(action==="delete"){if(list.children.length>1)row.remove();else row.querySelectorAll("input").forEach(x=>x.value="")}if(action==="copy"){const copy={w:row.querySelector("[data-word-term]").value,m:row.querySelector("[data-word-meaning]").value,e:row.querySelector("[data-word-example]").value};row.insertAdjacentHTML("afterend",deckWordRow(copy,0))}renumberDeckWords()};
 }
 function openDeckModal(id){
  const s=store.get(),d=id?s.decks.find(x=>x.id===id):null,words=d?.words?.length?d.words:[{}];
  modalHtml=modal(d?"แก้ไขชุดคำศัพท์":"สร้างชุดคำศัพท์",`<div class="deck-editor-modal"><div class="modal-two deck-meta"><label>ชื่อชุด<input id="modalName" value="${escapeHtml(d?.name||"")}" placeholder="เช่น คำศัพท์ A-Level บทที่ 1"></label><label>การมองเห็น<select id="modalVisibility"><option value="private" ${d?.visibility!=="public"?"selected":""}>ส่วนตัว</option><option value="public" ${d?.visibility==="public"?"selected":""}>สาธารณะ</option></select></label></div><div class="deck-editor-head"><div><b>คำศัพท์ในชุด</b><small>กรอกคำและความหมาย แล้วเพิ่มคำถัดไปได้ทันที</small></div><button id="addDeckWord" type="button" class="btn">+ เพิ่มคำศัพท์</button></div><div id="deckWordList" class="deck-word-list">${words.map(deckWordRow).join("")}</div></div>`,`<button class="btn" data-action="close-modal">ยกเลิก</button><button class="btn btn-primary" data-action="save-deck" data-id="${id||""}">บันทึกชุด</button>`);render()
 }
 async function saveDeck(id){
  const name=root.querySelector("#modalName").value.trim(),visibility=root.querySelector("#modalVisibility").value;if(!name)return toast("กรุณาตั้งชื่อชุด");
  const words=[...root.querySelectorAll("[data-deck-word]")].map(row=>({w:row.querySelector("[data-word-term]").value.trim(),m:row.querySelector("[data-word-meaning]").value.trim(),e:row.querySelector("[data-word-example]").value.trim()})).filter(x=>x.w||x.m);
  const incomplete=words.find(x=>!x.w||!x.m);if(incomplete)return toast("ทุกคำต้องมีทั้งคำศัพท์และความหมาย");if(!words.length)return toast("กรุณาเพิ่มคำศัพท์อย่างน้อย 1 คำ");
  const creator=store.get().profile?.username||"guest",newId=id||`deck-${crypto.randomUUID()}`;
  const localSave=(v)=>store.update(s=>({...s,decks:id?s.decks.map(d=>d.id===id?{...d,name,visibility:v,words}:d):[...s.decks,{id:newId,name,visibility:v,creator,words}]}));
  if(visibility==="private"&&!canPrivateLocally(store.get(),"vocab",id)){
    pendingPublicSave=async()=>{if(currentUser&&backendEnabled)await api("/api/content/publish-confirmed",{method:"POST",body:JSON.stringify({kind:"vocab",id:newId,title:name,payload:{words},confirm_public:true})});localSave("public")};
    modalHtml=modal("โควตาชุดส่วนตัวเต็ม",`<p class="modal-desc">Free เก็บ Flashcard ส่วนตัวได้ 3 ชุด ชุดนี้จะเป็น Public เฉพาะเมื่อคุณกดยืนยันเผยแพร่</p>`,`<button class="btn" data-action="close-modal">ยกเลิก</button><button class="btn btn-primary" data-action="confirm-public-save">ยืนยันเผยแพร่</button>`);return render()
  }
  if(currentUser&&backendEnabled)await api("/api/content/save",{method:"POST",body:JSON.stringify({kind:"vocab",id:newId,title:name,visibility,payload:{words}})});
  localSave(visibility);modalHtml="";render()
 }
 function practiceQuestionEditor(q={},index=0){
  const choices=[...(q.choices||[]),...Array(4).fill("")].slice(0,4),answer=Math.max(0,Math.min(3,Number(q.answer)||0));
  return `<article class="practice-question-editor" data-practice-question><div class="practice-builder-row-head"><strong>คำถาม <span data-question-number>${index+1}</span></strong><div><button type="button" class="mini-btn" data-practice-copy-question>คัดลอก</button><button type="button" class="mini-btn danger" data-practice-delete-question>ลบ</button></div></div><label>คำถาม<input data-question-prompt value="${escapeHtml(q.prompt||"")}" placeholder="เช่น What is the main idea of the passage?"></label><div class="practice-choice-grid">${choices.map((choice,i)=>`<label><span>ตัวเลือก ${String.fromCharCode(65+i)}</span><input data-question-choice="${i}" value="${escapeHtml(choice)}" placeholder="พิมพ์ตัวเลือก"></label>`).join("")}</div><div class="modal-two compact"><label>คำตอบที่ถูก<select data-question-answer>${choices.map((_,i)=>`<option value="${i}" ${answer===i?"selected":""}>${String.fromCharCode(65+i)}</option>`).join("")}</select></label><label>คำอธิบาย (ไม่บังคับ)<input data-question-explanation value="${escapeHtml(q.explanation||"")}" placeholder="อธิบายเหตุผลหลังส่งคำตอบ"></label></div></article>`;
 }
 function practiceSectionEditor(kind,section={},index=0){
  const content=kind==="reading"?section.text||section.context||"":kind==="listening"?section.script||section.context||"":kind==="writing"?section.passage||section.context||"":section.context||"";
  const contentLabel=kind==="reading"?"บทความ":kind==="listening"?"บทพูด / Transcript":kind==="writing"?"ข้อความหรือโจทย์ประกอบ":"เนื้อหาประกอบของ Section";
  const questions=section.questions?.length?section.questions:[{}];
  return `<section class="practice-section-editor" data-practice-section><div class="practice-builder-row-head"><div><span class="tag blue">SECTION <span data-section-number>${index+1}</span></span><strong data-section-heading>${escapeHtml(section.title||`ส่วนที่ ${index+1}`)}</strong></div><div><button type="button" class="mini-btn" data-practice-copy-section>คัดลอก Section</button><button type="button" class="mini-btn danger" data-practice-delete-section>ลบ</button></div></div><div class="modal-two"><label>ชื่อ Section<input data-section-title value="${escapeHtml(section.title||"")}" placeholder="เช่น General article 1"></label>${kind==="mock"?`<label>ประเภท<select data-section-type><option value="reading" ${section.type==="reading"?"selected":""}>Reading</option><option value="listening" ${section.type==="listening"?"selected":""}>Listening</option><option value="writing" ${section.type==="writing"?"selected":""}>Writing</option></select></label>`:`<label>คำแนะนำ (ไม่บังคับ)<input data-section-description value="${escapeHtml(section.description||section.situation||section.directions||"")}" placeholder="ข้อความที่ผู้ทำแบบฝึกจะเห็น"></label>`}</div><label>${contentLabel}<textarea data-section-content rows="6" placeholder="วางหรือพิมพ์เนื้อหาสำหรับ Section นี้">${escapeHtml(content)}</textarea></label><div class="practice-question-list">${questions.map((q,i)=>practiceQuestionEditor(q,i)).join("")}</div><div class="practice-section-footer"><button type="button" class="btn practice-add-question" data-practice-add-question>+ เพิ่มคำถามใน Section นี้</button><button type="button" class="btn btn-primary" data-practice-add-section-after>+ เพิ่ม Section ถัดไป</button></div></section>`;
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
  const title=row.querySelector("[data-section-title]")?.value.trim()||"",description=row.querySelector("[data-section-description]")?.value.trim()||"",content=row.querySelector("[data-section-content]")?.value.trim()||"",questions=[...row.querySelectorAll(":scope > .practice-question-list > [data-practice-question]")].map(readPracticeQuestion),section={title,description,questions};
  if(kind==="reading")section.text=content;
  else if(kind==="listening"){section.script=content;section.situation=description}
  else if(kind==="writing"){section.passage=content;section.directions=description}
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
  if(currentUser&&backendEnabled)await api("/api/content/save",{method:"POST",body:JSON.stringify({kind,id:newId,title,visibility,payload})});
  localSave(visibility);modalHtml="";render()
 }
 function openDelete(type,id){modalHtml=modal("ยืนยันการลบ",`<div class="delete-warning"><b>การลบไม่สามารถย้อนกลับได้</b></div><div class="modal-form"><label>พิมพ์คำว่า ลบ<input id="deleteText"></label><label class="delete-check-row"><input id="deleteCheck" type="checkbox"><span>ฉันเข้าใจว่ารายการนี้จะถูกลบถาวร</span></label></div>`,`<button class="btn" data-action="close-modal">ยกเลิก</button><button class="btn btn-danger" data-action="confirm-delete" data-type="${type}" data-id="${id}">ลบถาวร</button>`);render()}
 function confirmDelete(type,id){if(root.querySelector("#deleteText").value.trim()!=="ลบ"||!root.querySelector("#deleteCheck").checked)return;store.update(s=>{const key=type==="deck"?"decks":type==="mock"?"mocks":type;return {...s,[key]:s[key].filter(x=>x.id!==id)}});modalHtml="";render()}

 async function openWord(word){
  const local=store.get().decks.flatMap(d=>d.words).find(w=>w.w===word)?.m;
  if(local)return toast(`${word}: ${local}`);
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
  const playable=words.filter(w=>/^[a-z]+$/i.test(w.w));if(playable.length<3){modalHtml=modal("Crossword","ต้องจำศัพท์ภาษาอังกฤษอย่างน้อย 3 คำก่อนเล่น");return render()}
  const selectedWords=[...playable].sort(()=>Math.random()-.5).slice(0,Math.min(7,playable.length)),previous=readRecords(),best=previous[0];
  root.innerHTML=layout(`<section class="game-hero cross-hero"><div><p class="content-eyebrow">WORD QUEST</p><h1 class="content-title">Crossword · ${escapeHtml(deck.name)}</h1><p class="content-desc">ไขคำใบ้ทีละคำ สะสมคอมโบ และใช้คำใบ้ให้น้อยที่สุด</p></div><button class="btn" id="crossRestart">↻ กระดานใหม่</button></section><div class="game-hud"><div><small>เวลา</small><strong id="crossTime">0.00s</strong></div><div><small>คะแนน</small><strong id="crossScore">0</strong></div><div><small>คอมโบ</small><strong id="crossCombo">×1</strong></div><div class="best-stat"><small>สถิติสูงสุด</small><strong>${best?best.score.toLocaleString():"—"}</strong></div></div><div class="crossword-layout"><div class="crossword-main"><div class="cross-stage-head"><span id="crossProgress">คำที่ 1/${selectedWords.length}</span><div class="match-progress"><i id="crossProgressBar"></i></div></div>${selectedWords.map((w,wi)=>`<div class="cross-word-row ${wi?"is-hidden":""}" data-word="${wi}"><b>${wi+1}</b><div class="cross-letter-row">${[...w.w].map(c=>`<input class="cross-cell" maxlength="1" data-a="${escapeHtml(c.toUpperCase())}" aria-label="คำที่ ${wi+1}">`).join("")}</div></div>`).join("")}<div class="cross-feedback" id="crossFeedback">พิมพ์คำตอบจากคำใบ้ด้านขวา</div><div class="actions"><button class="btn btn-primary" id="checkCross">ส่งคำตอบ</button><button class="btn" id="hintCross">💡 เปิดตัวอักษร (-100)</button></div></div><aside class="clue-panel"><p class="content-eyebrow">CURRENT CLUE</p>${selectedWords.map((w,i)=>`<div class="clue-item ${i?"is-hidden":""}" data-clue="${i}"><b>${i+1}. ${escapeHtml(w.m)}</b><small>${w.w.length} ตัวอักษร · ตัวแรก ${escapeHtml(w.w[0].toUpperCase())}</small></div>`).join("")}<div class="quest-ranking"><h3>สถิติ 5 อันดับ</h3><ol id="crossRanking">${previous.length?previous.map((r,i)=>`<li><b>#${i+1}</b><span>${r.score.toLocaleString()} pts</span><small>${formatTime(r.time)}</small></li>`).join(""):`<li class="empty-rank">ยังไม่มีสถิติ</li>`}</ol></div></aside></div>`);bind();
  let current=0,score=0,combo=1,hints=0,startedAt=performance.now(),frame=0;const tick=()=>{const elapsed=performance.now()-startedAt,el=root.querySelector("#crossTime");if(!el)return;el.textContent=formatTime(elapsed);frame=requestAnimationFrame(tick)},cells=()=>[...root.querySelectorAll(`[data-word="${current}"] .cross-cell`)],focusFirst=()=>cells().find(x=>!x.value)?.focus(),showCurrent=()=>{root.querySelectorAll("[data-word],[data-clue]").forEach(x=>x.classList.add("is-hidden"));root.querySelector(`[data-word="${current}"]`)?.classList.remove("is-hidden");root.querySelector(`[data-clue="${current}"]`)?.classList.remove("is-hidden");root.querySelector("#crossProgress").textContent=`คำที่ ${current+1}/${selectedWords.length}`;root.querySelector("#crossProgressBar").style.width=`${current/selectedWords.length*100}%`;focusFirst()};tick();
  root.querySelector("#crossRestart").onclick=()=>{cancelAnimationFrame(frame);openGame("crossword",deck,words)};
  root.querySelectorAll(".cross-cell").forEach(x=>{x.oninput=()=>{x.value=x.value.replace(/[^a-z]/gi,"").toUpperCase();const active=cells(),i=active.indexOf(x);if(x.value)active[i+1]?.focus()};x.onkeydown=e=>{if(e.key==="Backspace"&&!x.value){const active=cells(),i=active.indexOf(x);active[i-1]?.focus()}}});
  root.querySelector("#hintCross").onclick=()=>{const target=cells().find(x=>!x.value||x.value!==x.dataset.a);if(!target)return;target.value=target.dataset.a;target.classList.add("hinted");hints++;score=Math.max(0,score-100);root.querySelector("#crossScore").textContent=score.toLocaleString();focusFirst()};
  root.querySelector("#checkCross").onclick=()=>{const active=cells(),correct=active.every(x=>x.value===x.dataset.a);if(!correct){combo=1;root.querySelector("#crossCombo").textContent="×1";active.forEach(x=>x.classList.toggle("wrong",x.value!==x.dataset.a));root.querySelector("#crossFeedback").textContent="ยังไม่ถูก ลองดูจำนวนตัวอักษรอีกครั้ง";return}active.forEach(x=>{x.classList.remove("wrong");x.classList.add("correct")});score+=500*combo;combo=Math.min(combo+1,5);root.querySelector("#crossScore").textContent=score.toLocaleString();root.querySelector("#crossCombo").textContent=`×${combo}`;root.querySelector("#crossFeedback").textContent=`ถูกต้อง! +${500*(combo-1)} คะแนน`;current++;if(current<selectedWords.length){setTimeout(showCurrent,350);return}cancelAnimationFrame(frame);const elapsed=Math.round(performance.now()-startedAt),timeBonus=Math.max(0,3000-Math.floor(elapsed/100)),finalScore=score+timeBonus,wasBest=!best||finalScore>best.score,records=saveRecord(elapsed,finalScore);modalHtml=modal(wasBest?"🏆 คะแนนสูงสุดใหม่!":"ผ่าน Word Quest แล้ว",`<div class="game-result"><strong>${finalScore.toLocaleString()} pts</strong><p>${formatTime(elapsed)} · ใช้คำใบ้ ${hints} ครั้ง · โบนัสเวลา ${timeBonus}</p></div>`,`<button class="btn" data-action="close-modal">ดูอันดับ</button><button class="btn btn-primary" id="playCrossAgain">เล่นกระดานใหม่</button>`);render();root.querySelector("#playCrossAgain").onclick=()=>{modalHtml="";openGame("crossword",deck,words)}};
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

 let previousState=store.get();
 const syncKeys=new Set(["theme","lang","sound","decks","progress","flashSettings","reading","listening","writing","mocks","profile"]);
 store.subscribe(next=>{
  const changed=Object.keys(next).filter(key=>next[key]!==previousState[key]);
  previousState=next;
  if(!changed.length)return;
  if(changed.some(key=>key!=="syncing"))requestRender();
  if(changed.some(key=>syncKeys.has(key)))scheduleSync();
 });

 if(backendEnabled){
  const session=await getSession();currentUser=session?.user||null;
  if(currentUser)await hydrateFromCloud(currentUser);else store.set({backend:true,user:null});
  onAuthChange(async session=>{currentUser=session?.user||null;if(currentUser)await hydrateFromCloud(currentUser);else store.set({user:null,profile:null,subscription:null,community:[],backend:true})});
 }else store.set({backend:false,user:null});
 render();
}

