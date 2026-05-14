const olhoEsq = document.getElementById('olho-esq');
const olhoDir = document.getElementById('olho-dir');
const sabonete = document.getElementById('sabonete');
const maca = document.getElementById('maca');
const bolinha = document.getElementById('bolinha');
const lumo = document.getElementById('lumo');
const boca = document.getElementById('boca'); // Adicionado: Referência ao elemento da boca
const olhosContainer = document.querySelector('.olhos-container');
const espumaContainer = document.querySelector('.espuma-container');
const corpoMask = document.querySelector('.pet-corpo-mask');
const mundo = document.getElementById('mundo');
const abajur = document.getElementById('abajur');
const sleepOverlay = document.getElementById('sleep-overlay');
const zContainer = document.querySelector('.z-container');
const shopOverlay = document.getElementById('shop-overlay');
const shopContainer = document.getElementById('shop-sections-container');
const shopPanel = document.getElementById('shop-panel');
const lumoWrapper = document.getElementById('lumo-wrapper');
const btnLoja = document.getElementById('btn-loja');
const closeShop = document.getElementById('close-shop');

// Configuração para Detecção de Colisão por Pixel (Banho)
const bodyCollisionCanvas = document.createElement('canvas');
const bodyCollisionCtx = bodyCollisionCanvas.getContext('2d', { willReadFrequently: true });
let bodyImgLoaded = false;
const bodyImgForCollision = new Image();
bodyImgForCollision.src = 'assets/body.png';

function updateCollisionMap() {
    const targetW = 260;
    const targetH = 220;
    const imgW = bodyImgForCollision.width;
    const imgH = bodyImgForCollision.height;
    const ratio = Math.min(targetW / imgW, targetH / imgH);
    const drawW = imgW * ratio;
    const drawH = imgH * ratio;
    const x = (targetW - drawW) / 2;
    const y = (targetH - drawH) / 2;

    bodyCollisionCanvas.width = targetW;
    bodyCollisionCanvas.height = targetH;
    bodyCollisionCtx.clearRect(0, 0, targetW, targetH);
    bodyCollisionCtx.drawImage(bodyImgForCollision, x, y, drawW, drawH);
    bodyImgLoaded = true;
}

bodyImgForCollision.onload = () => {
    updateCollisionMap();
};

// Estados do Pet
let status = {
    fome: 0,
    energia: 0,
    limpeza: 0,
    humor: 0
};

// Arrays de Customização (20 opções cada)
const bodyTypes = ['assets/body.png', 'assets/body2.png'];

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

function customizarPet(typeIdx, bodyIdx, noseIdx, irisIdx, patternIdx) {
    const root = document.getElementById('lumo');
    const bodyPath = bodyTypes[typeIdx % bodyTypes.length];
    
    root.style.setProperty('--body-image', `url('${bodyPath}')`);
    root.style.setProperty('--body-color', bodyColors[bodyIdx % 20]);
    root.style.setProperty('--nose-color', noseColors[noseIdx % 20]);
    root.style.setProperty('--iris-color', irisColors[irisIdx % 20]);

    // Atualiza o mapa de colisão para o novo formato de corpo
    bodyImgLoaded = false;
    bodyImgForCollision.src = bodyPath;
    bodyImgForCollision.onload = () => {
        updateCollisionMap();
    };
    
    const patternLayer = document.querySelector('.pet-pattern');
    const pattern = bodyPatterns[patternIdx % bodyPatterns.length] || 'none';
    patternLayer.style.backgroundImage = pattern === 'none' ? 'none' : pattern;
    if (pattern !== 'none') patternLayer.style.backgroundSize = '40px 40px';
}

// --- Lógica da Loja ---

const shopConfig = {
    0: { name: "Banheiro", items: ["pia", "chuveiro", "sabonete"] },
    1: { name: "Sala", items: ["tv", "rack", "planta"] },
    2: { name: "Cozinha", items: ["geladeira", "fogao", "mesa"] },
    3: { name: "Quarto", items: ["cama", "comoda", "abajur"] }
};

const hueFilters = [0, 45, 90, 150, 200, 260, 300];
const wallColors = ['#414141', '#6d4c41', '#d6d6d6', '#4a5a7a', '#ff5733', '#3357ff', '#757575'];
const floorColors = ['#ffffff', '#f0e68c', '#e0e0e0', '#ffdab9', '#b0c4de'];

