import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, ActivityIndicator,
  TouchableOpacity, Alert, StatusBar
} from 'react-native';
import { getCensoLocal, exportarCensoAExcel, borrarCensoLocal } from '../../../utils/db';
import { Ionicons } from '@expo/vector-icons';

// ─── PALETA ──────────────────────────────────────────────────────────────────
const C = {
  bg:         '#F0F4F8',
  surface:    '#FFFFFF',
  surfaceAlt: '#EBF2FA',
  border:     '#D6E4F0',
  accent:     '#1B4F72',   // verde teal
  warn:       '#C0392B',   // rojo ladrillo
  gold:       '#E67E22',   // naranja para Prospecto
  textPri:    '#1A2B3C',
  textSec:    '#8FA8BE',
  textMuted:  '#8FA8BE',
};

// ─── SUB-COMPONENTES ──────────────────────────────────────────────────────────

const StatChip = ({ label, value, color }) => (
  <View style={[chipStyles.wrap, { borderColor: color }]}>
    <Text style={[chipStyles.value, { color }]}>{value}</Text>
    <Text style={chipStyles.label}>{label}</Text>
  </View>
);

const chipStyles = StyleSheet.create({
  wrap:  { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, alignItems: 'center', minWidth: 72 },
  value: { fontSize: 18, fontWeight: '800' },
  label: { fontSize: 9, color: C.textMuted, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 1 },
});

const ActionButton = ({ icon, label, color, onPress }) => (
  <TouchableOpacity style={[btnStyles.btn, { backgroundColor: color }]} onPress={onPress} activeOpacity={0.78}>
    <Ionicons name={icon} size={16} color="#fff" />
    <Text style={btnStyles.label}>{label}</Text>
  </TouchableOpacity>
);

const btnStyles = StyleSheet.create({
  btn:   { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10 },
  label: { color: '#fff', fontWeight: '700', fontSize: 13, letterSpacing: 0.4 },
});

// ─── CARD ─────────────────────────────────────────────────────────────────────

