import { StatusBar } from 'expo-status-bar';
import React, { useState, useEffect, useCallback } from 'react';
import {
    StyleSheet, Text, View, FlatList, ActivityIndicator,
    Alert, TouchableOpacity, Platform, Linking
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as XLSX from 'xlsx';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';

// ── Importamos las funciones de ruta desde db.js ──────────────────────────────
import { getRutaActiva, guardarRutaActiva, limpiarRutaActiva , importarLocalesDesdeXLSX } from '../utils/db';
import { useRouter } from 'expo-router';

// ─── ALGORITMO DE ORDENAMIENTO ────────────────────────────────────────────────

const calcularDistancia = (lat1, lon1, lat2, lon2) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) *
        Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};

const ordenarPorCercania = (puntoInicio, puntos) => {
    const visitados = [];
    let actual = puntoInicio;
    let noVisitados = [...puntos];

    while (noVisitados.length > 0) {
        let masCercano = null;
        let menorDistancia = Infinity;
        let indexEncontrado = -1;

        noVisitados.forEach((punto, i) => {
            const pLat = parseFloat(punto.Latitud);
            const pLon = parseFloat(punto.Longitud);
            if (!isNaN(pLat) && !isNaN(pLon)) {
                const distancia = calcularDistancia(actual.lat, actual.lon, pLat, pLon);
                if (distancia < menorDistancia) {
                    menorDistancia = distancia;
                    masCercano = punto;
                    indexEncontrado = i;
                }
            }
        });

        if (indexEncontrado !== -1) {
            visitados.push({ ...masCercano, distanciaCalculada: menorDistancia.toFixed(2) });
            actual = {
                lat: parseFloat(masCercano.Latitud),
                lon: parseFloat(masCercano.Longitud)
            };
            noVisitados.splice(indexEncontrado, 1);
        } else {
            noVisitados.shift();
        }
    }
    return visitados;
};

// ─── COMPONENTE PRINCIPAL ─────────────────────────────────────────────────────

