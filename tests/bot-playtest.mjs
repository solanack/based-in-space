// End-to-end simulation playtest: normal intents only, no health/position/time mutation.
import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {createGame,step} from '../src/game/simulation.js';
import {saveGame} from '../src/persistence/save.js';
const results=[];
for(const mode of [0,1,2]){
 const g=createGame();
 for(let n=0;n<18000&&!['debrief','failed'].includes(g.phase);n++){
  const p=g.player,t=g.enemies.filter(e=>e.hp>0).sort((a,b)=>(a.role==='bomber'?-1:0)-(b.role==='bomber'?-1:0)||Math.hypot(a.position.x-p.position.x,a.position.z-p.position.z)-Math.hypot(b.position.x-p.position.x,b.position.z-p.position.z))[0];
  if(!t){step(g,{},1/60);continue;}
  const dx=t.position.x-p.position.x,dz=t.position.z-p.position.z,d=Math.hypot(dx,dz),lead=d/560,dy=t.position.y-p.position.y;
  const radial=d>450?.7:d<180?-.6:0,tangent=mode===0?.85:mode===1?1:.65;
  const incoming=g.projectiles.some(q=>q.kind==='enemyMissile'&&Math.hypot(q.position.x-p.position.x,q.position.z-p.position.z)<150);
  step(g,{moveX:dx/(d||1)*radial-dz/(d||1)*tangent,moveY:dz/(d||1)*radial+dx/(d||1)*tangent,aimX:dx+t.velocity.x*lead,aimY:dz+t.velocity.z*lead,altitude:Math.max(-1,Math.min(1,Math.atan2(dy,d)/.4)),fire:true,missile:n%100<50,boost:incoming||mode===1&&n%360<80,countermeasure:incoming&&n%10===0},1/60);
 }
 const storage={data:new Map(),getItem(k){return this.data.get(k)},setItem(k,v){this.data.set(k,v)}};
 const profile=saveGame(g,storage);
 assert.equal(g.phase,'debrief');assert.ok(g.kills>=6);assert.ok(profile.credits>0);assert.ok(g.base.some(b=>b.hp>0));
 results.push({mode,phase:g.phase,time:g.time,hp:g.player.hp,kills:g.kills,score:g.score,credits:profile.credits,base:g.base.map(b=>({id:b.id,hp:b.hp}))});
}
writeFileSync('artifacts/bot-playtest.json',JSON.stringify({method:'fixed60Hz normal intents; three deterministic steering policies; no cheats',results},null,2));
console.log(JSON.stringify(results));