btnLoja.addEventListener('click', openShop);
closeShop.addEventListener('click', () => shopOverlay.classList.add('hidden'));
shopOverlay.addEventListener('click', (e) => { if(e.target === shopOverlay) shopOverlay.classList.add('hidden'); });

// Bloqueia a propagação apenas do início e fim do toque para não mover o fundo.
// Deixamos o 'touchmove' livre para que o navegador processe a rolagem nativa sem travas de JS.
['touchstart', 'touchend', 'mousedown', 'mouseup'].forEach(evt => {
    shopPanel.addEventListener(evt, e => e.stopPropagation(), { passive: true });
});

function openShop() {
    shopContainer.innerHTML = '';
    const config = shopConfig[currentRoom];
    
    // 1. Seção de Móveis
    config.items.forEach(itemId => {
        const section = createShopSection(itemId.charAt(0).toUpperCase() + itemId.slice(1));
        const grid = document.createElement('div');
        grid.className = 'shop-grid';

        hueFilters.forEach(hue => {
            const card = document.createElement('div');
            card.className = 'shop-item-card';
            const img = document.createElement('img');
            img.src = `assets/${itemId === 'chuveiro' ? 'pia' : itemId}.png`; // Fallback visual se não houver asset específico
            if (itemId === 'chuveiro') img.src = 'assets/suporte.png'; // Exemplo para o chuveiro
            img.style.filter = `hue-rotate(${hue}deg)`;
            
            // Usamos apenas onclick. O navegador mobile é inteligente o suficiente para não disparar 
            // o click se o usuário estiver realizando um movimento de scroll (pan-y).
            card.onclick = () => {
                const target = document.querySelector(`.${itemId}`) || document.getElementById(itemId);
                if (target) target.style.filter = `hue-rotate(${hue}deg)`;
            };
            
            card.appendChild(img);
            grid.appendChild(card);
        });
        section.appendChild(grid);
        shopContainer.appendChild(section);
    });

    // 2. Seção de Parede
    const wallSection = createShopSection("Cor da Parede");
    const wallGrid = document.createElement('div');
    wallGrid.className = 'shop-grid';
    wallColors.forEach(color => {
        const card = document.createElement('div');
        card.className = 'shop-item-card';
        const swatch = document.createElement('div');
        swatch.className = 'color-swatch';
        swatch.style.backgroundColor = color;

        card.onclick = () => {
            document.querySelectorAll('.parede-fundo')[currentRoom].style.backgroundColor = color;
        };

        card.appendChild(swatch);
        wallGrid.appendChild(card);
    });
    wallSection.appendChild(wallGrid);
    shopContainer.appendChild(wallSection);

    // 3. Seção de Piso
    const floorSection = createShopSection("Estilo do Piso");
    const floorGrid = document.createElement('div');
    floorGrid.className = 'shop-grid';
    floorColors.forEach(color => {
        const card = document.createElement('div');
        card.className = 'shop-item-card';
        const swatch = document.createElement('div');
        swatch.className = 'color-swatch';
        swatch.style.backgroundColor = color;
        swatch.style.backgroundImage = "linear-gradient(rgba(0,0,0,0.1) 1px, transparent 1px)";
        
        card.onclick = () => {
            document.querySelectorAll('.chao')[currentRoom].style.background = `radial-gradient(circle at 50% 0%, ${color} 20%, #bababa 100%)`;
        };

        card.appendChild(swatch);
        floorGrid.appendChild(card);
    });
    floorSection.appendChild(floorGrid);
    shopContainer.appendChild(floorSection);

    shopOverlay.classList.remove('hidden');
}