export default function RecolectaMasiva() {
    const router = useRouter();
    const [datosExcel, setDatosExcel]           = useState([]);
    const [isLoading, setIsLoading]             = useState(true);
    const [hayRutaGuardada, setHayRutaGuardada] = useState(false);
    const [miUbicacion, setMiUbicacion]         = useState(null);
    const [estadoDB, setEstadoDB]               = useState('verificando'); // 'verificando' | 'sin_ruta' | 'con_ruta'

    // ── 1. Al arrancar: verificar si ya hay ruta en la DB ──
    useEffect(() => {
        const verificarRuta = async () => {
            try {
                const rutaGuardada = await getRutaActiva(); // <-- viene de db.js

                if (rutaGuardada.length > 0) {
                    setDatosExcel(rutaGuardada);
                    setHayRutaGuardada(true);
                    setEstadoDB('con_ruta');
                } else {
                    setEstadoDB('sin_ruta');
                }
            } catch (error) {
                console.error('Error al verificar ruta:', error);
                setEstadoDB('sin_ruta');
            } finally {
                setIsLoading(false);
            }
        };

        verificarRuta();
    }, []);

    // ── 2. Pedir permisos GPS ──
    useEffect(() => {
        (async () => {
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permiso denegado', 'Necesitamos el GPS para ordenar la ruta por cercanía.');
                return;
            }
            let location = await Location.getCurrentPositionAsync({});
            setMiUbicacion({
                lat: location.coords.latitude,
                lon: location.coords.longitude
            });
        })();
    }, []);

    // ── Abrir mapa nativo ──
    const abrirMapa = (lat, lon) => {
        if (!lat || !lon) {
            Alert.alert('Error', 'Este cliente no tiene coordenadas GPS registradas.');
            return;
        }
        const url = Platform.select({
            ios: `maps:0,0?q=${lat},${lon}`,
            android: `geo:0,0?q=${lat},${lon}`
        });
        Linking.openURL(url);
    };

    // ── Importar Excel y generar ruta optimizada ──
    const importarExcel = async () => {
        if (!miUbicacion) {
            Alert.alert('GPS no listo', 'Espera un momento mientras obtenemos tu ubicación actual.');
            return;
        }
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                copyToCacheDirectory: true
            });

            if (result.canceled) return;

            setIsLoading(true);
            const fileUri = result.assets[0].uri;
            const response = await fetch(fileUri);
            const blob = await response.blob();
            const reader = new FileReader();

            reader.onload = (e) => {
                const data = e.target.result;
                const base64Data = data.split(',')[1] || data;
                const workbook = XLSX.read(base64Data, { type: 'base64' });
                const worksheet = workbook.Sheets[workbook.SheetNames[0]];
                const json = XLSX.utils.sheet_to_json(worksheet);

                if (json.length === 0) {
                    Alert.alert('Aviso', 'El archivo Excel está vacío.');
                    setIsLoading(false);
                    return;
                }

                // ── DETECCIÓN AUTOMÁTICA DE FORMATO ──────────────────────────
                // Revisamos las columnas de la primera fila para identificar el formato
                const columnas = Object.keys(json[0]).map(k => k.trim().toLowerCase());

                const esFormatoClientes = columnas.some(c =>
                    c.includes('rif') || c.includes('razon social') || c.includes('razón social') ||
                    c.includes('clase de cliente') || c.includes('segmentacion') || c.includes('segmentación')
                );

                const esFormatoRuta = columnas.some(c =>
                    c.includes('latitud') || c.includes('longitud') || c.includes('ubicación') ||
                    c.includes('ubicacion') || c.includes('rating')
                );

                let puntosMapeados = [];

                if (esFormatoClientes && !esFormatoRuta) {
                    // ── FORMATO 1: Clientes (Rif No., Nombre o Razon Social, etc.) ──
                    // Este formato NO tiene coordenadas, así que no podemos ordenar por cercanía
                    // Lo mostramos igual pero sin distancia calculada
                    puntosMapeados = json.map(row => ({
                        Nombre:    row['Nombre o Razon Social'] || row['Razon Social'] || row['Razón Social'] || row['nombre o razon social'] || 'Sin nombre',
                        Categoria: row['Clase de Cliente'] || row['Segmentacion'] || row['Segmentación'] || row['segmentacion'] || 'General',
                        Direccion: row['Direccion del Cliente'] || row['Dirección del Cliente'] || row['direccion del cliente'] || 'Sin dirección',
                        Telefono:  row['Teléfono'] || row['Telefono'] || row['telefono'] || 'N/A',
                        Correo:    row['Correo'] || row['correo'] || '',
                        RIF:       row['Rif No.'] || row['RIF'] || row['rif no.'] || '',
                        Sector:    row['Sector'] || row['sector'] || '',
                        Latitud:   null,
                        Longitud:  null,
                        distanciaCalculada: 'N/A',
                    }));

                    Alert.alert(
                        'Formato detectado: Clientes',
                        `Se cargaron ${puntosMapeados.length} clientes.\nEste formato no tiene coordenadas GPS, no se puede ordenar por cercanía.`
                    );

                } else if (esFormatoRuta) {
                    // ── FORMATO 2: Ruta con GPS (Nombre, Categoria, Latitud, Longitud, etc.) ──
                    // Normalizamos los nombres de columnas por si vienen con variaciones
                    puntosMapeados = json.map(row => {
                        // Buscar latitud y longitud con distintos nombres posibles
                        const lat = row['Latitud'] || row['latitud'] || row['LATITUD'] ||
                                    row['GPS LATITUD'] || row['lat'] || null;
                        const lon = row['Longitud'] || row['longitud'] || row['LONGITUD'] ||
                                    row['GPS LONGITUD'] || row['lng'] || row['lon'] || null;

                        // Manejar columna "ubicación" que puede venir como "lat,lon"
                        let latFinal = lat;
                        let lonFinal = lon;
                        const ubicacion = row['ubicación'] || row['Ubicación'] || row['ubicacion'] || row['Ubicacion'] || '';
                        if (!latFinal && !lonFinal && ubicacion && ubicacion.includes(',')) {
                            const partes = ubicacion.split(',');
                            latFinal = partes[0]?.trim();
                            lonFinal = partes[1]?.trim();
                        }

                        return {
                            Nombre:    row['Nombre'] || row['nombre'] || row['NOMBRE'] || 'Sin nombre',
                            Categoria: row['Categoria'] || row['Categoría'] || row['categoria'] || row['CATEGORIA'] || 'General',
                            Direccion: row['Direccion'] || row['Dirección'] || row['direccion'] || row['DIRECCION'] || 'Sin dirección',
                            Telefono:  row['Telefono'] || row['Teléfono'] || row['telefono'] || row['TELEFONO'] || 'N/A',
                            Rating:    row['Rating'] || row['rating'] || '',
                            Latitud:   latFinal,
                            Longitud:  lonFinal,
                            distanciaCalculada: '0',
                        };
                    });

                    // Ordenar por cercanía solo si hay coordenadas válidas
                    const conCoordenadas = puntosMapeados.filter(p =>
                        p.Latitud && p.Longitud &&
                        !isNaN(parseFloat(p.Latitud)) && !isNaN(parseFloat(p.Longitud))
                    );

                    if (conCoordenadas.length > 0) {
                        puntosMapeados = ordenarPorCercania(miUbicacion, puntosMapeados);
                        Alert.alert('Éxito', `Ruta optimizada con ${puntosMapeados.length} paradas.`);
                    } else {
                        Alert.alert('Aviso', 'El archivo no tiene coordenadas GPS válidas, se carga sin ordenar.');
                    }

                } else {
                    // ── FORMATO DESCONOCIDO: intentamos leer lo que podamos ──
                    puntosMapeados = json.map(row => {
                        const vals = Object.values(row);
                        return {
                            Nombre:    vals[1] || vals[0] || 'Sin nombre',
                            Categoria: vals[2] || 'General',
                            Direccion: vals[4] || vals[3] || 'Sin dirección',
                            Telefono:  vals[5] || 'N/A',
                            Latitud:   null,
                            Longitud:  null,
                            distanciaCalculada: 'N/A',
                        };
                    });
                    Alert.alert('Formato no reconocido', `Se cargaron ${puntosMapeados.length} registros sin ordenar. Verifica las columnas del archivo.`);
                }

                setDatosExcel(puntosMapeados);
                setHayRutaGuardada(false);
                setEstadoDB('con_ruta');
                setIsLoading(false);
            };

            reader.readAsDataURL(blob);
        } catch (error) {
            setIsLoading(false);
            Alert.alert('Error', 'No se pudo procesar el archivo.');
        }
    };

    // ── Guardar ruta en SQLite ──
    const guardarEnSQLite = useCallback(async () => {
        if (datosExcel.length === 0) return;

        Alert.alert(
            'Guardar Ruta',
            `¿Guardar esta ruta con ${datosExcel.length} paradas en el dispositivo?`,
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Sí, guardar',
                    onPress: async () => {
                        try {
                            await guardarRutaActiva(datosExcel); // <-- viene de db.js
                            setHayRutaGuardada(true);
                            Alert.alert('Guardado ✅', 'La ruta fue guardada en el dispositivo.');
                        } catch (error) {
                            Alert.alert('Error', 'No se pudo guardar la ruta.');
                        }
                    }
                }
            ]
        );
    }, [datosExcel]);

    // ── Limpiar ruta y volver al estado inicial ──
    const limpiarRuta = () => {
        Alert.alert(
            'Nueva Ruta',
            '¿Borrar la ruta guardada y cargar un Excel nuevo?',
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Sí, limpiar',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await limpiarRutaActiva(); // <-- viene de db.js
                        } catch (e) {
                            console.warn('Error al limpiar:', e);
                        }
                        setDatosExcel([]);
                        setHayRutaGuardada(false);
                        setEstadoDB('sin_ruta');
                    }
                }
            ]
        );
    };

    // ── Eliminar un punto de la lista ──
    const eliminarPunto = (index) => {
        Alert.alert(
            'Eliminar parada',
            '¿Quitar este punto de la ruta actual?',
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Eliminar',
                    style: 'destructive',
                    onPress: async () => {
                        const nuevosDatos = [...datosExcel];
                        nuevosDatos.splice(index, 1);
                        setDatosExcel(nuevosDatos);
                        // Si la ruta ya estaba guardada, sincronizamos la DB
                        if (hayRutaGuardada) {
                            await guardarRutaActiva(nuevosDatos); // <-- viene de db.js
                        }
                    }
                }
            ]
        );
    };

    // ─── RENDER TARJETA ───────────────────────────────────────────────────────
    const renderFila = ({ item, index }) => {
        const tieneGPS = item.Latitud && item.Longitud &&
                         !isNaN(parseFloat(item.Latitud)) && !isNaN(parseFloat(item.Longitud));
        const distancia = item.distanciaCalculada !== 'N/A'
            ? `${item.distanciaCalculada} km`
            : 'Sin GPS';

        // ── Navegar a censo pre-llenado con todos los datos de la card ──
        const irACensar = () => {
            router.push({
                pathname: '/paginas/NewClienteLocal',
                params: {
                    prefill_nombre:    item.Nombre    || '',
                    prefill_rif:       item.RIF       || '',
                    prefill_telefono:  item.Telefono  || '',
                    prefill_direccion: item.Direccion || '',
                    prefill_correo:    item.Correo    || '',
                    prefill_sector:    item.Sector    || '',
                    prefill_categoria: item.Categoria || '',
                    prefill_lat:       item.Latitud   ? String(item.Latitud)  : '',
                    prefill_lng:       item.Longitud  ? String(item.Longitud) : '',
                }
            });
        };

        return (
        <View style={styles.card}>
            <View style={styles.cardHeader}>
                <Text style={styles.cardTitle} numberOfLines={1}>
                    {index + 1}. {item.Nombre || 'Negocio'}
                </Text>
                <View style={[styles.distanceBadge, !tieneGPS && { backgroundColor: '#FEF9E7' }]}>
                    <Text style={[styles.distanceText, !tieneGPS && { color: '#E67E22' }]}>
                        {distancia}
                    </Text>
                </View>
            </View>

            {/* RIF si existe */}
            {item.RIF ? (
                <Text style={styles.rifTag}>RIF: {item.RIF}</Text>
            ) : null}

            <Text style={styles.categoryTag}>{item.Categoria || 'General'}</Text>

            {/* Sector si existe */}
            {item.Sector ? (
                <Text style={styles.sectorTag}>Sector: {item.Sector}</Text>
            ) : null}

            <View style={styles.divider} />

            <View style={styles.detailRow}>
                <Ionicons name="location-outline" size={16} color="#1B4F72" />
                <Text style={styles.detailText} numberOfLines={2}>
                    {item.Direccion || 'Sin dirección'}
                </Text>
            </View>

            {/* Correo si existe */}
            {item.Correo ? (
                <View style={styles.detailRow}>
                    <Ionicons name="mail-outline" size={16} color="#8E44AD" />
                    <Text style={styles.detailText} numberOfLines={1}>{item.Correo}</Text>
                </View>
            ) : null}

            <View style={styles.cardFooter}>
                <View style={styles.detailRow}>
                    <Ionicons name="call-outline" size={16} color="#27AE60" />
                    <Text style={styles.detailText}>{item.Telefono || 'N/A'}</Text>
                </View>

                <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TouchableOpacity
                        style={[styles.mapButton, { backgroundColor: '#FDEDEC' }]}
                        onPress={() => eliminarPunto(index)}
                    >
                        <Ionicons name="trash-outline" size={18} color="#C0392B" />
                    </TouchableOpacity>

                    {tieneGPS && (
                        <TouchableOpacity
                            style={styles.mapButton}
                            onPress={() => abrirMapa(item.Latitud, item.Longitud)}
                        >
                            <Ionicons name="navigate-outline" size={18} color="#1B4F72" />
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {/* ── BOTÓN CENSAR ── */}
            <TouchableOpacity style={styles.btnCensar} onPress={irACensar} activeOpacity={0.82}>
                <Ionicons name="clipboard-outline" size={15} color="#fff" />
                <Text style={styles.btnCensarText}>CENSAR CLIENTE</Text>
            </TouchableOpacity>
        </View>
        );
    };

    // ─── PANTALLA VACÍA ───────────────────────────────────────────────────────
    const renderSinRuta = () => (
    <View style={styles.emptyContainer}>
        <View style={styles.emptyIconWrapper}>
            <Ionicons name="map-outline" size={64} color="#1B4F72" />
        </View>
        <Text style={styles.emptyTitle}>Sin ruta activa</Text>
        <Text style={styles.emptySubtitle}>
            No hay ninguna ruta guardada en el dispositivo.{'\n'}
            Carga un archivo Excel para generar la ruta optimizada.
        </Text>
        <TouchableOpacity style={styles.btnEmptyImportar} onPress={importarExcel}>
            <Ionicons name="document-attach" size={22} color="#fff" />
            <Text style={styles.btnEmptyText}>ORDENAR EXCEL</Text>
        </TouchableOpacity>

        {/* ── NUEVO ── */}
        <TouchableOpacity
            style={[styles.btnEmptyImportar, { backgroundColor: '#117A65', marginTop: 12 }]}
            onPress={importarLocalesDesdeXLSX}
        >
            <Ionicons name="storefront-outline" size={22} color="#fff" />
            <Text style={styles.btnEmptyText}>IMPORTAR LOCALES</Text>
        </TouchableOpacity>
    </View>
);

    // ─── PANTALLA DE CARGA INICIAL ────────────────────────────────────────────
    if (isLoading && estadoDB === 'verificando') {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#1B4F72" />
                <Text style={styles.loadingText}>Verificando ruta guardada...</Text>
            </View>
        );
    }

    // ─── RENDER PRINCIPAL ─────────────────────────────────────────────────────
    return (
        <View style={styles.container}>
            <StatusBar style="light" />

            {/* HEADER */}
            <View style={styles.topHeader}>
                <Text style={styles.headerTitle}>OPTIMA RUTA</Text>
                {hayRutaGuardada && (
                    <View style={styles.savedBadge}>
                        <Ionicons name="checkmark-circle" size={14} color="#27AE60" />
                        <Text style={styles.savedBadgeText}>Guardada en dispositivo</Text>
                    </View>
                )}
            </View>

            {/* PANEL DE ACCIONES — solo cuando hay ruta cargada */}
            {estadoDB === 'con_ruta' && datosExcel.length > 0 && (
                <View style={styles.actionPanel}>

    {estadoDB === 'con_ruta' && datosExcel.length > 0 && (
        <TouchableOpacity style={styles.btnImportar} onPress={limpiarRuta}>
            <Ionicons name="refresh-outline" size={20} color="#fff" />
            <Text style={styles.btnText}>NUEVA RUTA</Text>
        </TouchableOpacity>
    )}

    {estadoDB === 'con_ruta' && !hayRutaGuardada && (
        <TouchableOpacity style={styles.btnGuardar} onPress={guardarEnSQLite}>
            <Ionicons name="save-outline" size={20} color="#fff" />
            <Text style={styles.btnText}>GUARDAR</Text>
        </TouchableOpacity>
    )}

    {/* ── NUEVO: importar locales desde xlsx ── */}
    <TouchableOpacity style={styles.btnLocales} onPress={importarLocalesDesdeXLSX}>
        <Ionicons name="storefront-outline" size={20} color="#fff" />
        <Text style={styles.btnText}>LOCALES</Text>
    </TouchableOpacity>

</View>
            )}

            {/* CONTENIDO */}
            {isLoading ? (
                <ActivityIndicator size="large" color="#1B4F72" style={{ marginTop: 50 }} />
            ) : estadoDB === 'sin_ruta' ? (
                renderSinRuta()
            ) : (
                <FlatList
                    data={datosExcel}
                    keyExtractor={(_, i) => i.toString()}
                    renderItem={renderFila}
                    contentContainerStyle={{ padding: 15 }}
                    ListEmptyComponent={
                        <Text style={styles.emptyText}>No hay paradas en esta ruta.</Text>
                    }
                />
            )}
        </View>
    );
}

