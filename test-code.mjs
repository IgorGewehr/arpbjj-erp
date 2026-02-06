import { initializeApp } from 'firebase/app';
import { getFirestore, collectionGroup, query, where, getDocs } from 'firebase/firestore';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env
dotenv.config({ path: join(__dirname, '.env') });

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function testCode() {
  try {
    console.log('🔍 Testando collectionGroup query...');
    console.log('📋 Código: RJEHEQ\n');

    const q = query(
      collectionGroup(db, 'linkCodes'),
      where('code', '==', 'RJEHEQ')
    );

    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      console.log('❌ Nenhum documento encontrado');
    } else {
      console.log(`✅ Encontrados ${snapshot.docs.length} documento(s)\n`);
      snapshot.docs.forEach(doc => {
        console.log('📄 Documento:');
        console.log('   ID:', doc.id);
        console.log('   Path:', doc.ref.path);
        console.log('   Data:', JSON.stringify(doc.data(), null, 2));
      });
    }
  } catch (error) {
    console.error('❌ Erro:', error.code, '-', error.message);
    if (error.code === 'permission-denied') {
      console.log('\n🔒 ERRO DE PERMISSÃO! As regras não estão permitindo a leitura.');
    }
  }
  process.exit(0);
}

testCode();
