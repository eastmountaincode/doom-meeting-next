let storedImage: string | null = null

export async function POST(request: Request) {
  try {
    const { imageUrl } = await request.json()
    storedImage = imageUrl
    
    return Response.json({ success: true })
  } catch (error) {
    console.error('Error storing image:', error)
    return Response.json({ success: false, error: 'Failed to store image' }, { status: 500 })
  }
}

export async function GET() {
  try {
    return Response.json({ 
      success: true, 
      imageUrl: storedImage 
    })
  } catch (error) {
    console.error('Error retrieving image:', error)
    return Response.json({ success: false, error: 'Failed to retrieve image' }, { status: 500 })
  }
} 