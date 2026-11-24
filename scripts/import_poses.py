"""Extract a diverse upright subset from COCO 2017 person_keypoints_val2017.json.
Usage: python3 scripts/import_poses.py /path/to/person_keypoints_val2017.json
Coordinates only. See app/RESEARCH.md for attribution and selection limits.
"""
import json
import sys
from pathlib import Path

def extract(a):
    if a['iscrowd'] or a['num_keypoints'] < 15:
        return
    p = [a['keypoints'][i:i+3] for i in range(0, 51, 3)]
    if any(p[i][2] != 2 for i in [0,5,6,7,8,9,10,11,12,13,14]):
        return
    x,y,w,h = a['bbox']
    if h < 110 or w > h or w < 15 or (p[11][1]+p[12][1]-p[5][1]-p[6][1]) < .35*h:
        return
    if max(p[9][1],p[10][1]) < p[0][1] or abs(p[5][1]-p[6][1])>.18*h:
        return
    return [a['id'], [[round(100*(i-x)/h),round(100*(j-y)/h)] if v else None for i,j,v in p]]

def feature(item):
    p=item[1]
    return tuple(p[k][axis]-p[5][axis] for k in [6,7,8,9,10,11,12,13,14] for axis in (0,1))

items=sorted(filter(None,(extract(a) for a in json.load(open(sys.argv[1]))['annotations'])))
features=[feature(i) for i in items]
chosen=[]; distance=[float('inf')]*len(items)
for _ in range(min(len(items),96)):
    idx=max(range(len(items)),key=distance.__getitem__)
    chosen.append(items[idx])
    for j,f in enumerate(features):
        distance[j]=min(distance[j],sum((x-y)**2 for x,y in zip(f,features[idx])))
    distance[idx]=-1
Path('app/pose-data.js').write_text('// COCO Consortium, CC BY 4.0. Normalized keypoints; see RESEARCH.md.\nexport const references='+json.dumps(chosen,separators=(',',':'))+';\n')
print(len(items),'eligible;',len(chosen),'retained')
