import { supabase,backendEnabled } from "./supabase.js";
import { api } from "./api.js";

const ownCreator=p=>p?.username||"user";

export async function loadCloudState(user){
  if(!backendEnabled||!user)return null;

  const [{data:profile,error:pe},{data:sets,error:se},{data:practice,error:pre},{data:progress,error:proe},{data:subscription,error:sue},{data:payments,error:payE},{data:refunds,error:refE},{data:attempts,error:atE},{data:examTargetRows,error:etE}]=await Promise.all([
    supabase.from("profiles").select("*").eq("user_id",user.id).single(),
    supabase.from("vocab_sets").select("id,name,visibility,source_type,exam,skill,level,user_id,created_at,updated_at,vocab_words(id,word,stress,meaning,example,sort_order)").eq("user_id",user.id).order("created_at"),
    supabase.from("practice_sets").select("*").eq("user_id",user.id).order("created_at"),
    supabase.from("learning_progress").select("*").eq("user_id",user.id),
    supabase.from("subscriptions").select("*").eq("user_id",user.id).maybeSingle(),
    supabase.from("payment_events").select("id,kind,amount,currency,status,created_at").eq("user_id",user.id).order("created_at",{ascending:false}).limit(20),
    supabase.from("refund_requests").select("id,payment_event_id,reason,status,requested_amount,cancel_subscription,admin_note,requested_at,reviewed_at,completed_at").eq("user_id",user.id).order("requested_at",{ascending:false}).limit(20),
    supabase.from("practice_attempts").select("id,kind,set_id,set_title,total,correct,percent,seconds,taken_at").eq("user_id",user.id).order("taken_at",{ascending:false}).limit(200),
    supabase.from("exam_targets").select("id,name,exam_date,sort_order").eq("user_id",user.id).order("sort_order")
  ]);
  if(pe)throw pe;if(se)throw se;if(pre)throw pre;if(proe)throw proe;if(sue)throw sue;if(payE)throw payE;if(refE)throw refE;if(atE)throw atE;if(etE)throw etE;

  const decks=(sets||[]).map(s=>({
    id:s.id,name:s.name,visibility:s.visibility,sourceType:s.source_type||"own",creator:ownCreator(profile),
    exam:s.exam||"",skill:s.skill||"",level:s.level||"",
    words:(s.vocab_words||[]).sort((a,b)=>a.sort_order-b.sort_order).map(w=>({
      w:w.word,stress:w.stress||"",p:"",m:w.meaning||"",e:w.example||""
    }))
  }));
  const grouped={reading:[],listening:[],writing:[],mocks:[]};
  for(const x of practice||[]){
    const item={id:x.id,title:x.title,visibility:x.visibility,creator:ownCreator(profile),exam:x.exam||"",skill:x.skill||"",level:x.level||"",...(x.payload||{})};
    if(x.kind==="mock")grouped.mocks.push(item);else grouped[x.kind].push(item);
  }
  const progressMap={};
  for(const p of progress||[])progressMap[p.set_id]={mastered:p.mastered_indices||[]};

  const practiceHistory=(attempts||[]).map(a=>({
    id:a.id,kind:a.kind,setId:a.set_id,title:a.set_title||"",
    total:a.total||0,correct:a.correct||0,percent:a.percent||0,seconds:a.seconds||0,
    takenAt:a.taken_at
  }));

  const examTargets=(examTargetRows||[]).map(t=>({
    id:t.id,name:t.name||"",date:t.exam_date||null,sortOrder:t.sort_order||0
  }));

  return {
    user,
    profile,
    subscription:subscription||null,
    payments:payments||[],
    refunds:refunds||[],
    decks,
    ...grouped,
    progress:progressMap,
    practiceHistory,
    examTargets,
    xp:profile?.xp||0,
    streak:profile?.streak||0,
    lastCheckin:profile?.last_checkin||""
  };
}

