import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../vendor/three.module.min.js';
import {mapFlightIntent} from '../src/input/flight-mapping.js';
import {createGame,step} from '../src/game/simulation.js';
// Verify what the player sees, rather than assuming world X means screen right.
for(const heading of [0,Math.PI/2,Math.PI,-Math.PI/2])test(`screen-relative steering stays natural at camera heading ${heading}`,()=>{
 const camera=new T.PerspectiveCamera(50,844/390,1,6000);
 camera.position.set(-Math.sin(heading)*62,122,-Math.cos(heading)*62-190);camera.lookAt(0,80,-190);camera.updateMatrixWorld();
 const basis={right:new T.Vector3(1,0,0).applyQuaternion(camera.quaternion),forward:camera.getWorldDirection(new T.Vector3())};
 const base=new T.Vector3(0,80,-190),origin=base.clone().project(camera);
 for(const [x,y] of [[1,0],[-1,0],[0,1],[0,-1]]){
  const input=mapFlightIntent({moveX:x,moveY:y,altitude:y*.75},basis);
  const g=createGame();g.enemies=[];g.base=[];for(let i=0;i<12;i++)step(g,input,1/60);
  const projected=new T.Vector3(g.player.position.x,g.player.position.y,g.player.position.z).project(camera);
  if(x)assert.ok((projected.x-origin.x)*x>0,'Horizontal movement is visually reversed');
  if(y){assert.ok((projected.y-origin.y)*y>0,'Vertical movement is visually reversed');assert.ok((g.player.position.y-80)*y>0,'Stick must climb/descend without altitude buttons');}
 }
});
