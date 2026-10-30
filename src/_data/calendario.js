const ICS_DEFECTO = "https://calendar.google.com/calendar/ical/c_7f1977e13f5ed4f84210c8d6ca4c8d35d7221b022cb02c20f70935043bac9414%40group.calendar.google.com/public/basic.ics";

const plano = (s) => s.replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, "");
const RE_CURSO = /^\s*curso\s*:\s*([a-z0-9-]+)\s*$/im;
