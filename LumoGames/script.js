document.addEventListener('DOMContentLoaded', () => {
    // Resolve o erro 404 do favicon injetando um ícone transparente via Data URI
    const favicon = document.createElement('link');
    favicon.rel = 'icon';
    favicon.href = 'data:image/x-icon;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';
    document.head.appendChild(favicon);

    const cards = document.querySelectorAll('.game-card');
    const overlay = document.getElementById('game-overlay');
    const closeBtn = document.getElementById('close-game');
    const exitBtn = document.getElementById('exit-portal');
    const container = document.getElementById('game-canvas-container');
    let animationId = null;
    let isPausedGlobal = false; // Flag para pausar jogos durante confirmação

    // Variáveis globais para armazenar a customização do Lumo do pet principal
    let playerLumoColor = '#4a90e2'; // Cor padrão se não receber mensagem
    let playerLumoHasDots = false; // Padrão de pontos do Lumo principal

    // Listener para receber mensagens do iframe pai (para customização do Lumo)
    window.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'lumoCustomization') {
            playerLumoColor = event.data.color;
            playerLumoHasDots = event.data.hasDots;
            console.log('Lumo.io: Customização recebida do Lumo principal:', playerLumoColor, 'com pontos:', playerLumoHasDots);
        }
    });

    // Função global para adicionar moedas a partir de qualquer minijogo
    function rewardCoins(amount) {
        if (amount <= 0) return;
        window.parent.postMessage({ type: 'addCoins', amount: Math.floor(amount) }, '*');
    }

    // Função utilitária para escurecer uma cor (centralizada para todos os jogos)
    function darkenColor(color, percent) {
        if (color.startsWith('hsl')) {
            const parts = color.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
            if (parts) {
                let h = parseInt(parts[1]);
                let s = parseInt(parts[2]);
                let l = parseInt(parts[3]);
                l = Math.max(0, l - l * percent);
                return `hsl(${h}, ${s}%, ${l}%)`;
            }
        }
        if (color.startsWith('#')) {
            let r = parseInt(color.slice(1, 3), 16);
            let g = parseInt(color.slice(3, 5), 16);
            let b = parseInt(color.slice(5, 7), 16);
            r = Math.max(0, r - r * percent); g = Math.max(0, g - g * percent); b = Math.max(0, b - b * percent);
            return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
        }
        return `rgba(0, 0, 0, 0.2)`; 
    }

    // Mapeamento dos Jogos
    const games = {
        slither: (container) => initLumoIO(container),
        citybloxx: (container) => initLumoTower(container),
        snake: (container) => initSnake(container),
        flappy: (container) => initFlappy(container),
        match3: (container) => initLumoCrush(container),
        slice: (container) => initLumoSlice(container),
        word: (container) => initLumoWord(container),
        galaxy: (container) => initLumoGalaxy(container),
        memory: (container) => initMemory(container),
        bubbles: (container) => initBubbles(container),
        jump: (container) => initLumoJump(container),
        simon: (container) => initLumoSimon(container)
    };

    // Adiciona evento de clique em cada card
    cards.forEach(card => {
        card.addEventListener('click', () => {
            const gameKey = card.getAttribute('data-game');
            openGame(gameKey);
        });
    });

    // --- Sistema de Navegação por Gesto de Voltar e Confirmação ---
    function showExitConfirmation() {
        if (isPausedGlobal) return;
        isPausedGlobal = true;

        const overlayDiv = document.createElement('div');
        overlayDiv.id = 'exit-confirm-overlay';
        overlayDiv.style = "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.85);display:flex;justify-content:center;align-items:center;z-index:9999;font-family:'Segoe UI',sans-serif;backdrop-filter:blur(5px);";
        
        const box = document.createElement('div');
        box.style = "background:#2f3640;padding:30px;border-radius:20px;text-align:center;border:2px solid #4a90e2;box-shadow:0 10px 30px rgba(0,0,0,0.5);";
        box.innerHTML = `
            <p style="color:white;margin-bottom:25px;font-size:20px;font-weight:bold;">Deseja sair realmente?</p>
            <div style="display:flex;gap:15px;justify-content:center;">
                <button id="confirm-exit-yes" style="background:#ff4757;color:white;border:none;padding:12px 25px;border-radius:10px;font-weight:bold;cursor:pointer;font-size:16px;">SAIR</button>
                <button id="confirm-exit-no" style="background:#2ed573;color:white;border:none;padding:12px 25px;border-radius:10px;font-weight:bold;cursor:pointer;font-size:16px;">FICAR</button>
            </div>
        `;
        overlayDiv.appendChild(box);
        document.body.appendChild(overlayDiv);

        document.getElementById('confirm-exit-yes').onclick = () => {
            overlayDiv.remove(); isPausedGlobal = false;
            overlay.classList.add('hidden');
            if (exitBtn) exitBtn.classList.remove('hidden');
            container.innerHTML = "";
            if (animationId) cancelAnimationFrame(animationId);
        };

        document.getElementById('confirm-exit-no').onclick = () => {
            overlayDiv.remove(); isPausedGlobal = false;
            history.pushState(null, null, location.href); // Restaura o estado para interceptar novamente
        };
    }

    // Inicializa o trap de histórico para simular o gesto de voltar
    history.pushState(null, null, location.href);
    window.addEventListener('popstate', () => {
        if (!overlay.classList.contains('hidden')) {
            showExitConfirmation();
        } else {
            window.parent.postMessage('closeArcade', '*');
        }
    });

    function openGame(key) {
        history.pushState({game: key}, null, location.href);
        overlay.classList.remove('hidden');
        if (exitBtn) exitBtn.classList.add('hidden'); // Esconde o X do portal ao abrir o jogo
        container.innerHTML = "";
        const selectedGame = games[key];
        if (typeof selectedGame === 'function') {
            const result = selectedGame(container);
            if (typeof result === 'string') {
                container.innerHTML = `<h2 style="color:white">${result}</h2>
                                       <p style="color:gray">Em desenvolvimento...</p>`;
            }
        }
    }

    // Lógica para o botão de sair do portal (Página Inicial)
    if (exitBtn) {
        exitBtn.addEventListener('click', () => {
            window.parent.postMessage('closeArcade', '*');
        });
    }

    closeBtn.addEventListener('click', () => {
        overlay.classList.add('hidden');
        if (exitBtn) exitBtn.classList.remove('hidden'); // Mostra o X do portal ao fechar o jogo
        container.innerHTML = "";
        if (animationId) cancelAnimationFrame(animationId);
    });

    // --- MOTOR DO JOGO LUMO.IO ---
    function initLumoIO(container) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        container.appendChild(canvas);

        const WORLD_SIZE = 3000;
        const SEGMENT_DISTANCE = 5; // Distância fixa entre pontos do rastro para efeito de corda
        const JOYSTICK_RADIUS = 60;
        const JOYSTICK_BASE_X = canvas.width / 2;
        const JOYSTICK_BASE_Y = canvas.height - 100;

        let mouse = { x: canvas.width / 2, y: canvas.height / 2, pressed: false, isDoubleHold: false };
        let joystick = { x: JOYSTICK_BASE_X, y: JOYSTICK_BASE_Y, active: false, angle: 0 };
        let player, snakes, foods;
        let lastClickTime = 0;
        let commonFoodCounter = 0;

        function addCoins(amount) {
            window.parent.postMessage({ type: 'addCoins', amount: amount }, '*');
        }

        const handleInput = (clientX, clientY) => {
            const now = Date.now();
            if (now - lastClickTime < 300) {
                mouse.isDoubleHold = true;
            }
            lastClickTime = now;

            if (player && !player.alive) {
                const btnX = canvas.width / 2;
                const btnY = canvas.height / 2 + 60;
                // Detecta clique na área do botão de reiniciar
                if (Math.abs(clientX - btnX) < 80 && Math.abs(clientY - btnY) < 25) {
                    resetGame();
                    return true;
                }
            }
            return false;
        };

        const updateJoystick = (clientX, clientY) => {
            const dx = clientX - JOYSTICK_BASE_X;
            const dy = clientY - JOYSTICK_BASE_Y;
            const dist = Math.hypot(dx, dy);
            
            if (dist > 0) {
                joystick.angle = Math.atan2(dy, dx);
                joystick.active = true;
                const limit = Math.min(dist, JOYSTICK_RADIUS);
                joystick.x = JOYSTICK_BASE_X + Math.cos(joystick.angle) * limit;
                joystick.y = JOYSTICK_BASE_Y + Math.sin(joystick.angle) * limit;
            }
        };

        const resetJoystick = () => {
            joystick.active = false;
            joystick.x = JOYSTICK_BASE_X;
            joystick.y = JOYSTICK_BASE_Y;
        };

        canvas.addEventListener('mousemove', e => { 
            if (mouse.pressed) updateJoystick(e.clientX, e.clientY);
        });

        canvas.addEventListener('mousedown', e => { 
            if (!handleInput(e.clientX, e.clientY)) {
                mouse.pressed = true;
                updateJoystick(e.clientX, e.clientY);
            }
        });

        window.addEventListener('mouseup', () => { 
            mouse.pressed = false; 
            mouse.isDoubleHold = false; 
            resetJoystick();
        });

        canvas.addEventListener('touchstart', e => {
            const touch = e.touches[0];
            if (handleInput(touch.clientX, touch.clientY)) e.preventDefault();
            else { 
                mouse.pressed = true; 
                updateJoystick(touch.clientX, touch.clientY);
                e.preventDefault(); 
            }
        }, {passive: false});

        window.addEventListener('touchend', () => { 
            mouse.pressed = false; 
            mouse.isDoubleHold = false; 
            resetJoystick();
        });

        canvas.addEventListener('touchmove', e => { 
            if (mouse.pressed) updateJoystick(e.touches[0].clientX, e.touches[0].clientY);
            e.preventDefault(); 
        }, {passive: false});

        class Food {
            constructor(x, y, color, size = 4) {
                this.x = x; this.y = y; this.color = color; this.size = size;
            }
            draw(ctx, cam) {
                ctx.fillStyle = this.color;
                ctx.beginPath();
                ctx.arc(this.x - cam.x, this.y - cam.y, this.size, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        class Snake {
            constructor(x, y, color, isBot = false, name = "Lumo") {
                this.x = x; this.y = y; this.color = color; this.isBot = isBot;
                this.name = name;
                this.angle = Math.random() * Math.PI * 2;
                this.speed = 2;
                this.radius = 12;
                // Bots começam com tamanhos aleatórios
                this.segmentsCount = isBot ? 10 + Math.random() * 50 : 15;
                
                this.boostTimeLeft = 10; // Segundos de boost disponíveis
                this.boostDebt = 0;      // Massa que precisa ser recuperada
                this.currentBoostSpent = 0; // Acumulador da sessão atual
                
                this.path = []; // Histórico de posições para interpolação suave
                this.wanderTarget = null;
                this.ambushTarget = null; // Alvo para cercar
                this.isBoosting = false;
                for (let i = 0; i < this.segmentsCount * SEGMENT_DISTANCE; i++) {
                    this.path.push({
                        x: x - Math.cos(this.angle) * i,
                        y: y - Math.sin(this.angle) * i
                    });
                }
                this.alive = true;
                // Timers para suavização da IA
                this.aiTimer = 0;
                this.aiTargetAngle = this.angle;
            }

            update(foods, snakes) {
                if (!this.alive) return;

                // 1. Controle de Movimentação 360°
                let targetAngle = this.angle;
                if (!this.isBot) {
                    if (joystick.active) {
                        targetAngle = joystick.angle;
                    } else {
                        targetAngle = this.angle;
                    }
                } else {
                    // IA decidindo apenas a cada X frames para evitar zigzag robótico
                    if (this.aiTimer <= 0) {
                        const aiResult = this.updateAI(foods, snakes);
                        this.aiTargetAngle = aiResult.angle;
                        this.isBoosting = aiResult.boost;
                        this.aiTimer = 10 + Math.random() * 15; // Mantém a decisão por um tempo
                    }
                    this.aiTimer--;
                    targetAngle = this.aiTargetAngle;
                }

                // Interpolação angular suave - Bots viram mais devagar para evitar zigzag
                let diff = targetAngle - this.angle;
                while (diff < -Math.PI) diff += Math.PI * 2;
                while (diff > Math.PI) diff -= Math.PI * 2;
                this.angle += diff * (this.isBot ? 0.06 : 0.12);

                // 2. Aceleração (Boost) com Dívida de Massa
                const wantsToBoost = this.isBot ? this.isBoosting : mouse.isDoubleHold;
                const canBoost = this.boostDebt <= 0 && this.segmentsCount > 8 && this.boostTimeLeft > 0;

                if (wantsToBoost && canBoost) {
                    this.isBoosting = true;
                    this.speed = 5;
                    this.boostTimeLeft -= 0.016; // Aprox. 1 frame a 60fps
                    const massLoss = 0.08;
                    this.segmentsCount -= massLoss;
                    this.currentBoostSpent += massLoss;
                    
                    // Deixa rastro de comida
                    if (Math.random() > 0.8) {
                        foods.push(new Food(this.path[this.path.length-1].x, this.path[this.path.length-1].y, this.color, 3));
                    }
                } else {
                    this.isBoosting = false;
                    this.speed = 2;
                    // Se parou de apertar ou o tempo acabou, a dívida é consolidada
                    if (this.currentBoostSpent > 0) {
                        this.boostDebt = this.currentBoostSpent;
                        this.currentBoostSpent = 0;
                    }
                    // Reseta o cronômetro apenas quando solta o botão
                    if (!wantsToBoost) this.boostTimeLeft = 10;
                }

                this.x += Math.cos(this.angle) * this.speed;
                this.y += Math.sin(this.angle) * this.speed;

                // 3. Física da Cauda (Interpolação por Rastro)
                this.path.unshift({x: this.x, y: this.y});
                const maxPath = Math.floor(this.segmentsCount * SEGMENT_DISTANCE);
                while (this.path.length > maxPath) this.path.pop();

                // 4. Colisão com Bordas
                if (this.x < 0 || this.x > WORLD_SIZE || this.y < 0 || this.y > WORLD_SIZE) this.die(foods);
            }

            updateAI(foods, snakes) {
                // 0. Evitar Bordas (Prioridade Máxima)
                const margin = 250;
                if (this.x < margin || this.x > WORLD_SIZE - margin || this.y < margin || this.y > WORLD_SIZE - margin) {
                    return { angle: Math.atan2(WORLD_SIZE/2 - this.y, WORLD_SIZE/2 - this.x), boost: true };
                }

                let dangerPoint = null;
                let sensorDist = 100;
                let shouldBoost = false;

                // 1. Detecção de Perigo (Evasão)
                for (const other of snakes) {
                    if (!other.alive || other === this) continue;
                    for (let i = 0; i < other.path.length; i += 12) {
                        const dist = Math.hypot(other.path[i].x - this.x, other.path[i].y - this.y);
                        if (dist < sensorDist) {
                            dangerPoint = other.path[i];
                            sensorDist = dist;
                        }
                    }
                }

                if (dangerPoint) {
                    this.ambushTarget = null;
                    this.wanderTarget = null; // Reseta alvo se estiver em perigo
                    // Se o perigo estiver muito perto da cabeça, ativa boost para fugir
                    if (sensorDist < 50) shouldBoost = true;
                    return { angle: Math.atan2(this.y - dangerPoint.y, this.x - dangerPoint.x), boost: shouldBoost };
                }

                // 2. Estratégia de Emboscada (Cercar menores)
                if (this.segmentsCount > 30) {
                    let potentialVictim = null;
                    for (const other of snakes) {
                        if (!other.alive || other === this) continue;
                        const dist = Math.hypot(other.x - this.x, other.y - this.y);
                        // Se for menor e estiver perto, tenta cercar
                        if (dist < 150 && other.segmentsCount < this.segmentsCount * 0.7) {
                            potentialVictim = other;
                            break;
                        }
                    }

                    if (potentialVictim) {
                        this.ambushTarget = potentialVictim;
                        // Para cercar, o bot tenta ir para a frente da vítima e curvar
                        const predictX = potentialVictim.x + Math.cos(potentialVictim.angle) * 60;
                        const predictY = potentialVictim.y + Math.sin(potentialVictim.angle) * 60;
                        shouldBoost = true; // Usa boost para fechar o cerco
                        return { angle: Math.atan2(predictY - this.y, predictX - this.x), boost: shouldBoost };
                    }
                }
                
                this.ambushTarget = null;

                // 3. Busca de Comida (Global)
                let targetFood = null;
                let maxWeight = -1;

                for (let i = 0; i < foods.length; i++) {
                    const f = foods[i];
                    const dist = Math.hypot(f.x - this.x, f.y - this.y);
                    const weight = f.size / (dist + 1);
                    if (weight > maxWeight) {
                        maxWeight = weight;
                        targetFood = f;
                    }
                }

                if (targetFood && maxWeight > 0.005) {
                    return { angle: Math.atan2(targetFood.y - this.y, targetFood.x - this.x), boost: false };
                }

                // 4. Vadiagem (Wander) - Se não houver nada perto, escolhe um ponto aleatório
                if (!this.wanderTarget || Math.hypot(this.x - this.wanderTarget.x, this.y - this.wanderTarget.y) < 50) {
                    this.wanderTarget = { x: Math.random() * WORLD_SIZE, y: Math.random() * WORLD_SIZE };
                }
                return { angle: Math.atan2(this.wanderTarget.y - this.y, this.wanderTarget.x - this.x), boost: false };
            }

            die(foods) {
                this.alive = false;
                // Transformar corpo em comida
                for (let i = 0; i < this.path.length; i += 10) {
                    foods.push(new Food(this.path[i].x, this.path[i].y, this.color, 5));
                }
            }

            draw(ctx, cam) {
                if (!this.alive) return;
                
                // Efeito Neon Pulsante ao Correr
                if (this.isBoosting) {
                    const pulse = Math.abs(Math.sin(Date.now() / 150));
                    ctx.shadowBlur = 15 + pulse * 20;
                    ctx.shadowColor = this.color;
                } else {
                    ctx.shadowBlur = 0;
                }

                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';
                ctx.strokeStyle = this.color;
                ctx.lineWidth = this.radius * 2;
                
                ctx.beginPath();
                ctx.moveTo(this.path[0].x - cam.x, this.path[0].y - cam.y);
                for(let i = 1; i < this.path.length; i++) {
                    ctx.lineTo(this.path[i].x - cam.x, this.path[i].y - cam.y);
                }
                ctx.stroke();
                
                ctx.shadowBlur = 0; // Reset para os olhos e HUD

                // Cabeça
                ctx.fillStyle = this.color;
                ctx.beginPath();
                ctx.arc(this.x - cam.x, this.y - cam.y, this.radius, 0, Math.PI * 2);
                ctx.fill();
                
                let nearestFood = null;
                let minDist = 300; // Raio de visão para os olhos se moverem
                for (const f of foods) {
                    const d = Math.hypot(f.x - this.x, f.y - this.y);
                    if (d < minDist) {
                        minDist = d;
                        nearestFood = f;
                    }
                }
                // Se não houver comida perto, olha para frente
                const lookAngle = nearestFood ? Math.atan2(nearestFood.y - this.y, nearestFood.x - this.x) : this.angle;

                const eyeSpacing = 0.8; // Ângulo de abertura dos olhos
                const eyeDist = this.radius * 0.5; // Distância do centro da cabeça
                
                [-1, 1].forEach(side => {
                    const ex = this.x - cam.x + Math.cos(this.angle + side * eyeSpacing) * eyeDist;
                    const ey = this.y - cam.y + Math.sin(this.angle + side * eyeSpacing) * eyeDist;
                    
                    ctx.fillStyle = 'white';
                    ctx.beginPath();
                    ctx.arc(ex, ey, 4, 0, Math.PI * 2);
                    ctx.fill();

                    const px = ex + Math.cos(lookAngle) * 1.5;
                    const py = ey + Math.sin(lookAngle) * 1.5;
                    ctx.fillStyle = 'black';
                    ctx.beginPath();
                    ctx.arc(px, py, 2, 0, Math.PI * 2);
                    ctx.fill();
                });
            }
        }

        function resetGame() {
            const BOT_NAMES = ["StarHunter", "Cosmos", "Nebula", "Void", "Supernova", "Quasar", "Orbit", "Gravity", "Pulsar", "Asteroid", "Meteor", "Comet", "Zenith", "Eclipse", "Galaxy"];

            // Player snake uses the color and dot pattern received from the main Lumo pet
            player = new Snake(WORLD_SIZE/2, WORLD_SIZE/2, playerLumoColor, false, "Você");
            snakes = [player];

            // Gerar um pool de aparências únicas para os bots
            const botColors = new Set();
            const numBots = 15;
            while (botColors.size < numBots) {
                // Cores HSL aleatórias com saturação e luminosidade variadas
                const botColor = `hsl(${Math.floor(Math.random()*360)}, ${Math.floor(70 + Math.random()*20)}%, ${Math.floor(50 + Math.random()*10)}%)`;
                
                // Garante que os bots sejam diferentes do player e entre si
                if (!botColors.has(botColor) && botColor !== playerLumoColor) { 
                    botColors.add(botColor);
                }
            }

            const uniqueBotColors = Array.from(botColors);

            for(let i=0; i<15; i++) {
                const color = uniqueBotColors[i % uniqueBotColors.length];
                const name = BOT_NAMES[i % BOT_NAMES.length];
                snakes.push(new Snake(200 + Math.random()*(WORLD_SIZE-400), 200 + Math.random()*(WORLD_SIZE-400), color, true, name));
            }
            foods = [];
            for(let i=0; i<400; i++) {
                foods.push(new Food(Math.random()*WORLD_SIZE, Math.random()*WORLD_SIZE, '#fff'));
            }
            mouse.pressed = false;
        }

        resetGame();

        function gameLoop() {
            if (isPausedGlobal) { animationId = requestAnimationFrame(gameLoop); return; }
            ctx.fillStyle = '#1a1a1a';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Sistema de Câmera e Zoom Suave
            const targetZoom = Math.max(0.4, 1 - (player.segmentsCount - 15) * 0.005);
            const cam = {
                x: player.x - (canvas.width / 2) / targetZoom,
                y: player.y - (canvas.height / 2) / targetZoom,
                zoom: targetZoom
            };

            ctx.save();
            ctx.scale(cam.zoom, cam.zoom);

            // Grid de fundo
            ctx.strokeStyle = '#333';
            ctx.beginPath();
            for(let i=0; i<=WORLD_SIZE; i+=100) {
                ctx.moveTo(i - cam.x, -cam.y); ctx.lineTo(i - cam.x, WORLD_SIZE - cam.y);
                ctx.moveTo(-cam.x, i - cam.y); ctx.lineTo(WORLD_SIZE - cam.x, i - cam.y);
            }
            ctx.stroke();

            // Desenhar Comidas (Otimizado)
            foods.forEach(f => f.draw(ctx, cam));

            // Lógica de Cobras
            snakes.forEach(s => {
                if (!s.alive) return;
                s.update(foods, snakes);

                // Comer: Agora todos os NPCs podem comer
                for (let i = 0; i < foods.length; i++) {
                    const f = foods[i];
                    if (Math.hypot(f.x - s.x, f.y - s.y) < s.radius + 15) {
                        const gain = (f.size === 5 ? 1.2 : 0.6);
                        s.segmentsCount += gain;
                        
                        if (!s.isBot) {
                            if (f.size === 5) addCoins(1); // Restos do corpo
                            else {
                                commonFoodCounter++;
                                if (commonFoodCounter >= 25) { addCoins(1); commonFoodCounter = 0; }
                            }
                        }
                        
                        // Paga a dívida de boost ao comer
                        if (s.boostDebt > 0) {
                            s.boostDebt = Math.max(0, s.boostDebt - gain);
                        }
                        
                        foods[i] = new Food(Math.random()*WORLD_SIZE, Math.random()*WORLD_SIZE, '#fff');
                    }
                }

                // Colisões de Morte (Cabeça vs Outros Corpos)
                snakes.forEach(other => {
                    if (!other.alive || s === other) return; // Permite auto-colisão e corpo com corpo
                    
                    for (let j = 0; j < other.path.length; j += 10) {
                        const d = Math.hypot(s.x - other.path[j].x, s.y - other.path[j].y);
                        if (d < s.radius + other.radius * 0.5) {
                            s.die(foods);
                            break;
                        }
                    }
                });

                s.draw(ctx, cam);
            });

            ctx.restore();

            // Desenhar Analógico (HUD)
            ctx.globalAlpha = 0.5;
            ctx.beginPath();
            ctx.arc(JOYSTICK_BASE_X, JOYSTICK_BASE_Y, JOYSTICK_RADIUS, 0, Math.PI * 2);
            ctx.fillStyle = '#444';
            ctx.fill();
            ctx.beginPath();
            ctx.arc(joystick.x, joystick.y, 30, 0, Math.PI * 2);
            ctx.fillStyle = '#888';
            ctx.fill();
            ctx.globalAlpha = 1.0;

            // 1. Placar de Líderes (Leaderboard) - Superior Direito
            const leaderboard = [...snakes]
                .filter(s => s.alive)
                .sort((a, b) => b.segmentsCount - a.segmentsCount);

            ctx.save();
            ctx.textAlign = 'left';
            ctx.font = '13px Segoe UI';
            leaderboard.slice(0, 5).forEach((s, i) => {
                ctx.fillStyle = s === player ? '#2ed573' : 'white';
                ctx.globalAlpha = 0.8;
                const displayName = s === player ? "VOCÊ" : s.name.toUpperCase();
                ctx.fillText(`${i + 1}. ${displayName}`, canvas.width - 190, 30 + i * 18);
                ctx.textAlign = 'right';
                ctx.fillText(Math.floor(s.segmentsCount), canvas.width - 30, 30 + i * 18);
                ctx.textAlign = 'left';
            });
            ctx.restore(); ctx.globalAlpha = 1;

            // 2. Minimapa - Superior Esquerdo
            const miniSize = 100;
            const miniPad = 20;
            const mx = miniPad;
            const my = miniPad;

            ctx.save();
            ctx.translate(mx, my);
            ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
            ctx.beginPath(); ctx.arc(miniSize/2, miniSize/2, miniSize/2, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)'; ctx.lineWidth = 2; ctx.stroke();

            snakes.forEach(s => {
                if (!s.alive) return;
                const px = (s.x / WORLD_SIZE) * miniSize;
                const py = (s.y / WORLD_SIZE) * miniSize;
                ctx.fillStyle = s === player ? 'white' : s.color;
                ctx.beginPath();
                ctx.arc(px, py, s === player ? 3 : 1.5, 0, Math.PI * 2);
                ctx.fill();
                if (s === player) { ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.stroke(); }
            });
            ctx.restore();

            if (!player.alive) {
                ctx.fillStyle = "rgba(0,0,0,0.85)";
                ctx.fillRect(0,0, canvas.width, canvas.height);
                
                ctx.fillStyle = "white";
                ctx.textAlign = "center";
                ctx.font = "bold 32px Segoe UI";
                ctx.fillText("FIM DE JOGO", canvas.width/2, canvas.height/2 - 20);

                // Desenha o botão de reiniciar
                ctx.fillStyle = "#4a90e2";
                ctx.fillRect(canvas.width/2 - 80, canvas.height/2 + 35, 160, 50);
                ctx.fillStyle = "white";
                ctx.font = "bold 18px Segoe UI";
                ctx.fillText("REINICIAR ↻", canvas.width/2, canvas.height/2 + 67);
            }

            animationId = requestAnimationFrame(gameLoop);
        }
        gameLoop();
    }

    // --- MOTOR DO JOGO LUMO TOWER (CITY BLOXX CLONE) ---
    function initLumoTower(container) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        container.appendChild(canvas);

        let state = 'playing'; // 'playing' ou 'gameover'
        let score = 0;
        let cameraY = 0;
        let targetCameraY = 0;
        let blocks = [];
        let combo = 0;

        const BLOCK_W = 120;
        const BLOCK_H = 120;
        const colors = ['#FF5E5E', '#FFB85E', '#FFEE5E', '#5EFF89', '#5E89FF', '#B85EFF', '#FF5ECB'];

        function reset() {
            score = 0; combo = 0; cameraY = 0; targetCameraY = 0; state = 'playing';
            // Bloco base (chão)
            blocks = [{ x: canvas.width/2 - BLOCK_W/2, y: canvas.height - 100, w: BLOCK_W, h: BLOCK_H, color: '#444', sway: 0 }];
            spawnBlock();
        }

        let current = {};
        function spawnBlock() {
            current = {
                x: 0, y: 150, w: BLOCK_W, h: BLOCK_H,
                color: colors[Math.floor(Math.random() * colors.length)],
                sway: 140, // Amplitude reduzida para não encostar nas bordas
                swayVelocity: 0,
                status: 'swinging'
            };
        }

        const handleInput = () => {
            if (state === 'playing') {
                if (current.status === 'swinging') current.status = 'dropping';
            } else {
                reset();
            }
        };

        canvas.addEventListener('mousedown', handleInput);
        canvas.addEventListener('touchstart', (e) => { e.preventDefault(); handleInput(); }, { passive: false });

        function update() {
            if (state !== 'playing') return;

            // Constantes de física ajustadas para um balanço mais lento e orgânico
            const SWAY_RESTORE_FORCE = 0.0015; // Reduzido drasticamente para diminuir a velocidade
            const SWAY_DAMPING = 1.0; // Momentum perpétuo (sem perda de energia)
            const SWAY_MAX_RANGE = 170; // Limite de segurança um pouco maior que a amplitude inicial

            if (current.status === 'swinging') {
                // Simulação de pêndulo
                const restoringForce = -current.sway * SWAY_RESTORE_FORCE;
                current.swayVelocity += restoringForce;
                current.swayVelocity *= SWAY_DAMPING;
                current.sway += current.swayVelocity;

                // Limita o balanço para não ir muito longe e adiciona um "ricochete"
                if (Math.abs(current.sway) > SWAY_MAX_RANGE) {
                    current.sway = Math.sign(current.sway) * SWAY_MAX_RANGE;
                    current.swayVelocity *= -1.0; // Ricochete perfeito para manter o balanço infinito
                }

                current.x = canvas.width/2 - current.w/2 + current.sway;
                current.y = 150; // Altura fixa do balanço na tela
            } else if (current.status === 'dropping') {
                current.y += 15;
                const top = blocks[blocks.length - 1];
                const topScreenY = top.y + cameraY; // Onde o topo da torre está na tela agora
                
                if (current.y + current.h >= topScreenY) {
                    const diff = Math.abs(current.x - top.x);
                    if (diff < top.w) {
                        // Empilhou com sucesso!
                        blocks.push({
                            x: current.x, 
                            y: top.y - BLOCK_H, // Posição no mundo (sobe subtraindo Y)
                            w: BLOCK_W, h: BLOCK_H,
                            color: current.color, sway: (current.x - top.x) * 0.08
                        });
                        // Recompensa: 1 moeda a cada 2 andares
                        if (score % 2 === 0) rewardCoins(1);
                        score++;
                        if (diff < 12) combo++; else combo = 0; // Acerto "Perfeito"
                        
                        // A câmera sobe para manter o topo da torre a 250px do fundo da tela
                        targetCameraY = Math.max(0, (canvas.height - 250) - (top.y - BLOCK_H));
                        spawnBlock();
                    } else {
                        state = 'gameover';
                    }
                }
            }
            cameraY += (targetCameraY - cameraY) * 0.1; // Suavização da câmera
        }

        function draw() {
            if (isPausedGlobal) { animationId = requestAnimationFrame(draw); return; }
            // Fundo Sky Gradient
            const g = ctx.createLinearGradient(0, 0, 0, canvas.height);
            g.addColorStop(0, '#87CEEB'); g.addColorStop(1, '#E0F7FA');
            ctx.fillStyle = g;
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Nuvens decorativas
            ctx.fillStyle = 'white'; ctx.globalAlpha = 0.3;
            for(let i=0; i<4; i++) {
                ctx.beginPath();
                ctx.arc((i*300 + Date.now()*0.02)%canvas.width, 80 + i*60 + cameraY*0.1, 40, 0, Math.PI*2);
                ctx.fill();
            }
            ctx.globalAlpha = 1.0;

            ctx.save();
            ctx.translate(0, cameraY);
            blocks.forEach((b, i) => {
                const sway = Math.sin(Date.now()*0.002 + i) * b.sway;
                ctx.fillStyle = b.color;
                ctx.fillRect(b.x + sway, b.y, b.w, b.h);
                // Detalhe 3D lateral e janelas
                ctx.fillStyle = 'rgba(0,0,0,0.15)';
                ctx.fillRect(b.x + sway + b.w, b.y + 5, 5, b.h);

                // Janelas Detalhadas (Contorno + Divisória "+")
                ctx.strokeStyle = 'rgba(0,0,0,0.2)';
                ctx.lineWidth = 1;
                [[20, 10], [b.w - 40, 10], [20, 60], [b.w - 40, 60]].forEach(([ox, oy]) => {
                    const wx = b.x + sway + ox;
                    const wy = b.y + oy;
                    ctx.fillStyle = 'rgba(255,255,255,0.4)';
                    ctx.fillRect(wx, wy, 20, 30); // Fundo
                    ctx.strokeRect(wx, wy, 20, 30); // Contorno
                    ctx.beginPath();
                    ctx.moveTo(wx + 10, wy); ctx.lineTo(wx + 10, wy + 30); // Divisão Vertical
                    ctx.moveTo(wx, wy + 15); ctx.lineTo(wx + 20, wy + 15); // Divisão Horizontal
                    ctx.stroke();
                });
            });
            ctx.restore();

            if (state === 'playing') {
                // --- Desenho do Guindaste (Fixo na tela) ---
                ctx.fillStyle = '#34495e';
                ctx.fillRect(canvas.width/2 - 40, 0, 80, 20); // Base do guindaste no topo
                
                ctx.strokeStyle = '#2c3e50'; ctx.lineWidth = 3;
                ctx.beginPath(); 
                ctx.moveTo(canvas.width/2, 20);
                ctx.lineTo(current.x + current.w/2, current.y); ctx.stroke();

                // Bloco Atual
                ctx.fillStyle = current.color;
                ctx.fillRect(current.x, current.y, current.w, current.h);

                // Janelas Detalhadas no bloco atual
                ctx.strokeStyle = 'rgba(0,0,0,0.2)';
                ctx.lineWidth = 1;
                [[20, 10], [current.w - 40, 10], [20, 60], [current.w - 40, 60]].forEach(([ox, oy]) => {
                    const wx = current.x + ox;
                    const wy = current.y + oy;
                    ctx.fillStyle = 'rgba(255,255,255,0.4)';
                    ctx.fillRect(wx, wy, 20, 30);
                    ctx.strokeRect(wx, wy, 20, 30);
                    ctx.beginPath();
                    ctx.moveTo(wx + 10, wy); ctx.lineTo(wx + 10, wy + 30);
                    ctx.moveTo(wx, wy + 15); ctx.lineTo(wx + 20, wy + 15);
                    ctx.stroke();
                });
            }

            ctx.fillStyle = '#2c3e50'; ctx.font = 'bold 28px Segoe UI'; ctx.textAlign = 'center';
            ctx.fillText(`ANDAR: ${score}`, canvas.width/2, 60);
            if (combo > 1) { ctx.fillStyle = '#e67e22'; ctx.fillText(`COMBO x${combo}!`, canvas.width/2, 95); }

            if (state === 'gameover') {
                ctx.fillStyle = 'rgba(0,0,0,0.8)'; ctx.fillRect(0,0, canvas.width, canvas.height);
                ctx.fillStyle = 'white'; ctx.font = 'bold 40px Segoe UI';
                ctx.fillText('A TORRE CAIU!', canvas.width/2, canvas.height/2 - 20);
                ctx.font = '22px Segoe UI'; ctx.fillText(`Total: ${score} andares`, canvas.width/2, canvas.height/2 + 30);
                ctx.fillStyle = '#4a90e2'; ctx.fillRect(canvas.width/2 - 90, canvas.height/2 + 70, 180, 50);
                ctx.fillStyle = 'white'; ctx.fillText('REINICIAR ↻', canvas.width/2, canvas.height/2 + 102);
            }
            animationId = requestAnimationFrame(draw);
            update();
        }
        reset(); draw();
    }

    // --- MOTOR DO JOGO DA COBRINHA (GOOGLE STYLE) ---
    function initSnake(container) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        container.appendChild(canvas);

        const COLS = 17, ROWS = 15;
        const CELL_SIZE = Math.min((canvas.width - 40) / COLS, (canvas.height - 120) / ROWS);
        const BOARD_W = COLS * CELL_SIZE, BOARD_H = ROWS * CELL_SIZE;
        const OFFSET_X = (canvas.width - BOARD_W) / 2, OFFSET_Y = (canvas.height - BOARD_H) / 2 + 30;

        let snake, prevSnake, direction, inputBuffer, apple, score, gameState, lastTick, tickInterval, ripples;

        function reset() {
            snake = [{x: 8, y: 7}, {x: 7, y: 7}, {x: 6, y: 7}];
            prevSnake = JSON.parse(JSON.stringify(snake));
            direction = {x: 1, y: 0}; inputBuffer = []; score = 0;
            gameState = 'playing'; lastTick = performance.now(); tickInterval = 150; ripples = [];
            spawnApple();
        }

        function spawnApple() {
            const empty = [];
            for (let x = 0; x < COLS; x++) {
                for (let y = 0; y < ROWS; y++) {
                    if (!snake.some(s => s.x === x && s.y === y)) empty.push({x, y});
                }
            }
            apple = empty[Math.floor(Math.random() * empty.length)] || {x: 0, y: 0};
        }

        const addDir = (d) => {
            if (gameState !== 'playing') return;
            const last = inputBuffer.length ? inputBuffer[inputBuffer.length-1] : direction;
            // Impede 180 graus e limita o buffer a 2 comandos
            if (d.x !== -last.x || d.y !== -last.y) {
                if (inputBuffer.length < 2) inputBuffer.push(d);
            }
        };

        window.addEventListener('keydown', e => {
            if (e.key === 'ArrowUp') addDir({x: 0, y: -1});
            if (e.key === 'ArrowDown') addDir({x: 0, y: 1});
            if (e.key === 'ArrowLeft') addDir({x: -1, y: 0});
            if (e.key === 'ArrowRight') addDir({x: 1, y: 0});
        });

        let tsX, tsY;
        canvas.addEventListener('touchstart', e => { 
            if (gameState === 'gameover') reset();
            tsX = e.touches[0].clientX; tsY = e.touches[0].clientY; 
        }, {passive: false});
        canvas.addEventListener('touchend', e => {
            const dx = e.changedTouches[0].clientX - tsX, dy = e.changedTouches[0].clientY - tsY;
            if (Math.abs(dx) > Math.abs(dy)) { if (Math.abs(dx) > 30) addDir({x: Math.sign(dx), y: 0}); }
            else { if (Math.abs(dy) > 30) addDir({x: 0, y: Math.sign(dy)}); }
        });
        canvas.addEventListener('mousedown', () => { if (gameState === 'gameover') reset(); });

        function update(t) {
            if (gameState !== 'playing' || t - lastTick < tickInterval) return false;
            
            prevSnake = JSON.parse(JSON.stringify(snake));
            lastTick = t;

            if (inputBuffer.length) direction = inputBuffer.shift();
            const head = {x: snake[0].x + direction.x, y: snake[0].y + direction.y};
            
            if (head.x < 0 || head.x >= COLS || head.y < 0 || head.y >= ROWS || snake.some(s => s.x === head.x && s.y === head.y)) {
                gameState = 'gameover'; return;
            }
            
            snake.unshift(head);
            if (head.x === apple.x && head.y === apple.y) { 
                score++; 
                rewardCoins(1); // 1 moeda por maçã
                ripples.push(0); spawnApple(); 
            } else snake.pop();
            
            ripples = ripples.map(r => r + 1).filter(r => r < snake.length);
            return true;
        }

        function draw(t) {
            if (isPausedGlobal) { animationId = requestAnimationFrame(draw); return; }
            update(t); // Atualiza a lógica
            
            // Cálculo do progresso entre um "tick" e outro (0 a 1)
            const progress = Math.min(1, (t - lastTick) / tickInterval);

            ctx.fillStyle = '#4a752c'; ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#aad751'; ctx.fillRect(OFFSET_X, OFFSET_Y, BOARD_W, BOARD_H);
            ctx.fillStyle = '#a2d149';
            for(let x=0; x<COLS; x++) for(let y=0; y<ROWS; y++) if((x+y)%2) ctx.fillRect(OFFSET_X+x*CELL_SIZE, OFFSET_Y+y*CELL_SIZE, CELL_SIZE, CELL_SIZE);
            
            // Maçã com brilho
            ctx.shadowBlur = 10; ctx.shadowColor = 'rgba(231, 76, 60, 0.5)';
            ctx.fillStyle = '#e74c3c'; ctx.beginPath();
            ctx.arc(OFFSET_X+apple.x*CELL_SIZE+CELL_SIZE/2, OFFSET_Y+apple.y*CELL_SIZE+CELL_SIZE/2, CELL_SIZE/2.5, 0, Math.PI*2); ctx.fill();
            ctx.shadowBlur = 0;

            snake.forEach((s, i) => {
                // Interpolação de posição entre o estado anterior e o atual
                const prev = prevSnake[i] || snake[snake.length - 1];
                const interpX = prev.x + (s.x - prev.x) * progress;
                const interpY = prev.y + (s.y - prev.y) * progress;

                // Ripple suave (onda de mastigação)
                let rippleMod = 0;
                ripples.forEach(rIdx => {
                    const dist = Math.abs(i - (rIdx - 1 + progress));
                    if (dist < 1.5) rippleMod = (1.5 - dist) * 8;
                });

                ctx.fillStyle = i === 0 ? '#4a752c' : '#527a32';
                const x = OFFSET_X + interpX * CELL_SIZE, y = OFFSET_Y + interpY * CELL_SIZE;
                
                ctx.beginPath(); 
                const size = CELL_SIZE - 4 + rippleMod;
                if (ctx.roundRect) ctx.roundRect(x + (CELL_SIZE - size) / 2, y + (CELL_SIZE - size) / 2, size, size, i === 0 ? 12 : 6);
                else ctx.fillRect(x + (CELL_SIZE - size) / 2, y + (CELL_SIZE - size) / 2, size, size);
                ctx.fill();

                if (i === 0) { // Cabeça e Olhos
                    const dx = apple.x - interpX, dy = apple.y - interpY;
                    const lookDist = Math.hypot(dx, dy);
                    const lx = lookDist < 5 ? dx / lookDist : direction.x;
                    const ly = lookDist < 5 ? dy / lookDist : direction.y;

                    const ex = x + CELL_SIZE / 2 + direction.x * 8, ey = y + CELL_SIZE / 2 + direction.y * 8;
                    const offX = direction.y * 7, offY = direction.x * 7;
                    
                    [[ex+offX, ey-offY], [ex-offX, ey+offY]].forEach(p => {
                        if (gameState === 'gameover') {
                            ctx.strokeStyle = 'white'; ctx.lineWidth = 3;
                            ctx.beginPath(); ctx.moveTo(p[0]-5, p[1]-5); ctx.lineTo(p[0]+5, p[1]+5); ctx.stroke();
                            ctx.beginPath(); ctx.moveTo(p[0]+5, p[1]-5); ctx.lineTo(p[0]-5, p[1]+5); ctx.stroke();
                        } else {
                            ctx.fillStyle = 'white'; ctx.beginPath(); ctx.arc(p[0], p[1], 4, 0, Math.PI*2); ctx.fill();
                            ctx.fillStyle = 'black'; ctx.beginPath(); ctx.arc(p[0]+lx*2, p[1]+ly*2, 2, 0, Math.PI*2); ctx.fill();
                        }
                    });
                }
            });

            ctx.fillStyle = 'white'; ctx.font = 'bold 24px Segoe UI'; ctx.textAlign = 'center';
            ctx.fillText(`🍏 ${score}`, canvas.width/2, OFFSET_Y - 20);
            if (gameState === 'gameover') {
                ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(0,0, canvas.width, canvas.height);
                ctx.fillStyle = 'white'; ctx.fillText('FIM DE JOGO', canvas.width/2, canvas.height/2);
            }
            animationId = requestAnimationFrame(draw);
        }
        reset(); draw(0);
    }

    // --- MOTOR DO JOGO FLAPPY LUMO ---
    function initFlappy(container) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        container.appendChild(canvas);

        let bird, pipes, score, state, frames, flashAlpha;
        const GRAVITY = 0.45; // Aceleração constante para baixo
        const LIFT = -7.5;    // Impulso instantâneo para cima
        const PIPE_SPEED = 3.2;
        const PIPE_GAP = 180;
        const PIPE_WIDTH = 75;

        class Bird {
            constructor() {
                this.x = canvas.width / 4;
                this.y = canvas.height / 2;
                this.velocity = 0;
                this.radius = 22;
                this.angle = 0;
                this.color = playerLumoColor;
            }

            flap() {
                if (state === 'playing') {
                    this.velocity = LIFT; // Vetor de força vertical positivo (instantâneo)
                    this.angle = -25 * (Math.PI / 180); // Inclina a cabeça para cima imediatamente
                } else if (state === 'start') {
                    state = 'playing';
                    this.velocity = LIFT;
                } else if (state === 'gameover' && this.y >= canvas.height - this.radius - 40) {
                    reset();
                }
            }

            update() {
                this.velocity += GRAVITY; // Gravidade progressiva
                this.y += this.velocity;

                // Colisão com o chão (Limite inferior)
                if (this.y > canvas.height - this.radius - 40) {
                    this.y = canvas.height - this.radius - 40;
                    this.velocity = 0;
                    if (state === 'playing') triggerGameOver();
                }

                if (this.y < this.radius) {
                    this.y = this.radius;
                    this.velocity = 0;
                }

                // Rotação dinâmica baseada no vetor de velocidade Y
                if (state === 'playing' || state === 'gameover') {
                    if (this.velocity > 3) {
                        // Começa a girar agressivamente nariz para baixo na queda
                        this.angle = Math.min(Math.PI / 2, this.angle + 0.1);
                    }
                }
            }

            draw() {
                ctx.save();
                ctx.translate(this.x, this.y);
                ctx.rotate(this.angle);

                // Personagem (Lumo)
                ctx.fillStyle = this.color;
                ctx.beginPath();
                ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
                ctx.fill();

                // Olhos
                ctx.fillStyle = 'white';
                ctx.beginPath(); ctx.arc(10, -8, 7, 0, Math.PI * 2); ctx.fill();
                ctx.beginPath(); ctx.arc(10, 8, 7, 0, Math.PI * 2); ctx.fill();
                
                if (state === 'gameover') {
                    ctx.strokeStyle = '#555'; ctx.lineWidth = 2;
                    [[7, -11, 13, -5], [13, -11, 7, -5], [7, 5, 13, 11], [13, 5, 7, 11]].forEach(p => {
                        ctx.beginPath(); ctx.moveTo(p[0], p[1]); ctx.lineTo(p[2], p[3]); ctx.stroke();
                    });
                } else {
                    ctx.fillStyle = 'black';
                    ctx.beginPath(); ctx.arc(13, -8, 2.5, 0, Math.PI * 2); ctx.fill();
                    ctx.beginPath(); ctx.arc(13, 8, 2.5, 0, Math.PI * 2); ctx.fill();
                }
                ctx.restore();
            }
        }

        class Pipe {
            constructor() {
                this.width = PIPE_WIDTH;
                this.x = canvas.width;
                this.topHeight = Math.random() * (canvas.height - PIPE_GAP - 300) + 100;
                this.passed = false;
                this.color = `hsl(${Math.random() * 360}, 70%, 50%)`;
            }

            update() {
                if (state === 'playing') this.x -= PIPE_SPEED;
            }

            draw() {
                ctx.fillStyle = this.color;
                ctx.fillRect(this.x, 0, this.width, this.topHeight);
                ctx.fillRect(this.x, this.topHeight + PIPE_GAP, this.width, canvas.height);
                ctx.fillStyle = 'rgba(0,0,0,0.15)';
                ctx.fillRect(this.x + this.width - 15, 0, 15, this.topHeight);
                ctx.fillRect(this.x + this.width - 15, this.topHeight + PIPE_GAP, 15, canvas.height);
            }

            collide(bird) {
                const hitRadius = bird.radius * 0.75; // Hitbox reduzida para ser justo
                if (bird.x + hitRadius > this.x && bird.x - hitRadius < this.x + this.width) {
                    if (bird.y - hitRadius < this.topHeight || bird.y + hitRadius > this.topHeight + PIPE_GAP) return true;
                }
                return false;
            }
        }

        function triggerGameOver() {
            state = 'gameover';
            flashAlpha = 1.0;
        }

        function reset() {
            bird = new Bird(); pipes = []; score = 0; state = 'start'; frames = 0; flashAlpha = 0;
        }

        const input = (e) => { if(e) e.preventDefault(); bird.flap(); };
        canvas.addEventListener('mousedown', input);
        canvas.addEventListener('touchstart', input, { passive: false });

        function draw() {
            if (isPausedGlobal) { animationId = requestAnimationFrame(draw); return; }
            const g = ctx.createLinearGradient(0,0,0, canvas.height);
            g.addColorStop(0, '#4facfe'); g.addColorStop(1, '#00f2fe');
            ctx.fillStyle = g; ctx.fillRect(0,0, canvas.width, canvas.height);

            bird.update();
            if (state === 'playing') {
                if (frames++ % 90 === 0) pipes.push(new Pipe());
                pipes.forEach((p, i) => {
                    p.update();
                    if (p.collide(bird)) triggerGameOver();
                    if (!p.passed && bird.x > p.x + p.width) { 
                        score++; 
                        if (score % 2 === 0) rewardCoins(1); // 1 moeda a cada 2 canos
                        p.passed = true; 
                    }
                    if (p.x + p.width < 0) pipes.splice(i, 1);
                });
            }

            pipes.forEach(p => p.draw());
            bird.draw();
            
            ctx.fillStyle = '#795548'; ctx.fillRect(0, canvas.height - 40, canvas.width, 40);
            ctx.fillStyle = '#8bc34a'; ctx.fillRect(0, canvas.height - 40, canvas.width, 10);

            ctx.fillStyle = 'white'; ctx.font = 'bold 60px Segoe UI'; ctx.textAlign = 'center';
            ctx.shadowBlur = 4; ctx.shadowColor = 'black';
            ctx.fillText(score, canvas.width/2, 100); ctx.shadowBlur = 0;

            if (state === 'start') ctx.fillText('TOQUE PARA VOAR', canvas.width/2, canvas.height/2);
            if (state === 'gameover') ctx.fillText('GAME OVER', canvas.width/2, canvas.height/2);

            if (flashAlpha > 0) {
                ctx.fillStyle = `rgba(255,255,255,${flashAlpha})`;
                ctx.fillRect(0,0, canvas.width, canvas.height);
                flashAlpha -= 0.1;
            }
            animationId = requestAnimationFrame(draw);
        }
        reset(); draw();
    }

    // --- MOTOR DO JOGO LUMO CRUSH (MATCH 3) ---
    function initLumoCrush(container) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        container.appendChild(canvas);

        const COLS = 9, ROWS = 12;
        const CELL_SIZE = Math.min(canvas.width / (COLS + 1), (canvas.height - 200) / ROWS);
        const BOARD_W = COLS * CELL_SIZE, BOARD_H = ROWS * CELL_SIZE;
        const OFFSET_X = (canvas.width - BOARD_W) / 2, OFFSET_Y = 160;

        const GEM_TYPES = [
            { name: 'Ruby', color: 'rgba(231, 76, 60, 0.9)', light: '#ff7675', shape: 'octagon' },
            { name: 'Sapphire', color: 'rgba(52, 152, 219, 0.9)', light: '#74b9ff', shape: 'diamond' },
            { name: 'Emerald', color: 'rgba(46, 204, 113, 0.9)', light: '#55efc4', shape: 'emerald' },
            { name: 'Amethyst', color: 'rgba(155, 89, 182, 0.8)', light: '#a29bfe', shape: 'triangle' },
            { name: 'Topaz', color: 'rgba(241, 196, 15, 0.9)', light: '#ffeaa7', shape: 'hexagon' },
            { name: 'Diamond', color: 'rgba(236, 240, 241, 0.5)', light: '#ffffff', shape: 'kite' },
            { name: 'RoseQuartz', color: 'rgba(255, 184, 184, 0.7)', light: '#ffc9c9', shape: 'pentagon' },
            { name: 'Jasper', color: 'rgba(150, 45, 45, 1)', light: '#c0392b', shape: 'square' },
            { name: 'Pearl', color: 'rgba(254, 250, 241, 1)', light: '#ffffff', shape: 'round' },
            { name: 'Agate', color: 'rgba(230, 126, 34, 1)', light: '#f39c12', shape: 'banded' }
        ];

        let board = [], score = 0, best = 0, selected = null, isAnimating = false, particles = [];
        let timeLeft = 60, maxTime = 60; // Sistema de tempo

        function createExplosion(x, y, color) {
            // Adiciona tempo ao realizar um match
            timeLeft = Math.min(maxTime, timeLeft + 3); // Pequeno bônus por peça

            for (let i = 0; i < 15; i++) {
                particles.push({
                    x: x, y: y,
                    vx: (Math.random() - 0.5) * 12,
                    vy: (Math.random() - 0.5) * 12,
                    life: 1.0,
                    color: color,
                    size: Math.random() * 5 + 2
                });
            }
        }

        function reset() {
            score = 0; timeLeft = 60; board = []; particles = [];
            for(let r=0; r<ROWS; r++) {
                board[r] = [];
                for(let c=0; c<COLS; c++) {
                    let type;
                    do { type = Math.floor(Math.random() * GEM_TYPES.length); } 
                    while ((c > 1 && board[r][c-1].type === type && board[r][c-2].type === type) || 
                           (r > 1 && board[r-1][c].type === type && board[r-2][c].type === type));
                    board[r][c] = { 
                        type, special: null, scale: 1,
                        rx: c * CELL_SIZE, ry: r * CELL_SIZE
                    };
                }
            }
        }

        function drawGem(ctx, gem, x, y, size) {
            const info = GEM_TYPES[gem.type];
            const cx = x + size/2, cy = y + size/2;
            const r = (size/2) * 0.8 * gem.scale;

            ctx.save();
            if (gem.special === 'bomb') {
                const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
                grad.addColorStop(0, '#fff'); grad.addColorStop(0.5, '#f1c40f'); grad.addColorStop(1, '#000');
                ctx.fillStyle = grad;
            } else {
                ctx.fillStyle = info.color;
            }

            // Desenhar Caminho Vetorial Único por Tipo
            ctx.beginPath();
            switch(info.shape) {
                case 'octagon':
                    for(let i=0; i<8; i++) {
                        const a = (i * 45) * Math.PI/180;
                        ctx.lineTo(cx + Math.cos(a)*r, cy + Math.sin(a)*r);
                    }
                    break;
                case 'diamond':
                    ctx.moveTo(cx, cy-r); ctx.lineTo(cx+r*0.75, cy); ctx.lineTo(cx, cy+r); ctx.lineTo(cx-r*0.75, cy);
                    break;
                case 'emerald':
                    const es = r * 0.6;
                    ctx.moveTo(cx-es, cy-r); ctx.lineTo(cx+es, cy-r); ctx.lineTo(cx+r, cy-es); ctx.lineTo(cx+r, cy+es);
                    ctx.lineTo(cx+es, cy+r); ctx.lineTo(cx-es, cy+r); ctx.lineTo(cx-r, cy+es); ctx.lineTo(cx-r, cy-es);
                    break;
                case 'triangle':
                    ctx.moveTo(cx, cy-r*1.1); ctx.lineTo(cx+r, cy+r*0.8); ctx.lineTo(cx-r, cy+r*0.8);
                    break;
                case 'hexagon':
                    for(let i=0; i<6; i++) {
                        const a = (i * 60 + 30) * Math.PI/180;
                        ctx.lineTo(cx + Math.cos(a)*r, cy + Math.sin(a)*r);
                    }
                    break;
                case 'kite':
                    ctx.moveTo(cx, cy-r*1.2); ctx.lineTo(cx+r*0.7, cy-r*0.2); ctx.lineTo(cx, cy+r); ctx.lineTo(cx-r*0.7, cy-r*0.2);
                    break;
                case 'pentagon':
                    for(let i=0; i<5; i++) {
                        const a = (i * 72 - 90) * Math.PI/180;
                        ctx.lineTo(cx + Math.cos(a)*r, cy + Math.sin(a)*r);
                    }
                    break;
                case 'square':
                    ctx.rect(cx-r*0.75, cy-r*0.75, r*1.5, r*1.5);
                    break;
                case 'round':
                    ctx.arc(cx, cy, r, 0, Math.PI * 2);
                    break;
                case 'banded':
                    for(let i=0; i<6; i++) {
                        const a = (i * 60) * Math.PI/180;
                        ctx.lineTo(cx + Math.cos(a)*r, cy + Math.sin(a)*r);
                    }
                    break;
            }
            ctx.closePath();
            ctx.fill();

            // Clipping para garantir que detalhes internos não transbordem
            ctx.save();
            ctx.clip();

            if (info.shape === 'round') {
                const pGrad = ctx.createRadialGradient(cx - r/3, cy - r/3, r/10, cx, cy, r);
                pGrad.addColorStop(0, '#fff');
                pGrad.addColorStop(0.3, info.color);
                pGrad.addColorStop(1, '#dcdde1');
                ctx.fillStyle = pGrad; ctx.fill();
            } else if (info.shape === 'banded') {
                ctx.strokeStyle = 'rgba(255,255,255,0.2)';
                for(let j=-r; j<r; j+=6) {
                    ctx.beginPath(); ctx.moveTo(cx-r, cy+j); ctx.lineTo(cx+r, cy+j); ctx.stroke();
                }
            } else {
                ctx.strokeStyle = 'rgba(255,255,255,0.3)';
                ctx.lineWidth = 1;
                const sides = (info.shape === 'octagon' ? 8 : (info.shape === 'triangle' ? 3 : (info.shape === 'pentagon' ? 5 : 4)));
                for(let i=0; i<sides; i++) {
                    const a = (i * (360/sides)) * Math.PI/180;
                    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a)*r, cy + Math.sin(a)*r); ctx.stroke();
                }
                const shine = ctx.createRadialGradient(cx - r/3, cy - r/3, 0, cx - r/3, cy - r/3, r);
                shine.addColorStop(0, 'rgba(255,255,255,0.4)'); shine.addColorStop(1, 'transparent');
                ctx.fillStyle = shine; ctx.fill();
            }

            // Brilhinho (Sparkle) Suave e Orgânico
            const t = Date.now() * 0.0012;
            const seed = gem.rx * 0.13 + gem.ry * 0.17;
            const sparkleChance = Math.sin(t * 0.8 + seed) * Math.cos(t * 1.3 + seed * 2);
            if (sparkleChance > 0.88) {
                ctx.save();
                ctx.globalAlpha = (sparkleChance - 0.88) * 8;
                ctx.translate(cx + Math.cos(seed)*r*0.4, cy + Math.sin(seed*1.5)*r*0.4);
                const sSize = r * 0.45;
                ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 1.2;
                ctx.beginPath(); ctx.moveTo(-sSize, 0); ctx.lineTo(sSize, 0); ctx.moveTo(0, -sSize); ctx.lineTo(0, sSize); ctx.stroke();
                ctx.restore();
            }

            ctx.restore(); // Remove o clip para os efeitos de poder (que podem brilhar fora)

            // Efeitos de Poder
            if (gem.special === 'striped-h') {
                ctx.strokeStyle = 'white'; ctx.lineWidth = 3;
                ctx.shadowBlur = 10; ctx.shadowColor = 'white';
                ctx.beginPath(); ctx.moveTo(cx-r, cy); ctx.lineTo(cx+r, cy); ctx.stroke();
            } else if (gem.special === 'striped-v') {
                ctx.strokeStyle = 'white'; ctx.lineWidth = 3;
                ctx.shadowBlur = 10; ctx.shadowColor = 'white';
                ctx.beginPath(); ctx.moveTo(cx, cy-r); ctx.lineTo(cx, cy+r); ctx.stroke();
            } else if (gem.special === 'wrapped') {
                ctx.shadowBlur = 15; ctx.shadowColor = info.light;
                ctx.strokeStyle = 'white'; ctx.lineWidth = 2; ctx.stroke();
            }
            ctx.restore();
        }

        function checkMatches() {
            let toRemove = new Set();
            let specialsToCreate = [];

            // Horizontal
            for (let r = 0; r < ROWS; r++) {
                for (let c = 0; c < COLS - 2; c++) {
                    let matchLen = 1;
                    while (c + matchLen < COLS && board[r][c + matchLen].type === board[r][c].type) matchLen++;
                    if (matchLen >= 3) {
                        for (let i = 0; i < matchLen; i++) toRemove.add(`${r},${c+i}`);
                        if (matchLen === 4) {
                            specialsToCreate.push({r, c: c+1, type: board[r][c].type, s: 'striped-h'});
                            timeLeft = Math.min(maxTime, timeLeft + 20); // Bonus match 4
                        }
                        if (matchLen >= 5) specialsToCreate.push({r, c: c+2, type: board[r][c].type, s: 'bomb'});
                        c += matchLen - 1;
                    }
                }
            }

            // Vertical
            for (let c = 0; c < COLS; c++) {
                for (let r = 0; r < ROWS - 2; r++) {
                    let matchLen = 1;
                    while (r + matchLen < ROWS && board[r + matchLen][c].type === board[r][c].type) matchLen++;
                    if (matchLen >= 3) {
                        for (let i = 0; i < matchLen; i++) toRemove.add(`${r+i},${c}`);
                        if (matchLen === 4) {
                            specialsToCreate.push({r: r+1, c, type: board[r][c].type, s: 'striped-v'});
                            timeLeft = Math.min(maxTime, timeLeft + 20); // Bonus match 4
                        }
                        if (matchLen >= 5 && !specialsToCreate.some(s => s.s === 'bomb')) specialsToCreate.push({r: r+2, c, type: board[r][c].type, s: 'bomb'});
                        r += matchLen - 1;
                    }
                }
            }

            if (toRemove.size > 0) {
                // Adiciona 20s base por cada grupo de match detectado
                timeLeft = Math.min(maxTime, timeLeft + 20);
                
                // Recompensa: Moedas baseadas no tamanho do combo
                const coinsEarned = Math.floor(toRemove.size / 3);
                rewardCoins(coinsEarned);

                toRemove.forEach(pos => {
                    const [r, c] = pos.split(',').map(Number);
                    if (board[r][c]) {
                        createExplosion(OFFSET_X + c * CELL_SIZE + CELL_SIZE/2, OFFSET_Y + r * CELL_SIZE + CELL_SIZE/2, GEM_TYPES[board[r][c].type].color);
                        board[r][c] = null;
                    }
                    score += 10;
                });
                specialsToCreate.forEach(s => {
                    board[s.r][s.c] = { 
                        type: s.type, special: s.s, scale: 1,
                        rx: s.c * CELL_SIZE, ry: s.r * CELL_SIZE
                    };
                });
                setTimeout(refillBoard, 300);
                return true;
            }
            return false;
        }

        function refillBoard() {
            for (let c = 0; c < COLS; c++) {
                let emptySlots = 0;
                for (let r = ROWS - 1; r >= 0; r--) {
                    if (board[r][c] === null) emptySlots++;
                    else if (emptySlots > 0) {
                        board[r + emptySlots][c] = board[r][c];
                        board[r][c] = null;
                    }
                }
                for (let r = 0; r < emptySlots; r++) {
                    board[r][c] = { 
                        type: Math.floor(Math.random() * GEM_TYPES.length), 
                        special: null, scale: 1,
                        rx: c * CELL_SIZE, ry: (r - emptySlots) * CELL_SIZE
                    };
                }
            }
            setTimeout(() => { if (!checkMatches()) isAnimating = false; }, 400);
        }

        function swapGems(r1, c1, r2, c2) {
            isAnimating = true;
            const temp = board[r1][c1];
            board[r1][c1] = board[r2][c2];
            board[r2][c2] = temp;

            if (!checkMatches()) {
                // Reverte se não houver match
                setTimeout(() => {
                    const back = board[r1][c1];
                    board[r1][c1] = board[r2][c2];
                    board[r2][c2] = back;
                    isAnimating = false;
                }, 300);
            }
        }

        let dragStartPos = null;
        function handleStart(clientX, clientY) {
            if (isAnimating || timeLeft <= 0) {
                if (timeLeft <= 0 && !isAnimating) {
                    const btnX = canvas.width / 2;
                    const btnY = canvas.height / 2 + 105;
                    if (Math.abs(clientX - btnX) < 80 && Math.abs(clientY - btnY) < 25) {
                        reset();
                    }
                }
                return;
            }
            const c = Math.floor((clientX - OFFSET_X) / CELL_SIZE);
            const r = Math.floor((clientY - OFFSET_Y) / CELL_SIZE);
            if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return;
            selected = { r, c };
            dragStartPos = { r, c };
        }

        function handleMove(clientX, clientY) {
            if (!dragStartPos || isAnimating || timeLeft <= 0) return;
            const c = Math.floor((clientX - OFFSET_X) / CELL_SIZE);
            const r = Math.floor((clientY - OFFSET_Y) / CELL_SIZE);
            if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return;

            if (r !== dragStartPos.r || c !== dragStartPos.c) {
                const dist = Math.abs(r - dragStartPos.r) + Math.abs(c - dragStartPos.c);
                if (dist === 1) {
                    swapGems(dragStartPos.r, dragStartPos.c, r, c);
                    dragStartPos = null;
                    selected = null;
                }
            }
        }

        function handleEnd() { dragStartPos = null; }

        canvas.addEventListener('mousedown', e => handleStart(e.clientX, e.clientY));
        window.addEventListener('mousemove', e => handleMove(e.clientX, e.clientY));
        window.addEventListener('mouseup', handleEnd);

        canvas.addEventListener('touchstart', e => { handleStart(e.touches[0].clientX, e.touches[0].clientY); e.preventDefault(); }, { passive: false });
        canvas.addEventListener('touchmove', e => { handleMove(e.touches[0].clientX, e.touches[0].clientY); e.preventDefault(); }, { passive: false });
        canvas.addEventListener('touchend', handleEnd);

        function draw() {
            if (isPausedGlobal) { animationId = requestAnimationFrame(draw); return; }
            // Lógica de tempo "secando"
            if (!isAnimating && timeLeft > 0) {
                timeLeft -= 0.016; // Redução por frame
                if (timeLeft < 0) {
                    timeLeft = 0;
                }
            }

            // Fundo Sophisticated Lounge
            const sky = ctx.createLinearGradient(0, 0, 0, canvas.height);
            sky.addColorStop(0, '#2c3e50'); sky.addColorStop(1, '#000000');
            ctx.fillStyle = sky; ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // Textura sutil de fundo
            ctx.strokeStyle = 'rgba(255,255,255,0.03)';
            for(let i=0; i<canvas.width; i+=40) {
                ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, canvas.height); ctx.stroke();
            }

            // Brilho de Luminária
            const lamp = ctx.createRadialGradient(canvas.width, 0, 0, canvas.width, 0, 400);
            lamp.addColorStop(0, 'rgba(241, 196, 15, 0.1)'); lamp.addColorStop(1, 'transparent');
            ctx.fillStyle = lamp; ctx.fillRect(0,0, canvas.width, canvas.height);

            // HUD
            ctx.fillStyle = 'white'; ctx.textAlign = 'center';
            ctx.font = '14px Segoe UI'; ctx.globalAlpha = 0.7;
            ctx.fillText('SCORE', canvas.width/4, 60);
            ctx.fillText('TIME', canvas.width/2, 60);
            ctx.fillText('BEST', canvas.width * 0.75, 60);
            
            if (score > best) best = score;

            ctx.globalAlpha = 1.0; ctx.font = 'bold 28px Segoe UI';
            ctx.fillText(score, canvas.width/4, 95);
            ctx.fillText(Math.ceil(timeLeft) + 's', canvas.width/2, 95);
            ctx.fillText(best, canvas.width * 0.75, 95);

            // Progress Bar
            const pbW = 200, pbH = 10;
            const pbX = canvas.width / 2 - pbW / 2;
            const pbY = 120;

            // Fundo da barra (vazia)
            ctx.beginPath();
            ctx.fillStyle = 'rgba(255,255,255,0.1)';
            ctx.roundRect(pbX, pbY, pbW, pbH, 5);
            ctx.fill();

            // Barra Amarela (Preenchimento)
            const progress = Math.max(0, timeLeft / maxTime);
            if (progress > 0) {
                ctx.beginPath();
                ctx.fillStyle = '#f1c40f';
                ctx.roundRect(pbX, pbY, pbW * progress, pbH, 5);
                ctx.fill();
            }

            // Tabuleiro (Vidro flutuante)
            ctx.fillStyle = 'rgba(255,255,255,0.05)';
            ctx.strokeStyle = 'rgba(255,255,255,0.1)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.roundRect(OFFSET_X - 10, OFFSET_Y - 10, BOARD_W + 20, BOARD_H + 20, 15);
            ctx.fill(); ctx.stroke();

            // Joias
            for(let r=0; r<ROWS; r++) {
                for(let c=0; c<COLS; c++) {
                    const gem = board[r][c];
                    if (gem) {
                        // Interpolação suave de posição (Swaps e Quedas)
                        const targetX = c * CELL_SIZE;
                        const targetY = r * CELL_SIZE;
                        gem.rx += (targetX - gem.rx) * 0.2;
                        gem.ry += (targetY - gem.ry) * 0.2;
                        
                        const x = OFFSET_X + gem.rx;
                        const y = OFFSET_Y + gem.ry;
                        
                        if (selected && selected.r === r && selected.c === c) {
                            ctx.fillStyle = 'rgba(255,255,255,0.2)';
                            ctx.beginPath(); ctx.roundRect(x+2, y+2, CELL_SIZE-4, CELL_SIZE-4, 8); ctx.fill();
                        }
                        drawGem(ctx, gem, x, y, CELL_SIZE);
                    }
                }
            }

            // Sistema de Partículas (Explosões Neon)
            particles = particles.filter(p => {
                p.x += p.vx; p.y += p.vy;
                p.vy += 0.4; // Gravidade sutil
                p.life -= 0.04;
                ctx.globalAlpha = p.life;
                ctx.fillStyle = p.color;
                ctx.beginPath(); 
                ctx.arc(p.x, p.y, Math.max(0, p.size * p.life), 0, Math.PI * 2); 
                ctx.fill();
                ctx.globalAlpha = 1.0;
                return p.life > 0;
            });

            if (timeLeft <= 0 && !isAnimating) {
                ctx.fillStyle = 'rgba(0,0,0,0.8)'; ctx.fillRect(0,0, canvas.width, canvas.height);
                ctx.fillStyle = 'white'; ctx.font = 'bold 40px Segoe UI';
                ctx.fillText('FIM DE JOGO', canvas.width/2, canvas.height/2);
                ctx.font = '20px Segoe UI'; ctx.fillText(`Pontuação: ${score}`, canvas.width/2, canvas.height/2 + 50);
                
                ctx.fillStyle = '#4a90e2';
                ctx.roundRect(canvas.width/2 - 80, canvas.height/2 + 80, 160, 50, 10); ctx.fill();
                ctx.fillStyle = 'white'; ctx.fillText('REPETIR ↻', canvas.width/2, canvas.height/2 + 112);
            }

            animationId = requestAnimationFrame(draw);
        }
        reset(); draw();
    }

    // --- MOTOR DO JOGO LUMO SLICE (SUIIKA CLONE) ---
    function initLumoSlice(container) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        container.appendChild(canvas);

        const FRUIT_TYPES = [
            { name: 'Morango', radius: 15, color: '#ff3b30', score: 2 },
            { name: 'Cereja', radius: 22, color: '#ff2d55', score: 4 },
            { name: 'Uva', radius: 30, color: '#af52de', score: 8 },
            { name: 'Tangerina', radius: 40, color: '#ff9500', score: 16 },
            { name: 'Caqui', radius: 50, color: '#ff6b3d', score: 32 },
            { name: 'Maçã', radius: 62, color: '#e74c3c', score: 64 },
            { name: 'Pera', radius: 75, color: '#c5e1a5', score: 128 },
            { name: 'Pêssego', radius: 90, color: '#ffab91', score: 256 },
            { name: 'Abacaxi', radius: 105, color: '#f1c40f', score: 512 },
            { name: 'Melão', radius: 125, color: '#9ccc65', score: 1024 },
            { name: 'Lumo-Melancia', radius: 150, color: '#2ecc71', score: 2048 }
        ];

        const POT_W = 340;
        const POT_H = 450;
        const POT_X = (canvas.width - POT_W) / 2;
        const POT_Y = canvas.height - POT_H - 40;
        const LIMIT_Y = POT_Y - 20;

        let fruits = [], particles = [], score = 0, nextFruitIdx = 0;
        let currentX = canvas.width / 2;
        let isGameOver = false, isTouching = false;
        let gameOverTimer = 0;
        let canDrop = true;

        function spawnFruit() {
            nextFruitIdx = Math.floor(Math.random() * 5); // Apenas as 5 primeiras caem
        }

        class Fruit {
            constructor(x, y, typeIdx, isStatic = false) {
                this.x = x; this.y = y; this.typeIdx = typeIdx;
                this.radius = FRUIT_TYPES[typeIdx].radius;
                this.color = FRUIT_TYPES[typeIdx].color;
                this.vx = 0; this.vy = 0;
                this.isStatic = isStatic;
                this.popScale = 1.0;
                this.fusionCooldown = false;
            }

            update() {
                if (this.isStatic) return;
                this.vy += 0.45; // Gravidade
                this.x += this.vx; this.y += this.vy;
                this.vx *= 0.98; // Atrito
                this.vy *= 0.98;

                // Colisão com Paredes do Pote
                if (this.x - this.radius < POT_X) {
                    this.x = POT_X + this.radius; this.vx *= -0.3;
                } else if (this.x + this.radius > POT_X + POT_W) {
                    this.x = POT_X + POT_W - this.radius; this.vx *= -0.3;
                }
                if (this.y + this.radius > POT_Y + POT_H) {
                    this.y = POT_Y + POT_H - this.radius; this.vy *= -0.3;
                }
            }

            draw() {
                ctx.save();
                ctx.translate(this.x, this.y);
                ctx.scale(this.popScale, this.popScale);
                
                // Estilo Lumo: Gradiente radial para volume
                const grad = ctx.createRadialGradient(-this.radius/3, -this.radius/3, 0, 0, 0, this.radius);
                grad.addColorStop(0, '#fff'); grad.addColorStop(0.2, this.color); grad.addColorStop(1, darkenColor(this.color, 0.4));
                
                ctx.fillStyle = grad;
                ctx.beginPath(); ctx.arc(0, 0, this.radius, 0, Math.PI * 2); ctx.fill();
                
                // Brilho de superfície
                ctx.globalAlpha = 0.3;
                ctx.fillStyle = 'white';
                ctx.beginPath(); ctx.ellipse(-this.radius/2.5, -this.radius/2.5, this.radius/4, this.radius/6, Math.PI/4, 0, Math.PI*2); ctx.fill();
                ctx.restore();

                if (this.popScale > 1.0) this.popScale -= 0.05;
            }
        }

        function createSplash(x, y, color) {
            for (let i = 0; i < 12; i++) {
                particles.push({
                    x, y, vx: (Math.random() - 0.5) * 10, vy: (Math.random() - 0.5) * 10,
                    life: 1.0, color, size: Math.random() * 6 + 2
                });
            }
        }

        function resolveCollisions() {
            for (let i = 0; i < fruits.length; i++) {
                for (let j = i + 1; j < fruits.length; j++) {
                    let a = fruits[i], b = fruits[j];
                    if (a.isStatic || b.isStatic) continue;

                    let dx = b.x - a.x, dy = b.y - a.y;
                    let dist = Math.hypot(dx, dy);
                    let minDist = a.radius + b.radius;

                    if (dist < minDist) {
                        // Fusão!
                        if (a.typeIdx === b.typeIdx && a.typeIdx < FRUIT_TYPES.length - 1 && !a.fusionCooldown && !b.fusionCooldown) {
                            const midX = (a.x + b.x) / 2, midY = (a.y + b.y) / 2;
                            createSplash(midX, midY, a.color);
                            score += FRUIT_TYPES[a.typeIdx].score;
                            
                            // Recompensa: 1 moeda por fusão, 5 moedas se for melancia
                            rewardCoins(a.typeIdx >= 9 ? 5 : 1);

                            fruits.splice(j, 1);
                            fruits.splice(i, 1);
                            
                            let evolved = new Fruit(midX, midY, a.typeIdx + 1);
                            evolved.popScale = 1.4;
                            fruits.push(evolved);
                            
                            // Impulso radial para as outras frutas (impacto na grade)
                            fruits.forEach(f => {
                                let d = Math.hypot(f.x - midX, f.y - midY);
                                if (d < 150 && f !== evolved) {
                                    let ang = Math.atan2(f.y - midY, f.x - midX);
                                    f.vx += Math.cos(ang) * 5; f.vy += Math.sin(ang) * 5;
                                }
                            });
                            return; // Processa uma fusão por frame para estabilidade
                        }

                        // Resolução física (Elastic Collision)
                        let overlap = minDist - dist;
                        let nx = dx / dist, ny = dy / dist;
                        a.x -= nx * overlap / 2; a.y -= ny * overlap / 2;
                        b.x += nx * overlap / 2; b.y += ny * overlap / 2;

                        let vRelative = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
                        if (vRelative < 0) {
                            let impulse = -(1.3 * vRelative) / 2;
                            a.vx -= impulse * nx; a.vy -= impulse * ny;
                            b.vx += impulse * nx; b.vy += impulse * ny;
                        }
                    }
                }
            }
        }

        function handleStart(clientX) {
            if (isGameOver) { reset(); return; }
            isTouching = true;
            currentX = Math.max(POT_X + 20, Math.min(POT_X + POT_W - 20, clientX));
        }

        function handleMove(clientX) {
            if (!isTouching || isGameOver) return;
            currentX = Math.max(POT_X + 20, Math.min(POT_X + POT_W - 20, clientX));
        }

        function handleEnd() {
            if (!isTouching || isGameOver || !canDrop) return;
            isTouching = false;
            canDrop = false;
            
            let f = new Fruit(currentX, LIMIT_Y - 50, nextFruitIdx);
            fruits.push(f);
            
            spawnFruit();
            setTimeout(() => canDrop = true, 600);
        }

        canvas.addEventListener('mousedown', e => handleStart(e.clientX));
        window.addEventListener('mousemove', e => handleMove(e.clientX));
        window.addEventListener('mouseup', handleEnd);
        canvas.addEventListener('touchstart', e => { handleStart(e.touches[0].clientX); e.preventDefault(); }, {passive:false});
        canvas.addEventListener('touchmove', e => { handleMove(e.touches[0].clientX); e.preventDefault(); }, {passive:false});
        canvas.addEventListener('touchend', handleEnd);

        function reset() {
            fruits = []; particles = []; score = 0; isGameOver = false; gameOverTimer = 0; canDrop = true; spawnFruit();
        }

        function draw() {
            if (isPausedGlobal) { animationId = requestAnimationFrame(draw); return; }
            // Fundo
            ctx.fillStyle = '#f5f6fa'; ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // Linha de Limite
            ctx.strokeStyle = '#e74c3c'; ctx.setLineDash([10, 10]); ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(POT_X, LIMIT_Y); ctx.lineTo(POT_X + POT_W, LIMIT_Y); ctx.stroke();
            ctx.setLineDash([]);

            // Pote (Transparente Sophisticado)
            ctx.fillStyle = 'rgba(255,255,255,0.6)';
            ctx.strokeStyle = '#2f3640'; ctx.lineWidth = 6;
            ctx.beginPath();
            ctx.moveTo(POT_X, POT_Y); ctx.lineTo(POT_X, POT_Y + POT_H);
            ctx.lineTo(POT_X + POT_W, POT_Y + POT_H); ctx.lineTo(POT_X + POT_W, POT_Y);
            ctx.stroke(); ctx.fill();

            // Fruta em espera
            if (canDrop && !isGameOver) {
                let preview = new Fruit(currentX, LIMIT_Y - 50, nextFruitIdx, true);
                preview.draw();
                ctx.strokeStyle = 'rgba(0,0,0,0.1)'; ctx.beginPath();
                ctx.moveTo(currentX, LIMIT_Y - 50); ctx.lineTo(currentX, POT_Y + POT_H); ctx.stroke();
            }

            // Partículas
            particles = particles.filter(p => {
                p.x += p.vx; p.y += p.vy; p.vy += 0.2; p.life -= 0.02;
                ctx.globalAlpha = p.life; ctx.fillStyle = p.color;
                ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI*2); ctx.fill();
                return p.life > 0;
            });
            ctx.globalAlpha = 1;

            // Lógica Física e Check de Game Over
            if (!isGameOver) {
                fruits.forEach(f => f.update());
                resolveCollisions();
            }

            let touchingLimit = false;
            fruits.forEach(f => {
                f.draw();
                // Check Game Over: se a fruta estiver acima da linha e quase parada
                if (f.y - f.radius < LIMIT_Y && Math.abs(f.vy) < 1.5) touchingLimit = true;
            });

            if (!isGameOver && touchingLimit && fruits.length > 2) {
                gameOverTimer += 0.016;
                if (gameOverTimer > 2) isGameOver = true;
                // Alerta visual
                ctx.fillStyle = `rgba(231, 76, 60, ${Math.abs(Math.sin(Date.now()/200)) * 0.3})`;
                ctx.fillRect(POT_X, LIMIT_Y, POT_W, 10);
            } else if (!isGameOver) {
                gameOverTimer = 0;
            }

            // UI
            ctx.fillStyle = '#2f3640'; ctx.font = 'bold 30px Segoe UI'; ctx.textAlign = 'center';
            ctx.fillText(score, canvas.width/2, 60);

            if (isGameOver) {
                ctx.fillStyle = 'rgba(0,0,0,0.85)'; ctx.fillRect(0,0, canvas.width, canvas.height);
                ctx.fillStyle = 'white'; ctx.fillText('POTE CHEIO!', canvas.width/2, canvas.height/2 - 20);
                ctx.font = '20px Segoe UI'; ctx.fillText(`Pontuação final: ${score}`, canvas.width/2, canvas.height/2 + 30);
                ctx.fillStyle = '#4a90e2'; ctx.fillRect(canvas.width/2 - 80, canvas.height/2 + 70, 160, 50);
                ctx.fillStyle = 'white'; ctx.fillText('REPETIR ↻', canvas.width/2, canvas.height/2 + 102);
            }

            animationId = requestAnimationFrame(draw);
        }
        spawnFruit(); draw();
    }

    // --- MOTOR DO JOGO LUMO WORD (CAÇA-PALAVRAS) ---
    function initLumoWord(container) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        container.appendChild(canvas);

        let level = 1, gridSize = 8, grid = [], words = [], foundWords = [], selection = null, score = 0;
        const VOCABULARY = ["LUMO", "AMIGO", "CASA", "PET", "DOCE", "BOLA", "SOL", "LUA", "VIDA", "NUVEM", "BANHO", "FOME", "SONO", "JOGO", "RISO", "ESTRELA", "COZINHA", "QUARTO", "SALA", "FLOR", "BRINCAR", "FELIZ"];

        function setupLevel() {
            gridSize = Math.min(14, 7 + level);
            const wordCount = Math.min(6, 2 + level);
            words = []; foundWords = [];
            
            const available = [...VOCABULARY].filter(w => w.length <= gridSize);
            for(let i=0; i<wordCount && available.length > 0; i++) {
                const idx = Math.floor(Math.random() * available.length);
                words.push(available.splice(idx, 1)[0]);
            }

            grid = Array(gridSize).fill().map(() => Array(gridSize).fill(null));
            words.forEach(word => {
                let placed = false, attempts = 0;
                const dirs = [[1,0], [0,1], [1,1], [1,-1]];
                if (level > 2) dirs.push([-1, 0], [0, -1]); // Inicia palavras invertidas após level 2

                while(!placed && attempts < 150) {
                    const d = dirs[Math.floor(Math.random()*dirs.length)];
                    const r = Math.floor(Math.random()*gridSize), c = Math.floor(Math.random()*gridSize);
                    if (canPlace(word, r, c, d)) {
                        for(let i=0; i<word.length; i++) grid[r + d[1]*i][c + d[0]*i] = word[i];
                        placed = true;
                    }
                    attempts++;
                }
            });

            const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
            for(let r=0; r<gridSize; r++) {
                for(let c=0; c<gridSize; c++) {
                    if(!grid[r][c]) grid[r][c] = letters[Math.floor(Math.random()*letters.length)];
                }
            }
        }

        function canPlace(word, r, c, d) {
            for(let i=0; i<word.length; i++) {
                const nr = r + d[1]*i, nc = c + d[0]*i;
                if(nr < 0 || nr >= gridSize || nc < 0 || nc >= gridSize) return false;
                if(grid[nr][nc] && grid[nr][nc] !== word[i]) return false;
            }
            return true;
        }

        function getCell(x, y) {
            const availableH = canvas.height - 200;
            const cellSize = Math.max(20, Math.min((canvas.width - 40) / gridSize, availableH / gridSize));
            const offsetX = (canvas.width - cellSize * gridSize) / 2;
            const offsetY = 100 + (availableH - cellSize * gridSize) / 2;

            const c = Math.floor((x - offsetX) / cellSize), r = Math.floor((y - offsetY) / cellSize);
            return (r >= 0 && r < gridSize && c >= 0 && c < gridSize) ? {r, c} : null;
        }

        const handleStart = (x, y) => { const cell = getCell(x, y); if(cell) selection = { start: cell, end: cell }; };
        const handleMove = (x, y) => { if(selection) { const cell = getCell(x, y); if(cell) selection.end = cell; } };
        const handleEnd = () => {
            if(selection) {
                const s = selection.start, e = selection.end;
                const dc = e.c - s.c, dr = e.r - s.r, dist = Math.max(Math.abs(dc), Math.abs(dr));
                if (dist > 0 && (Math.abs(dc) === Math.abs(dr) || dc === 0 || dr === 0)) {
                    const sc = dc === 0 ? 0 : dc / Math.abs(dc), sr = dr === 0 ? 0 : dr / Math.abs(dr);
                    let selWord = ""; let cells = [];
                    for(let i=0; i<=dist; i++) { const r = s.r + sr*i, c = s.c + sc*i; selWord += grid[r][c]; cells.push({r, c}); }
                    const revWord = selWord.split('').reverse().join('');
                    const match = words.find(w => (w === selWord || w === revWord) && !foundWords.some(f => f.word === w));
                    if (match) {
                        foundWords.push({word: match, cells}); 
                        score += 100 * level;
                        rewardCoins(5); // 5 moedas por palavra encontrada
                        
                        if(foundWords.length === words.length) { level++; setTimeout(setupLevel, 800); }
                    }
                }
                selection = null;
            }
        };

        canvas.addEventListener('mousedown', e => handleStart(e.clientX, e.clientY));
        window.addEventListener('mousemove', e => handleMove(e.clientX, e.clientY));
        window.addEventListener('mouseup', handleEnd);
        canvas.addEventListener('touchstart', e => { handleStart(e.touches[0].clientX, e.touches[0].clientY); e.preventDefault(); }, {passive:false});
        canvas.addEventListener('touchmove', e => { handleMove(e.touches[0].clientX, e.touches[0].clientY); e.preventDefault(); }, {passive:false});
        canvas.addEventListener('touchend', handleEnd);

        function draw() {
            if (isPausedGlobal) { animationId = requestAnimationFrame(draw); return; }
            ctx.fillStyle = '#1e272e'; ctx.fillRect(0,0,canvas.width, canvas.height);
            const availableH = canvas.height - 200;
            const cellSize = Math.max(20, Math.min((canvas.width - 40) / gridSize, availableH / gridSize));
            const offsetX = (canvas.width - cellSize * gridSize) / 2;
            const offsetY = 100 + (availableH - cellSize * gridSize) / 2;

            ctx.lineCap = 'round';
            foundWords.forEach(f => {
                ctx.strokeStyle = 'rgba(46, 204, 113, 0.4)'; ctx.lineWidth = cellSize * 0.7; ctx.beginPath();
                ctx.moveTo(offsetX + f.cells[0].c*cellSize + cellSize/2, offsetY + f.cells[0].r*cellSize + cellSize/2);
                ctx.lineTo(offsetX + f.cells[f.cells.length-1].c*cellSize + cellSize/2, offsetY + f.cells[f.cells.length-1].r*cellSize + cellSize/2);
                ctx.stroke();
            });

            if(selection) {
                ctx.strokeStyle = 'rgba(52, 152, 219, 0.4)'; ctx.lineWidth = cellSize * 0.7; ctx.beginPath();
                ctx.moveTo(offsetX + selection.start.c*cellSize + cellSize/2, offsetY + selection.start.r*cellSize + cellSize/2);
                ctx.lineTo(offsetX + selection.end.c*cellSize + cellSize/2, offsetY + selection.end.r*cellSize + cellSize/2);
                ctx.stroke();
            }

            ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = `bold ${cellSize * 0.5}px Segoe UI`;
            for(let r=0; r<gridSize; r++) {
                for(let c=0; c<gridSize; c++) {
                    ctx.fillStyle = 'white'; ctx.fillText(grid[r][c], offsetX + c*cellSize + cellSize/2, offsetY + r*cellSize + cellSize/2);
                }
            }

            ctx.fillStyle = '#f1c40f'; ctx.font = 'bold 24px Segoe UI';
            ctx.fillText(`LUMO WORD`, canvas.width/2, 40);
            ctx.fillStyle = 'white'; ctx.font = '16px Segoe UI';
            ctx.fillText(`Nível: ${level}  -  Score: ${score}`, canvas.width/2, 80);
            
            ctx.font = '14px Segoe UI';
            let wordY = canvas.height - 60;
            const wordListStr = words.map(w => foundWords.some(f => f.word === w) ? `✓ ${w}` : w).join("  ");
            ctx.fillStyle = 'rgba(255,255,255,0.7)';
            ctx.fillText(wordListStr, canvas.width/2, wordY);

            animationId = requestAnimationFrame(draw);
        }

        setupLevel();
        draw();
    }

    // --- MOTOR DO JOGO LUMO GALAXY (.IO SPACE STYLE) ---
    function initLumoGalaxy(container) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        container.appendChild(canvas);

        const WORLD_SIZE = 50000;
        const JOYSTICK_RADIUS = 60;
        const JOYSTICK_BASE_X = canvas.width / 2;
        const JOYSTICK_BASE_Y = canvas.height - 100;

        let joystick = { x: JOYSTICK_BASE_X, y: JOYSTICK_BASE_Y, active: false, angle: 0, pressed: false };
        let player, entities, foods;

        const handleRestart = (clientX, clientY) => {
            if (player && !player.alive) {
                const btnX = canvas.width / 2;
                const btnY = canvas.height / 2 + 60;
                if (Math.abs(clientX - btnX) < 80 && Math.abs(clientY - btnY) < 25) {
                    reset();
                    return true;
                }
            }
            return false;
        };

        const updateJoystick = (clientX, clientY) => {
            const dx = clientX - JOYSTICK_BASE_X;
            const dy = clientY - JOYSTICK_BASE_Y;
            const dist = Math.hypot(dx, dy);
            if (dist > 0) {
                joystick.angle = Math.atan2(dy, dx);
                joystick.active = true;
                const limit = Math.min(dist, JOYSTICK_RADIUS);
                joystick.x = JOYSTICK_BASE_X + Math.cos(joystick.angle) * limit;
                joystick.y = JOYSTICK_BASE_Y + Math.sin(joystick.angle) * limit;
            }
        };

        const resetJoystick = () => { joystick.active = false; joystick.x = JOYSTICK_BASE_X; joystick.y = JOYSTICK_BASE_Y; };

        canvas.addEventListener('mousedown', e => { 
            if (!handleRestart(e.clientX, e.clientY)) {
                joystick.pressed = true; 
                updateJoystick(e.clientX, e.clientY); 
            }
        });
        window.addEventListener('mousemove', e => { if (joystick.pressed) updateJoystick(e.clientX, e.clientY); });
        window.addEventListener('mouseup', () => { joystick.pressed = false; resetJoystick(); });
        canvas.addEventListener('touchstart', e => { 
            const touch = e.touches[0];
            if (!handleRestart(touch.clientX, touch.clientY)) {
                joystick.pressed = true; 
                updateJoystick(touch.clientX, touch.clientY); 
            }
            e.preventDefault(); 
        }, {passive: false});
        canvas.addEventListener('touchmove', e => { if (joystick.pressed) updateJoystick(e.touches[0].clientX, e.touches[0].clientY); e.preventDefault(); }, {passive: false});
        canvas.addEventListener('touchend', () => { joystick.pressed = false; resetJoystick(); });

        class Galaxy {
            constructor(x, y, color, isBot = false) {
                this.x = x; this.y = y; this.color = color; this.isBot = isBot;
                this.radius = isBot ? 15 + Math.random() * 30 : 18;
                this.angle = Math.random() * Math.PI * 2;
                this.speed = 2;
                this.alive = true;
                this.planets = [];
                this.color = color || '#ff4757'; // Usa a cor passada ou o padrão
                this.isVisible = false; // Flag para otimização
                this.foodEaten = 0; // Contador para controle de moedas
                this.type = 'star';
                this.isTransforming = false;
                this.transformationProgress = 0;
                this.rotation = 0;
            }

            addPlanet() {
                const minOrbit = this.radius * 2.5 + 40; 
                const types = ['rocky', 'gaseous', 'icy'];
                this.planets.push({
                    dist: minOrbit + this.planets.length * 35 + Math.random() * 20,
                    angle: Math.random() * Math.PI * 2,
                    speed: (0.005 + Math.random() * 0.015) * (Math.random() > 0.5 ? 1 : -1),
                    size: 2 + Math.random() * 5,
                    color: `hsl(${Math.random() * 360}, 50%, ${50 + Math.random() * 30}%)`,
                    type: types[Math.floor(Math.random() * types.length)]
                });
            }

            update(foods, entities) {
                if (!this.alive) return;

                // Lógica de Transformação
                if (this.isTransforming) {
                    this.transformationProgress += 0.015;
                    if (this.transformationProgress >= 1) {
                        this.type = 'galaxy';
                        this.isTransforming = false;
                        this.radius = 2100; // Salto de expansão após a explosão
                        this.planets = [];  // A galáxia absorve o sistema solar anterior
                    }
                    return; // Trava o movimento durante o "flash" da supernova
                }

                if (this.type === 'star' && this.radius >= 2000) {
                    this.isTransforming = true;
                    this.transformationProgress = 0;
                }

                let targetAngle = this.angle;
                if (!this.isBot) { if (joystick.active) targetAngle = joystick.angle; }
                else { targetAngle = this.updateAI(foods, entities); }

                // Evolução Estelar (Mudança de Cor baseada no Raio)
                if (this.radius < 35) this.color = '#ff4757';      // Anã Vermelha
                else if (this.radius < 70) this.color = '#ffeb3b'; // Estrela Amarela
                else if (this.radius < 110) this.color = '#fdfdfd'; // Estrela Branca
                else this.color = '#4facfe';                      // Gigante Azul

                // Atualiza as órbitas dos planetas
                this.planets.forEach(p => p.angle += p.speed);
                
                // Ganha planetas conforme cresce
                const targetCount = Math.floor(Math.max(0, this.radius - 20) / 15);
                if (this.planets.length < targetCount) this.addPlanet();
                
                // Empurra planetas para fora para manter distância segura da estrela
                this.planets.forEach(p => {
                    const safeZone = this.radius * 2.2 + 20;
                    if (p.dist < safeZone) p.dist += 2;
                });

                // Agilidade baseada no tamanho (menores viram mais rápido)
                const agility = Math.max(0.02, 0.15 / (1 + this.radius * 0.01));
                let diff = targetAngle - this.angle;
                while (diff < -Math.PI) diff += Math.PI * 2;
                while (diff > Math.PI) diff -= Math.PI * 2;
                this.angle += diff * agility;

                this.speed = Math.max(0.5, 6 / (1 + this.radius * 0.015));
                this.x += Math.cos(this.angle) * this.speed;
                this.y += Math.sin(this.angle) * this.speed;

                if (this.type === 'galaxy') {
                    this.rotation += 0.015; // Velocidade de rotação da galáxia
                }

                this.x = Math.max(0, Math.min(WORLD_SIZE, this.x));
                this.y = Math.max(0, Math.min(WORLD_SIZE, this.y));
            }

            updateAI(foods, entities) {
                let threat = null, prey = null;
                let dThreatSq = 800 * 800, dPreySq = 1200 * 1200;

                entities.forEach(other => {
                    if (other === this || !other.alive) return;
                    const dx = other.x - this.x;
                    const dy = other.y - this.y;
                    const distSq = dx * dx + dy * dy;
                    
                    if (distSq > 2000 * 2000) return; // Fora do radar de IA

                    // Fuga: Prioridade máxima
                    if (other.radius > this.radius * 1.15) { 
                        if (distSq < dThreatSq) { dThreatSq = distSq; threat = other; } 
                    }
                    // Caça: Apenas se não houver ameaça imediata
                    else if (this.radius > other.radius * 1.25) { 
                        if (distSq < dPreySq) { dPreySq = distSq; prey = other; } 
                    }
                });

                if (threat) return Math.atan2(this.y - threat.y, this.x - threat.x);
                if (prey) return Math.atan2(prey.y - this.y, prey.x - this.x);
                
                // Se estiver grande, foca menos em comida e mais em exploração/caça
                let food = null, dFoodSq = 600 * 600;
                const step = this.radius > 60 ? 100 : 40; 
                for(let i=0; i<foods.length; i+=step) {
                    const f = foods[i];
                    const dx = f.x - this.x;
                    const dy = f.y - this.y;
                    const distSq = dx * dx + dy * dy;
                    if (distSq < dFoodSq) { dFoodSq = distSq; food = f; }
                }
                
                // Se não houver nada, mantém o curso ou vira levemente para explorar
                if (!food && Math.random() > 0.95) return this.angle + (Math.random() - 0.5);
                return food ? Math.atan2(food.y - this.y, food.x - this.x) : this.angle;
            }

            draw(ctx, cam) {
                ctx.save();
                ctx.translate(this.x - cam.x, this.y - cam.y);
                
                if (this.type === 'star') {
                    // Desenha Sol e Planetas (Lógica original)
                    const glowGrad = ctx.createRadialGradient(0, 0, this.radius, 0, 0, this.radius * 2.8);
                    glowGrad.addColorStop(0, this.color); glowGrad.addColorStop(1, 'transparent');
                    ctx.fillStyle = glowGrad; ctx.beginPath(); ctx.arc(0, 0, this.radius * 2.8, 0, Math.PI * 2); ctx.fill();

                    const sunGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, this.radius * 1.8);
                    const coreColor = this.color === '#ff4757' ? '#ff9f43' : '#fff';
                    sunGrad.addColorStop(0, '#fff'); sunGrad.addColorStop(0.3, coreColor);
                    sunGrad.addColorStop(0.7, this.color); sunGrad.addColorStop(1, darkenColor(this.color, 0.5));
                    ctx.fillStyle = sunGrad; ctx.beginPath(); ctx.arc(0, 0, this.radius * 1.8, 0, Math.PI * 2); ctx.fill();

                    this.planets.forEach(p => {
                        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)'; ctx.lineWidth = 1;
                        ctx.beginPath(); ctx.arc(0, 0, p.dist, 0, Math.PI * 2); ctx.stroke();
                        const px = Math.cos(p.angle) * p.dist; const py = Math.sin(p.angle) * p.dist;
                        ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(px, py, p.size, 0, Math.PI * 2); ctx.fill();
                        ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.beginPath(); ctx.arc(px - p.size*0.3, py - p.size*0.3, p.size*0.4, 0, Math.PI * 2); ctx.fill();
                    });
                } else {
                    // Desenha Galáxia Espiral
                    ctx.rotate(this.rotation);
                    const galaxyGlow = ctx.createRadialGradient(0, 0, 0, 0, 0, this.radius * 1.5);
                    galaxyGlow.addColorStop(0, '#fff');
                    galaxyGlow.addColorStop(0.3, this.color);
                    galaxyGlow.addColorStop(1, 'transparent');
                    ctx.fillStyle = galaxyGlow;
                    ctx.beginPath(); ctx.arc(0, 0, this.radius * 1.5, 0, Math.PI * 2); ctx.fill();

                    // Braços da Galáxia (Segmentos Orgânicos que afinam)
                    const numArms = 4;
                    const dotsPerArm = 40;
                    for (let i = 0; i < numArms; i++) {
                        const startAngle = (i * Math.PI * 2) / numArms;
                        let lastX = 0;
                        let lastY = 0;

                        for (let j = 0; j < dotsPerArm; j++) {
                            const progress = j / dotsPerArm;
                            const r = progress * this.radius * 2.5;
                            const theta = startAngle + progress * 4; 
                            const px = Math.cos(theta) * r;
                            const py = Math.sin(theta) * r;
                            
                            if (j > 0) {
                                ctx.strokeStyle = this.color;
                                // O braço afina conforme se afasta do centro
                                ctx.lineWidth = (this.radius * 0.3) * (1 - progress);
                                ctx.beginPath();
                                ctx.moveTo(lastX, lastY);
                                ctx.lineTo(px, py);
                                ctx.stroke();
                            }
                            
                            if (j % 8 === 0) { 
                                ctx.fillStyle = '#fff';
                                ctx.fillRect(px - 2, py - 2, 4, 4);
                            }
                            lastX = px; lastY = py;
                        }
                    }
                }

                // Efeito de Supernova (Explosão e Expansão)
                if (this.isTransforming) {
                    ctx.beginPath();
                    ctx.arc(0, 0, this.radius * (1 + this.transformationProgress * 8), 0, Math.PI * 2);
                    ctx.fillStyle = `rgba(255, 255, 255, ${1 - this.transformationProgress})`;
                    ctx.fill();
                }

                ctx.restore(); ctx.globalAlpha = 1;
            }
        }

        function reset() {
            player = new Galaxy(WORLD_SIZE/2, WORLD_SIZE/2, playerLumoColor);
            entities = [player];
            for(let i=0; i<400; i++) entities.push(new Galaxy(Math.random()*WORLD_SIZE, Math.random()*WORLD_SIZE, '#ff4757', true));
            foods = [];
            for(let i=0; i<8000; i++) foods.push({x: Math.random()*WORLD_SIZE, y: Math.random()*WORLD_SIZE, color: '#fff', id: Math.random()});
        }

        function gameLoop() {
            if (isPausedGlobal) { animationId = requestAnimationFrame(gameLoop); return; }
            ctx.fillStyle = '#010816'; ctx.fillRect(0, 0, canvas.width, canvas.height);
            // Zoom dinâmico sem trava inferior para permitir crescimento infinito
            const zoom = 0.8 / (1 + (player.radius - 18) * 0.015);
            const cam = { x: player.x - (canvas.width/2)/zoom, y: player.y - (canvas.height/2)/zoom, zoom };
            ctx.save(); ctx.scale(cam.zoom, cam.zoom);

            // Malha Quadriculada (Grid) no fundo
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
            ctx.lineWidth = 1 / cam.zoom;
            ctx.beginPath();
            for(let i=0; i<=WORLD_SIZE; i+=100) {
                ctx.moveTo(i - cam.x, -cam.y); ctx.lineTo(i - cam.x, WORLD_SIZE - cam.y);
                ctx.moveTo(-cam.x, i - cam.y); ctx.lineTo(WORLD_SIZE - cam.x, i - cam.y);
            }
            ctx.stroke();

            // Bordas Visíveis do Universo
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
            ctx.lineWidth = 20 / cam.zoom;
            ctx.strokeRect(-cam.x, -cam.y, WORLD_SIZE, WORLD_SIZE);

            // Estrelas fixas no fundo
            const viewW = canvas.width / cam.zoom;
            const viewH = canvas.height / cam.zoom;
            ctx.fillStyle = 'white';
            for(let i=0; i<400; i++) {
                const x = (Math.sin(i*99) * 0.5 + 0.5) * WORLD_SIZE, y = (Math.cos(i*88) * 0.5 + 0.5) * WORLD_SIZE;
                if (x < cam.x || x > cam.x + viewW || y < cam.y || y > cam.y + viewH) continue;
                ctx.globalAlpha = 0.15; ctx.fillRect(x - cam.x, y - cam.y, 2, 2);
            }
            ctx.globalAlpha = 1;

            // Otimização: Filtra apenas entidades visíveis para processar comida e colisão
            const activeEntities = entities.filter(e => {
                e.isVisible = (e.x > cam.x - e.radius * 10 && e.x < cam.x + viewW + e.radius * 10 &&
                               e.y > cam.y - e.radius * 10 && e.y < cam.y + viewH + e.radius * 10);
                return e.alive && (e === player || e.isVisible);
            });
            
            // Otimização: Loop de comida mais eficiente
            for (let i = 0; i < foods.length; i++) {
                const f = foods[i];
                const isVisible = f.x > cam.x - 20 && f.x < cam.x + viewW + 20 && f.y > cam.y - 20 && f.y < cam.y + viewH + 20;
                
                for (let j = 0; j < activeEntities.length; j++) {
                    const e = activeEntities[j];
                    const dx = e.x - f.x;
                    const dy = e.y - f.y;
                    const magnetRange = e.radius * 8;

                    // Quick check para evitar Math.sqrt desnecessário
                    if (Math.abs(dx) < magnetRange && Math.abs(dy) < magnetRange) {
                        const d = Math.hypot(dx, dy);
                        
                        // Atração Gravitacional
                        if (d < e.radius * 6) {
                            const pull = (1 - d / (e.radius * 6)) * 4;
                            f.x += (dx / d) * pull;
                            f.y += (dy / d) * pull;
                        }

                        // Consumo
                        if (d < e.radius * 1.2) {
                            f.x = Math.random() * WORLD_SIZE;
                            f.y = Math.random() * WORLD_SIZE;
                            
                            if (e.type === 'star' && e.radius < 2000) e.radius += 0.4;
                            else if (e.type === 'galaxy' && e.radius < 3000) e.radius += 0.1;
                            
                            if (e === player) {
                                player.foodEaten++;
                                // Se a massa for > 3000, o custo por moeda aumenta progressivamente
                                let threshold = 10;
                                if (player.radius > 3000) {
                                    threshold = 10 + Math.floor((player.radius - 3000) / 100);
                                }
                                
                                if (player.foodEaten >= threshold) {
                                    rewardCoins(1);
                                    player.foodEaten = 0;
                                }
                            }
                        }
                    }
                }

                if (!isVisible) continue;
                
                // Efeito de cintilação suave na comida
                const pulse = 0.8 + Math.sin(Date.now() * 0.005 + f.id) * 0.2;
                ctx.fillStyle = f.color; ctx.beginPath(); 
                ctx.arc(f.x - cam.x, f.y - cam.y, 3 * pulse, 0, Math.PI*2); ctx.fill();
            }

            entities.forEach((e) => {
                if (!e.alive) return;
                e.update(foods, entities);
                entities.forEach(other => {
                    if (e === other || !other.alive || !e.alive) return;
                    const dx = e.x - other.x;
                    const dy = e.y - other.y;
                    if (Math.abs(dx) > e.radius * 6 || Math.abs(dy) > e.radius * 6) return;
                    const d = Math.sqrt(dx*dx + dy*dy);
                    
                    // Mecânica de Roubo de Massa e Planetas
                    // O alcance de interação é baseado na órbita externa do sistema
                    const interactionRange = (e.radius + other.radius) * 4;
                    if (e.radius > other.radius * 1.1 && d < interactionRange) {
                        const drain = 0.2 * (1 - d/interactionRange);
                        other.radius -= drain;
                        e.radius += drain * 0.85; // Eficiência de conversão de massa

                        if (other.radius < 10) {
                            other.alive = false;
                            if (other.isBot) setTimeout(() => entities.push(new Galaxy(Math.random()*WORLD_SIZE, Math.random()*WORLD_SIZE, '#ff4757', true)), 3000);
                        }
                    }
                });
                if (e.isVisible) e.draw(ctx, cam);
            });
            ctx.restore();
            ctx.globalAlpha = 0.4;
            ctx.beginPath(); ctx.arc(JOYSTICK_BASE_X, JOYSTICK_BASE_Y, JOYSTICK_RADIUS, 0, Math.PI*2); ctx.fillStyle = '#fff'; ctx.fill();
            ctx.beginPath(); ctx.arc(joystick.x, joystick.y, 30, 0, Math.PI*2); ctx.fillStyle = '#fff'; ctx.fill();
            ctx.globalAlpha = 1;
            ctx.fillStyle = "white"; ctx.font = "bold 20px Segoe UI"; ctx.textAlign = "left";
            ctx.fillText(`Massa Galáctica: ${Math.floor(player.radius)}`, 20, 40);

            if (!player.alive) {
                ctx.fillStyle = "rgba(0,0,0,0.85)"; ctx.fillRect(0,0, canvas.width, canvas.height);
                ctx.fillStyle = "white"; ctx.textAlign = "center"; ctx.font = "bold 32px Segoe UI";
                ctx.fillText("SISTEMA ABSORVIDO", canvas.width/2, canvas.height/2 - 20);
                
                // Botão de reiniciar padronizado
                ctx.fillStyle = "#4a90e2";
                ctx.fillRect(canvas.width/2 - 80, canvas.height/2 + 35, 160, 50);
                ctx.fillStyle = "white";
                ctx.font = "bold 18px Segoe UI";
                ctx.fillText("REINICIAR ↻", canvas.width/2, canvas.height/2 + 67);
            }

            animationId = requestAnimationFrame(gameLoop);
        }
        reset(); gameLoop();
    }

    // --- MOTOR DO JOGO DA MEMÓRIA ---
    function initMemory(container) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        container.appendChild(canvas);

        let level = 1, score = 0, cards = [], flipped = [], matched = [], lockBoard = false;
        let rows, cols, cardSize, offsetX, offsetY;
        const COLORS = ['#ff4757', '#2ed573', '#1e90ff', '#ffa502', '#3742fa', '#70a1ff', '#7bed9f', '#eccc68', '#ff6b81', '#5352ed'];

        function setupLevel() {
            matched = []; flipped = []; lockBoard = false;
            // Progressão de dificuldade: 2x2 -> 2x3 -> 3x4 -> 4x4
            if (level === 1) { rows = 2; cols = 2; }
            else if (level === 2) { rows = 2; cols = 3; }
            else if (level === 3) { rows = 3; cols = 4; }
            else { rows = 4; cols = 4; }

            const numPairs = (rows * cols) / 2;
            let pairColors = [];
            for (let i = 0; i < numPairs; i++) {
                const color = COLORS[i % COLORS.length];
                pairColors.push(color, color);
            }
            pairColors.sort(() => Math.random() - 0.5);

            const padding = 20;
            const topMargin = 120;
            cardSize = Math.min((canvas.width - padding * 2) / cols, (canvas.height - topMargin - padding) / rows) - 10;
            offsetX = (canvas.width - (cols * (cardSize + 10))) / 2;
            offsetY = topMargin + (canvas.height - topMargin - (rows * (cardSize + 10))) / 2;

            cards = [];
            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols; c++) {
                    cards.push({
                        r, c, color: pairColors.pop(),
                        isFlipped: false, isMatched: false,
                        anim: 0 
                    });
                }
            }
        }

        function drawLumo(ctx, x, y, size, color) {
            ctx.save();
            ctx.translate(x, y);
            ctx.fillStyle = color;
            ctx.beginPath(); ctx.arc(0, size * 0.05, size * 0.35, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = 'white';
            ctx.beginPath(); ctx.arc(-size * 0.1, 0, size * 0.08, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(size * 0.1, 0, size * 0.08, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = 'black';
            ctx.beginPath(); ctx.arc(-size * 0.1, 0, size * 0.03, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(size * 0.1, 0, size * 0.03, 0, Math.PI * 2); ctx.fill();
            ctx.restore();
        }

        function handleInput(x, y) {
            if (lockBoard) return;
            const c = Math.floor((x - offsetX) / (cardSize + 10));
            const r = Math.floor((y - offsetY) / (cardSize + 10));
            if (r < 0 || r >= rows || c < 0 || c >= cols) return;

            const card = cards.find(card => card.r === r && card.c === c);
            if (!card || card.isFlipped || card.isMatched || flipped.includes(card)) return;

            card.isFlipped = true;
            flipped.push(card);

            if (flipped.length === 2) {
                lockBoard = true;
                if (flipped[0].color === flipped[1].color) {
                    score += 100 * level;
                    rewardCoins(5);
                    setTimeout(() => {
                        flipped.forEach(c => c.isMatched = true);
                        matched.push(...flipped);
                        flipped = [];
                        lockBoard = false;
                        if (matched.length === cards.length) { level++; setTimeout(setupLevel, 800); }
                    }, 600);
                } else {
                    setTimeout(() => {
                        flipped.forEach(c => c.isFlipped = false);
                        flipped = [];
                        lockBoard = false;
                    }, 1000);
                }
            }
        }

        canvas.addEventListener('mousedown', e => handleInput(e.clientX, e.clientY));
        canvas.addEventListener('touchstart', e => { handleInput(e.touches[0].clientX, e.touches[0].clientY); e.preventDefault(); }, {passive: false});

        function draw() {
            if (isPausedGlobal) { animationId = requestAnimationFrame(draw); return; }
            ctx.fillStyle = '#f0f2f5'; ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#333'; ctx.font = 'bold 24px Segoe UI'; ctx.textAlign = 'center';
            ctx.fillText(`MEMÓRIA LUMO`, canvas.width/2, 50);
            ctx.font = '16px Segoe UI'; ctx.fillStyle = '#666';
            ctx.fillText(`Nível: ${level}  |  Score: ${score}`, canvas.width/2, 85);

            cards.forEach(card => {
                const x = offsetX + card.c * (cardSize + 10), y = offsetY + card.r * (cardSize + 10);
                const target = (card.isFlipped || card.isMatched) ? 1 : 0;
                card.anim += (target - card.anim) * 0.15;
                ctx.save();
                ctx.translate(x + cardSize/2, y + cardSize/2);
                ctx.scale(Math.abs(Math.cos(card.anim * Math.PI)), 1);
                if (card.anim > 0.5) {
                    ctx.fillStyle = 'white'; ctx.beginPath(); ctx.roundRect(-cardSize/2, -cardSize/2, cardSize, cardSize, 10); ctx.fill();
                    ctx.strokeStyle = '#ddd'; ctx.lineWidth = 2; ctx.stroke();
                    drawLumo(ctx, 0, 0, cardSize, card.color);
                } else {
                    ctx.fillStyle = '#4a90e2'; ctx.beginPath(); ctx.roundRect(-cardSize/2, -cardSize/2, cardSize, cardSize, 10); ctx.fill();
                    ctx.fillStyle = 'white'; ctx.font = 'bold 30px Segoe UI'; ctx.fillText('?', 0, 10);
                }
                ctx.restore();
            });
            animationId = requestAnimationFrame(draw);
        }
        setupLevel(); draw();
    }

    // --- MOTOR DO JOGO BUBBLE POP ---
    function initBubbles(container) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        container.appendChild(canvas);

        const BUBBLE_RADIUS = Math.min(canvas.width / 18, 20);
        const COLORS = ['#ff4757', '#2ed573', '#1e90ff', '#ffa502', '#3742fa'];
        const GRID_ROWS = 16;
        const GRID_COLS = Math.floor(canvas.width / (BUBBLE_RADIUS * 2));
        const GRID_WIDTH = GRID_COLS * BUBBLE_RADIUS * 2;
        const X_PADDING = (canvas.width - GRID_WIDTH) / 2;
        
        let grid = [], bullet = null, score = 0, isMoving = false, isAiming = false, particles = [];
        let shooter = { x: X_PADDING + (GRID_WIDTH / 2), y: canvas.height - 100, angle: -Math.PI / 2, color: '', nextColor: '', shots: 0 };

        // Configurações de Fundo Animado
        let bgHue = Math.random() * 360;
        let stars = Array.from({ length: 80 }, () => ({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            size: Math.random() * 2 + 0.5,
            speed: 0.02 + Math.random() * 0.05,
            phase: Math.random() * Math.PI * 2
        }));

        function createGrid() {
            grid = [];
            for (let r = 0; r < GRID_ROWS; r++) {
                grid[r] = [];
                const cols = r % 2 === 0 ? GRID_COLS : GRID_COLS - 1;
                for (let c = 0; c < cols; c++) {
                    grid[r][c] = r < 5 ? { color: COLORS[Math.floor(Math.random() * COLORS.length)], scale: 1 } : null;
                }
            }
        }

        function addRow() {
            const newRow = [];
            const isEven = grid.length % 2 === 0;
            const cols = isEven ? GRID_COLS : GRID_COLS - 1;
            for (let c = 0; c < cols; c++) {
                newRow.push({ color: COLORS[Math.floor(Math.random() * COLORS.length)], scale: 0 });
            }
            grid.unshift(newRow);
            if (grid.length > GRID_ROWS) grid.pop();
            checkGameOver();
        }

        function getBubbleCoords(r, c) {
            const offset = r % 2 === 0 ? 0 : BUBBLE_RADIUS;
            return {
                x: X_PADDING + c * BUBBLE_RADIUS * 2 + BUBBLE_RADIUS + offset,
                y: r * BUBBLE_RADIUS * 1.7 + BUBBLE_RADIUS + 100
            };
        }

        function resetShooter() {
            shooter.color = shooter.nextColor || COLORS[Math.floor(Math.random() * COLORS.length)];
            shooter.nextColor = COLORS[Math.floor(Math.random() * COLORS.length)];
            bullet = null; isMoving = false;
        }

        function handleStart(clientX, clientY) {
            if (isMoving || score === 'GAME OVER' || score === 'VITÓRIA') return;
            const dx = clientX - shooter.x, dy = clientY - shooter.y;
            if (dy > 0) return;
            isAiming = true;
            shooter.angle = Math.atan2(dy, dx);
        }

        function handleMove(clientX, clientY) {
            if (!isAiming) return;
            const dx = clientX - shooter.x, dy = clientY - shooter.y;
            shooter.angle = Math.atan2(dy, dx);
        }

        function handleEnd() {
            if (!isAiming) return;
            isAiming = false;
            bullet = { x: shooter.x, y: shooter.y, vx: Math.cos(shooter.angle) * 15, vy: Math.sin(shooter.angle) * 15, color: shooter.color };
            isMoving = true;
        }

        canvas.addEventListener('mousedown', e => handleStart(e.clientX, e.clientY));
        window.addEventListener('mousemove', e => handleMove(e.clientX, e.clientY));
        window.addEventListener('mouseup', handleEnd);

        canvas.addEventListener('touchstart', e => { 
            handleStart(e.touches[0].clientX, e.touches[0].clientY); 
            e.preventDefault(); 
        }, { passive: false });
        canvas.addEventListener('touchmove', e => { 
            handleMove(e.touches[0].clientX, e.touches[0].clientY); 
        }, { passive: false });
        canvas.addEventListener('touchend', handleEnd);

        function update() {
            if (bullet) {
                bullet.x += bullet.vx; bullet.y += bullet.vy;
                if (bullet.x - BUBBLE_RADIUS < 0 || bullet.x + BUBBLE_RADIUS > canvas.width) bullet.vx *= -1;

                let collision = false;
                if (checkCollisionAt(bullet.x, bullet.y)) collision = true;
                
                if (collision || bullet.y - BUBBLE_RADIUS < 100) snapToGrid();
            }
            particles = particles.filter(p => { p.x += p.vx; p.y += p.vy; p.life -= 0.02; return p.life > 0; });
        }

        // Função auxiliar para checar colisão em um ponto
        function checkCollisionAt(x, y) {
            let collision = false;
                for (let r = 0; r < grid.length; r++) {
                    for (let c = 0; c < grid[r].length; c++) {
                        if (grid[r][c]) {
                            const coords = getBubbleCoords(r, c);
                            if (Math.hypot(x - coords.x, y - coords.y) < BUBBLE_RADIUS * 1.6) { collision = true; break; }
                        }
                    }
                    if (collision) break;
                }
            return collision;
        }

        function getSnapPosition(x, y) {
            let best = { r: 0, c: 0, dist: Infinity };
            for (let r = 0; r < grid.length; r++) {
                const cols = r % 2 === 0 ? GRID_COLS : GRID_COLS - 1;
                for (let c = 0; c < cols; c++) {
                    if (!grid[r][c]) {
                        const coords = getBubbleCoords(r, c);
                        const d = Math.hypot(x - coords.x, y - coords.y);
                        if (d < best.dist) best = { r, c, dist: d };
                    }
                }
            }
            return best;
        }

        function snapToGrid() {
            const best = getSnapPosition(bullet.x, bullet.y);
            grid[best.r][best.c] = { color: bullet.color, scale: 0 };
            const matches = findMatches(best.r, best.c, bullet.color);
            if (matches.length >= 3) {
                matches.forEach(m => {
                    const coords = getBubbleCoords(m.r, m.c);
                    createExplosion(coords.x, coords.y, grid[m.r][m.c].color);
                    grid[m.r][m.c] = null;
                });
                score += matches.length * 10;
                rewardCoins(Math.floor(matches.length / 2));
                dropIsolated();
            }
            
            shooter.shots++;
            if (shooter.shots >= 6) {
                addRow();
                shooter.shots = 0;
            }

            checkGameOver();
            resetShooter();
        }

        function checkGameOver() {
            let empty = true;
            for (let r = 0; r < grid.length; r++) {
                for (let c = 0; c < grid[r].length; c++) {
                    if (grid[r][c]) {
                        empty = false;
                        const coords = getBubbleCoords(r, c);
                        if (coords.y > shooter.y - BUBBLE_RADIUS * 2) score = 'GAME OVER';
                    }
                }
            }
            if (empty && score !== 'GAME OVER') score = 'VITÓRIA';
        }

        function findMatches(r, c, color) {
            let matches = [], queue = [{ r, c }], visited = new Set([`${r},${c}`]);
            while (queue.length > 0) {
                let curr = queue.shift();
                if (grid[curr.r][curr.c] && grid[curr.r][curr.c].color === color) {
                    matches.push(curr);
                    getNeighbors(curr.r, curr.c).forEach(n => {
                        let key = `${n.r},${n.c}`;
                        if (!visited.has(key) && grid[n.r][n.c] && grid[n.r][n.c].color === color) { visited.add(key); queue.push(n); }
                    });
                }
            }
            return matches;
        }

        function getNeighbors(r, c) {
            let neighbors = [];
            const isEven = r % 2 === 0;
            const offsets = isEven ? [[0,-1], [0,1], [-1,-1], [-1,0], [1,-1], [1,0]] : [[0,-1], [0,1], [-1,0], [-1,1], [1,0], [1,1]];
            offsets.forEach(o => {
                let nr = r + o[0], nc = c + o[1];
                if (grid[nr] && grid[nr][nc] !== undefined) neighbors.push({ r: nr, c: nc });
            });
            return neighbors;
        }

        function dropIsolated() {
            let connected = new Set(), queue = [];
            for (let c = 0; c < grid[0].length; c++) if (grid[0][c]) { connected.add(`0,${c}`); queue.push({ r: 0, c }); }
            while (queue.length > 0) {
                let curr = queue.shift();
                getNeighbors(curr.r, curr.c).forEach(n => {
                    let key = `${n.r},${n.c}`;
                    if (!connected.has(key) && grid[n.r][n.c]) { connected.add(key); queue.push(n); }
                });
            }
            for (let r = 0; r < grid.length; r++) {
                for (let c = 0; c < grid[r].length; c++) {
                    if (grid[r][c] && !connected.has(`${r},${c}`)) {
                        const coords = getBubbleCoords(r, c);
                        createExplosion(coords.x, coords.y, grid[r][c].color);
                        grid[r][c] = null; score += 5;
                    }
                }
            }
        }

        function createExplosion(x, y, color) {
            for (let i = 0; i < 8; i++) {
                particles.push({ x, y, vx: (Math.random() - 0.5) * 6, vy: (Math.random() - 0.5) * 6, life: 1.0, color, size: Math.random() * 3 + 1 });
            }
        }

        function drawFancyBubble(x, y, color, radius) {
            if (radius < 2.1) return; // Evita desenhar bolhas minúsculas que causariam erro de raio negativo
            ctx.save();
            ctx.shadowBlur = 8; ctx.shadowColor = 'rgba(0,0,0,0.1)';
            const grad = ctx.createRadialGradient(x - radius/3, y - radius/3, radius/10, x, y, radius);
            grad.addColorStop(0, '#fff');
            grad.addColorStop(0.3, color);
            grad.addColorStop(1, darkenColor(color, 0.4));
            ctx.fillStyle = grad;
            ctx.beginPath(); ctx.arc(x, y, Math.max(0, radius - 2), 0, Math.PI * 2); ctx.fill();
            ctx.globalAlpha = 0.4;
            ctx.fillStyle = 'white';
            ctx.beginPath(); ctx.ellipse(x - radius/2.5, y - radius/2.5, radius/4, radius/6, Math.PI/4, 0, Math.PI*2); ctx.fill();
            ctx.restore();
        }

        function draw() {
            if (isPausedGlobal) { animationId = requestAnimationFrame(draw); return; }
            // Fundo Animado com Gradiente e Estrelas
            bgHue += 0.1;
            const c1 = `hsl(${(bgHue) % 360}, 40%, 10%)`;
            const c2 = `hsl(${(bgHue + 40) % 360}, 45%, 15%)`;
            const bgGrad = ctx.createRadialGradient(canvas.width/2, canvas.height/2, 0, canvas.width/2, canvas.height/2, canvas.height);
            bgGrad.addColorStop(0, c2); bgGrad.addColorStop(1, c1);
            ctx.fillStyle = bgGrad; ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            stars.forEach(s => {
                const alpha = 0.1 + Math.abs(Math.sin(Date.now() * s.speed + s.phase)) * 0.6;
                ctx.globalAlpha = alpha;
                ctx.fillStyle = 'white';
                ctx.beginPath(); ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2); ctx.fill();
            });
            ctx.globalAlpha = 1;

            // Linha de Trajetória Contínua e Infinita (que para em colisão)
            if (isAiming && !bullet) {
                let tx = shooter.x, ty = shooter.y;
                let tvx = Math.cos(shooter.angle) * 5, tvy = Math.sin(shooter.angle) * 5;
                const maxSteps = 300;

                ctx.save();
                ctx.lineCap = 'round';
                ctx.strokeStyle = 'rgba(255,255,255,0.15)'; 
                for(let i=0; i<maxSteps; i++) {
                    let prevX = tx, prevY = ty;
                    tx += tvx; ty += tvy;
                    if (tx < BUBBLE_RADIUS || tx > canvas.width - BUBBLE_RADIUS) tvx *= -1;
                    
                    // Diminui a espessura gradualmente de acordo com a distância (i)
                    ctx.lineWidth = Math.max(1, (BUBBLE_RADIUS * 1.2) * (1 - i / maxSteps));
                    ctx.beginPath();
                    ctx.moveTo(prevX, prevY);
                    ctx.lineTo(tx, ty);
                    ctx.stroke();

                    if (checkCollisionAt(tx, ty)) break;
                    if (ty < 100) break;
                }
                ctx.restore();

                // Prévia transparente de onde a bolinha vai encaixar
                const snap = getSnapPosition(tx, ty);
                const previewPos = getBubbleCoords(snap.r, snap.c);
                ctx.globalAlpha = 0.4;
                drawFancyBubble(previewPos.x, previewPos.y, shooter.color, BUBBLE_RADIUS);
                ctx.globalAlpha = 1;
            }

            // Partículas de estouro
            particles.forEach(p => {
                ctx.globalAlpha = p.life; ctx.fillStyle = p.color; ctx.shadowBlur = 5; ctx.shadowColor = p.color;
                ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
            });
            ctx.globalAlpha = 1;

            for (let r = 0; r < grid.length; r++) {
                for (let c = 0; c < grid[r].length; c++) {
                    if (grid[r][c]) {
                        const bubble = grid[r][c];
                        if (bubble.scale < 1) bubble.scale += 0.05; // Animação de surgimento
                        const coords = getBubbleCoords(r, c);
                        drawFancyBubble(coords.x, coords.y, bubble.color, BUBBLE_RADIUS * bubble.scale);
                    }
                }
            }

            // Atirador e Próxima Bolha
            if (bullet) {
                drawFancyBubble(bullet.x, bullet.y, bullet.color, BUBBLE_RADIUS);
            } else if (!isMoving && score !== 'GAME OVER' && score !== 'VITÓRIA') {
                drawFancyBubble(shooter.x, shooter.y, shooter.color, BUBBLE_RADIUS);
            }

            // Painel lateral de Próxima
            ctx.fillStyle = 'rgba(255,255,255,0.1)'; ctx.beginPath();
            ctx.roundRect(canvas.width - 70, canvas.height - 130, 60, 110, 15); ctx.fill();
            ctx.fillStyle = 'white'; ctx.font = '10px Segoe UI'; ctx.fillText('PRÓXIMA', canvas.width - 40, canvas.height - 110);
            drawFancyBubble(canvas.width - 40, canvas.height - 80, shooter.nextColor, BUBBLE_RADIUS * 0.8);
            
            // Placar e Status
            ctx.fillStyle = '#f5f6fa'; ctx.font = 'bold 26px Segoe UI'; ctx.textAlign = 'center';
            ctx.shadowBlur = 4; ctx.shadowColor = 'rgba(0,0,0,0.1)';
            if (typeof score === 'string') {
                ctx.fillStyle = score === 'VITÓRIA' ? '#2ed573' : '#ff4757';
                ctx.fillText(score, canvas.width/2, canvas.height/2);
                ctx.font = '16px Segoe UI'; ctx.fillStyle = 'white'; ctx.fillText('TOQUE PARA REINICIAR', canvas.width/2, canvas.height/2 + 40);
            } else {
                ctx.fillText(`SCORE: ${score}`, canvas.width/2, 60);
            }
            ctx.shadowBlur = 0;

            if (typeof score !== 'string') update();
            animationId = requestAnimationFrame(draw);
        }

        createGrid(); resetShooter(); draw();
    }

    // --- MOTOR DO JOGO LUMO JUMP (DOODLE STYLE) ---
    function initLumoJump(container) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        container.appendChild(canvas);

        let platforms = [], player, score = 0, state = 'start';
        const GRAVITY = 0.35, JUMP_FORCE = -11;

        let tilt = { x: 0 };
        function handleOrientation(e) {
            tilt.x = e.gamma || 0;
        }

        class Player {
            constructor() {
                this.x = canvas.width / 2; this.y = canvas.height - 150;
                this.radius = 20; this.vy = JUMP_FORCE; this.vx = 0;
                this.color = playerLumoColor;
            }
            update() {
                if (Math.abs(tilt.x) > 1) {
                    this.vx = tilt.x * 0.5; // Sensibilidade da inclinação
                }
                this.vy += GRAVITY; this.y += this.vy; this.x += this.vx;
                if (this.x < 0) this.x = canvas.width;
                if (this.x > canvas.width) this.x = 0;
            }
            draw() {
                ctx.save(); 
                ctx.translate(this.x, this.y);
                
                // Efeito Squash & Stretch baseado na velocidade vertical
                const stretch = Math.min(0.25, Math.abs(this.vy) * 0.02);
                if (this.vy < 0) ctx.scale(1 - stretch, 1 + stretch); // Estica subindo
                else ctx.scale(1 + stretch, 1 - stretch); // Achata caindo

                ctx.fillStyle = this.color;
                ctx.beginPath(); ctx.arc(0, 0, this.radius, 0, Math.PI * 2); ctx.fill();
                
                // Detalhes do Rosto
                ctx.fillStyle = 'white';
                ctx.beginPath(); ctx.arc(-7, -5, 6, 0, Math.PI * 2); ctx.fill();
                ctx.beginPath(); ctx.arc(7, -5, 6, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = 'black';
                ctx.beginPath(); ctx.arc(-7 + (this.vx * 0.5), -5 + (this.vy * 0.1), 2.5, 0, Math.PI * 2); ctx.fill();
                ctx.beginPath(); ctx.arc(7 + (this.vx * 0.5), -5 + (this.vy * 0.1), 2.5, 0, Math.PI * 2); ctx.fill();
                ctx.restore();
            }
        }

        class Platform {
            constructor(y, type = 'normal') {
                this.w = 75; this.h = 14;
                this.x = Math.random() * (canvas.width - this.w - 20) + 10; this.y = y;
                this.type = type; // 'normal', 'moving', 'breakable'
                this.vx = type === 'moving' ? (Math.random() < 0.5 ? 2 : -2) : 0;
                this.color = type === 'moving' ? '#54a0ff' : (type === 'breakable' ? '#ee5253' : '#1dd1a1');
            }
            update() {
                this.x += this.vx;
                if (this.x < 0 || this.x + this.w > canvas.width) this.vx *= -1;
            }
            draw() {
                ctx.save();
                // Sombra da plataforma
                ctx.fillStyle = 'rgba(0,0,0,0.1)';
                if (ctx.roundRect) ctx.roundRect(this.x + 4, this.y + 4, this.w, this.h, 7); else ctx.fillRect(this.x + 4, this.y + 4, this.w, this.h);
                ctx.fill();

                ctx.fillStyle = this.color;
                ctx.beginPath();
                if (ctx.roundRect) ctx.roundRect(this.x, this.y, this.w, this.h, 7); else ctx.fillRect(this.x, this.y, this.w, this.h);
                ctx.fill();

                // Textura de "Doodle"
                ctx.strokeStyle = 'rgba(0,0,0,0.15)'; ctx.lineWidth = 1.5;
                if (this.type === 'breakable') {
                    ctx.beginPath(); ctx.moveTo(this.x + 25, this.y); ctx.lineTo(this.x + 35, this.y + this.h);
                    ctx.moveTo(this.x + 45, this.y); ctx.lineTo(this.x + 55, this.y + this.h); ctx.stroke();
                } else {
                    for(let i=10; i<this.w; i+=20) { ctx.beginPath(); ctx.arc(this.x + i, this.y + 7, 2, 0, Math.PI*2); ctx.fill(); }
                }
                ctx.restore();
            }
        }

        function reset() {
            score = 0; state = 'playing'; player = new Player(); platforms = [];
            platforms.push(new Platform(canvas.height - 60)); // Base
            for(let i = 1; i < 9; i++) spawnPlatform(canvas.height - (i * 90));
        }

        function spawnPlatform(y) {
            let type = 'normal';
            if (score > 1500 && Math.random() < 0.25) type = 'moving';
            if (score > 3000 && Math.random() < 0.15) type = 'breakable';
            platforms.push(new Platform(y, type));
        }

        const input = (clientX) => {
            if (state === 'start') { 
                if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
                    DeviceOrientationEvent.requestPermission()
                        .then(permissionState => {
                            if (permissionState === 'granted') window.addEventListener('deviceorientation', handleOrientation);
                        })
                        .catch(console.error);
                } else {
                    window.addEventListener('deviceorientation', handleOrientation);
                }
                state = 'playing'; return; }
            if (state === 'gameover') { reset(); return; }
            player.vx = (clientX - player.x) * 0.12;
        };

        canvas.addEventListener('mousemove', e => input(e.clientX));
        canvas.addEventListener('touchstart', e => { input(e.touches[0].clientX); e.preventDefault(); }, {passive:false});

        function draw() {
            if (isPausedGlobal) { animationId = requestAnimationFrame(draw); return; }
            // Fundo estilo papel quadriculado
            ctx.fillStyle = '#fbf8e6'; ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.strokeStyle = '#e1e8f0'; ctx.lineWidth = 1;
            for(let i=0; i<canvas.width; i+=40) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, canvas.height); ctx.stroke(); }
            for(let i=0; i<canvas.height; i+=40) { ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(canvas.width, i); ctx.stroke(); }
            ctx.strokeStyle = 'rgba(255,0,0,0.1)'; ctx.beginPath(); ctx.moveTo(60, 0); ctx.lineTo(60, canvas.height); ctx.stroke();

            if (state === 'playing') {
                player.update();
                if (player.y < canvas.height / 2) {
                    const diff = canvas.height / 2 - player.y; player.y = canvas.height / 2;
                    score += Math.floor(diff/5); platforms.forEach(p => p.y += diff);
                    if (Math.floor(score/100) > Math.floor((score - diff/5)/100)) rewardCoins(1);
                }
                if (player.vy > 0) {
                    platforms.forEach((p, i) => {
                        if (player.x + 15 > p.x && player.x - 15 < p.x + p.w && player.y + 20 > p.y && player.y + 20 < p.y + p.h + player.vy) {
                            if (p.type === 'breakable') platforms.splice(i, 1);
                            else player.vy = JUMP_FORCE;
                        }
                    });
                }
                platforms = platforms.filter(p => p.y < canvas.height);
                while (platforms.length < 9) {
                    const highestY = platforms.reduce((min, p) => Math.min(min, p.y), canvas.height);
                    spawnPlatform(highestY - (70 + Math.random() * 50));
                }
                if (player.y > canvas.height + 50) state = 'gameover';
            }
            platforms.forEach(p => { p.update(); p.draw(); }); player.draw();
            
            ctx.fillStyle = '#576574'; ctx.font = 'bold 28px Segoe UI'; ctx.textAlign = 'center';
            ctx.shadowBlur = 4; ctx.shadowColor = 'rgba(0,0,0,0.1)';
            ctx.fillText(score, canvas.width/2, 60); ctx.shadowBlur = 0;

            if (state === 'start') { ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.font = 'bold 22px Segoe UI'; ctx.fillText('INCLINE PARA MOVER', canvas.width/2, canvas.height/2); }
            if (state === 'gameover') { ctx.fillStyle = '#ee5253'; ctx.font = 'bold 32px Segoe UI'; ctx.fillText('CAIU!', canvas.width/2, canvas.height/2); }
            animationId = requestAnimationFrame(draw);
        }
        reset(); state = 'start'; draw();
    }

    // --- MOTOR DO JOGO LUMO SIMON (SIMON SAYS) ---
    function initLumoSimon(container) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        container.appendChild(canvas);

        let sequence = [], userSequence = [], state = 'start', activeBtn = -1;
        const BUTTONS = [
            { color: '#ff4757', light: '#ff6b81' }, // Vermelho
            { color: '#2ed573', light: '#7bed9f' }, // Verde
            { color: '#1e90ff', light: '#70a1ff' }, // Azul
            { color: '#ffa502', light: '#eccc68' }  // Amarelo
        ];

        const margin = 20, topMargin = 120;
        const btnSize = Math.min((canvas.width - margin * 3) / 2, (canvas.height - topMargin - margin * 2) / 2);
        const offsetX = (canvas.width - (btnSize * 2 + margin)) / 2;
        const offsetY = topMargin + (canvas.height - topMargin - (btnSize * 2 + margin)) / 2;

        const setupBtns = () => {
            BUTTONS[0].x = offsetX; BUTTONS[0].y = offsetY;
            BUTTONS[1].x = offsetX + btnSize + margin; BUTTONS[1].y = offsetY;
            BUTTONS[2].x = offsetX; BUTTONS[2].y = offsetY + btnSize + margin;
            BUTTONS[3].x = offsetX + btnSize + margin; BUTTONS[3].y = offsetY + btnSize + margin;
        };

        function nextLevel() {
            sequence.push(Math.floor(Math.random() * 4));
            userSequence = [];
            playSequence();
        }

        function playSequence() {
            state = 'watch';
            let i = 0;
            const interval = setInterval(() => {
                if (state === 'gameover') { clearInterval(interval); return; }
                activeBtn = sequence[i];
                setTimeout(() => { if(state !== 'gameover') activeBtn = -1; }, 400);
                i++;
                if (i >= sequence.length) {
                    clearInterval(interval);
                    setTimeout(() => { if(state !== 'gameover') state = 'play'; }, 600);
                }
            }, 800);
        }

        function handleInput(x, y) {
            if (state === 'start' || state === 'gameover') {
                sequence = []; nextLevel(); return;
            }
            if (state !== 'play') return;

            let clickedIdx = -1;
            BUTTONS.forEach((btn, i) => {
                if (x > btn.x && x < btn.x + btnSize && y > btn.y && y < btn.y + btnSize) clickedIdx = i;
            });

            if (clickedIdx !== -1) {
                activeBtn = clickedIdx;
                setTimeout(() => { if(state !== 'gameover') activeBtn = -1; }, 200);
                userSequence.push(clickedIdx);
                
                if (userSequence[userSequence.length - 1] !== sequence[userSequence.length - 1]) {
                    state = 'gameover';
                    activeBtn = -1;
                } else if (userSequence.length === sequence.length) {
                    rewardCoins(5);
                    state = 'watch';
                    setTimeout(nextLevel, 1000);
                }
            }
        }

        canvas.addEventListener('mousedown', e => handleInput(e.clientX, e.clientY));
        canvas.addEventListener('touchstart', e => { handleInput(e.touches[0].clientX, e.touches[0].clientY); e.preventDefault(); }, {passive:false});

        function draw() {
            if (isPausedGlobal) { animationId = requestAnimationFrame(draw); return; }
            ctx.fillStyle = '#f0f2f5'; ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#333'; ctx.font = 'bold 24px Segoe UI'; ctx.textAlign = 'center';
            ctx.fillText(`LUMO SIMON`, canvas.width/2, 50);
            ctx.font = '16px Segoe UI'; ctx.fillStyle = '#666';
            ctx.fillText(`Nível: ${sequence.length}  |  ${state === 'watch' ? 'OBSERVE A SEQUÊNCIA' : (state === 'play' ? 'SUA VEZ!' : 'TOQUE PARA INICIAR')}`, canvas.width/2, 85);

            setupBtns();
            BUTTONS.forEach((btn, i) => {
                ctx.fillStyle = (activeBtn === i) ? btn.light : btn.color;
                ctx.shadowBlur = (activeBtn === i) ? 25 : 0;
                ctx.shadowColor = btn.light;
                ctx.beginPath();
                if (ctx.roundRect) ctx.roundRect(btn.x, btn.y, btnSize, btnSize, 20); else ctx.fillRect(btn.x, btn.y, btnSize, btnSize);
                ctx.fill();
                ctx.shadowBlur = 0;
                
                if (activeBtn === i) {
                    ctx.strokeStyle = 'white'; ctx.lineWidth = 4; ctx.stroke();
                }
            });

            if (state === 'start' || state === 'gameover') {
                ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(0,0, canvas.width, canvas.height);
                ctx.fillStyle = 'white'; ctx.font = 'bold 26px Segoe UI';
                ctx.fillText(state === 'start' ? 'VAMOS COMEÇAR?' : 'SEQUÊNCIA ERRADA!', canvas.width/2, canvas.height/2 - 20);
                ctx.font = '18px Segoe UI'; ctx.fillText('TOQUE EM QUALQUER LUGAR', canvas.width/2, canvas.height/2 + 30);
            }

            animationId = requestAnimationFrame(draw);
        }
        draw();
    }
});