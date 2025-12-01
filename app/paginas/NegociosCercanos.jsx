import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, FlatList, TouchableOpacity, ActivityIndicator, Linking } from 'react-native';
import * as Location from 'expo-location';
import axios from 'axios';

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';
const RADIO_METERS = 750; // Buscamos en 750 metros (para evitar el error 504)
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const TAGS_COMERCIALES = "supermarket|bakery|butcher|clothes|hardware|bookstore|chemist";
const TAGS_SERVICIOS = "cafe|restaurant|bar|bank|pharmacy|post_office|hairdresser|atm|clinic";


export default function ListaNegocios() {
  const [location, setLocation] = useState(null);
  const [negocios, setNegocios] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => {
    obtenerUbicacionYNegocios();
  }, []);

  const buscarNegocios = async (lat, lon) => {
    
    const query = `
      [out:json][timeout:25];
      (
        // Búsqueda de tiendas (shop)
        node["shop"~"${TAGS_COMERCIALES}"](around:${RADIO_METERS},${lat},${lon});
        way["shop"~"${TAGS_COMERCIALES}"](around:${RADIO_METERS},${lat},${lon});
        relation["shop"~"${TAGS_COMERCIALES}"](around:${RADIO_METERS},${lat},${lon});
        
        // Búsqueda de servicios/lugares de interés (amenity)
        node["amenity"~"${TAGS_SERVICIOS}"](around:${RADIO_METERS},${lat},${lon});
        way["amenity"~"${TAGS_SERVICIOS}"](around:${RADIO_METERS},${lat},${lon});
        relation["amenity"~"${TAGS_SERVICIOS}"](around:${RADIO_METERS},${lat},${lon});
      );
      out center; 
    `;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            console.log(`Intentando consulta Overpass (Intento ${attempt}/${MAX_RETRIES})...`);      
            const response = await axios.post(OVERPASS_URL, query);
            const listaNegocios = response.data.elements.map(element => ({
                id: element.id,
                name: element.tags.name || element.tags.operator || "Negocio sin nombre", 
                type: element.tags.shop || element.tags.amenity || "Genérico",
                latitude: element.lat || element.center.lat, 
                longitude: element.lon || element.center.lon,
                address: element.tags["addr:street"] || "Dirección no disponible",
            }));
            
            return listaNegocios;

        } catch (error) {
            if (error.response && error.response.status === 504 && attempt < MAX_RETRIES) {
                console.warn(`Error 504 detectado. Reintentando en ${RETRY_DELAY_MS / 1000}s...`);
                await delay(RETRY_DELAY_MS);
                continue;
            }
            console.error(`Error final al consultar Overpass API: ${error.message}`);
            throw new Error(`Fallo la consulta de negocios después de ${attempt} intentos. Error: ${error.message}`);
        }
    }
    return []; 
  };


  const obtenerUbicacionYNegocios = async () => {
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      setErrorMsg('Permiso de ubicación denegado. Es necesario para buscar negocios cercanos.');
      setIsLoading(false);
      return;
    }

    let currentLocation = await Location.getCurrentPositionAsync({});
    const { latitude, longitude } = currentLocation.coords;
    setLocation({ latitude, longitude });

    try {
        const negociosEncontrados = await buscarNegocios(latitude, longitude);
        // Filtramos resultados sin coordenadas válidas por seguridad
        const negociosValidos = negociosEncontrados.filter(n => n.latitude && n.longitude);
        setNegocios(negociosValidos);
    } catch (e) {
        setErrorMsg(e.message); 
    }

    setIsLoading(false);
  };


  // --- 3. Lógica para Abrir Ubicación en Mapas Nativos ---
  const abrirUbicacionEnMapa = (lat, lon, name) => {
    // Usamos el esquema 'geo:' para la mejor compatibilidad en Android/iOS
    const url = `geo:${lat},${lon}?q=${lat},${lon}(${name})`;
    
    Linking.openURL(url).catch(err => {
        alert('No se pudo abrir la aplicación de mapas. Asegúrate de tener una instalada.');
        console.error('Error al abrir URL:', err);
    });
  };

  // --- 4. Renderizado (FlatList) ---
  const renderItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.negocioItem}
      onPress={() => abrirUbicacionEnMapa(item.latitude, item.longitude, item.name)}
    >
      <Text style={styles.name}>{item.name}</Text>
      <Text style={styles.address}>Tipo: **{item.type.toUpperCase()}**</Text>
      <Text style={styles.distance}>Toca para ver en el mapa 🗺️</Text>
    </TouchableOpacity>
  );
  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text>Buscando ubicación y negocios cercanos...</Text>
      </View>
    );
  }

  if (errorMsg || !location) {
    return <View style={styles.centered}><Text style={styles.errorText}>{errorMsg || 'No se pudo obtener la ubicación.'}</Text></View>;
  }
  
  if (negocios.length === 0) {
    return <View style={styles.centered}><Text>No se encontraron negocios en un radio de {RADIO_METERS/1000} km. 😔</Text></View>;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Negocios Cerca de Ti (Encontrados: {negocios.length})</Text>
      <FlatList
        data={negocios}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 50,
    backgroundColor: '#f5f5f5',
  },
  header: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
    color: '#333',
  },
  negocioItem: {
    padding: 15,
    marginVertical: 8,
    marginHorizontal: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderLeftWidth: 5,
    borderLeftColor: '#007AFF', // Resalta el item
    elevation: 2,
  },
  name: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  address: {
    fontSize: 14,
    color: '#555',
    marginTop: 4,
  },
  distance: {
    fontSize: 12,
    color: 'green',
    marginTop: 4,
    fontStyle: 'italic',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    color: 'red',
    textAlign: 'center',
  },
});