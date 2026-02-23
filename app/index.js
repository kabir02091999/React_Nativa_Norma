import { StatusBar } from 'expo-status-bar';
import React, { useState, useCallback } from 'react'; 
import { 
    StyleSheet, 
    Text, 
    View, 
    FlatList, 
    ActivityIndicator, 
    Alert, 
    TouchableOpacity,
    Linking,
    TextInput,
    LayoutAnimation, 
    Platform,
    UIManager
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router'; 
import { fetchRutaVendedor, PostNuevaObservacion, DeleteRuta } from './api/api.js'; 
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function RutaDelDia() {
    const router = useRouter(); 
    const [clientesRuta, setClientesRuta] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSending, setIsSending] = useState(false); 
    const [expandedId, setExpandedId] = useState(null);
    const [motivo, setMotivo] = useState("");
    const [tipoReporte, setTipoReporte] = useState(""); // Para saber si es No Venta o No Visita
    const [infoUsuario, setInfoUsuario] = useState(null);

    const abrirMapa = (lat, lon) => {
        if (!lat || !lon) {
            Alert.alert("Error", "Este cliente no tiene coordenadas GPS registradas.");
            return;
        }
        const url = Platform.select({
            ios: `maps:0,0?q=${lat},${lon}`,
            android: `geo:0,0?q=${lat},${lon}`
        });
        Linking.openURL(url);
    };

    const toggleSeccion = (id, tipo) => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        if (expandedId === id && tipoReporte === tipo) {
            setExpandedId(null);
            setMotivo("");
            setTipoReporte("");
        } else {
            setExpandedId(id);
            setTipoReporte(tipo);
        }
    };

    const enviarMotivo = async (id_cliente) => {
        if (!motivo.trim()) {
            Alert.alert("Aviso", "Por favor escribe un motivo.");
            return;
        }
        
        setIsSending(true);
        try {
            // Enviamos el mensaje con el prefijo del tipo (NO VENTA o NO VISITADO)
            const observacionData = {
                id_cliente_status: id_cliente,
                mensaje: `${tipoReporte}: ${motivo}`
            };

            const resultObs = await PostNuevaObservacion(observacionData);

            if (resultObs && resultObs.success) {
                try {
                    await DeleteRuta(id_cliente); 
                    LayoutAnimation.configureNext(LayoutAnimation.Presets.spring);
                    Alert.alert("Éxito", "Reporte enviado y cliente removido.");
                    
                    setClientesRuta(prev => prev.filter(c => c.id_cliente !== id_cliente));
                    setExpandedId(null);
                    setMotivo("");
                    setTipoReporte("");
                } catch (errorDelete) {
                    Alert.alert("Aviso", "Se guardó el motivo, pero hubo un error al actualizar la ruta.");
                }
            } else {
                Alert.alert("Error", "No se pudo guardar la observación.");
            }
        } catch (error) {
            Alert.alert("Error", "Error de conexión.");
        } finally {
            setIsSending(false);
        }
    };

   const loadRuta = async () => {
        setIsLoading(true); 
        try {
            const userDataString = await SecureStore.getItemAsync('userData');
            const token = await SecureStore.getItemAsync('userToken');
            console.log("userDataString:", userDataString);
            if (!token || !userDataString) {
                router.replace('/login');
                return;
            }

            const userData = JSON.parse(userDataString);
            setInfoUsuario(userData);

            // Aquí se genera el error 401 si el token no sirve
            const response = await fetchRutaVendedor(userData.id);
            
            if (response.ok) {
                setClientesRuta(response.data);
            } else {
                setClientesRuta([]);
            }
        } catch (error) {
            console.log("Error detectado:", error.message);

            // --- LÓGICA DE EXPULSIÓN POR ERROR 401 ---
            if (error.response && error.response.status === 401) {
                console.log("Token vencido o inválido. Redirigiendo...");
                
                // 1. Borramos los datos para que no intente entrar de nuevo solo
                await SecureStore.deleteItemAsync('userToken');
                await SecureStore.deleteItemAsync('userData');

                // 2. Avisamos al usuario y mandamos al login
                Alert.alert("Sesión Expirada", "Tu sesión ha terminado. Por favor, ingresa de nuevo.");
                router.replace('/login');
            } else {
                // Si es otro error (como el 404 o red)
                setClientesRuta([]);
            }
        } finally {
            setIsLoading(false);
        }
    };

    useFocusEffect(useCallback(() => { loadRuta(); }, [])); 

    if (isLoading) {
        return (
            <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color="#007AFF" />
            </View>
        );
    }

    const renderClienteItem = ({ item, index }) => {
        const isExpanded = expandedId === item.id_cliente;

        return (
            <View style={[styles.itemContainer, isExpanded && styles.itemExpanded]}>
                <TouchableOpacity onPress={() => abrirMapa(item.Lat, item.Lon)}>
                    <View style={styles.headerCard}>
                        <View style={[styles.indexCircle, isExpanded && {backgroundColor: '#FF3B30'}]}>
                            <Text style={styles.indexText}>{index + 1}</Text>
                        </View>
                        <Text style={styles.localName} numberOfLines={1}>{item.nombre_cliente}</Text>
                    </View>

                    <View style={styles.infoRow}>
                        <Text style={styles.label}>RIF:</Text>
                        <Text style={styles.value}>{item.rif || 'J-00000000-0'}</Text>
                    </View>

                    {/* --- UBICACIÓN RESTAURADA --- */}
                    <View style={styles.direccionContainer}>
                        <Text style={styles.locationText} numberOfLines={2}>
                            📍 {item.Ubicacion || 'Sin ubicación registrada'}
                        </Text>
                    </View>
                </TouchableOpacity>

                <View style={styles.buttonRow}>
                    {!isExpanded ? ( 
                        <>
                            <TouchableOpacity style={styles.btnFactura} onPress={() => router.push(`/paginas/facturaCliente/${item.id_cliente}`)}>
                                <Text style={styles.btnFacturaText}>🛒 VENTA</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.btnPerfil} onPress={() => router.push(`/paginas/${item.id_cliente}`)}>
                                <Text style={styles.btnPerfilText}>👤 PERFIL</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.btnNoVenta} onPress={() => toggleSeccion(item.id_cliente, "NO VENTA")}>
                                <Text style={styles.btnNoVentaText}>📉 NO VENTA</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.btnNoVisitado} onPress={() => toggleSeccion(item.id_cliente, "NO VISITADO")}>
                                <Text style={styles.btnNoVisitadoText}>🚫 NO VISITA</Text>
                            </TouchableOpacity>
                        </>
                    ) : (
                        <TouchableOpacity style={styles.btnCancel} onPress={() => toggleSeccion(item.id_cliente, "")}>
                            <Text style={styles.btnCancelText}>VOLVER ATRÁS / CANCELAR</Text>
                        </TouchableOpacity>
                    )}
                </View>

                {isExpanded && (
                    <View style={styles.motivoContainer}>
                        <Text style={styles.motivoLabel}>Motivo de {tipoReporte}:</Text>
                        <TextInput
                            style={styles.inputMotivo}
                            placeholder="Escribe el motivo aquí..."
                            value={motivo}
                            onChangeText={setMotivo}
                            multiline
                            autoFocus={true}
                        />
                        <TouchableOpacity 
                            style={[styles.btnEnviarMotivo, isSending && { opacity: 0.6 }]}
                            onPress={() => enviarMotivo(item.id_cliente)}
                            disabled={isSending}
                        >
                            <Text style={styles.btnEnviarText}>ENVIAR Y ELIMINAR DE RUTA</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <View style={styles.topHeader}>
                <Text style={styles.headerTitle}>Mi Ruta del Día</Text>
                <Text style={styles.headerSubtitle}>Usuario: {infoUsuario ? infoUsuario.Nombre : 'Invitado'}</Text>
                <Text style={styles.headerSubtitle}>{clientesRuta.length} Pendientes</Text>
            </View>
            <FlatList
                data={clientesRuta}
                keyExtractor={(item) => item.id_cliente.toString()}
                renderItem={renderClienteItem}
                contentContainerStyle={styles.listContent}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    container: { flex: 1, backgroundColor: '#f4f6f8' },
    topHeader: { paddingTop: 60, paddingBottom: 20, backgroundColor: '#fff', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#e0e0e0' },
    headerTitle: { fontSize: 20, fontWeight: 'bold' },
    headerSubtitle: { fontSize: 13, color: '#666' },
    listContent: { paddingHorizontal: 12, paddingTop: 15 },
    itemContainer: { backgroundColor: '#fff', padding: 12, borderRadius: 10, marginBottom: 15, elevation: 2, borderLeftWidth: 5, borderLeftColor: '#007AFF' },
    itemExpanded: { borderLeftColor: '#FF3B30' },
    headerCard: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
    indexCircle: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#007AFF', justifyContent: 'center', alignItems: 'center', marginRight: 8 },
    indexText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
    localName: { fontSize: 16, fontWeight: 'bold', flex: 1 },
    infoRow: { flexDirection: 'row' },
    label: { fontSize: 12, color: '#888', width: 35 },
    value: { fontSize: 12, color: '#444' },
    buttonRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10, gap: 5 },
    btnFactura: { backgroundColor: '#eafaf1', paddingVertical: 8, borderRadius: 5, flex: 1, alignItems: 'center', borderWidth: 1, borderColor: '#2ECC71' },
    btnFacturaText: { color: '#27AE60', fontWeight: 'bold', fontSize: 10 },
    btnPerfil: { backgroundColor: '#f0f7ff', paddingVertical: 8, borderRadius: 5, flex: 1, alignItems: 'center', borderWidth: 1, borderColor: '#007AFF' },
    btnPerfilText: { color: '#007AFF', fontWeight: 'bold', fontSize: 10 },
    btnNoVenta: { backgroundColor: '#fff7e6', paddingVertical: 8, borderRadius: 5, flex: 1, alignItems: 'center', borderWidth: 1, borderColor: '#FF9500' },
    btnNoVentaText: { color: '#FF9500', fontWeight: 'bold', fontSize: 10 },
    btnNoVisitado: { backgroundColor: '#fff', paddingVertical: 8, borderRadius: 5, flex: 1.1, alignItems: 'center', borderWidth: 1, borderColor: '#FF3B30' },
    btnNoVisitadoText: { color: '#FF3B30', fontWeight: 'bold', fontSize: 10 },
    btnCancel: { backgroundColor: '#666', paddingVertical: 10, borderRadius: 5, flex: 1, alignItems: 'center' },
    btnCancelText: { color: '#fff', fontWeight: 'bold', fontSize: 12 },
    motivoContainer: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#eee' },
    motivoLabel: { fontSize: 12, fontWeight: 'bold', marginBottom: 5 },
    inputMotivo: { backgroundColor: '#f9f9f9', borderRadius: 5, padding: 8, height: 60, textAlignVertical: 'top', borderWidth: 1, borderColor: '#ddd' },
    btnEnviarMotivo: { backgroundColor: '#FF3B30', marginTop: 10, paddingVertical: 12, borderRadius: 5, alignItems: 'center' },
    btnEnviarText: { color: '#fff', fontWeight: 'bold' },
});