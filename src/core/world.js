import {makePlayer,flight} from '../flight/controller.js';
import {FlightPath} from '../world/path.js';
import {SegmentStreamer} from '../world/streamer.js';
import {hazards} from '../world/hazards.js';
import {LEVELS} from '../levels/index.js';
import {random} from './rng.js';
import {weapons} from '../combat/weapons.js';
import {projectiles} from '../combat/projectiles.js';
import {spawnEnemy,updateEnemies} from '../enemies/runtime.js';
import {createBoss,updateBoss} from '../bosses/runtime.js';
import {medal} from '../combat/score.js';

const copy=value=>JSON.parse(JSON.stringify(value));
export class FlightWorld{
 constructor({seed=42,onEvent}={}){this.seed=seed;this.onEvent=onEvent;this.state='menu';this.events=[];}
 id(){return ++this._id;}
 emit(type,data={}){const e={type,x:this.player?.x||0,y:this.player?.y||0,s:this.distance,...data};this.events.push(e);this.onEvent?.(e);}
 say(text){this.callout={text,time:5};this.emit('callout',{text});}
 addEnemy(type,x,y,s,extra){return spawnEnemy(this,type,x,y,s,extra);}
 addHazard(h){const entity={id:this.id(),active:true,warning:0,age:0,rotation:0,...h,baseX:h.x,baseY:h.y};this.hazards.push(entity);return entity;}
 start(levelId=1,{practice=false,checkpoint=false,dummies=false}={}){
  const saved=checkpoint&&this._checkpointData;
  this.level=typeof levelId==='object'?levelId:LEVELS.find(l=>l.id===Number(levelId))||LEVELS[0];
  this.practice=practice;this.dummies=dummies;this.path=new FlightPath(this.level.path);this.rng=random(this.seed+this.level.id);this.state='playing';this.time=0;this.distance=0;this.prevDistance=0;this.progress=0;this.player=makePlayer();this.enemies=[];this.projectiles=[];this.hazards=[];this.pickups=[];this.boss=null;this.score=0;this.combo=0;this.bestCombo=0;this.shots=0;this.hits=0;this.checkpoint=false;this.callout={text:'KITE // Punch it. Welcome to BASED IN SPACE.',time:5};this.events=[];this._id=0;this._shot=0;this._lock=0;this._heldFire=false;this._buttons={};this.comboTimer=0;this.hitConfirm=0;this.lockFlash=0;this._hullWarnArmed=false;this.bossSpawned=false;this.bossDefeated=false;this.escapeEnd=0;this.result=null;this.streamer=new SegmentStreamer(this,practice?[]:this.level.timeline);this._checkpointData=null;
  if(saved&&saved.levelId===this.level.id){for(const [key,value]of Object.entries(saved.data))this[key]=copy(value);this.rng.restore(saved.rng);this.streamer.next=saved.next;this.player.hull=this.player.maxHull;this.player.shield=this.player.maxShield;this.player.bombs=Math.max(2,this.player.bombs);this.player.invulnerable=2;this._hullWarnArmed=false;this._checkpointData=saved;this.checkpoint=true;this.say('KITE // Checkpoint loaded. Fresh shields.');}
  this.emit('start',{level:this.level.id});return this;
 }
 setCheckpoint(s){this.checkpoint=true;this._pendingCheckpoint=true;this.emit('checkpoint',{s});this.say('KITE // Checkpoint synced. Stay sharp.');}
 saveCheckpoint(){const keys=['time','distance','prevDistance','player','enemies','projectiles','hazards','pickups','boss','score','combo','bestCombo','shots','hits','_id','bossSpawned','bossDefeated','escapeEnd'];this._checkpointData={levelId:this.level.id,rng:this.rng.state(),next:this.streamer.next,data:Object.fromEntries(keys.map(k=>[k,copy(this[k])]))};this._pendingCheckpoint=false;}
 step(dt,intent={}){
  if(this.state!=='playing')return;dt=Math.min(.05,Math.max(0,dt));this.events=[];this.time+=dt;this.prevDistance=this.distance;
  const i={...intent};for(const key of ['roll','somersault','bomb']){i[key]=intent[key]&&!this._buttons[key]?intent[key]:0;this._buttons[key]=intent[key];}
  flight(this.player,dt,i,type=>this.emit(type));this.distance+=this.player.speed*dt;this.progress=Math.min(1,this.distance/this.level.length);if(this.callout)this.callout.time=Math.max(0,this.callout.time-dt);this.comboTimer-=dt;if(this.comboTimer<=0)this.combo=0;this.hitConfirm=Math.max(0,(this.hitConfirm||0)-dt);this.lockFlash=Math.max(0,(this.lockFlash||0)-dt);
  this.streamer.update(dt);
  if(this.practice&&this.dummies&&this.enemies.length<3&&Math.floor(this.time*2)%2===0)this.addEnemy('razor-fighter',(this.rng()-.5)*10,(this.rng()-.5)*5,this.distance+180,{cooldown:999,hp:42,maxHp:42,speed:45});
  if(!this.practice&&this.level.boss&&!this.bossSpawned&&this.distance>=(this.level.bossAt??this.level.length-650)){createBoss(this,this.level.boss);this.bossSpawned=true;}
  weapons(this,dt,i);projectiles(this,dt);updateEnemies(this,dt);hazards(this,dt);updateBoss(this,dt);
  if(this._pendingCheckpoint)this.saveCheckpoint();
  this.timeRemaining=this.level.timeLimit?Math.max(0,this.level.timeLimit-this.time):null;
  if(!this.practice&&this.timeRemaining===0&&this.state==='playing'){this.player.hull=0;this.state='dead';this.emit('death',{source:'time limit'});}
  if(!this.practice&&this.state==='playing'&&this.distance>=this.level.length&&(!this.level.boss||this.bossDefeated)&&(!this.level.escape||(this.escapeEnd>0&&this.distance>=this.escapeEnd))){this.state='complete';this.result={score:this.score,medal:['none','bronze','silver','gold'][medal(this)],accuracy:this.shots?Math.min(1,this.hits/this.shots):0,time:this.time,bestCombo:this.bestCombo};this.emit('complete',this.result);}
 }
 retry({checkpoint=true}={}){return this.start(this.level,{checkpoint,practice:this.practice,dummies:this.dummies});}
}
