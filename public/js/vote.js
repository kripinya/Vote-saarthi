// ===== ENCRYPTED VOTING LOGIC =====

let candidatesList = [];
let selectedCandidate = null;
let rsaPublicKey = null;
let voterSession = null;

async function initVoting() {
  voterSession = await checkSession();
  if (!voterSession) return;
  renderNavbar('vote');

  // Check if already voted
  if (voterSession.hasVoted) {
    showAlreadyVoted();
    return;
  }

  const constId = voterSession.voter.constituency;
  const formattedConst = constId.replace(/-/g,' ').replace(/\b\w/g,c=>c.toUpperCase());
  document.getElementById('voteConstLabel').innerHTML =
    `<span data-translate="const_label">Constituency:</span> <span data-translate="const_${constId}">${formattedConst}</span>`;

  try {
    // Fetch candidates and public key in parallel
    const [candidates, keyData] = await Promise.all([
      apiFetch(`/api/candidates/${constId}`),
      apiFetch('/api/vote/public-key')
    ]);

    candidatesList = candidates;
    rsaPublicKey = keyData.publicKey;
    renderCandidates();
  } catch (err) {
    document.getElementById('candidateList').innerHTML =
      '<p style="color:var(--danger);text-align:center;">Failed to load voting data.</p>';
  }
}

function renderCandidates() {
  const list = document.getElementById('candidateList');
  let html = '';
  candidatesList.forEach((c, i) => {
    if (c.id === 'NOTA') {
      html += `<div class="nota-divider"><span data-translate="nota_or">or choose</span></div>`;
    }
    html += `
      <div class="glass-card candidate-card" onclick="selectCandidateCard(${i})" id="cand-${i}">
        <div class="symbol">${c.symbol}</div>
        <div class="info">
          <h3 data-translate="cand_${c.id}_name">${c.name}</h3>
          <p class="party" data-translate="cand_${c.id}_party">${c.party}</p>
          <p class="manifesto" data-translate="cand_${c.id}_manifesto">${c.manifesto}</p>
        </div>
        <div class="radio"></div>
      </div>
    `;
  });
  list.innerHTML = html;
  document.getElementById('voteActions').style.display = 'block';
  document.getElementById('castVoteBtn').disabled = true;
  document.getElementById('castVoteBtn').style.opacity = '0.5';
  
  if (window.scanDynamicTranslations) {
    window.scanDynamicTranslations();
  }
}

function selectCandidateCard(index) {
  document.querySelectorAll('.candidate-card').forEach(c => c.classList.remove('selected'));
  document.getElementById(`cand-${index}`).classList.add('selected');
  selectedCandidate = candidatesList[index];
  document.getElementById('castVoteBtn').disabled = false;
  document.getElementById('castVoteBtn').style.opacity = '1';
}

function confirmVote() {
  if (!selectedCandidate) {
    showToast('Please select a candidate first.', 'error');
    return;
  }
  const details = document.getElementById('confirmDetails');
  details.innerHTML = `
    <div class="symbol" style="font-size:3rem;">${selectedCandidate.symbol}</div>
    <h3 style="margin-top:0.5rem;">${selectedCandidate.name}</h3>
    <p style="color:var(--saffron);">${selectedCandidate.party}</p>
  `;
  document.getElementById('confirmModal').classList.add('active');
}

function closeModal() {
  document.getElementById('confirmModal').classList.remove('active');
}

async function submitVote() {
  const btn = document.getElementById('submitBtn');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner" style="width:18px;height:18px;border-width:2px;display:inline-block;"></span> Encrypting...';

  try {
    // Step 1: Import RSA public key
    const pemBody = rsaPublicKey.replace(/-----[A-Z ]+-----/g, '').replace(/\s/g, '');
    const keyBuffer = Uint8Array.from(atob(pemBody), c => c.charCodeAt(0));
    const pubKey = await crypto.subtle.importKey(
      'spki', keyBuffer, { name: 'RSA-OAEP', hash: 'SHA-256' }, false, ['encrypt']
    );

    // Step 2: Generate AES-256-GCM key
    const aesKey = await crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 }, true, ['encrypt']
    );

    // Step 3: Encrypt vote payload with AES
    const votePayload = JSON.stringify({
      candidateId: selectedCandidate.id,
      candidateName: selectedCandidate.name,
      party: selectedCandidate.party,
      constituency: voterSession.voter.constituency,
      timestamp: new Date().toISOString()
    });

    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encoded = new TextEncoder().encode(votePayload);
    const encryptedVote = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv }, aesKey, encoded
    );

    // Step 4: Export and encrypt AES key with RSA
    const rawAesKey = await crypto.subtle.exportKey('raw', aesKey);
    const encryptedKey = await crypto.subtle.encrypt(
      { name: 'RSA-OAEP' }, pubKey, rawAesKey
    );

    // Step 5: Submit encrypted vote
    const res = await fetch('/api/vote/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        encryptedVote: btoa(String.fromCharCode(...new Uint8Array(encryptedVote))),
        encryptedKey: btoa(String.fromCharCode(...new Uint8Array(encryptedKey))),
        iv: btoa(String.fromCharCode(...iv))
      })
    });
    const data = await res.json();

    if (!res.ok) throw new Error(data.error);

    // Show receipt
    closeModal();
    document.getElementById('receiptHash').textContent = data.receipt;
    document.getElementById('receiptModal').classList.add('active');
    showToast('Vote encrypted and recorded successfully!', 'success');
  } catch (err) {
    btn.disabled = false;
    btn.innerHTML = '✓ Confirm & Encrypt';
    showToast(`Voting failed: ${err.message}`, 'error');
  }
}

function showAlreadyVoted() {
  document.getElementById('candidateList').style.display = 'none';
  document.getElementById('voteActions').style.display = 'none';
  const el = document.getElementById('alreadyVoted');
  el.style.display = 'block';
  el.innerHTML = `
    <div class="glass-card receipt-card" style="margin-top:2rem;">
      <div class="check">✅</div>
      <h2 style="color:var(--success);" data-translate="already_voted_title">You Have Already Voted</h2>
      <p style="color:var(--text-secondary);" data-translate="already_voted_msg">Your encrypted vote was successfully recorded in this session.</p>
      <button class="btn btn-saffron" onclick="window.location.href='/dashboard'" style="margin-top:1.5rem;" data-translate="already_voted_btn">Return to Dashboard</button>
    </div>
  `;
  if (window.scanDynamicTranslations) {
    window.scanDynamicTranslations();
  }
}

document.addEventListener('DOMContentLoaded', initVoting);
