/**
 * Scroll-Triggered Text Reveal Effect
 * Exclusively applied to the exact words visible in the reference photos.
 */
(function () {
  'use strict';

  // The exact targets from the reference photos
  const TARGET_SPECS = [
    {
      type: 'hero',
      selector: 'h1.eds-display-1',
      matchText: 'send and spend money worldwide',
      initialRevealedFraction: 0.6 // First words ("Send and spend") revealed on initial hero view, rest reveal on scroll
    },
    {
      type: 'section',
      selector: 'h2.eds-display-3',
      matchText: 'take control of your money'
    },
    {
      type: 'section',
      selector: 'h2.eds-display-3',
      matchText: 'save on your travels abroad'
    },
    {
      type: 'group',
      elements: [
        { selector: 'h2.eds-display-3', matchText: 'make your transfer count' },
        { selector: '.eds-body-1', matchText: 'save up to 45% when you send money globally. lightning-fast. completely transparent.' }
      ]
    },
    {
      type: 'group',
      elements: [
        { selector: 'h2.eds-display-3', matchText: 'safe at every step' },
        { selector: '.eds-body-1', matchText: '100,000 new customers join wise every month. here’s how we keep their rupees secure.' }
      ]
    }
  ];

  function splitWordsPreservingWhitespace(text) {
    // Splits text into words while keeping exact characters, punctuation, and spaces
    const tokens = [];
    const regex = /(\S+)/g;
    let lastIndex = 0;
    let match;
    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        tokens.push({ isWord: false, text: text.slice(lastIndex, match.index) });
      }
      tokens.push({ isWord: true, text: match[0] });
      lastIndex = regex.lastIndex;
    }
    if (lastIndex < text.length) {
      tokens.push({ isWord: false, text: text.slice(lastIndex) });
    }
    return tokens;
  }

  function wrapElementWords(el) {
    if (el.dataset.scrollRevealInitialized === 'true') {
      return el.querySelectorAll('.scroll-reveal-word');
    }

    const originalText = el.textContent;
    const tokens = splitWordsPreservingWhitespace(originalText);
    const fragment = document.createDocumentFragment();
    const wordSpans = [];

    tokens.forEach((token) => {
      if (token.isWord) {
        const span = document.createElement('span');
        span.className = 'scroll-reveal-word';
        span.textContent = token.text;
        fragment.appendChild(span);
        wordSpans.push(span);
      } else {
        fragment.appendChild(document.createTextNode(token.text));
      }
    });

    el.textContent = '';
    el.appendChild(fragment);
    el.dataset.scrollRevealInitialized = 'true';
    return wordSpans;
  }

  function init() {
    const boundGroups = [];

    function findElement(selector, matchText) {
      const candidates = Array.from(document.querySelectorAll(selector));
      const cleanMatch = matchText.toLowerCase().replace(/['’]/g, "'");
      return candidates.find((cand) => {
        const t = cand.textContent.toLowerCase().replace(/['’]/g, "'");
        return t.includes(cleanMatch);
      });
    }

    TARGET_SPECS.forEach((spec) => {
      if (spec.type === 'hero' || spec.type === 'section') {
        const el = findElement(spec.selector, spec.matchText);
        if (el) {
          const words = wrapElementWords(el);
          boundGroups.push({
            type: spec.type,
            container: el,
            words: Array.from(words),
            initialRevealedFraction: spec.initialRevealedFraction || 0
          });
        }
      } else if (spec.type === 'group') {
        const groupElements = [];
        let allWords = [];
        spec.elements.forEach((subSpec) => {
          const el = findElement(subSpec.selector, subSpec.matchText);
          if (el) {
            groupElements.push(el);
            const words = wrapElementWords(el);
            allWords = allWords.concat(Array.from(words));
          }
        });
        if (groupElements.length > 0 && allWords.length > 0) {
          boundGroups.push({
            type: 'group',
            container: groupElements[0], // primary anchor for scroll position
            words: allWords,
            initialRevealedFraction: 0
          });
        }
      }
    });

    if (boundGroups.length === 0) return;

    let ticking = false;

    function update() {
      const vh = window.innerHeight || document.documentElement.clientHeight;
      const scrollY = window.scrollY || window.pageYOffset;

      boundGroups.forEach((group) => {
        const words = group.words;
        const totalWords = words.length;
        if (totalWords === 0) return;

        let progress = 0;

        if (group.type === 'hero') {
          // Hero heading:
          // At scrollY = 0, first words are revealed (progress = 0.6 -> words 0, 1, 2)
          // As user scrolls past 0 to 100px, progress goes to 1.0 (all words revealed)
          const scrollFraction = Math.min(1, Math.max(0, scrollY / 90));
          progress = group.initialRevealedFraction + (1 - group.initialRevealedFraction) * scrollFraction;
        } else {
          // Section headings / groups:
          // Trigger start: when element top reaches 88% of viewport (entering)
          // Trigger end: when element top reaches 38% of viewport (comfortably in view)
          const rect = group.container.getBoundingClientRect();
          const triggerStart = vh * 0.88;
          const triggerEnd = vh * 0.38;

          if (rect.top >= triggerStart) {
            progress = 0;
          } else if (rect.top <= triggerEnd) {
            progress = 1;
          } else {
            progress = (triggerStart - rect.top) / (triggerStart - triggerEnd);
          }
        }

        progress = Math.min(1, Math.max(0, progress));

        // Stagger / scrub each word according to progress
        words.forEach((word, index) => {
          const wordThreshold = (index + 0.3) / totalWords;
          const isRevealed = progress >= wordThreshold;

          if (isRevealed) {
            if (!word.classList.contains('is-revealed')) {
              word.classList.add('is-revealed');
            }
          } else {
            if (word.classList.contains('is-revealed')) {
              word.classList.remove('is-revealed');
            }
          }
        });
      });

      ticking = false;
    }

    function onScroll() {
      if (!ticking) {
        requestAnimationFrame(update);
        ticking = true;
      }
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    update();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
