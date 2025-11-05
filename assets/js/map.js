// ==================== GESTIÓN DE MAPA Y REPORTES ====================

let map;
let userMarker;
let reports = new Map(); // Usar Map para mejor gestión de reportes
let reportMarkers = new Map();
let watchId = null;
let currentUser = null;
let routingControl = null;
let reportMode = false; // Modo de reporte rápido

// Inicializar aplicación con usuario autenticado
function initializeApp(user) {
    currentUser = user;
    document.getElementById('currentUserName').textContent = '👤 ' + user.displayName;
    initMap();
    loadReportsFromFirebase();
    setTimeout(initAccelerometer, 1000);
}

// Inicializar mapa
function initMap() {
    const initialCoords = [10.6346, -85.4370];
    map = L.map('map').setView(initialCoords, 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19
    }).addTo(map);

    // Evento de click en el mapa - mostrar opciones
    map.on('click', function (e) {
        showMapClickOptions(e.latlng);
    });

    getUserLocation();
}

// Mostrar opciones al hacer click en el mapa
function showMapClickOptions(latlng) {
    const popup = L.popup()
        .setLatLng(latlng)
        .setContent(`
            <div style="text-align: center; padding: 10px;">
                <div style="font-weight: bold; color: #667eea; margin-bottom: 10px;">¿Qué deseas hacer?</div>
                <button onclick="addReportFromPopup(${latlng.lat}, ${latlng.lng})" 
                        style="width: 100%; margin-bottom: 8px; background: #ff4757; color: white; border: none; padding: 10px; border-radius: 8px; cursor: pointer; font-weight: bold;">
                    ⚠️ Reportar Bache Aquí
                </button>
                <button onclick="routeToPoint(${latlng.lat}, ${latlng.lng})" 
                        style="width: 100%; background: #667eea; color: white; border: none; padding: 10px; border-radius: 8px; cursor: pointer; font-weight: bold;">
                    🗺️ Trazar Ruta Aquí
                </button>
            </div>
        `)
        .openOn(map);
}

// Agregar reporte desde el popup
function addReportFromPopup(lat, lng) {
    map.closePopup();
    addReport(L.latLng(lat, lng));
}

// Crear ruta a un punto específico
function routeToPoint(lat, lng) {
    map.closePopup();

    if (!userMarker) {
        alert('Esperando tu ubicación GPS...');
        return;
    }

    showRoute(userMarker.getLatLng(), L.latLng(lat, lng));
}

// Obtener ubicación del usuario
function getUserLocation() {
    if (navigator.geolocation) {
        watchId = navigator.geolocation.watchPosition(
            function (position) {
                const userLatLng = [position.coords.latitude, position.coords.longitude];

                if (!userMarker) {
                    map.setView(userLatLng, 15);

                    const userIcon = L.divIcon({
                        className: 'user-location',
                        html: '<div style="background: #4A90E2; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3);"></div>',
                        iconSize: [20, 20]
                    });

                    userMarker = L.marker(userLatLng, { icon: userIcon }).addTo(map);
                    userMarker.bindPopup('<b>Tu ubicación</b>');
                } else {
                    userMarker.setLatLng(userLatLng);
                }
            },
            function (error) {
                console.log('No se pudo obtener la ubicación:', error.message);
            },
            {
                enableHighAccuracy: true,
                maximumAge: 10000,
                timeout: 5000
            }
        );
    }
}

function centerOnUser() {
    if (userMarker) {
        map.setView(userMarker.getLatLng(), 15);
    } else {
        getUserLocation();
    }
}

// Cargar reportes desde Firebase
async function loadReportsFromFirebase() {
    try {
        // Escuchar cambios en tiempo real
        reportsCollection.onSnapshot(snapshot => {
            snapshot.docChanges().forEach(change => {
                const reportData = change.doc.data();
                const reportId = change.doc.id;

                if (change.type === 'added' || change.type === 'modified') {
                    // Verificar si debe mostrarse según validaciones
                    checkAndDisplayReport(reportId, reportData);
                } else if (change.type === 'removed') {
                    removeReportFromMap(reportId);
                }
            });

            updateReportCount();
        });
    } catch (error) {
        console.error('Error cargando reportes:', error);
    }
}

