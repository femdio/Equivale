# Equivale v0.4 - protótipo de testes

Inicie com Node 20+: `npm test` e `npm start`. Acesse `http://localhost:3000`.

## Entregue neste pacote
- Landing, tela de cadastro demonstrativa e login não funcional.
- Conversa CLT com valores zerados, dependentes inteiros e profissões pesquisáveis (catálogo CURADO de 17 exemplos).
- Enquadramento preliminar pela ocupação, com triagem MEI pelo valor PJ necessário (não pelo pacote CLT bruto).
- Campo de DAS para MEI (0 significa taxa ilustrativa interna), campos PJ para cenário fora do MEI.
- Página de regimes/anexos e minuta editável com tabela derivada de cálculo atualizado ao abrir.

## Limites importantes
Esta não é a versão homologada para comercialização. O catálogo é parcial e não equivale à base CBO do portal Salario.com.br ou à totalidade do Anexo XI. Não foi feita importação/scraping dessa lista externa. Os anexos I, II e IV NÃO foram implementados no motor, nem todos os tratamentos fiscais (especialmente fator R, cálculo preciso de férias, IRPF MEI, encargos sobre serviços Anexo IV e classificação CNAE). Para esses casos, a interface fornece alertas/estimativas condicionais e NÃO um enquadramento definitivo. A taxa de MEI de referência é demonstrativa e precisa ser atualizada conforme o ano e tipo de atividade. Não existe checkout, login real, e-mail ou banco de dados. Nenhum dado é persistido no servidor.

Regra oficial MEI: https://www8.receita.fazenda.gov.br/SimplesNacional/Arquivos/manual/Anexo_XI.pdf
Resolução 140: https://normas.receita.fazenda.gov.br/sijut2consulta/normas.receisulta/link.action?idAto=92278&visao=compilado

Revisão contábil e jurídica antes de receber pagamentos reais é indispensável.


## Alterações v0.5
- Guia **Comece aqui**; bônus e pagamentos por fora após plano de saúde, antes de outros benefícios.
- Gastos burocráticos pré-preenchidos R$ 452/mês (estimativa de serviços contábeis e certificado digital; editável).
- Pró-labore automático como 28% do faturamento simulado e INSS de 11% sobre pró-labore com teto. O faturamento mínimo é encontrado por busca binária, comparando saldo projetado com equivalência econômica CLT. Os 28% são uma premissa de cenário, NÃO obrigatoriedade legal geral nem garantia do fator R real.
- Ocupações pesquisáveis ampliadas (inclui Técnico de Informática), porém catálogo ainda não exaustivo nem classificação contábil concluída. Profissões adicionadas sem validação são sinalizadas como pendentes.
- A Resolução CGSN 140 regulamenta o Simples e seu Anexo XI lista ocupações MEI; a CBO não define automaticamente CNAE.

**Atenção:** Anexos I, II e IV, histórico do fator R, tributação real de MEI, incidências de IR, dependentes, pagamentos irregulares, férias e a equivalência econômica ainda exigem homologação contábil. Não usar esta versão para vender relatórios ou formalizar contratos.

## v0.6: base COMPLETA de ocupações
O pacote inclui uma lista pequena de demonstração, NÃO todas as ocupações. Para ativar o catálogo oficial:
1. Acesse https://www.gov.br/trabalho-e-emprego/pt-br/assuntos/cbo/servicos/downloads/downloads
2. Baixe **CBO2002 - Ocupação**, CSV, e salve como `public/cbo2002-ocupacao.csv` (sem mudar conteúdo).
3. Reinicie o servidor. A busca passa a ler o catálogo oficial pelo endpoint `/api/occupations`.
4. Ocupações da CBO são diferentes de CNAEs/ocupações MEI. A lista completa será pesquisável, mas o motor NÃO declara MEI ou anexo com base em coincidência de nome. Para produção precisa de mapeamento auditado pela contadora.

O relatório da proposta exibe uma tabela desdobrada em mensal/anual seguindo o layout de referência. O valor líquido CLT e seu 13º ainda são estimados; a tabela não está homologada para comercialização. O link da norma CGSN 140 foi removido da interface. O botão ? abre explicação sem navegar.

