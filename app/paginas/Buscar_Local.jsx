import React, { useState } from 'react';
import {
    StyleSheet,
    Text,
    View,
    TextInput,
    FlatList,
    ActivityIndicator,
    Alert,
    TouchableOpacity
} from 'react-native';
import { useRouter } from 'expo-router';

import * as Location from 'expo-location';

// Asegúrate de que esta ruta sea correcta e incluye la función de la API para la ruta
import { searchLocales, postGenerarRuta } from '../api/api'; 

function BuscarLocal() {
    const router = useRouter(); 

    const [searchText, setSearchText] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false); // Estado para el botón de ruta

    const navigateToDetail = (ID) => {
        console.log("Navegando al detalle del local con ID:", ID);
        router.push(`/paginas/${ID}`); 
    };

    const handleSearch = async (text) => {
        setSearchText(text);
        if (text.length === 0) {
            setSearchResults([]);
            return;
        }
        setIsLoading(true);
        try {
            const results = await searchLocales(text);
            setSearchResults(results);
        } catch (error) {
            console.error("Error al buscar locales:", error);
            Alert.alert("Error de Búsqueda", error.message || "No se pudo realizar la búsqueda.");
            setSearchResults([]);
        } finally {
            setIsLoading(false);
        }
    };

    // --- NUEVA FUNCIÓN PARA EL BOTÓN ---
    const crearRutaOptima = async () => {
    if (searchResults.length === 0) return;

    setIsGenerating(true);
    try {
        const data = {
            id: 1, 
            ubicacion: searchText.trim(), // Limpia espacios
            lat: 7.767, 
            lon: -72.216
        };

        // 1. Llamamos a la API
        const response = await postGenerarRuta(data); 

        
        if (response && response.ok) {
            Alert.alert("¡Éxito!", "La ruta ha sido generada y guardada.");
        } else {
            // Aquí se mostrará "No se encontraron clientes" o "Ya tienes una ruta activa"
            const serverMessage = response?.message || "Error 404: Ruta no encontrada en el servidor";
            
            if (serverMessage.includes("Ya tienes una ruta creada")) {
                Alert.alert("Ruta Pendiente", serverMessage);
            } else {
                Alert.alert("Aviso", serverMessage);
            }
        }

    } catch (error) {
        // Solo errores de crash del JS del cliente
        console.log("Error crítico en frontend:", error);
        Alert.alert("Error", "Ocurrió un fallo en la aplicación.");
    } finally {
        setIsGenerating(false);
    }
};

    const renderLocalItem = ({ item }) => (
        <TouchableOpacity
            style={styles.itemContainer}
            onPress={() => navigateToDetail(item.ID_Clientes_Status)}
        >
            <Text style={styles.localName}>
                {item.nombre}
                <Text style={styles.ciRifText}> ({item.rif || 'S/R'})</Text>
            </Text>
            <Text style={styles.detailText}>Ubicacion: {item.Ubicacion_Clave}</Text>
            <Text style={styles.locationText}>Dirección: {item.Ubicacion}</Text>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Buscar por zona</Text>

            <TextInput
                style={styles.input}
                placeholder="nombre ubicación..."
                value={searchText}
                onChangeText={handleSearch}
            />

            {/* --- BOTÓN NUEVO: Solo se muestra si hay resultados --- */}
            {searchResults.length > 0 && !isLoading && (
    <View>
        {/* Texto que indica la cantidad de negocios */}
        <Text style={styles.countText}>
            📍 Se encontraron <Text style={{fontWeight: 'bold'}}>{searchResults.length}</Text> negocios en esta zona
        </Text>

        <TouchableOpacity 
            style={styles.btnRuta} 
            onPress={crearRutaOptima}
            disabled={isGenerating}
        >
            {isGenerating ? (
                <ActivityIndicator color="#fff" />
            ) : (
                <Text style={styles.btnRutaText}>🗺️ GENERAR RUTA ÓPTIMA</Text>
            )}
        </TouchableOpacity>
    </View>
)}

            {isLoading && (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color="#007AFF" />
                    <Text style={styles.loadingText}>Buscando...</Text>
                </View>
            )}

            {!isLoading && (
                <FlatList
                    data={searchResults}
                    keyExtractor={(item) => item.ID_Clientes_Status.toString()}
                    renderItem={renderLocalItem}
                    ListEmptyComponent={() => (
                        <Text style={styles.emptyText}>
                            {searchText.length > 0
                                ? "No se encontraron resultados para su búsqueda."
                                : "Empiece a escribir para buscar locales registrados."
                            }
                        </Text>
                    )}
                    contentContainerStyle={styles.listContent}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingTop: 50,
        backgroundColor: '#f8f8f8',
        paddingHorizontal: 15,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 20,
        textAlign: 'center',
        color: '#333',
    },countText: {
    fontSize: 16,
    color: '#444',
    textAlign: 'center',
    marginBottom: 10,
    backgroundColor: '#e3f2fd', 
    padding: 8,
    borderRadius: 5,
    overflow: 'hidden'
},
    input: {
        height: 50,
        borderColor: '#007AFF',
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: 15,
        marginBottom: 15,
        backgroundColor: '#fff',
        fontSize: 16,
    },
    // --- ESTILO DEL BOTÓN NUEVO ---
    btnRuta: {
        backgroundColor: '#28a745',
        padding: 15,
        borderRadius: 8,
        marginBottom: 15,
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'center'
    },
    btnRutaText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16
    },
    loadingContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 10,
    },
    loadingText: {
        marginLeft: 10,
        color: '#666',
    },
    listContent: {
        paddingBottom: 20,
    },
    itemContainer: {
        backgroundColor: '#ffffff',
        padding: 15,
        borderRadius: 10,
        marginBottom: 10,
        borderLeftWidth: 4,
        borderLeftColor: '#FF9500', 
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 1,
        elevation: 2,
    },
    localName: {
        fontSize: 18,
        fontWeight: '600',
        color: '#007AFF',
        marginBottom: 5,
    },
    ciRifText: {
        fontSize: 14,
        fontWeight: 'normal',
        color: '#555',
    },
    detailText: {
        fontSize: 14,
        color: '#555',
    },
    locationText: {
        fontSize: 12,
        color: '#888',
        marginTop: 5,
        fontStyle: 'italic',
    },
    emptyText: {
        fontSize: 16,
        color: '#888',
        textAlign: 'center',
        padding: 20,
        marginTop: 50,
    }
});
export default BuscarLocal;