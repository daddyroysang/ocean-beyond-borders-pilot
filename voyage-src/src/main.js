import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { Water } from 'three/addons/objects/Water.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';

// ---------- 데이터 (문구는 전부 임시) ----------
const PLACES = {
  ocean: {
    pos: [-18, -26], r: 8.6, h: 2.2, label: '해양',
    tag: '캠페인 · 해양', title: '국경 밖의 바다',
    body: '2026년 1월 17일, 글로벌 해양조약이 발효됐습니다. 20년에 걸친 캠페인의 결과입니다.',
    stat: '2026.1.17', statLabel: '글로벌 해양조약 발효',
    cta: '「국경 밖의 바다」 이야기 보기',
    trip: '공해는 전 세계 바다의 61%. 제대로 보호받는 곳은 0.9%입니다.'
  },
  climate: {
    pos: [16, -36], r: 7.4, h: 4.5, label: '기후',
    tag: '캠페인 · 기후', title: '기후재난의 현장',
    body: '2026년 8월, 거제에 극한 호우가 쏟아졌습니다. 그린피스와 기후재난 시민대응단은 복구 현장을 다시 찾았습니다.',
    stat: '2026.8', statLabel: '거제 극한 호우',
    cta: '거제 복구 현장 기록 읽기',
    trip: '2026년 여름, 거제에 극한 호우가 쏟아졌습니다.'
  },
  plastic: {
    pos: [30, -8], r: 7.2, h: 1.4, label: '플라스틱',
    tag: '캠페인 · 플라스틱', title: '플라스틱 제로',
    body: '시민 10명 중 8명은 일회용 플라스틱을 줄일 의사가 있습니다. 부족한 것은 시스템입니다.',
    stat: '8 / 10', statLabel: '줄일 의사가 있는 시민',
    cta: '플라스틱 중독 사회 이야기 읽기',
    trip: '190만 명의 시민이 강력한 플라스틱 협약을 요구했습니다.'
  },
  donate: {
    pos: [0, -68], r: 4.6, h: 10.5, label: '후원 등대', lighthouse: true,
    tag: '후원', title: '등대',
    body: '그린피스는 독립성을 지키기 위해 정부·기업·정당의 후원을 받지 않습니다.',
    stat: '100%', statLabel: '개인과 독립재단의 후원',
    cta: '내 후원금이 간 곳 보기',
    trip: '그린피스는 정부와 기업의 후원을 받지 않습니다.'
  }
};
// 연결 주소는 template.html 의 목록(#index)에 한 번만 적는다. 3D가 안 떠도 그 목록은 그대로 눌린다.
document.querySelectorAll('#index a[data-id]').forEach((a) => {
  const p = PLACES[a.dataset.id]; if (!p) return;
  p.link = a.getAttribute('href'); p.ext = /^https?:/.test(p.link);
});
const START = new THREE.Vector3(0, 0, 10);
const GREEN = 0x66cc00;
const rand = (() => { let a = 7; return () => { a = (a * 16807) % 2147483647; return a / 2147483647; }; })();

// ---------- 기본 씬 ----------
const canvas = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
const scene = new THREE.Scene();
const HORIZON = 0xdcc7b4;
scene.background = new THREE.Color(HORIZON);
scene.fog = new THREE.Fog(HORIZON, 55, 430);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.12;
const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 900);

