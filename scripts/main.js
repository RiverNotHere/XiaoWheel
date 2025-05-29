// 初始化存储和转盘
const storage = new Storage();
const wheel = new LuckyWheel(storage);

// 用户控制
document.getElementById('switchUser').addEventListener('click', () => {
    const username = document.getElementById('username').value.trim();
    if (storage.switchUser(username)) {
        wheel.renderWheel();
        wheel.updateInventoryDisplay();
    } else {
        alert('请输入有效的用户名！');
    }
});

// 转盘控制
document.getElementById('spin-button').addEventListener('click', () => {
    wheel.spin();
});

// 奖品管理
document.getElementById('add-prize').addEventListener('click', () => {
    const name = document.getElementById('prize-name').value.trim();
    const fragmentCount = document.getElementById('fragment-count').value;
    const notCounted = document.getElementById('not-counted').checked;
    
    if (!name) {
        alert('请输入奖品名称！');
        return;
    }

    const prize = storage.addPrize(name, fragmentCount, notCounted);
    updatePrizeTable();
    updateWheelPrizeSettings();
    updatePrizeList();
    
    // 清空输入框
    document.getElementById('prize-name').value = '';
    document.getElementById('fragment-count').value = '';
    document.getElementById('not-counted').checked = false;
});

// 转盘设置
document.getElementById('wheel-selector').addEventListener('change', (e) => {
    updateWheelPrizeSettings(parseInt(e.target.value));
});

