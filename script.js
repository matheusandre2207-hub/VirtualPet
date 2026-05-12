const olhoEsq = document.getElementById('olho-esq');
const olhoDir = document.getElementById('olho-dir');
const sabonete = document.getElementById('sabonete');
const maca = document.getElementById('maca');
const lumo = document.getElementById('lumo');
const boca = document.getElementById('boca'); // Adicionado: Referência ao elemento da boca
const olhosContainer = document.querySelector('.olhos-container');
const espumaContainer = document.querySelector('.espuma-container');
const corpoMask = document.querySelector('.pet-corpo-mask');
const mundo = document.getElementById('mundo');
const abajur = document.getElementById('abajur');
const sleepOverlay = document.getElementById('sleep-overlay');
const zContainer = document.querySelector('.z-container');

// Estados do Pet
let status = {
    fome: 100,
    energia: 100,
    limpeza: 100,
    humor: 100
};

// Arrays de Customização (20 opções cada)
const bodyColors = [
    '#4ed401', '#ff5733', '#3357ff', '#ff33a1', '#33fff6', 
    '#f6ff33', '#a133ff', '#ff8c33', '#33ff8c', '#8c33ff',
    '#5733ff', '#ff3357', '#33ff57', '#ffa500', '#800080',
    '#008080', '#ffdab9', '#e6e6fa', '#ffe4e1', '#2f4f4f'
];

const noseColors = [
    '#8A2BE2', '#ff0000', '#005700', '#0000ff', '#9e9e00',
    '#ff00ff', '#00ffff', '#ffa500', '#800000', '#008000',
    '#000080', '#808000', '#800080', '#008080', '#c0c0c0',
    '#808080', '#999999', '#333333', '#663300', '#cc99ff'
];

const irisColors = [
    '#01a3d4', '#2e8b57', '#8b4513', '#4682b4', '#d2691e',
    '#556b2f', '#9932cc', '#8b0000', '#e9967a', '#9400d3',
    '#00ced1', '#ff8c00', '#ffd700', '#adff2f', '#00ff7f',
    '#4169e1', '#ff1493', '#00bfff', '#ff4500', '#32cd32'
];

const bodyPatterns = [
    'none', // Translúcido/Liso
    'radial-gradient(circle, #fff 10%, transparent 10%)', // Pontilhado
    'linear-gradient(45deg, rgba(255,255,255,0.2) 25%, transparent 25%, transparent 50%, rgba(255,255,255,0.2) 50%, rgba(255,255,255,0.2) 75%, transparent 75%, transparent)', // Listrado
    'radial-gradient(circle at 20% 20%, #fff 5%, transparent 5%), radial-gradient(circle at 80% 80%, #fff 10%, transparent 10%)', // Manchado
    'repeating-linear-gradient(0deg, transparent, transparent 20px, rgba(255,255,255,0.1) 20px, rgba(255,255,255,0.1) 40px)', // Listras Horizontais
    'repeating-radial-gradient(circle, transparent, transparent 10px, rgba(255,255,255,0.1) 10px, rgba(255,255,255,0.1) 20px)', // Ondas
    // Adicione aqui as outras 14 variações de padrões CSS
];

function customizarPet(bodyIdx, noseIdx, irisIdx, patternIdx) {
    const root = document.getElementById('lumo');
    root.style.setProperty('--body-color', bodyColors[bodyIdx % 20]);
    root.style.setProperty('--nose-color', noseColors[noseIdx % 20]);
    root.style.setProperty('--iris-color', irisColors[irisIdx % 20]);
    
    const patternLayer = document.querySelector('.pet-pattern');
    const pattern = bodyPatterns[patternIdx % bodyPatterns.length] || 'none';
    patternLayer.style.backgroundImage = pattern === 'none' ? 'none' : pattern;
    if (pattern !== 'none') patternLayer.style.backgroundSize = '40px 40px';
}

// Bloqueia menu de contexto em todo o app
document.addEventListener('contextmenu', event => event.preventDefault());

