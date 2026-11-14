# FIBRA — identidade visual

**Comida de verdade é direito de todo mundo.**
Rede de cestas populares de arroz, feijão, legumes e verduras compradas de produtores brasileiros. Marca fictícia, projeto autoral.

## Entregas (`entregas/`)

| Pasta | Conteúdo |
|---|---|
| `02-posters/` | 9 posters 3600 × 4800 px: série F · I · B · R · A, manifesto, dado, lançamento e colcha |
| `03-instagram/` | 34 peças: grade de lançamento 3 × 3, carrossel "Como funciona", abecedário, estampas, stories, avatar e destaques |
| `04-mockups/` | 9 aplicações em fotografias reais: 2 outdoors, tapume, parede, ponto de ônibus, totem, caminhão, caixa e ecobag |
| `05-motion/` | Vídeo 16:9 (1920 × 1080) e vertical (1080 × 1920), ~28 s, com trilha sincronizada à batida; GIF de 5 s; quadros-chave |
| `06-apresentacao/` | 27 pranchas 3840 × 2160 px e o brandbook em PDF |
| `07-portfolio/` | Capa do Behance (808 × 632) e 5 shots para Dribbble (1600 × 1200) |
| `08-textos/` | Textos de publicação (PT/EN), tags, ordem das imagens e legenda de lançamento |

## Marca (`marca/`)

- `logo/`: SVGs do logotipo (horizontal, empilhado, símbolo BRA) em todas as cores, silhuetas das letras e o grão
- `fontes/`: Anton e Sora (licença OFL)
- `letras.json`: geometria das letras, grãos e espaçamento

## Sistema

- **Tipografia:** Anton (títulos, caixa-alta) · Sora (chamadas, textos e rótulos)
- **Cores:** couve #0B7A3B · mata #073D26 (só na guia de cores) · fubá #FFC72C · anil #2152C8 · dendê #F28A1C · urucum #C8402A · feijão #2A1611 · arroz #F4ECD8
- **Padronagens:** fotográficas: macrofotos de comida brasileira em cor real e retratos em duotom, montadas em colcha
- **Fotografia:** Adobe Stock, licenças padrão; originais em alta resolução não versionados (`fotos/originais/`)

## Como regenerar

```bash
python3 tools/build_logo.py
```

```bash
node tools/render.mjs src/posters.html --saida entregas/02-posters --escala 3 --jpg 92 --alta
```

```bash
python3 tools/mockup.py
```

```bash
node tools/motion.mjs && node tools/motion.mjs --v
```

Requer as fotos em `fotos/trabalho/` e `fotos/originais/` (licenciadas no Adobe Stock; IDs em `fotos/fotos.json`).
