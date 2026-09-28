import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, TextInput, StatusBar, ScrollView, Alert, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const API_URL = 'http://192.168.20.96:4000/api'; // Cambia por tu IP o localhost según corresponda

export default function App() {
  const [userEmail, setUserEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  
  const [cards, setCards] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [selectedCardId, setSelectedCardId] = useState(null);

  // Estados para nueva tarjeta
  const [newCardName, setNewCardName] = useState('');
  const [newCardDigits, setNewCardDigits] = useState('');
  const [newCardType, setNewCardType] = useState('débito'); 
  const [newCardColor, setNewCardColor] = useState('#1e293b'); 

  // Estados para Edición
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [editingCard, setEditingCard] = useState(null);

  const COLOR_OPTIONS = ['#1e293b', '#0284c7', '#059669', '#d97706', '#dc2626', '#7c3aed'];

  useEffect(() => {
    if (isLoggedIn && userEmail) {
      fetchData();
    }
  }, [isLoggedIn, userEmail]);

  const fetchData = async () => {
    try {
      const resCards = await fetch(`${API_URL}/cards/${userEmail}`);
      const dataCards = await resCards.json();
      if (Array.isArray(dataCards)) {
        setCards(dataCards);
        if (dataCards.length > 0 && !selectedCardId) setSelectedCardId(dataCards[0].id);
      }

      const resTx = await fetch(`${API_URL}/transactions/${userEmail}`);
      const dataTx = await resTx.json();
      if (Array.isArray(dataTx)) setTransactions(dataTx);
    } catch (e) {
      console.error('Error cargando datos:', e);
    }
  };

  const handleAuth = async () => {
    if (!userEmail || !password) return Alert.alert('Atención', 'Llena todos los campos.');
    const endpoint = isRegistering ? '/register' : '/login';
    try {
      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: userEmail, password }),
      });
      const data = await response.json();
      if (response.ok) {
        setIsLoggedIn(true);
      } else {
        Alert.alert('Error', data.error || 'Ocurrió un error.');
      }
    } catch (e) {
      Alert.alert('Error de conexión', 'No se pudo conectar con el servidor backend.');
    }
  };

  const addCard = async () => {
    if (!newCardName || !newCardDigits) {
      return Alert.alert('Atención', 'Ingresa el nombre y los últimos 4 dígitos.');
    }
    try {
      const res = await fetch(`${API_URL}/cards`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: userEmail, 
          card_name: newCardName, 
          card_type: newCardType, 
          last_digits: newCardDigits,
          card_color: newCardColor 
        }),
      });
      const card = await res.json();
      setCards([...cards, card]);
      setNewCardName('');
      setNewCardDigits('');
    } catch (e) {
      Alert.alert('Error', 'No se pudo crear la tarjeta.');
    }
  };

  // Función para Eliminar Tarjeta
  const deleteCard = (cardId) => {
    Alert.alert(
      'Eliminar Tarjeta',
      '¿Estás seguro de que deseas eliminar esta tarjeta?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Eliminar', 
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await fetch(`${API_URL}/cards/${cardId}`, { method: 'DELETE' });
              if (res.ok) {
                setCards(cards.filter(c => c.id !== cardId));
                if (selectedCardId === cardId) {
                  setSelectedCardId(cards.length > 1 ? cards.find(c => c.id !== cardId).id : null);
                }
              } else {
                Alert.alert('Error', 'No se pudo eliminar la tarjeta en el servidor.');
              }
            } catch (e) {
              Alert.alert('Error', 'Error de conexión al eliminar.');
            }
          }
        }
      ]
    );
  };

  // Abrir modal de edición
  const openEditModal = (card) => {
    setEditingCard({ ...card });
    setIsEditModalVisible(true);
  };

  // Guardar cambios de edición
  const updateCard = async () => {
    if (!editingCard.card_name || !editingCard.last_digits) {
      return Alert.alert('Atención', 'Rellena todos los campos requeridos.');
    }
    try {
      const res = await fetch(`${API_URL}/cards/${editingCard.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          card_name: editingCard.card_name,
          card_type: editingCard.card_type,
          last_digits: editingCard.last_digits,
          card_color: editingCard.card_color
        }),
      });
      if (res.ok) {
        setCards(cards.map(c => c.id === editingCard.id ? editingCard : c));
        setIsEditModalVisible(false);
        setEditingCard(null);
      } else {
        Alert.alert('Error', 'No se pudo actualizar la tarjeta.');
      }
    } catch (e) {
      Alert.alert('Error', 'Error de conexión al actualizar.');
    }
  };

  const addExpense = async () => {
    if (!selectedCardId) return Alert.alert('Atención', 'Selecciona una tarjeta primero.');
    const newTx = {
      email: userEmail,
      card_id: selectedCardId,
      title: 'Gasto registrado',
      amount: -25.00,
      type: 'gasto',
      date: 'Hoy'
    };
    try {
      const res = await fetch(`${API_URL}/transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTx),
      });
      const tx = await res.json();
      setTransactions([tx, ...transactions]);
    } catch (e) {
      Alert.alert('Error', 'No se pudo guardar la transacción.');
    }
  };

  const totalBalance = transactions.reduce((acc, curr) => acc + Number(curr.amount), 0);

  if (!isLoggedIn) {
    return (
      <View style={styles.authContainer}>
        <StatusBar barStyle="light-content" backgroundColor="#0284c7" />
        <Text style={styles.authTitle}>Billetera Financiera</Text>
        
        <TextInput 
          style={styles.input} 
          placeholder="Correo electrónico" 
          placeholderTextColor="#94a3b8" 
          value={userEmail} 
          onChangeText={setUserEmail} 
          autoCapitalize="none" 
        />

        <View style={styles.passwordContainer}>
          <TextInput 
            style={styles.passwordInput} 
            placeholder="Contraseña" 
            placeholderTextColor="#94a3b8" 
            value={password} 
            onChangeText={setPassword} 
            secureTextEntry={!showPassword} 
          />
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeButton}>
            <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={22} color="#0284c7" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.authButton} onPress={handleAuth}>
          <Text style={styles.authButtonText}>{isRegistering ? 'Registrarse' : 'Ingresar'}</Text>
        </TouchableOpacity>
        
        <TouchableOpacity onPress={() => setIsRegistering(!isRegistering)}>
          <Text style={styles.switchText}>{isRegistering ? '¿Ya tienes cuenta? Inicia sesión' : 'Crear cuenta nueva'}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0284c7" />
      
      <View style={styles.header}>
        <View style={styles.topRow}>
          <Text style={styles.welcomeText}>Hola, {userEmail.split('@')[0]}</Text>
          <TouchableOpacity onPress={() => setIsLoggedIn(false)}>
            <Text style={styles.logoutText}>Salir</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.balanceLabel}>SALDO TOTAL ACUMULADO</Text>
        <Text style={styles.balanceValue}>${totalBalance.toFixed(2)}</Text>
      </View>

      <View style={styles.sectionContainer}>
        <Text style={styles.sectionTitle}>Tus Tarjetas y Cuentas (Toca para seleccionar, mantén o usa botones)</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.cardsScroll}>
          {cards.map((card) => (
            <TouchableOpacity 
              key={card.id} 
              style={[styles.cardItem, { backgroundColor: card.card_color || '#1e293b' }, selectedCardId === card.id && styles.selectedCard]}
              onPress={() => setSelectedCardId(card.id)}
            >
              <View style={styles.cardHeaderRow}>
                <Text style={styles.cardType}>{card.card_type.toUpperCase()}</Text>
                <View style={styles.cardActions}>
                  <TouchableOpacity onPress={() => openEditModal(card)} style={styles.cardActionIcon}>
                    <Ionicons name="pencil-outline" size={14} color="#ffffff" />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => deleteCard(card.id)} style={styles.cardActionIcon}>
                    <Ionicons name="trash-outline" size={14} color="#fca5a5" />
                  </TouchableOpacity>
                </View>
              </View>
              <Text style={styles.cardName}>{card.card_name}</Text>
              <Text style={styles.cardDigits}>•••• {card.last_digits}</Text>
            </TouchableOpacity>
          ))}
          {cards.length === 0 && <Text style={styles.emptyCardText}>No hay tarjetas registradas.</Text>}
        </ScrollView>
      </View>

      {/* Formulario de Creación de Tarjetas */}
      <View style={styles.addCardBoxContainer}>
        <Text style={styles.sectionTitle}>Nueva Tarjeta</Text>
        <View style={styles.rowInputs}>
          <TextInput 
            style={[styles.smallInput, { flex: 2 }]} 
            placeholder="Nombre (ej. Visa Nu)" 
            placeholderTextColor="#94a3b8" 
            value={newCardName} 
            onChangeText={setNewCardName} 
          />
          <TextInput 
            style={[styles.smallInput, { flex: 1 }]} 
            placeholder="Últimos 4" 
            placeholderTextColor="#94a3b8" 
            keyboardType="numeric" 
            maxLength={4} 
            value={newCardDigits} 
            onChangeText={setNewCardDigits} 
          />
        </View>

        <View style={styles.typeSelectorRow}>
          <TouchableOpacity 
            style={[styles.typeBtn, newCardType === 'débito' && styles.typeBtnActive]} 
            onPress={() => setNewCardType('débito')}
          >
            <Text style={[styles.typeBtnText, newCardType === 'débito' && styles.typeBtnTextActive]}>Débito</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.typeBtn, newCardType === 'crédito' && styles.typeBtnActive]} 
            onPress={() => setNewCardType('crédito')}
          >
            <Text style={[styles.typeBtnText, newCardType === 'crédito' && styles.typeBtnTextActive]}>Crédito</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.colorLabel}>Elige un color:</Text>
        <View style={styles.colorPickerRow}>
          {COLOR_OPTIONS.map((color) => (
            <TouchableOpacity 
              key={color} 
              style={[styles.colorCircle, { backgroundColor: color }, newCardColor === color && styles.selectedColorCircle]} 
              onPress={() => setNewCardColor(color)}
            />
          ))}
        </View>

        <TouchableOpacity style={styles.addCardBtn} onPress={addCard}>
          <Text style={styles.addCardBtnText}>+ Guardar Tarjeta</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.body}>
        <Text style={styles.sectionTitle}>Movimientos</Text>
        {transactions.map((item) => (
          <View key={item.id} style={styles.txCard}>
            <View>
              <Text style={styles.txTitle}>{item.title} ({item.card_name || 'General'})</Text>
              <Text style={styles.txDate}>{item.date}</Text>
            </View>
            <Text style={[styles.txAmount, item.type === 'ingreso' ? styles.income : styles.expense]}>
              -${Math.abs(Number(item.amount)).toFixed(2)}
            </Text>
          </View>
        ))}
        {transactions.length === 0 && <Text style={styles.emptyText}>Sin movimientos registrados.</Text>}
      </View>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.fab} onPress={addExpense}>
          <Text style={styles.fabText}>+ Registrar Gasto en Tarjeta Seleccionada</Text>
        </TouchableOpacity>
      </View>

      {/* MODAL DE EDICIÓN DE TARJETA */}
      <Modal
        visible={isEditModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.sectionTitle}>Editar Tarjeta</Text>
            
            <TextInput 
              style={styles.inputModal} 
              placeholder="Nombre de la tarjeta" 
              placeholderTextColor="#94a3b8" 
              value={editingCard?.card_name || ''} 
              onChangeText={(text) => setEditingCard({ ...editingCard, card_name: text })} 
            />
            <TextInput 
              style={styles.inputModal} 
              placeholder="Últimos 4 dígitos" 
              placeholderTextColor="#94a3b8" 
              keyboardType="numeric"
              maxLength={4}
              value={editingCard?.last_digits || ''} 
              onChangeText={(text) => setEditingCard({ ...editingCard, last_digits: text })} 
            />

            <View style={styles.typeSelectorRow}>
              <TouchableOpacity 
                style={[styles.typeBtn, editingCard?.card_type === 'débito' && styles.typeBtnActive]} 
                onPress={() => setEditingCard({ ...editingCard, card_type: 'débito' })}
              >
                <Text style={[styles.typeBtnText, editingCard?.card_type === 'débito' && styles.typeBtnTextActive]}>Débito</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.typeBtn, editingCard?.card_type === 'crédito' && styles.typeBtnActive]} 
                onPress={() => setEditingCard({ ...editingCard, card_type: 'crédito' })}
              >
                <Text style={[styles.typeBtnText, editingCard?.card_type === 'crédito' && styles.typeBtnTextActive]}>Crédito</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.colorLabel}>Color:</Text>
            <View style={styles.colorPickerRow}>
              {COLOR_OPTIONS.map((color) => (
                <TouchableOpacity 
                  key={color} 
                  style={[styles.colorCircle, { backgroundColor: color }, editingCard?.card_color === color && styles.selectedColorCircle]} 
                  onPress={() => setEditingCard({ ...editingCard, card_color: color })}
                />
              ))}
            </View>

            <View style={styles.modalButtonsRow}>
              <TouchableOpacity style={[styles.modalBtn, styles.cancelBtn]} onPress={() => setIsEditModalVisible(false)}>
                <Text style={styles.cancelBtnText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, styles.saveBtn]} onPress={updateCard}>
                <Text style={styles.saveBtnText}>Guardar Cambios</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  authContainer: { flex: 1, backgroundColor: '#0284c7', justifyContent: 'center', padding: 24 },
  authTitle: { color: '#ffffff', fontSize: 26, fontWeight: 'bold', textAlign: 'center', marginBottom: 20 },
  input: { backgroundColor: '#ffffff', padding: 16, borderRadius: 12, marginBottom: 16, color: '#0f172a' },
  passwordContainer: { flexDirection: 'row', backgroundColor: '#ffffff', borderRadius: 12, marginBottom: 16, alignItems: 'center', borderWidth: 1, borderColor: '#cbd5e1' },
  passwordInput: { flex: 1, padding: 16, color: '#0f172a' },
  eyeButton: { paddingHorizontal: 16, justifyContent: 'center', alignItems: 'center' },
  authButton: { backgroundColor: '#0f172a', padding: 16, borderRadius: 12, alignItems: 'center', marginBottom: 16 },
  authButtonText: { color: '#ffffff', fontWeight: 'bold', fontSize: 16 },
  switchText: { color: '#e0f2fe', textAlign: 'center', fontWeight: '500' },
  
  header: { backgroundColor: '#0284c7', paddingHorizontal: 20, paddingTop: 40, paddingBottom: 25, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  welcomeText: { color: '#e0f2fe', fontSize: 14, fontWeight: '600' },
  logoutText: { color: '#fef08a', fontSize: 12, fontWeight: 'bold' },
  balanceLabel: { color: '#bae6fd', fontSize: 11, letterSpacing: 1 },
  balanceValue: { color: '#ffffff', fontSize: 32, fontWeight: 'bold', marginTop: 4 },

  sectionContainer: { paddingHorizontal: 20, marginTop: 15 },
  sectionTitle: { color: '#334155', fontSize: 15, fontWeight: 'bold', marginBottom: 10 },
  cardsScroll: { flexDirection: 'row' },
  cardItem: { width: 170, padding: 12, borderRadius: 16, marginRight: 12, justifyContent: 'space-between', height: 110 },
  selectedCard: { borderWidth: 3, borderColor: '#38bdf8' },
  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardType: { color: '#93c5fd', fontSize: 10, fontWeight: 'bold' },
  cardActions: { flexDirection: 'row', gap: 6 },
  cardActionIcon: { padding: 2 },
  cardName: { color: '#ffffff', fontSize: 14, fontWeight: '600' },
  cardDigits: { color: '#cbd5e1', fontSize: 12 },
  emptyCardText: { color: '#64748b', fontSize: 12, fontStyle: 'italic' },

  addCardBoxContainer: { marginHorizontal: 20, marginTop: 20, backgroundColor: '#ffffff', padding: 15, borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0' },
  rowInputs: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  smallInput: { backgroundColor: '#f8fafc', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#cbd5e1', fontSize: 13, color: '#0f172a' },
  
  typeSelectorRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  typeBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: '#cbd5e1', alignItems: 'center', backgroundColor: '#f8fafc' },
  typeBtnActive: { backgroundColor: '#0284c7', borderColor: '#0284c7' },
  typeBtnText: { color: '#64748b', fontWeight: 'bold', fontSize: 12 },
  typeBtnTextActive: { color: '#ffffff' },

  colorLabel: { color: '#64748b', fontSize: 12, marginBottom: 6 },
  colorPickerRow: { flexDirection: 'row', gap: 12, marginBottom: 15 },
  colorCircle: { width: 28, height: 28, borderRadius: 14 },
  selectedColorCircle: { borderWidth: 3, borderColor: '#0f172a' },

  addCardBtn: { backgroundColor: '#0ea5e9', padding: 12, borderRadius: 8, alignItems: 'center' },
  addCardBtnText: { color: '#ffffff', fontWeight: 'bold', fontSize: 13 },

  body: { paddingHorizontal: 20, marginTop: 15 },
  txCard: { backgroundColor: '#ffffff', flexDirection: 'row', justifyContent: 'space-between', padding: 14, borderRadius: 12, marginBottom: 8, borderWidth: 1, borderColor: '#e2e8f0' },
  txTitle: { color: '#0f172a', fontWeight: '600', fontSize: 14 },
  txDate: { color: '#64748b', fontSize: 11 },
  txAmount: { fontWeight: 'bold', fontSize: 15 },
  income: { color: '#16a34a' },
  expense: { color: '#dc2626' },
  emptyText: { color: '#94a3b8', textAlign: 'center', marginTop: 10, marginBottom: 20 },

  footer: { padding: 20, backgroundColor: '#f8fafc' },
  fab: { backgroundColor: '#0284c7', padding: 16, borderRadius: 12, alignItems: 'center' },
  fabText: { color: '#ffffff', fontWeight: 'bold', fontSize: 15 },

  // Estilos del Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#ffffff', padding: 20, borderRadius: 16 },
  inputModal: { backgroundColor: '#f8fafc', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#cbd5e1', marginBottom: 12, color: '#0f172a' },
  modalButtonsRow: { flexDirection: 'row', gap: 10, marginTop: 10 },
  modalBtn: { flex: 1, padding: 12, borderRadius: 8, alignItems: 'center' },
  cancelBtn: { backgroundColor: '#e2e8f0' },
  cancelBtnText: { color: '#334155', fontWeight: 'bold' },
  saveBtn: { backgroundColor: '#0284c7' },
  saveBtnText: { color: '#ffffff', fontWeight: 'bold' }
});