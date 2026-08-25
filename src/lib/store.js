import { frequentExamWords,shouldKnowWords,defaultReading,defaultListening,defaultWriting,defaultMocks } from "../data/defaultData.js";
const KEY="jumsup.production.v4";
const LEGACY_KEYS=["jumsup.production.v1","vantage.production.v1"];
if(!localStorage.getItem(KEY)){
  for(const k of LEGACY_KEYS){if(localStorage.getItem(k)){localStorage.setItem(KEY,localStorage.getItem(k));break}}
}
const initial=()=>({
 theme:"light",lang:"th",sound:true,lastCheckin:"",xp:0,streak:0,
 user:null,profile:null,subscription:null,payments:[],refunds:[],backend:false,syncing:false,
 activeDeckId:"deck-1",
 decks:[
  {id:"jumsup-tcas-frequent",name:"TCAS English · ออกบ่อย",visibility:"public",creator:"Jumsup Official",official:true,words:frequentExamWords},
  {id:"jumsup-tcas-should-know",name:"TCAS English · ควรรู้",visibility:"public",creator:"Jumsup Official",official:true,words:shouldKnowWords}
 ],
 progress:{},
 flashSettings:{loopSize:10,autoSpeak:false,showMeaning:true,shuffle:false},
 reading:defaultReading,listening:defaultListening,writing:defaultWriting,
 mocks:defaultMocks,
 community:[],communitySort:"popular",communityLikes:{},communityReviews:{},communityImportCounts:{}
});
function mergeSamples(saved){
 const base=initial(),next={...base,...saved,user:null,subscription:null,syncing:false};
 const retiredDeckIds=new Set(["deck-1","deck-2","core-vocabulary","reading-words"]);
 const savedDecks=(Array.isArray(next.decks)?next.decks:[]).filter(deck=>{
  if(retiredDeckIds.has(deck?.id))return false;
  if(deck?.creator==="Jumsup Official"&&!base.decks.some(sample=>sample.id===deck.id))return false;
  return true;
 });
 const starters=base.decks.map(sample=>{
  const savedDeck=savedDecks.find(deck=>deck.id===sample.id);
  return savedDeck?.words?.length?savedDeck:{...sample,...savedDeck,words:sample.words};
 });
 next.decks=[...starters,...savedDecks.filter(deck=>!starters.some(sample=>sample.id===deck.id))];
 for(const key of ["reading","listening","writing","mocks"]){
  const existing=(Array.isArray(next[key])?next[key]:[]).filter(item=>{
   const official=item?.creator==="Jumsup Official";
   const legacy=/^(reading|listening|writing|mock)(-alevel|-parallel)|^mock-parallel-1$/.test(item?.id||"");
   return !official&&!legacy;
  });
  next[key]=[...base[key],...existing.filter(item=>!base[key].some(sample=>sample.id===item.id))];
 }
 return next;
}
let state=(()=>{try{return mergeSamples(JSON.parse(localStorage.getItem(KEY)||"{}"))}catch{return initial()}})();
const listeners=new Set();
function persist(){const copy={...state,user:null,subscription:null,syncing:false};localStorage.setItem(KEY,JSON.stringify(copy))}
export const store={
 get:()=>state,
 set(patch){state={...state,...patch};persist();listeners.forEach(fn=>fn(state))},
 update(fn){state=fn(state);persist();listeners.forEach(fn=>fn(state))},
 replace(next){state={...initial(),...next};persist();listeners.forEach(fn=>fn(state))},
 reset(){state=initial();persist();listeners.forEach(fn=>fn(state))},
 subscribe(fn){listeners.add(fn);return()=>listeners.delete(fn)}
};

