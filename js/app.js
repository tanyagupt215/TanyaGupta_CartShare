// Constants
const FREE_SHIPPING_THRESHOLD = 75.00;

// Current Session State (Stored in sessionStorage so each tab can simulate a different user!)
let currentUser = sessionStorage.getItem('cartshare_user') || null;
let currentRoom = sessionStorage.getItem('cartshare_room') || null;

// DOM Elements
const loginScreen = document.getElementById('login-screen');
const appScreen = document.getElementById('app-screen');
const joinRoomForm = document.getElementById('join-room-form');
const generateCodeBtn = document.getElementById('generate-code-btn');
const leaveRoomBtn = document.getElementById('leave-room-btn');
const addItemForm = document.getElementById('add-item-form');
const printReceiptBtn = document.getElementById('print-receipt-btn');

// ==================== INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', () => {
    if (currentUser && currentRoom) {
        enterRoom(currentUser, currentRoom);
    }
});

// Generate Random 6-Character Room Code
generateCodeBtn.addEventListener('click', () => {
    const randomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    document.getElementById('room-code').value = randomCode;
});

// Handle Login / Room Join
joinRoomForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const user = document.getElementById('username').value.trim();
    const room = document.getElementById('room-code').value.trim().toUpperCase();

    if (user && room) {
        sessionStorage.setItem('cartshare_user', user);
        sessionStorage.setItem('cartshare_room', room);
        currentUser = user;
        currentRoom = room;

        logActivity(room, `${user} joined the room.`);
        enterRoom(user, room);
    }
});

// Leave Room
leaveRoomBtn.addEventListener('click', () => {
    logActivity(currentRoom, `${currentUser} left the room.`);
    sessionStorage.removeItem('cartshare_user');
    sessionStorage.removeItem('cartshare_room');
    location.reload();
});

// ==================== STORAGE & DATA HELPERS ====================
function getRoomData(roomCode) {
    const raw = localStorage.getItem(`cartshare_data_${roomCode}`);
    if (!raw) {
        return { items: [], logs: [] };
    }
    return JSON.parse(raw);
}

function saveRoomData(roomCode, data) {
    localStorage.setItem(`cartshare_data_${roomCode}`, JSON.stringify(data));
    renderDashboard(); // Update current tab
}

function logActivity(roomCode, message) {
    const data = getRoomData(roomCode);
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    data.logs.unshift({ message, timestamp });
    // Keep last 30 logs
    if (data.logs.length > 30) data.logs.pop();
    saveRoomData(roomCode, data);
}

// ==================== CORE ROOM ACTIONS ====================
function enterRoom(user, room) {
    loginScreen.classList.add('d-none');
    appScreen.classList.remove('d-none');
    document.getElementById('display-username').textContent = user;
    document.getElementById('display-room-code').textContent = `ROOM: ${room}`;
    renderDashboard();
}

// Add Item to Shared Cart
addItemForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('item-name').value.trim();
    const price = parseFloat(document.getElementById('item-price').value);
    const qty = parseInt(document.getElementById('item-qty').value);

    if (!name || isNaN(price) || isNaN(qty)) return;

    const data = getRoomData(currentRoom);
    const newItem = {
        id: Date.now().toString(),
        name,
        price,
        qty,
        addedBy: currentUser
    };

    data.items.push(newItem);
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    data.logs.unshift({
        message: `${currentUser} added ${qty}x ${name} ($${(price * qty).toFixed(2)})`,
        timestamp
    });

    saveRoomData(currentRoom, data);
    addItemForm.reset();
    document.getElementById('item-qty').value = 1;
});

// Remove Item from Shared Cart
window.removeItem = function(itemId) {
    const data = getRoomData(currentRoom);
    const itemIndex = data.items.findIndex(item => item.id === itemId);

    if (itemIndex > -1) {
        const removedItem = data.items[itemIndex];
        data.items.splice(itemIndex, 1);

        const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        data.logs.unshift({
            message: `${currentUser} removed ${removedItem.name}`,
            timestamp
        });

        saveRoomData(currentRoom, data);
    }
};

// ==================== REAL-TIME CROSS-TAB SYNC ====================
// This fires automatically whenever ANOTHER browser tab modifies localStorage!
window.addEventListener('storage', (event) => {
    if (currentRoom && event.key === `cartshare_data_${currentRoom}`) {
        renderDashboard();
    }
});

