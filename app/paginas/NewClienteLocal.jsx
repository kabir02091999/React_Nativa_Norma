import React, { useState, useEffect } from 'react';
import {
  StyleSheet, Text, View, TextInput, TouchableOpacity, Alert,
  ScrollView, ActivityIndicator, Switch,
  KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard
} from 'react-native';
import * as Location from 'expo-location';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { insertCensoLocal } from '../../utils/db.js';

const C = {
  bg: '#F4F6F9', white: '#FFFFFF', primary: '#1B4F72',
  accent: '#E67E22', danger: '#E74C3C',
  border: '#D5E0EC', text: '#1A2B3C', textSec: '#5D7A8A',
  placeholder: '#9DB2BF',
};

const Input = ({ style, ...props }) => (
  <TextInput
    placeholderTextColor={C.placeholder}
    style={[s.input, style]}
    {...props}
  />
);

const SectionHeader = ({ number, title }) => (
  <View style={s.sectionWrap}>
    <View style={s.sectionBullet}><Text style={s.sectionNum}>{number}</Text></View>
    <Text style={s.sectionTitle}>{title}</Text>
  </View>
);

const Label = ({ text, required }) => (
  <Text style={s.label}>{text}{required && <Text style={{ color: C.danger }}> *</Text>}</Text>
);

const DeleteIcon = () => (
  <View style={s.deleteBtn}><Text style={{ color: C.danger, fontWeight: '800', fontSize: 16 }}>✕</Text></View>
);

