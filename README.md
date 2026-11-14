# FIBRA — identidade visual (v6)

**Comida de verdade é direito de todo mundo.**
Rede de cestas de arroz, feijão, legumes e verduras compradas direto da agricultura familiar. Marca fictícia, projeto autoral.

O roteiro completo da marca (diagnóstico, estratégia, conceito, sistema, peças, roteiro do filme e verificação) está em [`docs/ROTEIRO.md`](docs/ROTEIRO.md).

## Entregas (`entregas/`)

| Pasta | Conteúdo |
|---|---|
| `02-cartazes/` | 10 cartazes lambe-lambe, 3600 × 4800 px |
| `03-instagram/` | 28 peças: grade de lançamento 3 × 3, carrossel "Como funciona" (6), modelos (cesta da semana, quem planta, receita), 4 stories, 5 capas de destaque e avatar |
| `04-embalagens/` | pacotes de 1 kg com janela em forma de grão, faca técnica da caixa (FEFCO 0201), artes de sacola, ráfia, aba e cartão, lacre e etiqueta |
| `05-mockups/` | lambe-lambe, celular, aba da caixa, cartão na caixa, sacola kraft e saco de ráfia |
| `06-motion/` | filme manifesto 16:9 e 9:16 (45 s), cortado nos compassos da trilha a partir de 1:56 |
| `07-brandbook/` | manual da marca em PDF (43 páginas, 16:9) e as páginas em JPG |
| `08-behance/` | capa do Behance e shots para portfólio |
| `09-textos/` | textos de publicação (PT/EN), ordem das imagens e créditos |

## Sistema

- **Tipografia:** Gabarito, da Naipe Foundry (Rio de Janeiro), SIL OFL. Black 900 para blocos e títulos, Regular 400 para texto.
- **Logotipo:** desenho próprio, com letras condensadas e o grão de feijão nas contraformas de B, R e A. Com fotografia dentro das letras, não há grão.
- **Cores principais:** Couve #0B7A3B, Fubá #FFC72C, Anil #2152C8, Feijão #2A1611, Arroz #F4ECD8. **Apoio:** Dendê #F28A1C, Urucum #C8402A. Mata #073D26 só na guia de cores.
- **Construção fotográfica:** retrato recortado à frente do anel de grão, mosaico modular, foto dentro do grão.
- **Elementos:** composição em bloco, plaquinha com prendedor, recortes com borda de papel, carimbo, gráfico de grãos.

## Como regenerar

```bash
python3 tools/build_logo.py
```

```bash
python3 tools/recorte.py && python3 tools/pessoas.py
```

```bash
node tools/qa.mjs src/posters.html src/instagram.html src/embalagens.html src/brandbook.html src/behance.html
```

```bash
node tools/render.mjs src/posters.html --saida entregas/02-cartazes --escala 3 --jpg 92 --alta
```

```bash
node tools/render.mjs src/instagram.html --saida entregas/03-instagram --escala 1 --jpg 92
```

```bash
python3 tools/mockup6.py
```

```bash
node tools/motion.mjs && node tools/motion.mjs --v
```

Requer as fotos licenciadas em `fotos/originais/` e `fotos/trabalho/` (IDs do Adobe Stock em `fotos/fotos.json`); recortes e retratos são gerados a partir delas e não são versionados.
