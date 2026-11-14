/* Rostos nas fotografias (fração da foto inteira: x0, y0, x1, y1, já com cabelo, chapéu ou boné).
   Usado pela verificação automática: nenhum elemento pode cobrir um rosto, e nenhum rosto pode ser cortado pela moldura. */
window.FIBRA_ROSTOS = {
  'agro-chapeu': [[0.24, 0.10, 0.42, 0.40]], 'agro-ceu': [[0.45, 0.17, 0.56, 0.37]], 'agro-senhora': [[0.33, 0.07, 0.58, 0.78]],
  'agro-jovem': [[0.37, 0.24, 0.58, 0.84]], 'agro-senhor': [[0.38, 0.15, 0.56, 0.70]], 'agro-lavoura': [[0.45, 0.12, 0.58, 0.40]],
  'mesa-familia': [[0.17, 0.17, 0.32, 0.45], [0.47, 0.03, 0.66, 0.42], [0.80, 0.25, 1.0, 0.62]],
  'mesa-geracoes': [[0.17, 0.27, 0.33, 0.55], [0.62, 0.08, 0.76, 0.40], [0.82, 0.18, 1.0, 0.55]],
  'cozinha-vovo': [[0.38, 0.12, 0.56, 0.38]], 'cozinha-sorriso': [[0.17, 0.08, 0.35, 0.40]], 'mesa-jovem': [[0.24, 0.02, 0.49, 0.42]],
  'mesa-casal': [[0.30, 0.05, 0.50, 0.40], [0.75, 0.0, 0.95, 0.38]]
};
