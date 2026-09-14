import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet, Text, View, FlatList, ActivityIndicator,
  TouchableOpacity, Alert, RefreshControl, Modal,
  ScrollView, TextInput, Switch, KeyboardAvoidingView, Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
//import { useFocusEffect } from '@react-navigation/native';
import { initDatabase, exportarVentasAExcel, borrarTodasVentas, actualizarVenta } from '../../utils/db';
import { usePathname } from 'expo-router';
// ─── COLORES ──────────────────────────────────────────────────────────────────
const C = {
  bg: '#F4F6F9', white: '#FFFFFF', primary: '#1B4F72',
  accent: '#E67E22', danger: '#E74C3C', success: '#27AE60',
  border: '#D5E0EC', text: '#1A2B3C', textSec: '#5D7A8A',
  lightBlue: '#EBF5FB', purple: '#8E44AD', placeholder: '#9DB2BF',
};

const PRODUCTOS_LISTA = [
  'Pads Entrenamiento 60x40', 'Pads Entrenamiento 60x60', 'Toallas Húmedas',
  'Bolsas para Desechos', 'Papel Film Alimenticio', 'Papel Film Industrial',
  'Cuellero', 'Kinesiológicas', 'Vendas Adhesivas', 'Airfryer',
  'Encendedores Recargables', 'Valvula', 'Cauchos 110 90 R16', 'Cauchos 275 R18',
  'Cauchos 90 90 R18', 'Tripas 110 90 R16', 'Tripas 275 R18', 'Tripas 90 90 R18',
  'Pañales para Mascotas S', 'Pañales para Mascotas M', 'Pañales para Mascotas L', 'Otros',
];

// ─── HELPERS ─────────────────────────────────────────────────────────────────
const fmt = (n, moneda) => {
  const s = moneda === 'usd' ? '$' : 'Bs';
  return `${s} ${(parseFloat(n) || 0).toFixed(2)}`;
};

const fmtFecha = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('es-VE', { day: '2-digit', month: 'short', year: 'numeric' })
    + ' ' + d.toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' });
};

const Badge = ({ label, color, bg }) => (
  <View style={[s.badge, { backgroundColor: bg, borderColor: color + '40' }]}>
    <Text style={[s.badgeText, { color }]}>{label}</Text>
  </View>
);

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

// ─── COMPONENTE PRINCIPAL ─────────────────────────────────────────────────────
export default function Pedidos() {
  const [ventas, setVentas] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandidos, setExpandidos] = useState({});
  const [db, setDb] = useState(null);

  // ── Estado modal edición ──
  const [modalEditar, setModalEditar] = useState(false);
  const [ventaEditada, setVentaEditada] = useState(null);
  const [esFactura, setEsFactura] = useState(true);
  const [esCredito, setEsCredito] = useState(false);
  const [diasCredito, setDiasCredito] = useState('7');
  const [esContribuyente, setEsContribuyente] = useState(false);
  const [esDespachoVendedor, setEsDespachoVendedor] = useState(true);
  const [productos, setProductos] = useState([]);
  const [guardando, setGuardando] = useState(false);

  // ── Init DB ──
  useEffect(() => {
    (async () => {
      try {
        await initDatabase();
        const SQLite = await import('expo-sqlite');
        const database = await SQLite.openDatabaseAsync('db.db');
        setDb(database);
      } catch (e) {
        console.error('Error init DB Pedidos:', e);
      }
    })();
  }, []);

  const cargarVentas = useCallback(async () => {
    if (!db) return;
    try {
      const rows = await db.getAllAsync(`
        SELECT v.id, v.fecha, v.razon_social, v.rif_ci,
          v.contribuyente, v.tipo_documento, v.tipo_pago,
          v.dias_credito, v.moneda, v.productos_json,
          v.subtotal, v.iva, v.total, v.despacho,
          l.direccion_fiscal, l.telefono_principal,
          l.tipos_cliente, l.punto_referencia,
          l.gps_latitud, l.gps_longitud
        FROM ventas v
        LEFT JOIN locales l ON v.local_id = l.id
        ORDER BY v.fecha DESC;
      `);
      setVentas(rows);
    } catch (e) {
      console.error('Error cargando ventas:', e);
    }
  }, [db]);

  const pathname = usePathname();

