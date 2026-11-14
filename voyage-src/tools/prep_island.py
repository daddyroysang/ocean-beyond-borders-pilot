# usage: python3 -I prep_island.py in.glb out.glb [texsize]
import sys, io, trimesh, numpy as np
from PIL import Image
m = trimesh.load(sys.argv[1], force='mesh')
size = int(sys.argv[3]) if len(sys.argv) > 3 else 512
V = m.vertices.copy()
ext = V.max(0) - V.min(0)
print('raw extents', ext.round(3).tolist(), 'faces', len(m.faces), 'visual', m.visual.kind)
V[:,0] -= (V[:,0].max()+V[:,0].min())/2; V[:,2] -= (V[:,2].max()+V[:,2].min())/2; V[:,1] -= V[:,1].min()
V /= max(ext[0], ext[2])
m.vertices = V
mat = getattr(m.visual, 'material', None)
img = getattr(mat, 'baseColorTexture', None) if mat is not None else None
if img is not None:
    img = img.convert('RGB').resize((size, size), Image.LANCZOS)
    buf = io.BytesIO(); img.save(buf, 'JPEG', quality=82); img = Image.open(io.BytesIO(buf.getvalue()))
    m.visual.material = trimesh.visual.material.PBRMaterial(baseColorTexture=img, metallicFactor=0.0, roughnessFactor=0.9)
    print('texture ->', size)
data = m.export(file_type='glb')
open(sys.argv[2], 'wb').write(data); print('out bytes', len(data), 'height', round(float(V[:,1].max()),3))
