// =================================================================
//  CONFIGURACIÓN E INICIALIZACIÓN
// =================================================================

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const database = firebase.database();
const functions = firebase.functions(); // Inicializamos las functions


// =================================================================
//  REFERENCIAS A ELEMENTOS HTML
// =================================================================
const loginContainer = document.getElementById('login-container');
const adminPanelContainer = document.getElementById('admin-panel-container');
const loginForm = document.getElementById('login-form');
const logoutButton = document.getElementById('logout-button');
const adminContentDiv = document.getElementById('admin-content');
const loginError = document.getElementById('login-error');

// =================================================================
//  LÓGICA DE NAVEGACIÓN
// =================================================================
function showScreen(screenName) {
    loginContainer.style.display = 'none';
    adminPanelContainer.style.display = 'none';

    if (screenName === 'login') {
        loginContainer.style.display = 'block';
    } else if (screenName === 'admin') {
        adminPanelContainer.style.display = 'block';
    }
}

// =================================================================
//  CONTROLADOR PRINCIPAL (AUTENTICACIÓN)
// =================================================================
auth.onAuthStateChanged((user) => {
    if (user) {
        checkUserRole(user);
    } else {
        showScreen('login');
    }
});

function checkUserRole(user) {
    const userRoleRef = database.ref(`users/${user.uid}/role`);
    userRoleRef.once('value', (snapshot) => {
        const role = snapshot.val();
        if (role === 'admin') {
            showScreen('admin');
            loadAdminPanel();
        } else {
            loginError.textContent = "Error: No tienes permisos de administrador.";
            auth.signOut();
        }
    });
}

// =================================================================
//  LÓGICA DEL PANEL DE ADMINISTRACIÓN
// =================================================================

function loadAdminPanel() {
    const usersRef = database.ref('users');
    const alarmsRef = database.ref('alarms');
    
    adminContentDiv.innerHTML = '';

    // --- TARJETA 1: ESTADO EN VIVO ---
    const statusCard = document.createElement('div');
    statusCard.className = 'admin-card';
    statusCard.innerHTML = `
        <h2>Estado en Vivo</h2>
        <div class="card-content" id="live-status-content"></div>
    `;
    adminContentDiv.appendChild(statusCard);
    const liveStatusContent = document.getElementById('live-status-content');

    alarmsRef.on('value', (alarmsSnapshot) => {
        const alarmsData = alarmsSnapshot.val();
        liveStatusContent.innerHTML = '';
        
        for (const deviceId in alarmsData) {
            const deviceData = alarmsData[deviceId];
            
            // Creamos una tarjeta individual para cada dispositivo
            const deviceCard = document.createElement('div');
            deviceCard.className = 'device-status-card';

            let circleClass = 'offline';
            if (deviceData.is_online) circleClass = 'online';
            if (deviceData.ringring) circleClass = 'ringing';
            const rssi = deviceData.is_online ? `${deviceData.wifi_rssi || 'N/A'} dBm` : '---';

            // --- ESTRUCTURA HTML MODIFICADA PARA UNA SOLA LÍNEA ---
            deviceCard.innerHTML = `
                <span class="device-name">${deviceId}</span>
                <div class="status-indicator">
                    <div class="status-circle ${circleClass}"></div>
                    <span class="rssi-text">${rssi}</span>
                </div>
            `;
            liveStatusContent.appendChild(deviceCard);
        }
    });

    // --- TARJETA 2: USUARIOS Y PERMISOS ---
    const usersCard = document.createElement('div');
    usersCard.className = 'admin-card';
    usersCard.innerHTML = '<h2>Usuarios</h2>';
    adminContentDiv.appendChild(usersCard);

    usersRef.on('value', (snapshot) => {
        const existingTable = usersCard.querySelector('table');
        if (existingTable) existingTable.remove();
        
        const users = snapshot.val();
        
        const table = document.createElement('table');
        table.innerHTML = `
            <thead>
                <tr>
                    <th>Usuario</th>
                    <th>Donosti</th>
                    <th>Lasarte</th>
                </tr>
            </thead>
            <tbody></tbody>
        `;
        const tbody = table.querySelector('tbody');

        for (const uid in users) {
            const user = users[uid];
            const row = tbody.insertRow();
            row.innerHTML = `
                <td>${user.alias || user.email}</td>
                <td>
                    <label class="switch">
                        <input type="checkbox" data-uid="${uid}" data-device="Donosti" ${user.permissions && user.permissions.Donosti ? 'checked' : ''}>
                        <span class="slider"></span>
                    </label>
                </td>
                <td>
                    <label class="switch">
                        <input type="checkbox" data-uid="${uid}" data-device="Lasarte" ${user.permissions && user.permissions.Lasarte ? 'checked' : ''}>
                        <span class="slider"></span>
                    </label>
                </td>
            `;
        }
        usersCard.appendChild(table);
        addPermissionToggleListeners();
    });
}



function addPermissionToggleListeners() {
    const checkboxes = document.querySelectorAll('#admin-content input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
        checkbox.addEventListener('change', (event) => {
            const uid = event.target.dataset.uid;
            const deviceId = event.target.dataset.device;
            const hasPermission = event.target.checked;
            
            const permissionRef = database.ref(`users/${uid}/permissions/${deviceId}`);
            permissionRef.set(hasPermission);
        });
    });
}

// =================================================================
//  MANEJADORES DE EVENTOS DE LOGIN/LOGOUT
// =================================================================
loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    loginError.textContent = '';
    auth.signInWithEmailAndPassword(email, password)
        .catch((error) => {
            loginError.textContent = "Error: Email o contraseña incorrectos.";
            console.error("Error de login:", error);
        });
});

logoutButton.addEventListener('click', () => {
    auth.signOut();

});