let currentRoom = 0; // 0: Banheiro, 1: Sala, 2: Cozinha, 3: Quarto
let startXRoom = 0;
let isDraggingRoom = false;
let draggingElement = null; // Armazena qual item está sendo arrastado

let estaChovendo = false;
let estaDormindo = false;
let intervaloAgua, intervaloLimpeza;
let intervalZ;

// Mapeamento de cores das paredes por cômodo
const roomColors = {
    0: '#414141', // Banheiro
    1: '#6d4c41', // Sala
    2: '#d6d6d6', // Cozinha
    3: '#4a5a7a'  // Quarto
};


// Lógica de Comida
const foodList = "🍎🍕🍔🍟🌭🍿🥓🥚🧇🥞🍞🥐🥨🥯🥖🧀🥗🥙🥪🌮🌯🍖🍗🥩🍠🥟🥠🥡🍘🍙🍚🦪🍣🍤🥮🍝🍦🍧🍨🍩🍪🍰🧁🍫🍬🍭🍮🍯🥛☕🥝🥥🍇🍉🍊🍌🍏🍐🍑🍒🍓🌶🥑🥒🌰🧅🥕".match(/./gu);
let currentFoodIndex = 0;
let estaMastigando = false;

function updateFoodUI() {
    maca.innerText = foodList[currentFoodIndex];
}

document.getElementById('prev-food').addEventListener('click', (e) => {
    e.stopPropagation();
    currentFoodIndex = (currentFoodIndex - 1 + foodList.length) % foodList.length;
    updateFoodUI();
});

document.getElementById('next-food').addEventListener('click', (e) => {
    e.stopPropagation();
    currentFoodIndex = (currentFoodIndex + 1) % foodList.length;
    updateFoodUI();
});

function processarAlimentacao(elemento) {
    const bocaRect = boca.getBoundingClientRect();
    const elemRect = elemento.getBoundingClientRect();
    
    // Calcula o deslocamento necessário para levar o centro da comida ao centro da boca
    const deltaX = (bocaRect.left + bocaRect.width / 2) - (elemRect.left + elemRect.width / 2);
    const deltaY = (bocaRect.top + bocaRect.height / 2) - (elemRect.top + elemRect.height / 2);

    // Obtemos a transformação atual (o translate que foi aplicado durante o drag)
    const currentTransform = window.getComputedStyle(elemento).transform;
    const matrix = new DOMMatrixReadOnly(currentTransform === 'none' ? '' : currentTransform);

    // Transição suave: move para o centro da boca enquanto encolhe e desaparece
    elemento.style.transition = 'transform 0.4s ease-in, opacity 0.4s ease-in';
    elemento.style.transform = `translate(${matrix.m41 + deltaX}px, ${matrix.m42 + deltaY}px) scale(0.1)`;
    elemento.style.opacity = '0';

    setTimeout(() => {
        status.fome = Math.min(100, status.fome + 10);
        updateStatusUI();
        elemento.style.display = 'none';
        iniciarMastigacao();
        
        // Reseta o elemento para a próxima vez (invisível por enquanto)
        setTimeout(() => {
            elemento.style.transition = 'none';
            elemento.style.transform = 'translate(0,0) scale(1)';
            elemento.style.opacity = '1';
        }, 1500);
    }, 400);
}

function iniciarMastigacao() {
    estaMastigando = true;
    boca.classList.remove('sad-mouth');
    let ciclos = 0;
    const interval = setInterval(() => {
        boca.classList.toggle('boca-aberta');
        criarParticulasComida();
        ciclos++;
        if (ciclos >= 6) {
            clearInterval(interval);
            boca.classList.remove('boca-aberta');
            estaMastigando = false;
            maca.style.display = 'flex'; // Comida reaparece
        }
    }, 250);
}

