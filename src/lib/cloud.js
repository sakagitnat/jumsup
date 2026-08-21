import { supabase,backendEnabled } from "./supabase.js";

const ownCreator=p=>p?.username||"user";

export async function loadCloudState(user){
  if(!backendEnabled||!user)return null;

  const [{data:profile,error:pe},{data:sets,error:se},{data:practice,error:pre},{data:progress,error:proe},{data:subscription,error:sue},{data:payments,error:payE},{data:refunds,error:refE}]=await Promise.all([
    supabase.from("profiles").select("*").eq("user_id",user.id).single(),
    supabase.from("vocab_sets").select("id,name,visibility,user_id,created_at,updated_at,vocab_words(id,word,stress,meaning,example,sort_order)").eq("user_id",user.id).order("created_at"),
    supabase.from("practice_sets").select("*").eq("user_id",user.id).order("created_at"),
    supabase.from("learning_progress").select("*").eq("user_id",user.id),
    supabase.from("subscriptions").select("*").eq("user_id",user.id).maybeSingle(),
    supabase.from("payment_events").select("id,kind,amount,currency,status,created_at").eq("user_id",user.id).order("created_at",{ascending:false}).limit(20),
    supabase.from("refund_requests").select("id,payment_event_id,reason,status,requested_amount,cancel_subscription,admin_note,requested_at,reviewed_at,completed_at").eq("user_id",user.id).order("requested_at",{ascending:false}).limit(20)
  ]);
  if(pe)throw pe;if(se)throw se;if(pre)throw pre;if(proe)throw proe;if(sue)throw sue;if(payE)throw payE;if(refE)throw refE;

  const decks=(sets||[]).map(s=>({
    id:s.id,name:s.name,visibility:s.visibility,creator:ownCreator(profile),
    words:(s.vocab_words||[]).sort((a,b)=>a.sort_order-b.sort_order).map(w=>({
      w:w.word,stress:w.stress||"",p:"",m:w.meaning||"",e:w.example||""
    }))
  }));
  const grouped={reading:[],listening:[],writing:[],mocks:[]};
  for(const x of practice||[]){
    const item={id:x.id,title:x.title,visibility:x.visibility,creator:ownCreator(profile),...(x.payload||{})};
    if(x.kind==="mock")grouped.mocks.push(item);else grouped[x.kind].push(item);
  }
  const progressMap={};
  for(const p of progress||[])progressMap[p.set_id]={mastered:p.mastered_indices||[]};

  return {
    user,
    profile,
    subscription:subscription||null,
    payments:payments||[],
    refunds:refunds||[],
    decks,
    ...grouped,
    progress:progressMap,
    xp:profile?.xp||0,
    streak:profile?.streak||0,
    lastCheckin:profile?.last_checkin||""
  };
}

async function replaceWords(userId,deck){
  const {error:d}=await supabase.from("vocab_words").delete().eq("set_id",deck.id);
  if(d)throw d;
  if(!deck.words?.length)return;
  const rows=deck.words.map((w,i)=>({
    set_id:deck.id,word:w.w,stress:w.stress||w.p||null,meaning:w.m||null,example:w.e||null,sort_order:i
  }));
  const {error}=await supabase.from("vocab_words").insert(rows);
  if(error)throw error;
}

