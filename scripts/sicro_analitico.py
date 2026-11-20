"""Relatório Analítico de Composições de Custos do SICRO (DNIT).

O DNIT publica o custo das composições já calculado só no regime "Não desonerado". O relatório
analítico traz a estrutura de cada composição (equipamentos com utilização operativa/improdutiva,
mão de obra, materiais, atividades auxiliares, tempo fixo, FIC e produção da equipe); com ela e os
relatórios de mão de obra e equipamentos "com desoneração" o custo desonerado é recalculado.

Conferência: o mesmo cálculo com os preços sem desoneração precisa reproduzir o custo oficial
publicado; `conferir()` devolve quantas composições batem ao centavo.

Fórmula (Manual de Custos de Infraestrutura de Transportes, DNIT):
  execução/h = Σ qtd·(oper·CP + improd·CI) + Σ qtd·salário-hora
  execução   = execução/h ÷ produção da equipe
  FIC        = taxa FIC × (Σ qtd·CI dos equipamentos + Σ mão de obra) ÷ produção
               (a chuva para a equipe: equipamentos parados ao custo improdutivo)
  subtotal   = execução + FIC + Σ materiais + Σ auxiliares
  total      = subtotal + Σ tempo fixo   (momento de transporte depende da DMT da obra: zero aqui)
Cada composição é arredondada ao centavo antes de entrar em outra, como no relatório.
"""
from __future__ import annotations
import pathlib
import openpyxl

SECOES = {"A": "eq", "B": "mo", "C": "mat", "D": "aux", "E": "tf", "F": "tr"}


def _f(v):
    if v is None or v == "": return None
    if isinstance(v, (int, float)): return float(v)
    try: return float(str(v).replace(".", "").replace(",", ".")) if "," in str(v) else float(v)
    except ValueError: return None


def _s(v):
    return "" if v is None else str(v).strip()


def ler_analitico(path) -> dict:
    """-> {codigo: {d, u, fic, prod, of, eq:[[cod,qtd,op,imp]], mo:[[cod,qtd]], mat:[[cod,qtd]],
    aux:[[cod,qtd]], tf:[[cod_comp,qtd,cod_mat]], obs}} e o dicionário de insumos {cod: [desc, un]}."""
    wb = openpyxl.load_workbook(path, read_only=True)
    ws = wb.worksheets[0]
    comps, insumos = {}, {}
    atual = None; secao = None; pend = {}
    for r in ws.iter_rows(values_only=True):
        r = list(r) + [None] * (10 - len(r))
        c0 = _s(r[0])
        if c0.startswith("SISTEMA DE CUSTOS REFERENCIAIS"):
            pend = {"fic": _f(r[7]) or 0.0}; atual = None; secao = None; continue
        if c0 == "Custo Unitário de Referência":
            pend["prod"] = _f(r[7]); pend["u"] = _s(r[8]); continue
        if "fic" in pend and "prod" in pend and atual is None and c0 and _s(r[7]).startswith("Valores em reais"):
            atual = {"d": _s(r[1]), "u": pend["u"], "fic": pend["fic"], "prod": pend["prod"], "of": None,
                     "eq": [], "mo": [], "mat": [], "aux": [], "tf": [], "tr": []}
            comps[c0] = atual; pend = {}; continue
        if atual is None: continue
        if len(c0) > 3 and c0[1:4] == " - " and c0[0] in SECOES:
            secao = SECOES[c0[0]]; continue
        if _s(r[4]) == "Custo unitário direto total":
            atual["of"] = _f(r[8]); secao = None; continue
        if c0 == "Obs.":
            if _s(r[1]): atual["obs"] = _s(r[1])
            continue
        if not c0 or c0.startswith("Custo ") or c0 in ("Subtotal", "Operativa", "LN"): continue
        if secao == "eq":
            q = _f(r[2])
            if q is None: continue
            atual["eq"].append([c0, q, _f(r[3]) or 0.0, _f(r[4]) or 0.0])
            insumos.setdefault(c0, [_s(r[1]), "h"])
        elif secao in ("mo", "mat", "aux"):
            q = _f(r[2])
            if q is None: continue
            atual[secao].append([c0, q])
            if secao != "aux": insumos.setdefault(c0, [_s(r[1]), _s(r[3])])
        elif secao == "tf":
            q = _f(r[3])
            if q is None or not _s(r[2]): continue
            atual["tf"].append([_s(r[2]), q, c0])
        elif secao == "tr":
            q = _f(r[2])
            if q is None: continue
            atual["tr"].append([c0, q, _s(r[4]), _s(r[5]), _s(r[6])])
    return comps, insumos


def calcular(comps: dict, mo: dict, mat: dict, eq: dict) -> dict:
    """Custo unitário de cada composição com os preços dados.
    mo/mat: {cod: preço}; eq: {cod: (produtivo, improdutivo)}. -> {cod: custo | None (falta preço)}."""
    memo: dict = {}

    def custo(cod, pilha=()):
        if cod in memo: return memo[cod]
        c = comps.get(cod)
        if c is None or cod in pilha or not c["prod"]: memo[cod] = None; return None
        pilha = pilha + (cod,)
        h = hi = 0.0
        for k, q, op, imp in c["eq"]:
            p = eq.get(k)
            if p is None: memo[cod] = None; return None
            h += q * (op * p[0] + imp * p[1]); hi += q * p[1]
        for k, q in c["mo"]:
            p = mo.get(k)
            if p is None: memo[cod] = None; return None
            h += q * p; hi += q * p
        sub = (h + hi * c["fic"]) / c["prod"]
        for k, q in c["mat"]:
            p = mat.get(k)
            if p is None: memo[cod] = None; return None
            sub += q * p
        for k, q in c["aux"]:
            p = custo(k, pilha)
            if p is None: memo[cod] = None; return None
            sub += q * p
        for k, q, _m in c["tf"]:
            p = custo(k, pilha)
            if p is None: memo[cod] = None; return None
            sub += q * p
        memo[cod] = round(sub + 1e-9, 2)
        return memo[cod]

    return {k: custo(k) for k in comps}


