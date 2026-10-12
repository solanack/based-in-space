import {FlightWorld} from './core/world.js';
import {FixedLoop} from './core/loop.js';
import {loadSettings,saveSettings,loadProgress,recordCompletion} from './core/save.js';
import {LEVELS} from './levels/index.js';
import {TUNING,setTuning} from './config/tuning.js';
import {FlightRenderer} from './render/renderer.js';
import {UI} from './ui/ui.js';
import {Input} from './input/input.js';
import {GameAudio} from './audio/audio.js';
import {createHitStop,punctuate,stepHitStop,resetHitStop} from './combat/hitstop.js';

const query=new URLSearchParams(location.search),debug=query.has('debug'),qa=query.has('qa');
let settings=loadSettings(),progress=loadProgress(),ready=false,renderer,input,loop,ui;
let screen='menu',settingsReturn='menu',intent={};
const hitStop=createHitStop();
const audio=new GameAudio(settings);
const world=new FlightWorld({onEvent:event=>{
  renderer?.event(event,world);
  punctuate(hitStop,event);
  if(event.type==='complete'){
    if(!world.practice){progress=recordCompletion(progress,world.level.id,world.result);ui.setProgress(progress);}
    show('complete');
  }else if(event.type==='death')show('dead');
  audio.event(event,world);
}});
function show(next){screen=next;input?.clear();if(input)input.enabled=next==='playing';loop?.setPaused(next!=='playing');audio.setPlaying(next==='playing');ui?.update(world,{progress});ui?.setScreen(next);renderer?.setMode(next);}
function start(id=1,options={}){if(!ready)return;if(!debug&&!qa&&!options.practice&&id>progress.unlocked)return;audio.unlock();intent={};resetHitStop(hitStop);world.start(id,options);renderer.setLevel(world.level);show('playing');}
function pause(){if(screen==='playing')show('paused');else if(screen==='paused')resume();}
function resume(){if(world.state==='playing'){audio.unlock();show('playing');}}
function setting(key,value){settings={...settings,[key]:value};saveSettings(settings);input?.setSettings(settings);audio.setSettings(settings);renderer?.applySettings(settings);ui.setSettings(settings);}
function camera(){setting('camera',settings.camera==='chase'?'cockpit':'chase');ui.notify(settings.camera==='chase'?'CHASE CAMERA':'COCKPIT CAMERA');}
function mute(){setting('muted',!settings.muted);audio.unlock();}
const actions={start,practice:dummies=>start(1,{practice:true,dummies}),pause,resume,camera,mute,
  menu:()=>show(screen==='settings'?settingsReturn:'menu'),
  hangar:()=>show('hangar'),levelSelect:()=>show('select'),
  settings:()=>{settingsReturn=screen==='paused'?'paused':'menu';show('settings');},
  retry:checkpoint=>{audio.unlock();intent={};resetHitStop(hitStop);world.retry({checkpoint});renderer.setLevel(world.level);show('playing');},
  continue:()=>world.level.id<LEVELS.length?start(world.level.id+1):show('select'),
  setSetting:setting,
  remap:(action,code)=>{const keys={...settings.keys},other=Object.keys(keys).find(k=>k!==action&&keys[k]===code);if(other)keys[other]=keys[action];keys[action]=code;setting('keys',keys);},
  gyro:async()=>{const ok=await input.enableGyro();if(ok){settings={...settings,gyro:true};saveSettings(settings);}ui.notify(ok?'TILT ENABLED · Hold the phone comfortably to center':'Tilt unavailable. Touch steering remains ready.');},
  tune:(key,value)=>ui.notify(setTuning(key,value)?`${key}: ${TUNING[key]}`:'Enter a value inside the supported range.')
};
ui=new UI(actions,{levels:LEVELS,progress,settings,debug});ui.setSettings(settings);
input=new Input(document.getElementById('game'),settings,{pause,camera,mute,screenAim:(x,y)=>renderer?.aimAt(x,y)});
window.addEventListener('blur',()=>{if(screen==='playing')show('paused');});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&screen==='playing')show('paused');});
window.addEventListener('error',e=>{if(!ready)ui.setLoading('FLIGHT SYSTEM ERROR: '+e.message);});
async function boot(){try{
  renderer=new FlightRenderer(document.getElementById('game'),settings);
  await renderer.load((n,total)=>ui.setLoading(`ASSEMBLING FLEET / ${n} OF ${total}`));
  world.start(1,{practice:true});renderer.setLevel(world.level);show('menu');
  let hudTimer=0;
  loop=new FixedLoop(dt=>{intent=input.read();if(screen!=='playing')return;world.step(dt*stepHitStop(hitStop,dt),intent);},(dt,alpha,raw)=>{
    if(screen!=='playing')input.gamepad();
    renderer.aim={...intent,aimX:world.player?.aimX??intent.aimX??0,aimY:world.player?.aimY??intent.aimY??0};
    renderer.frame(world,dt,alpha,screen,screen!=='playing',raw);
    audio.update(world,intent);hudTimer+=dt;
    if(hudTimer>=1/30){hudTimer=0;const ax=world.player?.aimX??intent.aimX??0,ay=world.player?.aimY??intent.aimY??0;const aim=renderer.project(ax*TUNING.windowX,ay*TUNING.windowY,world.distance+160);ui.update(world,{camera:settings.camera,progress,reticle:aim,metrics:debug?renderer.metrics():null});}
  });
  loop.start();ready=true;ui.setReady();
  globalThis.starflight={get ready(){return ready;},diagnostics:()=>({screen,state:world.state,level:world.level.id,time:world.time,distance:world.distance,metrics:renderer.metrics()})};
  if(qa||debug)Object.assign(globalThis.starflight,{world,renderer,input,ui,actions,loop,audio,settings:()=>settings,progress:()=>progress,adaptive:()=>renderer.adaptive.state(),forceFrameMs:ms=>{renderer._forceFrameMs=ms==null?null:Number(ms);},pumpAdaptive:(ms,n)=>{const st=renderer.adaptive.sampleMany(Number(ms),Number(n)||1);renderer.applyAdaptiveState(st);return st;},
    step:(frames,control={})=>{for(let n=0;n<frames&&world.state==='playing';n++)world.step(1/60,typeof control==='function'?control(world):control);renderer.frame(world,0,1,screen,true);ui.update(world,{progress});},
    render:()=>renderer.frame(world,0,1,screen,true)});
}catch(error){console.error(error);ui.setLoading('FLIGHT SYSTEM ERROR: '+error.message);}}
boot();
