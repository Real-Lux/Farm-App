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
  FlatList
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function DateTrackingScreen() {
  const [events, setEvents] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [eventForm, setEventForm] = useState({
    title: '',
    date: '',
    type: 'Planting',
    product: '',
    notes: ''
  });

  const eventTypes = ['Planting', 'Harvest', 'Watering', 'Fertilizing', 'Maintenance', 'Other'];

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = () => {
    // Mock data - replace with API call
    const mockEvents = [
      {
        id: 1,
        title: 'Plant Tomato Seeds',
        date: '2024-01-15',
        type: 'Planting',
        product: 'Tomatoes',
        notes: 'Use greenhouse for early start'
      },
      {
        id: 2,
        title: 'Harvest Carrots',
        date: '2024-01-20',
        type: 'Harvest',
        product: 'Carrots',
        notes: '30kg expected yield'
      },
      {
        id: 3,
        title: 'Water Lettuce Field',
        date: '2024-01-18',
        type: 'Watering',
        product: 'Lettuce',
        notes: 'Check soil moisture first'
      },
      {
        id: 4,
        title: 'Apple Tree Pruning',
        date: '2024-01-25',
        type: 'Maintenance',
        product: 'Apples',
        notes: 'Annual winter pruning'
      },
      {
        id: 5,
        title: 'Strawberry Fertilizing',
        date: '2024-01-22',
        type: 'Fertilizing',
        product: 'Strawberries',
        notes: 'Organic compost application'
      }
    ];
    setEvents(mockEvents.sort((a, b) => new Date(a.date) - new Date(b.date)));
  };

  const openAddModal = () => {
    setEditingEvent(null);
    setEventForm({
      title: '',
      date: '',
      type: 'Planting',
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
      Alert.alert('Error', 'Please fill title and date');
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
    Alert.alert('Success', `Event ${editingEvent ? 'updated' : 'added'} successfully!`);
  };

  const deleteEvent = (id) => {
    Alert.alert(
      'Delete Event',
      'Are you sure you want to delete this event?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => {
          setEvents(events.filter(e => e.id !== id));
        }}
      ]
    );
  };

  const getEventIcon = (type) => {
    switch (type) {
      case 'Planting': return '🌱';
      case 'Harvest': return '🌾';
      case 'Watering': return '💧';
      case 'Fertilizing': return '🌿';
      case 'Maintenance': return '🔧';
      default: return '📅';
    }
  };

  const getEventColor = (type) => {
    switch (type) {
      case 'Planting': return '#4CAF50';
      case 'Harvest': return '#FF9800';
      case 'Watering': return '#2196F3';
      case 'Fertilizing': return '#8BC34A';
      case 'Maintenance': return '#9C27B0';
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
    return date.toLocaleDateString('en-US', {
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
          <Text style={styles.actionBtnText}>✏️ Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.actionBtn, styles.deleteBtn]}
          onPress={() => deleteEvent(item.id)}
        >
          <Text style={styles.actionBtnText}>🗑️ Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>📅 Farm Calendar</Text>
        <TouchableOpacity style={styles.addButton} onPress={openAddModal}>
          <Text style={styles.addButtonText}>+ Add Event</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.todaySection}>
        <Text style={styles.todayText}>
          Today: {new Date().toLocaleDateString('en-US', {
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
        <View style={styles.modalOverlay}>
          <ScrollView contentContainerStyle={styles.modalScrollContainer}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>
                {editingEvent ? 'Edit Event' : 'Add New Event'}
              </Text>

              <TextInput
                style={styles.input}
                placeholder="Event Title"
                value={eventForm.title}
                onChangeText={(text) => setEventForm({...eventForm, title: text})}
              />

              <TextInput
                style={styles.input}
                placeholder="Date (YYYY-MM-DD)"
                value={eventForm.date}
                onChangeText={(text) => setEventForm({...eventForm, date: text})}
              />

              <View style={styles.typeSelector}>
                <Text style={styles.typeSelectorLabel}>Event Type:</Text>
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
                placeholder="Product/Crop (optional)"
                value={eventForm.product}
                onChangeText={(text) => setEventForm({...eventForm, product: text})}
              />

              <TextInput
                style={[styles.input, styles.notesInput]}
                placeholder="Notes (optional)"
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
                  <Text style={styles.modalBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.modalBtn, styles.saveBtn]}
                  onPress={saveEvent}
                >
                  <Text style={[styles.modalBtnText, { color: 'white' }]}>
                    {editingEvent ? 'Update' : 'Save'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#4CAF50',
    padding: 20,
    paddingTop: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
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