import { useEffect, useState } from 'react';
import { api } from '../api/client';

const EMPTY_FORM = { name: '', email: '', phone: '', address: '' };

export default function Clients() {
  const [clients, setClients] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');

  function load() {
    api.listClients().then(setClients).catch((err) => setError(err.message));
  }

  useEffect(load, []);

  function update(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  function startEdit(client) {
    setEditingId(client.id);
    setForm({ name: client.name, email: client.email || '', phone: client.phone || '', address: client.address || '' });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      if (editingId) {
        await api.updateClient(editingId, form);
      } else {
        await api.createClient(form);
      }
      cancelEdit();
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this client?')) return;
    setError('');
    try {
      await api.deleteClient(id);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <h1>Clients</h1>
      {error && <div className="alert alert-error">{error}</div>}

      <form className="inline-form" onSubmit={handleSubmit}>
        <input placeholder="Name" value={form.name} onChange={update('name')} required />
        <input placeholder="Email" value={form.email} onChange={update('email')} />
        <input placeholder="Phone" value={form.phone} onChange={update('phone')} />
        <input placeholder="Address" value={form.address} onChange={update('address')} />
        <button className="btn btn-primary" type="submit">{editingId ? 'Save' : 'Add client'}</button>
        {editingId && <button className="btn btn-ghost" type="button" onClick={cancelEdit}>Cancel</button>}
      </form>

      <table className="table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Phone</th>
            <th>Address</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {clients.map((c) => (
            <tr key={c.id}>
              <td>{c.name}</td>
              <td>{c.email}</td>
              <td>{c.phone}</td>
              <td>{c.address}</td>
              <td className="row-actions">
                <button className="btn btn-ghost" onClick={() => startEdit(c)}>Edit</button>
                <button className="btn btn-ghost btn-danger" onClick={() => handleDelete(c.id)}>Delete</button>
              </td>
            </tr>
          ))}
          {clients.length === 0 && (
            <tr><td colSpan={5} className="empty-cell">No clients yet.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
