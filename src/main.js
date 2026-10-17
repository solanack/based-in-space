import {createGame,step,terrainHeight} from './game/simulation.js';
import {loadSave,saveGame} from './persistence/save.js';
import {createControls} from './input/controls.js';
import {mapFlightIntent} from './input/flight-mapping.js';
import {createHUD} from './ui/hud.js';
import {MoonRenderer} from './render/scene.js';
import {GameAudio} from './audio/manager.js';
const canvas=document.getElementById('game'),query=new URLSearchParams(location.search),qa=query.has('qa');
let game=createGame(loadSave()),screen='start',renderer,controls,hud,last=performance.now(),accumulator=0,previousPhase=game.phase,input={},frozen=false;
const audio=new GameAudio();
function show(next){screen=next;accumulator=0;last=performance.now();controls.release();hud.update(game,renderer.metrics());hud.show(next);audio.setPlaying(next==='playing');}
async function start(){await audio.unlock();frozen=false;game=createGame(loadSave());previousPhase=game.phase;show('playing');}
async function resume(){await audio.unlock();show('playing');}
function pause(){if(screen==='playing')show('paused');}
function upgrade(kind){const profile=game.save;if(!['hull','shield','engines'].includes(kind))return;const level=profile.upgrades[kind],cost=100*(level+1);if(level>=5||profile.credits<cost)return;profile.credits-=cost;profile.upgrades[kind]++;saveGame(profile);hud.update(game,renderer.metrics());hud.show('won');}
function setting(){if(renderer.controlStyle!==controls.settings.flightStyle){renderer.controlStyle=controls.settings.flightStyle;renderer.mode=controls.settings.flightStyle==='hover'?'close':'flight';}audio.settings({...controls.settings,muted:controls.settings.mute,dynamicRange:controls.settings.dynamicRange==='full'?'wide':'compact'});renderer.settings=controls.settings;renderer.resize();}
try{
 controls=createControls(document.body);
 renderer=new MoonRenderer(canvas,game,controls.settings);
 hud=createHUD({onStart:start,onPause:pause,onResume:resume,onRestart:start,onUpgrade:upgrade,onCamera:()=>renderer.setCamera()});
 setting();window.addEventListener('moonfall:settings',setting);
 window.addEventListener('blur',pause);document.addEventListener('visibilitychange',()=>{if(document.hidden){pause();saveGame(game);}});
 window.addEventListener('resize',()=>{if(innerHeight>innerWidth)pause();});
 // A single canvas owns the context; WebGLRenderer restores its resources in place.
 canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();pause();document.body.dataset.context='lost';});
 canvas.addEventListener('webglcontextrestored',()=>{renderer.restoreEnvironment();document.body.dataset.context='ready';last=performance.now();});
 const markers=document.createElement('div');markers.id='world-markers';markers.setAttribute('aria-hidden','true');document.getElementById('app').append(markers);
 const markerPool=[];for(let n=0;n<36;n++){const m=document.createElement('div');m.className='contact-marker';markers.append(m);markerPool.push(m);}
 function updateMarkers(){markers.hidden=screen!=='playing';let idx=0;const p=game.player.position;
   const nearest=game.enemies.filter(e=>e.hp>0).sort((a,b)=>Math.hypot(a.position.x-p.x,a.position.z-p.z)-Math.hypot(b.position.x-p.x,b.position.z-p.z)).slice(0,6);
   const home=game.phase==='siege'?game.base.filter(b=>b.hp>0).slice(0,1):[];
   for(const e of [...nearest,...home]){if(idx>=markerPool.length)break;const pt=renderer.project(e.position),base=!!e.name,m=markerPool[idx++];m.hidden=false;m.className='contact-marker'+(base?' installation':'')+(game.lock.targetId===e.id?' selected':'');
     const x=Math.max(28,Math.min(innerWidth-28,pt.x)),y=Math.max(70,Math.min(innerHeight-120,pt.y));m.style.left=x+'px';m.style.top=y+'px';m.classList.toggle('offscreen',!pt.visible);m.textContent=base?'⌂':'';
   }for(;idx<markerPool.length;idx++)markerPool[idx].hidden=true;
   const target=game.enemies.find(e=>e.id===game.lock.targetId)||game.enemies.filter(e=>e.hp>0).sort((a,b)=>Math.hypot(a.position.x-p.x,a.position.z-p.z)-Math.hypot(b.position.x-p.x,b.position.z-p.z))[0];
   const ret=document.getElementById('target-reticle');if(target){const travel=Math.hypot(target.position.x-p.x,target.position.z-p.z)/560,lead={x:target.position.x+target.velocity.x*travel,y:target.position.y+target.velocity.y*travel,z:target.position.z+target.velocity.z*travel},point=renderer.project(lead);const bounds=document.getElementById('hud').getBoundingClientRect();ret.style.left=((point.visible?point.x:innerWidth/2)-bounds.left)+'px';ret.style.top=((point.visible?point.y:innerHeight/2)-bounds.top)+'px';}
 }
 function readIntent(){let value=mapFlightIntent(controls.sample(),renderer.flightBasis(),game.player,controls.settings.flightStyle);if(value.aimPoint){const aim=renderer.aimAt(value.aimPoint.x,value.aimPoint.y,game.player);if(aim)Object.assign(value,aim);}return value;}
 let hudElapsed=0;
 function frame(now){const raw=Math.max(0,(now-last)/1000);last=now;const dt=Math.min(raw,.1);
   if(screen==='playing'&&!frozen){accumulator=Math.min(accumulator+dt,.1);input=readIntent();
     while(accumulator>=1/60){step(game,input,1/60);accumulator-=1/60;}
     if(game.phase!==previousPhase){previousPhase=game.phase;if(game.phase==='failed'||game.phase==='debrief'){saveGame(game);show(game.phase==='debrief'?'won':'lost');}}
   }
   renderer.frame(game,dt,screen==='playing'&&!frozen?accumulator*60:1,input,raw);audio.update(game,input);
   hudElapsed+=dt;if(hudElapsed>=1/20){hudElapsed=0;hud.update(game,renderer.metrics());updateMarkers();}
   requestAnimationFrame(frame);
 }
 requestAnimationFrame(frame);
 globalThis.__THREE_GAME_DIAGNOSTICS__=()=>({...renderer.metrics(),entities:game.enemies.length,projectiles:game.projectiles.length,physics:{engine:'custom swept-sphere',fixedHz:60},audio:audio.diagnostics()});
 if(qa){globalThis.moonfall={get game(){return game},get input(){return input},get screen(){return screen},renderer,controls,audio,start,pause,resume,upgrade,readIntent,
   step:(frames,control={})=>{for(let i=0;i<frames;i++)step(game,typeof control==='function'?control(game):control,1/60);hud.update(game,renderer.metrics());renderer.frame(game,1/60,1,control);},
   setState:async name=>{frozen=true;game=createGame(loadSave());if(name==='active-play')game.time=5;else if(name==='siege'){game.time=45;step(game,{},1/60);step(game,{},1/60);}else if(name==='failed'){game.player.hp=0;step(game,{},1/60);show('lost');}else if(name==='debrief'){game.phase='debrief';game.score=1500;saveGame(game);show('won');}else throw new Error('Unsupported QA state '+name);if(name==='active-play'||name==='siege')show('playing');hud.update(game,renderer.metrics());renderer.frame(game,1/60,1,{});return {state:name};},
   setPausedForScreenshot:paused=>{frozen=paused;},
   diagnostics:()=>globalThis.__THREE_GAME_DIAGNOSTICS__(),
   inspectAsset:view=>{frozen=true;show('playing');const p=game.player.position,camera=renderer.camera;const offsets={top:[0,85,0.01],front:[0,12,80],side:[80,12,0],threequarter:[45,35,55]};const a=offsets[view];if(!a)throw Error('Unknown asset view');renderer.frame(game,1/60,1,{});camera.position.set(p.x-renderer.origin.x+a[0],p.y+a[1],p.z-renderer.origin.z+a[2]);camera.lookAt(p.x-renderer.origin.x,p.y,p.z-renderer.origin.z);renderer.renderer.render(renderer.scene,camera);},
   snapshot:()=>({phase:game.phase,position:game.player.position,time:game.time,kills:game.kills,base:game.base.map(b=>({id:b.id,hp:b.hp})),metrics:renderer.metrics()})};
 }
}catch(error){console.error(error);document.getElementById('app').textContent='Flight systems could not start. '+error.message;}
