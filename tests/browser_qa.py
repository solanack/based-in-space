"""Production-dist browser QA with actual CDP touches, lifecycle checks and captures."""
from pathlib import Path
import json, threading, http.server, functools, time, os, math, sys, base64
os.environ['PLAYWRIGHT_BROWSERS_PATH']='/tmp/moonfall-browsers'
ff=Path('/tmp/moonfall-browsers/ffmpeg-1011/ffmpeg-linux');ff.parent.mkdir(parents=True,exist_ok=True)
if not ff.exists(): ff.symlink_to('/usr/bin/ffmpeg')
from playwright.sync_api import sync_playwright
from PIL import Image, ImageStat
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'artifacts'/('qa-flight-feel' if '--flight-feel' in sys.argv else 'qa-controls-review' if '--controls-review' in sys.argv else 'qa-production' if '--production' in sys.argv else 'qa-context' if '--context-only' in sys.argv else 'qa-final' if '--quick' in sys.argv else 'qa-2026-10-17');OUT.mkdir(parents=True,exist_ok=True)
class Quiet(http.server.SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
server=http.server.ThreadingHTTPServer(('127.0.0.1',5188),functools.partial(Quiet,directory=str(ROOT/'dist')))
threading.Thread(target=server.serve_forever,daemon=True).start()
report={'runId':'moonfall-final' if '--quick' in sys.argv else 'moonfall-2026-10-17-pass2','captures':[],'checks':{},'errors':[],'resources':[]}
def capture(page,name):
 path=OUT/(name+'.png');page.screenshot(path=str(path));im=Image.open(path).convert('RGB');stat=ImageStat.Stat(im)
 raw=page.evaluate('(()=>{const r=moonfall.renderer;r.renderer.render(r.scene,r.camera);return r.canvas.toDataURL("image/png").split(",")[1]})()');canvas_path=OUT/(name+'-canvas.png');canvas_path.write_bytes(base64.b64decode(raw));canvas_stat=ImageStat.Stat(Image.open(canvas_path).convert('RGB'));assert max(canvas_stat.stddev)>10,'Blank canvas';metrics=page.evaluate('moonfall.diagnostics()');report['captures'].append({'name':name,'viewport':page.viewport_size,'path':str(path.relative_to(ROOT)),'metrics':metrics,'pixelChannelStdDev':stat.stddev,'entropy':im.entropy(),'canvasStdDev':canvas_stat.stddev});print(name,json.dumps(metrics),flush=True)
def bounds(page):
 return page.locator('#flight-controls [data-layout]').evaluate_all('(ns)=>ns.map(n=>({id:n.dataset.layout,...Object.fromEntries(["x","y","width","height"].map(k=>[k,n.getBoundingClientRect()[k]]))}))')
def check_layout(items,w,h):
 problems=[]
 for a in items:
  if a['x']<0 or a['y']<0 or a['x']+a['width']>w+.1 or a['y']+a['height']>h+.1:problems.append(a['id']+' outside')
  if a['id']!='stick' and min(a['width'],a['height'])<48:problems.append(a['id']+' too small')
 for i,a in enumerate(items):
  for b in items[i+1:]:
   if a['x']<b['x']+b['width'] and a['x']+a['width']>b['x'] and a['y']<b['y']+b['height'] and a['y']+a['height']>b['y']:problems.append(a['id']+' overlaps '+b['id'])
 return problems
try:
 with sync_playwright() as p:
  browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader'])
  context=browser.new_context(viewport={'width':844,'height':390},is_mobile=True,has_touch=True,device_scale_factor=1,record_video_dir=str(OUT/'video'),record_video_size={'width':844,'height':390})
  page=context.new_page();page.on('pageerror',lambda e:report['errors'].append(str(e)));page.on('console',lambda m:report['errors'].append(m.text) if m.type=='error' else None);page.on('response',lambda r:report['resources'].append({'url':r.url,'status':r.status}) if r.status>=400 else None)
  page.goto(('https://based-in-space-preview.vercel.app/' if '--production' in sys.argv else 'http://127.0.0.1:5188/')+'?qa=1',wait_until='networkidle');page.wait_for_function('!!window.moonfall');page.locator('#deploy').click();page.wait_for_timeout(1200)
  if '--flight-feel' in sys.argv:
   cdp=context.new_cdp_session(page)
   def finger(kind,points):cdp.send('Input.dispatchTouchEvent',{'type':kind,'touchPoints':[{'id':i,'x':x,'y':y,'radiusX':6,'radiusY':6,'force':1} for i,x,y in points]})
   page.evaluate('moonfall.setPausedForScreenshot(true)');box=page.locator('#flight-stick').bounding_box();sx=box['x']+box['width']/2;sy=box['y']+box['height']/2
   finger('touchStart',[(1,sx+22,sy+12)]);raw=page.evaluate('moonfall.controls.sample()');assert raw['moveX']==0 and raw['moveY']==0;report['checks']['floatingOriginNoJump']=True;finger('touchEnd',[])
   def flight_sample(dx,dy,extra=None):
    before=page.evaluate('({heading:moonfall.game.player.heading,y:moonfall.game.player.position.y,z:moonfall.game.player.position.z})');finger('touchStart',[(1,sx,sy)]);finger('touchMove',[(1,sx+dx,sy+dy)]);intent=page.evaluate('moonfall.readIntent()');page.evaluate('moonfall.step(24,moonfall.readIntent())');after=page.evaluate('({heading:moonfall.game.player.heading,y:moonfall.game.player.position.y,z:moonfall.game.player.position.z})');finger('touchEnd',[]);return {'before':before,'after':after,'intent':intent}
   right=flight_sample(35,0);left=flight_sample(-35,0);up=flight_sample(0,-35);down=flight_sample(0,35)
   report['checks']['noseTurnsAndPitch']=[right,left,up,down]
   assert right['after']['heading']<right['before']['heading'];assert left['after']['heading']>left['before']['heading'];assert up['after']['y']>up['before']['y'];assert down['after']['y']<down['before']['y'];report['checks']['noseTurnsAndPitch']=[right,left,up,down]
   fire=page.locator('[data-action=fire]').bounding_box();fx=fire['x']+fire['width']/2;fy=fire['y']+fire['height']/2
   finger('touchStart',[(1,sx,sy),(2,fx,fy)]);finger('touchMove',[(1,sx+28,sy-18),(2,fx,fy-35)]);intent=page.evaluate('moonfall.readIntent()');assert intent['fire'] and intent['boost'] and intent['turn']>0 and intent['climb']>0;page.evaluate('moonfall.step(30,moonfall.readIntent())');report['checks']['twoThumbCombat']=intent;finger('touchEnd',[])
   page.evaluate('moonfall.setPausedForScreenshot(false)');page.keyboard.down('KeyD');page.keyboard.down('Space');page.wait_for_timeout(1000);page.keyboard.up('KeyD');page.wait_for_timeout(1000);page.keyboard.down('KeyW');page.wait_for_timeout(700);page.keyboard.up('KeyW');page.keyboard.up('Space');page.evaluate('moonfall.setPausedForScreenshot(true)')
   for w,h in [(844,390),(640,360),(932,430)]:
    page.set_viewport_size({'width':w,'height':h});page.wait_for_timeout(250);assert not check_layout(bounds(page),w,h);page.evaluate('for(let n=0;n<30;n++)moonfall.renderer.frame(moonfall.game,1/60,1,moonfall.readIntent())');capture(page,f'{w}x{h}-flight');assert page.evaluate('moonfall.renderer.metrics().camera')=='flight'
   page.locator('#pause-button').click();assert page.evaluate('moonfall.screen')=='paused';page.locator('#deploy').click();page.evaluate('moonfall.setPausedForScreenshot(false)');report['checks']['pauseClearsControls']=not page.evaluate('moonfall.controls.sample().fire')
   context.close();browser.close();assert not report['errors'];assert not report['resources'];sys.exit(0)
  if '--controls-review' in sys.argv:
   cdp=context.new_cdp_session(page)
   def send_touch(kind,points):cdp.send('Input.dispatchTouchEvent',{'type':kind,'touchPoints':[{'id':i,'x':x,'y':y,'radiusX':5,'radiusY':5,'force':1} for i,x,y in points]})
   assert page.locator('[data-action=up],[data-action=down]').count()==0
   box=page.locator('#flight-stick').bounding_box();sx=box['x']+box['width']/2;sy=box['y']+box['height']/2
   measurements=[]
   for dx,dy in [(30,0),(-30,0),(0,-30),(0,30)]:
    page.evaluate('moonfall.controls.release();moonfall.game.player.velocity={x:0,y:0,z:0}')
    before=page.evaluate('({...moonfall.game.player.position})');send_touch('touchStart',[(1,sx+dx,sy+dy)]);page.wait_for_timeout(300);state=page.evaluate('({p:moonfall.game.player.position,input:moonfall.input,basis:moonfall.renderer.flightBasis()})');send_touch('touchEnd',[])
    if dx:assert state['input']['moveX']*state['basis']['right']['x']*dx>0
    if dy:assert (state['p']['y']-before['y'])*(-dy)>0
    measurements.append({'stick':[dx,dy],'before':before,'after':state['p'],'mappedInput':state['input']})
   report['checks']['screenRelativeFlight']=measurements
   fire=page.locator('[data-action=fire]').bounding_box();fx=fire['x']+fire['width']/2;fy=fire['y']+fire['height']/2
   send_touch('touchStart',[(1,sx+28,sy-16),(2,fx,fy)]);send_touch('touchMove',[(1,sx+28,sy-16),(2,fx,fy-35)]);page.wait_for_timeout(200);intent=page.evaluate('moonfall.controls.sample()');assert intent['fire'] and intent['boost'] and intent['altitude']>0;report['checks']['twoThumbFlight']=intent;send_touch('touchEnd',[])
   for w,h in [(844,390),(640,360),(932,430)]:
    page.set_viewport_size({'width':w,'height':h});page.wait_for_timeout(400);issues=check_layout(bounds(page),w,h);assert not issues,issues
    page.evaluate('moonfall.controls.release();moonfall.setPausedForScreenshot(true);for(let n=0;n<45;n++)moonfall.renderer.frame(moonfall.game,1/60,1,{})')
    capture(page,f'{w}x{h}-controls-fixed');text=page.locator('#hud').inner_text();report['checks'][f'hud-{w}']={'visibleText':text,'layoutIssues':issues};assert len(text.split())<12,text
    assert page.evaluate('moonfall.renderer.metrics().camera')=='close'
    span=page.evaluate('(()=>{const r=moonfall.renderer,p=moonfall.game.player.position,a=r.project({x:p.x-11,y:p.y,z:p.z}),b=r.project({x:p.x+11,y:p.y,z:p.z});return Math.abs(a.x-b.x)})()');report['checks'][f'heroPixels-{w}']=span;assert span>70,span
    page.evaluate('moonfall.setPausedForScreenshot(false)')
   page.locator('#pause-button').click();assert page.evaluate('moonfall.screen')=='paused';page.locator('#deploy').click();report['checks']['pauseResume']=True
   context.close();browser.close();assert not report['errors'];assert not report['resources'];sys.exit(0)
  if '--production' in sys.argv:
   page.wait_for_timeout(800);assert page.locator('#hud').is_visible();assert page.evaluate('moonfall.readIntent().flightMode')=='arcade';assert page.evaluate('moonfall.renderer.metrics().camera')=='flight';assert page.locator('#pause-button').bounding_box()['x']>page.viewport_size['width']-85;assert page.locator('[data-action=up],[data-action=down]').count()==0;assert len(page.locator('#hud').inner_text().split())<12;page.keyboard.down('KeyD');page.keyboard.down('Space');page.wait_for_timeout(1000);page.keyboard.up('KeyD');page.keyboard.up('Space');assert page.evaluate('moonfall.game.player.heading')<0;capture(page,'live-production');gl=page.evaluate('(()=>{const gl=moonfall.renderer.renderer.getContext(),ext=gl.getExtension("WEBGL_debug_renderer_info");return ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER)})()');report['checks']['gpu']=gl;report['checks']['liveGame']=page.evaluate('moonfall.snapshot()');context.close();browser.close();assert not report['errors'];assert not report['resources'];sys.exit(0)
  if '--context-only' in sys.argv:
   page.evaluate('window.testContextLoss=moonfall.renderer.renderer.getContext().getExtension("WEBGL_lose_context");window.testContextLoss.loseContext()');page.wait_for_timeout(250);assert page.evaluate('moonfall.screen')=='paused';page.evaluate('window.testContextLoss.restoreContext()');page.wait_for_function('document.body.dataset.context==="ready"');page.locator('#deploy').click();page.wait_for_timeout(400);capture(page,'context-restored');context.set_offline(True);page.keyboard.down('KeyW');page.wait_for_timeout(300);page.keyboard.up('KeyW');assert page.evaluate('moonfall.game.time')>0;context.set_offline(False);report['checks']['contextRestore']=True;report['checks']['offlineAfterLoad']=True;report['checks']['singleRenderer']=page.evaluate('moonfall.renderer.renderer.getContext() instanceof WebGL2RenderingContext');context.close();browser.close();sys.exit(0)
  cdp=context.new_cdp_session(page)
  def touch(kind,points):cdp.send('Input.dispatchTouchEvent',{'type':kind,'touchPoints':[{'x':x,'y':y,'id':i,'radiusX':6,'radiusY':6,'force':1} for i,x,y in points]})
  items=bounds(page);by={i['id']:i for i in items};center=lambda a:(a['x']+a['width']/2,a['y']+a['height']/2)
  sx,sy=center(by['stick']);fx,fy=center(by['fire']);bx,byy=center(by['boost'])
  start=page.evaluate('moonfall.snapshot()');touch('touchStart',[(1,sx+35,sy-15),(2,fx,fy),(3,bx,byy)]);page.wait_for_timeout(1800)
  controls=page.evaluate('moonfall.controls.sample()');report['checks']['multitouch']=controls
  assert controls['moveX']>.4 and controls['fire'] and controls['boost'],'Simultaneous controls failed'
  assert page.evaluate('moonfall.game.player.heat')>0,'Fire did not reach simulation'
  capture(page,'844x390-active-play');touch('touchEnd',[]);touch('touchStart',[(1,sx+35,sy-15),(2,fx,fy)]);touch('touchMove',[(1,sx+35,sy-15),(2,fx,fy-36)]);page.wait_for_timeout(150);two=page.evaluate('moonfall.controls.sample()');report['checks']['twoThumbBoost']=two;assert two['fire'] and two['boost'] and two['moveX']>.4;touch('touchEnd',[]);page.wait_for_timeout(200);report['checks']['release']=page.evaluate('moonfall.controls.sample()');assert not report['checks']['release']['fire']
  report['checks']['audio']=page.evaluate('moonfall.audio.diagnostics()');assert report['checks']['audio']['state']=='running'
  page.locator('#pause-button').click();t=page.evaluate('moonfall.game.time');page.wait_for_timeout(350);assert page.evaluate('moonfall.game.time')==t;report['checks']['pause']=True;page.locator('#deploy').click()
  page.evaluate('moonfall.setPausedForScreenshot(true);moonfall.game.enemies[0].position={x:moonfall.game.player.position.x,y:moonfall.game.player.position.y,z:moonfall.game.player.position.z+230};moonfall.game.player.heading=0');mi=by['missile'];mx,my=center(mi);touch('touchStart',[(4,mx,my)]);page.evaluate('moonfall.step(45,moonfall.controls.sample())');assert page.evaluate('moonfall.game.lock.ready');before_ammo=page.evaluate('moonfall.game.player.missiles');touch('touchEnd',[]);page.evaluate('moonfall.step(1,moonfall.controls.sample())');assert page.evaluate('moonfall.game.player.missiles')==before_ammo-1;report['checks']['touchMissile']=True;page.evaluate('moonfall.setPausedForScreenshot(false)')
  # Thirty seconds of unpaused real input: steer, shoot, boost, reverse and climb.
  began=time.monotonic();page.keyboard.down('KeyW');page.keyboard.down('Space')
  for i in range(1 if '--quick' in sys.argv else 6):
   key=['Shift','KeyD','KeyS','KeyA','KeyE','Control'][i];page.keyboard.down(key);page.wait_for_timeout(200 if '--quick' in sys.argv else 5000);page.keyboard.up(key)
  page.keyboard.up('KeyW');page.keyboard.up('Space');report['checks']['motionSeconds']=time.monotonic()-began
  capture(page,'844x390-after-flight');report['checks']['travel']={'start':start,'end':page.evaluate('moonfall.snapshot()')}
  page.evaluate('moonfall.pause()');page.locator('#settings-toggle').click();page.locator('[data-setting="mute"]').check();assert page.evaluate('moonfall.audio.diagnostics().muted');page.locator('[data-setting="mute"]').uncheck();page.locator('#settings-close').click();page.locator('#deploy').click();report['checks']['mute']=True
  for w,h in [(640,360),(932,430),(1440,900)]:
   page.set_viewport_size({'width':w,'height':h});page.wait_for_timeout(500);page.evaluate('moonfall.setState("active-play")');page.wait_for_timeout(300);issues=check_layout(bounds(page),w,h);report['checks'][f'layout-{w}x{h}']=issues;assert not issues,issues;capture(page,f'{w}x{h}-active-play')
  page.set_viewport_size({'width':844,'height':390});page.evaluate('moonfall.setState("siege")');page.wait_for_timeout(500);capture(page,'844x390-siege')
  page.evaluate('moonfall.setState("failed")');assert page.locator('h1').inner_text()=='SIGNAL LOST';page.locator('#deploy').click();assert page.evaluate('moonfall.game.player.hp')>0;report['checks']['retry']=True
  page.evaluate('moonfall.setState("debrief")');page.wait_for_timeout(200);credits=page.evaluate('moonfall.game.save.credits');page.locator('[data-upgrade="hull"]').click();report['checks']['upgrade']={'creditsBefore':credits,'creditsAfter':page.evaluate('moonfall.game.save.credits'),'level':page.evaluate('moonfall.game.save.upgrades.hull')};assert report['checks']['upgrade']['level']==1
  page.locator('#deploy').click();assert page.evaluate('moonfall.game.player.maxHp')==120
  page.set_viewport_size({'width':390,'height':844});page.wait_for_timeout(300);assert page.locator('#rotate-message').is_visible();assert page.evaluate('moonfall.screen')=='paused';report['checks']['portrait']=True
  page.set_viewport_size({'width':844,'height':390});page.wait_for_timeout(300);page.locator('#deploy').click()
  page.evaluate('window.testContextLoss=moonfall.renderer.renderer.getContext().getExtension("WEBGL_lose_context");window.testContextLoss.loseContext()');page.wait_for_timeout(300);assert page.evaluate('moonfall.screen')=='paused';page.evaluate('window.testContextLoss.restoreContext()');page.wait_for_timeout(800);report['checks']['contextRestore']=page.evaluate('document.body.dataset.context');assert report['checks']['contextRestore']=='ready'
  report['checks']['canvasCount']=page.locator('#game').count();assert report['checks']['canvasCount']==1
  context.close();browser.close()
finally:
 server.shutdown();(OUT/'report.json').write_text(json.dumps(report,indent=2));print('REPORT',json.dumps({'errors':report['errors'],'resources':report['resources'],'checks':report['checks']}),flush=True)
assert not report['errors'],report['errors']
assert not report['resources'],report['resources']
