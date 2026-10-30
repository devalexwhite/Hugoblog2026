(() => {
  const endpoint = 'https://rpsoodrstrmpbbbxxbob.supabase.co/functions/v1/treat-for-treat';
  // Public anon JWT: required by the Edge Function gateway, never a service key.
  const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJwc29vZHJzdHJtcGJiYnh4Ym9iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMyNTEzMzIsImV4cCI6MjEwODgyNzMzMn0.W_Stvva8Plc07WpnEyW3YFwD7RquzPyQ6TvIM338w_Y';
  let visitor;
  try {
    visitor = localStorage.getItem('treat-for-treat-visitor');
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(visitor || '')) {
      visitor = crypto.randomUUID();
      localStorage.setItem('treat-for-treat-visitor', visitor);
    }
  } catch {
    // Keep the exchange usable when persistent storage is disabled.
    visitor = crypto.randomUUID();
  }
  document.querySelectorAll('[data-treat-for-treat]').forEach(box => {
    if (box.dataset.ready) return;
    box.dataset.ready = 'true';
    const form = box.querySelector('form');
    const input = form.elements.url;
    const button = form.querySelector('button');
    const result = box.querySelector('.treat-result');
    button.disabled = false;
    form.addEventListener('submit', async event => {
      event.preventDefault();
      if (button.disabled || !form.reportValidity()) return;
      let submitted;
      try {
        submitted = new URL(input.value.trim());
        if (!['https:', 'http:'].includes(submitted.protocol) || submitted.username || submitted.password) throw new Error();
      } catch {
        result.textContent = 'Please enter a full http:// or https:// link without login details.';
        return;
      }
      button.disabled = true;
      button.textContent = 'Unwrapping…';
      result.textContent = 'Leaving your link in the bowl…';
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 15000);
      try {
        const response = await fetch(endpoint, {
          method: 'POST', headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: submitted.href, visitor }), signal: controller.signal,
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'The bowl is unavailable. Please try again.');
        if (data.url === null) {
          result.textContent = 'Your treat is in the bowl! No links from other readers yet. Come back and submit this same link to check again.';
        } else {
          const reward = new URL(data.url);
          if (!['http:', 'https:'].includes(reward.protocol) || reward.username || reward.password) throw new Error('That treat could not be opened. Please try again.');
          result.textContent = 'Your treat is in the bowl. Here’s one from another reader:';
          const link = document.createElement('a');
          link.href = reward.href;
          link.className = 'treat-card';
          link.target = '_blank';
          link.rel = 'noopener noreferrer nofollow ugc';
          const preview = data.preview || {};
          const imageURL = value => {
            try {
              const url = new URL(value);
              return url.protocol === 'https:' && !url.username && !url.password ? url.href : null;
            } catch { return null; }
          };
          const cover = document.createElement('div');
          cover.className = 'treat-card-cover';
          const placeholder = document.createElement('span');
          placeholder.className = 'treat-card-placeholder';
          placeholder.textContent = '↗';
          placeholder.setAttribute('aria-hidden', 'true');
          cover.append(placeholder);
          const imageSrc = imageURL(preview.image);
          if (imageSrc) {
            const image = document.createElement('img');
            image.className = 'treat-card-image';
            image.alt = '';
            image.referrerPolicy = 'no-referrer';
            image.addEventListener('error', () => image.remove(), { once: true });
            image.src = imageSrc;
            cover.append(image);
          }
          const details = document.createElement('div');
          details.className = 'treat-card-details';
          const source = document.createElement('span');
          source.className = 'treat-card-source';
          const icon = document.createElement('span');
          icon.className = 'treat-card-icon';
          icon.textContent = reward.hostname[0].toUpperCase();
          icon.setAttribute('aria-hidden', 'true');
          const faviconSrc = imageURL(preview.favicon);
          if (faviconSrc) {
            const favicon = document.createElement('img');
            favicon.alt = '';
            favicon.referrerPolicy = 'no-referrer';
            favicon.addEventListener('error', () => favicon.remove(), { once: true });
            favicon.src = faviconSrc;
            icon.append(favicon);
          }
          const domain = document.createElement('span');
          domain.textContent = reward.hostname;
          source.append(icon, domain);
          const title = document.createElement('strong');
          title.className = 'treat-card-title';
          title.textContent = typeof preview.title === 'string' && preview.title ? preview.title : reward.hostname;
          const description = document.createElement('span');
          description.className = 'treat-card-description';
          description.textContent = typeof preview.description === 'string' && preview.description
            ? preview.description : 'A treat shared by another reader. Open the link to explore.';
          const open = document.createElement('span');
          open.className = 'treat-card-open';
          open.textContent = 'Visit website ↗';
          details.append(source, title, description, open);
          link.append(cover, details);
          result.append(link);
          const report = document.createElement('button');
          report.type = 'button';
          report.className = 'treat-report';
          report.textContent = 'Report this link';
          const reportStatus = document.createElement('span');
          reportStatus.className = 'treat-report-status';
          result.append(report, reportStatus);
          report.addEventListener('click', async () => {
            if (report.disabled) return;
            report.disabled = true;
            report.textContent = 'Reporting…';
            reportStatus.textContent = '';
            const reportController = new AbortController();
            const reportTimer = setTimeout(() => reportController.abort(), 15000);
            try {
              const response = await fetch(endpoint, {
                method: 'POST',
                headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'report', url: reward.href, visitor }),
                signal: reportController.signal,
              });
              const data = await response.json();
              if (!response.ok || data.reported !== true) throw new Error();
              link.remove();
              report.textContent = 'Reported';
              reportStatus.textContent = 'Thanks for reporting. Links are removed from the bowl after two reports.';
            } catch {
              report.disabled = false;
              report.textContent = 'Report this link';
              reportStatus.textContent = 'Your report could not be confirmed. Please try again.';
            } finally {
              clearTimeout(reportTimer);
            }
          });
        }
      } catch (error) {
        result.textContent = error.name === 'AbortError' || error instanceof TypeError
          ? 'The bowl could not be reached. Please try this same link again; if it was saved, it won’t be added twice.'
          : error.message;
      } finally {
        clearTimeout(timer);
        button.disabled = false;
        button.textContent = 'Leave a treat ↗';
      }
    });
  });
})();
