class LuckyWheel {
    constructor(storage) {
        this.storage = storage;
        this.isSpinning = false;
        this.currentAngle = 0;
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.wheelElement = document.getElementById('lucky-wheel');
        this.setupCanvas();
        this.init();
    }

    setupCanvas() {
        this.canvas.width = 500;
        this.canvas.height = 500;
        this.wheelElement.appendChild(this.canvas);
        
        const pointer = document.createElement('div');
        pointer.className = 'wheel-pointer';
        this.wheelElement.appendChild(pointer);
    }

    init() {
        this.renderWheel();
        this.setupEventListeners();
    }

    setupEventListeners() {
        const pointer = this.wheelElement.querySelector('.wheel-pointer');
        pointer.addEventListener('click', () => {
            if (!this.isSpinning) {
                this.spin();
            }
        });
    }

    renderWheel() {
        const user = this.storage.getCurrentUser();
        if (!user.name) return;

        const currentWheel = this.storage.wheelSettings[user.data.currentWheel - 1];
        if (!currentWheel || !currentWheel.prizes.length) return;

        const center = this.canvas.width / 2;
        const radius = this.canvas.width * 0.45;

        // 清空画布
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // 计算总权重
        const totalWeight = currentWheel.prizes.reduce((sum, prize) => sum + (prize.weight || 1), 0);
        
        // 从12点钟方向开始，顺时针绘制
        let startAngle = -Math.PI / 2 + (this.currentAngle * Math.PI / 180);

        // 绘制每个奖品扇形
        currentWheel.prizes.forEach((prize, index) => {
            const weight = prize.weight || 1;
            const sweepAngle = (weight / totalWeight) * Math.PI * 2;
            const endAngle = startAngle + sweepAngle;

            // 绘制扇形
            this.ctx.beginPath();
            this.ctx.moveTo(center, center);
            this.ctx.arc(center, center, radius, startAngle, endAngle);
            this.ctx.closePath();

            // 设置颜色
            const hue = (index * 25) % 360;
            this.ctx.fillStyle = `hsl(${hue}, 70%, 85%)`;
            this.ctx.fill();

            // 绘制边框
            this.ctx.strokeStyle = '#fff';
            this.ctx.lineWidth = 2;
            this.ctx.stroke();

            // 绘制文字
            const textAngle = startAngle + sweepAngle / 2;
            const textRadius = radius * 0.65;
            const textX = center + Math.cos(textAngle) * textRadius;
            const textY = center + Math.sin(textAngle) * textRadius;

            this.ctx.save();
            this.ctx.translate(textX, textY);
            this.ctx.rotate(textAngle + Math.PI / 2);

            // 奖品名称
            this.ctx.fillStyle = '#333';
            this.ctx.font = 'bold 16px Microsoft YaHei';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';

            const lines = this.wrapText(prize.name, radius * 0.35);
            lines.forEach((line, i) => {
                const lineOffset = (i - (lines.length - 1) / 2) * 20;
                this.ctx.fillText(line, 0, lineOffset);
            });

            // 显示权重
            // if (prize.weight > 1) {
            //     this.ctx.font = '14px Microsoft YaHei';
            //     this.ctx.fillStyle = '#666';
            //     this.ctx.fillText(`(${prize.weight})`, 0, (lines.length * 10) + 15);
            // }

            this.ctx.restore();

            startAngle = endAngle;
        });

        // 绘制中心圆
        this.ctx.beginPath();
        this.ctx.arc(center, center, radius * 0.15, 0, Math.PI * 2);
        this.ctx.fillStyle = '#fff';
        this.ctx.fill();
        this.ctx.strokeStyle = '#e74c3c';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();

        // 更新转盘信息
        document.getElementById('current-wheel').textContent = `${user.data.currentWheel}级奖池`;
        const remainingSpins = currentWheel.requiredSpins - user.data.spinsCompleted;
        document.getElementById('remaining-spins').textContent = 
            `还差 ${remainingSpins} 抽升级奖池`;
    }

    wrapText(text, maxWidth) {
        const words = text.split('');
        const lines = [];
        let line = '';

        for (const char of words) {
            const testLine = line + char;
            const metrics = this.ctx.measureText(testLine);
            if (metrics.width > maxWidth && line) {
                lines.push(line);
                line = char;
            } else {
                line = testLine;
            }
        }
        if (line) {
            lines.push(line);
        }
        return lines;
    }

    async spin() {
        if (this.isSpinning) return;
        
        const user = this.storage.getCurrentUser();
        if (!user.name) {
            alert('请先选择用户！');
            return;
        }

        const currentWheel = this.storage.wheelSettings[user.data.currentWheel - 1];
        if (!currentWheel || !currentWheel.prizes.length) {
            alert('请先设置转盘奖品！');
            return;
        }

        this.isSpinning = true;
        document.getElementById('spin-button').disabled = true;

        try {
            console.log('开始抽奖，当前转盘:', currentWheel);
            
            // 选择奖品
            const totalWeight = currentWheel.prizes.reduce((sum, prize) => sum + (prize.weight || 1), 0);
            let randomWeight = Math.random() * totalWeight;
            let accumulatedWeight = 0;
            let selectedIndex = 0;

            // 根据权重选择
            for (let i = 0; i < currentWheel.prizes.length; i++) {
                accumulatedWeight += currentWheel.prizes[i].weight || 1;
                if (randomWeight <= accumulatedWeight) {
                    selectedIndex = i;
                    break;
                }
            }

            const selectedPrize = currentWheel.prizes[selectedIndex];
            console.log('选中的奖品:', selectedPrize);

            // 计算目标角度
            let targetAngle = 0;
            let accumulatedAngle = 0;
            
            // 计算选中奖品的角度位置
            for (let i = 0; i < selectedIndex; i++) {
                accumulatedAngle += (currentWheel.prizes[i].weight || 1) / totalWeight * 360;
            }
            
            // 计算最终角度
            const prizeAngle = (currentWheel.prizes[selectedIndex].weight || 1) / totalWeight * 360;
            targetAngle = -(accumulatedAngle + prizeAngle / 2);
            
            // 添加额外的旋转圈数
            const finalAngle = this.currentAngle + 1800 + targetAngle - (this.currentAngle % 360);

            await this.animateWheel(finalAngle);
            await this.finishSpin(selectedPrize);
        } catch (error) {
            console.error('抽奖过程出错:', error);
            this.isSpinning = false;
            document.getElementById('spin-button').disabled = false;
            alert('抽奖过程出错，请重试');
        }
    }

