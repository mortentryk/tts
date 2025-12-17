type SharePayload = {
  title?: string;
  text?: string;
  url?: string;
};

export async function shareContent(payload: SharePayload): Promise<boolean> {
  const { title, text, url } = payload;

  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      await navigator.share({ title, text, url });
      return true;
    } catch (err) {
      console.warn('Share dismissed or failed', err);
    }
  }

  if (typeof navigator !== 'undefined' && navigator.clipboard && url) {
    try {
      await navigator.clipboard.writeText(url);
      return true;
    } catch (err) {
      console.warn('Clipboard write failed', err);
    }
  }

  return false;
}
