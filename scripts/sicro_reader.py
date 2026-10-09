"""Leitor do pacote mensal do SICRO (DNIT): 'UF MM-AAAA Relatório Sintético de ....xlsx'.
Gera linhas {code,description,unit,price,sheet,group} por regime.
 - Composições de Custos: publicadas só no regime "Não desonerado" (conferido: custo da mão de obra = relatório sem desoneração).
 - Materiais: preço único (vale para os dois regimes).
 - Mão de obra e Equipamentos: um relatório sem e outro com desoneração.
Preço vazio nunca vira zero (a linha é ignorada)."""
from __future__ import annotations
import re, unicodedata, pathlib
import openpyxl

ND, DS = "Não desonerado", "Desonerado"

def _n(s):
    s = unicodedata.normalize("NFD", str(s or ""))
    return re.sub(r"[^a-z0-9]+", " ", "".join(c for c in s if unicodedata.category(c) != "Mn").lower()).strip()

def _rows(path):
    wb = openpyxl.load_workbook(path, read_only=True, data_only=True)
    try:
        return list(wb.worksheets[0].iter_rows(values_only=True))
    finally:
        wb.close()

def _num(v):
    if isinstance(v, bool) or v is None: return None
    if isinstance(v, (int, float)): return float(v)
    s = str(v).strip().replace("R$", "").replace(" ", "")
    if not s: return None
    if "," in s: s = s.replace(".", "").replace(",", ".")
    try: return float(s)
    except ValueError: return None

def _table(path, price_col, unit_col, group, sheet, fixed_unit=None):
    out = []
    for r in _rows(path)[1:]:
        if not r or r[0] is None: continue
        code = str(r[0]).strip()
        if not code or not re.match(r"^[A-Za-z]?\d", code): continue
        desc = str(r[1] or "").strip()
        price = _num(r[price_col]) if len(r) > price_col else None
        unit = fixed_unit or (str(r[unit_col]).strip() if unit_col is not None and len(r) > unit_col and r[unit_col] is not None else "")
        if not desc or not unit or price is None or not (0 < price < 1e10): continue
        out.append({"code": code, "description": desc, "unit": unit, "price": round(price, 4), "sheet": sheet, "group": group})
    return out

def _find_header(path_rows, label="custo produtivo"):
    for r in path_rows[:3]:
        for i, c in enumerate(r or ()):
            if label in _n(c): return i
    return None

def read_sicro_folder(folder):
    """-> (uf, 'AAAA-MM', {regime: rows})"""
    folder = pathlib.Path(folder)
    uf = ref = None
    res = {ND: [], DS: []}
    seen = set()
    for f in sorted(folder.rglob("*.xlsx")):
        m = re.match(r"^([A-Z]{2})\s+(\d{2})-(\d{4})\s+(.*)\.xlsx$", f.name)
        if not m: continue
        u, mm, yy, title = m.group(1), m.group(2), m.group(3), _n(m.group(4))
        uf = uf or u; ref = ref or f"{yy}-{mm}"
        if "sintetico" not in title: continue
        des = "com desoneracao" in title
        if "composicoes de custos" in title:
            res[ND] += _table(f, 3, 2, "Composição", "Composições de Custos"); seen.add("comp")
        elif "materiais" in title:
            rows = _table(f, 3, 2, "Material", "Materiais"); res[ND] += rows; res[DS] += rows; seen.add("mat")
        elif "mao de obra" in title:
            rows = _table(f, 3, 2, "Mão de obra", "Mão de Obra"); res[DS if des else ND] += rows; seen.add("mo")
        elif "equipamentos" in title:
            hdr = _find_header(_rows(f)[:2]) or 9
            rows = _table(f, hdr, None, "Equipamento", "Equipamentos", fixed_unit="h"); res[DS if des else ND] += rows; seen.add("eq")
    if not uf or not ref: raise ValueError("pacote SICRO não reconhecido (nomes de arquivo fora do padrão 'UF MM-AAAA ...')")
    return uf, ref, res, seen
