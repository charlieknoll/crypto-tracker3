export function useColumns(fields) {
  const columns = [];
  for (let i = 0; i < fields.length; i++) {
    const f = fields[i];
    if (f.showColumn === false) continue;
    if (!f.name) continue;
    const col = {};
    col.name = f.name;
    col.label = f.label ?? f.name[0].toUpperCase() + f.name.substring(1);
    col.field = f.name;
    col.align = f.align ?? "left";
    col.format = f.format;
    columns.push(col);
  }
  return columns;
}
