export function replaceString(original: string, searchValue: string, replaceValue: string): string {
  return original.replace(new RegExp(searchValue, 'g'), replaceValue);
}
