document.addEventListener('DOMContentLoaded', () => {
  // Inject shared header/footer first, then init nav on them
  injectHeaderFooter()
    .then(() => {
      initNav();
    })
    .catch(() => {
      // If partials fail for some reason, still try to init nav on what exists
      initNav();
    });

  initScrollReveal();
  initHeroVideoTiming();
  initBeforeAfterSliders();
  initIngredientChecker();
  initChatbot();
  initEmailPopup();
});

/**
 * Load header/footer HTML partials into #emco-header and #emco-footer
 */
async function injectHeaderFooter() {
  const headerContainer = document.getElementById('emco-header');
  const footerContainer = document.getElementById('emco-footer');

  // Helper to fetch and inject
  async function loadInto(container, path) {
    if (!container) return;
    try {
      const res = await fetch(path);
      if (res.ok) {
        const html = await res.text();
        container.innerHTML = html;
      }
    } catch (err) {
      console.error(`Failed to load ${path}`, err);
    }
  }

  // From prototype/*.html, these are relative paths:
  await loadInto(headerContainer, 'partials/header.html');
  await loadInto(footerContainer, 'partials/footer.html');
}

/**
 * Mobile nav + services dropdown
 */
function initNav() {
  const nav = document.querySelector('.emco-header__nav');
  const toggle = document.querySelector('.emco-header__toggle');

  if (toggle && nav) {
    toggle.addEventListener('click', () => {
      const isOpen = nav.classList.toggle('emco-header__nav--open');
      toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });
  }

  const servicesToggle = document.querySelector('.emco-nav__dropdown-toggle');
  const servicesDropdown = document.querySelector('.emco-nav__dropdown');

  if (servicesToggle && servicesDropdown) {
    servicesToggle.addEventListener('click', () => {
      const isOpen = servicesDropdown.classList.toggle('emco-nav__dropdown--open');
      servicesToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });
  }
}

/**
 * Scroll reveal effect for elements with [data-emco-reveal]
 */
function initScrollReveal() {
  const revealEls = document.querySelectorAll('[data-emco-reveal]');
  if (!('IntersectionObserver' in window) || !revealEls.length) return;

  const observer = new IntersectionObserver(
    entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('emco-revealed');
          observer.unobserve(entry.target);
        }
      });
    },
    {
      threshold: 0.15
    }
  );

  revealEls.forEach(el => observer.observe(el));
}

/**
 * Hero: delay text + button fade-in so video shows first
 */
function initHeroVideoTiming() {
  const heroText = document.querySelector('.emco-hero-video__text');
  const heroButtons = document.querySelector('.emco-hero-video__buttons');

  if (!heroText || !heroButtons) return;

  // Text appears after 5 seconds
  setTimeout(() => {
    heroText.classList.add('emco-hero-video__text--visible');
  }, 5000);

  // Buttons appear a bit after the text
  setTimeout(() => {
    heroButtons.classList.add('emco-hero-video__buttons--visible');
  }, 6500);
}

/**
 * Before/after sliders: drag handle to reveal more/less
 */
function initBeforeAfterSliders() {
  const sliders = document.querySelectorAll('.emco-before-after');
  if (!sliders.length) return;

  sliders.forEach(slider => {
    const beforeWrapper = slider.querySelector('.emco-before-after__image-before');
    const handle = slider.querySelector('.emco-before-after__handle');
    if (!beforeWrapper || !handle) return;

    const rect = () => slider.getBoundingClientRect();

    function updateFromClientX(clientX) {
      const bounds = rect();
      const x = Math.min(Math.max(clientX - bounds.left, 0), bounds.width);
      const percent = (x / bounds.width) * 100;
      beforeWrapper.style.width = `${percent}%`;
      handle.style.left = `${percent}%`;
    }

    function onMouseMove(e) {
      updateFromClientX(e.clientX);
    }

    function onTouchMove(e) {
      if (!e.touches[0]) return;
      updateFromClientX(e.touches[0].clientX);
    }

    function stopDrag() {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('mouseup', stopDrag);
      window.removeEventListener('touchend', stopDrag);
    }

    function startDrag(e) {
      e.preventDefault();
      if (e.type === 'mousedown') {
        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', stopDrag);
      } else if (e.type === 'touchstart') {
        window.addEventListener('touchmove', onTouchMove, { passive: false });
        window.addEventListener('touchend', stopDrag);
      }
    }

    handle.addEventListener('mousedown', startDrag);
    handle.addEventListener('touchstart', startDrag, { passive: false });
  });
}

/**
 * Ingredient checker – front-end only logic
 * (Hooks into a textarea + button if present on that page)
 */
