const B = import.meta.env.VITE_API || 'http://localhost:5000/api';
export const api = async (p, method = 'GET', body) => {
  const r = await fetch(B + p, { method, headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + localStorage.getItem('token') }, body: body && JSON.stringify(body) });
  const d = await r.json(); if (!r.ok) throw new Error(d.message || 'Error'); return d;
};
