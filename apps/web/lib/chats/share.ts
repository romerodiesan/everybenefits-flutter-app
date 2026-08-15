export function isSyntheticShareBody(message: {
  body: string;
  sharedPost?: { title: string } | null;
}) {
  if (!message.sharedPost) return false;
  const trimmed = message.body.trim();
  if (!trimmed) return true;
  const title = message.sharedPost.title.trim();
  return trimmed === `Pregunta: ${title}` || trimmed === `Question: ${title}`;
}

export function showsTextBubble(message: {
  body: string;
  sharedPost?: { title: string } | null;
}) {
  return message.body.trim().length > 0 && !isSyntheticShareBody(message);
}
