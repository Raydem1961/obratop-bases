import json, gzip, hashlib, pathlib, sys

root=pathlib.Path(__file__).resolve().parents[1]
catalog_path=root/"docs/catalog.json"
if not catalog_path.exists():
    print("catalog.json não existe"); sys.exit(1)
c=json.loads(catalog_path.read_text(encoding="utf-8"))
if not isinstance(c.get("bases"),list):
    print("bases inválido"); sys.exit(1)
errors=[]
for b in c["bases"]:
    if b.get("status")!="ready": continue
    rel=b.get("file")
    if not rel: errors.append(f"{b.get('id')}: arquivo ausente"); continue
    p=root/"docs"/rel
    if not p.exists(): errors.append(f"{b.get('id')}: {rel} não existe"); continue
    raw=p.read_bytes()
    if hashlib.sha256(raw).hexdigest()!=b.get("sha256"):
        errors.append(f"{b.get('id')}: sha256 diverge")
        continue
    try:
        data=json.loads(gzip.decompress(raw))
        rows=data.get("rows",[])
        if not rows or not any(float(x.get("price") or 0)>0 for x in rows):
            errors.append(f"{b.get('id')}: sem preços positivos")
    except Exception as e: errors.append(f"{b.get('id')}: gzip/json inválido {e}")
if errors:
    print("\n".join(errors)); sys.exit(1)
ready=[b for b in c["bases"] if b.get("status")=="ready"]
by_src={}
for b in c["bases"]:
    by_src.setdefault(b.get("source","?"),[0,0])
    by_src[b.get("source","?")][0]+=1
    if b.get("status")=="ready": by_src[b.get("source","?")][1]+=1
print(f"Catálogo válido: {len(c['bases'])} entrada(s), {len(ready)} pronta(s).")
import os
resumo=["### Bases oficiais ObraTop", f"- Entradas: {len(c['bases'])} | Prontas: {len(ready)}"]
for src in ("SINAPI","SICRO3","ORSE-SE"):
    t,r=by_src.get(src,[0,0]); resumo.append(f"- {src}: {t} entrada(s), {r} pronta(s)")
if not ready:
    msg="NENHUMA base de preços ficou pronta nesta execução: SINAPI, SICRO e ORSE não publicaram preços. Verifique o log do passo de coleta."
    print(f"::warning title=Sem bases prontas::{msg}")
    resumo.append(f"\n> ⚠️ {msg}")
sm=os.environ.get("GITHUB_STEP_SUMMARY")
if sm:
    with open(sm,"a",encoding="utf-8") as f: f.write("\n".join(resumo)+"\n")
