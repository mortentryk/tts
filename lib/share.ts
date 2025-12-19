type SharePayload = {
  title?: string;
  text?: string;
  url?: string;
};

export function getNodeUrl(storyId: string, nodeKey?: string): string {
  if (typeof window === 'undefined') {
    return '';
  }
  const baseUrl = window.location.origin;
  const node = nodeKey || '1';
  return `${baseUrl}/story/${encodeURIComponent(storyId)}/${encodeURIComponent(node)}`;
}

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
