import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import api from '../../services/api';
export const fetchOrders = createAsyncThunk('orders/list', async () => (await api.get('/orders')).data.data.items);
export const placeOrder = createAsyncThunk('orders/create', async values => (await api.post('/orders', values)).data.data.order);
export const cancelOrder = createAsyncThunk('orders/cancel', async id => (await api.post(`/orders/${id}/cancel`)).data.data.order);
const orderSlice = createSlice({ name: 'orders', initialState: { items: [], latest: null, status: 'idle', error: null }, reducers: { clearOrderError(state) { state.error = null; }, resetOrders() { return { items: [], latest: null, status: 'idle', error: null }; } }, extraReducers: builder => {
  builder.addCase(fetchOrders.pending, state => { state.status = 'loading'; state.error = null; }).addCase(fetchOrders.fulfilled, (state, action) => { state.status = 'idle'; state.items = action.payload; }).addCase(fetchOrders.rejected, (state, action) => { state.status = 'failed'; state.error = action.error.message; })
    .addCase(placeOrder.pending, state => { state.status = 'loading'; state.error = null; }).addCase(placeOrder.fulfilled, (state, action) => { state.status = 'idle'; state.latest = action.payload; state.items.unshift(action.payload); }).addCase(placeOrder.rejected, (state, action) => { state.status = 'failed'; state.error = action.error.message; })
    .addCase(cancelOrder.fulfilled, (state, action) => { const index = state.items.findIndex(item => item._id === action.payload._id); if (index >= 0) state.items[index] = action.payload; });
} });
export const { clearOrderError, resetOrders } = orderSlice.actions;
export default orderSlice.reducer;