// ==================== UI RENDERING ====================
function renderDashboard() {
    if (!currentRoom) return;
    const data = getRoomData(currentRoom);

    const cartTableBody = document.getElementById('cart-table-body');
    const emptyCartMsg = document.getElementById('empty-cart-msg');
    const memberSplitList = document.getElementById('member-split-list');
    const activityLogList = document.getElementById('activity-log-list');

    cartTableBody.innerHTML = '';
    memberSplitList.innerHTML = '';
    activityLogList.innerHTML = '';

    let grandTotal = 0;
    const userTotals = {}; // { "Alex": { total: 25.00, count: 2 } }

    // 1. Render Cart Items & Calculate Splits
    if (data.items.length === 0) {
        emptyCartMsg.classList.remove('d-none');
    } else {
        emptyCartMsg.classList.add('d-none');
        data.items.forEach(item => {
            const subtotal = item.price * item.qty;
            grandTotal += subtotal;

            if (!userTotals[item.addedBy]) {
                userTotals[item.addedBy] = { total: 0, count: 0 };
            }
            userTotals[item.addedBy].total += subtotal;
            userTotals[item.addedBy].count += item.qty;

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td class="fw-semibold">${escapeHTML(item.name)}</td>
                <td><span class="badge bg-secondary-subtle text-dark">${escapeHTML(item.addedBy)}</span></td>
                <td>${item.qty}</td>
                <td>$${item.price.toFixed(2)}</td>
                <td class="fw-bold">$${subtotal.toFixed(2)}</td>
                <td class="text-end">
                    <button class="btn btn-sm btn-outline-danger" onclick="removeItem('${item.id}')" title="Remove item">
                        <i class="bi bi-trash"></i>
                    </button>
                </td>
            `;
            cartTableBody.appendChild(tr);
        });
    }

    // 2. Update Free Shipping Progress Bar
    updateShippingProgress(grandTotal);

    // 3. Render Member Split Breakdown
    const members = Object.keys(userTotals);
    if (members.length === 0) {
        memberSplitList.innerHTML = '<li class="list-group-item text-muted small">No expenses recorded yet.</li>';
    } else {
        members.forEach(member => {
            const li = document.createElement('li');
            li.className = 'list-group-item d-flex justify-content-between align-items-center';
            li.innerHTML = `
                <span>${escapeHTML(member)} <small class="text-muted">(${userTotals[member].count} items)</small></span>
                <span class="fw-bold text-primary">$${userTotals[member].total.toFixed(2)}</span>
            `;
            memberSplitList.appendChild(li);
        });
    }

    // 4. Render Activity Log
    data.logs.forEach(log => {
        const div = document.createElement('div');
        div.className = 'activity-item';
        div.innerHTML = `
            <span>${escapeHTML(log.message)}</span>
            <span class="activity-time">${log.timestamp}</span>
        `;
        activityLogList.appendChild(div);
    });

    // 5. Populate Printable Receipt Data
    prepareReceipt(data.items, userTotals, grandTotal);
}

function updateShippingProgress(total) {
    const progressBar = document.getElementById('shipping-progress-bar');
    const statusText = document.getElementById('shipping-status-text');
    const totalBadge = document.getElementById('cart-total-badge');

    const percentage = Math.min((total / FREE_SHIPPING_THRESHOLD) * 100, 100);
    progressBar.style.width = `${percentage}%`;
    totalBadge.textContent = `$${total.toFixed(2)} / $${FREE_SHIPPING_THRESHOLD.toFixed(2)}`;

    if (total >= FREE_SHIPPING_THRESHOLD) {
        progressBar.classList.remove('bg-warning');
        progressBar.classList.add('bg-success');
        statusText.innerHTML = '<i class="bi bi-check-circle-fill text-success me-1"></i> Congratulations! FREE Shipping Unlocked!';
    } else {
        progressBar.classList.remove('bg-success');
        progressBar.classList.add('bg-warning');
        const remaining = (FREE_SHIPPING_THRESHOLD - total).toFixed(2);
        statusText.textContent = `Add $${remaining} more to unlock FREE shipping!`;
    }
}

// ==================== AUDIT RECEIPT & PRINTING ====================
function prepareReceipt(items, userTotals, grandTotal) {
    const dateStr = new Date().toLocaleDateString();
    document.getElementById('receipt-room-info').textContent = `Room Code: ${currentRoom} | Generated on: ${dateStr}`;

    const receiptItemsBody = document.getElementById('receipt-items-body');
    const receiptSplitBody = document.getElementById('receipt-split-body');
    receiptItemsBody.innerHTML = '';
    receiptSplitBody.innerHTML = '';

    items.forEach(item => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${escapeHTML(item.name)}</td>
            <td>${escapeHTML(item.addedBy)}</td>
            <td>${item.qty}</td>
            <td>$${item.price.toFixed(2)}</td>
            <td>$${(item.price * item.qty).toFixed(2)}</td>
        `;
        receiptItemsBody.appendChild(tr);
    });

    Object.keys(userTotals).forEach(member => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${escapeHTML(member)}</td>
            <td>${userTotals[member].count}</td>
            <td>$${userTotals[member].total.toFixed(2)}</td>
        `;
        receiptSplitBody.appendChild(tr);
    });

    document.getElementById('receipt-grand-total').textContent = `$${grandTotal.toFixed(2)}`;
}

printReceiptBtn.addEventListener('click', () => {
    window.print();
});

// Security helper to prevent XSS when rendering user input
function escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}