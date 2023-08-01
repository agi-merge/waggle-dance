export default function timeAgo(date: Date | string) {
  if (!(date instanceof Date)) {
    date = new Date(date);
    if (!(date instanceof Date)) {
      return `Invalid date: ${String(date)}`;
    }
  }


  const now = new Date();
  const secondsAgo = Math.round((now.getTime() - date.getTime()) / 1000);

  if (secondsAgo < 60) {
    return 'just now';
  } else if (secondsAgo < 3600) {
    return `${Math.floor(secondsAgo / 60)}m ago`;
  } else if (secondsAgo < 86400) {
    return `${Math.floor(secondsAgo / 3600)}h ago`;
  } else {
    return `${Math.floor(secondsAgo / 86400)}d ago`;
  }
}
