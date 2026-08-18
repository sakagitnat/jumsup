import { store } from "../lib/store.js";
import { tr } from "../lib/i18n.js";
import { speak,todayKey,escapeHtml } from "../lib/utils.js";
import { backendEnabled,getSession,signInGoogle,signOut,onAuthChange } from "../lib/auth.js";
import { loadCloudState,pushCloudState,loadCommunity,importCommunityItem,uploadAvatar } from "../lib/cloud.js";
import { api } from "../lib/api.js";
import { canPrivateLocally,startDailyFeature } from "../lib/policy.js";
import { supabase } from "../lib/supabase.js";
import { renderHome } from "../features/home/home.js";
import { renderDecks,renderStudy,masteredWords } from "../features/flashcards/flashcards.js";
import { renderList,renderReading,renderListening,renderWriting } from "../features/practice/practice.js";
import { renderCommunity } from "../features/community/community.js";
import { renderSettings } from "../features/settings/settings.js";
import { renderProfile } from "../features/profile/profile.js";
import { modal } from "../components/modal.js";

export async function createApp(root){
 let route="home",study=null,selected=null,communityTab="vocab",communityQuery="",modalHtml="",syncTimer=null,hydrating=false;
 let pendingPublicSave=null;const activeUsageSessions={};
 let currentUser=null;

 const nav=()=>[
  ["flash","Aa","flash"],["match","↔","match"],["crossword","+","cross"],
  ["home","⌂","home"],["reading","R","reading"],["listening","L","listening"],
  ["writing","W","writing"],["mock","M","mock"],["community","◇","community"],
  ["profile","◎","profile"],["settings","⚙","settings"]
 ];

 function accountMini(s){
  if(!s.user)return `<button class="profile-mini" data-nav="profile"><div class="avatar">G</div><span><strong>Guest</strong><small>Login to sync</small></span></button>`;
  const p=s.profile||{},letter=(p.username||s.user.email||"U").slice(0,1).toUpperCase();
  return `<button class="profile-mini" data-nav="profile"><div class="avatar">${p.avatar_url?`<img src="${p.avatar_url}" alt="">`:letter}</div><span><strong>${p.username||"User"}</strong><small>${s.subscription?.status==="active"?"Pro · ":""}Cloud Sync</small></span></button>`;
 }
 function layout(content){
  const s=store.get();
  return `<div class="app-root"><div class="app-shell"><aside class="app-sidebar">
   <div class="brand"><div class="brand-mark">J</div><div><strong>Jumsup</strong><small>English Practice</small></div></div>
   <div class="side-section"><p class="side-label">${tr(s.lang,"vocab")}</p><div class="nav-grid">${nav().slice(0,4).map(([r,i,k])=>`<button class="nav-card ${route===r?"active":""}" data-nav="${r}"><span>${i}</span>${tr(s.lang,k)}</button>`).join("")}</div></div>
   <div class="side-section"><p class="side-label">${tr(s.lang,"practice")}</p><div class="nav-grid">${nav().slice(4,8).map(([r,i,k])=>`<button class="nav-card ${route===r?"active":""}" data-nav="${r}"><span>${i}</span>${tr(s.lang,k)}</button>`).join("")}</div></div>
   <div class="side-section"><p class="side-label">${tr(s.lang,"manage")}</p><div class="nav-grid">${nav().slice(8,10).map(([r,i,k])=>`<button class="nav-card ${route===r?"active":""}" data-nav="${r}"><span>${i}</span>${tr(s.lang,k)}</button>`).join("")}</div></div>
   <div class="side-section"><p class="side-label">${tr(s.lang,"system")}</p><div class="nav-grid">${nav().slice(10).map(([r,i,k])=>`<button class="nav-card ${route===r?"active":""}" data-nav="${r}"><span>${i}</span>${tr(s.lang,k)}</button>`).join("")}</div></div>
   <div class="sidebar-bottom">${accountMini(s)}</div>
  </aside><main class="app-content">${s.syncing?`<div class="sync-chip">Syncing…</div>`:""}${content}</main></div>${modalHtml}</div>`;
 }

 function render(){
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
  else if(route==="community")html=renderCommunity(s,communityQuery,communityTab);
  else if(route==="profile")html=renderProfile(s);
  else if(route==="settings")html=renderSettings(s);
  else html=renderHome(s);
  root.innerHTML=layout(html);bind();
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
  if(!currentUser||!backendEnabled){store.set({community:[]});return}
  try{
   const items=await loadCommunity(communityQuery,communityTab);
   store.set({community:items});
  }catch(e){console.error(e)}
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
  root.querySelectorAll("[data-nav]").forEach(el=>el.onclick=()=>{route=el.dataset.nav;selected=null;study=null;if(route==="community")refreshCommunity();render()});
  root.querySelectorAll("[data-action]").forEach(el=>el.onclick=e=>handleAction(el.dataset.action,el,e));
  root.querySelectorAll("[data-lang]").forEach(el=>el.onclick=()=>store.set({lang:el.dataset.lang}));
  root.querySelectorAll("[data-theme-choice]").forEach(el=>el.onclick=()=>store.set({theme:el.dataset.themeChoice}));
  const st=root.querySelector("#soundToggle");if(st)st.onchange=()=>store.set({sound:st.checked});
  root.querySelectorAll("[data-community-tab]").forEach(el=>el.onclick=async()=>{communityTab=el.dataset.communityTab;await refreshCommunity();render()});
  root.querySelectorAll(".choice").forEach(el=>el.onclick=()=>el.classList.add(Number(el.dataset.answer)===Number(el.dataset.correct)?"correct":"wrong"));
  root.querySelectorAll(".read-word").forEach(el=>el.onclick=()=>openWord(el.dataset.word));
  const avatar=root.querySelector("#avatarFile");if(avatar)avatar.onchange=async()=>{if(!avatar.files?.[0]||!currentUser)return;try{const url=await uploadAvatar(currentUser,avatar.files[0]);store.set({profile:{...store.get().profile,avatar_url:url}})}catch(e){toast(e.message)}};
  bindSwipe();
 }

 async function handleAction(a,el,e){
  const s=store.get();
  try{
   if(a==="login-google")return signInGoogle();
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
    route=kind==="reading"?"reading-play":kind==="listening"?"listening-play":kind==="writing"?"writing-play":"home";render()
   }
   if(a==="speak-script")speak(el.dataset.script);
   if(a==="stop-speech")speechSynthesis?.cancel();
   if(a==="community-search"){communityQuery=root.querySelector("#communitySearch").value;await refreshCommunity();render()}
   if(a==="community-refresh"){await refreshCommunity();render()}
   if(a==="import-community"){
    if(!currentUser)return toast("กรุณาเข้าสู่ระบบก่อนนำเข้า Community");
    const item=s.community.find(x=>x.id===el.dataset.id);await importCommunityItem(currentUser,item);await hydrateFromCloud(currentUser);return toast("นำเข้าเป็นสำเนาใหม่แล้ว");
   }
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
  modalHtml=modal(x?"แก้ไขชุดฝึก":"สร้างชุดฝึก",`<div class="modal-form"><label>ชื่อชุด<input id="modalName" value="${escapeHtml(x?.title||"")}"></label><label>การมองเห็น<select id="modalVisibility"><option value="private">ส่วนตัว</option><option value="public" ${x?.visibility==="public"?"selected":""}>สาธารณะ</option></select></label></div>`,`<button class="btn" data-action="close-modal">ยกเลิก</button><button class="btn btn-primary" data-action="save-practice" data-kind="${kind}" data-id="${id||""}">บันทึก</button>`);render()
 }
 async function savePractice(kind,id){
  const title=root.querySelector("#modalName").value.trim(),visibility=root.querySelector("#modalVisibility").value;if(!title)return;
  const key=kind==="mock"?"mocks":kind,creator=store.get().profile?.username||"guest",newId=id||`${kind}-${crypto.randomUUID()}`;
  const cur=(store.get()[key]||[]).find(x=>x.id===id),payload=cur?Object.fromEntries(Object.entries(cur).filter(([k])=>!["id","title","visibility","creator"].includes(k))):(kind==="mock"?{questions:80,minutes:90}:{});
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
  if(local)return toast(`${word}: ${local}`);
  if(!currentUser)return toast(`${word}: เข้าสู่ระบบเพื่อใช้การแปลออนไลน์`);
  try{const d=await api("/api/translate",{method:"POST",body:JSON.stringify({text:word,target:store.get().lang==="en"?"th":store.get().lang})});toast(`${word}: ${d.translation||"ยังไม่ได้ตั้ง Translation API"}`)}catch(e){toast(e.message)}
 }
 function openGame(kind,deck,words){
  if(kind==="match"){
   if(words.length<4){modalHtml=modal("Match","ต้องจำศัพท์อย่างน้อย 4 คำก่อนเล่น");return render()}
   root.innerHTML=layout(`<div class="content-header"><h1 class="content-title">Match · ${escapeHtml(deck.name)}</h1></div><div class="match-board">${words.slice(0,6).flatMap((w,i)=>[`<button class="match-tile" data-pair="${i}">${escapeHtml(w.w)}</button>`,`<button class="match-tile" data-pair="${i}">${escapeHtml(w.m)}</button>`]).join("")}</div>`);let first=null;root.querySelectorAll(".match-tile").forEach(t=>t.onclick=()=>{if(!first){first=t;t.classList.add("selected")}else if(first!==t&&first.dataset.pair===t.dataset.pair){first.classList.add("matched");t.classList.add("matched");first=null}else{first.classList.remove("selected");first=null}});return
  }
  if(words.length<3){modalHtml=modal("Crossword","ต้องจำศัพท์อย่างน้อย 3 คำก่อนเล่น");return render()}
  const w=words[0];root.innerHTML=layout(`<div class="content-header"><h1 class="content-title">Crossword · ${escapeHtml(deck.name)}</h1></div><div class="card"><h3>คำใบ้: ${escapeHtml(w.m)}</h3><div class="cross-grid-pro" style="--cols:${w.w.length}">${[...w.w].map(c=>`<input class="cross-cell" maxlength="1" data-a="${escapeHtml(c.toUpperCase())}">`).join("")}</div><button class="btn btn-primary" id="checkCross">ตรวจคำตอบ</button></div>`);root.querySelector("#checkCross").onclick=()=>root.querySelectorAll(".cross-cell").forEach(x=>x.classList.toggle("wrong",x.value.toUpperCase()!==x.dataset.a))
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

 store.subscribe(()=>{render();scheduleSync()});

 if(backendEnabled){
  const session=await getSession();currentUser=session?.user||null;
  if(currentUser)await hydrateFromCloud(currentUser);else store.set({backend:true,user:null});
  onAuthChange(async session=>{currentUser=session?.user||null;if(currentUser)await hydrateFromCloud(currentUser);else store.set({user:null,profile:null,subscription:null,community:[],backend:true})});
 }else store.set({backend:false,user:null});
 render();
}
