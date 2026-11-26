"""Create gateway/ (the thin Vercel project) from the build output in docs/, then strip server-only files from docs/.
The gateway serves the single URL https://agritrade-suite.vercel.app. It proxies every page to GitHub Pages (same origin,
so one login works for all programs) and hosts only the serverless functions (api/, server/)."""
import json, os, shutil, subprocess
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
D, G = ROOT + '/docs', ROOT + '/gateway'
GP = 'https://fathyeid.github.io/agritrade-suite-site'
if os.path.exists(G): shutil.rmtree(G)
os.makedirs(G)
shutil.copytree(D + '/api', G + '/api'); shutil.copytree(D + '/server', G + '/server'); shutil.copy(D + '/package.json', G + '/package.json')
v = json.load(open(D + '/vercel.json'))
rw = [r for r in v['rewrites'] if not r['source'].startswith('/poultry')]
rw += [{"source": "/poultry", "destination": "https://fathyeid.github.io/poultry-platform/"},
       {"source": "/poultry/", "destination": "https://fathyeid.github.io/poultry-platform/"},
       {"source": "/poultry/:p*", "destination": "https://fathyeid.github.io/poultry-platform/:p*"}]
dirs = sorted(os.path.dirname(p)[2:] for p in subprocess.check_output("cd %s && find . -mindepth 2 -name index.html" % D, shell=True, text=True).split())
for d in dirs:  # folder routes need an explicit index.html, otherwise Pages answers with a redirect to github.io
    rw += [{"source": "/" + d, "destination": GP + "/" + d + "/index.html"}, {"source": "/" + d + "/", "destination": GP + "/" + d + "/index.html"}]
rw += [{"source": "/", "destination": GP + "/"}, {"source": "/:path*", "destination": GP + "/:path*"}]
v['rewrites'] = rw
# caching: pages always revalidate (short edge cache); scripts/styles cache briefly (the build stamps ?v=<build> on the ones
# pages reference, so a new deploy is picked up at once); images, fonts and vendor libraries cache for a week.
SEC = [{"key": "X-Content-Type-Options", "value": "nosniff"}, {"key": "Referrer-Policy", "value": "strict-origin-when-cross-origin"}]
v['headers'] = [
    {"source": "/(.*)", "headers": SEC + [{"key": "Cache-Control", "value": "public, max-age=0, s-maxage=60, stale-while-revalidate=300"}]},
    {"source": "/(.*)\\.(js|css|json|webmanifest)", "headers": [{"key": "Cache-Control", "value": "public, max-age=600, s-maxage=600, stale-while-revalidate=86400"}]},
    {"source": "/(.*)\\.(jpg|jpeg|png|webp|svg|gif|ico|woff2?|ttf)", "headers": [{"key": "Cache-Control", "value": "public, max-age=604800, s-maxage=604800, stale-while-revalidate=2592000"}]},
    {"source": "/(.*)/(vendor|lwc|chart\\.umd|chart\\.min|supabase)(.*)\\.js", "headers": [{"key": "Cache-Control", "value": "public, max-age=604800, s-maxage=604800"}]},
    {"source": "/(.*)sw\\.js", "headers": [{"key": "Cache-Control", "value": "no-cache"}]},
    {"source": "/(team|grain|inst|chart)/api/(.*)", "headers": [{"key": "Cache-Control", "value": "no-store"}]}]
json.dump(v, open(G + '/vercel.json', 'w'), indent=1)
for x in ('api', 'server'): shutil.rmtree(D + '/' + x)
os.remove(D + '/vercel.json'); os.remove(D + '/package.json')
open(D + '/.nojekyll', 'w').close(); shutil.copy(D + '/index.html', D + '/404.html')
print('gateway ready; docs/ is the GitHub Pages root')
