// Original procedural sound design: no downloads, generation services, or hidden API calls.
export class GameAudio {
  constructor(){this.context=null;this.lastEvent=0;this.voices=0;this.muted=false;this.playing=false;this.range='compact';}
  async unlock(){
    try{
      if(!this.context){const A=window.AudioContext||window.webkitAudioContext;if(!A)return false;this.context=new A();const c=this.context;
        this.master=c.createGain();this.master.gain.value=.5;this.compressor=c.createDynamicsCompressor();this.master.connect(this.compressor);this.compressor.connect(c.destination);
        this.engine=c.createOscillator();this.engine.type='sawtooth';this.engine.frequency.value=35;this.engineFilter=c.createBiquadFilter();this.engineFilter.type='lowpass';this.engineFilter.frequency.value=240;this.engineGain=c.createGain();this.engineGain.gain.value=0;this.engine.connect(this.engineFilter);this.engineFilter.connect(this.engineGain);this.engineGain.connect(this.master);this.engine.start();
        this.noise=c.createBuffer(1,c.sampleRate*.5,c.sampleRate);const data=this.noise.getChannelData(0);let seed=97;for(let i=0;i<data.length;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;data[i]=seed/2147483648-1;}
      }
      if(this.context.state==='suspended')await this.context.resume();return this.context.state==='running';
    }catch{return false;}
  }
  settings(s){this.muted=!!s.muted;this.range=s.dynamicRange||'compact';if(this.master)this.master.gain.setTargetAtTime(this.muted?0:this.range==='wide'?.65:.42,this.context.currentTime,.05);}
  setPlaying(value){this.playing=value;if(this.engineGain)this.engineGain.gain.setTargetAtTime(value?.018:0,this.context.currentTime,.1);}
  tone(freq,end,duration,gain=.1,pan=0,noise=false){
    if(!this.context||this.context.state!=='running'||this.muted||!this.playing||this.voices>=12)return;
    const c=this.context,t=c.currentTime,source=noise?c.createBufferSource():c.createOscillator(),envelope=c.createGain(),filter=c.createBiquadFilter(),panner=c.createStereoPanner();this.voices++;
    if(noise)source.buffer=this.noise;else{source.type='triangle';source.frequency.setValueAtTime(freq,t);source.frequency.exponentialRampToValueAtTime(Math.max(15,end),t+duration);}
    filter.type=noise?'lowpass':'highpass';filter.frequency.value=noise?freq:60;panner.pan.value=Math.max(-.9,Math.min(.9,pan));
    envelope.gain.setValueAtTime(.001,t);envelope.gain.linearRampToValueAtTime(gain,t+.006);envelope.gain.exponentialRampToValueAtTime(.001,t+duration);
    source.connect(filter);filter.connect(envelope);envelope.connect(panner);panner.connect(this.master);source.start(t);source.stop(t+duration);source.onended=()=>{source.disconnect();filter.disconnect();envelope.disconnect();panner.disconnect();this.voices--;};
  }
  update(game,input){
    if(this.context){const t=this.context.currentTime,speed=Math.hypot(game.player.velocity.x,game.player.velocity.z);this.engine.frequency.setTargetAtTime(32+speed*.36+(input.boost?22:0),t,.12);this.engineGain.gain.setTargetAtTime(this.playing?.012+Math.min(speed/300,1)*.025:0,t,.12);}
    for(const e of game.events||[]){if(e.id<=this.lastEvent)continue;this.lastEvent=e.id;const dx=e.position.x-game.player.position.x,dz=e.position.z-game.player.position.z,distance=Math.hypot(dx,dz),pan=Math.sin(Math.atan2(dx,dz)-game.player.heading),volume=1/(1+distance/450);
      if(e.type==='pulse'){this.tone(180,55,.09,.12,pan);this.tone(1600,1600,.07,.04,pan,true);}
      else if((e.type==='missile'||e.type==='enemy-missile')){this.tone(90,350,.3,.15);this.tone(950,950,.3,.13,pan,true);}
      else if(e.type==='enemy-destroyed'||e.type==='base-destroyed'){this.tone(75,22,.45,.24*volume,pan);this.tone(2400,2400,.48,.25*volume,pan,true);}
      else if(e.type==='player-hit'||e.type==='terrain-hit'){this.tone(1700,400,.13,.13,pan,true);this.tone(95,35,.2,.12,pan);}
      else if((e.type==='enemy-telegraph'||e.type==='missile-warning')){this.tone(680,900,.16,.08*volume,pan);}
      else if(e.type==='siege'||e.type==='wave'){this.tone(440,330,.5,.12);this.tone(660,440,.45,.08);}
      else if(e.type==='complete'){this.tone(440,880,.4,.12);this.tone(660,1320,.5,.08);}
      else if(e.type==='countermeasure')this.tone(1800,180,.4,.1);
    }
  }
  diagnostics(){return {state:this.context?.state||'locked',voices:this.voices,muted:this.muted,playing:this.playing};}
  dispose(){this.engine?.stop();this.context?.close();}
}
