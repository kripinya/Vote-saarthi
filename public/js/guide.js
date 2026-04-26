// ===== ELECTION GUIDE LOGIC =====

async function initGuide() {
  const session = await checkSession();
  if (!session) return;
  renderNavbar('guide');

  // Accordion toggle
  document.querySelectorAll('.timeline-step').forEach(step => {
    step.addEventListener('click', () => {
      const wasActive = step.classList.contains('active');
      // Close all
      document.querySelectorAll('.timeline-step').forEach(s => s.classList.remove('active'));
      // Toggle clicked
      if (!wasActive) {
        step.classList.add('active');
        step.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      // Mark previous as completed
      const steps = Array.from(document.querySelectorAll('.timeline-step'));
      const idx = steps.indexOf(step);
      steps.forEach((s, i) => {
        if (i < idx) s.classList.add('completed');
      });
    });
  });
}

document.addEventListener('DOMContentLoaded', initGuide);