// ─── ESTILOS ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    container:       { flex: 1, backgroundColor: '#f0f2f5' },
    loadingContainer:{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f0f2f5' },
    loadingText:     { marginTop: 16, color: '#1B4F72', fontSize: 14, fontWeight: '600' },
    topHeader: {
        paddingTop: 60, paddingBottom: 20, backgroundColor: '#1B4F72',
        alignItems: 'center', borderBottomLeftRadius: 20, borderBottomRightRadius: 20,
    },
    headerTitle:     { color: '#fff', fontSize: 18, fontWeight: 'bold', letterSpacing: 1 },
    savedBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6,
        backgroundColor: '#EBF5FB', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20,
    },
    savedBadgeText:  { fontSize: 11, color: '#27AE60', fontWeight: '700' },
    actionPanel:     { flexDirection: 'row', padding: 15, gap: 10 },
    btnImportar: {
        backgroundColor: '#1B4F72', padding: 15, borderRadius: 12,
        flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8
    },
    btnGuardar: {
        backgroundColor: '#27AE60', padding: 15, borderRadius: 12,
        flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8
    },
    btnText:         { color: '#fff', fontWeight: 'bold', fontSize: 13 },
    emptyContainer:  { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 },
    emptyIconWrapper: {
        width: 110, height: 110, borderRadius: 55,
        backgroundColor: '#EBF5FB', justifyContent: 'center', alignItems: 'center', marginBottom: 20,
    },
    emptyTitle:      { fontSize: 20, fontWeight: '800', color: '#2C3E50', marginBottom: 10 },
    emptySubtitle:   { fontSize: 14, color: '#7F8C8D', textAlign: 'center', lineHeight: 22, marginBottom: 30 },
    btnEmptyImportar: {
        backgroundColor: '#1B4F72', paddingVertical: 16, paddingHorizontal: 32,
        borderRadius: 16, flexDirection: 'row', alignItems: 'center', gap: 10,
        elevation: 4, shadowColor: '#1B4F72', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 6,
    },
    btnEmptyText:    { color: '#fff', fontWeight: 'bold', fontSize: 15 },
    card: {
        backgroundColor: '#fff', borderRadius: 15, padding: 16, marginBottom: 15,
        elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1, shadowRadius: 4
    },
    cardHeader:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 },
    cardTitle:       { fontSize: 16, fontWeight: '700', color: '#2C3E50', flex: 1 },
    distanceBadge:   { backgroundColor: '#EBF5FB', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
    distanceText:    { fontSize: 11, fontWeight: 'bold', color: '#1B4F72' },
    categoryTag: {
        fontSize: 10, color: '#1B4F72', fontWeight: '600', textTransform: 'uppercase',
        backgroundColor: '#EBF5FB', alignSelf: 'flex-start',
        paddingHorizontal: 8, paddingVertical: 2, borderRadius: 5, marginBottom: 10
    },
    divider:         { height: 1, backgroundColor: '#ECF0F1', marginVertical: 10 },
    detailRow:       { flexDirection: 'row', alignItems: 'flex-start', gap: 8, flex: 1 },
    detailText:      { fontSize: 13, color: '#566573' },
    cardFooter:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
    mapButton:       { backgroundColor: '#F4F6F8', padding: 10, borderRadius: 10 },
    emptyText:       { textAlign: 'center', marginTop: 100, color: '#999' },
    rifTag:          { fontSize: 10, color: '#8E44AD', fontWeight: '700', marginBottom: 2 },
    sectorTag:       { fontSize: 10, color: '#E67E22', fontWeight: '600', marginBottom: 4 },
    btnCensar: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: 6, marginTop: 12, backgroundColor: '#1B4F72',
        borderRadius: 10, paddingVertical: 10,
    },
    btnCensarText:   { color: '#fff', fontWeight: '800', fontSize: 13, letterSpacing: 0.5 },
    btnLocales: {
    backgroundColor: '#117A65', padding: 15, borderRadius: 12,
    flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8
},
});
