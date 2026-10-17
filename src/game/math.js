export const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const lerp=(a,b,t)=>a+(b-a)*t;
export const vec=(x=0,y=0,z=0)=>({x,y,z});
export const copy=v=>({...v});
export const sub=(a,b)=>vec(a.x-b.x,a.y-b.y,a.z-b.z);
export const add=(a,b)=>vec(a.x+b.x,a.y+b.y,a.z+b.z);
export const scale=(a,s)=>vec(a.x*s,a.y*s,a.z*s);
export const dot=(a,b)=>a.x*b.x+a.y*b.y+a.z*b.z;
export const length=v=>Math.hypot(v.x,v.y,v.z);
export const distance=(a,b)=>length(sub(a,b));
export function normalize(v){const l=length(v);return l>1e-8?scale(v,1/l):vec();}
export function angleDelta(a,b){return Math.atan2(Math.sin(b-a),Math.cos(b-a));}
export const forward=(heading,pitch=0)=>vec(Math.sin(heading)*Math.cos(pitch),Math.sin(pitch),Math.cos(heading)*Math.cos(pitch));
// Closest point on the relative swept segment: moving targets cannot tunnel.
export function sweptSphere(a0,a1,b0,b1,radius){
 const start=sub(a0,b0),delta=sub(sub(a1,a0),sub(b1,b0));
 const t=clamp(-dot(start,delta)/(dot(delta,delta)||1),0,1);
 return length(add(start,scale(delta,t)))<=radius;
}
export function sphereImpactTime(start,end,center,radius){
 const offset=sub(start,center),delta=sub(end,start),c=dot(offset,offset)-radius*radius;
 if(c<=0)return 0;
 const a=dot(delta,delta),b=2*dot(offset,delta),disc=b*b-4*a*c;
 if(a<1e-10||disc<0)return null;
 const t=(-b-Math.sqrt(disc))/(2*a);return t>=0&&t<=1?t:null;
}
export function turnToward(current,desired,maxAngle){
 const a=normalize(current),b=normalize(desired),d=clamp(dot(a,b),-1,1),angle=Math.acos(d);
 if(angle<=maxAngle)return b;
 let axis=normalize(sub(b,scale(a,d)));
 if(length(axis)<.001)axis=normalize(Math.abs(a.y)<.9?vec(-a.z,0,a.x):vec(1,0,0));
 return add(scale(a,Math.cos(maxAngle)),scale(axis,Math.sin(maxAngle)));
}