function criarParticulasComida() {
    const bocaRect = boca.getBoundingClientRect();
    for (let i = 0; i < 3; i++) {
        const p = document.createElement('div');
        p.classList.add('particula-comida');
        p.style.left = `${bocaRect.left + 10}px`;
        p.style.top = `${bocaRect.top + 10}px`;
        p.style.setProperty('--dx', `${(Math.random() - 0.5) * 60}px`);
        p.style.setProperty('--dy', `${Math.random() * 40 + 20}px`);
        document.body.appendChild(p);
        setTimeout(() => p.remove(), 600);
    }
}

function updateStatusBarColor() {
    const metaThemeColor = document.getElementById('theme-color');
    if (metaThemeColor) {
        metaThemeColor.setAttribute('content', roomColors[currentRoom]);
    }
}

function updateStatusUI() {
    updateIconFill('fome', status.fome);
    updateIconFill('energia', status.energia);
    updateIconFill('limpeza', status.limpeza);
    updateIconFill('humor', status.humor);
    checkPetEmotions();
}

function checkPetEmotions() {
    const threshold = 25;
    const estaTriste = status.fome < threshold || status.energia < threshold || status.limpeza < threshold || status.humor < threshold;

    // Lógica da Boca
    if (estaTriste && !boca.classList.contains('boca-aberta')) {
        boca.classList.add('sad-mouth');
    } else {
        boca.classList.remove('sad-mouth');
    }

    // Lógica dos Olhos (Pupila grande, 2 brilhos e tremor)
    if (estaTriste) {
        const irisColor = getComputedStyle(lumo).getPropertyValue('--iris-color').trim();
        const sadGradient = `
            radial-gradient(circle at 65% 35%, #fff 4px, transparent 2.5px),
            radial-gradient(circle at 35% 65%, #fff 2px, transparent 1.5px),
            radial-gradient(circle, #000 14px, ${irisColor} 5px)
        `;
        olhoEsq.style.setProperty('--eye-gradient', sadGradient);
        olhoDir.style.setProperty('--eye-gradient', sadGradient);
        olhoEsq.classList.add('triste');
        olhoDir.classList.add('triste');
    } else {
        olhoEsq.style.removeProperty('--eye-gradient');
        olhoDir.style.removeProperty('--eye-gradient');
        olhoEsq.classList.remove('triste');
        olhoDir.classList.remove('triste');
    }

    // Lógica de Sujeira (Manchas no corpo)
    if (status.limpeza <= 0) {
        if (corpoMask.querySelectorAll('.mancha-sujeira').length === 0) {
            gerarSujeira();
        }
    } else if (status.limpeza > 10) {
        // Remove manchas gradualmente ou todas se estiver limpo
        corpoMask.querySelectorAll('.mancha-sujeira').forEach(m => m.remove());
    }
}

function gerarSujeira() {
    for (let i = 0; i < 6; i++) {
        const mancha = document.createElement('div');
        mancha.classList.add('mancha-sujeira');
        const tamanho = Math.random() * 40 + 20;
        mancha.style.width = `${tamanho}px`;
        mancha.style.height = `${tamanho * 0.8}px`;
        mancha.style.left = `${Math.random() * 80 + 10}%`;
        mancha.style.top = `${Math.random() * 60 + 20}%`;
        mancha.style.transform = `rotate(${Math.random() * 360}deg)`;
        corpoMask.appendChild(mancha);
    }
}

function updateIconFill(id, value) {
    const fillElement = document.getElementById(`fill-${id}`);
    if (fillElement) {
        const percentage = 100 - value;
        fillElement.style.clipPath = `inset(${percentage}% 0% 0% 0%)`;
    }
}

// Ciclo de vida: Diminui status com o tempo
setInterval(() => {
    // Fome diminui sempre
    status.fome = Math.max(0, status.fome - 0.5);
    
    // Limpeza diminui se não estiver tomando banho
    if (!estaChovendo) status.limpeza = Math.max(0, status.limpeza - 0.3);

    // Energia diminui se acordado, aumenta se dormindo
    if (estaDormindo) {
        status.energia = Math.min(100, status.energia + 2);
    } else {
        status.energia = Math.max(0, status.energia - 0.4);
    }

    // Humor é a média dos outros, mas cai se algum estiver muito baixo
    const media = (status.fome + status.energia + status.limpeza) / 3;
    status.humor = Math.max(0, Math.min(100, media));

    updateStatusUI();
}, 3000);

