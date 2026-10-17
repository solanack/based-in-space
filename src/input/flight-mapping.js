// Player controls are screen-relative; simulation and bots remain in world space.
export function mapFlightIntent(intent,basis){
 const horizontal=(x,z)=>{const n=Math.hypot(x,z)||1;return {x:x/n,z:z/n};};
 const right=horizontal(basis.right.x,basis.right.z),forward=horizontal(basis.forward.x,basis.forward.z);
 return {...intent,
  moveX:right.x*intent.moveX+forward.x*intent.moveY,
  moveY:right.z*intent.moveX+forward.z*intent.moveY,
  aimX:right.x*(intent.aimX||0)+forward.x*(intent.aimY||0),
  aimY:right.z*(intent.aimX||0)+forward.z*(intent.aimY||0)};
}
