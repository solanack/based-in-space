"""Reproducible local browser evidence. Uses installed Playwright + system Chromium."""
from pathlib import Path
import json, threading, http.server, functools, time, os
os.environ["PLAYWRIGHT_BROWSERS_PATH"]="/tmp/moonfall-browsers"
ff=Path("/tmp/moonfall-browsers/ffmpeg-1011/ffmpeg-linux");ff.parent.mkdir(parents=True,exist_ok=True)
if not ff.exists(): ff.symlink_to("/usr/bin/ffmpeg")
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'artifacts'/'qa-2026-10-17'
OUT.mkdir(parents=True,exist_ok=True)
handler=functools.partial(http.server.SimpleHTTPRequestHandler,directory=str(ROOT/'dist'))
class Quiet(handler.func):
 def log_message(self,*args): pass
server=http.server.ThreadingHTTPServer(('127.0.0.1',5188),functools.partial(Quiet,directory=str(ROOT/'dist')))
threading.Thread(target=server.serve_forever,daemon=True).start()
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader'])
 context=browser.new_context(viewport={'width':844,'height':390},is_mobile=True,has_touch=True,device_scale_factor=1,record_video_dir=str(OUT/'video'),record_video_size={'width':844,'height':390})
 page=context.new_page();errors=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.on('console',lambda m: errors.append(m.text) if m.type=='error' else None)
 page.goto('http://127.0.0.1:5188/?qa=1',wait_until='networkidle')
 page.wait_for_timeout(1500)
 print('PAGE',page.title(),'ERRORS',errors,flush=True)
 page.screenshot(path=str(OUT/'first-menu.png'))
 page.locator('#deploy').click()
 page.wait_for_timeout(2500)
 page.screenshot(path=str(OUT/'first-play.png'))
 print('STATE',page.evaluate('window.moonfall?.snapshot()'),flush=True)
 print('ERRORS',errors,flush=True)
 context.close();browser.close()
server.shutdown()