// Função para fazer o Lumo piscar
function piscar() {
    if (estaChovendo || estaDormindo) return; // Não pisca se já estiver de olhos fechados

    olhoEsq.classList.add('fechado');
    olhoDir.classList.add('fechado');

    setTimeout(() => {
        if (estaChovendo || estaDormindo) return; 
        
        olhoEsq.classList.remove('fechado');
        olhoDir.classList.remove('fechado');
    }, 150);
}

// Pisca em intervalos aleatórios entre 2 e 5 segundos
setInterval(piscar, Math.random() * (5000 - 2000) + 2000);

// Lógica do Chuveiro
document.querySelector('.chuveiro').addEventListener('click', () => {
    estaChovendo = !estaChovendo;
    
    if (estaChovendo) {
        olhoEsq.classList.add('fechado');
        olhoDir.classList.add('fechado');
        
        // Começa a soltar água
        intervaloAgua = setInterval(criarGota, 40);
        
        // Começa a limpar a espuma
        intervaloLimpeza = setInterval(() => {
            const bolhas = document.querySelectorAll('.bolha');
            if (bolhas.length > 0) {
                bolhas[0].remove(); // Remove a bolha mais antiga
            }
        }, 100);
    } else {
        desligarChuveiro();
    }
});

function desligarChuveiro() {
    estaChovendo = false;
    clearInterval(intervaloAgua);
    clearInterval(intervaloLimpeza);
    
    // Remove gotas restantes imediatamente
    document.querySelectorAll('.gota').forEach(g => g.remove());

    if (!estaDormindo) {
        olhoEsq.classList.remove('fechado');
        olhoDir.classList.remove('fechado');
    }
}

function criarGota() {
    const cenario = document.querySelector('.cenario');
    const gota = document.createElement('div');
    gota.classList.add('gota');
    // Centraliza a gota no chuveiro com uma leve variação horizontal
    gota.style.left = `calc(50% + ${(Math.random() - 0.5) * 50}px)`;
    cenario.appendChild(gota);
    
    // Remove o elemento após a animação terminar
    setTimeout(() => gota.remove(), 700);
}

// Lógica para arrastar o sabonete
let isDragging = false;
let startX, startY;

sabonete.addEventListener('mousedown', startDrag);
sabonete.addEventListener('touchstart', startDrag, { passive: false });
maca.addEventListener('mousedown', startDrag);
maca.addEventListener('touchstart', startDrag, { passive: false });

function startDrag(e) {
    if (estaMastigando && e.currentTarget.id === 'maca') return;
    e.stopPropagation(); // Impede que o arraste do sabonete mova a tela
    isDragging = true;
    draggingElement = e.currentTarget;

    // Detecta se é touch ou mouse
    const clientX = e.type === 'touchstart' ? e.touches[0].clientX : e.clientX;
    const clientY = e.type === 'touchstart' ? e.touches[0].clientY : e.clientY;
    
    startX = clientX;
    startY = clientY;
    
    draggingElement.style.transition = 'none';
    draggingElement.style.cursor = 'grabbing';
}

document.addEventListener('mousemove', drag);
document.addEventListener('touchmove', drag, { passive: false });

function drag(e) {
    if (!isDragging) return;
    
    // Evita rolar a tela no mobile durante o arraste
    if (e.cancelable) e.preventDefault();

    const clientX = e.type === 'touchmove' ? e.touches[0].clientX : e.clientX;
    const clientY = e.type === 'touchmove' ? e.touches[0].clientY : e.clientY;

    const dx = clientX - startX;
    const dy = clientY - startY;
    
    draggingElement.style.transform = `translate(${dx}px, ${dy}px)`;

    // Faz o pet seguir o objeto com os olhos
    moverOlhos(clientX, clientY);

    // Lógica de deixar espuma apenas para o sabonete
    if (draggingElement.id === 'sabonete') {
        verificarColisaoSabonete(clientX, clientY);
    } else if (draggingElement.id === 'maca') {
        verificarColisaoMacaComBoca(clientX, clientY);
    }
}