// Verificar y mostrar reporte según validaciones
async function checkAndDisplayReport(reportId, reportData) {
    const location = reportData.location;

    // Buscar reportes cercanos
    const nearbyReports = await findNearbyReports(location.lat, location.lng);

    // Si hay suficientes reportes cercanos, mostrar en el mapa
    if (nearbyReports.length >= REPORT_VALIDATION_THRESHOLD) {
        displayReportOnMap(reportId, reportData, nearbyReports.length);
    }
}

// Buscar reportes cercanos
async function findNearbyReports(lat, lng) {
    try {
        const allReports = await reportsCollection.get();
        const nearby = [];

        allReports.forEach(doc => {
            const data = doc.data();
            const distance = calculateDistance(
                lat, lng,
                data.location.lat, data.location.lng
            );

            if (distance <= REPORT_VALIDATION_RADIUS) {
                nearby.push({ id: doc.id, ...data, distance });
            }
        });

        return nearby;
    } catch (error) {
        console.error('Error buscando reportes cercanos:', error);
        return [];
    }
}

// Calcular distancia entre dos puntos (en metros)
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // Radio de la Tierra en metros
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) *
        Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
}

// Mostrar reporte en el mapa
function displayReportOnMap(reportId, reportData, validationCount) {
    // Si ya existe, actualizar
    if (reportMarkers.has(reportId)) {
        const marker = reportMarkers.get(reportId);
        marker.setPopupContent(createPopupContent(reportData, validationCount));
        return;
    }

    const latlng = L.latLng(reportData.location.lat, reportData.location.lng);

    const potholeIcon = L.divIcon({
        className: 'pothole-marker',
        html: `<div style="background: #ff4757; width: 30px; height: 30px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; font-size: 18px;">⚠️</div>`,
        iconSize: [30, 30]
    });

    const marker = L.marker(latlng, { icon: potholeIcon }).addTo(map);
    marker.bindPopup(createPopupContent(reportData, validationCount));

    reportMarkers.set(reportId, marker);
    reports.set(reportId, reportData);
}

// Crear contenido del popup
function createPopupContent(reportData, validationCount) {
    const date = reportData.timestamp ? new Date(reportData.timestamp.toDate()).toLocaleString('es-ES') : 'N/A';

    return `
        <div class="popup-title">Bache Reportado</div>
        <div class="popup-info">👥 ${validationCount} reporte(s)</div>
        <div class="popup-info">📅 ${date}</div>
        <div class="popup-info">📍 Lat: ${reportData.location.lat.toFixed(5)}</div>
        <div class="popup-info">📍 Lng: ${reportData.location.lng.toFixed(5)}</div>
    `;
}

// Eliminar reporte del mapa
function removeReportFromMap(reportId) {
    if (reportMarkers.has(reportId)) {
        map.removeLayer(reportMarkers.get(reportId));
        reportMarkers.delete(reportId);
    }
    reports.delete(reportId);
}

// Agregar nuevo reporte
async function addReport(latlng) {
    if (!currentUser) {
        alert('Debes iniciar sesión para reportar');
        return;
    }

    try {
        const reportData = {
            location: {
                lat: latlng.lat,
                lng: latlng.lng
            },
            userId: currentUser.uid,
            userName: currentUser.displayName,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            status: 'pending'
        };

        await reportsCollection.add(reportData);

        // Verificar si el documento del usuario existe
        const userDoc = await usersCollection.doc(currentUser.uid).get();

        if (userDoc.exists) {
            // Si existe, actualizar contador
            await usersCollection.doc(currentUser.uid).update({
                reportsCount: firebase.firestore.FieldValue.increment(1)
            });
        } else {
            // Si no existe, crearlo
            await usersCollection.doc(currentUser.uid).set({
                name: currentUser.displayName,
                email: currentUser.email,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                reportsCount: 1
            });
        }

        // Vibrar para confirmar
        if (navigator.vibrate) {
            navigator.vibrate(200);
        }

        console.log('✅ Reporte agregado exitosamente');
    } catch (error) {
        console.error('Error agregando reporte:', error);
        alert('Error al crear reporte: ' + error.message);
    }
}

