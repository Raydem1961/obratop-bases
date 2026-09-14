# ObraTop Bases — automação gratuita

Repositório público contendo somente referências oficiais públicas de custos tratadas para o ObraTop.
Não contém obras, usuários, orçamentos ou qualquer dado privado.

## Automação
O GitHub Actions executa diariamente e também pode ser executado manualmente.
Ele tenta localizar publicações oficiais, baixa os pacotes, extrai ZIP/7z, valida preços positivos,
normaliza registros e publica apenas bases consideradas seguras.

Fontes:
- SINAPI / CAIXA
- SICRO 3 / DNIT
- ORSE / CEHOP-SE

### Política de segurança
Se um portal mudar, um arquivo estiver zerado ou um formato não puder ser convertido com segurança,
nenhum preço novo é publicado. A última base válida continua disponível.

O formato proprietário ORSE é detectado, mas não é marcado `ready` até que um adaptador possa validá-lo.
