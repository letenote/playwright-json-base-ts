const getEventName = (): string => process.env["npm_lifecycle_event"] || "";
export const isDevMode = (): boolean => {
  switch (getEventName()) {
    case "dev":
      return true;
    default:
      return false;
  }
};
