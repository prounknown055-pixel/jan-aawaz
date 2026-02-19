import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Animated, ActivityIndicator
} from 'react-native';
import { useState, useEffect, useRef } from 'react';
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { playTap } from '../../lib/sounds';

const CATEGORY_COLORS = {
  roads: '#F59E0B', water: '#3B82F6', electricity: '#EAB308',
  corruption: '#EF4444', women_safety: '#EC4899', health: '#10B981',
  education: '#8B5CF6', crime: '#F97316', political: '#6366F1',
  general: '#94A3B8', other: '#94A3B8',
};

const CATEGORY_ICONS = {
  roads: '🛣️', water: '💧', electricity: '⚡', corruption: '💰',
  women_safety: '🛡️', health: '🏥', education: '📚', crime: '🚨',
  political: '🏛️', general: '📌', other: '📌',
};

export default function MapScreen() {
  const router = useRouter();
  const webviewRef = useRef(null);
  const [problems, setProblems] = useState([]);
  const [leaders, setLeaders] = useState([]);
  const [userLocation, setUserLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedProblem, setSelectedProblem] = useState(null);
  const [activeFilter, setActiveFilter] = useState('all');
  const [mapStats, setMapStats] = useState({ total: 0, trending: 0 });
  const slideAnim = useRef(new Animated.Value(300)).current;

  useEffect(() => { initMap(); }, []);
  useEffect(() => { loadProblems(); }, [activeFilter]);

  const initMap = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status === 'granted') {
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced
      });
      setUserLocation(loc.coords);
    }
    await loadProblems();
    await loadLeaders();
    setLoading(false);
  };

  const loadProblems = async () => {
    let query = supabase
      .from('problems')
      .select('id,title,category,latitude,longitude,upvote_count,is_trending,area_name,district,state')
      .eq('is_removed', false)
      .not('latitude', 'is', null)
      .not('longitude', 'is', null);

    if (activeFilter !== 'all') query = query.eq('category', activeFilter);
    const { data } = await query.limit(200);
    setProblems(data || []);
    setMapStats({
      total: data?.length || 0,
      trending: data?.filter(p => p.is_trending).length || 0,
    });
  };

  const loadLeaders = async () => {
    const { data } = await supabase
      .from('users')
      .select('id,name,leader_type,leader_lat,leader_lng,leader_area,leader_badge_color')
      .eq('role', 'leader')
      .eq('leader_verified', true)
      .not('leader_lat', 'is', null);
    setLeaders(data || []);
  };

  const showProblemDetail = (problem) => {
    setSelectedProblem(problem);
    Animated.spring(slideAnim, {
      toValue: 0, useNativeDriver: true, tension: 100, friction: 8,
    }).start();
  };

  const hideProblemDetail = async () => {
    await playTap();
    Animated.timing(slideAnim, {
      toValue: 300, duration: 250, useNativeDriver: true,
    }).start(() => setSelectedProblem(null));
  };

  const filters = [
    { key: 'all', label: '🌐 Sab' },
    { key: 'roads', label: '🛣️ Sadak' },
    { key: 'water', label: '💧 Paani' },
    { key: 'electricity', label: '⚡ Bijli' },
    { key: 'corruption', label: '💰 Bhrashtachar' },
    { key: 'women_safety', label: '🛡️ Mahila' },
    { key: 'crime', label: '🚨 Apradh' },
    { key: 'health', label: '🏥 Swasthya' },
  ];

  const getMapHTML = () => {
    const centerLat = userLocation?.latitude || 20.5937;
    const centerLng = userLocation?.longitude || 78.9629;
    const zoom = userLocation ? 12 : 5;

    const problemMarkers = problems.map(p => {
      const color = CATEGORY_COLORS[p.category] || '#94A3B8';
      const icon = CATEGORY_ICONS[p.category] || '📌';
      const title = (p.title || '').replace(/'/g, "\\'").replace(/`/g, '\\`');
      const loc = [p.district, p.state].filter(Boolean).join(', ');
      const radius = p.is_trending ? 12 : 8;
      return `
        L.circleMarker([${p.latitude}, ${p.longitude}], {
          radius: ${radius},
          fillColor: '${color}',
          color: '${p.is_trending ? '#FF6B35' : '#ffffff'}',
          weight: ${p.is_trending ? 3 : 2},
          opacity: 1,
          fillOpacity: 0.9
        }).addTo(map)
        .on('click', function() {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'problem',
            id: '${p.id}',
            title: '${title}',
            category: '${p.category}',
            upvotes: ${p.upvote_count || 0},
            trending: ${p.is_trending || false},
            location: '${loc}'
          }));
        })
        .bindTooltip('${icon} ${title}', {
          permanent: false, direction: 'top'
        });
      `;
    }).join('\n');

    const leaderMarkers = leaders.map(l => {
      const color = l.leader_badge_color || '#FF6B35';
      const name = (l.name || '').replace(/'/g, "\\'");
      return `
        L.marker([${l.leader_lat}, ${l.leader_lng}], {
          icon: L.divIcon({
            html: '<div style="background:${color};width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:3px solid white;font-size:18px;box-shadow:0 2px 8px rgba(0,0,0,0.4)">👑</div>',
            iconSize: [36, 36],
            iconAnchor: [18, 18],
            className: ''
          })
        }).addTo(map)
        .on('click', function() {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'leader',
            id: '${l.id}'
          }));
        })
        .bindTooltip('${name} (${l.leader_type || 'Leader'})', {
          permanent: false, direction: 'top'
        });

        L.circle([${l.leader_lat}, ${l.leader_lng}], {
          radius: 50000,
          fillColor: '${color}',
          fillOpacity: 0.05,
          color: '${color}',
          weight: 1,
          opacity: 0.3
        }).addTo(map);
      `;
    }).join('\n');

    const userMarker = userLocation ? `
      L.circleMarker([${userLocation.latitude}, ${userLocation.longitude}], {
        radius: 10,
        fillColor: '#3B82F6',
        color: '#ffffff',
        weight: 3,
        fillOpacity: 1
      }).addTo(map).bindTooltip('📍 Aap Yahan Hain', { permanent: false });
    ` : '';

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          html, body { width: 100%; height: 100%; background: #0F172A; }
          #map { width: 100%; height: 100%; }
          .leaflet-popup-content-wrapper {
            background: #1E293B !important;
            color: #F1F5F9 !important;
            border: 1px solid #334155;
            border-radius: 12px;
          }
          .leaflet-popup-tip { background: #1E293B !important; }
          .leaflet-tooltip {
            background: #1E293B;
            color: #F1F5F9;
            border: 1px solid #334155;
            border-radius: 8px;
            font-size: 12px;
          }
          .leaflet-control-zoom a {
            background: #1E293B !important;
            color: #F1F5F9 !important;
            border-color: #334155 !important;
          }
        </style>
      </head>
      <body>
        <div id="map"></div>
        <script>
          var map = L.map('map', {
            center: [${centerLat}, ${centerLng}],
            zoom: ${zoom},
            zoomControl: true,
            attributionControl: false
          });

          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '© OpenStreetMap'
          }).addTo(map);

          ${userMarker}
          ${problemMarkers}
          ${leaderMarkers}

          map.on('click', function() {
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'mapclick' }));
          });
        </script>
      </body>
      </html>
    `;
  };

  const handleWebViewMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'problem') {
        showProblemDetail(data);
      } else if (data.type === 'leader') {
        router.push(`/leader/${data.id}`);
      } else if (data.type === 'mapclick') {
        if (selectedProblem) hideProblemDetail();
      }
    } catch (e) {}
  };

  return (
    <View style={styles.container}>
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#FF6B35" />
          <Text style={styles.loadingText}>Map load ho raha hai...</Text>
        </View>
      )}

      <WebView
        ref={webviewRef}
        source={{ html: getMapHTML() }}
        style={styles.map}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        onMessage={handleWebViewMessage}
        onLoad={() => setLoading(false)}
        startInLoadingState={false}
      />

      {/* Stats Bar */}
      <View style={styles.statsBar}>
        <View style={styles.statItem}>
          <Text style={styles.statNum}>{mapStats.total}</Text>
          <Text style={styles.statLabel}>Problems</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={[styles.statNum, { color: '#FF6B35' }]}>{mapStats.trending}</Text>
          <Text style={styles.statLabel}>Trending</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={[styles.statNum, { color: '#F59E0B' }]}>{leaders.length}</Text>
          <Text style={styles.statLabel}>Leaders</Text>
        </View>
      </View>

      {/* Filter Chips */}
      <View style={styles.filterContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          {filters.map(f => (
            <TouchableOpacity
              key={f.key}
              style={[styles.filterChip, activeFilter === f.key && styles.filterChipActive]}
              onPress={async () => {
                await playTap();
                setActiveFilter(f.key);
              }}
              activeOpacity={0.8}
            >
              <Text style={[styles.filterChipText, activeFilter === f.key && styles.filterChipTextActive]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Map Controls */}
      <View style={styles.mapControls}>
        <TouchableOpacity
          style={styles.mapControlBtn}
          onPress={async () => {
            await playTap();
            if (userLocation && webviewRef.current) {
              webviewRef.current.injectJavaScript(`
                map.setView([${userLocation.latitude}, ${userLocation.longitude}], 14);
                true;
              `);
            }
          }}
        >
          <Text style={styles.mapControlIcon}>📍</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.mapControlBtn}
          onPress={async () => {
            await playTap();
            webviewRef.current?.injectJavaScript(`
              map.setView([20.5937, 78.9629], 5);
              true;
            `);
          }}
        >
          <Text style={styles.mapControlIcon}>🇮🇳</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.mapControlBtn, styles.addProblemMapBtn]}
          onPress={async () => {
            await playTap();
            router.push('/problem/add');
          }}
        >
          <Text style={styles.mapControlIcon}>➕</Text>
        </TouchableOpacity>
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        <Text style={styles.legendTitle}>Legend</Text>
        {[
          { color: '#EF4444', label: 'Bhrashtachar' },
          { color: '#3B82F6', label: 'Paani' },
          { color: '#F59E0B', label: 'Sadak' },
        ].map(item => (
          <View key={item.label} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: item.color }]} />
            <Text style={styles.legendText}>{item.label}</Text>
          </View>
        ))}
        <View style={styles.legendItem}>
          <View style={styles.leaderLegendDot} />
          <Text style={styles.legendText}>Leader</Text>
        </View>
      </View>

      {/* Problem Detail Slide Up */}
      {selectedProblem && (
        <Animated.View style={[styles.detailSheet, { transform: [{ translateY: slideAnim }] }]}>
          <View style={styles.detailHandle} />
          <View style={styles.detailHeader}>
            <View style={[styles.detailCatBadge, {
              backgroundColor: (CATEGORY_COLORS[selectedProblem.category] || '#94A3B8') + '30'
            }]}>
              <Text style={[styles.detailCatText, {
                color: CATEGORY_COLORS[selectedProblem.category] || '#94A3B8'
              }]}>
                {CATEGORY_ICONS[selectedProblem.category]} {selectedProblem.category}
              </Text>
            </View>
            {selectedProblem.trending && (
              <Text style={styles.trendingTag}>🔥 Trending</Text>
            )}
          </View>
          <Text style={styles.detailTitle}>{selectedProblem.title}</Text>
          <Text style={styles.detailLocation}>
            📍 {selectedProblem.location || 'Location N/A'}
          </Text>
          <View style={styles.detailActions}>
            <Text style={styles.detailUpvotes}>👍 {selectedProblem.upvotes || 0} upvotes</Text>
            <View style={styles.detailBtns}>
              <TouchableOpacity
                style={styles.detailViewBtn}
                onPress={async () => {
                  await playTap();
                  hideProblemDetail();
                  router.push(`/problem/${selectedProblem.id}`);
                }}
              >
                <Text style={styles.detailViewBtnText}>Poora Dekho →</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.detailCloseBtn} onPress={hideProblemDetail}>
                <Text style={styles.detailCloseBtnText}>✕</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  map: { flex: 1 },
  loadingOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: '#0F172A', alignItems: 'center', justifyContent: 'center', zIndex: 10,
  },
  loadingText: { color: '#94A3B8', marginTop: 12, fontSize: 14 },
  statsBar: {
    position: 'absolute', top: 56, left: 16, right: 16,
    backgroundColor: '#1E293BEE', borderRadius: 16, flexDirection: 'row',
    padding: 12, alignItems: 'center', justifyContent: 'space-around',
    borderWidth: 1, borderColor: '#334155',
  },
  statItem: { alignItems: 'center' },
  statNum: { fontSize: 18, fontWeight: '900', color: '#F1F5F9' },
  statLabel: { fontSize: 10, color: '#64748B' },
  statDivider: { width: 1, height: 30, backgroundColor: '#334155' },
  filterContainer: { position: 'absolute', top: 136, left: 0, right: 0 },
  filterScroll: { paddingHorizontal: 16, gap: 8 },
  filterChip: {
    backgroundColor: '#1E293BEE', borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 8,
    borderWidth: 1, borderColor: '#334155',
  },
  filterChipActive: { backgroundColor: '#FF6B35', borderColor: '#FF6B35' },
  filterChipText: { fontSize: 12, color: '#94A3B8', fontWeight: '600' },
  filterChipTextActive: { color: '#fff' },
  mapControls: {
    position: 'absolute', right: 16, bottom: 200, gap: 10,
  },
  mapControlBtn: {
    backgroundColor: '#1E293B', width: 48, height: 48, borderRadius: 24,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#334155', elevation: 4,
  },
  addProblemMapBtn: { backgroundColor: '#FF6B35', borderColor: '#FF6B35' },
  mapControlIcon: { fontSize: 20 },
  legend: {
    position: 'absolute', left: 16, bottom: 200,
    backgroundColor: '#1E293BEE', borderRadius: 12, padding: 10,
    borderWidth: 1, borderColor: '#334155',
  },
  legendTitle: { fontSize: 10, color: '#64748B', fontWeight: '700', marginBottom: 6 },
  legendItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  leaderLegendDot: {
    width: 12, height: 12, borderRadius: 6, marginRight: 4,
    backgroundColor: '#FF6B3520', borderWidth: 2, borderColor: '#FF6B35',
  },
  legendText: { fontSize: 10, color: '#94A3B8' },
  detailSheet: {
    position: 'absolute', bottom: 65, left: 16, right: 16,
    backgroundColor: '#1E293B', borderRadius: 20, padding: 20,
    borderWidth: 1, borderColor: '#334155', elevation: 10,
  },
  detailHandle: {
    width: 40, height: 4, backgroundColor: '#334155',
    borderRadius: 2, alignSelf: 'center', marginBottom: 12,
  },
  detailHeader: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  detailCatBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  detailCatText: { fontSize: 12, fontWeight: '700' },
  trendingTag: { fontSize: 12, color: '#FF6B35', fontWeight: '700' },
  detailTitle: { fontSize: 17, fontWeight: '800', color: '#F1F5F9', marginBottom: 6 },
  detailLocation: { fontSize: 13, color: '#64748B', marginBottom: 12 },
  detailActions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  detailUpvotes: { fontSize: 13, color: '#10B981', fontWeight: '600' },
  detailBtns: { flexDirection: 'row', gap: 8 },
  detailViewBtn: {
    backgroundColor: '#FF6B35', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
  },
  detailViewBtnText: { fontSize: 13, color: '#fff', fontWeight: '700' },
  detailCloseBtn: {
    backgroundColor: '#334155', width: 34, height: 34, borderRadius: 17,
    alignItems: 'center', justifyContent: 'center',
  },
  detailCloseBtnText: { color: '#94A3B8', fontWeight: '700' },
});
