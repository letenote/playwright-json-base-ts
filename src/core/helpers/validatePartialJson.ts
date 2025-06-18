export function validatePartialJson(
  actual: any,
  expected: any
): { isValid: boolean; message: string } {
  if (typeof actual !== "object" || actual === null) {
    return { isValid: false, message: "Respons aktual bukan objek JSON." };
  }
  if (typeof expected !== "object" || expected === null) {
    return { isValid: false, message: "Objek expectedJson bukan objek JSON." };
  }

  for (const key in expected) {
    if (expected.hasOwnProperty(key)) {
      if (!actual.hasOwnProperty(key)) {
        return {
          isValid: false,
          message: `Kunci '${key}' tidak ditemukan di respons aktual.`,
        };
      }

      const expectedValue = expected[key];
      const actualValue = actual[key];

      if (
        typeof expectedValue === "object" &&
        expectedValue !== null &&
        !Array.isArray(expectedValue)
      ) {
        const nestedValidation = validatePartialJson(
          actualValue,
          expectedValue
        );
        if (!nestedValidation.isValid) {
          return nestedValidation;
        }
      } else if (Array.isArray(expectedValue)) {
        if (!Array.isArray(actualValue)) {
          return {
            isValid: false,
            message: `Kunci '${key}' diharapkan berupa array, namun aktual bukan array.`,
          };
        }
      } else if (actualValue !== expectedValue) {
        return {
          isValid: false,
          message: `Nilai untuk kunci '${key}' tidak cocok. Diharapkan '${String(
            expectedValue
          )}', Aktual '${String(actualValue)}'.`,
        };
      }
    }
  }
  return { isValid: true, message: "Verifikasi JSON berhasil." };
}
