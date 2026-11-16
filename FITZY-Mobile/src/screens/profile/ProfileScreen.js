import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { signOut, updateProfile } from '../../store/slices/authSlice';
import { theme } from '../../constants/theme';

function getInitials(name) {
  if (!name) return 'FZ';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  const first = parts.length > 1 ? parts[parts.length - 2][0] : parts[0][0];
  const last = parts[parts.length - 1][0];
  return (first + last).toUpperCase();
}

function SectionGroup({ title, children }) {
  return (
    <View style={styles.sectionContainer}>
      <Text style={styles.sectionHeaderTitle}>{title}</Text>
      <View style={styles.cardGroup}>{children}</View>
    </View>
  );
}

function SettingsItem({
  icon,
  iconName,
  title,
  subtitle,
  value,
  valueBadge,
  showChevron = true,
  isSwitch = false,
  switchValue,
  onSwitchChange,
  onPress,
  isLast = false,
}) {
  const finalIconName = iconName || icon;
  const content = (
    <View style={[styles.itemRow, !isLast && styles.itemBorder]}>
      <View style={styles.itemIconContainer}>
        {finalIconName ? (
          <Ionicons name={finalIconName} size={19} color="#181818" />
        ) : null}
      </View>
      <View style={styles.itemTextContainer}>
        <Text style={styles.itemTitle}>{title}</Text>
        {subtitle ? <Text style={styles.itemSubtitle}>{subtitle}</Text> : null}
      </View>
      {isSwitch ? (
        <Switch
          value={switchValue}
          onValueChange={onSwitchChange}
          trackColor={{ false: '#e4e1da', true: '#181818' }}
          thumbColor="#ffffff"
        />
      ) : (
        <View style={styles.itemRightContainer}>
          {valueBadge ? (
            <View style={styles.badgePill}>
              <Text style={styles.badgePillText}>{valueBadge}</Text>
            </View>
          ) : value ? (
            <Text style={styles.itemValueText}>{value}</Text>
          ) : null}
          {showChevron ? <Ionicons name="chevron-forward" size={18} color="#aaa69f" /> : null}
        </View>
      )}
    </View>
  );

  if (isSwitch) {
    return <View>{content}</View>;
  }

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [pressed && { backgroundColor: '#faf8f5' }]}
    >
      {content}
    </Pressable>
  );
}

