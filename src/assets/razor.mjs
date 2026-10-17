/* Space Is Based Phase 3.6: opt-in live-3D RAZOR visual experiment.
   No authoritative game state is modified. All models are original authored geometry. */
export const THREE36_VERSION='razor-live3d-obsidian-3';
export const RAZOR_PALETTE=Object.freeze({
  pianoBlack:0x07090d, graphiteBlack:0x151a21, carbonRecess:0x040608,
  racingRed:0xb91223, brakeRed:0xe22434, pearlWhite:0xf1f3f2,
  steel:0x919ba7, smokedCanopy:0x09131b, engineIce:0xb9d4f2
});
export const MODEL_LIMIT=1;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,Number(v)||0));

function mat(T,color,metal=.6,rough=.34,glow=0){
  return new T.MeshStandardMaterial({color,metalness:metal,roughness:rough,flatShading:false,
    emissive:color,emissiveIntensity:glow});
}
// Controlled clearcoat highlights create a glossy black finish without bloom.
function gloss(T,color,roughness=.19,metalness=.82){
  return new T.MeshPhysicalMaterial({
    color,metalness,roughness,clearcoat:1,clearcoatRoughness:.075,
    emissive:color,emissiveIntensity:0
  });
}
function panel(T,points,depth,material,height=0,bevel=.035){
  const shape=new T.Shape();
  points.forEach(([x,z],i)=>i?shape.lineTo(x,z):shape.moveTo(x,z));
  shape.closePath();
  const geo=new T.ExtrudeGeometry(shape,{depth,steps:1,bevelEnabled:bevel>0,bevelSegments:2,
    bevelThickness:bevel,bevelSize:bevel,curveSegments:1});
  geo.rotateX(Math.PI/2);
  const piece=new T.Mesh(geo,material);
  piece.position.y=height;
  piece.castShadow=true;
  piece.receiveShadow=true;
  return piece;
}
function prism(T,w,h,d,material,x,y,z,angle=0){
  const mesh=new T.Mesh(new T.BoxGeometry(w,h,d),material);
  mesh.position.set(x,y,z);
  mesh.rotation.y=angle;
  mesh.castShadow=true;
  mesh.receiveShadow=true;
  return mesh;
}
function rod(T,r1,r2,length,material,x,y,z){
  const m=new T.Mesh(new T.CylinderGeometry(r1,r2,length,10,1),material);
  m.rotation.x=Math.PI/2;
  m.position.set(x,y,z);
  m.castShadow=true;
  return m;
}
function mirror(points,side){return points.map(([x,z])=>[x*side,z]);}
function addArc(T,root,cx,cz,r,start,end,color,thickness=.012,y=.43){
  const curve=new T.EllipseCurve(cx,cz,r,r,start,end,false,0);
  const pts=curve.getPoints(20);
  const geo=new T.BufferGeometry().setFromPoints(pts.map(p=>new T.Vector3(p.x,y,p.y)));
  root.add(new T.Line(geo,new T.LineBasicMaterial({color,linewidth:thickness})));
}
function warningStripe(T,root,x,z,s,material){
  root.add(prism(T,.055,.008,.26,material,x,.32,z,.55*s));
}
// Phase 3.6 pass 2 — scissor-wing silhouette, believable hardware, painted markings.
// Explicitly authored, deterministic details. These meshes never affect gameplay.
// Collapse static geometry by material into a small set of indexed-free buffers.
// Repeated hard-surface pieces remain independently authored in source code;
// only their GPU representation is batched. The articulated turret remains separate.
function batchStaticMeshes(T,group){
  const batches=new Map();
  for(const mesh of [...group.children]){
    if(!mesh.isMesh||!mesh.geometry||!mesh.material||Array.isArray(mesh.material)||mesh.material.transparent)continue;
    if(!batches.has(mesh.material))batches.set(mesh.material,[]);
    batches.get(mesh.material).push(mesh);
  }
  let before=0,after=0,triangles=0;
  for(const [material,meshes] of batches){
    before+=meshes.length;
    if(meshes.length<2){after++;continue;}
    const data=[],position=[],normal=[],uv=[];
    let vertices=0;
    for(const mesh of meshes){
      mesh.updateMatrix();
      const geo=mesh.geometry.index?mesh.geometry.toNonIndexed():mesh.geometry.clone();
      geo.applyMatrix4(mesh.matrix);
      const p=geo.getAttribute('position'),n=geo.getAttribute('normal'),t=geo.getAttribute('uv');
      if(!p||!n){geo.dispose();continue;}
      data.push({mesh,geo,p,n,t});
      vertices+=p.count;
    }
    if(data.length<2){for(const e of data)e.geo.dispose();after+=meshes.length;continue;}
    const dest=new T.BufferGeometry();
    const xyz=new Float32Array(vertices*3),norm=new Float32Array(vertices*3),coords=new Float32Array(vertices*2);
    let offset=0;
    for(const e of data){
      xyz.set(e.p.array,offset*3);norm.set(e.n.array,offset*3);
      if(e.t)coords.set(e.t.array,offset*2);
      offset+=e.p.count;triangles+=e.p.count/3;
      group.remove(e.mesh);e.mesh.geometry.dispose();e.geo.dispose();
    }
    dest.setAttribute('position',new T.BufferAttribute(xyz,3));
    dest.setAttribute('normal',new T.BufferAttribute(norm,3));
    dest.setAttribute('uv',new T.BufferAttribute(coords,2));
    dest.computeBoundingSphere();
    const baked=new T.Mesh(dest,material);
    baked.name='batched hard-surface material '+material.name;
    baked.castShadow=true;baked.receiveShadow=true;
    group.add(baked);after++;
  }
  return {before,after,triangles};
}

