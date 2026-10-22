/* Halaman login admin (admin/login.html). */
(function () {
  const API = window.API;
  const loginForm = document.getElementById('login-form');

  if (API.isTokenValid(API.getToken())) {
    window.location.replace('/admin/dashboard.html');
    return;
  }

  const alertEl = document.getElementById('login-alert');
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = loginForm.querySelector('button[type="submit"]');
    btn.disabled = true;
    alertEl.hidden = true;
    try {
      const { token, user } = await API.post('login', {
        username: loginForm.username.value.trim(),
        password: loginForm.password.value,
      });
      API.setSession(token, user);
      window.location.replace('/admin/dashboard.html');
    } catch (err) {
      alertEl.textContent = err.message;
      alertEl.className = 'alert alert-error';
      alertEl.hidden = false;
      btn.disabled = false;
    }
  });
})();