// 하늘: 위는 차가운 회청색, 수평선은 옅게, 왼쪽에 낮은 해
const SUN_DIR = new THREE.Vector3(0.77, 0.2, -0.64).normalize();
const panoTex = new THREE.TextureLoader().load('sky.jpg', () => { sky.material.uniforms.ready.value = 1; });
panoTex.colorSpace = THREE.SRGBColorSpace; panoTex.wrapS = THREE.RepeatWrapping; panoTex.generateMipmaps = false; panoTex.minFilter = THREE.LinearFilter;
const sky = new THREE.Mesh(
  new THREE.SphereGeometry(600, 48, 24),
  new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { sunDir: { value: SUN_DIR }, pano: { value: panoTex }, ready: { value: 0 } },
    vertexShader: 'varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `varying vec3 vDir; uniform vec3 sunDir; uniform sampler2D pano; uniform float ready;
      void main(){
        vec3 d = normalize(vDir);
        float u = atan(d.x, -d.z) / 6.2831853 + 0.36;            // 정면(-z)이 그림의 밝은 쪽
        float v = asin(clamp(abs(d.y), 0.0, 1.0)) / 0.62;        // 수평선 → 그림 아래, 약 36도까지 그림
        vec3 top = vec3(0.13, 0.33, 0.55);
        vec3 c = texture2D(pano, vec2(u, clamp(v, 0.004, 0.996))).rgb;
        c = mix(c, top, smoothstep(0.82, 1.25, v));
        c = mix(mix(vec3(0.72, 0.55, 0.42), top, clamp(v, 0.0, 1.0)), c, ready);
        float s = max(dot(d, sunDir), 0.0);
        c += vec3(1.0, 0.82, 0.55) * (pow(s, 60.0) * 0.1 + pow(s, 500.0) * 0.35);
        gl_FragColor = vec4(c, 1.0);
        #include <colorspace_fragment>
      }`
  })
);
scene.add(sky);

scene.add(new THREE.HemisphereLight(0xcfe3f2, 0x6b7d78, 1.9));
const sun = new THREE.DirectionalLight(0xffd9a8, 2.4);
const fill = new THREE.DirectionalLight(0xfff1dc, 0.7); fill.position.set(-30, 40, 60); scene.add(fill);   // 역광에서 배와 섬의 앞면을 살리는 보조광
sun.position.copy(SUN_DIR).multiplyScalar(100);
scene.add(sun);

// 바다: 하늘·섬·배가 비치는 반사 수면
function makeWaterNormals(n = 256) {
  const c = document.createElement('canvas'); c.width = c.height = n;
  const ctx = c.getContext('2d'), img = ctx.createImageData(n, n), W = [];
  for (let i = 0; i < 40; i++) {
    const ang = rand() * 6.2831853, kk = 3 + rand() * 15, kx = Math.round(Math.cos(ang) * kk), ky = Math.round(Math.sin(ang) * kk) || 1, k = Math.hypot(kx, ky);
    W.push([kx, ky, 0.9 / (k + 2.0), rand() * 6.283]);
  }
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    let dx = 0, dy = 0; const u = x / n * 6.283, v = y / n * 6.283;
    for (const [kx, ky, a, ph] of W) { const cs = Math.cos(kx * u + ky * v + ph) * a; dx += cs * kx; dy += cs * ky; }
    const nx = -dx * 0.6, ny = -dy * 0.6, l = Math.hypot(nx, ny, 1), i = (y * n + x) * 4;
    img.data[i] = (nx / l * 0.5 + 0.5) * 255; img.data[i + 1] = (ny / l * 0.5 + 0.5) * 255; img.data[i + 2] = (1 / l * 0.5 + 0.5) * 255; img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}
const lowPower = Math.min(innerWidth, innerHeight) < 500;
// 수면 격자: 배 주변은 촘촘하고 멀수록 성긴 원형 격자 (가까운 파도만 실제로 출렁이게)
function radialGrid(nR, nA, R) {
  const pos = new Float32Array(nR * nA * 3), idx = [];
  for (let i = 0; i < nR; i++) {
    const r = R * Math.pow(i / (nR - 1), 3.1);
    for (let k = 0; k < nA; k++) { const a = (k / nA) * Math.PI * 2, o = (i * nA + k) * 3; pos[o] = r * Math.cos(a); pos[o + 1] = r * Math.sin(a); }
  }
  for (let i = 0; i < nR - 1; i++) for (let k = 0; k < nA; k++) {
    const a = i * nA + k, b = i * nA + (k + 1) % nA, c = (i + 1) * nA + k, d = (i + 1) * nA + (k + 1) % nA;
    idx.push(a, c, b, b, c, d);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setIndex(idx); return g;
}
// 너울 4겹: [방향x, 방향z, 파장, 높이, 속도]. 셰이더와 자바스크립트가 같은 값을 쓴다 (배가 파도를 타게)
const WAVES = [[0.33, 0.944, 41, 0.30, 4.2], [-0.6, 0.8, 24, 0.17, 3.3], [0.894, 0.447, 13.5, 0.09, 2.6], [-0.196, -0.981, 7.3, 0.045, 2.0]];
const ISL = [];          // 섬 위치와 물가 반지름 (깊이 색, 물가 거품, 섬 주변 잔잔함)
function calmAt(x, z) {
  let d = 1e3; for (const v of ISL) d = Math.min(d, Math.hypot(x - v.x, z - v.y) - v.z);
  return 0.3 + 0.7 * Math.min(1, Math.max(0, d / 18));
}
function waveAt(x, z, t, out) {
  let h = 0, gx = 0, gz = 0; const c = calmAt(x, z);
  for (const [dx, dz, L, A, sp] of WAVES) {
    const k = 6.2831853 / L, ph = k * (dx * x + dz * z) - sp * k * t, a = A * c;
    h += a * Math.sin(ph); const g = k * a * Math.cos(ph); gx += dx * g; gz += dz * g;
  }
  if (out) { out.gx = gx; out.gz = gz; }
  return h;
}
const sea = new Water(radialGrid(lowPower ? 130 : 160, lowPower ? 168 : 216, 1700), {
  textureWidth: lowPower ? 384 : 768, textureHeight: lowPower ? 384 : 768,
  waterNormals: makeWaterNormals(), sunDirection: SUN_DIR.clone(), sunColor: 0xfff0d0,
  waterColor: 0x0f5d66, distortionScale: 3, fog: true
});
sea.rotation.x = -Math.PI / 2; sea.frustumCulled = false;
sea.material.uniforms.uSh = { value: Array.from({ length: 6 }, () => new THREE.Vector4(9e3, 9e3, 1, 1)) };   // 그림자: (중심x, 중심z, 긴반지름, 짧은반지름)
sea.material.uniforms.uShDir = { value: new THREE.Vector2(-SUN_DIR.x, -SUN_DIR.z).normalize() };
sea.material.uniforms.uIsl = { value: [new THREE.Vector3(9e3, 9e3, 0), new THREE.Vector3(9e3, 9e3, 0), new THREE.Vector3(9e3, 9e3, 0), new THREE.Vector3(9e3, 9e3, 0)] };
const WAVE_GLSL = WAVES.map(([dx, dz, L, A, sp], n) => `wave(vec2(${dx.toFixed(3)}, ${dz.toFixed(3)}), ${L.toFixed(1)}, ${A.toFixed(3)}, ${sp.toFixed(1)}, calm * (1.0 - smoothstep(${(L * 4).toFixed(1)}, ${(L * 13).toFixed(1)}, dist)), p, disp, grad);`).join('\n    ');
sea.material.vertexShader = `
  uniform mat4 textureMatrix; uniform float time; uniform vec3 eye; uniform vec3 uIsl[4];
  varying vec4 mirrorCoord; varying vec4 worldPosition; varying vec3 vWaveN; varying float vH; varying float vShore;
  #include <common>
  #include <fog_pars_vertex>
  void wave(vec2 d, float L, float A, float sp, float fade, vec2 p, inout vec3 disp, inout vec2 grad) {
    float k = 6.2831853 / L, ph = k * dot(d, p) - sp * k * time, a = A * fade;
    disp.y += a * sin(ph); disp.xz += d * a * 0.55 * cos(ph); grad += d * k * a * cos(ph);
  }
  void main() {
    worldPosition = modelMatrix * vec4(position, 1.0);
    mirrorCoord = textureMatrix * worldPosition;
    vec2 p = worldPosition.xz; float dist = distance(p, eye.xz);
    float d = 1e3; for (int i = 0; i < 4; i++) d = min(d, distance(p, uIsl[i].xy) - uIsl[i].z);
    vShore = d;
    float calm = 0.3 + 0.7 * clamp(d / 18.0, 0.0, 1.0);
    vec3 disp = vec3(0.0); vec2 grad = vec2(0.0);
    ${WAVE_GLSL}
    vH = disp.y; vWaveN = normalize(vec3(-grad.x, 1.0, -grad.y));
    worldPosition.xyz += disp;
    vec4 mvPosition = viewMatrix * worldPosition;
    gl_Position = projectionMatrix * mvPosition;
    #include <fog_vertex>
  }`;
sea.material.fragmentShader = `
  uniform sampler2D mirrorSampler; uniform sampler2D normalSampler; uniform float time;
  uniform vec3 sunColor; uniform vec3 sunDirection; uniform vec3 eye; uniform vec4 uSh[6]; uniform vec2 uShDir;
  varying vec4 mirrorCoord; varying vec4 worldPosition; varying vec3 vWaveN; varying float vH; varying float vShore;
  #include <common>
  #include <fog_pars_fragment>
  void main() {
    vec2 p = worldPosition.xz; vec3 toEye = eye - worldPosition.xyz; float dist = length(toEye); vec3 V = toEye / dist;
    // 잔물결: 크기와 방향이 다른 세 겹을 겹쳐 반복 무늬가 보이지 않게
    vec3 n1 = texture2D(normalSampler, p * 0.043 + vec2(time * 0.011, time * 0.019)).xyz * 2.0 - 1.0;
    vec3 n2 = texture2D(normalSampler, p.yx * 0.117 + vec2(-time * 0.031, time * 0.016)).xyz * 2.0 - 1.0;
    vec3 n3 = texture2D(normalSampler, p * 0.0173 - vec2(time * 0.006, time * 0.004)).xyz * 2.0 - 1.0;
    float detail = 1.0 / (1.0 + dist * 0.011);
    vec2 dn = (n1.xy * 0.5 + n2.xy * 0.34 + n3.xy * 0.42) * detail;
    vec3 N = normalize(vec3(vWaveN.x + dn.x * 0.34, 1.0, vWaveN.z + dn.y * 0.34));
    float ndv = max(dot(N, V), 0.0);
    float fres = clamp((0.02 + 0.98 * pow(1.0 - ndv, 5.0)) * 0.8, 0.0, 0.85);
    vec3 refl = texture2D(mirrorSampler, mirrorCoord.xy / mirrorCoord.w + N.xz * 0.03).rgb;
    // 물빛: 먼 바다는 깊은 청록, 섬 가까이는 맑은 에메랄드
    float shallow = 1.0 - smoothstep(-1.0, 13.0, vShore);
    vec3 deep = vec3(0.004, 0.042, 0.088), mid = vec3(0.007, 0.115, 0.165), shal = vec3(0.03, 0.34, 0.31);
    vec3 body = mix(deep, mid, 0.4 + 0.6 * ndv);
    body = mix(body, shal, shallow * 0.82);
    // 파도 마루에 빛이 비쳐 드는 느낌
    float toSun = pow(max(dot(V, -normalize(vec3(sunDirection.x, 0.0, sunDirection.z))), 0.0), 3.0);
    body += vec3(0.008, 0.13, 0.12) * smoothstep(0.04, 0.48, vH) * (0.3 + toSun);
    // 물 위에 떨어지는 그림자: 해 반대쪽으로 길게 늘어진 부드러운 타원
    float shade = 0.0;
    for (int i = 0; i < 6; i++) {
      vec2 q = p - uSh[i].xy;
      float d = length(vec2(dot(q, uShDir) / uSh[i].z, dot(q, vec2(-uShDir.y, uShDir.x)) / uSh[i].w));
      shade = max(shade, 1.0 - smoothstep(0.3, 1.0, d));
    }
    vec3 Hh = normalize(V + sunDirection); float nh = max(dot(N, Hh), 0.0);
    vec3 col = mix(body, refl, fres * (1.0 - shade * 0.7)) + sunColor * (pow(nh, 420.0) * 1.5 + pow(nh, 40.0) * 0.04) * (1.0 - shade);
    col = mix(col, col * vec3(0.26, 0.36, 0.46), shade * 0.82);
    // 물거품: 섬 물가에서 밀려왔다 빠지는 거품과 높은 마루의 흰 물결
    float fn = (n2.x * 0.5 + 0.5) * 0.6 + (n1.y * 0.5 + 0.5) * 0.4;
    float lap = sin(time * 0.75 + fn * 5.0 + vShore * 0.8) * 0.5 + 0.5;
    float shore = smoothstep(2.8, 0.0, vShore + lap * 1.5) * smoothstep(-3.0, -0.8, vShore)
                * smoothstep(0.30, 0.55, fn + 0.3 * (1.0 - clamp(vShore / 2.8, 0.0, 1.0)));
    float caps = smoothstep(0.40, 0.58, vH) * smoothstep(0.56, 0.74, fn) * detail * 1.4;
    col = mix(col, vec3(0.94, 0.97, 0.96), clamp(shore * 0.85 + caps * 0.3, 0.0, 1.0));
    gl_FragColor = vec4(col, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    #include <fog_fragment>
  }`;
scene.add(sea);

// 갈매기: 각진 날개 두 장과 몸통으로 만든 새. 등대와 빙하 위를 돌고, 몇 마리는 배를 따라온다
const gullMat = new THREE.MeshBasicMaterial({ color: 0xfbf7ef, side: THREE.DoubleSide });
const gullDark = new THREE.MeshBasicMaterial({ color: 0x46535c, side: THREE.DoubleSide });
function makeGull() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.62, 4), gullMat); body.rotation.x = -Math.PI / 2; g.add(body);
  const wing = (s) => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([0, 0, -0.16, 0, 0, 0.14, 0.62 * s, 0.03, 0.02,  0.62 * s, 0.03, 0.02, 0.56 * s, 0.03, -0.1, 1.08 * s, -0.02, 0.1]), 3));
    const piv = new THREE.Group(); piv.add(new THREE.Mesh(geo, gullMat));
    const tip = new THREE.BufferGeometry();
    tip.setAttribute('position', new THREE.BufferAttribute(new Float32Array([0.86 * s, 0.0, 0.03, 0.82 * s, 0.0, -0.04, 1.08 * s, -0.02, 0.1]), 3));
    piv.add(new THREE.Mesh(tip, gullDark)); g.add(piv); return piv;
  };
  g.userData.wl = wing(-1); g.userData.wr = wing(1);
  return g;
}
const gulls = [];
function addFlock(n, cx, cz, R, H, follow) {
  for (let i = 0; i < n; i++) {
    const b = makeGull(); b.scale.setScalar(follow ? 0.7 + rand() * 0.25 : 0.95 + rand() * 0.5);
    Object.assign(b.userData, { cx, cz, R: R * (0.7 + rand() * 0.6), H: H + rand() * (follow ? 1.6 : 3), w: (0.22 + rand() * 0.14) * (rand() < 0.5 ? -1 : 1), ph: rand() * 6.283, fl: 5.5 + rand() * 2.5, follow });
    scene.add(b); gulls.push(b);
  }
}
addFlock(5, PLACES.donate.pos[0], PLACES.donate.pos[1], 8.5, 11);
addFlock(3, PLACES.climate.pos[0], PLACES.climate.pos[1], 10, 9);
addFlock(2, PLACES.plastic.pos[0], PLACES.plastic.pos[1], 8, 5.5);
addFlock(3, START.x, START.z, 6.5, 3.6, true);

// 항적: 배 뒤로 퍼지며 사라지는 물거품
const puffTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'), g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.5, 'rgba(255,255,255,.45)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); })();
const wakeGeo = new THREE.CircleGeometry(1, 14); wakeGeo.rotateX(-Math.PI / 2);
const wake = Array.from({ length: 150 }, () => {
  const m = new THREE.Mesh(wakeGeo, new THREE.MeshBasicMaterial({ color: 0xe8f1f2, map: puffTex, transparent: true, opacity: 0, depthWrite: false }));
  m.visible = false; m.userData.life = 0; scene.add(m); return m;
});
let wakeI = 0, wakeT = 0;

// 섬 (임시 절차 생성 — 나중에 3D 모델로 교체)
const mat = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, flatShading: true, roughness: 0.9, ...o });
function rock(r, h, color, detail = 1, jitter = 0.22) {
  const g = new THREE.IcosahedronGeometry(1, detail);
  const p = g.attributes.position, seen = {};
  for (let i = 0; i < p.count; i++) {
    const k = [p.getX(i), p.getY(i), p.getZ(i)].map((v) => v.toFixed(3)).join(',');
    const j = seen[k] || (seen[k] = 1 + (rand() - 0.5) * 2 * jitter);
    p.setXYZ(i, p.getX(i) * j, p.getY(i) * j, p.getZ(i) * j);
  }
  g.computeVertexNormals();
  const m = new THREE.Mesh(g, mat(color));
  m.scale.set(r, h, r);
  return m;
}
const builders = {
  ocean(g, p) {            // 고리 모양 암초와 얕은 석호
    const lagoon = new THREE.Mesh(new THREE.CircleGeometry(p.r * 0.7, 20), new THREE.MeshStandardMaterial({ color: 0x6fa9a6, roughness: 0.3 }));
    lagoon.rotation.x = -Math.PI / 2; lagoon.position.y = 0.32; g.add(lagoon);
    for (let i = 0; i < 9; i++) {
      if (i === 2) continue;                                   // 배가 들어가는 입구
      const a = (i / 9) * Math.PI * 2, s = 1.4 + rand() * 1.3;
      const m = rock(s, s * (0.7 + rand() * 0.9), 0x5b6d73);
      m.position.set(Math.cos(a) * p.r * 0.78, 0.2, Math.sin(a) * p.r * 0.78); g.add(m);
    }
  },
  climate(g, p) {          // 빙하
    [[0, 0, 4.6, 6.4], [-3.4, 1.6, 2.8, 3.4], [3.2, -1.4, 3.0, 4.2], [1.4, 3.4, 2.0, 1.8], [-5.4, -2.6, 1.3, 0.9]].forEach(([x, z, r, h]) => {
      const m = rock(r, h, 0xe9f1f4, 1, 0.3); m.material.roughness = 0.55;
      m.position.set(x, h * 0.25, z); g.add(m);
    });
  },
  plastic(g, p) {          // 옅은 모래 해변과 떠밀려온 조각들
    const sand = new THREE.Mesh(new THREE.CylinderGeometry(p.r * 0.92, p.r * 1.08, 0.7, 11), mat(0xd9cdb4));
    sand.position.y = 0.2; g.add(sand);
    const dune = rock(p.r * 0.5, 1.1, 0xcfc2a6); dune.position.set(-0.8, 0.5, -0.6); g.add(dune);
    const cols = [0xd8dde0, 0x9fb7c4, 0xc98f7a, 0xe8e2d2, 0x8aa39a];
    for (let i = 0; i < 26; i++) {
      const a = rand() * Math.PI * 2, d = p.r * (0.35 + rand() * 0.75), s = 0.18 + rand() * 0.3;
      const m = new THREE.Mesh(new THREE.BoxGeometry(s, s * 0.7, s * 1.5), mat(cols[i % cols.length], { roughness: 0.5 }));
      m.position.set(Math.cos(a) * d, d > p.r ? 0.12 : 0.62, Math.sin(a) * d);
      m.rotation.set(rand(), rand() * 6, rand()); g.add(m);
    }
  },
  donate(g, p) {           // 등대
    const base = rock(p.r, 1.5, 0x5b6d73); base.position.y = 0.2; g.add(base);
    const tower = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.95, 9, 10), mat(0xf2f1ec));
    tower.position.y = 5.6;
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 0.3, 10), mat(0xf2f1ec)); cap.position.y = 10.1;
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.6, 12, 8), new THREE.MeshBasicMaterial({ color: 0x9dff4a, fog: false }));
    lamp.position.y = 10.8; lamp.name = 'lamp';
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const x = c.getContext('2d'), gr = x.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, 'rgba(160,255,90,.9)'); gr.addColorStop(0.3, 'rgba(120,230,60,.3)'); gr.addColorStop(1, 'rgba(120,230,60,0)');
    x.fillStyle = gr; x.fillRect(0, 0, 128, 128);
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
    glow.scale.setScalar(14); glow.position.y = 10.8; glow.name = 'glow';
    g.add(tower, cap, lamp, glow);
  }
};
const islandMeshes = [], islandGroups = {};
for (const [id, p] of Object.entries(PLACES)) {
  const g = new THREE.Group();
  g.position.set(p.pos[0], 0, p.pos[1]);
  builders[id](g, p);
  g.traverse((o) => { o.userData.id = id; });
  scene.add(g);
  islandMeshes.push(g); islandGroups[id] = g;
  const c = new THREE.Vector3(p.pos[0], 0, p.pos[1]);
  p.center = c;
  p.dock = c.clone().add(START.clone().sub(c).setY(0).normalize().multiplyScalar(p.r + 3.2));
}

// 섬 3D 모델 (window.__ISLANDS 에 있으면 임시 섬을 교체)
const ISLAND_SIZE = { ocean: 16, climate: 13, plastic: 13, donate: 8.5 };
Object.keys(PLACES).forEach((id, n) => { const p = PLACES[id], v = new THREE.Vector3(p.pos[0], p.pos[1], ISLAND_SIZE[id] * 0.45); ISL.push(v); sea.material.uniforms.uIsl.value[n].copy(v); });
function setShadow(n, x, z, r, len) {       // r: 물체 반지름, len: 그림자 길이
  const a = (len + r) / 2, d = sea.material.uniforms.uShDir.value;
  sea.material.uniforms.uSh.value[n].set(x + d.x * (a - r), z + d.y * (a - r), a, r);
}
{ const P = PLACES;
  setShadow(0, P.ocean.pos[0], P.ocean.pos[1], 7.6, 10);
  setShadow(1, P.climate.pos[0], P.climate.pos[1], 6.2, 17);
  setShadow(2, P.plastic.pos[0], P.plastic.pos[1], 6.2, 9);
  setShadow(3, P.donate.pos[0], P.donate.pos[1], 3.9, 7);
  setShadow(4, P.donate.pos[0], P.donate.pos[1], 1.3, 19);        // 등대 탑의 긴 그림자
}
const ISLAND_LIFT = { ocean: 0.9, donate: 0.5 };      // 어두운 바위는 살짝 밝혀서 형태가 보이게
for (const [id, b64] of Object.entries(window.__ISLANDS || {})) {
  const bin = Uint8Array.from(atob(b64), (ch) => ch.charCodeAt(0));
  new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parse(bin.buffer, '', (gltf) => {
    const g = islandGroups[id], p = PLACES[id], m = gltf.scene, S = ISLAND_SIZE[id];
    const keep = g.children.filter((c) => c.name === 'lamp' || c.name === 'glow');
    g.clear();
    m.scale.setScalar(S); m.position.y = -0.03 * S;
    m.traverse((o) => {
      if (!o.isMesh) return;
      o.material.roughness = 0.9; o.material.metalness = 0;
      if (ISLAND_LIFT[id]) { o.material.emissive = new THREE.Color(0x3a484f); o.material.emissiveIntensity = ISLAND_LIFT[id]; }
    });
    g.add(m);
    const box = new THREE.Box3().setFromObject(m);
    p.h = box.max.y;
    if (id === 'donate') {        // 불빛을 모델 꼭대기에 맞춤
      let sx = 0, sz = 0, n = 0;
      m.updateMatrixWorld(true);
      m.traverse((o) => {
        if (!o.isMesh) return;
        const a = o.geometry.attributes.position, v = new THREE.Vector3();
        for (let i = 0; i < a.count; i++) {
          v.fromBufferAttribute(a, i).applyMatrix4(o.matrixWorld);
          if (v.y > box.max.y - (box.max.y - box.min.y) * 0.1) { sx += v.x; sz += v.z; n++; }
        }
      });
      const top = new THREE.Vector3(sx / n, box.max.y - (box.max.y - box.min.y) * 0.06, sz / n);
      g.worldToLocal(top);
      keep.forEach((c) => { c.position.copy(top); g.add(c); });
      const lamp = keep.find((c) => c.name === 'lamp'); if (lamp) lamp.scale.setScalar(0.5);
    }
    g.traverse((o) => { o.userData.id = id; });
  }, (e) => console.log('island load failed', id, e));
}

// 배 (임시 형태. window.__SHIP_GLB 가 있으면 3D 모델로 교체)
const ship = new THREE.Group();
const placeholder = new THREE.Group();
{
  const hullM = mat(0x1f4a38, { roughness: 0.6 }), white = mat(0xf0efe9);
  const hull = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.8, 2.8), hullM); hull.position.y = 0.3;
  const bow = new THREE.Mesh(new THREE.ConeGeometry(0.92, 1.5, 4), hullM);
  bow.rotation.x = -Math.PI / 2; bow.rotation.z = Math.PI / 4; bow.scale.set(1, 1, 0.6); bow.position.set(0, 0.3, -2.15);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.9, 1.1), white); cabin.position.set(0, 1.15, -0.5);
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.6), white); mast.position.set(0, 2.2, -0.5);
  placeholder.add(hull, bow, cabin, mast);
}
ship.add(placeholder);
ship.position.copy(START);
scene.add(ship);
const SHIP_URL = window.__SHIP_URL;
const setStatus = (t) => { const el = document.getElementById('shipstat'); if (el) el.textContent = t; };
function shipMaterial() {      // 길이 1로 정규화된 모델 기준: 선체·크레인은 녹색, 상부는 흰색
  const m = new THREE.MeshStandardMaterial({ roughness: 0.75, flatShading: true });
  m.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vShipP;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvShipP = position;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vShipP;')
      .replace('#include <color_fragment>', `
        float hull = 1.0 - smoothstep(0.193, 0.197, vShipP.y);
        float crane = step(0.075, vShipP.z) * step(vShipP.z, 0.31) * step(0.205, vShipP.y) * step(abs(vShipP.x), 0.06);
        float boot = 1.0 - smoothstep(0.058, 0.062, vShipP.y);
        vec3 c = mix(vec3(0.9, 0.89, 0.85), vec3(0.02, 0.105, 0.08), max(hull, crane));
        diffuseColor.rgb = mix(c, vec3(0.03, 0.09, 0.08), boot);`);
  };
  return m;
}
if (window.__SHIP_GLB) {
  const bin = Uint8Array.from(atob(window.__SHIP_GLB), (ch) => ch.charCodeAt(0));
  new GLTFLoader().parse(bin.buffer, '', (gltf) => {
    const m = gltf.scene, mtl = shipMaterial(), L = 6.2;
    m.traverse((o) => { if (o.isMesh) o.material = mtl; });
    m.scale.setScalar(L);
    m.position.y = -0.062 * L;          // 흘수선까지 잠기게
    ship.remove(placeholder); ship.add(m);
    setStatus('배 모델 적용됨');
  }, () => setStatus('배 모델 처리 실패'));
}

// 목적지 표시
const marker = new THREE.Mesh(new THREE.RingGeometry(0.9, 1.2, 28), new THREE.MeshBasicMaterial({ color: GREEN, side: THREE.DoubleSide, transparent: true }));
marker.rotation.x = -Math.PI / 2;
marker.position.y = 0.12;
marker.visible = false;
scene.add(marker);

// ---------- 상태 ----------
const state = {
  mode: 'home',        // home | world
  t: 0,                // 0 = 홈 카메라, 1 = 월드 카메라
  focus: 0,            // 카드 열렸을 때 줌
  heading: 0, speed: 0, camYaw: 0, camYawT: 0,
  target: null, targetId: null, arrivedId: null
};
const $ = (id) => document.getElementById(id);
const body = document.body;

const yawTo = (v) => Math.atan2(-(v.x - ship.position.x), -(v.z - ship.position.z));
function lookToward(v, always) {       // 누른 쪽으로 카메라를 한 번만 돌린다
  const y = yawTo(v), d = Math.atan2(Math.sin(y - state.camYawT), Math.cos(y - state.camYawT));
  if (always || Math.abs(d) > 0.35) state.camYawT = y;
}
const heroVideo = $('heroVideo'), amb = $('amb');
heroVideo.addEventListener('playing', () => { if (heroVideo.currentTime >= 0) requestAnimationFrame(() => body.classList.add('vplay')); });
let soundOn = true;
function syncMedia() {
  if (heroVideo) { if (state.mode === 'home') heroVideo.play().catch(() => {}); else setTimeout(() => { if (state.mode !== 'home') heroVideo.pause(); }, 2200); }
}
function playAmb() { if (amb && soundOn) { amb.volume = 0.35; amb.play().then(() => { body.dataset.sounding = '1'; }).catch(() => {}); } }
$('snd').addEventListener('click', () => {
  soundOn = !soundOn; body.dataset.sound = soundOn ? 'on' : 'off';
  if (soundOn) playAmb(); else { amb.pause(); delete body.dataset.sounding; }
});
function setMode(m) {
  state.mode = m;
  body.dataset.mode = m; syncMedia();
}
function start() { if (body.dataset.index) return; playAmb(); if (state.mode === 'home') setMode('world'); }
function goHome() {
  closeCard();
  state.target = START.clone(); state.targetId = 'home'; marker.visible = false; state.camYawT = 0; endTrip();
  setMode('home');
}
// 이동 중 한마디: 목적지가 있는 긴 이동에서만, 문장 하나와 진행선
let tripTimer = 0;
function startTrip(id) {
  endTrip();
  const p = PLACES[id], dist = Math.hypot(p.dock.x - ship.position.x, p.dock.z - ship.position.z);
  if (!p.trip || dist < 18) return;                 // 짧은 이동에는 띄우지 않는다
  state.trip = { id, dist };
  $('trip-to').textContent = p.label.replace('후원 ', '') + '까지';
  staggerWords($('trip-text'), p.trip, 0.02, 0.028);
  $('trip-fill').style.width = '0%';
  void $('trip').offsetWidth; body.dataset.trip = id;      // 출발과 동시에 바로 띄운다
}
function endTrip() { clearTimeout(tripTimer); state.trip = null; delete body.dataset.trip; }
function goTo(id) {
  start();
  closeCard();
  const p = PLACES[id];
  state.target = p.dock.clone(); state.targetId = id; state.arrivedId = null;
  marker.position.set(p.dock.x, 0.12, p.dock.z); marker.visible = true;
  setActiveNav(id); lookToward(p.center); preloadArrive(id);
  body.dataset.hinted = '1'; startTrip(id);
}
function sailTo(v) {
  body.dataset.hinted = '1'; endTrip();
  for (const [id, p] of Object.entries(PLACES)) {          // 섬 근처를 누르면 그 섬으로
    if (Math.hypot(v.x - p.center.x, v.z - p.center.z) < p.r + 4.5) { goTo(id); return; }
  }
  const d = v.clone().sub(ship.position).setY(0);
  if (d.length() > 80) v = ship.position.clone().add(d.setLength(80));
  closeCard();          // 바다를 누를 땐 화면을 돌리지 않는다
  state.target = v.clone().setY(0); state.targetId = null; state.arrivedId = null;
  marker.position.set(v.x, 0.12, v.z); marker.visible = true;
  setActiveNav(null);
}
function setActiveNav(id) {      // 선택 표시가 메뉴 사이를 미끄러져 옮겨 간다
  const nav = document.querySelector('nav'), pill = $('navpill'); let on = null;
  document.querySelectorAll('nav [data-go]').forEach((b) => { const hit = b.dataset.go === id; b.classList.toggle('on', hit); if (hit) on = b; });
  if (on) { pill.style.width = on.offsetWidth + 'px'; pill.style.transform = 'translateX(' + (on.offsetLeft - 4) + 'px)'; pill.style.opacity = 1; nav.dataset.on = id; }
  else { pill.style.opacity = 0; delete nav.dataset.on; }
}
// 도착 장면: 섬에 닿으면 그 섬의 영상이 화면을 채우고, 잠시 뒤 카드가 올라온다
const ARRIVE = { ocean: { loop: false, cardAt: 2700 }, climate: { loop: true }, plastic: { loop: true, pos: '0% 50%' }, donate: { loop: true } };
const arriveVideo = $('arriveVideo');
let arriveTimer = 0, arriveAt = 0;
function preloadArrive(id) {
  if (!ARRIVE[id] || arriveVideo.dataset.id === id) return;
  arriveVideo.dataset.id = id; arriveVideo.poster = 'arrive-' + id + '.jpg'; arriveVideo.src = 'arrive-' + id + '.mp4';
  arriveVideo.loop = ARRIVE[id].loop; arriveVideo.style.objectPosition = ARRIVE[id].pos || '50% 50%'; arriveVideo.load();
}
// 글자를 낱말 단위로 감싸 아래에서 차례로 올라오게 한다
function staggerWords(el, text, start, step) {
  el.textContent = '';
  text.split(' ').forEach((word, n) => {
    const outer = document.createElement('span'), inner = document.createElement('span');
    outer.className = 'w'; inner.textContent = word; inner.style.transitionDelay = (start + n * step).toFixed(3) + 's';
    outer.appendChild(inner); el.appendChild(outer); el.appendChild(document.createTextNode(' '));
  });
  return start + text.split(' ').length * step;
}
function staggerChars(el, text, start, step) {      // 숫자는 한 글자씩 굴러 올라온다
  el.textContent = '';
  [...text].forEach((ch, n) => {
    const outer = document.createElement('span'), inner = document.createElement('span');
    outer.className = 'w'; inner.textContent = ch === ' ' ? '\u00A0' : ch; inner.style.transitionDelay = (start + n * step).toFixed(3) + 's';
    outer.appendChild(inner); el.appendChild(outer);
  });
}
function showCard(id) {
  const p = PLACES[id];
  $('c-tag').textContent = p.tag.toUpperCase(); $('c-tag').style.transitionDelay = '.08s';
  let t = staggerWords($('c-title'), p.title, 0.16, 0.055);
  t = staggerWords($('c-body'), p.body, t + 0.05, 0.02);
  staggerChars($('c-stat'), p.stat, 0.5, 0.04);
  $('c-statlabel').textContent = p.statLabel; $('c-statlabel').style.transitionDelay = '.7s';
  $('c-cta').textContent = p.cta; $('c-cta').style.transitionDelay = '.8s';
  $('c-close').style.transitionDelay = '.9s';
  $('c-cta').disabled = !p.link; $('c-cta').dataset.link = p.link || ''; $('c-cta').toggleAttribute('data-ext', !!p.ext);
  void $('card').offsetWidth;            // 처음 상태를 한 번 그린 뒤에 등장시킨다
  body.dataset.card = id;
}
function openCard(id) {
  const p = PLACES[id];
  state.arrivedId = id; lookToward(p.center, true); endTrip();
  preloadArrive(id);
  try { arriveVideo.currentTime = 0; } catch (e) {}
  arriveVideo.play().catch(() => {});
  body.dataset.arrive = id; arriveAt = performance.now();
  clearTimeout(arriveTimer);
  arriveTimer = setTimeout(() => { if (state.arrivedId === id) showCard(id); }, (ARRIVE[id] && ARRIVE[id].cardAt) || 1600);
}
$('arrive').addEventListener('click', () => { if (state.arrivedId && !body.dataset.card) { clearTimeout(arriveTimer); showCard(state.arrivedId); } });
function closeCard() { clearTimeout(arriveTimer); delete body.dataset.card; delete body.dataset.arrive; state.arrivedId = null; arriveVideo.pause(); }

// ---------- 입력 ----------
document.querySelectorAll('[data-go]').forEach((b) => b.addEventListener('click', () => goTo(b.dataset.go)));
$('start').addEventListener('click', start);
$('logo').addEventListener('click', goHome);
$('c-cta').addEventListener('click', () => {          // 어둡게 잠긴 뒤 이야기 페이지로
  const link = $('c-cta').dataset.link; if (!link) return;
  if (state.arrivedId) history.replaceState(null, '', location.pathname + location.search + '#' + state.arrivedId);   // 뒤로 오면 떠났던 섬 앞에서 다시 시작
  body.dataset.leaving = '1'; setTimeout(() => { location.href = link; }, 650);
});
window.addEventListener('pageshow', () => { delete body.dataset.leaving; });
$('c-close').addEventListener('click', () => { closeCard(); setActiveNav(null); });
window.addEventListener('wheel', (e) => { if (e.deltaY > 0) start(); }, { passive: true });

const ray = new THREE.Raycaster();
const seaPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
let down = null;
canvas.addEventListener('pointerdown', (e) => { down = { x: e.clientX, y: e.clientY, lx: e.clientX, moved: 0 }; });
canvas.addEventListener('pointermove', (e) => {          // 좌우로 끌면 둘러보기
  if (!down || state.mode !== 'world') return;
  const dx = e.clientX - down.lx; down.lx = e.clientX; down.moved += Math.abs(dx);
  if (down.moved > 12) state.camYawT += dx * 0.007;
});
canvas.addEventListener('pointercancel', () => { down = null; });
canvas.addEventListener('pointerup', (e) => {
  if (!down) return;
  const moved = Math.max(down.moved, Math.hypot(e.clientX - down.x, e.clientY - down.y)); down = null;
  if (state.mode === 'home') { start(); return; }          // 홈에서는 탭/스와이프 모두 출발
  if (moved > 12) return;
  const ndc = new THREE.Vector2((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  ray.setFromCamera(ndc, camera);
  const hit = ray.intersectObjects(islandMeshes, true)[0];
  if (hit) { goTo(hit.object.userData.id); return; }
  const pt = new THREE.Vector3();
  if (ray.ray.intersectPlane(seaPlane, pt)) sailTo(pt);
});

function resize() {
  renderer.setSize(innerWidth, innerHeight, false);
  camera.aspect = innerWidth / innerHeight;
  camera.fov = camera.aspect < 1 ? 62 : 50;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize); resize();

// ---------- 라벨 ----------
const labels = {};
for (const [id, p] of Object.entries(PLACES)) {
  const el = document.createElement('button');
  el.className = 'label'; el.innerHTML = '<span><i></i><b></b></span>'; el.querySelector('i').textContent = '0' + (Object.keys(labels).length + 1); el.querySelector('b').textContent = p.label; el.querySelector('b').style.fontWeight = 600;
  el.addEventListener('click', () => goTo(id));
  $('labels').appendChild(el);
  labels[id] = el;
}

// ---------- 루프 ----------
let last = performance.now(), time = 0;
const tmp = new THREE.Vector3(), camPos = new THREE.Vector3(), camLook = new THREE.Vector3();
const lerpAngle = (a, b, k) => a + Math.atan2(Math.sin(b - a), Math.cos(b - a)) * k;

function tick() {
  const now = performance.now(), dt = Math.min((now - last) / 1000, 0.05); last = now; time += dt;

  sea.material.uniforms.time.value = time;

  // 배 이동
  if (state.target) {
    const dir = tmp.copy(state.target).sub(ship.position).setY(0);
    const dist = dir.length();
    if (dist < 1.3) {
      const id = state.targetId; state.target = null; state.targetId = null; marker.visible = false;
      if (id && PLACES[id]) openCard(id);
    } else {
      dir.normalize();
      // 다른 섬 피하기
      for (const [id, p] of Object.entries(PLACES)) {
        if (id === state.targetId) continue;
        const away = ship.position.clone().sub(p.center).setY(0), d = away.length();
        if (d < p.r + 5) dir.add(away.normalize().multiplyScalar((p.r + 5 - d) * 0.5));
      }
      dir.normalize();
      const wantH = Math.atan2(-dir.x, -dir.z), off = Math.abs(Math.atan2(Math.sin(wantH - state.heading), Math.cos(wantH - state.heading)));
      state.heading = lerpAngle(state.heading, wantH, Math.min(1, dt * 3));
      const want = Math.min(15, 1.5 + dist * 1.3) * Math.max(0.15, Math.cos(Math.min(off, 1.45)));   // 방향이 맞을 때만 속도를 낸다
      state.speed += (want - state.speed) * Math.min(1, dt * 2);
    }
  } else {
    state.speed += (0 - state.speed) * Math.min(1, dt * 3);
    if (state.arrivedId) {       // 도착하면 섬을 바라봄
      const c = PLACES[state.arrivedId].center;
      state.heading = lerpAngle(state.heading, Math.atan2(-(c.x - ship.position.x), -(c.z - ship.position.z)), dt * 1.5);
    } else if (state.mode === 'home') {
      state.heading = lerpAngle(state.heading, 0, dt * 2);
    }
  }
  ship.position.x += -Math.sin(state.heading) * state.speed * dt;
  ship.position.z += -Math.cos(state.heading) * state.speed * dt;
  {   // 배가 너울을 탄다: 높이와 기울기를 파도에서 가져온다
    const w = {}, hgt = waveAt(ship.position.x, ship.position.z, time, w);
    const fx = -Math.sin(state.heading), fz = -Math.cos(state.heading);
    const pitch = Math.atan(w.gx * fx + w.gz * fz) * 0.75, roll = Math.atan(w.gx * -fz + w.gz * fx) * 0.75;
    ship.position.y = hgt * 0.8;
    ship.rotation.set(0, 0, 0); ship.rotateY(state.heading); ship.rotateX(-pitch); ship.rotateZ(roll);
    sea.position.x = ship.position.x; sea.position.z = ship.position.z;
    setShadow(5, ship.position.x, ship.position.z, 1.9, 8);
    if (marker.visible) marker.position.y = waveAt(marker.position.x, marker.position.z, time) + 0.14;
  }

  for (const b of gulls) {
    const u = b.userData;
    if (u.follow) { u.cx += (ship.position.x - u.cx) * Math.min(1, dt * 0.6); u.cz += (ship.position.z - u.cz) * Math.min(1, dt * 0.6); }
    const a = u.ph + time * u.w, dir = Math.sign(u.w);
    b.position.set(u.cx + Math.cos(a) * u.R, u.H + Math.sin(time * 0.5 + u.ph) * 0.8, u.cz + Math.sin(a) * u.R);
    b.rotation.set(0, 0, 0); b.rotateY(-a + (dir > 0 ? Math.PI : 0)); b.rotateZ(-dir * 0.32);     // 원의 접선 방향을 보고 안쪽으로 기운다
    const glide = Math.sin(time * 0.33 + u.ph * 2.0) > 0.35;                                       // 가끔 날갯짓을 멈추고 활공
    const flap = glide ? 0.12 : Math.sin(time * u.fl + u.ph) * 0.62;
    u.wl.rotation.z = -flap; u.wr.rotation.z = flap;
  }
  wakeT += dt;
  if (state.speed > 1.5 && wakeT > 0.04) {
    wakeT = 0;
    for (const side of [-1, 1]) {
      const w = wake[wakeI++ % wake.length];
      w.position.set(ship.position.x + Math.sin(state.heading) * 2.6 + Math.cos(state.heading) * side * 0.5, 0.06, ship.position.z + Math.cos(state.heading) * 2.6 - Math.sin(state.heading) * side * 0.5);
      w.userData.life = 1; w.userData.side = side; w.userData.h = state.heading; w.visible = true; w.scale.setScalar(0.35);
    }
  }
  for (const w of wake) {
    if (!w.visible) continue;
    w.userData.life -= dt * 0.34;
    if (w.userData.life <= 0) { w.visible = false; continue; }
    const k = 1 - w.userData.life;
    w.scale.setScalar(0.7 + k * 1.5);
    w.position.x += Math.cos(w.userData.h) * w.userData.side * dt * 0.7; w.position.z -= Math.sin(w.userData.h) * w.userData.side * dt * 0.7;
    w.material.opacity = w.userData.life * w.userData.life * 0.2;
    w.position.y = waveAt(w.position.x, w.position.z, time) + 0.07;
  }

  if (state.trip) {
    const p = PLACES[state.trip.id], left = Math.hypot(p.dock.x - ship.position.x, p.dock.z - ship.position.z);
    $('trip-fill').style.width = Math.max(0, Math.min(100, (1 - left / state.trip.dist) * 100)).toFixed(1) + '%';
    if (left < 3.2) delete body.dataset.trip;          // 도착 장면이 뜨기 전에 먼저 사라진다
  }
  marker.material.opacity = 0.5 + Math.sin(time * 5) * 0.3;
  marker.scale.setScalar(1 + Math.sin(time * 5) * 0.08);
  const lamp = scene.getObjectByName('lamp');
  const glow = scene.getObjectByName('glow');
  if (glow) glow.scale.setScalar(13 + Math.sin(time * 1.8) * 4);
  sky.position.copy(camera.position);

  // 카메라: 홈(수평선) ↔ 월드(내려다보기) ↔ 포커스(섬 줌)
  const ease = (v, to, k) => v + (to - v) * Math.min(1, dt * k);
  state.t = ease(state.t, state.mode === 'world' ? 1 : 0, 1.6);
  state.focus = ease(state.focus, state.arrivedId ? 1 : 0, 2);
  const s = state.t * state.t * (3 - 2 * state.t);
  const portrait = camera.aspect < 1;
  const sp = ship.position;
  const homePos = new THREE.Vector3(sp.x, portrait ? 4.4 : 3.0, sp.z + (portrait ? 16.5 : 11));
  const homeLook = new THREE.Vector3(sp.x, portrait ? -2.0 : -1.0, sp.z - 30);
  // 추적 카메라: 배 뒤에서 진행 방향을 바라보고, 도착하면 섬 쪽으로 천천히 돈다
  state.camYaw = lerpAngle(state.camYaw, state.mode === 'home' ? 0 : state.camYawT, Math.min(1, dt * 1.6));
  const yaw = state.camYaw;
  const bx = Math.sin(yaw), bz = Math.cos(yaw);
  const H = (portrait ? 12 : 8) - state.focus * (portrait ? 3 : 2.5), B = (portrait ? 25 : 19) - state.focus * (portrait ? 1 : 1);
  
  const worldPos = new THREE.Vector3(sp.x + bx * B, H, sp.z + bz * B);
  const worldLook = new THREE.Vector3(sp.x - bx * 16, portrait ? -2.5 : 1, sp.z - bz * 16);
  if (state.arrivedId) {
    const pl = PLACES[state.arrivedId], c = pl.center;
    worldLook.lerp(new THREE.Vector3(c.x, Math.min(pl.h * 0.35, 4) - (portrait ? 5 : 0), c.z), state.focus);
  }
  
  camPos.lerpVectors(homePos, worldPos, s);
  camLook.lerpVectors(homeLook, worldLook, s);
  camera.position.copy(camPos);
  camera.lookAt(camLook);

  // 라벨 위치
  for (const [id, p] of Object.entries(PLACES)) {
    const v = tmp.set(p.center.x, (p.h + (p.lighthouse ? 3 : 2.6)), p.center.z).project(camera);
    const el = labels[id];
    const vis = v.z < 1 && state.t > 0.6 && !state.arrivedId && (-v.y * 0.5 + 0.5) * innerHeight > 96;
    el.style.opacity = vis ? 1 : 0;
    el.style.pointerEvents = vis ? 'auto' : 'none';
    el.style.transform = `translate(-50%,-100%) translate(${(v.x * 0.5 + 0.5) * innerWidth}px,${(-v.y * 0.5 + 0.5) * innerHeight}px)`;
  }

  if (!(body.dataset.arrive && performance.now() - arriveAt > 1300)) renderer.render(scene, camera);   // 도착 영상이 덮은 동안은 3D를 쉬게 한다
  requestAnimationFrame(tick);
}
{   // 첫 화면 제목: 낱말이 차례로 올라온다
  const h = $('heroTitle'), words = h.textContent.trim().split(' '); h.textContent = '';
  words.forEach((word, n) => {
    const o = document.createElement('span'), i = document.createElement('span');
    o.className = 'hw'; i.textContent = word; i.style.transitionDelay = (0.25 + n * 0.09).toFixed(2) + 's';
    o.appendChild(i); h.appendChild(o); h.appendChild(document.createTextNode(' '));
  });
  // 배경 장면과 글꼴이 준비된 뒤에 글자를 올린다 (글씨만 먼저 뜨지 않게). 늦어도 1.8초 뒤에는 보여 준다.
  const show = () => requestAnimationFrame(() => requestAnimationFrame(() => body.classList.add('ready')));
  const poster = $('heroStill');
  const waits = [poster.complete && poster.naturalWidth ? (poster.decode ? poster.decode().catch(() => {}) : 0) : new Promise((r) => { poster.onload = poster.onerror = r; })];
  if (document.fonts && document.fonts.load) waits.push(document.fonts.load('700 30px "Noto Serif KR"', h.textContent).catch(() => {}));
  Promise.race([Promise.all(waits), new Promise((r) => setTimeout(r, 1800))]).then(show);
}
setMode('home');
{   // 이야기 페이지에서 돌아오면 떠났던 섬 앞에서 다시 시작
  const back = PLACES[location.hash.slice(1)];
  if (back) {
    ship.position.set(back.dock.x, 0, back.dock.z);
    state.heading = state.camYaw = state.camYawT = yawTo(back.center);
    state.t = 1; setMode('world'); setActiveNav(location.hash.slice(1));
    history.replaceState(null, '', location.pathname);
  }
}
tick();
window.__voyage = { state, goTo, goHome, start, ship };