const CensoCard = ({ item }) => {
  const esCliente = item.status === 1;
  const tagColor  = esCliente ? C.accent : C.gold;

  return (
    <View style={cardStyles.wrap}>
      {/* Franja lateral de color */}
      <View style={[cardStyles.stripe, { backgroundColor: tagColor }]} />

      <View style={cardStyles.body}>
        {/* Cabecera */}
        <View style={cardStyles.header}>
          <Text style={cardStyles.razon} numberOfLines={1}>{item.razon_social}</Text>
          <View style={[cardStyles.badge, { backgroundColor: tagColor + '22', borderColor: tagColor }]}>
            <Text style={[cardStyles.badgeText, { color: tagColor }]}>
              {esCliente ? 'CLIENTE' : 'PROSPECTO'}
            </Text>
          </View>
        </View>

        {/* RIF + Sector */}
        <View style={cardStyles.row}>
          <View style={cardStyles.pill}>
            <Ionicons name="card-outline" size={11} color={C.textMuted} />
            <Text style={cardStyles.pillText}>{item.rif}</Text>
          </View>
          {item.sector ? (
            <View style={cardStyles.pill}>
              <Ionicons name="location-outline" size={11} color={C.textMuted} />
              <Text style={cardStyles.pillText}>{item.sector}</Text>
            </View>
          ) : null}
        </View>

        {/* Productos */}
        {item.productos?.length > 0 && (
          <View style={cardStyles.prodWrap}>
            <Text style={cardStyles.prodTitle}>DEMANDA</Text>
            <View style={cardStyles.prodRow}>
              {item.productos.map((p, i) => (
                <View key={i} style={cardStyles.prodChip}>
                  <Text style={cardStyles.prodNombre}>{p.nombre}</Text>
                  <Text style={cardStyles.prodCant}>{p.cantidad} u.</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Pie */}
        <View style={cardStyles.footer}>
          {item.telefono ? (
            <View style={cardStyles.row}>
              <Ionicons name="call-outline" size={11} color={C.textMuted} />
              <Text style={cardStyles.footerText}>{item.telefono}</Text>
            </View>
          ) : null}
          <Text style={cardStyles.fecha}>
            {new Date(item.fecha_registro).toLocaleDateString('es-VE', { day: '2-digit', month: 'short', year: 'numeric' })}
          </Text>
        </View>
      </View>
    </View>
  );
};

const cardStyles = StyleSheet.create({
  wrap:       { flexDirection: 'row', backgroundColor: C.surface, borderRadius: 14, marginBottom: 12, overflow: 'hidden', borderWidth: 1, borderColor: C.border },
  stripe:     { width: 4 },
  body:       { flex: 1, padding: 14 },
  header:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  razon:      { fontSize: 15, fontWeight: '800', color: C.textPri, flex: 1, marginRight: 8 },
  badge:      { borderWidth: 1, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  badgeText:  { fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  row:        { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  pill:       { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: C.surfaceAlt, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  pillText:   { fontSize: 11, color: C.textSec },
  prodWrap:   { marginVertical: 8, padding: 10, backgroundColor: C.surfaceAlt, borderRadius: 10 },
  prodTitle:  { fontSize: 9, color: C.textMuted, fontWeight: '700', letterSpacing: 1.2, marginBottom: 6 },
  prodRow:    { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  prodChip:   { backgroundColor: C.bg, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4, alignItems: 'center' },
  prodNombre: { fontSize: 10, color: C.textSec, fontWeight: '600' },
  prodCant:   { fontSize: 11, color: C.accent, fontWeight: '700' },
  footer:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  footerText: { fontSize: 11, color: C.textMuted, marginLeft: 4 },
  fecha:      { fontSize: 10, color: C.textMuted },
});

// ─── PANTALLA PRINCIPAL ───────────────────────────────────────────────────────

const ListaCenso = () => {
  const [registros, setRegistros] = useState([]);
  const [loading, setLoading]     = useState(true);

  const cargarDatos = async () => {
    setLoading(true);
    const datos = await getCensoLocal();
    setRegistros(datos);
    setLoading(false);
  };

  useEffect(() => { cargarDatos(); }, []);

  const totalClientes   = registros.filter(r => r.status === 1).length;
  const totalProspectos = registros.filter(r => r.status === 0).length;

  const handleBorrarCenso = () => {
    Alert.alert(
      '⚠️ Borrar Censo',
      'Se eliminarán TODOS los registros. Esta acción no se puede deshacer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sí, borrar todo',
          style: 'destructive',
          onPress: async () => {
            try {
              await borrarCensoLocal();
              setRegistros([]);
              Alert.alert('✅ Listo', 'Censo eliminado.');
            } catch {
              Alert.alert('Error', 'No se pudo borrar el censo.');
            }
          }
        }
      ]
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor='#F0F4F8' />

      {/* ── HEADER ── */}
      <View style={styles.topBar}>
        <View>
          <Text style={styles.eyebrow}>BASE DE DATOS LOCAL</Text>
          <Text style={styles.screenTitle}>Censo de Clientes</Text>
        </View>
        <TouchableOpacity onPress={cargarDatos} style={styles.refreshBtn}>
          <Ionicons name="refresh" size={20} color={C.accent} />
        </TouchableOpacity>
      </View>

      {/* ── STATS ── */}
      <View style={styles.statsRow}>
        <StatChip label="Total"      value={registros.length} color={C.textSec} />
        <StatChip label="Clientes"   value={totalClientes}    color={C.accent}  />
        <StatChip label="Prospectos" value={totalProspectos}  color={C.gold}    />
      </View>

      {/* ── ACCIONES ── */}
      <View style={styles.actionsRow}>
        <ActionButton icon="document-text" label="Exportar Excel" color={C.accent}  onPress={exportarCensoAExcel} />
        <ActionButton icon="trash"         label="Borrar todo"    color={C.warn}   onPress={handleBorrarCenso}  />
      </View>

      {/* ── LISTA ── */}
      {loading ? (
        <ActivityIndicator size="large" color={C.accent} style={{ marginTop: 60 }} />
      ) : (
        <FlatList
          data={registros}
          keyExtractor={item => item.id.toString()}
          renderItem={({ item }) => <CensoCard item={item} />}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Ionicons name="archive-outline" size={48} color={C.textMuted} />
              <Text style={styles.emptyText}>Sin registros aún</Text>
              <Text style={styles.emptyHint}>Los censos guardados aparecerán aquí</Text>
            </View>
          }
          contentContainerStyle={{ paddingBottom: 30, paddingTop: 4 }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
};

// ─── ESTILOS GLOBALES ─────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: C.bg, paddingHorizontal: 16 },

  topBar:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', paddingTop: 56, paddingBottom: 20 },
  eyebrow:      { fontSize: 10, color: C.accent, fontWeight: '700', letterSpacing: 2, textTransform: 'uppercase' },
  screenTitle:  { fontSize: 24, fontWeight: '900', color: C.textPri, letterSpacing: -0.5 },
  refreshBtn:   { width: 40, height: 40, borderRadius: 20, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, justifyContent: 'center', alignItems: 'center' },

  statsRow:     { flexDirection: 'row', gap: 10, marginBottom: 16 },

  actionsRow:   { flexDirection: 'row', gap: 10, marginBottom: 20 },
  
  emptyWrap:    { alignItems: 'center', marginTop: 80, gap: 8 },
  emptyText:    { fontSize: 16, fontWeight: '700', color: C.textSec },
  emptyHint:    { fontSize: 13, color: C.textMuted },
});

export default ListaCenso;

