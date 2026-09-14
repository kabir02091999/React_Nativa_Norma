import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet, Text, View, TextInput, TouchableOpacity, Alert,
  ScrollView, ActivityIndicator, Switch, FlatList,
  KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard, Modal
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { Picker } from '@react-native-picker/picker';
import { Calendar } from 'react-native-calendars';

import { buscarLocalesPorNombre, guardarVenta as guardarVentaDB, actualizarLocal, insertLocal1 } from '../../utils/db';

// ─── COLORES ─────────────────────────────────────────────────────────────────
const C = {
  bg: '#F4F6F9', white: '#FFFFFF', primary: '#1B4F72',
  accent: '#E67E22', danger: '#E74C3C', success: '#27AE60',
  border: '#D5E0EC', text: '#1A2B3C', textSec: '#5D7A8A',
  placeholder: '#9DB2BF', lightBlue: '#EBF5FB',
};

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const Input = ({ style, ...props }) => (
  <TextInput
    placeholderTextColor={C.placeholder}
    style={[s.input, style]}
    {...props}
  />
);

const SectionHeader = ({ icon, title }) => (
  <View style={s.sectionWrap}>
    <Ionicons name={icon} size={18} color={C.primary} />
    <Text style={s.sectionTitle}>{title}</Text>
  </View>
);

const fmtFechaDespacho = (isoDate) => {
  if (!isoDate) return '';
  // isoDate viene como 'YYYY-MM-DD' del Calendar
  const [year, month, day] = isoDate.split('-');
  const fecha = new Date(year, month - 1, day);
  return fecha.toLocaleDateString('es-VE', { day: '2-digit', month: 'short', year: 'numeric' });
};


const SwitchRow = ({ label, sublabel, value, onValueChange, color }) => (
  <View style={s.switchRow}>
    <View style={{ flex: 1 }}>
      <Text style={s.switchLabel}>{label}</Text>
      {sublabel ? <Text style={s.switchSub}>{sublabel}</Text> : null}
    </View>
    <Switch
      value={value}
      onValueChange={onValueChange}
      trackColor={{ false: C.border, true: color || C.primary }}
      thumbColor="#fff"
    />
  </View>
);

const PRODUCTOS_LISTA = [
  'Pads Entrenamiento 60x40', 'Pads Entrenamiento 60x60', 'Toallas Húmedas',
  'Bolsas para Desechos', 'Papel Film Alimenticio', 'Papel Film Industrial', 'Kinesiológicas', 'Vendas Adhesivas', 'Airfryer',
  'Valvula', 'Cauchos 110 90 R16', 'Cauchos 275 R18', 'Cauchos 90 90 R18', 'Tripas 110 90 R16', 'Tripas 275 R18', 'Tripas 90 90 R18', 'Pañales para Mascotas S',
  'Pañales para Mascotas M', 'Pañales para Mascotas L', 'Otros',
];
const TIPOS_CLIENTE = [
  { label: 'Carnicería', value: 'Carniceria' },
  { label: 'Charcutería', value: 'Charcuteria' },
  { label: 'Panadería y Pastelería', value: 'Panaderia' },
  { label: 'Supermercados', value: 'Supermercados' },
  { label: 'Abastos y Bodegas', value: 'Bodegas' },
  { label: 'Bodegones', value: 'Bodegones' },
  { label: 'Restaurantes', value: 'Restaurantes' },
  { label: 'Cantinas y Loncherías', value: 'Cantinas' },
  { label: 'Hoteles', value: 'Hoteles' },
  { label: 'Ferreterías', value: 'Ferreterias' },
  { label: 'Farmacia', value: 'Farmacia' },
  { label: 'Repuesto', value: 'Repuesto' },
  { label: 'Tiendas de Mascotas', value: 'Mascotas' },
  { label: 'Veterinarias', value: 'Veterinarias' },
  { label: 'Residencias para Animales', value: 'ResidenciasAnimales' },
  { label: 'Cadenas de Supermercados', value: 'CadenasSuper' },
  { label: 'Cadenas de Farmacias', value: 'CadenasFarmacias' },
  { label: 'Cadenas de Ferreterías', value: 'CadenasFerreterias' },
  { label: 'Cadenas de Pet Shop', value: 'CadenasPetShop' },
  { label: 'Cadenas de Repuestos', value: 'CadenasRepuestos' },
  { label: 'Mayoristas', value: 'Mayoristas' },
  { label: 'Distribuidores', value: 'Distribuidores' },
  { label: 'Freelance', value: 'Freelance' },
  { label: 'Otros (Especificar)', value: 'Otros' },
];

const DIAS_SEMANA = [
  { label: 'Lun', value: 'Lunes' },
  { label: 'Mar', value: 'Martes' },
  { label: 'Mié', value: 'Miércoles' },
  { label: 'Jue', value: 'Jueves' },
  { label: 'Vie', value: 'Viernes' },
  { label: 'Sáb', value: 'Sábado' },
  { label: 'Dom', value: 'Domingo' },
];

