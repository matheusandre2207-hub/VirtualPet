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

    // Mapeamento dos Jogos
    const games = {
        slither: (container) => initLumoIO(container),
        citybloxx: () => "Carregando Lumo Tower (Empilhamento)...",
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
        let mouse = { x: canvas.width / 2, y: canvas.height / 2, pressed: false, isDoubleHold: false };
        let player, snakes, foods;
        let lastClickTime = 0;

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

        window.addEventListener('mousemove', e => { 
            mouse.x = e.clientX; 
            mouse.y = e.clientY; 
        });
        window.addEventListener('mousedown', e => { 
            mouse.x = e.clientX; 
            mouse.y = e.clientY; 
            if (!handleInput(e.clientX, e.clientY)) mouse.pressed = true; 
        });
        window.addEventListener('mouseup', () => { mouse.pressed = false; mouse.isDoubleHold = false; });
        window.addEventListener('touchstart', e => {
            const touch = e.touches[0];
            mouse.x = touch.clientX; 
            mouse.y = touch.clientY;
            if (handleInput(touch.clientX, touch.clientY)) e.preventDefault();
            else { mouse.pressed = true; e.preventDefault(); }
        }, {passive: false});
        window.addEventListener('touchend', () => { mouse.pressed = false; mouse.isDoubleHold = false; });
        window.addEventListener('touchmove', e => { 
            mouse.x = e.touches[0].clientX; 
            mouse.y = e.touches[0].clientY; 
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
                    targetAngle = Math.atan2(mouse.y - canvas.height/2, mouse.x - canvas.width/2);
                } else {
                    targetAngle = this.updateAI(foods, snakes);
                }

                // Interpolação angular suave
                let diff = targetAngle - this.angle;
                while (diff < -Math.PI) diff += Math.PI * 2;
                while (diff > Math.PI) diff -= Math.PI * 2;
                this.angle += diff * 0.1;

                // 2. Aceleração (Boost) com Dívida de Massa
                const wantsToBoost = (!this.isBot && mouse.isDoubleHold);
                const canBoost = this.boostDebt <= 0 && this.segmentsCount > 8 && this.boostTimeLeft > 0;

                if (wantsToBoost && canBoost) {
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
                    this.wanderTarget = null; // Reseta alvo se estiver em perigo
                    return Math.atan2(this.y - dangerPoint.y, this.x - dangerPoint.x);
                }

                // 2. Busca de Comida (Global)
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
                    return Math.atan2(targetFood.y - this.y, targetFood.x - this.x);
                }

                // 3. Vadiagem (Wander) - Se não houver nada perto, escolhe um ponto aleatório
                if (!this.wanderTarget || Math.hypot(this.x - this.wanderTarget.x, this.y - this.wanderTarget.y) < 50) {
                    this.wanderTarget = { x: Math.random() * WORLD_SIZE, y: Math.random() * WORLD_SIZE };
                }
                return Math.atan2(this.wanderTarget.y - this.y, this.wanderTarget.x - this.x);
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
                
                // Desenhar Rastro (Corda)
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

                // Cabeça
                ctx.fillStyle = this.color;
                ctx.beginPath();
                ctx.arc(this.x - cam.x, this.y - cam.y, this.radius, 0, Math.PI * 2);
                ctx.fill();
                
                // Olhos
                ctx.fillStyle = 'white';
                const eyeX = this.x - cam.x + Math.cos(this.angle) * 5;
                const eyeY = this.y - cam.y + Math.sin(this.angle) * 5;
                ctx.beginPath(); ctx.arc(eyeX, eyeY, 4, 0, Math.PI*2); ctx.fill();
            }
        }

        function resetGame() {
            player = new Snake(WORLD_SIZE/2, WORLD_SIZE/2, '#4a90e2');
            snakes = [player];
            for(let i=0; i<15; i++) {
                snakes.push(new Snake(200 + Math.random()*(WORLD_SIZE-400), 
                                    200 + Math.random()*(WORLD_SIZE-400), 
                                    `hsl(${Math.random()*360}, 70%, 50%)`, true));
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
});