// ==================== CONFIGURACIÓN DE FIREBASE ====================

// TODO: Reemplaza esto con tu configuración de Firebase
const firebaseConfig = {
    apiKey: "AIzaSyDm6iWMycaBgj0vxcCr5p6aqneT7mmjBVU",
    authDomain: "civiclens-d65c5.firebaseapp.com",
    projectId: "civiclens-d65c5",
    storageBucket: "civiclens-d65c5.firebasestorage.app",
    messagingSenderId: "976462737722",
    appId: "1:976462737722:web:0bb6b0ae43d48309a3a003"
};

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);

// Referencias a servicios
const auth = firebase.auth();
const db = firebase.firestore();

// Colecciones
const usersCollection = db.collection('users');
const reportsCollection = db.collection('reports');

// Configuración para validación de reportes
const REPORT_VALIDATION_THRESHOLD = 3; // Número mínimo de reportes para mostrar
const REPORT_VALIDATION_RADIUS = 50; // Radio en metros para considerar reportes similares

console.log('✅ Firebase inicializado');