export async function pushCloudState(user,state){
  if(!backendEnabled||!user)return;

  const profilePatch={
    username:state.profile?.username||user.user_metadata?.preferred_username||user.user_metadata?.name?.replace(/\s+/g,"_").toLowerCase()||`user_${user.id.slice(0,8)}`,
    avatar_url:state.profile?.avatar_url||user.user_metadata?.avatar_url||null,
    ui_language:state.lang||"th",
    ui_theme:state.theme||"light",
    sound_enabled:state.sound!==false,
    timezone:Intl.DateTimeFormat().resolvedOptions().timeZone||"UTC"
  };
  const {error:ppe}=await supabase.from("profiles").update(profilePatch).eq("user_id",user.id);
  if(ppe)throw ppe;

  const remoteDeckIds=(state.decks||[]).map(d=>d.id);
  const {data:existingSets,error:ese}=await supabase.from("vocab_sets").select("id").eq("user_id",user.id);
  if(ese)throw ese;
  const deleted=(existingSets||[]).map(x=>x.id).filter(id=>!remoteDeckIds.includes(id));
  if(deleted.length){
    const {error}=await supabase.from("vocab_sets").delete().in("id",deleted).eq("user_id",user.id);
    if(error)throw error;
  }
  for(const deck of state.decks||[]){
    const {error}=await supabase.from("vocab_sets").upsert({
      id:deck.id,user_id:user.id,name:deck.name,visibility:deck.visibility||"private",updated_at:new Date().toISOString()
    },{onConflict:"id"});
    if(error)throw error;
    await replaceWords(user.id,deck);
  }

  const allPractice=[
    ...(state.reading||[]).map(x=>["reading",x]),
    ...(state.listening||[]).map(x=>["listening",x]),
    ...(state.writing||[]).map(x=>["writing",x]),
    ...(state.mocks||[]).map(x=>["mock",x])
  ];
  const keep=allPractice.map(([,x])=>x.id);
  const {data:existingPractice,error:epe}=await supabase.from("practice_sets").select("id").eq("user_id",user.id);
  if(epe)throw epe;
  const delp=(existingPractice||[]).map(x=>x.id).filter(id=>!keep.includes(id));
  if(delp.length){
    const {error}=await supabase.from("practice_sets").delete().in("id",delp).eq("user_id",user.id);
    if(error)throw error;
  }
  for(const [kind,item] of allPractice){
    const payload={...item};delete payload.id;delete payload.title;delete payload.visibility;delete payload.creator;
    const {error}=await supabase.from("practice_sets").upsert({
      id:item.id,user_id:user.id,kind,title:item.title,visibility:item.visibility||"private",payload,updated_at:new Date().toISOString()
    },{onConflict:"id"});
    if(error)throw error;
  }

  for(const [setId,p] of Object.entries(state.progress||{})){
    const {error}=await supabase.rpc("sync_learning_progress",{p_set_id:setId,p_indices:p.mastered||[]});
    if(error && !String(error.message).toLowerCase().includes("forbidden"))throw error;
  }
}

export async function loadCommunity(query="",type="vocab"){
  if(!backendEnabled)return [];
  if(type==="vocab"){
    let q=supabase.from("vocab_sets")
      .select("id,name,user_id,visibility,profiles!vocab_sets_user_id_fkey(username),vocab_words(id)")
      .eq("visibility","public").limit(40);
    if(query)q=q.ilike("name",`%${query}%`);
    const {data,error}=await q;
    if(error)throw error;
    return withCommunityMetrics((data||[]).map(x=>({
      id:x.id,type:"vocab",title:x.name,creator:x.profiles?.username||"member",
      count:x.vocab_words?.length||0,visibility:"public"
    })),"vocab");
  }
  let q=supabase.from("practice_sets")
    .select("id,title,kind,user_id,visibility,profiles!practice_sets_user_id_fkey(username)")
    .eq("visibility","public").limit(40);
  if(query)q=q.ilike("title",`%${query}%`);
  const {data,error}=await q;
  if(error)throw error;
  return withCommunityMetrics((data||[]).map(x=>({
    id:x.id,type:"skill",kind:x.kind,title:x.title,creator:x.profiles?.username||"member",count:1,visibility:"public"
  })),"skill");
}

async function withCommunityMetrics(items,type){
  if(!items.length)return items;
  const ids=items.map(x=>x.id);
  const [{data:likes},{data:reviews},{data:imports},{data:userData}]=await Promise.all([
    supabase.from("content_likes").select("user_id,content_id").eq("content_type",type).in("content_id",ids),
    supabase.from("content_reviews").select("user_id,content_id,rating").eq("content_type",type).eq("status","visible").in("content_id",ids),
    supabase.from("content_imports").select("source_content_id").eq("content_type",type).in("source_content_id",ids),
    supabase.auth.getUser()
  ]);
  const user=userData?.user;
  return items.map(item=>{
    const itemLikes=(likes||[]).filter(x=>x.content_id===item.id),itemReviews=(reviews||[]).filter(x=>x.content_id===item.id);
    return {...item,likeCount:itemLikes.length,liked:!!user&&itemLikes.some(x=>x.user_id===user.id),ratingCount:itemReviews.length,rating:itemReviews.length?itemReviews.reduce((n,x)=>n+x.rating,0)/itemReviews.length:0,importCount:(imports||[]).filter(x=>x.source_content_id===item.id).length};
  });
}

