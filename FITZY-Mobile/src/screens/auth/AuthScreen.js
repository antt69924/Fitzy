import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { clearAuthError, signIn, signUp } from '../../store/slices/authSlice';
import { Button, Field, Page } from '../../components/ui';
import { theme } from '../../constants/theme';

export default function AuthScreen({ navigation }) {
  const dispatch = useDispatch(); const busy = useSelector(state => state.auth.status === 'loading'); const error = useSelector(state => state.auth.error); const user = useSelector(state => state.auth.user); const [mode, setMode] = useState('login'); const [name, setName] = useState(''); const [email, setEmail] = useState(''); const [password, setPassword] = useState('');
  const submit = async () => { dispatch(clearAuthError()); const actionCreator = mode === 'login' ? signIn : signUp; const result = await dispatch(actionCreator(mode === 'login' ? { email, password } : { name, email, password })); if (actionCreator.fulfilled.match(result) && result.payload?.role !== 'admin') navigation.goBack(); };
  return <Page><View style={{ gap: 8 }}><Text style={{ color: theme.colors.muted, letterSpacing: 1 }}>FITZY ACCOUNT</Text><Text style={{ fontSize: 28, color: theme.colors.ink, fontWeight: '800' }}>{mode === 'login' ? 'Mừng bạn trở lại.' : 'Tạo tài khoản mới.'}</Text><Text style={{ color: theme.colors.muted }}>Tài khoản demo mua sắm đồng bộ qua API.</Text></View>
    {mode === 'register' ? <Field label="Họ tên" value={name} onChangeText={setName} placeholder="Họ và tên" /> : null}<Field label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" placeholder="ban@email.com" /><Field label="Mật khẩu" value={password} onChangeText={setPassword} secureTextEntry placeholder="Ít nhất 8 ký tự" />
    {error ? <Text style={{ color: theme.colors.danger }}>{error}</Text> : null}<Button title={mode === 'login' ? 'Đăng nhập' : 'Tạo tài khoản'} loading={busy} onPress={submit} /><Button variant="light" title={mode === 'login' ? 'Chưa có tài khoản? Đăng ký' : 'Đã có tài khoản? Đăng nhập'} onPress={() => { setMode(mode === 'login' ? 'register' : 'login'); dispatch(clearAuthError()); }} />
  </Page>;
}
