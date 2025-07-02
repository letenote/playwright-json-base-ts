export const extractValuesInDoubleBraces = (
  inputString: string = ""
): Array<string> => {
  const regex = /\{\{\s*([^}]+?)\s*\}\}/g;
  const matches = [];
  let match;

  while ((match = regex.exec(inputString)) !== null) {
    matches.push(match[1].trim());
  }

  return matches;
};
