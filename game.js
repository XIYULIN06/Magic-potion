class WaterSortGame {
    constructor() {
        this.selectedBottle = null;
        this.bottles = [
            { colors: [], capacity: 4 }, // 瓶子0
            { colors: [], capacity: 4 }, // 瓶子1
            { colors: [], capacity: 4 }, // 瓶子2
            { colors: [], capacity: 4 }  // 瓶子3
        ];
        this.currentLevel = 1;
        this.maxLevels = 10;
        this.timeLeft = 60;
        this.timerInterval = null;
        this.gameActive = true;
        this.isPaused = false;
        this.backgroundMusic = null;
        this.powerups = 0; // 道具数量
        this.introVideo = null; // 开场视频
        this.introOverlay = null; // 开场视频遮罩
        this.isIntroPlaying = true; // 是否正在播放开场视频
        this.introSound = null; // 开场视频音效
        this.rainbowProgress = 0; // 彩虹桥进度 (0-7)
        this.rainbowColors = ['red', 'orange', 'yellow', 'green', 'blue', 'indigo', 'violet']; // 彩虹七色
        this.restartHintTimer = null; // 重开提示计时器
        
        // 定义颜色
        this.colors = {
            red: '#FF6B6B',
            yellow: '#FFEAA7', 
            blue: '#4ECDC4',
            green: '#96CEB4',
            purple: '#DDA0DD',
            orange: '#FFA726'
        };
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.initBackgroundMusic();
        this.initIntroVideo();
        this.generateLevel();
        this.renderBottles();
        this.updatePowerupDisplay();
        this.initRainbowBridge();
        this.startRestartHintTimer();
        // 不立即启动计时器，等开场视频结束后再启动
        if (!this.isIntroPlaying) {
            this.startTimer();
        }
    }

    setupEventListeners() {
        const bottles = document.querySelectorAll('.bottle');
        bottles.forEach(bottle => {
            bottle.addEventListener('click', (e) => {
                const bottleId = parseInt(e.currentTarget.dataset.bottle);
                this.handleBottleClick(bottleId);
                // 第一次点击时尝试播放背景音乐
                this.tryPlayBackgroundMusic();
            });
        });
        
        // 添加全局点击事件来启动音乐
        document.addEventListener('click', () => {
            this.tryPlayBackgroundMusic();
        }, { once: true });
    }

    tryPlayBackgroundMusic() {
        if (this.backgroundMusic && this.backgroundMusic.paused) {
            console.log('开始播放背景音乐');
            this.backgroundMusic.play().catch(e => {
                console.log('背景音乐播放失败:', e);
            });
        }
    }

    handleBottleClick(bottleId) {
        if (!this.gameActive || this.isPaused || this.isIntroPlaying) return;
        
        // 第一次点击瓶子时开始播放背景音乐
        this.tryPlayBackgroundMusic();
        
        const bottle = this.bottles[bottleId];
        
        if (this.selectedBottle === null) {
            // 没有选中瓶子，选择当前瓶子（如果非空）
            if (bottle.colors.length > 0) {
                this.selectedBottle = bottleId;
                this.updateSelection();
            }
        } else if (this.selectedBottle === bottleId) {
            // 取消选择
            this.selectedBottle = null;
            this.updateSelection();
        } else {
            // 尝试倾倒
            this.pourWater(this.selectedBottle, bottleId);
        }
    }

    pourWater(fromBottleId, toBottleId) {
        const fromBottle = this.bottles[fromBottleId];
        const toBottle = this.bottles[toBottleId];
        
        // 检查是否可以倾倒
        if (!this.canPour(fromBottle, toBottle)) {
            this.showMessage('无法倾倒！', 'error');
            return;
        }

        // 获取要倾倒的颜色（最顶层的颜色）
        const topColor = fromBottle.colors[fromBottle.colors.length - 1];
        
        // 计算可以倾倒多少个相同颜色的液体
        let pourCount = 0;
        for (let i = fromBottle.colors.length - 1; i >= 0; i--) {
            if (fromBottle.colors[i] === topColor) {
                pourCount++;
            } else {
                break;
            }
        }
        
        // 确保不超过目标瓶子的剩余空间
        const availableSpace = toBottle.capacity - toBottle.colors.length;
        pourCount = Math.min(pourCount, availableSpace);
        
        if (pourCount === 0) {
            this.showMessage('目标瓶子已满！', 'error');
            return;
        }

        // 添加倾倒动画
        this.addPourAnimation(fromBottleId, toBottleId);

        // 创建粒子效果
        this.createParticles(fromBottleId, toBottleId, topColor);

        // 执行倾倒
        for (let i = 0; i < pourCount; i++) {
            toBottle.colors.push(fromBottle.colors.pop());
        }

        // 更新选择状态
        this.selectedBottle = null;
        this.updateSelection();
        this.renderBottles();

        // 播放倾倒音效
        this.playPourSound();

        // 检查是否完成
        if (this.checkVictory()) {
            setTimeout(() => this.showVictory(), 500);
        }
    }

    canPour(fromBottle, toBottle) {
        // 源瓶子不能为空
        if (fromBottle.colors.length === 0) return false;
        
        // 目标瓶子不能已满
        if (toBottle.colors.length >= toBottle.capacity) return false;
        
        // 如果目标瓶子为空，可以倾倒
        if (toBottle.colors.length === 0) return true;
        
        // 如果目标瓶子不为空，检查顶部颜色是否相同
        const fromTopColor = fromBottle.colors[fromBottle.colors.length - 1];
        const toTopColor = toBottle.colors[toBottle.colors.length - 1];
        
        return fromTopColor === toTopColor;
    }

    updateSelection() {
        const bottles = document.querySelectorAll('.bottle');
        bottles.forEach(bottle => {
            bottle.classList.remove('selected');
        });

        if (this.selectedBottle !== null) {
            const selectedElement = document.querySelector(`[data-bottle="${this.selectedBottle}"]`);
            if (selectedElement) {
                selectedElement.classList.add('selected');
            }
        }
    }

    generateLevel() {
        // 停止当前计时器
        this.stopTimer();
        
        // 重置游戏状态
        this.gameActive = true;
        this.isPaused = false;
        this.timeLeft = 60;
        
        // 清空所有瓶子
        this.bottles.forEach(bottle => {
            bottle.colors = [];
        });

        // 根据关卡生成不同的颜色配置 - 确保所有关卡都有解法
        const levelConfigs = {
            1: {
                // 简单关卡：红、黄、蓝各4个，一个空瓶
                bottles: [
                    ['red', 'red', 'yellow', 'yellow'],
                    ['blue', 'blue', 'red', 'red'],
                    ['yellow', 'yellow', 'blue', 'blue'],
                    []
                ]
            },
            2: {
                // 中等难度：确保有解法
                bottles: [
                    ['red', 'yellow', 'blue', 'green'],
                    ['green', 'red', 'yellow', 'blue'],
                    ['blue', 'green', 'red', 'yellow'],
                    []
                ]
            },
            3: {
                // 更难：但确保有解法
                bottles: [
                    ['red', 'blue', 'yellow', 'green'],
                    ['green', 'red', 'blue', 'yellow'],
                    ['yellow', 'green', 'red', 'blue'],
                    ['blue', 'yellow', 'green', 'red']
                ]
            },
            4: {
                // 确保有解法的配置
                bottles: [
                    ['red', 'yellow', 'blue', 'green'],
                    ['purple', 'orange', 'red', 'yellow'],
                    ['blue', 'green', 'purple', 'orange'],
                    ['orange', 'blue', 'green', 'purple']
                ]
            },
            5: {
                // 确保有解法的配置
                bottles: [
                    ['red', 'blue', 'yellow', 'green'],
                    ['purple', 'orange', 'red', 'blue'],
                    ['yellow', 'green', 'purple', 'orange'],
                    ['green', 'purple', 'orange', 'yellow']
                ]
            },
            6: {
                // 新增关卡，确保有解法
                bottles: [
                    ['red', 'red', 'blue', 'blue'],
                    ['yellow', 'yellow', 'green', 'green'],
                    ['purple', 'purple', 'orange', 'orange'],
                    []
                ]
            },
            7: {
                bottles: [
                    ['red', 'blue', 'yellow', 'green'],
                    ['green', 'red', 'blue', 'yellow'],
                    ['purple', 'orange', 'purple', 'orange'],
                    []
                ]
            },
            8: {
                bottles: [
                    ['red', 'yellow', 'blue', 'green'],
                    ['purple', 'orange', 'red', 'yellow'],
                    ['blue', 'green', 'purple', 'orange'],
                    ['green', 'purple', 'orange', 'blue']
                ]
            },
            9: {
                bottles: [
                    ['red', 'blue', 'yellow', 'green'],
                    ['purple', 'orange', 'red', 'blue'],
                    ['yellow', 'green', 'purple', 'orange'],
                    ['green', 'purple', 'orange', 'yellow']
                ]
            },
            10: {
                bottles: [
                    ['red', 'yellow', 'blue', 'green'],
                    ['purple', 'orange', 'red', 'yellow'],
                    ['blue', 'green', 'purple', 'orange'],
                    ['orange', 'blue', 'green', 'purple']
                ]
            }
        };

        const config = levelConfigs[this.currentLevel] || levelConfigs[1];
        
        // 填充瓶子
        config.bottles.forEach((colors, index) => {
            this.bottles[index].colors = [...colors];
        });

        // 验证关卡是否有解法，如果没有则重新生成
        if (!this.isSolvable()) {
            this.generateSolvableLevel();
        }
        
        // 打乱瓶子顺序
        this.shuffleBottles();
        
        // 启动计时器
        this.startTimer();
    }

    isSolvable() {
        // 简单的解法验证：检查是否每种颜色都有4个，且至少有一个空瓶
        const colorCounts = {};
        let hasEmptyBottle = false;
        
        for (let bottle of this.bottles) {
            if (bottle.colors.length === 0) {
                hasEmptyBottle = true;
            } else {
                for (let color of bottle.colors) {
                    colorCounts[color] = (colorCounts[color] || 0) + 1;
                }
            }
        }
        
        // 检查每种颜色是否都是4的倍数（确保可以完全分离）
        for (let color in colorCounts) {
            if (colorCounts[color] % 4 !== 0) {
                return false;
            }
        }
        
        return hasEmptyBottle;
    }

    generateSolvableLevel() {
        // 生成一个确保有解法的关卡
        const colors = ['red', 'yellow', 'blue', 'green', 'purple', 'orange'];
        const usedColors = colors.slice(0, Math.min(3, this.currentLevel + 2)); // 根据关卡选择颜色数量
        
        // 清空所有瓶子
        this.bottles.forEach(bottle => {
            bottle.colors = [];
        });
        
        // 为每种颜色生成4个液体
        const allLiquids = [];
        usedColors.forEach(color => {
            for (let i = 0; i < 4; i++) {
                allLiquids.push(color);
            }
        });
        
        // 随机打乱液体
        for (let i = allLiquids.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [allLiquids[i], allLiquids[j]] = [allLiquids[j], allLiquids[i]];
        }
        
        // 分配到前3个瓶子
        for (let i = 0; i < 3; i++) {
            const bottleLiquids = allLiquids.slice(i * 4, (i + 1) * 4);
            this.bottles[i].colors = bottleLiquids;
        }
        
        // 第4个瓶子保持为空
        this.bottles[3].colors = [];
    }

    shuffleBottles() {
        // 随机打乱瓶子顺序，但保持空瓶在最后
        const nonEmptyBottles = this.bottles.slice(0, -1);
        const emptyBottle = this.bottles[this.bottles.length - 1];
        
        // 打乱非空瓶子
        for (let i = nonEmptyBottles.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [nonEmptyBottles[i], nonEmptyBottles[j]] = [nonEmptyBottles[j], nonEmptyBottles[i]];
        }
        
        // 重新组合
        this.bottles = [...nonEmptyBottles, emptyBottle];
    }

    renderBottles() {
        this.bottles.forEach((bottle, index) => {
            const contentElement = document.getElementById(`content-${index}`);
            
            if (bottle.colors.length === 0) {
                contentElement.style.height = '0px';
                contentElement.style.background = 'transparent';
                contentElement.innerHTML = '';
                return;
            }

            // 计算高度 - 缩小到十分之九
            const height = (bottle.colors.length / bottle.capacity) * 45;
            contentElement.style.height = `${height}%`;

            // 清空之前的内容
            contentElement.innerHTML = '';

            // 创建分层显示
            this.createLayeredColors(contentElement, bottle.colors);
        });
    }

    createLayeredColors(container, colors) {
        const layerHeight = 100 / colors.length;
        
        colors.forEach((color, index) => {
            const layer = document.createElement('div');
            const isBottom = index === 0;
            const isTop = index === colors.length - 1;
            
            layer.style.cssText = `
                position: absolute;
                bottom: ${index * layerHeight}%;
                left: 0;
                right: 0;
                height: ${layerHeight}%;
                background: ${this.colors[color] || color};
                border-radius: ${isBottom ? '0 0 8px 8px' : isTop ? '8px 8px 0 0' : '0'};
                border-top: ${index > 0 ? '2px solid rgba(0,0,0,0.3)' : 'none'};
                box-shadow: 
                    ${isBottom ? 'inset 0 2px 4px rgba(0,0,0,0.1)' : ''}
                    ${isTop ? '0 -2px 4px rgba(0,0,0,0.1)' : ''}
                    inset 0 1px 0 rgba(255,255,255,0.2);
                image-rendering: pixelated;
                image-rendering: -moz-crisp-edges;
                image-rendering: crisp-edges;
            `;
            container.appendChild(layer);
        });
    }

    checkVictory() {
        // 检查是否所有瓶子都满足条件：
        // 1. 每个瓶子要么为空，要么只有一种颜色
        // 2. 至少有一个空瓶
        let hasEmptyBottle = false;
        
        for (let bottle of this.bottles) {
            if (bottle.colors.length === 0) {
                hasEmptyBottle = true;
            } else {
                // 检查是否只有一种颜色
                const uniqueColors = [...new Set(bottle.colors)];
                if (uniqueColors.length !== 1) {
                    return false;
                }
            }
        }
        
        return hasEmptyBottle;
    }

    showVictory() {
        this.gameActive = false;
        this.stopTimer();
        
        // 奖励道具
        this.addPowerup();
        
        // 更新彩虹桥进度
        this.addRainbowProgress();
        
        const victoryMessage = document.getElementById('victory-message');
        victoryMessage.style.display = 'block';
        
        if (this.currentLevel >= this.maxLevels) {
            victoryMessage.innerHTML = `
                <div>🎉 恭喜完成所有关卡！🎉</div>
                <button class="next-level-btn" onclick="restartGame()">重新开始</button>
            `;
        }
    }

    showGameOver() {
        this.gameActive = false;
        this.stopTimer();
        
        const gameOverMessage = document.getElementById('game-over-message');
        gameOverMessage.style.display = 'block';
    }

    nextLevel() {
        this.currentLevel++;
        if (this.currentLevel > this.maxLevels) {
            this.currentLevel = 1;
        }
        
        document.getElementById('victory-message').style.display = 'none';
        document.getElementById('game-over-message').style.display = 'none';
        this.generateLevel();
        this.renderBottles();
        this.selectedBottle = null;
        this.updateSelection();
    }

    restartGame() {
        this.currentLevel = 1;
        document.getElementById('victory-message').style.display = 'none';
        document.getElementById('game-over-message').style.display = 'none';
        this.generateLevel();
        this.renderBottles();
        this.selectedBottle = null;
        this.updateSelection();
    }

    startTimer() {
        this.stopTimer();
        this.updateTimerDisplay();
        
        this.timerInterval = setInterval(() => {
            if (!this.isPaused) {
                this.timeLeft--;
                this.updateTimerDisplay();
                
                if (this.timeLeft <= 0) {
                    this.showGameOver();
                }
            }
        }, 1000);
    }

    stopTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }

    updateTimerDisplay() {
        const timerDisplay = document.getElementById('countdown-display');
        if (timerDisplay) {
            timerDisplay.textContent = this.timeLeft;
            
            // 根据剩余时间改变样式
            timerDisplay.classList.remove('warning', 'danger');
            if (this.timeLeft <= 10) {
                timerDisplay.classList.add('danger');
            } else if (this.timeLeft <= 20) {
                timerDisplay.classList.add('warning');
            }
        }
    }

    initBackgroundMusic() {
        this.backgroundMusic = document.getElementById('background-music');
        if (this.backgroundMusic) {
            this.backgroundMusic.volume = 0.3; // 设置音量为30%
            this.backgroundMusic.loop = true; // 循环播放
            
            // 不自动播放背景音乐，等待用户点击瓶子
            console.log('背景音乐已初始化，等待用户点击瓶子开始播放');
        }
    }


    initIntroVideo() {
        this.introVideo = document.getElementById('intro-video');
        this.introOverlay = document.getElementById('intro-overlay');
        this.introSound = document.getElementById('intro-sound');
        
        console.log('初始化开场视频 anime0915.mp4...');
        console.log('视频元素:', this.introVideo);
        console.log('遮罩元素:', this.introOverlay);
        
        if (this.introVideo && this.introOverlay) {
            // 确保视频文件路径正确
            this.introVideo.src = 'anime0915.mp4';
            
            // 设置视频属性
            this.introVideo.volume = 0.8;
            this.introVideo.muted = false;
            this.introVideo.loop = false;
            this.introVideo.preload = 'auto';
            
            // 确保停止所有背景音乐
            this.stopAllBackgroundMusic();
            
            // 添加所有必要的事件监听器
            this.setupVideoEventListeners();
            
            // 立即尝试播放
            this.attemptVideoPlay();
        } else {
            console.log('没有找到开场视频元素，直接进入游戏');
            this.isIntroPlaying = false;
            this.startTimer();
        }
    }

    stopAllBackgroundMusic() {
        // 停止背景音乐
        if (this.backgroundMusic && !this.backgroundMusic.paused) {
            console.log('停止背景音乐');
            this.backgroundMusic.pause();
        }
        
        // 停止开场音效
        if (this.introSound && !this.introSound.paused) {
            console.log('停止开场音效');
            this.introSound.pause();
        }
    }

    setupVideoEventListeners() {
        // 视频可以播放时
        this.introVideo.addEventListener('canplay', () => {
            console.log('视频可以播放');
            this.attemptVideoPlay();
        });
        
        // 视频数据加载完成
        this.introVideo.addEventListener('loadeddata', () => {
            console.log('视频数据加载完成');
            this.attemptVideoPlay();
        });
        
        // 视频元数据加载完成
        this.introVideo.addEventListener('loadedmetadata', () => {
            console.log('视频元数据加载完成');
            this.attemptVideoPlay();
        });
        
        // 视频开始播放
        this.introVideo.addEventListener('play', () => {
            console.log('视频 anime0915.mp4 开始播放');
            // 取消静音，播放音频
            this.introVideo.muted = false;
            this.introVideo.volume = 0.8;
            // 确保停止所有背景音乐
            this.stopAllBackgroundMusic();
        });
        
        // 视频播放结束
        this.introVideo.addEventListener('ended', () => {
            console.log('视频播放结束');
            this.onIntroVideoEnded();
        });
        
        // 视频播放错误
        this.introVideo.addEventListener('error', (e) => {
            console.error('视频播放错误:', e);
            console.error('错误详情:', this.introVideo.error);
            this.onIntroVideoEnded();
        });
        
        // 视频暂停
        this.introVideo.addEventListener('pause', () => {
            console.log('视频暂停');
        });
        
        // 视频等待数据
        this.introVideo.addEventListener('waiting', () => {
            console.log('视频等待数据...');
        });
        
        // 视频可以流畅播放
        this.introVideo.addEventListener('canplaythrough', () => {
            console.log('视频可以流畅播放');
            this.attemptVideoPlay();
        });
    }

    attemptVideoPlay() {
        if (this.introVideo && this.isIntroPlaying) {
            console.log('尝试播放视频 anime0915.mp4...');
            console.log('视频状态:', {
                readyState: this.introVideo.readyState,
                networkState: this.introVideo.networkState,
                paused: this.introVideo.paused,
                ended: this.introVideo.ended,
                currentTime: this.introVideo.currentTime,
                duration: this.introVideo.duration
            });
            
            // 确保停止所有背景音乐
            this.stopAllBackgroundMusic();
            
            // 尝试播放视频
            const playPromise = this.introVideo.play();
            
            if (playPromise !== undefined) {
                playPromise.then(() => {
                    console.log('视频 anime0915.mp4 播放成功');
                    // 再次确保停止背景音乐
                    this.stopAllBackgroundMusic();
                }).catch(error => {
                    console.error('视频播放失败:', error);
                    // 如果自动播放失败，等待用户交互
                    this.setupUserInteraction();
                });
            }
        }
    }

    setupUserInteraction() {
        console.log('设置用户交互监听...');
        const startVideo = () => {
            if (this.introVideo && this.isIntroPlaying) {
                this.introVideo.play().then(() => {
                    console.log('用户交互后视频播放成功');
                }).catch(e => {
                    console.error('用户交互后视频播放仍然失败:', e);
                    this.onIntroVideoEnded();
                });
            }
        };
        
        // 添加多种用户交互事件
        document.addEventListener('click', startVideo, { once: true });
        document.addEventListener('keydown', startVideo, { once: true });
        document.addEventListener('touchstart', startVideo, { once: true });
        
        // 显示点击提示
        this.showClickToPlayMessage();
    }

    showClickToPlayMessage() {
        // 创建按钮容器
        const buttonContainer = document.createElement('div');
        buttonContainer.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            z-index: 2500;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 20px;
        `;
        
        // 创建旋转按钮
        const button = document.createElement('div');
        button.className = 'button';
        button.innerHTML = `
            <div class="button__text">
                <span style="--index: 0">点</span>
                <span style="--index: 1">击</span>
                <span style="--index: 2">播</span>
                <span style="--index: 3">放</span>
                <span style="--index: 4">动</span>
                <span style="--index: 5">画</span>
                <span style="--index: 6">点</span>
                <span style="--index: 7">击</span>
                <span style="--index: 8">播</span>
                <span style="--index: 9">放</span>
                <span style="--index: 10">动</span>
                <span style="--index: 11">画</span>
                <span style="--index: 12">点</span>
                <span style="--index: 13">击</span>
                <span style="--index: 14">播</span>
                <span style="--index: 15">放</span>
                <span style="--index: 16">动</span>
                <span style="--index: 17">画</span>
                <span style="--index: 18">点</span>
                <span style="--index: 19">击</span>
            </div>
            <div class="button__circle">
                <div class="button__icon">▶</div>
                <div class="button__icon button__icon--copy">▶</div>
            </div>
        `;
        
        // 创建提示文字
        const text = document.createElement('div');
        text.textContent = '等待开场动画加载完成，点击任意位置播放';
        text.style.cssText = `
            color: white;
            font-size: 16px;
            font-weight: bold;
            text-align: center;
            font-family: 'Noto Sans SC', sans-serif;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.8);
        `;
        
        buttonContainer.appendChild(button);
        buttonContainer.appendChild(text);
        
        // 添加样式
        const style = document.createElement('style');
        style.textContent = `
            /* From Uiverse.io by Creatlydev */
            .button {
                cursor: pointer;
                border: none;
                background: #7808d0;
                color: #fff;
                width: 100px;
                height: 100px;
                border-radius: 50%;
                overflow: hidden;
                position: relative;
                display: grid;
                place-content: center;
                transition:
                    background 300ms,
                    transform 200ms;
                font-weight: 600;
            }

            .button__text {
                position: absolute;
                inset: 0;
                animation: text-rotation 8s linear infinite;
            }

            .button__text > span {
                position: absolute;
                transform: rotate(calc(19deg * var(--index)));
                inset: 7px;
                font-size: 12px;
                font-weight: bold;
            }

            .button__circle {
                position: relative;
                width: 40px;
                height: 40px;
                overflow: hidden;
                background: #fff;
                color: #7808d0;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
            }

            .button__icon--copy {
                position: absolute;
                transform: translate(-150%, 150%);
            }

            .button:hover {
                background: #000;
                transform: scale(1.05);
            }

            .button:hover .button__icon {
                color: #000;
            }

            .button:hover .button__icon:first-child {
                transition: transform 0.3s ease-in-out;
                transform: translate(150%, -150%);
            }

            .button:hover .button__icon--copy {
                transition: transform 0.3s ease-in-out 0.1s;
                transform: translate(0);
            }

            @keyframes text-rotation {
                to {
                    rotate: 360deg;
                }
            }
        `;
        document.head.appendChild(style);
        document.body.appendChild(buttonContainer);
        
        // 创建移除提示的函数
        const removeMessage = () => {
            if (buttonContainer.parentNode) {
                document.body.removeChild(buttonContainer);
            }
            if (style.parentNode) {
                document.head.removeChild(style);
            }
            // 移除事件监听器
            document.removeEventListener('click', handleGlobalClick);
            document.removeEventListener('touchstart', handleGlobalClick);
        };
        
        // 创建全局点击处理函数
        const handleGlobalClick = (e) => {
            // 检测到屏幕点击，移除提示
            removeMessage();
            
            // 尝试播放视频
            if (this.introVideo && this.isIntroPlaying) {
                this.introVideo.play().then(() => {
                    console.log('用户点击后视频播放成功');
                }).catch(e => {
                    console.error('用户点击后视频播放失败:', e);
                });
            }
        };
        
        // 点击整个容器都可以播放视频并移除提示
        buttonContainer.addEventListener('click', () => {
            if (this.introVideo && this.isIntroPlaying) {
                this.introVideo.play().then(() => {
                    removeMessage();
                }).catch(e => {
                    console.error('点击播放失败:', e);
                });
            } else {
                // 如果没有视频，直接移除提示
                removeMessage();
            }
        });
        
        // 添加全局点击事件监听
        document.addEventListener('click', handleGlobalClick, { once: true });
        document.addEventListener('touchstart', handleGlobalClick, { once: true });
    }


    playIntroSound() {
        // 停止背景音乐，避免同时播放
        if (this.backgroundMusic && !this.backgroundMusic.paused) {
            this.backgroundMusic.pause();
        }
        
        // 现在视频自带音频，不需要额外播放音效文件
        // 视频的音频会自动播放
        console.log('开场视频音频将自动播放');
    }

    onIntroVideoEnded() {
        console.log('开场视频结束，准备进入游戏');
        this.isIntroPlaying = false;
        
        // 确保视频完全停止
        if (this.introVideo) {
            this.introVideo.pause();
            this.introVideo.currentTime = 0;
        }
        
        // 隐藏开场视频遮罩，使用平滑过渡
        if (this.introOverlay) {
            this.introOverlay.classList.add('hidden');
            // 延迟移除元素，等待过渡动画完成
            setTimeout(() => {
                if (this.introOverlay) {
                    this.introOverlay.style.display = 'none';
                }
                console.log('开场视频遮罩已隐藏，游戏界面显示');
            }, 500);
        }
        
        // 不自动播放背景音乐，等待用户点击瓶子
        
        // 开始游戏计时器
        this.startTimer();
        
        // 显示游戏提示
        this.showGameStartMessage();
    }

    startBackgroundMusic() {
        if (this.backgroundMusic) {
            console.log('开场视频结束，开始播放背景音乐');
            this.backgroundMusic.play().catch(e => {
                console.log('背景音乐播放失败:', e);
            });
        }
    }

    showGameStartMessage() {
        // 创建按钮容器
        const buttonContainer = document.createElement('div');
        buttonContainer.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            z-index: 1500;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 20px;
            animation: fadeInOut 3s ease-in-out;
            cursor: pointer;
        `;
        
        // 创建旋转按钮
        const button = document.createElement('div');
        button.className = 'game-start-button';
        button.innerHTML = `
            <div class="button__text">
                <span style="--index: 0">游</span>
                <span style="--index: 1">戏</span>
                <span style="--index: 2">开</span>
                <span style="--index: 3">始</span>
                <span style="--index: 4">游</span>
                <span style="--index: 5">戏</span>
                <span style="--index: 6">开</span>
                <span style="--index: 7">始</span>
                <span style="--index: 8">游</span>
                <span style="--index: 9">戏</span>
                <span style="--index: 10">开</span>
                <span style="--index: 11">始</span>
                <span style="--index: 12">游</span>
                <span style="--index: 13">戏</span>
                <span style="--index: 14">开</span>
                <span style="--index: 15">始</span>
                <span style="--index: 16">游</span>
                <span style="--index: 17">戏</span>
                <span style="--index: 18">开</span>
                <span style="--index: 19">始</span>
            </div>
            <div class="button__circle">
                <div class="button__icon">🎮</div>
                <div class="button__icon button__icon--copy">🎮</div>
            </div>
        `;
        
        // 创建提示文字
        const text = document.createElement('div');
        text.textContent = '你是世界第一的天才魔女，点击瓶子开始配方魔法药水，修复顶部彩虹桥，获得宝藏';
        text.style.cssText = `
            color: white;
            font-size: 16px;
            font-weight: bold;
            text-align: center;
            font-family: 'Noto Sans SC', sans-serif;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.8);
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            max-width: 90vw;
        `;

        buttonContainer.appendChild(button);
        buttonContainer.appendChild(text);
        
        // 添加样式
        const style = document.createElement('style');
        style.textContent = `
            /* From Uiverse.io by Creatlydev */
            .game-start-button {
                cursor: pointer;
                border: none;
                background: #7808d0;
                color: #fff;
                width: 100px;
                height: 100px;
                border-radius: 50%;
                overflow: hidden;
                position: relative;
                display: grid;
                place-content: center;
                transition:
                    background 300ms,
                    transform 200ms;
                font-weight: 600;
            }

            .game-start-button .button__text {
                position: absolute;
                inset: 0;
                animation: text-rotation 8s linear infinite;
            }

            .game-start-button .button__text > span {
                position: absolute;
                transform: rotate(calc(19deg * var(--index)));
                inset: 7px;
                font-size: 12px;
                font-weight: bold;
            }

            .game-start-button .button__circle {
                position: relative;
                width: 40px;
                height: 40px;
                overflow: hidden;
                background: #fff;
                color: #7808d0;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
            }

            .game-start-button .button__icon--copy {
                position: absolute;
                transform: translate(-150%, 150%);
            }

            .game-start-button:hover {
                background: #000;
                transform: scale(1.05);
            }

            .game-start-button:hover .button__icon {
                color: #000;
            }

            .game-start-button:hover .button__icon:first-child {
                transition: transform 0.3s ease-in-out;
                transform: translate(150%, -150%);
            }

            .game-start-button:hover .button__icon--copy {
                transition: transform 0.3s ease-in-out 0.1s;
                transform: translate(0);
            }

            @keyframes text-rotation {
                to {
                    rotate: 360deg;
                }
            }

            @keyframes fadeInOut {
                0% { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
                20% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
                80% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
                100% { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
            }

            @keyframes blink {
                0%, 50% { opacity: 1; }
                51%, 100% { opacity: 0.3; }
            }
        `;
        document.head.appendChild(style);
        document.body.appendChild(buttonContainer);
        
        // 3秒后移除提示
        setTimeout(() => {
            if (buttonContainer.parentNode) {
                document.body.removeChild(buttonContainer);
            }
            if (style.parentNode) {
                document.head.removeChild(style);
            }
        }, 3000);
    }

    togglePause() {
        this.isPaused = !this.isPaused;
        const pauseBtn = document.getElementById('pause-btn');
        const pauseOverlay = document.getElementById('pause-overlay');
        
        // 控制背景音乐
        if (this.backgroundMusic) {
            if (this.isPaused) {
                this.backgroundMusic.pause();
            } else {
                this.backgroundMusic.play().catch(e => {
                    console.log('背景音乐播放失败');
                });
            }
        }
        
        // 控制重开提示计时器
        if (this.isPaused) {
            this.stopRestartHintTimer();
        } else {
            this.startRestartHintTimer();
        }
        
        if (this.isPaused) {
            pauseBtn.className = 'btn';
            pauseBtn.querySelector('span').textContent = '继续';
            pauseOverlay.style.display = 'flex';
        } else {
            pauseBtn.className = 'btn';
            pauseBtn.querySelector('span').textContent = '暂停';
            pauseOverlay.style.display = 'none';
        }
    }

    restartLevel() {
        document.getElementById('victory-message').style.display = 'none';
        document.getElementById('game-over-message').style.display = 'none';
        document.getElementById('pause-overlay').style.display = 'none';
        this.isPaused = false;
        const pauseBtn = document.getElementById('pause-btn');
        pauseBtn.className = 'btn';
        pauseBtn.querySelector('span').textContent = '暂停';
        this.generateLevel();
        this.renderBottles();
        this.selectedBottle = null;
        this.updateSelection();
        this.startRestartHintTimer(); // 重启重开提示计时器
    }

    addPourAnimation(fromBottleId, toBottleId) {
        const fromElement = document.querySelector(`[data-bottle="${fromBottleId}"]`);
        const toElement = document.querySelector(`[data-bottle="${toBottleId}"]`);
        
        if (fromElement) {
            fromElement.classList.add('pour-animation');
            setTimeout(() => {
                fromElement.classList.remove('pour-animation');
            }, 500);
        }
        
        if (toElement) {
            toElement.classList.add('pour-animation');
            setTimeout(() => {
                toElement.classList.remove('pour-animation');
            }, 500);
        }
    }

    playPourSound() {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.setValueAtTime(600, audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(300, audioContext.currentTime + 0.1);
            
            gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.1);
        } catch (e) {
            // 静默失败
        }
    }

    createParticles(fromBottleId, toBottleId, color) {
        const fromElement = document.querySelector(`[data-bottle="${fromBottleId}"]`);
        const toElement = document.querySelector(`[data-bottle="${toBottleId}"]`);
        
        if (!fromElement || !toElement) return;

        const fromRect = fromElement.getBoundingClientRect();
        
        // 创建3个粒子
        for (let i = 0; i < 3; i++) {
            const particle = document.createElement('div');
            particle.className = 'particle';
            particle.style.color = this.colors[color] || color;
            particle.style.left = (fromRect.left + fromRect.width / 2) + 'px';
            particle.style.top = (fromRect.top + 20) + 'px';
            
            // 添加随机偏移
            const randomX = (Math.random() - 0.5) * 30;
            const randomY = Math.random() * 10;
            particle.style.transform = `translate(${randomX}px, ${randomY}px)`;
            
            document.body.appendChild(particle);
            
            // 1秒后移除粒子
            setTimeout(() => {
                if (particle.parentNode) {
                    particle.parentNode.removeChild(particle);
                }
            }, 1000);
        }
    }

    showMessage(text, type = 'info') {
        const message = document.createElement('div');
        message.textContent = text;
        message.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: ${type === 'error' ? '#f44336' : '#4CAF50'};
            color: white;
            padding: 12px 24px;
            border-radius: 8px;
            font-size: 16px;
            font-weight: bold;
            z-index: 1000;
            animation: fadeInOut 2s ease-in-out;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        `;
        
        const style = document.createElement('style');
        style.textContent = `
            @keyframes fadeInOut {
                0% { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
                20% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
                80% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
                100% { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
            }
        `;
        document.head.appendChild(style);
        
        document.body.appendChild(message);
        
        setTimeout(() => {
            if (message.parentNode) {
                document.body.removeChild(message);
            }
            if (style.parentNode) {
                document.head.removeChild(style);
            }
        }, 2000);
    }

    // 道具系统
    addPowerup() {
        this.powerups++;
        this.updatePowerupDisplay();
    }

    updatePowerupDisplay() {
        const powerupBtn = document.getElementById('powerup-btn');
        const powerupText = document.getElementById('powerup-text');
        
        if (this.powerups > 0) {
            powerupBtn.classList.remove('powerup-disabled');
            powerupText.textContent = `道具 x${this.powerups}`;
        } else {
            powerupBtn.classList.add('powerup-disabled');
            powerupText.textContent = '道具 x0';
        }
    }

    usePowerup() {
        if (this.powerups <= 0 || !this.gameActive || this.isPaused || this.isIntroPlaying) {
            return;
        }

        // 直接使用道具，添加10秒时间
        this.applyPowerup();
    }

    applyPowerup() {
        if (this.powerups <= 0 || !this.gameActive || this.isPaused || this.isIntroPlaying) {
            return;
        }

        // 添加10秒到倒计时
        this.timeLeft += 10;
        this.updateTimerDisplay();
        
        // 消耗道具
        this.powerups--;
        this.updatePowerupDisplay();
        
        this.showMessage('时间+10秒！', 'info');
    }

    // 彩虹桥相关方法
    initRainbowBridge() {
        this.rainbowProgress = 0;
        this.updateRainbowBridge();
    }

    updateRainbowBridge() {
        const segments = document.querySelectorAll('.rainbow-segment');
        segments.forEach((segment, index) => {
            if (index < this.rainbowProgress) {
                segment.classList.add('active');
            } else {
                segment.classList.remove('active');
            }
        });
    }

    addRainbowProgress() {
        if (this.rainbowProgress < 7) {
            this.rainbowProgress++;
            this.updateRainbowBridge();
            
            // 播放彩虹桥激活音效
            this.playRainbowSound();
            
            // 检查是否完成彩虹桥
            if (this.rainbowProgress === 7) {
                setTimeout(() => this.showRainbowComplete(), 1000);
            }
        }
    }

    playRainbowSound() {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            // 播放彩虹音效 - 上升的音调
            oscillator.frequency.setValueAtTime(400, audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(800, audioContext.currentTime + 0.3);
            
            gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.3);
        } catch (e) {
            // 静默失败
        }
    }

    showRainbowComplete() {
        const rainbowBridge = document.getElementById('rainbow-bridge');
        const completeMessage = document.getElementById('rainbow-complete-message');
        const magicPotionImg = document.getElementById('magic-potion-img');
        
        // 添加完成特效
        rainbowBridge.classList.add('completed');
        
        // 显示完成提示
        completeMessage.style.display = 'block';
        
        // 直接显示魔法药水图片，无动画
        if (magicPotionImg) {
            magicPotionImg.style.display = 'block';
        }
        
        // 播放完成音效
        this.playRainbowCompleteSound();
    }

    playRainbowCompleteSound() {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            // 播放彩虹完成的和弦音效
            const frequencies = [261.63, 329.63, 392.00, 523.25]; // C大调和弦
            
            frequencies.forEach((freq, index) => {
                const oscillator = audioContext.createOscillator();
                const gainNode = audioContext.createGain();
                
                oscillator.connect(gainNode);
                gainNode.connect(audioContext.destination);
                
                oscillator.frequency.setValueAtTime(freq, audioContext.currentTime + index * 0.1);
                oscillator.frequency.exponentialRampToValueAtTime(freq * 2, audioContext.currentTime + index * 0.1 + 0.5);
                
                gainNode.gain.setValueAtTime(0.05, audioContext.currentTime + index * 0.1);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + index * 0.1 + 0.5);
                
                oscillator.start(audioContext.currentTime + index * 0.1);
                oscillator.stop(audioContext.currentTime + index * 0.1 + 0.5);
            });
        } catch (e) {
            // 静默失败
        }
    }

    // 重开提示相关方法
    startRestartHintTimer() {
        this.stopRestartHintTimer();
        this.restartHintTimer = setInterval(() => {
            if (this.gameActive && !this.isPaused && !this.isIntroPlaying) {
                this.showRestartHint();
            }
        }, 15000); // 每15秒显示一次
    }

    stopRestartHintTimer() {
        if (this.restartHintTimer) {
            clearInterval(this.restartHintTimer);
            this.restartHintTimer = null;
        }
    }

    showRestartHint() {
        const restartHint = document.getElementById('restart-hint');
        if (restartHint) {
            restartHint.classList.add('show');
            
            // 3秒后隐藏提示
            setTimeout(() => {
                restartHint.classList.remove('show');
            }, 3000);
        }
    }

}

// 全局函数供HTML调用
function nextLevel() {
    game.nextLevel();
}

function restartGame() {
    game.restartGame();
}

function restartLevel() {
    game.restartLevel();
}

function togglePause() {
    game.togglePause();
}

function usePowerup() {
    game.usePowerup();
}

function goToMainMenu() {
    // 重新开始游戏
    game.restartGame();
}

function closeRainbowComplete() {
    const completeMessage = document.getElementById('rainbow-complete-message');
    completeMessage.style.display = 'none';
}

function endGame() {
    // 显示结束确认
    if (confirm('确定要结束游戏吗？')) {
        // 关闭当前网页
        window.close();
        
        // 如果无法关闭（某些浏览器限制），则显示提示
        setTimeout(() => {
            alert('感谢游玩魔女倒药水游戏！\n\n你成功修复了彩虹桥，获得了天赐圣露！\n\n游戏结束。');
        }, 100);
    }
}

// 初始化游戏
let game;
document.addEventListener('DOMContentLoaded', () => {
    game = new WaterSortGame();
});
