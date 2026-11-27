import os,re,shutil,json,subprocess,sys
import os as _o
ROOT=_o.path.dirname(_o.path.dirname(_o.path.abspath(__file__)))
SRC=ROOT+'/programs'; OUT=ROOT+'/docs'
if os.path.exists(OUT): shutil.rmtree(OUT)
os.makedirs(OUT+'/api'); os.makedirs(OUT+'/server/chart')
def cp(a,b): shutil.copytree(a,b,dirs_exist_ok=True)
def sub(path,pairs,must=True):
    s=open(path,encoding='utf-8').read(); o=s
    for a,b in pairs:
        if a not in s:
            if must: print('WARN pattern missing',path,a[:50])
            continue
        s=s.replace(a,b)
    open(path,'w',encoding='utf-8').write(s)
# portal shell
for f in ['index.html','style.css','app.js','config.js','hub.js']: shutil.copy(ROOT+'/portal/'+f,OUT+'/'+f)
# modules
cp(SRC+'/iom/src',OUT+'/iom'); os.remove(OUT+'/iom/vercel.json')
cp(SRC+'/team/src',OUT+'/team'); shutil.rmtree(OUT+'/team/api'); os.remove(OUT+'/team/package.json')
cp(SRC+'/grain/src',OUT+'/grain'); shutil.rmtree(OUT+'/grain/api')
cp(SRC+'/dispute/src',OUT+'/dispute'); os.remove(OUT+'/dispute/vercel.json')
cp(SRC+'/inst/src',OUT+'/inst'); shutil.rmtree(OUT+'/inst/api')
cp(SRC+'/chart/src/public',OUT+'/chart')
if os.path.isdir(SRC+'/feed/src'): cp(SRC+'/feed/src',OUT+'/feed')
# functions
shutil.copy(SRC+'/team/src/api/ask.js',OUT+'/api/team-ask.js')
shutil.copy(SRC+'/team/src/api/push.js',OUT+'/api/team-push.js')
shutil.copy(SRC+'/grain/src/api/assistant.js',OUT+'/api/grain-assistant.js')
shutil.copy(SRC+'/inst/src/api/news.js',OUT+'/api/inst-news.js')
names=[]
for f in sorted(os.listdir(SRC+'/chart/src/api')):
    n=f[:-3]; names.append(n); shutil.copy(SRC+'/chart/src/api/'+f,OUT+f'/server/chart/{n}.mjs')
for n in names:
    p=OUT+f'/server/chart/{n}.mjs'; s=open(p).read(); s=re.sub(r"from '\./(\w+)\.js'",r"from './\1.mjs'",s); open(p,'w').write(s)
disp="import { default as _d } from './x'\n"
imp=''.join(f"import h_{n} from '../server/chart/{n}.mjs';\n" for n in names)
mp=','.join(f"{n}:h_{n}" for n in names)
open(OUT+'/api/chart-api.mjs','w').write(imp+f"const M={{{mp}}};\nexport default function handler(req,res){{const fn=String((req.query&&req.query.fn)||'');const h=M[fn];if(!h){{res.status(404).json({{error:'unknown endpoint'}});return}}return h(req,res)}}\n")
# patches
sub(OUT+'/team/index.html',[('href="/manifest.webmanifest','href="/team/manifest.webmanifest'),('href="/assets/icon-180.png','href="/team/assets/icon-180.png')])
sub(OUT+'/team/manifest.webmanifest',[('"start_url":"/"','"start_url":"/team/"'),('"scope":"/"','"scope":"/team/"'),('"/assets/','"/team/assets/')])
sub(OUT+'/team/sw.js',[("'/assets/","'/team/assets/")])
sub(OUT+'/team/assets/app.js',[("register('/sw.js')","register('/team/sw.js',{scope:'/team/'})"),("fetch('/api/ask'","fetch('/team/api/ask'"),("setLang(S.me.locale||S.lang)","setLang(localStorage.getItem('tw_lang')||S.me.locale||S.lang)"),("redirectTo:location.origin+'/'","redirectTo:location.origin+'/team/'"),("location.origin+'/?join='","location.origin+'/team/?join='"),("if(!S.me){await sb.auth.signOut();return renderAuth();}","if(!S.me){return renderAuth();}")])
sub(OUT+'/grain/app.js' if False else OUT+'/grain/stage9.js',[("fetch('/api/assistant'","fetch('/grain/api/assistant'")])

sub(OUT+'/grain/app.js',[(" if(TOKEN&&ME)boot();else render()})();",""" if(!(TOKEN&&ME)){try{const ss=JSON.parse(localStorage.getItem('sb-nimfkykshfijxbgwgkrg-auth-token')||'null');if(ss&&ss.access_token){const rr=await fetch(CFG.url+'/rest/v1/rpc/gs_sso',{method:'POST',headers:{apikey:CFG.anon,'Content-Type':'application/json',Authorization:'Bearer '+ss.access_token},body:'{}'});if(rr.ok){const j=await rr.json();TOKEN=j.token;localStorage.gs_tok=TOKEN;ME=j.user}}}catch{}}
 if(TOKEN&&ME)boot();else render()})();""")])
