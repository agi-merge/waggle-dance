type Unit = "B" | "KB" | "MB" | "GB" | "TB";

function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return "0 B";

  const unitIndex: number = Math.floor(Math.log(bytes) / Math.log(1024));
  const units: Unit[] = ["B", "KB", "MB", "GB", "TB"];
  const fileSize: number = parseFloat(
    (bytes / Math.pow(1024, unitIndex)).toFixed(decimals),
  );

  return `${fileSize} ${units[unitIndex]}`;
}

export default formatBytes;
