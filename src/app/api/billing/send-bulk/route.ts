import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const whatsappApiUrl = process.env.WHATSAPP_API_URL;
  const apiKey = process.env.WHATSAPP_API_KEY;

  if (!whatsappApiUrl || !apiKey) {
    return NextResponse.json(
      { error: 'API de notificacao nao configurada', code: 'NOT_CONFIGURED', retryable: false },
      { status: 503 }
    );
  }

  // Derive bulk URL from WhatsApp API URL
  const bulkApiUrl = whatsappApiUrl.replace(/\/api\/send-whatsapp$/, '/api/send-bulk');

  try {
    const payload = { ...(await request.json()), appId: 'gestao-raiz' };

    // Validate required fields
    if (!payload.message) {
      return NextResponse.json(
        { error: 'Campo obrigatorio ausente: message', code: 'VALIDATION_ERROR', retryable: false },
        { status: 400 }
      );
    }

    if ((!payload.phones || payload.phones.length === 0) && (!payload.emails || payload.emails.length === 0)) {
      return NextResponse.json(
        { error: 'Pelo menos um phone ou email e obrigatorio', code: 'VALIDATION_ERROR', retryable: false },
        { status: 400 }
      );
    }

    // 120-second timeout (bulk sends can take a while)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000);

    try {
      const response = await fetch(bulkApiUrl, {
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
          { error: 'Timeout: API demorou mais de 120 segundos', code: 'TIMEOUT', retryable: true },
          { status: 504 }
        );
      }
      throw fetchErr;
    }
  } catch (err) {
    console.error('Bulk send proxy error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erro interno', code: 'INTERNAL_ERROR', retryable: true },
      { status: 500 }
    );
  }
}
