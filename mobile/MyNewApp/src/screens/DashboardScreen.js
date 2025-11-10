import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity,
  RefreshControl,
  Alert,
  StatusBar,
  Platform
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import database from '../services/database';
import emailService from '../services/emailService';
import * as Sharing from 'expo-sharing';
import { getStatusColor, getStatusIcon } from '../../constants/StatusConstants';

export default function DashboardScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalOrders: 0,
    pendingOrders: 0,
    totalRevenue: 0,
    lowStockItems: 0
  });
  const [weeklyEvents, setWeeklyEvents] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  // Refresh data when screen comes into focus (user navigates back to dashboard)
  useFocusEffect(
    useCallback(() => {
      console.log('📊 Dashboard: Screen focused, refreshing data...');
      // Add a small delay to ensure navigation is complete
      const timer = setTimeout(() => {
        loadDashboardData();
      }, 100);
      return () => clearTimeout(timer);
    }, [])
  );

  const loadDashboardData = async () => {
    try {
      // Wait for database initialization to complete
      await database.waitForInitialization();
      
      const [products, orders, events, lots, historique] = await Promise.all([
        database.getProducts(),
        database.getOrders(),
        database.getEvents(),
        database.getLots(),
        database.getHistorique()
      ]);

      console.log('📊 Dashboard: Loading data -', {
        products: products.length,
        orders: orders.length,
        events: events.length,
        lots: lots.length
      });

      const pendingOrders = orders.filter(order => order.status === 'En attente');
      const totalRevenue = orders.reduce((sum, order) => sum + (order.totalPrice || 0), 0);
      const lowStockItems = products.filter(product => (product.quantity || 0) < 10).length;

      const newStats = {
        totalProducts: products.length,
        totalOrders: orders.length,
        pendingOrders: pendingOrders.length,
        totalRevenue: totalRevenue,
        lowStockItems: lowStockItems
      };

      console.log('📊 Dashboard: Setting stats -', newStats);
      setStats(newStats);

      // Get events for the next 7 days
      const today = new Date();
      const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
      
      const upcomingEvents = events.filter(event => {
        const eventDate = new Date(event.date);
        return eventDate >= today && eventDate <= nextWeek;
      });

      setWeeklyEvents(upcomingEvents);

      // Generate recent activity from all data sources
      const activity = generateRecentActivity(orders, products, events, lots, historique);
      setRecentActivity(activity);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      Alert.alert('Error', 'Failed to load dashboard data');
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  const handleExport = async (tableName) => {
    try {
      // Show loading alert
      Alert.alert('Export en cours', 'Génération du fichier CSV...');
      
      // Export data to CSV
      console.log(`Exporting ${tableName}...`);
      const exportResult = await database.exportToCSV(tableName);
      console.log(`Export result for ${tableName}:`, exportResult);
      
      if (exportResult.fileUri) {
        Alert.alert('Export réussi', `Fichier ${tableName} exporté avec succès!\n\nLe fichier a été sauvegardé sur votre appareil.`);
      } else {
        Alert.alert('Succès', `${tableName} exporté avec succès!`);
      }
    } catch (error) {
      console.error('Export error:', error);
      Alert.alert('Erreur', error.message || `Impossible d'exporter ${tableName}`);
    }
  };

  const handleCalendarWithOrdersExport = async () => {
    try {
      Alert.alert('Export en cours', 'Génération du calendrier avec commandes...');
      
      console.log('Exporting calendar with orders...');
      const exportResult = await database.exportCalendarWithOrders();
      console.log('Calendar with orders export result:', exportResult);
      
      if (exportResult.fileUri) {
        Alert.alert('Export réussi', 'Fichier calendrier avec commandes exporté avec succès!\n\nLe fichier a été sauvegardé sur votre appareil.');
      } else {
        Alert.alert('Succès', 'Calendrier avec commandes exporté avec succès!');
      }
    } catch (error) {
      console.error('Calendar export error:', error);
      Alert.alert('Erreur', error.message || 'Impossible d\'exporter le calendrier avec commandes');
    }
  };

  const handleBackup = async () => {
    try {
      Alert.alert('Sauvegarde en cours', 'Création de la sauvegarde complète...');
      
      const filesToSend = [];
      const tables = ['products', 'orders', 'calendar_events', 'elevage_lots', 'elevage_races', 'elevage_historique', 'caprin_animals', 'caprin_settings', 'saved_formulas', 'order_pricing', 'pricing_grids', 'template_messages'];
      
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
      console.error('Backup error:', error);
      Alert.alert('Erreur', 'Impossible de créer la sauvegarde');
    }
  };

  const handleImport = async () => {
    try {
      Alert.alert(
        'Importer des données',
        'Choisissez le type d\'importation:',
        [
          { text: 'Annuler', style: 'cancel' },
          { 
            text: 'Fichier JSON (Sauvegarde complète)', 
            onPress: () => handleImportJSON()
          },
          { 
            text: 'Fichier CSV (Données spécifiques)', 
            onPress: () => handleImportCSV()
          }
        ]
      );
    } catch (error) {
      console.error('Import error:', error);
      Alert.alert('Erreur', 'Impossible d\'importer les données');
    }
  };

  const handleImportJSON = async () => {
    try {
      Alert.alert(
        'Import JSON',
        'Cette fonctionnalité nécessite l\'accès aux fichiers. Dans une vraie application, vous pourriez utiliser un sélecteur de fichiers.',
        [
          { text: 'Annuler', style: 'cancel' },
          { 
            text: 'Simuler Import', 
            onPress: () => {
              Alert.alert('Import simulé', 'Dans une vraie application, le fichier JSON serait lu et les données restaurées.');
            }
          }
        ]
      );
    } catch (error) {
      console.error('JSON import error:', error);
      Alert.alert('Erreur', 'Impossible d\'importer le fichier JSON');
    }
  };

  const handleImportCSV = async () => {
    try {
      Alert.alert(
        'Import CSV',
        'Choisissez le type de données à importer:',
        [
          { text: 'Annuler', style: 'cancel' },
          { text: 'Commandes', onPress: () => simulateCSVImport('orders') },
          { text: 'Produits', onPress: () => simulateCSVImport('products') },
          { text: 'Événements Calendrier', onPress: () => simulateCSVImport('calendar_events') },
          { text: 'Messages Modèles', onPress: () => simulateCSVImport('template_messages') },
          { text: 'Animaux Caprins', onPress: () => simulateCSVImport('caprin_animals') }
        ]
      );
    } catch (error) {
      console.error('CSV import error:', error);
      Alert.alert('Erreur', 'Impossible d\'importer le fichier CSV');
    }
  };

  const simulateCSVImport = (dataType) => {
    Alert.alert(
      'Import CSV Simulé',
      `Importation de ${dataType} simulée.\n\nDans une vraie application:\n1. Un sélecteur de fichiers s'ouvrirait\n2. Le fichier CSV serait lu\n3. Les données seraient validées\n4. Vous pourriez choisir de fusionner ou remplacer\n5. Les données seraient importées dans la base`,
      [
        { text: 'OK' },
        { 
          text: 'Simuler Fusion', 
          onPress: () => Alert.alert('Fusion simulée', `Les données ${dataType} seraient fusionnées avec les données existantes.`)
        },
        { 
          text: 'Simuler Remplacement', 
          onPress: () => Alert.alert('Remplacement simulé', `Toutes les données ${dataType} existantes seraient remplacées.`)
        }
      ]
    );
  };

  // Status colors and icons are now imported from StatusConstants

  const generateRecentActivity = (orders, products, events, lots, historique) => {
    const activities = [];
    const now = new Date();

    // Helper function to calculate time ago
    const getTimeAgo = (dateString) => {
      const date = new Date(dateString);
      const diffMs = now - date;
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffHours / 24);

      if (diffHours < 1) return 'Il y a moins d\'une heure';
      if (diffHours < 24) return `Il y a ${diffHours} heure${diffHours > 1 ? 's' : ''}`;
      if (diffDays < 7) return `Il y a ${diffDays} jour${diffDays > 1 ? 's' : ''}`;
      return `Il y a ${Math.floor(diffDays / 7)} semaine${Math.floor(diffDays / 7) > 1 ? 's' : ''}`;
    };

    // Recent orders (last 7 days)
    const recentOrders = orders
      .filter(order => {
        const orderDate = new Date(order.orderDate);
        const daysDiff = (now - orderDate) / (1000 * 60 * 60 * 24);
        return daysDiff <= 7;
      })
      .sort((a, b) => new Date(b.orderDate) - new Date(a.orderDate))
      .slice(0, 3);

    recentOrders.forEach(order => {
      let activityText = '';
      if (order.orderType === 'Adoption') {
        activityText = `🦆 Nouvelle adoption: ${order.customerName} - ${order.animalType || 'animaux'} ${order.race || ''}`;
      } else if (order.orderType === 'Autres produits') {
        activityText = `📦 Nouvelle commande de produits: ${order.customerName} - ${order.product || 'produits'}`;
      } else {
        activityText = `📦 Nouvelle commande: ${order.customerName} - ${order.orderType}`;
      }

      activities.push({
        id: `order-${order.id}`,
        text: activityText,
        time: getTimeAgo(order.orderDate),
        type: 'order',
        timestamp: new Date(order.orderDate)
      });
    });

    // Recent events (last 7 days)
    const recentEvents = events
      .filter(event => {
        const eventDate = new Date(event.date);
        const daysDiff = (now - eventDate) / (1000 * 60 * 60 * 24);
        return daysDiff <= 7;
      })
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 2);

    recentEvents.forEach(event => {
      let activityText = '';
      if (event.type === 'Récupération') {
        activityText = `📅 Récupération prévue: ${event.customer_name || 'Client'} - ${event.title}`;
      } else if (event.type === 'Alimentation') {
        activityText = `🌾 Alimentation: ${event.title}`;
      } else if (event.type === 'Entretien') {
        activityText = `🧹 Entretien: ${event.title}`;
      } else {
        activityText = `📅 ${event.type}: ${event.title}`;
      }

      activities.push({
        id: `event-${event.id}`,
        text: activityText,
        time: getTimeAgo(event.date),
        type: 'event',
        timestamp: new Date(event.date)
      });
    });

    // Recent lots (last 7 days)
    const recentLots = lots
      .filter(lot => {
        const lotDate = new Date(lot.date_creation);
        const daysDiff = (now - lotDate) / (1000 * 60 * 60 * 24);
        return daysDiff <= 7;
      })
      .sort((a, b) => new Date(b.date_creation) - new Date(a.date_creation))
      .slice(0, 2);

    recentLots.forEach(lot => {
      activities.push({
        id: `lot-${lot.id}`,
        text: `🐣 Nouveau lot créé: ${lot.name}`,
        time: getTimeAgo(lot.date_creation),
        type: 'lot',
        timestamp: new Date(lot.date_creation)
      });
    });

    // Recent historique entries (last 7 days)
    const recentHistorique = historique
      .filter(entry => {
        const entryDate = new Date(entry.date);
        const daysDiff = (now - entryDate) / (1000 * 60 * 60 * 24);
        return daysDiff <= 7;
      })
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 2);

    recentHistorique.forEach(entry => {
      let activityText = '';
      if (entry.type === 'Mort') {
        activityText = `💀 Mort enregistrée: ${entry.race} - ${entry.description}`;
      } else if (entry.type === 'Naissance') {
        activityText = `🐣 Naissance enregistrée: ${entry.race}`;
      } else {
        activityText = `📝 ${entry.type}: ${entry.race} - ${entry.description}`;
      }

      activities.push({
        id: `hist-${entry.id}`,
        text: activityText,
        time: getTimeAgo(entry.date),
        type: 'historique',
        timestamp: new Date(entry.date)
      });
    });

    // Sort all activities by timestamp (most recent first) and take top 5
    return activities
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 5);
  };

  const StatCard = ({ title, value, color, icon }) => (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <Text style={styles.statTitle}>{title}</Text>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <View style={styles.header}>
        <View style={[styles.statusBarOverlay, { height: insets.top * 0.8 }]} />
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>🐓 La Ferme Aux oeufs bleus</Text>
          <Text style={styles.headerDate}>
            {new Date().toLocaleDateString('fr-FR', {
              weekday: 'long',
              month: 'long',
              day: 'numeric'
            })}
          </Text>
        </View>
      </View>
      <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
      <ScrollView 
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >

      {/* Compact General Status */}
      <View style={styles.compactStatusContainer}>
        <View style={styles.statusRow}>
          <View style={styles.statusItem}>
            <Text style={styles.statusLabel}>Produits</Text>
            <Text style={[styles.statusValue, { color: '#4CAF50' }]}>{stats.totalProducts}</Text>
          </View>
          <View style={styles.statusItem}>
            <Text style={styles.statusLabel}>Commandes</Text>
            <Text style={[styles.statusValue, { color: '#2196F3' }]}>{stats.totalOrders}</Text>
          </View>
          <View style={styles.statusItem}>
            <Text style={styles.statusLabel}>En Attente</Text>
            <Text style={[styles.statusValue, { color: '#FF9800' }]}>{stats.pendingOrders}</Text>
          </View>
          <View style={styles.statusItem}>
            <Text style={styles.statusLabel}>Revenus</Text>
            <Text style={[styles.statusValue, { color: '#4CAF50' }]}>{stats.totalRevenue.toFixed(0)}€</Text>
          </View>
        </View>
      </View>

      {/* Weekly Events Preview */}
      <View style={styles.weeklyEventsContainer}>
        <TouchableOpacity 
          style={styles.weeklyEventsHeader}
          onPress={() => {
            if (navigation && navigation.navigate) {
              navigation.navigate('Calendrier');
            }
          }}
        >
          <Text style={styles.weeklyEventsTitle}>
            📅 {weeklyEvents.length} événement{weeklyEvents.length > 1 ? 's' : ''} de la semaine
          </Text>
          <Text style={styles.arrowText}>→</Text>
        </TouchableOpacity>
        
        {weeklyEvents.length > 0 ? (
          <View style={styles.eventsList}>
            {weeklyEvents.slice(0, 3).map((event, index) => (
              <View key={index} style={styles.eventItem}>
                <View style={styles.eventInfo}>
                  <Text style={styles.eventTitle}>{event.title}</Text>
                  <Text style={styles.eventDate}>
                    {new Date(event.date).toLocaleDateString('fr-FR', { 
                      weekday: 'short', 
                      day: 'numeric',
                      month: 'short'
                    })}
                  </Text>
                </View>
                {event.type === 'Récupération' && event.customer_name && (
                  <View style={styles.eventStatus}>
                    <Text style={[styles.statusBadge, { 
                      backgroundColor: getStatusColor(event.status || 'En attente') 
                    }]}>
                      {getStatusIcon(event.status || 'En attente')} {event.status || 'En attente'}
                    </Text>
                  </View>
                )}
              </View>
            ))}
            {weeklyEvents.length > 3 && (
              <Text style={styles.moreEventsText}>
                +{weeklyEvents.length - 3} autres événements...
              </Text>
            )}
          </View>
        ) : (
          <Text style={styles.noEventsText}>Pas d'événement pour la semaine à venir</Text>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Activité Récente</Text>
        {recentActivity.length > 0 ? (
          recentActivity.map((activity) => (
            <View key={activity.id} style={styles.activityItem}>
              <Text style={styles.activityText}>{activity.text}</Text>
              <Text style={styles.activityTime}>{activity.time}</Text>
            </View>
          ))
        ) : (
          <View style={styles.activityItem}>
            <Text style={styles.activityText}>📋 Aucune activité récente</Text>
            <Text style={styles.activityTime}>Les nouvelles activités apparaîtront ici</Text>
          </View>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Actions Rapides</Text>
        <View style={styles.quickActions}>
          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionButtonText}>📝 Ajouter Produit</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionButtonText}>📅 Voir Calendrier</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionButtonText}>📊 Statistiques</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Export de Données</Text>
        <View style={styles.quickActions}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => handleExport('products')}
          >
            <Text style={styles.actionButtonText}>📤 Exporter Produits</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => handleExport('orders')}
          >
            <Text style={styles.actionButtonText}>📤 Exporter Commandes</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => handleExport('calendar_events')}
          >
            <Text style={styles.actionButtonText}>📅 Exporter Calendrier</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={handleCalendarWithOrdersExport}
          >
            <Text style={styles.actionButtonText}>📋 Calendrier + Commandes</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={handleBackup}
          >
            <Text style={styles.actionButtonText}>💾 Sauvegarder Tout</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={handleImport}
          >
            <Text style={styles.actionButtonText}>📥 Importer Fichier</Text>
          </TouchableOpacity>
        </View>
        
      </View>
      </ScrollView>
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
    paddingHorizontal: 10, 
    paddingVertical: 5, 
    zIndex: 1,
  },
  safeArea: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    backgroundColor: '#005F6B', // Darker blue, like duck blue (bleu canard)
    paddingTop: 38,
  },
  headerContent: {
    padding: 10,
    paddingTop: 15,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 5,
  },
  headerDate: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
  },
  compactStatusContainer: {
    backgroundColor: 'white',
    margin: 15,
    borderRadius: 12,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statusItem: {
    alignItems: 'center',
    flex: 1,
  },
  statusLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  statusValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  weeklyEventsContainer: {
    backgroundColor: 'white',
    margin: 15,
    marginTop: 0,
    borderRadius: 12,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  weeklyEventsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  weeklyEventsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  arrowText: {
    fontSize: 18,
    color: '#005F6B',
    fontWeight: 'bold',
  },
  eventsList: {
    gap: 8,
  },
  eventItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  eventInfo: {
    flex: 1,
  },
  eventTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  eventDate: {
    fontSize: 12,
    color: '#666',
  },
  eventStatus: {
    marginLeft: 10,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    fontSize: 10,
    fontWeight: '600',
    color: 'white',
  },
  moreEventsText: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 5,
  },
  noEventsText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic',
    paddingVertical: 10,
  },
  section: {
    margin: 15,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  activityItem: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  activityText: {
    fontSize: 16,
    color: '#333',
    marginBottom: 3,
  },
  activityTime: {
    fontSize: 12,
    color: '#999',
  },
  quickActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  actionButton: {
    flex: 1,
    minWidth: 100,
    backgroundColor: '#005F6B',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
  },
  actionButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
});