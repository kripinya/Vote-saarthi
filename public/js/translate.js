// ===== GOOGLE TRANSLATE INTEGRATION =====

const translationCache = {};

// Original English texts stored on first load
const originalTexts = {};

function initTranslation() {
  // Store original English text for all translatable elements
  document.querySelectorAll('[data-translate]').forEach(el => {
    const key = el.getAttribute('data-translate');
    if (!originalTexts[key]) {
      originalTexts[key] = el.textContent.trim();
    }
  });
  // Apply saved language
  const savedLang = localStorage.getItem('voteSaarthiLang') || 'en';
  if (savedLang !== 'en') {
    changeLanguage(savedLang);
  }
}

async function changeLanguage(langCode) {
  localStorage.setItem('voteSaarthiLang', langCode);
  // Update all language selectors on page
  document.querySelectorAll('.lang-select').forEach(sel => sel.value = langCode);

  if (langCode === 'en') {
    // Restore original English
    document.querySelectorAll('[data-translate]').forEach(el => {
      const key = el.getAttribute('data-translate');
      if (originalTexts[key]) el.textContent = originalTexts[key];
    });
    return;
  }

  // Collect texts to translate
  const elements = document.querySelectorAll('[data-translate]');
  const textsToTranslate = [];
  const keys = [];

  elements.forEach(el => {
    const key = el.getAttribute('data-translate');
    const cacheKey = `${langCode}:${key}`;
    if (translationCache[cacheKey]) {
      el.textContent = translationCache[cacheKey];
    } else if (originalTexts[key]) {
      textsToTranslate.push(originalTexts[key]);
      keys.push(key);
    }
  });

  if (textsToTranslate.length === 0) return;

  try {
    const res = await fetch('/api/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ texts: textsToTranslate, targetLang: langCode })
    });
    const data = await res.json();

    if (data.translations) {
      data.translations.forEach((t, i) => {
        const cacheKey = `${langCode}:${keys[i]}`;
        translationCache[cacheKey] = t.translatedText;
      });
      // Apply translations
      elements.forEach(el => {
        const key = el.getAttribute('data-translate');
        const cacheKey = `${langCode}:${key}`;
        if (translationCache[cacheKey]) {
          el.textContent = translationCache[cacheKey];
        }
      });
    }
  } catch (err) {
    console.error('Translation error:', err);
    showToast('Translation unavailable. Showing English.', 'error');
  }
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(initTranslation, 300);
});
