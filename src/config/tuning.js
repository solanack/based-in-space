export const TUNING = {
 baseSpeed:72, boostSpeed:122, brakeSpeed:38, strafeSpeed:14, acceleration:65, drag:9,
 windowX:8, windowY:5, edgeSpring:28, boostDrain:24, boostRefill:18, boostReengage:20,
 rollDuration:.5, rollCooldown:.85, reflectRadius:1.2, loopDuration:.8, loopCooldown:3,
 hull:100, shield:70, pulseDamage:18, pulseCooldown:.11, projectileSpeed:300, pulseRadius:.32,
 lockDelay:.36, lockRate:.12, lockCone:3.6, maxLocks:8, homingDamage:50,
 bombDamage:130, collisionDamage:30, hitInvulnerability:.65,
 aimAssistRadius:2.7, aimAssistStrength:.32, aimAssistSticky:.14,
 aimAssistRadiusTouch:4.2, aimAssistStrengthTouch:.72, aimAssistStickyTouch:.38,
 aimAssistHold:1, aimAssistSwitch:.85, aimAssistHoldTouch:1.3, aimAssistSwitchTouch:.6,
 hitStop:.05, shotRecoil:.1,
 chaseLag:5.2, cameraFov:58, boostFov:72, cameraRoll:.13, shake:.28,
 chaseDistance:5.6, mobileChaseDistance:5.8, chaseHeight:1.35, boostChasePush:1.0, mobileFovBoost:5,
 portraitFit:3.0, portraitLift:1.5,
 portraitShortDist:5.4, portraitShortDrop:.35, portraitShortLift:3.5,
 portraitHeightFollow:1, portraitTargetFollow:.9,
 softAimMouse:2.7, softAimTouch:3.8
};
export function setTuning(key,value){
 if(!Object.hasOwn(TUNING,key)||!Number.isFinite(value))return false;
 const range=key==='maxLocks'?[1,8]
  :key==='mobileFovBoost'?[0,30]
  :key==='portraitFit'?[0,12]
  :key==='portraitShortDist'?[1,11]
  :key==='portraitShortDrop'?[0,2]
  :key==='portraitShortLift'?[0,8]
  :key==='portraitLift'?[0,4]
  :/^portrait(Height|Target)Follow$/.test(key)?[0,1.5]
  :/^softAim/.test(key)?[.5,8]
  :/Fov/.test(key)?[35,110]
  :key==='cameraRoll'?[0,.4]
  :key==='shake'?[0,1]
  :/aimAssistStrength|aimAssistSticky|shotRecoil|aimAssistStrengthTouch|aimAssistStickyTouch/.test(key)?[0,1]
  :/Duration|Cooldown|Delay|Rate|Invulnerability|hitStop/.test(key)?[.03,15]
  :key==='chaseLag'?[1,30]
  :/^(chaseDistance|mobileChaseDistance|chaseHeight|boostChasePush)$/.test(key)?[1,40]
  :/aimAssistRadius/.test(key)?[.5,10]
  :/^aimAssistHold/.test(key)?[1,2]
  :/^aimAssistSwitch/.test(key)?[.3,1]
  :[.01,1000];
 if(value<range[0]||value>range[1])return false;
 if(key==='maxLocks'&&!Number.isInteger(value))return false;
 TUNING[key]=value;return true;
}
