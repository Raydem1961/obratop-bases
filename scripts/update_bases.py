from __future__ import annotations
import requests, re, json, gzip, hashlib, tempfile, shutil, os, pathlib, datetime, unicodedata, urllib.parse
from bs4 import BeautifulSoup
import pandas as pd
import py7zr
import sys, zipfile
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import sinapi_reader, sicro_reader, orse_reader

ROOT=pathlib.Path(__file__).resolve().parents[1]
DOCS=ROOT/"docs"; BASES=DOCS/"bases"; BASES.mkdir(parents=True,exist_ok=True)
CATALOG=DOCS/"catalog.json"
NOW=datetime.datetime.now(datetime.timezone.utc).isoformat()

S=requests.Session()
S.headers.update({"User-Agent":"ObraTop-Bases/3.22 (+public cost-reference updater)"})
TIMEOUT=60

SINAPI_HOME="https://www.caixa.gov.br/poder-publico/modernizacao-gestao/sinapi/Paginas/default.aspx"
SICRO_ROOT="https://www.gov.br/dnit/pt-br/assuntos/planejamento-e-pesquisa/custos-referenciais/sistemas-de-custos/sicro/relatorios/relatorios-sicro"
ORSE_HOME="https://orse.cehop.se.gov.br/downloads.asp"

REGION={"AC":"norte","AL":"nordeste","AP":"norte","AM":"norte","BA":"nordeste","CE":"nordeste","DF":"centro-oeste","ES":"sudeste","GO":"centro-oeste","MA":"nordeste","MT":"centro-oeste","MS":"centro-oeste","MG":"sudeste","PA":"norte","PB":"nordeste","PR":"sul","PE":"nordeste","PI":"nordeste","RJ":"sudeste","RN":"nordeste","RS":"sul","RO":"norte","RR":"norte","SC":"sul","SP":"sudeste","SE":"nordeste","TO":"norte"}
STATE={"AC":"acre","AL":"alagoas","AP":"amapa","AM":"amazonas","BA":"bahia","CE":"ceara","DF":"distrito-federal","ES":"espirito-santo","GO":"goias","MA":"maranhao","MT":"mato-grosso","MS":"mato-grosso-do-sul","MG":"minas-gerais","PA":"para","PB":"paraiba","PR":"parana","PE":"pernambuco","PI":"piaui","RJ":"rio-de-janeiro","RN":"rio-grande-do-sul" if False else "rio-grande-do-norte","RS":"rio-grande-do-sul","RO":"rondonia","RR":"roraima","SC":"santa-catarina","SP":"sao-paulo","SE":"sergipe","TO":"tocantins"}
MONTH={"01":"janeiro","02":"fevereiro","03":"marco","04":"abril","05":"maio","06":"junho","07":"julho","08":"agosto","09":"setembro","10":"outubro","11":"novembro","12":"dezembro"}
UFS=list(REGION)

def norm(v):
    s=unicodedata.normalize("NFD",str(v or ""))
    s="".join(c for c in s if unicodedata.category(c)!="Mn").lower()
    return re.sub(r"[^a-z0-9]+"," ",s).strip()
def nprice(v):
    if v is None:return 0.0
    if isinstance(v,(int,float)) and pd.notna(v): return float(v)
    s=str(v).strip().replace("R$","").replace(" ","")
    if not s:return 0.0
    if "," in s and "." in s:s=s.replace(".","").replace(",",".")
    elif "," in s:s=s.replace(",",".")
    try:return float(s)
    except:return 0.0
def get(url,stream=False):
    r=S.get(url,timeout=TIMEOUT,allow_redirects=True,stream=stream);r.raise_for_status();return r
def links(url):
    html=get(url).text;soup=BeautifulSoup(html,"html.parser")
    out=[]
    for a in soup.select("a[href]"):
        out.append((a.get_text(" ",strip=True),urllib.parse.urljoin(url,a.get("href"))))
    return html,out
