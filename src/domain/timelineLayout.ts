export interface ISnakeRow<Item> {
  direction: 'ltr' | 'rtl'
  items: Item[]
}

export function createSnakeRows<Item>(
  items: Item[],
  itemsPerRow: number,
): Array<ISnakeRow<Item>> {
  const rows: Array<ISnakeRow<Item>> = []

  for (let index = 0; index < items.length; index += itemsPerRow) {
    const rowIndex = rows.length
    const direction = rowIndex % 2 === 0 ? 'ltr' : 'rtl'
    const chunk = items.slice(index, index + itemsPerRow)
    rows.push({
      direction,
      items: direction === 'ltr' ? chunk : [...chunk].reverse(),
    })
  }

  return rows
}
