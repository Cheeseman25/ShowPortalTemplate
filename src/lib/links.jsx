// Turns URLs (and bare meet.google.com links) in text into clickable links.

export function renderWithLinks(text) {
  if (!text || typeof text !== 'string') return text;
  const urlRegex = /(https?:\/\/[^\s]+|meet\.google\.com\/[a-zA-Z0-9_-]+)/g;
  const parts = text.split(urlRegex);
  return parts.map((part, i) => {
    if (part && (part.match(/^https?:\/\//) || part.match(/^meet\.google\.com/))) {
      const href = part.startsWith('http') ? part : `https://${part}`;
      return (
        <a
          key={i}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary-300 hover:text-primary-100 underline decoration-primary-400 font-semibold break-all inline-flex items-center gap-0.5"
          onClick={(e) => e.stopPropagation()}
        >
          <span>{part}</span>
          <span className="text-[10px] no-underline">↗</span>
        </a>
      );
    }
    return part;
  });
}