    async animateWheel(targetAngle) {
        return new Promise(resolve => {
            const startAngle = this.currentAngle;
            const angleToRotate = targetAngle - startAngle;
            const duration = 4000; // 4秒
            const startTime = performance.now();

            const animate = (currentTime) => {
                const elapsed = currentTime - startTime;
                const progress = Math.min(elapsed / duration, 1);

                // 缓动函数
                const easeOut = (t) => {
                    return 1 - Math.pow(1 - t, 3);
                };

                this.currentAngle = startAngle + angleToRotate * easeOut(progress);
                this.renderWheel();

                if (progress < 1) {
                    requestAnimationFrame(animate);
                } else {
                    this.currentAngle = targetAngle;
                    this.renderWheel();
                    this.isSpinning = false;
                    resolve();
                }
            };

            requestAnimationFrame(animate);
        });
    }

    async finishSpin(prize) {
        try {
            console.log('开始处理抽奖结果:', prize);
            
            // 记录中奖结果
            const prizeConfig = this.storage.prizes.find(p => p.id === prize.id);
            console.log('找到奖品配置:', prizeConfig);
            
            if (!prizeConfig) {
                throw new Error('找不到奖品配置');
            }

            // 构建奖品信息
            const fullPrize = {
                ...prize,
                notCounted: prizeConfig.notCounted,
                fragmentCount: prizeConfig.fragmentCount
            };
            console.log('准备记录的奖品信息:', fullPrize);

            const result = this.storage.recordPrize(fullPrize);
            console.log('记录结果:', result);

            if (!result) {
                throw new Error('记录奖品失败');
            }

            // 中奖提示框
            const modal = document.createElement('div');
            modal.className = 'modal';
            modal.innerHTML = `
                <div class="modal-content">
                    <div class="prize-win">恭喜抽中：${prize.name}！</div>
                    <button onclick="this.parentElement.parentElement.remove()">确定</button>
                </div>
            `;
            document.body.appendChild(modal);
            
            // 显示动画
            setTimeout(() => {
                modal.classList.add('active');
                this.createConfetti();
            }, 100);

            // 更新显示
            this.renderWheel();
            this.updateInventoryDisplay();
        } catch (error) {
            console.error('抽奖完成处理出错:', error);
            console.error('错误详情:', {
                prize,
                storage: this.storage,
                currentUser: this.storage.getCurrentUser()
            });
            alert('抽奖处理出错，请重试');
        } finally {
            // 确认按钮状态
            this.isSpinning = false;
            document.getElementById('spin-button').disabled = false;
        }
    }

    createConfetti() {
        const container = document.querySelector('.wheel-section');
        const confettiCount = 100;
        
        for (let i = 0; i < confettiCount; i++) {
            const confetti = document.createElement('div');
            confetti.className = 'confetti';
            confetti.style.left = Math.random() * 100 + '%';
            confetti.style.animationDelay = Math.random() * 1000 + 'ms';
            confetti.style.backgroundColor = `hsl(${Math.random() * 360}, 70%, 50%)`;
            container.appendChild(confetti);
            
            confetti.addEventListener('animationend', () => {
                confetti.remove();
            });
        }
    }

    updateInventoryDisplay() {
        const user = this.storage.getCurrentUser();
        if (!user.name) return;

        // 更新奖品库存显示
        const prizeList = document.getElementById('prize-list');
        prizeList.innerHTML = '';
        Object.entries(user.data.inventory).forEach(([name, count]) => {
            const item = document.createElement('div');
            item.className = 'prize-item';
            item.innerHTML = `
                <span>${name}</span>
                <span>${count}个</span>
            `;
            prizeList.appendChild(item);
        });

        // 更新碎片进度显示
        const fragmentsList = document.getElementById('fragments-list');
        fragmentsList.innerHTML = '';
        
        Object.entries(user.data.fragments).forEach(([name, info]) => {
            if (info.required > 0 && (info.current > 0 || info.completedSets > 0)) {
                const item = document.createElement('div');
                item.className = 'fragment-item';
                const percentage = (info.current / info.required) * 100;
                
                let statusText = '';
                if (info.completedSets > 0) {
                    statusText = `，已合成${info.completedSets}次`;
                }
                
                item.innerHTML = `
                    <div class="fragment-info">
                        <span>${name}</span>
                        <span>${info.current}/${info.required}${statusText}</span>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${percentage}%"></div>
                    </div>
                `;
                fragmentsList.appendChild(item);
            }
        });
    }
} 