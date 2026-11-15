# 항해 데모 소스 (voyage-src)

`/voyage/` 에 배포되는 항해 데모의 원본입니다. `/voyage/index.html` 은 빌드 결과물(압축된 한 파일)이라 직접 고치지 않습니다.

## 빌드

```
cd voyage-src
npm install
python3 build.py      # ../voyage/index.html 을 다시 만든다
```

버전 표기는 `src/template.html` 의 `비공식 컨셉 시안 · vX.Y` 를 손으로 올립니다.

## 구성

- `src/main.js` — three.js 장면 전체(하늘 파노라마, 바다 셰이더, 배, 섬, 갈매기, 그림자), 조작, 도착 장면, 카드, 이동 중 한마디
- `src/template.html` — 화면 위 요소와 스타일(헤더, 첫 화면 문구, 유리 카드, 이름표). 섬별 연결 주소는 여기 `#index` 목록의 링크에 한 번만 적는다(카드 버튼도 이 주소를 읽어 쓴다). 목록 여닫기는 3D 묶음과 별개의 짧은 스크립트라 장면이 실패해도 링크는 눌린다
- `assets/ship.glb` — 배 모델(길이 1로 정규화, 색은 셰이더가 높이로 칠함)
- `assets/opt/*.glb` — 섬 4개 모델(meshopt 압축, 텍스처 포함)
- `media/poster_small.jpg` — 첫 화면에 심는 정지 장면
- `tools/` — 힉스필드에서 받은 GLB 를 정규화하는 스크립트. 섬 모델은 이후 `gltf-transform optimize --compress meshopt --simplify-ratio 0.35 --texture-compress webp --texture-size 768` 로 압축
- `pending/reef-coral.jpg` — 새 산호 암초 이미지(3D 변환 대기)

영상·소리·하늘 그림(`hero.mp4`, `arrive-*.mp4`, `ambience.mp3`, `sky.jpg`)은 `/voyage/` 에 파일로 있고 페이지가 주소로 불러옵니다.
