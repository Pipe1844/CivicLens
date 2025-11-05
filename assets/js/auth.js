// ==================== AUTENTICACIÓN CON FIREBASE ====================

// Verificar sesión al cargar
window.addEventListener('DOMContentLoaded', function () {
    firebase.auth().onAuthStateChanged(function (user) {
        if (user && window.location.pathname.includes('login.html')) {
            // Usuario logueado en página de login, redirigir a app
            window.location.href = 'index.html';
        } else if (!user && window.location.pathname.includes('index.html')) {
            // Usuario no logueado en app, redirigir a login
            window.location.href = 'login.html';
        } else if (user && window.location.pathname.includes('index.html')) {
            // Usuario logueado en app, inicializar
            initializeApp(user);
        }
    });
});

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
    }, 4000);
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
if (document.getElementById('loginForm')) {
    document.getElementById('loginForm').addEventListener('submit', async function (e) {
        e.preventDefault();

        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;

        try {
            const userCredential = await auth.signInWithEmailAndPassword(email, password);
            showSuccess('¡Bienvenido de vuelta!');
            // El onAuthStateChanged manejará la redirección
        } catch (error) {
            console.error('Error en login:', error);
            let errorMessage = 'Error al iniciar sesión';

            switch (error.code) {
                case 'auth/user-not-found':
                    errorMessage = 'Usuario no encontrado';
                    break;
                case 'auth/wrong-password':
                    errorMessage = 'Contraseña incorrecta';
                    break;
                case 'auth/invalid-email':
                    errorMessage = 'Email inválido';
                    break;
                case 'auth/too-many-requests':
                    errorMessage = 'Demasiados intentos. Intenta más tarde';
                    break;
            }

            showError(errorMessage);
        }
    });
}

// Manejar registro
if (document.getElementById('registerForm')) {
    document.getElementById('registerForm').addEventListener('submit', async function (e) {
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

        try {
            // Crear usuario en Firebase Auth
            const userCredential = await auth.createUserWithEmailAndPassword(email, password);
            const user = userCredential.user;

            // Actualizar perfil con nombre
            await user.updateProfile({
                displayName: name
            });

            // Guardar datos adicionales en Firestore
            await usersCollection.doc(user.uid).set({
                name: name,
                email: email,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                reportsCount: 0
            });

            showSuccess('¡Cuenta creada exitosamente!');

            // Limpiar formulario y mostrar login
            document.getElementById('registerForm').reset();
            setTimeout(() => showLoginForm(), 1500);

        } catch (error) {
            console.error('Error en registro:', error);
            let errorMessage = 'Error al crear cuenta';

            switch (error.code) {
                case 'auth/email-already-in-use':
                    errorMessage = 'Este correo ya está registrado';
                    break;
                case 'auth/invalid-email':
                    errorMessage = 'Email inválido';
                    break;
                case 'auth/weak-password':
                    errorMessage = 'La contraseña es muy débil';
                    break;
            }

            showError(errorMessage);
        }
    });
}

// Cerrar sesión
async function logout() {
    if (confirm('¿Estás seguro de que quieres cerrar sesión?')) {
        try {
            await auth.signOut();
            window.location.href = 'login.html';
        } catch (error) {
            console.error('Error al cerrar sesión:', error);
            alert('Error al cerrar sesión');
        }
    }
}