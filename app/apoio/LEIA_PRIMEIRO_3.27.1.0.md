# ObraTop 3.27.1.0 — assistente de nova obra, edição em lote, logo e PDF padronizado

Hosting no plano gratuito. **Não exige mudança nas regras do Firestore** (o gestor criar obras e o Diário de Obra continuam dependendo das regras novas, como na 3.26).

## Assistente de nova obra (Obras → "✨ Assistente de nova obra")
Quatro passos: **Dados** (nome, cliente, endereço, início e término) → **Modelo e porte** → **Escopo** → **Revisão**.
- **Modelos:** Edificação (61 atividades), Pavimentação e drenagem (30), Rede de esgoto/água (17), Contenção de encostas (17) e **Em branco** (só o cadastro da obra).
- **Porte, BDI e fator de custo:** o porte (m² ou m de rede) dimensiona quantidades e custos; o fator de custo ajusta todos os valores (1,00 = referência).
- **Escopo:** desmarque fases ou atividades que não existem na obra; o cronograma é refeito para o prazo informado.
- **O que é criado:** a obra (situação Planejamento), um item de orçamento e uma atividade para cada serviço, **já ligados entre si** (o avanço passa a ser ponderado pelo custo), EAP com predecessoras, datas em dias úteis dentro do prazo e, se marcado, a **linha de base R1**.
- **Valores ilustrativos:** os custos do modelo são ordens de grandeza para planejar. **Revise cada item em Orçamentos antes de usar**; não substituem SINAPI, ORSE nem composição própria.
- Se a gravação falhar no meio, o app avisa a etapa e que a obra já foi criada.
- Quem usa: administrador (e gestor, depois das regras novas).

## Edição em lote
Nas telas de Medições, Orçamentos, Fornecedores, Estoque, Financeiro, Contratos, Qualidade, Segurança, Pessoal, Equipamentos, Documentos, Diário de Obra e Obras: marque as linhas (ou "selecionar todos") e use a barra que aparece:
- **Alterar:** qualquer campo de lista (ex.: status) ou de data, para todos os selecionados de uma vez. Datas que deixariam o início depois do término são recusadas sem gravar nada.
- **Mover para a lixeira:** só o administrador, reversível pela Lixeira (não existe para Obras).
- Cada ação em lote grava **uma entrada de auditoria** com o campo, o valor e a quantidade.
- Cada usuário só altera o que já podia alterar; o perfil Consulta não vê as caixas.
- **Fora do lote:** Cronograma (tem tela própria) e Compras (tabela própria).

## Logo da empresa e PDF padronizado
Configurações → **Logo da empresa** (PNG ou JPG): aparece no cabeçalho de todas as telas, na tela de entrada, na impressão, nos PDFs e no Word. Todo PDF exportado tem cabeçalho, tabela proporcional e rodapé "Página x de y". Detalhes no guia da 3.27.0.0 (`apoio/`).

## Como publicar (somente Hosting)
```
unzip -o ObraTop_V3_27_1_0_Assistente_Lote_Logo.zip
cd ObraTop_V3.27.1.0
grep -n "const RELEASE" public/app.js
curl -fL -o public/vendor/xlsx.full.min.js https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js
firebase deploy --only hosting --project obratop-v3-teste
```
Depois confira `https://obratop-v3-teste.web.app/RELEASE.txt` e limpe o service worker (F12 → Application → Unregister; Storage → Clear site data).

## Testes
`npm test`: 36 testes automáticos (cálculos, modelos de obra, logo/PDF, backup). Simulador de navegador (`tests/simulador`): `t_assistente_lote.py` (39 verificações), `t_logo.py` (25) e os das versões anteriores, todos passando. **Nada foi testado no Firebase real nem em emulador de regras.**

## Reversão
Republique o pacote 3.26.0.0. Obras, orçamentos e atividades criados pelo assistente continuam no banco e funcionam normalmente.
