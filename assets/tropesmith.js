// Tropesmith - shared backend wiring
// Usage in HTML:
//   <script src="https://js.stripe.com/v3/"></script>
//   <script src="/assets/tropesmith.js"></script>
//   then call window.Tropesmith.buyProduct('starter') etc.

(function () {
  'use strict';

  const STRIPE_PUBLISHABLE_KEY = 'pk_live_51TWCSxEeslmkApi8V08SsTWPVOZgtNOhy8kNCLG6D1IH3JPjXxG29n9ioNf2FHXmG4FEKRaMSb64gCaqfGkMls4z00OdHCkZfb';
  const SUPABASE_FN_BASE = 'https://vsbytdonbuwrrlmwteaw.supabase.co/functions/v1';
  const ENDPOINTS = {
    checkout: SUPABASE_FN_BASE + '/tropesmith-checkout-session',
    intake: SUPABASE_FN_BASE + '/intake-submit',
    mapStatus: SUPABASE_FN_BASE + '/map-status'
  };

  let stripeInstance = null;
  let activeCheckout = null;

  function getStripe() {
    if (!stripeInstance) {
      if (typeof Stripe === 'undefined') {
        throw new Error('Stripe.js not loaded');
      }
      stripeInstance = Stripe(STRIPE_PUBLISHABLE_KEY);
    }
    return stripeInstance;
  }

  async function buyProduct(productId, options) {
    options = options || {};
    const email = options.email || '';
    const onError = options.onError || null;

    let mountEl = document.getElementById('ts-checkout-mount');
    let modalEl = null;

    if (!mountEl) {
      modalEl = createCheckoutModal();
      mountEl = modalEl.querySelector('#ts-checkout-mount');
    }

    try {
      const resp = await fetch(ENDPOINTS.checkout, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_id: productId, email: email || undefined })
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: 'unknown' }));
        throw new Error(err.message || err.error || 'HTTP ' + resp.status);
      }

      const data = await resp.json();
      if (!data.client_secret) throw new Error('No client_secret returned');

      const stripe = getStripe();
      const checkout = await stripe.initEmbeddedCheckout({ clientSecret: data.client_secret });

      if (activeCheckout) { try { activeCheckout.destroy(); } catch (_) {} }
      activeCheckout = checkout;
      checkout.mount('#ts-checkout-mount');

      if (modalEl) modalEl.style.display = 'flex';
    } catch (err) {
      console.error('[Tropesmith] checkout failed:', err);
      if (modalEl) modalEl.remove();
      if (onError) onError(err);
      else alert('Sorry, checkout failed: ' + err.message);
    }
  }

  function createCheckoutModal() {
    const wrap = document.createElement('div');
    wrap.className = 'ts-checkout-modal';
    wrap.setAttribute('role', 'dialog');
    wrap.setAttribute('aria-modal', 'true');
    wrap.innerHTML = '<div class="ts-checkout-backdrop" data-ts-close></div>' +
      '<div class="ts-checkout-card">' +
      '<button class="ts-checkout-close" data-ts-close aria-label="Close">x</button>' +
      '<div id="ts-checkout-mount"></div>' +
      '</div>';

    const style = document.createElement('style');
    style.textContent = '.ts-checkout-modal{position:fixed;inset:0;z-index:99999;display:none;align-items:flex-start;justify-content:center;padding:40px 16px;overflow-y:auto}.ts-checkout-backdrop{position:absolute;inset:0;background:rgba(16,18,47,0.55);backdrop-filter:blur(4px)}.ts-checkout-card{position:relative;z-index:1;background:#FFF9F3;border-radius:12px;max-width:580px;width:100%;box-shadow:0 24px 64px rgba(16,18,47,0.18);padding:16px}.ts-checkout-close{position:absolute;top:8px;right:12px;background:none;border:none;font-size:28px;line-height:1;cursor:pointer;color:#5b4a59;padding:4px 8px}.ts-checkout-close:hover{color:#10122F}#ts-checkout-mount{min-height:480px}';
    document.head.appendChild(style);
    document.body.appendChild(wrap);

    wrap.querySelectorAll('[data-ts-close]').forEach(function (el) {
      el.addEventListener('click', function () { closeCheckout(wrap); });
    });
    document.addEventListener('keydown', function escClose(e) {
      if (e.key === 'Escape' && wrap.style.display !== 'none') {
        closeCheckout(wrap);
        document.removeEventListener('keydown', escClose);
      }
    });

    return wrap;
  }

  function closeCheckout(modalEl) {
    if (activeCheckout) { try { activeCheckout.destroy(); } catch (_) {} activeCheckout = null; }
    modalEl.remove();
  }

  async function submitIntake(payload) {
    if (!payload.email) throw new Error('email is required');
    if (!payload.genre_id) throw new Error('genre_id is required');
    if (!payload.subgenre_id) throw new Error('subgenre_id is required');
    if (!payload.heat_level) throw new Error('heat_level is required');
    if (!payload.format) throw new Error('format is required');

    const resp = await fetch(ENDPOINTS.intake, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!resp.ok) {
      const err = await resp.json().catch(function () { return { error: 'unknown' }; });
      throw new Error(err.message || err.error || 'HTTP ' + resp.status);
    }

    return await resp.json();
  }

  async function pollMapStatus(mapId, options) {
    options = options || {};
    const pollIntervalMs = options.pollIntervalMs || 5000;
    const timeoutMs = options.timeoutMs || 5 * 60 * 1000;
    const onUpdate = options.onUpdate || null;

    const startedAt = Date.now();

    while (Date.now() - startedAt < timeoutMs) {
      try {
        const resp = await fetch(ENDPOINTS.mapStatus + '?map_id=' + encodeURIComponent(mapId));
        const data = await resp.json();
        if (onUpdate) onUpdate(data);
        if (data && (data.status === 'ready' || data.status === 'delivered' || data.status === 'failed')) {
          return data;
        }
      } catch (err) {
        console.warn('[Tropesmith] poll error:', err);
      }
      await new Promise(function (resolve) { return setTimeout(resolve, pollIntervalMs); });
    }
    throw new Error('Map status poll timed out');
  }

  window.Tropesmith = window.Tropesmith || {};
  Object.assign(window.Tropesmith, {
    buyProduct: buyProduct,
    submitIntake: submitIntake,
    pollMapStatus: pollMapStatus,
    ENDPOINTS: ENDPOINTS,
    STRIPE_PUBLISHABLE_KEY: STRIPE_PUBLISHABLE_KEY
  });
})();
