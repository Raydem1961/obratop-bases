"""Leitor da base ORSE (CEHOP/SE) a partir da planilha exportada do programa ORSE.
Abas usadas: Leia-me (período), Composições (preço unitário) e Insumos (preço adotado)."""
from __future__ import annotations
import re, pathlib
import openpyxl

def _num(v):
    if isinstance(v,(int,float)): return round(float(v),4)
    return None

def read_orse_xlsx(path):
    """Retorna (referencia 'AAAA-MM', linhas). Cada linha: code, description, unit, price, sheet, group."""
    wb=openpyxl.load_workbook(path,read_only=True,data_only=True)
    names=set(wb.sheetnames)
    for need in ("Composições","Insumos"):
        if need not in names: raise ValueError(f"planilha ORSE sem a aba '{need}'")
    ref=None
    if "Leia-me" in names:
        for r in wb["Leia-me"].iter_rows(values_only=True):
            if r and r[0] and "per" in str(r[0]).lower() and r[1]:
                m=re.search(r"(\d{1,2})\s*/\s*(20\d{2})",str(r[1]))
                if m: ref=f"{m.group(2)}-{int(m.group(1)):02d}"
    if not ref:
        m=re.search(r"(20\d{2})[-_]?(0[1-9]|1[0-2])",pathlib.Path(path).name)
        if m: ref=f"{m.group(1)}-{m.group(2)}"
    if not ref: raise ValueError("não foi possível identificar o período da planilha ORSE")
    rows=[]
    def scan(sheet,pcol,label):
        it=wb[sheet].iter_rows(values_only=True); hdr=next(it)
        if str(hdr[1]).strip()!="Código" or "Descri" not in str(hdr[2]): raise ValueError(f"cabeçalho inesperado em {sheet}")
        for r in it:
            if not r or r[1] in (None,""): continue
            price=_num(r[pcol]); desc=str(r[2] or "").strip(); unit=str(r[3] or "").strip()
            if not price or price<=0 or not desc or not unit: continue
            code=r[1]; code=str(int(code)) if isinstance(code,(int,float)) else str(code).strip()
            rows.append({"code":code,"description":desc,"unit":unit,"price":price,"sheet":label,"group":str(r[4] or "").strip()})
    scan("Composições",6,"Composições"); scan("Insumos",7,"Insumos")
    return ref,rows


CAT={"Mão de obra":"MO","Material":"MAT","Equipamento":"EQ","Serviço de terceiros":"OUT"}

def read_orse_analitico(path, sinapi_desc=None, priced_codes=None):
    """Composição analítica do ORSE: {código_da_composição: [[tipo,código,coef,cat,preço_efetivo(,desc,un)], ...]}.
    tipo 0 = insumo, 1 = composição auxiliar.  coef = quantidade / produção da equipe (quando houver);
    preço_efetivo = custo total c/ encargos / quantidade, de modo que coef × preço = custo da linha por unidade
    da composição (a soma reproduz o preço da composição, ±2%).
    Itens de origem SINAPI recebem o código 'SINAPI-<n>' e, se conhecida, descrição e unidade
    (sinapi_desc: {'I'|'C': {código: (descrição, unidade)}})."""
    wb=openpyxl.load_workbook(path,read_only=True,data_only=True)
    prod={}
    it=wb["Composições"].iter_rows(values_only=True); next(it)
    for r in it:
        if r and r[1] not in (None,""):
            prod[str(int(r[1])) if isinstance(r[1],(int,float)) else str(r[1])]=float(r[12] or 0)
    out={}
    it=wb["Composição analítica"].iter_rows(values_only=True); h=next(it)
    if "Cód. composição" not in str(h[0]) or "Quantidade" not in str(h[9]): raise ValueError("cabeçalho inesperado na aba analítica")
    for r in it:
        if not r or r[0] in (None,""): continue
        cc=str(int(r[0])) if isinstance(r[0],(int,float)) else str(r[0])
        if priced_codes is not None and cc not in priced_codes: continue
        q=r[9]; tot=r[17]
        if not isinstance(q,(int,float)) or q<=0 or not isinstance(tot,(int,float)) or tot<=0: continue
        p=prod.get(cc,0.0); coef=q/p if p>0 else q
        price=round(tot/q,4)
        aux=(r[3]=="Serviço auxiliar") or r[4]=="Composição auxiliar"
        t=1 if aux else 0
        cat="COMP" if aux else CAT.get(r[4],"MAT")
        code=str(int(r[6])) if isinstance(r[6],(int,float)) else str(r[6])
        line=[t,code,round(coef,6),cat,price]
        if r[5]!="ORSE":
            line[1]="SINAPI-"+code
            d=(sinapi_desc or {}).get("C" if aux else "I",{}).get(code)
            line+= [d[0],d[1]] if d else [f"SINAPI {code}",""]
        out.setdefault(cc,[]).append(line)
    return out
