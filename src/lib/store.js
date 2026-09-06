const KEY="jumsup.production.v4";
const LEGACY_KEYS=["jumsup.production.v1","vantage.production.v1"];
if(!localStorage.getItem(KEY)){
  for(const k of LEGACY_KEYS){if(localStorage.getItem(k)){localStorage.setItem(KEY,localStorage.getItem(k));break}}
}
// Official seed content (vocab decks + practice sets) is code-split and applied
// after boot via applyOfficialContent() — see main.tsx. The app renders before
// this lands, so `contentLoaded` lets screens show a skeleton for the brief gap.
//
// Only a small curated "starter" subset of the official vocab decks is merged
// into a user's own Flashcard list by default; the full catalog (all official
// decks and practice sets) lives in `officialCatalog` for Community browsing
// only and is never merged into `decks`/`reading`/`listening`/`writing`/`mocks`
// — those arrays are the user's own content.
let official={starterDecks:[],decks:[],reading:[],listening:[],writing:[],mocks:[]};
const initial=()=>({
 theme:"light",lang:"th",sound:true,lastCheckin:"",xp:0,streak:0,
 contentLoaded:official.decks.length>0,
 user:null,profile:null,subscription:null,payments:[],refunds:[],backend:false,syncing:false,
 decks:official.starterDecks.map(d=>({...d,sourceType:"official"})),
 progress:{},
 srs:{},
 examTargets:[],
 practiceHistory:[],
 flashSettings:{loopSize:10,autoSpeak:false,shuffle:false,voiceURI:"",rate:0.9},
 reading:[],listening:[],writing:[],mocks:[],
 officialCatalog:official,
 community:[],communitySort:"popular",communityLikes:{},communityReviews:{},communityImportCounts:{}
});
function mergeSamples(saved){
 const base=initial(),next={...base,...saved,user:null,subscription:null,syncing:false,contentLoaded:official.decks.length>0,officialCatalog:official};
 const retiredDeckIds=new Set(["deck-1","deck-2","core-vocabulary","reading-words","jumsup-tcas-frequent","jumsup-tcas-should-know"]);
 const savedDecks=(Array.isArray(next.decks)?next.decks:[]).filter(deck=>{
  if(retiredDeckIds.has(deck?.id))return false;
  if(deck?.creator==="Jumsup Official"&&!base.decks.some(sample=>sample.id===deck.id))return false;
  return true;
 });
 const starters=base.decks.map(sample=>{
  const savedDeck=savedDecks.find(deck=>deck.id===sample.id);
  // Official starter decks always track the shipped content — users can't edit
  // them, and review progress lives in `srs`/`progress` keyed by word, not here.
  return {...sample,...savedDeck,words:sample.words,sourceType:"official"};
 });
 next.decks=[...starters,...savedDecks.filter(deck=>!starters.some(sample=>sample.id===deck.id))];
 for(const key of ["reading","listening","writing","mocks"]){
  const existing=(Array.isArray(next[key])?next[key]:[]).filter(item=>{
   const official=item?.creator==="Jumsup Official";
   const legacy=/^(reading|listening|writing|mock)(-alevel|-parallel)|^mock-parallel-1$/.test(item?.id||"");
   return !official&&!legacy;
  });
  next[key]=existing;
 }
 return next;
}
let state=(()=>{try{return mergeSamples(JSON.parse(localStorage.getItem(KEY)||"{}"))}catch{return initial()}})();
const listeners=new Set();
function persist(){const copy={...state,user:null,subscription:null,syncing:false};delete copy.contentLoaded;delete copy.officialCatalog;localStorage.setItem(KEY,JSON.stringify(copy))}
export const store={
 get:()=>state,
 set(patch){state={...state,...patch};persist();listeners.forEach(fn=>fn(state))},
 update(fn){state=fn(state);persist();listeners.forEach(fn=>fn(state))},
 replace(next){const merged=mergeSamples(next);state={...merged,user:next.user||null,profile:next.profile||merged.profile,subscription:next.subscription||null,payments:next.payments||[],refunds:next.refunds||[],backend:!!next.backend,syncing:!!next.syncing};persist();listeners.forEach(fn=>fn(state))},
 reset(){state=initial();persist();listeners.forEach(fn=>fn(state))},
 subscribe(fn){listeners.add(fn);return()=>listeners.delete(fn)}
};

/** Feed in the code-split official seed content, then re-merge it into the live
 *  state (keeping the user's own decks, progress and practice sets). Called once
 *  at boot from main.tsx before the app renders. */
export function applyOfficialContent(content){
 official={
  starterDecks:content.coreDecks||[],
  decks:content.officialVocabDecks||[],
  reading:content.defaultReading||[],
  listening:content.defaultListening||[],
  writing:content.defaultWriting||[],
  mocks:content.defaultMocks||[],
 };
 state=mergeSamples(state);
 persist();
 listeners.forEach(fn=>fn(state));
}