function createShopSection(title) {
    const div = document.createElement('div');
    const h3 = document.createElement('h3');
    h3.className = 'shop-section-title';
    h3.innerText = title;
    div.appendChild(h3);
    return div;
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

const foodStats = {
    '🍎': { fome: 8, energia: 2, humor: 5 },
    '🍕': { fome: 15, energia: -2, humor: 12 },
    '🍔': { fome: 18, energia: -5, humor: 15 },
    '🍟': { fome: 12, energia: -3, humor: 10 },
    '🌭': { fome: 14, energia: -2, humor: 8 },
    '🍿': { fome: 5, energia: 0, humor: 7 },
    '🥓': { fome: 12, energia: 2, humor: 6 },
    '🥚': { fome: 10, energia: 5, humor: 3 },
    '🍗': { fome: 13, energia: 5, humor: 5 },
    '🥩': { fome: 20, energia: 3, humor: 5 },
    '🥦': { fome: 6, energia: 15, humor: 2 },
    '🥗': { fome: 8, energia: 12, humor: 4 },
    '🍦': { fome: 5, energia: -5, humor: 20 },
    '🍩': { fome: 10, energia: -6, humor: 18 },
    '☕': { fome: 1, energia: 30, humor: 5 },
    '🍬': { fome: 2, energia: -2, humor: 15 },
    'default': { fome: 10, energia: 0, humor: 5 }
};

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

function getFoodColor(emoji) {
    const colors = {
        red: ['🍎', '🥓', '🍉', '🍒', '🍓', '🌶', '🥩', '🍖'],
        orange: ['🍕', '🥨', '🌮', '🌯', '🍊', '🍑', '🥕', '🌭'],
        yellow: ['🍟', '🧀', '🍌', '🍯', '🍍', '🌽', '🥚', '🥞', '🧇'],
        brown: ['🍔', '🍞', '🥐', '🥯', '🥖', '🍠', '🍪', '🍩', '🍫', '🍮', '☕', '🌰', '🧅', '🥪', '🥙', '🥨'],
        green: ['🥗', '🥝', '🍏', '🍐', '🥑', '🥒', '🥬', '🥦'],
        white: ['🍿', '🥟', '🥠', '🥡', '🍘', '🍙', '🍚', '🦪', '🥛', '🥥', '🍦', '🍧', '🍨'],
        pink: ['🍰', '🧁', '🍬', '🍭', '🍇', '🥮', '🍣', '🍤']
    };
    const hex = { red: '#ff3b30', orange: '#ff9500', yellow: '#ffcc00', brown: '#8b4513', green: '#4cd964', white: '#f2f2f7', pink: '#ff2d55' };
    
    for (const [name, emojis] of Object.entries(colors)) {
        if (emojis.includes(emoji)) return hex[name];
    }
    return '#ffca28'; // Cor padrão (dourado) caso não encontre
}

function processarAlimentacao(elemento) {
    const bocaRect = boca.getBoundingClientRect();
    const elemRect = elemento.getBoundingClientRect();
    
    // Calcula o deslocamento necessário para levar o centro da comida ao centro da boca
    const deltaX = (bocaRect.left + bocaRect.width / 2) - (elemRect.left + elemRect.width / 2);
    const deltaY = (bocaRect.top + bocaRect.height / 2) - (elemRect.top + elemRect.height / 2);

    // Obtemos a transformação atual (o translate que foi aplicado durante o drag)
    const currentTransform = window.getComputedStyle(elemento).transform;
    const matrix = new DOMMatrixReadOnly(currentTransform === 'none' ? '' : currentTransform);

    const emoji = elemento.innerText;
    const color = getFoodColor(emoji);
    const stats = foodStats[emoji] || foodStats['default'];

    // Transição suave: move para o centro da boca enquanto encolhe e desaparece
    elemento.style.transition = 'transform 0.4s ease-in, opacity 0.4s ease-in';
    elemento.style.transform = `translate(${matrix.m41 + deltaX}px, ${matrix.m42 + deltaY}px) scale(0.1)`;
    elemento.style.opacity = '0';

    setTimeout(() => {
        status.fome = Math.min(100, status.fome + stats.fome);
        status.energia = Math.min(100, Math.max(0, status.energia + stats.energia));
        status.humor = Math.min(100, Math.max(0, status.humor + stats.humor));
        resetarOlhos(); // Reseta o olhar assim que ele engole
        updateStatusUI();
        
        // Reseta o elemento para a posição original no seletor imediatamente
        // Isso evita o espaço vazio e simula a reposição da comida
        elemento.style.transition = 'none';
        elemento.style.transform = 'translate(0,0) scale(1)';
        elemento.style.opacity = '1';

        iniciarMastigacao(color);
    }, 400);
}

function iniciarMastigacao(color) {
    estaMastigando = true;
    boca.classList.remove('sad-mouth');
    let ciclos = 0;
    const interval = setInterval(() => {
        boca.classList.toggle('boca-aberta');
        criarParticulasComida(color);
        ciclos++;
        if (ciclos >= 6) {
            clearInterval(interval);
            boca.classList.remove('boca-aberta');
            estaMastigando = false;
        }
    }, 250);
}

function criarParticulasComida(color) {
    const bocaRect = boca.getBoundingClientRect();
    for (let i = 0; i < 3; i++) {
        const p = document.createElement('div');
        p.classList.add('particula-comida');
        p.style.backgroundColor = color;
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

    // Lógica de Sujeira Dinâmica (Manchas no corpo)
    // As manchas surgem abaixo de 35%, mas agora SÓ saem com o sabonete
    const targetSpots = status.limpeza > 35 ? 0 : Math.floor((35 - status.limpeza) / 2.5);
    let currentSpots = corpoMask.querySelectorAll('.mancha-sujeira');

    // Só adicionamos manchas se o número atual for menor que o alvo (sujeira acumulando)
    if (currentSpots.length < targetSpots) {
        while (currentSpots.length < targetSpots) {
            adicionarUmaMancha();
            currentSpots = corpoMask.querySelectorAll('.mancha-sujeira');
        }
    }
}

function adicionarUmaMancha() {
    const mancha = document.createElement('div');
    mancha.classList.add('mancha-sujeira');
    const tamanho = Math.random() * 40 + 20;
    mancha.style.width = `${tamanho}px`;
    mancha.style.height = `${tamanho * 0.8}px`;
    mancha.style.left = `${Math.random() * 80 + 10}%`;
    mancha.style.top = `${Math.random() * 60 + 20}%`;
    mancha.style.transform = `rotate(${Math.random() * 360}deg)`;
    mancha.dataset.health = 1.0; // 100% de opacidade/sujeira
    corpoMask.appendChild(mancha);
}

function updateIconFill(id, value) {
    const fillElement = document.getElementById(`fill-${id}`);
    if (fillElement) {
        let displayValue = value;
        if (id === 'limpeza') {
            displayValue = calcularHigieneReal(value);
        }
        const percentage = 100 - displayValue;
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

    // Humor cai gradualmente, e cai mais rápido se as necessidades básicas estiverem críticas
    let humorDecay = 0.3;
    if (status.fome < 20 || status.energia < 20 || status.limpeza < 20) humorDecay = 1.5;
    status.humor = Math.max(0, status.humor - humorDecay);

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
            const bolhas = Array.from(document.querySelectorAll('.bolha:not(.limpando)'));
            if (bolhas.length > 0) {
                // Ordena por posição 'top' para limpar de cima para baixo
                bolhas.sort((a, b) => parseFloat(a.style.top) - parseFloat(b.style.top));
                
                // Limpa as 2 bolhas mais altas de cada vez para um efeito mais fluido
                bolhas.slice(0, 2).forEach(b => {
                    b.classList.add('limpando');
                    setTimeout(() => b.remove(), 600);
                });
            }
            // A água do chuveiro limpa o pet gradualmente mesmo sem sabonete
            if (status.limpeza < 100) {
                status.limpeza = Math.min(100, status.limpeza + 0.3);
                updateStatusUI();
            }
        }, 50); 
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
let lastMouseX, lastMouseY, velocityX = 0, velocityY = 0;
let ballPosX = 0, ballPosY = 0;
let physicsActive = false;
let lastTime;

sabonete.addEventListener('mousedown', startDrag);
sabonete.addEventListener('touchstart', startDrag, { passive: false });
maca.addEventListener('mousedown', startDrag);
maca.addEventListener('touchstart', startDrag, { passive: false });
bolinha.addEventListener('mousedown', startDrag);
bolinha.addEventListener('touchstart', startDrag, { passive: false });

function startDrag(e) {
    if (estaMastigando && e.currentTarget.id === 'maca') return;
    e.stopPropagation(); // Impede que o arraste do sabonete mova a tela
    isDragging = true;
    draggingElement = e.currentTarget;

    // Detecta se é touch ou mouse
    const clientX = e.type === 'touchstart' ? e.touches[0].clientX : e.clientX;
    const clientY = e.type === 'touchstart' ? e.touches[0].clientY : e.clientY;
    
    lastMouseX = clientX;
    lastMouseY = clientY;
    lastTime = performance.now();
    velocityX = 0; velocityY = 0;

    // Captura a posição atual do elemento para um arraste relativo (sem pulos)
    const matrix = new DOMMatrixReadOnly(window.getComputedStyle(draggingElement).transform);
    startX = clientX - matrix.m41;
    startY = clientY - matrix.m42;
    
    draggingElement.style.transition = 'none';
    draggingElement.style.cursor = 'grabbing';
    bolinha.classList.remove('quicando');
    physicsActive = false; // Interrompe a física enquanto arrasta
}

document.addEventListener('mousemove', drag);
document.addEventListener('touchmove', drag, { passive: false });

function drag(e) {
    if (!isDragging) return;
    if (e.cancelable) e.preventDefault();

    const clientX = e.type === 'touchmove' ? e.touches[0].clientX : e.clientX;
    const clientY = e.type === 'touchmove' ? e.touches[0].clientY : e.clientY;
    
    // Calcula velocidade do arraste
    const now = performance.now();
    const dt = now - lastTime;
    if (dt > 0) {
        velocityX = (clientX - lastMouseX) / dt;
        velocityY = (clientY - lastMouseY) / dt;
    }
    lastMouseX = clientX;
    lastMouseY = clientY;
    lastTime = now;

    const dx = clientX - startX;
    const dy = clientY - startY;

    if (draggingElement.id === 'bolinha') {
        // Limita horizontalmente pelas paredes da sala
        const constrainedX = Math.max(20, Math.min(window.innerWidth - 20, clientX));
        const finalDX = constrainedX - startX;
        
        ballPosX = finalDX;
        ballPosY = dy;
        
        atualizarBolinha(constrainedX, clientY, ballPosX, ballPosY);
        moverOlhos(constrainedX, clientY);
        return;
    }

    moverOlhos(clientX, clientY);
    draggingElement.style.transform = `translate(${dx}px, ${dy}px)`;

    // Lógica de deixar espuma apenas para o sabonete
    if (draggingElement.id === 'sabonete') {
        verificarColisaoSabonete(clientX, clientY);
    } else if (draggingElement.id === 'maca') {
        verificarColisaoMacaComBoca(clientX, clientY);
    }
}

function atualizarBolinha(x, y, dx, dy, verificarColisao = true) {
    const horizon = window.innerHeight * 0.7; // Onde a parede encontra o chão

    // Profundidade: Só diminui a escala se estiver na área do chão
    // Se estiver acima do horizonte (na parede), mantém a escala mínima de profundidade
    let scale = 0.65;
    if (y > horizon) {
        const floorHeight = window.innerHeight * 0.3;
        const ratio = (y - horizon) / floorHeight;
        scale = 0.65 + (ratio * 0.45);
    }

    bolinha.style.transform = `translate(${dx}px, ${dy}px) scale(${scale})`;
    bolinha.style.zIndex = "25"; // Sempre à frente do pet (20)
    bolinha.style.setProperty('--ball-scale', scale);
    bolinha.style.setProperty('--ball-dx', `${dx}px`);
    bolinha.style.setProperty('--ball-dy', `${dy}px`);
}

function aplicarElasticidade(dx, dy, scale) {
    bolinha.style.setProperty('--ball-dx', `${dx}px`);
    bolinha.style.setProperty('--ball-dy', `${dy}px`);
    bolinha.style.setProperty('--ball-scale', scale);
    bolinha.classList.add('quicando');
    setTimeout(() => {
        bolinha.classList.remove('quicando');
    }, 400);
}

function realizarRicocheteBolinha(x, y) {
    const lumoRect = lumo.getBoundingClientRect();
    if (!bodyImgLoaded) return;

    const localX = (x - lumoRect.left) * (bodyCollisionCanvas.width / lumoRect.width);
    const localY = (y - lumoRect.top) * (bodyCollisionCanvas.height / lumoRect.height);

    if (localX >= 0 && localX < bodyCollisionCanvas.width && localY >= 0 && localY < bodyCollisionCanvas.height) {
        const pixel = bodyCollisionCtx.getImageData(Math.floor(localX), Math.floor(localY), 1, 1).data;
        
        if (pixel[3] > 10) { 
            const hitHead = localY < bodyCollisionCanvas.height * 0.4;
            velocityX = (x < lumoRect.left + lumoRect.width / 2) ? -15 : 15;
            velocityY = hitHead ? -12 : -5;

            status.humor = Math.min(100, status.humor + 8);
            updateStatusUI();
            if (!physicsActive) loopFisicaBolinha();
            return true;
        }
    }
    return false;
}

function loopFisicaBolinha() {
    if (!physicsActive) return;

    const gravity = 0.8;
    const friction = 0.98;
    const bounce = 0.7;
    
    velocityY += gravity;
    ballPosX += velocityX;
    ballPosY += velocityY;

    // Limites de tela (Paredes)
    const margin = 30;
    const screenW = window.innerWidth;
    const screenH = window.innerHeight;
    const currentX = ballPosX + startX; // X absoluto
    const currentY = ballPosY + startY; // Y absoluto

    // Colisão Paredes Laterais
    if (currentX < margin) {
        ballPosX = margin - startX;
        velocityX *= -bounce;
    } else if (currentX > screenW - margin) {
        ballPosX = (screenW - margin) - startX;
        velocityX *= -bounce;
    }

    // Colisão Teto
    if (currentY < margin) {
        ballPosY = margin - startY;
        velocityY *= -bounce;
    }

    // Colisão Chão
    const floorY = screenH * 0.88;
    if (currentY > floorY) {
        ballPosY = floorY - startY;
        velocityY *= -bounce;
        velocityX *= friction; // Atrito no chão
        
        if (Math.abs(velocityY) > 2) aplicarElasticidade(ballPosX, ballPosY, parseFloat(bolinha.style.getPropertyValue('--ball-scale')));
    }

    // Para a física se a bola parar
    if (Math.abs(velocityY) < 0.5 && Math.abs(velocityX) < 0.5 && currentY > floorY - 5) {
        physicsActive = false;
        resetarOlhos(); // Lumo para de olhar para a bolinha
        return;
    }

    atualizarBolinha(currentX, currentY, ballPosX, ballPosY);
    
    // Enquanto voa, o pet segue com os olhos
    moverOlhos(currentX, currentY);

    // Verifica colisão com pet em tempo real durante o voo
    realizarRicocheteBolinha(currentX, currentY);

    requestAnimationFrame(loopFisicaBolinha);
}

function verificarColisaoSabonete(x, y) {
    const lumoRect = lumo.getBoundingClientRect();

    if (!bodyImgLoaded) return;

    // Mapeia a posição global do mouse/touch para a coordenada local do pet (0 a 260, 0 a 220)
    const localX = (x - lumoRect.left) * (bodyCollisionCanvas.width / lumoRect.width);
    const localY = (y - lumoRect.top) * (bodyCollisionCanvas.height / lumoRect.height);

    // Verifica se está dentro dos limites do elemento
    if (localX >= 0 && localX < bodyCollisionCanvas.width && localY >= 0 && localY < bodyCollisionCanvas.height) {
        // Obtém os dados do pixel (RGBA) na posição atual
        const pixel = bodyCollisionCtx.getImageData(Math.floor(localX), Math.floor(localY), 1, 1).data;
        const isOverColoredPart = pixel[3] > 10; // Verifica se o Alpha (transparência) é maior que 10

        if (isOverColoredPart) {
            // 1. Cria bolhas
            const olhosRect = olhosContainer.getBoundingClientRect();
            const size = Math.random() * 15 + 10;
            const bolha = document.createElement('div');
            bolha.classList.add('bolha');
            bolha.style.width = `${size}px`;
            bolha.style.height = `${size}px`;
            bolha.style.left = `${x - lumoRect.left - size / 2}px`;
            bolha.style.top = `${y - lumoRect.top - size / 2}px`;
            espumaContainer.appendChild(bolha);

            // 2. Limpa manchas de sujeira (esfregada persistente)
            const manchas = corpoMask.querySelectorAll('.mancha-sujeira');
            manchas.forEach(mancha => {
                const mRect = mancha.getBoundingClientRect();
                // Se o sabonete está sobre a mancha
                if (x > mRect.left && x < mRect.right && y > mRect.top && y < mRect.bottom) {
                    let health = parseFloat(mancha.dataset.health);
                    health -= 0.04; // Velocidade da limpeza ao esfregar
                    mancha.dataset.health = health;
                    mancha.style.opacity = health;
                    mancha.style.transform = `rotate(${Math.random() * 360}deg) scale(${0.8 + health * 0.2})`;

                    if (health <= 0) {
                        mancha.remove();
                        // Aumenta o status base quando uma mancha é removida
                        status.limpeza = Math.min(100, status.limpeza + 5);
                    }
                }
            });
            
            updateStatusUI();
        }
    }
}

// Nova lógica: Higiene só é 100% se não houver manchas nem bolhas
function calcularHigieneReal(valorBase) {
    const temManchas = corpoMask.querySelectorAll('.mancha-sujeira').length > 0;
    const temBolhas = document.querySelectorAll('.bolha').length > 0;

    if (temManchas || temBolhas) {
        return Math.min(valorBase, 95); // Trava em 95% enquanto houver sujeira ou sabão
    }
    return valorBase;
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
    
    if (estaDormindo) {
        sleepOverlay.classList.add('active');
        olhoEsq.classList.add('fechado');
        olhoDir.classList.add('fechado');
        intervalZ = setInterval(criarZ, 1200);
    } else {
        sleepOverlay.classList.remove('active');
        clearInterval(intervalZ);
        
        if (!estaChovendo) {
            olhoEsq.classList.remove('fechado');
            olhoDir.classList.remove('fechado');
        }
    }
    atualizarPosicaoPet();
});

function atualizarPosicaoPet() {
    if (estaDormindo) {
        // Se está dormindo, fixa a posição no quarto (Room 3)
        // O offset é a diferença entre o quarto e o cômodo atual
        const offset = (3 - currentRoom) * window.innerWidth;
        lumoWrapper.style.transform = `translateX(calc(-50% + ${offset}px))`;
    } else {
        // Se está acordado, fica sempre centralizado na tela
        lumoWrapper.style.transform = 'translateX(-50%)';
    }
}

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
            
            return;
        }
    }

    // Lógica de queda da bolinha
    if (draggingElement && draggingElement.id === 'bolinha') {
        const currentTransform = window.getComputedStyle(bolinha).transform;
        const matrix = new DOMMatrixReadOnly(currentTransform);

        // Resetar o olhar ao soltar a bola
        resetarOlhos();

        // Aplica o impulso inicial (multiplicador de força do lançamento)
        velocityX *= 20;
        velocityY *= 20;

        physicsActive = true;
        loopFisicaBolinha();

        isDragging = false;
        return;
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
    
    resetarOlhos();

    draggingElement.style.transition = 'transform 0.3s ease-out';
    draggingElement.style.transform = 'translate(0, 0)'; // Volta à origem
    draggingElement.style.cursor = 'grab';
    draggingElement = null;
}