// 数据导出
document.getElementById('export-data').addEventListener('click', () => {
    const user = storage.getCurrentUser();
    if (!user.name) {
        alert('请先选择用户！');
        return;
    }

    const data = storage.exportUserData(user.name);
    const blob = new Blob([data], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `${user.name}_奖品记录.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
});

// 数据重置
document.getElementById('reset-data').addEventListener('click', () => {
    if (confirm('确定要重置所有用户数据吗？这将不会影响奖品和转盘设置。')) {
        storage.resetUserData();
        wheel.renderWheel();
        wheel.updateInventoryDisplay();
        document.getElementById('username').value = '';
    }
});

// 辅助函数
function updatePrizeTable() {
    const table = document.getElementById('prize-table');
    table.innerHTML = `
        <table>
            <thead>
                <tr>
                    <th>奖品名称</th>
                    <th>碎片数量</th>
                    <th>计入方式</th>
                    <th>操作</th>
                </tr>
            </thead>
            <tbody>
                ${storage.prizes.map(prize => `
                    <tr>
                        <td>${prize.name}</td>
                        <td>${prize.fragmentCount || '无'}</td>
                        <td>${prize.notCounted ? '不计入' : '计入'}</td>
                        <td>
                            <button onclick="removePrize(${prize.id})">删除</button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

function updateWheelPrizeSettings(wheelId = 1) {
    const container = document.getElementById('wheel-prize-settings');
    const wheel = storage.wheelSettings[wheelId - 1];
    
    container.innerHTML = `
        <table>
            <thead>
                <tr>
                    <th>奖品</th>
                    <th>权重</th>
                    <th>计入方式</th>
                    <th>操作</th>
                </tr>
            </thead>
            <tbody>
                ${wheel.prizes.map((prize, index) => `
                    <tr>
                        <td>${prize.name}</td>
                        <td>
                            <input type="number" 
                                   value="${prize.weight || 1}" 
                                   min="1" 
                                   onchange="updatePrizeWeight(${wheelId}, ${index}, this.value)">
                        </td>
                        <td>${prize.notCounted ? '不计入' : '计入'}</td>
                        <td>
                            <button onclick="removeWheelPrize(${wheelId}, ${index})">删除</button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
        <div class="add-wheel-prize">
            <select id="wheel-prize-selector">
                ${storage.prizes.map(prize => `
                    <option value="${prize.id}">${prize.name}</option>
                `).join('')}
            </select>
            <input type="number" id="wheel-prize-weight" value="1" min="1" placeholder="权重">
            <button onclick="addWheelPrize(${wheelId})">添加奖品</button>
        </div>
    `;
}

function removePrize(prizeId) {
    if (!confirm('确定要删除这个奖品吗？这将同时从所有奖池中移除该奖品。')) {
        return;
    }

    // 从所有转盘中移除该奖品
    storage.wheelSettings.forEach((wheelSetting, index) => {
        wheelSetting.prizes = wheelSetting.prizes.filter(p => p.id !== prizeId);
    });
    
    // 从奖品列表中移除
    storage.removePrize(prizeId);
    
    // 更新所有显示
    updatePrizeTable();
    updateWheelPrizeSettings();
    updatePrizeList();
    wheel.renderWheel();
}

function updatePrizeWeight(wheelId, prizeIndex, weight) {
    const wheelSetting = storage.wheelSettings[wheelId - 1];
    wheelSetting.prizes[prizeIndex].weight = parseInt(weight) || 1;
    storage.saveData();
    updateWheelPrizeSettings(wheelId);
    wheel.renderWheel();
}

function removeWheelPrize(wheelId, prizeIndex) {
    if (!confirm('确定要从当前奖池中移除这个奖品吗？')) {
        return;
    }

    const wheelSetting = storage.wheelSettings[wheelId - 1];
    wheelSetting.prizes.splice(prizeIndex, 1);
    storage.saveData();
    updateWheelPrizeSettings(wheelId);
    updatePrizeList();
    wheel.renderWheel();
}

function addWheelPrize(wheelId) {
    const prizeId = parseInt(document.getElementById('wheel-prize-selector').value);
    const weight = parseInt(document.getElementById('wheel-prize-weight').value) || 1;
    const prize = storage.prizes.find(p => p.id === prizeId);
    
    if (prize) {
        const wheelSetting = storage.wheelSettings[wheelId - 1];
        // 检查是否已添加
        if (wheelSetting.prizes.some(p => p.id === prizeId)) {
            alert('该奖品已在当前奖池中！');
            return;
        }

        wheelSetting.prizes.push({
            id: prize.id,
            name: prize.name,
            weight: weight,
            notCounted: prize.notCounted,
            fragmentCount: prize.fragmentCount
        });
        storage.saveData();
        updateWheelPrizeSettings(wheelId);
        updatePrizeList();
        wheel.renderWheel();
    }
}

function initAdminPanel() {
    const addPrizeForm = document.getElementById('add-prize-form');
    const prizeList = document.getElementById('admin-prize-list');
    const wheelPrizeSettings = document.querySelectorAll('.wheel-prize-settings');

    // 添加奖品表单处理
    addPrizeForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('prize-name').value.trim();
        const fragmentCount = document.getElementById('fragment-count').value;
        const type = document.getElementById('prize-type').value;

        if (!name) {
            alert('请输入奖品名称');
            return;
        }

        try {
            const prize = storage.addPrize(name, type === 'fragment' ? fragmentCount : 0);
            updatePrizeList();
            addPrizeForm.reset();
            alert('奖品添加成功！');
        } catch (error) {
            console.error('添加奖品失败:', error);
            alert('添加奖品失败，请重试');
        }
    });

    // 更新奖品列表显示
    function updatePrizeList() {
        prizeList.innerHTML = '';
        storage.prizes.forEach(prize => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${prize.name}</td>
                <td>${prize.fragmentCount > 0 ? '碎片奖品' : '普通奖品'}</td>
                <td>${prize.notCounted ? '不计入' : '计入'}</td>
                <td>${prize.fragmentCount > 0 ? `需要${prize.fragmentCount}个碎片合成` : '-'}</td>
                <td>
                    <button onclick="removePrize(${prize.id})" class="delete-btn">删除</button>
                    ${prize.fragmentCount > 0 ? 
                        `<button onclick="editFragmentCount(${prize.id})" class="edit-btn">修改碎片数</button>` : 
                        ''}
                </td>
            `;
            prizeList.appendChild(row);
        });
    }

    // 添加编辑碎片数量的功能
    function editFragmentCount(prizeId) {
        const prize = storage.prizes.find(p => p.id === prizeId);
        if (!prize) return;

        const newCount = prompt('请输入新的碎片数量：', prize.fragmentCount);
        if (newCount === null) return;

        const count = parseInt(newCount);
        if (isNaN(count) || count <= 0) {
            alert('请输入有效的碎片数量！');
            return;
        }

        prize.fragmentCount = count;
        storage.saveData();
        updatePrizeList();
    }

    // 奖品类型切换处理
    document.getElementById('prize-type').addEventListener('change', (e) => {
        const fragmentInput = document.getElementById('fragment-count');
        const fragmentHint = document.getElementById('fragment-hint');
        const isFragment = e.target.value === 'fragment';
        
        fragmentInput.parentElement.style.display = isFragment ? 'block' : 'none';
        if (isFragment) {
            fragmentInput.setAttribute('required', 'required');
            fragmentInput.value = fragmentInput.value || '1';
            fragmentHint.textContent = '* 请设置集齐多少个碎片可以合成一个完整奖品';
        } else {
            fragmentInput.removeAttribute('required');
            fragmentInput.value = '';
            fragmentHint.textContent = '';
        }
    });

    // 转盘奖品设置
    wheelPrizeSettings.forEach(wheelSetting => {
        const wheelId = parseInt(wheelSetting.dataset.wheelId);
        const prizeSelect = wheelSetting.querySelector('.wheel-prize-select');
        const weightInput = wheelSetting.querySelector('.prize-weight');
        const addButton = wheelSetting.querySelector('.add-wheel-prize');
        const prizesList = wheelSetting.querySelector('.wheel-prizes-list');

        // 更新奖品选择列表
        function updatePrizeSelect() {
            prizeSelect.innerHTML = '<option value="">选择奖品...</option>';
            storage.prizes.forEach(prize => {
                prizeSelect.innerHTML += `<option value="${prize.id}">${prize.name}</option>`;
            });
        }

        // 更新已添加奖品列表
        function updateWheelPrizesList() {
            const wheel = storage.wheelSettings.find(w => w.id === wheelId);
            if (!wheel) return;

            prizesList.innerHTML = '';
            wheel.prizes.forEach((prize, index) => {
                const item = document.createElement('div');
                item.className = 'wheel-prize-item';
                item.innerHTML = `
                    <span>${prize.name}</span>
                    <span>权重: ${prize.weight || 1}</span>
                    <button onclick="removeWheelPrize(${wheelId}, ${index})">移除</button>
                `;
                prizesList.appendChild(item);
            });
        }

        // 添加奖品到转盘
        addButton.addEventListener('click', () => {
            const prizeId = parseInt(prizeSelect.value);
            const weight = parseInt(weightInput.value) || 1;

            if (!prizeId) {
                alert('请选择奖品');
                return;
            }

            const prize = storage.prizes.find(p => p.id === prizeId);
            if (!prize) return;

            const wheel = storage.wheelSettings.find(w => w.id === wheelId);
            if (!wheel) return;

            // 检查是否已添加
            if (wheel.prizes.some(p => p.id === prizeId)) {
                alert('该奖品已在转盘中');
                return;
            }

            wheel.prizes.push({
                ...prize,
                weight
            });

            storage.saveData();
            updateWheelPrizesList();
            prizeSelect.value = '';
            weightInput.value = '';
        });

        updatePrizeSelect();
        updateWheelPrizesList();
    });

    // 初始显示
    updatePrizeList();
}

// 初始化页面
updatePrizeTable();
updateWheelPrizeSettings();
updatePrizeList(); 