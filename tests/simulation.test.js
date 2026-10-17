import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,step,spawnEnemy,terrainHeight,TUNING,WEAPONS} from '../src/game/simulation.js';
import {vec,copy,length,sub,sweptSphere,turnToward,dot,normalize} from '../src/game/math.js';
import {loadSave,saveGame,SAVE_KEY} from '../src/persistence/save.js';

function clean(){const g=createGame();g.enemies=[];return g;}
function advance(g,input,seconds){for(let n=0;n<Math.round(seconds*60);n++)step(g,input);return g;}

test('movement permits every bearing and altitude, with no automatic forward motion',()=>{
 const idle=clean(),start=copy(idle.player.position);advance(idle,{},2);assert.deepEqual(idle.player.position,start);
 for(const [x,z]of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,-1]]){const g=clean(),p=copy(g.player.position);advance(g,{moveX:x,moveY:z,altitude:1},1);assert.equal(Math.sign(g.player.position.x-p.x),Math.sign(x));assert.equal(Math.sign(g.player.position.z-p.z),Math.sign(z));assert.ok(g.player.position.y>p.y+40);assert.ok(Math.abs(Math.atan2(Math.sin(g.player.heading-Math.atan2(x,z)),Math.cos(g.player.heading-Math.atan2(x,z))))<.01);}
 const g=clean();advance(g,{altitude:-1},4);assert.ok(g.player.position.y>=terrainHeight(g.player.position.x,g.player.position.z)+TUNING.minClearance);
});
test('boost changes travel distance, consumes energy, and brake slows ship',()=>{
 const normal=clean(),boost=clean(),brake=clean();advance(normal,{moveY:1},2);advance(boost,{moveY:1,boost:true},2);advance(brake,{moveY:1,brake:true},2);
 assert.ok(boost.player.position.z>normal.player.position.z+100);assert.ok(brake.player.position.z<normal.player.position.z-80);assert.ok(boost.player.boostEnergy<normal.player.boostEnergy);
});
test('pursuit corrects both horizontal bearing and altitude',()=>{
 const g=clean();g.player.position=vec(0,240,0);g.player.previous=copy(g.player.position);const e=spawnEnemy(g,'interceptor',vec(400,50,400));const initial=length(sub(e.position,g.player.position));advance(g,{},2);assert.ok(length(sub(e.position,g.player.position))<initial-100);assert.ok(e.position.y>80);assert.ok(e.velocity.x<0&&e.velocity.z<0);
});
test('swept spheres detect moving target crossings and reject near misses',()=>{
 assert.ok(sweptSphere(vec(-100,0,0),vec(100,0,0),vec(0,-100,0),vec(0,100,0),2));
 assert.equal(sweptSphere(vec(-100,0,0),vec(100,0,0),vec(0,-100,5),vec(0,100,5),2),false);
});
test('fast pulse hits an enemy even when neither endpoint overlaps',()=>{
 const g=clean(),e=spawnEnemy(g,'scout',vec(0,100,0));e.previous=copy(e.position);e.cooldown=999;
 g.projectiles.push({id:999,owner:'player',kind:'pulse',position:vec(-50,100,0),previous:vec(-50,100,0),velocity:vec(2000,0,0),life:1});step(g,{},.05);assert.equal(e.hp,e.maxHp-WEAPONS.pulse.damage);assert.equal(g.projectiles.length,0);
});
test('base modules stop hostile rounds and terrain stops rounds below the surface',()=>{
 const g=clean(),b=g.base[0],hp=b.hp;
 g.projectiles.push({id:999,owner:'enemy',kind:'enemy',position:vec(0,b.position.y,-50),previous:vec(0,b.position.y,-50),velocity:vec(0,0,2000),life:1});step(g,{},.05);assert.equal(b.hp,hp-WEAPONS.enemy.damage);
 g.projectiles.push({id:1000,owner:'player',kind:'pulse',position:vec(300,terrainHeight(300,300)-3,300),previous:vec(300,-100,300),velocity:vec(0,-10,0),life:1});step(g,{});assert.equal(g.projectiles.length,0);
});
test('earlier base contact shields an enemy later along the same projectile sweep',()=>{
 const g=clean();g.base=[g.base[0]];const e=spawnEnemy(g,'scout',vec(0,25,50));e.cooldown=999;g.projectiles.push({id:900,owner:'player',kind:'pulse',position:vec(0,25,-50),previous:vec(0,25,-50),velocity:vec(0,0,2400),life:1});step(g,{},.05);assert.equal(e.hp,e.maxHp);assert.equal(g.projectiles.length,0);
});
test('missile lock requires a hold then release and steering obeys turn limit',()=>{
 const g=clean();g.player.position=vec(0,120,0);g.player.previous=copy(g.player.position);const e=spawnEnemy(g,'bomber',vec(0,120,400));e.cooldown=999;
 step(g,{missile:true});step(g,{});assert.equal(g.player.missiles,8);
 advance(g,{missile:true},.8);assert.ok(g.lock.ready);assert.equal(g.player.missiles,8);step(g,{});assert.equal(g.player.missiles,7);const missile=g.projectiles.find(q=>q.kind==='missile');assert.ok(missile);
 const before=normalize(missile.velocity);e.position.x+=500;step(g,{});const angle=Math.acos(Math.min(1,dot(before,normalize(missile.velocity))));assert.ok(angle<=TUNING.missileTurn/60+.00001);
 const opposite=turnToward(vec(0,0,1),vec(0,0,-1),.1);assert.ok(Math.abs(length(opposite)-1)<1e-6);assert.ok(opposite.z>0);
});
test('heat limits sustained fire and countermeasure charges respond to rising edge',()=>{
 const g=clean();advance(g,{fire:true},3);assert.ok(g.player.overheated);const shots=g.projectiles.length;advance(g,{fire:true},.4);assert.ok(g.projectiles.length<=shots);advance(g,{},4);assert.equal(g.player.overheated,false);
 g.projectiles.push({id:500,owner:'enemy',kind:'enemy',position:copy(g.player.position),previous:copy(g.player.position),velocity:vec(),life:2});step(g,{countermeasure:true});assert.equal(g.player.countermeasures,3);assert.ok(!g.projectiles.some(q=>q.id===500));advance(g,{countermeasure:true},4);assert.equal(g.player.countermeasures,3);step(g,{});step(g,{countermeasure:true});assert.equal(g.player.countermeasures,2);
});
test('twin pulses originate at scaled Razor sockets in aim space',()=>{
 const g=clean();g.player.position=vec(400,120,0);step(g,{fire:true,aimX:1,aimY:0});const shots=g.projectiles.filter(q=>q.kind==='pulse');assert.equal(shots.length,2);
 for(const q of shots){assert.ok(Math.abs(q.previous.x-(400+2.07*3.2))<1e-6);assert.ok(Math.abs(q.previous.y-(120+.42*3.2))<1e-6);assert.ok(Math.abs(Math.abs(q.previous.z)-.56*3.2)<1e-6);assert.ok(q.velocity.x>500);}
});
test('player sweep prevents passing through a base module at high speed',()=>{
 const g=clean();g.base=[g.base[0]];g.player.position=vec(0,g.base[0].position.y,-70);g.player.velocity=vec(0,0,4000);step(g,{moveY:1},.05);assert.ok(g.player.position.z<-26);assert.ok(g.player.hp+g.player.shield<g.player.maxHp+g.player.maxShield);
});
test('terrain sweep catches a crest even when both movement endpoints clear it',()=>{
 const g=clean(),peak=2037.75,z=900,y=terrainHeight(peak,z)+TUNING.minClearance-.002;
 g.player.position=vec(peak-10,y,z);g.player.velocity=vec(20/(.05*Math.exp(-.25)),0,0);
 assert.ok(y>terrainHeight(peak-10,z)+TUNING.minClearance);assert.ok(y>terrainHeight(peak+10,z)+TUNING.minClearance);step(g,{},.05);assert.ok(g.player.position.x<peak+10);assert.ok(g.player.position.y>=terrainHeight(g.player.position.x,z)+TUNING.minClearance);assert.ok(g.events.some(e=>e.type==='terrain-hit'));
});
test('interceptor warns before homing launch, bounded steering and decoys defeat it',()=>{
 const g=clean();g.player.position=vec(400,130,0);g.player.previous=copy(g.player.position);const e=spawnEnemy(g,'interceptor',vec(400,130,380));e.cooldown=0;step(g,{});assert.ok(g.events.some(e=>e.type==='missile-warning'));advance(g,{},.8);assert.equal(g.projectiles.filter(q=>q.kind==='enemyMissile').length,0);advance(g,{},.4);const q=g.projectiles.find(q=>q.kind==='enemyMissile');assert.ok(q);assert.ok(g.events.some(e=>e.type==='enemy-missile'));
 const before=normalize(q.velocity);g.player.position.x+=400;step(g,{});assert.ok(Math.acos(Math.min(1,dot(before,normalize(q.velocity))))<=TUNING.enemyMissileTurn/60+.00001);
 q.position=addNear(g.player.position);step(g,{countermeasure:true});assert.ok(!g.projectiles.some(p=>p.id===q.id));
});
function addNear(p){return vec(p.x+30,p.y,p.z);}
test('enemy steering is bounded and far targets disengage without omniscient pursuit',()=>{
 const g=clean();g.player.position=vec(0,150,-500);const e=spawnEnemy(g,'interceptor',vec(0,150,0));e.velocity=vec(0,0,92);e.cooldown=999;const before=normalize(e.velocity);step(g,{});const turn=Math.acos(Math.min(1,dot(before,normalize(e.velocity))));assert.ok(turn<=2.1/60+.00001);g.player.position=vec(5000,150,5000);step(g,{});assert.equal(e.state,'patrol');
});
test('occluded enemies investigate last sighting rather than track through terrain',()=>{
 const g=clean();g.player.position=vec(-600,terrainHeight(-600,900)+8,900);const e=spawnEnemy(g,'scout',vec(-1200,terrainHeight(-1200,900)+26,900));e.lastSeen=vec(-1200,100,1200);e.lastSeenTime=0;e.cooldown=0;step(g,{});assert.equal(e.state,'investigate');assert.deepEqual(e.lastSeen,vec(-1200,100,1200));assert.equal(e.telegraph,0);
});
test('siege spawns independent threats, turrets fight, and live bombers prevent success',()=>{
 const g=clean();g.kills=3;step(g,{});assert.equal(g.phase,'siege');assert.ok(g.enemies.some(e=>e.role==='bomber'));assert.ok(g.events.some(e=>e.type==='wave'));
 g._wave=3;g._siegeStart=-100;g.player.hp=9999;g.player.shield=9999;
 const bomber=g.enemies.find(e=>e.role==='bomber');bomber.position=vec(0,110,190);bomber.previous=copy(bomber.position);g._turretTime=0;step(g,{});assert.equal(g.phase,'siege');assert.ok(g.events.some(e=>e.type==='turret'));
 g.enemies=[];step(g,{});assert.equal(g.phase,'debrief');assert.ok(g.events.some(e=>e.type==='complete'));
});
test('a bomber attacks the outpost while pilot is far away, and zero base health fails',()=>{
 const g=clean();g.phase='siege';g._wave=3;g._siegeStart=g.time;g._turretTime=999;g.player.position=vec(3000,200,3000);const bomber=spawnEnemy(g,'bomber',vec(0,100,150));bomber.cooldown=0;
 const before=g.base.reduce((s,b)=>s+b.hp,0);advance(g,{},10);assert.ok(g.base.reduce((s,b)=>s+b.hp,0)<before);
 for(const b of g.base)b.hp=0;step(g,{});assert.equal(g.phase,'failed');const retry=createGame(g.save);assert.equal(retry.phase,'patrol');assert.ok(retry.base.every(b=>b.hp===b.maxHp));
});
test('same inputs reproduce a bounded deterministic simulation',()=>{
 const a=createGame(),b=createGame();for(let n=0;n<2400;n++){const i={moveX:Math.sin(n/130),moveY:Math.cos(n/130),altitude:n%180<90?.2:-.2,fire:true,boost:n%180<40};step(a,i);step(b,i);}assert.deepEqual(a,b);assert.ok(a.events.length<=TUNING.eventLimit);assert.ok(a.enemies.length<=TUNING.enemyLimit);assert.ok(a.projectiles.length<=TUNING.projectileLimit);assert.ok(a.effects.length<=TUNING.effectLimit);
});
test('save migration retains legacy records and awards a completed run once',()=>{
 const entries=new Map([['based-in-space-save',JSON.stringify({highScore:1234,credits:9,unlocks:['razor'],upgrades:{hull:2}})]]);const storage={getItem:key=>entries.get(key),setItem:(key,value)=>entries.set(key,value)};const save=loadSave(storage);assert.equal(save.bestScore,1234);assert.deepEqual(save.unlocks,['razor']);assert.equal(save.upgrades.hull,2);const g=createGame(save);assert.equal(g.player.maxHp,140);g.phase='debrief';g.score=2000;saveGame(g,storage);saveGame(g,storage);const stored=JSON.parse(entries.get(SAVE_KEY));assert.equal(stored.runs,1);assert.equal(stored.credits,209);assert.equal(stored.bestScore,2000);
 assert.equal(loadSave({getItem:()=>'{invalid'}).version,2);assert.doesNotThrow(()=>saveGame(g,{setItem(){throw new Error('quota');}}));
});
