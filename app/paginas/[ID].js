import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { useLocalSearchParams } from 'expo-router'; // 👈 Hook para obtener los parámetros de la URL
import { fetchLocalById } from '../../utils/db';

import MapView, { Marker } from 'react-native-maps';

function LocalDetail() {
    const { ID } = useLocalSearchParams();
    const [local, setLocal] = useState(null);
    const [isLoading, setIsLoading] = useState(true); 
    console.log("LocalDetail montado con ID:", ID);

    useEffect(() => {
        const loadLocal = async () => {
            if (!ID) {
                setIsLoading(false);
                return;
            }
            //console.log("LocalDetail montado con ID:", ID);
            try {
                // CAMBIAR GetLOcalById por fetchLocalById
                const data = await fetchLocalById(ID);
                setLocal(data);
                //console.log("Detalle cargado:  ", data);
            } catch (error) {
                console.error("Error al cargar detalle:", error);
                Alert.alert("Error", "No se pudo cargar el detalle del local.");
            } finally {
                setIsLoading(false);
            }
        };

        loadLocal();
    }, [ID]);
    if (isLoading) {
        return (
            <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color="#007AFF" />
                <Text style={styles.loadingText}>Cargando detalle...</Text>
            </View>
        );
    }

    if (!local) {
        return (
            <View style={styles.centerContainer}>
                <Text style={styles.errorText}>Local no encontrado.</Text>
            </View>
        );
    }

    // 3. Mostrar la información del local
    return (
        <ScrollView style={styles.container}>
            <Text style={styles.title}>{local.nombre_local}</Text>
            <Text style={styles.subtitle}>Detalles del Registro</Text>

            <View style={styles.detailCard}>
                <Text style={styles.label}>C.I. / RIF:</Text>
                <Text style={styles.value}>{local.ci_rif}</Text>
            </View>

            <View style={styles.detailCard}>
                <Text style={styles.label}>Tipo de Local:</Text>
                <Text style={styles.value}>{local.tipo_local}</Text>
            </View>

            <View style={styles.detailCard}>
                <Text style={styles.label}>Referencia de Ubicación:</Text>
                <Text style={styles.value}>{local.ubicacion_texto}</Text>
            </View>

            <Text style={styles.subtitle}>Coordenadas GPS</Text>

            <View style={styles.detailCard}>
                <Text style={styles.label}>Latitud:</Text>
                <Text style={styles.value}>{local.lat.toFixed(6)}</Text>
            </View>

            <View style={styles.detailCard}>
                <Text style={styles.label}>Longitud:</Text>
                <Text style={styles.value}>{local.lon.toFixed(6)}</Text>
            </View>

            {/* Aquí podrías agregar el MapView con el marcador */}
            <Text style={styles.subtitle}>Ubicación en el Mapa</Text>
            <MapView
                style={{ width: '100%', height: 300, marginBottom: 20 }}
                initialRegion={{
                    latitude: local.lat,
                    longitude: local.lon,
                    latitudeDelta: 0.01,
                    longitudeDelta: 0.01,
                }}
            >
                <Marker
                    coordinate={{ latitude: local.lat, longitude: local.lon }}
                    title={local.nombre_local}
                    description={local.ubicacion_texto}
                />
            </MapView>
        </ScrollView>
    );
}

// ... (Estilos del componente de detalle) ...

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
        backgroundColor: '#f9f9f9',
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center'
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        marginBottom: 10,
        color: '#007AFF',
    },
    subtitle: {
        fontSize: 20,
        fontWeight: '600',
        marginTop: 20,
        marginBottom: 10,
        paddingBottom: 5,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    detailCard: {
        backgroundColor: '#ffffff',
        padding: 15,
        borderRadius: 8,
        marginBottom: 10,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderLeftWidth: 4,
        borderLeftColor: '#4CD964',
    },
    label: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#555',
    },
    value: {
        fontSize: 16,
        color: '#333',
        maxWidth: '60%',
        textAlign: 'right'
    },
    loadingText: {
        marginTop: 10,
        color: '#666'
    },
    errorText: {
        fontSize: 18,
        color: 'red'
    }
});

export default LocalDetail;