export async function loadWeeklyLeaderboard(limit=20){
  if(!backendEnabled)return {weekStart:"",top:[],me:null};
  const {data,error}=await supabase.rpc("weekly_leaderboard",{p_limit:limit});
  if(error)throw error;
  return {
    weekStart:data?.week_start||"",
    top:(data?.top||[]).map(r=>({username:r.username||"ผู้เรียน",xp:r.xp||0,rank:r.rank||0,isMe:!!r.is_me})),
    me:data?.me?{xp:data.me.xp||0,rank:data.me.rank||0}:null
  };
}

export async function saveExamTargets(user,targets){
  if(!backendEnabled||!user)return [];
  const {error:delErr}=await supabase.from("exam_targets").delete().eq("user_id",user.id);
  if(delErr)throw delErr;
  const rows=(targets||[])
    .map(t=>({name:String(t.name||"").trim().slice(0,80),exam_date:t.date||null}))
    .filter(t=>t.name);
  if(!rows.length)return [];
  const {data,error}=await supabase.from("exam_targets")
    .insert(rows.map((r,i)=>({user_id:user.id,name:r.name,exam_date:r.exam_date,sort_order:i})))
    .select("id,name,exam_date,sort_order");
  if(error)throw error;
  return (data||[]).map(t=>({id:t.id,name:t.name,date:t.exam_date||null,sortOrder:t.sort_order||0}));
}

export async function savePracticeAttempt(user,rec){
  if(!backendEnabled||!user)return null;
  const {data,error}=await supabase.from("practice_attempts").insert({
    user_id:user.id,kind:rec.kind,set_id:rec.setId,set_title:rec.title||"",
    total:rec.total|0,correct:rec.correct|0,percent:rec.percent|0,seconds:rec.seconds|0
  }).select("id,taken_at").single();
  if(error)throw error;
  return data;
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

  // Official catalog items are read-only application data. Never copy their
  // global IDs into a user's private namespace or count them against quotas.
  const syncDecks=(state.decks||[]).filter(deck=>!deck.official);
  const remoteDeckIds=syncDecks.map(d=>d.id);
  const {data:existingSets,error:ese}=await supabase.from("vocab_sets").select("id").eq("user_id",user.id);
  if(ese)throw ese;
  const deleted=(existingSets||[]).map(x=>x.id).filter(id=>!remoteDeckIds.includes(id));
  if(deleted.length){
    const {error}=await supabase.from("vocab_sets").delete().in("id",deleted).eq("user_id",user.id);
    if(error)throw error;
  }
  for(const deck of syncDecks){
    const {error}=await supabase.from("vocab_sets").upsert({
      id:deck.id,user_id:user.id,name:deck.name,visibility:deck.visibility||"private",source_type:deck.sourceType||"own",
      exam:deck.exam||null,skill:deck.skill||null,level:deck.level||null,
      updated_at:new Date().toISOString()
    },{onConflict:"id"});
    if(error)throw error;
    await replaceWords(user.id,deck);
  }

  const allPractice=[
    ...(state.reading||[]).filter(x=>!x.official).map(x=>["reading",x]),
    ...(state.listening||[]).filter(x=>!x.official).map(x=>["listening",x]),
    ...(state.writing||[]).filter(x=>!x.official).map(x=>["writing",x]),
    ...(state.mocks||[]).filter(x=>!x.official).map(x=>["mock",x])
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
    delete payload.exam;delete payload.skill;delete payload.level;
    const {error}=await supabase.from("practice_sets").upsert({
      id:item.id,user_id:user.id,kind,title:item.title,visibility:item.visibility||"private",payload,
      exam:item.exam||null,skill:item.skill||null,level:item.level||null,
      updated_at:new Date().toISOString()
    },{onConflict:"id"});
    if(error)throw error;
  }

  for(const [setId,p] of Object.entries(state.progress||{})){
    const {error}=await supabase.rpc("sync_learning_progress",{p_set_id:setId,p_indices:p.mastered||[]});
    if(error && !String(error.message).toLowerCase().includes("forbidden"))throw error;
  }

  // Only anonymous word/meaning pairs enter the review queue. Names, emails,
  // deck titles and examples are deliberately excluded.
  const target=state.lang==="en"?"th":state.lang||"th";
  const dictionaryItems=(state.decks||[]).flatMap(deck=>deck.words||[])
    .filter(word=>String(word?.w||"").trim()&&String(word?.m||"").trim())
    .map(word=>({word:String(word.w).trim(),meaning:String(word.m).trim(),target}));
  if(dictionaryItems.length){
    try{await api("/api/dictionary/suggest",{method:"POST",body:JSON.stringify({items:dictionaryItems.slice(0,1000)})})}
    catch(error){console.warn("Dictionary queue sync failed",error)}
  }
}

