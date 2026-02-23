/* import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ActivityIndicator, 
  Alert, 
  FlatList, 
  TouchableOpacity,
  Linking // 👈 Importante para abrir Google Maps
} from 'react-native';
import * as Location from 'expo-location';


const GOOGLE_MAPS_API_KEY = process.env.EXPO_PUBLIC_API_KEY_GOOGLE; 

const SEARCH_RADIUS = 1000; 

const PlaceCard = ({ place }) => {
  
  const openMapForPlace = () => {
    // ✅ Formato correcto para abrir Google Maps usando el Place ID:
    // La URL de búsqueda de Google Maps (maps.google.com) acepta el Place ID.
    //const url = `http://maps.google.com/?q=place_id:${place.place_id}`;
    
    // Si quieres un formato más simple solo con coordenadas, puedes usar:
    const url = `http://maps.google.com/?q=${place.geometry.location.lat},${place.geometry.location.lng}`;
    
    Linking.openURL(url).catch(err => {
      Alert.alert("Error", "No se pudo abrir Google Maps. Asegúrate de tener la aplicación o un navegador.");
      console.error('An error occurred', err);
    });
  };

  return (
    <TouchableOpacity style={styles.card} onPress={openMapForPlace}>
      <Text style={styles.cardTitle}>{place.name}</Text>
      <Text style={styles.cardAddress}>{place.vicinity}</Text>
      {
        place.rating && (
          <Text style={styles.cardRating}>
            ⭐ {place.rating} ({place.user_ratings_total} {place.user_ratings_total === 1 ? 'reseña' : 'reseñas'})
          </Text>
        )
      }
      <Text style={styles.cardAction}>Toca para ver en Google Maps →</Text>
    </TouchableOpacity>
  );
};


export default function NearbyPlacesCardSearch() {
  const [location, setLocation] = useState(null);
  const [places, setPlaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);

  // --- Lógica de Ubicación ---
  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMsg('Permiso de acceso a la ubicación denegado. No se puede buscar negocios.');
        setLoading(false);
        return;
      }

      let currentLocation = await Location.getCurrentPositionAsync({});
      setLocation(currentLocation);
    })();
  }, []);

  // --- Lógica de la API de Places ---
  useEffect(() => {
    //console.log("Ubicación obtenida: ", GOOGLE_MAPS_API_KEY + " - " + JSON.stringify(location));
    if (location && GOOGLE_MAPS_API_KEY) {
      fetchNearbyPlaces(location.coords.latitude, location.coords.longitude);
    } else if (location && !GOOGLE_MAPS_API_KEY) {
      setErrorMsg('Error de configuración: Clave API no disponible. Verifica tu archivo .env.');
      setLoading(false);
    }
  }, [location]);

  const fetchNearbyPlaces = async (latitude, longitude) => {
    setLoading(true);
    setErrorMsg(null);
    
    const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${latitude},${longitude}&radius=${SEARCH_RADIUS}&type=store&key=${GOOGLE_MAPS_API_KEY}`;

    try {
      const response = await fetch(url);
      const data = await response.json();

      if (data.status === 'OK') {
        setPlaces(data.results);
      } else {
        setErrorMsg(`Error de Google Maps API: ${data.status}`);
        Alert.alert("Error de API", `Estatus: ${data.status}. Por favor, verifica tu clave y que la API de Places esté habilitada.`);
      }
    } catch (error) {
      console.error('Error fetching places:', error);
      setErrorMsg('Error de conexión. Verifica tu conexión a internet.');
    } finally {
      setLoading(false);
    }
  };


  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Obteniendo ubicación y buscando negocios...</Text>
      </View>
    );
  }

  if (errorMsg) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>{errorMsg}</Text>
      </View>
    );
  }
  
  return (
    <View style={styles.container}>
      <Text style={styles.headerText}>Negocios Cercanos (1 km)</Text>
      {places.length === 0 ? (
        <Text style={styles.noResultsText}>No se encontraron negocios a 1 km de tu ubicación.</Text>
      ) : (
        <FlatList
          data={places}
          keyExtractor={(item) => item.place_id}
          renderItem={({ item }) => <PlaceCard place={item} />}
          contentContainerStyle={styles.listContainer}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 50,
    backgroundColor: '#f5f5f5',
  },
  headerText: {
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
    color: '#333',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
  },
  errorText: {
    color: 'red',
    fontSize: 16,
    textAlign: 'center',
    padding: 20,
  },
  noResultsText: {
    textAlign: 'center',
    marginTop: 20,
    fontSize: 16,
    color: '#888',
  },
  listContainer: {
    paddingHorizontal: 10,
    paddingBottom: 20,
  },
  card: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    elevation: 2, // Sombra para Android
    shadowColor: '#000', // Sombra para iOS
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 3,
  },
  cardAddress: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  cardRating: {
    fontSize: 14,
    color: '#FFD700', // Color dorado para estrellas
    marginBottom: 5,
  },
  cardAction: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#007AFF', // Azul típico de enlace/acción
    marginTop: 5,
  }
}); */



