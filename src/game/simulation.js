import {clamp,vec,copy,sub,add,scale,dot,length,distance,normalize,angleDelta,forward,sweptSphere,turnToward,sphereImpactTime} from './math.js';
import {arcadeVelocity} from '../flight/arcade.js';
import {migrateSave} from '../persistence/save.js';

export const TUNING=Object.freeze({speed:115,boostSpeed:330,brakeSpeed:35,acceleration:5,altitudeSpeed:65,maxAltitude:310,minClearance:8,playerRadius:5,projectileLimit:256,enemyLimit:32,effectLimit:80,eventLimit:64,lockTime:.65,lockRange:900,missileTurn:2.2,enemyMissileTurn:1.3,siegeDuration:75});
export const WEAPONS=Object.freeze({pulse:{speed:560,damage:11,cooldown:.105,heat:8,radius:3,life:2.2},missile:{speed:245,damage:100,cooldown:1.1,radius:6,life:7},enemy:{speed:175,damage:12,radius:4,life:6},enemyMissile:{speed:215,damage:24,radius:5,life:7}});
export function terrainHeight(x,z){
 const flat=1-Math.exp(-(x*x+z*z)/70000);
 const ridges=14*Math.sin(x*.004)+10*Math.sin(z*.006)+7*Math.sin((x+z)*.009);
 const crater=-34*Math.exp(-((x-850)**2+(z-500)**2)/100000)+13*Math.exp(-(((Math.hypot(x-850,z-500)-350)/65)**2));
 const canyon=-28*Math.exp(-(((x+500+100*Math.sin(z*.002))/100)**2));
 return flat*(ridges+crater+canyon);
}
function event(g,type,position){g.events.push({id:++g._eventId,type,position:copy(position||g.player.position)});if(g.events.length>TUNING.eventLimit)g.events.shift();}
function effect(g,kind,position,life=.6){if(g.effects.length>=TUNING.effectLimit)g.effects.shift();g.effects.push({id:++g._id,kind,position:copy(position),life,maxLife:life});}
function projectile(g,owner,kind,position,direction,targetId=null){
 if(g.projectiles.length>=TUNING.projectileLimit)return;
 const w=WEAPONS[kind]||WEAPONS.enemy;
 g.projectiles.push({id:++g._id,position:copy(position),previous:copy(position),velocity:scale(normalize(direction),w.speed),owner,kind,life:w.life,targetId});
}
export function createGame(save){
 const profile=migrateSave(save),position=vec(0,80,-190);
 const player={position,previous:copy(position),velocity:vec(),heading:0,pitch:0,hp:100+profile.upgrades.hull*20,maxHp:100+profile.upgrades.hull*20,shield:80+profile.upgrades.shield*15,maxShield:80+profile.upgrades.shield*15,heat:0,missiles:8,boostEnergy:100,countermeasures:4,overheated:false};
 const g={time:0,player,enemies:[],projectiles:[],effects:[],events:[],base:[['reactor','REACTOR',0,0,260],['comms','COMMS',-70,20,180],['hangar','HANGAR',70,20,220],['fuel','FUEL DEPOT',0,90,160]].map(([id,name,x,z,hp])=>({id,name,position:vec(x,terrainHeight(x,z)+12,z),hp,maxHp:hp,radius:22})),phase:'patrol',score:0,kills:0,lock:{targetId:null,progress:0,ready:false},objective:'PATROL // Approach Moonfall outpost',origin:vec(),save:profile,_id:0,_eventId:0,_shot:0,_missileCooldown:0,_cmCooldown:0,_damageTime:-100,_heldMissile:false,_heldCM:false,_siegeStart:0,_wave:0,_spawnTime:0,_turretTime:0};
 spawnEnemy(g,'scout',vec(-150,105,330));spawnEnemy(g,'scout',vec(160,150,440));spawnEnemy(g,'interceptor',vec(0,130,600));
 event(g,'start');return g;
}
export function spawnEnemy(g,role='scout',position){
 if(g.enemies.length>=TUNING.enemyLimit)return null;
 const i=++g._id,hp=role==='bomber'?150:role==='interceptor'?75:48;
 const p=position||vec(Math.sin(i*2.4)*800,100+(i%4)*35,Math.cos(i*2.4)*800);
 const e={id:i,role,position:copy(p),previous:copy(p),home:copy(p),lastSeen:null,lastSeenTime:-100,velocity:vec(),heading:0,pitch:0,hp,maxHp:hp,state:'pursuit',radius:role==='bomber'?14:8,cooldown:1.2+i%3,telegraph:0,attackCount:0};g.enemies.push(e);return e;
}
function damagePlayer(g,amount){
 const p=g.player,absorbed=Math.min(p.shield,amount);p.shield-=absorbed;p.hp=Math.max(0,p.hp-(amount-absorbed));g._damageTime=g.time;event(g,'player-hit');
}
function damageEnemy(g,e,amount){
 if(e.hp<=0)return;e.hp-=amount;effect(g,'hit',e.position,.18);
 if(e.hp<=0){g.kills++;g.score+=e.role==='bomber'?400:150;effect(g,'explosion',e.position,1);event(g,'enemy-destroyed',e.position);}
}
function updatePlayer(g,i,dt){
 const p=g.player;p.previous=copy(p.position);
 const mx=clamp(Number(i.moveX)||0,-1,1),mz=clamp(Number(i.moveY)||0,-1,1),mag=Math.min(1,Math.hypot(mx,mz));
 const arcade=i.flightMode==='arcade';
 const boosting=!!i.boost&&p.boostEnergy>2&&(arcade||mag>.05);
 p.boostEnergy=clamp(p.boostEnergy+(boosting?-28:19)*dt,0,100);
 const speed=(i.brake?TUNING.brakeSpeed:boosting?TUNING.boostSpeed:TUNING.speed)*(1+.045*g.save.upgrades.engines);
 const horizontal=Math.hypot(mx,mz)||1,desired=arcade?arcadeVelocity(p,i,dt,speed,p.position.y-terrainHeight(p.position.x,p.position.z)):vec(mx/horizontal*speed*mag,clamp(Number(i.altitude)||0,-1,1)*TUNING.altitudeSpeed,mz/horizontal*speed*mag);
 const response=1-Math.exp(-(arcade?12:TUNING.acceleration)*dt);
 p.velocity=add(p.velocity,scale(sub(desired,p.velocity),response));p.position=add(p.position,scale(p.velocity,dt));
 if(!arcade&&mag>.05)p.heading+=angleDelta(p.heading,Math.atan2(mx,mz))*(1-Math.exp(-8*dt));
 if(!arcade){const targetPitch=clamp((Number(i.altitude)||0)*.4,-.55,.55);p.pitch+=(targetPitch-p.pitch)*(1-Math.exp(-5*dt));}
 const travel=sub(p.position,p.previous),samples=Math.max(1,Math.ceil(length(travel)/5));
 for(let n=1;n<=samples;n++){const point=add(p.previous,scale(travel,n/samples)),floor=terrainHeight(point.x,point.z)+TUNING.minClearance;if(point.y<floor){p.position=vec(point.x,floor,point.z);p.velocity.y=Math.max(0,p.velocity.y);damagePlayer(g,22*dt);if(g.time-g._terrainEvent>.5||!g._terrainEvent){event(g,'terrain-hit');g._terrainEvent=g.time;}break;}}
 p.position.y=Math.min(TUNING.maxAltitude,p.position.y);
 let impact=null;
 for(const b of g.base){if(b.hp<=0)continue;const t=sphereImpactTime(p.previous,p.position,b.position,b.radius+TUNING.playerRadius);if(t!==null&&(!impact||t<impact.t))impact={b,t};}
 if(impact){const point=add(p.previous,scale(sub(p.position,p.previous),impact.t)),normal=normalize(sub(point,impact.b.position));p.position=add(impact.b.position,scale(length(normal)>.01?normal:vec(0,1,0),impact.b.radius+TUNING.playerRadius+.01));p.velocity=scale(p.velocity,.25);damagePlayer(g,12*dt);}
 p.heat=Math.max(0,p.heat-23*dt);if(p.heat<25)p.overheated=false;
 if(g.time-g._damageTime>4)p.shield=Math.min(p.maxShield,p.shield+10*dt);
 const aimMag=Math.hypot(i.aimX||0,i.aimY||0),aimHeading=!arcade&&aimMag>.15?Math.atan2(i.aimX,i.aimY):p.heading;
 p.aimHeading=aimHeading;p.aimDirection=forward(aimHeading,p.pitch);
 if(arcade&&i.assist!==false){const target=g.enemies.filter(e=>e.hp>0&&distance(e.position,p.position)<650&&dot(normalize(sub(e.position,p.position)),p.aimDirection)>.97&&lineOfSight(p.position,e.position)).sort((a,b)=>distance(a.position,p.position)-distance(b.position,p.position))[0];if(target){const lead=add(target.position,scale(target.velocity,Math.min(1,distance(target.position,p.position)/WEAPONS.pulse.speed)));p.aimDirection=turnToward(p.aimDirection,sub(lead,p.position),.12);}}
 g._shot-=dt;g._missileCooldown-=dt;g._cmCooldown-=dt;
 if(i.fire&&g._shot<=0&&!p.overheated){const socketForward=forward(aimHeading,p.pitch),right=vec(Math.cos(aimHeading),0,-Math.sin(aimHeading)),up=vec(-Math.sin(aimHeading)*Math.sin(p.pitch),Math.cos(p.pitch),-Math.cos(aimHeading)*Math.sin(p.pitch));for(const side of [-1,1]){const muzzle=add(add(add(p.position,scale(socketForward,2.07*3.2)),scale(right,side*.56*3.2)),scale(up,.42*3.2));projectile(g,'player','pulse',muzzle,p.aimDirection);}g._shot=WEAPONS.pulse.cooldown;p.heat+=WEAPONS.pulse.heat;event(g,'pulse');if(p.heat>=100){p.overheated=true;event(g,'overheat');}}
 updateLock(g,i,dt);
 if(i.countermeasure&&!g._heldCM&&g._cmCooldown<=0&&p.countermeasures>0){p.countermeasures--;g._cmCooldown=3;g.projectiles=g.projectiles.filter(q=>q.owner!=='enemy'||distance(q.position,p.position)>190);for(const e of g.enemies)if(distance(e.position,p.position)<200)e.cooldown=Math.max(e.cooldown,2);effect(g,'countermeasure',p.position,1);event(g,'countermeasure');}
 g._heldCM=!!i.countermeasure;
}
function updateLock(g,i,dt){
 const p=g.player,held=!!i.missile;
 if(held){
  const candidates=g.enemies.filter(e=>e.hp>0&&distance(e.position,p.position)<TUNING.lockRange&&dot(normalize(sub(e.position,p.position)),p.aimDirection)>.83).sort((a,b)=>distance(a.position,p.position)-distance(b.position,p.position));
  const target=candidates.find(e=>e.id===g.lock.targetId)||candidates[0];
  if(target){if(g.lock.targetId!==target.id)g.lock.progress=0;g.lock.targetId=target.id;g.lock.progress=Math.min(1,g.lock.progress+dt/TUNING.lockTime);g.lock.ready=g.lock.progress>=1;}else g.lock={targetId:null,progress:0,ready:false};
 }else{
  if(g._heldMissile&&g.lock.ready&&p.missiles>0&&g._missileCooldown<=0){projectile(g,'player','missile',add(p.position,scale(p.aimDirection,10)),p.aimDirection,g.lock.targetId);p.missiles--;g._missileCooldown=WEAPONS.missile.cooldown;event(g,'missile');}
  g.lock={targetId:null,progress:0,ready:false};
 }g._heldMissile=held;
}
function lineOfSight(a,b){for(let t=.15;t<1;t+=.15){const p=add(a,scale(sub(b,a),t));if(p.y<terrainHeight(p.x,p.z)+3)return false;}return true;}
function updateEnemies(g,dt){
 for(const e of g.enemies){
  if(e.hp<=0)continue;e.previous=copy(e.position);
  const modules=g.base.filter(b=>b.hp>0);
  const target=e.role==='bomber'&&g.phase==='siege'?(modules[e.id%Math.max(1,modules.length)]||g.player):g.player;
  const delta=sub(target.position,e.position),dist=length(delta),visible=dist<1400&&lineOfSight(e.position,target.position);
  if(visible){e.lastSeen=copy(target.position);e.lastSeenTime=g.time;}
  const trackingBase=e.role==='bomber'&&g.phase==='siege';
  const investigating=!visible&&!trackingBase&&dist<1400&&e.lastSeen&&g.time-e.lastSeenTime<7;
  const disengaged=!trackingBase&&!visible&&!investigating;
  const pursuit=disengaged?add(e.home,vec(Math.sin(g.time*.15+e.id)*100,20*Math.sin(g.time*.2),Math.cos(g.time*.15+e.id)*100)):investigating?e.lastSeen:target.position;
  const desired=normalize(sub(pursuit,e.position)),speed=e.role==='bomber'?43:e.role==='interceptor'?92:66;
  // Ships orbit at combat range instead of passing through their target.
  let drive=desired;
  if(!disengaged&&!investigating&&dist<(e.role==='bomber'?160:190)){const orbit=normalize(vec(-desired.z,.25*Math.sin(g.time+e.id),desired.x));drive=normalize(add(scale(desired,dist<95?-.65:.12),scale(orbit,.85)));}
  const turnRate=e.role==='interceptor'?2.1:e.role==='bomber'?.85:1.6;
  const steered=turnToward(length(e.velocity)>.1?e.velocity:forward(e.heading,e.pitch),drive,turnRate*dt);
  e.velocity=scale(steered,length(e.velocity)+(speed-length(e.velocity))*(1-Math.exp(-2*dt)));
  e.position=add(e.position,scale(e.velocity,dt));e.position.y=clamp(e.position.y,terrainHeight(e.position.x,e.position.z)+25,TUNING.maxAltitude-10);
  e.heading=Math.atan2(e.velocity.x,e.velocity.z);e.pitch=Math.atan2(e.velocity.y,Math.hypot(e.velocity.x,e.velocity.z));e.cooldown-=dt;
  const los=dist<650&&visible;
  if(e.telegraph>0){e.telegraph-=dt;e.state='telegraph';if(e.telegraph<=0&&los){const missile=e.pendingMissile,kind=missile?'enemyMissile':'enemy',lead=add(target.position,scale(target.velocity||vec(),Math.min(1,dist/WEAPONS[kind].speed)*.45));projectile(g,'enemy',kind,e.position,sub(lead,e.position),target.id||'player');e.cooldown=e.role==='bomber'?2.8:2.1;e.attackCount++;event(g,missile?'enemy-missile':'enemy-fire',e.position);}else if(e.telegraph<=0)e.cooldown=.8;}
  else{e.state=disengaged?'patrol':investigating?'investigate':'pursuit';if(e.cooldown<=0&&los){e.pendingMissile=e.role==='interceptor'&&e.attackCount%2===0;e.telegraph=e.pendingMissile?1.1:e.role==='bomber'?1:.55;e.state='telegraph';event(g,e.pendingMissile?'missile-warning':'enemy-telegraph',e.position);}}
  if(sweptSphere(e.previous,e.position,g.player.previous,g.player.position,e.radius+TUNING.playerRadius)&&g.time-(e._ram||-9)>1){damagePlayer(g,24);e._ram=g.time;damageEnemy(g,e,18);}
 }
}
function updateProjectiles(g,dt){
 for(const q of g.projectiles){
  q.previous=copy(q.position);q.life-=dt;
  if(q.kind==='missile'||q.kind==='enemyMissile'){const hostile=q.kind==='enemyMissile',target=hostile?g.player:g.enemies.find(e=>e.id===q.targetId&&e.hp>0);if(target)q.velocity=scale(turnToward(q.velocity,sub(target.position,q.position),(hostile?TUNING.enemyMissileTurn:TUNING.missileTurn)*dt),WEAPONS[q.kind].speed);}
  q.position=add(q.position,scale(q.velocity,dt));const w=WEAPONS[q.kind]||WEAPONS.enemy;
  // Resolve the first contact along the sweep so a nearer module/crest is cover.
  let hit=null;const consider=(t,type,target)=>{if(t!==null&&(!hit||t<hit.t))hit={t,type,target};};
  if(q.owner==='player'){
   for(const e of g.enemies)if(e.hp>0)consider(sphereImpactTime(sub(q.previous,e.previous),sub(q.position,e.position),vec(),e.radius+w.radius),'enemy',e);
  }else consider(sphereImpactTime(sub(q.previous,g.player.previous),sub(q.position,g.player.position),vec(),TUNING.playerRadius+w.radius),'player',g.player);
  for(const b of g.base)if(b.hp>0)consider(sphereImpactTime(q.previous,q.position,b.position,b.radius+w.radius),'base',b);
  const segments=Math.max(1,Math.ceil(distance(q.position,q.previous)/5));for(let s=0;s<=segments;s++){const point=add(q.previous,scale(sub(q.position,q.previous),s/segments));if(point.y<terrainHeight(point.x,point.z)){consider(s/segments,'terrain',point);break;}}
  if(hit){q.position=add(q.previous,scale(sub(q.position,q.previous),hit.t));q.life=0;
   if(hit.type==='enemy')damageEnemy(g,hit.target,w.damage);
   else if(hit.type==='player'){damagePlayer(g,w.damage);effect(g,'hit',g.player.position,.25);}
   else if(hit.type==='terrain')effect(g,'dust',hit.target,.45);
   else if(q.owner==='enemy'){const b=hit.target,oldHp=b.hp;b.hp=Math.max(0,b.hp-w.damage);event(g,'base-hit',b.position);if(oldHp>b.maxHp*.3&&b.hp<=b.maxHp*.3)event(g,'base-critical',b.position);if(!b.hp){effect(g,'explosion',b.position,2);event(g,'base-destroyed',b.position);}}
  }
 }
 g.projectiles=g.projectiles.filter(q=>q.life>0);g.enemies=g.enemies.filter(e=>e.hp>0);
}
function mission(g,dt){
 if(g.player.hp<=0||g.base.every(b=>b.hp<=0)){g.phase='failed';g.objective='MISSION FAILED // Retry Moonfall';event(g,'failed');return;}
 if(g.phase==='patrol'&&(g.time>=12||g.kills>=1)){g.phase='intercept';g.objective='INTERCEPT // Clear the approach';event(g,'intercept');}
 if(g.phase==='intercept'&&(g.kills>=3||g.time>=45)){g.phase='siege';g._siegeStart=g.time;g.objective='SIEGE // Defend Moonfall outpost';event(g,'siege');}
 if(g.phase==='siege'){
  const elapsed=g.time-g._siegeStart;
  if(g._wave<3&&elapsed>=g._wave*22){g._wave++;for(let n=0;n<4+g._wave;n++)spawnEnemy(g,n<2?'bomber':'interceptor');event(g,'wave');}
  if(elapsed>=TUNING.siegeDuration&&g.enemies.every(e=>e.role!=='bomber')){g.phase='debrief';g.score+=g.base.reduce((s,b)=>s+Math.floor(b.hp),0)*3;g.objective='MOONFALL SECURED // Debrief';event(g,'complete');}
  // Outpost defenses operate independently of the pilot. Bombers remain urgent.
  g._turretTime-=dt;if(g._turretTime<=0){g._turretTime=1.8;for(const b of g.base){if(b.hp<=0)continue;const e=g.enemies.filter(e=>e.hp>0&&distance(e.position,b.position)<600&&lineOfSight(b.position,e.position)).sort((a,c)=>distance(a.position,b.position)-distance(c.position,b.position))[0];if(e){projectile(g,'player','pulse',add(b.position,vec(0,28,0)),sub(e.position,add(b.position,vec(0,28,0))));event(g,'turret',b.position);}}}
 }
}
export function step(g,input={},dt=1/60){
 if(g.phase==='failed'||g.phase==='debrief')return g;
 dt=clamp(Number(dt)||0,0,.05);if(!dt)return g;g.time+=dt;
 for(const e of g.effects)e.life-=dt;g.effects=g.effects.filter(e=>e.life>0);
 updatePlayer(g,input,dt);updateEnemies(g,dt);updateProjectiles(g,dt);mission(g,dt);
 return g;
}
