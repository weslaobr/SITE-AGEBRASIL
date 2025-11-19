import dotenv from 'dotenv';
dotenv.config();

// Teste a função que está falhando
import { getPlayersWithModeFilter } from './services/playerService.js';

async function test() {
  try {
    console.log('🔍 Testando getPlayersWithModeFilter...');
    const result = await getPlayersWithModeFilter(10, 0, 'rm_solo', 12);
    console.log('✅ Service funcionou!');
    console.log('📊 Players:', result.players.length);
    console.log('📊 Total:', result.total);
  } catch (error) {
    console.error('❌ Erro no service:', error.message);
    console.error('🔍 Stack:', error.stack);
  }
}

test();