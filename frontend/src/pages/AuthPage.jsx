import React, { useState } from 'react';
import apiClient from '../services/apiClient.js';

export default function AuthPage() {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('customer');
  const [output, setOutput] = useState('');

  async function submit(e) {
    e.preventDefault();
    try {
      if (mode === 'register') {
        await apiClient.register({ email, password, role });
        setOutput('Registered. You can now login.');
        setMode('login');
      } else {
        await apiClient.login({ email, password });
        setOutput('Logged in! Access token stored.');
      }
    } catch (err) {
      setOutput('Error: ' + (err.message || 'Unknown'));
    }
  }

  return (
    <div style={{ maxWidth: 400 }}>
      <h2>{mode === 'login' ? 'Login' : 'Register'}</h2>
      <form onSubmit={submit}>
        <div>
          <label>Email</label><br />
          <input value={email} onChange={e => setEmail(e.target.value)} type="email" required />
        </div>
        <div>
          <label>Password</label><br />
            <input value={password} onChange={e => setPassword(e.target.value)} type="password" required />
        </div>
        {mode === 'register' && (
          <div>
            <label>Role</label><br />
            <select value={role} onChange={e => setRole(e.target.value)}>
              <option value="customer">Customer</option>
              <option value="tailor">Tailor</option>
            </select>
          </div>
        )}
        <button type="submit" style={{ marginTop: '0.5rem' }}>{mode === 'login' ? 'Login' : 'Register'}</button>
      </form>
      <button onClick={() => setMode(m => m === 'login' ? 'register' : 'login')} style={{ marginTop: '0.5rem' }}>
        Switch to {mode === 'login' ? 'Register' : 'Login'}
      </button>
      {output && <pre style={{ background: '#eee', padding: '0.5rem', marginTop: '1rem' }}>{output}</pre>}
    </div>
  );
}
