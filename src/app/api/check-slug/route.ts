import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get('slug');

  if (!slug || slug.length < 3) {
    return NextResponse.json({ available: false, error: 'Slug deve ter pelo menos 3 caracteres' }, { status: 400 });
  }

  try {
    const doc = await adminDb.collection('academies').doc(slug).get();
    return NextResponse.json({ available: !doc.exists });
  } catch (error) {
    console.error('[check-slug] Error:', error);
    return NextResponse.json({ available: false, error: 'Erro ao verificar disponibilidade' }, { status: 500 });
  }
}
