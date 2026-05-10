const olhoEsq = document.getElementById('olho-esq');
const olhoDir = document.getElementById('olho-dir');

// Função para fazer o Lumo piscar
function piscar() {
    // Muda o fundo para simular pálpebra fechada
    olhoEsq.style.height = '5px';
    olhoDir.style.height = '5px';
    olhoEsq.style.marginTop = '30px';
    olhoDir.style.marginTop = '30px';

    setTimeout(() => {
        olhoEsq.style.height = '40px';
        olhoDir.style.height = '40px';
        olhoEsq.style.marginTop = '0px';
        olhoDir.style.marginTop = '0px';
    }, 150);
}

// Pisca em intervalos aleatórios entre 2 e 5 segundos
setInterval(piscar, Math.random() * (5000 - 2000) + 2000);

console.log("Lumo carregado! Aguardando assets para substituição.");