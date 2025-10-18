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
  Dimensions,
  StatusBar,
  Platform,
  RefreshControl
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Calendar, CalendarList, Agenda } from 'react-native-calendars';
import database from '../services/database';
import csvStorage from '../services/csvStorage';
import * as Sharing from 'expo-sharing';
import { getEventColor } from '../../constants/StatusConstants';

const { width } = Dimensions.get('window');

export default function CalendarScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [events, setEvents] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]); // Use current date
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
  const [isExporting, setIsExporting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const eventTypes = ['Alimentation', 'Entretien', 'Soins', 'Reproduction', 'Vétérinaire', 'Récupération', 'Autre'];
  // Event colors are now imported from StatusConstants

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

  // Refresh calendar when screen comes into focus (e.g., after adding orders)
  useFocusEffect(
    React.useCallback(() => {
      // Only sync if we're not already refreshing and not in year view
      // Also add a small delay to prevent interference with navigation
      if (!isRefreshing && viewMode !== 'year') {
        const timer = setTimeout(() => {
          loadEvents(selectedDate, viewMode);
        }, 100);
        return () => clearTimeout(timer);
      }
    }, [selectedDate, viewMode, isRefreshing])
  );

  const loadEvents = async (targetDate = selectedDate, viewModeParam = viewMode) => {
    try {
      console.log(`🔄 CalendarScreen: Loading events for ${viewModeParam} view around ${targetDate}...`);
      console.log(`📅 Current selectedDate: ${selectedDate}, targetDate: ${targetDate}`);
      
      // Get date range based on view mode
      const dateRange = getDateRangeForView(targetDate, viewModeParam);
      console.log(`📅 Date range: ${dateRange.start} to ${dateRange.end}`);
      
      // Load events only for the current view period
      const eventsData = await database.getEventsForDateRange(dateRange.start, dateRange.end);
      
      console.log(`📅 CalendarScreen: Loaded ${eventsData.length} events for ${viewModeParam} view`);
      
      setEvents(eventsData);
    } catch (error) {
      console.error('Error loading events:', error);
    }
  };

  // Comprehensive sync function that updates all data - only used for refresh
  const syncAllData = async () => {
    try {
      console.log('🔄 CalendarScreen: Starting comprehensive data sync...');
      
      // Sync orders with calendar (creates pickup events)
      await database.syncOrdersWithCalendar();
      
      // Sync all data with calendar (including management events)
      await database.syncAllWithCalendar();
      
      // Load events for current view only
      await loadEvents(selectedDate, viewMode);
      
      console.log('✅ CalendarScreen: Comprehensive sync completed successfully');
    } catch (error) {
      console.error('❌ CalendarScreen: Error during comprehensive sync:', error);
    }
  };

  // Pull-to-refresh handler
  const onRefresh = async () => {
    setIsRefreshing(true);
    try {
      await syncAllData();
    } catch (error) {
      console.error('Error during refresh:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Export calendar data to CSV
  const exportCalendarData = async () => {
    try {
      setIsExporting(true);
      console.log('📤 Starting calendar export...');
      
      // First sync orders with calendar
      await database.syncOrdersWithCalendar();
      
      // Export calendar with orders to CSV
      const result = await database.exportCalendarWithOrders();
      
      if (result.fileUri) {
        // For mobile, share the file
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(result.fileUri, {
            mimeType: 'text/csv',
            dialogTitle: 'Exporter les données du calendrier'
          });
        }
        
        // Ask if user wants to send via email
        Alert.alert(
          'Export réussi',
          `Fichier calendrier avec commandes exporté avec succès!\n\nVoulez-vous l'envoyer par email à ${emailService.backupEmail}?`,
          [
            { text: 'Non', style: 'cancel' },
            { 
              text: 'Envoyer par email', 
              onPress: async () => {
                try {
                  await emailService.sendSingleExport('calendrier_commandes', result.fileUri);
                } catch (emailError) {
                  console.error('Email error:', emailError);
                }
              }
            }
          ]
        );
      } else {
        Alert.alert('Erreur', 'Impossible d\'exporter les données');
      }
    } catch (error) {
      console.error('Error exporting calendar:', error);
      Alert.alert('Erreur', 'Erreur lors de l\'exportation: ' + error.message);
    } finally {
      setIsExporting(false);
    }
  };

  // Backup all data
  const backupAllData = async () => {
    try {
      setIsExporting(true);
      console.log('💾 Starting full backup...');
      
      const filesToSend = [];
      const tables = ['products', 'orders', 'calendar_events', 'elevage_lots', 'elevage_races', 'elevage_historique'];
      
      // Export each table to CSV
      for (const tableName of tables) {
        try {
          console.log(`Attempting to export ${tableName}...`);
          const exportResult = await database.exportToCSV(tableName);
          console.log(`Export result for ${tableName}:`, exportResult);
          
          if (exportResult.fileUri || exportResult.data) {
            filesToSend.push({
              uri: exportResult.fileUri,
              filename: exportResult.fileName
            });
            console.log(`Added ${tableName} to files to send`);
          }
        } catch (error) {
          console.log(`Skipping ${tableName} - error:`, error.message);
        }
      }
      
      // Create calendar with orders export
      try {
        console.log('Creating calendar with orders export...');
        const calendarResult = await database.exportCalendarWithOrders();
        console.log('Calendar with orders result:', calendarResult);
        
        if (calendarResult.fileUri || calendarResult.data) {
          filesToSend.push({
            uri: calendarResult.fileUri,
            filename: calendarResult.fileName
          });
          console.log('Added calendar with orders to files to send');
        }
      } catch (error) {
        console.log('Skipping calendar with orders - no data available');
      }

      // Create main backup JSON file
      try {
        console.log('Creating main backup...');
        const backupResult = await database.backupDatabase();
        console.log('Backup result:', backupResult);
        
        if (backupResult.fileUri || backupResult.data) {
          filesToSend.push({
            uri: backupResult.fileUri,
            filename: backupResult.fileName
          });
          console.log('Added main backup to files to send');
        }
      } catch (error) {
        console.error('Error creating main backup:', error);
      }
      
      console.log(`Total files to send: ${filesToSend.length}`, filesToSend);
      
      if (filesToSend.length === 0) {
        Alert.alert('Erreur', 'Aucune donnée à sauvegarder');
        return;
      }
      
      // Share the main backup file locally first
      if (filesToSend.length > 0 && filesToSend[filesToSend.length - 1].uri) {
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(filesToSend[filesToSend.length - 1].uri, {
            mimeType: 'application/json',
            dialogTitle: 'Sauvegarde complète de l\'application'
          });
        }
      }
      
      // Send all files via email
      Alert.alert(
        'Sauvegarde prête',
        `${filesToSend.length} fichier(s) créé(s).\n\nEnvoyer la sauvegarde complète par email à ${emailService.backupEmail}?`,
        [
          { text: 'Annuler', style: 'cancel' },
          { 
            text: 'Envoyer par email', 
            onPress: async () => {
              try {
                await emailService.sendFullBackup(filesToSend);
              } catch (emailError) {
                console.error('Email backup error:', emailError);
                Alert.alert('Erreur', 'Impossible d\'envoyer l\'email de sauvegarde');
              }
            }
          }
        ]
      );
      
    } catch (error) {
      console.error('Error creating backup:', error);
      Alert.alert('Erreur', 'Erreur lors de la sauvegarde: ' + error.message);
    } finally {
      setIsExporting(false);
    }
  };

  // Convert events to calendar format for marked dates
  const getMarkedDates = () => {
    const marked = {};
    
    // Use the already filtered events from loadEvents
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
          color: getEventColor(event.type),
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
    // Use the already filtered events from loadEvents
    return events.filter(event => {
      const eventDate = (event.date || event.event_date)?.split('T')[0];
      return eventDate === date;
    });
  };

  // Get date range based on view mode
  const getDateRangeForView = (date, viewModeParam) => {
    const targetDate = new Date(date);
    
    switch (viewModeParam) {
      case 'day':
        return {
          start: date,
          end: date
        };
        
      case 'week':
        const startOfWeek = new Date(targetDate);
        const day = startOfWeek.getDay();
        const diff = startOfWeek.getDate() - day;
        startOfWeek.setDate(diff);
        
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        
        return {
          start: startOfWeek.toISOString().split('T')[0],
          end: endOfWeek.toISOString().split('T')[0]
        };
        
      case 'month':
        const startOfMonth = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1);
        const endOfMonth = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0);
        
        return {
          start: startOfMonth.toISOString().split('T')[0],
          end: endOfMonth.toISOString().split('T')[0]
        };
        
      case 'year':
        const startOfYear = new Date(targetDate.getFullYear(), 0, 1);
        const endOfYear = new Date(targetDate.getFullYear(), 11, 31);
        
        return {
          start: startOfYear.toISOString().split('T')[0],
          end: endOfYear.toISOString().split('T')[0]
        };
        
      default:
        return {
          start: date,
          end: date
        };
    }
  };

  // Get events for selected week
  const getEventsForWeek = (date) => {
    const startOfWeek = new Date(date);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day;
    startOfWeek.setDate(diff);
    
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    
    // Use the already filtered events from loadEvents
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
    
    // Use the already filtered events from loadEvents
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

  const handleEventPress = (event) => {
    // Check if this is a commande-related event
    if (event.type === 'Récupération' && event.order_id) {
      // Navigate to orders screen using the navigation prop
      if (navigation && navigation.navigate) {
        navigation.navigate('Commandes', { 
          highlightOrderId: event.order_id,
          customerName: event.customer_name 
        });
      } else {
        // Fallback: show alert if navigation is not available
        Alert.alert(
          'Commande Event',
          `This is a pickup event for: ${event.title}\n\nCustomer: ${event.customer_name || 'N/A'}\nDate: ${event.date}\n\nNavigate to Orders tab to see details.`,
          [{ text: 'OK' }]
        );
      }
      return;
    }
    
    // Check if this is a gestion-related event
    if (['Création lot', 'Éclosion', 'Mort', 'Sexage'].includes(event.type)) {
      // Navigate to products screen using the navigation prop
      if (navigation && navigation.navigate) {
        navigation.navigate('Gestion');
      } else {
        // Fallback: show alert if navigation is not available
        Alert.alert(
          'Gestion Event',
          `This is a management event: ${event.title}\n\nType: ${event.type}\nDate: ${event.date}\n\nNavigate to Products tab to see elevage details.`,
          [{ text: 'OK' }]
        );
      }
      return;
    }
    
    // For other events, open edit modal
    openEditModal(event);
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
        // console.log('Update event:', eventData);
      } else {
        await database.addEvent(eventData);
        // Also save to CSV storage
        await csvStorage.addEvent(eventData);
      }

      setModalVisible(false);
      await loadEvents();
    } catch (error) {
      console.error('Error saving event:', error);
      Alert.alert('Error', 'Failed to save event');
    }
  };

  const getEventIcon = (type) => {
    switch (type) {
      case 'Alimentation': return '🌾';
      case 'Entretien': return '🔧';
      case 'Soins': return '💊';
      case 'Reproduction': return '🥚';
      case 'Vétérinaire': return '🩺';
      case 'Récupération': return '📦';
      case 'Création lot': return '🐣';
      case 'Éclosion': return '🥚';
      case 'Mort': return '💀';
      case 'Sexage': return '⚧️';
      case 'Autre': return '📅';
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
          onPress={async () => {
            console.log('📅 Switching to view mode:', option.key);
            setViewMode(option.key);
            // Reload events for the new view mode
            await loadEvents(selectedDate, option.key);
          }}
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

  const MonthView = () => {
    const currentDate = new Date(selectedDate);
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    
    // Navigation functions
    const navigateToPreviousMonth = async () => {
      const newDate = new Date(currentYear, currentMonth - 1, 1);
      const newDateString = newDate.toISOString().split('T')[0];
      console.log('📅 Navigating to previous month:', newDateString, 'from:', selectedDate);
      setSelectedDate(newDateString);
      await loadEvents(newDateString, 'month');
    };
    
    const navigateToNextMonth = async () => {
      const newDate = new Date(currentYear, currentMonth + 1, 1);
      const newDateString = newDate.toISOString().split('T')[0];
      console.log('📅 Navigating to next month:', newDateString, 'from:', selectedDate);
      setSelectedDate(newDateString);
      await loadEvents(newDateString, 'month');
    };
    
    const navigateToPreviousYear = async () => {
      const newDate = new Date(currentYear - 1, currentMonth, 1);
      const newDateString = newDate.toISOString().split('T')[0];
      console.log('📅 Navigating to previous year:', newDateString);
      setSelectedDate(newDateString);
      await loadEvents(newDateString, 'month');
    };
    
    const navigateToNextYear = async () => {
      const newDate = new Date(currentYear + 1, currentMonth, 1);
      const newDateString = newDate.toISOString().split('T')[0];
      console.log('📅 Navigating to next year:', newDateString);
      setSelectedDate(newDateString);
      await loadEvents(newDateString, 'month');
    };
    
    return (
      <View style={styles.monthViewContainer}>
        {/* Month Navigation Header */}
        <View style={styles.monthNavigation}>
          <TouchableOpacity 
            style={styles.monthArrow}
            onPress={navigateToPreviousYear}
          >
            <Text style={styles.monthArrowText}>‹‹</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.monthArrow}
            onPress={navigateToPreviousMonth}
          >
            <Text style={styles.monthArrowText}>‹</Text>
          </TouchableOpacity>
          
          <Text style={styles.monthViewTitle}>
            {currentDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
          </Text>
          
          <TouchableOpacity 
            style={styles.monthArrow}
            onPress={navigateToNextMonth}
          >
            <Text style={styles.monthArrowText}>›</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.monthArrow}
            onPress={navigateToNextYear}
          >
            <Text style={styles.monthArrowText}>››</Text>
          </TouchableOpacity>
        </View>
        
        {/* Calendar Component */}
        <Calendar
          key={`${selectedDate}-${viewMode}`} // Force re-render when date or view mode changes
          current={selectedDate}
          onDayPress={async (day) => {
            console.log('📅 Day pressed:', day.dateString);
            setSelectedDate(day.dateString);
            // Reload events for the selected day
            await loadEvents(day.dateString, viewMode);
          }}
          hideArrows={true} // Hide built-in arrows since we have custom ones
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
      </View>
    );
  };

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
    
    // Navigation functions
    const navigateToPreviousWeek = async () => {
      const newDate = new Date(startOfWeek);
      newDate.setDate(startOfWeek.getDate() - 7);
      const newDateString = newDate.toISOString().split('T')[0];
      setSelectedDate(newDateString);
      await loadEvents(newDateString, viewMode);
    };
    
    const navigateToNextWeek = async () => {
      const newDate = new Date(startOfWeek);
      newDate.setDate(startOfWeek.getDate() + 7);
      const newDateString = newDate.toISOString().split('T')[0];
      setSelectedDate(newDateString);
      await loadEvents(newDateString, viewMode);
    };
    
    return (
      <View style={styles.weekView}>
        {/* Week Navigation Header */}
        <View style={styles.weekNavigation}>
          <TouchableOpacity 
            style={styles.weekArrow}
            onPress={navigateToPreviousWeek}
          >
            <Text style={styles.weekArrowText}>‹</Text>
          </TouchableOpacity>
          
          <Text style={styles.weekViewTitle}>Semaine du {startOfWeek.toLocaleDateString('fr-FR')}</Text>
          
          <TouchableOpacity 
            style={styles.weekArrow}
            onPress={navigateToNextWeek}
          >
            <Text style={styles.weekArrowText}>›</Text>
          </TouchableOpacity>
        </View>
        
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
                      style={[styles.weekEventDot, { backgroundColor: getEventColor(event.type) }]}
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
                style={[styles.weekEventItem, { borderLeftColor: getEventColor(event.type) }]}
                onPress={() => handleEventPress(event)}
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
    
    // Navigation functions
    const navigateToPreviousDay = async () => {
      const newDate = new Date(selectedDate);
      newDate.setDate(newDate.getDate() - 1);
      const newDateString = newDate.toISOString().split('T')[0];
      setSelectedDate(newDateString);
      await loadEvents(newDateString, viewMode);
    };
    
    const navigateToNextDay = async () => {
      const newDate = new Date(selectedDate);
      newDate.setDate(newDate.getDate() + 1);
      const newDateString = newDate.toISOString().split('T')[0];
      setSelectedDate(newDateString);
      await loadEvents(newDateString, viewMode);
    };
    
    return (
      <View style={styles.dayView}>
        {/* Day Navigation Header */}
        <View style={styles.dayNavigation}>
          <TouchableOpacity 
            style={styles.dayArrow}
            onPress={navigateToPreviousDay}
          >
            <Text style={styles.dayArrowText}>‹</Text>
          </TouchableOpacity>
          
          <Text style={styles.dayViewTitle}>
            {new Date(selectedDate).toLocaleDateString('fr-FR', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </Text>
          
          <TouchableOpacity 
            style={styles.dayArrow}
            onPress={navigateToNextDay}
          >
            <Text style={styles.dayArrowText}>›</Text>
          </TouchableOpacity>
        </View>
        
        <ScrollView style={styles.dayEventsList}>
          {dayEvents.length === 0 ? (
            <Text style={styles.noEventsText}>No events for this day</Text>
          ) : (
            dayEvents.map(event => (
              <TouchableOpacity
                key={event.id}
                style={[styles.dayEventItem, { borderLeftColor: getEventColor(event.type) }]}
                onPress={() => handleEventPress(event)}
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
    console.log('📅 YearView rendering for year:', currentYear);
    
    // Create months array for the year
    const months = [
      'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
      'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
    ];
    
    // Function to handle year navigation
    const navigateToYear = async (newYear) => {
      console.log('📅 Navigating to year:', newYear, 'from current year:', currentYear);
      const newDate = new Date(newYear, 0, 1).toISOString().split('T')[0];
      console.log('📅 Setting new date to:', newDate);
      setSelectedDate(newDate);
      // Force reload events for the new year
      await loadEvents(newDate, 'year');
    };
    
    // Get events for the entire year
    const yearEvents = events.length > 0 ? events : [];
    
    return (
      <View style={styles.yearView}>
        {/* Year Navigation Header */}
        <View style={styles.yearNavigation}>
          <TouchableOpacity 
            style={styles.yearArrow}
            onPress={async () => {
              console.log('📅 Year view - Previous year clicked');
              await navigateToYear(currentYear - 1);
            }}
          >
            <Text style={styles.yearArrowText}>‹</Text>
          </TouchableOpacity>
          
          <Text style={styles.yearViewTitle}>{currentYear}</Text>
          
          <TouchableOpacity 
            style={styles.yearArrow}
            onPress={async () => {
              console.log('📅 Year view - Next year clicked');
              await navigateToYear(currentYear + 1);
            }}
          >
            <Text style={styles.yearArrowText}>›</Text>
          </TouchableOpacity>
        </View>
        
        {/* Year Stats */}
        <View style={styles.yearStatsContainer}>
          <Text style={styles.yearStatsTitle}>Vue d'ensemble de l'année</Text>
          <View style={styles.yearStatsRow}>
            <View style={styles.yearStatItem}>
              <Text style={styles.yearStatNumber}>{yearEvents.length}</Text>
              <Text style={styles.yearStatLabel}>Événements</Text>
            </View>
            <View style={styles.yearStatItem}>
              <Text style={styles.yearStatNumber}>{new Set(yearEvents.map(e => e.type)).size}</Text>
              <Text style={styles.yearStatLabel}>Types</Text>
            </View>
            <View style={styles.yearStatItem}>
              <Text style={styles.yearStatNumber}>{new Set(yearEvents.map(e => e.date?.split('T')[0])).size}</Text>
              <Text style={styles.yearStatLabel}>Jours actifs</Text>
            </View>
          </View>
        </View>
        
        {/* Months Grid */}
        <View style={styles.yearMonthsGrid}>
          {months.map((month, index) => {
            const monthDate = new Date(currentYear, index, 1);
            const monthString = monthDate.toISOString().split('T')[0];
            const selectedMonth = new Date(selectedDate).getMonth();
            const selectedYear = new Date(selectedDate).getFullYear();
            const isCurrentMonth = index === selectedMonth && currentYear === selectedYear;
            
            // Count events for this month
            const monthEvents = yearEvents.filter(event => {
              const eventDate = new Date(event.date || event.event_date);
              return eventDate.getMonth() === index && eventDate.getFullYear() === currentYear;
            });
            
            return (
              <TouchableOpacity
                key={`${currentYear}-${index}`}
                style={[
                  styles.yearMonthButton,
                  isCurrentMonth && styles.yearMonthButtonActive
                ]}
                onPress={async () => {
                  console.log('📅 Year view - Month selected:', month, 'index:', index, 'year:', currentYear);
                  console.log('📅 Year view - Setting date to:', monthString);
                  setSelectedDate(monthString);
                  // Switch to month view when a month is selected
                  setViewMode('month');
                  await loadEvents(monthString, 'month');
                }}
              >
                <Text style={[
                  styles.yearMonthText,
                  isCurrentMonth && styles.yearMonthTextActive
                ]}>
                  {month}
                </Text>
                {monthEvents.length > 0 && (
                  <Text style={[
                    styles.yearMonthEventCount,
                    isCurrentMonth && styles.yearMonthEventCountActive
                  ]}>
                    {monthEvents.length} événement{monthEvents.length > 1 ? 's' : ''}
                  </Text>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
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
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
        <View style={styles.header}>
          <View style={[styles.statusBarOverlay, { height: insets.top }]} />
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>
              📅 Événements {isRefreshing && '🔄'}
            </Text>
            <TouchableOpacity style={styles.addButton} onPress={() => openAddModal()}>
              <Text style={styles.addButtonText}>+ Ajouter</Text>
          </TouchableOpacity>
          </View>
        </View>
      <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>

      {/* For Year view, use different layout to avoid VirtualizedList nesting */}
      {viewMode === 'year' ? (
        <ScrollView 
          style={styles.yearViewContainer} 
          showsVerticalScrollIndicator={true}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              colors={['#005F6B']} // Android
              tintColor="#005F6B" // iOS
              title="Mise à jour des données..."
              titleColor="#005F6B"
            />
          }
        >
          {/* Events section at top */}
          <View style={styles.selectedDateSection}>
            <Text style={styles.selectedDateTitle}>
              Événements du jour ({new Date(selectedDate).toLocaleDateString('fr-FR')}):
            </Text>
            <View style={styles.eventsList}>
              {selectedDateEvents.length === 0 ? (
                <Text style={styles.noEventsText}>Aucun événement ce jour</Text>
              ) : (
                selectedDateEvents.map(event => (
          <TouchableOpacity 
                    key={event.id}
                    style={[styles.eventItem, { borderLeftColor: getEventColor(event.type) }]}
                    onPress={() => handleEventPress(event)}
                  >
                    <Text style={styles.eventIcon}>{getEventIcon(event.type)}</Text>
                    <View style={styles.eventDetails}>
                      <Text style={styles.eventTitle}>{event.title}</Text>
                      <Text style={styles.eventType}>{event.type}</Text>
                      {event.product && (
                        <Text style={styles.eventProduct}>🏷️ {event.product}</Text>
                      )}
                      {event.notes && (
                        <Text style={styles.eventNotes}>📝 {event.notes}</Text>
                      )}
                    </View>
          </TouchableOpacity>
                ))
              )}
            </View>
          </View>

        <ViewModeSelector />

          {/* Calendar section - Year view with months grid */}
          <View style={styles.yearCalendarContainer}>
          {renderCalendarView()}
        </View>

          {/* Add some bottom padding for better scrolling */}
          <View style={styles.bottomPadding} />
        </ScrollView>
      ) : (
        <ScrollView 
          style={styles.mainScrollView} 
          showsVerticalScrollIndicator={true}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              colors={['#005F6B']} // Android
              tintColor="#005F6B" // iOS
              title="Mise à jour des données..."
              titleColor="#005F6B"
            />
          }
        >
          {/* Événements du jour - Show first, above calendar */}
          <View style={styles.selectedDateSection}>
            <Text style={styles.selectedDateTitle}>
              Événements du jour ({new Date(selectedDate).toLocaleDateString('fr-FR')}):
            </Text>
            <View style={styles.eventsList}>
              {selectedDateEvents.length === 0 ? (
                <Text style={styles.noEventsText}>Aucun événement ce jour</Text>
              ) : (
                selectedDateEvents.map(event => (
                  <TouchableOpacity
                    key={event.id}
                    style={[styles.eventItem, { borderLeftColor: getEventColor(event.type) }]}
                    onPress={() => handleEventPress(event)}
                  >
                    <Text style={styles.eventIcon}>{getEventIcon(event.type)}</Text>
                    <View style={styles.eventDetails}>
                      <Text style={styles.eventTitle}>{event.title}</Text>
                      <Text style={styles.eventType}>{event.type}</Text>
                      {event.product && (
                        <Text style={styles.eventProduct}>🏷️ {event.product}</Text>
                      )}
                      {event.notes && (
                        <Text style={styles.eventNotes}>📝 {event.notes}</Text>
                      )}
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </View>
          </View>

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
                      style={[styles.eventItem, { borderLeftColor: getEventColor(event.type) }]}
                      onPress={() => handleEventPress(event)}
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

      </ScrollView>
      )}

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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f8ff', // Light blue-gray instead of white
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
  mainScrollView: {
    flex: 1,
  },
  header: {
    backgroundColor: '#005F6B', // Darker blue, like duck blue (bleu canard)
    paddingTop: 15,
  },
  headerContent: {
    padding: 10,
    paddingTop: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    flex: 1,
  },
  refreshButton: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  refreshButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  syncButton: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  syncButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
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
    marginHorizontal: 15,
    marginTop: 5,
    marginBottom: 15,
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
  yearViewContainer: {
    flex: 1,
  },
  yearCalendarContainer: {
    backgroundColor: 'white',
    marginHorizontal: 15,
    marginBottom: 15,
    borderRadius: 12,
    overflow: 'hidden',
    minHeight: 400, // Ensure enough height for the months grid
  },
  yearView: {
    flex: 1,
  },
  yearNavigation: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  yearArrow: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#005F6B',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 20,
  },
  yearArrowText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  weekNavigation: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
  },
  weekArrow: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#005F6B',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 15,
  },
  weekArrowText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  dayNavigation: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
  },
  dayArrow: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#005F6B',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 15,
  },
  dayArrowText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  monthViewContainer: {
    flex: 1,
  },
  monthNavigation: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 10,
  },
  monthArrow: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#005F6B',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 4,
  },
  monthArrowText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: 'white',
  },
  monthViewTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginHorizontal: 10,
    flex: 1,
    textAlign: 'center',
  },
  yearViewTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#4CAF50',
    minWidth: 100,
  },
  yearMonthsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    padding: 10,
  },
  yearMonthButton: {
    width: '30%',
    aspectRatio: 1,
    margin: 5,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  yearMonthButtonActive: {
    backgroundColor: '#005F6B',
    borderColor: '#005F6B',
  },
  yearMonthText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  yearMonthTextActive: {
    color: 'white',
  },
  yearMonthEventCount: {
    fontSize: 9,
    color: '#666',
    marginTop: 2,
    textAlign: 'center',
  },
  yearMonthEventCountActive: {
    color: 'rgba(255,255,255,0.8)',
  },
  yearStatsContainer: {
    backgroundColor: '#f8f9fa',
    marginHorizontal: 15,
    marginBottom: 15,
    borderRadius: 12,
    padding: 15,
  },
  yearStatsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
    textAlign: 'center',
  },
  yearStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  yearStatItem: {
    alignItems: 'center',
  },
  yearStatNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#005F6B',
  },
  yearStatLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  yearEventsSummary: {
    backgroundColor: 'white',
    marginHorizontal: 15,
    marginBottom: 15,
    borderRadius: 12,
    padding: 15,
  },
  yearEventsSummaryTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  yearEventsList: {
    maxHeight: 300,
  },
  yearEventItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
    borderLeftWidth: 4,
  },
  yearEventIcon: {
    fontSize: 16,
    marginRight: 12,
  },
  yearEventDetails: {
    flex: 1,
  },
  yearEventTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  yearEventDate: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  selectedDateSection: {
    backgroundColor: 'white',
    marginHorizontal: 15,
    marginBottom: 5,
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
  eventProduct: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  eventNotes: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 2,
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
  exportButton: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  exportButtonDisabled: {
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  exportButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  backupButton: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  backupButtonDisabled: {
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  backupButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  bottomPadding: {
    height: 50,
  },
});
