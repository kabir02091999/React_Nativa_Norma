import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  Dimensions,
  ActivityIndicator,
  Switch,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard
} from 'react-native';
import * as Location from 'expo-location';
import MapView, { Marker } from 'react-native-maps';

import { Picker } from '@react-native-picker/picker';

import { insertClienteStatus } from '../api/api.js';

const { height } = Dimensions.get('window');
const MAP_HEIGHT = height * 0.35;

function NewClienteStatus() {
  const [nombre, setNombre] = useState('');
  const [isCliente, setIsCliente] = useState(true);

  const [rifLetra, setRifLetra] = useState('V');
  const [rifNumero, setRifNumero] = useState('');

  // --- ESTADOS TIPO DE LOCAL ---
  const [tipoSeleccionado, setTipoSeleccionado] = useState('');
  const [otroTipo, setOtroTipo] = useState('');

  // --- NUEVOS ESTADOS TELÉFONO ---
  const [codTelefono, setCodTelefono] = useState('414');
  const [numTelefono, setNumTelefono] = useState('');
  const [otroTelefonoFull, setOtroTelefonoFull] = useState(''); // Para cuando elige "Otro"

  const [ubicacionClave, setUbicacionClave] = useState('');
  const [direccion, setDireccion] = useState('');
  const [observacion, setObservacion] = useState('');
  const [banderaObservacion, setBanderaObservacion] = useState(false);

  const [currentLocation, setCurrentLocation] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const resetForm = () => {
    setNombre('');
    setRifLetra('V');
    setRifNumero('');
    setTipoSeleccionado('');
    setOtroTipo('');
    setCodTelefono('414');
    setNumTelefono('');
    setOtroTelefonoFull('');
    setUbicacionClave('');
    setDireccion('');
    setObservacion('');
    setBanderaObservacion(false);
    setIsCliente(true);
    setCurrentLocation(null);
  };

  const handleSubmit = async () => {
    const rifCompleto = `${rifLetra}-${rifNumero}`;
    const valorTipoFinal = tipoSeleccionado === 'Otros' ? otroTipo : tipoSeleccionado;

    // Lógica para el teléfono final
    const telefonoFinal = codTelefono === 'Otro' ? otroTelefonoFull : `${codTelefono}${numTelefono}`;

    if (!nombre || !rifNumero || !telefonoFinal || !valorTipoFinal) {
      Alert.alert("Error", "Nombre, RIF, Teléfono y Tipo de local son obligatorios.");
      return;
    }

    setIsLoading(true);

    try {
      let { status: geoStatus } = await Location.requestForegroundPermissionsAsync();
      if (geoStatus !== 'granted') {
        Alert.alert('Permiso Denegado', 'Se necesita el GPS.');
        setIsLoading(false);
        return;
      }

      let location = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = location.coords;

      const dataToSend = {
        tipo: valorTipoFinal,
        nombre: nombre,
        status: isCliente ? 1 : 0,
        rif: rifCompleto,
        telefono: telefonoFinal,
        Ubicacion_Clave: ubicacionClave,
        direccion: direccion,
        lat: latitude,
        lng: longitude,
        observacion: observacion,
        bandera_observacion: banderaObservacion ? 1 : 0
      };

      const result = await insertClienteStatus(dataToSend);

      setCurrentLocation({ latitude, longitude });
      Alert.alert("✅ Guardado", `Registro como ${isCliente ? 'Cliente' : 'Potencial'} exitoso.`);
      resetForm();

    } catch (error) {
      const errorMsg = error.response?.data?.message || "No se pudo conectar con el servidor.";
      Alert.alert("Error al registrar", errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1 }}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.container}>
            <Text style={styles.title}>Registro Cliente</Text>

            <View style={[styles.row, styles.statusCard]}>
              <View>
                <Text style={styles.label}>Tipo de Registro:</Text>
                <Text style={[styles.statusText, { color: isCliente ? '#007AFF' : '#E67E22' }]}>
                  {isCliente ? "🟢 Cliente" : "🟠 Cliente Potencial"}
                </Text>
              </View>
              <Switch
                value={isCliente}
                onValueChange={setIsCliente}
                trackColor={{ false: "#E67E22", true: "#007AFF" }}
              />
            </View>

            <TextInput style={styles.input} placeholder="Nombre Completo" value={nombre} onChangeText={setNombre} />

            
            <View style={styles.rifRow}>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={rifLetra}
                  onValueChange={(val) => setRifLetra(val)}
                >
                  <Picker.Item label="V" value="V" />
                  <Picker.Item label="J" value="J" />
                  <Picker.Item label="E" value="E" />
                  <Picker.Item label="G" value="G" />
                </Picker>
              </View>
              <TextInput
                style={styles.rifInput}
                placeholder="RIF / CI (Número)"
                value={rifNumero}
                onChangeText={(text) => setRifNumero(text.replace(/[^0-9]/g, ''))}
                keyboardType="numeric"
              />
            </View>

            {/* --- TELÉFONO CON SELECTOR --- */}
            <View style={styles.rifRow}>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={codTelefono}
                  onValueChange={(val) => setCodTelefono(val)}
                >
                  <Picker.Item label="0414" value="414" />
                  <Picker.Item label="0424" value="424" />
                  <Picker.Item label="0412" value="412" />
                  <Picker.Item label="0416" value="416" />
                  <Picker.Item label="0426" value="426" />
                  <Picker.Item label="0422" value="422" />
                  <Picker.Item label="Otro" value="Otro" />
                </Picker>
              </View>
              {codTelefono !== 'Otro' ? (
                <TextInput
                  style={styles.rifInput}
                  placeholder="Número de teléfono"
                  value={numTelefono}
                  onChangeText={(text) => setNumTelefono(text.replace(/[^0-9]/g, ''))}
                  keyboardType="numeric"
                  maxLength={7}
                />
              ) : (
                <TextInput
                  style={styles.rifInput}
                  placeholder="Teléfono completo"
                  value={otroTelefonoFull}
                  onChangeText={setOtroTelefonoFull}
                  keyboardType="phone-pad"
                />
              )}
            </View>

            
            <View style={styles.inputContainer}>
              <View style={styles.fullPickerContainer}>
                <Picker
                  selectedValue={tipoSeleccionado}
                  onValueChange={(itemValue) => setTipoSeleccionado(itemValue)}
                >
                  <Picker.Item label="Seleccione Tipo de Local" value="" />
                  <Picker.Item label="Carnicería" value="Carnicería" />
                  <Picker.Item label="Charcutería" value="Charcutería" />
                  <Picker.Item label="Supermercado" value="Supermercado" />
                  <Picker.Item label="Bodega" value="Bodega" />
                  <Picker.Item label="Restaurante" value="Restaurante" />
                  <Picker.Item label="Otros" value="Otros" />
                </Picker>
              </View>
            </View>

            {tipoSeleccionado === 'Otros' && (
              <TextInput
                style={styles.input}
                placeholder="Especifique qué tipo de local"
                value={otroTipo}
                onChangeText={setOtroTipo}
              />
            )}

            <TextInput style={styles.input} placeholder="Clave de Ubicación" value={ubicacionClave} onChangeText={setUbicacionClave} />
            <TextInput style={styles.input} placeholder="Dirección Exacta" value={direccion} onChangeText={setDireccion} />

            <View style={styles.row}>
              <Text style={styles.label}>¿Añadir Observación?</Text>
              <Switch
                value={banderaObservacion}
                onValueChange={setBanderaObservacion}
                trackColor={{ false: "#767577", true: "#81b0ff" }}
                thumbColor={banderaObservacion ? "#007AFF" : "#f4f3f4"}
              />
            </View>

            {banderaObservacion && (
              <TextInput
                style={[styles.input, { height: 100, textAlignVertical: 'top' }]}
                placeholder="Escribe la observación aquí..."
                multiline
                numberOfLines={4}
                value={observacion}
                onChangeText={setObservacion}
              />
            )}

            <TouchableOpacity style={styles.button} onPress={handleSubmit} disabled={isLoading}>
              {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Registrar Cliente</Text>}
            </TouchableOpacity>

            {currentLocation && (
              <View style={styles.mapContainer}>
                <Text style={styles.mapTitle}>Ubicación Capturada:</Text>
                <MapView
                  style={styles.map}
                  initialRegion={{
                    latitude: currentLocation.latitude,
                    longitude: currentLocation.longitude,
                    latitudeDelta: 0.005,
                    longitudeDelta: 0.005,
                  }}
                >
                  <Marker coordinate={currentLocation} pinColor="green" />
                </MapView>
              </View>
            )}
          </View>
        </TouchableWithoutFeedback>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: { flexGrow: 1, backgroundColor: '#f9f9f9' },
  container: { padding: 20, paddingTop: 40 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20, textAlign: 'center', color: '#333' },
  input: { height: 50, borderColor: '#ddd', borderWidth: 1, borderRadius: 8, paddingHorizontal: 15, marginBottom: 12, backgroundColor: '#fff' },
  rifRow: { flexDirection: 'row', marginBottom: 12, height: 50 },
  pickerContainer: { width: 100, borderWidth: 1, borderColor: '#ddd', borderRadius: 8, backgroundColor: '#fff', marginRight: 8, justifyContent: 'center' },
  inputContainer: { marginBottom: 12 },
  fullPickerContainer: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, backgroundColor: '#fff', height: 50, justifyContent: 'center' },
  rifInput: { flex: 1, borderColor: '#ddd', borderWidth: 1, borderRadius: 8, paddingHorizontal: 15, backgroundColor: '#fff', justifyContent: 'center' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15, paddingHorizontal: 5 },
  label: { fontSize: 16, color: '#555', fontWeight: '500' },
  statusCard: { backgroundColor: '#fff', padding: 15, borderRadius: 10, borderWidth: 1, borderColor: '#eee', marginBottom: 20 },
  statusText: { fontSize: 14, fontWeight: 'bold', marginTop: 4 },
  button: { backgroundColor: '#007AFF', height: 55, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginTop: 10, elevation: 3 },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  mapContainer: { marginTop: 20 },
  mapTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 8 },
  map: { width: '100%', height: MAP_HEIGHT, borderRadius: 10 },
});

export default NewClienteStatus;