function initIngredientChecker() {
  const textarea = document.querySelector('[data-ingredient-input]');
  const button = document.querySelector('[data-ingredient-check]');
  const resultsContainer = document.querySelector('[data-ingredient-results]');

  if (!textarea || !button || !resultsContainer) return;

  // Example static DB – expand as needed
  const poreCloggers = {
    "isopropyl myristate": {
      level: 5,
      note: "Highly comedogenic; often found in makeup and moisturizers.",
      recommend: "Try switching to a gel-based, non-comedogenic moisturizer."
    },
    "coconut oil": {
      level: 4,
      note: "Can be very clogging for acne-prone faces (better for body).",
      recommend: "Look for jojoba or squalane-based products instead."
    },
    "lauric acid": {
      level: 4,
      note: "Antimicrobial but potentially pore-clogging in leave-on products.",
      recommend: "Opt for low-lauric-acid alternatives in facial routines."
    }
    // add more here
  };

  function checkIngredients() {
    const raw = textarea.value || "";
    const list = raw
      .split(/,|\n|;/)
      .map(i => i.trim().toLowerCase())
      .filter(Boolean);

    resultsContainer.innerHTML = "";

    if (!list.length) {
      resultsContainer.innerHTML = "<p>Please paste an ingredient list first.</p>";
      return;
    }

    const hits = list
      .map(name => ({
        name,
        data: poreCloggers[name]
      }))
      .filter(item => item.data);

    if (!hits.length) {
      resultsContainer.innerHTML = `
        <div class="emco-ingredient-results--ok">
          <h3>No obvious pore-clogging ingredients detected.</h3>
          <p>This doesn’t mean the product is 100% safe for everyone, but nothing major from the common list popped up.</p>
        </div>
      `;
      return;
    }

    const ul = document.createElement('ul');
    ul.className = 'emco-ingredient-results__list';

    hits.forEach(hit => {
      const li = document.createElement('li');
      li.innerHTML = `
        <span class="emco-ingredient-results__name">${hit.name}</span>
        <span class="emco-ingredient-results__level">Comedogenic rating: ${hit.data.level}/5</span>
        <p class="emco-ingredient-results__note">${hit.data.note}</p>
        <p class="emco-ingredient-results__note"><strong>EmCo tip:</strong> ${hit.data.recommend}</p>
      `;
      ul.appendChild(li);
    });

    resultsContainer.appendChild(ul);
  }

  button.addEventListener('click', e => {
    e.preventDefault();
    checkIngredients();
  });
}

/**
 * Simple rules-based chatbot ("EmBot")
 */
function initChatbot() {
  const widget = document.querySelector('[data-chatbot-widget]');
  if (!widget) return;

  const toggle = widget.querySelector('[data-chatbot-toggle]');
  const panel = widget.querySelector('[data-chatbot-panel]');
  const messagesEl = widget.querySelector('[data-chatbot-messages]');
  const form = widget.querySelector('[data-chatbot-form]');
  const input = widget.querySelector('[data-chatbot-input]');

  if (!toggle || !panel || !messagesEl || !form || !input) return;

  function appendMessage(text, from = 'bot') {
    const bubble = document.createElement('div');
    bubble.className = `emco-chatbot__message emco-chatbot__message--${from}`;
    bubble.innerHTML = text;
    messagesEl.appendChild(bubble);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function botReply(userText) {
    const t = userText.toLowerCase();

    if (t.includes('acne bootcamp')) {
      appendMessage(
        `Acne Bootcamp is Emily’s structured clear-skin program using Face Reality protocols, lifestyle coaching, and regular check-ins. You can read more on the <a href="acne-bootcamp.html">Acne Bootcamp page</a> or <a href="https://your-booking-link.com">book a consult</a>.`
      );
      return;
    }

    if (t.includes('hydrafacial')) {
      appendMessage(
        `Hydrafacial is a 3-step treatment to cleanse, extract, and hydrate. It’s great before events or as a reset. Check out the <a href="hydrafacial.html">Hydrafacial page</a> or <a href="https://your-booking-link.com">book now</a>.`
      );
      return;
    }

    if (t.includes('product') || t.includes('routine')) {
      appendMessage(
        `For product recs, EmCo loves pairing in-studio care with home routines. You can browse the <a href="shop.html">shop</a> or use the <a href="ingredient-checker.html">ingredient checker</a> to review what you’re using now.`
      );
      return;
    }

    if (t.includes('hi') || t.includes('hello') || t.includes('hey')) {
      appendMessage(`Hiii 👋 I’m EmBot, your glowy little guide. Ask me about Acne Bootcamp, Hydrafacial, or products!`);
      return;
    }

    // Default / fallback
    appendMessage(
      `Love that question. I’m a simple rules-based bot for now – for deeper, custom guidance you can <a href="https://your-booking-link.com">book a consult</a> or check the <a href="faq.html">FAQ page</a>.`
    );
  }

  toggle.addEventListener('click', () => {
    const isOpen = panel.classList.toggle('emco-chatbot--open');
    toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');

    if (isOpen && !messagesEl.dataset.hasGreeting) {
      appendMessage(`Welcome to EmCo ✨ I can answer quick questions about services, Acne Bootcamp, and product vibes.`);
      messagesEl.dataset.hasGreeting = 'true';
    }
  });

  form.addEventListener('submit', e => {
    e.preventDefault();
    const value = input.value.trim();
    if (!value) return;
    appendMessage(value, 'user');
    input.value = '';
    setTimeout(() => botReply(value), 300);
  });
}

/**
 * Email popup – 15% off newsletter modal
 */
function initEmailPopup() {
  const popup = document.querySelector('[data-email-popup]');
  if (!popup) return;

  const closeBtn = popup.querySelector('[data-email-popup-close]');
  const form = popup.querySelector('form');
  const STORAGE_KEY = 'emcoEmailPopupDismissed';

  // Don’t show again if already dismissed or subscribed
  if (window.localStorage && localStorage.getItem(STORAGE_KEY) === 'true') {
    return;
  }

  function showPopup() {
    popup.classList.add('emco-email-popup--visible');
  }

  function hidePopup() {
    popup.classList.remove('emco-email-popup--visible');
    if (window.localStorage) {
      localStorage.setItem(STORAGE_KEY, 'true');
    }
  }

  // Show after a short delay on page load
  setTimeout(showPopup, 1000);

  if (closeBtn) {
    closeBtn.addEventListener('click', e => {
      e.preventDefault();
      hidePopup();
    });
  }

  if (form) {
    form.addEventListener('submit', e => {
      e.preventDefault();
      // TODO: integrate with real newsletter endpoint / Shopify later
      hidePopup();
      alert('Thank you! Your discount code will be sent to your email.'); // temporary UX
    });
  }

  // Click outside modal closes it
  popup.addEventListener('click', e => {
    if (e.target === popup) {
      hidePopup();
    }
  });
}
