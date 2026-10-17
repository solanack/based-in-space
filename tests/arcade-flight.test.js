import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,step,terrainHeight} from '../src/game/simulation.js';
import {mapFlightIntent} from '../src/input/flight-mapping.js';
const fresh=()=>{const g=createGame();g.enemies=[];return g;};
const fly=(g,frames,i={})=>{for(let n=0;n<frames;n++)step(g,{flightMode:'arcade',turn:0,climb:0,assist:false,...i},1/60);};
test('arcade keeps cruising after stick release without accidental yaw or dive',()=>{
 const g=fresh();fly(g,120);assert.ok(g.player.position.z>0);assert.ok(g.player.velocity.z>110);assert.equal(g.player.heading,0);assert.equal(g.player.pitch,0);
 const z=g.player.position.z;fly(g,60);assert.ok(g.player.position.z-z>110);
});
test('right and left turn the nose naturally; brake reverses pursuit faster than cruise',()=>{
 const right=fresh(),left=fresh(),brake=fresh();fly(right,30,{turn:1});fly(left,30,{turn:-1});fly(brake,30,{turn:1,brake:true});
 assert.ok(right.player.heading<0);assert.ok(left.player.heading>0);assert.ok(right.player.position.x<0);assert.ok(left.player.position.x>0);assert.ok(Math.abs(brake.player.heading)>Math.abs(right.player.heading)*1.5);
 fly(brake,12,{turn:1,brake:true});assert.ok(Math.abs(brake.player.heading)>Math.PI,'Brake turn must permit a fast180degree reversal');
});
test('pitch changes altitude without reversing travel; neutral returns to level flight',()=>{
 const up=fresh(),down=fresh();fly(up,45,{climb:1});fly(down,45,{climb:-1});assert.ok(up.player.position.y>100);assert.ok(down.player.position.y<60);assert.ok(up.player.position.z>-190&&down.player.position.z>-190);
 fly(up,60);assert.ok(Math.abs(up.player.pitch)<.001);assert.ok(Math.abs(up.player.velocity.y)<2);
});
test('holding dive levels near terrain instead of repeatedly scraping the surface',()=>{
 const g=fresh();fly(g,360,{climb:-1});assert.equal(g.player.hp,100);assert.ok(g.player.position.y-terrainHeight(g.player.position.x,g.player.position.z)>15);
});
test('boost works at centered stick while firing and consumes energy',()=>{
 const boost=fresh(),normal=fresh();fly(boost,90,{boost:true,fire:true});fly(normal,90);assert.ok(boost.player.position.z-normal.player.position.z>200);assert.ok(boost.player.boostEnergy<80);assert.ok(boost.player.heat>0);
});
test('flight input ignores stale pointer aim and preserves deliberate turn/climb controls',()=>{
 const i=mapFlightIntent({moveX:.7,moveY:-.5,aimPoint:{x:10,y:10},aimX:1,aimY:0},{},{});
 assert.equal(i.flightMode,'arcade');assert.equal(i.turn,.7);assert.equal(i.climb,-.5);assert.equal(i.aimPoint,null);assert.equal(i.assist,true);
});
test('cannon assistance acquires a nearby forward ship but never turns the hero toward it',()=>{
 const g=createGame();g.base=[];g.enemies=g.enemies.slice(0,1);const e=g.enemies[0];e.position={x:16,y:85,z:150};e.previous={...e.position};
 step(g,{flightMode:'arcade',turn:0,climb:0,fire:true},1/60);assert.ok(g.player.aimDirection.x>0);assert.equal(g.player.aimHeading,g.player.heading);assert.ok(g.projectiles.some(p=>p.owner==='player'));
});
test('reversing climb to dive responds within0.4seconds instead of continuing upward',()=>{
 const g=fresh();fly(g,24,{climb:1});const y=g.player.position.y;fly(g,24,{climb:-1});assert.ok(g.player.position.y<y-5);assert.ok(g.player.velocity.y<0);
});
