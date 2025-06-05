class Storage {
    constructor() {
        this.currentUser = '';
        this.loadData();
    }

    loadData() {
        // 加载奖品配置
        this.prizes = JSON.parse(localStorage.getItem('prizes')) || [];
        // 加载转盘配置
        this.wheelSettings = JSON.parse(localStorage.getItem('wheelSettings')) || this.getDefaultWheelSettings();
        // 加载用户数据
        this.userData = JSON.parse(localStorage.getItem('userData')) || {};
    }

    getDefaultWheelSettings() {
        return Array(5).fill(null).map((_, index) => ({
            id: index + 1,
            prizes: [],
            requiredSpins: this.getRequiredSpins(index + 1)
        }));
    }

    getRequiredSpins(wheelNumber) {
        const spinsMap = {
            1: 12,
            2: 10,
            3: 8,
            4: 6,
            5: 4
        };
        return spinsMap[wheelNumber] || 12;
    }

    saveData() {
        localStorage.setItem('prizes', JSON.stringify(this.prizes));
        localStorage.setItem('wheelSettings', JSON.stringify(this.wheelSettings));
        localStorage.setItem('userData', JSON.stringify(this.userData));
    }

    // 用户相关操作
    switchUser(username) {
        if (!username) return false;
        this.currentUser = username;
        if (!this.userData[username]) {
            this.userData[username] = {
                currentWheel: 1,
                spinsCompleted: 0,
                inventory: {},
                fragments: {}
            };
        }
        this.saveData();
        return true;
    }

    getCurrentUser() {
        return {
            name: this.currentUser,
            data: this.userData[this.currentUser]
        };
    }

    // 奖品相关操作
    addPrize(name, fragmentCount = 0, notCounted = false) {
        const prize = {
            id: Date.now(),
            name,
            fragmentCount: parseInt(fragmentCount) || 0,
            notCounted: notCounted
        };
        this.prizes.push(prize);
        this.saveData();
        return prize;
    }

    removePrize(prizeId) {
        this.prizes = this.prizes.filter(p => p.id !== prizeId);
        this.saveData();
    }

    // 转盘设置相关操作
    updateWheelPrizes(wheelId, prizes) {
        const wheel = this.wheelSettings.find(w => w.id === wheelId);
        if (wheel) {
            wheel.prizes = prizes;
            this.saveData();
        }
    }

    // 记录抽奖结果
    recordPrize(prize) {
        if (!this.currentUser) return false;

        const userData = this.userData[this.currentUser];
        const prizeConfig = this.prizes.find(p => p.id === prize.id);

        if (!prizeConfig) return false;

        if (!prizeConfig.notCounted) {
            if (prizeConfig.fragmentCount > 0) {
                // 处理碎片奖品
                if (!userData.fragments[prize.name]) {
                    userData.fragments[prize.name] = {
                        current: 0,
                        required: prizeConfig.fragmentCount,
                        completedSets: 0
                    };
                }
                userData.fragments[prize.name].current++;

                // 检查是否可以合成完整奖品
                if (userData.fragments[prize.name].current >= prizeConfig.fragmentCount) {
                    const completeSets = Math.floor(userData.fragments[prize.name].current / prizeConfig.fragmentCount);
                    userData.fragments[prize.name].current %= prizeConfig.fragmentCount;
                    userData.fragments[prize.name].completedSets += completeSets;
                    this.addToInventory(prize.name, completeSets);
                }
            } else {
                // 处理普通奖品
                this.addToInventory(prize.name, 1);
            }
        }

        // 更新转盘进度
        userData.spinsCompleted++;
        const requiredSpins = this.getRequiredSpins(userData.currentWheel);
        
        if (userData.spinsCompleted >= requiredSpins) {
            userData.currentWheel = userData.currentWheel === 5 ? 1 : userData.currentWheel + 1;
            userData.spinsCompleted = 0;
        }

        this.saveData();
        return true;
    }

    addToInventory(prizeName, count = 1) {
        const userData = this.userData[this.currentUser];
        userData.inventory[prizeName] = (userData.inventory[prizeName] || 0) + count;
    }

    // 导出数据
    exportUserData(username) {
        const data = this.userData[username];
        if (!data) return '';

        let output = `【${username}的奖品记录】\n`;
        output += '完整奖品：\n';
        Object.entries(data.inventory).forEach(([name, count]) => {
            output += `- ${name}: ${count}个\n`;
        });

        output += '\n碎片收集进度：\n';
        Object.entries(data.fragments).forEach(([name, info]) => {
            output += `- ${name}: 当前${info.current}/${info.required}，已合成${info.completedSets}次\n`;
        });

        output += `\n当前转盘：第${data.currentWheel}轮，已转动${data.spinsCompleted}次\n`;
        return output;
    }

    // 重置用户数据
    resetUserData() {
        this.userData = {};
        this.currentUser = '';
        this.saveData();
    }

    // 导出转盘设置
    exportWheelSettings() {
        return {
            prizes: this.prizes,
            wheelSettings: this.wheelSettings
        };
    }

    // 导入转盘设置
    importWheelSettings(data) {
        try {
            if (!data.prizes || !data.wheelSettings) {
                throw new Error('无效的数据格式');
            }

            // 验证奖品数据格式
            if (!Array.isArray(data.prizes)) {
                throw new Error('奖品数据格式错误');
            }

            // 验证转盘设置格式
            if (!Array.isArray(data.wheelSettings) || data.wheelSettings.length !== 5) {
                throw new Error('转盘设置格式错误');
            }

            this.prizes = data.prizes;
            this.wheelSettings = data.wheelSettings;
            this.saveData();
            return true;
        } catch (error) {
            console.error('导入转盘设置失败:', error.message);
            return false;
        }
    }

    // 重置转盘设置
    resetWheelSettings() {
        this.prizes = [];
        this.wheelSettings = this.getDefaultWheelSettings();
        this.saveData();
    }
} 