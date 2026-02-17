const IDENTIFIER_PART_PATTERN = '(?:`[^`]+`|"[^"]+"|[[^]]+]|[A-Za-z0-9_]+)';
const IDENTIFIER_PATTERN = `(${IDENTIFIER_PART_PATTERN}(?:\\.${IDENTIFIER_PART_PATTERN})*)`;

const stripSqlComments = (input: string): string =>
  input.replace(/--.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "");

const stripIdentifierWrapper = (value: string): string => {
  const trimmed = value.trim();
  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    return trimmed.slice(1, -1);
  }
  if (trimmed.startsWith("`") && trimmed.endsWith("`")) {
    return trimmed.slice(1, -1);
  }
  if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
};

const normalizeIdentifier = (value: string): string => {
  const cleaned = value.replace(/[;,]+$/g, "").trim();
  const parts = cleaned.split(".");
  const lastPart = parts[parts.length - 1] ?? cleaned;
  return stripIdentifierWrapper(lastPart);
};

export const extractPrimaryTableName = (query: string): string | null => {
  const normalized = stripSqlComments(query).replace(/\s+/g, " ").trim();
  if (!normalized) {
    return null;
  }

  const updateMatch = normalized.match(
    new RegExp(`\\bupdate\\s+${IDENTIFIER_PATTERN}`, "i")
  );
  if (updateMatch?.[1]) {
    return normalizeIdentifier(updateMatch[1]);
  }

  const createMatch = normalized.match(
    new RegExp(
      `\\bcreate\\s+table\\s+(?:if\\s+not\\s+exists\\s+)?${IDENTIFIER_PATTERN}`,
      "i"
    )
  );
  if (createMatch?.[1]) {
    return normalizeIdentifier(createMatch[1]);
  }

  const insertMatch = normalized.match(
    new RegExp(`\\binsert\\s+into\\s+${IDENTIFIER_PATTERN}`, "i")
  );
  if (insertMatch?.[1]) {
    return normalizeIdentifier(insertMatch[1]);
  }

  const deleteMatch = normalized.match(
    new RegExp(`\\bdelete\\s+from\\s+${IDENTIFIER_PATTERN}`, "i")
  );
  if (deleteMatch?.[1]) {
    return normalizeIdentifier(deleteMatch[1]);
  }

  const fromMatch = normalized.match(
    new RegExp(`\\bfrom\\s+${IDENTIFIER_PATTERN}`, "i")
  );
  if (fromMatch?.[1]) {
    return normalizeIdentifier(fromMatch[1]);
  }

  return null;
};
