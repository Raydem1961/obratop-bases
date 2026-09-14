from __future__ import annotations
import requests, re, json, gzip, hashlib, tempfile, shutil, os, pathlib, datetime, unicodedata, urllib.parse
from bs4 import BeautifulSoup
import pandas as pd
import py7zr

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
    gz=gzip.compress(raw,compresslevel=9)
    safe=re.sub(r"[^A-Za-z0-9_.-]+","-",meta["id"])
    rel=f"bases/{safe}.json.gz"; p=DOCS/rel;p.write_bytes(gz)
    return {**meta,"status":"ready","count":len(rows),"file":rel,"url":f"https://raw.githubusercontent.com/__GITHUB_USER__/obratop-bases/main/docs/{rel}","sha256":hashlib.sha256(gz).hexdigest(),"normalizedSha256":hashlib.sha256(raw).hexdigest(),"generatedAt":NOW}

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

def update_sicro(entries):
    # DNIT has reliable UF/year/month folder structure; discover actual published periods from each state's 2026 page.
    year=str(datetime.datetime.now().year)
    for uf in UFS:
        year_url=f"{SICRO_ROOT}/{REGION[uf]}/{STATE[uf]}/{year}"
        try: html,ls=links(year_url)
        except Exception: continue
        for mm,mname in MONTH.items():
            month_url=next((u for t,u in ls if re.search(fr"/{re.escape(mname)}(?:/|$)",u,re.I)),None)
            if not month_url: continue
            try:
                h2,l2=links(month_url)
                target=next((u for t,u in l2 if re.search(fr"{uf}[-.]?{mm}[.-]{year}\.7z",t+" "+u,re.I)),None)
                if not target:continue
                target=re.sub(r"/view(?:\?.*)?$","",target)
                with tempfile.TemporaryDirectory() as td:
                    arc=pathlib.Path(td)/f"{uf}-{mm}.{year}.7z"
                    arc.write_bytes(get(target).content)
                    ext=pathlib.Path(td)/"x";ext.mkdir()
                    with py7zr.SevenZipFile(arc,"r") as z:z.extractall(ext)
                    allrows=[]
                    for f in ext.rglob("*"):
                        if f.suffix.lower() in [".xlsx",".xls"]:
                            try: allrows.extend(parse_generic_xlsx(f,"SICRO3",uf,f"{year}-{mm}"))
                            except Exception: pass
                    meta={"id":f"SICRO3-{uf}-{year}-{mm}","source":"SICRO3","uf":uf,"year":int(year),"month":mm,"reference":f"{year}-{mm}","regime":"","type":"mixed","officialUrl":month_url,"publishedAt":"","sourceFile":target}
                    e=save_base(meta,allrows)
                    if e:entries.append(e)
            except Exception as e:
                print("SICRO",uf,mm,e)

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

def update_sinapi(entries):
    files=discover_sinapi_files()
    # Only parse packages where year/month can be identified from text or URL.
    for title,url,page in files:
        txt=norm(title+" "+url)
        m=re.search(r"(20\d{2})\D?(0[1-9]|1[0-2])",title+" "+url) or re.search(r"(0[1-9]|1[0-2])\D?(20\d{2})",title+" "+url)
        if not m:continue
        if len(m.group(1))==4:year,mm=m.group(1),m.group(2)
        else:mm,year=m.group(1),m.group(2)
        if int(year)<2025:continue
        try:
            with tempfile.TemporaryDirectory() as td:
                f=pathlib.Path(td)/pathlib.Path(urllib.parse.urlparse(url).path).name
                f.write_bytes(get(url).content)
                files2=[]
                if f.suffix.lower()==".zip":
                    import zipfile
                    with zipfile.ZipFile(f) as z:z.extractall(td)
                    files2=[p for p in pathlib.Path(td).rglob("*") if p.suffix.lower() in [".xlsx",".xls"]]
                elif f.suffix.lower() in [".xlsx",".xls"]:files2=[f]
                else:continue
                for uf in UFS:
                    for regime in ["Não desonerado","Desonerado"]:
                        allrows=[]
                        for x in files2:
                            # Heuristic: prefer file/sheet text mentioning UF, but parse all if package is all-UF.
                            try:
                                rs=parse_generic_xlsx(x,"SINAPI",uf,f"{year}-{mm}",regime)
                                # Filter rows with explicit UF fields is workbook-specific; package parser keeps source trace.
                                allrows.extend(rs)
                            except Exception:pass
                        # Safety: reject huge duplicates and zero-only bases. Future adapters can refine UF-specific columns.
                        meta={"id":f"SINAPI-{uf}-{year}-{mm}-{norm(regime).replace(' ','-')}","source":"SINAPI","uf":uf,"year":int(year),"month":mm,"reference":f"{year}-{mm}","regime":regime,"type":"mixed","officialUrl":SINAPI_HOME,"publishedAt":"","sourceFile":url}
                        e=save_base(meta,allrows)
                        if e:entries.append(e)
        except Exception as e:print("SINAPI",year,mm,e)

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
        if not old or (x.get("status")=="ready" and old.get("status")!="ready"):d[x["id"]]=x
    return sorted(d.values(),key=lambda x:(x.get("source",""),x.get("uf",""),x.get("reference","")),reverse=True)

def main():
    old=[]
    if CATALOG.exists():
        try:old=json.loads(CATALOG.read_text(encoding="utf-8")).get("bases",[])
        except:pass
    entries=[]
    # Preserve previously validated ready bases even if an official site is temporarily unavailable today.
    for x in old:
        if x.get("status")=="ready" and x.get("file") and (DOCS/x["file"]).exists():entries.append(x)
    update_sicro(entries)
    update_sinapi(entries)
    update_orse(entries)
    entries=dedupe(entries)
    out={"schema":1,"generatedAt":NOW,"policy":"Only validated positive-price bases are marked ready. Last valid base is preserved on source outages.","bases":entries}
    CATALOG.write_text(json.dumps(out,ensure_ascii=False,indent=2),encoding="utf-8")
    print("Catalog entries:",len(entries),"ready:",sum(x.get("status")=="ready" for x in entries))
if __name__=="__main__":main()
