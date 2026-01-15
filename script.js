// === PAGE NAVIGATION LOGIC ===
function showDashboard() {
    document.querySelector('.navbar').style.display = 'none'; // Sembunyikan Nav Home
    document.getElementById('homePage').style.display = 'none';
    
    const dash = document.getElementById('dashboardPage');
    dash.classList.remove('dashboard-hidden');
    dash.classList.add('dashboard-visible');
    
    // Trigger render ulang dashboard
    renderDashboard();
}

function showHome() {
    document.querySelector('.navbar').style.display = 'flex'; // Munculkan Nav Home
    document.getElementById('homePage').style.display = 'block';
    
    const dash = document.getElementById('dashboardPage');
    dash.classList.remove('dashboard-visible');
    dash.classList.add('dashboard-hidden');
}


// === CORE DASHBOARD LOGIC (Sama seperti sebelumnya) ===
let websites = JSON.parse(localStorage.getItem('myWebsites')) || [];

document.addEventListener('DOMContentLoaded', () => {
    // Background Check Interval
    setInterval(checkAllWebsites, 60000);
    if(websites.length > 0) checkAllWebsites();
    
    if (Notification.permission !== "denied") Notification.requestPermission();
    
    // Render awal (meskipun tersembunyi)
    renderDashboard();
});

function addWebsite() {
    const input = document.getElementById('urlInput');
    let url = input.value.trim();

    if (!url) return showToast('Please enter a URL', 'error');
    if (!url.startsWith('http')) url = 'https://' + url;
    if (websites.some(site => site.url === url)) return showToast('Website already exists', 'error');

    const newSite = { id: Date.now(), url: url, status: 'pending', latency: 0 };
    websites.push(newSite);
    saveData();
    input.value = '';
    
    renderDashboard();
    checkSingleWebsite(newSite.id);
    showToast('Website added successfully', 'success');
}

function removeWebsite(id) {
    websites = websites.filter(site => site.id !== id);
    saveData();
    renderDashboard();
}

function renderDashboard() {
    // Stats
    const total = websites.length;
    const online = websites.filter(w => w.status === 'up').length;
    const offline = websites.filter(w => w.status === 'down').length;

    document.getElementById('totalCount').innerText = total;
    document.getElementById('onlineCount').innerText = online;
    document.getElementById('offlineCount').innerText = offline;

    // List
    const listContainer = document.getElementById('websiteList');
    listContainer.innerHTML = '';

    if (total === 0) {
        listContainer.innerHTML = '<div class="empty-state" style="text-align:center; padding:20px; color:#999; font-size:12px;">No websites added yet.</div>';
    } else {
        websites.forEach(site => {
            let statusIcon = site.status === 'up' 
                ? `<svg width="20" height="20" viewBox="0 0 24 24" fill="#10B981"><circle cx="12" cy="12" r="10"/></svg>`
                : `<svg width="20" height="20" viewBox="0 0 24 24" fill="#EF4444"><circle cx="12" cy="12" r="10"/></svg>`;
            
            if(site.status === 'pending') statusIcon = `<svg width="20" height="20" viewBox="0 0 24 24" fill="#9CA3AF"><circle cx="12" cy="12" r="10"/></svg>`;

            const item = document.createElement('div');
            item.className = 'list-item';
            item.innerHTML = `
                <div class="site-url" title="${site.url}">${site.url.replace(/^https?:\/\//, '')}</div>
                <div class="site-actions">
                    <span style="font-size:12px; font-weight:600; color:${site.status==='up'?'#10B981':(site.status==='down'?'#EF4444':'#999')}">${site.latency}ms</span>
                    <div class="status-icon">${statusIcon}</div>
                    <button class="btn-delete" onclick="removeWebsite(${site.id})">×</button>
                </div>
            `;
            listContainer.appendChild(item);
        });
    }

    renderCharts(total, online, offline);
}

function renderCharts(total, online, offline) {
    // Pie
    const pie = document.getElementById('statusPie');
    if (total > 0) {
        const onlinePct = (online / total) * 100;
        pie.style.background = `conic-gradient(#10B981 0% ${onlinePct}%, #EF4444 ${onlinePct}% 100%)`;
        document.getElementById('legendUp').innerText = Math.round(onlinePct) + '%';
        document.getElementById('legendDown').innerText = Math.round(100 - onlinePct) + '%';
    } else {
        pie.style.background = '#E5E7EB';
        document.getElementById('legendUp').innerText = '0%';
        document.getElementById('legendDown').innerText = '0%';
    }

    // Bar
    const barContainer = document.getElementById('barChart');
    barContainer.innerHTML = '';
    if(total === 0) {
        barContainer.innerHTML = '<div class="placeholder-text">Add websites to see data</div>';
    } else {
        websites.forEach(site => {
            if(site.latency > 0) {
                let height = Math.min((site.latency / 500) * 100, 100);
                if (height < 10) height = 10;
                const bar = document.createElement('div');
                bar.className = 'bar';
                bar.style.height = `${height}%`;
                bar.style.background = site.status === 'up' ? '#10B981' : '#EF4444';
                barContainer.appendChild(bar);
            }
        });
    }
}

async function checkSingleWebsite(id) {
    const index = websites.findIndex(w => w.id === id);
    if (index === -1) return;
    const site = websites[index];
    
    try {
        const start = Date.now();
        // Menggunakan mode no-cors untuk simple reachability check (status opaque)
        // Note: Untuk status code akurat butuh backend proxy, tapi ini simulasi client-side
        await fetch(site.url, { mode: 'no-cors' }); 
        const latency = Date.now() - start;
        
        const oldStatus = websites[index].status;
        websites[index].status = 'up';
        websites[index].latency = latency;

        if (oldStatus === 'down') showToast(`${site.url} is back UP!`, 'success');

    } catch (error) {
        const oldStatus = websites[index].status;
        websites[index].status = 'down';
        websites[index].latency = 0;
        
        if (oldStatus === 'up') sendNotification(`⚠️ Alert: ${site.url} is DOWN!`);
    }
    
    saveData();
    renderDashboard();
}

async function checkAllWebsites() {
    for (let site of websites) {
        await checkSingleWebsite(site.id);
    }
}

function saveData() { localStorage.setItem('myWebsites', JSON.stringify(websites)); }

function showToast(msg, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerText = msg;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

function sendNotification(msg) {
    showToast(msg, 'error');
    if (Notification.permission === "granted") new Notification("PingNotify Alert", { body: msg });
}