export async function loadCommunity(query="",type="vocab"){
  if(!backendEnabled)return [];
  if(type==="vocab"){
    let q=supabase.from("vocab_sets")
      .select("id,name,user_id,visibility,exam,skill,level,profiles!vocab_sets_user_id_fkey(username),vocab_words(id)")
      .eq("visibility","public").eq("moderation_status","visible").limit(40);
    if(query)q=q.ilike("name",`%${query}%`);
    const {data,error}=await q;
    if(error)throw error;
    return withCommunityMetrics((data||[]).map(x=>({
      id:x.id,type:"vocab",title:x.name,creator:x.profiles?.username||"member",
      count:x.vocab_words?.length||0,visibility:"public",
      exam:x.exam||"",skill:x.skill||"",level:x.level||""
    })),"vocab");
  }
  let q=supabase.from("practice_sets")
    .select("id,title,kind,user_id,visibility,exam,skill,level,payload,profiles!practice_sets_user_id_fkey(username)")
    .eq("visibility","public").eq("moderation_status","visible").limit(40);
  if(query)q=q.ilike("title",`%${query}%`);
  const {data,error}=await q;
  if(error)throw error;
  return withCommunityMetrics((data||[]).map(x=>({
    id:x.id,type:"skill",kind:x.kind,title:x.title,creator:x.profiles?.username||"member",
    count:x.payload?.itemCount||1,visibility:"public",
    exam:x.exam||"",skill:x.skill||"",level:x.level||""
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
  // idempotent: a stale item.liked=false must not blow up if the row already exists
  const {error}=await supabase.from("content_likes").upsert(key,{onConflict:"user_id,content_type,content_id",ignoreDuplicates:true});
  if(error)throw error;return true;
}

export async function saveCommunityReview(user,item,rating,body="",anonymous=false){
  if(!user||!item)throw new Error("Login required");
  const {error}=await supabase.from("content_reviews").upsert({user_id:user.id,content_type:item.type,content_id:item.id,rating,body,anonymous:!!anonymous,updated_at:new Date().toISOString()},{onConflict:"user_id,content_type,content_id"});if(error)throw error;
}

export async function deleteCommunityReview(user,item){
  if(!user||!item)throw new Error("Login required");
  const {error}=await supabase.from("content_reviews").delete()
    .match({user_id:user.id,content_type:item.type,content_id:item.id});
  if(error)throw error;
}

export async function loadContentReviews(type,id,sort="recent"){
  if(!backendEnabled)return [];
  const {data,error}=await supabase.rpc("get_content_reviews",{p_type:type,p_id:id,p_sort:sort});
  if(error)throw error;
  return (data||[]).map(r=>({
    id:r.id,
    rating:r.rating,body:r.body||"",anonymous:!!r.anonymous,
    createdAt:r.created_at,updatedAt:r.updated_at,
    isMine:!!r.is_mine,displayName:r.display_name||"",
    helpfulCount:r.helpful_count||0,helpfulByMe:!!r.helpful_by_me,
    imported:!!r.imported,
    creatorReply:r.creator_reply||"",creatorRepliedAt:r.creator_replied_at||null
  }));
}

export async function toggleReviewHelpful(reviewId){
  if(!backendEnabled)return 0;
  const {data,error}=await supabase.rpc("toggle_review_helpful",{p_review_id:reviewId});
  if(error)throw error;
  return data||0;
}

export async function replyToReview(reviewId,reply){
  if(!backendEnabled)return;
  const {error}=await supabase.rpc("reply_to_review",{p_review_id:reviewId,p_reply:reply});
  if(error)throw error;
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
      id:newId,user_id:user.id,name:`${set.name} · @${item.creator}`,visibility:"private",source_type:"community"
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


export async function loadCommunityPreview(item){
  if(!backendEnabled||!item)return null;
  if(item.type==="vocab"){
    const {data,error}=await supabase.from("vocab_sets")
      .select("id,name,vocab_words(word,stress,meaning,example,sort_order)")
      .eq("id",item.id).eq("visibility","public").single();
    if(error)throw error;
    return {
      type:"vocab",
      title:data.name,
      words:(data.vocab_words||[]).sort((a,b)=>a.sort_order-b.sort_order)
        .map(w=>({w:w.word,p:w.stress||"",m:w.meaning||"",e:w.example||""}))
    };
  }
  const {data,error}=await supabase.from("practice_sets")
    .select("id,title,kind,payload").eq("id",item.id).eq("visibility","public").single();
  if(error)throw error;
  return {type:"skill",kind:data.kind,title:data.title,...(data.payload||{})};
}

export async function loadPublicSet(kind,id){
  if(!backendEnabled)return null;
  if(kind==="vocab"){
    const {data,error}=await supabase.from("vocab_sets")
      .select("id,name,exam,skill,level,profiles!vocab_sets_user_id_fkey(username),vocab_words(word,stress,meaning,example,sort_order)")
      .eq("id",id).eq("visibility","public").single();
    if(error)throw error;
    return {type:"vocab",id:data.id,title:data.name,creator:data.profiles?.username||"member",
      exam:data.exam||"",skill:data.skill||"",level:data.level||"",
      words:(data.vocab_words||[]).sort((a,b)=>a.sort_order-b.sort_order)
        .map(w=>({w:w.word,p:w.stress||"",m:w.meaning||"",e:w.example||""}))};
  }
  const {data,error}=await supabase.from("practice_sets")
    .select("id,title,kind,exam,skill,level,payload,profiles!practice_sets_user_id_fkey(username)")
    .eq("id",id).eq("visibility","public").single();
  if(error)throw error;
  return {type:"skill",id:data.id,kind:data.kind,title:data.title,creator:data.profiles?.username||"member",
    exam:data.exam||"",skill:data.skill||"",level:data.level||"",...(data.payload||{})};
}

export async function loadCreatorSets(username){
  if(!backendEnabled||!username)return {vocab:[],skill:[]};
  const [{data:v,error:ve},{data:p,error:pe}]=await Promise.all([
    supabase.from("vocab_sets")
      .select("id,name,exam,level,vocab_words(id),profiles!vocab_sets_user_id_fkey!inner(username)")
      .eq("visibility","public").eq("moderation_status","visible")
      .eq("profiles.username",username).limit(60),
    supabase.from("practice_sets")
      .select("id,title,kind,exam,level,payload,profiles!practice_sets_user_id_fkey!inner(username)")
      .eq("visibility","public").eq("moderation_status","visible")
      .eq("profiles.username",username).limit(60)
  ]);
  if(ve)throw ve;if(pe)throw pe;
  const {data:prof}=await supabase.from("profiles").select("display_name").eq("username",username).maybeSingle();
  return {
    displayName:(prof?.display_name||"").trim()||`@${username}`,
    handle:username,
    vocab:(v||[]).map(x=>({id:x.id,title:x.name,count:x.vocab_words?.length||0,exam:x.exam||"",level:x.level||""})),
    skill:(p||[]).map(x=>({id:x.id,title:x.title,kind:x.kind,count:x.payload?.itemCount||0,exam:x.exam||"",level:x.level||""}))
  };
}