useEffect(() => {
  let activo = true;
  (async () => {
    setIsLoading(true);
    await cargarVentas();
    if (activo) setIsLoading(false);
  })();
  return () => { activo = false; };
}, [pathname, cargarVentas]);

  const onRefresh = async () => {
    setRefreshing(true);
    await cargarVentas();
    setRefreshing(false);
  };

  const handleBorrarTodo = () => {
    Alert.alert(
      '⚠️ Borrar todas las ventas',
      'Se eliminarán TODOS los pedidos. Esta acción no se puede deshacer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sí, borrar todo', style: 'destructive',
          onPress: async () => {
            try {
              await borrarTodasVentas();
              await cargarVentas();
              Alert.alert('✅ Listo', 'Todos los pedidos han sido eliminados.');
            } catch {
              Alert.alert('Error', 'No se pudo borrar las ventas.');
            }
          }
        }
      ]
    );
  };

  // ── Abrir modal edición ──
  const abrirEditar = (item) => {
    let prods = [];
    try { prods = JSON.parse(item.productos_json || '[]'); } catch (_) { }

    // Normalizar productos al formato del editor
    const prodsNormalizados = prods.map(p => ({
      id: Date.now() + Math.random(),
      nombre: PRODUCTOS_LISTA.includes(p.nombre) ? p.nombre : 'Otros',
      nombrePersonalizado: PRODUCTOS_LISTA.includes(p.nombre) ? '' : p.nombre,
      cantidad: String(p.cantidad),
      precio: String(p.precio),
    }));

    setVentaEditada({ ...item });
    setEsFactura(item.tipo_documento === 'factura');
    setEsCredito(item.tipo_pago === 'credito');
    setDiasCredito(String(item.dias_credito || '7'));
    setEsContribuyente(item.contribuyente === 'contribuyente especial');
    setEsDespachoVendedor(item.despacho !== 'empresa');
    setProductos(prodsNormalizados.length > 0
      ? prodsNormalizados
      : [{ id: Date.now(), nombre: '', nombrePersonalizado: '', cantidad: '', precio: '' }]
    );
    setModalEditar(true);
  };

  // ── Helpers productos en modal ──
  const agregarProducto = () =>
    setProductos(prev => [...prev, {
      id: Date.now(), nombre: '', nombrePersonalizado: '', cantidad: '', precio: ''
    }]);

  const actualizarProducto = (id, campo, valor) =>
    setProductos(prev => prev.map(p => p.id === id ? { ...p, [campo]: valor } : p));

  const eliminarProducto = (id) =>
    setProductos(prev => prev.filter(p => p.id !== id));

  const calcularTotal = () =>
    productos.reduce((acc, p) => acc + (parseFloat(p.cantidad) || 0) * (parseFloat(p.precio) || 0), 0);

  // ── Guardar edición ──
  const guardarEdicion = async () => {
    const productosValidos = productos.filter(p => p.nombre && parseFloat(p.cantidad) > 0);
    if (productosValidos.length === 0) {
      Alert.alert('Sin productos', 'Agrega al menos un producto con cantidad.');
      return;
    }

    setGuardando(true);
    try {
      const productosJSON = JSON.stringify(
        productosValidos.map(p => ({
          nombre: p.nombre === 'Otros' ? (p.nombrePersonalizado || 'Otros') : p.nombre,
          cantidad: parseFloat(p.cantidad),
          precio: parseFloat(p.precio) || 0,
        }))
      );
      const nuevoTotal = calcularTotal();

      await actualizarVenta({
        id: ventaEditada.id,
        contribuyente: esContribuyente ? 'contribuyente especial' : 'contribuyente ordinario',
        tipo_documento: esFactura ? 'factura' : 'nota_entrega',
        tipo_pago: esCredito ? 'credito' : 'contado',
        dias_credito: esCredito ? parseInt(diasCredito) : null,
        moneda: 'usd',
        productos_json: productosJSON,
        subtotal: nuevoTotal,
        iva: 0,
        total: nuevoTotal,
        despacho: esDespachoVendedor ? 'vendedor' : 'empresa',
      });

      await cargarVentas();
      setModalEditar(false);
      Alert.alert('✅ Pedido actualizado');
    } catch (e) {
      Alert.alert('Error', e.message || 'No se pudo guardar.');
    } finally {
      setGuardando(false);
    }
  };

  const toggleExpandir = (id) =>
    setExpandidos(prev => ({ ...prev, [id]: !prev[id] }));

  const totalGeneral = ventas.reduce((acc, v) => acc + (parseFloat(v.total) || 0), 0);
  const totalHoy = ventas
    .filter(v => v.fecha && new Date(v.fecha).toDateString() === new Date().toDateString())
    .reduce((acc, v) => acc + (parseFloat(v.total) || 0), 0);
  const monedaSimbolo = ventas.length > 0 && ventas[0]?.moneda === 'usd' ? '$' : 'Bs';

  // ─── RENDER TARJETA ──────────────────────────────────────────────────────
  const renderVenta = ({ item }) => {
    const expandida = expandidos[item.id];
    let productos_item = [];
    try { productos_item = JSON.parse(item.productos_json || '[]'); } catch (_) { }

    const colorDocumento = item.tipo_documento === 'factura' ? C.primary : C.accent;
    const colorPago = item.tipo_pago === 'credito' ? C.purple : C.success;

    return (
      <TouchableOpacity style={s.card} onPress={() => toggleExpandir(item.id)} activeOpacity={0.85}>
        <View style={s.cardHeader}>
          <View style={{ flex: 1 }}>
            <Text style={s.cardNombre} numberOfLines={1}>{item.razon_social}</Text>
            <Text style={s.cardRif}>{item.rif_ci}</Text>
          </View>
          <View style={{ alignItems: 'flex-end', gap: 4 }}>
            <Text style={s.cardTotal}>{fmt(item.total, item.moneda)}</Text>
            <Text style={s.cardFecha}>{fmtFecha(item.fecha)}</Text>
          </View>
        </View>

        <View style={s.badgesRow}>
          <Badge label={item.tipo_documento === 'factura' ? 'Factura' : 'Nota Entrega'}
            color={colorDocumento} bg={colorDocumento + '15'} />
          <Badge label={item.tipo_pago === 'credito' ? `Crédito ${item.dias_credito}d` : 'Contado'}
            color={colorPago} bg={colorPago + '15'} />
          <Badge label={item.moneda?.toUpperCase() || 'USD'} color={C.success} bg={C.success + '15'} />
          {item.despacho && (
            <Badge label={item.despacho?.startsWith('Vendedor') ? `🚗 ${item.despacho}` : `🏢 ${item.despacho || 'Ecoinn'}`}
              color={C.textSec} bg={C.border} />
          )}
        </View>

        {expandida && (
          <View style={s.detalle}>
            <View style={s.detalleDivider} />
            {item.direccion_fiscal ? (
              <View style={s.detalleRow}>
                <Ionicons name="location-outline" size={14} color={C.textSec} />
                <Text style={s.detalleText}>{item.direccion_fiscal}</Text>
              </View>
            ) : null}
            {item.telefono_principal ? (
              <View style={s.detalleRow}>
                <Ionicons name="call-outline" size={14} color={C.textSec} />
                <Text style={s.detalleText}>{item.telefono_principal}</Text>
              </View>
            ) : null}

            <Text style={s.productosTitle}>Productos</Text>
            {productos_item.map((p, i) => (
              <View key={i} style={s.productoRow}>
                <Text style={s.productoNombre} numberOfLines={1}>{p.nombre}</Text>
                <Text style={s.productoCant}>x{p.cantidad}</Text>
                <Text style={s.productoPrecio}>{fmt(p.precio, item.moneda)}</Text>
                <Text style={s.productoSubtotal}>
                  {fmt((p.cantidad || 0) * (p.precio || 0), item.moneda)}
                </Text>
              </View>
            ))}

            <View style={s.totalesWrap}>
              <View style={s.totalesRow}>
                <Text style={s.totalesLabel}>Subtotal</Text>
                <Text style={s.totalesVal}>{fmt(item.subtotal, item.moneda)}</Text>
              </View>
              <View style={[s.totalesRow, { marginTop: 4 }]}>
                <Text style={s.totalLabel}>TOTAL</Text>
                <Text style={s.totalVal}>{fmt(item.total, item.moneda)}</Text>
              </View>
            </View>

            {/* BOTÓN EDITAR dentro del detalle */}
            <TouchableOpacity style={s.btnEditar} onPress={() => abrirEditar(item)}>
              <Ionicons name="pencil-outline" size={16} color={C.primary} />
              <Text style={s.btnEditarText}>Editar pedido</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={s.expandBtn}>
          <Ionicons name={expandida ? 'chevron-up' : 'chevron-down'} size={16} color={C.textSec} />
        </View>
      </TouchableOpacity>
    );
  };

  // ─── HEADER ──────────────────────────────────────────────────────────────
  const ListHeader = () => (
    <View>
      <View style={s.resumenWrap}>
        <View style={s.resumenCard}>
          <Text style={s.resumenLabel}>HOY</Text>
          <Text style={s.resumenVal}>{monedaSimbolo} {totalHoy.toFixed(2)}</Text>
        </View>
        <View style={[s.resumenCard, { backgroundColor: C.primary }]}>
          <Text style={[s.resumenLabel, { color: 'rgba(255,255,255,0.7)' }]}>TOTAL</Text>
          <Text style={[s.resumenVal, { color: '#fff' }]}>{monedaSimbolo} {totalGeneral.toFixed(2)}</Text>
        </View>
        <View style={s.resumenCard}>
          <Text style={s.resumenLabel}>PEDIDOS</Text>
          <Text style={s.resumenVal}>{ventas.length}</Text>
        </View>
      </View>
      <View style={s.actionsRow}>
        <TouchableOpacity style={s.btnExportar} onPress={exportarVentasAExcel}>
          <Ionicons name="download-outline" size={20} color="#fff" />
          <Text style={s.btnExportarText}>EXPORTAR EXCEL</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.btnExportar, { backgroundColor: C.danger }]} onPress={handleBorrarTodo}>
          <Ionicons name="trash-outline" size={20} color="#fff" />
          <Text style={s.btnExportarText}>BORRAR TODO</Text>
        </TouchableOpacity>
      </View>
      <Text style={s.listaTitle}>Todos los pedidos</Text>
    </View>
  );

  const ListEmpty = () => (
    <View style={s.emptyWrap}>
      <Ionicons name="receipt-outline" size={64} color={C.border} />
      <Text style={s.emptyTitle}>Sin pedidos</Text>
      <Text style={s.emptySub}>Las ventas que registres aparecerán aquí.</Text>
    </View>
  );

  if (isLoading) {
    return (
      <View style={s.loadingWrap}>
        <ActivityIndicator size="large" color={C.primary} />
        <Text style={s.loadingText}>Cargando pedidos...</Text>
      </View>
    );
  }

  // ─── RENDER PRINCIPAL ─────────────────────────────────────────────────────
  return (
    <View style={s.container}>
      <View style={s.topHeader}>
        <Text style={s.headerTitle}>MIS PEDIDOS</Text>
        <Text style={s.headerSub}>{ventas.length} ventas registradas</Text>
      </View>

      <FlatList
        data={ventas}
        keyExtractor={item => item.id.toString()}
        renderItem={renderVenta}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={ListEmpty}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[C.primary]} />
        }
      />

      {/* ── MODAL EDITAR PEDIDO ── */}
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
          <ScrollView contentContainerStyle={{ padding: 20 }} keyboardShouldPersistTaps="handled">

            {/* Header modal */}
            <View style={s.modalHeader}>
              <TouchableOpacity onPress={() => setModalEditar(false)}>
                <Ionicons name="close-outline" size={26} color={C.text} />
              </TouchableOpacity>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={s.modalTitulo}>Editar Pedido</Text>
                {ventaEditada && (
                  <Text style={s.modalSub} numberOfLines={1}>{ventaEditada.razon_social}</Text>
                )}
              </View>
              <TouchableOpacity
                style={[s.btnGuardarModal, guardando && { opacity: 0.5 }]}
                onPress={guardarEdicion}
                disabled={guardando}
              >
                {guardando
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={s.btnGuardarModalText}>GUARDAR</Text>
                }
              </TouchableOpacity>
            </View>

            {/* Configuración */}
            <Text style={s.seccionLabel}>Configuración</Text>
            <View style={s.switchesCard}>
              <SwitchRow
                label={esContribuyente ? 'Contribuyente especial' : 'Contribuyente ordinario'}
                value={esContribuyente}
                onValueChange={setEsContribuyente}
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
              <SwitchRow
                label={esDespachoVendedor ? 'Despacho: Vendedor' : 'Despacho: Empresa'}
                sublabel={esDespachoVendedor ? 'El vendedor entrega el pedido' : 'La empresa despacha'}
                value={esDespachoVendedor}
                onValueChange={setEsDespachoVendedor}
                color="#16A085"
              />
              <View style={s.switchDivider} />
              <SwitchRow
                label={esCredito ? 'Crédito' : 'Contado'}
                sublabel={esCredito ? 'Pago a plazo' : 'Pago inmediato'}
                value={esCredito}
                onValueChange={setEsCredito}
                color={C.purple}
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
                  <TextInput
                    style={s.input}
                    placeholder="O escribe los días..."
                    placeholderTextColor={C.placeholder}
                    value={diasCredito}
                    onChangeText={setDiasCredito}
                    keyboardType="numeric"
                  />
                </View>
              )}
            </View>

            {/* Productos */}
            <View style={s.seccionHeaderRow}>
              <Text style={s.seccionLabel}>Productos</Text>
              <TouchableOpacity style={s.addBtn} onPress={agregarProducto}>
                <Text style={s.addBtnText}>+ Agregar</Text>
              </TouchableOpacity>
            </View>

            {productos.map((item, index) => (
              <View key={item.id} style={s.productoCard}>
                <View style={s.productoHeader}>
                  <Text style={s.productoNum}>Ítem #{index + 1}</Text>
                  {productos.length > 1 && (
                    <TouchableOpacity onPress={() => eliminarProducto(item.id)} style={s.deleteBtn}>
                      <Ionicons name="trash-outline" size={16} color={C.danger} />
                    </TouchableOpacity>
                  )}
                </View>

                <View style={s.pickerBox}>
                  <Picker
                    selectedValue={item.nombre}
                    onValueChange={val => actualizarProducto(item.id, 'nombre', val)}
                    style={{ color: '#000' }}
                    dropdownIconColor="#000"
                  >
                    <Picker.Item label="Seleccione producto..." value="" color="#AAAAAA" />
                    {PRODUCTOS_LISTA.map(p => (
                      <Picker.Item key={p} label={p} value={p} color="#000" />
                    ))}
                  </Picker>
                </View>

                {item.nombre === 'Otros' && (
                  <TextInput
                    style={[s.input, { marginBottom: 8 }]}
                    placeholder="¿Cuál producto?"
                    placeholderTextColor={C.placeholder}
                    value={item.nombrePersonalizado}
                    onChangeText={val => actualizarProducto(item.id, 'nombrePersonalizado', val)}
                  />
                )}

                <View style={s.cantPrecioRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.miniLabel}>Cantidad</Text>
                    <TextInput
                      style={[s.input, { marginBottom: 0 }]}
                      placeholder="0"
                      placeholderTextColor={C.placeholder}
                      value={item.cantidad}
                      onChangeText={val => actualizarProducto(item.id, 'cantidad', val)}
                      keyboardType="numeric"
                    />
                  </View>
                  <View style={{ width: 10 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={s.miniLabel}>Precio (USD)</Text>
                    <TextInput
                      style={[s.input, { marginBottom: 0 }]}
                      placeholder="0.00"
                      placeholderTextColor={C.placeholder}
                      value={item.precio}
                      onChangeText={val => actualizarProducto(item.id, 'precio', val)}
                      keyboardType="decimal-pad"
                    />
                  </View>
                  <View style={{ width: 10 }} />
                  <View style={s.itemTotalWrap}>
                    <Text style={s.miniLabel}>Subtotal</Text>
                    <Text style={s.itemTotal}>
                      $ {((parseFloat(item.cantidad) || 0) * (parseFloat(item.precio) || 0)).toFixed(2)}
                    </Text>
                  </View>
                </View>
              </View>
            ))}

            {/* Resumen total */}
            <View style={s.totalesCard}>
              <View style={s.totalesRow}>
                <Text style={s.totalLabel}>TOTAL</Text>
                <Text style={s.totalVal}>$ {calcularTotal().toFixed(2)}</Text>
              </View>
            </View>

            <View style={{ height: 40 }} />
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

// ─── ESTILOS ──────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: C.bg },
  loadingText: { marginTop: 12, color: C.primary, fontWeight: '600' },

  topHeader: { paddingTop: 60, paddingBottom: 20, backgroundColor: C.primary, alignItems: 'center', borderBottomLeftRadius: 20, borderBottomRightRadius: 20 },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '900', letterSpacing: 1 },
  headerSub: { color: 'rgba(255,255,255,0.6)', fontSize: 12, marginTop: 4 },

  resumenWrap: { flexDirection: 'row', gap: 10, marginBottom: 14, marginTop: 4 },
  resumenCard: { flex: 1, backgroundColor: C.white, borderRadius: 12, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: C.border, elevation: 2 },
  resumenLabel: { fontSize: 10, fontWeight: '800', color: C.textSec, letterSpacing: 1 },
  resumenVal: { fontSize: 16, fontWeight: '900', color: C.text, marginTop: 4 },

  actionsRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  btnExportar: { flex: 1, backgroundColor: C.success, borderRadius: 12, padding: 14, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, elevation: 3 },
  btnExportarText: { color: '#fff', fontWeight: '800', fontSize: 14, letterSpacing: 0.5 },

  listaTitle: { fontSize: 13, fontWeight: '800', color: C.textSec, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 },

  card: { backgroundColor: C.white, borderRadius: 14, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: C.border, elevation: 3 },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  cardNombre: { fontSize: 15, fontWeight: '800', color: C.text },
  cardRif: { fontSize: 11, color: C.textSec, marginTop: 2 },
  cardTotal: { fontSize: 16, fontWeight: '900', color: C.primary },
  cardFecha: { fontSize: 10, color: C.textSec },

  badgesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, borderWidth: 1 },
  badgeText: { fontSize: 10, fontWeight: '800' },

  expandBtn: { alignItems: 'center', marginTop: 10 },
  detalle: { marginTop: 4 },
  detalleDivider: { height: 1, backgroundColor: C.border, marginVertical: 12 },
  detalleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  detalleText: { fontSize: 12, color: C.textSec, flex: 1 },

  productosTitle: { fontSize: 11, fontWeight: '800', color: C.textSec, letterSpacing: 1, textTransform: 'uppercase', marginTop: 8, marginBottom: 8 },
  productoRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: C.border + '80' },
  productoNombre: { flex: 2, fontSize: 12, color: C.text, fontWeight: '600' },
  productoCant: { flex: 0.5, fontSize: 12, color: C.textSec, textAlign: 'center' },
  productoPrecio: { flex: 1, fontSize: 12, color: C.textSec, textAlign: 'right' },
  productoSubtotal: { flex: 1, fontSize: 12, color: C.primary, fontWeight: '700', textAlign: 'right' },

  totalesWrap: { backgroundColor: C.lightBlue, borderRadius: 10, padding: 12, marginTop: 12 },
  totalesRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  totalesLabel: { fontSize: 12, color: C.textSec },
  totalesVal: { fontSize: 12, fontWeight: '600', color: C.text },
  totalLabel: { fontSize: 14, fontWeight: '900', color: C.text },
  totalVal: { fontSize: 16, fontWeight: '900', color: C.primary },

  btnEditar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 14, backgroundColor: C.lightBlue, borderRadius: 10, paddingVertical: 10, borderWidth: 1, borderColor: C.primary + '40' },
  btnEditarText: { color: C.primary, fontWeight: '800', fontSize: 13 },

  emptyWrap: { alignItems: 'center', paddingTop: 60 },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: C.text, marginTop: 16 },
  emptySub: { fontSize: 13, color: C.textSec, marginTop: 6, textAlign: 'center' },

  // Modal
  modalHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 24, marginTop: 8 },
  modalTitulo: { fontSize: 18, fontWeight: '900', color: C.primary },
  modalSub: { fontSize: 12, color: C.textSec, marginTop: 2 },
  btnGuardarModal: { backgroundColor: C.primary, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10 },
  btnGuardarModalText: { color: '#fff', fontWeight: '800', fontSize: 13 },

  seccionLabel: { fontSize: 13, fontWeight: '800', color: C.textSec, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10, marginTop: 20 },
  seccionHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 20, marginBottom: 10 },
  addBtn: { backgroundColor: C.primary + '18', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 5, borderWidth: 1, borderColor: C.primary + '40' },
  addBtnText: { color: C.primary, fontWeight: '700', fontSize: 12 },

  switchesCard: { backgroundColor: C.white, borderRadius: 14, padding: 4, marginBottom: 4, borderWidth: 1, borderColor: C.border, elevation: 2 },
  switchRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 14 },
  switchLabel: { fontSize: 14, fontWeight: '700', color: C.text },
  switchSub: { fontSize: 11, color: C.textSec, marginTop: 1 },
  switchDivider: { height: 1, backgroundColor: C.border, marginHorizontal: 14 },

  creditoWrap: { paddingHorizontal: 14, paddingBottom: 14 },
  creditoLabel: { fontSize: 12, fontWeight: '700', color: C.textSec, marginBottom: 8 },
  creditoBtns: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  creditoBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, borderWidth: 1.5, borderColor: C.border, alignItems: 'center' },
  creditoBtnActive: { backgroundColor: '#F4ECF7', borderColor: C.purple },
  creditoBtnText: { fontSize: 13, fontWeight: '700', color: C.textSec },
  creditoBtnTextActive: { color: C.purple },

  input: { backgroundColor: C.white, height: 46, borderRadius: 10, paddingHorizontal: 14, borderWidth: 1, borderColor: C.border, fontSize: 14, color: C.text, marginBottom: 12 },
  productoCard: { backgroundColor: C.white, borderRadius: 14, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: C.border, borderLeftWidth: 4, borderLeftColor: C.accent, elevation: 2 },
  productoHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  productoNum: { fontSize: 12, fontWeight: '800', color: C.accent },
  deleteBtn: { padding: 6, backgroundColor: '#FDEDEC', borderRadius: 8 },
  pickerBox: { backgroundColor: '#FFF', borderRadius: 10, borderWidth: 1, borderColor: C.border, marginBottom: 10, overflow: 'hidden' },
  cantPrecioRow: { flexDirection: 'row', alignItems: 'flex-end' },
  miniLabel: { fontSize: 11, fontWeight: '700', color: C.textSec, marginBottom: 4 },
  itemTotalWrap: { flex: 1, alignItems: 'flex-end', justifyContent: 'flex-end', paddingBottom: 12 },
  itemTotal: { fontSize: 13, fontWeight: '800', color: C.primary },
  totalesCard: { backgroundColor: C.lightBlue, borderRadius: 12, padding: 16, marginTop: 8 },
});