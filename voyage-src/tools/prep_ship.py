import sys, trimesh, numpy as np
m = trimesh.load(sys.argv[1], force='mesh')
V = m.vertices.copy()
V2 = np.c_[-V[:,2], V[:,1], V[:,0]]          # bow -> -z, y up
V2 /= (V2[:,2].max()-V2[:,2].min())
V2[:,1] -= V2[:,1].min(); V2[:,0] -= (V2[:,0].max()+V2[:,0].min())/2; V2[:,2] -= (V2[:,2].max()+V2[:,2].min())/2
out = trimesh.Trimesh(V2, m.faces, process=False); out.merge_vertices()
out.visual = trimesh.visual.ColorVisuals()
print(len(out.vertices), len(out.faces), out.bounds.round(3).tolist())
out.export(sys.argv[2])
