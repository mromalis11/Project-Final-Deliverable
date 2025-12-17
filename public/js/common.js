export async function fetchJSON(url, options = {}) {
  try {
    const response = await fetch(url, { headers: { 'Content-Type': 'application/json' }, ...options });
    if (!response.ok) {
      const message = `Request failed: ${response.status}`;
      return { error: message };
    }
    const payload = await response.json();
    return { data: payload.data ?? payload, source: payload.source, raw: payload };
  } catch (error) {
    return { error: error.message };
  }
}

export const formatKickoff = (iso) => (iso ? dayjs(iso).format('MMM D, h:mm A') : 'TBD');

export const formatStatus = (status = {}) => {
  if (status.elapsed) {
    return `${status.elapsed}' ${status.long || ''}`.trim();
  }
  return status.long || 'Scheduled';
};

export const renderMessage = (container, text, type = 'alert') => {
  container.innerHTML = `<div class="${type}">${text}</div>`;
};
