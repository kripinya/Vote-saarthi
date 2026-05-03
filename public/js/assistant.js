/**
 * Voice Saarthi - Accessibility Voice Assistant
 * Uses the Web Speech API (Google TTS engines on Chrome/Android)
 */

class VoiceAssistant {
  constructor() {
    this.synth = window.speechSynthesis;
    this.isSpeaking = false;
    this.currentLang = localStorage.getItem('voteSaarthiLang') || 'en';
    
    // Listen for language changes globally
    document.addEventListener('languageChanged', (e) => {
      this.currentLang = e.detail.lang;
      if (this.isSpeaking) {
        this.stop();
      }
    });
  }

  // Map our UI language codes to TTS language codes
  getTTSLangCode(uiCode) {
    const map = {
      'en': 'en-IN', // Indian English
      'hi': 'hi-IN', // Hindi
      'ta': 'ta-IN', // Tamil
      'te': 'te-IN', // Telugu
      'gu': 'gu-IN', // Gujarati
      'bn': 'bn-IN', // Bengali
      'mr': 'mr-IN', // Marathi
      'kn': 'kn-IN', // Kannada
      'ml': 'ml-IN', // Malayalam
      'pa': 'pa-IN', // Punjabi
    };
    return map[uiCode] || 'en-IN';
  }

  // Generate contextual text to read based on the current page
  getContextualText() {
    const path = window.location.pathname;
    const nameNode = document.getElementById('welcomeMsg');
    const nameText = nameNode ? nameNode.textContent : '';

    if (path === '/') {
      return this.currentLang === 'hi' 
        ? "वोट सारथी में आपका स्वागत है। यह भारत सरकार की एक पहल है। कृपया अपना 10 अंकों का वोटर आईडी दर्ज करें और लॉगिन करें।" 
        : "Welcome to Vote Saarthi. This is a Government of India initiative. Please enter your 10 digit Voter ID and login to continue.";
    }

    if (path === '/dashboard') {
      return this.currentLang === 'hi'
        ? `${nameText}. वोट सारथी डैशबोर्ड में आपका स्वागत है। आपकी चुनाव यात्रा यहाँ से शुरू होती है। आप चुनाव मार्गदर्शिका देख सकते हैं, अपना मतदान केंद्र खोज सकते हैं, या अपना सुरक्षित वोट डाल सकते हैं। स्क्रीन पर दिए गए विकल्पों को चुनें।`
        : `${nameText}. Welcome to the Vote Saarthi dashboard. Your election journey starts here. You can view the Interactive Election Guide, Find your Polling Booth, or Cast your secure vote. Select an option on the screen.`;
    }

    if (path === '/guide') {
      return this.currentLang === 'hi'
        ? "चुनाव मार्गदर्शिका में आपका स्वागत है। यहां आप पंजीकरण, मतदान प्रक्रिया और अपने अधिकारों के बारे में जान सकते हैं।"
        : "Welcome to the Interactive Election Guide. Here you can learn about registration, the polling process, and your voter rights.";
    }

    if (path === '/booth-finder') {
      return this.currentLang === 'hi'
        ? "मतदान केंद्र खोजक। अपने निकटतम मतदान केंद्र का पता लगाएं और भीड़ का स्तर जांचें।"
        : "Polling Booth Finder. Locate your nearest polling booth on the map and check the current crowd levels.";
    }

    if (path === '/vote') {
      return this.currentLang === 'hi'
        ? "अपना वोट डालें। यह एक सुरक्षित एंड-टू-एंड एन्क्रिप्टेड प्रक्रिया है। अपनी पसंद के उम्मीदवार का चयन करें और सबमिट करें।"
        : "Cast Your Vote. This is a secure end-to-end encrypted process. Please select your preferred candidate and submit your vote securely.";
    }

    return "Welcome to Vote Saarthi.";
  }

  toggle() {
    const btn = document.getElementById('voiceAssistantBtn');
    
    if (this.isSpeaking) {
      this.stop();
      if (btn) btn.classList.remove('speaking');
    } else {
      this.speak();
      if (btn) btn.classList.add('speaking');
    }
  }

  speak() {
    if (!this.synth) {
      showToast("Voice assistant is not supported in this browser.", "error");
      return;
    }

    this.stop(); // Stop any ongoing speech

    const text = this.getContextualText();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = this.getTTSLangCode(this.currentLang);
    utterance.rate = 0.9; // Slightly slower for better comprehension
    utterance.pitch = 1;

    utterance.onend = () => {
      this.isSpeaking = false;
      const btn = document.getElementById('voiceAssistantBtn');
      if (btn) btn.classList.remove('speaking');
    };

    utterance.onerror = (e) => {
      console.error('Speech synthesis error:', e);
      this.isSpeaking = false;
      const btn = document.getElementById('voiceAssistantBtn');
      if (btn) btn.classList.remove('speaking');
    };

    this.isSpeaking = true;
    this.synth.speak(utterance);
    showToast(this.currentLang === 'hi' ? "वॉयस असिस्टेंट बोल रहा है..." : "Voice Assistant is speaking...");
  }

  stop() {
    if (this.synth) {
      this.synth.cancel();
      this.isSpeaking = false;
    }
  }
}

// Initialize globally
const voiceSaarthi = new VoiceAssistant();

// Attach to global window
window.toggleVoiceAssistant = () => {
  voiceSaarthi.toggle();
};
