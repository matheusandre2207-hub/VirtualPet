const olhoEsq = document.getElementById('olho-esq');
const olhoDir = document.getElementById('olho-dir');
const sabonete = document.getElementById('sabonete');
const maca = document.getElementById('maca');
const lumo = document.getElementById('lumo');
const boca = document.getElementById('boca'); // Adicionado: Referência ao elemento da boca
const olhosContainer = document.querySelector('.olhos-container');
const espumaContainer = document.querySelector('.espuma-container');
const mundo = document.getElementById('mundo');
const abajur = document.getElementById('abajur');
const sleepOverlay = document.getElementById('sleep-overlay');
const zContainer = document.querySelector('.z-container');

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

function updateStatusBarColor() {
    const metaThemeColor = document.getElementById('theme-color');
    if (metaThemeColor) {
        metaThemeColor.setAttribute('content', roomColors[currentRoom]);
    }
}

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
    const padding = 50; // Aumenta a área de contato em 50px para facilitar a interação
    if (x > bocaRect.left - padding && x < bocaRect.right + padding && 
        y > bocaRect.top - padding && y < bocaRect.bottom + padding) {
        boca.classList.add('boca-aberta');
    } else {
        boca.classList.remove('boca-aberta');
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

function endDrag() {
    if (!isDragging) return;
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
console.log("Lumo carregado! Aguardando assets para substituição.");