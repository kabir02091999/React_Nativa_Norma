/* import React, { useState } from 'react';
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

            // --- TELÉFONO CON SELECTOR --- 
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

export default NewClienteStatus; */


import React, { useState } from 'react';
import {
  StyleSheet, Text, View, TextInput, TouchableOpacity,
  Alert, ScrollView, ActivityIndicator,
  KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import * as Location from 'expo-location';
import { insertLocal1 } from '../../utils/db';

const C = {
  bg: '#F4F6F9', white: '#FFFFFF', primary: '#1B4F72',
  accent: '#E67E22', danger: '#E74C3C', success: '#27AE60',
  border: '#D5E0EC', text: '#1A2B3C', textSec: '#5D7A8A',
  placeholder: '#9DB2BF', lightBlue: '#EBF5FB',
};

const Input = ({ label, ...props }) => (
  <View style={{ marginBottom: 12 }}>
    {label && <Text style={s.label}>{label}</Text>}
    <TextInput
      placeholderTextColor={C.placeholder}
      style={s.input}
      {...props}
    />
  </View>
);

const SectionHeader = ({ icon, title }) => (
  <View style={s.sectionWrap}>
    <Ionicons name={icon} size={18} color={C.primary} />
    <Text style={s.sectionTitle}>{title}</Text>
  </View>
);

export default function NuevoLocal() {
  const [rifLetra, setRifLetra] = useState('J');
  const [rifNumero, setRifNumero] = useState('');
  const [razonSocial, setRazonSocial] = useState('');
  const [tipoCliente, setTipoCliente] = useState('');
  const [direccionFiscal, setDireccionFiscal] = useState('');
  const [contribuyenteEspecial, setContribuyenteEspecial] = useState('No');
  const [puntoReferencia, setPuntoReferencia] = useState('');
  const [telefono, setTelefono] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const resetForm = () => {
    setRifLetra('J');
    setRifNumero('');
    setRazonSocial('');
    setTipoCliente('');
    setDireccionFiscal('');
    setContribuyenteEspecial('No');
    setPuntoReferencia('');
    setTelefono('');
  };

  const handleGuardar = async () => {
    if (!rifNumero.trim()) {
      Alert.alert('Campo requerido', 'El RIF/CI es obligatorio.');
      return;
    }
    if (!razonSocial.trim()) {
      Alert.alert('Campo requerido', 'La razón social es obligatoria.');
      return;
    }

    setIsLoading(true);
    try {
      // Obtener GPS
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permiso GPS', 'Se necesita acceso a la ubicación.');
        setIsLoading(false);
        return;
      }
      const loc = await Location.getCurrentPositionAsync({});

      await insertLocal1({
        ciRif: `${rifLetra}-${rifNumero}`,
        tipoLocal: tipoCliente,
        nombreLocal: razonSocial,
        telefonoPrincipal: telefono,
        ubicacionTexto: direccionFiscal,
        location: {
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        },
      });

      Alert.alert('✅ Local guardado', `${razonSocial} registrado correctamente.`);
      resetForm();
    } catch (e) {
      Alert.alert('Error', e.message || 'No se pudo guardar el local.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={s.container}>

            {/* HEADER */}
            <View style={s.pageHeader}>
              <Text style={s.pageEyebrow}>ECOINN</Text>
              <Text style={s.pageTitle}>Nuevo Local</Text>
            </View>

            {/* RIF / CI */}
            <SectionHeader icon="card-outline" title="Identificación" />
            <Text style={s.label}>RIF / CI</Text>
            <View style={s.rifRow}>
              <View style={s.pickerSmall}>
                <Picker
                  selectedValue={rifLetra}
                  onValueChange={setRifLetra}
                  style={{ color: '#000000' }}
                  dropdownIconColor={'#000000'}
                >
                  {['J', 'V', 'E', 'G', 'C'].map(l => (
                    <Picker.Item key={l} label={l} value={l} color="#000000" />
                  ))}
                </Picker>
              </View>
              <TextInput
                style={s.rifInput}
                placeholder="Número de RIF"
                placeholderTextColor={C.placeholder}
                value={rifNumero}
                onChangeText={t => setRifNumero(t.replace(/[^0-9]/g, ''))}
                keyboardType="numeric"
              />
            </View>

            {/* DATOS GENERALES */}
            <SectionHeader icon="storefront-outline" title="Datos del Local" />

            <Input
              label="Razón Social *"
              placeholder="Nombre de la empresa"
              value={razonSocial}
              onChangeText={setRazonSocial}
            />

            <Text style={s.label}>Tipo de Cliente</Text>
            <View style={s.pickerBox}>
              <Picker
                selectedValue={tipoCliente}
                onValueChange={setTipoCliente}
                style={{ color: '#000000' }}
                dropdownIconColor={'#000000'}
              >
                <Picker.Item label="Seleccione tipo..." value="" color={C.placeholder} />
                {[
                  'Carnicería',
                  'Charcutería',
                  'Panadería',
                  'Supermercados',
                  'Abastos y Bodegas',
                  'Bodegones',
                  'Restaurantes',
                  'Antinas y Loncherías',
                  'Hoteles',
                  'Ferreterías',
                  'Farmacia',
                  'Repuesto',
                  'Tiendas de Mascotas',
                  'Veterinarias',
                  'Residencias para Animales',
                  'Cadenas de Supermercados',
                  'Cadenas de Farmacias',
                  'Cadenas de Ferreterías',
                  'Cadenas de Pet Shop',
                  'Cadenas de Repuestos',
                  'Mayoristas',
                  'Distribuidores',
                  'Freelance', 'Otros'
                ].map(t => (
                  <Picker.Item key={t} label={t} value={t} color="#000000" />
                ))}
              </Picker>
            </View>

            <Input
              label="Dirección Fiscal"
              placeholder="Dirección registrada en el RIF"
              value={direccionFiscal}
              onChangeText={setDireccionFiscal}
            />

            <Input
              label="Punto de Referencia"
              placeholder="Cerca de... / Frente a..."
              value={puntoReferencia}
              onChangeText={setPuntoReferencia}
            />

            <Input
              label="Teléfono Principal"
              placeholder="04XX-XXXXXXX"
              value={telefono}
              onChangeText={setTelefono}
              keyboardType="phone-pad"
            />

            {/* CONTRIBUYENTE */}
            <SectionHeader icon="receipt-outline" title="Condición Fiscal" />
            <Text style={s.label}>Contribuyente Especial</Text>
            <View style={s.pickerBox}>
              <Picker
                selectedValue={contribuyenteEspecial}
                onValueChange={setContribuyenteEspecial}
                style={{ color: '#000000' }}
                dropdownIconColor={'#000000'}
              >
                <Picker.Item label="No" value="No" color="#000000" />
                <Picker.Item label="Sí" value="Sí" color="#000000" />
              </Picker>
            </View>

            {/* GPS INFO */}
            <View style={s.gpsInfo}>
              <Ionicons name="location-outline" size={16} color={C.textSec} />
              <Text style={s.gpsText}>
                La ubicación GPS se capturará automáticamente al guardar.
              </Text>
            </View>

            {/* BOTÓN */}
            <TouchableOpacity
              style={[s.btnGuardar, isLoading && { opacity: 0.6 }]}
              onPress={handleGuardar}
              disabled={isLoading}
              activeOpacity={0.85}
            >
              {isLoading
                ? <ActivityIndicator color="#fff" />
                : <>
                  <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
                  <Text style={s.btnGuardarText}>GUARDAR LOCAL</Text>
                </>
              }
            </TouchableOpacity>

            <View style={{ height: 40 }} />
          </View>
        </TouchableWithoutFeedback>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  scroll: { flexGrow: 1, backgroundColor: C.bg },
  container: { padding: 20 },
  pageHeader: { paddingTop: 16, paddingBottom: 20 },
  pageEyebrow: { fontSize: 10, fontWeight: '800', color: C.accent, letterSpacing: 3 },
  pageTitle: { fontSize: 26, fontWeight: '900', color: C.primary, marginTop: 2 },

  sectionWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 24, marginBottom: 14 },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: C.text, flex: 1 },

  label: { fontSize: 12, fontWeight: '700', color: C.textSec, marginBottom: 6 },

  input: {
    backgroundColor: C.white, height: 46, borderRadius: 10,
    paddingHorizontal: 14, borderWidth: 1, borderColor: C.border,
    fontSize: 14, color: C.text,
  },

  rifRow: { flexDirection: 'row', marginBottom: 12, gap: 8 },
  pickerSmall: {
    width: 90, backgroundColor: '#FFFFFF', borderRadius: 10,
    borderWidth: 1, borderColor: C.border, overflow: 'hidden',
  },
  rifInput: {
    flex: 1, backgroundColor: C.white, height: 46, borderRadius: 10,
    paddingHorizontal: 14, borderWidth: 1, borderColor: C.border,
    fontSize: 14, color: C.text,
  },

  pickerBox: {
    backgroundColor: '#FFFFFF', borderRadius: 10,
    borderWidth: 1, borderColor: C.border,
    marginBottom: 12, overflow: 'hidden',
  },

  gpsInfo: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: C.lightBlue, borderRadius: 10, padding: 12,
    marginTop: 16, borderWidth: 1, borderColor: C.primary + '30',
  },
  gpsText: { fontSize: 12, color: C.textSec, flex: 1 },

  btnGuardar: {
    backgroundColor: C.primary, height: 56, borderRadius: 14,
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    gap: 10, marginTop: 24, elevation: 4,
    shadowColor: C.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8,
  },
  btnGuardarText: { color: '#fff', fontWeight: '800', fontSize: 16, letterSpacing: 1 },
});