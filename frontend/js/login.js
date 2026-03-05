import API from './api.js';

// If already logged in, redirect
if (API.getToken()) window.location.href = '/dashboard.html';

const alertBox = document.getElementById('alert-box');
const loginBtn = document.getElementById('login-btn');

function showAlert(msg, type = 'error') {
  alertBox.innerHTML = `<div class="alert alert-${type}"><i class="fas fa-${type === 'error' ? 'circle-xmark' : 'circle-check'}"></i>${msg}</div>`;
}

document.getElementById('toggle-pw').addEventListener('click', function () {
  const pw = document.getElementById('password');
  const icon = this.querySelector('i');
  if (pw.type === 'password') {
    pw.type = 'text';
    icon.className = 'fas fa-eye-slash';
  } else {
    pw.type = 'password';
    icon.className = 'fas fa-eye';
  }
});

document.getElementById('forgot-link').addEventListener('click', async (e) => {
  e.preventDefault();
  const email = document.getElementById('email').value;
  if (!email) return showAlert('Enter your email first', 'warning');
  try {
    const data = await API.post('/auth/forgot', { email });
    showAlert(data.message, 'success');
  } catch (err) {
    showAlert(err.message);
  }
});

document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  alertBox.innerHTML = '';
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  loginBtn.innerHTML = '<span class="spinner"></span> Signing in...';
  loginBtn.disabled = true;
  try {
    const data = await API.post('/auth/login', { email, password });
    API.setAuth(data.token, data.user);
    window.location.href = '/dashboard.html';
  } catch (err) {
    showAlert(err.message);
    loginBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Sign In';
    loginBtn.disabled = false;
  }
});

document.getElementById('seed-btn').addEventListener('click', async function () {
  this.innerHTML = '<span class="spinner" style="border-top-color:var(--dark)"></span> Seeding...';
  this.disabled = true;
  try {
    await API.get('/auth/seed');
    showAlert('Demo users created! You can now log in.', 'success');
  } catch (err) {
    showAlert(err.message);
  }
  this.innerHTML = '<i class="fas fa-database"></i> Initialize Demo Data';
  this.disabled = false;
});
