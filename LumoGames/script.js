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

    // Mapeamento dos Jogos
    const games = {
        slither: (container) => initLumoIO(container),
        citybloxx: (container) => initLumoTower(container),
        snake: () => "Iniciando Snake clássico...",
        flappy: () => "Flappy Lumo: Toque para voar!",
        match3: () => "Lumo Crush: Combine 3 itens!",
        slice: () => "Lumo Slice: Use o dedo como espada!",
        dash: () => "Lumo Dash: Corra e desvie!",
        catch: () => "Catch Lumo: Não deixe cair!",
        memory: () => "Jogo da Memória do Lumo...",
        bubbles: () => "Bubble Pop: Mire e estoure!",
        jump: () => "Lumo Jump: Suba sem parar!",
        simon: () => "Lumo Simon: Repita a sequência!"
    };

    // Adiciona evento de clique em cada card
    cards.forEach(card => {
        card.addEventListener('click', () => {
            const gameKey = card.getAttribute('data-game');
            openGame(gameKey);
        });
    });

    function openGame(key) {
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

        // Função utilitária para escurecer uma cor (simplificada para hex e HSL)
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
            constructor(x, y, color, isBot = false) {
                this.x = x; this.y = y; this.color = color; this.isBot = isBot;
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
                    const aiResult = this.updateAI(foods, snakes);
                    targetAngle = aiResult.angle;
                    this.isBoosting = aiResult.boost;
                }

                // Interpolação angular suave
                let diff = targetAngle - this.angle;
                while (diff < -Math.PI) diff += Math.PI * 2;
                while (diff > Math.PI) diff -= Math.PI * 2;
                this.angle += diff * 0.1;

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
            // Player snake uses the color and dot pattern received from the main Lumo pet
            player = new Snake(WORLD_SIZE/2, WORLD_SIZE/2, playerLumoColor, false);
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
                snakes.push(new Snake(200 + Math.random()*(WORLD_SIZE-400), 200 + Math.random()*(WORLD_SIZE-400), color, true));
            }
            foods = [];
            for(let i=0; i<400; i++) {
                foods.push(new Food(Math.random()*WORLD_SIZE, Math.random()*WORLD_SIZE, '#fff'));
            }
            mouse.pressed = false;
        }

        resetGame();

        function gameLoop() {
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

            // HUD Simples
            ctx.fillStyle = "white";
            ctx.font = "bold 20px Segoe UI";
            ctx.textAlign = "left";
            ctx.fillText(`Massa: ${Math.floor(player.segmentsCount)}`, 20, 40);
            
            // Indicador de Boost
            const boostStatus = player.boostDebt > 0 
                ? `Recarregando: ${Math.ceil(player.boostDebt)} unidades` 
                : `Boost: ${Math.max(0, player.boostTimeLeft).toFixed(1)}s (2-cliques)`;
            ctx.fillStyle = player.boostDebt > 0 ? "#ff4757" : "#2ed573";
            ctx.fillText(boostStatus, 20, 70);

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
});