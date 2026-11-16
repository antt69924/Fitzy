import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, Text, TextInput, View } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { fetchProducts } from '../../store/slices/productSlice';
import { fetchCategories } from '../../store/slices/categorySlice';
import { ProductCard, StateMessage } from '../../components/ui';
import { theme } from '../../constants/theme';

export default function CatalogScreen({ navigation, route }) {
  const dispatch = useDispatch(); const { items, status, error, pagination } = useSelector(state => state.products); const categories = useSelector(state => state.categories.items); const [search, setSearch] = useState(''); const [category, setCategory] = useState(route.params?.category || ''); const [sort, setSort] = useState('newest'); const [minPrice, setMinPrice] = useState(''); const [maxPrice, setMaxPrice] = useState(''); const [size, setSize] = useState(''); const [color, setColor] = useState(''); const [filters, setFilters] = useState({}); const user = useSelector(state => state.auth.user); const favorites = useSelector(state => state.favorites.items);
  const load = useCallback((page = 1) => dispatch(fetchProducts({ q: search || undefined, category: category || undefined, sort, limit: 12, page, ...filters })), [dispatch, search, category, sort, filters]);
  useEffect(() => { dispatch(fetchCategories()); }, [dispatch]); useEffect(() => { load(1); }, [load]);
  const favoriteAction = { isFavorite: id => favorites.some(item => item.product?._id === id) };
  const onFavorite = id => { if (!user) return navigation.navigate('Auth'); const fav = favoriteAction.isFavorite(id); dispatch(fav ? require('../../store/slices/favoriteSlice').removeFavorite(id) : require('../../store/slices/favoriteSlice').addFavorite(id)); };

  const handleSizeSelect = value => {
    const nextSize = size === value ? '' : value;
    setSize(nextSize);
    setFilters(prev => {
      const next = { ...prev };
      if (nextSize) next.size = nextSize;
      else delete next.size;
      return next;
    });
  };

  const handleColorSelect = value => {
    const nextColor = color === value ? '' : value;
    setColor(nextColor);
    setFilters(prev => {
      const next = { ...prev };
      if (nextColor) next.color = nextColor;
      else delete next.color;
      return next;
    });
  };

  const handleApplyPrice = () => {
    setFilters(prev => {
      const next = { ...prev };
      if (minPrice) next.minPrice = minPrice;
      else delete next.minPrice;
      if (maxPrice) next.maxPrice = maxPrice;
      else delete next.maxPrice;
      return next;
    });
  };

  const hasActiveFilters = Boolean(minPrice || maxPrice || size || color || search || category);
  const handleResetFilters = () => {
    setMinPrice('');
    setMaxPrice('');
    setSize('');
    setColor('');
    setSearch('');
    setCategory('');
    setFilters({});
  };

  const handleEndReached = () => {
    if (status === 'loading') return;
    if (pagination && pagination.page < pagination.pages) {
      load(pagination.page + 1);
    }
  };

  return <View style={{ flex: 1, backgroundColor: theme.colors.paper }}><View style={{ paddingHorizontal: 18, paddingTop: 14, gap: 12 }}>
    <TextInput value={search} onChangeText={setSearch} placeholder="Tìm sản phẩm" placeholderTextColor="#9c9890" returnKeyType="search" style={{ backgroundColor: '#fff', borderRadius: 14, paddingHorizontal: 14, height: 48, borderWidth: 1, borderColor: theme.colors.line }} />
    <FlatList horizontal showsHorizontalScrollIndicator={false} data={[{ _id: '', name: 'Tất cả' }, ...categories]} keyExtractor={item => item._id || 'all'} renderItem={({ item }) => <Pressable onPress={() => setCategory(item._id)} style={{ paddingHorizontal: 14, paddingVertical: 9, borderRadius: 99, backgroundColor: category === item._id ? theme.colors.ink : '#fff', marginRight: 8 }}><Text style={{ color: category === item._id ? '#fff' : theme.colors.ink, fontWeight: '600' }}>{item.name}</Text></Pressable>} />
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
      <View style={{ flexDirection: 'row', gap: 13 }}>{[['newest', 'Mới nhất'], ['price_asc', 'Giá thấp'], ['price_desc', 'Giá cao']].map(([value, label]) => <Pressable key={value} onPress={() => setSort(value)}><Text style={{ color: sort === value ? theme.colors.ink : theme.colors.muted, fontWeight: sort === value ? '700' : '400' }}>{label}</Text></Pressable>)}</View>
      {pagination ? <Text style={{ color: theme.colors.muted, fontSize: 11 }}>{pagination.total} sản phẩm</Text> : null}
    </View>
    <View style={{ flexDirection: 'row', gap: 8 }}>
      <TextInput value={minPrice} onChangeText={setMinPrice} keyboardType="numeric" placeholder="Giá từ" style={filterInput} returnKeyType="done" onSubmitEditing={handleApplyPrice} />
      <TextInput value={maxPrice} onChangeText={setMaxPrice} keyboardType="numeric" placeholder="Giá đến" style={filterInput} returnKeyType="done" onSubmitEditing={handleApplyPrice} />
      <Pressable onPress={handleApplyPrice} style={{ backgroundColor: theme.colors.ink, borderRadius: 10, paddingHorizontal: 14, justifyContent: 'center' }}><Text style={{ color: '#fff', fontWeight: '700' }}>Lọc</Text></Pressable>
      {hasActiveFilters ? <Pressable onPress={handleResetFilters} style={{ backgroundColor: '#fae9e7', borderRadius: 10, paddingHorizontal: 12, justifyContent: 'center' }}><Text style={{ color: theme.colors.danger, fontWeight: '700', fontSize: 12 }}>Đặt lại</Text></Pressable> : null}
    </View>
    <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
      <Text style={{ color: theme.colors.muted, fontSize: 11, fontWeight: '600' }}>Size:</Text>
      {['S', 'M', 'L', 'XL'].map(value => <Pressable key={value} onPress={() => handleSizeSelect(value)} style={{ borderWidth: 1, borderColor: size === value ? theme.colors.ink : theme.colors.line, backgroundColor: size === value ? theme.colors.ink : '#fff', borderRadius: 99, paddingHorizontal: 11, paddingVertical: 5 }}><Text style={{ color: size === value ? '#fff' : theme.colors.ink, fontSize: 11, fontWeight: size === value ? '700' : '500' }}>{value}</Text></Pressable>)}
      <Text style={{ color: theme.colors.muted, fontSize: 11, fontWeight: '600', marginLeft: 8 }}>Màu:</Text>
      {['Đen', 'Trắng', 'Be'].map(value => <Pressable key={value} onPress={() => handleColorSelect(value)} style={{ borderWidth: 1, borderColor: color === value ? theme.colors.ink : theme.colors.line, backgroundColor: color === value ? theme.colors.ink : '#fff', borderRadius: 99, paddingHorizontal: 11, paddingVertical: 5 }}><Text style={{ color: color === value ? '#fff' : theme.colors.ink, fontSize: 11, fontWeight: color === value ? '700' : '500' }}>{value}</Text></Pressable>)}
    </View>
  </View>
  {status === 'loading' && !items.length ? <StateMessage title="Đang tải sản phẩm" loading /> : error && !items.length ? <StateMessage title="Không thể tải danh mục" message={error} action="Thử lại" onAction={() => load(1)} /> : <FlatList contentInsetAdjustmentBehavior="automatic" data={items} numColumns={2} columnWrapperStyle={{ gap: 12 }} contentContainerStyle={{ padding: 18, gap: 10 }} keyExtractor={(item, index) => `${item._id}-${index}`} onEndReached={handleEndReached} onEndReachedThreshold={0.4} refreshing={status === 'loading' && items.length > 0 && pagination?.page === 1} onRefresh={() => load(1)} renderItem={({ item }) => <ProductCard product={item} onPress={() => navigation.navigate('Product', { id: item._id })} favorite={favoriteAction.isFavorite(item._id)} onFavorite={() => onFavorite(item._id)} />} ListFooterComponent={status === 'loading' && items.length > 0 ? <ActivityIndicator color={theme.colors.ink} style={{ paddingVertical: 18 }} /> : pagination && pagination.page >= pagination.pages && items.length > 0 ? <Text style={{ textAlign: 'center', color: theme.colors.muted, fontSize: 11, paddingVertical: 16 }}>Đã hiển thị tất cả {pagination.total} sản phẩm</Text> : null} ListEmptyComponent={<StateMessage title="Không tìm thấy sản phẩm" message="Hãy thử tên hoặc danh mục khác." />} />}
  </View>;
}
const filterInput = { flex: 1, minWidth: 80, height: 40, paddingHorizontal: 10, borderWidth: 1, borderColor: theme.colors.line, backgroundColor: '#fff', borderRadius: 10, color: theme.colors.ink, fontSize: 12 };