sub(OUT+'/inst/app.js',[("fetch('/api/news'","fetch('/inst/api/news'")])
sub(OUT+'/dispute/core.js',[("storageKey:'dc-center-auth'","storageKey:'sb-nimfkykshfijxbgwgkrg-auth-token'"),("redirectTo: location.origin + '/'","redirectTo: location.origin + '/dispute/'"),("const a = await afterLogin();\n  if (!a.ok) { await sb.auth.signOut(); return loginView(); }","const a = await afterLogin();\n  if (!a.ok) { return loginView(); }")])
sub(OUT+'/iom/index.html',[("redirectTo:location.origin+'/'","redirectTo:location.origin+'/iom/'"),("emailRedirectTo:location.origin+'/'","emailRedirectTo:location.origin+'/iom/'")])
for f in os.listdir(OUT+'/chart/js'):
    p=OUT+'/chart/js/'+f; s=open(p,encoding='utf-8').read()
    s2=re.sub(r"""(['"`])/api/""",r"\1/chart/api/",s)
    if s2!=s: open(p,'w',encoding='utf-8').write(s2)
sub(OUT+'/chart/sw.js',[("u.pathname.startsWith('/api/')","u.pathname.includes('/api/')")])
shutil.copytree(ROOT+'/portal/ds',OUT+'/ds',dirs_exist_ok=True)
shutil.copytree(ROOT+'/portal/hud',OUT+'/hud',dirs_exist_ok=True)  # Command Center HUD (dark, deliberate exception like the Chart)
for m in ['iom','team','grain','dispute','inst','feed']:
    p=OUT+'/'+m+'/index.html'
    if os.path.exists(p):
        h=open(p,encoding='utf-8').read()
        if '/ds/ds.css' not in h:
            h=h.replace('</head>','<link rel="stylesheet" href="/ds/ds.css"><script src="/ds/ds.js" defer></script></head>',1)
            open(p,'w',encoding='utf-8').write(h)
rw=[{"source":"/team/api/ask","destination":"/api/team-ask"},{"source":"/team/api/push","destination":"/api/team-push"},
 {"source":"/grain/api/assistant","destination":"/api/grain-assistant"},{"source":"/inst/api/news","destination":"/api/inst-news"},
 {"source":"/chart/api/:fn","destination":"/api/chart-api?fn=:fn"},
 {"source":"/poultry","destination":"https://fathyeid.github.io/poultry-platform/"},
 {"source":"/poultry/","destination":"https://fathyeid.github.io/poultry-platform/"},
 {"source":"/poultry/:p*","destination":"https://fathyeid.github.io/poultry-platform/:p*"}]
vj={"rewrites":rw,"headers":[
 {"source":"/dispute/(.*)","headers":[{"key":"Cache-Control","value":"no-cache"}]},
 {"source":"/chart/GlobalChart.apk","headers":[{"key":"Content-Type","value":"application/vnd.android.package-archive"},{"key":"Content-Disposition","value":"attachment; filename=GlobalChart.apk"}]},
 {"source":"/chart/download/(.*)\\.apk","headers":[{"key":"Content-Type","value":"application/vnd.android.package-archive"}]},
 {"source":"/(.*)","headers":[{"key":"X-Content-Type-Options","value":"nosniff"},{"key":"Referrer-Policy","value":"strict-origin-when-cross-origin"}]}]}
vj.setdefault('headers',[]).append({'source':'/(|app.js|style.css|config.js)','headers':[{'key':'Cache-Control','value':'no-cache, must-revalidate'}]})
json.dump(vj,open(OUT+'/vercel.json','w'),indent=1)
json.dump({"name":"agritrade-suite","private":True,"dependencies":{"web-push":"^3.6.7"}},open(OUT+'/package.json','w'))
print('built'); 

sub(OUT+'/iom/index.html',[("SB_URL='https://umksjkamcwkazkcmqlll.supabase.co',SB_KEY='sb_publishable_qfb4bszqsaD8_Dgr5BoDPQ_-GQXn9Cd'","SB_URL='https://nimfkykshfijxbgwgkrg.supabase.co',SB_KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5pbWZreWtzaGZpanhiZ3dna3JnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTU2ODY4NzgsImV4cCI6MjExMTI2Mjg3OH0.ubwLjgwwTGkbIHdYHGJ6oyZ7F_-rkhvuEtN-eun1dT0'"),("sb.from('profiles')","sb.from('iom_profiles')"),(" const{data:pr,error}=await sb.from('iom_profiles').select('*').eq('id',session.user.id)"," try{await sb.rpc('iom_ensure_profile')}catch(e){}\n const{data:pr,error}=await sb.from('iom_profiles').select('*').eq('id',session.user.id)")])

# cache stamp: every local script/stylesheet referenced from a page gets ?v=<build> so browsers fetch new files right after a deploy
import time as _t
BUILD=_t.strftime('%Y%m%d%H%M')
for p in subprocess.check_output("find %s -name '*.html'" % OUT, shell=True, text=True).split():
    h=open(p,encoding='utf-8').read()
    h2=re.sub(r'((?:src|href)=")((?!https?:|//|data:|#)[^"?]+\.(?:js|css))"', lambda m: m.group(1)+m.group(2)+'?v='+BUILD+'"', h)
    if h2!=h: open(p,'w',encoding='utf-8').write(h2)
s=open(OUT+'/app.js',encoding='utf-8').read()
s=re.sub(r"'(/ds/[a-z-]+\.(?:js|css))'", lambda m: "'"+m.group(1)+"?v="+BUILD+"'", s)
open(OUT+'/app.js','w',encoding='utf-8').write(s)
for f in ['ds/ds.js','ds/poultry-dash.js','ds/iom-dash.js']:
    q=OUT+'/'+f; t=open(q,encoding='utf-8').read(); t2=t.replace("'/ds/dash.css'","'/ds/dash.css?v="+BUILD+"'"); open(q,'w',encoding='utf-8').write(t2)
print('stamped', BUILD)
