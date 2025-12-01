import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Alert, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { fetchLocalById } from '../../utils/db';

function LocalDetail() {
    const { ID } = useLocalSearchParams();
    const [local, setLocal] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const loadLocal = async () => {
            if (!ID) {
                setIsLoading(false);
                return;
            }
            try {
                const data = await fetchLocalById(ID);
                setLocal(data);
            } catch (error) {
                console.error("Error al cargar detalle:", error);
                Alert.alert("Error", "No se pudo cargar el detalle del local.");
            } finally {
                setIsLoading(false);
            }
        };
        loadLocal();
    }, [ID]);

    // Función para abrir Google Maps
    const abrirGoogleMaps = () => {
        if (!local) return;
        
        // Crea el link para Google Maps
        const url = `https://www.google.com/maps/search/?api=1&query=${local.lat},${local.lon}`;
        
        Linking.openURL(url).catch(err => {
            Alert.alert('Error', 'No se pudo abrir Google Maps');
        });
    };

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
                <Text style={styles.value}>{local.lat?.toFixed(6)}</Text>
            </View>

            <View style={styles.detailCard}>
                <Text style={styles.label}>Longitud:</Text>
                <Text style={styles.value}>{local.lon?.toFixed(6)}</Text>
            </View>

            <Text style={styles.subtitle}>Ver Ubicación</Text>
            
            {/* BOTÓN PARA ABRIR GOOGLE MAPS */}
            <TouchableOpacity style={styles.mapButton} onPress={abrirGoogleMaps}>
                <Text style={styles.mapButtonText}>📍 ABRIR EN GOOGLE MAPS</Text>
                <Text style={styles.mapButtonSubtext}>
                    Se abrirá la aplicación de Google Maps en tu celular
                </Text>
            </TouchableOpacity>
            
        </ScrollView>
    );
}

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
    },
    mapButton: {
        backgroundColor: '#4285F4', // Color de Google
        padding: 20,
        borderRadius: 12,
        marginBottom: 20,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 3,
    },
    mapButtonText: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
        textAlign: 'center',
    },
    mapButtonSubtext: {
        color: 'white',
        fontSize: 12,
        marginTop: 5,
        textAlign: 'center',
        opacity: 0.8,
    },
    instructions: {
        backgroundColor: '#FFF3CD',
        padding: 15,
        borderRadius: 8,
        borderLeftWidth: 4,
        borderLeftColor: '#FFC107',
    },
    instructionsTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#856404',
        marginBottom: 5,
    },
    instructionsText: {
        fontSize: 14,
        color: '#856404',
        lineHeight: 20,
    }
});

export default LocalDetail;