def save_base(meta,rows):
    rows=[r for r in rows if r.get("description") and r.get("unit") and float(r.get("price") or 0)>0]
    if not rows:return None
    payload={"meta":meta,"rows":rows}
    raw=json.dumps(payload,ensure_ascii=False,separators=(",",":")).encode()
    gz=gzip.compress(raw,compresslevel=9,mtime=0)
    safe=re.sub(r"[^A-Za-z0-9_.-]+","-",meta["id"])
    rel=f"bases/{safe}.json.gz"; p=DOCS/rel;p.write_bytes(gz)
    return {**meta,"status":"ready","count":len(rows),"file":rel,"url":f"https://raw.githubusercontent.com/Raydem1961/obratop-bases/main/docs/{rel}","sha256":hashlib.sha256(gz).hexdigest(),"normalizedSha256":hashlib.sha256(raw).hexdigest(),"generatedAt":NOW}

def header_and_rows(path):
    book=pd.ExcelFile(path)
    for sheet in book.sheet_names:
        raw=pd.read_excel(path,sheet_name=sheet,header=None,dtype=object)
        header=None
        for i in range(min(35,len(raw))):
            vals=[norm(x) for x in raw.iloc[i].tolist()]
            score=sum(bool(re.search(r"codigo|descricao|unid|preco|custo",x)) for x in vals)
            if score>=2: header=i;break
        if header is None:continue
        df=pd.read_excel(path,sheet_name=sheet,header=header,dtype=object)
        yield sheet,df

def col(df,patterns):
    for c in df.columns:
        n=norm(c)
        for p in patterns:
            if re.search(p,n): return c
    return None

def parse_generic_xlsx(path,source,uf,reference,regime=""):
    rows=[]
    for sheet,df in header_and_rows(path):
        cdesc=col(df,[r"^descricao",r"servico",r"composicao",r"insumo"])
        cunit=col(df,[r"^unid",r"^unidade"])
        ccode=col(df,[r"^codigo",r"^cod "])
        price_patterns=[r"^preco",r"^custo unitario",r"valor unitario",r"custo"]
        if source=="SINAPI":
            if "desonerado" in norm(regime) and "nao" not in norm(regime):
                price_patterns=[r"custo.*desonerado",r"preco.*desonerado",r"desonerado"]
            else:
                price_patterns=[r"custo.*nao.*desonerado",r"preco.*nao.*desonerado",r"nao.*desonerado",r"^preco mediano",r"^custo unitario"]
        cprice=col(df,price_patterns)
        if not cdesc or not cunit or not cprice:continue
        for _,r in df.iterrows():
            d=str(r.get(cdesc,"") or "").strip();u=str(r.get(cunit,"") or "").strip();p=nprice(r.get(cprice))
            if d and u and p>0:
                rows.append({"code":str(r.get(ccode,"") or "").strip() if ccode else "","description":d,"unit":u,"price":p,"sheet":sheet})
    return rows

def ingest_sicro_7z(arc,source_url,entries,official_url=""):
    """Lê o pacote mensal do SICRO (.7z com os 'Relatórios Sintéticos' em XLSX) e grava uma base por regime."""
    with tempfile.TemporaryDirectory() as td:
        ext=pathlib.Path(td)/"x";ext.mkdir()
        with py7zr.SevenZipFile(arc,"r") as z:z.extractall(ext)
        uf,ref,res,seen=sicro_reader.read_sicro_folder(ext)
    if not {"comp","mat","mo","eq"}<=seen:
        raise ValueError(f"pacote SICRO incompleto: faltam {sorted({'comp','mat','mo','eq'}-seen)}")
    year,mm=ref.split("-");ok=0
    for regime,rows in res.items():
        sheets={r["sheet"] for r in rows}
        if len(rows)<2000 or len(sheets)<3:
            print("SICRO descartado (poucos itens)",uf,regime,len(rows),sorted(sheets));continue
        meta={"id":f"SICRO3-{uf}-{year}-{mm}-{norm(regime).replace(' ','-')}","source":"SICRO3","uf":uf,"year":int(year),"month":mm,"reference":ref,"regime":regime,"type":"mixed","officialUrl":official_url or SICRO_ROOT,"publishedAt":"","sourceFile":source_url}
        e=save_base(meta,rows)
        if e:entries.append(e);ok+=1
    print(f"SICRO {uf} {ref}: {ok} base(s) gravada(s)")
    return ok

