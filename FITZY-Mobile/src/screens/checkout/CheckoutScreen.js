import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Linking, Pressable, Text, View } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { clearOrderError, placeOrder } from '../../store/slices/orderSlice';
import { clearCart } from '../../store/slices/cartSlice';
import { updateProfile } from '../../store/slices/authSlice';
import { Button, Field, Page, SectionTitle, StateMessage } from '../../components/ui';
import { theme, formatVnd } from '../../constants/theme';
import api from '../../services/api';

export default function CheckoutScreen({ navigation }) {
  const dispatch = useDispatch();
  const cartItems = useSelector(state => state.cart.items);
  const items = useMemo(() => (cartItems || []).filter(item => item.selected), [cartItems]);
  const promotion = useSelector(state => state.cart.selectedPromotion);
  const busy = useSelector(state => state.orders.status === 'loading');
  const error = useSelector(state => state.orders.error);
  const user = useSelector(state => state.auth.user);
  const submitLock = useRef(false);

  const savedAddresses = user?.addresses || [];
  const defaultAddress = savedAddresses.find(item => item.isDefault) || savedAddresses[0] || null;

  const [selectedAddressId, setSelectedAddressId] = useState(defaultAddress?._id || '');
  const [isAddingNew, setIsAddingNew] = useState(savedAddresses.length === 0);

  const [recipient, setRecipient] = useState(defaultAddress?.recipient || user?.name || '');
  const [phone, setPhone] = useState(defaultAddress?.phone || user?.phone || '');
  const [line1, setLine1] = useState(defaultAddress?.line1 || '');
  const [ward, setWard] = useState(defaultAddress?.ward || '');
  const [district, setDistrict] = useState(defaultAddress?.district || '');
  const [city, setCity] = useState(defaultAddress?.city || '');
  const [label, setLabel] = useState('Nhà riêng');
  const [saveToBook, setSaveToBook] = useState(true);
  const [isDefault, setIsDefault] = useState(false);
  const [formError, setFormError] = useState('');

  const [paymentMethods, setPaymentMethods] = useState([{ id: 'cod', name: 'Thanh toán khi nhận hàng (COD)', description: 'Thanh toán tiền mặt khi nhận được đơn hàng.' }]);
  const [paymentMethod, setPaymentMethod] = useState('cod');

  useEffect(() => {
    dispatch(clearOrderError());
    let active = true;
    api.get('/payments/methods', { skipAuth: true })
      .then(response => { if (active) setPaymentMethods(response.data.data.methods); })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  const selectAddress = addr => {
    setSelectedAddressId(addr._id);
    setRecipient(addr.recipient || '');
    setPhone(addr.phone || '');
    setLine1(addr.line1 || '');
    setWard(addr.ward || '');
    setDistrict(addr.district || '');
    setCity(addr.city || '');
    setFormError('');
  };

  useEffect(() => {
    if (savedAddresses.length > 0) {
      const active = savedAddresses.find(a => a._id === selectedAddressId) ||
                     savedAddresses.find(a => a.isDefault) ||
                     savedAddresses[0];
      if (active) {
        selectAddress(active);
        setIsAddingNew(false);
      }
    } else {
      setIsAddingNew(true);
    }
  }, [user?._id, savedAddresses.length]);

  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const discount = promotion?.discount || 0;
  const shippingFee = subtotal - discount >= 500000 ? 0 : 30000;

  if (!user) {
    return (
      <Page>
        <StateMessage
          title="Đăng nhập để thanh toán"
          message="Đơn hàng sẽ được liên kết với tài khoản của bạn."
          action="Đăng nhập"
          onAction={() => navigation.navigate('Auth')}
        />
      </Page>
    );
  }

  const submit = async () => {
    if (submitLock.current || busy) return;
    const shipping = {
      recipient: recipient.trim(),
      phone: phone.trim(),
      line1: line1.trim(),
      ward: ward.trim(),
      district: district.trim(),
      city: city.trim()
    };

    if (!items.length) return setFormError('Vui lòng chọn ít nhất một sản phẩm trong túi đồ.');
    if (!shipping.recipient || !shipping.phone || !shipping.line1 || !shipping.district || !shipping.city) {
      return setFormError('Vui lòng điền đầy đủ họ tên, số điện thoại và địa chỉ nhận hàng.');
    }
    if (!/^\+?[0-9\s()-]{8,20}$/.test(shipping.phone)) {
      return setFormError('Số điện thoại chưa hợp lệ.');
    }
    setFormError('');
    submitLock.current = true;

    // Tự động lưu địa chỉ mới vào danh bạ nếu người dùng chọn lưu
    if (isAddingNew && saveToBook) {
      try {
        const newAddressItem = {
          label: label.trim() || 'Nhà riêng',
          recipient: shipping.recipient,
          phone: shipping.phone,
          line1: shipping.line1,
          ward: shipping.ward,
          district: shipping.district,
          city: shipping.city,
          isDefault
        };
        const currentList = user?.addresses || [];
        const nextList = isDefault
          ? [...currentList.map(item => ({ ...item, isDefault: false })), newAddressItem]
          : [...currentList, newAddressItem];
        dispatch(updateProfile({ addresses: nextList }));
      } catch {
        // Không block việc đặt hàng nếu việc cập nhật sổ địa chỉ nền thất bại
      }
    }

    try {
      const result = await dispatch(placeOrder({
        items: items.map(item => ({ productId: item.productId, variantId: item.variantId, quantity: item.quantity })),
        promotionCode: promotion?.code,
        paymentMethod,
        shipping
      }));

      if (placeOrder.fulfilled.match(result)) {
        const order = result.payload.order;
        dispatch(clearCart());
        if (result.payload.paymentUrl) {
          if (paymentMethod === 'vnpay') {
            navigation.replace('PaymentGateway', { orderId: order._id, paymentUrl: result.payload.paymentUrl });
            return;
          }
          navigation.replace('OrderDetail', { orderId: order._id });
          try { await Linking.openURL(result.payload.paymentUrl); }
          catch { Alert.alert('Đã tạo đơn hàng', `Không thể mở cổng thanh toán. Mã đơn ${order.orderNumber} vẫn được lưu trong Đơn hàng.`); }
          return;
        }
        if (['momo', 'zalopay', 'vnpay'].includes(paymentMethod)) {
          navigation.replace('OrderDetail', { orderId: order._id });
          Alert.alert('Đơn hàng đã được tạo', `Chưa nhận được liên kết thanh toán. Nếu cổng đã xử lý giao dịch, trạng thái đơn ${order.orderNumber} sẽ được đồng bộ khi bạn kiểm tra lại.`);
          return;
        }
        const transfer = paymentMethods.find(method => method.id === paymentMethod)?.bankAccount;
        const message = paymentMethod === 'bank_transfer' && transfer
          ? `Mã đơn: ${order.orderNumber}\nNgân hàng: ${transfer.bankName}\nSố tài khoản: ${transfer.accountNumber}\nChủ tài khoản: ${transfer.accountName}${transfer.branch ? `\nChi nhánh: ${transfer.branch}` : ''}\nSố tiền: ${formatVnd(order.total)}\nNội dung: ${order.orderNumber}\n\nĐơn sẽ được xác nhận sau khi cửa hàng kiểm tra giao dịch.`
          : `Mã đơn ${order.orderNumber}. Thanh toán khi nhận hàng.`;
        Alert.alert(paymentMethod === 'bank_transfer' ? 'Đặt hàng thành công · Chuyển khoản' : 'Đặt hàng thành công', message, [{ text: 'Đã hiểu', onPress: () => navigation.replace('Orders') }]);
      }
    } finally { submitLock.current = false; }
  };

  return (
    <Page>
      <SectionTitle title="Địa chỉ nhận hàng" />

      {savedAddresses.length > 0 && !isAddingNew ? (
        <View style={{ gap: 12 }}>
          {savedAddresses.map((addr, idx) => {
            const isSelected = selectedAddressId === addr._id || (!selectedAddressId && idx === 0);
            return (
              <Pressable
                key={addr._id || idx}
                accessibilityRole="radio"
                accessibilityState={{ checked: isSelected }}
                onPress={() => selectAddress(addr)}
                style={{
                  padding: 15,
                  backgroundColor: '#fff',
                  borderRadius: 16,
                  borderWidth: isSelected ? 1.8 : 1,
                  borderColor: isSelected ? theme.colors.ink : theme.colors.line,
                  gap: 6
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                    <Text style={{ color: isSelected ? theme.colors.ink : theme.colors.muted, fontSize: 16 }}>
                      {isSelected ? '◉' : '○'}
                    </Text>
                    <Text style={{ color: theme.colors.ink, fontWeight: '700', fontSize: 15 }}>
                      {addr.recipient}
                    </Text>
                    <Text style={{ color: theme.colors.muted, fontSize: 14 }}>
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
                <Text style={{ color: theme.colors.muted, lineHeight: 20, paddingLeft: 24, fontSize: 13 }}>
                  {[addr.line1, addr.ward, addr.district, addr.city].filter(Boolean).join(', ')}
                </Text>
              </Pressable>
            );
          })}

          <Pressable
            onPress={() => {
              setIsAddingNew(true);
              setRecipient(user?.name || '');
              setPhone(user?.phone || '');
              setLine1('');
              setWard('');
              setDistrict('');
              setCity('');
              setLabel('Nhà riêng');
              setSaveToBook(true);
              setIsDefault(false);
              setFormError('');
            }}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 13,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: theme.colors.ink,
              borderStyle: 'dashed',
              backgroundColor: 'rgba(255,255,255,0.7)',
              gap: 8
            }}
          >
            <Text style={{ color: theme.colors.ink, fontWeight: '700', fontSize: 14 }}>
              + Giao đến địa chỉ khác / Thêm mới
            </Text>
          </Pressable>
        </View>
      ) : (
        <View style={{ gap: 12 }}>
          {savedAddresses.length > 0 ? (
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
              <Text style={{ color: theme.colors.ink, fontWeight: '700', fontSize: 14 }}>
                Nhập địa chỉ giao hàng mới
              </Text>
              <Pressable onPress={() => setIsAddingNew(false)}>
                <Text style={{ color: theme.colors.accent, fontWeight: '600', fontSize: 13 }}>
                  ← Chọn địa chỉ đã lưu ({savedAddresses.length})
                </Text>
              </Pressable>
            </View>
          ) : null}

          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            <Text style={{ color: theme.colors.muted, fontSize: 12, fontWeight: '600' }}>Loại địa chỉ:</Text>
            {['Nhà riêng', 'Văn phòng', 'Khác'].map(item => (
              <Pressable
                key={item}
                onPress={() => setLabel(item)}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 8,
                  backgroundColor: label === item ? theme.colors.ink : '#fff',
                  borderWidth: 1,
                  borderColor: label === item ? theme.colors.ink : theme.colors.line
                }}
              >
                <Text style={{ color: label === item ? '#fff' : theme.colors.ink, fontSize: 12, fontWeight: '600' }}>
                  {item}
                </Text>
              </Pressable>
            ))}
          </View>

          <Field label="Người nhận *" value={recipient} onChangeText={value => { setRecipient(value); setFormError(''); }} placeholder="Họ và tên người nhận" />
          <Field label="Số điện thoại *" value={phone} onChangeText={value => { setPhone(value); setFormError(''); }} placeholder="09xx xxx xxx" keyboardType="phone-pad" />
          <Field label="Địa chỉ cụ thể *" value={line1} onChangeText={value => { setLine1(value); setFormError(''); }} placeholder="Số nhà, tên đường" />
          <Field label="Phường / xã" value={ward} onChangeText={value => { setWard(value); setFormError(''); }} placeholder="Phường / xã" />
          <Field label="Quận / huyện *" value={district} onChangeText={value => { setDistrict(value); setFormError(''); }} placeholder="Quận / huyện" />
          <Field label="Tỉnh / thành phố *" value={city} onChangeText={value => { setCity(value); setFormError(''); }} placeholder="Tỉnh / thành phố" />

          <Pressable
            onPress={() => setSaveToBook(v => !v)}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 2 }}
          >
            <Text style={{ fontSize: 18, color: saveToBook ? theme.colors.ink : theme.colors.muted }}>
              {saveToBook ? '☑' : '☐'}
            </Text>
            <Text style={{ color: theme.colors.ink, fontSize: 13, fontWeight: '500' }}>
              Lưu vào sổ địa chỉ để sử dụng cho các lần sau
            </Text>
          </Pressable>

          {saveToBook ? (
            <Pressable
              onPress={() => setIsDefault(v => !v)}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 2 }}
            >
              <Text style={{ fontSize: 18, color: isDefault ? theme.colors.ink : theme.colors.muted }}>
                {isDefault ? '☑' : '☐'}
              </Text>
              <Text style={{ color: theme.colors.muted, fontSize: 13 }}>
                Đặt làm địa chỉ nhận hàng mặc định
              </Text>
            </Pressable>
          ) : null}
        </View>
      )}

      <SectionTitle title="Phương thức thanh toán" />
      {paymentMethods.map(method => (
        <Pressable
          key={method.id}
          accessibilityRole="radio"
          accessibilityState={{ checked: paymentMethod === method.id }}
          onPress={() => setPaymentMethod(method.id)}
          style={{
            padding: 15,
            backgroundColor: '#fff',
            borderRadius: 16,
            borderWidth: 1.5,
            borderColor: paymentMethod === method.id ? theme.colors.ink : theme.colors.line,
            gap: 6
          }}
        >
          <Text style={{ color: theme.colors.ink, fontWeight: '700' }}>
            {paymentMethod === method.id ? '◉' : '○'}  {method.name}
          </Text>
          <Text style={{ color: theme.colors.muted, lineHeight: 20 }}>
            {method.description}
          </Text>
          {method.bankAccount ? (
            <Text style={{ color: theme.colors.ink, lineHeight: 20 }}>
              Ngân hàng: {method.bankAccount.bankName}{method.bankAccount.branch ? ` · ${method.bankAccount.branch}` : ''}{'\n'}
              Số tài khoản: {method.bankAccount.accountNumber}{'\n'}
              Chủ tài khoản: {method.bankAccount.accountName}{'\n'}
              Nội dung chuyển khoản sẽ là mã đơn hàng.
            </Text>
          ) : null}
        </Pressable>
      ))}

      <View style={{ padding: 16, backgroundColor: '#fff', borderRadius: 18, gap: 10 }}>
        <Text style={{ color: theme.colors.ink, fontWeight: '700' }}>Tóm tắt đơn hàng</Text>
        <Summary label="Tạm tính" value={formatVnd(subtotal)} />
        <Summary label="Ưu đãi" value={`− ${formatVnd(discount)}`} />
        <Summary label="Giao hàng" value={formatVnd(shippingFee)} />
        <Summary label="Tổng tiền" value={formatVnd(subtotal - discount + shippingFee)} strong />
      </View>

      {formError ? <Text accessibilityRole="alert" style={{ color: theme.colors.danger }}>{formError}</Text> : null}
      {error ? <Text accessibilityRole="alert" style={{ color: theme.colors.danger }}>{typeof error === 'string' ? error : (error?.message || 'Có lỗi xảy ra')}</Text> : null}
      <Button title="Xác nhận đặt hàng" disabled={!items.length} loading={busy} onPress={submit} />
    </Page>
  );
}

function Summary({ label, value, strong }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
      <Text style={{ color: strong ? theme.colors.ink : theme.colors.muted, fontWeight: strong ? '700' : '400' }}>
        {label}
      </Text>
      <Text style={{ color: theme.colors.ink, fontWeight: strong ? '800' : '500' }}>
        {value}
      </Text>
    </View>
  );
}
