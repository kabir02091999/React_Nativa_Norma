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
import { useRouter } from 'expo-router'; // 👈 IMPORTAR useRouter

import { searchLocales } from '../../utils/db'; 

function BuscarLocal() {
    // Inicializar el router
    const router = useRouter(); // 👈 Inicializar el router

    const [searchText, setSearchText] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    
    // Función de navegación que usa el ID del local
    const navigateToDetail = (ID) => {
        // Navega a la ruta dinámica: /paginas/detalle/123
        // Asumiendo que tu archivo de detalle se llama [localId].js o similar
        console.log("Navegando al detalle del local con ID:", ID);
        router.push(`/paginas/${ID}`); // 👈 Usa router.push para navegar
    };

    // Función central para manejar la lógica de búsqueda
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
    
    const renderLocalItem = ({ item }) => (
        // Llama a la nueva función de navegación con el ID del ítem
        <TouchableOpacity 
            style={styles.itemContainer}
            onPress={() => navigateToDetail(item.id)} // 👈 Pasar el ID del local
        >
            <Text style={styles.localName}>
                {item.nombre_local} 
                <Text style={styles.ciRifText}> ({item.ci_rif})</Text>
            </Text>
            <Text style={styles.detailText}>Tipo: {item.tipo_local}</Text>
            <Text style={styles.locationText}>Ubicación: {item.ubicacion_texto}</Text>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Buscar Locales</Text>
            
            
            
            <TextInput
                style={styles.input}
                placeholder="nombre ubicación..."
                value={searchText}
                onChangeText={handleSearch} 
            />

            {isLoading && (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color="#007AFF" />
                    <Text style={styles.loadingText}>Buscando...</Text>
                </View>
            )}

            {!isLoading && (
                <FlatList
                    data={searchResults}
                    keyExtractor={(item) => item.id.toString()}
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
        borderLeftColor: '#FF9500', // Color para diferenciar de la lista principal
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


