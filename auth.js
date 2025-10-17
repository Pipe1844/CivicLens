// ==================== SISTEMA DE AUTENTICACIÓN ====================

// Verificar si ya hay sesión activa al cargar
window.addEventListener('DOMContentLoaded', function() {
    checkSession();
});

function checkSession() {
    const session = localStorage.getItem('civicLensSession');
    if (session) {
        // Si hay sesión, redirigir a la app
        window.location.href = 'index.html';
    }
}

function showLoginForm() {
    document.getElementById('loginForm').style.display = 'block';
    document.getElementById('registerForm').style.display = 'none';
    clearMessages();
}

function showRegisterForm() {
    document.getElementById('loginForm').style.display = 'none';
    document.getElementById('registerForm').style.display = 'block';
    clearMessages();
}

function showError(message) {
    const errorDiv = document.getElementById('errorMessage');
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
    setTimeout(() => {
        errorDiv.style.display = 'none';
    }, 3000);
}

function showSuccess(message) {
    const successDiv = document.getElementById('successMessage');
    successDiv.textContent = message;
    successDiv.style.display = 'block';
    setTimeout(() => {
        successDiv.style.display = 'none';
    }, 3000);
}

function clearMessages() {
    document.getElementById('errorMessage').style.display = 'none';
    document.getElementById('successMessage').style.display = 'none';
}

// Manejar login
document.getElementById('loginForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    // Obtener usuarios registrados
    const users = JSON.parse(localStorage.getItem('civicLensUsers') || '[]');
    
    // Buscar usuario
    const user = users.find(u => u.email === email && u.password === password);
    
    if (user) {
        const currentUser = { name: user.name, email: user.email };
        localStorage.setItem('civicLensSession', JSON.stringify(currentUser));
        showSuccess('¡Bienvenido ' + user.name + '!');
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 500);
    } else {
        showError('Correo o contraseña incorrectos');
    }
});

// Manejar registro
document.getElementById('registerForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const name = document.getElementById('registerName').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    const passwordConfirm = document.getElementById('registerPasswordConfirm').value;
    
    // Validaciones
    if (password.length < 6) {
        showError('La contraseña debe tener al menos 6 caracteres');
        return;
    }
    
    if (password !== passwordConfirm) {
        showError('Las contraseñas no coinciden');
        return;
    }
    
    // Obtener usuarios existentes
    const users = JSON.parse(localStorage.getItem('civicLensUsers') || '[]');
    
    // Verificar si el email ya existe
    if (users.find(u => u.email === email)) {
        showError('Este correo ya está registrado');
        return;
    }
    
    // Crear nuevo usuario
    const newUser = { name, email, password };
    users.push(newUser);
    localStorage.setItem('civicLensUsers', JSON.stringify(users));
    
    showSuccess('¡Cuenta creada exitosamente! Ahora puedes iniciar sesión');
    
    // Limpiar formulario y mostrar login
    document.getElementById('registerForm').reset();
    setTimeout(() => showLoginForm(), 1500);
});