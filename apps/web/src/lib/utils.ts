export function cn(
  ...values: Array<string | number | false | null | undefined | Record<string, boolean>>
): string {
  const classNames: string[] = [];

  for (const value of values) {
    if (!value && value !== 0) {
      continue;
    }

    if (typeof value === "string" || typeof value === "number") {
      classNames.push(String(value));
      continue;
    }

    for (const [key, condition] of Object.entries(value)) {
      if (condition) {
        classNames.push(key);
      }
    }
  }

  return classNames.join(" ");
}
