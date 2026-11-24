'use strict';
const $=id=>document.getElementById(id);
async function update(){const {state,run}=await browser.runtime.sendMessage({type:'state'});$('games').textContent=state.games.length;$('changes').textContent=state.events.filter(e=>!e.read).length;$('status').textContent=run?.message||'Ready · five stores, separate editions';$('progress').max=run?.total||1;$('progress').value=run?.done||0;$('check').disabled=!!run?.active;$('stop').hidden=!run?.active;}
$('open').onclick=()=>browser.runtime.sendMessage({type:'open'});$('check').onclick=async()=>{await browser.runtime.sendMessage({type:'scan'});await update();};$('stop').onclick=()=>browser.runtime.sendMessage({type:'stop'});browser.runtime.onMessage.addListener(m=>{if(m.type==='progress')update();});update();
