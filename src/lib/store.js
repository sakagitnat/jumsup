import { defaultWords,defaultReading,defaultListening,defaultWriting,defaultMocks } from "../data/defaultData.js";
const KEY="jumsup.production.v3";
const LEGACY_KEYS=["jumsup.production.v1","vantage.production.v1"];
if(!localStorage.getItem(KEY)){
  for(const k of LEGACY_KEYS){if(localStorage.getItem(k)){localStorage.setItem(KEY,localStorage.getItem(k));break}}
}
const initial=()=>({
 theme:"light",lang:"th",sound:true,lastCheckin:"",xp:0,streak:0,
 user:null,profile:null,subscription:null,payments:[],refunds:[],backend:false,syncing:false,
 activeDeckId:"deck-1",
 decks:[
  {id:"deck-1",name:"Core Vocabulary",visibility:"private",creator:"guest",words:defaultWords},
  {id:"deck-2",name:"Reading Words",visibility:"private",creator:"guest",words:defaultWords.slice(5,15)}
 ],
 progress:{},
 flashSettings:{loopSize:10,autoSpeak:false,showMeaning:true,shuffle:false},
 reading:defaultReading,listening:defaultListening,writing:defaultWriting,
 mocks:defaultMocks,
 community:[],communitySort:"popular",communityLikes:{},communityReviews:{},communityImportCounts:{}
});
function mergeSamples(saved){
 const base=initial(),next={...base,...saved,user:null,subscription:null,syncing:false};
 for(const key of ["reading","listening","writing","mocks"]){
  const existing=Array.isArray(next[key])?next[key]:[];
  next[key]=[...existing,...base[key].filter(sample=>!existing.some(item=>item.id===sample.id))];
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
