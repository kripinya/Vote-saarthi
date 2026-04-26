// ===== AUTH / LOGIN LOGIC =====

const EPIC_REGEX = /^[A-Z]{3}[0-9]{7}$/;

function fillVoterId(id) {
  document.getElementById('voterId').value = id;
  showToast('Voter ID filled!', 'success');
}

async function handleLogin(e) {
  e.preventDefault();
  const input = document.getElementById('voterId');
  const errorEl = document.getElementById('voterIdError');
  const btn = document.getElementById('loginBtn');
  let voterId = input.value.trim().toUpperCase();
  input.value = voterId;

  // Validate format
  if (!EPIC_REGEX.test(voterId)) {
    input.classList.add('error');
    errorEl.textContent = 'Invalid format. Must be 3 letters + 7 digits (e.g., ABC1234567)';
    errorEl.classList.add('visible');
    return;
  }

  input.classList.remove('error');
  errorEl.classList.remove('visible');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner" style="width:20px;height:20px;border-width:2px;"></span> Verifying...';

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ voterId })
    });
    const data = await res.json();

    if (!res.ok) {
      input.classList.add('error');
      errorEl.textContent = data.error;
      errorEl.classList.add('visible');
      btn.disabled = false;
      btn.innerHTML = '<span data-translate="login_btn">Login & Continue</span> →';
      return;
    }

    showToast(`Welcome, ${data.voter.name}!`, 'success');
    setTimeout(() => { window.location.href = '/dashboard'; }, 800);
  } catch (err) {
    errorEl.textContent = 'Connection error. Please try again.';
    errorEl.classList.add('visible');
    btn.disabled = false;
    btn.innerHTML = '<span data-translate="login_btn">Login & Continue</span> →';
  }
}

// Check if already logged in
(async () => {
  try {
    const res = await fetch('/api/auth/session');
    const data = await res.json();
    if (data.authenticated) window.location.href = '/dashboard';
  } catch {}
})();

// Auto-uppercase input
document.addEventListener('DOMContentLoaded', () => {
  const input = document.getElementById('voterId');
  if (input) {
    input.addEventListener('input', () => {
      input.value = input.value.toUpperCase();
      input.classList.remove('error');
      document.getElementById('voterIdError').classList.remove('visible');
    });
  }
});