//ojo aqui
/* 
import React, { useState } from 'react';
import { 
    View, 
    Text, 
    StyleSheet, 
    ActivityIndicator, 
    Alert, 
    TextInput, 
    TouchableOpacity,
    Keyboard,
    Dimensions, // Para obtener el ancho y alto de la pantalla
    Linking 
} from 'react-native';
import MapView, { Marker } from 'react-native-maps'; // 👈 Importamos MapView y Marker

const { width, height } = Dimensions.get('window'); // Obtener dimensiones
const ASPECT_RATIO = width / height;
const LATITUDE_DELTA = 0.0922; // Nivel de zoom inicial para la vista del mapa
const LONGITUDE_DELTA = LATITUDE_DELTA * ASPECT_RATIO;

const GOOGLE_MAPS_API_KEY = process.env.EXPO_PUBLIC_API_KEY_GOOGLE; 
const SEARCH_RADIUS = 1000; // 1 km

export default function BusinessMapCroquis() {
    const [address, setAddress] = useState(''); 
    const [keyword, setKeyword] = useState('tienda'); 
    
    const [mapRegion, setMapRegion] = useState(null); // 👈 Estado para la región del mapa
    const [places, setPlaces] = useState([]); // 👈 Lugares encontrados para marcadores
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState(null);

    // --- PASO 1: Convertir Dirección a Coordenadas (Geocoding API) ---
    const getCoordinatesFromAddress = async (addressText) => {
        const encodedAddress = encodeURIComponent(addressText);
        const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&key=${GOOGLE_MAPS_API_KEY}`;
        
        const response = await fetch(geocodeUrl);
        const data = await response.json();
        
        if (data.status === 'OK' && data.results.length > 0) {
            return data.results[0].geometry.location;
        } else {
            return null;
        }
    };
    
    // --- PASO 2: Buscar Negocios Cercanos (Nearby Search API) ---
    const fetchNearbyPlaces = async (latitude, longitude) => {
        const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${latitude},${longitude}&radius=${SEARCH_RADIUS}&keyword=${keyword}&key=${GOOGLE_MAPS_API_KEY}`;

        const response = await fetch(url);
        const data = await response.json();

        if (data.status === 'OK') {
            return data.results;
        } else if (data.status === 'ZERO_RESULTS') {
            return [];
        } else {
             throw new Error(`Error de Google Maps API: ${data.status}`);
        }
    };

    // --- Función Principal: Ejecuta la búsqueda completa ---
    const handleSearch = async () => {
        if (!address.trim() || !keyword.trim()) {
            Alert.alert("Faltan datos", "Por favor, introduce una zona y un tipo de negocio.");
            return;
        }
        if (!GOOGLE_MAPS_API_KEY) {
             setErrorMsg('Error de configuración: Clave API no disponible.');
             return;
        }
        
        Keyboard.dismiss(); 
        setLoading(true);
        setErrorMsg(null);
        setPlaces([]); // Limpiar lugares anteriores
        setMapRegion(null); // Limpiar región del mapa anterior

        try {
            // 1. Obtener coordenadas de la dirección
            const locationCoords = await getCoordinatesFromAddress(address);
            
            if (!locationCoords) {
                Alert.alert("Ubicación no encontrada", `No se pudieron obtener coordenadas válidas para: "${address}".`);
                setLoading(false);
                return;
            }

            // 2. Establecer la región inicial del mapa en la ubicación de la dirección
            setMapRegion({
                latitude: locationCoords.lat,
                longitude: locationCoords.lng,
                latitudeDelta: LATITUDE_DELTA,
                longitudeDelta: LONGITUDE_DELTA,
            });
            
            // 3. Buscar negocios cercanos
            const results = await fetchNearbyPlaces(locationCoords.lat, locationCoords.lng);
            setPlaces(results); // Guardar los lugares para los marcadores
            
            if (results.length === 0) {
                 Alert.alert("Sin Resultados", `No se encontraron negocios tipo '${keyword}' cerca de "${address}" (radio ${SEARCH_RADIUS/1000} km).`);
            }

        } catch (error) {
            console.error('Error durante la búsqueda:', error);
            setErrorMsg(error.message || 'Error de conexión o API.');
        } finally {
            setLoading(false);
        }
    };


    return (
        <View style={styles.container}>
            <Text style={styles.headerText}>🗺️ Croquis</Text>
            
            <View style={styles.inputGroup}>
                 <Text style={styles.label}>Zona/Dirección (Ej: Caracas, Chacao)</Text>
                 <TextInput
                    style={styles.input}
                    placeholder="Escribe una ciudad, zona o dirección"
                    value={address}
                    onChangeText={setAddress}
                 />

                 <Text style={styles.label}>Tipo de Negocio (Ej: panadería)</Text>
                 <TextInput
                    style={styles.input}
                    placeholder="Palabra clave (tienda, farmacia, etc.)"
                    value={keyword}
                    onChangeText={setKeyword}
                 />
                 
                 <TouchableOpacity 
                    style={styles.searchButton}
                    onPress={handleSearch}
                    disabled={loading}
                 >
                    <Text style={styles.searchButtonText}>
                        {loading ? "Buscando..." : `Ver Croquis (${SEARCH_RADIUS/1000} km)`}
                    </Text>
                 </TouchableOpacity>
            </View>
            
            {loading && (
                <View style={styles.loadingOverlay}>
                    <ActivityIndicator size="large" color="#007AFF" />
                    <Text style={styles.loadingText}>Obteniendo coordenadas y buscando negocios...</Text>
                </View>
            )}

            {errorMsg && <Text style={styles.errorText}>{errorMsg}</Text>}

            {mapRegion ? (
                <MapView
                    style={styles.map}
                    region={mapRegion}
                    showsUserLocation={true} // Mostrar la ubicación actual del usuario (si hay permiso)
                    onRegionChangeComplete={setMapRegion} // Opcional: actualizar la región si el usuario se mueve
                >
                    
                    <Marker
                        coordinate={{ 
                            latitude: mapRegion.latitude, 
                            longitude: mapRegion.longitude 
                        }}
                        title={address}
                        description={`Zona buscada: ${keyword}`}
                        pinColor="blue" // Color diferente para la zona
                    />

                    
                    {places.map(place => (
                        <Marker
                            key={place.place_id}
                            coordinate={{
                                latitude: place.geometry.location.lat,
                                longitude: place.geometry.location.lng,
                            }}
                            title={place.name}
                            description={place.vicinity}
                            onCalloutPress={() => Linking.openURL(`https://www.google.com/maps/search/?api=1&query_place_id=$3${place.geometry.location.lat},${place.geometry.location.lng}`)}
                        />
                    ))}
                </MapView>
            ) : (
                <View style={styles.placeholderMap}>
                    <Text style={styles.placeholderText}>Escribe una zona y un tipo de negocio para ver el croquis.</Text>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingTop: 50,
        backgroundColor: '#f5f5f5',
    },
    loadingOverlay: {
         position: 'absolute',
         top: 0,
         left: 0,
         right: 0,
         bottom: 0,
         backgroundColor: 'rgba(255,255,255,0.8)',
         justifyContent: 'center',
         alignItems: 'center',
         zIndex: 10,
    },
    loadingText: {
        marginTop: 10,
        color: '#666',
    },
    headerText: {
        fontSize: 22,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 10,
        color: '#333',
    },
    inputGroup: {
        paddingHorizontal: 20,
        marginBottom: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#ddd',
        paddingBottom: 15,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        marginTop: 10,
        color: '#555',
    },
    input: {
        height: 45,
        borderColor: '#ccc',
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: 10,
        marginBottom: 5,
        backgroundColor: '#fff',
    },
    searchButton: {
        backgroundColor: '#007AFF',
        padding: 15,
        borderRadius: 8,
        marginTop: 10,
        alignItems: 'center',
    },
    searchButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
    errorText: {
        color: 'red',
        fontSize: 14,
        textAlign: 'center',
        paddingHorizontal: 20,
        marginBottom: 10,
    },
    map: { // Estilo fundamental para el mapa
        flex: 1, // Esto hace que el mapa ocupe el espacio restante
        marginHorizontal: 10,
        marginBottom: 10,
        borderRadius: 8,
        overflow: 'hidden', // Asegura que el borde redondeado se vea bien
    },
    placeholderMap: { // Estilo para cuando no hay mapa
        flex: 1,
        marginHorizontal: 10,
        marginBottom: 10,
        borderRadius: 8,
        backgroundColor: '#e0e0e0',
        justifyContent: 'center',
        alignItems: 'center',
    },
    placeholderText: {
        fontSize: 16,
        color: '#777',
        textAlign: 'center',
        padding: 20,
    }
}); */

