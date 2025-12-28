import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity,
  StatusBar
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { 
  getStatusColor, 
  getStatusIcon, 
  getStatusDefinition
} from '../../constants/StatusConstants';

export default function OrderStatsScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const orders = route?.params?.orders || [];

  const getOrderStatistics = () => {
    const stats = {
      byStatus: {
        'En attente': 0,
        'Confirmée': 0,
        'Livrée': 0,
        'Annulées': 0
      },
      byCustomer: {},
      byProduct: {},
      byMonth: {},
      totalRevenue: 0,
      averagePrice: 0,
      priceRange: { min: Infinity, max: 0 }
    };

    orders.forEach(order => {
      // Status counts
      if (stats.byStatus.hasOwnProperty(order.status)) {
        stats.byStatus[order.status]++;
      }

      // Customer frequency
      const customerName = order.customerName || 'Inconnu';
      if (!stats.byCustomer[customerName]) {
        stats.byCustomer[customerName] = { count: 0, totalSpent: 0, orders: [] };
      }
      stats.byCustomer[customerName].count++;
      stats.byCustomer[customerName].totalSpent += order.totalPrice || 0;
      stats.byCustomer[customerName].orders.push(order);

      // Product/Animal type frequency
      if (order.orderType === 'Adoption' && order.animalDetails) {
        Object.keys(order.animalDetails).forEach(animalType => {
          const detail = order.animalDetails[animalType];
          if (detail.races) {
            detail.races.forEach(raceConfig => {
              const key = `${animalType} - ${raceConfig.race}`;
              stats.byProduct[key] = (stats.byProduct[key] || 0) + (raceConfig.quantity || 0);
            });
          }
        });
      } else if (order.product) {
        stats.byProduct[order.product] = (stats.byProduct[order.product] || 0) + (order.quantity || 1);
      }

      // Monthly demand
      const orderDate = new Date(order.orderDate);
      const monthKey = `${orderDate.getFullYear()}-${String(orderDate.getMonth() + 1).padStart(2, '0')}`;
      stats.byMonth[monthKey] = (stats.byMonth[monthKey] || 0) + 1;

      // Price statistics
      const price = order.totalPrice || 0;
      stats.totalRevenue += price;
      if (price > 0) {
        stats.priceRange.min = Math.min(stats.priceRange.min, price);
        stats.priceRange.max = Math.max(stats.priceRange.max, price);
      }
    });

    // Calculate average
    const ordersWithPrice = orders.filter(o => o.totalPrice > 0);
    stats.averagePrice = ordersWithPrice.length > 0
      ? stats.totalRevenue / ordersWithPrice.length
      : 0;

    // Sort customers by frequency
    const sortedCustomers = Object.entries(stats.byCustomer)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 10);

    // Sort products by frequency
    const sortedProducts = Object.entries(stats.byProduct)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    // Sort months
    const sortedMonths = Object.entries(stats.byMonth)
      .sort((a, b) => a[0].localeCompare(b[0]));

    return {
      ...stats,
      topCustomers: sortedCustomers,
      topProducts: sortedProducts,
      monthlyData: sortedMonths
    };
  };

  const statistics = getOrderStatistics();
  const maxMonthValue = Math.max(...statistics.monthlyData.map(([, count]) => count), 1);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <View style={styles.header}>
        <View style={[styles.statusBarOverlay, { height: insets.top * 0.8 }]} />
        <View style={styles.headerContent}>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerIcon}>📊</Text>
            <Text style={styles.headerTitleText}>Statistiques</Text>
          </View>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>← Retour</Text>
          </TouchableOpacity>
        </View>
      </View>
      <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={true}>
          {/* Status Overview */}
          <View style={styles.statsSection}>
            <Text style={styles.statsSectionTitle}>Statuts des Commandes</Text>
            <View style={styles.statusStatsGrid}>
              {Object.entries(statistics.byStatus).map(([status, count]) => {
                const statusDef = getStatusDefinition(status);
                return (
                  <View key={status} style={styles.statusStatCard}>
                    <Text style={[styles.statusStatIcon, { color: statusDef.color }]}>
                      {statusDef.icon}
                    </Text>
                    <Text style={styles.statusStatCount}>{count}</Text>
                    <Text style={styles.statusStatLabel}>{status}</Text>
                  </View>
                );
              })}
            </View>
          </View>

          {/* Revenue Stats */}
          <View style={styles.statsSection}>
            <Text style={styles.statsSectionTitle}>Revenus</Text>
            <View style={styles.revenueStats}>
              <View style={styles.revenueStatItem}>
                <Text style={styles.revenueStatLabel}>Total</Text>
                <Text style={styles.revenueStatValue}>{statistics.totalRevenue.toFixed(2)}€</Text>
              </View>
              <View style={styles.revenueStatItem}>
                <Text style={styles.revenueStatLabel}>Moyenne</Text>
                <Text style={styles.revenueStatValue}>{statistics.averagePrice.toFixed(2)}€</Text>
              </View>
              <View style={styles.revenueStatItem}>
                <Text style={styles.revenueStatLabel}>Min - Max</Text>
                <Text style={styles.revenueStatValue}>
                  {statistics.priceRange.min !== Infinity 
                    ? `${statistics.priceRange.min.toFixed(2)}€ - ${statistics.priceRange.max.toFixed(2)}€`
                    : 'N/A'}
                </Text>
              </View>
            </View>
          </View>

          {/* Monthly Demand Chart */}
          <View style={styles.statsSection}>
            <Text style={styles.statsSectionTitle}>Demande Mensuelle</Text>
            <View style={styles.chartContainer}>
              {statistics.monthlyData.map(([monthKey, count]) => {
                const [year, month] = monthKey.split('-');
                const monthName = new Date(year, parseInt(month) - 1).toLocaleDateString('fr-FR', { month: 'short' });
                const barHeight = (count / maxMonthValue) * 100;
                return (
                  <View key={monthKey} style={styles.chartBarContainer}>
                    <View style={styles.chartBarWrapper}>
                      <View style={[styles.chartBar, { height: `${barHeight}%` }]} />
                    </View>
                    <Text style={styles.chartBarLabel}>{monthName}</Text>
                    <Text style={styles.chartBarValue}>{count}</Text>
                  </View>
                );
              })}
            </View>
          </View>

          {/* Top Customers */}
          <View style={styles.statsSection}>
            <Text style={styles.statsSectionTitle}>Top Clients</Text>
            {statistics.topCustomers.map(([customer, data], index) => (
              <View key={customer} style={styles.customerStatRow}>
                <Text style={styles.customerStatRank}>#{index + 1}</Text>
                <View style={styles.customerStatInfo}>
                  <Text style={styles.customerStatName}>{customer}</Text>
                  <Text style={styles.customerStatDetails}>
                    {data.count} commande{data.count > 1 ? 's' : ''} • {data.totalSpent.toFixed(2)}€
                  </Text>
                </View>
              </View>
            ))}
            {statistics.topCustomers.length === 0 && (
              <Text style={styles.noDataText}>Aucun client trouvé</Text>
            )}
          </View>

          {/* Top Products */}
          <View style={styles.statsSection}>
            <Text style={styles.statsSectionTitle}>Produits/Animaux les Plus Demandés</Text>
            {statistics.topProducts.map(([product, count], index) => (
              <View key={product} style={styles.productStatRow}>
                <Text style={styles.productStatName}>{product}</Text>
                <Text style={styles.productStatCount}>{count}</Text>
              </View>
            ))}
            {statistics.topProducts.length === 0 && (
              <Text style={styles.noDataText}>Aucun produit trouvé</Text>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f8ff',
  },
  statusBarOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(147, 178, 189, 0.44)',
    paddingHorizontal: 10,
    zIndex: 1,
  },
  safeArea: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    backgroundColor: '#005F6B',
    paddingTop: 38,
  },
  headerContent: {
    padding: 10,
    paddingTop: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerIcon: {
    fontSize: 20,
    marginRight: 8,
    color: 'white',
  },
  headerTitleText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  backButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 8,
  },
  backButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  statsSection: {
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
  statsSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  statusStatsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  statusStatCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  statusStatIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  statusStatCount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  statusStatLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  revenueStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: 10,
  },
  revenueStatItem: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  revenueStatLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  revenueStatValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  chartContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    height: 150,
    paddingVertical: 10,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    paddingHorizontal: 5,
  },
  chartBarContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    height: '100%',
  },
  chartBarWrapper: {
    width: '80%',
    height: '80%',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  chartBar: {
    width: '100%',
    backgroundColor: '#005F6B',
    borderRadius: 4,
    minHeight: 4,
  },
  chartBarLabel: {
    fontSize: 10,
    color: '#666',
    marginTop: 4,
  },
  chartBarValue: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 2,
  },
  customerStatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  customerStatRank: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#005F6B',
    marginRight: 12,
    minWidth: 30,
  },
  customerStatInfo: {
    flex: 1,
  },
  customerStatName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  customerStatDetails: {
    fontSize: 12,
    color: '#666',
  },
  productStatRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  productStatName: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  productStatCount: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#005F6B',
  },
  noDataText: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
    textAlign: 'center',
    padding: 20,
  },
});