function refineRazor(T,root,M,add) {
  const C=RAZOR_PALETTE;
  const armor=gloss(T,C.graphiteBlack,.21),porcelain=gloss(T,C.pearlWhite,.20,.53),
    carbide=mat(T,C.carbonRecess,.66,.46),hot=mat(T,C.brakeRed,.48,.3,.14),
    warning=mat(T,C.pearlWhite,.5,.29),blue=mat(T,C.engineIce,.24,.27,.24);
  Object.assign(M,{armorAccent:armor,porcelain,carbide,hot,warning,blue});
  const micro=new T.Group();micro.name='inspection-detail — hide at mobile fast tier';root.add(micro);
  function stamp(x,y,z,w,h,material,angle=0) {
    const item=prism(T,w,.014,h,material,x,y,z,angle);
    micro.add(item);
  }
  for(const side of [-1,1]) {
    // Forward-swept scissor-canard separates RAZOR from the other Phase 3 ships.
    // The negative-space notch between blade and main fuselage is intentional.
    const blade=mirror([[-1.04,-1.78],[-2.24,-1.39],[-3.32,.66],[-2.75,1.18],[-1.60,1.02],[-1.95,.40],[-1.30,-.23]],side);
    add(panel(T,blade,.15,carbide,.28,.035));
    // Keep the huge wing face graphite-black: white is a razor-thin leading edge.
    add(panel(T,mirror([[-2.19,-1.00],[-3.17,.65],[-2.80,.88],[-2.05,.46],[-2.38,.32]],side),.07,armor,.48,.014));
    add(panel(T,mirror([[-2.53,-.55],[-3.13,.66],[-2.97,.79],[-2.32,-.43]],side),.022,porcelain,.535,.008));
    add(panel(T,mirror([[-1.43,-.50],[-2.19,-.38],[-2.62,.26],[-1.91,.10]],side),.06,M.hull,.50,.015));
    add(panel(T,mirror([[-1.72,-.30],[-2.28,-.14],[-2.41,.09],[-1.82,-.15]],side),.026,hot,.57,.008));
    // Bright forward spear / no collision change — only the artwork overhangs.
    add(panel(T,mirror([[-2.87,.65],[-3.30,1.56],[-2.57,1.16],[-2.58,.91]],side),.055,armor,.48,.012));
    add(panel(T,mirror([[-3.30,1.56],[-3.40,1.83],[-3.14,1.51]],side),.048,hot,.50,.008));
    // Rear stabilizer with a saw-tooth instead of more identical side plates.
    add(panel(T,mirror([[-1.18,-1.40],[-1.95,-2.11],[-2.38,-2.33],[-2.17,-1.48],[-1.81,-1.14]],side),.13,M.dark,.16,.02));
    add(panel(T,mirror([[-1.96,-2.11],[-2.32,-2.32],[-2.17,-1.58]],side),.044,M.copper,.36,.012));
    // Structural spar genuinely spans the detached forward blade.
    add(prism(T,.12,.12,1.68,M.dark,side*1.71,.30,-.70,side*.57));
    add(prism(T,.078,.07,1.50,porcelain,side*1.79,.44,-.63,side*.57));
    // Armored gimbaled cannon shoulders, rotating clear of the scissor vanes.
    const gimbal=new T.Group();gimbal.position.set(side*1.17,.54,.63);root.add(gimbal);
    gimbal.add(prism(T,.44,.23,.7,carbide,0,0,0));
    gimbal.add(prism(T,.37,.10,.68,armor,0,.16,.04));
    gimbal.add(rod(T,.095,.13,1.04,porcelain,0,.02,.78));
    gimbal.add(rod(T,.06,.075,.20,M.vents,0,.03,1.36));
    gimbal.add(prism(T,.06,.05,.46,hot,side*.20,.16,.04));
    gimbal.name='scissor-pod-'+side;
    // Energy injector / gyroscope hardware, bounded and useful at closer range.
    add(prism(T,.21,.16,.62,M.vents,side*.79,.76,-1.07));
    add(prism(T,.13,.07,.32,blue,side*.79,.84,-1.03));
    const rings=[-.88,-1.07,-1.26];
    for(const z of rings)stamp(side*1.59,.555,z,.045,.23,M.edge,side*.35);
    for(let i=0;i<6;i++){
      const z=-.84+i*.17;
      stamp(side*(1.73+i*.028),.525,z,.06,.11,i%2?hot:M.vents,side*.20);
    }
    // Thruster fairing and heat-shield vent teeth point toward real nozzles.
    add(prism(T,.44,.20,1.18,carbide,side*.79,.10,-1.60));
    for(let i=0;i<7;i++)stamp(side*(.77+(i%2)*.065),.39,-1.52+i*.16,.25,.03,M.vents);
    // Small navigation position light, no screen-filling fake bloom.
    add(prism(T,.08,.07,.21,blue,side*3.13,.52,.93));
    for(let i=0;i<4;i++)stamp(side*(1.1+i*.13),.625,.86-i*.15,.06,.04,warning);
  }
  // Receding armored spine, plated maintenance latch and cockpit pressure ribs.
  add(panel(T,[[-.19,-1.93],[.19,-1.93],[.25,-1.18],[.16,-.86],[-.16,-.86],[-.25,-1.18]],.035,carbide,.82,.018));
  add(panel(T,[[-.12,-1.85],[.12,-1.85],[.17,-1.28],[0,-1.10],[-.17,-1.28]],.015,armor,.88,.006));
  for(let z=-.47;z<1.12;z+=.24)stamp(0,.944,z,.47,.028,porcelain);
  for(const side of [-1,1])stamp(side*.33,.81,.74,.05,.9,carbide);
  // Identification/warning livery is an actual transparent decal mesh,
  // not screen-space UI. At mobile fast quality it can be hidden safely.
  if(typeof document!=='undefined'){
    const canvas=document.createElement('canvas');canvas.width=512;canvas.height=128;
    const ctx=canvas.getContext('2d');
    if(ctx){
      ctx.clearRect(0,0,512,128);
      ctx.fillStyle='#df2234';ctx.font='900 58px system-ui';ctx.fillText('RZR // 07',13,61);
      ctx.fillStyle='#f1f3f2';ctx.font='700 20px monospace';ctx.fillText('HIGH-VELOCITY INTERCEPTOR',17,96);
      const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;
      const m=new T.MeshBasicMaterial({map:texture,transparent:true,side:T.DoubleSide,depthWrite:false});
      const decal=new T.Mesh(new T.PlaneGeometry(.93,.24),m);
      decal.rotation.x=-Math.PI/2;decal.position.set(.34,.86,-1.41);
      micro.add(decal);
    }
  }
  root.userData.micro=micro;
  root.userData.visualSize=[7.15,5.65];
  root.userData.designPass='P3 obsidian-black / red / white';
  root.userData.geometryReadOnly=true;
  return root;
}