function resetarOlhos() {
    olhoEsq.style.setProperty('--pupil-x', '0px');
    olhoEsq.style.setProperty('--pupil-y', '0px');
    olhoDir.style.setProperty('--pupil-x', '0px');
    olhoDir.style.setProperty('--pupil-y', '0px');
}

// Lógica para trocar de cômodo arrastando a tela
document.getElementById('game-container').addEventListener('mousedown', (e) => {
    // Se clicar na loja ou estiver arrastando item, ignora troca de quarto
    if (isDragging || e.target.closest('#shop-overlay') || e.target.closest('.bolinha')) return;
    startXRoom = e.clientX;
    isDraggingRoom = true;
});

document.getElementById('game-container').addEventListener('touchstart', (e) => {
    if (isDragging || e.target.closest('#shop-overlay') || e.target.closest('.bolinha')) return;
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
    // Reseta a bolinha se sair da sala (1)
    if (previousRoom === 1 && currentRoom !== 1) {
        resetBolinhaPosition();
    }
    atualizarPosicaoPet();

    mundo.style.left = `-${currentRoom * window.innerWidth}px`;
    updateStatusBarColor();
}

updateStatusBarColor(); // Define a cor inicial
updateStatusUI(); // Inicializa os ícones cheios

// Exemplo: Customização Aleatória ao carregar
customizarPet(
    Math.floor(Math.random() * bodyTypes.length),
    Math.floor(Math.random() * 20),
    Math.floor(Math.random() * 20),
    Math.floor(Math.random() * 20),
    Math.floor(Math.random() * 4) // Sorteia entre os primeiros padrões implementados
);

// Função para resetar a posição da bolinha
function resetBolinhaPosition() {
    ballPosX = 0;
    ballPosY = 0;
    velocityX = 0;
    velocityY = 0;
    physicsActive = false;
    bolinha.classList.remove('quicando');
    bolinha.style.transition = 'none'; // Remove transições para resetar instantaneamente
    bolinha.style.transform = 'translateX(-50%)'; // Posição inicial CSS
    atualizarBolinha(window.innerWidth / 2, window.innerHeight * 0.95, ballPosX, ballPosY); // Atualiza escala e variáveis CSS
    resetarOlhos();
}

console.log("Lumo carregado! Aguardando assets para substituição.");