def update_sicro_local(entries):
    """Fonte manual: pacotes .7z do SICRO colocados em fontes/ (ex.: ba-07-2026.7z)."""
    folder=ROOT/"fontes"
    if not folder.exists():return 0
    n=0
    for z in sorted(folder.glob("*.7z")):
        try:n+=ingest_sicro_7z(z,f"fontes/{z.name}",entries)
        except Exception as e:print("SICRO local",z.name,e)
    return n

def update_sicro(entries):
    """Descoberta automática no site do DNIT: <região>/<estado>/<ano>/<mês>/<uf>-<mm>-<ano>.7z (trimestral)."""
    now=datetime.datetime.now();got=0
    for year in (str(now.year),str(now.year-1)):
        for uf in UFS:
            year_url=f"{SICRO_ROOT}/{REGION[uf]}/{STATE[uf]}/{year}"
            try:html,ls=links(year_url)
            except Exception:continue
            for mm,mname in MONTH.items():
                month_url=next((u for t,u in ls if re.search(fr"/{re.escape(mname)}(?:/|$)",u,re.I) and not u.endswith(".7z")),None)
                if not month_url:continue
                try:
                    h2,l2=links(month_url)
                    target=next((u for t,u in l2 if re.search(fr"{uf}[-.]?{mm}[.-]{year}\.7z",t+" "+u,re.I)),None)
                    if not target:continue
                    target=re.sub(r"/view(?:\?.*)?$","",target)
                    with tempfile.TemporaryDirectory() as td:
                        arc=pathlib.Path(td)/f"{uf}-{mm}-{year}.7z";arc.write_bytes(get(target).content)
                        got+=ingest_sicro_7z(arc,target,entries,month_url)
                except Exception as e:
                    print("SICRO",uf,year,mm,e)
    return got

def discover_sinapi_files():
    # CAIXA currently exposes a central 'Relatórios mensais - a partir de 2025' listing.
    html,ls=links(SINAPI_HOME)
    queue=[u for t,u in ls if "relat" in norm(t+" "+u) or "consult" in norm(t+" "+u)]
    seen=set();files=[]
    for u in [SINAPI_HOME]+queue[:15]:
        if u in seen:continue
        seen.add(u)
        try:
            _,l2=links(u)
            for t,x in l2:
                if re.search(r"\.(zip|xlsx)(?:$|\?)",x,re.I) and "sinapi" in norm(t+" "+x):
                    files.append((t,x,u))
        except Exception:pass
    return files

def ingest_sinapi_xlsx(xlsx,source_url,entries):
    """Lê o 'SINAPI_Referência_AAAA_MM.xlsx' (layout oficial) e grava uma base por UF e regime."""
    ref,res=sinapi_reader.read_sinapi_reference(xlsx)
    if not re.fullmatch(r"20\d{2}-(0[1-9]|1[0-2])",ref or ""):
        raise ValueError(f"mês de referência não identificado em {xlsx.name}")
    year,mm=ref.split("-")
    ok=0
    for (uf,regime),rows in sorted(res.items()):
        sheets={r["sheet"] for r in rows}
        # Segurança: só publica se vierem insumos E composições e um volume mínimo de itens.
        if len(rows)<3000 or len(sheets)<2:
            print("SINAPI descartado (poucos itens)",uf,regime,len(rows),sorted(sheets));continue
        meta={"id":f"SINAPI-{uf}-{year}-{mm}-{norm(regime).replace(' ','-')}","source":"SINAPI","uf":uf,"year":int(year),"month":mm,"reference":ref,"regime":regime,"type":"mixed","officialUrl":SINAPI_HOME,"publishedAt":"","sourceFile":source_url}
        e=save_base(meta,rows)
        if e:entries.append(e);ok+=1
    print(f"SINAPI {ref}: {ok} base(s) gravada(s)")
    return ok

