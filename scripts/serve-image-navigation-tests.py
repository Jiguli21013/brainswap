from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from pathlib import Path
import json,time,urllib.parse
R=Path(__file__).resolve().parents[1];T=Path('/private/tmp/brainswap-image-navigation-tests');T.mkdir(exist_ok=True);B=Path('/private/tmp/brainswap-stale-before')
class Handler(SimpleHTTPRequestHandler):
 def __init__(self,*a,**k):super().__init__(*a,directory=str(R),**k)
 def do_GET(self):
  path=urllib.parse.urlsplit(self.path).path;baseline=path.startswith('/baseline/') and B.exists();path=path.removeprefix('/baseline')
  if path=='/test.html':body=(R/'index.html').read_bytes().replace(b'</body>',b'<script src="controller.js" defer></script></body>');typ='text/html'
  elif path=='/controller.js':body=(R/'scripts/image-navigation-browser-fixture.js').read_bytes();typ='application/javascript'
  elif path=='/data/cards.json':
   cards=json.loads((R/'data/cards.json').read_text());base=cards[0]
   for i,c in enumerate(cards):
    c.update({k:base[k] for k in ['biography','role','adjectives','question','notableWorks','interestingFacts']});c['imageUrl']='http://127.0.0.1:8013'+('/baseline' if baseline else '')+'/images/a.svg';c['wikiTitle']='';c['imageAttribution']=None;c['imageSource']=None;c.pop('imageIssue',None)
   for i,k in enumerate(['a','b','c','broken','none']):cards[i]['name']='Test card '+k.upper();cards[i]['imageUrl']='https://example.invalid/'+k+'.svg' if k!='none' else None
   # HTTPS URL validity remains unchanged in runtime. Test hosts are redirected by the fixture fetch/Image constructors below.
   body=json.dumps(cards).encode();typ='application/json'
  elif path.startswith('/images/'):
   kind=path.rsplit('/',1)[-1].split('.')[0]
   if kind=='broken':self.send_error(404);return
   if kind=='b':time.sleep(2)
   elif kind=='c':time.sleep(.15)
   color={'a':'#0645ad','b':'#228844','c':'#ad2244'}.get(kind,'#0645ad');body=f'<svg xmlns="http://www.w3.org/2000/svg" width="700" height="900"><rect width="700" height="900" fill="{color}"/><text x="100" y="200" fill="white" font-size="100">{kind.upper()}</text></svg>'.encode();typ='image/svg+xml'
  elif path=='/image-loader.js':
   body=(B/'image-loader.js' if baseline else R/'image-loader.js').read_bytes()
   # Only remap test fixture image URLs at the transport boundary; loader logic stays byte-for-byte.
   prefix='http://127.0.0.1:8013'+('/baseline' if baseline else '')
   shim=f'''const diagnosticSrc=Object.getOwnPropertyDescriptor(HTMLImageElement.prototype,'src');Object.defineProperty(HTMLImageElement.prototype,'src',{{get:diagnosticSrc.get,set(url){{diagnosticSrc.set.call(this,String(url).replace('https://example.invalid','{prefix}/images'));}}}});'''.encode();body=shim+body;typ='application/javascript'
  elif baseline and path in ['/card-transitions.js','/card-transitions.css']:body=(B/path[1:]).read_bytes();typ='text/css' if path.endswith('.css') else 'application/javascript'
  else:
   self.path=path;return super().do_GET()
  self.send_response(200);self.send_header('Content-Type',typ);self.send_header('Content-Length',str(len(body)));self.end_headers()
  try:self.wfile.write(body)
  except BrokenPipeError:pass
 def do_POST(self):
  name='baseline-results.json' if 'baseline=1' in self.path else 'fixed-results.json';(T/name).write_bytes(self.rfile.read(int(self.headers['Content-Length'])));self.send_response(200);self.end_headers()
 def log_message(self,*a):pass
ThreadingHTTPServer(('127.0.0.1',8013),Handler).serve_forever()
