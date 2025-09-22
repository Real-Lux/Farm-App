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
  Dimensions
} from 'react-native';
import { Calendar, CalendarList, Agenda } from 'react-native-calendars';
import database from '../services/database';

const { width } = Dimensions.get('window');

export default function CalendarScreen() {
  const [events, setEvents] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [viewMode, setViewMode] = useState('month'); // month, week, day, year
  const [modalVisible, setModalVisible] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [eventForm, setEventForm] = useState({
    title: '',
    date: '',
    type: 'Alimentation',
    product: '',
    notes: ''
  });

  const eventTypes = ['Alimentation', 'Entretien', 'Soins', 'Reproduction', 'Vétérinaire', 'Autre'];
  const eventColors = {
    'Alimentation': '#4CAF50',
    'Entretien': '#FF9800', 
    'Soins': '#2196F3',
    'Reproduction': '#8BC34A',
    'Vétérinaire': '#9C27B0',
    'Autre': '#607D8B'
  };

  // Define view mode options with French labels
  const viewModeOptions = [
    { key: 'month', label: 'Mois' },
    { key: 'week', label: 'Semaine' },
    { key: 'day', label: 'Jour' },
    { key: 'year', label: 'Année' },
  ];

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    try {
      const eventsData = await database.getEvents();
      setEvents(eventsData);
    } catch (error) {
      console.error('Error loading events:', error);
    }
  };

  // Convert events to calendar format for marked dates
  const getMarkedDates = () => {
    const marked = {};
    
    events.forEach(event => {
      const date = event.date || event.event_date;
      if (date) {
        const eventDate = date.split('T')[0]; // Get YYYY-MM-DD format
        if (!marked[eventDate]) {
          marked[eventDate] = { 
            dots: [],
            selected: eventDate === selectedDate,
            selectedColor: eventDate === selectedDate ? '#005F6B' : undefined
          };
        }
        
        marked[eventDate].dots.push({
          color: eventColors[event.type] || eventColors['Other'],
          key: event.id
        });
      }
    });

    // Mark selected date if no events
    if (!marked[selectedDate]) {
      marked[selectedDate] = {
        selected: true,
        selectedColor: '#005F6B'
      };
    }

    return marked;
  };

  // Get events for selected date
  const getEventsForDate = (date) => {
    return events.filter(event => {
      const eventDate = (event.date || event.event_date)?.split('T')[0];
      return eventDate === date;
    });
  };

  // Get events for selected week
  const getEventsForWeek = (date) => {
    const startOfWeek = new Date(date);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day;
    startOfWeek.setDate(diff);
    
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    
    return events.filter(event => {
      const eventDate = new Date(event.date || event.event_date);
      return eventDate >= startOfWeek && eventDate <= endOfWeek;
    });
  };

  // Get events for selected month
  const getEventsForMonth = (date) => {
    const selectedMonth = new Date(date);
    const startOfMonth = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), 1);
    const endOfMonth = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 0);
    
    return events.filter(event => {
      const eventDate = new Date(event.date || event.event_date);
      return eventDate >= startOfMonth && eventDate <= endOfMonth;
    });
  };

  const openAddModal = (date) => {
    setEditingEvent(null);
    setEventForm({
      title: '',
      date: date || selectedDate,
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
      date: (event.date || event.event_date)?.split('T')[0] || selectedDate,
      type: event.type,
      product: event.product || '',
      notes: event.notes || ''
    });
    setModalVisible(true);
  };

  const saveEvent = async () => {
    if (!eventForm.title || !eventForm.date) {
      Alert.alert('Error', 'Please fill title and date');
      return;
    }

    try {
      const eventData = {
        title: eventForm.title,
        date: eventForm.date,
        event_date: eventForm.date,
        type: eventForm.type,
        product: eventForm.product,
        notes: eventForm.notes
      };

      if (editingEvent) {
        // Update existing event (would need updateEvent method)
        console.log('Update event:', eventData);
      } else {
        await database.addEvent(eventData);
      }

      setModalVisible(false);
      await loadEvents();
      Alert.alert('Success', `Event ${editingEvent ? 'updated' : 'added'} successfully!`);
    } catch (error) {
      console.error('Error saving event:', error);
      Alert.alert('Error', 'Failed to save event');
    }
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

  const ViewModeSelector = () => (
    <View style={styles.viewModeSelector}>
      {viewModeOptions.map(option => ( // Use viewModeOptions for French labels
        <TouchableOpacity
          key={option.key}
          style={[
            styles.viewModeButton,
            viewMode === option.key && styles.viewModeButtonActive
          ]}
          onPress={() => setViewMode(option.key)}
        >
          <Text style={[
            styles.viewModeText,
            viewMode === option.key && styles.viewModeTextActive
          ]}>
            {option.label} {/* Display the French label */}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const MonthView = () => (
    <Calendar
      current={selectedDate}
      onDayPress={(day) => setSelectedDate(day.dateString)}
      markedDates={getMarkedDates()}
      markingType={'multi-dot'}
      theme={{
        backgroundColor: '#ffffff',
        calendarBackground: '#ffffff',
        textSectionTitleColor: '#b6c1cd',
        selectedDayBackgroundColor: '#005F6B',
        selectedDayTextColor: '#ffffff',
        todayTextColor: '#005F6B',
        dayTextColor: '#2d4150',
        textDisabledColor: '#d9e1e8',
        dotColor: '#005F6B',
        selectedDotColor: '#ffffff',
        arrowColor: '#005F6B',
        disabledArrowColor: '#d9e1e8',
        monthTextColor: '#005F6B',
        indicatorColor: '#005F6B',
        textDayFontWeight: '300',
        textMonthFontWeight: 'bold',
        textDayHeaderFontWeight: '300',
        textDayFontSize: 16,
        textMonthFontSize: 16,
        textDayHeaderFontSize: 13,
        'stylesheet.day.basic': {
          today: {
            fontWeight: '900', // Extra bold for today
            fontSize: 18,
          },
        }
      }}
    />
  );

  const WeekView = () => {
    const weekEvents = getEventsForWeek(selectedDate);
    const startOfWeek = new Date(selectedDate);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day;
    startOfWeek.setDate(diff);
    
    const weekDays = [];
    for (let i = 0; i < 7; i++) {
      const currentDay = new Date(startOfWeek);
      currentDay.setDate(startOfWeek.getDate() + i);
      weekDays.push(currentDay);
    }
    
    return (
      <View style={styles.weekView}>
        <Text style={styles.weekViewTitle}>Semaine du {startOfWeek.toLocaleDateString('fr-FR')}</Text>
        <View style={styles.weekDaysContainer}>
          {weekDays.map((day, index) => {
            const dayString = day.toISOString().split('T')[0];
            const dayEvents = getEventsForDate(dayString);
            const isSelected = dayString === selectedDate;
            
            return (
              <TouchableOpacity
                key={index}
                style={[styles.weekDay, isSelected && styles.selectedWeekDay]}
                onPress={() => setSelectedDate(dayString)}
              >
                <Text style={[styles.weekDayName, isSelected && styles.selectedWeekDayText]}>
                  {day.toLocaleDateString('fr-FR', { weekday: 'short' })}
                </Text>
                <Text style={[styles.weekDayNumber, isSelected && styles.selectedWeekDayText]}>
                  {day.getDate()}
                </Text>
                <View style={styles.weekDayEvents}>
                  {dayEvents.slice(0, 3).map((event, eventIndex) => (
                    <View
                      key={eventIndex}
                      style={[styles.weekEventDot, { backgroundColor: eventColors[event.type] || eventColors['Autre'] }]}
                    />
                  ))}
                  {dayEvents.length > 3 && (
                    <Text style={styles.moreEventsText}>+{dayEvents.length - 3}</Text>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
        
        <ScrollView style={styles.weekEventsList}>
          <Text style={styles.weekEventsTitle}>Événements de la semaine:</Text>
          {weekEvents.length === 0 ? (
            <Text style={styles.noEventsText}>Aucun événement cette semaine</Text>
          ) : (
            weekEvents.map(event => (
              <TouchableOpacity
                key={event.id}
                style={[styles.weekEventItem, { borderLeftColor: eventColors[event.type] }]}
                onPress={() => openEditModal(event)}
              >
                <Text style={styles.weekEventDate}>
                  {new Date(event.date || event.event_date).toLocaleDateString('fr-FR')}
                </Text>
                <Text style={styles.weekEventTitle}>{event.title}</Text>
                <Text style={styles.weekEventType}>{event.type}</Text>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      </View>
    );
  };

  const DayView = () => {
    const dayEvents = getEventsForDate(selectedDate);
    
    return (
      <View style={styles.dayView}>
        <Text style={styles.dayViewTitle}>
          {new Date(selectedDate).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })}
        </Text>
        
        <ScrollView style={styles.dayEventsList}>
          {dayEvents.length === 0 ? (
            <Text style={styles.noEventsText}>No events for this day</Text>
          ) : (
            dayEvents.map(event => (
              <TouchableOpacity
                key={event.id}
                style={[styles.dayEventItem, { borderLeftColor: eventColors[event.type] }]}
                onPress={() => openEditModal(event)}
              >
                <View style={styles.dayEventHeader}>
                  <Text style={styles.dayEventIcon}>{getEventIcon(event.type)}</Text>
                  <Text style={styles.dayEventTitle}>{event.title}</Text>
                </View>
                <Text style={styles.dayEventType}>{event.type}</Text>
                {event.product && (
                  <Text style={styles.dayEventProduct}>🏷️ {event.product}</Text>
                )}
                {event.notes && (
                  <Text style={styles.dayEventNotes}>📝 {event.notes}</Text>
                )}
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      </View>
    );
  };

  const YearView = () => {
    const currentYear = new Date(selectedDate).getFullYear();
    
    return (
      <View style={styles.yearView}>
        <Text style={styles.yearViewTitle}>{currentYear}</Text>
        <CalendarList
          current={selectedDate}
          pastScrollRange={0}
          futureScrollRange={11}
          scrollEnabled={true}
          showScrollIndicator={true}
          onDayPress={(day) => setSelectedDate(day.dateString)}
          markedDates={getMarkedDates()}
          markingType={'multi-dot'}
          calendarWidth={width - 30}
          theme={{
            backgroundColor: '#ffffff',
            calendarBackground: '#ffffff',
            selectedDayBackgroundColor: '#005F6B',
            selectedDayTextColor: '#ffffff',
            todayTextColor: '#005F6B',
            dayTextColor: '#2d4150',
            dotColor: '#005F6B',
            selectedDotColor: '#ffffff',
            arrowColor: '#005F6B',
            monthTextColor: '#005F6B'
          }}
        />
      </View>
    );
  };

  const renderCalendarView = () => {
    switch (viewMode) {
      case 'month': return <MonthView />;
      case 'week': return <WeekView />;
      case 'day': return <DayView />;
      case 'year': return <YearView />;
      default: return <MonthView />;
    }
  };

  const selectedDateEvents = getEventsForDate(selectedDate);
  const monthEvents = getEventsForMonth(selectedDate);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>📅 Événements</Text>
        <TouchableOpacity style={styles.addButton} onPress={() => openAddModal()}>
          <Text style={styles.addButtonText}>+ Add Event</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.mainScrollView} showsVerticalScrollIndicator={true}>
        <ViewModeSelector />

        <View style={styles.calendarContainer}>
          {renderCalendarView()}
        </View>

        {viewMode === 'month' && (
          <View style={styles.monthEventsSection}>
            <Text style={styles.selectedDateTitle}>
              Événements du mois ({new Date(selectedDate).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}):
            </Text>
            <View style={styles.monthEventsList}>
              {monthEvents.length === 0 ? (
                <Text style={styles.noEventsText}>Aucun événement ce mois</Text>
              ) : (
                monthEvents.map(event => (
                  <TouchableOpacity
                    key={event.id}
                    style={[styles.eventItem, { borderLeftColor: eventColors[event.type] }]}
                    onPress={() => openEditModal(event)}
                  >
                    <Text style={styles.eventIcon}>{getEventIcon(event.type)}</Text>
                    <View style={styles.eventDetails}>
                      <Text style={styles.eventTitle}>{event.title}</Text>
                      <Text style={styles.eventType}>{event.type}</Text>
                      <Text style={styles.eventDate}>
                        {new Date(event.date || event.event_date).toLocaleDateString('fr-FR')}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </View>
          </View>
        )}

        {(viewMode === 'month' || viewMode === 'year') && (
          <View style={styles.selectedDateSection}>
            <Text style={styles.selectedDateTitle}>
              Événements pour le {new Date(selectedDate).toLocaleDateString('fr-FR')}:
            </Text>
            <View style={styles.eventsList}>
              {selectedDateEvents.length === 0 ? (
                <Text style={styles.noEventsText}>Aucun événement ce jour</Text>
              ) : (
                selectedDateEvents.map(event => (
                  <TouchableOpacity
                    key={event.id}
                    style={[styles.eventItem, { borderLeftColor: eventColors[event.type] }]}
                    onPress={() => openEditModal(event)}
                  >
                    <Text style={styles.eventIcon}>{getEventIcon(event.type)}</Text>
                    <View style={styles.eventDetails}>
                      <Text style={styles.eventTitle}>{event.title}</Text>
                      <Text style={styles.eventType}>{event.type}</Text>
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </View>
          </View>
        )}
      </ScrollView>

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
                          { backgroundColor: eventForm.type === type ? eventColors[type] : '#f0f0f0' }
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  mainScrollView: {
    flex: 1,
  },
  header: {
    backgroundColor: '#005F6B', // Darker blue, like duck blue (bleu canard)
    padding: 10,
    paddingTop: 10,
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
  viewModeSelector: {
    flexDirection: 'row',
    backgroundColor: 'white',
    margin: 15,
    borderRadius: 8,
    padding: 4,
  },
  viewModeButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  viewModeButtonActive: {
    backgroundColor: '#005F6B',
  },
  viewModeText: {
    color: '#666',
    fontWeight: '600',
  },
  viewModeTextActive: {
    color: 'white',
  },
  calendarContainer: {
    backgroundColor: 'white',
    marginHorizontal: 15,
    marginBottom: 15,
    borderRadius: 12,
    overflow: 'hidden',
  },
  dayView: {
    padding: 20,
  },
  dayViewTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
    textAlign: 'center',
  },
  dayEventsList: {
    maxHeight: 300,
  },
  dayEventItem: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
    borderLeftWidth: 4,
  },
  dayEventHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  dayEventIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  dayEventTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  dayEventType: {
    fontSize: 12,
    color: '#666',
    marginBottom: 3,
  },
  dayEventProduct: {
    fontSize: 14,
    color: '#666',
    marginBottom: 3,
  },
  dayEventNotes: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  yearView: {
    flex: 1,
  },
  yearViewTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#4CAF50',
    padding: 20,
  },
  selectedDateSection: {
    backgroundColor: 'white',
    marginHorizontal: 15,
    marginBottom: 15,
    borderRadius: 12,
    padding: 15,
  },
  selectedDateTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  eventsList: {
    maxHeight: 150,
  },
  monthEventsSection: {
    backgroundColor: 'white',
    marginHorizontal: 15,
    marginBottom: 10,
    borderRadius: 12,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  monthEventsList: {
    paddingBottom: 10,
  },
  eventItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 4,
  },
  eventIcon: {
    fontSize: 16,
    marginRight: 12,
  },
  eventDetails: {
    flex: 1,
  },
  eventTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  eventType: {
    fontSize: 12,
    color: '#666',
  },
  eventDate: {
    fontSize: 11,
    color: '#999',
    fontStyle: 'italic',
  },
  noEventsText: {
    textAlign: 'center',
    color: '#999',
    fontStyle: 'italic',
    padding: 20,
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
  // Week view styles
  weekView: {
    padding: 15,
  },
  weekViewTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
    textAlign: 'center',
  },
  weekDaysContainer: {
    flexDirection: 'row',
    marginBottom: 15,
  },
  weekDay: {
    flex: 1,
    alignItems: 'center',
    padding: 8,
    marginHorizontal: 2,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  selectedWeekDay: {
    backgroundColor: '#4CAF50',
  },
  weekDayName: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  selectedWeekDayText: {
    color: 'white',
  },
  weekDayNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  weekDayEvents: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    minHeight: 20,
  },
  weekEventDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    margin: 1,
  },
  moreEventsText: {
    fontSize: 10,
    color: '#666',
  },
  weekEventsList: {
    maxHeight: 200,
  },
  weekEventsTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  weekEventItem: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
    borderLeftWidth: 4,
  },
  weekEventDate: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  weekEventTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2,
  },
  weekEventType: {
    fontSize: 12,
    color: '#666',
  },
});