## v0.7 — Busca completa CBO
Incluídas 2694 ocupações oficiais e 7778 registros de sinônimos fornecidos pela usuária, convertidos de CSV Windows-1252 em `public/cbo-index.json`. Busca por nome oficial e sinônimos, insensível a acentos. Dados locais, sem chamada à API externa. Importante: CBO não determina CNAE, MEI ou anexo tributário. As ocupações importadas recebem `mei: unknown` e `annex: unknown`, portanto o motor não deve afirmar enquadramentos tributários a partir do nome. Validar com a contadora uma tabela CBO/atividade efetiva/CNAE antes da comercialização.


## Base MEI integrada (Anexo XI fornecido)

- `public/mei-occupations.json`: 470 registros de ocupação + CNAE extraídos do PDF fornecido, com ISS/ICMS quando legíveis. Inclui Tabela B (transportador autônomo de cargas), que tem regras/limites próprios e NÃO deve ser tratado pelo cálculo MEI padrão sem adaptação.
- A base CBO (`public/cbo-index.json`) é distinta da base MEI. Não existe conversão 1:1 segura de CBO para CNAE; na aba **Meus dados**, o usuário confirma a ocupação MEI correspondente ao serviço realmente executado.
- Sem confirmação, a aplicação **não** libera MEI; apresenta cenário de Simples provisório. Não pressupor que o Anexo III seja efetivo: a simulação de Simples continua ilustrativa até haver mapeamento CNAE → regime/anexo validado.
- Fonte é o PDF enviado; conferir a versão vigente do Anexo XI antes de lançar comercialmente.
- Os resultados e a proposta ainda exigem revisão contábil. Constar no Anexo XI não garante direito ao MEI (receita, condições da atividade e demais requisitos).


## Versão 0.9 / bases incorporadas
- CBO oficial e sinônimos: busca por profissão.
- Anexo XI: ocupações permitidas ao MEI e CNAE (pré-seleção exige confirmação da atividade real).
- Tabela privada Dinastia Contábil: extração **parcial** de linhas completas de CNAE, usada como sugestão não homologada. Arquivo `public/cnae-reference.json`.
- `public/tax-brackets-reference.json`: 30 faixas do CSV enviado, de origem não oficial. Conferir com LC 123 e alterações vigentes.
- O simulador **não** é um instrumento de classificação fiscal válido; existem CNAEs com múltiplos anexos, fator R e ISS/CPP separados. Anexo IV e MEI necessitam testes adicionais.
- Fluxos de pagamento, autenticação e e-mail continuam de demonstração.

### Atualização v0.9.2
- Removido o campo "Reserva PJ (%)" do painel de revisão. "Outras despesas PJ" permanece editável.
- Reservas pessoais não entram no cálculo de equivalência do protótipo.
- Diferenças com a planilha original: há diferenças de salário (6340 vs 6347,19 nos prints), outros descontos (1), composição anual de férias, 13º e FGTS, e arredondamentos/custos. É necessária conciliação linha a linha antes de afirmar equivalência de resultados.


## v1.0: cenários anuais do Excel

- Referência da empresa = 12 salários + 12 extras + 12 benefícios + 13º bruto + 1/3 férias bruto + FGTS no método simplificado do Excel. **Não equivale ao custo legal integral do empregador**.
- Referência CLT anual = referência da empresa menos 12 INSS, 12 IRRF e 12 outros descontos. **Não é cálculo trabalhista homologado**.
- Cenário 1: faturamento PJ anual igual à referência de desembolso da empresa.
- Cenário 2: encontra faturamento PJ para que saldo anual estimado atinja a referência CLT; pagos em 12 parcelas.
- A ausência de IR sobre férias e a forma de apropriação do 13º na planilha inicial podem alterar o resultado real. Auditar com profissional contábil.
- A pesquisa por CBO e sugestões de CNAE/MEI seguem preliminares; sem autenticação e pagamento reais.

## Impressão em PDF (v1.0.1)
A proposta continua editável na tela. Ao usar “Imprimir / PDF”, o site imprime uma cópia expandida do texto, não o campo de edição com barra de rolagem. A folha é A4 em retrato, com quebras automáticas quando necessário e tabela dimensionada para caber na largura da página. No navegador selecione “Salvar como PDF”, papel A4 e orientação Retrato; desative “Cabeçalhos e rodapés” se não quiser data/URL/número de página do navegador. Não imponha a exigência de que conteúdo longo caiba em uma só página.
