'use strict';
const WatchSettings=(()=>{
 const defaults=()=>({accent:'#bda1ff',background:'#11121b',panel:'#1d1f2f',columns:1,wide:true,sidebar:true,mode:'daily',time1:'21:00',time2:'09:00',days:[1],start:'',autoBackup:false,backupFrequency:'daily',backupFolder:'Key-Shelf-Backups'});
 function validate(input){
  const d=defaults(),s={...d,...input};
  for(const k of ['accent','background','panel'])if(!/^#[0-9a-f]{6}$/i.test(s[k]))throw Error('Choose valid colours.');
  if(![1,2,3,4].includes(s.columns))throw Error('Choose 1–4 listings per row.');
  for(const k of ['wide','sidebar','autoBackup'])if(typeof s[k]!=='boolean')throw Error('Invalid setting: '+k);
  if(!['daily','twiceDaily','weekly','twiceWeekly','custom','manual'].includes(s.mode))throw Error('Choose a schedule.');
  for(const k of ['time1','time2'])if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(s[k]))throw Error('Choose valid check times.');
  if(['twiceDaily','twiceWeekly'].includes(s.mode) && s.mode==='twiceDaily' && s.time1===s.time2)throw Error('Choose two different times.');
  if(!Array.isArray(s.days) || s.days.some(n=>!Number.isInteger(n)||n<0||n>6))throw Error('Invalid days.');
  s.days=[...new Set(s.days)].sort();
  if(s.mode==='weekly' && s.days.length!==1)throw Error('Choose exactly one weekday.');
  if(s.mode==='twiceWeekly' && s.days.length!==2)throw Error('Choose exactly two weekdays.');
  if(s.mode==='custom' && !s.days.length)throw Error('Choose at least one weekday.');
  if(s.start && (!/^\d{4}-\d{2}-\d{2}$/.test(s.start) || !Number.isFinite(Date.parse(s.start)) || new Date(s.start).toISOString().slice(0,10)!==s.start))throw Error('Choose a valid starting date.');
  if(!['daily','weekly'].includes(s.backupFrequency))throw Error('Invalid backup frequency.');
  s.backupFolder=s.backupFolder.trim();
  if(!/^[A-Za-z0-9 _-]{1,60}$/.test(s.backupFolder))throw Error('Use a folder name with letters, numbers, spaces, hyphens or underscores.');
  return Object.fromEntries(Object.keys(d).map(k=>[k,s[k]]));
 }
 function parts(now){return Object.fromEntries(new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Dublin',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(now).map(p=>[p.type,p.value]));}
 function due(s,now=new Date()){
  if(s.mode==='manual')return null;
  const p=parts(now),today=p.year+'-'+p.month+'-'+p.day,clock=p.hour+':'+p.minute;
  const date=new Date(today+'T12:00:00Z');
  const times=[...new Set(s.mode==='twiceDaily'?[s.time1,s.time2]:[s.time1])].sort().reverse();
  for(let i=0;i<8;i++){
   const key=date.toISOString().slice(0,10),weekday=date.getUTCDay();
   if((!s.start || key>=s.start) && (['daily','twiceDaily'].includes(s.mode)||s.days.includes(weekday))){
    for(const time of times)if(i>0 || time<=clock)return key+'T'+time;
   }
   date.setUTCDate(date.getUTCDate()-1);
  }
  return null;
 }
 function label(s){const names={daily:'Once a day',twiceDaily:'Twice a day',weekly:'Once a week',twiceWeekly:'Twice a week',custom:'Selected weekdays',manual:'Manual checks only'};return names[s.mode]+(s.mode==='manual'?'':' · '+s.time1+(s.mode==='twiceDaily'?' & '+s.time2:'')+' · Irish time');}
 return {defaults,validate,due,label};
})();

if(typeof module!=="undefined")module.exports=WatchSettings;