function verificarColisaoSabonete(x, y) {
    const lumoRect = lumo.getBoundingClientRect();
    const olhosRect = olhosContainer.getBoundingClientRect();

    // Verifica se o mouse está sobre o pet
    if (x > lumoRect.left && x < lumoRect.right && y > lumoRect.top && y < lumoRect.bottom) {
        // Verifica se NÃO está sobre os olhos
        if (!(x > olhosRect.left && x < olhosRect.right && y > olhosRect.top && y < olhosRect.bottom)) {
            const size = Math.random() * 15 + 10;
            const bolha = document.createElement('div');
            bolha.classList.add('bolha');
            bolha.style.width = `${size}px`;
            bolha.style.height = `${size}px`;
            bolha.style.left = `${x - lumoRect.left - size / 2}px`;
            bolha.style.top = `${y - lumoRect.top - size / 2}px`;
            espumaContainer.appendChild(bolha);
            status.limpeza = Math.min(100, status.limpeza + 0.2);
            updateStatusUI();
        }
    }
}

// Função para mover as pupilas seguindo o cursor/item
function moverOlhos(x, y) {
    const olhosRect = olhosContainer.getBoundingClientRect();
    const centroX = olhosRect.left + olhosRect.width / 2;
    const centroY = olhosRect.top + olhosRect.height / 2;

    // Calcula o ângulo e a distância limitada para o movimento da pupila
    const dx = x - centroX;
    const dy = y - centroY;
    const angulo = Math.atan2(dy, dx);
    const dist = 6; // Deslocamento máximo em pixels para dentro do globo ocular

    const moveX = Math.cos(angulo) * dist;
    const moveY = Math.sin(angulo) * dist;

    // Aplica as variáveis CSS que definiremos no style.css
    olhoEsq.style.setProperty('--pupil-x', `${moveX}px`);
    olhoEsq.style.setProperty('--pupil-y', `${moveY}px`);
    olhoDir.style.setProperty('--pupil-x', `${moveX}px`);
    olhoDir.style.setProperty('--pupil-y', `${moveY}px`);
}

// Nova função: Verifica colisão da maçã com a boca
function verificarColisaoMacaComBoca(x, y) {
    const bocaRect = boca.getBoundingClientRect();
    const padding = 30; // Reduzido para evitar ativação imediata indesejada
    if (x > bocaRect.left - padding && x < bocaRect.right + padding && 
        y > bocaRect.top - padding && y < bocaRect.bottom + padding) {
        boca.classList.add('boca-aberta');
        return true;
    } else {
        boca.classList.remove('boca-aberta');
        return false;
    }
}

// Lógica do Abajur (Sono)
abajur.addEventListener('click', () => {
    estaDormindo = !estaDormindo;
    const quarto = document.getElementById('quarto');
    const container = document.getElementById('game-container');
    
    if (estaDormindo) {
        sleepOverlay.classList.add('active');
        olhoEsq.classList.add('fechado');
        olhoDir.classList.add('fechado');
        intervalZ = setInterval(criarZ, 1200);
        
        // Move o pet para dentro do quarto (anexa ao cenário)
        quarto.appendChild(lumo);
    } else {
        sleepOverlay.classList.remove('active');
        clearInterval(intervalZ);
        
        // Traz o pet de volta para o container global (ele volta a seguir você)
        container.appendChild(lumo);

        if (!estaChovendo) {
            olhoEsq.classList.remove('fechado');
            olhoDir.classList.remove('fechado');
        }
    }
});

function criarZ() {
    const z = document.createElement('div');
    z.classList.add('z-particle');
    z.innerText = 'Z';
    zContainer.appendChild(z);
    setTimeout(() => z.remove(), 2500);
}

document.addEventListener('mouseup', endDrag);
document.addEventListener('touchend', endDrag);

