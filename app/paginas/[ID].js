import React, { useEffect, useState, useCallback } from 'react';
import { 
    View, 
    Text, 
    StyleSheet, 
    ActivityIndicator, 
    Alert, 
    ScrollView, 
    TouchableOpacity, 
    Linking 
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
               
import { getUbicacionClienteById, GetFacturasPorLocal } from '../../app/api/api.js'; 

function LocalDetail() {
    const { ID } = useLocalSearchParams();
    const router = useRouter();
    const [local, setLocal] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const loadData = async () => {
            if (!ID) return;
            try {
                setIsLoading(true);
                
                const data = await getUbicacionClienteById(ID);
                //console.log(data)
                if (data) {
                    setLocal(data);
                } else {
                    Alert.alert("Aviso", "No se encontró información detallada de este cliente.");
                }

            } catch (error) {
                console.error("Error al cargar detalle:", error);
                Alert.alert("Error", "Problema de conexión con el servidor.");
            } finally {
                setIsLoading(false);
            }
        };

        
        loadData();
    }, [ID]);

    const abrirGoogleMaps = () => {
        // Validamos con los nombres de tu JSON: Lat y Lon
        if (!local?.Lat || !local?.Lon) {
            Alert.alert("Ups", "Este cliente no tiene coordenadas GPS registradas.");
            return;
        }
        
        const url = `https://www.google.com/maps/search/?api=1&query=${local.Lat},${local.Lon}`;
        Linking.openURL(url).catch(() => {
            Alert.alert("Error", "No se pudo abrir Google Maps");
        });
    };

    if (isLoading) return (
        <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={{marginTop: 10}}>Cargando perfil del cliente...</Text>
        </View>
    );

    if (!local) return (
        <View style={styles.centerContainer}>
            <Text>No se pudo cargar la información.</Text>
        </View>
    );

    return (
        <ScrollView style={styles.container}>
            {/* TÍTULO PRINCIPAL */}
            <View style={styles.header}>
                <Text style={styles.title}>{local.nombre}</Text>
                <Text style={styles.idText}>ID Cliente: #{local.ID_Clientes_Status}</Text>
            </View>
            
            <View style={styles.infoSection}>
                <Text style={styles.subtitle}>Datos del Cliente</Text>
                
                <View style={styles.card}>
                    <View style={styles.row}>
                        <Text style={styles.label}>RIF:</Text>
                        <Text style={styles.value}>{local.rif || 'No registrado'}</Text>
                    </View>
                    <View style={styles.divider} />
                    <View style={styles.row}>
                        <Text style={styles.label}>Tipo:</Text>
                        <Text style={styles.value}>{local.tipo || 'No registrado'}</Text>
                    </View>
                    <View style={styles.divider} />
                    <View style={styles.row}>
                        <Text style={styles.label}>Teléfono:</Text>
                        <Text style={styles.value}>{local.telefono || 'Sin teléfono'}</Text>
                    </View>
                    <View style={styles.divider} />
                    <View style={styles.row}>
                        <Text style={styles.label}>Estatus:</Text>
                        <Text style={[styles.value, { color: local.status === 1 ? '#28a745' : '#dc3545', fontWeight: 'bold' }]}>
                            {local.status === 1 ? 'Cliente' : 'Cliente Potencial'}
                        </Text>
                    </View>
                </View>

                <Text style={styles.subtitle}>Ubicación Geográfica</Text>
                <View style={[styles.card, { borderLeftColor: '#4285F4', borderLeftWidth: 5 }]}>
                    <Text style={styles.ubicacionClave}>{local.Ubicacion_Clave}</Text>
                    <Text style={styles.direccionTexto}>{local.Ubicacion}</Text>
                    <Text style={styles.coordenadas}>GPS: {local.Lat}, {local.Lon}</Text>
                </View>
            </View>

            {/* BOTONES */}
            <TouchableOpacity style={styles.btnMap} onPress={abrirGoogleMaps}>
                <Text style={styles.btnText}>📍 ABRIR EN GOOGLE MAPS</Text>
            </TouchableOpacity>

            <TouchableOpacity 
                style={styles.btnFactura} 
                onPress={() => router.push(`/paginas/facturaCliente/${local.ID_Clientes_Status}`)}
            >
                <Text style={styles.btnText}>🛒 GENERAR PEDIDO / FACTURA</Text>
            </TouchableOpacity>

            <View style={{ height: 40 }} />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F4F6F8', padding: 15 },
    centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: { marginBottom: 20, paddingHorizontal: 5 },
    title: { fontSize: 22, fontWeight: 'bold', color: '#1A1A1A' },
    idText: { fontSize: 14, color: '#666' },
    infoSection: { marginBottom: 20 },
    subtitle: { fontSize: 16, fontWeight: 'bold', color: '#555', marginBottom: 10, marginTop: 10 },
    card: { 
        backgroundColor: '#FFF', 
        padding: 15, 
        borderRadius: 12, 
        elevation: 2, 
        shadowColor: '#000', 
        shadowOpacity: 0.1, 
        shadowRadius: 4,
        marginBottom: 10 
    },
    row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 },
    label: { fontSize: 15, color: '#888' },
    value: { fontSize: 15, fontWeight: '500', color: '#333' },
    divider: { height: 1, backgroundColor: '#EEE', width: '100%' },
    ubicacionClave: { fontSize: 17, fontWeight: 'bold', color: '#4285F4', marginBottom: 5 },
    direccionTexto: { fontSize: 14, color: '#444', lineHeight: 20 },
    coordenadas: { fontSize: 12, color: '#999', marginTop: 10, fontStyle: 'italic' },
    btnMap: { 
        backgroundColor: '#4285F4', 
        padding: 18, 
        borderRadius: 12, 
        alignItems: 'center', 
        marginBottom: 12 
    },
    btnFactura: { 
        backgroundColor: '#28a745', 
        padding: 18, 
        borderRadius: 12, 
        alignItems: 'center' 
    },
    btnText: { color: '#FFF', fontWeight: 'bold', fontSize: 15 }
});

export default LocalDetail;