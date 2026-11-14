"""항해 데모 빌드: src/main.js 를 묶어 src/template.html 에 넣고, 배·섬 모델과 첫 장면 사진을 함께 심어
../voyage/index.html 한 파일로 만든다.  사용: npm install && python3 build.py"""
import base64, json, os, subprocess
subprocess.run(["npx", "esbuild", "src/main.js", "--bundle", "--minify", "--format=iife", "--outfile=dist/bundle.js"], check=True)
b64 = lambda p: base64.b64encode(open(p, "rb").read()).decode()
html = open("src/template.html", encoding="utf-8").read()
bundle = open("dist/bundle.js", encoding="utf-8").read().replace("</script", "<\\/script")
islands = {k: b64(f"assets/opt/{k}.glb") for k in ["ocean", "climate", "plastic", "donate"] if os.path.exists(f"assets/opt/{k}.glb")}
html = (html.replace("/*__BUNDLE__*/", bundle)
            .replace("__POSTER__", "data:image/jpeg;base64," + b64("media/poster_small.jpg"))
            .replace("__ISLANDS_JSON__", json.dumps(islands))
            .replace("__SHIP_B64__", b64("assets/ship.glb")))
open("../voyage/index.html", "w", encoding="utf-8").write(html)
print("built ../voyage/index.html", len(html) // 1024, "KB")
