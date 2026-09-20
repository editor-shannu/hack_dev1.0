export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { startBackgroundPushScheduler } = await import('@/lib/pushDispatcher');
    startBackgroundPushScheduler();
  }
}
