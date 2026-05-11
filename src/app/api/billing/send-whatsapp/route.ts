import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const apiUrl = process.env.WHATSAPP_API_URL;
  const apiKey = process.env.WHATSAPP_API_KEY;

  if (!apiUrl || !apiKey) {
    return NextResponse.json(
      { error: 'API de WhatsApp nao configurada', code: 'NOT_CONFIGURED', retryable: false },
      { status: 503 }
    );
  }

  try {
    const payload = { ...(await request.json()), appId: 'gestao-raiz' };

    // Validate required fields
    if (!payload.phone || !payload.message) {
      return NextResponse.json(
        { error: 'Campos obrigatorios ausentes: phone, message', code: 'VALIDATION_ERROR', retryable: false },
        { status: 400 }
      );
    }

    // 30-second timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        const retryable = response.status >= 500 || response.status === 429;
        return NextResponse.json(
          { error: `Upstream error: ${response.status} ${errorText}`, code: 'UPSTREAM_ERROR', retryable },
          { status: response.status }
        );
      }

      const data = await response.json().catch(() => ({ success: true }));
      return NextResponse.json(data);
    } catch (fetchErr) {
      clearTimeout(timeoutId);
      if (fetchErr instanceof DOMException && fetchErr.name === 'AbortError') {
        return NextResponse.json(
          { error: 'Timeout: API demorou mais de 30 segundos', code: 'TIMEOUT', retryable: true },
          { status: 504 }
        );
      }
      throw fetchErr;
    }
  } catch (err) {
    console.error('WhatsApp proxy error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erro interno', code: 'INTERNAL_ERROR', retryable: true },
      { status: 500 }
    );
  }
}
