import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api, { tokenStore } from '../../services/api';

export const hydrateSession = createAsyncThunk('auth/hydrate', async () => {
  const token = await tokenStore.get();
  if (!token) return { user: null };
  try { const response = await api.get('/users/me'); return { user: response.data.data.user }; }
  catch (error) { if (/invalid|expired|cannot continue/i.test(error.message)) await tokenStore.clear(); throw error; }
});
export const signIn = createAsyncThunk('auth/signIn', async (credentials, { rejectWithValue }) => {
  try { const response = await api.post('/auth/login', credentials); await tokenStore.set(response.data.data.token); return response.data.data.user; }
  catch (error) { return rejectWithValue(error.message); }
});
export const signUp = createAsyncThunk('auth/signUp', async (values, { rejectWithValue }) => {
  try { const response = await api.post('/auth/register', values); await tokenStore.set(response.data.data.token); return response.data.data.user; }
  catch (error) { return rejectWithValue(error.message); }
});
export const updateProfile = createAsyncThunk('auth/updateProfile', async (values, { rejectWithValue }) => { try { return (await api.patch('/users/me', values)).data.data.user; } catch (error) { return rejectWithValue(error.message); } });
export const signOut = createAsyncThunk('auth/signOut', async (_, { dispatch }) => {
  await tokenStore.clear(); await AsyncStorage.removeItem('fitzy.cart'); await dispatch({ type: 'cart/reset' }); return null;
});

const authSlice = createSlice({ name: 'auth', initialState: { user: null, status: 'idle', hydrated: false, error: null }, reducers: { clearAuthError(state) { state.error = null; } }, extraReducers: builder => {
  builder.addCase(hydrateSession.pending, state => { state.status = 'loading'; })
    .addCase(hydrateSession.fulfilled, (state, action) => { state.user = action.payload.user; state.status = 'idle'; state.hydrated = true; })
    .addCase(hydrateSession.rejected, (state, action) => { state.status = 'idle'; state.error = action.error.message; state.hydrated = true; })
    .addCase(updateProfile.fulfilled, (state, action) => { state.user = action.payload; state.status = 'idle'; state.error = null; })
    .addCase(updateProfile.pending, state => { state.status = 'loading'; state.error = null; })
    .addCase(updateProfile.rejected, (state, action) => { state.status = 'idle'; state.error = action.payload || action.error.message; })
    .addCase(signOut.fulfilled, state => { state.user = null; state.status = 'idle'; state.error = null; })
    .addMatcher(action => [signIn.pending.type, signUp.pending.type].includes(action.type), state => { state.status = 'loading'; state.error = null; })
    .addMatcher(action => [signIn.fulfilled.type, signUp.fulfilled.type].includes(action.type), (state, action) => { state.status = 'idle'; state.user = action.payload; state.error = null; })
    .addMatcher(action => [signIn.rejected.type, signUp.rejected.type].includes(action.type), (state, action) => { state.status = 'idle'; state.error = action.payload || action.error.message; });
} });

export const { clearAuthError } = authSlice.actions;
export default authSlice.reducer;
