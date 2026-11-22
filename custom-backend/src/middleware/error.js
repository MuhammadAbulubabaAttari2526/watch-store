export function notFound(req, res) {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` })
}

export function errorHandler(error, req, res, next) {
  if (error instanceof SyntaxError && 'body' in error) {
    return res.status(400).json({ message: 'Invalid JSON body' })
  }
  if (error?.code === 'P2002') {
    return res.status(409).json({ message: 'A record with that value already exists' })
  }
  if (error?.code === 'P2025') {
    return res.status(404).json({ message: 'Record not found' })
  }
  if (error?.code === 'P2034') {
    return res.status(409).json({ message: 'The order or inventory changed during checkout. Please try again.' })
  }
  if (error?.code === 'LIMIT_FILE_SIZE' || error?.code === 'LIMIT_FILE_COUNT') {
    return res.status(413).json({ message: 'Upload exceeds the allowed size or file count' })
  }
  if (error?.message === 'Only JPEG, PNG, and WebP images are allowed') {
    return res.status(415).json({ message: error.message })
  }
  console.error(error)
  res.status(error.status || 500).json({
    message: envSafe(error),
  })
}

function envSafe(error) {
  if (process.env.NODE_ENV === 'production') return 'An unexpected server error occurred'
  return error.message || 'An unexpected server error occurred'
}
