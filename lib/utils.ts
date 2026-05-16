export function formatCurrency(value: string | number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(Number(value))
}

export function formatDate(dateString: string): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(dateString))
}

export function getStockStatus(stock: number): 'out' | 'low' | 'ok' {
  if (stock === 0) return 'out'
  if (stock <= 5) return 'low'
  return 'ok'
}

export function getImageUrl(imageUrl: string | undefined): string {
  if (!imageUrl) return '/placeholder.png'
  if (imageUrl.startsWith('http')) return imageUrl
  return `${process.env.NEXT_PUBLIC_API_URL}${imageUrl}`
}

export function getPrimaryImage(images: { imageUrl: string; isPrimary: boolean }[]): string {
  if (!images || images.length === 0) return '/placeholder.png'
  const primary = images.find((img) => img.isPrimary) ?? images[0]
  return primary ? getImageUrl(primary.imageUrl) : '/placeholder.png'
}

export function cn(...classes: (string | undefined | false | null)[]): string {
  return classes.filter(Boolean).join(' ')
}

export function getApiErrorMessage(err: unknown, fallback = 'An error occurred'): string {
  return (err as { response?: { data?: { message?: string } } })?.response?.data?.message || fallback
}