// ─── COMPONENTE PRINCIPAL ─────────────────────────────────────────────────────
export default function Venta() {
  // ── Buscador de local ──
  const [busqueda, setBusqueda] = useState('');
  const [resultados, setResultados] = useState([]);
  const [localSeleccionado, setLocal] = useState(null);
  const [buscando, setBuscando] = useState(false);

  // ── Switches ──
  const [esContribuyente, setContribuyente] = useState(false); // Switch conservado (no afecta total)
  const [esFactura, setEsFactura] = useState(true);
  const [esCredito, setEsCredito] = useState(false);
  const [diasCredito, setDiasCredito] = useState('7');
  const [esUSD, setEsUSD] = useState(true);

  // ── Despacho: 'vendedor' | 'ecoinn' ──
  const [tipoDespacho, setTipoDespacho] = useState('vendedor');
  const [diaDespacho, setDiaDespacho] = useState('');
  const [mostrarCalendario, setMostrarCalendario] = useState(false);

  // ── Productos ──
  const [productos, setProductos] = useState([
    { id: Date.now(), nombre: '', nombrePersonalizado: '', cantidad: '', precio: '' }
  ]);

  // ── Estado general ──
  const [isLoading, setIsLoading] = useState(false);

  // ── Buscar locales en SQLite ──
  const buscarLocales = useCallback(async (texto) => {
    if (!texto.trim()) { setResultados([]); return; }
    setBuscando(true);
    try {
      const filas = await buscarLocalesPorNombre(texto);
      setResultados(filas);
    } catch (e) {
      console.error(e);
      setResultados([]);
    } finally {
      setBuscando(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => buscarLocales(busqueda), 300);
    return () => clearTimeout(timer);
  }, [busqueda, buscarLocales]);

  const seleccionarLocal = (local) => {
    setLocal(local);
    setBusqueda(local.razon_social);
    setResultados([]);
    Keyboard.dismiss();
  };

  // ── Productos ──
  const agregarProducto = () =>
    setProductos(prev => [
      ...prev,
      { id: Date.now(), nombre: '', nombrePersonalizado: '', cantidad: '', precio: '' }
    ]);

  const actualizarProducto = (id, campo, valor) =>
    setProductos(prev => prev.map(p => p.id === id ? { ...p, [campo]: valor } : p));

  const eliminarProducto = (id) =>
    setProductos(prev => prev.filter(p => p.id !== id));

  // ── Cálculo (sin IVA, el total = subtotal) ──
  const calcularSubtotal = () => {
    return productos.reduce((acc, p) => {
      const cant = parseFloat(p.cantidad) || 0;
      const prec = parseFloat(p.precio) || 0;
      return acc + cant * prec;
    }, 0);
  };

  // ── Selección de despacho ──
  const seleccionarDespacho = (tipo) => {
    setTipoDespacho(tipo);
    if (tipo === 'ecoinn') setDiaDespacho(''); // si despacha Ecoinn no se pide día
  };

  const [modalCrear, setModalCrear] = useState(false);
  const [nuevoCliente, setNuevoCliente] = useState({
    razon_social: '',
    rif_ci: '',
    direccion_fiscal: '',
    telefono_principal: '',
    tipos_cliente: '',
    punto_referencia: '',
  });
  const [ubicacionCliente, setUbicacionCliente] = useState(null);
  const [cargandoUbicacion, setCargandoUbicacion] = useState(false);
  const subtotal = calcularSubtotal();
  const total = subtotal; // SIN IVA (independientemente del switch contribuyente)

  const monedaSimbolo = esUSD ? '$' : '$';
  const fmt = (n) => `${monedaSimbolo} ${n.toFixed(2)}`;

  // ── Guardar venta (iva = 0 siempre) ──
  const guardarVenta = async () => {
  if (!localSeleccionado) {
    Alert.alert('Falta el cliente', 'Selecciona un local antes de guardar.');
    return;
  }
  const productosValidos = productos.filter(p => p.nombre && parseFloat(p.cantidad) > 0);
  if (productosValidos.length === 0) {
    Alert.alert('Sin productos', 'Agrega al menos un producto con cantidad.');
    return;
  }
  if (esCredito && (!diasCredito || isNaN(parseInt(diasCredito)))) {
    Alert.alert('Días de crédito', 'Ingresa los días de crédito (7, 14 o 21).');
    return;
  }
  if (tipoDespacho === 'vendedor' && !diaDespacho) {
    Alert.alert('Día de despacho', 'Selecciona el día en que el vendedor despachará el pedido.');
    return;
  }

  setIsLoading(true);
  try {
    const productosJSON = JSON.stringify(
      productosValidos.map(p => ({
        nombre: p.nombre === 'Otros' ? (p.nombrePersonalizado || 'Otros') : p.nombre,
        cantidad: parseFloat(p.cantidad),
        precio: parseFloat(p.precio) || 0,
      }))
    );

    // 👇 NUEVO: arma el texto final de despacho
    const despachoFinal = tipoDespacho === 'vendedor'
      ? `Vendedor - ${fmtFechaDespacho(diaDespacho)}`
      : 'Ecoinn';

    await guardarVentaDB({
      local_id: localSeleccionado.id,
      razon_social: localSeleccionado.razon_social,
      rif_ci: localSeleccionado.rif_ci,
      contribuyente: esContribuyente ? 'contribuyente especial' : 'contribuyente ordinario',
      tipo_documento: esFactura ? 'factura' : 'nota_entrega',
      tipo_pago: esCredito ? 'credito' : 'contado',
      dias_credito: esCredito ? parseInt(diasCredito) : null,
      moneda: esUSD ? 'usd' : 'usd',
      productos_json: productosJSON,
      subtotal: subtotal,
      despacho: despachoFinal,   // 👈 ahora ya viene concatenado: "Vendedor - 23 sep 2026" o "Ecoinn"
      iva: 0,
      total: total,
      fecha: new Date().toISOString(),
    });

    Alert.alert('✅ Venta guardada', `Total: ${fmt(total)}`);
    resetForm();
  } catch (e) {
    console.error('Error guardando venta:', e);
    Alert.alert('Error', e.message || 'No se pudo guardar la venta.');
  } finally {
    setIsLoading(false);
  }
};

  const resetForm = () => {
    setLocal(null);
    setBusqueda('');
    setContribuyente(false);
    setEsFactura(true);
    setEsCredito(false);
    setDiasCredito('7');
    setEsUSD(true);
    setTipoDespacho('vendedor');
    setDiaDespacho('');
    setProductos([{ id: Date.now(), nombre: '', nombrePersonalizado: '', cantidad: '', precio: '' }]);
  };

  const [modalEditar, setModalEditar] = useState(false);
  const [localEditado, setLocalEditado] = useState(null);

  const abrirEditar = () => {
    setLocalEditado({ ...localSeleccionado });
    setModalEditar(true);
  };

  const guardarEdicion = async () => {
    if (!localEditado) return;
    try {
      await actualizarLocal(localEditado);   // ← aquí adentro
      setLocal(localEditado);
      setBusqueda(localEditado.razon_social);
      setModalEditar(false);
      Alert.alert('✅ Local actualizado');
    } catch (e) {
      Alert.alert('Error', e.message || 'No se pudo guardar.');
    }
  };

  const abrirCrearCliente = async () => {
    setNuevoCliente(prev => ({ ...prev, razon_social: busqueda }));
    setUbicacionCliente(null);
    setModalCrear(true);

    setCargandoUbicacion(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.log('Permiso de ubicación denegado');
        setCargandoUbicacion(false);
        return;
      }
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setUbicacionCliente({
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
      });
    } catch (e) {
      console.error('Error obteniendo ubicación:', e);
    } finally {
      setCargandoUbicacion(false);
    }
  };

  const guardarNuevoCliente = async () => {
    if (!nuevoCliente.razon_social.trim() || !nuevoCliente.rif_ci.trim()) {
      Alert.alert('Faltan datos', 'Razón social y RIF/CI son obligatorios.');
      return;
    }
    try {
      const nuevoId = await insertLocal1({
        ciRif: nuevoCliente.rif_ci.trim(),
        tipoLocal: nuevoCliente.tipos_cliente.trim(),
        nombreLocal: nuevoCliente.razon_social.trim(),
        ubicacionTexto: nuevoCliente.direccion_fiscal.trim(),
        location: ubicacionCliente,   // 👈 cambio aquí
        contribuyenteEspecial: 0,
        puntoReferencia: nuevoCliente.punto_referencia.trim(),
        telefonoPrincipal: nuevoCliente.telefono_principal.trim(),
      });

      const localCreado = {
        id: nuevoId,
        rif_ci: nuevoCliente.rif_ci.trim(),
        tipos_cliente: nuevoCliente.tipos_cliente.trim(),
        razon_social: nuevoCliente.razon_social.trim(),
        direccion_fiscal: nuevoCliente.direccion_fiscal.trim(),
        telefono_principal: nuevoCliente.telefono_principal.trim(),
        punto_referencia: nuevoCliente.punto_referencia.trim(),
        contribuyente_especial: 0,
        gps_latitud: ubicacionCliente?.latitude ?? null,
        gps_longitud: ubicacionCliente?.longitude ?? null,
      };

      setLocal(localCreado);
      setBusqueda(localCreado.razon_social);
      setResultados([]);
      setModalCrear(false);
      Alert.alert('✅ Cliente creado', 'El cliente fue registrado y seleccionado.');
    } catch (e) {
      Alert.alert('Error', e.message || 'No se pudo crear el cliente.');
    }
  };
  // ─── RENDER ───────────────────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={s.container}>

            {/* HEADER */}
            <View style={s.pageHeader}>
              <Text style={s.pageEyebrow}>ECOINN</Text>
              <Text style={s.pageTitle}>Nueva Venta</Text>
            </View>

            {/* 1. BUSCADOR DE LOCAL */}
            <SectionHeader icon="storefront-outline" title="Cliente / Local" />

            <View style={s.searchWrap}>
              <Ionicons name="search-outline" size={18} color={C.textSec} style={s.searchIcon} />
              <TextInput
                style={s.searchInput}
                placeholder="Buscar por razón social o RIF..."
                placeholderTextColor={C.placeholder}
                value={busqueda}
                onChangeText={(t) => { setBusqueda(t); setLocal(null); }}
              />
              {busqueda.length > 0 && (
                <TouchableOpacity onPress={() => { setBusqueda(''); setLocal(null); setResultados([]); }}>
                  <Ionicons name="close-circle" size={18} color={C.textSec} />
                </TouchableOpacity>
              )}
            </View>

            {buscando && <ActivityIndicator size="small" color={C.primary} style={{ marginVertical: 8 }} />}
            {resultados.length > 0 && !localSeleccionado && (
              <View style={s.dropdown}>
                {resultados.map(item => (
                  <TouchableOpacity
                    key={item.id}
                    style={s.dropdownItem}
                    onPress={() => seleccionarLocal(item)}
                  >
                    <Text style={s.dropdownName}>{item.razon_social}</Text>
                    <Text style={s.dropdownSub}>{item.rif_ci} · {item.direccion_fiscal || 'Sin dirección'}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}{!buscando && busqueda.trim().length > 0 && resultados.length === 0 && !localSeleccionado && (
              <TouchableOpacity style={s.crearClienteBtn} onPress={abrirCrearCliente}>
                <Ionicons name="add-circle-outline" size={18} color={C.primary} />
                <Text style={s.crearClienteText}>Crear cliente "{busqueda}"</Text>
              </TouchableOpacity>
            )}

            {localSeleccionado && (
              <View style={s.localCard}>
                <View style={{ flex: 1 }}>
                  <Text style={s.localNombre}>{localSeleccionado.razon_social}</Text>
                  <Text style={s.localSub}>
                    {localSeleccionado.rif_ci}
                    {localSeleccionado.telefono_principal ? ` · ${localSeleccionado.telefono_principal}` : ''}
                  </Text>
                  {localSeleccionado.direccion_fiscal ? (
                    <Text style={s.localDireccion} numberOfLines={1}>
                      {localSeleccionado.direccion_fiscal}
                    </Text>
                  ) : null}
                </View>

                {/* NUEVO: botón editar */}
                <TouchableOpacity
                  onPress={abrirEditar}
                  style={[s.deleteBtn, { backgroundColor: '#EBF5FB', marginRight: 8 }]}
                >
                  <Ionicons name="pencil-outline" size={16} color={C.primary} />
                </TouchableOpacity>

                <TouchableOpacity onPress={() => { setLocal(null); setBusqueda(''); }}>
                  <Ionicons name="close-circle-outline" size={22} color={C.danger} />
                </TouchableOpacity>
              </View>
            )}

            {/* 2. SWITCHES DE CONFIGURACIÓN (contribuyente conservado pero sin IVA) */}
            <SectionHeader icon="options-outline" title="Configuración del documento" />

            <View style={s.switchesCard}>
              <SwitchRow
                label={esContribuyente ? 'Contribuyente especial' : 'Contribuyente ordinario'}
                value={esContribuyente}
                onValueChange={setContribuyente}
                color={C.primary}
              />

              <View style={s.switchDivider} />

              <SwitchRow
                label={esFactura ? 'Factura' : 'Nota de Entrega'}
                sublabel={esFactura ? 'Documento fiscal' : 'Documento de despacho'}
                value={esFactura}
                onValueChange={setEsFactura}
                color={C.accent}
              />

              <View style={s.switchDivider} />

              {/* SELECTOR DE DESPACHO: Vendedor / Ecoinn */}
              <View style={s.creditoWrap}>
                <Text style={s.creditoLabel}>Despacho</Text>
                <View style={s.creditoBtns}>
                  <TouchableOpacity
                    style={[s.creditoBtn, tipoDespacho === 'vendedor' && s.despachoBtnActiveVendedor]}
                    onPress={() => seleccionarDespacho('vendedor')}
                  >
                    <Text style={[s.creditoBtnText, tipoDespacho === 'vendedor' && s.despachoBtnTextActiveVendedor]}>
                      Vendedor
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[s.creditoBtn, tipoDespacho === 'ecoinn' && s.despachoBtnActiveEcoinn]}
                    onPress={() => seleccionarDespacho('ecoinn')}
                  >
                    <Text style={[s.creditoBtnText, tipoDespacho === 'ecoinn' && s.despachoBtnTextActiveEcoinn]}>
                      Ecoinn
                    </Text>
                  </TouchableOpacity>
                </View>

                {tipoDespacho === 'vendedor' && (
                  <View style={{ marginTop: 12 }}>
                    <Text style={s.creditoLabel}>Día de despacho</Text>

                    <TouchableOpacity
                      style={s.fechaBtn}
                      onPress={() => setMostrarCalendario(true)}
                    >
                      <Ionicons name="calendar-outline" size={18} color={C.accent} />
                      <Text style={s.fechaBtnText}>
                        {diaDespacho ? diaDespacho : 'Seleccionar fecha...'}
                      </Text>
                    </TouchableOpacity>

                    {!diaDespacho && (
                      <Text style={s.diaHint}>Selecciona el día en que el vendedor entregará el pedido.</Text>
                    )}
                  </View>
                )}
              </View>

              <View style={s.switchDivider} />

              <SwitchRow
                label={esCredito ? 'Crédito' : 'Contado'}
                sublabel={esCredito ? 'Pago a plazo' : 'Pago inmediato'}
                value={esCredito}
                onValueChange={setEsCredito}
                color="#8E44AD"
              />

              {esCredito && (
                <View style={s.creditoWrap}>
                  <Text style={s.creditoLabel}>Días de crédito</Text>
                  <View style={s.creditoBtns}>
                    {['7', '14', '21'].map(d => (
                      <TouchableOpacity
                        key={d}
                        style={[s.creditoBtn, diasCredito === d && s.creditoBtnActive]}
                        onPress={() => setDiasCredito(d)}
                      >
                        <Text style={[s.creditoBtnText, diasCredito === d && s.creditoBtnTextActive]}>
                          {d} días
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <Input
                    style={s.creditoInput}
                    placeholder="O escribe los días..."
                    value={diasCredito}
                    onChangeText={setDiasCredito}
                    keyboardType="numeric"
                  />
                </View>
              )}

              <View style={s.switchDivider} />

              <SwitchRow
                label={esUSD ? 'Dólares (USD)' : 'Dólares (USD)'}
                sublabel={esUSD ? 'Precio en dólares' : 'Precio en bolívares'}
                value={esUSD}
                onValueChange={setEsUSD}
                color={C.success}
              />
            </View>

            {/* 3. PRODUCTOS */}
            <View style={s.sectionWrap}>
              <Ionicons name="cube-outline" size={18} color={C.primary} />
              <Text style={s.sectionTitle}>Productos</Text>
              <TouchableOpacity style={s.addBtn} onPress={agregarProducto}>
                <Text style={s.addBtnText}>+ Agregar</Text>
              </TouchableOpacity>
            </View>

            {productos.map((item, index) => (
              <View key={item.id} style={s.productoCard}>
                <View style={s.productoHeader}>
                  <Text style={s.productoNum}>Ítem #{index + 1}</Text>
                  {productos.length > 1 && (
                    <TouchableOpacity
                      onPress={() => eliminarProducto(item.id)}
                      style={s.deleteBtn}
                    >
                      <Ionicons name="trash-outline" size={16} color={C.danger} />
                    </TouchableOpacity>
                  )}
                </View>

                <View style={s.pickerBox}>
                  <Picker
                    selectedValue={item.nombre}
                    onValueChange={val => actualizarProducto(item.id, 'nombre', val)}
                    style={{ color: '#000000' }}
                    dropdownIconColor={'#000000'}
                  >
                    <Picker.Item
                      label="Seleccione producto..."
                      value=""
                      color={'#AAAAAA'}
                    />
                    {PRODUCTOS_LISTA.map(p => (
                      <Picker.Item
                        key={p}
                        label={p}
                        value={p}
                        color={'#000000'}
                      />
                    ))}
                  </Picker>
                </View>

                {item.nombre === 'Otros' && (
                  <Input
                    style={{ marginBottom: 8 }}
                    placeholder="¿Cuál producto?"
                    value={item.nombrePersonalizado}
                    onChangeText={val => actualizarProducto(item.id, 'nombrePersonalizado', val)}
                  />
                )}

                <View style={s.cantPrecioRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.miniLabel}>Cantidad</Text>
                    <Input
                      placeholder="0"
                      value={item.cantidad}
                      onChangeText={val => actualizarProducto(item.id, 'cantidad', val)}
                      keyboardType="numeric"
                      style={{ marginBottom: 0 }}
                    />
                  </View>
                  <View style={{ width: 10 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={s.miniLabel}>Precio {esUSD ? '(USD)' : '(USD)'}</Text>
                    <Input
                      placeholder="0.00"
                      value={item.precio}
                      onChangeText={val => actualizarProducto(item.id, 'precio', val)}
                      keyboardType="decimal-pad"
                      style={{ marginBottom: 0 }}
                    />
                  </View>
                  <View style={{ width: 10 }} />
                  <View style={s.itemTotalWrap}>
                    <Text style={s.miniLabel}>Subtotal</Text>
                    <Text style={s.itemTotal}>
                      {fmt((parseFloat(item.cantidad) || 0) * (parseFloat(item.precio) || 0))}
                    </Text>
                  </View>
                </View>
              </View>
            ))}

            {/* 4. RESUMEN DE TOTALES (sin IVA) */}
            <View style={s.totalesCard}>
              <Text style={s.totalesTitle}>Resumen</Text>

              <View style={s.totalesRow}>
                <Text style={s.totalesLabel}>Subtotal</Text>
                <Text style={s.totalesValue}>{fmt(subtotal)}</Text>
              </View>

              <View style={s.totalesDivider} />

              <View style={s.totalesRow}>
                <Text style={s.totalLabel}>TOTAL</Text>
                <Text style={s.totalValue}>{fmt(total)}</Text>
              </View>

              <View style={s.badgesRow}>
                <View style={[s.badge, { backgroundColor: C.lightBlue }]}>
                  <Text style={s.badgeText}>{esFactura ? 'Factura' : 'Nota de Entrega'}</Text>
                </View>
                <View style={[s.badge, { backgroundColor: esCredito ? '#F4ECF7' : '#EAFAF1' }]}>
                  <Text style={[s.badgeText, { color: esCredito ? '#8E44AD' : C.success }]}>
                    {esCredito ? `Crédito ${diasCredito}d` : 'Contado'}
                  </Text>
                </View>
                <View style={[s.badge, { backgroundColor: '#FDFEFE' }]}>
                  <Text style={s.badgeText}>{esUSD ? 'USD' : 'USD'}</Text>
                </View>
                <View style={[s.badge, { backgroundColor: tipoDespacho === 'vendedor' ? '#FDEBD0' : '#EAF3FF' }]}>
                  <Text style={[s.badgeText, { color: tipoDespacho === 'vendedor' ? C.accent : '#2E86C1' }]}>
                    {tipoDespacho === 'vendedor'
                      ? `Despacho: Vendedor${diaDespacho ? ` (${diaDespacho})` : ''}`
                      : 'Despacho: Ecoinn'}
                  </Text>
                </View>
                {esContribuyente && (
                  <View style={[s.badge, { backgroundColor: '#FEF9E7' }]}>
                    <Text style={[s.badgeText, { color: C.accent }]}>Contribuyente</Text>
                  </View>
                )}
              </View>
            </View>

            {/* BOTÓN GUARDAR */}
            <TouchableOpacity
              style={[s.btnGuardar, (!localSeleccionado || isLoading) && { opacity: 0.5 }]}
              onPress={guardarVenta}
              disabled={!localSeleccionado || isLoading}
              activeOpacity={0.85}
            >
              {isLoading
                ? <ActivityIndicator color="#fff" />
                : <>
                  <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
                  <Text style={s.btnGuardarText}>GUARDAR VENTA</Text>
                </>
              }
            </TouchableOpacity>

            <View style={{ height: 40 }} />
          </View>
        </TouchableWithoutFeedback>
      </ScrollView>

      <Modal
        visible={modalEditar}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalEditar(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1, backgroundColor: C.bg }}
        >
          <ScrollView contentContainerStyle={{ padding: 20 }}>

            {/* Header del modal */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 24, marginTop: 8 }}>
              <TouchableOpacity onPress={() => setModalEditar(false)} style={{ marginRight: 12 }}>
                <Ionicons name="close-outline" size={26} color={C.text} />
              </TouchableOpacity>
              <Text style={{ fontSize: 20, fontWeight: '900', color: C.primary, flex: 1 }}>
                Editar Local
              </Text>
              <TouchableOpacity
                onPress={guardarEdicion}
                style={{ backgroundColor: C.primary, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10 }}
              >
                <Text style={{ color: '#fff', fontWeight: '800', fontSize: 13 }}>GUARDAR</Text>
              </TouchableOpacity>
            </View>

            {localEditado && (
              <>
                {[
                  { label: 'Razón Social *', campo: 'razon_social' },
                  { label: 'RIF / CI *', campo: 'rif_ci' },
                  { label: 'Dirección Fiscal', campo: 'direccion_fiscal' },
                  { label: 'Zona / Punto de Referencia', campo: 'punto_referencia' },
                  { label: 'Teléfono Principal', campo: 'telefono_principal', keyboard: 'phone-pad' },
                  { label: 'Tipo de Cliente', campo: 'tipos_cliente' },
                ].map(({ label, campo, keyboard }) => (
                  <View key={campo} style={{ marginBottom: 16 }}>
                    <Text style={s.miniLabel}>{label}</Text>

                    {campo === 'tipos_cliente' ? (
                      <View style={s.pickerBox}>
                        <Picker
                          selectedValue={nuevoCliente.tipos_cliente}
                          onValueChange={val => setNuevoCliente(prev => ({ ...prev, tipos_cliente: val }))}
                          style={{ color: '#000000' }}
                          dropdownIconColor={'#000000'}
                        >
                          <Picker.Item label="Seleccione tipo de cliente..." value="" color="#AAAAAA" />
                          {TIPOS_CLIENTE.map(t => (
                            <Picker.Item key={t.value} label={t.label} value={t.value} color="#000000" />
                          ))}
                        </Picker>
                      </View>
                    ) : (
                      <TextInput
                        style={s.input}
                        value={nuevoCliente[campo]}
                        onChangeText={val => setNuevoCliente(prev => ({ ...prev, [campo]: val }))}
                        keyboardType={keyboard || 'default'}
                        placeholderTextColor={C.placeholder}
                        placeholder={`Ingresa ${label.toLowerCase().replace(' *', '')}...`}
                      />
                    )}
                  </View>
                ))}

              </>
            )}

            <View style={{ height: 40 }} />
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
      <Modal
        visible={modalCrear}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalCrear(false)}
      >
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, backgroundColor: C.bg }}>
          <ScrollView contentContainerStyle={{ padding: 20 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 24, marginTop: 8 }}>
              <TouchableOpacity onPress={() => setModalCrear(false)} style={{ marginRight: 12 }}>
                <Ionicons name="close-outline" size={26} color={C.text} />
              </TouchableOpacity>
              <Text style={{ fontSize: 20, fontWeight: '900', color: C.primary, flex: 1 }}>
                Nuevo Cliente
              </Text>
              <TouchableOpacity
                onPress={guardarNuevoCliente}
                style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: C.primary, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10 }}
              >
                {cargandoUbicacion && (
                  <ActivityIndicator size="small" color="#fff" style={{ marginRight: 6 }} />
                )}
                <Text style={{ color: '#fff', fontWeight: '800', fontSize: 13 }}>CREAR</Text>
              </TouchableOpacity>
            </View>

            {[
              { label: 'Razón Social *', campo: 'razon_social' },
              { label: 'RIF / CI *', campo: 'rif_ci' },
              { label: 'Dirección Fiscal', campo: 'direccion_fiscal' },
              { label: 'Zona / Punto de Referencia', campo: 'punto_referencia' },
              { label: 'Teléfono Principal', campo: 'telefono_principal', keyboard: 'phone-pad' },
              { label: 'Tipo de Cliente', campo: 'tipos_cliente' },
            ].map(({ label, campo, keyboard }) => (
              <View key={campo} style={{ marginBottom: 16 }}>
                <Text style={s.miniLabel}>{label}</Text>

                {campo === 'tipos_cliente' ? (
                  <View style={s.pickerBox}>
                    <Picker
                      selectedValue={nuevoCliente.tipos_cliente}
                      onValueChange={val => setNuevoCliente(prev => ({ ...prev, tipos_cliente: val }))}
                      style={{ color: '#000000' }}
                      dropdownIconColor={'#000000'}
                    >
                      <Picker.Item label="Seleccione tipo de cliente..." value="" color="#AAAAAA" />
                      {TIPOS_CLIENTE.map(t => (
                        <Picker.Item key={t.value} label={t.label} value={t.value} color="#000000" />
                      ))}
                    </Picker>
                  </View>
                ) : (
                  <TextInput
                    style={s.input}
                    value={nuevoCliente[campo]}
                    onChangeText={val => setNuevoCliente(prev => ({ ...prev, [campo]: val }))}
                    keyboardType={keyboard || 'default'}
                    placeholderTextColor={C.placeholder}
                    placeholder={`Ingresa ${label.toLowerCase().replace(' *', '')}...`}
                  />
                )}
              </View>
            ))}

            <View style={{ height: 40 }} />
          </ScrollView>
          
      
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        visible={mostrarCalendario}
        animationType="slide"
        transparent
        onRequestClose={() => setMostrarCalendario(false)}
      >
        <View style={s.calendarOverlay}>
          <View style={s.calendarCard}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <Text style={{ fontSize: 16, fontWeight: '800', color: C.primary }}>Selecciona el día</Text>
              <TouchableOpacity onPress={() => setMostrarCalendario(false)}>
                <Ionicons name="close-outline" size={24} color={C.text} />
              </TouchableOpacity>
            </View>

            <Calendar
              minDate={new Date().toISOString().split('T')[0]}
              onDayPress={(day) => {
                setDiaDespacho(day.dateString);
                setMostrarCalendario(false);
              }}
              markedDates={
                diaDespacho ? { [diaDespacho]: { selected: true, selectedColor: C.accent } } : {}
              }
              theme={{
                selectedDayBackgroundColor: C.accent,
                todayTextColor: C.primary,
                arrowColor: C.primary,
              }}
            />
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

// ─── ESTILOS ────────────────────────────────────────────────
const s = StyleSheet.create({
  scroll: { flexGrow: 1, backgroundColor: C.bg },
  container: { padding: 20 },
  pageHeader: { paddingTop: 16, paddingBottom: 20 },
  pageEyebrow: { fontSize: 10, fontWeight: '800', color: C.accent, letterSpacing: 3 },
  pageTitle: { fontSize: 26, fontWeight: '900', color: C.primary, marginTop: 2 },

  sectionWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 24, marginBottom: 14 },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: C.text, flex: 1 },
  addBtn: { backgroundColor: C.primary + '18', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 5, borderWidth: 1, borderColor: C.primary + '40' },
  addBtnText: { color: C.primary, fontWeight: '700', fontSize: 12 },

  searchWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.white, borderRadius: 12, borderWidth: 1, borderColor: C.border, paddingHorizontal: 12, height: 48, marginBottom: 4 },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 14, color: C.text },

  dropdown: { backgroundColor: C.white, borderRadius: 12, borderWidth: 1, borderColor: C.border, marginBottom: 8, overflow: 'hidden', elevation: 4 },
  dropdownItem: { padding: 12, borderBottomWidth: 1, borderBottomColor: C.border },
  dropdownName: { fontSize: 14, fontWeight: '700', color: C.text },
  dropdownSub: { fontSize: 11, color: C.textSec, marginTop: 2 },

  localCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.lightBlue, borderRadius: 12, padding: 14, marginBottom: 4, borderWidth: 1, borderColor: C.primary + '40' },
  localNombre: { fontSize: 14, fontWeight: '800', color: C.primary },
  localSub: { fontSize: 12, color: C.textSec, marginTop: 2 },
  localDireccion: { fontSize: 11, color: C.textSec, marginTop: 2 },
  crearClienteBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: C.lightBlue, borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: C.primary + '40', marginBottom: 8,
  },
  crearClienteText: { color: C.primary, fontWeight: '700', fontSize: 13 },

  switchesCard: { backgroundColor: C.white, borderRadius: 14, padding: 4, marginBottom: 4, borderWidth: 1, borderColor: C.border, elevation: 2 },
  switchRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 14 },
  switchLabel: { fontSize: 14, fontWeight: '700', color: C.text },
  switchSub: { fontSize: 11, color: C.textSec, marginTop: 1 },
  switchDivider: { height: 1, backgroundColor: C.border, marginHorizontal: 14 },

  creditoWrap: { paddingHorizontal: 14, paddingVertical: 14 },
  creditoLabel: { fontSize: 12, fontWeight: '700', color: C.textSec, marginBottom: 8 },
  creditoBtns: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  creditoBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, borderWidth: 1.5, borderColor: C.border, alignItems: 'center' },
  creditoBtnActive: { backgroundColor: '#F4ECF7', borderColor: '#8E44AD' },
  creditoBtnText: { fontSize: 13, fontWeight: '700', color: C.textSec },
  creditoBtnTextActive: { color: '#8E44AD' },
  creditoInput: { height: 42, marginBottom: 0 },

  // Selector de despacho: Vendedor (naranja) / Ecoinn (azul)
  despachoBtnActiveVendedor: { backgroundColor: '#FDEBD0', borderColor: C.accent },
  despachoBtnTextActiveVendedor: { color: C.accent },
  despachoBtnActiveEcoinn: { backgroundColor: '#EAF3FF', borderColor: '#2E86C1' },
  despachoBtnTextActiveEcoinn: { color: '#2E86C1' },

  diaDespachoWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  diaBtn: {
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10,
    borderWidth: 1.5, borderColor: C.border, backgroundColor: C.white,
  },
  diaBtnActive: { backgroundColor: '#FDEBD0', borderColor: C.accent },
  diaBtnText: { fontSize: 12, fontWeight: '700', color: C.textSec },
  diaBtnTextActive: { color: C.accent },
  diaHint: { fontSize: 11, color: C.danger, marginTop: 8, fontWeight: '600' },

  input: { backgroundColor: C.white, height: 46, borderRadius: 10, paddingHorizontal: 14, borderWidth: 1, borderColor: C.border, fontSize: 14, color: C.text, marginBottom: 12 },

  productoCard: { backgroundColor: C.white, borderRadius: 14, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: C.border, borderLeftWidth: 4, borderLeftColor: C.accent, elevation: 2 },
  productoHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  productoNum: { fontSize: 12, fontWeight: '800', color: C.accent },
  deleteBtn: { padding: 6, backgroundColor: '#FDEDEC', borderRadius: 8 },
  pickerBox: { backgroundColor: '#FFFFFF', borderRadius: 10, borderWidth: 1, borderColor: C.border, marginBottom: 10, overflow: 'hidden', },
  cantPrecioRow: { flexDirection: 'row', alignItems: 'flex-end' },
  miniLabel: { fontSize: 11, fontWeight: '700', color: C.textSec, marginBottom: 4 },
  itemTotalWrap: { flex: 1, alignItems: 'flex-end', justifyContent: 'flex-end', paddingBottom: 12 },
  itemTotal: { fontSize: 13, fontWeight: '800', color: C.primary },

  totalesCard: { backgroundColor: C.white, borderRadius: 14, padding: 18, marginTop: 8, borderWidth: 1, borderColor: C.border, elevation: 3 },
  totalesTitle: { fontSize: 13, fontWeight: '800', color: C.textSec, marginBottom: 12, letterSpacing: 1, textTransform: 'uppercase' },
  totalesRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  totalesLabel: { fontSize: 13, color: C.textSec },
  totalesValue: { fontSize: 13, fontWeight: '600', color: C.text },
  totalesDivider: { height: 1, backgroundColor: C.border, marginVertical: 10 },
  totalLabel: { fontSize: 16, fontWeight: '900', color: C.text },
  totalValue: { fontSize: 18, fontWeight: '900', color: C.primary },
  badgesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1, borderColor: C.border },
  badgeText: { fontSize: 11, fontWeight: '700', color: C.textSec },

  btnGuardar: { backgroundColor: C.primary, height: 56, borderRadius: 14, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10, marginTop: 20, elevation: 4, shadowColor: C.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
  btnGuardarText: { color: '#fff', fontWeight: '800', fontSize: 16, letterSpacing: 1 },
});