def conferir(comps: dict, calculado: dict, tolerancia=0.011):
    """-> (batem, total com valor oficial, [códigos que divergem])."""
    ok, n, dif = 0, 0, []
    for k, c in comps.items():
        if c.get("of") is None: continue
        n += 1
        v = calculado.get(k)
        if v is not None and abs(v - c["of"]) <= max(tolerancia, abs(c["of"]) * 1e-4): ok += 1
        else: dif.append(k)
    return ok, n, dif


def compactar(comps: dict, insumos: dict, precos: dict | None = None, custos: dict | None = None) -> dict:
    """Formato gravado em <base>.analitico.json.gz (lido pelo ObraTop 4): estrutura das composições,
    insumos {cod: [descrição, unidade]}, preços por regime ("nd"/"ds": mão de obra e materiais
    {cod: preço}; equipamentos {cod: [produtivo, improdutivo]}) e custo de cada composição
    {cod: [sem desoneração (oficial), com desoneração (recalculado)]}."""
    return {
        "schema": 1,
        "insumos": insumos,
        "precos": precos or {},
        "custos": custos or {},
        "comps": {k: [c["d"], c["u"], c["fic"], c["prod"], c["eq"], c["mo"], c["mat"], c["aux"], c["tf"], c.get("obs", "")]
                  for k, c in comps.items() if c["prod"]},
    }


def achar(folder, trecho):
    for f in sorted(pathlib.Path(folder).rglob("*.xlsx")):
        if trecho in f.name.lower(): return f
    return None


def _tabela(path, cols, traco_zero=False):
    out = {}
    if path is None: return out
    for r in openpyxl.load_workbook(path, read_only=True).worksheets[0].iter_rows(min_row=2, values_only=True):
        if not r or not r[0]: continue
        v = []
        for c in cols:
            x = r[c] if len(r) > c else None
            # Materiais betuminosos aparecem com "-": o DNIT não os precifica (custo zero na composição).
            v.append(0.0 if traco_zero and _s(x) == "-" else _f(x))
        if None in v: continue
        out[_s(r[0])] = tuple(v) if len(cols) > 1 else v[0]
    return out


def _coluna(path, rotulo):
    for r in openpyxl.load_workbook(path, read_only=True).worksheets[0].iter_rows(max_row=3, values_only=True):
        for i, c in enumerate(r or ()):
            if rotulo in _s(c).lower(): return i
    return None


def precos_do_pacote(folder):
    """Preços dos relatórios sintéticos: materiais (únicos) e, por regime, mão de obra e equipamentos."""
    mat = _tabela(achar(folder, "sintético de materiais"), [3], traco_zero=True)
    out = {}
    for regime, desonerado in (("nd", False), ("ds", True)):
        fmo = [f for f in pathlib.Path(folder).rglob("*.xlsx") if "sintético de mão de obra" in f.name.lower() and (("com desoneração" in f.name.lower()) == desonerado)]
        feq = [f for f in pathlib.Path(folder).rglob("*.xlsx") if "sintético de equipamentos" in f.name.lower() and (("com desoneração" in f.name.lower()) == desonerado)]
        eq = {}
        if feq:
            cp = _coluna(feq[0], "custo produtivo"); ci = _coluna(feq[0], "custo improdutivo")
            if cp is not None and ci is not None: eq = _tabela(feq[0], [cp, ci])
        out[regime] = {"mo": _tabela(fmo[0] if fmo else None, [3]), "eq": eq}
    return mat, out


def composicoes_por_regime(folder):
    """-> (estrutura compactada, {cod: custo desonerado}, (batem, total)) ou None sem relatório analítico.
    No regime desonerado: recálculo direto quando o não desonerado bate com o oficial; senão o oficial
    é corrigido pela razão desonerado/não desonerado do recálculo (diferenças de arredondamento ou
    estrutura que o relatório não detalha)."""
    f = achar(folder, "analítico de composições de custos")
    if f is None: return None
    comps, insumos = ler_analitico(f)
    mat, reg = precos_do_pacote(folder)
    nd = calcular(comps, reg["nd"]["mo"], mat, reg["nd"]["eq"])
    ds = calcular(comps, reg["ds"]["mo"], mat, reg["ds"]["eq"])
    ok, n, _ = conferir(comps, nd)
    des = {}
    for k, c in comps.items():
        of, a, b = c.get("of"), nd.get(k), ds.get(k)
        if of is None or of <= 0 or b is None: continue
        des[k] = b if a is not None and abs(a - of) <= max(0.011, of * 1e-4) else (round(of * b / a, 2) if a else None)
    des = {k: v for k, v in des.items() if v}
    precos = {r: {"pu": {**mat, **reg[r]["mo"]}, "eq": {k: list(v) for k, v in reg[r]["eq"].items()}} for r in ("nd", "ds")}
    custos = {k: [c["of"], des.get(k, 0)] for k, c in comps.items() if c.get("of")}
    return compactar(comps, insumos, precos, custos), des, (ok, n)
