import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  FlatList,
  StatusBar,
  Platform,
  KeyboardAvoidingView
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

export default function DateTrackingScreen() {
  const insets = useSafeAreaInsets();
  const [events, setEvents] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [eventForm, setEventForm] = useState({
    title: '',
    date: '',
    type: 'Récupération',
    product: '',
    notes: ''
  });

  const eventTypes = ['Récupération', 'Préparation', 'Livraison', 'Suivi', 'Rappel', 'Autre'];

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = () => {
    // Mock data - replace with API call
    const mockEvents = [
      {
        id: 1,
        title: 'Récupération commande Marie Dupont',
        date: '2024-01-20',
        type: 'Récupération',
        product: 'Poules Marans (3 mois)',
        notes: 'Commande adoption - 2 poules Marans, 3 mois, 2 semaines'
      },
      {
        id: 2,
        title: 'Préparation commande Pierre Martin',
        date: '2024-01-22',
        type: 'Préparation',
        product: 'Œufs de conso (24 unités)',
        notes: 'Emballer 24 œufs frais pour livraison'
      },
      {
        id: 3,
        title: 'Livraison commande Sophie Bernard',
        date: '2024-01-18',
        type: 'Livraison',
        product: 'Fromage de chèvre (2 pièces)',
        notes: 'Livraison à domicile - 2 fromages de chèvre'
      },
      {
        id: 4,
        title: 'Rappel client - Commande en attente',
        date: '2024-01-25',
        type: 'Rappel',
        product: 'Commande #123',
        notes: 'Rappeler client pour confirmer récupération'
      },
      {
        id: 5,
        title: 'Suivi commande adoption',
        date: '2024-01-22',
        type: 'Suivi',
        product: 'Poules Marans',
        notes: 'Vérifier adaptation des poules chez le client'
      }
    ];
    setEvents(mockEvents.sort((a, b) => new Date(a.date) - new Date(b.date)));
  };

  const openAddModal = () => {
    setEditingEvent(null);
    setEventForm({
      title: '',
      date: '',
      type: 'Récupération',
      product: '',
      notes: ''
    });
    setModalVisible(true);
  };

  const openEditModal = (event) => {
    setEditingEvent(event);
    setEventForm({
      title: event.title,
      date: event.date,
      type: event.type,
      product: event.product,
      notes: event.notes
    });
    setModalVisible(true);
  };

  const saveEvent = () => {
    if (!eventForm.title || !eventForm.date) {
      Alert.alert('Erreur', 'Veuillez remplir le titre et la date');
      return;
    }

    const newEvent = {
      id: editingEvent ? editingEvent.id : Date.now(),
      title: eventForm.title,
      date: eventForm.date,
      type: eventForm.type,
      product: eventForm.product,
      notes: eventForm.notes
    };

    if (editingEvent) {
      setEvents(events.map(e => e.id === editingEvent.id ? newEvent : e)
        .sort((a, b) => new Date(a.date) - new Date(b.date)));
    } else {
      setEvents([...events, newEvent]
        .sort((a, b) => new Date(a.date) - new Date(b.date)));
    }

    setModalVisible(false);
    Alert.alert('Succès', `Événement ${editingEvent ? 'modifié' : 'ajouté'} avec succès!`);
  };

  const deleteEvent = (id) => {
    Alert.alert(
      'Supprimer l\'événement',
      'Êtes-vous sûr de vouloir supprimer cet événement ?',
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Supprimer', style: 'destructive', onPress: () => {
          setEvents(events.filter(e => e.id !== id));
        }}
      ]
    );
  };

  const getEventIcon = (type) => {
    switch (type) {
      case 'Récupération': return '📦';
      case 'Préparation': return '👨‍🍳';
      case 'Livraison': return '🚚';
      case 'Suivi': return '📞';
      case 'Rappel': return '⏰';
      case 'Autre': return '📋';
      default: return '📅';
    }
  };

  const getEventColor = (type) => {
    switch (type) {
      case 'Récupération': return '#4CAF50';
      case 'Préparation': return '#FF9800';
      case 'Livraison': return '#2196F3';
      case 'Suivi': return '#8BC34A';
      case 'Rappel': return '#9C27B0';
      case 'Autre': return '#607D8B';
      default: return '#607D8B';
    }
  };

  const isEventPast = (dateString) => {
    return new Date(dateString) < new Date();
  };

  const isEventToday = (dateString) => {
    const today = new Date();
    const eventDate = new Date(dateString);
    return eventDate.toDateString() === today.toDateString();
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  const EventItem = ({ item }) => (
    <View style={[
      styles.eventCard,
      { borderLeftColor: getEventColor(item.type) },
      isEventToday(item.date) && styles.todayEvent,
      isEventPast(item.date) && styles.pastEvent
    ]}>
      <View style={styles.eventHeader}>
        <View style={styles.eventTitleRow}>
          <Text style={styles.eventIcon}>{getEventIcon(item.type)}</Text>
          <View style={styles.eventTitleContainer}>
            <Text style={styles.eventTitle}>{item.title}</Text>
            <Text style={styles.eventType}>{item.type}</Text>
          </View>
        </View>
        <Text style={[
          styles.eventDate,
          isEventToday(item.date) && { color: '#FF5722', fontWeight: 'bold' }
        ]}>
          {formatDate(item.date)}
        </Text>
      </View>
      
      {item.product && (
        <Text style={styles.eventProduct}>🏷️ {item.product}</Text>
      )}
      
      {item.notes && (
        <Text style={styles.eventNotes}>📝 {item.notes}</Text>
      )}

      <View style={styles.eventActions}>
        <TouchableOpacity 
          style={[styles.actionBtn, styles.editBtn]}
          onPress={() => openEditModal(item)}
        >
          <Text style={styles.actionBtnText}>✏️ Modifier</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.actionBtn, styles.deleteBtn]}
          onPress={() => deleteEvent(item.id)}
        >
          <Text style={styles.actionBtnText}>🗑️ Supprimer</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <View style={styles.header}>
        <View style={[styles.statusBarOverlay, { height: insets.top * 0.8 }]} />
        <Text style={styles.headerTitle}>📅 Suivi des Commandes</Text>
        <TouchableOpacity style={styles.addButton} onPress={openAddModal}>
          <Text style={styles.addButtonText}>+ Ajouter</Text>
        </TouchableOpacity>
      </View>
      <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>

      <View style={styles.todaySection}>
        <Text style={styles.todayText}>
          Aujourd'hui: {new Date().toLocaleDateString('fr-FR', {
            weekday: 'long',
            month: 'long',
            day: 'numeric'
          })}
        </Text>
      </View>

      <FlatList
        data={events}
        renderItem={({ item }) => <EventItem item={item} />}
        keyExtractor={item => item.id.toString()}
        style={styles.eventList}
        showsVerticalScrollIndicator={false}
      />

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView 
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          <ScrollView 
            contentContainerStyle={styles.modalScrollContainer}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>
                {editingEvent ? 'Modifier l\'événement' : 'Ajouter un événement'}
              </Text>

              <TextInput
                style={styles.input}
                placeholder="Titre de l'événement"
                placeholderTextColor="#999"
                value={eventForm.title}
                onChangeText={(text) => setEventForm({...eventForm, title: text})}
              />

              <TextInput
                style={styles.input}
                placeholder="Date (YYYY-MM-DD)"
                placeholderTextColor="#999"
                value={eventForm.date}
                onChangeText={(text) => setEventForm({...eventForm, date: text})}
              />

              <View style={styles.typeSelector}>
                <Text style={styles.typeSelectorLabel}>Type d'événement:</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.typeOptions}>
                    {eventTypes.map((type) => (
                      <TouchableOpacity
                        key={type}
                        style={[
                          styles.typeOption,
                          eventForm.type === type && styles.selectedType,
                          { backgroundColor: eventForm.type === type ? getEventColor(type) : '#f0f0f0' }
                        ]}
                        onPress={() => setEventForm({...eventForm, type})}
                      >
                        <Text style={[
                          styles.typeOptionText,
                          eventForm.type === type && { color: 'white' }
                        ]}>
                          {getEventIcon(type)} {type}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </View>

              <TextInput
                style={styles.input}
                placeholder="Produit/Commande (optionnel)"
                placeholderTextColor="#999"
                value={eventForm.product}
                onChangeText={(text) => setEventForm({...eventForm, product: text})}
              />

              <TextInput
                style={[styles.input, styles.notesInput]}
                placeholder="Notes (optionnel)"
                placeholderTextColor="#999"
                value={eventForm.notes}
                onChangeText={(text) => setEventForm({...eventForm, notes: text})}
                multiline={true}
                numberOfLines={3}
              />

              <View style={styles.modalActions}>
                <TouchableOpacity 
                  style={[styles.modalBtn, styles.cancelBtn]}
                  onPress={() => setModalVisible(false)}
                >
                  <Text style={styles.modalBtnText}>Annuler</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.modalBtn, styles.saveBtn]}
                  onPress={saveEvent}
                >
                  <Text style={[styles.modalBtnText, { color: 'white' }]}>
                    {editingEvent ? 'Modifier' : 'Sauvegarder'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  statusBarOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(147, 178, 189, 0.44)', // Lighter blue with more opacity
    paddingHorizontal: 10, // Add horizontal padding
    zIndex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    backgroundColor: '#4CAF50',
    padding: 20,
    paddingTop: 40,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    marginHorizontal: 20,
  },
  addButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 8,
  },
  addButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  todaySection: {
    backgroundColor: 'white',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  todayText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  eventList: {
    padding: 15,
  },
  eventCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  todayEvent: {
    backgroundColor: '#FFF3E0',
    borderColor: '#FF5722',
  },
  pastEvent: {
    opacity: 0.7,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  eventTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  eventIcon: {
    fontSize: 20,
    marginRight: 10,
  },
  eventTitleContainer: {
    flex: 1,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  eventType: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  eventDate: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  eventProduct: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  eventNotes: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    marginBottom: 10,
  },
  eventActions: {
    flexDirection: 'row',
    gap: 10,
  },
  actionBtn: {
    flex: 1,
    padding: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  editBtn: {
    backgroundColor: '#2196F3',
  },
  deleteBtn: {
    backgroundColor: '#F44336',
  },
  actionBtnText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalScrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
    fontSize: 16,
  },
  notesInput: {
    height: 80,
    textAlignVertical: 'top',
  },
  typeSelector: {
    marginBottom: 15,
  },
  typeSelectorLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
    color: '#333',
  },
  typeOptions: {
    flexDirection: 'row',
    gap: 10,
  },
  typeOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: '#f0f0f0',
  },
  selectedType: {
    backgroundColor: '#4CAF50',
  },
  typeOptionText: {
    fontSize: 12,
    fontWeight: '600',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  modalBtn: {
    flex: 1,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelBtn: {
    backgroundColor: '#f0f0f0',
  },
  saveBtn: {
    backgroundColor: '#4CAF50',
  },
  modalBtnText: {
    fontWeight: '600',
    fontSize: 16,
  },
}); 