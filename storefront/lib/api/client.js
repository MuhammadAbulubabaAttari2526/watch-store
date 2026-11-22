export async function request(path, { method = 'GET', params, body, token, headers: extraHeaders, onResponse } = {}) {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!apiUrl) {
    throw new Error('Store API is not configured. Set NEXT_PUBLIC_API_URL when a backend is available.');
  }

  const url = new URL(path, apiUrl.endsWith('/') ? apiUrl : `${apiUrl}/`);
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value != null && value !== '') url.searchParams.set(key, value);
  });

  const headers = { Accept: 'application/json', ...extraHeaders };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;

  let response;
  try {
    response = await fetch(url, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      credentials: 'include',
      cache: 'no-store',
    });
  } catch {
    throw new Error('Could not reach the store API. Check NEXT_PUBLIC_API_URL.');
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw Object.assign(new Error(data.message || data.error || `Request failed (${response.status})`), { status: response.status });
  }
  if (onResponse) onResponse(response);
  return data;
}
