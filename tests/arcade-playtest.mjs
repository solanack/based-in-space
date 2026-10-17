import {writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {createGame,step} from '../src/game/simulation.js';
import {angleDelta} from '../src/game/math.js';
const results=[];
for(const brakeAngle of [1,1.2,1.4]){
 const g=createGame();let evadeUntil=0;
 for(let n=0;n<14400&&!['debrief','failed'].includes(g.phase);n++){
  const p=g.player;if(p.shield<15&&g.time>evadeUntil+5)evadeUntil=g.time+10;if(g.time<evadeUntil){step(g,{flightMode:'arcade',turn:.12,climb:0,boost:true,countermeasure:n%15===0},1/60);continue;}const t=g.enemies.filter(e=>e.hp>0).sort((a,b)=>(a.role==='bomber'?-1:0)-(b.role==='bomber'?-1:0)||Math.hypot(a.position.x-p.position.x,a.position.z-p.position.z)-Math.hypot(b.position.x-p.position.x,b.position.z-p.position.z))[0];
  if(!t){step(g,{flightMode:'arcade'},1/60);continue;}
  const dx=t.position.x-p.position.x,dz=t.position.z-p.position.z,dy=t.position.y-p.position.y,d=Math.hypot(dx,dz),lead=Math.min(1,d/560),err=angleDelta(p.heading,Math.atan2(dx+t.velocity.x*lead,dz+t.velocity.z*lead));
  const incoming=g.projectiles.some(q=>q.kind==='enemyMissile'&&Math.hypot(q.position.x-p.position.x,q.position.z-p.position.z)<180);
  step(g,{flightMode:'arcade',turn:Math.max(-1,Math.min(1,-err/.65)),climb:Math.max(-1,Math.min(1,Math.atan2(dy+t.velocity.y*lead,d)/.58)),brake:Math.abs(err)>brakeAngle,boost:d>700||incoming,fire:true,missile:n%100<50,countermeasure:incoming&&n%10===0},1/60);
 }
 results.push({brakeAngle,phase:g.phase,time:g.time,hp:g.player.hp,kills:g.kills,score:g.score});
}
writeFileSync('artifacts/arcade-playtest.json',JSON.stringify({method:'Normal flight-mode intents only; no entity/time/health mutation; outcomes include losses',results},null,2));
console.log(JSON.stringify(results));assert.ok(results.some(r=>r.phase==='debrief'),'At least one pursuit policy must complete the arcade flight sortie');
