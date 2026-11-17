import json,random,itertools,functools,collections,subprocess
from pathlib import Path
rng=random.Random(20261117)
ROOT=Path(__file__).resolve().parents[1]
pack=json.loads(subprocess.check_output(['node','--input-type=module','-e',"import {advancedProblems} from './services/learning-backend/prisma/learningPack.js'; process.stdout.write(JSON.stringify(advancedProblems));"],cwd=ROOT,text=True));functions={}
for p in pack:
 if p['language']=='python':
  namespace={};exec(p['referenceCode'],namespace);functions[p['id'].removeprefix('pack-')]=namespace[p['functionName']]
count=0
for problem in pack:
 if problem["language"]=="python":
  for args, expected in problem["cases"]:
   assert functions[problem["id"].removeprefix("pack-")](*args)==expected, problem["id"]

def check(name,args,expected):
 global count
 actual=functions[name](*args)
 assert actual==expected,(name,args,expected,actual)
 count+=1

for _ in range(120):
 a=[rng.randint(-3,4) for _ in range(rng.randrange(9))]
 check('balance',[a],next((i for i in range(len(a)) if sum(a[:i])==sum(a[i+1:])), -1))
 text=''.join(rng.choice('abc') for _ in range(rng.randrange(10)))
 check('runs',[text],[[c,len(list(g))] for c,g in itertools.groupby(text)])
 budget=rng.randrange(12);costs=[rng.randrange(6) for _ in range(rng.randrange(9))]
 check('window',[costs,budget],max([0]+[j-i for i in range(len(costs)) for j in range(i+1,len(costs)+1) if sum(costs[i:j])<=budget]))
 intervals=[]
 for _ in range(rng.randrange(8)):
  left=rng.randrange(-4,5);intervals.append([left,left+rng.randrange(5)])
 union=[list(v) for v in intervals]
 changed=True
 while changed:
  changed=False
  for i in range(len(union)):
   for j in range(i+1,len(union)):
    x,y=union[i],union[j]
    if max(x[0],y[0])<=min(x[1],y[1]):
     union[i]=[min(x[0],y[0]),max(x[1],y[1])];union.pop(j);changed=True;break
   if changed:break
 check('bookings',[intervals],sorted(union))
 weights=[rng.randrange(1,6) for _ in range(rng.randrange(7))];days=rng.randrange(1,8)
 optimum=0 if not weights else float('inf')
 for cuts in range(min(days,len(weights))):
  for positions in itertools.combinations(range(1,len(weights)),cuts):
   borders=(0,)+positions+(len(weights),)
   optimum=min(optimum,max(sum(weights[borders[i]:borders[i+1]]) for i in range(len(borders)-1)))
 check('capacity',[weights,days],optimum)
 coins=[rng.randrange(1,8) for _ in range(rng.randrange(5))];target=rng.randrange(25)
 queue=collections.deque([(0,0)]);seen={0};answer=-1
 while queue:
  value,d=queue.popleft()
  if value==target:answer=d;break
  for coin in coins:
   if value+coin<=target and value+coin not in seen:seen.add(value+coin);queue.append((value+coin,d+1))
 check('tokens',[coins,target],answer)
 check('palindrome',[text],len(text)-max([0]+[len(s) for mask in range(1<<len(text)) if (s:=''.join(text[i] for i in range(len(text)) if mask>>i&1))==s[::-1]]))
 n=rng.randrange(7);start=[rng.randrange(10) for _ in range(n)];matrix=[[0 if i==j else rng.randrange(10) for j in range(n)] for i in range(n)]
 best=0 if n==0 else min((start[order[0]]+sum(matrix[a][b] for a,b in zip(order,order[1:])) for order in itertools.permutations(range(n))),default=0)
 check('jobs',[start,matrix],best)
 values=tuple(rng.randrange(6) for _ in range(rng.randrange(7)))
 @functools.lru_cache(None)
 def brute_merge(row):
  if len(row)<2:return 0
  return min(row[i]+row[i+1]+brute_merge(row[:i]+(row[i]+row[i+1],)+row[i+2:]) for i in range(len(row)-1))
 check('fusion',[list(values)],brute_merge(values))
 # Exhaustively choose the removable wall, then use ordinary one-state BFS.
 rows,cols=rng.randrange(1,5),rng.randrange(1,5)
 grid=[[rng.choice('.#') for _ in range(cols)] for _ in range(rows)];grid[0][0]=grid[-1][-1]='.'
 walls=[None]+[(r,c) for r in range(rows) for c in range(cols) if grid[r][c]=='#'];shortest=float('inf')
 for broken in walls:
  queue=collections.deque([(0,0,0)]);seen={(0,0)}
  while queue:
   r,c,d=queue.popleft()
   if (r,c)==(rows-1,cols-1):shortest=min(shortest,d);break
   for dr,dc in ((1,0),(-1,0),(0,1),(0,-1)):
    nr,nc=r+dr,c+dc
    if 0<=nr<rows and 0<=nc<cols and (grid[nr][nc]=='.' or (nr,nc)==broken) and (nr,nc) not in seen:
     seen.add((nr,nc));queue.append((nr,nc,d+1))
 check('maze',[[''.join(row) for row in grid]],-1 if shortest==float('inf') else shortest)
 # DFS finishing-time recurrence independently checks topological implementation.
 durations=[rng.randrange(5) for _ in range(n)];deps=[[i,j] for i in range(n) for j in range(n) if rng.randrange(8)==0]
 state=[0]*n;memo=[0]*n
 def visit(node):
  if state[node]==1:raise ValueError('cycle')
  if state[node]==2:return memo[node]
  state[node]=1;memo[node]=durations[node]+max((visit(a) for a,b in deps if b==node),default=0);state[node]=2;return memo[node]
 try:expected=max((visit(i) for i in range(n)),default=0)
 except ValueError:expected=-1
 check('pipeline',[durations,deps],expected)
 # Bellman-Ford over the six-state graph independently checks heap Dijkstra.
 cities=rng.randrange(1,6);roads=[[i,j,rng.randrange(10)] for i in range(cities) for j in range(cities) if rng.randrange(4)==0]
 dist={(0,0,0):0}
 for _ in range(cities*6):
  updated=dict(dist)
  for (node,used,last),cost in dist.items():
   for a,b,w in roads:
    if a!=node:continue
    updated[b,used,0]=min(updated.get((b,used,0),float('inf')),cost+w)
    if used<2 and not last:updated[b,used+1,1]=min(updated.get((b,used+1,1),float('inf')),cost+w//2)
  if updated==dist:break
  dist=updated
 answer=min((d for (node,_,_),d in dist.items() if node==cities-1),default=-1)
 check('discount',[cities,roads],answer)
assert len(pack)==15
assert collections.Counter(p['practiceLevel'] for p in pack)=={i:3 for i in range(1,6)}
result={'originalProblems':15,'levels':5,'pythonReferences':12,'independentOracleChecks':count,'sqlProblemsExcludedFromPythonRun':3}
# SQL references are separately executed by the Docker/PostgreSQL integration suite.
print(json.dumps(result))