/** Dimensions ~7.15 x 5.65 world units. Nose is +Z, towards the lower gameplay edge. */
export function createRazor(T){
  const root=new T.Group(); root.name='RAZOR — OBSIDIAN high-gloss interceptor';
  const C=RAZOR_PALETTE;
  const M={
    hull:gloss(T,C.pianoBlack,.16,.84),armor:gloss(T,C.graphiteBlack,.21,.79),
    dark:mat(T,C.carbonRecess,.7,.43),edge:gloss(T,C.pearlWhite,.22,.54),
    copper:mat(T,C.racingRed,.57,.30),hazard:mat(T,C.brakeRed,.39,.31),
    glass:new T.MeshPhysicalMaterial({color:C.smokedCanopy,metalness:.53,roughness:.13,
      clearcoat:1,clearcoatRoughness:.09,transparent:false}),
    vents:mat(T,C.carbonRecess,.5,.64),light:mat(T,C.brakeRed,.18,.32,.38),
    core:mat(T,C.racingRed,.34,.28,.34),
    exhaust:mat(T,C.engineIce,.04,.32,.88),
    scorch:mat(T,0x20242b,.65,.65)
  };
  const add=(o)=>{root.add(o);return o;};
  add(panel(T,[[-.60,-1.9],[.60,-1.9],[.76,-.65],[.62,.85],[0,2.78],[-.62,.85],[-.76,-.65]],.38,M.dark,.18,.06));
  add(panel(T,[[-.43,-1.65],[.43,-1.65],[.55,.16],[.38,1.45],[0,2.7],[-.38,1.45],[-.55,.16]],.13,M.armor,.48,.045));
  add(panel(T,[[-.25,-1.40],[.25,-1.40],[.42,.42],[.24,1.65],[0,2.58],[-.24,1.65],[-.42,.42]],.06,M.hull,.69,.02));
  for(const side of [-1,1]){
    // Wings deliberately have two angular structural tiers, not a flat polygon.
    add(panel(T,mirror([[-.36,-1.36],[-1.14,-1.64],[-2.34,-1.05],[-2.05,-.48],[-1.43,.28],[-.58,1.28]],side),.22,M.hull,.16,.035));
    add(panel(T,mirror([[-.61,-1.14],[-1.38,-1.30],[-2.04,-.98],[-1.63,-.69],[-.85,.05]],side),.075,M.armor,.43,.025));
    add(panel(T,mirror([[-.88,-1.10],[-1.32,-1.17],[-1.60,-.95],[-1.29,-.86]],side),.024,M.copper,.54,.01));
    add(panel(T,mirror([[-.65,.18],[-1.15,.12],[-1.38,.57],[-.68,1.38]],side),.095,M.armor,.48,.025));
    add(panel(T,mirror([[-1.48,-1.06],[-2.02,-.91],[-1.72,-.67],[-1.34,-.81]],side),.045,M.edge,.55,.012));
    add(panel(T,mirror([[-1.55,.09],[-1.87,-.05],[-1.46,.48]],side),.06,M.dark,.25,.01));
    // Wide structural joint and steerable nose spar.
    add(prism(T,.17,.17,1.68,M.vents,side*.82,.32,-.40,-side*.09));
    add(prism(T,.12,.08,1.22,M.copper,side*1.44,.48,-.92,side*.46));
    add(prism(T,.08,.05,.66,M.edge,side*1.92,.50,-.78,side*.26));
    // Coaxial twin nozzles: solid turbine housing, inner emissive throat, fins.
    const x=side*.77;
    add(rod(T,.33,.27,1.17,M.dark,x,.20,-1.48));
    add(rod(T,.25,.27,.19,M.armor,x,.21,-1.97));
    add(rod(T,.18,.15,.16,M.exhaust,x,.21,-2.06));
    for(const off of [-.17,.17])add(prism(T,.05,.16,.90,M.edge,x+off,.36,-1.32));
    // Intakes, exposed louvers, fastening lines.
    add(prism(T,.32,.035,.79,M.vents,side*.99,.56,.18,side*.14));
    for(let i=0;i<7;i++)add(prism(T,.36,.026,.053,i%2?M.dark:M.scorch,side*(.99+.008*i),.60,.46-i*.13));
    for(let i=0;i<5;i++){
      add(prism(T,.07,.024,.20,M.hazard,side*(1.29+i*.135),.54,-1.04+i*.047,side*.13));
      add(prism(T,.14,.026,.05,M.edge,side*(.73+i*.10),.57,1.02-i*.22));
    }
    // Forward recessed cannon with mechanically correct +Z barrel direction.
    add(prism(T,.34,.22,.63,M.dark,side*.56,.45,.90));
    add(rod(T,.075,.085,.94,M.edge,side*.56,.42,1.55));
    add(rod(T,.044,.056,.16,M.vents,side*.56,.42,2.07));
    add(prism(T,.21,.04,.40,M.copper,side*.57,.64,1.02));
    for(let i=0;i<5;i++)add(prism(T,.025,.02,.25,M.vents,side*(1.57+i*.11),.47,-.83+i*.048));
    warningStripe(T,root,side*1.57,-.75,side,M.hazard);
    // A handful of grounded bolts around wing roots, not random surface noise.
    for(let i=0;i<4;i++){
      const bolt=new T.Mesh(new T.CylinderGeometry(.033,.033,.014,6),M.edge);
      bolt.position.set(side*(.68+i*.14),.595,-.70+i*.25);
      add(bolt);
    }
  }
  // Smoked canopy, black pressure frame and a narrow white center spine.
  add(panel(T,[[-.35,-.42],[.35,-.42],[.32,.86],[0,1.33],[-.32,.86]],.11,M.dark,.75,.035));
  add(panel(T,[[-.24,-.28],[.24,-.28],[.21,.76],[0,1.15],[-.21,.76]],.045,M.glass,.875,.01));
  add(prism(T,.065,.07,1.27,M.edge,0,.89,.32));
  add(prism(T,.48,.18,.36,M.armor,0,.60,-.84));
  for(let i=0;i<7;i++)add(prism(T,.42,.025,.045,i%2?M.vents:M.dark,0,.78,-.95-i*.12));
  // Power spine, shielded cooling vents, asymmetric identification livery.
  add(prism(T,.14,.06,.88,M.copper,0,.68,-1.47));
  add(prism(T,.1,.035,.42,M.light,0,.78,1.50));
  const rails=new T.Group();rails.name='movable-payload';root.add(rails);
  for(const s of [-1,1])rails.add(prism(T,.11,.09,.46,M.dark,s*1.27,.54,-.25));
  root.userData={kind:'razor',materials:M,rails,
    thrusterPositions:[[-.77,.20,-2.07],[.77,.20,-2.07]],
    weaponPositions:[[-.56,.42,2.07],[.56,.42,2.07]],
    visualSize:[7.15,5.65],triangles:0};
  refineRazor(T,root,M,add);
  const main=batchStaticMeshes(T,root),micro=batchStaticMeshes(T,root.userData.micro);
  root.userData.batching={main,micro};
  return root;
}