function updateReportCount() {
    document.getElementById('reportCount').textContent = reports.size;
}

// ==================== SISTEMA DE RUTAS ====================

function calculateRoute() {
    if (!userMarker) {
        alert('Esperando tu ubicación...');
        return;
    }

    const destination = prompt('Ingresa las coordenadas de destino (lat,lng)\nEjemplo: 10.6346,-85.4370');

    if (!destination) return;

    const coords = destination.split(',').map(c => parseFloat(c.trim()));

    if (coords.length !== 2 || isNaN(coords[0]) || isNaN(coords[1])) {
        alert('Coordenadas inválidas');
        return;
    }

    showRoute(userMarker.getLatLng(), L.latLng(coords[0], coords[1]));
}

function showRoute(start, end) {
    // Limpiar ruta anterior si existe
    if (routingControl) {
        map.removeControl(routingControl);
    }

    // Crear nueva ruta usando Leaflet Routing Machine
    routingControl = L.Routing.control({
        waypoints: [start, end],
        routeWhileDragging: false,
        addWaypoints: false,
        draggableWaypoints: false,
        lineOptions: {
            styles: [{ color: '#667eea', weight: 5, opacity: 0.7 }]
        },
        createMarker: function (i, waypoint) {
            const icon = i === 0 ? '📍' : '🎯';
            return L.marker(waypoint.latLng, {
                icon: L.divIcon({
                    html: `<div style="font-size: 24px;">${icon}</div>`,
                    className: 'route-marker'
                })
            });
        }
    }).addTo(map);

    routingControl.on('routesfound', function (e) {
        const route = e.routes[0];
        const distance = (route.summary.totalDistance / 1000).toFixed(2);
        const time = Math.round(route.summary.totalTime / 60);

        alert(`Ruta encontrada:\n📏 Distancia: ${distance} km\n⏱️ Tiempo estimado: ${time} min`);
    });
}

function clearRoute() {
    if (routingControl) {
        map.removeControl(routingControl);
        routingControl = null;
        alert('Ruta eliminada');
    } else {
        alert('No hay ruta activa');
    }
}

// ==================== ACELERÓMETRO ====================

let lastX = 0, lastY = 0, lastZ = 0;
let lastUpdate = 0;
let lastShake = 0;
let SHAKE_THRESHOLD = 1000;
const SHAKE_COOLDOWN = 3000;

function adjustSensitivity(direction) {
    if (direction === 'up') {
        SHAKE_THRESHOLD -= 20;
    } else {
        SHAKE_THRESHOLD += 20;
    }
    document.getElementById('currentThreshold').textContent = 'Umbral: ' + SHAKE_THRESHOLD;
}

function initAccelerometer() {
    if (window.DeviceMotionEvent) {
        window.addEventListener('devicemotion', function (e) {
            const acc = e.accelerationIncludingGravity;
            const curTime = new Date().getTime();

            if ((curTime - lastUpdate) > 150) {
                const diffTime = curTime - lastUpdate;
                lastUpdate = curTime;

                const x = acc.x || 0;
                const y = acc.y || 0;
                const z = acc.z || 0;

                const speed = Math.abs(x + y + z - lastX - lastY - lastZ) / diffTime * 10000;

                if (speed > SHAKE_THRESHOLD && userMarker && (curTime - lastShake) > SHAKE_COOLDOWN) {
                    lastShake = curTime;
                    const latlng = userMarker.getLatLng();
                    addReport(latlng);

                    if (navigator.vibrate) {
                        navigator.vibrate(200);
                    }
                }

                lastX = x;
                lastY = y;
                lastZ = z;
            }
        });
        console.log('✅ Acelerómetro activado');
    }
}