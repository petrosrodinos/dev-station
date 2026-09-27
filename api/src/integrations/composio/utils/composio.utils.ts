const WRAPPER_KEYS = ['data', 'response_data', 'details', 'result', 'response'];

/**
 * Composio tool payloads wrap provider responses inconsistently (`data`, `response_data`, `details`...).
 * Walks the wrappers breadth-first and returns the first value matching `predicate`.
 */
export const findInPayload = <T>(
  payload: unknown,
  predicate: (value: unknown) => boolean,
  depth = 4,
): T | undefined => {
  const queue: { value: unknown; level: number }[] = [
    { value: payload, level: 0 },
  ];
  while (queue.length) {
    const { value, level } = queue.shift();
    if (predicate(value)) return value as T;
    if (
      level >= depth ||
      !value ||
      typeof value !== 'object' ||
      Array.isArray(value)
    )
      continue;
    for (const key of WRAPPER_KEYS) {
      if (key in (value as Record<string, unknown>))
        queue.push({
          value: (value as Record<string, unknown>)[key],
          level: level + 1,
        });
    }
  }
  return undefined;
};

export const findArray = <T>(payload: unknown, keys: string[] = []): T[] => {
  const direct = findInPayload<T[]>(payload, Array.isArray);
  if (direct) return direct;
  const container = findInPayload<Record<string, unknown>>(
    payload,
    (v) =>
      !!v &&
      typeof v === 'object' &&
      keys.some((k) => Array.isArray((v as Record<string, unknown>)[k])),
  );
  const key = container && keys.find((k) => Array.isArray(container[k]));
  return key ? (container[key] as T[]) : [];
};

export const findObjectWithKey = <T>(
  payload: unknown,
  key: string,
): T | undefined =>
  findInPayload<T>(
    payload,
    (v) =>
      !!v &&
      typeof v === 'object' &&
      !Array.isArray(v) &&
      key in (v as Record<string, unknown>),
  );
