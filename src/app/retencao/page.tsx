'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function RetencaoPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/relatorios?tab=retencao');
  }, [router]);

  return null;
}
