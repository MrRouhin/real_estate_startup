// Fixed phrases for the rules-based replies, in English, Hindi and Kannada.
// (With an AI key the model writes the whole reply in the buyer's language.)
export type Lang = 'en' | 'hi' | 'kn';
export const LANGS: { id: Lang; label: string; speech: string }[] = [
  { id: 'en', label: 'English', speech: 'en-IN' },
  { id: 'hi', label: 'हिन्दी', speech: 'hi-IN' },
  { id: 'kn', label: 'ಕನ್ನಡ', speech: 'kn-IN' },
];

const T = {
  matchesIntro: { en: 'Here are the best matches for you:', hi: 'आपके लिए सबसे अच्छे विकल्प ये हैं:', kn: 'ನಿಮಗೆ ಸೂಕ್ತವಾದ ಪ್ಲಾಟ್‌ಗಳು ಇವು:' },
  closest: { en: 'Nothing matches everything right now. These come closest:', hi: 'अभी सब कुछ मिलाने वाला प्लॉट नहीं है। ये सबसे करीब हैं:', kn: 'ಈಗ ಎಲ್ಲವೂ ಹೊಂದುವ ಪ್ಲಾಟ್ ಇಲ್ಲ. ಇವು ಹತ್ತಿರದ ಆಯ್ಕೆಗಳು:' },
  askBudget: { en: 'What budget do you have in mind? For example "35 to 45 lakh".', hi: 'आपका बजट कितना है? जैसे "35 से 45 लाख"।', kn: 'ನಿಮ್ಮ ಬಜೆಟ್ ಎಷ್ಟು? ಉದಾಹರಣೆಗೆ "35 ರಿಂದ 45 ಲಕ್ಷ".' },
  askMore: { en: 'Tell me a bit more: budget, plot size, facing, or what matters most (park, corner, quiet street).', hi: 'थोड़ा और बताइए: बजट, प्लॉट का साइज़, दिशा, या क्या सबसे ज़रूरी है (पार्क, कॉर्नर, शांत गली)।', kn: 'ಸ್ವಲ್ಪ ಹೆಚ್ಚು ತಿಳಿಸಿ: ಬಜೆಟ್, ಪ್ಲಾಟ್ ಗಾತ್ರ, ದಿಕ್ಕು, ಅಥವಾ ಮುಖ್ಯವಾದದ್ದು (ಪಾರ್ಕ್, ಮೂಲೆ ಪ್ಲಾಟ್, ಶಾಂತ ರಸ್ತೆ).' },
  next: { en: 'Tap a plot to see it on the map, or I can book a site visit for you.', hi: 'मैप पर देखने के लिए किसी प्लॉट पर टैप करें, या मैं आपके लिए साइट विज़िट बुक कर सकता हूँ।', kn: 'ನಕ್ಷೆಯಲ್ಲಿ ನೋಡಲು ಪ್ಲಾಟ್ ಮೇಲೆ ಟ್ಯಾಪ್ ಮಾಡಿ, ಅಥವಾ ನಾನು ಸೈಟ್ ಭೇಟಿ ಬುಕ್ ಮಾಡಬಹುದು.' },
  understood: { en: 'Looking for', hi: 'आप ढूंढ रहे हैं', kn: 'ನೀವು ಹುಡುಕುತ್ತಿರುವುದು' },
  docsLead: { en: 'Here is what the documents say:', hi: 'दस्तावेज़ों में यह लिखा है:', kn: 'ದಾಖಲೆಗಳಲ್ಲಿ ಹೀಗಿದೆ:' },
  docsNone: { en: 'I could not find that in the documents. Try other words, or ask the sales team.', hi: 'यह दस्तावेज़ों में नहीं मिला। दूसरे शब्दों में पूछें, या सेल्स टीम से पूछें।', kn: 'ಇದು ದಾಖಲೆಗಳಲ್ಲಿ ಸಿಗಲಿಲ್ಲ. ಬೇರೆ ಪದಗಳಲ್ಲಿ ಕೇಳಿ, ಅಥವಾ ಮಾರಾಟ ತಂಡವನ್ನು ಕೇಳಿ.' },
  englishOnly: { en: '', hi: '(पूरा जवाब अपनी भाषा में पाने के लिए AI कुंजी जोड़ें; अभी विवरण अंग्रेज़ी में है।)', kn: '(ಪೂರ್ಣ ಉತ್ತರ ನಿಮ್ಮ ಭಾಷೆಯಲ್ಲಿ ಬೇಕಾದರೆ AI ಕೀ ಸೇರಿಸಿ; ಈಗ ವಿವರಗಳು ಇಂಗ್ಲಿಷ್‌ನಲ್ಲಿವೆ.)' },
} as const;

export type Phrase = keyof typeof T;
export const t = (k: Phrase, lang: Lang = 'en') => T[k][lang] || T[k].en;
export const langName = (l: Lang) => ({ en: 'English', hi: 'Hindi', kn: 'Kannada' })[l];