export default function ProfileScreen({ navigation }) {
  const dispatch = useDispatch();
  const user = useSelector(state => state.auth.user);
  const busy = useSelector(state => state.auth.status === 'loading');
  const error = useSelector(state => state.auth.error);
  const ordersList = useSelector(state => state.orders.items);
  const orders = Array.isArray(ordersList) ? ordersList : [];

  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [addressModalVisible, setAddressModalVisible] = useState(false);
  const [newAddrModalVisible, setNewAddrModalVisible] = useState(false);
  const [addrRecipient, setAddrRecipient] = useState('');
  const [addrPhone, setAddrPhone] = useState('');
  const [addrLine1, setAddrLine1] = useState('');
  const [addrWard, setAddrWard] = useState('');
  const [addrDistrict, setAddrDistrict] = useState('');
  const [addrCity, setAddrCity] = useState('');
  const [addrLabel, setAddrLabel] = useState('Nhà riêng');
  const [addrIsDefault, setAddrIsDefault] = useState(false);

  // Switches
  const [pushNotifications, setPushNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    setName(user?.name || '');
    setPhone(user?.phone || '');
    setAddrRecipient(user?.name || '');
    setAddrPhone(user?.phone || '');
  }, [user?._id, user?.name, user?.phone]);

  const activeOrdersCount = orders.filter(
    o => o && !['completed', 'cancelled', 'delivered'].includes(o.status)
  ).length;

  const addressCount = user?.addresses?.length || 0;
  const voucherCount = user?.vouchers?.length || 0;
  const paymentMethodLabel = user?.paymentMethod?.last4
    ? `•• ${user.paymentMethod.last4}`
    : user?.paymentMethods?.length
    ? `${user.paymentMethods.length} thẻ liên kết`
    : 'Chưa liên kết';

  const showUpcomingFeature = featureName => {
    Alert.alert(
      'Tính năng đang hoàn thiện',
      `${featureName} đang được phát triển và sẽ sớm ra mắt trong bản cập nhật tới.`,
      [{ text: 'Đã hiểu' }]
    );
  };

  const deleteAddress = addressId => {
    Alert.alert('Xóa địa chỉ', 'Bạn có chắc chắn muốn xóa địa chỉ này khỏi danh bạ?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: () => {
          const remaining = (user?.addresses || []).filter(a => a._id !== addressId);
          dispatch(updateProfile({ addresses: remaining }));
        }
      }
    ]);
  };

  const setDefaultAddress = addressId => {
    const updated = (user?.addresses || []).map(a => ({
      ...a,
      isDefault: a._id === addressId
    }));
    dispatch(updateProfile({ addresses: updated }));
  };

  const saveNewAddress = async () => {
    if (!addrRecipient.trim() || !addrPhone.trim() || !addrLine1.trim() || !addrDistrict.trim() || !addrCity.trim()) {
      return Alert.alert('Lỗi', 'Vui lòng điền đầy đủ họ tên, số điện thoại và địa chỉ nhận hàng.');
    }
    const newAddr = {
      label: addrLabel,
      recipient: addrRecipient.trim(),
      phone: addrPhone.trim(),
      line1: addrLine1.trim(),
      ward: addrWard.trim(),
      district: addrDistrict.trim(),
      city: addrCity.trim(),
      isDefault: addrIsDefault || (user?.addresses || []).length === 0
    };
    const currentList = user?.addresses || [];
    const nextList = newAddr.isDefault
      ? [...currentList.map(a => ({ ...a, isDefault: false })), newAddr]
      : [...currentList, newAddr];
    const res = await dispatch(updateProfile({ addresses: nextList }));
    if (updateProfile.fulfilled.match(res)) {
      setNewAddrModalVisible(false);
      setAddrLine1('');
      setAddrWard('');
      setAddrDistrict('');
      setAddrCity('');
      Alert.alert('Thành công', 'Đã lưu địa chỉ mới vào danh bạ.');
    }
  };

  const save = async () => {
    if (!name.trim()) {
      return Alert.alert('Lỗi', 'Họ tên không được để trống.');
    }
    const result = await dispatch(updateProfile({ name: name.trim(), phone: phone.trim() }));
    if (updateProfile.fulfilled.match(result)) {
      setEditModalVisible(false);
      Alert.alert('Thành công', 'Thông tin cá nhân đã được cập nhật.');
    }
  };

  const logout = () => {
    Alert.alert(
      'Đăng xuất',
      'Bạn có chắc chắn muốn đăng xuất khỏi tài khoản FITZY?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Đăng xuất',
          style: 'destructive',
          onPress: async () => {
            try {
              await dispatch(signOut()).unwrap();
            } catch (logoutError) {
              Alert.alert('Chưa thể đăng xuất', logoutError || 'Vui lòng thử lại.');
            }
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={theme.colors.paper} />

      {/* Top Header */}
      <View style={styles.headerBar}>
        <Pressable
          hitSlop={12}
          onPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Home'))}
          style={styles.headerActionBtn}
        >
          <Ionicons name="chevron-back" size={24} color={theme.colors.ink} />
        </Pressable>
        <Text style={styles.headerTitle}>CÀI ĐẶT FITZY</Text>
        <Pressable
          hitSlop={12}
          onPress={() => navigation.navigate('Catalog')}
          style={styles.headerActionBtn}
        >
          <Ionicons name="search-outline" size={20} color={theme.colors.ink} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* User Card */}
        {user ? (
          <Pressable
            onPress={() => setEditModalVisible(true)}
            style={({ pressed }) => [styles.userCard, pressed && { opacity: 0.9 }]}
          >
            <View style={styles.avatarWrapper}>
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarText}>{getInitials(user.name)}</Text>
              </View>
              <View style={styles.avatarBadgeOuter}>
                <View style={styles.avatarBadgeInner} />
              </View>
            </View>

            <View style={styles.userInfoWrapper}>
              <Text style={styles.userName} numberOfLines={1}>{user.name}</Text>
              <Text style={styles.userEmail} numberOfLines={1}>{user.email}</Text>
              {/* Badge hạng hội viên: Tự động ẩn khi DB chưa có trường tier/membership */}
              {user?.tier ? (
                <View style={styles.vipPill}>
                  <Text style={styles.vipPillText}>✦ {user.tier.toUpperCase()}</Text>
                </View>
              ) : null}
            </View>

            <Ionicons name="chevron-forward" size={18} color="#aaa69f" />
          </Pressable>
        ) : (
          <View style={styles.userCard}>
            <View style={styles.avatarWrapper}>
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarText}>FZ</Text>
              </View>
            </View>
            <View style={styles.userInfoWrapper}>
              <Text style={styles.userName}>Chào bạn</Text>
              <Text style={styles.userEmail}>Đăng nhập để nhận đặc quyền VIP & đồng bộ</Text>
              <Pressable
                onPress={() => navigation.navigate('Auth')}
                style={styles.guestLoginBtn}
              >
                <Text style={styles.guestLoginText}>ĐĂNG NHẬP / ĐĂNG KÝ</Text>
              </Pressable>
            </View>
          </View>
        )}


        <View style={styles.vipBanner}>
          <View style={styles.vipBannerTop}>
            <Text style={styles.vipBannerTag}>ĐẶC QUYỀN HỘI VIÊN • SẮP RA MẮT</Text>
            <View style={styles.vipCodeBadge}>
              <Text style={styles.vipCodeText}>SẮP RA MẮT</Text>
            </View>
          </View>
          <Text style={styles.vipBannerTitle}>Gói Hội Viên & Quyền Lợi VIP</Text>
          <Text style={styles.vipBannerDesc}>
            Chương trình tích lũy điểm phong cách và gói thành viên độc quyền đang được phát triển. Sẽ sớm ra mắt trong bản cập nhật tới.
          </Text>
          <Pressable
            onPress={() =>
              Alert.alert(
                'Tính năng đang hoàn thiện',
                'Hệ thống phân hạng hội viên (Tier) và các gói ưu đãi VIP độc quyền đang được xây dựng và sẽ sớm ra mắt.',
                [{ text: 'Đã hiểu' }]
              )
            }
            style={styles.vipBannerBtn}
          >
            <Text style={styles.vipBannerBtnText}>THÔNG TIN HỘI VIÊN (SẮP RA MẮT)</Text>
          </Pressable>
        </View>


        <SectionGroup title="QUẢN LÝ MUA SẮM & CÁ NHÂN">
          <SettingsItem
            icon="location-outline"
            title="Địa chỉ nhận hàng"
            value={`${addressCount} địa chỉ`}
            onPress={() => (user ? setAddressModalVisible(true) : navigation.navigate('Auth'))}
          />
          <SettingsItem
            icon="ticket-outline"
            title="Vé & Mã ưu đãi (Voucher)"
            valueBadge={voucherCount > 0 ? `${voucherCount} mã có sẵn` : '0 mã'}
            onPress={() => showUpcomingFeature('Vé & Mã ưu đãi')}
          />
          <SettingsItem
            icon="bag-handle-outline"
            title="Lịch sử đơn hàng"
            value={`${activeOrdersCount} đang giao`}
            onPress={() => (user ? navigation.navigate('Orders') : navigation.navigate('Auth'))}
          />
          <SettingsItem
            icon="card-outline"
            title="Phương thức thanh toán"
            value={paymentMethodLabel}
            onPress={() => showUpcomingFeature('Phương thức thanh toán')}
          />
          <SettingsItem
            icon="person-outline"
            title="Thông tin tài khoản"
            onPress={() => (user ? setEditModalVisible(true) : navigation.navigate('Auth'))}
            isLast={true}
          />
        </SectionGroup>


        <SectionGroup title="TÙY CHỌN ỨNG DỤNG">
          <SettingsItem
            icon="notifications-outline"
            title="Thông báo đẩy"
            subtitle="Bộ sưu tập mới & flash deal"
            isSwitch={true}
            switchValue={pushNotifications}
            onSwitchChange={setPushNotifications}
          />
          <SettingsItem
            icon="globe-outline"
            title="Ngôn ngữ hiển thị"
            valueBadge="Tiếng Việt (VI)"
            onPress={() => showUpcomingFeature('Ngôn ngữ hiển thị')}
          />
          <SettingsItem
            icon="moon-outline"
            title="Giao diện tối"
            isSwitch={true}
            switchValue={darkMode}
            onSwitchChange={setDarkMode}
          />
          <SettingsItem
            icon="sparkles-outline"
            title="Gợi ý kích cỡ thông minh"
            subtitle="Tự động chọn size vừa vặn FITZY Fit"
            onPress={() => navigation.navigate('Stylist')}
            isLast={true}
          />
        </SectionGroup>


        <SectionGroup title="HỖ TRỢ & PHÁP LÝ">
          <SettingsItem
            icon="chatbubble-ellipses-outline"
            title="Trung tâm trợ giúp & CSKH 24/7"
            onPress={() => showUpcomingFeature('Trung tâm CSKH 24/7')}
          />
          <SettingsItem
            icon="shield-checkmark-outline"
            title="Chính sách bảo mật dữ liệu"
            onPress={() => showUpcomingFeature('Chính sách bảo mật dữ liệu')}
          />
          <SettingsItem
            icon="document-text-outline"
            title="Điều khoản dịch vụ"
            onPress={() => showUpcomingFeature('Điều khoản dịch vụ')}
          />
          <SettingsItem
            icon="information-circle-outline"
            title="Phiên bản ứng dụng"
            value="v1.0.0 (Build 2025)"
            showChevron={false}
            onPress={() =>
              Alert.alert(
                'FITZY Minimalist Apparel',
                'Phiên bản v1.0.0 (Build 2025)\nCập nhật thiết kế cao cấp mới nhất.'
              )
            }
            isLast={true}
          />
        </SectionGroup>

        {/* Logout Button */}
        {user ? (
          <Pressable
            accessibilityRole="button"
            onPress={logout}
            style={({ pressed }) => [styles.logoutBtn, pressed && { opacity: 0.8 }]}
          >
            <Ionicons name="log-out-outline" size={19} color="#dc2626" />
            <Text style={styles.logoutText}>ĐĂNG XUẤT TÀI KHOẢN</Text>
          </Pressable>
        ) : null}


        <Text style={styles.footerText}>FITZY STUDIO © 2025 • MINIMALIST APPAREL</Text>
      </ScrollView>


      <Modal
        visible={editModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setEditModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Thông tin cá nhân</Text>
              <Pressable
                onPress={() => setEditModalVisible(false)}
                hitSlop={10}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={20} color="#181818" />
              </Pressable>
            </View>

            <View style={styles.modalBody}>
              <View style={styles.modalFieldGroup}>
                <Text style={styles.modalFieldLabel}>Email đăng ký</Text>
                <View style={[styles.modalInputBox, { backgroundColor: '#f4f2ee' }]}>
                  <Text style={{ color: theme.colors.muted }}>{user?.email || ''}</Text>
                </View>
              </View>

              <View style={styles.modalFieldGroup}>
                <Text style={styles.modalFieldLabel}>Họ và tên</Text>
                <View style={styles.modalInputBox}>
                  <TextInput
                    value={name}
                    onChangeText={setName}
                    placeholder="Nhập họ và tên"
                    placeholderTextColor="#aaa69f"
                    style={styles.modalTextInput}
                  />
                </View>
              </View>

              <View style={styles.modalFieldGroup}>
                <Text style={styles.modalFieldLabel}>Số điện thoại</Text>
                <View style={styles.modalInputBox}>
                  <TextInput
                    value={phone}
                    onChangeText={setPhone}
                    placeholder="Nhập số điện thoại"
                    placeholderTextColor="#aaa69f"
                    keyboardType="phone-pad"
                    style={styles.modalTextInput}
                  />
                </View>
              </View>

              {error ? <Text style={styles.modalErrorText}>{error}</Text> : null}

              <Pressable
                onPress={save}
                disabled={busy}
                style={[styles.modalSaveBtn, busy && { opacity: 0.7 }]}
              >
                {busy ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.modalSaveText}>LƯU THAY ĐỔI</Text>
                )}
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Modal Quản lý Sổ địa chỉ */}
      <Modal
        visible={addressModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setAddressModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '85%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Sổ địa chỉ nhận hàng</Text>
              <Pressable
                onPress={() => setAddressModalVisible(false)}
                hitSlop={10}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={20} color="#181818" />
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={{ gap: 12, paddingBottom: 16 }}>
              {(user?.addresses || []).length === 0 ? (
                <View style={{ padding: 24, alignItems: 'center', gap: 6 }}>
                  <Text style={{ color: theme.colors.muted, fontSize: 14 }}>Chưa có địa chỉ nào được lưu.</Text>
                  <Text style={{ color: theme.colors.muted, fontSize: 12, textAlign: 'center' }}>
                    Thêm địa chỉ nhận hàng để thanh toán nhanh hơn chỉ với 1 chạm.
                  </Text>
                </View>
              ) : (
                (user?.addresses || []).map((addr, idx) => (
                  <View
                    key={addr._id || idx}
                    style={{
                      padding: 14,
                      backgroundColor: '#fbfaf8',
                      borderRadius: 14,
                      borderWidth: 1,
                      borderColor: addr.isDefault ? theme.colors.ink : theme.colors.line,
                      gap: 6
                    }}
                  >
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                        <Text style={{ color: theme.colors.ink, fontWeight: '700', fontSize: 15 }}>
                          {addr.recipient}
                        </Text>
                        <Text style={{ color: theme.colors.muted, fontSize: 13 }}>
                          · {addr.phone}
                        </Text>
                      </View>
                      <View style={{ flexDirection: 'row', gap: 6 }}>
                        {addr.label ? (
                          <View style={{ backgroundColor: theme.colors.sand, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 }}>
                            <Text style={{ color: theme.colors.ink, fontSize: 11, fontWeight: '600' }}>
                              {addr.label}
                            </Text>
                          </View>
                        ) : null}
                        {addr.isDefault ? (
                          <View style={{ backgroundColor: '#f0ece1', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 }}>
                            <Text style={{ color: theme.colors.accent, fontSize: 11, fontWeight: '700' }}>
                              Mặc định
                            </Text>
                          </View>
                        ) : null}
                      </View>
                    </View>
                    <Text style={{ color: theme.colors.muted, fontSize: 13, lineHeight: 18 }}>
                      {[addr.line1, addr.ward, addr.district, addr.city].filter(Boolean).join(', ')}
                    </Text>

                    <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 4, paddingTop: 6, borderTopWidth: 1, borderTopColor: '#f0ece1' }}>
                      {!addr.isDefault ? (
                        <Pressable onPress={() => setDefaultAddress(addr._id)}>
                          <Text style={{ color: theme.colors.accent, fontSize: 13, fontWeight: '600' }}>
                            Đặt làm mặc định
                          </Text>
                        </Pressable>
                      ) : null}
                      <Pressable onPress={() => deleteAddress(addr._id)}>
                        <Text style={{ color: '#dc2626', fontSize: 13, fontWeight: '600' }}>
                          Xóa
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                ))
              )}

              <Pressable
                onPress={() => {
                  setNewAddrModalVisible(true);
                  setAddrRecipient(user?.name || '');
                  setAddrPhone(user?.phone || '');
                  setAddrLine1('');
                  setAddrWard('');
                  setAddrDistrict('');
                  setAddrCity('');
                  setAddrLabel('Nhà riêng');
                  setAddrIsDefault((user?.addresses || []).length === 0);
                }}
                style={{
                  height: 48,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: theme.colors.ink,
                  borderStyle: 'dashed',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginTop: 6
                }}
              >
                <Text style={{ color: theme.colors.ink, fontWeight: '700', fontSize: 14 }}>
                  + THÊM ĐỊA CHỈ MỚI
                </Text>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Modal Thêm địa chỉ mới */}
      <Modal
        visible={newAddrModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setNewAddrModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={[styles.modalContent, { maxHeight: '90%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Thêm địa chỉ nhận hàng</Text>
              <Pressable
                onPress={() => setNewAddrModalVisible(false)}
                hitSlop={10}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={20} color="#181818" />
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={{ gap: 12, paddingBottom: 20 }}>
              <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                <Text style={{ color: theme.colors.muted, fontSize: 12, fontWeight: '600' }}>Loại địa chỉ:</Text>
                {['Nhà riêng', 'Văn phòng', 'Khác'].map(item => (
                  <Pressable
                    key={item}
                    onPress={() => setAddrLabel(item)}
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 5,
                      borderRadius: 8,
                      backgroundColor: addrLabel === item ? theme.colors.ink : '#fff',
                      borderWidth: 1,
                      borderColor: addrLabel === item ? theme.colors.ink : theme.colors.line
                    }}
                  >
                    <Text style={{ color: addrLabel === item ? '#fff' : theme.colors.ink, fontSize: 12, fontWeight: '600' }}>
                      {item}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <View style={styles.modalFieldGroup}>
                <Text style={styles.modalFieldLabel}>Người nhận *</Text>
                <View style={styles.modalInputBox}>
                  <TextInput
                    value={addrRecipient}
                    onChangeText={setAddrRecipient}
                    placeholder="Họ và tên người nhận"
                    placeholderTextColor="#aaa69f"
                    style={styles.modalTextInput}
                  />
                </View>
              </View>

              <View style={styles.modalFieldGroup}>
                <Text style={styles.modalFieldLabel}>Số điện thoại *</Text>
                <View style={styles.modalInputBox}>
                  <TextInput
                    value={addrPhone}
                    onChangeText={setAddrPhone}
                    placeholder="09xx xxx xxx"
                    placeholderTextColor="#aaa69f"
                    keyboardType="phone-pad"
                    style={styles.modalTextInput}
                  />
                </View>
              </View>

              <View style={styles.modalFieldGroup}>
                <Text style={styles.modalFieldLabel}>Địa chỉ cụ thể *</Text>
                <View style={styles.modalInputBox}>
                  <TextInput
                    value={addrLine1}
                    onChangeText={setAddrLine1}
                    placeholder="Số nhà, tên đường"
                    placeholderTextColor="#aaa69f"
                    style={styles.modalTextInput}
                  />
                </View>
              </View>

              <View style={styles.modalFieldGroup}>
                <Text style={styles.modalFieldLabel}>Phường / xã</Text>
                <View style={styles.modalInputBox}>
                  <TextInput
                    value={addrWard}
                    onChangeText={setAddrWard}
                    placeholder="Phường / xã"
                    placeholderTextColor="#aaa69f"
                    style={styles.modalTextInput}
                  />
                </View>
              </View>

              <View style={styles.modalFieldGroup}>
                <Text style={styles.modalFieldLabel}>Quận / huyện *</Text>
                <View style={styles.modalInputBox}>
                  <TextInput
                    value={addrDistrict}
                    onChangeText={setAddrDistrict}
                    placeholder="Quận / huyện"
                    placeholderTextColor="#aaa69f"
                    style={styles.modalTextInput}
                  />
                </View>
              </View>

              <View style={styles.modalFieldGroup}>
                <Text style={styles.modalFieldLabel}>Tỉnh / thành phố *</Text>
                <View style={styles.modalInputBox}>
                  <TextInput
                    value={addrCity}
                    onChangeText={setAddrCity}
                    placeholder="Tỉnh / thành phố"
                    placeholderTextColor="#aaa69f"
                    style={styles.modalTextInput}
                  />
                </View>
              </View>

              <Pressable
                onPress={() => setAddrIsDefault(v => !v)}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 }}
              >
                <Text style={{ fontSize: 18, color: addrIsDefault ? theme.colors.ink : theme.colors.muted }}>
                  {addrIsDefault ? '☑' : '☐'}
                </Text>
                <Text style={{ color: theme.colors.ink, fontSize: 13, fontWeight: '500' }}>
                  Đặt làm địa chỉ nhận hàng mặc định
                </Text>
              </Pressable>

              <Pressable
                onPress={saveNewAddress}
                disabled={busy}
                style={[styles.modalSaveBtn, busy && { opacity: 0.7 }]}
              >
                {busy ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.modalSaveText}>LƯU ĐỊA CHỈ</Text>
                )}
              </Pressable>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.paper,
  },
  headerBar: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: theme.colors.paper,
  },
  headerActionBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerBackArrow: {
    fontSize: 32,
    color: theme.colors.ink,
    lineHeight: 34,
    fontWeight: '300',
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.ink,
    letterSpacing: 1.5,
  },
  headerSearchIcon: {
    width: 20,
    height: 20,
    tintColor: theme.colors.ink,
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 40,
  },
  userCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#ece8e1',
  },
  avatarWrapper: {
    position: 'relative',
  },
  avatarCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#ede9e1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.colors.ink,
    letterSpacing: 0.5,
  },
  avatarBadgeOuter: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarBadgeInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.ink,
  },
  userInfoWrapper: {
    flex: 1,
    marginLeft: 14,
  },
  userName: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.ink,
  },
  userEmail: {
    fontSize: 13,
    color: theme.colors.muted,
    marginTop: 2,
    marginBottom: 6,
  },
  vipPill: {
    backgroundColor: '#f4f2ee',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#e5e1d8',
  },
  vipPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.ink,
    letterSpacing: 0.8,
  },
  guestLoginBtn: {
    marginTop: 6,
    backgroundColor: theme.colors.ink,
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    alignSelf: 'flex-start',
  },
  guestLoginText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  vipBanner: {
    backgroundColor: '#141414',
    borderRadius: 18,
    padding: 18,
    marginBottom: 24,
  },
  vipBannerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  vipBannerTag: {
    fontSize: 10,
    fontWeight: '700',
    color: '#9ca3af',
    letterSpacing: 1.2,
  },
  vipCodeBadge: {
    backgroundColor: '#262626',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: '#3a3a3a',
  },
  vipCodeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  vipBannerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 6,
  },
  vipBannerDesc: {
    fontSize: 12,
    color: '#9ca3af',
    lineHeight: 18,
    marginBottom: 14,
  },
  vipBannerBtn: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vipBannerBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#111111',
    letterSpacing: 0.5,
  },
  sectionContainer: {
    marginBottom: 22,
  },
  sectionHeaderTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#777570',
    letterSpacing: 1.2,
    marginBottom: 10,
    marginLeft: 4,
  },
  cardGroup: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#ece8e1',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  itemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#f4f2ee',
  },
  itemIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#f6f4f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemIcon: {
    width: 20,
    height: 20,
  },
  itemTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.ink,
  },
  itemSubtitle: {
    fontSize: 12,
    color: theme.colors.muted,
    marginTop: 2,
  },
  itemRightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badgePill: {
    backgroundColor: '#f4f2ee',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginRight: 6,
  },
  badgePillText: {
    fontSize: 11,
    color: theme.colors.ink,
    fontWeight: '600',
  },
  itemValueText: {
    fontSize: 13,
    color: theme.colors.muted,
    marginRight: 6,
  },
  chevronText: {
    fontSize: 20,
    color: '#aaa69f',
    lineHeight: 22,
    fontWeight: '300',
  },
  logoutBtn: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#ece8e1',
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  logoutIcon: {
    width: 18,
    height: 18,
  },
  logoutText: {
    color: '#dc2626',
    fontWeight: '800',
    fontSize: 13,
    letterSpacing: 0.8,
    marginLeft: 8,
  },
  footerText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#aaa69f',
    letterSpacing: 1,
    textAlign: 'center',
    marginBottom: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 36,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.colors.ink,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f4f2ee',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseText: {
    fontSize: 14,
    color: theme.colors.ink,
    fontWeight: '600',
  },
  modalBody: {
    gap: 14,
  },
  modalFieldGroup: {
    gap: 6,
  },
  modalFieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.ink,
  },
  modalInputBox: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.line,
    backgroundColor: '#ffffff',
    paddingHorizontal: 14,
    justifyContent: 'center',
  },
  modalTextInput: {
    fontSize: 14,
    color: theme.colors.ink,
    paddingVertical: 0,
  },
  modalErrorText: {
    color: theme.colors.danger,
    fontSize: 13,
  },
  modalSaveBtn: {
    height: 50,
    borderRadius: 14,
    backgroundColor: theme.colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  modalSaveText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