def ingest_sinapi_zip(zpath,source_url,entries):
    with tempfile.TemporaryDirectory() as td:
        with zipfile.ZipFile(zpath) as z:
            for n in z.namelist():
                if n.lower().endswith(".xlsx") and "refer" in norm(n):
                    z.extract(n,td)
        found=[p for p in pathlib.Path(td).rglob("*.xlsx") if "refer" in norm(p.name)]
        if not found:raise ValueError("ZIP sem a planilha SINAPI_Referência_*.xlsx")
        return ingest_sinapi_xlsx(found[0],source_url,entries)

def update_sinapi_local(entries):
    """Fonte manual e à prova de falhas: ZIPs do SINAPI colocados na pasta fontes/ do repositório."""
    folder=ROOT/"fontes"
    if not folder.exists():return 0
    n=0
    for z in sorted(folder.glob("SINAPI*.zip")):
        try:n+=ingest_sinapi_zip(z,f"fontes/{z.name}",entries)
        except Exception as e:print("SINAPI local",z.name,e)
    return n

def update_sinapi(entries):
    """Descoberta automática no portal da CAIXA (relatórios mensais a partir de 2025)."""
    try:files=discover_sinapi_files()
    except Exception as e:
        print("SINAPI: portal indisponível",e);return
    seen=set()
    for title,url,page in files:
        m=re.search(r"(20\d{2})\D?(0[1-9]|1[0-2])",title+" "+url)
        if not m or int(m.group(1))<2025 or "xlsx" not in norm(title+" "+url) or url in seen:continue
        seen.add(url)
        try:
            with tempfile.TemporaryDirectory() as td:
                f=pathlib.Path(td)/"sinapi.zip";f.write_bytes(get(url).content)
                if zipfile.is_zipfile(f):ingest_sinapi_zip(f,url,entries)
        except Exception as e:print("SINAPI",url,e)

def save_json_gz(name,obj,prefix):
    """Arquivo auxiliar (ex.: composições analíticas): devolve campos <prefix>File/Url/Sha256 para o catálogo."""
    raw=json.dumps(obj,ensure_ascii=False,separators=(",",":")).encode()
    gz=gzip.compress(raw,compresslevel=9,mtime=0)
    rel=f"bases/{re.sub(r'[^A-Za-z0-9_.-]+','-',name)}.json.gz"; (DOCS/rel).write_bytes(gz)
    return {f"{prefix}File":rel,f"{prefix}Url":f"https://raw.githubusercontent.com/Raydem1961/obratop-bases/main/docs/{rel}",f"{prefix}Sha256":hashlib.sha256(gz).hexdigest()}

def _sinapi_desc(uf,ref):
    """{'I':{código:(descrição,unidade)},'C':{...}} a partir da base SINAPI já publicada (se existir)."""
    p=DOCS/f"bases/SINAPI-{uf}-{ref}-nao-desonerado.json.gz"
    out={"I":{},"C":{}}
    if not p.exists():return out
    for r in json.loads(gzip.decompress(p.read_bytes()))["rows"]:
        out["C" if str(r.get("sheet","")).startswith("C") else "I"][str(r["code"])]=(r["description"],r["unit"])
    return out

