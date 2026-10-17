import * as T from '../../vendor/three.module.min.js';
import {createRazor} from '../assets/razor.mjs';
import {terrainHeight} from '../game/simulation.js';
const V=(x=0,y=0,z=0)=>new T.Vector3(x,y,z);
const up=V(0,1,0),axis=V(0,0,1),dummy=new T.Object3D();
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
function material(color,metalness=.5,roughness=.52){return new T.MeshStandardMaterial({color,metalness,roughness});}
function box(root,m,x,y,z,w,h,d){const o=new T.Mesh(new T.BoxGeometry(w,h,d),m);o.position.set(x,y,z);root.add(o);return o;}
function cylinder(root,m,x,y,z,r1,r2,h,n=12){const o=new T.Mesh(new T.CylinderGeometry(r1,r2,h,n),m);o.position.set(x,y,z);root.add(o);return o;}
function panel(root,m,points,y,thickness){const shape=new T.Shape();points.forEach(([x,z],i)=>i?shape.lineTo(x,z):shape.moveTo(x,z));shape.closePath();const g=new T.ExtrudeGeometry(shape,{depth:thickness,bevelEnabled:true,bevelSize:.18,bevelThickness:.15,bevelSegments:1,steps:1});g.rotateX(Math.PI/2);const o=new T.Mesh(g,m);o.position.y=y;root.add(o);return o;}
// Batch authored parts by shared material. Collision always belongs to simulation proxies.
function batch(root){
  const groups=new Map();root.updateMatrixWorld(true);
  for(const o of [...root.children])if(o.isMesh){const g=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();g.applyMatrix4(o.matrix);const list=groups.get(o.material)||[];list.push(g);groups.set(o.material,list);root.remove(o);o.geometry.dispose();}
  for(const [m,gs] of groups){const geo=new T.BufferGeometry();for(const attr of ['position','normal','uv']){if(!gs.every(g=>g.attributes[attr]))continue;const len=gs.reduce((s,g)=>s+g.attributes[attr].array.length,0),a=new Float32Array(len);let k=0;for(const g of gs){a.set(g.attributes[attr].array,k);k+=g.attributes[attr].array.length;}geo.setAttribute(attr,new T.BufferAttribute(a,gs[0].attributes[attr].itemSize));}for(const g of gs)g.dispose();const o=new T.Mesh(geo,m);o.castShadow=true;o.receiveShadow=true;root.add(o);}
  return root;
}
function enemyFactory(role,kit){
  const root=new T.Group(),heavy=role==='bomber',scout=role==='scout',s=heavy?1.5:scout?.8:1;
  const {armor,dark,red,steel,engine}=kit;
  panel(root,armor,[[-2,-6],[2,-6],[3,-2],[1.1,7],[0,9],[-1.1,7],[-3,-2]],1.5,2);
  panel(root,steel,[[-.65,1],[.65,1],[.5,5],[0,6],[-.5,5]],3.6,.2);
  for(const side of [-1,1]){
    const wing=scout?[[2,-3],[8,-6],[6,-1],[1,4]]:heavy?[[2,-5],[9,-5],[10,3],[6,5],[2,2]]:[[2,-4],[11,-6],[9,-1],[4,3],[1,5]];
    panel(root,armor,wing.map(([x,z])=>[x*side,z]),1.2,1);
    panel(root,red,[[3,-3],[side===1?7:7,-4],[5,-1],[3,1]].map(([x,z])=>[side*x,z]),2.35,.16);
    box(root,dark,side*4.5,1,-3,2.5,2.6,6);
    const nozzle=cylinder(root,steel,side*4.5,1,-6.2,1.3,1.1,.8);nozzle.rotation.x=Math.PI/2;
    const core=cylinder(root,engine,side*4.5,1,-6.7,.8,.8,.15);core.rotation.x=Math.PI/2;
    box(root,steel,side*(heavy?7:2.8),1.7,4,heavy?1.5:.5,heavy?1.2:.5,heavy?5:4);
    if(heavy){for(let i=0;i<3;i++)box(root,dark,side*7.5,2.8,-3+i*2,2,.5,.6);}
    else {const fin=box(root,red,side*5,3,-4,.3,4,3);fin.rotation.z=-side*.3;}
  }
  batch(root);root.scale.setScalar(s);return root;
}
function baseFactory(module,index,kit){
  const root=new T.Group();root.name=module.name;
  const {armor,dark,steel,red,beacon}=kit;
  cylinder(root,dark,0,1.5,0,21,24,3,8);
  for(let i=0;i<8;i++){const a=i*Math.PI/4;const rib=box(root,steel,Math.sin(a)*18,4,Math.cos(a)*18,1,5,9);rib.rotation.y=a;}
  if(/comm/i.test(module.id+' '+module.name)){
    cylinder(root,armor,0,12,0,7,12,22,8);cylinder(root,steel,0,29,0,1.4,2.5,22,8);
    const dish=new T.Mesh(new T.SphereGeometry(12,18,10,0,Math.PI*2,0,Math.PI*.36),steel);dish.rotation.x=.65;dish.position.set(0,39,0);root.add(dish);
    box(root,red,0,34,0,2,2,20);cylinder(root,beacon,0,44,0,.8,.8,2,8);
  }else if(/fuel/i.test(module.id+' '+module.name)){
    for(const x of [-9,9]){cylinder(root,armor,x,10,0,6,6,18,16);cylinder(root,steel,x,20,0,2,6,4,16);for(const y of [5,16])cylinder(root,red,x,y,0,6.2,6.2,1,16);box(root,dark,x,10,0,13,2,2);}
  }else if(/hangar/i.test(module.id+' '+module.name)){
    const shell=new T.Mesh(new T.CylinderGeometry(18,18,35,16,1,false,0,Math.PI),armor);shell.rotation.z=Math.PI/2;shell.position.y=2;root.add(shell);
    for(const x of [-15,15])box(root,steel,x,8,0,2,16,35);
    box(root,dark,0,5,18,27,10,1);for(const x of [-8,0,8])box(root,red,x,5,18.8,1,10,.3);
    box(root,beacon,0,13,19,22,.4,.4);
  }else{
    cylinder(root,armor,0,10,0,12,16,18,10);cylinder(root,steel,0,21,0,8,12,5,10);
    cylinder(root,beacon,0,12,0,12.2,12.2,1,10);
    for(let i=0;i<6;i++){const a=i*Math.PI/3;const o=box(root,dark,Math.sin(a)*12,12,Math.cos(a)*12,3,17,5);o.rotation.y=a;}
    cylinder(root,red,0,26,0,3,7,5,10);
  }
  // Authored launch platform, service access and hazard marks on every installation.
  box(root,dark,0,.8,-38,32,1,35);for(const x of [-14,14])for(let i=0;i<6;i++)box(root,beacon,x,1.6,-25-i*5,.45,.25,1.5);
  for(let i=0;i<5;i++)box(root,red,-8+i*4,1.7,-49,2,.12,1.2);
  batch(root);root.position.set(module.position.x,terrainHeight(module.position.x,module.position.z),module.position.z);
  return root;
}
function disposeTree(root,disposeMaterials=true){const geos=new Set(),mats=new Set();root.traverse(o=>{if(o.geometry)geos.add(o.geometry);if(o.material)for(const m of Array.isArray(o.material)?o.material:[o.material])mats.add(m);});for(const g of geos)g.dispose();if(disposeMaterials)for(const m of mats)m.dispose();}
export class MoonRenderer{
  constructor(canvas,game,settings={}){
    this.canvas=canvas;this.settings=settings;this.mode='close';this.frames=[];this.tiles=new Map();this.enemyModels=new Map();this.baseModels=new Map();this.frameMs=16.7;this.dpr=1;this.quality='auto';this.origin=V();this.lastEvent=0;this.lastAdapt=0;
    this.renderer=new T.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
    this.renderer.outputColorSpace=T.SRGBColorSpace;this.renderer.toneMapping=T.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.1;this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=T.PCFSoftShadowMap;
    this.scene=new T.Scene();this.scene.background=new T.Color(0x04060a);
    this.world=new T.Group();this.scene.add(this.world);
    this.camera=new T.PerspectiveCamera(55,1,1,6000);this.camera.position.set(0,190,-340);this.target=V(0,30,0);
    this.scene.add(new T.HemisphereLight(0xc3d2e7,0x32303a,2.1));
    const sun=new T.DirectionalLight(0xffe7ce,3.4);sun.position.set(-400,700,300);sun.castShadow=true;sun.shadow.mapSize.set(512,512);Object.assign(sun.shadow.camera,{left:-240,right:240,top:240,bottom:-240,near:1,far:1600});sun.shadow.camera.updateProjectionMatrix();sun.shadow.bias=-.0008;this.sun=sun;this.scene.add(sun,sun.target);
    const rim=new T.DirectionalLight(0x87b4ff,1.1);rim.position.set(300,140,-500);this.scene.add(rim);
    // Single startup studio IBL bake; no external texture or heavyweight second context.
    const env=new T.Scene();env.background=new T.Color(0x202734);
    for(const [x,y,z,w,h,c] of [[-20,15,5,12,30,0xffeee4],[15,10,-10,8,25,0xc5dbff],[0,30,0,30,20,0xffffff]]){const p=new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshBasicMaterial({color:c,side:T.DoubleSide}));p.position.set(x,y,z);p.lookAt(0,0,0);env.add(p);}
    const pmrem=new T.PMREMGenerator(this.renderer);this.envTarget=pmrem.fromScene(env,.1,.1,100);this.scene.environment=this.envTarget.texture;this.scene.environmentIntensity=.85;pmrem.dispose();this.environmentScene=env;
    this.kit={armor:material(0x383e48,.6,.46),dark:material(0x11161e,.45,.7),steel:material(0xa3abb5,.72,.3),red:material(0xb82030,.55,.4),engine:new T.MeshBasicMaterial({color:0xff705a}),beacon:new T.MeshBasicMaterial({color:0x92e0ee})};
    this.hero=createRazor(T);this.hero.scale.setScalar(3.2);this.world.add(this.hero);
    this.flames=[];for(const socket of this.hero.userData.thrusterPositions){const f=new T.Mesh(new T.ConeGeometry(.19,1.7,10),new T.MeshBasicMaterial({color:0xbceaff,transparent:true,opacity:.75,depthWrite:false}));f.rotation.x=-Math.PI/2;f.position.set(socket[0],socket[1],socket[2]-.75);this.hero.add(f);this.flames.push(f);}
    this.terrainMaterial=new T.MeshStandardMaterial({color:0x66636b,roughness:1,metalness:.08,vertexColors:true});
    // One shared procedural regolith map: fine grain and small crater stippling.
    const texCanvas=document.createElement('canvas');texCanvas.width=texCanvas.height=128;const ctx=texCanvas.getContext('2d'),img=ctx.createImageData(128,128);let seed=113;
    for(let i=0;i<img.data.length;i+=4){seed=(Math.imul(seed,1664525)+1013904223)>>>0;const c=100+(seed>>>26);img.data[i]=c;img.data[i+1]=c;img.data[i+2]=c;img.data[i+3]=255;}ctx.putImageData(img,0,0);this.regolith=new T.CanvasTexture(texCanvas);this.regolith.wrapS=this.regolith.wrapT=T.RepeatWrapping;this.regolith.repeat.set(16,16);this.terrainMaterial.map=this.regolith;
    this.rocks=new T.InstancedMesh(new T.IcosahedronGeometry(1,1),material(0x515057,.06,1),180);this.world.add(this.rocks);this.rockCenter='';
    for(const [i,b] of game.base.entries()){const m=baseFactory(b,i,this.kit);this.baseModels.set(b.id,m);this.world.add(m);}
    this.addStars();this.addEarth();this.addRoads(game.base);
    this.bullets=new T.InstancedMesh(new T.CylinderGeometry(.24,.24,9,5),new T.MeshBasicMaterial({color:0xffe5c6}),200);this.missiles=new T.InstancedMesh(new T.ConeGeometry(.7,5,7),new T.MeshBasicMaterial({color:0xff6753}),40);
    this.sparks=new T.InstancedMesh(new T.OctahedronGeometry(1),new T.MeshBasicMaterial({color:0xffb672,transparent:true,opacity:.8,depthWrite:false}),240);
    this.rings=new T.InstancedMesh(new T.TorusGeometry(1,.045,5,28),new T.MeshBasicMaterial({color:0xffb08d,transparent:true,opacity:.55,depthWrite:false}),32);
    for(const m of [this.bullets,this.missiles,this.sparks,this.rings]){m.count=0;m.frustumCulled=false;this.world.add(m);}
    this.resize();this.handleResize=()=>this.resize();window.addEventListener('resize',this.handleResize);window.visualViewport?.addEventListener('resize',this.handleResize);
    this.updateTerrain(game.player.position);this.disposed=false;
  }
  addStars(){const data=[];let seed=51;const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};for(let i=0;i<650;i++){const a=rand()*Math.PI*2,y=rand()*.9+.1,r=Math.sqrt(1-y*y);data.push(Math.sin(a)*r*4200,y*4200,Math.cos(a)*r*4200);}const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(data,3));this.stars=new T.Points(g,new T.PointsMaterial({color:0xadb9cc,size:2.1,sizeAttenuation:false}));this.scene.add(this.stars);}
  addEarth(){const c=document.createElement('canvas');c.width=256;c.height=128;const ctx=c.getContext('2d');ctx.fillStyle='#143655';ctx.fillRect(0,0,256,128);for(let i=0;i<45;i++){ctx.fillStyle=i%4?'#427477':'#c8cfc7';ctx.beginPath();const x=(Math.sin(i*13.2)*.5+.5)*256,y=(Math.cos(i*3.8)*.5+.5)*128;ctx.ellipse(x,y,8+i%13,3+i%9,i,0,7);ctx.fill();}const texture=new T.CanvasTexture(c);texture.colorSpace=T.SRGBColorSpace;this.earth=new T.Mesh(new T.SphereGeometry(135,40,24),new T.MeshStandardMaterial({map:texture,roughness:.9,emissive:0x0c1827,emissiveIntensity:.4}));this.earth.position.set(-1100,120,3100);this.earth.rotation.z=.3;this.scene.add(this.earth);}
  addRoads(base){const root=new T.Group();for(const b of base){const len=Math.hypot(b.position.x,b.position.z);if(len<10)continue;const road=box(root,this.kit.dark,b.position.x/2,.6,b.position.z/2,7,.2,len);road.rotation.y=Math.atan2(b.position.x,b.position.z);for(let i=0;i<8;i++){const t=i/8;box(root,this.kit.steel,b.position.x*t,1,b.position.z*t,1,.2,2);}}batch(root);this.world.add(root);}
  resize(){const w=this.canvas.clientWidth||innerWidth,h=this.canvas.clientHeight||innerHeight;const quality=this.settings.quality||'auto';this.dpr=quality==='low'?.75:quality==='high'?Math.min(devicePixelRatio,1.5):this.dpr;this.renderer.setPixelRatio(this.dpr);this.renderer.setSize(w,h,false);this.camera.aspect=w/h;this.camera.updateProjectionMatrix();}
  setCamera(){const modes=['close','tactical','chase'];this.mode=modes[(modes.indexOf(this.mode)+1)%modes.length];return this.mode;}
  flightBasis(){const right=V(1,0,0).applyQuaternion(this.camera.quaternion),forward=V();this.camera.getWorldDirection(forward);return {right,forward};}
  updateTerrain(p){const cx=Math.floor(p.x/512),cz=Math.floor(p.z/512),key=`${cx},${cz}`;if(this.rockCenter===key)return;this.rockCenter=key;
    const wanted=new Set();for(let x=cx-2;x<=cx+2;x++)for(let z=cz-2;z<=cz+2;z++){const k=`${x},${z}`;wanted.add(k);if(this.tiles.has(k))continue;const g=new T.PlaneGeometry(512,512,40,40);g.rotateX(-Math.PI/2);const pos=g.attributes.position,col=[];for(let i=0;i<pos.count;i++){const wx=pos.getX(i)+x*512,wz=pos.getZ(i)+z*512,y=terrainHeight(wx,wz);pos.setY(i,y);const a=.58+.18*Math.sin(wx*.04)*Math.cos(wz*.035)+.2*clamp(y/70,0,1);col.push(a,a*.98,a*1.01);}g.setAttribute('color',new T.Float32BufferAttribute(col,3));g.computeVertexNormals();const m=new T.Mesh(g,this.terrainMaterial);m.receiveShadow=true;m.position.set(x*512,0,z*512);this.tiles.set(k,m);this.world.add(m);}
    for(const [k,m] of this.tiles)if(!wanted.has(k)){this.world.remove(m);m.geometry.dispose();this.tiles.delete(k);}
    for(let i=0;i<180;i++){const x=cx*512+Math.sin(i*417.23)*1150,z=cz*512+Math.cos(i*233.19)*1150;dummy.position.set(x,terrainHeight(x,z),z);dummy.rotation.set(i*.7,i,0);dummy.scale.set(2+i%6,1+i%5,2+i%4);dummy.updateMatrix();this.rocks.setMatrixAt(i,dummy.matrix);}this.rocks.instanceMatrix.needsUpdate=true;
  }
  frame(g,dt,alpha,input={},rawDt=dt){
    if(this.disposed)return;const before=performance.now(),p=g.player,prev=p.previous||p.position;
    const position=V().lerpVectors(V(prev.x,prev.y,prev.z),V(p.position.x,p.position.y,p.position.z),alpha);
    this.origin.set(Math.round(position.x/2048)*2048,0,Math.round(position.z/2048)*2048);this.world.position.copy(this.origin).negate();
    this.hero.position.copy(position);this.hero.rotation.set(-(p.pitch||0),p.aimHeading??p.heading, this.settings.reducedMotion?0:clamp((input.moveX||0)*-.18,-.3,.3));
    if(this.hero.userData.micro)this.hero.userData.micro.visible=this.settings.quality==='high';
    for(const f of this.flames)f.scale.y=input.boost?2.8:1+Math.sin(g.time*43)*.12;
    this.updateTerrain(p.position);
    const active=new Set();for(const e of g.enemies){if(e.hp<=0)continue;active.add(e.id);let m=this.enemyModels.get(e.id);if(!m){m=enemyFactory(e.role,this.kit);this.enemyModels.set(e.id,m);this.world.add(m);}const prev=e.previous||e.position;m.position.lerpVectors(V(prev.x,prev.y,prev.z),V(e.position.x,e.position.y,e.position.z),alpha);m.rotation.set(-(e.pitch||0),e.heading||0,Math.sin(g.time+e.id)*.1);}
    for(const [id,m] of this.enemyModels)if(!active.has(id)){this.world.remove(m);disposeTree(m,false);this.enemyModels.delete(id);}
    for(const b of g.base){const m=this.baseModels.get(b.id);if(m){m.scale.y=b.hp>0?1:.17;m.visible=Math.hypot(b.position.x-p.position.x,b.position.z-p.position.z)<2400;}}
    let bullets=0,missiles=0;for(const b of g.projectiles){const m=(b.kind==='missile'||b.kind==='enemyMissile')?this.missiles:this.bullets;const n=m===this.missiles?missiles++:bullets++;if(n>=m.instanceMatrix.count)continue;dummy.position.set(b.position.x,b.position.y,b.position.z);const dir=V(b.velocity.x,b.velocity.y,b.velocity.z).normalize();dummy.quaternion.setFromUnitVectors(up,dir);dummy.scale.setScalar(1);dummy.updateMatrix();m.setMatrixAt(n,dummy.matrix);m.setColorAt(n,new T.Color(b.owner==='player'?0xc1edff:0xff6656));}
    this.bullets.count=Math.min(bullets,200);this.missiles.count=Math.min(missiles,40);for(const m of [this.bullets,this.missiles]){m.instanceMatrix.needsUpdate=true;if(m.instanceColor)m.instanceColor.needsUpdate=true;}
    let sparks=0,rings=0;for(const effect of g.effects||[]){if(rings>=32)break;const age=1-effect.life/(effect.maxLife||1),r=(effect.kind==='explosion'?24:7)*age+1;dummy.position.set(effect.position.x,effect.position.y,effect.position.z);dummy.rotation.set(Math.PI/2,0,0);dummy.scale.setScalar(r);dummy.updateMatrix();this.rings.setMatrixAt(rings++,dummy.matrix);for(let i=0;i<8&&sparks<240;i++){const a=i*2.4+(effect.id||0),dist=r*(1+i%3);dummy.position.set(effect.position.x+Math.sin(a)*dist,effect.position.y+Math.sin(i*4)*dist*.5,effect.position.z+Math.cos(a)*dist);dummy.rotation.set(a,age*8,a);dummy.scale.setScalar(Math.max(.2,(1-age)*(effect.kind==='explosion'?2.5:.9)));dummy.updateMatrix();this.sparks.setMatrixAt(sparks++,dummy.matrix);}}
    this.sparks.count=sparks;this.rings.count=this.settings.reducedFlash?0:rings;this.sparks.instanceMatrix.needsUpdate=true;this.rings.instanceMatrix.needsUpdate=true;
    const speed=Math.hypot(p.velocity.x,p.velocity.y,p.velocity.z),chase=this.mode==='chase';
    const offset=chase?V(-Math.sin(p.heading)*40,26,-Math.cos(p.heading)*40):this.mode==='close'?V(0,42,-62):V(0,82,-115);
    const desired=position.clone().sub(this.origin).add(offset);desired.y=Math.max(desired.y,terrainHeight(desired.x+this.origin.x,desired.z+this.origin.z)+22);
    this.camera.position.lerp(desired,1-Math.exp(-dt*(this.settings.reducedMotion?10:5)));
    const look=position.clone().sub(this.origin).add(chase?V(Math.sin(p.heading)*38,0,Math.cos(p.heading)*38):V(0,0,this.mode==='close'?18:55));
    this.target.lerp(look,1-Math.exp(-dt*8));this.camera.lookAt(this.target);
    const fov=chase?52+clamp(speed/350,0,1)*8:this.mode==='close'?50:55;this.camera.fov+= (fov-this.camera.fov)*(1-Math.exp(-dt*3));this.camera.updateProjectionMatrix();
    this.sun.target.position.copy(position).sub(this.origin);this.sun.position.copy(this.sun.target.position).add(V(-400,700,300));this.renderer.render(this.scene,this.camera);this.frameMs=performance.now()-before;
    this.frames.push(rawDt*1000);if(this.frames.length>180)this.frames.shift();
    // Deliberately slow adaptation prevents resolution pumping on one missed frame.
    if(this.settings.quality==='auto'&&this.frames.length===180&&g.time-this.lastAdapt>3){const avg=this.frames.reduce((a,b)=>a+b,0)/180;const next=clamp(this.dpr+(avg>30?-.15:avg<19?.05:0),.65,1.25);if(next!==this.dpr){this.dpr=next;this.resize();}this.lastAdapt=g.time;}
  }
  restoreEnvironment(){this.envTarget.dispose();const pmrem=new T.PMREMGenerator(this.renderer);this.envTarget=pmrem.fromScene(this.environmentScene,.1,.1,100);this.scene.environment=this.envTarget.texture;pmrem.dispose();}
  aimAt(x,y,player){const ndc=new T.Vector2(x/innerWidth*2-1,1-y/innerHeight*2),ray=new T.Raycaster();ray.setFromCamera(ndc,this.camera);const plane=new T.Plane(up,-player.position.y),hit=V();if(!ray.ray.intersectPlane(plane,hit))return null;hit.add(this.origin).sub(V(player.position.x,player.position.y,player.position.z));hit.normalize();return {aimX:hit.x,aimY:hit.z};}
  project(pos){const v=V(pos.x,pos.y,pos.z).sub(this.origin).project(this.camera);return {x:(v.x+1)*innerWidth/2,y:(1-v.y)*innerHeight/2,visible:v.z<1&&Math.abs(v.x)<1&&Math.abs(v.y)<1};}
  metrics(){const r=this.renderer.info;return {calls:r.render.calls,triangles:r.render.triangles,geometries:r.memory.geometries,textures:r.memory.textures,dpr:this.dpr,renderMs:this.frameMs,frameMs:this.frames.length?this.frames.reduce((a,b)=>a+b,0)/this.frames.length:0,camera:this.mode,terrainChunks:this.tiles.size,origin:{x:this.origin.x,z:this.origin.z},renderer:'WebGL2',postPasses:0,shadowLights:1};}
  dispose(){this.disposed=true;window.removeEventListener('resize',this.handleResize);window.visualViewport?.removeEventListener('resize',this.handleResize);disposeTree(this.scene);this.regolith.dispose();disposeTree(this.environmentScene);this.envTarget.dispose();this.renderer.dispose();}
}
