import { StatusBar } from 'expo-status-bar';
import React, { useState, useEffect, useCallback } from 'react'; 
import { 
    StyleSheet, 
    Text, 
    View, 
    FlatList, 
    ActivityIndicator, 
    Alert, 
    Linking, // Importar Linking para abrir URLs
    TouchableOpacity //Importar TouchableOpacity para hacer las tarjetas clickeables
} from 'react-native';
import { useFocusEffect } from 'expo-router'; 

// Importar la función de lectura de la BD
import { fetchLocales, clearLocal } from '../utils/db'; 

export default function index() {
  const [locales, setLocales] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const openMap = (lat, lon, nombre) => {

      const url = `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`;
      
      Linking.openURL(url).catch(err => {
          console.error('Error al intentar abrir el mapa:', err);
          Alert.alert("Error", "No se pudo abrir la aplicación de mapas.");
      });
  };

  useFocusEffect(
    useCallback(() => {
      const loadLocales = async () => {
        setIsLoading(true); 
        try {
          const data = await fetchLocales();
          setLocales(data);
        } catch (error) {
          console.error("Error al cargar locales:", error);
          Alert.alert("Error de BD", "No se pudieron cargar los datos de los locales.");
        } finally {
          setIsLoading(false);
        }
      };

      loadLocales();
      
    }, []) 
  ); 

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={{ marginTop: 10 }}>Cargando locales...</Text>
      </View>
    );
  }

  const renderLocalItem = ({ item }) => (
      <TouchableOpacity 
          style={styles.itemContainer}
          onPress={() => openMap(item.lat, item.lon, item.nombre_local)}
      >
          <Text style={styles.localName}>{item.nombre_local}</Text>
          <Text style={styles.detailText}>C.I./R.I.F.: {item.ci_rif}</Text>
          <Text style={styles.detailText}>Tipo: {item.tipo_local} {item.id}</Text>
          <Text style={styles.locationText}>
            Ubicación GPS: Lat: {item.lat.toFixed(4)}, Lon: {item.lon.toFixed(4)}
          </Text>
          
      </TouchableOpacity>
  );
  return (
    <View style={styles.container}>
      <Text style={styles.header}>Lista de Locales Registrados ({locales.length})</Text>
      <FlatList
        data={locales}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderLocalItem}
        ListEmptyComponent={() => (
          <View style={styles.listEmpty}>
            <Text style={styles.emptyText}>¡No hay locales registrados! Ve a "New Client" para empezar.</Text>
          </View>
        )}
        contentContainerStyle={locales.length === 0 ? styles.listEmptyContainer : styles.listContent}
      />
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center',
  },
  container: {
    flex: 1,
    paddingTop: 50,
    backgroundColor: '#f8f8f8',
  },
  header: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginVertical: 10,
    color: '#333',
  },
  listContent: {
    paddingHorizontal: 15,
    paddingBottom: 20,
  },
  listEmptyContainer: {
    flex: 1, // Para ocupar todo el espacio
    justifyContent: 'center',
    alignItems: 'center',
  },
  listEmpty: {
    // Si la lista está vacía, no queremos que ocupe todo el espacio.
    // Usamos listEmptyContainer en contentContainerStyle para centrar el mensaje.
  },
  itemContainer: {
    backgroundColor: '#ffffff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    borderLeftWidth: 5,
    borderLeftColor: '#007AFF',
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
  }
});