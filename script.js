const olhoEsq = document.getElementById('olho-esq');
const olhoDir = document.getElementById('olho-dir');
const sabonete = document.getElementById('sabonete');
const maca = document.getElementById('maca');
const lumo = document.getElementById('lumo');
const boca = document.getElementById('boca'); // Adicionado: Referência ao elemento da boca
const olhosContainer = document.querySelector('.olhos-container');
const espumaContainer = document.querySelector('.espuma-container');
const mundo = document.getElementById('mundo');

let currentRoom = 0; // 0: Banheiro, 1: Sala, 2: Cozinha
let startXRoom = 0;
let isDraggingRoom = false;
let draggingElement = null; // Armazena qual item está sendo arrastado

let estaChovendo = false;
let intervaloAgua, intervaloLimpeza;

// Função para fazer o Lumo piscar
function piscar() {
    if (estaChovendo) return; // Não pisca se já estiver de olhos fechados pela chuva

    olhoEsq.classList.add('fechado');
    olhoDir.classList.add('fechado');

    setTimeout(() => {
        if (estaChovendo) return; // Se começou a chover durante o piscar, mantém fechado
        
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
        // Para a água
        clearInterval(intervaloAgua);
        clearInterval(intervaloLimpeza);
        
        olhoEsq.classList.remove('fechado');
        olhoDir.classList.remove('fechado');
    }
});

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

// Nova função: Verifica colisão da maçã com a boca
function verificarColisaoMacaComBoca(x, y) {
    const bocaRect = boca.getBoundingClientRect();
    // Verifica se a maçã está sobre a boca
    if (x > bocaRect.left && x < bocaRect.right && y > bocaRect.top && y < bocaRect.bottom) {
        boca.classList.add('boca-aberta');
    } else {
        boca.classList.remove('boca-aberta');
    }
}

document.addEventListener('mouseup', endDrag);
document.addEventListener('touchend', endDrag);

function endDrag() {
    if (!isDragging) return;
    isDragging = false;
    
    // Garante que a boca feche se a maçã for solta
    boca.classList.remove('boca-aberta');
    
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

    if (diffX > 50 && currentRoom < 2) currentRoom++; // Arrastou para a esquerda -> Próximo cômodo
    if (diffX < -50 && currentRoom > 0) currentRoom--; // Arrastou para a direita -> Cômodo anterior

    mundo.style.left = `-${currentRoom * 360}px`;
}

console.log("Lumo carregado! Aguardando assets para substituição.");