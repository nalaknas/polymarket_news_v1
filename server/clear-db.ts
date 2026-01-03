import { initDatabase, clearMarkets, clearNewsReports } from './src/database';

async function clearDatabases() {
  try {
    console.log('🔄 Initializing database...');
    await initDatabase();
    
    console.log('🗑️  Clearing news reports...');
    await clearNewsReports();
    
    console.log('🗑️  Clearing markets and market history...');
    await clearMarkets();
    
    console.log('✅ Successfully cleared all markets and news reports!');
    console.log('💡 You can now restart the server to test with fresh data.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error clearing databases:', error);
    process.exit(1);
  }
}

clearDatabases();