function endDrag(e) {
    if (!isDragging) return;

    const clientX = e && (e.type === 'touchend' ? e.changedTouches[0].clientX : e.clientX);
    const clientY = e && (e.type === 'touchend' ? e.changedTouches[0].clientY : e.clientY);

    // Lógica de comer: se soltar dentro da área da boca
    if (draggingElement && draggingElement.id === 'maca' && !estaMastigando) {
        if (verificarColisaoMacaComBoca(clientX, clientY)) {
            const itemComida = draggingElement;
            isDragging = false;
            draggingElement = null;
            processarAlimentacao(itemComida);

            // Reseta a posição dos olhos para o centro ao comer
            olhoEsq.style.setProperty('--pupil-x', '0px');
            olhoEsq.style.setProperty('--pupil-y', '0px');
            olhoDir.style.setProperty('--pupil-x', '0px');
            olhoDir.style.setProperty('--pupil-y', '0px');
            
            return;
        }
    }

    // Lógica de Swipe para trocar comida (detectada ao soltar o item)
    if (draggingElement && draggingElement.id === 'maca' && e) {
        const dx = clientX - startX;
        const dy = clientY - startY;

        // Se o movimento foi majoritariamente horizontal e longo o suficiente
        if (Math.abs(dx) > 50 && Math.abs(dy) < 40) {
            if (dx > 0) {
                currentFoodIndex = (currentFoodIndex - 1 + foodList.length) % foodList.length;
            } else {
                currentFoodIndex = (currentFoodIndex + 1) % foodList.length;
            }
            updateFoodUI();
        }
    }

    isDragging = false;
    
    // Garante que a boca feche se a maçã for solta
    boca.classList.remove('boca-aberta');
    
    // Reseta a posição dos olhos para o centro
    olhoEsq.style.setProperty('--pupil-x', '0px');
    olhoEsq.style.setProperty('--pupil-y', '0px');
    olhoDir.style.setProperty('--pupil-x', '0px');
    olhoDir.style.setProperty('--pupil-y', '0px');

    draggingElement.style.transition = 'transform 0.3s ease-out';
    draggingElement.style.transform = 'translate(0, 0)'; // Volta à origem
    draggingElement.style.cursor = 'grab';
    draggingElement = null;
}

// Lógica para trocar de cômodo arrastando a tela
document.getElementById('game-container').addEventListener('mousedown', (e) => {
    if (isDragging) return;
    startXRoom = e.clientX;
    isDraggingRoom = true;
});

document.getElementById('game-container').addEventListener('touchstart', (e) => {
    if (isDragging) return;
    startXRoom = e.touches[0].clientX;
    isDraggingRoom = true;
});

document.addEventListener('mouseup', (e) => {
    if (!isDraggingRoom) return;
    handleEndDragRoom(e.clientX);
});

document.addEventListener('touchend', (e) => {
    if (!isDraggingRoom) return;
    handleEndDragRoom(e.changedTouches[0].clientX);
});

function handleEndDragRoom(endX) {
    isDraggingRoom = false;
    const diffX = startXRoom - endX;
    const previousRoom = currentRoom;

    if (diffX > 50 && currentRoom < 3) currentRoom++; // Arrastou para a esquerda -> Próximo cômodo
    if (diffX < -50 && currentRoom > 0) currentRoom--; // Arrastou para a direita -> Cômodo anterior

    // Desliga o chuveiro se sair do banheiro (0)
    if (previousRoom === 0 && currentRoom !== 0 && estaChovendo) {
        desligarChuveiro();
    }

    mundo.style.left = `-${currentRoom * window.innerWidth}px`;
    updateStatusBarColor();
}

updateStatusBarColor(); // Define a cor inicial
updateStatusUI(); // Inicializa os ícones cheios

// Exemplo: Customização Aleatória ao carregar
customizarPet(
    Math.floor(Math.random() * 20),
    Math.floor(Math.random() * 20),
    Math.floor(Math.random() * 20),
    Math.floor(Math.random() * 4) // Sorteia entre os primeiros padrões implementados
);

console.log("Lumo carregado! Aguardando assets para substituição.");