import React, { useState } from 'react';
import { 
    View, 
    Text, 
    StyleSheet, 
    ActivityIndicator, 
    Alert, 
    TextInput, 
    TouchableOpacity,
    Keyboard,
    Linking,
    FlatList // Usamos FlatList para la lista de tarjetas
} from 'react-native';


const GOOGLE_MAPS_API_KEY = process.env.EXPO_PUBLIC_API_KEY_GOOGLE; 
const SEARCH_RADIUS = 1000; // 1 km (radio de búsqueda)

const fetchPlaceDetails = async (placeId) => {
    // Definimos los campos que queremos, incluyendo el número de teléfono
    const fields = 'name,vicinity,rating,user_ratings_total,geometry,formatted_address,formatted_phone_number,website,opening_hours';
    
    const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=${fields}&key=${GOOGLE_MAPS_API_KEY}`;

    try {
        const response = await fetch(detailsUrl);
        const data = await response.json();

        if (data.status === 'OK' && data.result) {
            return data.result;
        } else {
            // Si falla la búsqueda de detalles, retornamos null
            return null; 
        }
    } catch (error) {
        return null;
    }
};


const BusinessCard = ({ place }) => {
    
    // Desestructuramos todos los campos necesarios, incluyendo los de la llamada de detalles
    const { 
        name, 
        vicinity, 
        formatted_address,
        formatted_phone_number, 
        website, 
        rating, 
        user_ratings_total, 
        geometry 
    } = place;

    const openMapForPlace = () => {
       if (!geometry || !geometry.location) {
             Alert.alert("Error", "Coordenadas no disponibles para este negocio.");
             return;
        }
        
        const { lat, lng } = geometry.location;
        
        // ✅ CORRECCIÓN: Usar el formato estándar para coordenadas de Google Maps
        const url = `http://maps.google.com/maps?q=${lat},${lng}`;
        
        Linking.openURL(url).catch(err => {
            Alert.alert("Error", "No se pudo abrir Google Maps. Asegúrate de tener la aplicación o un navegador.");
            console.error('Error al abrir Maps:', err);
        });
    };

    return (
        <View style={cardStyles.container}>
            <Text style={cardStyles.title}>{name}</Text>
            
            <View style={cardStyles.row}>
                <Text style={cardStyles.label}>Dirección:</Text>
                <Text style={cardStyles.value}>{formatted_address || vicinity || 'No disponible'}</Text>
            </View>
            
            {/* Teléfono */}
            {formatted_phone_number && (
                <View style={cardStyles.row}>
                    <Text style={cardStyles.label}>Teléfono:</Text>
                    <TouchableOpacity onPress={() => Linking.openURL(`tel:${formatted_phone_number}`)}>
                        <Text style={cardStyles.phoneValue}>
                            {formatted_phone_number}
                        </Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* Sitio Web */}
            {website && (
                <View style={cardStyles.row}>
                    <Text style={cardStyles.label}>Sitio Web:</Text>
                    <TouchableOpacity onPress={() => Linking.openURL(website)}>
                        <Text style={cardStyles.linkValue}>
                            {website.length > 30 ? 'Ver sitio web' : website}
                        </Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* Calificación */}
            {(rating || user_ratings_total) && (
                <View style={cardStyles.row}>
                    <Text style={cardStyles.label}>Calificación:</Text>
                    <Text style={cardStyles.value}>
                        {rating ? `⭐ ${rating}` : 'Sin calificar'} 
                        {user_ratings_total ? ` (${user_ratings_total} reseñas)` : ''}
                    </Text>
                </View>
            )}
            
            {/* Botón de Google Maps */}
            <TouchableOpacity style={cardStyles.mapButton} onPress={openMapForPlace}>
                <Text style={cardStyles.mapButtonText}>📍 Ir a Ubicación en Google Maps</Text>
            </TouchableOpacity>

        </View>
    );
};

// ----------------------------------------------------------------
// Componente Principal: CardListBusinessSearch
// ----------------------------------------------------------------
export default function CardListBusinessSearch() {
    const [address, setAddress] = useState(''); 
    const [keyword, setKeyword] = useState(''); 
    
    const [businesses, setBusinesses] = useState([]); // Lista final de negocios con detalles
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState(null);

    // --- FUNCIÓN DE API: Convertir Dirección a Coordenadas (Geocoding API) ---
    const getCoordinatesFromAddress = async (addressText) => {
        const encodedAddress = encodeURIComponent(addressText);
        const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&key=${GOOGLE_MAPS_API_KEY}`;
        
        const response = await fetch(geocodeUrl);
        const data = await response.json();
        
        if (data.status === 'OK' && data.results.length > 0) {
            return data.results[0].geometry.location;
        } else {
            return null;
        }
    };
    
    // --- FUNCIÓN DE API: Buscar Negocios Cercanos (Nearby Search API) ---
    const fetchNearbyPlaces = async (latitude, longitude) => {
        const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${latitude},${longitude}&radius=${SEARCH_RADIUS}&keyword=${keyword}&key=${GOOGLE_MAPS_API_KEY}`;

        const response = await fetch(url);
        const data = await response.json();

        if (data.status === 'OK') {
            return data.results;
        } else if (data.status === 'ZERO_RESULTS') {
            return [];
        } else {
             throw new Error(`Error de Google Maps API: ${data.status}`);
        }
    };

    // --- MANEJADOR: Búsqueda principal y obtención de detalles masiva ---
    const handleSearch = async () => {
        if (!address.trim() || !keyword.trim()) {
            Alert.alert("Faltan datos", "Por favor, introduce una zona y un tipo de negocio.");
            return;
        }
        if (!GOOGLE_MAPS_API_KEY) {
             setErrorMsg('Error de configuración: Clave API no disponible.');
             return;
        }
        
        Keyboard.dismiss(); 
        setLoading(true);
        setErrorMsg(null);
        setBusinesses([]); 

        try {
            // 1. Obtener coordenadas
            const locationCoords = await getCoordinatesFromAddress(address);
            
            if (!locationCoords) {
                Alert.alert("Ubicación no encontrada", `No se pudieron obtener coordenadas válidas para: "${address}".`);
                return;
            }

            // 2. Buscar lugares cercanos
            const nearbyResults = await fetchNearbyPlaces(locationCoords.lat, locationCoords.lng);
            
            if (nearbyResults.length === 0) {
                 Alert.alert("Sin Resultados", `No se encontraron negocios tipo '${keyword}' cerca de "${address}" (radio ${SEARCH_RADIUS/1000} km).`);
                 return;
            }

            // 3. Obtener detalles completos para CADA negocio (incluido el teléfono)
            const detailPromises = nearbyResults.map(place => fetchPlaceDetails(place.place_id));
            const detailedResults = await Promise.all(detailPromises);
            
            // 4. Filtrar resultados y actualizar la lista
            const finalBusinesses = detailedResults.filter(detail => detail !== null);

            if (finalBusinesses.length === 0) {
                 Alert.alert("Detalles no disponibles", `Se encontraron lugares, pero no se pudo obtener información detallada (como el teléfono) para ninguno.`);
            }

            setBusinesses(finalBusinesses);

        } catch (error) {
            console.error('Error durante la búsqueda:', error);
            setErrorMsg(error.message || 'Error de conexión o API.');
        } finally {
            setLoading(false);
        }
    };


    return (
        <View style={styles.container}>
            <Text style={styles.headerText}>🔎 Buscador de Locales (Modo Tarjetas)</Text>
            
            {/* --- SECCIÓN DE ENTRADA DE DATOS --- */}
            <View style={styles.inputGroup}>
                 <Text style={styles.label}>Zona/Dirección (Ej: Caracas, Chacao)</Text>
                 <TextInput
                    style={styles.input}
                    placeholder="Escribe una ciudad, zona o dirección"
                    value={address}
                    onChangeText={setAddress}
                 />

                 <Text style={styles.label}>Tipo de Local (Ej: panadería, farmacia)</Text>
                 <TextInput
                    style={styles.input}
                    placeholder="Palabra clave"
                    value={keyword}
                    onChangeText={setKeyword}
                 />
                 
                 <TouchableOpacity 
                    style={styles.searchButton}
                    onPress={handleSearch}
                    disabled={loading}
                 >
                    <Text style={styles.searchButtonText}>
                        {loading ? "Buscando detalles..." : `Buscar Locales`}
                    </Text>
                 </TouchableOpacity>
            </View>
            
            {errorMsg && <Text style={styles.errorText}>{errorMsg}</Text>}
            
            {/* --- LISTA DE TARJETAS --- */}
            {loading && (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#007AFF" />
                    <Text style={styles.loadingText}>Buscando y obteniendo detalles de todos los locales...</Text>
                </View>
            )}

            {!loading && businesses.length > 0 && (
                 <Text style={styles.resultsHeader}>Locales encontrados ({businesses.length}):</Text>
            )}

            <FlatList
                data={businesses}
                keyExtractor={(item) => item.place_id}
                renderItem={({ item }) => <BusinessCard place={item} />}
                contentContainerStyle={styles.listContainer}
                ListEmptyComponent={() => (
                    !loading && businesses.length === 0 && (
                        <Text style={styles.placeholderText}>No hay resultados para mostrar. Inicia una búsqueda.</Text>
                    )
                )}
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
    loadingContainer: {
        alignItems: 'center',
        padding: 20,
    },
    loadingText: {
        marginTop: 10,
        color: '#666',
    },
    headerText: {
        fontSize: 22,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 10,
        color: '#333',
    },
    inputGroup: {
        paddingHorizontal: 20,
        marginBottom: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#ddd',
        paddingBottom: 15,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        marginTop: 10,
        color: '#555',
    },
    input: {
        height: 45,
        borderColor: '#ccc',
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: 10,
        marginBottom: 5,
        backgroundColor: '#fff',
    },
    searchButton: {
        backgroundColor: '#4CD964', 
        padding: 15,
        borderRadius: 8,
        marginTop: 10,
        alignItems: 'center',
    },
    searchButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
    errorText: {
        color: 'red',
        fontSize: 14,
        textAlign: 'center',
        paddingHorizontal: 20,
        marginBottom: 10,
    },
    resultsHeader: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 10,
        paddingHorizontal: 20,
    },
    listContainer: {
        paddingHorizontal: 10,
        paddingBottom: 40,
    },
    placeholderText: {
        fontSize: 16,
        color: '#777',
        textAlign: 'center',
        padding: 20,
    },
});

const cardStyles = StyleSheet.create({
    container: {
        backgroundColor: '#fff',
        padding: 15,
        borderRadius: 10,
        marginHorizontal: 10,
        marginBottom: 15,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 3,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 10,
        color: '#333',
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 5,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#555',
    },
    value: {
        fontSize: 14,
        color: '#333',
        maxWidth: '65%',
        textAlign: 'right',
    },
    phoneValue: {
        fontSize: 14,
        color: '#007AFF', 
        textDecorationLine: 'underline',
        maxWidth: '65%',
        textAlign: 'right',
    },
    linkValue: {
        fontSize: 14,
        color: '#007AFF',
        textDecorationLine: 'underline',
        maxWidth: '65%',
        textAlign: 'right',
    },
    mapButton: {
        backgroundColor: '#4285F4',
        padding: 10,
        borderRadius: 6,
        alignItems: 'center',
        marginTop: 15,
    },
    mapButtonText: {
        color: 'white',
        fontSize: 15,
        fontWeight: 'bold',
    },
});