export async function toggleCommunityLike(user,item){
  if(!user||!item)throw new Error("Login required");
  const key={user_id:user.id,content_type:item.type,content_id:item.id};
  if(item.liked){const {error}=await supabase.from("content_likes").delete().match(key);if(error)throw error;return false}
  const {error}=await supabase.from("content_likes").insert(key);if(error)throw error;return true;
}

export async function saveCommunityReview(user,item,rating,body=""){
  if(!user||!item)throw new Error("Login required");
  const {error}=await supabase.from("content_reviews").upsert({user_id:user.id,content_type:item.type,content_id:item.id,rating,body,updated_at:new Date().toISOString()},{onConflict:"user_id,content_type,content_id"});if(error)throw error;
}

export async function reportCommunityContent(user,item,reason){
  if(!item)throw new Error("Content not found");
  const {error}=await supabase.from("content_reports").insert({reporter_user_id:user?.id||null,content_type:item.type,content_id:item.id,reason});if(error)throw error;
}

export async function importCommunityItem(user,item){
  if(!backendEnabled||!user)throw new Error("Login required");
  if(item.type==="vocab"){
    const {data:set,error}=await supabase.from("vocab_sets")
      .select("id,name,vocab_words(word,stress,meaning,example,sort_order)")
      .eq("id",item.id).eq("visibility","public").single();
    if(error)throw error;
    const newId=`deck-${crypto.randomUUID()}`;
    const {error:ie}=await supabase.from("vocab_sets").insert({
      id:newId,user_id:user.id,name:`${set.name} · @${item.creator}`,visibility:"private"
    });
    if(ie)throw ie;
    const words=(set.vocab_words||[]).sort((a,b)=>a.sort_order-b.sort_order);
    if(words.length){
      const {error:we}=await supabase.from("vocab_words").insert(words.map((w,i)=>({
        set_id:newId,word:w.word,stress:w.stress,meaning:w.meaning,example:w.example,sort_order:i
      })));
      if(we)throw we;
    }
    await supabase.from("content_imports").upsert({user_id:user.id,content_type:"vocab",source_content_id:item.id,imported_content_id:newId},{onConflict:"user_id,content_type,source_content_id"});
    return;
  }
  const {data:set,error}=await supabase.from("practice_sets").select("*").eq("id",item.id).eq("visibility","public").single();
  if(error)throw error;
  const importedId=`${set.kind}-${crypto.randomUUID()}`;
  const {error:ie}=await supabase.from("practice_sets").insert({
    id:importedId,user_id:user.id,kind:set.kind,
    title:`${set.title} · @${item.creator}`,visibility:"private",payload:set.payload
  });
  if(ie)throw ie;
  await supabase.from("content_imports").upsert({user_id:user.id,content_type:"skill",source_content_id:item.id,imported_content_id:importedId},{onConflict:"user_id,content_type,source_content_id"});
}

export async function uploadAvatar(user,file){
  if(!backendEnabled||!user)throw new Error("Login required");
  const ext=(file.name.split(".").pop()||"png").toLowerCase();
  const path=`${user.id}/avatar.${ext}`;
  const {error}=await supabase.storage.from("avatars").upload(path,file,{upsert:true,contentType:file.type});
  if(error)throw error;
  const {data}=supabase.storage.from("avatars").getPublicUrl(path);
  const url=`${data.publicUrl}?v=${Date.now()}`;
  const {error:ue}=await supabase.from("profiles").update({avatar_url:url}).eq("user_id",user.id);
  if(ue)throw ue;
  return url;
}
