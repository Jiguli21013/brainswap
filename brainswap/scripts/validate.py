#!/usr/bin/env python3
"""Strict acceptance validation. Heuristic warnings require human review."""
import argparse, collections, json, pathlib, re, sys, unicodedata
from urllib.parse import urlsplit
ROOT=pathlib.Path(__file__).resolve().parents[1]
STATUSES={'verified','partially_verified','editorially_reviewed','needs_manual_review','unverified'}
def norm(s):
 return re.sub(r'\W+',' ',unicodedata.normalize('NFKC',s).casefold()).strip()
def url(s):
 if not isinstance(s,str) or re.search(r'\s',s): return False
 try:
  u=urlsplit(s);return u.scheme in ('http','https') and bool(u.hostname) and not u.username
 except ValueError:return False
def validate(cards,baseline):
 errors=[];warnings=[]
 def error(i,k,m):errors.append({'id':i,'field':k,'message':m})
 def warn(i,k,m):warnings.append({'id':i,'field':k,'message':m})
 if not isinstance(cards,list): return {'passed':False,'errors':[{'message':'Root must be an array'}],'warnings':[]}
 if len(cards)!=594:error(None,'cards','Expected exactly 594 cards')
 if [c.get('id') if isinstance(c,dict) else None for c in cards]!=list(range(1,595)):error(None,'id','IDs must be unique and sequential, in original order')
 seen=collections.defaultdict(lambda:collections.defaultdict(list))
 for index,c in enumerate(cards):
  if not isinstance(c,dict):error(None,'card','Expected object');continue
  i=c.get('id')
  def leaves(value,path=''):
   if isinstance(value,dict):
    for key,item in value.items():yield from leaves(item,path+'.'+key)
   elif isinstance(value,list):
    for idx,item in enumerate(value):yield from leaves(item,path+f'[{idx}]')
   elif isinstance(value,str):yield path,value
  for path,value in leaves(c):
   if norm(value) in {'null','undefined','tbd','todo','placeholder'}:error(i,path,'Placeholder string detected')
  if type(i)!=int:error(i,'id','Expected integer')
  if index<len(baseline) and (i,c.get('name'))!=(baseline[index]['id'],baseline[index]['name']):error(i,'identity','Identity/order differs from imported baseline')
  for k in ['name','role','question','biography','imageUrl','imageSource','verificationStatus']:
   v=c.get(k)
   if not isinstance(v,str) or not v.strip():error(i,k,'Required non-empty string')
   elif norm(v) in {'null','undefined','tbd','todo','unknown','placeholder','information unavailable'} or re.search(r'generic filler|well-known figure|read the biography to explore|read the source article for more',v,re.I):error(i,k,'Placeholder detected')
  if c.get('verificationStatus') not in STATUSES:error(i,'verificationStatus','Invalid status')
  for k,low,high in [('adjectives',5,7),('notableWorks',3,3),('interestingFacts',3,3)]:
   v=c.get(k)
   if not isinstance(v,list):error(i,k,'Expected array');continue
   if not low<=len(v)<=high:error(i,k,f'Expected {low}–{high} entries')
   if any(not isinstance(s,str) or not s.strip() for s in v):error(i,k,'Entries must be non-empty strings');continue
   if len({norm(s) for s in v})!=len(v):error(i,k,'Duplicate entries within card')
  for k in ['imageUrl','imageSource']:
   if not url(c.get(k)):error(i,k,'Expected absolute HTTP(S) URL')
  if not isinstance(c.get('sources'),list) or not c['sources']:error(i,'sources','At least one source required')
  else:
   for s in c['sources']:
    if not url(s):error(i,'sources','Invalid source URL')
  if isinstance(c.get('biography'),str) and c['biography']:
   count=len(c['biography'].split())
   if not 40<=count<=70:warn(i,'biography',f'{count} words; target 40–70')
   sentences=len(re.findall(r'[.!?](?:\s|$)',c['biography']))
   if not 2<=sentences<=4:warn(i,'biography',f'{sentences} apparent sentences; target 2–4 (abbreviations can affect this heuristic)')
  for f in c.get('interestingFacts',[]) if isinstance(c.get('interestingFacts'),list) else []:
   if isinstance(f,str) and not 15<=len(f.split())<=35:warn(i,'interestingFacts','Fact outside 15–35 word target')
  fictional=c.get('group')=='Fictional characters' or c.get('name') in ['Robin Hood','King Arthur']
  if fictional:
   for k in ['franchise','firstAppearance','creator']:
    if not isinstance(c.get(k),str) or not c[k].strip():error(i,k,'Fictional metadata unresolved')
   if type(c.get('firstAppearanceYear'))!=int:error(i,'firstAppearanceYear','Expected verified integer year')
   if 'adaptationDirector' not in c or c['adaptationDirector'] is not None and not isinstance(c['adaptationDirector'],str):error(i,'adaptationDirector','Expected string or null')
  if c.get('imageUrl'):
   a=c.get('imageAttribution')
   if not isinstance(a,dict) or any(not isinstance(a.get(k),str) or not a[k].strip() for k in ['artist','license','changes']) or not url(a.get('licenseUrl')):error(i,'imageAttribution','Expected artist, license, license URL and changes')
  if not isinstance(c.get('imageVerificationStatus'),str):error(i,'imageVerificationStatus','Expected string')
  if type(c.get('independentFactCheckCompleted'))!=bool:error(i,'independentFactCheckCompleted','Expected boolean')
  if c.get('verificationStatus')=='verified' and (not c.get('independentFactCheckCompleted') or c.get('contentReviewStatus')!='reviewed'):error(i,'verificationStatus','Verified claim lacks completed checks')
  for k in ['name','question','biography']:
   if isinstance(c.get(k),str) and c[k]:seen[k][norm(c[k])].append(i)
  if isinstance(c.get('adjectives'),list) and all(isinstance(s,str) for s in c['adjectives']):seen['adjectiveSets'][tuple(sorted(norm(s) for s in c['adjectives']))].append(i)
  for f in c.get('interestingFacts',[]) if isinstance(c.get('interestingFacts'),list) else []:
   if isinstance(f,str):seen['facts'][norm(f)].append(i)
  q=c.get('question','')
  if isinstance(q,str):
   template=norm(q).replace(norm(c.get('name','')),'SUBJECT')
   topic=c.get('discussionTopic')
   if isinstance(topic,str) and topic:template=template.replace(norm(topic),'TOPIC')
   seen['questionTemplates'][template].append(i)
   if re.search(r'influence or contribute to|contribution.*explored through.*story',q,re.I):warn(i,'question','Generic editorial template requires individual rewrite')
   if len(q.split())>28:warn(i,'question','Review B1–B2 complexity')
   own=c.get('name','')
   if own and norm(own) not in norm(q):warn(i,'question','Review identity/topic match; name absent (may be intentional)')
   for b in baseline:
    n=b['name']
    if b['id']!=i and len(n.split())>=2 and norm(n) in norm(q) and norm(n)!=norm(own):warn(i,'question',f'Another card identity mentioned: {n}')
  if c.get('notableWorks') and not c.get('workEvidence'):warn(i,'notableWorks','Attribution evidence not recorded')
 for k,groups in seen.items():
  for value,ids in groups.items():
   if len(ids)>1:
    if k in ['name','question','biography']:error(ids,k,'Repeated value')
    else:warn(ids,k,'Repeated wording/combination; review relevance')
 return {'passed':not errors,'cardCount':len(cards),'errors':errors,'warnings':warnings,'limitations':['URL syntax does not prove reachability or relevance.','Heuristics cannot verify factual truth, attribution, identity, or English level.','Question template checks detect exact normalized patterns, not all semantic repetition.']}
def main():
 parser=argparse.ArgumentParser();parser.add_argument('--data',type=pathlib.Path,default=ROOT/'data/cards.json');parser.add_argument('--report',type=pathlib.Path,default=ROOT/'docs/validation-results.json');args=parser.parse_args()
 result=validate(json.loads(args.data.read_text()),json.loads((ROOT/'docs/identity-baseline.json').read_text()));args.report.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n');print(f"{result.get('cardCount',0)} cards; {len(result['errors'])} errors; {len(result['warnings'])} warnings; passed={result['passed']}");sys.exit(0 if result['passed'] else 1)
if __name__=='__main__':main()
