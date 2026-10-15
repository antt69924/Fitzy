import React, { useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { placeOrder } from '../../store/slices/orderSlice';
import { clearCart } from '../../store/slices/cartSlice';
import { Button, Field, Page, SectionTitle } from '../../components/ui';
import { theme, formatVnd } from '../../constants/theme';

export default function CheckoutScreen({ navigation }) {
  const dispatch = useDispatch(); const items = useSelector(state => state.cart.items.filter(item => item.selected)); const promotion = useSelector(state => state.cart.selectedPromotion); const busy = useSelector(state => state.orders.status === 'loading'); const error = useSelector(state => state.orders.error); const user = useSelector(state => state.auth.user);
  const address = user?.addresses?.find(item => item.isDefault) || user?.addresses?.[0] || {};
  const [recipient, setRecipient] = useState(address.recipient || user?.name || ''); const [phone, setPhone] = useState(address.phone || user?.phone || ''); const [line1, setLine1] = useState(address.line1 || ''); const [ward, setWard] = useState(address.ward || ''); const [district, setDistrict] = useState(address.district || ''); const [city, setCity] = useState(address.city || '');
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0); const discount = promotion?.discount || 0; const shippingFee = subtotal - discount >= 500000 ? 0 : 30000;
  const submit = async () => {
    const result = await dispatch(placeOrder({ items: items.map(item => ({ productId: item.productId, variantId: item.variantId, quantity: item.quantity })), promotionCode: promotion?.code, paymentMethod: 'cod', shipping: { recipient: recipient.trim(), phone: phone.trim(), line1: line1.trim(), ward: ward.trim(), district: district.trim(), city: city.trim() } }));
    if (placeOrder.fulfilled.match(result)) { dispatch(clearCart()); Alert.alert('Đặt hàng thành công', `Mã đơn ${result.payload.orderNumber}`); navigation.replace('Orders'); }
  };
  return <Page>
    <SectionTitle title="Thông tin giao hàng" />
    <Field label="Người nhận" value={recipient} onChangeText={setRecipient} placeholder="Họ tên" />
    <Field label="Số điện thoại" value={phone} onChangeText={setPhone} placeholder="09xx xxx xxx" keyboardType="phone-pad" />
    <Field label="Địa chỉ" value={line1} onChangeText={setLine1} placeholder="Số nhà, tên đường" />
    <Field label="Phường / xã" value={ward} onChangeText={setWard} placeholder="Phường / xã" />
    <Field label="Quận / huyện" value={district} onChangeText={setDistrict} placeholder="Quận / huyện" />
    <Field label="Tỉnh / thành phố" value={city} onChangeText={setCity} placeholder="Tỉnh / thành phố" />
    <View style={{ padding: 16, backgroundColor: '#fff', borderRadius: 18, gap: 10 }}><Text style={{ color: theme.colors.ink, fontWeight: '700' }}>Thanh toán khi nhận hàng (COD)</Text><Text style={{ color: theme.colors.muted }}>Thanh toán trực tuyến sẽ được bật khi cửa hàng cấu hình cổng thanh toán.</Text><Summary label="Tạm tính" value={formatVnd(subtotal)} /><Summary label="Ưu đãi" value={`− ${formatVnd(discount)}`} /><Summary label="Giao hàng" value={formatVnd(shippingFee)} /><Summary label="Tổng tiền" value={formatVnd(subtotal - discount + shippingFee)} strong /></View>
    {error ? <Text style={{ color: theme.colors.danger }}>{error}</Text> : null}<Button title="Xác nhận đặt hàng" loading={busy} onPress={submit} />
  </Page>;
}
function Summary({ label, value, strong }) { return <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={{ color: strong ? theme.colors.ink : theme.colors.muted, fontWeight: strong ? '700' : '400' }}>{label}</Text><Text style={{ color: theme.colors.ink, fontWeight: strong ? '800' : '500' }}>{value}</Text></View>; }