def update_orse_local(entries):
    """Fonte manual: planilha exportada do programa ORSE colocada em fontes/ (ORSE*.xlsx)."""
    folder=ROOT/"fontes"
    if not folder.exists():return 0
    n=0
    for x in sorted(folder.glob("ORSE*.xlsx")):
        try:
            ref,rows=orse_reader.read_orse_xlsx(x)
            if len(rows)<3000:raise ValueError(f"poucos itens com preço ({len(rows)})")
            year,mm=ref.split("-")
            meta={"id":f"ORSE-SE-{year}-{mm}","source":"ORSE-SE","uf":"SE","year":int(year),"month":mm,"reference":ref,"regime":"","type":"mixed","officialUrl":ORSE_HOME,"publishedAt":"","sourceFile":f"fontes/{x.name}"}
            e=save_base(meta,rows)
            if e:
                try:
                    an=orse_reader.read_orse_analitico(x,sinapi_desc=_sinapi_desc("SE",ref),priced_codes={r["code"] for r in rows if r["sheet"]=="Composições"})
                    e.update(save_json_gz(f"ORSE-SE-{year}-{mm}.analitico",an,"analitico"));e["analiticoCount"]=len(an)
                except Exception as ex:print("ORSE analítico",x.name,ex)
                entries.append(e);n+=1;print(f"ORSE {ref}: {e['count']} itens; {e.get('analiticoCount',0)} composições analíticas")
        except Exception as ex:print("ORSE local",x.name,ex)
    return n

def update_orse(entries):
    # The updater discovers ORSE publications but does not publish prices unless the downloaded file is safely parseable.
    # This prevents invented/corrupted values from proprietary .ORSE formats.
    try: html,ls=links(ORSE_HOME)
    except Exception:return
    for title,url in ls:
        m=re.search(r"(20\d{2})(0[1-9]|1[0-2]).*\.ORSE",title+" "+url,re.I)
        if not m:continue
        year,mm=m.group(1),m.group(2)
        # Metadata-only status. Not shown as importable until an adapter yields validated positive prices.
        entries.append({"id":f"ORSE-SE-{year}-{mm}","source":"ORSE-SE","uf":"SE","year":int(year),"month":mm,"reference":f"{year}-{mm}","regime":"","type":"mixed","officialUrl":ORSE_HOME,"publishedAt":"","sourceFile":url,"status":"detected-unparsed","count":0,"generatedAt":NOW})

def dedupe(entries):
    d={}
    for x in entries:
        old=d.get(x["id"])
        # a entrada mais nova (gerada nesta execução) substitui a preservada; 'ready' nunca é trocada por não-pronta
        if not old or x.get("status")=="ready" or old.get("status")!="ready":d[x["id"]]=x
    return sorted(d.values(),key=lambda x:(x.get("source",""),x.get("uf",""),x.get("reference","")),reverse=True)

def prune(entries,keep=6):
    """Mantém só as 'keep' competências mais recentes de cada fonte (evita o repositório crescer sem limite)."""
    refs={}
    for x in entries:
        if x.get("status")=="ready":refs.setdefault(x["source"],set()).add(x["reference"])
    drop={src:set(sorted(r,reverse=True)[keep:]) for src,r in refs.items()}
    out=[]
    for x in entries:
        if x.get("status")=="ready" and x["reference"] in drop.get(x["source"],set()):
            try:(DOCS/x["file"]).unlink()
            except Exception:pass
            continue
        out.append(x)
    return out

def main():
    old=[]
    if CATALOG.exists():
        try:old=json.loads(CATALOG.read_text(encoding="utf-8")).get("bases",[])
        except:pass
    entries=[]
    # Preserve previously validated ready bases even if an official site is temporarily unavailable today.
    for x in old:
        if x.get("status")=="ready" and x.get("file") and (DOCS/x["file"]).exists():entries.append(x)
    update_sinapi_local(entries)
    update_sinapi(entries)
    update_sicro_local(entries)
    update_sicro(entries)
    update_orse_local(entries)
    update_orse(entries)
    entries=dedupe(entries)
    entries=prune(entries)
    out={"schema":1,"generatedAt":NOW,"policy":"Only validated positive-price bases are marked ready. Last valid base is preserved on source outages.","bases":entries}
    CATALOG.write_text(json.dumps(out,ensure_ascii=False,indent=2),encoding="utf-8")
    print("Catalog entries:",len(entries),"ready:",sum(x.get("status")=="ready" for x in entries))
if __name__=="__main__":main()