export default function NewClienteLocal() {

  const rawParams = useLocalSearchParams();
  const params = (rawParams && typeof rawParams === 'object') ? rawParams : {};

  const parsearTelefono = (tel) => {
    if (!tel) return { cod: '0414', num: '' };
    const limpio = String(tel).replace(/[-\s]/g, '');
    const codigos = ['0414', '0424', '0412', '0416', '0426'];
    for (const cod of codigos) {
      if (limpio.startsWith(cod)) return { cod, num: limpio.slice(cod.length) };
    }
    return { cod: '0414', num: limpio };
  };
  const telParsed = parsearTelefono(params.prefill_telefono || '');

  const parsearRIF = (rif) => {
    if (!rif) return { letra: 'J', numero: '' };
    const partes = String(rif).split('-');
    if (partes.length >= 2) return { letra: partes[0], numero: partes.slice(1).join('-') };
    return { letra: 'J', numero: String(rif) };
  };
  const rifParsed = parsearRIF(params.prefill_rif || '');

  // ── SWITCH: mostrar campos adicionales ──
  const [mostrarAdicionales, setMostrarAdicionales] = useState(false);

  // ── CAMPOS ESENCIALES ──
  const [rifLetra, setRifLetra] = useState(rifParsed.letra || 'J');
  const [rifNumero, setRifNumero] = useState(rifParsed.numero || '');
  const [razonSocial, setRazonSocial] = useState(params.prefill_nombre || '');
  const [direccionFisica, setDireccionFisica] = useState(params.prefill_direccion || '');
  const [codTelf, setCodTelf] = useState(telParsed.cod);
  const [numTelf, setNumTelf] = useState(telParsed.num);
  const [segmento, setSegmento] = useState(params.prefill_sector || '');
  const [otroSegmento, setOtroSegmento] = useState('');
  const [personaCompras, setPersonaCompras] = useState('');
  const [productos, setProductos] = useState([{ id: Date.now(), nombre: '', cantidad: '' }]);

  // ── CAMPOS ADICIONALES ──
  const [direccionFiscal, setDireccionFiscal] = useState(params.prefill_direccion || '');
  const [repLegal, setRepLegal] = useState('');
  const [rifRepLetra, setRifRepLetra] = useState('V');
  const [rifRepNumero, setRifRepNumero] = useState('');
  const [ciudad, setCiudad] = useState('');
  const [contribuyenteEspecial, setContribuyenteEspecial] = useState(false);
  const [nombreComercial, setNombreComercial] = useState('');
  const [municipio, setMunicipio] = useState('');
  const [estado, setEstado] = useState('');
  const [puntoReferencia, setPuntoReferencia] = useState('');
  const [whatsapp, setWhatsapp] = useState(params.prefill_telefono || '');
  const [correoElectronico, setCorreoElectronico] = useState(params.prefill_correo || '');
  const [categoriaEIG, setCategoriaEIG] = useState(params.prefill_categoria || '');
  const [otraCategoria, setOtraCategoria] = useState('');
  const [tamanoCliente, setTamanoCliente] = useState('');
  const [correoCompras, setCorreoCompras] = useState('');
  const [telfCompras, setTelfCompras] = useState('');
  const [personaAdmin, setPersonaAdmin] = useState('');
  const [correoAdmin, setCorreoAdmin] = useState('');
  const [telfAdmin, setTelfAdmin] = useState('');
  const [compraPromedio, setCompraPromedio] = useState('');
  const [dondeRecibe, setDondeRecibe] = useState('');
  const [frecuenciaCompra, setFrecuenciaCompra] = useState('Semanal');
  const [diaVisita, setDiaVisita] = useState('Lunes');
  const [horarioVisita, setHorarioVisita] = useState('');
  const [diaEntrega, setDiaEntrega] = useState('Martes');
  const [horarioEntrega, setHorarioEntrega] = useState('');
  const [metodoPago, setMetodoPago] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [isCliente, setIsCliente] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (params.prefill_nombre) setRazonSocial(params.prefill_nombre);
    if (params.prefill_direccion) {
      setDireccionFiscal(params.prefill_direccion);
      setDireccionFisica(params.prefill_direccion);
    }
    if (params.prefill_correo) setCorreoElectronico(params.prefill_correo);
    if (params.prefill_categoria) setCategoriaEIG(params.prefill_categoria);
    if (params.prefill_sector) setSegmento(params.prefill_sector);
    if (params.prefill_telefono) {
      const limpio = String(params.prefill_telefono).replace(/[-\s]/g, '');
      setWhatsapp(limpio);
      const codigos = ['0414', '0424', '0412', '0416', '0426'];
      let encontrado = false;
      for (const cod of codigos) {
        if (limpio.startsWith(cod)) {
          setCodTelf(cod);
          setNumTelf(limpio.slice(cod.length));
          encontrado = true;
          break;
        }
      }
      if (!encontrado) setNumTelf(limpio);
    }
  }, [params.prefill_nombre]);

  const agregarProducto = () =>
    setProductos([...productos, { id: Date.now(), nombre: '', cantidad: '' }]);
  const actualizarProducto = (id, campo, valor) =>
    setProductos(productos.map(p => p.id === id ? { ...p, [campo]: valor } : p));
  const eliminarProducto = (id) =>
    setProductos(productos.filter(p => p.id !== id));

  const resetForm = () => {
    setRazonSocial(''); setDireccionFiscal(''); setRifNumero('');
    setRepLegal(''); setRifRepNumero(''); setCiudad('');
    setNombreComercial(''); setDireccionFisica(''); setMunicipio('');
    setEstado(''); setPuntoReferencia(''); setNumTelf('');
    setWhatsapp(''); setCorreoElectronico(''); setSegmento('');
    setOtroSegmento(''); setCategoriaEIG(''); setOtraCategoria('');
    setTamanoCliente(''); setPersonaCompras(''); setCorreoCompras('');
    setTelfCompras(''); setPersonaAdmin(''); setCorreoAdmin('');
    setTelfAdmin(''); setCompraPromedio(''); setDondeRecibe('');
    setHorarioVisita(''); setHorarioEntrega(''); setMetodoPago('');
    setObservaciones(''); setContribuyenteEspecial(false);
    setProductos([{ id: Date.now(), nombre: '', cantidad: '' }]);
    setMostrarAdicionales(false);
  };

  const handleSubmit = async () => {
    const segmentoFinal = segmento === 'Otros' ? otroSegmento : segmento;
    const categoriaFinal = categoriaEIG === 'Otros' ? otraCategoria : categoriaEIG;
    if (!razonSocial.trim() || !rifNumero.trim()) {
      Alert.alert('Campos obligatorios', 'Razón Social y RIF son requeridos.');
      return;
    }
    setIsLoading(true);
    try {
      let locationData = {
        lat: params.prefill_lat ? parseFloat(params.prefill_lat) : 0,
        lng: params.prefill_lng ? parseFloat(params.prefill_lng) : 0,
      };
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          locationData = { lat: loc.coords.latitude, lng: loc.coords.longitude };
        }
      } catch { console.log('GPS no disponible'); }

      const productosValidos = productos
        .filter(p => p.nombre.trim() && p.cantidad.trim())
        .map(p => ({
          nombre: p.nombre === 'Otros' ? (p.nombrePersonalizado || 'Otros') : p.nombre,
          cantidad: p.cantidad,
        }));

      await insertCensoLocal({
        razon_social: razonSocial.toUpperCase(),
        direccion_fiscal: direccionFiscal,
        rif: `${rifLetra}-${rifNumero}`,
        representante_legal: repLegal,
        rif_representante: `${rifRepLetra}-${rifRepNumero}`,
        ciudad, contribuyente_especial: contribuyenteEspecial ? 1 : 0,
        nombre_fantasia: nombreComercial || razonSocial,
        direccion_fisica: direccionFisica,
        municipio, estado, punto_referencia: puntoReferencia,
        telefono: `${codTelf}${numTelf}`,
        whatsapp, correo_electronico: correoElectronico,
        segmento: segmentoFinal,
        categoria_oportunidad: categoriaFinal,
        tamano_cliente: tamanoCliente,
        persona_contacto: personaCompras,
        correo_representante: correoCompras,
        telefono_compras: telfCompras,
        contacto_administracion: personaAdmin,
        correo_administracion: correoAdmin,
        telefono_administracion: telfAdmin,
        productos: productosValidos,
        compra_promedio: parseFloat(compraPromedio) || 0,
        donde_recibe: dondeRecibe,
        frecuencia_visita: frecuenciaCompra,
        dia_visita: diaVisita,
        horario_visita: horarioVisita,
        dia_despacho: diaEntrega,
        horario_entrega: horarioEntrega,
        metodo_pago: metodoPago,
        lat: locationData.lat, lng: locationData.lng,
        observaciones, status: isCliente ? 1 : 0, sector: '',
      });
      Alert.alert('✅ Éxito', 'Censo guardado en el dispositivo.');
      resetForm();
    } catch (error) {
      Alert.alert('Error', error.message || 'No se pudo guardar.');
    } finally {
      setIsLoading(false);
    }
  };

  const hayPrefill = !!(params.prefill_nombre || params.prefill_rif || params.prefill_telefono);

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={s.container}>

            {/* ── HEADER ── */}
            <View style={s.pageHeader}>
              <Text style={s.pageEyebrow}>ECOINN</Text>
              <Text style={s.pageTitle}>Censo de Clientes</Text>
            </View>

            {hayPrefill && (
              <View style={s.preFillBanner}>
                <Ionicons name="information-circle-outline" size={18} color="#1B4F72" />
                <Text style={s.preFillText}>
                  Datos pre-llenados desde la ruta. Revisa y completa los campos que falten.
                </Text>
              </View>
            )}

            {/* ── TIPO DE REGISTRO ── */}
            <View style={s.statusCard}>
              <View style={s.statusRow}>
                <View>
                  <Text style={s.statusLabel}>Tipo de registro</Text>
                  <Text style={[s.statusValue, { color: isCliente ? C.primary : C.accent }]}>
                    {isCliente ? 'CLIENTE ACTUAL' : 'PROSPECTO / NUEVO'}
                  </Text>
                </View>
                <Switch value={isCliente} onValueChange={setIsCliente}
                  trackColor={{ false: C.accent, true: C.primary }} thumbColor="#fff" />
              </View>
            </View>

            {/* ════════════════════════════════
                CAMPOS ESENCIALES (siempre visibles)
                ════════════════════════════════ */}

            {/* 1. RIF */}
            <SectionHeader number="1" title="RIF / C.I." />
            <View style={s.rifRow}>
              <View style={s.pickerSmallWrap}>
                <Picker selectedValue={rifLetra} onValueChange={setRifLetra}>
                  <Picker.Item color="#1A2B3C" label="J" value="J" />
                  <Picker.Item color="#1A2B3C" label="V" value="V" />
                  <Picker.Item color="#1A2B3C" label="G" value="G" />
                  <Picker.Item color="#1A2B3C" label="E" value="E" />
                </Picker>
              </View>
              <Input style={{ flex: 1, marginLeft: 8 }}
                placeholder="Número de RIF" value={rifNumero}
                onChangeText={setRifNumero} keyboardType="numeric" />
            </View>

            {/* 2. RAZÓN SOCIAL */}
            <SectionHeader number="2" title="Razón Social" />
            <Input placeholder="Nombre legal de la empresa"
              value={razonSocial} onChangeText={setRazonSocial} autoCapitalize="characters" />

            {/* 3. DIRECCIÓN COMERCIAL */}
            <SectionHeader number="3" title="Dirección Comercial" />
            <Input placeholder="Dirección del establecimiento"
              value={direccionFisica} onChangeText={setDireccionFisica} />

            {/* 4. TELÉFONO */}
            <SectionHeader number="4" title="Teléfono" />
            <View style={s.rifRow}>
              <View style={s.pickerSmallWrap}>
                <Picker selectedValue={codTelf} onValueChange={setCodTelf}>
                  <Picker.Item color="#1A2B3C" label="0414" value="0414" />
                  <Picker.Item color="#1A2B3C" label="0424" value="0424" />
                  <Picker.Item color="#1A2B3C" label="0412" value="0412" />
                  <Picker.Item color="#1A2B3C" label="0416" value="0416" />
                  <Picker.Item color="#1A2B3C" label="0426" value="0426" />
                  <Picker.Item color="#1A2B3C" label="0422" value="0422" />
                  <Picker.Item color="#1A2B3C" label="0212" value="0212" />
                  <Picker.Item color="#1A2B3C" label="0422" value="0422" />  
                </Picker>
              </View>
              <Input style={{ flex: 1, marginLeft: 8 }}
                placeholder="Número (7 dígitos)" value={numTelf}
                onChangeText={setNumTelf} keyboardType="numeric" maxLength={7} />
            </View>

            {/* 5. SEGMENTO */}
            <SectionHeader number="5" title="Tipo de Cliente" />
            <View style={s.pickerBox}>
              <Picker selectedValue={segmento} onValueChange={setSegmento}>
                <Picker.Item color="#1A2B3C" label="Seleccione Tipo de Cliente..." value="" />
                <Picker.Item color="#1A2B3C" label="Carnicería" value="Carniceria" />
                <Picker.Item color="#1A2B3C" label="Charcutería" value="Charcuteria" />
                <Picker.Item color="#1A2B3C" label="Panadería y Pastelería" value="Panaderia" />
                <Picker.Item color="#1A2B3C" label="Supermercados" value="Supermercados" />
                <Picker.Item color="#1A2B3C" label="Abastos y Bodegas" value="Bodegas" />
                <Picker.Item color="#1A2B3C" label="Bodegones" value="Bodegones" />
                <Picker.Item color="#1A2B3C" label="Restaurantes" value="Restaurantes" />
                <Picker.Item color="#1A2B3C" label="Cantinas y Loncherías" value="Cantinas" />
                <Picker.Item color="#1A2B3C" label="Hoteles" value="Hoteles" />
                <Picker.Item color="#1A2B3C" label="Ferreterías" value="Ferreterias" />
                <Picker.Item color="#1A2B3C" label="Farmacia" value="Farmacia" />
                <Picker.Item color="#1A2B3C" label="Repuesto" value="Repuesto" />
                <Picker.Item color="#1A2B3C" label="Tiendas de Mascotas" value="Mascotas" />
                <Picker.Item color="#1A2B3C" label="Veterinarias" value="Veterinarias" />
                <Picker.Item color="#1A2B3C" label="Residencias para Animales" value="ResidenciasAnimales" />
                <Picker.Item color="#1A2B3C" label="Cadenas de Supermercados" value="CadenasSuper" />
                <Picker.Item color="#1A2B3C" label="Cadenas de Farmacias" value="CadenasFarmacias" />
                <Picker.Item color="#1A2B3C" label="Cadenas de Ferreterías" value="CadenasFerreterias" />
                <Picker.Item color="#1A2B3C" label="Cadenas de Pet Shop" value="CadenasPetShop" />
                <Picker.Item color="#1A2B3C" label="Cadenas de Repuestos" value="CadenasRepuestos" />
                <Picker.Item color="#1A2B3C" label="Mayoristas" value="Mayoristas" />
                <Picker.Item color="#1A2B3C" label="Distribuidores" value="Distribuidores" />
                <Picker.Item color="#1A2B3C" label="Freelance" value="Freelance" />
                <Picker.Item color="#1A2B3C" label="Otros (Especificar)" value="Otros" />
              </Picker>
            </View>
            {segmento === 'Otros' && (
              <Input style={s.inputAlt} placeholder="¿Cuál segmento?"
                value={otroSegmento} onChangeText={setOtroSegmento} />
            )}

            {/* 6. PERSONA DE CONTACTO */}
            <SectionHeader number="6" title="Persona de Contacto" />
            <Input placeholder="Nombre del encargado de compras"
              value={personaCompras} onChangeText={setPersonaCompras} />

            {/* 7. PRODUCTOS DE INTERÉS */}
            <View style={s.sectionWrap}>
              <View style={s.sectionBullet}><Text style={s.sectionNum}>7</Text></View>
              <Text style={s.sectionTitle}>Producto de Interés</Text>
              <TouchableOpacity style={s.addBtn} onPress={agregarProducto}>
                <Text style={s.addBtnText}>+ Agregar</Text>
              </TouchableOpacity>
            </View>

            {productos.map((item, index) => (
              <View key={item.id} style={s.productoCard}>
                <View style={s.productoHeader}>
                  <Text style={s.productoNum}>Ítem #{index + 1}</Text>
                  {productos.length > 1 && (
                    <TouchableOpacity onPress={() => eliminarProducto(item.id)}>
                      <DeleteIcon />
                    </TouchableOpacity>
                  )}
                </View>
                <View style={s.pickerBox}>
                  <Picker selectedValue={item.nombre}
                    onValueChange={val => actualizarProducto(item.id, 'nombre', val)}>
                    <Picker.Item color="#1A2B3C" label="Seleccione producto..." value="" />
                    <Picker.Item color="#1A2B3C" label="Pads Entrenamiento 60x40" value="Pads Entrenamiento 60x40" />
                    <Picker.Item color="#1A2B3C" label="Pads Entrenamiento 60x60" value="Pads Entrenamiento 60x60" />
                    <Picker.Item color="#1A2B3C" label="Toallas Húmedas" value="Toallas Húmedas" />
                    <Picker.Item color="#1A2B3C" label="Bolsas para Desechos" value="Bolsas para Desechos" />
                    <Picker.Item color="#1A2B3C" label="Papel Film Alimenticio" value="Papel Film Alimenticio" />
                    <Picker.Item color="#1A2B3C" label="Papel Film Industrial" value="Papel Film Industrial" />
                    <Picker.Item color="#1A2B3C" label="Cuellero" value="Cuellero" />
                    <Picker.Item color="#1A2B3C" label="Kinesiológicas" value="Kinesiologicas" />
                    <Picker.Item color="#1A2B3C" label="Vendas Adhesivas" value="Vendas Adhesivas" />
                    <Picker.Item color="#1A2B3C" label="Airfryer" value="Airfryer" />
                    <Picker.Item color="#1A2B3C" label="Encendedores Recargables" value="Encendedores Recargables" />
                    <Picker.Item color="#1A2B3C" label="Cauchos para Motos" value="Cauchos para Motos" />
                    <Picker.Item color="#1A2B3C" label="Tripa / Cámara de Aire" value="Tripa Camara de Aire" />
                    <Picker.Item color="#1A2B3C" label="Válvulas" value="Valvulas" />
                    <Picker.Item color="#1A2B3C" label="Wall Panel Interiores" value="Wall Panel Interiores" />
                    <Picker.Item color="#1A2B3C" label="Wall Panel Exteriores" value="Wall Panel Exteriores" />
                    <Picker.Item color="#1A2B3C" label="Tubos Interiores" value="Tubos Interiores" />
                    <Picker.Item color="#1A2B3C" label="Tubos Exteriores" value="Tubos Exteriores" />
                    <Picker.Item color="#1A2B3C" label="Estructura Pérgola" value="Estructura Pergola" />
                    <Picker.Item color="#1A2B3C" label="UPVC" value="UPVC" />
                    <Picker.Item color="#1A2B3C" label="Otros (Especificar)" value="Otros" />
                  </Picker>
                </View>
                {item.nombre === 'Otros' && (
                  <Input style={{ ...s.inputAlt, marginTop: 8 }}
                    placeholder="¿Cuál producto?"
                    value={item.nombrePersonalizado || ''}
                    onChangeText={val => actualizarProducto(item.id, 'nombrePersonalizado', val)} />
                )}
                {/* 8. CANTIDAD QUE PUDIERA COMPRAR */}
                <Input style={{ marginTop: 8 }}
                  placeholder="Cantidad mensual estimada (unidades)"
                  value={item.cantidad}
                  onChangeText={val => actualizarProducto(item.id, 'cantidad', val)}
                  keyboardType="numeric" />
              </View>
            ))}

            {/* 9. GPS — automático */}
            <View style={s.gpsInfo}>
              <Text style={s.gpsText}>📍 Coordenadas GPS se capturan automáticamente al guardar</Text>
            </View>

            {/* ════════════════════════════════
                SWITCH — DATOS ADICIONALES
            ════════════════════════════════ */}
            <View style={s.switchToggleCard}>
              <View style={s.switchToggleRow}>
                <View style={{ flex: 1 }}>
                  <Text style={s.switchToggleTitle}>Datos adicionales</Text>
                  <Text style={s.switchToggleSub}>
                    {mostrarAdicionales
                      ? 'Ocultar campos de dirección fiscal, contactos, logística y más'
                      : 'Agregar dirección fiscal, contactos, logística y más'}
                  </Text>
                </View>
                <Switch
                  value={mostrarAdicionales}
                  onValueChange={setMostrarAdicionales}
                  trackColor={{ false: C.border, true: C.primary }}
                  thumbColor="#fff"
                />
              </View>
            </View>

            {/* ════════════════════════════════
                CAMPOS ADICIONALES (solo si switch activo)
            ════════════════════════════════ */}
            {mostrarAdicionales && (
              <>
                {/* TIPO DE REGISTRO */}
                <View style={s.statusCard}>
                  <View style={s.statusRow}>
                    <View>
                      <Text style={s.statusLabel}>Tipo de registro</Text>
                      <Text style={[s.statusValue, { color: isCliente ? C.primary : C.accent }]}>
                        {isCliente ? 'CLIENTE ACTUAL' : 'PROSPECTO / NUEVO'}
                      </Text>
                    </View>
                    <Switch value={isCliente} onValueChange={setIsCliente}
                      trackColor={{ false: C.accent, true: C.primary }} thumbColor="#fff" />
                  </View>
                </View>

                {/* ── DATOS LEGALES ── */}
                <SectionHeader number="A" title="Datos Legales" />

                <Label text="Dirección Fiscal" />
                <Input placeholder="Dirección registrada en el RIF"
                  value={direccionFiscal} onChangeText={setDireccionFiscal} />

                <Label text="Representante Legal" />
                <Input placeholder="Nombre completo del representante"
                  value={repLegal} onChangeText={setRepLegal} />

                <Label text="C.I. / RIF del Representante" />
                <View style={s.rifRow}>
                  <View style={s.pickerSmallWrap}>
                    <Picker selectedValue={rifRepLetra} onValueChange={setRifRepLetra}>
                      <Picker.Item color="#1A2B3C" label="V" value="V" />
                      <Picker.Item color="#1A2B3C" label="E" value="E" />
                      <Picker.Item color="#1A2B3C" label="J" value="J" />
                    </Picker>
                  </View>
                  <Input style={{ flex: 1, marginLeft: 8 }}
                    placeholder="Número" value={rifRepNumero}
                    onChangeText={setRifRepNumero} keyboardType="numeric" />
                </View>

                <Label text="Nombre Comercial" />
                <Input placeholder="Nombre con el que opera el negocio"
                  value={nombreComercial} onChangeText={setNombreComercial} />

                <View style={s.switchRow}>
                  <Text style={s.switchLabel}>Contribuyente Especial</Text>
                  <Switch value={contribuyenteEspecial} onValueChange={setContribuyenteEspecial}
                    trackColor={{ false: '#ccc', true: C.primary }} thumbColor="#fff" />
                </View>

                {/* ── UBICACIÓN ── */}
                <SectionHeader number="B" title="Ubicación Detallada" />

                <View style={s.rowThree}>
                  <View style={{ flex: 1 }}>
                    <Label text="Ciudad" />
                    <Input style={{ marginBottom: 0 }} placeholder="Ciudad"
                      value={ciudad} onChangeText={setCiudad} />
                  </View>
                  <View style={{ width: 8 }} />
                  <View style={{ flex: 1 }}>
                    <Label text="Municipio" />
                    <Input style={{ marginBottom: 0 }} placeholder="Municipio"
                      value={municipio} onChangeText={setMunicipio} />
                  </View>
                  <View style={{ width: 8 }} />
                  <View style={{ flex: 1 }}>
                    <Label text="Estado" />
                    <Input style={{ marginBottom: 0 }} placeholder="Estado"
                      value={estado} onChangeText={setEstado} />
                  </View>
                </View>
                <View style={{ height: 12 }} />

                <Label text="Punto de Referencia" />
                <Input placeholder="Ej: Al lado del banco Mercantil"
                  value={puntoReferencia} onChangeText={setPuntoReferencia} />

                {/* ── CONTACTO ADICIONAL ── */}
                <SectionHeader number="C" title="Contacto Adicional" />

                <Label text="WhatsApp" />
                <Input placeholder="Ej: 04141234567"
                  value={whatsapp} onChangeText={setWhatsapp} keyboardType="phone-pad" />

                <Label text="Correo Electrónico" />
                <Input placeholder="correo@empresa.com"
                  value={correoElectronico} onChangeText={setCorreoElectronico}
                  keyboardType="email-address" autoCapitalize="none" />

                {/* ── CLASIFICACIÓN COMERCIAL ── */}
                <SectionHeader number="D" title="Clasificación Comercial" />

                <Label text="Categoría EIG" />
                <View style={s.pickerBox}>
                  <Picker selectedValue={categoriaEIG} onValueChange={setCategoriaEIG}>
                    <Picker.Item color="#1A2B3C" label="Seleccione categoría..." value="" />
                    <Picker.Item color="#1A2B3C" label="Film Alimenticio" value="Film Alimenticio" />
                    <Picker.Item color="#1A2B3C" label="Film Industrial" value="Film Industrial" />
                    <Picker.Item color="#1A2B3C" label="Bolsas de Basura" value="Bolsas de Basura" />
                    <Picker.Item color="#1A2B3C" label="Mascotas" value="Mascotas" />
                    <Picker.Item color="#1A2B3C" label="Otros" value="Otros" />
                  </Picker>
                </View>
                {categoriaEIG === 'Otros' && (
                  <Input style={s.inputAlt} placeholder="¿Cuál categoría?"
                    value={otraCategoria} onChangeText={setOtraCategoria} />
                )}

                <Label text="Tamaño del Cliente" />
                <View style={s.pickerBox}>
                  <Picker selectedValue={tamanoCliente} onValueChange={setTamanoCliente}>
                    <Picker.Item color="#1A2B3C" label="Seleccione tamaño..." value="" />
                    <Picker.Item color="#1A2B3C" label="Pequeño" value="Pequeño" />
                    <Picker.Item color="#1A2B3C" label="Mediano" value="Mediano" />
                    <Picker.Item color="#1A2B3C" label="Grande" value="Grande" />
                    <Picker.Item color="#1A2B3C" label="Corporativo" value="Corporativo" />
                  </Picker>
                </View>

                {/* ── CONTACTO COMPRAS ── */}
                <SectionHeader number="E" title="Contacto de Compras" />

                <Label text="Correo Electrónico Compras" />
                <Input placeholder="compras@empresa.com"
                  value={correoCompras} onChangeText={setCorreoCompras}
                  keyboardType="email-address" autoCapitalize="none" />

                <Label text="Teléfono Compras" />
                <Input placeholder="Número directo de compras"
                  value={telfCompras} onChangeText={setTelfCompras} keyboardType="phone-pad" />

                {/* ── CONTACTO ADMINISTRACIÓN ── */}
                <SectionHeader number="F" title="Contacto de Administración" />

                <Label text="Persona de Administración" />
                <Input placeholder="Nombre del administrador"
                  value={personaAdmin} onChangeText={setPersonaAdmin} />

                <Label text="Correo Electrónico Administración" />
                <Input placeholder="admin@empresa.com"
                  value={correoAdmin} onChangeText={setCorreoAdmin}
                  keyboardType="email-address" autoCapitalize="none" />

                <Label text="Teléfono Administración" />
                <Input placeholder="Número de administración"
                  value={telfAdmin} onChangeText={setTelfAdmin} keyboardType="phone-pad" />

                {/* ── LOGÍSTICA Y VENTA ── */}
                <SectionHeader number="G" title="Logística y Condiciones de Venta" />

                <Label text="Compra Promedio Mensual ($)" />
                <Input placeholder="Monto estimado en dólares"
                  value={compraPromedio} onChangeText={setCompraPromedio} keyboardType="numeric" />

                <Label text="¿Dónde Recibe la Mercancía?" />
                <View style={s.pickerBox}>
                  <Picker selectedValue={dondeRecibe} onValueChange={setDondeRecibe}>
                    <Picker.Item color="#1A2B3C" label="Seleccione..." value="" />
                    <Picker.Item color="#1A2B3C" label="En el local" value="En el local" />
                    <Picker.Item color="#1A2B3C" label="Almacén propio" value="Almacén propio" />
                    <Picker.Item color="#1A2B3C" label="Centro de distribución" value="Centro de distribución" />
                    <Picker.Item color="#1A2B3C" label="Otro" value="Otro" />
                  </Picker>
                </View>

                <Label text="Frecuencia de Compra" />
                <View style={s.pickerBox}>
                  <Picker selectedValue={frecuenciaCompra} onValueChange={setFrecuenciaCompra}>
                    <Picker.Item color="#1A2B3C" label="Semanal" value="Semanal"/>
                    <Picker.Item color="#1A2B3C" label="Quincenal" value="Quincenal"/>
                    <Picker.Item color="#1A2B3C" label="Mensual" value="Mensual"/>
                    <Picker.Item color="#1A2B3C" label="Bimestral" value="Bimestral"/>
                  </Picker>
                </View>

                <View style={s.rowTwo}>
                  <View style={{ flex: 1 }}>
                    <Label text="Día de Visita" />
                    <View style={s.pickerBox}>
                      <Picker selectedValue={diaVisita} onValueChange={setDiaVisita}>
                        <Picker.Item color="#1A2B3C" label="Lunes" value="Lunes" />
                        <Picker.Item color="#1A2B3C" label="Martes" value="Martes" />
                        <Picker.Item color="#1A2B3C" label="Miércoles" value="Miercoles" />
                        <Picker.Item color="#1A2B3C" label="Jueves" value="Jueves" />
                        <Picker.Item color="#1A2B3C" label="Viernes" value="Viernes" />
                        <Picker.Item color="#1A2B3C" label="Sábado" value="Sabado" />
                      </Picker>
                    </View>
                  </View>
                  <View style={{ width: 8 }} />
                  <View style={{ flex: 1 }}>
                    <Label text="Horario Visita" />
                    <Input style={{ marginBottom: 0 }} placeholder="Ej: 9am - 12pm"
                      value={horarioVisita} onChangeText={setHorarioVisita} />
                  </View>
                </View>

                <View style={s.rowTwo}>
                  <View style={{ flex: 1 }}>
                    <Label text="Día de Entregas" />
                    <View style={s.pickerBox}>
                      <Picker selectedValue={diaEntrega} onValueChange={setDiaEntrega}>
                        <Picker.Item color="#1A2B3C" label="Lunes" value="Lunes" />
                        <Picker.Item color="#1A2B3C" label="Martes" value="Martes" />
                        <Picker.Item color="#1A2B3C" label="Miércoles" value="Miercoles" />
                        <Picker.Item color="#1A2B3C" label="Jueves" value="Jueves" />
                        <Picker.Item color="#1A2B3C" label="Viernes" value="Viernes" />
                        <Picker.Item color="#1A2B3C" label="Sábado" value="Sabado" />
                      </Picker>
                    </View>
                  </View>
                  <View style={{ width: 8 }} />
                  <View style={{ flex: 1 }}>
                    <Label text="Horario Entregas" />
                    <Input style={{ marginBottom: 0 }} placeholder="Ej: 2pm - 5pm"
                      value={horarioEntrega} onChangeText={setHorarioEntrega} />
                  </View>
                </View>

                <Label text="Método de Pago" />
                <View style={s.pickerBox}>
                  <Picker selectedValue={metodoPago} onValueChange={setMetodoPago}>
                    <Picker.Item color="#1A2B3C" label="Seleccione..." value="" />
                    <Picker.Item color="#1A2B3C" label="Transferencia Bancaria" value="Transferencia" />
                    <Picker.Item color="#1A2B3C" label="Zelle" value="Zelle" />
                    <Picker.Item color="#1A2B3C" label="Efectivo USD" value="Efectivo USD" />
                    <Picker.Item color="#1A2B3C" label="Efectivo BsD" value="Efectivo BsD" />
                    <Picker.Item color="#1A2B3C" label="Pago Móvil" value="Pago Móvil" />
                    <Picker.Item color="#1A2B3C" label="Crédito" value="Crédito" />
                  </Picker>
                </View>

                {/* ── OBSERVACIONES ── */}
                <SectionHeader number="H" title="Observaciones" />
                <Input
                  style={{ height: 90, textAlignVertical: 'top', paddingTop: 10 }}
                  placeholder="Notas adicionales sobre el cliente..."
                  value={observaciones} onChangeText={setObservaciones}
                  multiline numberOfLines={4} />
              </>
            )}

            {/* ── BOTÓN GUARDAR ── */}
            <TouchableOpacity style={s.btnGuardar} onPress={handleSubmit}
              disabled={isLoading} activeOpacity={0.85}>
              {isLoading
                ? <ActivityIndicator color="#fff" />
                : <Text style={s.btnGuardarText}>GUARDAR CENSO</Text>
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
  preFillBanner: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: '#EBF5FB', borderRadius: 12, padding: 12, marginBottom: 16, borderWidth: 1, borderColor: '#AED6F1' },
  preFillText: { fontSize: 12, color: '#1B4F72', fontWeight: '600', flex: 1, lineHeight: 18 },
  statusCard: { backgroundColor: C.white, borderRadius: 14, padding: 16, marginBottom: 8, borderWidth: 1, borderColor: C.border, elevation: 2 },
  statusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statusLabel: { fontSize: 12, color: C.textSec, fontWeight: '600', marginBottom: 2 },
  statusValue: { fontSize: 14, fontWeight: '800' },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: C.white, borderRadius: 10, borderWidth: 1, borderColor: C.border, padding: 12, marginBottom: 12 },
  switchLabel: { fontSize: 13, fontWeight: '700', color: C.text },
  // ── Switch "Datos adicionales" ──
  switchToggleCard: { backgroundColor: C.white, borderRadius: 14, padding: 16, marginTop: 20, marginBottom: 4, borderWidth: 1.5, borderColor: C.primary + '40', elevation: 1 },
  switchToggleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  switchToggleTitle: { fontSize: 14, fontWeight: '800', color: C.primary, marginBottom: 2 },
  switchToggleSub: { fontSize: 11, color: C.textSec, lineHeight: 15 },
  // ── Secciones ──
  sectionWrap: { flexDirection: 'row', alignItems: 'center', marginTop: 24, marginBottom: 14 },
  sectionBullet: { width: 26, height: 26, borderRadius: 13, backgroundColor: C.primary, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  sectionNum: { color: '#fff', fontSize: 12, fontWeight: '800' },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: C.text, flex: 1 },
  addBtn: { backgroundColor: C.primary + '18', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 5, borderWidth: 1, borderColor: C.primary + '40' },
  addBtnText: { color: C.primary, fontWeight: '700', fontSize: 12 },
  label: { fontSize: 12, fontWeight: '700', color: C.textSec, marginBottom: 5, letterSpacing: 0.3 },
  input: { backgroundColor: C.white, height: 46, borderRadius: 10, paddingHorizontal: 14, borderWidth: 1, borderColor: C.border, fontSize: 14, color: '#1A2B3C', marginBottom: 12 },
  inputAlt: { backgroundColor: '#EBF5FB', height: 46, borderRadius: 10, paddingHorizontal: 14, borderWidth: 1.5, borderColor: C.primary, fontSize: 14, color: '#1A2B3C', marginBottom: 12 },
  pickerBox: { backgroundColor: C.white, borderRadius: 10, borderWidth: 1, borderColor: C.border, height: 46, justifyContent: 'center', marginBottom: 12 },
  pickerSmallWrap: { width: 110, backgroundColor: C.white, borderRadius: 10, borderWidth: 1, borderColor: C.border, height: 46, justifyContent: 'center' },
  rifRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  rowTwo: { flexDirection: 'row', marginBottom: 12 },
  rowThree: { flexDirection: 'row', marginBottom: 0 },
  productoCard: { backgroundColor: C.white, borderRadius: 12, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: C.border, borderLeftWidth: 4, borderLeftColor: C.accent },
  productoHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  productoNum: { fontSize: 12, fontWeight: '800', color: C.accent },
  deleteBtn: { padding: 4 },
  gpsInfo: { backgroundColor: '#E8F4FD', borderRadius: 10, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: '#BEE3F8' },
  gpsText: { fontSize: 12, color: C.primary, fontWeight: '600', textAlign: 'center' },
  btnGuardar: { backgroundColor: C.primary, height: 56, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginTop: 20, elevation: 4, shadowColor: C.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
  btnGuardarText: { color: '#fff', fontWeight: '800', fontSize: 16, letterSpacing: 1 },
});

