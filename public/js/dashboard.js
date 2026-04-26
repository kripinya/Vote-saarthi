// ===== DASHBOARD LOGIC =====

let voterData = null;

async function initDashboard() {
  const session = await checkSession();
  if (!session) return;

  voterData = session.voter;
  renderNavbar('dashboard');

  // Welcome message
  document.getElementById('welcomeMsg').textContent = `Welcome, ${voterData.name}!`;
  document.getElementById('constName').textContent = `${session.voter.constituency.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())} • ${voterData.state}`;
  document.getElementById('voterState').textContent = `📍 ${voterData.state}`;

  // Session timer
  startSessionTimer(session.sessionRemaining, 'sessionTimer');

  // Mark vote card if already voted
  if (session.hasVoted) {
    const voteCard = document.getElementById('card-vote');
    voteCard.querySelector('.icon').textContent = '✅';
    voteCard.querySelector('h3').textContent = 'Vote Cast';
    voteCard.querySelector('p').textContent = 'You have already cast your vote in this session.';
    voteCard.style.opacity = '0.6';
  }

  // Animate cards in
  document.querySelectorAll('.action-card').forEach((card, i) => {
    card.style.opacity = '0';
    card.style.transform = 'translateY(20px)';
    setTimeout(() => {
      card.style.transition = 'all 0.5s ease';
      card.style.opacity = '1';
      card.style.transform = 'translateY(0)';
    }, 200 + i * 100);
  });
}

function goToVote() {
  window.location.href = '/vote';
}

function showTimeline() {
  document.getElementById('timelineModal').classList.add('active');
}

document.addEventListener('DOMContentLoaded', initDashboard);
