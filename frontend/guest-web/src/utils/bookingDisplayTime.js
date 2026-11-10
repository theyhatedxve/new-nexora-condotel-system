const dateTime = new Intl.DateTimeFormat("en-PH", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Manila",
});
export function displayTime(value) {
  return value ? dateTime.format(new Date(value)) : "Not recorded";
}
