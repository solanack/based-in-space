import {clamp,forward} from '../game/math.js';
export const ARCADE=Object.freeze({turnRate:2.65,brakeTurnRate:4.6,boostTurnRate:2.15,pitchLimit:.58,response:12});
export function arcadeVelocity(player,input,dt,speed,clearance){
 const turn=clamp(Number(input.turn)||0,-1,1),climb=clamp(Number(input.climb)||0,-1,1);
 // Nose +Z: negative yaw turns right from the trailing camera.
 const rate=input.brake?ARCADE.brakeTurnRate:input.boost?ARCADE.boostTurnRate:ARCADE.turnRate;
 player.heading-=turn*Math.pow(Math.abs(turn),.3)*rate*dt;
 let target=climb*ARCADE.pitchLimit;
 if(clearance<30&&target<0)target=0;
 if(player.position.y>300&&target>0)target=0;
 player.pitch+=(target-player.pitch)*(1-Math.exp(-ARCADE.response*dt));
 player.bank=((player.bank||0)+(turn*.42-(player.bank||0))*(1-Math.exp(-8*dt)));
 const dir=forward(player.heading,player.pitch),velocity={x:dir.x*speed,y:dir.y*speed,z:dir.z*speed};
 if(velocity.y<0&&clearance<40)velocity.y=Math.max(velocity.y,(28-clearance)*4);
 if(velocity.y>0&&player.position.y>285)velocity.y=Math.min(velocity.y,(310-player.position.y)*3);
 return velocity;
}
